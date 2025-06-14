"""
Cache utilities and decorators for improved performance
"""

import functools
import hashlib
import json
from typing import Any, Optional, Union, Dict, List
from django.core.cache import cache, caches
from django.core.cache.utils import make_template_fragment_key
from django.conf import settings
from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

# Cache aliases
DEFAULT_CACHE = 'default'
RATE_LIMIT_CACHE = 'rate_limit'
SESSION_CACHE = 'sessions'

# Cache timeouts (in seconds)
CACHE_TIMEOUTS = {
    'short': 300,      # 5 minutes
    'medium': 1800,    # 30 minutes
    'long': 3600,      # 1 hour
    'day': 86400,      # 24 hours
    'week': 604800,    # 7 days
}


def cache_key_builder(*args, **kwargs) -> str:
    """
    Build a cache key from arguments
    """
    key_parts = []
    
    for arg in args:
        if hasattr(arg, 'pk'):
            key_parts.append(f"{arg.__class__.__name__}_{arg.pk}")
        else:
            key_parts.append(str(arg))
    
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}_{v}")
    
    key = "_".join(key_parts)
    
    # Hash long keys to prevent issues
    if len(key) > 200:
        key = hashlib.md5(key.encode()).hexdigest()
    
    return key


def cache_function(timeout=CACHE_TIMEOUTS['medium'], cache_alias=DEFAULT_CACHE, key_prefix='func'):
    """
    Decorator to cache function results
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key
            cache_key = f"{key_prefix}_{func.__name__}_{cache_key_builder(*args, **kwargs)}"
            
            # Try to get from cache
            cached_result = caches[cache_alias].get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            caches[cache_alias].set(cache_key, result, timeout)
            logger.debug(f"Cache set for {cache_key}")
            
            return result
        
        # Add cache management methods
        wrapper.cache_clear = lambda *args, **kwargs: caches[cache_alias].delete(
            f"{key_prefix}_{func.__name__}_{cache_key_builder(*args, **kwargs)}"
        )
        wrapper.cache_key = lambda *args, **kwargs: f"{key_prefix}_{func.__name__}_{cache_key_builder(*args, **kwargs)}"
        
        return wrapper
    return decorator


def cache_queryset(timeout=CACHE_TIMEOUTS['medium'], cache_alias=DEFAULT_CACHE):
    """
    Decorator to cache QuerySet results
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"qs_{func.__name__}_{cache_key_builder(*args, **kwargs)}"
            
            cached_result = caches[cache_alias].get(cache_key)
            if cached_result is not None:
                return cached_result
            
            result = func(*args, **kwargs)
            
            # Convert QuerySet to list for caching
            if isinstance(result, QuerySet):
                result_list = list(result)
                caches[cache_alias].set(cache_key, result_list, timeout)
                return result_list
            else:
                caches[cache_alias].set(cache_key, result, timeout)
                return result
        
        return wrapper
    return decorator


class CacheManager:
    """
    Centralized cache management
    """
    
    @staticmethod
    def get_user_cache_key(user_id: int, suffix: str = '') -> str:
        """Get cache key for user-specific data"""
        return f"user_{user_id}_{suffix}" if suffix else f"user_{user_id}"
    
    @staticmethod
    def get_customer_cache_key(customer_id: int, suffix: str = '') -> str:
        """Get cache key for customer-specific data"""
        return f"customer_{customer_id}_{suffix}" if suffix else f"customer_{customer_id}"
    
    @staticmethod
    def get_job_cache_key(job_id: int, suffix: str = '') -> str:
        """Get cache key for job-specific data"""
        return f"job_{job_id}_{suffix}" if suffix else f"job_{job_id}"
    
    @staticmethod
    def invalidate_user_cache(user_id: int, patterns: List[str] = None):
        """Invalidate all cache entries for a user"""
        base_key = CacheManager.get_user_cache_key(user_id)
        cache_patterns = patterns or ['profile', 'jobs', 'permissions']
        
        for pattern in cache_patterns:
            cache.delete(f"{base_key}_{pattern}")
    
    @staticmethod
    def invalidate_customer_cache(customer_id: int, patterns: List[str] = None):
        """Invalidate all cache entries for a customer"""
        base_key = CacheManager.get_customer_cache_key(customer_id)
        cache_patterns = patterns or ['profile', 'properties', 'jobs', 'billing']
        
        for pattern in cache_patterns:
            cache.delete(f"{base_key}_{pattern}")
    
    @staticmethod
    def warm_customer_cache(customer_id: int):
        """Pre-populate customer cache with commonly accessed data"""
        from customers.models import Customer, Property
        from jobs.models import Job
        
        try:
            # Cache customer profile
            customer = Customer.objects.get(id=customer_id)
            cache.set(
                CacheManager.get_customer_cache_key(customer_id, 'profile'),
                customer,
                CACHE_TIMEOUTS['long']
            )
            
            # Cache customer properties
            properties = list(Property.objects.filter(customer_id=customer_id))
            cache.set(
                CacheManager.get_customer_cache_key(customer_id, 'properties'),
                properties,
                CACHE_TIMEOUTS['medium']
            )
            
            # Cache recent jobs
            recent_jobs = list(Job.objects.filter(customer_id=customer_id)[:10])
            cache.set(
                CacheManager.get_customer_cache_key(customer_id, 'recent_jobs'),
                recent_jobs,
                CACHE_TIMEOUTS['short']
            )
            
        except Exception as e:
            logger.error(f"Error warming cache for customer {customer_id}: {e}")


class RateLimitCache:
    """
    Rate limiting using Redis cache
    """
    
    @staticmethod
    def get_rate_limit_key(identifier: str, window: str) -> str:
        """Get rate limit cache key"""
        return f"rate_limit_{identifier}_{window}"
    
    @staticmethod
    def check_rate_limit(identifier: str, limit: int, window: int) -> tuple[bool, int]:
        """
        Check if identifier has exceeded rate limit
        
        Returns: (is_allowed, remaining_requests)
        """
        cache_key = RateLimitCache.get_rate_limit_key(identifier, f"{window}s")
        rate_cache = caches[RATE_LIMIT_CACHE]
        
        current_count = rate_cache.get(cache_key, 0)
        
        if current_count >= limit:
            return False, 0
        
        # Increment counter
        try:
            new_count = rate_cache.get(cache_key, 0) + 1
            rate_cache.set(cache_key, new_count, window)
        except Exception as e:
            logger.error(f"Rate limit cache error: {e}")
            return True, limit  # Allow on cache error
        
        return True, limit - new_count
    
    @staticmethod
    def reset_rate_limit(identifier: str, window: str):
        """Reset rate limit for identifier"""
        cache_key = RateLimitCache.get_rate_limit_key(identifier, window)
        caches[RATE_LIMIT_CACHE].delete(cache_key)


class SessionCache:
    """
    Enhanced session caching
    """
    
    @staticmethod
    def get_user_sessions(user_id: int) -> List[str]:
        """Get all active sessions for a user"""
        cache_key = f"user_sessions_{user_id}"
        return caches[SESSION_CACHE].get(cache_key, [])
    
    @staticmethod
    def add_user_session(user_id: int, session_key: str):
        """Add session to user's active sessions"""
        cache_key = f"user_sessions_{user_id}"
        sessions = SessionCache.get_user_sessions(user_id)
        
        if session_key not in sessions:
            sessions.append(session_key)
            caches[SESSION_CACHE].set(cache_key, sessions, CACHE_TIMEOUTS['day'])
    
    @staticmethod
    def remove_user_session(user_id: int, session_key: str):
        """Remove session from user's active sessions"""
        cache_key = f"user_sessions_{user_id}"
        sessions = SessionCache.get_user_sessions(user_id)
        
        if session_key in sessions:
            sessions.remove(session_key)
            caches[SESSION_CACHE].set(cache_key, sessions, CACHE_TIMEOUTS['day'])
    
    @staticmethod
    def invalidate_all_user_sessions(user_id: int):
        """Invalidate all sessions for a user"""
        cache_key = f"user_sessions_{user_id}"
        caches[SESSION_CACHE].delete(cache_key)


def get_or_set_cache(key: str, callable_func, timeout: int = CACHE_TIMEOUTS['medium'], 
                     cache_alias: str = DEFAULT_CACHE):
    """
    Get value from cache or set it using callable
    """
    cached_value = caches[cache_alias].get(key)
    if cached_value is not None:
        return cached_value
    
    value = callable_func()
    caches[cache_alias].set(key, value, timeout)
    return value


def cache_page_for_user(timeout: int = CACHE_TIMEOUTS['short']):
    """
    Cache entire page response per user
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return view_func(request, *args, **kwargs)
            
            cache_key = f"page_{request.user.id}_{request.path}_{request.GET.urlencode()}"
            cached_response = cache.get(cache_key)
            
            if cached_response is not None:
                return cached_response
            
            response = view_func(request, *args, **kwargs)
            
            # Only cache successful responses
            if response.status_code == 200:
                cache.set(cache_key, response, timeout)
            
            return response
        
        return wrapper
    return decorator


def invalidate_cache_patterns(patterns: List[str], cache_alias: str = DEFAULT_CACHE):
    """
    Invalidate cache keys matching patterns (requires Redis)
    """
    try:
        cache_instance = caches[cache_alias]
        if hasattr(cache_instance, 'delete_pattern'):
            for pattern in patterns:
                cache_instance.delete_pattern(f"*{pattern}*")
    except Exception as e:
        logger.error(f"Error invalidating cache patterns: {e}")


# Common cache warming functions
@cache_function(timeout=CACHE_TIMEOUTS['long'], key_prefix='stats')
def get_dashboard_stats():
    """Cache dashboard statistics"""
    from customers.models import Customer
    from jobs.models import Job
    
    return {
        'total_customers': Customer.objects.count(),
        'active_jobs': Job.objects.filter(status__in=['pending', 'scheduled', 'in_progress']).count(),
        'completed_jobs_today': Job.objects.filter(status='completed', 
                                                  completed_at__date=timezone.now().date()).count(),
    }


@cache_function(timeout=CACHE_TIMEOUTS['medium'], key_prefix='user')
def get_user_permissions(user_id: int):
    """Cache user permissions"""
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        return {
            'role': user.role,
            'permissions': list(user.user_permissions.values_list('codename', flat=True)),
            'groups': list(user.groups.values_list('name', flat=True))
        }
    except User.DoesNotExist:
        return None