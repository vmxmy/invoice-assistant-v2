/**
 * 增强版懒加载图片组件
 * 支持 WebP 格式、响应式图片、渐进式加载和性能优化
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ResponsiveImageSource {
  srcset: string;
  media?: string;
  type?: string;
  sizes?: string;
}

interface EnhancedLazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  webpSrc?: string;
  sources?: ResponsiveImageSource[];
  placeholder?: string;
  fallback?: string;
  threshold?: number;
  rootMargin?: string;
  blurDataURL?: string;
  progressive?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  enableWebP?: boolean;
  lazy?: boolean;
}

// WebP 支持检测
const supportsWebP = (() => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
})();

// 图片格式优化工具
class ImageOptimizer {
  static getOptimizedSrc(src: string, webpSrc?: string, enableWebP = true): string {
    if (enableWebP && supportsWebP && webpSrc) {
      return webpSrc;
    }
    return src;
  }

  static generateResponsiveSources(src: string, sizes: number[]): ResponsiveImageSource[] {
    return sizes.map((size, index) => ({
      srcset: `${src}?w=${size}&q=80 ${size}w`,
      media: index === 0 ? undefined : `(max-width: ${size}px)`,
      type: 'image/jpeg'
    }));
  }

  static generateWebPSources(webpSrc: string, sizes: number[]): ResponsiveImageSource[] {
    return sizes.map((size, index) => ({
      srcset: `${webpSrc}?w=${size}&q=85 ${size}w`,
      media: index === 0 ? undefined : `(max-width: ${size}px)`,
      type: 'image/webp'
    }));
  }
}

// 渐进式加载状态
type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

const EnhancedLazyImage: React.FC<EnhancedLazyImageProps> = ({
  src,
  webpSrc,
  sources = [],
  placeholder,
  fallback = '/images/placeholder.png',
  threshold = 0.1,
  rootMargin = '50px',
  blurDataURL,
  progressive = true,
  quality = 80,
  onLoad,
  onError,
  enableWebP = true,
  lazy = true,
  className = '',
  alt = '',
  ...props
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [isInView, setIsInView] = useState(!lazy);
  const [currentSrc, setCurrentSrc] = useState(
    placeholder || blurDataURL || fallback
  );
  const [progressiveLoaded, setProgressiveLoaded] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const progressiveRef = useRef<HTMLImageElement | null>(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (progressiveRef.current) {
      progressiveRef.current.onload = null;
      progressiveRef.current.onerror = null;
      progressiveRef.current = null;
    }
  }, []);

  // Intersection Observer 设置
  useEffect(() => {
    if (!lazy) return;

    const img = imgRef.current;
    if (!img) return;

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

    return cleanup;
  }, [threshold, rootMargin, lazy, cleanup]);

  // 渐进式加载逻辑
  const loadProgressiveImage = useCallback((imageSrc: string, isLowQuality = false) => {
    if (progressiveRef.current) {
      progressiveRef.current.onload = null;
      progressiveRef.current.onerror = null;
    }

    const img = new Image();
    progressiveRef.current = img;

    const handleLoad = () => {
      setCurrentSrc(imageSrc);
      
      if (isLowQuality) {
        setProgressiveLoaded(true);
        // 加载高质量版本
        const highQualitySrc = ImageOptimizer.getOptimizedSrc(src, webpSrc, enableWebP);
        setTimeout(() => loadProgressiveImage(highQualitySrc, false), 50);
      } else {
        setLoadingState('loaded');
        setProgressiveLoaded(false);
        onLoad?.();
      }
    };

    const handleError = (error: Event) => {
      setLoadingState('error');
      setCurrentSrc(fallback);
      const errorObj = new Error(`Failed to load image: ${imageSrc}`);
      onError?.(errorObj);
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = imageSrc;
  }, [src, webpSrc, enableWebP, fallback, onLoad, onError]);

  // 主图片加载逻辑
  useEffect(() => {
    if (!isInView) return;

    setLoadingState('loading');

    if (progressive && blurDataURL) {
      // 先加载模糊的低质量版本
      loadProgressiveImage(blurDataURL, true);
    } else {
      // 直接加载优化后的图片
      const optimizedSrc = ImageOptimizer.getOptimizedSrc(src, webpSrc, enableWebP);
      loadProgressiveImage(optimizedSrc, false);
    }

    return () => {
      if (progressiveRef.current) {
        progressiveRef.current.onload = null;
        progressiveRef.current.onerror = null;
      }
    };
  }, [isInView, src, webpSrc, enableWebP, progressive, blurDataURL, loadProgressiveImage]);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // 生成响应式源
  const responsiveSources = useMemo(() => {
    if (sources.length > 0) return sources;

    const defaultSizes = [640, 768, 1024, 1280];
    const jpegSources = ImageOptimizer.generateResponsiveSources(src, defaultSizes);
    
    if (enableWebP && webpSrc) {
      const webpSources = ImageOptimizer.generateWebPSources(webpSrc, defaultSizes);
      return [...webpSources, ...jpegSources];
    }
    
    return jpegSources;
  }, [sources, src, webpSrc, enableWebP]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 响应式图片 */}
      {responsiveSources.length > 0 ? (
        <picture>
          {responsiveSources.map((source, index) => (
            <source
              key={index}
              srcSet={source.srcset}
              media={source.media}
              type={source.type}
              sizes={source.sizes}
            />
          ))}
          <motion.img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            className={`
              w-full h-full object-cover transition-all duration-300
              ${loadingState === 'loading' ? 'blur-sm scale-105' : 'blur-0 scale-100'}
              ${progressiveLoaded ? 'blur-sm' : 'blur-0'}
              ${loadingState === 'error' ? 'opacity-70' : 'opacity-100'}
            `}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            loading={lazy ? 'lazy' : 'eager'}
            {...props}
          />
        </picture>
      ) : (
        <motion.img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={`
            w-full h-full object-cover transition-all duration-300
            ${loadingState === 'loading' ? 'blur-sm scale-105' : 'blur-0 scale-100'}
            ${progressiveLoaded ? 'blur-sm' : 'blur-0'}
            ${loadingState === 'error' ? 'opacity-70' : 'opacity-100'}
          `}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          loading={lazy ? 'lazy' : 'eager'}
          {...props}
        />
      )}
      
      {/* 加载指示器 */}
      {loadingState === 'loading' && !progressiveLoaded && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-base-200 bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="loading loading-spinner loading-sm text-primary"></div>
        </motion.div>
      )}

      {/* 渐进式加载遮罩 */}
      {progressiveLoaded && (
        <motion.div
          className="absolute inset-0 bg-base-200/30"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
      
      {/* 错误状态 */}
      {loadingState === 'error' && (
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

      {/* WebP 支持指示器（开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-1 right-1 text-xs bg-black/50 text-white px-1 rounded">
          {supportsWebP ? 'WebP' : 'JPG'}
        </div>
      )}
    </div>
  );
};

export default EnhancedLazyImage;