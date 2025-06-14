"""
Comprehensive authentication and security middleware for FSM Core
"""

import json
import time
import logging
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from rest_framework.authtoken.models import Token
from rest_framework import status

logger = logging.getLogger(__name__)


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware to prevent abuse
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        # Skip rate limiting for admin and static files
        if request.path.startswith('/admin/') or request.path.startswith('/static/'):
            return None
            
        # Get client IP
        ip = self.get_client_ip(request)
        
        # Different limits based on endpoint type
        if request.path.startswith('/api/auth/'):
            # Stricter limits for auth endpoints
            limit = getattr(settings, 'AUTH_RATE_LIMIT', 5)  # 5 requests per minute
            window = 60
        else:
            # General API limits
            limit = getattr(settings, 'API_RATE_LIMIT', 100)  # 100 requests per minute
            window = 60
        
        cache_key = f'rate_limit:{ip}:{request.path_info.split("/")[1]}'
        
        try:
            # Get current request count
            current_requests = cache.get(cache_key, 0)
            
            if current_requests >= limit:
                logger.warning(f'Rate limit exceeded for IP {ip} on {request.path}')
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'detail': f'Maximum {limit} requests per minute allowed'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Increment counter
            cache.set(cache_key, current_requests + 1, window)
            
        except Exception as e:
            # If cache is unavailable (e.g., Redis is down), skip rate limiting
            # Log the error but don't block the request
            logger.warning(f'Cache unavailable for rate limiting: {e}')
            # In production, you might want to use in-memory fallback or database
            pass
        
        return None
    
    def get_client_ip(self, request):
        """Get real client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses
    """
    
    def process_response(self, request, response):
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Content Security Policy for API responses
        if request.path.startswith('/api/'):
            response['Content-Security-Policy'] = "default-src 'none'"
        
        return response


class AuthenticationLoggingMiddleware(MiddlewareMixin):
    """
    Log authentication attempts and security events
    """
    
    def process_request(self, request):
        # Log authentication attempts
        if request.path.startswith('/api/auth/'):
            logger.info(f'Auth attempt from {self.get_client_ip(request)} to {request.path}')
        
        return None
    
    def process_response(self, request, response):
        # Log failed authentication
        if (request.path.startswith('/api/auth/') and 
            response.status_code in [401, 403]):
            logger.warning(f'Failed auth from {self.get_client_ip(request)} to {request.path}')
        
        return response
    
    def get_client_ip(self, request):
        """Get real client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class TokenValidationMiddleware(MiddlewareMixin):
    """
    Enhanced token validation middleware
    """
    
    def process_request(self, request):
        # Skip for non-API requests
        if not request.path.startswith('/api/'):
            return None
        
        # Skip for auth endpoints
        if request.path.startswith('/api/auth/'):
            return None
            
        # Check for token in header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            
            try:
                # Validate token
                token = Token.objects.select_related('user').get(key=token_key)
                
                # Check if user is active
                if not token.user.is_active:
                    logger.warning(f'Inactive user attempted access: {token.user.username}')
                    return JsonResponse({
                        'error': 'Account disabled',
                        'detail': 'Your account has been disabled'
                    }, status=status.HTTP_403_FORBIDDEN)
                
                # Check token age (optional)
                token_age_limit = getattr(settings, 'TOKEN_AGE_LIMIT', None)
                if token_age_limit:
                    token_age = time.time() - token.created.timestamp()
                    if token_age > token_age_limit:
                        logger.info(f'Expired token used by {token.user.username}')
                        return JsonResponse({
                            'error': 'Token expired',
                            'detail': 'Please log in again'
                        }, status=status.HTTP_401_UNAUTHORIZED)
                
                # Set user on request
                request.user = token.user
                
            except Token.DoesNotExist:
                logger.warning(f'Invalid token attempted from {self.get_client_ip(request)}')
                return JsonResponse({
                    'error': 'Invalid token',
                    'detail': 'Authentication required'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        return None
    
    def get_client_ip(self, request):
        """Get real client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class APIPermissionMiddleware(MiddlewareMixin):
    """
    Check API permissions based on user role and endpoint
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Define role-based access control
        self.role_permissions = {
            'admin': ['*'],  # Admin has access to everything
            'manager': [
                'customers.*', 'jobs.*', 'scheduling.*', 
                'billing.*', 'analytics.read', 'inventory.*'
            ],
            'technician': [
                'customers.read', 'jobs.read', 'jobs.update',
                'inventory.read', 'scheduling.read'
            ],
            'customer': [
                'jobs.read', 'billing.read', 'customers.read'
            ]
        }
        super().__init__(get_response)
    
    def process_request(self, request):
        # Skip for non-API requests or auth endpoints
        if not request.path.startswith('/api/') or request.path.startswith('/api/auth/'):
            return None
        
        # Check if user is authenticated
        if isinstance(request.user, AnonymousUser):
            return JsonResponse({
                'error': 'Authentication required',
                'detail': 'Please log in to access this resource'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Extract permission from path
        path_parts = request.path.strip('/').split('/')
        if len(path_parts) < 2:
            return None
            
        resource = path_parts[1]  # e.g., 'customers', 'jobs'
        method = request.method.lower()
        
        # Map HTTP methods to permissions
        method_permission_map = {
            'get': 'read',
            'post': 'create', 
            'put': 'update',
            'patch': 'update',
            'delete': 'delete'
        }
        
        permission = method_permission_map.get(method, 'read')
        required_permission = f'{resource}.{permission}'
        
        # Check if user has permission
        user_role = getattr(request.user, 'role', None)
        if not user_role:
            # Fallback to staff status
            user_role = 'admin' if request.user.is_staff else 'customer'
        
        if not self.has_permission(user_role, required_permission):
            logger.warning(f'Permission denied for {request.user.username} ({user_role}) to {required_permission}')
            return JsonResponse({
                'error': 'Permission denied',
                'detail': f'You do not have permission to {permission} {resource}'
            }, status=status.HTTP_403_FORBIDDEN)
        
        return None
    
    def has_permission(self, role, required_permission):
        """Check if role has required permission"""
        role_perms = self.role_permissions.get(role, [])
        
        # Check for wildcard permission
        if '*' in role_perms:
            return True
        
        # Check for exact match
        if required_permission in role_perms:
            return True
        
        # Check for resource wildcard (e.g., 'customers.*')
        resource = required_permission.split('.')[0]
        if f'{resource}.*' in role_perms:
            return True
        
        return False