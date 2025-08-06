import { useState, useEffect, useRef } from 'react';

interface UseNumberAnimationOptions {
  duration?: number; // Animation duration in milliseconds
  easing?: (t: number) => number; // Easing function
  formatNumber?: (num: number) => string; // Number formatting function
  enableAnimation?: boolean; // Toggle animation
}

const defaultEasing = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease-in-out

export function useNumberAnimation(
  targetNumber: number,
  options: UseNumberAnimationOptions = {}
) {
  const {
    duration = 1200,
    easing = defaultEasing,
    formatNumber = (num) => num.toString(),
    enableAnimation = true
  } = options;

  const [displayNumber, setDisplayNumber] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef<number>(0);

  useEffect(() => {
    if (!enableAnimation) {
      setDisplayNumber(targetNumber);
      return;
    }

    // Don't animate if the target hasn't changed or is the same as current
    if (targetNumber === displayNumber) {
      return;
    }

    setIsAnimating(true);
    startValueRef.current = displayNumber;
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      
      const currentValue = startValueRef.current + 
        (targetNumber - startValueRef.current) * easedProgress;
      
      setDisplayNumber(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayNumber(targetNumber);
        setIsAnimating(false);
      }
    };

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetNumber, duration, easing, enableAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    displayNumber: Math.round(displayNumber),
    formattedNumber: formatNumber(displayNumber),
    isAnimating
  };
}

// Specialized hook for currency animation
export function useCurrencyAnimation(
  targetAmount: number,
  options: Omit<UseNumberAnimationOptions, 'formatNumber'> = {}
) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  };

  return useNumberAnimation(targetAmount, {
    ...options,
    formatNumber: formatCurrency
  });
}

// Specialized hook for percentage animation
export function usePercentageAnimation(
  targetPercentage: number,
  options: Omit<UseNumberAnimationOptions, 'formatNumber'> = {}
) {
  const formatPercentage = (percentage: number) => {
    return `${Math.round(percentage)}%`;
  };

  return useNumberAnimation(targetPercentage, {
    ...options,
    formatNumber: formatPercentage
  });
}