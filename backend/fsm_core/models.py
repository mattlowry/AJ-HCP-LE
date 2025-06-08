"""
Core models for FSM application including user management and roles
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Extended user model with role-based access control
    """
    
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('technician', 'Technician'),
        ('customer', 'Customer'),
    ]
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='customer',
        help_text='User role determines access permissions'
    )
    
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
        )]
    )
    
    employee_id = models.CharField(
        max_length=20,
        blank=True,
        unique=True,
        null=True,
        help_text='Employee ID for staff members'
    )
    
    department = models.CharField(
        max_length=50,
        blank=True,
        help_text='Department for staff members'
    )
    
    hire_date = models.DateField(
        null=True,
        blank=True,
        help_text='Hire date for staff members'
    )
    
    is_verified = models.BooleanField(
        default=False,
        help_text='Whether user email is verified'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fsm_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def full_name(self):
        """Return full name"""
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    def has_role(self, role):
        """Check if user has specific role"""
        return self.role == role
    
    def has_any_role(self, roles):
        """Check if user has any of the specified roles"""
        return self.role in roles
    
    def is_staff_member(self):
        """Check if user is staff (admin, manager, or technician)"""
        return self.role in ['admin', 'manager', 'technician']
    
    def can_manage_users(self):
        """Check if user can manage other users"""
        return self.role in ['admin', 'manager']
    
    def can_access_analytics(self):
        """Check if user can access analytics"""
        return self.role in ['admin', 'manager']
    
    def can_manage_billing(self):
        """Check if user can manage billing"""
        return self.role in ['admin', 'manager']


class Permission(models.Model):
    """
    Permission model for fine-grained access control
    """
    
    name = models.CharField(max_length=100, unique=True)
    codename = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'fsm_permissions'
        verbose_name = 'Permission'
        verbose_name_plural = 'Permissions'
    
    def __str__(self):
        return self.name


class Role(models.Model):
    """
    Role model for grouping permissions
    """
    
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(Permission, blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fsm_roles'
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'
    
    def __str__(self):
        return self.name


class UserPermission(models.Model):
    """
    Additional permissions for specific users
    """
    
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='additional_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    granted_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='granted_permissions')
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'fsm_user_permissions'
        unique_together = ['user', 'permission']
        verbose_name = 'User Permission'
        verbose_name_plural = 'User Permissions'
    
    def __str__(self):
        return f"{self.user.username} - {self.permission.name}"


class AuditLog(models.Model):
    """
    Audit log for tracking user actions
    """
    
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('access_denied', 'Access Denied'),
    ]
    
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=50, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'fsm_audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['resource_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.resource_type} - {self.timestamp}"