import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDeviceDetection } from './useMediaQuery';

interface VirtualListOptions {
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number; // 额外渲染的项目数量
  enableDynamicHeight?: boolean;
  threshold?: number; // 滚动阈值
}

interface VirtualListItem<T> {
  index: number;
  data: T;
  style: React.CSSProperties;
}

interface VirtualListReturn<T> {
  containerProps: {
    style: React.CSSProperties;
    onScroll: (event: React.UIEvent<HTMLElement>) => void;
    ref: React.RefObject<HTMLDivElement>;
  };
  visibleItems: VirtualListItem<T>[];
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  isScrolling: boolean;
}

/**
 * 虚拟化列表钩子 - 专为移动端长列表性能优化
 */
export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions = {}
): VirtualListReturn<T> {
  const device = useDeviceDetection();
  const {
    itemHeight = 200, // 默认卡片高度
    containerHeight = device.isMobile ? window.innerHeight - 200 : 600,
    overscan = 5,
    enableDynamicHeight = false,
    threshold = 100,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>();

  // 初始化滚动容器
  useEffect(() => {
    if (containerRef.current) {
      scrollElementRef.current = containerRef.current;
    }
  }, []);

  // 计算总高度
  const totalHeight = useMemo(() => {
    if (enableDynamicHeight) {
      return items.reduce((total, _, index) => {
        return total + (itemHeights.get(index) || itemHeight);
      }, 0);
    }
    return items.length * itemHeight;
  }, [items.length, itemHeight, enableDynamicHeight, itemHeights]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const start = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(
      items.length - 1,
      start + visibleCount + overscan * 2
    );

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // 生成可见项目
  const visibleItems = useMemo(() => {
    const result: VirtualListItem<T>[] = [];
    
    for (let index = visibleRange.start; index <= visibleRange.end; index++) {
      const item = items[index];
      if (!item) continue;

      let top = index * itemHeight;
      let height = itemHeight;

      // 动态高度计算
      if (enableDynamicHeight) {
        top = 0;
        for (let i = 0; i < index; i++) {
          top += itemHeights.get(i) || itemHeight;
        }
        height = itemHeights.get(index) || itemHeight;
      }

      result.push({
        index,
        data: item,
        style: {
          position: 'absolute',
          top,
          left: 0,
          right: 0,
          height,
          // 性能优化
          contain: 'layout style paint',
          willChange: 'transform',
        },
      });
    }

    return result;
  }, [visibleRange, items, itemHeight, enableDynamicHeight, itemHeights]);

  // 滚动处理
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    setIsScrolling(true);

    // 清除之前的定时器
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }

    // 设置滚动结束检测
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number) => {
    if (!scrollElementRef.current) return;

    let targetScrollTop = index * itemHeight;

    // 动态高度计算
    if (enableDynamicHeight) {
      targetScrollTop = 0;
      for (let i = 0; i < index; i++) {
        targetScrollTop += itemHeights.get(i) || itemHeight;
      }
    }

    scrollElementRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }, [itemHeight, enableDynamicHeight, itemHeights]);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    if (!scrollElementRef.current) return;
    
    scrollElementRef.current.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  // 更新项目高度（动态高度模式）
  const updateItemHeight = useCallback((index: number, height: number) => {
    if (!enableDynamicHeight) return;
    
    setItemHeights(prev => {
      const next = new Map(prev);
      next.set(index, height);
      return next;
    });
  }, [enableDynamicHeight]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    containerProps: {
      ref: containerRef,
      style: {
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        // 移动端滚动优化
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        // 性能优化
        willChange: 'scroll-position',
        contain: 'layout style paint',
      },
      onScroll: handleScroll,
    },
    visibleItems,
    totalHeight,
    scrollToIndex,
    scrollToTop,
    isScrolling,
  };
}

/**
 * 无限滚动钩子 - 结合虚拟列表实现高性能无限滚动
 */
interface InfiniteScrollOptions<T> extends VirtualListOptions {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  loadMoreThreshold?: number;
}

export function useInfiniteVirtualList<T>(
  items: T[],
  options: InfiniteScrollOptions<T> = {}
): VirtualListReturn<T> & {
  loadMoreTrigger: JSX.Element | null;
} {
  const {
    hasNextPage = false,
    isFetchingNextPage = false,
    fetchNextPage,
    loadMoreThreshold = 200,
    ...virtualOptions
  } = options;

  const virtualList = useVirtualList(items, virtualOptions);
  const { containerProps } = virtualList;
  const [shouldLoadMore, setShouldLoadMore] = useState(false);

  // 增强滚动处理以支持无限加载
  const enhancedScrollHandler = useCallback((event: React.UIEvent<HTMLElement>) => {
    // 调用原始滚动处理
    containerProps.onScroll(event);

    // 检查是否需要加载更多
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (
      distanceFromBottom < loadMoreThreshold &&
      hasNextPage &&
      !isFetchingNextPage &&
      fetchNextPage
    ) {
      setShouldLoadMore(true);
      fetchNextPage();
    }
  }, [containerProps.onScroll, loadMoreThreshold, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 重置加载更多状态
  useEffect(() => {
    if (isFetchingNextPage) {
      setShouldLoadMore(false);
    }
  }, [isFetchingNextPage]);

  // 加载更多触发器组件
  const loadMoreTrigger = useMemo(() => {
    if (!hasNextPage) return null;

    return (
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.05))',
        }}
      >
        {isFetchingNextPage ? (
          <div className="loading loading-spinner loading-sm"></div>
        ) : (
          <div className="text-xs text-base-content/60">
            下拉加载更多
          </div>
        )}
      </div>
    );
  }, [hasNextPage, isFetchingNextPage]);

  return {
    ...virtualList,
    containerProps: {
      ...containerProps,
      onScroll: enhancedScrollHandler,
    },
    loadMoreTrigger,
  };
}

export default useVirtualList;