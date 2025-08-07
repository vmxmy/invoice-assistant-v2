import React, { useCallback, useRef, useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import AutoSizer from 'react-virtualized-auto-sizer';
import { motion, AnimatePresence } from 'framer-motion';
import { Invoice } from '../../types/invoice';
import { InvoiceCard } from '../invoice/cards/InvoiceCard';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

interface VirtualizedInvoiceListProps {
  invoices: Invoice[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void>;
  onInvoiceClick?: (invoice: Invoice) => void;
  onInvoiceSelect?: (invoice: Invoice, selected: boolean) => void;
  selectedInvoices?: Set<string>;
  isSelectionMode?: boolean;
}

export const VirtualizedInvoiceList: React.FC<VirtualizedInvoiceListProps> = ({
  invoices,
  loading = false,
  hasMore = false,
  onLoadMore,
  onInvoiceClick,
  onInvoiceSelect,
  selectedInvoices = new Set(),
  isSelectionMode = false,
}) => {
  const device = useDeviceDetection();
  const listRef = useRef<List>(null);
  
  // 计算项目高度
  const getItemHeight = useCallback(() => {
    if (device.isMobile) {
      return 180; // 移动端卡片高度
    } else if (device.isTablet) {
      return 200; // 平板卡片高度
    }
    return 220; // 桌面端卡片高度
  }, [device]);

  // 计算间距
  const getItemGap = useCallback(() => {
    return device.isMobile ? 12 : 16;
  }, [device]);

  const itemHeight = getItemHeight();
  const itemGap = getItemGap();
  const itemHeightWithGap = itemHeight + itemGap;

  // 无限滚动配置
  const itemCount = hasMore ? invoices.length + 1 : invoices.length;
  const isItemLoaded = (index: number) => !hasMore || index < invoices.length;
  
  const loadMoreItems = useCallback(async () => {
    if (onLoadMore && !loading) {
      await onLoadMore();
    }
  }, [onLoadMore, loading]);

  // 渲染单个发票项
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    // 如果是加载更多的占位符
    if (!isItemLoaded(index)) {
      return (
        <div
          style={{
            ...style,
            height: itemHeight,
            padding: `0 ${device.isMobile ? '12px' : '16px'}`,
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

    return (
      <motion.div
        style={{
          ...style,
          height: itemHeight,
          padding: `0 ${device.isMobile ? '12px' : '16px'}`,
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, delay: index * 0.01 }}
      >
        <div className="h-full">
          <InvoiceCard
            invoice={invoice}
            onClick={() => onInvoiceClick?.(invoice)}
            onSelect={(selected) => onInvoiceSelect?.(invoice, selected)}
            isSelected={isSelected}
            isSelectionMode={isSelectionMode}
            compact={device.isMobile}
          />
        </div>
      </motion.div>
    );
  }, [
    invoices,
    itemHeight,
    device,
    selectedInvoices,
    isSelectionMode,
    onInvoiceClick,
    onInvoiceSelect,
    isItemLoaded,
  ]);

  // 优化的滚动到顶部
  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToItem(0, 'start');
  }, []);

  // 优化的滚动到特定发票
  const scrollToInvoice = useCallback((invoiceId: string) => {
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index !== -1 && listRef.current) {
      listRef.current.scrollToItem(index, 'center');
    }
  }, [invoices]);

  // 暴露方法给父组件
  React.useImperativeHandle(
    useRef(null),
    () => ({
      scrollToTop,
      scrollToInvoice,
    }),
    [scrollToTop, scrollToInvoice]
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
              <List
                ref={(list) => {
                  ref(list);
                  (listRef as any).current = list;
                }}
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={itemHeightWithGap}
                onItemsRendered={onItemsRendered}
                overscanCount={3}
                className="scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100"
              >
                {Row}
              </List>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  );
};

// 性能优化：使用memo避免不必要的重新渲染
export default React.memo(VirtualizedInvoiceList);