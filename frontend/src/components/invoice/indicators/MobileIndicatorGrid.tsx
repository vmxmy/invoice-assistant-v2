import React, { Children } from 'react';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

interface MobileIndicatorGridProps {
  children: React.ReactNode;
  className?: string;
  enableScroll?: boolean; // 是否启用移动端横向滚动
}

export const MobileIndicatorGrid: React.FC<MobileIndicatorGridProps> = ({
  children,
  className = '',
  enableScroll = true
}) => {
  const device = useDeviceDetection();
  const childrenArray = Children.toArray(children);
  const childCount = childrenArray.length;

  // 移动端布局 - 小屏幕
  if (device.isMobile && enableScroll) {
    return (
      <div className={`${className}`}>
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
        {/* 滚动指示器 */}
        {childCount > 1 && (
          <div className="flex justify-center gap-1 mt-2">
            {childrenArray.map((_, index) => (
              <div
                key={index}
                className="w-1.5 h-1.5 rounded-full bg-base-300"
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 响应式网格布局
  // 根据子元素数量智能调整布局
  const getGridClass = () => {
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
        // 5个或更多元素
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4';
    }
  };

  return (
    <div className={`${getGridClass()} ${className}`}>
      {children}
    </div>
  );
};

// 响应式指标容器 - 自适应布局
export const ResponsiveIndicatorGrid: React.FC<MobileIndicatorGridProps> = ({
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

export default MobileIndicatorGrid;