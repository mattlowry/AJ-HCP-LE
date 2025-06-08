"""
Cache decorators for views and API endpoints
"""

import functools
import hashlib
from django.core.cache import cache
from django.http import JsonResponse, HttpResponse
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework.response import Response
from .cache_utils import CACHE_TIMEOUTS, cache_key_builder
import logging

logger = logging.getLogger(__name__)


def cache_api_response(timeout=CACHE_TIMEOUTS['medium'], vary_on=None, per_user=True):
    """
    Cache API response with optional user-specific caching
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Build cache key
            key_parts = [view_func.__name__]
            
            if per_user and hasattr(request, 'user') and request.user.is_authenticated:
                key_parts.append(f"user_{request.user.id}")
            
            # Add URL parameters
            key_parts.extend([str(arg) for arg in args])
            key_parts.extend([f"{k}_{v}" for k, v in kwargs.items()])
            
            # Add query parameters
            if request.GET:
                key_parts.append(request.GET.urlencode())
            
            # Add vary headers if specified
            if vary_on:
                for header in vary_on:
                    header_value = request.META.get(f'HTTP_{header.upper().replace("-", "_")}', '')
                    if header_value:
                        key_parts.append(f"{header}_{header_value}")
            
            cache_key = f"api_{'_'.join(key_parts)}"
            
            # Hash long keys
            if len(cache_key) > 200:
                cache_key = f"api_{hashlib.md5(cache_key.encode()).hexdigest()}"
            
            # Try to get cached response
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                logger.debug(f"API cache hit: {cache_key}")
                return cached_response
            
            # Execute view and cache response
            response = view_func(request, *args, **kwargs)
            
            # Only cache successful responses
            if hasattr(response, 'status_code') and response.status_code == 200:
                cache.set(cache_key, response, timeout)
                logger.debug(f"API cache set: {cache_key}")
            
            return response
        
        return wrapper
    return decorator


def cache_model_list(model_name, timeout=CACHE_TIMEOUTS['medium'], per_user=False):
    """
    Cache model list responses
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            key_parts = [f"list_{model_name}"]
            
            if per_user and hasattr(request, 'user') and request.user.is_authenticated:
                key_parts.append(f"user_{request.user.id}")
            
            # Add pagination and filtering parameters
            if request.GET:
                key_parts.append(request.GET.urlencode())
            
            cache_key = "_".join(key_parts)
            
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.debug(f"Model list cache hit: {cache_key}")
                return Response(cached_data) if hasattr(view_func, 'serializer_class') else JsonResponse(cached_data)
            
            response = view_func(request, *args, **kwargs)
            
            if hasattr(response, 'status_code') and response.status_code == 200:
                if hasattr(response, 'data'):
                    cache.set(cache_key, response.data, timeout)
                elif isinstance(response, JsonResponse):
                    cache.set(cache_key, response.content, timeout)
            
            return response
        
        return wrapper
    return decorator


def cache_model_detail(timeout=CACHE_TIMEOUTS['long']):
    """
    Cache model detail responses
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Use primary key from URL for cache key
            pk = kwargs.get('pk') or kwargs.get('id')
            if not pk:
                # If no PK, execute without caching
                return view_func(request, *args, **kwargs)
            
            cache_key = f"detail_{view_func.__name__}_{pk}"
            
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.debug(f"Model detail cache hit: {cache_key}")
                return Response(cached_data) if hasattr(view_func, 'serializer_class') else JsonResponse(cached_data)
            
            response = view_func(request, *args, **kwargs)
            
            if hasattr(response, 'status_code') and response.status_code == 200:
                if hasattr(response, 'data'):
                    cache.set(cache_key, response.data, timeout)
                elif isinstance(response, JsonResponse):
                    cache.set(cache_key, response.content, timeout)
            
            return response
        
        return wrapper
    return decorator


def invalidate_cache_on_save(cache_patterns):
    """
    Decorator to invalidate cache when model is saved
    """
    def decorator(save_method):
        @functools.wraps(save_method)
        def wrapper(self, *args, **kwargs):
            result = save_method(self, *args, **kwargs)
            
            # Invalidate cache patterns
            for pattern in cache_patterns:
                if hasattr(self, 'pk'):
                    # Replace {pk} with actual primary key
                    cache_key = pattern.format(pk=self.pk)
                    cache.delete(cache_key)
                    logger.debug(f"Cache invalidated: {cache_key}")
            
            return result
        
        return wrapper
    return decorator


def cache_queryset_method(timeout=CACHE_TIMEOUTS['medium']):
    """
    Cache QuerySet method results
    """
    def decorator(method):
        @functools.wraps(method)
        def wrapper(self, *args, **kwargs):
            # Build cache key from method name and arguments
            key_parts = [
                self.model.__name__,
                method.__name__,
                cache_key_builder(*args, **kwargs)
            ]
            
            cache_key = "_".join(key_parts)
            
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"QuerySet cache hit: {cache_key}")
                return cached_result
            
            result = method(self, *args, **kwargs)
            
            # Convert QuerySet to list for caching
            if hasattr(result, '_result_cache'):
                result_list = list(result)
                cache.set(cache_key, result_list, timeout)
                return result_list
            else:
                cache.set(cache_key, result, timeout)
            
            return result
        
        return wrapper
    return decorator


class CacheInvalidationMixin:
    """
    Mixin to automatically invalidate cache when model changes
    """
    cache_patterns = []  # Override in subclass
    
    def save(self, *args, **kwargs):
        result = super().save(*args, **kwargs)
        self.invalidate_cache()
        return result
    
    def delete(self, *args, **kwargs):
        self.invalidate_cache()
        return super().delete(*args, **kwargs)
    
    def invalidate_cache(self):
        """Invalidate cache patterns for this model"""
        for pattern in self.cache_patterns:
            cache_key = pattern.format(pk=self.pk, id=self.pk)
            cache.delete(cache_key)
            logger.debug(f"Cache invalidated: {cache_key}")


def cache_template_fragment(fragment_name, timeout=CACHE_TIMEOUTS['medium'], vary_on=None):
    """
    Cache template fragments
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            from django.core.cache.utils import make_template_fragment_key
            
            vary_args = vary_on or []
            cache_key = make_template_fragment_key(fragment_name, vary_args)
            
            cached_content = cache.get(cache_key)
            if cached_content is not None:
                return cached_content
            
            content = func(*args, **kwargs)
            cache.set(cache_key, content, timeout)
            
            return content
        
        return wrapper
    return decorator


def cache_expensive_computation(timeout=CACHE_TIMEOUTS['long'], key_prefix='computation'):
    """
    Cache expensive computations
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}_{func.__name__}_{cache_key_builder(*args, **kwargs)}"
            
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Computation cache hit: {cache_key}")
                return cached_result
            
            logger.debug(f"Computing expensive operation: {func.__name__}")
            result = func(*args, **kwargs)
            
            cache.set(cache_key, result, timeout)
            logger.debug(f"Computation cached: {cache_key}")
            
            return result
        
        return wrapper
    return decorator


# Specific decorators for common use cases
def cache_customer_data(timeout=CACHE_TIMEOUTS['medium']):
    """Cache customer-related data"""
    return cache_api_response(timeout=timeout, per_user=True)


def cache_job_data(timeout=CACHE_TIMEOUTS['short']):
    """Cache job-related data (shorter timeout due to frequent updates)"""
    return cache_api_response(timeout=timeout, per_user=True)


def cache_analytics_data(timeout=CACHE_TIMEOUTS['long']):
    """Cache analytics data (longer timeout as it changes less frequently)"""
    return cache_api_response(timeout=timeout, per_user=False)


def cache_inventory_data(timeout=CACHE_TIMEOUTS['medium']):
    """Cache inventory data"""
    return cache_api_response(timeout=timeout, per_user=False)