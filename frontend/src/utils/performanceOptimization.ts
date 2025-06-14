// Performance optimization utilities
// This module provides utilities for improving application performance

/**
 * Dynamically import components for code splitting
 */
export const dynamicImport = <T = any>(importFunction: () => Promise<{ default: T }>): Promise<T> => {
  return importFunction().then(module => module.default);
};

/**
 * Preload a component or module
 */
export const preloadComponent = (importFunction: () => Promise<any>): void => {
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        importFunction().catch(() => {
          // Silently fail preloading
        });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        importFunction().catch(() => {
          // Silently fail preloading
        });
      }, 100);
    }
  }
};

/**
 * Batch DOM updates using requestAnimationFrame
 */
export const batchUpdates = (callback: () => void): void => {
  if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 16); // ~60fps fallback
  }
};

/**
 * Measure and log performance metrics
 */
export const measurePerformance = (name: string, fn: () => void | Promise<void>): void => {
  if (typeof window === 'undefined' || !('performance' in window)) {
    fn();
    return;
  }

  const startTime = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    result.finally(() => {
      const endTime = performance.now();
      console.log(`${name} took ${endTime - startTime} milliseconds`);
    });
  } else {
    const endTime = performance.now();
    console.log(`${name} took ${endTime - startTime} milliseconds`);
  }
};

/**
 * Create an optimized image loader with lazy loading
 */
export const createImageLoader = (src: string, options: {
  placeholder?: string;
  sizes?: string;
  quality?: number;
} = {}): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Set attributes for optimization
    if (options.sizes) {
      img.sizes = options.sizes;
    }
    
    // Add loading attribute for native lazy loading
    img.loading = 'lazy';
    img.decoding = 'async';
    
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    img.src = src;
  });
};

/**
 * Optimize event listeners with passive option
 */
export const addOptimizedEventListener = (
  element: HTMLElement,
  event: string,
  handler: EventListener,
  options: AddEventListenerOptions = {}
): (() => void) => {
  const optimizedOptions = {
    passive: true,
    ...options,
    // Passive events for better scroll performance
    ...(event.includes('touch') || event.includes('wheel') || event.includes('scroll') ? { passive: true } : {})
  };

  element.addEventListener(event, handler, optimizedOptions);
  
  // Return cleanup function
  return () => {
    element.removeEventListener(event, handler, optimizedOptions);
  };
};

/**
 * Memory-efficient array chunking for large datasets
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Efficiently process large arrays without blocking the main thread
 */
export const processArrayInChunks = <T, R>(
  array: T[],
  processor: (item: T, index: number) => R,
  chunkSize: number = 100,
  onProgress?: (progress: number) => void
): Promise<R[]> => {
  return new Promise((resolve, reject) => {
    const results: R[] = [];
    const chunks = chunkArray(array, chunkSize);
    let currentChunk = 0;

    const processChunk = () => {
      try {
        if (currentChunk >= chunks.length) {
          resolve(results);
          return;
        }

        const chunk = chunks[currentChunk];
        const startIndex = currentChunk * chunkSize;
        
        chunk.forEach((item, index) => {
          results.push(processor(item, startIndex + index));
        });

        currentChunk++;
        
        // Report progress
        if (onProgress) {
          onProgress((currentChunk / chunks.length) * 100);
        }

        // Schedule next chunk processing
        if (currentChunk < chunks.length) {
          setTimeout(processChunk, 0);
        } else {
          resolve(results);
        }
      } catch (error) {
        reject(error);
      }
    };

    processChunk();
  });
};

/**
 * Web Worker utilities for CPU-intensive tasks
 */
export const createWebWorker = (workerFunction: () => void): Worker => {
  const blob = new Blob([`(${workerFunction.toString()})()`], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

/**
 * Service Worker registration utility
 */
export const registerServiceWorker = async (swPath: string = '/service-worker.js'): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath);
    console.log('ServiceWorker registered successfully');
    return registration;
  } catch (error) {
    console.error('ServiceWorker registration failed:', error);
    return null;
  }
};

/**
 * Resource hints for preloading critical resources
 */
export const addResourceHints = (resources: Array<{
  href: string;
  as?: string;
  type?: 'preload' | 'prefetch' | 'dns-prefetch' | 'preconnect';
  crossOrigin?: boolean;
}>): void => {
  if (typeof document === 'undefined') return;

  resources.forEach(({ href, as, type = 'preload', crossOrigin }) => {
    const link = document.createElement('link');
    link.rel = type;
    link.href = href;
    
    if (as) link.as = as;
    if (crossOrigin) link.crossOrigin = 'anonymous';
    
    document.head.appendChild(link);
  });
};

/**
 * Critical CSS inlining utility
 */
export const inlineCriticalCSS = (css: string): void => {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = css;
  style.setAttribute('data-critical', 'true');
  document.head.appendChild(style);
};

/**
 * Optimize images for different screen densities
 */
export const generateResponsiveImageSrc = (
  baseSrc: string,
  sizes: number[] = [320, 640, 960, 1280, 1920]
): string => {
  const extension = baseSrc.split('.').pop();
  const nameWithoutExtension = baseSrc.substring(0, baseSrc.lastIndexOf('.'));
  
  const srcSet = sizes
    .map(size => `${nameWithoutExtension}_${size}w.${extension} ${size}w`)
    .join(', ');
  
  return srcSet;
};

/**
 * Cache API responses with TTL
 */
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key?: string;
}

const cacheStore = new Map<string, { data: any; expiry: number }>();

export const cacheApiResponse = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> => {
  const { ttl = 300000 } = options; // Default 5 minutes
  const now = Date.now();
  
  // Check if we have a valid cached response
  if (cacheStore.has(key)) {
    const cached = cacheStore.get(key)!;
    if (cached.expiry > now) {
      return Promise.resolve(cached.data);
    } else {
      cacheStore.delete(key);
    }
  }
  
  // Fetch new data and cache it
  return fetcher().then(data => {
    cacheStore.set(key, {
      data,
      expiry: now + ttl
    });
    return data;
  });
};

/**
 * Clear expired cache entries
 */
export const clearExpiredCache = (): void => {
  const now = Date.now();
<<<<<<< HEAD
  Array.from(cacheStore.entries()).forEach(([key, value]) => {
=======
  const entries = Array.from(cacheStore.entries());
  for (const [key, value] of entries) {
>>>>>>> fc749d6 (Implement modern fluid UI design system with soft aesthetics and smooth animations)
    if (value.expiry <= now) {
      cacheStore.delete(key);
    }
  });
};

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  // Mark a performance measure
  mark: (name: string): void => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },

  // Measure time between two marks
  measure: (name: string, startMark: string, endMark?: string): void => {
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.measure(name, startMark, endMark);
    }
  },

  // Get performance entries
  getEntries: (type?: string): PerformanceEntry[] => {
    if (typeof performance !== 'undefined' && performance.getEntries) {
      return type ? performance.getEntriesByType(type) : performance.getEntries();
    }
    return [];
  },

  // Clear performance entries
  clearEntries: (): void => {
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
};

// Export performance optimization configuration
export const PERFORMANCE_CONFIG = {
  // Virtualization thresholds
  VIRTUALIZATION_THRESHOLD: 100,
  
  // Debounce delays
  SEARCH_DEBOUNCE_DELAY: 300,
  RESIZE_DEBOUNCE_DELAY: 250,
  SCROLL_THROTTLE_DELAY: 16, // ~60fps
  
  // Chunk sizes for processing
  DEFAULT_CHUNK_SIZE: 100,
  LARGE_DATASET_CHUNK_SIZE: 1000,
  
  // Cache TTLs
  API_CACHE_TTL: 300000, // 5 minutes
  STATIC_CACHE_TTL: 3600000, // 1 hour
  
  // Image optimization
  IMAGE_QUALITY: 85,
  IMAGE_SIZES: [320, 640, 960, 1280, 1920],
  
  // Bundle size thresholds
  MAX_CHUNK_SIZE: 244000, // ~244KB
  WARNING_CHUNK_SIZE: 500000, // ~500KB
};