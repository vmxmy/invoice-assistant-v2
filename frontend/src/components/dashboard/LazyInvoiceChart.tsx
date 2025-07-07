// 懒加载的图表组件 - 减少初始bundle大小
import React, { lazy, Suspense } from 'react';
import type { InvoiceChartProps } from './InvoiceChart';

// 懒加载图表组件
const InvoiceChart = lazy(() => import('./InvoiceChart'));

// 图表加载骨架屏
const ChartSkeleton: React.FC<{ height?: number; title?: string }> = ({ 
  height = 300, 
  title 
}) => (
  <div className="card bg-base-100 shadow-lg border border-base-300">
    <div className="card-body">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton h-6 w-32"></div>
          <div className="skeleton h-4 w-20"></div>
        </div>
      )}
      <div className="skeleton w-full" style={{ height }}></div>
    </div>
  </div>
);

// 包装的懒加载图表组件
export const LazyInvoiceChart: React.FC<InvoiceChartProps> = (props) => {
  return (
    <Suspense 
      fallback={
        <ChartSkeleton 
          height={props.height} 
          title={props.title} 
        />
      }
    >
      <InvoiceChart {...props} />
    </Suspense>
  );
};

LazyInvoiceChart.displayName = 'LazyInvoiceChart';

export default LazyInvoiceChart;
export type { InvoiceChartProps };