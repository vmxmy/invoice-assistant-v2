import React from 'react';
import { useNumberAnimation, useCurrencyAnimation, usePercentageAnimation } from '../../hooks/useNumberAnimation';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
  enableAnimation?: boolean;
  formatNumber?: (num: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  duration = 1200,
  enableAnimation = true,
  formatNumber
}) => {
  const { formattedNumber, isAnimating } = useNumberAnimation(value, {
    duration,
    enableAnimation,
    formatNumber
  });

  return (
    <span 
      className={`
        ${className} 
        ${isAnimating ? 'transition-opacity duration-100' : ''}
      `.trim()}
    >
      {formattedNumber}
    </span>
  );
};

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  duration?: number;
  enableAnimation?: boolean;
}

export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({
  value,
  className = '',
  duration = 1200,
  enableAnimation = true
}) => {
  const { formattedNumber, isAnimating } = useCurrencyAnimation(value, {
    duration,
    enableAnimation
  });

  return (
    <span 
      className={`
        ${className} 
        ${isAnimating ? 'transition-opacity duration-100' : ''}
      `.trim()}
    >
      {formattedNumber}
    </span>
  );
};

interface AnimatedPercentageProps {
  value: number;
  className?: string;
  duration?: number;
  enableAnimation?: boolean;
  prefix?: string;
}

export const AnimatedPercentage: React.FC<AnimatedPercentageProps> = ({
  value,
  className = '',
  duration = 1200,
  enableAnimation = true,
  prefix = ''
}) => {
  const { displayNumber, isAnimating } = usePercentageAnimation(value, {
    duration,
    enableAnimation
  });

  const formatWithPrefix = (num: number) => {
    const sign = num > 0 ? '+' : '';
    return `${prefix}${sign}${num}%`;
  };

  return (
    <span 
      className={`
        ${className} 
        ${isAnimating ? 'transition-opacity duration-100' : ''}
      `.trim()}
    >
      {formatWithPrefix(displayNumber)}
    </span>
  );
};

// Count-up animation for integer values (like invoice count)
interface AnimatedCountProps {
  value: number;
  className?: string;
  duration?: number;
  enableAnimation?: boolean;
}

export const AnimatedCount: React.FC<AnimatedCountProps> = ({
  value,
  className = '',
  duration = 1000,
  enableAnimation = true
}) => {
  const { displayNumber, isAnimating } = useNumberAnimation(value, {
    duration,
    enableAnimation,
    formatNumber: (num) => Math.round(num).toString()
  });

  return (
    <span 
      className={`
        ${className} 
        ${isAnimating ? 'transition-opacity duration-100' : ''}
      `.trim()}
    >
      {displayNumber}
    </span>
  );
};