import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface VirtualListProps<T> {
  items: T[];
  height: number; // Container height
  itemHeight: number | ((index: number) => number); // Fixed or dynamic item height
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number; // Number of items to render outside visible area
  className?: string;
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
  getKey?: (item: T, index: number) => string | number;
  emptyMessage?: string;
}

/**
 * 高性能虚拟滚动列表组件
 * 只渲染可见区域的元素，大幅提升长列表性能
 */
function VirtualListComponent<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  onScroll,
  getKey,
  emptyMessage = '暂无数据'
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // 计算项目高度
  const getItemHeight = useCallback((index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
  }, [itemHeight]);

  // 计算项目偏移量
  const getItemOffset = useCallback((index: number): number => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight;
    }
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }, [itemHeight, getItemHeight]);

  // 计算总高度
  const getTotalHeight = useCallback((): number => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    return total;
  }, [items.length, itemHeight, getItemHeight]);

  // 计算可见范围
  const getVisibleRange = useCallback((): { start: number; end: number } => {
    const totalHeight = getTotalHeight();
    
    if (typeof itemHeight === 'number') {
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const visibleCount = Math.ceil(height / itemHeight);
      const end = Math.min(items.length, start + visibleCount + overscan * 2);
      return { start, end };
    }

    // 动态高度的情况
    let accumulatedHeight = 0;
    let start = 0;
    let end = items.length;

    // 找到起始索引
    for (let i = 0; i < items.length; i++) {
      const itemH = getItemHeight(i);
      if (accumulatedHeight + itemH > scrollTop - overscan * itemH) {
        start = i;
        break;
      }
      accumulatedHeight += itemH;
    }

    // 找到结束索引
    accumulatedHeight = getItemOffset(start);
    for (let i = start; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + height + overscan * getItemHeight(i)) {
        end = i;
        break;
      }
      accumulatedHeight += getItemHeight(i);
    }

    return { start, end };
  }, [scrollTop, height, itemHeight, items.length, overscan, getItemHeight, getItemOffset, getTotalHeight]);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const newScrollTop = target.scrollTop;
    
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // 清除之前的超时
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 设置新的超时，用于检测滚动结束
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    onScroll?.(newScrollTop, target.scrollHeight);
  }, [onScroll]);

  // 清理超时
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 空状态
  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <p className="text-base-content/60">{emptyMessage}</p>
      </div>
    );
  }

  const { start, end } = getVisibleRange();
  const totalHeight = getTotalHeight();
  const visibleItems = items.slice(start, end);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      {/* 虚拟滚动占位元素 */}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 渲染可见项目 */}
        <div
          style={{
            transform: `translateY(${getItemOffset(start)}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = start + index;
            const key = getKey ? getKey(item, actualIndex) : actualIndex;
            const itemH = getItemHeight(actualIndex);

            return (
              <div
                key={key}
                style={{
                  height: typeof itemHeight === 'number' ? itemH : undefined,
                  minHeight: typeof itemHeight === 'function' ? itemH : undefined
                }}
                className={isScrolling ? 'pointer-events-none' : ''}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>

      {/* 滚动状态指示器 */}
      {isScrolling && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-base-content/10 backdrop-blur-sm rounded-full px-3 py-1">
            <p className="text-xs text-base-content/60">
              {start + 1} - {end} / {items.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// 使用 React.memo 优化性能
export const VirtualList = React.memo(VirtualListComponent) as typeof VirtualListComponent;

// 带错误边界的版本
export function VirtualListWithBoundary<T>(props: VirtualListProps<T>) {
  return (
    <ErrorBoundary
      componentName="VirtualList"
      fallback={
        <div 
          className={`flex items-center justify-center ${props.className || ''}`}
          style={{ height: props.height }}
        >
          <p className="text-base-content/60">列表加载失败</p>
        </div>
      }
    >
      <VirtualList {...props} />
    </ErrorBoundary>
  );
}

// 虚拟网格组件
interface VirtualGridProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  columns: number;
  renderItem: (item: T, index: number) => ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
  getKey?: (item: T, index: number) => string | number;
}

export function VirtualGrid<T>({
  items,
  height,
  itemHeight,
  columns,
  renderItem,
  gap = 16,
  overscan = 2,
  className = '',
  getKey
}: VirtualGridProps<T>) {
  const rows = Math.ceil(items.length / columns);
  const rowHeight = itemHeight + gap;

  // 将items转换为行数据
  const rowItems = Array.from({ length: rows }, (_, rowIndex) => {
    return items.slice(rowIndex * columns, (rowIndex + 1) * columns);
  });

  return (
    <VirtualList
      items={rowItems}
      height={height}
      itemHeight={rowHeight}
      overscan={overscan}
      className={className}
      renderItem={(row, rowIndex) => (
        <div 
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`,
            paddingBottom: `${gap}px`
          }}
        >
          {row.map((item, colIndex) => {
            const actualIndex = rowIndex * columns + colIndex;
            const key = getKey ? getKey(item, actualIndex) : actualIndex;
            return (
              <div key={key}>
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      )}
      getKey={(_, index) => `row-${index}`}
    />
  );
}

export default VirtualList;