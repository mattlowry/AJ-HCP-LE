import { useState, useEffect, useMemo, useCallback } from 'react';

interface UseVirtualizationOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

interface UseVirtualizationReturn {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollToIndex: (index: number) => void;
  scrollElementProps: {
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  measureElement: (index: number, element: HTMLElement) => void;
}

/**
 * Custom hook for virtualizing large lists to improve performance
 * Only renders visible items plus a small buffer (overscan)
 */
export const useVirtualization = ({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5
}: UseVirtualizationOptions): UseVirtualizationReturn => {
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());

  // Calculate total size
  const totalSize = useMemo(() => {
    if (measuredHeights.size === 0) {
      return itemCount * itemHeight;
    }

    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      total += measuredHeights.get(i) || itemHeight;
    }
    return total;
  }, [itemCount, itemHeight, measuredHeights]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (itemCount === 0) {
      return { start: 0, end: 0 };
    }

    let start = 0;
    let currentOffset = 0;

    // Find start index
    for (let i = 0; i < itemCount; i++) {
      const height = measuredHeights.get(i) || itemHeight;
      if (currentOffset + height > scrollTop) {
        start = i;
        break;
      }
      currentOffset += height;
    }

    // Find end index
    let end = start;
    let visibleHeight = 0;
    currentOffset = 0;

    for (let i = start; i < itemCount; i++) {
      const height = measuredHeights.get(i) || itemHeight;
      visibleHeight += height;
      if (visibleHeight > containerHeight) {
        end = i + 1;
        break;
      }
      if (i === itemCount - 1) {
        end = itemCount;
        break;
      }
    }

    // Apply overscan
    const overscanStart = Math.max(0, start - overscan);
    const overscanEnd = Math.min(itemCount, end + overscan);

    return { start: overscanStart, end: overscanEnd };
  }, [scrollTop, containerHeight, itemCount, itemHeight, measuredHeights, overscan]);

  // Calculate virtual items
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    let currentOffset = 0;

    for (let i = 0; i < visibleRange.start; i++) {
      currentOffset += measuredHeights.get(i) || itemHeight;
    }

    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const size = measuredHeights.get(i) || itemHeight;
      items.push({
        index: i,
        start: currentOffset,
        size
      });
      currentOffset += size;
    }

    return items;
  }, [visibleRange, measuredHeights, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  // Measure element height
  const measureElement = useCallback((index: number, element: HTMLElement) => {
    const height = element.getBoundingClientRect().height;
    setMeasuredHeights(prev => {
      const newMap = new Map(prev);
      newMap.set(index, height);
      return newMap;
    });
  }, []);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += measuredHeights.get(i) || itemHeight;
      }
      
      const scrollElement = document.getElementById('virtual-scroll-container');
      if (scrollElement) {
        scrollElement.scrollTop = offset;
      }
    },
    [measuredHeights, itemHeight]
  );

  return {
    virtualItems,
    totalSize,
    scrollToIndex,
    scrollElementProps: {
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }
    },
    measureElement
  };
};

/**
 * Hook for virtualizing grid layouts (2D virtualization)
 */
interface UseGridVirtualizationOptions {
  rowCount: number;
  columnCount: number;
  rowHeight: number;
  columnWidth: number;
  containerHeight: number;
  containerWidth: number;
  overscan?: number;
}

interface GridVirtualItem {
  rowIndex: number;
  columnIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseGridVirtualizationReturn {
  virtualItems: GridVirtualItem[];
  totalHeight: number;
  totalWidth: number;
  scrollElementProps: {
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
}

export const useGridVirtualization = ({
  rowCount,
  columnCount,
  rowHeight,
  columnWidth,
  containerHeight,
  containerWidth,
  overscan = 2
}: UseGridVirtualizationOptions): UseGridVirtualizationReturn => {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const totalHeight = rowCount * rowHeight;
  const totalWidth = columnCount * columnWidth;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / rowHeight);
    const endRow = Math.min(
      rowCount,
      Math.ceil((scrollTop + containerHeight) / rowHeight)
    );

    const startColumn = Math.floor(scrollLeft / columnWidth);
    const endColumn = Math.min(
      columnCount,
      Math.ceil((scrollLeft + containerWidth) / columnWidth)
    );

    return {
      startRow: Math.max(0, startRow - overscan),
      endRow: Math.min(rowCount, endRow + overscan),
      startColumn: Math.max(0, startColumn - overscan),
      endColumn: Math.min(columnCount, endColumn + overscan)
    };
  }, [
    scrollTop,
    scrollLeft,
    rowHeight,
    columnWidth,
    containerHeight,
    containerWidth,
    rowCount,
    columnCount,
    overscan
  ]);

  // Calculate virtual items
  const virtualItems = useMemo(() => {
    const items: GridVirtualItem[] = [];

    for (let rowIndex = visibleRange.startRow; rowIndex < visibleRange.endRow; rowIndex++) {
      for (let columnIndex = visibleRange.startColumn; columnIndex < visibleRange.endColumn; columnIndex++) {
        items.push({
          rowIndex,
          columnIndex,
          x: columnIndex * columnWidth,
          y: rowIndex * rowHeight,
          width: columnWidth,
          height: rowHeight
        });
      }
    }

    return items;
  }, [visibleRange, rowHeight, columnWidth]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
    setScrollLeft(event.currentTarget.scrollLeft);
  }, []);

  return {
    virtualItems,
    totalHeight,
    totalWidth,
    scrollElementProps: {
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        width: containerWidth,
        overflow: 'auto',
        position: 'relative'
      }
    }
  };
};