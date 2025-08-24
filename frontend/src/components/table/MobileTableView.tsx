/**
 * MobileTableView 组件
 * 专为移动端优化的 TanStack Table 视图
 */

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { 
  flexRender,
  Table as TanStackTable,
  Row
} from '@tanstack/react-table';
import { useDeviceDetection } from '../../hooks/useMediaQuery';
import { useMobileTableColumns } from '../../hooks/useMobileTableColumns';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useVirtualScrolling } from '../../hooks/useVirtualScrolling';
import { 
  MobileTableConfig, 
  DEFAULT_MOBILE_TABLE_CONFIG,
  MobileTableTheme,
  DEFAULT_MOBILE_THEME,
  AccessibilityConfig,
  DEFAULT_ACCESSIBILITY_CONFIG,
  TouchGestureEvent,
  ScrollState,
  PerformanceMetrics
} from '../../types/table';

interface MobileTableViewProps<T> {
  /** TanStack Table 实例 */
  table: TanStackTable<T>;
  /** 移动端配置 */
  config?: Partial<MobileTableConfig>;
  /** 主题配置 */
  theme?: Partial<MobileTableTheme>;
  /** 无障碍配置 */
  accessibility?: Partial<AccessibilityConfig>;
  /** 是否启用虚拟滚动 */
  enableVirtualScrolling?: boolean;
  /** 是否启用触摸手势 */
  enableTouchGestures?: boolean;
  /** 选择变化回调 */
  onSelectionChange?: (selectedRows: string[]) => void;
  /** 行点击回调 */
  onRowClick?: (row: Row<T>) => void;
  /** 长按回调 */
  onRowLongPress?: (row: Row<T>) => void;
  /** 滑动操作回调 */
  onRowSwipe?: (row: Row<T>, direction: 'left' | 'right') => void;
  /** 性能监控回调 */
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
  /** 自定义加载状态 */
  loadingComponent?: React.ReactNode;
  /** 自定义空状态 */
  emptyComponent?: React.ReactNode;
}

export const MobileTableView = <T,>({
  table,
  config = {},
  theme = {},
  accessibility = {},
  enableVirtualScrolling = true,
  enableTouchGestures = true,
  onSelectionChange,
  onRowClick,
  onRowLongPress,
  onRowSwipe,
  onPerformanceMetrics,
  loadingComponent,
  emptyComponent
}: MobileTableViewProps<T>) => {
  const device = useDeviceDetection();
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [containerWidth, setContainerWidth] = useState(320);
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollLeft: 0,
    scrollTop: 0,
    containerWidth: 320,
    contentWidth: 320,
    canScrollLeft: false,
    canScrollRight: false,
    isScrolling: false
  });

  // 合并配置
  const mergedConfig = useMemo(() => ({
    ...DEFAULT_MOBILE_TABLE_CONFIG,
    ...config
  }), [config]);

  const mergedTheme = useMemo(() => ({
    ...DEFAULT_MOBILE_THEME,
    ...theme
  }), [theme]);

  const mergedAccessibility = useMemo(() => ({
    ...DEFAULT_ACCESSIBILITY_CONFIG,
    ...accessibility
  }), [accessibility]);

  // 获取表格列和行数据
  const columns = table.getAllColumns().map(col => col.columnDef);
  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();

  // 移动端列优化
  const {
    optimizedColumns,
    totalWidth,
    visibleColumnCount,
    hiddenColumns,
    widthAllocation
  } = useMobileTableColumns({
    columns,
    containerWidth,
    config: mergedConfig,
    enableSmartOptimization: true
  });

  // 虚拟滚动
  const virtualScrolling = useVirtualScrolling({
    items: rows,
    itemHeight: device.isMobile ? mergedConfig.compactRowHeight : mergedConfig.rowHeight,
    containerHeight: 400, // 默认高度
    enabled: enableVirtualScrolling && rows.length > mergedConfig.virtualScrollingThreshold
  });

  // 触摸手势处理
  const handleTouchGesture = useCallback((event: TouchGestureEvent) => {
    const rowElement = event.target.closest('[data-row-id]') as HTMLElement;
    if (!rowElement) return;

    const rowId = rowElement.dataset.rowId;
    if (!rowId) return;

    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    switch (event.type) {
      case 'tap':
        onRowClick?.(row);
        break;
      case 'long-press':
        onRowLongPress?.(row);
        // 进入选择模式
        if (onSelectionChange) {
          const currentSelection = table.getSelectedRowModel().rows.map(r => r.id);
          const newSelection = currentSelection.includes(row.id)
            ? currentSelection.filter(id => id !== row.id)
            : [...currentSelection, row.id];
          onSelectionChange(newSelection);
        }
        break;
      case 'swipe-left':
      case 'swipe-right':
        onRowSwipe?.(row, event.type === 'swipe-left' ? 'left' : 'right');
        break;
    }
  }, [rows, table, onRowClick, onRowLongPress, onRowSwipe, onSelectionChange]);

  useTouchGestures({
    containerRef,
    enabled: enableTouchGestures,
    onGesture: handleTouchGesture,
    longPressDelay: mergedConfig.longPressDelay
  });

  // 容器大小监听
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 滚动状态监听
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;
      const containerWidth = container.clientWidth;
      const contentWidth = container.scrollWidth;

      setScrollState(prev => ({
        ...prev,
        scrollLeft,
        scrollTop,
        containerWidth,
        contentWidth,
        canScrollLeft: scrollLeft > 0,
        canScrollRight: scrollLeft < contentWidth - containerWidth,
        isScrolling: true
      }));

      // 清除滚动状态
      const timeoutId = setTimeout(() => {
        setScrollState(prev => ({ ...prev, isScrolling: false }));
      }, 150);

      return () => clearTimeout(timeoutId);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // 初始状态
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 性能监控
  useEffect(() => {
    if (!onPerformanceMetrics) return;

    const metrics: PerformanceMetrics = {
      renderTime: performance.now(),
      scrollFPS: 60, // 简化实现
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      visibleRows: virtualScrolling.visibleItems.length,
      totalRows: rows.length,
      isVirtualScrolling: virtualScrolling.enabled
    };

    onPerformanceMetrics(metrics);
  }, [rows.length, virtualScrolling, onPerformanceMetrics]);

  // 渲染表头
  const renderHeader = () => (
    <thead 
      className={`
        sticky top-0 z-20 
        ${mergedTheme.headerBg} 
        backdrop-blur-sm
        border-b border-opacity-10
        ${device.isMobile ? 'shadow-sm' : ''}
      `}
      style={{ 
        backgroundColor: mergedTheme.headerBg,
        height: mergedConfig.headerHeight
      }}
    >
      {headerGroups.map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => {
            const columnId = header.column.id;
            const width = widthAllocation[columnId] || 'auto';
            const meta = header.column.columnDef.meta as any;
            
            return (
              <th
                key={header.id}
                className={`
                  ${mergedTheme.cellPadding}
                  text-left font-medium
                  ${device.isMobile ? 'text-xs' : 'text-sm'}
                  truncate
                  ${meta?.sticky ? 'sticky bg-inherit z-30' : ''}
                `}
                style={{
                  width: typeof width === 'number' ? `${width}px` : width,
                  minWidth: typeof width === 'number' ? `${width}px` : width,
                  maxWidth: typeof width === 'number' ? `${width}px` : width,
                  left: meta?.sticky === 'left' ? 0 : 'auto',
                  right: meta?.sticky === 'right' ? 0 : 'auto',
                  color: mergedTheme.headerColor
                }}
                role="columnheader"
                aria-sort={
                  header.column.getIsSorted() === 'asc' ? 'ascending' :
                  header.column.getIsSorted() === 'desc' ? 'descending' : 'none'
                }
              >
                {header.isPlaceholder ? null : (
                  <div className="flex items-center gap-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );

  // 渲染表体
  const renderBody = () => {
    const visibleRows = virtualScrolling.enabled ? virtualScrolling.visibleItems : rows;
    
    if (visibleRows.length === 0) {
      return (
        <tbody>
          <tr>
            <td 
              colSpan={visibleColumnCount}
              className="p-8 text-center text-base-content/60"
            >
              {emptyComponent || (
                <div>
                  <div className="text-4xl mb-2">📄</div>
                  <div>暂无数据</div>
                </div>
              )}
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {virtualScrolling.enabled && virtualScrolling.paddingTop > 0 && (
          <tr>
            <td 
              colSpan={visibleColumnCount}
              style={{ height: virtualScrolling.paddingTop }}
            />
          </tr>
        )}
        
        {visibleRows.map((row, index) => {
          const isSelected = row.getIsSelected();
          const rowIndex = virtualScrolling.enabled 
            ? virtualScrolling.startIndex + index 
            : index;
          
          return (
            <tr
              key={row.id}
              data-row-id={row.id}
              data-row-index={rowIndex}
              className={`
                group transition-colors duration-150
                ${isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''}
                ${mergedTheme.zebra && rowIndex % 2 === 0 ? 'bg-base-100' : 'bg-base-50'}
                hover:bg-base-200/50
                active:bg-base-300/30
                ${device.isTouchDevice ? 'cursor-pointer select-none' : ''}
                touch-manipulation
              `}
              style={{
                height: device.isMobile 
                  ? mergedConfig.compactRowHeight 
                  : mergedConfig.rowHeight
              }}
              role="row"
              aria-selected={isSelected}
              tabIndex={mergedAccessibility.enableKeyboardNavigation ? 0 : undefined}
            >
              {row.getVisibleCells().map(cell => {
                const columnId = cell.column.id;
                const width = widthAllocation[columnId] || 'auto';
                const meta = cell.column.columnDef.meta as any;
                
                return (
                  <td
                    key={cell.id}
                    className={`
                      ${mergedTheme.cellPadding}
                      ${device.isMobile ? 'text-xs' : 'text-sm'}
                      align-top
                      ${meta?.truncate ? 'truncate' : ''}
                      ${meta?.sticky ? 'sticky bg-inherit z-10' : ''}
                    `}
                    style={{
                      width: typeof width === 'number' ? `${width}px` : width,
                      minWidth: typeof width === 'number' ? `${width}px` : width,
                      maxWidth: typeof width === 'number' ? `${width}px` : width,
                      left: meta?.sticky === 'left' ? 0 : 'auto',
                      right: meta?.sticky === 'right' ? 0 : 'auto',
                      textAlign: meta?.align || 'left'
                    }}
                    role="gridcell"
                    title={meta?.showTooltip ? String(cell.getValue()) : undefined}
                  >
                    <div className={`
                      ${meta?.truncate ? 'truncate' : ''}
                      leading-tight
                    `}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}
        
        {virtualScrolling.enabled && virtualScrolling.paddingBottom > 0 && (
          <tr>
            <td 
              colSpan={visibleColumnCount}
              style={{ height: virtualScrolling.paddingBottom }}
            />
          </tr>
        )}
      </tbody>
    );
  };

  // 滚动指示器
  const renderScrollIndicator = () => {
    if (!mergedConfig.showScrollIndicator || !scrollState.canScrollRight) {
      return null;
    }

    return (
      <div className="absolute top-0 right-0 bottom-0 w-8 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-l from-base-100 to-transparent" />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <svg 
            className="w-4 h-4 text-base-content/40 animate-pulse" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    );
  };

  if (loadingComponent && rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        {loadingComponent}
      </div>
    );
  }

  return (
    <div className="mobile-table-container relative">
      {/* 表格容器 */}
      <div
        ref={containerRef}
        className={`
          overflow-auto virtual-scroll-container
          ${mergedTheme.borderRadius}
          ${mergedTheme.shadow}
          border border-opacity-10
          gpu-accelerated
          ${device.isMobile ? 'touch-pan-x' : ''}
        `}
        style={{
          maxWidth: mergedConfig.maxTableWidth,
          minWidth: mergedConfig.minTableWidth,
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
        role="table"
        aria-label={mergedAccessibility.tableDescription || '数据表格'}
        tabIndex={mergedAccessibility.enableKeyboardNavigation ? 0 : undefined}
      >
        <table
          ref={tableRef}
          className={`
            w-full table-fixed
            ${mergedTheme.zebra ? 'table-zebra' : ''}
          `}
          style={{ 
            width: totalWidth > containerWidth ? totalWidth : '100%',
            minWidth: mergedConfig.minTableWidth
          }}
        >
          {renderHeader()}
          {renderBody()}
        </table>

        {/* 滚动指示器 */}
        {renderScrollIndicator()}
      </div>

      {/* 移动端提示信息 */}
      {device.isMobile && (
        <div className="mt-3 text-center">
          <div className="text-xs text-base-content/50">
            {hiddenColumns.length > 0 && (
              <span>已隐藏 {hiddenColumns.length} 列以适应屏幕 • </span>
            )}
            左右滑动查看更多信息
            {enableTouchGestures && ' • 长按多选'}
          </div>
        </div>
      )}

      {/* 性能指示器 */}
      {process.env.NODE_ENV === 'development' && virtualScrolling.enabled && (
        <div className="mt-2 text-xs text-base-content/30 font-mono">
          虚拟滚动已启用 • 
          显示 {virtualScrolling.visibleItems.length} / {rows.length} 行 • 
          性能优化中
        </div>
      )}
    </div>
  );
};

export default MobileTableView;