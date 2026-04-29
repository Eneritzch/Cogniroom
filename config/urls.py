from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView


def api_root(request):
    return JsonResponse({
        'name': 'CogniRoom API',
        'version': '1.0',
        'endpoints': {
            'auth': {
                'register': 'POST /api/auth/register/',
                'login': 'POST /api/auth/login/',
                'refresh': 'POST /api/auth/refresh/',
                'me': 'GET /api/auth/me/',
            },
            'rooms': {
                'create': 'POST /api/rooms/',
                'list': 'GET /api/rooms/',
                'join': 'POST /api/rooms/join/',
                'members': 'GET /api/rooms/{id}/members/',
            },
            'questions': {
                'create_node': 'POST /api/rooms/{room_id}/nodes/',
                'list_nodes': 'GET /api/rooms/{room_id}/nodes/',
                'generate': 'POST /api/rooms/{room_id}/questions/generate/',
                'manual': 'POST /api/rooms/{room_id}/questions/manual/',
                'approve': 'POST /api/rooms/{room_id}/questions/approve/',
                'list': 'GET /api/rooms/{room_id}/questions/',
            },
            'pdfs': {
                'upload': 'POST /api/rooms/{room_id}/pdfs/  (multipart, field: file)',
                'list': 'GET /api/rooms/{room_id}/pdfs/',
                'detail': 'GET /api/rooms/{room_id}/pdfs/{pdf_id}/',
                'delete': 'DELETE /api/rooms/{room_id}/pdfs/{pdf_id}/',
            },
            'sessions': {
                'create': 'POST /api/sessions/',
                'next_question': 'GET /api/sessions/{id}/next-question/',
                'answer': 'POST /api/sessions/{id}/answer/',
                'complete': 'POST /api/sessions/{id}/complete/',
            },
            'cognitive': {
                'my_profile': 'GET /api/cognitive/my-profile/',
                'my_nodes': 'GET /api/cognitive/my-nodes/',
                'blind_spots': 'GET /api/rooms/{room_id}/blind-spots/',
                'at_risk': 'GET /api/rooms/{room_id}/at-risk/',
            },
        },
    })


urlpatterns = [
    path('', TemplateView.as_view(template_name='app/index.html')),
    path('app/', TemplateView.as_view(template_name='app/index.html')),
    path('app/dashboard/', TemplateView.as_view(template_name='app/dashboard.html')),
    path('app/design-system/', TemplateView.as_view(template_name='app/design-system.html')),
    path('demo/', TemplateView.as_view(template_name='demo.html')),
    path('api/', api_root),
    path('api/auth/', include('apps.users.urls')),
    path('api/rooms/', include('apps.rooms.urls')),
    path('api/rooms/', include('apps.questions.urls')),
    path('api/rooms/', include('apps.cognitive.room_urls')),
    path('api/sessions/', include('apps.sessions.urls')),
    path('api/cognitive/', include('apps.cognitive.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
