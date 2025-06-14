"""
Django signals for audit logging and user management
"""

from django.db.models.signals import post_save, post_delete
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from .models import AuditLog
import threading

# Thread-local storage for request data
_thread_local = threading.local()

User = get_user_model()


def set_current_request(request):
    """Set current request in thread-local storage"""
    _thread_local.request = request


def get_current_request():
    """Get current request from thread-local storage"""
    return getattr(_thread_local, 'request', None)


@receiver(post_save, sender=User)
def create_user_token(sender, instance, created, **kwargs):
    """Create auth token when user is created"""
    if created:
        Token.objects.create(user=instance)
        
        # Log user creation
        request = get_current_request()
        AuditLog.objects.create(
            user=instance,
            action='create',
            resource_type='user',
            resource_id=str(instance.id),
            details={'username': instance.username, 'role': instance.role},
            ip_address=get_client_ip(request) if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else ''
        )


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log successful user login"""
    AuditLog.objects.create(
        user=user,
        action='login',
        resource_type='authentication',
        details={'method': 'login'},
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout"""
    AuditLog.objects.create(
        user=user,
        action='logout',
        resource_type='authentication',
        details={'method': 'logout'},
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )


@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    """Log failed login attempts"""
    username = credentials.get('username', 'unknown')
    AuditLog.objects.create(
        user=None,
        action='access_denied',
        resource_type='authentication',
        details={
            'method': 'login_failed',
            'username': username,
            'reason': 'invalid_credentials'
        },
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )


def get_client_ip(request):
    """Get real client IP address"""
    if not request:
        return None
        
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_model_change(sender, instance, action, **kwargs):
    """Generic function to log model changes"""
    request = get_current_request()
    if not request or not hasattr(request, 'user'):
        return
    
    user = request.user if request.user.is_authenticated else None
    
    AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=sender._meta.model_name,
        resource_id=str(instance.pk) if instance.pk else 'new',
        details={
            'model': sender._meta.label,
            'fields_changed': getattr(instance, '_changed_fields', [])
        },
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )