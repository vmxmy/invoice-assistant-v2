import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-base-300 rounded';
  
  const variantClasses = {
    text: 'h-4',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  };

  const skeletonStyle = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? '3rem' : '3rem')
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]} ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
            style={{
              height: skeletonStyle.height,
              width: index === lines - 1 ? '75%' : skeletonStyle.width
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={skeletonStyle}
    />
  );
};

// 预定义的骨架屏组件
export const InvoiceListSkeleton: React.FC = () => {
  return (
    <div className="divide-y divide-base-300">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton variant="rectangular" width="16px" height="16px" />
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
              {/* 发票信息 */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton variant="rectangular" width="16px" height="16px" />
                  <Skeleton variant="text" width="120px" />
                </div>
                <Skeleton variant="text" width="80px" />
              </div>

              {/* 日期 */}
              <div className="flex items-center gap-2">
                <Skeleton variant="rectangular" width="16px" height="16px" />
                <Skeleton variant="text" width="80px" />
              </div>

              {/* 金额 */}
              <div className="flex items-center gap-2">
                <Skeleton variant="rectangular" width="16px" height="16px" />
                <Skeleton variant="text" width="60px" />
              </div>

              {/* 状态 */}
              <div>
                <Skeleton variant="rectangular" width="60px" height="20px" className="rounded-full" />
              </div>

              {/* 操作 */}
              <div className="flex gap-1">
                <Skeleton variant="rectangular" width="28px" height="28px" />
                <Skeleton variant="rectangular" width="28px" height="28px" />
                <Skeleton variant="rectangular" width="28px" height="28px" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const InvoiceDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Skeleton variant="rectangular" width="20px" height="20px" />
        <Skeleton variant="text" width="120px" />
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton variant="text" width="80px" />
            <Skeleton variant="text" width="150px" />
          </div>
        ))}
      </div>

      {/* 金额信息 */}
      <div className="bg-base-200 rounded-lg p-4 space-y-3">
        <Skeleton variant="text" width="80px" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="text-center space-y-2">
              <Skeleton variant="text" width="60px" />
              <Skeleton variant="text" width="80px" />
            </div>
          ))}
        </div>
      </div>

      {/* 类型特定信息 */}
      <div className="space-y-4">
        <Skeleton variant="text" width="100px" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton variant="text" width="70px" />
              <Skeleton variant="text" width="120px" />
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width="80px" height="40px" />
        <Skeleton variant="rectangular" width="80px" height="40px" />
        <Skeleton variant="rectangular" width="80px" height="40px" />
      </div>
    </div>
  );
};

export const StatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="stat bg-base-200 rounded-lg p-4 space-y-2">
          <Skeleton variant="text" width="60px" />
          <Skeleton variant="text" width="80px" />
          <Skeleton variant="text" width="40px" />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;