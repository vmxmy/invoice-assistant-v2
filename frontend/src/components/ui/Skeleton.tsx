import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'rectangular',
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-base-300';
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse', // DaisyUI doesn't have wave, use pulse
    none: ''
  };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded'
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  return (
    <div
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${animationClasses[animation]} 
        ${className}
      `.trim()}
      style={style}
    />
  );
};

// Specialized skeleton components for indicator cards
export const NumberSkeleton: React.FC<{ 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-16',
    md: 'h-6 w-20',
    lg: 'h-8 w-24',
    xl: 'h-10 w-32'
  };

  return <Skeleton className={`${sizeClasses[size]} ${className}`} />;
};

export const TextSkeleton: React.FC<{ 
  lines?: number;
  className?: string;
  width?: string;
}> = ({ lines = 1, className = '', width = '100%' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton 
          key={i} 
          className="h-3" 
          width={i === lines - 1 ? '80%' : width}
        />
      ))}
    </div>
  );
};

export const IconSkeleton: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <Skeleton 
      variant="circular" 
      className={`${sizeClasses[size]} ${className}`} 
    />
  );
};

export const ProgressBarSkeleton: React.FC<{ 
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
};