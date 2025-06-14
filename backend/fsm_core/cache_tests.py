"""
Test cases for caching utilities and decorators
"""

from django.test import TestCase, override_settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from .cache_utils import (
    CacheManager, RateLimitCache, SessionCache, 
    cache_function, get_or_set_cache
)
from .cache_decorators import cache_api_response, cache_model_detail
from customers.models import Customer, Property

User = get_user_model()


class CacheUtilsTest(TestCase):
    """Test cache utility functions"""
    
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='testuser',
            role='customer'
        )
        self.customer = Customer.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            phone='+12345678901',
            street_address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
    
    def test_cache_function_decorator(self):
        """Test function caching decorator"""
        call_count = 0
        
        @cache_function(timeout=300)
        def expensive_function(x, y):
            nonlocal call_count
            call_count += 1
            return x + y
        
        # First call should execute function
        result1 = expensive_function(1, 2)
        self.assertEqual(result1, 3)
        self.assertEqual(call_count, 1)
        
        # Second call should use cache
        result2 = expensive_function(1, 2)
        self.assertEqual(result2, 3)
        self.assertEqual(call_count, 1)
        
        # Different arguments should execute function again
        result3 = expensive_function(2, 3)
        self.assertEqual(result3, 5)
        self.assertEqual(call_count, 2)
    
    def test_cache_manager_user_keys(self):
        """Test CacheManager user cache key generation"""
        key = CacheManager.get_user_cache_key(123, 'profile')
        self.assertEqual(key, 'user_123_profile')
        
        key_no_suffix = CacheManager.get_user_cache_key(123)
        self.assertEqual(key_no_suffix, 'user_123')
    
    def test_cache_manager_customer_keys(self):
        """Test CacheManager customer cache key generation"""
        key = CacheManager.get_customer_cache_key(456, 'jobs')
        self.assertEqual(key, 'customer_456_jobs')
    
    def test_cache_manager_invalidate_user_cache(self):
        """Test user cache invalidation"""
        # Set some cache values
        cache.set('user_123_profile', {'name': 'John'})
        cache.set('user_123_jobs', [1, 2, 3])
        
        # Verify they exist
        self.assertIsNotNone(cache.get('user_123_profile'))
        self.assertIsNotNone(cache.get('user_123_jobs'))
        
        # Invalidate cache
        CacheManager.invalidate_user_cache(123)
        
        # Verify they're gone
        self.assertIsNone(cache.get('user_123_profile'))
        self.assertIsNone(cache.get('user_123_jobs'))
    
    @patch('customers.models.Customer.objects.get')
    @patch('customers.models.Property.objects.filter')
    @patch('jobs.models.Job.objects.filter')
    def test_cache_manager_warm_customer_cache(self, mock_jobs, mock_properties, mock_customer):
        """Test customer cache warming"""
        # Mock data
        mock_customer.return_value = self.customer
        mock_properties.return_value = []
        mock_jobs.return_value = []
        
        # Warm cache
        CacheManager.warm_customer_cache(self.customer.id)
        
        # Check that cache keys were set
        profile_key = CacheManager.get_customer_cache_key(self.customer.id, 'profile')
        properties_key = CacheManager.get_customer_cache_key(self.customer.id, 'properties')
        jobs_key = CacheManager.get_customer_cache_key(self.customer.id, 'recent_jobs')
        
        self.assertIsNotNone(cache.get(profile_key))
        self.assertIsNotNone(cache.get(properties_key))
        self.assertIsNotNone(cache.get(jobs_key))
    
    def test_rate_limit_cache(self):
        """Test rate limiting functionality"""
        identifier = 'test_user'
        limit = 5
        window = 60
        
        # First 5 requests should be allowed
        for i in range(5):
            allowed, remaining = RateLimitCache.check_rate_limit(identifier, limit, window)
            self.assertTrue(allowed)
            self.assertEqual(remaining, limit - i - 1)
        
        # 6th request should be denied
        allowed, remaining = RateLimitCache.check_rate_limit(identifier, limit, window)
        self.assertFalse(allowed)
        self.assertEqual(remaining, 0)
    
    def test_session_cache(self):
        """Test session management"""
        user_id = 123
        session_key = 'test_session_key'
        
        # Add session
        SessionCache.add_user_session(user_id, session_key)
        sessions = SessionCache.get_user_sessions(user_id)
        self.assertIn(session_key, sessions)
        
        # Remove session
        SessionCache.remove_user_session(user_id, session_key)
        sessions = SessionCache.get_user_sessions(user_id)
        self.assertNotIn(session_key, sessions)
    
    def test_get_or_set_cache(self):
        """Test get_or_set_cache utility"""
        call_count = 0
        
        def expensive_operation():
            nonlocal call_count
            call_count += 1
            return 'expensive_result'
        
        key = 'test_key'
        
        # First call should execute function
        result1 = get_or_set_cache(key, expensive_operation, timeout=300)
        self.assertEqual(result1, 'expensive_result')
        self.assertEqual(call_count, 1)
        
        # Second call should use cache
        result2 = get_or_set_cache(key, expensive_operation, timeout=300)
        self.assertEqual(result2, 'expensive_result')
        self.assertEqual(call_count, 1)


class CacheDecoratorsTest(TestCase):
    """Test cache decorators"""
    
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='testuser',
            role='customer'
        )
    
    def test_cache_api_response_decorator(self):
        """Test API response caching decorator"""
        call_count = 0
        
        @cache_api_response(timeout=300, per_user=False)
        def mock_view(request):
            nonlocal call_count
            call_count += 1
            response = MagicMock()
            response.status_code = 200
            return response
        
        # Mock request
        request = MagicMock()
        request.user.is_authenticated = False
        request.GET = {}
        
        # First call should execute view
        response1 = mock_view(request)
        self.assertEqual(call_count, 1)
        
        # Second call should use cache
        response2 = mock_view(request)
        self.assertEqual(call_count, 1)
    
    def test_cache_model_detail_decorator(self):
        """Test model detail caching decorator"""
        call_count = 0
        
        @cache_model_detail(timeout=300)
        def mock_detail_view(request, pk=None):
            nonlocal call_count
            call_count += 1
            response = MagicMock()
            response.status_code = 200
            response.data = {'id': pk, 'name': 'Test'}
            return response
        
        # Mock request
        request = MagicMock()
        
        # First call should execute view
        response1 = mock_detail_view(request, pk=123)
        self.assertEqual(call_count, 1)
        
        # Second call with same PK should use cache
        response2 = mock_detail_view(request, pk=123)
        self.assertEqual(call_count, 1)
        
        # Call with different PK should execute view again
        response3 = mock_detail_view(request, pk=456)
        self.assertEqual(call_count, 2)


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        },
        'rate_limit': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        },
        'sessions': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }
)
class CacheIntegrationTest(TestCase):
    """Integration tests for caching system"""
    
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='testuser',
            role='manager'
        )
        self.customer = Customer.objects.create(
            first_name='Jane',
            last_name='Smith',
            email='jane@example.com',
            phone='+12345678901',
            street_address='456 Oak St',
            city='Somewhere',
            state='NY',
            zip_code='10001'
        )
    
    def test_customer_cache_workflow(self):
        """Test complete customer caching workflow"""
        customer_id = self.customer.id
        
        # Test cache warming
        CacheManager.warm_customer_cache(customer_id)
        
        # Verify cache was populated
        profile_key = CacheManager.get_customer_cache_key(customer_id, 'profile')
        cached_profile = cache.get(profile_key)
        self.assertIsNotNone(cached_profile)
        self.assertEqual(cached_profile.id, customer_id)
        
        # Test cache invalidation
        CacheManager.invalidate_customer_cache(customer_id)
        
        # Verify cache was cleared
        cached_profile_after = cache.get(profile_key)
        self.assertIsNone(cached_profile_after)
    
    def test_rate_limiting_workflow(self):
        """Test rate limiting workflow"""
        user_id = f"user_{self.user.id}"
        
        # Test successful requests within limit
        for i in range(3):
            allowed, remaining = RateLimitCache.check_rate_limit(user_id, 5, 60)
            self.assertTrue(allowed)
            self.assertGreaterEqual(remaining, 0)
        
        # Test rate limit reset
        RateLimitCache.reset_rate_limit(user_id, "60s")
        
        # Should be able to make requests again
        allowed, remaining = RateLimitCache.check_rate_limit(user_id, 5, 60)
        self.assertTrue(allowed)
        self.assertEqual(remaining, 4)
    
    def test_cache_key_collision_prevention(self):
        """Test that cache keys don't collide"""
        # Test different cache namespaces
        user_key = CacheManager.get_user_cache_key(123, 'profile')
        customer_key = CacheManager.get_customer_cache_key(123, 'profile')
        
        self.assertNotEqual(user_key, customer_key)
        
        # Set different values
        cache.set(user_key, 'user_data')
        cache.set(customer_key, 'customer_data')
        
        # Verify they don't interfere
        self.assertEqual(cache.get(user_key), 'user_data')
        self.assertEqual(cache.get(customer_key), 'customer_data')