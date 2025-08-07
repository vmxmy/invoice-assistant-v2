import React from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface MobileSkeletonLoaderProps {
  type?: 'card' | 'list' | 'detail' | 'stats';
  count?: number;
}

export const MobileSkeletonLoader: React.FC<MobileSkeletonLoaderProps> = ({
  type = 'card',
  count = 1,
}) => {
  // 发票卡片骨架屏
  const CardSkeleton = () => (
    <div className="card bg-base-100 shadow-sm p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <Skeleton height={20} width="60%" className="mb-2" />
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton circle height={32} width={32} />
      </div>
      <div className="space-y-2">
        <Skeleton height={14} width="80%" />
        <Skeleton height={14} width="70%" />
        <div className="flex justify-between items-center mt-3">
          <Skeleton height={24} width={80} />
          <Skeleton height={20} width={60} />
        </div>
      </div>
    </div>
  );

  // 列表项骨架屏
  const ListItemSkeleton = () => (
    <div className="flex items-center p-4 border-b border-base-200">
      <Skeleton circle height={48} width={48} className="mr-3" />
      <div className="flex-1">
        <Skeleton height={18} width="70%" className="mb-2" />
        <Skeleton height={14} width="50%" />
      </div>
      <Skeleton height={20} width={60} />
    </div>
  );

  // 详情页骨架屏
  const DetailSkeleton = () => (
    <div className="p-4">
      {/* 头部 */}
      <div className="mb-6">
        <Skeleton height={28} width="60%" className="mb-2" />
        <Skeleton height={20} width="40%" />
      </div>

      {/* 金额卡片 */}
      <div className="card bg-primary/10 p-4 mb-6">
        <Skeleton height={16} width={100} className="mb-2" />
        <Skeleton height={32} width={150} />
      </div>

      {/* 信息列表 */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton height={16} width={100} />
            <Skeleton height={16} width={120} />
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-base-100 border-t">
        <div className="flex gap-3">
          <Skeleton height={48} className="flex-1" />
          <Skeleton height={48} className="flex-1" />
        </div>
      </div>
    </div>
  );

  // 统计卡片骨架屏
  const StatsSkeleton = () => (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card bg-base-100 p-4">
          <Skeleton height={14} width="60%" className="mb-2" />
          <Skeleton height={24} width="80%" className="mb-1" />
          <Skeleton height={12} width="50%" />
        </div>
      ))}
    </div>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'list':
        return Array.from({ length: count }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ));
      case 'detail':
        return <DetailSkeleton />;
      case 'stats':
        return <StatsSkeleton />;
      case 'card':
      default:
        return Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ));
    }
  };

  return (
    <SkeletonTheme
      baseColor="var(--fallback-b2,oklch(var(--b2)))"
      highlightColor="var(--fallback-b3,oklch(var(--b3)))"
    >
      {renderSkeleton()}
    </SkeletonTheme>
  );
};

// 发票卡片骨架屏（独立组件）
export const InvoiceCardSkeleton: React.FC = () => (
  <MobileSkeletonLoader type="card" count={1} />
);

// 发票列表骨架屏（独立组件）
export const InvoiceListSkeleton: React.FC<{ count?: number }> = ({ 
  count = 5 
}) => (
  <MobileSkeletonLoader type="card" count={count} />
);

// 统计页骨架屏（独立组件）
export const StatsPageSkeleton: React.FC = () => (
  <MobileSkeletonLoader type="stats" />
);

export default MobileSkeletonLoader;