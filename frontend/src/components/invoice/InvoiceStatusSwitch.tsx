import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useInvoiceStatuses, getIconComponent } from '../../hooks/useInvoiceStatuses';
import '../../styles/compact-design-system.css';

export type InvoiceStatus = string;

interface InvoiceStatusSwitchProps {
  status: InvoiceStatus;
  onStatusChange?: (newStatus: InvoiceStatus) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

// 生成样式类的辅助函数
const generateSwitchStyles = (color: string, isActive: boolean) => {
  const colorMap: Record<string, any> = {
    warning: {
      bg: isActive ? 'bg-warning text-warning-content' : 'bg-warning/10 text-warning hover:bg-warning/20',
      border: 'border-warning/30',
      shadow: isActive ? 'shadow-warning/20' : ''
    },
    info: {
      bg: isActive ? 'bg-info text-info-content' : 'bg-info/10 text-info hover:bg-info/20',
      border: 'border-info/30',
      shadow: isActive ? 'shadow-info/20' : ''
    },
    success: {
      bg: isActive ? 'bg-success text-success-content' : 'bg-success/10 text-success hover:bg-success/20',
      border: 'border-success/30',
      shadow: isActive ? 'shadow-success/20' : ''
    },
    error: {
      bg: isActive ? 'bg-error text-error-content' : 'bg-error/10 text-error hover:bg-error/20',
      border: 'border-error/30',
      shadow: isActive ? 'shadow-error/20' : ''
    },
    base: {
      bg: isActive ? 'bg-base-300 text-base-content' : 'bg-base-200/50 text-base-content/60 hover:bg-base-200',
      border: 'border-base-300',
      shadow: ''
    }
  };
  
  return colorMap[color] || colorMap.warning;
};

export const InvoiceStatusSwitch: React.FC<InvoiceStatusSwitchProps> = ({
  status,
  onStatusChange,
  size = 'md',
  disabled = false,
  loading = false
}) => {
  const [isToggling, setIsToggling] = useState(false);
  
  // 获取动态状态配置
  const { statuses, loading: statusesLoading, getStatusConfig, getAvailableTransitions } = useInvoiceStatuses();
  
  // 当前状态配置
  const currentConfig = useMemo(() => {
    const config = getStatusConfig(status);
    if (config) return config;
    
    // 兜底配置
    return {
      status_code: status,
      label: status === 'unreimbursed' ? '未报销' : status.toUpperCase(),
      icon_name: 'Clock',
      color: 'warning',
      can_transition_to: []
    };
  }, [status, getStatusConfig]);
  
  // 下一个状态（用于一键切换）
  const nextStatus = useMemo(() => {
    const transitions = getAvailableTransitions(status);
    if (transitions.length === 0) return null;
    
    // 智能选择下一个状态
    // 优先级：pending -> processing -> reimbursed
    const priorityOrder = ['processing', 'reimbursed', 'rejected', 'pending'];
    
    for (const priority of priorityOrder) {
      const found = transitions.find(t => t.status_code === priority);
      if (found) return found;
    }
    
    // 如果没有找到优先状态，返回第一个可用状态
    return transitions[0];
  }, [status, getAvailableTransitions]);
  
  // 紧凑尺寸样式
  const sizeClasses = {
    sm: {
      container: 'btn-compact-sm min-w-[100px]',
      icon: 'icon-xs',
      gap: 'gap-1'
    },
    md: {
      container: 'btn-compact-md min-w-[120px]',
      icon: 'icon-sm',
      gap: 'gap-1.5'
    },
    lg: {
      container: 'btn-compact-lg min-w-[140px]',
      icon: 'icon-md',
      gap: 'gap-2'
    }
  };
  
  const CurrentIcon = getIconComponent(currentConfig.icon_name);
  const NextIcon = nextStatus ? getIconComponent(nextStatus.icon_name) : CurrentIcon;
  
  // 处理切换
  const handleToggle = async () => {
    if (!onStatusChange || !nextStatus || isToggling || disabled || loading) return;
    
    setIsToggling(true);
    try {
      await onStatusChange(nextStatus.status_code);
    } finally {
      setIsToggling(false);
    }
  };
  
  const isClickable = !!onStatusChange && !!nextStatus && !disabled && !loading && !statusesLoading;
  const currentStyles = generateSwitchStyles(currentConfig.color, false);
  const nextStyles = nextStatus ? generateSwitchStyles(nextStatus.color, true) : currentStyles;
  
  // 加载状态
  if (statusesLoading) {
    return (
      <div className={`
        status-component-compact ${sizeClasses[size].container} ${sizeClasses[size].gap}
        bg-base-200 text-base-content/50
      `}>
        <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
        <span>加载中...</span>
      </div>
    );
  }
  
  return (
    <motion.button
      className={`
        status-component-compact ${sizeClasses[size].container} ${sizeClasses[size].gap}
        transition-compact ${currentStyles.bg} ${currentStyles.border} ${currentStyles.shadow}
        ${isClickable 
          ? 'cursor-pointer hover:shadow-md active:scale-[0.98] select-none focus-compact' 
          : 'cursor-default opacity-50'
        }
        ${isToggling ? 'pointer-events-none' : ''}
      `}
      onClick={handleToggle}
      disabled={!isClickable}
      whileHover={isClickable ? { scale: 1.01 } : {}}
      whileTap={isClickable ? { scale: 0.99 } : {}}
      title={
        isClickable 
          ? `点击切换为: ${nextStatus?.label}` 
          : nextStatus 
            ? '无权限切换状态' 
            : '暂无可切换状态'
      }
      aria-label={`当前状态: ${currentConfig.label}${isClickable ? `，点击切换为: ${nextStatus?.label}` : ''}`}
    >
      {/* 当前状态 */}
      <motion.div 
        className="flex items-center gap-1.5"
        animate={{ 
          x: isToggling ? -10 : 0,
          opacity: isToggling ? 0.5 : 1 
        }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          animate={currentConfig.icon_name === 'RefreshCw' ? { rotate: 360 } : {}}
          transition={currentConfig.icon_name === 'RefreshCw' ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
        >
          <CurrentIcon className={sizeClasses[size].icon} />
        </motion.div>
        <span className="font-medium text-xs">{currentConfig.label}</span>
      </motion.div>
      
      {/* 切换指示器 */}
      {isClickable && nextStatus && (
        <>
          {/* 分隔线 */}
          <div className="w-px h-4 bg-current opacity-30" />
          
          {/* 下一个状态预览 */}
          <motion.div 
            className="flex items-center gap-1"
            animate={{ 
              x: isToggling ? 5 : 0,
              opacity: isToggling ? 1 : 0.6 
            }}
            transition={{ duration: 0.2 }}
          >
            <NextIcon className={`${sizeClasses[size].icon} opacity-50`} />
            <span className="text-xs opacity-50">{nextStatus.label}</span>
          </motion.div>
        </>
      )}
      
      {/* 加载指示器 */}
      {(isToggling || loading) && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-current/10 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
        </motion.div>
      )}
    </motion.button>
  );
};

// 快速切换组件（只在 reimbursed 和 pending 之间切换）
export const QuickInvoiceStatusSwitch: React.FC<{
  status: InvoiceStatus;
  onToggle: (newStatus: InvoiceStatus) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}> = ({ status, onToggle, size = 'md', disabled = false, loading = false }) => {
  const isReimbursed = status === 'reimbursed';
  const [isToggling, setIsToggling] = useState(false);
  
  const handleToggle = async () => {
    if (disabled || loading || isToggling) return;
    
    setIsToggling(true);
    try {
      const newStatus = isReimbursed ? 'pending' : 'reimbursed';
      await onToggle(newStatus);
    } finally {
      setIsToggling(false);
    }
  };
  
  const sizeClasses = {
    sm: 'h-5 w-10',
    md: 'h-6 w-11',
    lg: 'h-7 w-12'
  };
  
  const thumbSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  return (
    <motion.button
      className={`
        relative ${sizeClasses[size]} rounded-full transition-compact focus-compact
        ${isReimbursed 
          ? 'bg-success shadow-success/20' 
          : 'bg-base-300'
        }
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
        ${isToggling ? 'pointer-events-none' : ''}
      `}
      onClick={handleToggle}
      disabled={disabled || loading || isToggling}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      title={`点击切换为: ${isReimbursed ? '待处理' : '已报销'}`}
    >
      {/* 滑块 */}
      <motion.div
        className={`
          absolute top-0.5 ${thumbSizes[size]} rounded-full
          bg-white shadow-sm flex items-center justify-center
        `}
        animate={{ 
          x: isReimbursed ? `calc(100% + 0.125rem)` : '0.125rem'
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {(isToggling || loading) && (
          <Loader2 className="w-3 h-3 animate-spin text-base-content/50" />
        )}
      </motion.div>
      
      {/* 状态标签 */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 text-xs font-medium text-white/70 pointer-events-none">
        <span className={`text-xs ${isReimbursed ? 'opacity-40' : 'opacity-90'}`}>待处理</span>
        <span className={`text-xs ${isReimbursed ? 'opacity-90' : 'opacity-40'}`}>已报销</span>
      </div>
    </motion.button>
  );
};

export default InvoiceStatusSwitch;