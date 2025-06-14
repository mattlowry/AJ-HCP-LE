import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void> | void;
  threshold?: number;
  rootMargin?: string;
  isLoading?: boolean;
}

interface UseInfiniteScrollReturn {
  triggerRef: React.RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
}

/**
 * Custom hook for implementing infinite scroll functionality
 * Automatically loads more data when user scrolls near the bottom
 */
export const useInfiniteScroll = ({
  hasNextPage,
  fetchNextPage,
  threshold = 1.0,
  rootMargin = '100px',
  isLoading = false
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn => {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const handleIntersection = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      if (
        entry.isIntersecting &&
        hasNextPage &&
        !isFetchingNextPage &&
        !isLoading
      ) {
        setIsFetchingNextPage(true);
        
        try {
          await fetchNextPage();
        } catch (error) {
          console.error('Error fetching next page:', error);
        } finally {
          setIsFetchingNextPage(false);
        }
      }
    },
    [hasNextPage, fetchNextPage, isFetchingNextPage, isLoading]
  );

  useEffect(() => {
    const triggerElement = triggerRef.current;
    if (!triggerElement) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin
    });

    observer.observe(triggerElement);

    return () => {
      observer.unobserve(triggerElement);
    };
  }, [handleIntersection, threshold, rootMargin]);

  return {
    triggerRef,
    isFetchingNextPage
  };
};

/**
 * Hook for infinite scroll with virtualization support
 */
interface UseVirtualInfiniteScrollOptions extends UseInfiniteScrollOptions {
  itemCount: number;
  loadMoreThreshold?: number;
}

export const useVirtualInfiniteScroll = ({
  hasNextPage,
  fetchNextPage,
  itemCount,
  loadMoreThreshold = 10,
  isLoading = false
}: UseVirtualInfiniteScrollOptions) => {
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const checkShouldLoadMore = useCallback(
    (startIndex: number, stopIndex: number) => {
      const shouldLoadMore = 
        hasNextPage &&
        !isFetchingNextPage &&
        !isLoading &&
        stopIndex >= itemCount - loadMoreThreshold;

      if (shouldLoadMore) {
        setIsFetchingNextPage(true);
        
        Promise.resolve(fetchNextPage())
          .catch(error => {
            console.error('Error fetching next page:', error);
          })
          .finally(() => {
            setIsFetchingNextPage(false);
          });
      }
    },
    [hasNextPage, fetchNextPage, itemCount, loadMoreThreshold, isFetchingNextPage, isLoading]
  );

  return {
    checkShouldLoadMore,
    isFetchingNextPage
  };
};