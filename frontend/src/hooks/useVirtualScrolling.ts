/**
 * 虚拟滚动 Hook
 * 专为大数据集表格优化的虚拟滚动实现
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Row } from '@tanstack/react-table';

interface UseVirtualScrollingOptions<T> {
  /** 数据项目列表 */
  items: Row<T>[];
  /** 每个项目的高度 */
  itemHeight: number;
  /** 容器高度 */
  containerHeight: number;
  /** 是否启用虚拟滚动 */
  enabled?: boolean;
  /** 缓冲区大小（渲染额外的项目数） */
  overscan?: number;
  /** 滚动容器引用 */
  scrollElementRef?: React.RefObject<HTMLElement>;
  /** 动态高度计算函数 */
  getItemHeight?: (index: number, item: Row<T>) => number;
  /** 滚动回调 */
  onScroll?: (scrollTop: number, isScrolling: boolean) => void;
}

interface VirtualScrollingResult<T> {
  /** 当前可见的项目 */
  visibleItems: Row<T>[];
  /** 开始索引 */
  startIndex: number;
  /** 结束索引 */
  endIndex: number;
  /** 上方填充高度 */
  paddingTop: number;
  /** 下方填充高度 */
  paddingBottom: number;
  /** 总高度 */
  totalHeight: number;
  /** 是否启用了虚拟滚动 */
  enabled: boolean;
  /** 当前滚动位置 */
  scrollTop: number;
  /** 是否正在滚动 */
  isScrolling: boolean;
  /** 滚动到指定索引 */
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  /** 滚动到指定项目 */
  scrollToItem: (item: Row<T>, align?: 'start' | 'center' | 'end') => void;
}

export const useVirtualScrolling = <T>({
  items,
  itemHeight,
  containerHeight,
  enabled = true,
  overscan = 5,
  scrollElementRef,
  getItemHeight,
  onScroll
}: UseVirtualScrollingOptions<T>): VirtualScrollingResult<T> => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const itemHeights = useRef<Map<number, number>>(new Map());
  const scrollElementInternalRef = useRef<HTMLElement>(null);
  
  // 使用外部ref或内部ref
  const scrollElement = scrollElementRef || scrollElementInternalRef;

  // 计算项目高度
  const getCalculatedItemHeight = useCallback((index: number): number => {
    if (getItemHeight && items[index]) {
      const height = getItemHeight(index, items[index]);
      itemHeights.current.set(index, height);
      return height;
    }
    return itemHeights.current.get(index) || itemHeight;
  }, [getItemHeight, items, itemHeight]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    if (!enabled) return 0;
    
    if (getItemHeight) {
      // 动态高度
      return items.reduce((total, _, index) => {
        return total + getCalculatedItemHeight(index);
      }, 0);
    } else {
      // 固定高度
      return items.length * itemHeight;
    }
  }, [enabled, items, itemHeight, getItemHeight, getCalculatedItemHeight]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (!enabled || items.length === 0) {
      return {
        startIndex: 0,
        endIndex: items.length - 1,
        paddingTop: 0,
        paddingBottom: 0
      };
    }

    let startIndex = 0;
    let endIndex = 0;
    let paddingTop = 0;
    let paddingBottom = 0;

    if (getItemHeight) {
      // 动态高度计算
      let currentHeight = 0;
      let startFound = false;
      
      for (let i = 0; i < items.length; i++) {
        const height = getCalculatedItemHeight(i);
        
        if (!startFound && currentHeight + height > scrollTop) {
          startIndex = Math.max(0, i - overscan);
          startFound = true;
          paddingTop = Math.max(0, currentHeight - (i - startIndex) * itemHeight);
        }
        
        if (startFound && currentHeight > scrollTop + containerHeight) {
          endIndex = Math.min(items.length - 1, i + overscan);
          break;
        }
        
        currentHeight += height;
        endIndex = i;
      }
      
      // 计算下方填充
      if (endIndex < items.length - 1) {
        for (let i = endIndex + 1; i < items.length; i++) {
          paddingBottom += getCalculatedItemHeight(i);
        }
      }
    } else {
      // 固定高度计算（更高效）
      const visibleStartIndex = Math.floor(scrollTop / itemHeight);
      const visibleEndIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight)
      );

      startIndex = Math.max(0, visibleStartIndex - overscan);
      endIndex = Math.min(items.length - 1, visibleEndIndex + overscan);
      
      paddingTop = startIndex * itemHeight;
      paddingBottom = (items.length - endIndex - 1) * itemHeight;
    }

    return {
      startIndex,
      endIndex,
      paddingTop,
      paddingBottom
    };
  }, [
    enabled,
    items.length,
    scrollTop,
    containerHeight,
    itemHeight,
    overscan,
    getItemHeight,
    getCalculatedItemHeight
  ]);

  // 获取可见项目
  const visibleItems = useMemo(() => {
    if (!enabled) return items;
    
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1);
  }, [enabled, items, visibleRange]);

  // 滚动处理
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    
    // 清除之前的超时
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 设置新的超时来检测滚动结束
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
    
    // 调用外部回调
    onScroll?.(newScrollTop, true);
  }, [onScroll]);

  // 滚动到指定索引
  const scrollToIndex = useCallback((
    index: number,
    align: 'start' | 'center' | 'end' = 'start'
  ) => {
    if (!enabled || !scrollElement.current || index < 0 || index >= items.length) {
      return;
    }

    let targetScrollTop = 0;

    if (getItemHeight) {
      // 动态高度计算
      for (let i = 0; i < index; i++) {
        targetScrollTop += getCalculatedItemHeight(i);
      }
    } else {
      // 固定高度计算
      targetScrollTop = index * itemHeight;
    }

    // 根据对齐方式调整
    switch (align) {
      case 'center':
        targetScrollTop -= containerHeight / 2 - itemHeight / 2;
        break;
      case 'end':
        targetScrollTop -= containerHeight - itemHeight;
        break;
      // 'start' 不需要调整
    }

    // 确保不超出边界
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight - containerHeight));

    scrollElement.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }, [
    enabled,
    scrollElement,
    items.length,
    containerHeight,
    itemHeight,
    totalHeight,
    getItemHeight,
    getCalculatedItemHeight
  ]);

  // 滚动到指定项目
  const scrollToItem = useCallback((
    item: Row<T>,
    align: 'start' | 'center' | 'end' = 'start'
  ) => {
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      scrollToIndex(index, align);
    }
  }, [items, scrollToIndex]);

  // 监听滚动事件
  useEffect(() => {
    if (!enabled || !scrollElement.current) return;

    const element = scrollElement.current;
    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, scrollElement, handleScroll]);

  // 清理超时
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 性能优化：在滚动时禁用某些更新
  useEffect(() => {
    if (isScrolling && onScroll) {
      const timeoutId = setTimeout(() => {
        onScroll(scrollTop, false);
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [isScrolling, scrollTop, onScroll]);

  return {
    visibleItems,
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex,
    paddingTop: visibleRange.paddingTop,
    paddingBottom: visibleRange.paddingBottom,
    totalHeight,
    enabled,
    scrollTop,
    isScrolling,
    scrollToIndex,
    scrollToItem
  };
};

/**
 * 虚拟滚动性能监控 Hook
 */
export const useVirtualScrollingPerformance = <T>(
  virtualScrolling: VirtualScrollingResult<T>
) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    scrollFPS: 0,
    memoryEstimate: 0,
    efficiency: 0
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(0);

  // 监控渲染性能
  useEffect(() => {
    const startTime = performance.now();

    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      
      // 更新帧时间记录
      const now = performance.now();
      if (lastFrameTimeRef.current > 0) {
        const frameTime = now - lastFrameTimeRef.current;
        frameTimesRef.current.push(frameTime);
        
        // 保持最近60帧的记录
        if (frameTimesRef.current.length > 60) {
          frameTimesRef.current.shift();
        }
      }
      lastFrameTimeRef.current = now;

      // 计算FPS
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 60;

      // 计算内存估算
      const visibleCount = virtualScrolling.endIndex - virtualScrolling.startIndex + 1;
      const totalCount = virtualScrolling.visibleItems.length;
      const memoryEstimate = (visibleCount / Math.max(totalCount, 1)) * 100;

      // 计算效率（虚拟化比率）
      const efficiency = totalCount > 0 ? (1 - visibleCount / totalCount) * 100 : 0;

      setMetrics({
        renderTime,
        scrollFPS: Math.round(fps),
        memoryEstimate: Math.round(memoryEstimate),
        efficiency: Math.round(efficiency)
      });
    });
  }, [virtualScrolling]);

  return metrics;
};

export default useVirtualScrolling;