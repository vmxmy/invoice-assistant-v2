import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder?: string;
  fallback?: string;
  threshold?: number;
  rootMargin?: string;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder,
  fallback = '/images/placeholder.png',
  threshold = 0.1,
  rootMargin = '50px',
  blurDataURL,
  onLoad,
  onError,
  className = '',
  alt = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || blurDataURL || fallback);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // 创建Intersection Observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    
    const handleLoad = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
      setHasError(false);
      onLoad?.();
    };

    const handleError = () => {
      setCurrentSrc(fallback);
      setHasError(true);
      onError?.();
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, fallback, onLoad, onError]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`
          w-full h-full object-cover transition-all duration-300
          ${!isLoaded && !hasError ? 'blur-sm scale-105' : 'blur-0 scale-100'}
          ${hasError ? 'opacity-70' : 'opacity-100'}
        `}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        {...props}
      />
      
      {/* 加载指示器 */}
      {!isLoaded && !hasError && isInView && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-base-200 bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="loading loading-spinner loading-sm text-primary"></div>
        </motion.div>
      )}
      
      {/* 错误状态 */}
      {hasError && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center bg-base-200 bg-opacity-80 text-base-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <svg
            className="w-8 h-8 mb-2 text-base-content opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs text-center opacity-70">图片加载失败</span>
        </motion.div>
      )}
    </div>
  );
};

export default LazyImage;