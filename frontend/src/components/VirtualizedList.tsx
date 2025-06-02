import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useVirtualization } from '../hooks/useVirtualization';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

/**
 * Virtualized list component for rendering large datasets efficiently
 * Only renders visible items to maintain performance
 */
function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    virtualItems,
    totalSize,
    scrollElementProps,
    measureElement
  } = useVirtualization({
    itemCount: items.length,
    itemHeight,
    containerHeight,
    overscan
  });

  // Handle external scroll callback
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onScroll) return;

    const handleScroll = () => {
      onScroll(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  return (
    <Box
      ref={containerRef}
      id="virtual-scroll-container"
      className={className}
      sx={{
        ...scrollElementProps.style,
        '& > div': {
          position: 'relative'
        }
      }}
      onScroll={scrollElementProps.onScroll}
    >
      {/* Total height container */}
      <div style={{ height: totalSize, width: '100%' }}>
        {/* Visible items */}
        {virtualItems.map(({ index, start, size }) => {
          const item = items[index];
          if (!item) return null;

          return (
            <div
              key={index}
              ref={(element) => {
                if (element) {
                  measureElement(index, element);
                }
              }}
              style={{
                position: 'absolute',
                top: start,
                left: 0,
                right: 0,
                height: size,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </Box>
  );
}

export default VirtualizedList;