from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Institution, User


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ('name', 'teacher_code', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'teacher_code')


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    # Extiende el UserAdmin estándar (hashea password, no lo expone) con los
    # campos propios del proyecto.
    list_display = ('username', 'email', 'role', 'institution', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_active', 'institution')
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('CogniRoom', {'fields': ('role', 'institution')}),
    )
