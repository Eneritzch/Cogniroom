import os

from django.conf import settings


def _walk_max_mtime(root):
    latest = 0
    for base, _dirs, files in os.walk(root):
        for f in files:
            try:
                m = os.path.getmtime(os.path.join(base, f))
                if m > latest:
                    latest = m
            except OSError:
                pass
    return latest


_cached_version = None


def asset_version(request):
    """Cache-buster de CSS/JS: el mtime más reciente de los estáticos. Estable
    entre navegaciones (el navegador cachea, sin flash sin estilos) y sube al
    editar un archivo. Con DEBUG=False se calcula una sola vez."""
    global _cached_version
    if not settings.DEBUG and _cached_version is not None:
        return {'ASSET_V': _cached_version}

    try:
        root = settings.BASE_DIR / 'static'
        latest = max(
            _walk_max_mtime(root / 'css'),
            _walk_max_mtime(root / 'js'),
        )
        for name in ('landing.css', 'landing.js'):
            try:
                latest = max(latest, os.path.getmtime(root / name))
            except OSError:
                pass
        version = int(latest) or 1
    except Exception:
        version = 1

    _cached_version = version
    return {'ASSET_V': version}
