import React, { useMemo, Children } from 'react';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';
import { ErrorBoundary } from '../../common/ErrorBoundary';

interface MobileIndicatorGridProps {
  children: React.ReactNode;
  className?: string;
  enableScroll?: boolean;
}

/**
 * 优化后的移动端指标网格组件
 * 使用React.memo和useMemo优化性能
 */
const MobileIndicatorGridComponent: React.FC<MobileIndicatorGridProps> = ({
  children,
  className = '',
  enableScroll = true
}) => {
  const device = useDeviceDetection();
  const childrenArray = Children.toArray(children);
  const childCount = childrenArray.length;

  // 使用useMemo缓存网格类计算
  const gridClass = useMemo(() => {
    switch (childCount) {
      case 1:
        return 'grid grid-cols-1 max-w-md mx-auto';
      case 2:
        return 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4';
      case 3:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4';
      case 4:
        return 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4';
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4';
    }
  }, [childCount]);

  // 移动端横向滚动布局
  if (device.isMobile && enableScroll) {
    return (
      <div className={className}>
        {/* 横向滚动容器 */}
        <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
            {childrenArray.map((child, index) => (
              <div key={index} className="flex-shrink-0 w-[280px] first:ml-0 last:mr-4">
                {child}
              </div>
            ))}
          </div>
        </div>
        
        {/* 滚动指示器 - 增加无障碍支持 */}
        {childCount > 1 && (
          <div 
            className="flex justify-center gap-1 mt-2"
            role="group"
            aria-label="滚动指示器"
          >
            {childrenArray.map((_, index) => (
              <div
                key={index}
                className="w-1.5 h-1.5 rounded-full bg-base-300"
                role="presentation"
                aria-label={`第 ${index + 1} 个指标卡，共 ${childCount} 个`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 响应式网格布局
  return (
    <div className={`${gridClass} ${className}`}>
      {children}
    </div>
  );
};

// 使用React.memo优化性能
export const MobileIndicatorGridV2 = React.memo(MobileIndicatorGridComponent, (prevProps, nextProps) => {
  // 只有当children真正改变时才重新渲染
  const prevChildrenArray = Children.toArray(prevProps.children);
  const nextChildrenArray = Children.toArray(nextProps.children);
  
  return (
    prevChildrenArray.length === nextChildrenArray.length &&
    prevProps.enableScroll === nextProps.enableScroll &&
    prevProps.className === nextProps.className
  );
});

/**
 * 响应式指标容器 - 优化版本
 */
const ResponsiveIndicatorGridComponent: React.FC<MobileIndicatorGridProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`
      grid gap-3 sm:gap-4
      grid-cols-1
      xs:grid-cols-2
      md:grid-cols-2
      lg:grid-cols-3
      xl:grid-cols-4
      2xl:grid-cols-4
      ${className}
    `}>
      {children}
    </div>
  );
};

export const ResponsiveIndicatorGrid = React.memo(ResponsiveIndicatorGridComponent);

// 导出带错误边界的版本
export const MobileIndicatorGrid = (props: MobileIndicatorGridProps) => (
  <ErrorBoundary 
    componentName="MobileIndicatorGrid"
    fallback={
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 border border-dashed border-base-300 rounded">
          <p className="text-sm text-base-content/60">网格加载失败</p>
        </div>
      </div>
    }
  >
    <MobileIndicatorGridV2 {...props} />
  </ErrorBoundary>
);

export default MobileIndicatorGrid;