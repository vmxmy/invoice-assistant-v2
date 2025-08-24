/**
 * 页面级 Suspense 加载组件
 * 为路由懒加载提供优雅的加载状态
 */
import React from 'react';
import { motion } from 'framer-motion';

interface PageSuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <motion.div
        className="flex flex-col items-center space-y-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* 简洁的加载动画，避免闪烁 */}
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base-content/60 text-sm">正在加载...</p>
      </motion.div>
    </div>
  );
};

const PageSuspense: React.FC<PageSuspenseProps> = ({ 
  children, 
  fallback = <DefaultFallback /> 
}) => {
  return (
    <React.Suspense fallback={fallback}>
      {children}
    </React.Suspense>
  );
};

export default PageSuspense;