from django.contrib import admin

from .models import AIGenerationLog


@admin.register(AIGenerationLog)
class AIGenerationLogAdmin(admin.ModelAdmin):
    list_display = (
        'created_at', 'teacher', 'room', 'node', 'model',
        'requested_count', 'created_count',
        'input_tokens', 'output_tokens', 'cache_read_tokens',
    )
    list_filter = ('model', 'created_at')
    search_fields = ('teacher__email', 'teacher__username', 'room__name')
    date_hierarchy = 'created_at'
    readonly_fields = tuple(f.name for f in AIGenerationLog._meta.fields)
