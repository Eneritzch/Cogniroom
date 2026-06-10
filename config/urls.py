from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path
from django.views.generic import TemplateView


def api_root(request):
    return JsonResponse({
        'name': 'CogniRoom API',
        'version': 'v1',
        'base': '/api/v1/',
        'auth': {
            'register': 'POST /api/v1/auth/register/',
            'login':    'POST /api/v1/auth/login/',
            'logout':   'POST /api/v1/auth/logout/',
            'refresh':  'POST /api/v1/auth/refresh/',
            'me':       'GET  /api/v1/auth/me/',
        },
        'profile':   'GET /api/v1/profile/',
        'nodes': {
            'list':   'GET /api/v1/nodes/',
            'detail': 'GET /api/v1/nodes/{node_id}/',
        },
        'diagnoses': 'GET /api/v1/diagnoses/',
        'rooms': {
            'list':    'GET  /api/v1/rooms/',
            'create':  'POST /api/v1/rooms/',
            'join':    'POST /api/v1/rooms/join/',
            'members': 'GET  /api/v1/rooms/{room_id}/members/',
        },
        'questions': {
            'nodes_list':    'GET  /api/v1/rooms/{room_id}/nodes/',
            'nodes_create':  'POST /api/v1/rooms/{room_id}/nodes/',
            'list':          'GET  /api/v1/rooms/{room_id}/questions/',
            'manual_create': 'POST /api/v1/rooms/{room_id}/questions/manual/',
            'generate':      'POST /api/v1/rooms/{room_id}/questions/generate/',
            'approve':       'POST /api/v1/rooms/{room_id}/questions/approve/',
        },
        'pdfs': {
            'list':   'GET    /api/v1/rooms/{room_id}/pdfs/',
            'upload': 'POST   /api/v1/rooms/{room_id}/pdfs/  (multipart, field: file)',
            'detail': 'GET    /api/v1/rooms/{room_id}/pdfs/{pdf_id}/',
            'delete': 'DELETE /api/v1/rooms/{room_id}/pdfs/{pdf_id}/',
        },
        'room_metrics': {
            'blind_spots': 'GET /api/v1/rooms/{room_id}/metrics/blind-spots/',
            'at_risk':     'GET /api/v1/rooms/{room_id}/metrics/at-risk/',
        },
        'sessions': {
            'list':          'GET  /api/v1/sessions/',
            'create':        'POST /api/v1/sessions/',
            'next_question': 'GET  /api/v1/sessions/{session_id}/next-question/',
            'answers':       'POST /api/v1/sessions/{session_id}/answers/',
            'review':        'GET  /api/v1/sessions/{session_id}/review/',
            'complete':      'POST /api/v1/sessions/{session_id}/complete/',
        },
    })


html_routes = [
    path('',                                  TemplateView.as_view(template_name='landing.html'),                      name='landing'),
    path('app/',                              TemplateView.as_view(template_name='app/public/login.html'),             name='login'),
    path('app/register/',                     TemplateView.as_view(template_name='app/public/register.html'),          name='register'),
    path('app/dashboard/',                    TemplateView.as_view(template_name='app/shared/dashboard.html'),         name='dashboard'),
    path('app/diagnoses/',                    TemplateView.as_view(template_name='app/shared/diagnoses.html'),         name='diagnoses'),
    path('app/students/',                     TemplateView.as_view(template_name='app/teacher/students.html'),         name='teacher-students'),
    path('app/questions/',                    TemplateView.as_view(template_name='app/teacher/questions.html'),        name='teacher-questions'),
    path('app/pdfs/',                         TemplateView.as_view(template_name='app/teacher/pdfs.html'),             name='teacher-pdfs'),
    path('app/metrics/',                      TemplateView.as_view(template_name='app/teacher/metrics.html'),          name='teacher-metrics'),
    path('app/rooms/',                        TemplateView.as_view(template_name='app/teacher/rooms.html'),            name='teacher-rooms'),
    path('app/room/<int:room_id>/',           TemplateView.as_view(template_name='app/teacher/room.html'),             name='room-detail'),
    path('app/my-rooms/',                     TemplateView.as_view(template_name='app/student/my-rooms.html'),         name='student-my-rooms'),
    path('app/history/',                      TemplateView.as_view(template_name='app/student/history.html'),          name='student-history'),
    path('app/session/<int:session_id>/',     TemplateView.as_view(template_name='app/student/session.html'),          name='session-detail'),
    path('app/session/<int:session_id>/review/', TemplateView.as_view(template_name='app/student/session-review.html'), name='student-session-review'),
    path('app/node/<slug:node_id>/',          TemplateView.as_view(template_name='app/student/node-detail.html'),       name='student-node-detail'),
    path('app/profile/',                      TemplateView.as_view(template_name='app/student/profile.html'),          name='student-profile'),
    path('app/teacher-profile/',              TemplateView.as_view(template_name='app/teacher/profile.html'),          name='teacher-profile'),
]


api_routes = [
    path('api/v1/',          api_root,                              name='api-root'),
    path('api/v1/auth/',     include('apps.users.urls')),
    path('api/v1/rooms/',    include('apps.rooms.urls')),
    path('api/v1/sessions/', include('apps.sessions.urls')),
    path('api/v1/',          include('apps.cognitive.urls')),
]


urlpatterns = html_routes + api_routes


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
