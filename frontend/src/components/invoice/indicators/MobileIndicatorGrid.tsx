import React from 'react';
import { useDeviceDetection } from '../../../hooks/useMediaQuery';

interface MobileIndicatorGridProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileIndicatorGrid: React.FC<MobileIndicatorGridProps> = ({
  children,
  className = ''
}) => {
  const device = useDeviceDetection();

  if (device.isMobile) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
          {React.Children.map(children, (child, index) => (
            <div key={index} className="flex-shrink-0 w-72">
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  );
};

export default MobileIndicatorGrid;