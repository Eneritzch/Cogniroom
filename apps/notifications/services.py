import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import Notification

logger = logging.getLogger(__name__)


def notify(recipient, *, kind, title, body='', link='', email=True):
    """Crea una notificación in-app y, opcionalmente, envía un email.

    Best-effort: cualquier fallo de email se traga (fail_silently) para que el
    flujo que dispara la notificación nunca se rompa por la mensajería. Con el
    backend de consola (default) el email se imprime en la terminal.
    """
    notification = Notification.objects.create(
        recipient=recipient,
        kind=kind,
        title=title,
        body=body,
        link=link,
    )

    if email and getattr(recipient, 'email', ''):
        try:
            send_mail(
                subject=title,
                message=body or title,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=True,
            )
        except Exception:
            logger.exception('No se pudo enviar el email de notificación')

    return notification
