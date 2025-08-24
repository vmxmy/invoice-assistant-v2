/**
 * 移动端表格列管理 Hook
 * 智能列宽分配和优先级管理系统
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useDeviceDetection } from './useMediaQuery';
import type { ColumnDef } from '@tanstack/react-table';
import type { 
  MobileColumnMeta, 
  ExtendedColumnMeta, 
  COLUMN_PRIORITIES, 
  MobileTableConfig, 
  DEFAULT_MOBILE_TABLE_CONFIG 
} from '../types/table';

interface UseMobileTableColumnsOptions<T> {
  /** 原始列定义 */
  columns: ColumnDef<T>[];
  /** 容器宽度 */
  containerWidth: number;
  /** 移动端配置 */
  config?: Partial<MobileTableConfig>;
  /** 是否启用智能优化 */
  enableSmartOptimization?: boolean;
}

interface ColumnWidthResult {
  /** 优化后的列定义 */
  optimizedColumns: ColumnDef<any>[];
  /** 总宽度 */
  totalWidth: number;
  /** 可见列数 */
  visibleColumnCount: number;
  /** 隐藏的列 */
  hiddenColumns: string[];
  /** 列宽分配详情 */
  widthAllocation: Record<string, number>;
}

export const useMobileTableColumns = <T>({
  columns,
  containerWidth,
  config = {},
  enableSmartOptimization = true
}: UseMobileTableColumnsOptions<T>): ColumnWidthResult => {
  const device = useDeviceDetection();
  const mergedConfig = useMemo(() => ({
    ...DEFAULT_MOBILE_TABLE_CONFIG,
    ...config
  }), [config]);

  // 分析列优先级和权重
  const columnAnalysis = useMemo(() => {
    const essentialColumns: ColumnDef<T>[] = [];
    const importantColumns: ColumnDef<T>[] = [];
    const optionalColumns: ColumnDef<T>[] = [];
    const fixedColumns: ColumnDef<T>[] = [];
    
    let totalWeight = 0;
    const columnWeights: Record<string, number> = {};
    
    columns.forEach((column) => {
      const meta = column.meta as ExtendedColumnMeta;
      const columnId = typeof column.id === 'string' ? column.id : String(column.accessorKey);
      
      if (meta) {
        const priority = meta.priority || 'optional';
        const weight = meta.weight || COLUMN_PRIORITIES[priority].defaultWeight;
        
        columnWeights[columnId] = weight;
        totalWeight += weight;
        
        // 按优先级分类
        switch (priority) {
          case 'essential':
            essentialColumns.push(column);
            break;
          case 'important':
            importantColumns.push(column);
            break;
          case 'optional':
            optionalColumns.push(column);
            break;
        }
        
        // 固定列单独处理
        if (meta.sticky) {
          fixedColumns.push(column);
        }
      } else {
        // 没有 meta 的列默认为可选
        optionalColumns.push(column);
        columnWeights[columnId] = 1;
        totalWeight += 1;
      }
    });
    
    return {
      essentialColumns,
      importantColumns,
      optionalColumns,
      fixedColumns,
      totalWeight,
      columnWeights
    };
  }, [columns]);

  // 智能列宽分配算法
  const calculateOptimalWidths = useCallback((
    visibleColumns: ColumnDef<T>[],
    availableWidth: number
  ): Record<string, number> => {
    const widthAllocation: Record<string, number> = {};
    let remainingWidth = availableWidth;
    
    // 1. 首先分配固定列和最小宽度
    const flexibleColumns: { column: ColumnDef<T>; meta: ExtendedColumnMeta }[] = [];
    
    visibleColumns.forEach((column) => {
      const meta = column.meta as ExtendedColumnMeta;
      const columnId = typeof column.id === 'string' ? column.id : String(column.accessorKey);
      
      if (meta) {
        if (meta.width) {
          // 固定宽度列
          widthAllocation[columnId] = meta.width;
          remainingWidth -= meta.width;
        } else {
          // 最小宽度保证
          const minWidth = meta.minWidth || 40;
          widthAllocation[columnId] = minWidth;
          remainingWidth -= minWidth;
          flexibleColumns.push({ column, meta });
        }
      } else {
        // 默认最小宽度
        const defaultMinWidth = 60;
        widthAllocation[columnId] = defaultMinWidth;
        remainingWidth -= defaultMinWidth;
      }
    });
    
    // 2. 按权重分配剩余宽度
    if (remainingWidth > 0 && flexibleColumns.length > 0) {
      const totalWeight = flexibleColumns.reduce((sum, { meta }) => 
        sum + (meta.weight || 1), 0
      );
      
      flexibleColumns.forEach(({ column, meta }) => {
        const columnId = typeof column.id === 'string' ? column.id : String(column.accessorKey);
        const weight = meta.weight || 1;
        const additionalWidth = (remainingWidth * weight) / totalWeight;
        const maxWidth = meta.maxWidth || 200;
        
        widthAllocation[columnId] = Math.min(
          widthAllocation[columnId] + additionalWidth,
          maxWidth
        );
      });
    }
    
    return widthAllocation;
  }, []);

  // 根据设备类型选择可见列
  const getVisibleColumns = useCallback((analysis: typeof columnAnalysis): ColumnDef<T>[] => {
    const { essentialColumns, importantColumns, optionalColumns } = analysis;
    
    if (device.isMobile) {
      // 移动端：仅显示核心列
      return essentialColumns;
    } else if (device.isTablet) {
      // 平板端：显示核心列 + 重要列
      return [...essentialColumns, ...importantColumns];
    } else {
      // 桌面端：显示所有列
      return [...essentialColumns, ...importantColumns, ...optionalColumns];
    }
  }, [device.isMobile, device.isTablet]);

  // 主要计算逻辑
  const result = useMemo((): ColumnWidthResult => {
    if (!enableSmartOptimization) {
      return {
        optimizedColumns: columns,
        totalWidth: containerWidth,
        visibleColumnCount: columns.length,
        hiddenColumns: [],
        widthAllocation: {}
      };
    }

    const visibleColumns = getVisibleColumns(columnAnalysis);
    const hiddenColumnIds = columns
      .filter(col => !visibleColumns.includes(col))
      .map(col => typeof col.id === 'string' ? col.id : String(col.accessorKey));

    // 计算可用宽度（扣除边距和滚动条）
    const availableWidth = Math.max(
      containerWidth - 32, // 边距
      mergedConfig.minTableWidth
    );

    const widthAllocation = calculateOptimalWidths(visibleColumns, availableWidth);
    const totalWidth = Object.values(widthAllocation).reduce((sum, width) => sum + width, 0);

    // 应用宽度到列定义
    const optimizedColumns = visibleColumns.map((column) => {
      const columnId = typeof column.id === 'string' ? column.id : String(column.accessorKey);
      const width = widthAllocation[columnId];
      const meta = column.meta as ExtendedColumnMeta;

      return {
        ...column,
        size: width,
        minSize: meta?.minWidth || 40,
        maxSize: meta?.maxWidth || 200,
        meta: {
          ...meta,
          computedWidth: width,
          mobileWidth: `${width}px`
        }
      };
    });

    return {
      optimizedColumns,
      totalWidth,
      visibleColumnCount: visibleColumns.length,
      hiddenColumns: hiddenColumnIds,
      widthAllocation
    };
  }, [
    columns,
    columnAnalysis,
    containerWidth,
    mergedConfig,
    enableSmartOptimization,
    getVisibleColumns,
    calculateOptimalWidths
  ]);

  return result;
};

/**
 * 列优先级管理 Hook
 */
export const useColumnPriorityManager = <T>(columns: ColumnDef<T>[]) => {
  const device = useDeviceDetection();
  
  // 获取列优先级配置
  const getColumnPriority = useCallback((columnId: string): 'essential' | 'important' | 'optional' => {
    const column = columns.find(col => 
      (typeof col.id === 'string' ? col.id : String(col.accessorKey)) === columnId
    );
    
    const meta = column?.meta as ExtendedColumnMeta;
    return meta?.priority || 'optional';
  }, [columns]);

  // 设置列优先级
  const setColumnPriority = useCallback((
    columnId: string, 
    priority: 'essential' | 'important' | 'optional'
  ) => {
    // 这里可以实现持久化逻辑，比如保存到 localStorage
    console.log(`设置列 ${columnId} 优先级为 ${priority}`);
  }, []);

  // 获取推荐的列配置
  const getRecommendedColumns = useCallback(() => {
    const recommendations: Record<string, 'essential' | 'important' | 'optional'> = {};
    
    columns.forEach((column) => {
      const columnId = typeof column.id === 'string' ? column.id : String(column.accessorKey);
      const accessorKey = String(column.accessorKey);
      
      // 基于列名的智能推荐
      if (['id', 'select', 'actions'].includes(columnId)) {
        recommendations[columnId] = 'essential';
      } else if ([
        'invoice_number', 'consumption_date', 'seller_name', 
        'total_amount', 'status'
      ].includes(accessorKey)) {
        recommendations[columnId] = 'essential';
      } else if ([
        'buyer_name', 'invoice_type', 'processing_status', 
        'expense_category'
      ].includes(accessorKey)) {
        recommendations[columnId] = 'important';
      } else {
        recommendations[columnId] = 'optional';
      }
    });
    
    return recommendations;
  }, [columns]);

  // 应用推荐配置
  const applyRecommendedColumns = useCallback(() => {
    const recommendations = getRecommendedColumns();
    Object.entries(recommendations).forEach(([columnId, priority]) => {
      setColumnPriority(columnId, priority);
    });
  }, [getRecommendedColumns, setColumnPriority]);

  return {
    getColumnPriority,
    setColumnPriority,
    getRecommendedColumns,
    applyRecommendedColumns,
    deviceType: device.deviceType
  };
};

/**
 * 列宽自适应 Hook
 */
export const useAdaptiveColumnWidths = <T>(
  columns: ColumnDef<T>[],
  containerWidth: number,
  enableOptimization = true
) => {
  const [computedWidths, setComputedWidths] = useState<Record<string, number>>({});
  const device = useDeviceDetection();

  const updateWidths = useCallback(() => {
    if (!enableOptimization) return;

    const newWidths: Record<string, number> = {};
    const availableWidth = containerWidth - 32; // 减去边距
    const columnCount = columns.length;
    const baseWidth = availableWidth / columnCount;

    columns.forEach((column) => {
      const columnId = typeof column.id === 'string' ? column.id : String(column.accessorKey);
      const meta = column.meta as ExtendedColumnMeta;
      
      if (meta) {
        // 根据权重调整宽度
        const weight = meta.weight || 1;
        const adjustedWidth = baseWidth * weight;
        
        newWidths[columnId] = Math.max(
          Math.min(adjustedWidth, meta.maxWidth || 200),
          meta.minWidth || 40
        );
      } else {
        newWidths[columnId] = Math.max(baseWidth, 60);
      }
    });

    setComputedWidths(newWidths);
  }, [columns, containerWidth, enableOptimization]);

  useEffect(() => {
    updateWidths();
  }, [updateWidths]);

  return {
    computedWidths,
    updateWidths,
    totalComputedWidth: Object.values(computedWidths).reduce((sum, width) => sum + width, 0)
  };
};