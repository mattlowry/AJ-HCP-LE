import { useMemo, useCallback, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Hook for memoizing expensive calculations
 */
export const useMemoizedCalculation = <T>(
  calculation: () => T,
  dependencies: React.DependencyList,
  debugName?: string
): T => {
  return useMemo(() => {
    const start = performance.now();
    const result = calculation();
    const duration = performance.now() - start;
    
    if (process.env.NODE_ENV === 'development' && duration > 16) {
      console.warn(
        `🐌 Slow calculation${debugName ? ` in ${debugName}` : ''}: ${Math.round(duration)}ms`
      );
    }
    
    return result;
  }, dependencies);
};

/**
 * Hook for debounced callbacks to prevent excessive API calls
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  dependencies: React.DependencyList = []
): T => {
  const debouncedFn = useRef<any>(null);
  
  useEffect(() => {
    debouncedFn.current = debounce(callback, delay);
    
    return () => {
      if (debouncedFn.current && typeof debouncedFn.current.cancel === 'function') {
        debouncedFn.current.cancel();
      }
    };
  }, [callback, delay, ...dependencies]);
  
  return useCallback((...args: Parameters<T>) => {
    return debouncedFn.current?.(...args);
  }, []) as T;
};

/**
 * Hook for throttled callbacks to limit execution frequency
 */
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100,
  dependencies: React.DependencyList = []
): T => {
  const throttledFn = useRef<any>(null);
  
  useEffect(() => {
    throttledFn.current = throttle(callback, delay);
    
    return () => {
      if (throttledFn.current && typeof throttledFn.current.cancel === 'function') {
        throttledFn.current.cancel();
      }
    };
  }, [callback, delay, ...dependencies]);
  
  return useCallback((...args: Parameters<T>) => {
    return throttledFn.current?.(...args);
  }, []) as T;
};

/**
 * Hook for measuring component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderStart = useRef<number>(0);
  const mountTime = useRef<number>(0);
  
  // Measure render start
  renderStart.current = performance.now();
  
  useEffect(() => {
    // Component mounted
    mountTime.current = performance.now();
    const mountDuration = mountTime.current - (renderStart.current || 0);
    
    if (process.env.NODE_ENV === 'development') {
      if (mountDuration > 16) {
        console.warn(`🐌 Slow mount for ${componentName}: ${Math.round(mountDuration)}ms`);
      } else {
        console.log(`⚡ ${componentName} mounted in ${Math.round(mountDuration)}ms`);
      }
    }
    
    return () => {
      // Component will unmount
      const unmountTime = performance.now();
      const lifetime = unmountTime - (mountTime.current || 0);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 ${componentName} lifetime: ${Math.round(lifetime)}ms`);
      }
    };
  }, [componentName]);
  
  // Measure render completion
  useEffect(() => {
    if (renderStart.current) {
      const renderDuration = performance.now() - renderStart.current;
      
      if (process.env.NODE_ENV === 'development' && renderDuration > 16) {
        console.warn(`🐌 Slow render for ${componentName}: ${Math.round(renderDuration)}ms`);
      }
    }
  });
};

/**
 * Hook for optimizing large lists with virtual scrolling preparation
 */
export const useListOptimization = <T>(
  items: T[],
  itemHeight: number = 50,
  containerHeight: number = 400
) => {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // +2 for buffer
    const startIndex = 0; // This would be calculated based on scroll position
    const endIndex = Math.min(startIndex + visibleCount, items.length);
    
    return {
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      startIndex,
      endIndex,
      visibleCount
    };
  }, [items, itemHeight, containerHeight]);
};

/**
 * Hook for lazy loading images and components
 */
export const useLazyLoading = () => {
  const intersectionObserver = useRef<IntersectionObserver | null>(null);
  
  const observe = useCallback((element: Element, callback: () => void) => {
    if (!intersectionObserver.current) {
      intersectionObserver.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              callback();
              intersectionObserver.current?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );
    }
    
    intersectionObserver.current.observe(element);
  }, []);
  
  const unobserve = useCallback((element: Element) => {
    intersectionObserver.current?.unobserve(element);
  }, []);
  
  useEffect(() => {
    return () => {
      intersectionObserver.current?.disconnect();
    };
  }, []);
  
  return { observe, unobserve };
};

/**
 * Hook for caching API responses in memory
 */
export const useAPICache = <T>() => {
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  const get = useCallback((key: string): T | null => {
    const cached = cache.current.get(key);
    
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
      
      if (isExpired) {
        cache.current.delete(key);
        return null;
      }
      
      return cached.data;
    }
    
    return null;
  }, []);
  
  const set = useCallback((key: string, data: T): void => {
    cache.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, []);
  
  const clear = useCallback(() => {
    cache.current.clear();
  }, []);
  
  const size = cache.current.size;
  
  return { get, set, clear, size };
};

export default {
  useMemoizedCalculation,
  useDebouncedCallback,
  useThrottledCallback,
  useRenderPerformance,
  useListOptimization,
  useLazyLoading,
  useAPICache
};