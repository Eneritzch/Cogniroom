import sys
from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

# Tareas en segundo plano (generación IA, diagnóstico): en tests se ejecutan
# de forma síncrona para que sean deterministas y no filtren estado entre casos.
TASKS_ALWAYS_EAGER = config('TASKS_ALWAYS_EAGER', default=False, cast=bool) or ('test' in sys.argv)

DEBUG = config('DEBUG', default=False, cast=bool)

# En producción (DEBUG=False) no hay default: si falta SECRET_KEY el arranque
# falla en vez de firmar con una clave pública conocida.
SECRET_KEY = (
    config('SECRET_KEY', default='django-insecure-dev-only-key')
    if DEBUG else config('SECRET_KEY')
)

# Sin comodín: en producción exige hosts explícitos; en dev cae a localhost.
ALLOWED_HOSTS = [
    h.strip()
    for h in config('ALLOWED_HOSTS', default='localhost,127.0.0.1' if DEBUG else '').split(',')
    if h.strip()
]

ANTHROPIC_API_KEY = config('ANTHROPIC_API_KEY', default='')

# En tests nunca se llama a la API real (lenta, no determinista, con costo): sin key
# el servicio devuelve defaults vacíos, que es el camino degradado a ejercitar.
if 'test' in sys.argv:
    ANTHROPIC_API_KEY = ''

# Preguntas con IA que un docente puede generar por mes calendario. 0 = sin límite.
AI_MONTHLY_QUESTION_QUOTA = config('AI_MONTHLY_QUESTION_QUOTA', default=100, cast=int)

# Umbral de desalineación (ICC): por debajo se dispara el diagnóstico IA en
# respuestas falladas. Es una decisión de costo operativo, no de dominio: los
# umbrales del modelo viven en services/thresholds.py. Subirlo reduce el gasto.
AI_ICC_THRESHOLD = config('AI_ICC_THRESHOLD', default=0.6, cast=float)

# El alta de docentes se valida contra el código por institución
# (Institution.teacher_code), no contra un secreto global. Ver apps.users.

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',

    'apps.users',
    'apps.rooms',
    'apps.questions',
    'apps.sessions',
    'apps.cognitive',
    'apps.notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'config.context_processors.asset_version',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='cogniroom'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

AUTH_USER_MODEL = 'users.User'

# Por defecto consola (no envía); para envío real configurar SMTP en .env (ver .env.example).
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='CogniRoom <no-reply@cogniroom.com>')

# URL base para construir enlaces absolutos en los correos (CTA de notificaciones).
SITE_URL = config('SITE_URL', default='http://127.0.0.1:8000')

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Producto en español para universidades ecuatorianas: admin y mensajes de DRF en
# español, y fechas en hora local (se siguen guardando en UTC).
LANGUAGE_CODE = 'es-ec'
TIME_ZONE = 'America/Guayaquil'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # endpoints sensibles (login/register) — anti fuerza bruta
        'auth': '10/min',
        # tope general para clientes anónimos
        'anon': '60/min',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_CREDENTIALS = True

# Endurecimiento de producción. Activo solo cuando DEBUG=False para no entorpecer
# el desarrollo local (sin HTTPS). En prod, define las variables en el entorno.
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    X_FRAME_OPTIONS = 'DENY'
