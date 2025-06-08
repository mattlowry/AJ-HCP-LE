"""
Comprehensive tests for FSM Core models and middleware
"""

import json
import time
from unittest.mock import patch, MagicMock
from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework.authtoken.models import Token
from rest_framework import status

from .models import User, Permission, Role, UserPermission, AuditLog
from .middleware import (
    RateLimitMiddleware, SecurityHeadersMiddleware, 
    AuthenticationLoggingMiddleware, TokenValidationMiddleware,
    APIPermissionMiddleware
)

User = get_user_model()


class UserModelTest(TestCase):
    """Test custom User model"""
    
    def setUp(self):
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'technician'
        }
    
    def test_create_user(self):
        """Test user creation"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.role, 'technician')
        self.assertTrue(user.check_password('testpass123'))
        self.assertFalse(user.is_verified)
    
    def test_user_str_representation(self):
        """Test user string representation"""
        user = User.objects.create_user(**self.user_data)
        expected = f"testuser (Technician)"
        self.assertEqual(str(user), expected)
    
    def test_full_name_property(self):
        """Test full_name property"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.full_name, "Test User")
        
        # Test with empty name
        user.first_name = ""
        user.last_name = ""
        self.assertEqual(user.full_name, "testuser")
    
    def test_role_methods(self):
        """Test role checking methods"""
        admin = User.objects.create_user(username='admin', role='admin')
        manager = User.objects.create_user(username='manager', role='manager')
        technician = User.objects.create_user(username='tech', role='technician')
        customer = User.objects.create_user(username='customer', role='customer')
        
        # Test has_role
        self.assertTrue(admin.has_role('admin'))
        self.assertFalse(admin.has_role('manager'))
        
        # Test has_any_role
        self.assertTrue(manager.has_any_role(['admin', 'manager']))
        self.assertFalse(customer.has_any_role(['admin', 'manager']))
        
        # Test is_staff_member
        self.assertTrue(admin.is_staff_member())
        self.assertTrue(manager.is_staff_member())
        self.assertTrue(technician.is_staff_member())
        self.assertFalse(customer.is_staff_member())
        
        # Test permission methods
        self.assertTrue(admin.can_manage_users())
        self.assertTrue(manager.can_manage_users())
        self.assertFalse(technician.can_manage_users())
        
        self.assertTrue(admin.can_access_analytics())
        self.assertTrue(manager.can_access_analytics())
        self.assertFalse(technician.can_access_analytics())


class PermissionModelTest(TestCase):
    """Test Permission model"""
    
    def test_create_permission(self):
        """Test permission creation"""
        permission = Permission.objects.create(
            name="View Customers",
            codename="customers.view",
            description="Can view customer list"
        )
        self.assertEqual(str(permission), "View Customers")
        self.assertEqual(permission.codename, "customers.view")


class RoleModelTest(TestCase):
    """Test Role model"""
    
    def test_create_role(self):
        """Test role creation"""
        permission = Permission.objects.create(
            name="View Jobs",
            codename="jobs.view"
        )
        
        role = Role.objects.create(
            name="Field Technician",
            description="Basic field work access"
        )
        role.permissions.add(permission)
        
        self.assertEqual(str(role), "Field Technician")
        self.assertTrue(role.is_active)
        self.assertEqual(role.permissions.count(), 1)


class UserPermissionModelTest(TestCase):
    """Test UserPermission model"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        self.permission = Permission.objects.create(
            name="Special Access",
            codename="special.access"
        )
        self.grantor = User.objects.create_user(username='admin', role='admin')
    
    def test_create_user_permission(self):
        """Test user permission creation"""
        user_perm = UserPermission.objects.create(
            user=self.user,
            permission=self.permission,
            granted_by=self.grantor
        )
        
        expected_str = f"{self.user.username} - {self.permission.name}"
        self.assertEqual(str(user_perm), expected_str)


class AuditLogModelTest(TestCase):
    """Test AuditLog model"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
    
    def test_create_audit_log(self):
        """Test audit log creation"""
        log = AuditLog.objects.create(
            user=self.user,
            action='create',
            resource_type='customer',
            resource_id='123',
            details={'name': 'John Doe'},
            ip_address='192.168.1.1'
        )
        
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action, 'create')
        self.assertEqual(log.resource_type, 'customer')
        self.assertEqual(log.details['name'], 'John Doe')


class RateLimitMiddlewareTest(TestCase):
    """Test rate limiting middleware"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = RateLimitMiddleware(lambda request: None)
        cache.clear()
    
    def test_rate_limit_normal_request(self):
        """Test normal request within limits"""
        request = self.factory.get('/api/customers/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        response = self.middleware.process_request(request)
        self.assertIsNone(response)  # Should pass through
    
    def test_rate_limit_exceeded(self):
        """Test rate limit exceeded"""
        request = self.factory.get('/api/customers/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        # Make requests up to the limit
        for i in range(100):  # Default limit
            response = self.middleware.process_request(request)
            if response:
                break
        
        # Next request should be rate limited
        response = self.middleware.process_request(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 429)
    
    def test_auth_endpoint_rate_limit(self):
        """Test stricter rate limiting for auth endpoints"""
        request = self.factory.post('/api/auth/login/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        # Make requests up to auth limit (5)
        for i in range(5):
            response = self.middleware.process_request(request)
        
        # Next request should be rate limited
        response = self.middleware.process_request(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 429)
    
    def test_get_client_ip_forwarded(self):
        """Test client IP extraction with forwarded header"""
        request = self.factory.get('/api/test/')
        request.META['HTTP_X_FORWARDED_FOR'] = '203.0.113.1, 192.168.1.1'
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        ip = self.middleware.get_client_ip(request)
        self.assertEqual(ip, '203.0.113.1')


class SecurityHeadersMiddlewareTest(TestCase):
    """Test security headers middleware"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = SecurityHeadersMiddleware(lambda request: JsonResponse({}))
    
    def test_security_headers_added(self):
        """Test that security headers are added"""
        request = self.factory.get('/api/customers/')
        response = self.middleware.process_response(request, JsonResponse({}))
        
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['X-Frame-Options'], 'DENY')
        self.assertEqual(response['X-XSS-Protection'], '1; mode=block')
        self.assertIn('strict-origin-when-cross-origin', response['Referrer-Policy'])
    
    def test_api_csp_header(self):
        """Test CSP header for API requests"""
        request = self.factory.get('/api/customers/')
        response = self.middleware.process_response(request, JsonResponse({}))
        
        self.assertEqual(response['Content-Security-Policy'], "default-src 'none'")


class TokenValidationMiddlewareTest(TestCase):
    """Test token validation middleware"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = TokenValidationMiddleware(lambda request: JsonResponse({}))
        self.user = User.objects.create_user(username='testuser', is_active=True)
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.inactive_user = User.objects.create_user(username='inactive', is_active=False)
        self.inactive_token, _ = Token.objects.get_or_create(user=self.inactive_user)
    
    def test_valid_token(self):
        """Test valid token passes through"""
        request = self.factory.get('/api/customers/')
        request.META['HTTP_AUTHORIZATION'] = f'Token {self.token.key}'
        
        response = self.middleware.process_request(request)
        self.assertIsNone(response)
        self.assertEqual(request.user, self.user)
    
    def test_invalid_token(self):
        """Test invalid token returns 401"""
        request = self.factory.get('/api/customers/')
        request.META['HTTP_AUTHORIZATION'] = 'Token invalid-token'
        
        response = self.middleware.process_request(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 401)
    
    def test_inactive_user_token(self):
        """Test inactive user token returns 403"""
        request = self.factory.get('/api/customers/')
        request.META['HTTP_AUTHORIZATION'] = f'Token {self.inactive_token.key}'
        
        response = self.middleware.process_request(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 403)
    
    def test_non_api_request_skipped(self):
        """Test non-API requests are skipped"""
        request = self.factory.get('/admin/')
        response = self.middleware.process_request(request)
        self.assertIsNone(response)
    
    def test_auth_endpoint_skipped(self):
        """Test auth endpoints are skipped"""
        request = self.factory.post('/api/auth/login/')
        response = self.middleware.process_request(request)
        self.assertIsNone(response)


class APIPermissionMiddlewareTest(TestCase):
    """Test API permission middleware"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = APIPermissionMiddleware(lambda request: JsonResponse({}))
        
        self.admin = User.objects.create_user(username='admin', role='admin')
        self.manager = User.objects.create_user(username='manager', role='manager')
        self.technician = User.objects.create_user(username='tech', role='technician')
        self.customer = User.objects.create_user(username='customer', role='customer')
    
    def test_admin_access_all(self):
        """Test admin has access to all endpoints"""
        request = self.factory.delete('/api/customers/1/')
        request.user = self.admin
        
        response = self.middleware.process_request(request)
        self.assertIsNone(response)  # Should pass through
    
    def test_manager_permissions(self):
        """Test manager permissions"""
        # Manager can read customers
        request = self.factory.get('/api/customers/')
        request.user = self.manager
        response = self.middleware.process_request(request)
        self.assertIsNone(response)
        
        # Manager can create jobs
        request = self.factory.post('/api/jobs/')
        request.user = self.manager
        response = self.middleware.process_request(request)
        self.assertIsNone(response)
    
    def test_technician_limited_access(self):
        """Test technician limited access"""
        # Technician can read customers
        request = self.factory.get('/api/customers/')
        request.user = self.technician
        response = self.middleware.process_request(request)
        self.assertIsNone(response)
        
        # Technician cannot delete customers
        request = self.factory.delete('/api/customers/1/')
        request.user = self.technician
        response = self.middleware.process_request(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 403)
    
    def test_customer_minimal_access(self):
        """Test customer minimal access"""
        # Customer can read their own data
        request = self.factory.get('/api/jobs/')
        request.user = self.customer
        response = self.middleware.process_request(request)
        self.assertIsNone(response)
        
        # Customer cannot create jobs
        request = self.factory.post('/api/jobs/')
        request.user = self.customer
        response = self.middleware.process_request(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 403)
    
    def test_anonymous_user_denied(self):
        """Test anonymous users are denied"""
        from django.contrib.auth.models import AnonymousUser
        
        request = self.factory.get('/api/customers/')
        request.user = AnonymousUser()
        
        response = self.middleware.process_request(request)
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 401)
    
    def test_non_api_request_skipped(self):
        """Test non-API requests are skipped"""
        request = self.factory.get('/admin/')
        request.user = self.customer
        
        response = self.middleware.process_request(request)
        self.assertIsNone(response)


class AuthenticationLoggingMiddlewareTest(TestCase):
    """Test authentication logging middleware"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = AuthenticationLoggingMiddleware(lambda request: JsonResponse({}))
    
    @patch('fsm_core.middleware.logger')
    def test_auth_attempt_logged(self, mock_logger):
        """Test authentication attempts are logged"""
        request = self.factory.post('/api/auth/login/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        self.middleware.process_request(request)
        mock_logger.info.assert_called_once()
    
    @patch('fsm_core.middleware.logger')
    def test_failed_auth_logged(self, mock_logger):
        """Test failed authentication is logged"""
        request = self.factory.post('/api/auth/login/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        response = JsonResponse({}, status=401)
        self.middleware.process_response(request, response)
        mock_logger.warning.assert_called_once()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class SignalsTest(TestCase):
    """Test Django signals"""
    
    def test_user_token_created_on_save(self):
        """Test token is created when user is created"""
        user = User.objects.create_user(username='newuser')
        self.assertTrue(Token.objects.filter(user=user).exists())
    
    def test_audit_log_created_on_user_creation(self):
        """Test audit log is created when user is created"""
        initial_count = AuditLog.objects.count()
        User.objects.create_user(username='newuser')
        
        # Should have one more audit log entry
        self.assertEqual(AuditLog.objects.count(), initial_count + 1)
        
        log = AuditLog.objects.latest('timestamp')
        self.assertEqual(log.action, 'create')
        self.assertEqual(log.resource_type, 'user')


class UserModelValidationTest(TestCase):
    """Test user model validation"""
    
    def test_unique_username_required(self):
        """Test username must be unique"""
        User.objects.create_user(username='testuser')
        
        with self.assertRaises(Exception):
            User.objects.create_user(username='testuser')
    
    def test_email_format_validation(self):
        """Test email format validation"""
        # Valid email should work
        user = User.objects.create_user(
            username='test',
            email='valid@example.com'
        )
        self.assertEqual(user.email, 'valid@example.com')
    
    def test_role_choices_validation(self):
        """Test role must be from valid choices"""
        valid_roles = ['admin', 'manager', 'technician', 'customer']
        
        for role in valid_roles:
            user = User.objects.create_user(
                username=f'user_{role}',
                role=role
            )
            self.assertEqual(user.role, role)


class MiddlewareIntegrationTest(TestCase):
    """Test middleware integration"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(username='testuser', role='manager')
        self.token, _ = Token.objects.get_or_create(user=self.user)
    
    def test_full_middleware_stack(self):
        """Test complete middleware stack integration"""
        # Create request with proper authorization
        request = self.factory.get('/api/customers/')
        request.META['HTTP_AUTHORIZATION'] = f'Token {self.token.key}'
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        # Process through token validation
        token_middleware = TokenValidationMiddleware(lambda r: JsonResponse({}))
        response = token_middleware.process_request(request)
        self.assertIsNone(response)
        self.assertEqual(request.user, self.user)
        
        # Process through permission middleware
        perm_middleware = APIPermissionMiddleware(lambda r: JsonResponse({}))
        response = perm_middleware.process_request(request)
        self.assertIsNone(response)  # Manager should have access
        
        # Process through rate limiting
        rate_middleware = RateLimitMiddleware(lambda r: JsonResponse({}))
        response = rate_middleware.process_request(request)
        self.assertIsNone(response)  # Should be within limits