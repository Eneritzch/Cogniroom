import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .models import Notification

logger = logging.getLogger(__name__)


# Etiqueta (eyebrow) y color de acento del email por tipo de notificación. Los
# colores son hex fijos: los clientes de correo no soportan variables CSS.
# Paleta teal monocromática (clay): sage #009490 · stone #62c4d3 · petróleo
# #114b5f. Coral #e0604f SOLO para alertas reales (riesgo, rechazo).
EMAIL_CATEGORIES = {
    Notification.KIND_STUDENT_AT_RISK:   ('Alerta cognitiva', '#e0604f'),
    Notification.KIND_DIAGNOSIS_READY:   ('Tu diagnóstico', '#009490'),
    Notification.KIND_ROOM_JOINED:       ('Sala', '#009490'),
    Notification.KIND_JOIN_REQUEST:      ('Solicitud de ingreso', '#114b5f'),
    Notification.KIND_JOIN_REJECTED:     ('Solicitud de ingreso', '#e0604f'),
    Notification.KIND_QUESTION_PENDING:  ('Preguntas por revisar', '#114b5f'),
    Notification.KIND_QUESTIONS_ADDED:   ('Preguntas nuevas', '#009490'),
    Notification.KIND_PRACTICE_REMINDER: ('Recordatorio', '#62c4d3'),
}
DEFAULT_EMAIL_CATEGORY = ('Notificación', '#009490')


def _send_notification_email(to_email, title, body, link, action_label='Ver en CogniRoom',
                             eyebrow='Notificación', accent='#009490'):
    """Email multipart (texto + HTML de marca). Best-effort: traga fallos."""
    try:
        action_url = ''
        if link:
            base = (getattr(settings, 'SITE_URL', '') or '').rstrip('/')
            action_url = f'{base}{link}' if base else link

        html = render_to_string('email/notification.html', {
            'title': title,
            'body': body,
            'action_url': action_url,
            'action_label': action_label,
            'eyebrow': eyebrow,
            'accent': accent,
        })

        message = EmailMultiAlternatives(
            subject=title,
            body=body or title,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        message.attach_alternative(html, 'text/html')
        message.send(fail_silently=True)
    except Exception:
        logger.exception('No se pudo enviar el email de notificación')


def notify(recipient, *, kind, title, body='', link='', email=True, email_async=True):
    """Notificación in-app + email opcional. El email va en un hilo aparte por
    defecto para no bloquear el request; los batch usan email_async=False."""
    notification = Notification.objects.create(
        recipient=recipient,
        kind=kind,
        title=title,
        body=body,
        link=link,
    )

    to_email = getattr(recipient, 'email', '')
    if email and to_email:
        eyebrow, accent = EMAIL_CATEGORIES.get(kind, DEFAULT_EMAIL_CATEGORY)
        email_kwargs = {'eyebrow': eyebrow, 'accent': accent}
        if email_async:
            threading.Thread(
                target=_send_notification_email,
                args=(to_email, title, body, link),
                kwargs=email_kwargs,
                daemon=True,
            ).start()
        else:
            _send_notification_email(to_email, title, body, link, **email_kwargs)

    return notification


def send_branded_email(to_email, *, title, body='', link='', action_label='Ver en CogniRoom',
                       eyebrow='Notificación', accent='#009490', async_send=True):
    """Email de marca SIN registrar una notificación in-app. Para flujos fuera de
    sesión (recuperación de contraseña), donde no hay destinatario-usuario en
    contexto de notificación. Best-effort: nunca rompe el request que lo llama."""
    if not to_email:
        return
    email_kwargs = {'action_label': action_label, 'eyebrow': eyebrow, 'accent': accent}
    if async_send:
        threading.Thread(
            target=_send_notification_email,
            args=(to_email, title, body, link),
            kwargs=email_kwargs,
            daemon=True,
        ).start()
    else:
        _send_notification_email(to_email, title, body, link, **email_kwargs)
