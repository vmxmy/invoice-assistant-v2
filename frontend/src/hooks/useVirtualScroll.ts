import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  scrollDebounce?: number;
}

interface VirtualScrollState {
  visibleStart: number;
  visibleEnd: number;
  offsetY: number;
  totalHeight: number;
  isScrolling: boolean;
}

/**
 * 虚拟滚动 Hook
 * 提供虚拟滚动的核心逻辑
 */
export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
  scrollDebounce = 150
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // 计算单个项目高度
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
      return itemCount * itemHeight;
    }
    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      total += getItemHeight(i);
    }
    return total;
  }, [itemCount, itemHeight, getItemHeight]);

  // 计算可见范围
  const getVisibleRange = useCallback((): VirtualScrollState => {
    const totalHeight = getTotalHeight();
    
    if (typeof itemHeight === 'number') {
      const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const visibleEnd = Math.min(itemCount, visibleStart + visibleCount + overscan * 2);
      
      return {
        visibleStart,
        visibleEnd,
        offsetY: getItemOffset(visibleStart),
        totalHeight,
        isScrolling
      };
    }

    // 动态高度的情况
    let accumulatedHeight = 0;
    let visibleStart = 0;
    let visibleEnd = itemCount;

    // 找到起始索引
    for (let i = 0; i < itemCount; i++) {
      const height = getItemHeight(i);
      if (accumulatedHeight + height > scrollTop - overscan * height) {
        visibleStart = i;
        break;
      }
      accumulatedHeight += height;
    }

    // 找到结束索引
    accumulatedHeight = getItemOffset(visibleStart);
    for (let i = visibleStart; i < itemCount; i++) {
      if (accumulatedHeight > scrollTop + containerHeight + overscan * getItemHeight(i)) {
        visibleEnd = i;
        break;
      }
      accumulatedHeight += getItemHeight(i);
    }

    return {
      visibleStart,
      visibleEnd,
      offsetY: getItemOffset(visibleStart),
      totalHeight,
      isScrolling
    };
  }, [scrollTop, containerHeight, itemHeight, itemCount, overscan, getItemHeight, getItemOffset, getTotalHeight, isScrolling]);

  // 处理滚动
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    setScrollTop(target.scrollTop);
    setIsScrolling(true);

    // 清除之前的超时
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 设置新的超时
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, scrollDebounce);
  }, [scrollDebounce]);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const offset = getItemOffset(index);
    const container = document.querySelector('[data-virtual-scroll-container]');
    if (container) {
      container.scrollTo({ top: offset, behavior });
    }
  }, [getItemOffset]);

  // 滚动到顶部
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(0, behavior);
  }, [scrollToIndex]);

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(itemCount - 1, behavior);
  }, [scrollToIndex, itemCount]);

  // 清理
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...getVisibleRange(),
    handleScroll,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    scrollTop
  };
}

// 无限滚动 Hook
interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
}

export function useInfiniteScroll({
  threshold = 0.9,
  rootMargin = '100px',
  hasMore,
  loading,
  onLoadMore
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading || !hasMore) return;

    const options = {
      root: null,
      rootMargin,
      threshold
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    }, options);

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, onLoadMore, rootMargin, threshold]);

  return { loadMoreRef };
}