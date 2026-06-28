import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .models import Notification

logger = logging.getLogger(__name__)


def _send_notification_email(to_email, title, body, link):
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
            'action_label': 'Ver en CogniRoom',
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
        if email_async:
            threading.Thread(
                target=_send_notification_email,
                args=(to_email, title, body, link),
                daemon=True,
            ).start()
        else:
            _send_notification_email(to_email, title, body, link)

    return notification
