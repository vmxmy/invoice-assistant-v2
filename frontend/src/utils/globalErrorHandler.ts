/**
 * 全局错误处理器
 * 用于捕获和处理未处理的错误，避免应用崩溃
 */

// 错误白名单 - 这些错误将被忽略
const ERROR_WHITELIST = [
  'triggerSyncToReact is not a function',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  'Non-Error promise rejection captured'
];

/**
 * 检查错误是否应该被忽略
 */
function shouldIgnoreError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  
  return ERROR_WHITELIST.some(whitelistItem => 
    errorMessage.includes(whitelistItem)
  );
}

/**
 * 初始化全局错误处理器
 */
export function initializeGlobalErrorHandler(): void {
  // 处理未捕获的错误
  window.addEventListener('error', (event) => {
    if (shouldIgnoreError(event.error)) {
      event.preventDefault();
      return;
    }
    
    // 记录错误但不阻止默认行为
    console.error('全局错误:', event.error);
  });

  // 处理未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    if (shouldIgnoreError(event.reason)) {
      event.preventDefault();
      return;
    }
    
    // 记录错误但不阻止默认行为
    console.error('未处理的 Promise 拒绝:', event.reason);
  });
}

/**
 * 安全执行函数
 * 包装函数以捕获错误
 */
export function safeExecute<T>(
  fn: () => T,
  fallback?: T,
  errorHandler?: (error: Error) => void
): T | undefined {
  try {
    return fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error as Error);
    } else if (!shouldIgnoreError(error as Error)) {
      console.error('执行错误:', error);
    }
    return fallback;
  }
}

/**
 * 安全执行异步函数
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  fallback?: T,
  errorHandler?: (error: Error) => void
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error as Error);
    } else if (!shouldIgnoreError(error as Error)) {
      console.error('异步执行错误:', error);
    }
    return fallback;
  }
}