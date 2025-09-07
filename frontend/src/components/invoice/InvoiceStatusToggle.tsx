import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, Clock, AlertCircle, XCircle } from 'lucide-react';
import { useInvoiceStatuses, getIconComponent } from '../../hooks/useInvoiceStatuses';
import toast from 'react-hot-toast';
import '../../styles/compact-design-system.css';

export type InvoiceStatus = string;

interface InvoiceStatusToggleProps {
  status: InvoiceStatus;
  onStatusChange?: (newStatus: InvoiceStatus) => Promise<boolean>;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

// 状态映射配置
const STATUS_CONFIG = {
  // 已报销状态 - 绿色
  reimbursed: {
    label: '已报销',
    color: 'success',
    icon: Check,
    toggleState: true
  },
  // 待处理状态 - 橙色
  pending: {
    label: '待处理',
    color: 'warning',
    icon: Clock,
    toggleState: false
  },
  // 处理中状态 - 蓝色
  processing: {
    label: '处理中',
    color: 'info',
    icon: AlertCircle,
    toggleState: false
  },
  // 已拒绝状态 - 红色
  rejected: {
    label: '已拒绝',
    color: 'error',
    icon: XCircle,
    toggleState: false
  }
};

export const InvoiceStatusToggle: React.FC<InvoiceStatusToggleProps> = ({
  status,
  onStatusChange,
  size = 'md',
  disabled = false,
  loading = false
}) => {
  const [isToggling, setIsToggling] = useState(false);
  
  // 获取动态状态配置
  const { statuses, loading: statusesLoading, getStatusConfig, getAvailableTransitions } = useInvoiceStatuses();
  
  // 当前状态配置 - 简化为已报销/未报销
  const currentConfig = useMemo(() => {
    const isReimbursed = status === 'reimbursed';
    return {
      label: isReimbursed ? '已报销' : '未报销',
      color: isReimbursed ? 'success' : 'warning',
      icon: isReimbursed ? Check : Clock,
      toggleState: isReimbursed,
    };
  }, [status]);
  
  // 获取切换目标状态
  const getToggleTarget = (currentStatus: InvoiceStatus): InvoiceStatus => {
    if (currentStatus === 'reimbursed') {
      return 'pending'; // 已报销 -> 待处理
    } else {
      return 'reimbursed'; // 其他状态 -> 已报销
    }
  };
  
  const targetStatus = getToggleTarget(status);
  const targetConfig = useMemo(() => {
    const isTargetReimbursed = targetStatus === 'reimbursed';
    return {
      label: isTargetReimbursed ? '已报销' : '未报销',
      color: isTargetReimbursed ? 'success' : 'warning',
    };
  }, [targetStatus]);

  // 处理切换
  const handleToggle = async () => {
    if (!onStatusChange || isToggling || disabled || loading || statusesLoading) return;
    
    setIsToggling(true);
    try {
      const success = await onStatusChange(targetStatus);
      if (success) {
        toast.success(`状态已切换为${targetConfig.label}`);
      } else {
        toast.error('状态更新失败，请重试');
      }
    } catch (error) {
      console.error('状态切换失败:', error);
      toast.error('状态更新失败，请重试');
    } finally {
      setIsToggling(false);
    }
  };
  
  const isClickable = !!onStatusChange && !disabled && !loading && !statusesLoading;
  
  // 尺寸配置
  const sizeClasses = {
    sm: {
      toggle: 'toggle-sm',
      container: 'gap-2 text-xs',
      icon: 'w-3 h-3'
    },
    md: {
      toggle: 'toggle-md',
      container: 'gap-2 text-sm',
      icon: 'w-4 h-4'
    },
    lg: {
      toggle: 'toggle-lg', 
      container: 'gap-3 text-base',
      icon: 'w-5 h-5'
    }
  };
  
  // 确保size有效，提供默认值
  const validSize = (size && sizeClasses[size]) ? size : 'md';

  // 状态颜色配置
  const getToggleColorClass = (color: string, isChecked: boolean) => {
    if (!isChecked) return '';
    
    const colorMap = {
      success: 'toggle-success',
      warning: 'toggle-warning',
      info: 'toggle-info',
      error: 'toggle-error',
      primary: 'toggle-primary'
    };
    
    return colorMap[color] || 'toggle-primary';
  };

  // 加载状态
  if (statusesLoading || loading) {
    return (
      <div className={`
        flex items-center ${sizeClasses[validSize].container}
        opacity-60 pointer-events-none
      `}>
        <Loader2 className={`${sizeClasses[validSize].icon} animate-spin text-base-content/50`} />
        <span>加载中...</span>
      </div>
    );
  }

  const CurrentIcon = currentConfig.icon;

  return (
    <motion.label 
      className={`
        inline-flex items-center cursor-pointer select-none
        ${sizeClasses[validSize].container} relative
        ${!isClickable ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
        ${isToggling ? 'pointer-events-none' : ''}
        transition-all duration-200
      `}
      whileHover={isClickable ? { scale: 1.02 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      title={
        isClickable 
          ? `点击切换为: ${targetConfig.label}` 
          : disabled 
            ? '无权限切换状态' 
            : '状态不可切换'
      }
    >
      {/* 状态图标和标签 */}
      <div className="flex items-center gap-1.5">
        <motion.div
          animate={currentConfig.icon === AlertCircle ? { rotate: 360 } : {}}
          transition={currentConfig.icon === AlertCircle ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
        >
          <CurrentIcon className={`
            ${sizeClasses[validSize].icon}
            ${currentConfig.color === 'success' ? 'text-success' : 
              currentConfig.color === 'warning' ? 'text-warning' :
              currentConfig.color === 'info' ? 'text-info' : 
              currentConfig.color === 'error' ? 'text-error' : 'text-primary'}
          `} />
        </motion.div>
        <span className="font-medium text-base-content/90">
          {currentConfig.label}
        </span>
      </div>

      {/* DaisyUI Toggle 开关 */}
      <input 
        type="checkbox" 
        className={`
          toggle transition-all duration-300
          ${sizeClasses[validSize].toggle}
          ${getToggleColorClass(currentConfig.color, currentConfig.toggleState)}
          ${!isClickable ? 'opacity-50' : ''}
        `}
        checked={currentConfig.toggleState}
        onChange={handleToggle}
        disabled={!isClickable}
      />

      {/* 移除右侧的目标状态提示 */}

      {/* 切换加载指示器 */}
      {isToggling && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-base-100/80 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Loader2 className={`${sizeClasses[validSize].icon} animate-spin text-primary`} />
        </motion.div>
      )}
    </motion.label>
  );
};

export default InvoiceStatusToggle;