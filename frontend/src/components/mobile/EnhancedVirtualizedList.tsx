/**
 * 增强版虚拟化列表组件
 * 优化移动端滚动性能，支持项目高度缓存、预加载和滚动位置记忆
 */
import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { FixedSizeList as List, VariableSizeList, ListChildComponentProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import AutoSizer from 'react-virtualized-auto-sizer';
import { motion, AnimatePresence } from 'framer-motion';
import { Invoice } from '../../types/invoice';
import { InvoiceCard } from '../invoice/cards/InvoiceCard';
import { useDeviceDetection } from '../../hooks/useMediaQuery';
import { mobilePerformanceMonitor } from '../../utils/mobilePerformanceMonitor';

interface EnhancedVirtualizedListProps {
  invoices: Invoice[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void>;
  onInvoiceClick?: (invoice: Invoice) => void;
  onInvoiceSelect?: (invoice: Invoice, selected: boolean) => void;
  selectedInvoices?: Set<string>;
  isSelectionMode?: boolean;
  enableHeightCache?: boolean;
  enableScrollMemory?: boolean;
  preloadCount?: number;
  persistScrollKey?: string;
}

// 项目高度缓存管理
class ItemHeightCache {
  private cache = new Map<string, number>();
  private defaultHeight: number;
  
  constructor(defaultHeight: number) {
    this.defaultHeight = defaultHeight;
  }

  get(index: number, itemId?: string): number {
    const key = itemId || index.toString();
    return this.cache.get(key) || this.defaultHeight;
  }

  set(index: number, height: number, itemId?: string): void {
    const key = itemId || index.toString();
    this.cache.set(key, height);
  }

  clear(): void {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }
}

// 滚动位置记忆管理
class ScrollMemory {
  private storage = new Map<string, number>();

  save(key: string, scrollTop: number): void {
    this.storage.set(key, scrollTop);
    // 同时保存到 sessionStorage
    try {
      sessionStorage.setItem(`scroll_${key}`, scrollTop.toString());
    } catch (e) {
      // 忽略存储错误
    }
  }

  restore(key: string): number {
    // 优先从内存读取
    let scrollTop = this.storage.get(key);
    
    // 如果内存中没有，从 sessionStorage 读取
    if (scrollTop === undefined) {
      try {
        const stored = sessionStorage.getItem(`scroll_${key}`);
        scrollTop = stored ? parseFloat(stored) : 0;
      } catch (e) {
        scrollTop = 0;
      }
    }
    
    return scrollTop || 0;
  }

  clear(key: string): void {
    this.storage.delete(key);
    try {
      sessionStorage.removeItem(`scroll_${key}`);
    } catch (e) {
      // 忽略存储错误
    }
  }
}

const heightCache = new ItemHeightCache(180);
const scrollMemory = new ScrollMemory();

export const EnhancedVirtualizedList: React.FC<EnhancedVirtualizedListProps> = ({
  invoices,
  loading = false,
  hasMore = false,
  onLoadMore,
  onInvoiceClick,
  onInvoiceSelect,
  selectedInvoices = new Set(),
  isSelectionMode = false,
  enableHeightCache = true,
  enableScrollMemory = true,
  preloadCount = 5,
  persistScrollKey = 'invoice-list',
}) => {
  const device = useDeviceDetection();
  const listRef = useRef<VariableSizeList>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

  // 设置性能监控指标
  useEffect(() => {
    mobilePerformanceMonitor.setMetric('listItemCount', invoices.length);
    mobilePerformanceMonitor.setMetric('viewMode', 'grid');
  }, [invoices.length]);

  // 计算项目高度（支持缓存）
  const getItemHeight = useCallback((index: number) => {
    if (!enableHeightCache) {
      return device.isMobile ? 180 : device.isTablet ? 200 : 220;
    }
    
    const invoice = invoices[index];
    const itemId = invoice?.id;
    return heightCache.get(index, itemId);
  }, [device, invoices, enableHeightCache]);

  // 计算间距
  const getItemGap = useCallback(() => {
    return device.isMobile ? 12 : 16;
  }, [device]);

  const itemGap = getItemGap();

  // 无限滚动配置
  const itemCount = hasMore ? invoices.length + 1 : invoices.length;
  const isItemLoaded = (index: number) => !hasMore || index < invoices.length;
  
  const loadMoreItems = useCallback(async () => {
    if (onLoadMore && !loading) {
      await onLoadMore();
    }
  }, [onLoadMore, loading]);

  // 预加载项目内容
  const preloadItems = useCallback((startIndex: number, endIndex: number) => {
    if (!preloadCount) return;
    
    const preloadStart = Math.max(0, startIndex - preloadCount);
    const preloadEnd = Math.min(invoices.length - 1, endIndex + preloadCount);
    
    // 这里可以实现具体的预加载逻辑
    // 比如预加载图片、预处理数据等
    for (let i = preloadStart; i <= preloadEnd; i++) {
      const invoice = invoices[i];
      if (invoice && invoice.file_url) {
        // 预加载图片
        const img = new Image();
        img.src = invoice.file_url;
      }
    }
  }, [invoices, preloadCount]);

  // 处理滚动事件（节流）
  const handleScroll = useCallback(
    throttle(({ scrollTop }: { scrollTop: number }) => {
      if (enableScrollMemory) {
        scrollMemory.save(persistScrollKey, scrollTop);
      }
    }, 100),
    [enableScrollMemory, persistScrollKey]
  );

  // 处理可见范围变化
  const handleItemsRendered = useCallback(({ visibleStartIndex, visibleStopIndex }: {
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    setVisibleRange({ start: visibleStartIndex, end: visibleStopIndex });
    preloadItems(visibleStartIndex, visibleStopIndex);
  }, [preloadItems]);

  // 渲染单个发票项
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    // 如果是加载更多的占位符
    if (!isItemLoaded(index)) {
      return (
        <div
          style={{
            ...style,
            padding: `0 ${device.isMobile ? '12px' : '16px'}`,
            paddingBottom: itemGap
          }}
        >
          <div className="h-full bg-base-200 rounded-lg animate-pulse flex items-center justify-center">
            <div className="loading loading-spinner loading-md"></div>
          </div>
        </div>
      );
    }

    const invoice = invoices[index];
    if (!invoice) return null;

    const isSelected = selectedInvoices.has(invoice.id);
    const isVisible = index >= visibleRange.start && index <= visibleRange.end;

    // 性能优化：只为可见项目渲染完整内容
    return (
      <div
        style={{
          ...style,
          padding: `0 ${device.isMobile ? '12px' : '16px'}`,
          paddingBottom: itemGap
        }}
        ref={(el) => {
          // 缓存实际渲染高度
          if (el && enableHeightCache) {
            const height = el.getBoundingClientRect().height;
            if (height > 0) {
              heightCache.set(index, height + itemGap, invoice.id);
              // 更新列表项高度
              if (listRef.current) {
                listRef.current.resetAfterIndex(index);
              }
            }
          }
        }}
      >
        <div className="h-full">
          {isVisible || !isScrolling ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: index * 0.01 }}
            >
              <InvoiceCard
                invoice={invoice}
                onClick={() => onInvoiceClick?.(invoice)}
                onSelect={(selected) => onInvoiceSelect?.(invoice, selected)}
                isSelected={isSelected}
                isSelectionMode={isSelectionMode}
                compact={device.isMobile}
              />
            </motion.div>
          ) : (
            // 滚动时显示简化版本
            <div className="h-full bg-base-200 rounded-lg animate-pulse" />
          )}
        </div>
      </div>
    );
  }, [
    invoices,
    itemGap,
    device,
    selectedInvoices,
    isSelectionMode,
    onInvoiceClick,
    onInvoiceSelect,
    isItemLoaded,
    enableHeightCache,
    visibleRange,
    isScrolling
  ]);

  // 恢复滚动位置
  useEffect(() => {
    if (enableScrollMemory && listRef.current && invoices.length > 0) {
      const savedScrollTop = scrollMemory.restore(persistScrollKey);
      if (savedScrollTop > 0) {
        setTimeout(() => {
          listRef.current?.scrollTo(savedScrollTop);
        }, 100);
      }
    }
  }, [enableScrollMemory, persistScrollKey, invoices.length]);

  // 优化的滚动到顶部
  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
      if (enableScrollMemory) {
        scrollMemory.save(persistScrollKey, 0);
      }
    }
  }, [enableScrollMemory, persistScrollKey]);

  // 优化的滚动到特定发票
  const scrollToInvoice = useCallback((invoiceId: string) => {
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index !== -1 && listRef.current) {
      listRef.current.scrollToItem(index, 'center');
    }
  }, [invoices]);

  // 清除缓存
  const clearCache = useCallback(() => {
    heightCache.clear();
    if (enableScrollMemory) {
      scrollMemory.clear(persistScrollKey);
    }
  }, [enableScrollMemory, persistScrollKey]);

  // 暴露方法给父组件
  React.useImperativeHandle(
    useRef(null),
    () => ({
      scrollToTop,
      scrollToInvoice,
      clearCache,
      getCurrentScrollTop: () => scrollMemory.restore(persistScrollKey)
    }),
    [scrollToTop, scrollToInvoice, clearCache, persistScrollKey]
  );

  // 空状态
  if (invoices.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-base-content/60">
        <svg
          className="w-16 h-16 mb-4 text-base-content/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-lg font-medium">暂无发票数据</p>
        <p className="text-sm mt-1">上传您的第一张发票开始管理</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMoreItems}
            threshold={5}
          >
            {({ onItemsRendered, ref }) => (
              <VariableSizeList
                ref={(list) => {
                  ref(list);
                  (listRef as any).current = list;
                }}
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={getItemHeight}
                onItemsRendered={(props) => {
                  onItemsRendered(props);
                  handleItemsRendered(props);
                }}
                onScroll={handleScroll}
                overscanCount={device.isMobile ? 2 : 3}
                useIsScrolling
                className="scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100"
              >
                {Row}
              </VariableSizeList>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  );
};

// 节流工具函数
function throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  let lastExecTime = 0;
  
  return ((...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  }) as T;
}

// 性能优化：使用memo避免不必要的重新渲染
export default React.memo(EnhancedVirtualizedList);