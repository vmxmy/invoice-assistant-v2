/**
 * 通知工具函数
 * 使用 DaisyUI Toast 组件实现全局通知
 */

import { toast } from 'react-hot-toast';

// Toast 配置
const toastConfig = {
  duration: 3000,
  position: 'top-right' as const,
  style: {
    background: 'hsl(var(--b1))',
    color: 'hsl(var(--bc))',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
};

export const notify = {
  /**
   * 成功通知
   */
  success: (message: string, options?: any) => {
    toast.success(message, {
      ...toastConfig,
      iconTheme: {
        primary: 'hsl(var(--su))',
        secondary: 'hsl(var(--suc))',
      },
      ...options,
    });
  },

  /**
   * 错误通知
   */
  error: (message: string, options?: any) => {
    toast.error(message, {
      ...toastConfig,
      iconTheme: {
        primary: 'hsl(var(--er))',
        secondary: 'hsl(var(--erc))',
      },
      ...options,
    });
  },

  /**
   * 信息通知
   */
  info: (message: string, options?: any) => {
    toast(message, {
      ...toastConfig,
      icon: '💡',
      ...options,
    });
  },

  /**
   * 警告通知
   */
  warning: (message: string, options?: any) => {
    toast(message, {
      ...toastConfig,
      icon: '⚠️',
      iconTheme: {
        primary: 'hsl(var(--wa))',
        secondary: 'hsl(var(--wac))',
      },
      ...options,
    });
  },

  /**
   * 加载中通知
   */
  loading: (message: string, options?: any) => {
    return toast.loading(message, {
      ...toastConfig,
      ...options,
    });
  },

  /**
   * 承诺通知（用于异步操作）
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    },
    options?: any
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        ...toastConfig,
        ...options,
      }
    );
  },

  /**
   * 自定义通知
   */
  custom: (content: React.ReactNode, options?: any) => {
    toast.custom(content, {
      ...toastConfig,
      ...options,
    });
  },

  /**
   * 关闭特定通知
   */
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  /**
   * 关闭所有通知
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

// 导出toast实例，便于高级用法
export { toast };