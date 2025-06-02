import { useState, useEffect, useRef, useCallback } from 'react';

interface UseImageLazyLoadingOptions {
  src: string;
  placeholder?: string;
  rootMargin?: string;
  threshold?: number;
}

interface UseImageLazyLoadingReturn {
  imgRef: React.RefObject<HTMLImageElement>;
  isLoaded: boolean;
  isInView: boolean;
  error: string | null;
  currentSrc: string;
}

/**
 * Custom hook for lazy loading images with Intersection Observer
 * Improves performance by only loading images when they're about to be visible
 */
export const useImageLazyLoading = ({
  src,
  placeholder = '',
  rootMargin = '50px',
  threshold = 0.1
}: UseImageLazyLoadingOptions): UseImageLazyLoadingReturn => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  // Intersection Observer callback
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isInView) {
        setIsInView(true);
      }
    },
    [isInView]
  );

  // Set up Intersection Observer
  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold
    });

    observer.observe(imgElement);

    return () => {
      observer.unobserve(imgElement);
    };
  }, [handleIntersection, rootMargin, threshold]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || isLoaded || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
      setError(null);
    };

    img.onerror = () => {
      setError('Failed to load image');
      setIsLoaded(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, isLoaded]);

  return {
    imgRef,
    isLoaded,
    isInView,
    error,
    currentSrc
  };
};

/**
 * Custom hook for lazy loading background images
 */
export const useBackgroundImageLazyLoading = ({
  src,
  placeholder = '',
  rootMargin = '50px',
  threshold = 0.1
}: UseImageLazyLoadingOptions) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState(
    placeholder ? `url(${placeholder})` : 'none'
  );

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isInView) {
        setIsInView(true);
      }
    },
    [isInView]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [handleIntersection, rootMargin, threshold]);

  useEffect(() => {
    if (!isInView || isLoaded || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setBackgroundImage(`url(${src})`);
      setIsLoaded(true);
      setError(null);
    };

    img.onerror = () => {
      setError('Failed to load background image');
      setIsLoaded(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, isLoaded]);

  return {
    elementRef,
    isLoaded,
    isInView,
    error,
    backgroundImage
  };
};