/**
 * 页面懒加载工具
 * 提供统一的路由级代码分割和预加载策略
 */

import React from 'react';

interface LazyLoadOptions {
  /**
   * 预加载延迟（毫秒）
   * 在用户可能导航到该页面时提前加载
   */
  preloadDelay?: number;
  /**
   * 是否在空闲时预加载
   */
  preloadOnIdle?: boolean;
  /**
   * 导入重试次数
   */
  retryCount?: number;
}

/**
 * 创建懒加载页面组件
 */
export function createLazyPage<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.LazyExoticComponent<T> {
  const {
    preloadDelay = 2000,
    preloadOnIdle = true,
    retryCount = 2
  } = options;

  // 带重试机制的导入函数
  const importWithRetry = async (retries = retryCount): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (retries > 0) {
        console.warn(`页面加载失败，正在重试... 剩余重试次数: ${retries}`, error);
        // 短暂延迟后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        return importWithRetry(retries - 1);
      }
      throw error;
    }
  };

  // 创建懒加载组件
  const LazyComponent = React.lazy(importWithRetry);

  // 预加载逻辑
  const preloadComponent = () => {
    try {
      importFn().catch(error => {
        console.warn('预加载页面失败:', error);
      });
    } catch (error) {
      console.warn('预加载页面失败:', error);
    }
  };

  // 在浏览器空闲时预加载
  if (preloadOnIdle && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      setTimeout(preloadComponent, preloadDelay);
    });
  } else if (preloadOnIdle) {
    // Fallback for browsers without requestIdleCallback
    setTimeout(preloadComponent, preloadDelay);
  }

  return LazyComponent;
}

/**
 * 页面预加载策略
 */
export class PagePreloader {
  private preloadedPages = new Set<string>();

  /**
   * 预加载指定页面
   */
  preload(pageName: string, importFn: () => Promise<any>): void {
    if (this.preloadedPages.has(pageName)) {
      return;
    }

    this.preloadedPages.add(pageName);
    
    // 在空闲时预加载
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFn().catch(error => {
          console.warn(`预加载页面 ${pageName} 失败:`, error);
        });
      });
    } else {
      setTimeout(() => {
        importFn().catch(error => {
          console.warn(`预加载页面 ${pageName} 失败:`, error);
        });
      }, 100);
    }
  }

  /**
   * 预加载关键路径页面
   * 在用户登录后立即开始预加载核心页面
   */
  preloadCriticalPages(): void {
    // 根据用户使用频率预加载关键页面
    this.preload('dashboard', () => import('../pages/DashboardPage'));
    this.preload('invoices', () => import('../pages/InvoiceManagePage'));
    this.preload('upload', () => import('../pages/InvoiceUploadPage'));
  }

  /**
   * 智能预加载
   * 基于用户行为预测下一个可能访问的页面
   */
  intelligentPreload(currentPath: string): void {
    const preloadMap: Record<string, string[]> = {
      '/login': ['dashboard', 'invoices'],
      '/dashboard': ['invoices', 'statistics', 'upload'],
      '/invoices': ['upload', 'statistics'],
      '/upload': ['invoices'],
      '/settings': ['dashboard']
    };

    const pagesToPreload = preloadMap[currentPath] || [];
    
    pagesToPreload.forEach(pageName => {
      switch (pageName) {
        case 'dashboard':
          this.preload(pageName, () => import('../pages/DashboardPage'));
          break;
        case 'invoices':
          this.preload(pageName, () => import('../pages/InvoiceManagePage'));
          break;
        case 'statistics':
          this.preload(pageName, () => import('../pages/StatisticsPage'));
          break;
        case 'upload':
          this.preload(pageName, () => import('../pages/InvoiceUploadPage'));
          break;
      }
    });
  }
}

export const pagePreloader = new PagePreloader();