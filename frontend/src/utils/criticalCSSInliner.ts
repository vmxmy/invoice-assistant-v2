/**
 * 关键 CSS 内联工具
 * 提取和内联关键渲染路径的 CSS，提高 FCP
 */

interface CriticalCSSConfig {
  above_fold_selectors: string[];
  mobile_critical_selectors: string[];
  exclude_selectors: string[];
}

const CRITICAL_CSS_CONFIG: CriticalCSSConfig = {
  // 首屏关键选择器
  above_fold_selectors: [
    // 布局和导航
    '.navbar', '.drawer', '.hero',
    // 核心UI组件
    '.btn', '.card', '.badge', '.loading',
    // 网格和布局
    '.grid', '.flex', '.container',
    // 移动端关键组件
    '.mobile-container', '.fab', '.bottom-nav'
  ],
  
  // 移动端特有关键选择器
  mobile_critical_selectors: [
    '.touch-target',
    '.mobile-optimized',
    '.safe-area',
    '.gesture-feedback',
    '.mobile-modal',
    '.pull-to-refresh'
  ],
  
  // 排除的选择器（非关键）
  exclude_selectors: [
    '.animation-',
    '.transition-',
    '.hover:',
    '.focus:',
    '.dark:'
  ]
};

/**
 * 提取关键 CSS
 */
export function extractCriticalCSS(): Promise<string> {
  return new Promise((resolve) => {
    // 在实际实现中，这里会分析DOM并提取关键CSS
    // 这里提供一个简化的关键CSS集合
    const criticalCSS = `
      /* Critical CSS for mobile performance */
      
      /* Base layout */
      body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
      .min-h-screen { min-height: 100vh; min-height: 100dvh; }
      .flex { display: flex; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      
      /* Loading states */
      .loading { display: inline-block; width: 1.25rem; height: 1.25rem; }
      .loading.loading-spinner { 
        border: 2px solid transparent; 
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      
      /* Critical mobile components */
      .mobile-container { 
        width: 100%; 
        max-width: 100vw; 
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
      }
      
      .safe-area {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
      
      /* Touch optimization */
      .touch-target {
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
      
      /* Gesture feedback */
      .gesture-feedback {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      
      /* Performance optimizations */
      .hardware-accelerated {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
      }
    `;
    
    resolve(criticalCSS.trim());
  });
}

/**
 * 内联关键 CSS 到 HTML
 */
export function inlineCriticalCSS(): void {
  if (typeof document === 'undefined') return;
  
  extractCriticalCSS().then((criticalCSS) => {
    const styleElement = document.createElement('style');
    styleElement.textContent = criticalCSS;
    styleElement.setAttribute('data-critical', 'true');
    
    // 插入到 head 的最前面，确保优先级
    const firstLink = document.head.querySelector('link[rel="stylesheet"]');
    if (firstLink) {
      document.head.insertBefore(styleElement, firstLink);
    } else {
      document.head.appendChild(styleElement);
    }
  });
}

/**
 * 预加载关键资源
 */
export function preloadCriticalResources(): void {
  if (typeof document === 'undefined') return;
  
  const criticalResources = [
    // 注释掉可能未立即使用的资源预加载，避免控制台警告
    // 这些资源会在实际需要时才由浏览器或Vite自动加载
    // { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2' },
    // { href: '/icons/icon-192x192.png', as: 'image' },
    // { href: '/js/react-core.js', as: 'script' },
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as;
    if (resource.type) {
      link.type = resource.type;
    }
    if (resource.as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
}

/**
 * 设备特定的资源预加载
 */
export function preloadDeviceSpecificResources(): void {
  if (typeof window === 'undefined') return;
  
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const connection = (navigator as any).connection;
  
  // 根据网络条件调整预加载策略
  const effectiveType = connection?.effectiveType || '4g';
  const slowConnection = ['slow-2g', '2g', '3g'].includes(effectiveType);
  
  if (isMobile && !slowConnection) {
    // 移动端快速网络：预加载移动端专用资源
    const mobileResources = [
      '/js/mobile-components.js',
      '/css/mobile-optimizations.css',
    ];
    
    mobileResources.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = href;
      document.head.appendChild(link);
    });
  }
  
  // 慢速网络：仅预加载关键资源
  if (slowConnection) {
    const criticalOnly = [
      '/js/react-core.js',
      '/css/critical.css',
    ];
    
    criticalOnly.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = href.endsWith('.css') ? 'style' : 'script';
      document.head.appendChild(link);
    });
  }
}

/**
 * 初始化关键资源优化
 */
export function initializeCriticalOptimization(): void {
  // DOM 内容加载完成后立即执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      inlineCriticalCSS();
      preloadCriticalResources();
      preloadDeviceSpecificResources();
    });
  } else {
    inlineCriticalCSS();
    preloadCriticalResources();
    preloadDeviceSpecificResources();
  }
}