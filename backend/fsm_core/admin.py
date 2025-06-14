"""
Admin interface for FSM core models
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django import forms
from .models import User, Permission, Role, UserPermission, AuditLog


class CustomUserCreationForm(UserCreationForm):
    """Custom user creation form"""
    
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'phone_number')


class CustomUserChangeForm(UserChangeForm):
    """Custom user change form"""
    
    class Meta(UserChangeForm.Meta):
        model = User
        fields = '__all__'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model"""
    
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    
    list_display = (
        'username', 'email', 'first_name', 'last_name', 
        'role', 'is_active', 'is_staff', 'date_joined'
    )
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'employee_id')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Department', {
            'fields': ('role', 'employee_id', 'department', 'hire_date')
        }),
        ('Contact Information', {
            'fields': ('phone_number',)
        }),
        ('Verification', {
            'fields': ('is_verified',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'password1', 'password2',
                'first_name', 'last_name', 'role', 'phone_number'
            ),
        }),
    )
    
    def get_queryset(self, request):
        """Limit queryset based on user role"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        elif request.user.role == 'admin':
            # Admins can see all non-superuser accounts
            return qs.filter(is_superuser=False)
        elif request.user.role == 'manager':
            # Managers can see technicians and customers
            return qs.filter(role__in=['technician', 'customer'])
        else:
            # Others can only see themselves
            return qs.filter(id=request.user.id)


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    """Admin interface for Permission model"""
    
    list_display = ('name', 'codename', 'description')
    search_fields = ('name', 'codename', 'description')
    list_filter = ('name',)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Admin interface for Role model"""
    
    list_display = ('name', 'description', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    filter_horizontal = ('permissions',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Permissions', {
            'fields': ('permissions',)
        }),
    )


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    """Admin interface for UserPermission model"""
    
    list_display = (
        'user', 'permission', 'granted_by', 
        'granted_at', 'expires_at'
    )
    list_filter = ('granted_at', 'expires_at', 'permission')
    search_fields = (
        'user__username', 'user__email', 
        'permission__name', 'granted_by__username'
    )
    
    def get_queryset(self, request):
        """Limit queryset based on user role"""
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.role == 'admin':
            return qs
        else:
            # Others can only see their own permissions
            return qs.filter(user=request.user)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for AuditLog model"""
    
    list_display = (
        'user', 'action', 'resource_type', 
        'resource_id', 'ip_address', 'timestamp'
    )
    list_filter = ('action', 'resource_type', 'timestamp')
    search_fields = (
        'user__username', 'resource_type', 
        'resource_id', 'ip_address'
    )
    readonly_fields = (
        'user', 'action', 'resource_type', 'resource_id',
        'details', 'ip_address', 'user_agent', 'timestamp'
    )
    
    def has_add_permission(self, request):
        """Prevent manual addition of audit logs"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent modification of audit logs"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete audit logs"""
        return request.user.is_superuser
    
    def get_queryset(self, request):
        """Limit queryset based on user role"""
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.role == 'admin':
            return qs
        elif request.user.role == 'manager':
            # Managers can see logs for their department
            return qs.filter(user__department=request.user.department)
        else:
            # Others can only see their own logs
            return qs.filter(user=request.user)


# Customize admin site
admin.site.site_header = "AJ Long Electric FSM Administration"
admin.site.site_title = "FSM Admin"
admin.site.index_title = "Field Service Management Administration"