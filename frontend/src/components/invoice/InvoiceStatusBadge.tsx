import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Clock, 
  AlertCircle, 
  XCircle, 
  ChevronDown,
  RefreshCw,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Loader2
} from 'lucide-react';
import { useInvoiceStatuses, getIconComponent } from '../../hooks/useInvoiceStatuses';
import '../../styles/compact-design-system.css';

export type InvoiceStatus = string; // 改为 string 以支持动态状态

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  onStatusChange?: (newStatus: InvoiceStatus) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showLabel?: boolean;
  showDropdownArrow?: boolean;
}

// 辅助函数：生成样式类
const generateStyleClasses = (color: string) => {
  const baseMap: Record<string, any> = {
    warning: {
      bgClass: 'bg-gradient-to-r from-warning/20 to-warning/10',
      borderClass: 'border-warning/30',
      textClass: 'text-warning',
      iconBgClass: 'bg-warning/10',
      hoverClass: 'hover:from-warning/30 hover:to-warning/20 hover:border-warning/50',
      activeClass: 'active:from-warning/40 active:to-warning/30',
      shadowClass: 'hover:shadow-warning/20'
    },
    info: {
      bgClass: 'bg-gradient-to-r from-info/20 to-info/10',
      borderClass: 'border-info/30',
      textClass: 'text-info',
      iconBgClass: 'bg-info/10',
      hoverClass: 'hover:from-info/30 hover:to-info/20 hover:border-info/50',
      activeClass: 'active:from-info/40 active:to-info/30',
      shadowClass: 'hover:shadow-info/20'
    },
    success: {
      bgClass: 'bg-gradient-to-r from-success/20 to-success/10',
      borderClass: 'border-success/30',
      textClass: 'text-success',
      iconBgClass: 'bg-success/10',
      hoverClass: 'hover:from-success/30 hover:to-success/20 hover:border-success/50',
      activeClass: 'active:from-success/40 active:to-success/30',
      shadowClass: 'hover:shadow-success/20'
    },
    error: {
      bgClass: 'bg-gradient-to-r from-error/20 to-error/10',
      borderClass: 'border-error/30',
      textClass: 'text-error',
      iconBgClass: 'bg-error/10',
      hoverClass: 'hover:from-error/30 hover:to-error/20 hover:border-error/50',
      activeClass: 'active:from-error/40 active:to-error/30',
      shadowClass: 'hover:shadow-error/20'
    },
    base: {
      bgClass: 'bg-gradient-to-r from-base-300/50 to-base-300/30',
      borderClass: 'border-base-300',
      textClass: 'text-base-content/60',
      iconBgClass: 'bg-base-300/50',
      hoverClass: 'hover:from-base-300/60 hover:to-base-300/40 hover:border-base-content/20',
      activeClass: 'active:from-base-300/70 active:to-base-300/50',
      shadowClass: 'hover:shadow-base-content/10'
    }
  };
  
  return baseMap[color] || baseMap.warning;
};

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({
  status,
  onStatusChange,
  size = 'md',
  interactive = true,
  showLabel = true,
  showDropdownArrow = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // 获取动态状态配置
  const { statuses, loading, getStatusConfig, getAvailableTransitions } = useInvoiceStatuses();
  
  // 当前状态配置
  const currentConfig = useMemo(() => {
    const dbConfig = getStatusConfig(status);
    if (dbConfig) {
      const styleClasses = generateStyleClasses(dbConfig.color);
      return {
        label: dbConfig.label,
        icon: getIconComponent(dbConfig.icon_name),
        color: dbConfig.color,
        animate: dbConfig.icon_name === 'RefreshCw', // 只有处理中状态有动画
        ...styleClasses
      };
    }
    
    // 兜底配置（兼容旧系统）
    return {
      label: status === 'unreimbursed' ? '未报销' : status.toUpperCase(),
      icon: Clock,
      color: 'warning',
      animate: false,
      ...generateStyleClasses('warning')
    };
  }, [status, getStatusConfig]);
  
  // 可切换的状态列表
  const availableStatuses = useMemo(() => {
    return getAvailableTransitions(status);
  }, [status, getAvailableTransitions]);
  
  const Icon = currentConfig.icon;

  const sizeClasses = {
    sm: 'badge-compact-sm',
    md: 'badge-compact-md', 
    lg: 'btn-compact-lg'
  };

  const iconSizes = {
    sm: 'icon-xs',
    md: 'icon-sm',
    lg: 'icon-md'
  };

  const handleStatusSelect = (newStatus: InvoiceStatus) => {
    if (onStatusChange && newStatus !== status) {
      onStatusChange(newStatus);
    }
    setIsOpen(false);
  };

  const isClickable = interactive && onStatusChange && !loading;

  // 加载状态
  if (loading) {
    return (
      <div className="status-component-compact badge-compact-md bg-base-200 text-base-content/50">
        <Loader2 className="icon-sm animate-spin" />
        <span className="text-xs">加载中...</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <motion.button
        className={`
          relative inline-flex items-center gap-2 rounded-full border-2 font-medium
          transition-all duration-200 
          ${currentConfig.bgClass} ${currentConfig.borderClass} ${currentConfig.textClass}
          ${sizeClasses[size]}
          ${isClickable ? `cursor-pointer ${currentConfig.hoverClass} ${currentConfig.activeClass} ${currentConfig.shadowClass} hover:shadow-lg` : 'cursor-default'}
          ${isClickable ? 'select-none' : ''}
        `}
        onClick={() => isClickable && setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={isClickable ? { scale: 1.05 } : {}}
        whileTap={isClickable ? { scale: 0.95 } : {}}
        aria-label={`发票状态: ${currentConfig.label}${isClickable ? '，点击切换状态' : ''}`}
        role={isClickable ? 'button' : 'status'}
      >
        {/* 状态图标 */}
        <motion.div 
          className={`
            relative flex items-center justify-center rounded-full
            ${currentConfig.iconBgClass} ${iconSizes[size]}
            p-0.5
          `}
          animate={currentConfig.animate ? { rotate: 360 } : {}}
          transition={currentConfig.animate ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
        >
          <Icon className={`${iconSizes[size]} ${currentConfig.textClass}`} />
          
          {/* 脉冲指示器 - 仅在处理中状态显示 */}
          {status === 'processing' && (
            <motion.div
              className={`absolute inset-0 rounded-full ${currentConfig.bgClass}`}
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* 状态文本 */}
        {showLabel && (
          <span className="font-medium">{currentConfig.label}</span>
        )}

        {/* 可点击指示器 */}
        {isClickable && (
          <>
            {/* 分隔线 */}
            <div className={`w-px h-4 ${currentConfig.borderClass} opacity-50 mx-1`} />
            
            {/* 下拉箭头或切换图标 */}
            {showDropdownArrow ? (
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className={`${iconSizes[size]} ${currentConfig.textClass}`} />
              </motion.div>
            ) : (
              <Edit3 className={`${iconSizes[size]} ${currentConfig.textClass} opacity-70`} />
            )}

            {/* 悬停提示 */}
            <AnimatePresence>
              {isHovered && !isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50"
                >
                  <div className="bg-base-content text-base-100 text-xs px-2 py-1 rounded whitespace-nowrap">
                    点击切换状态
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.button>

      {/* 状态选择下拉菜单 */}
      <AnimatePresence>
        {isOpen && isClickable && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* 下拉菜单 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 right-0 z-[9999] min-w-[180px]"
            >
              <div className="card-compact bg-base-100/95 backdrop-blur-sm rounded-xl shadow-lg border border-base-300/50 overflow-hidden">
                {/* 菜单标题 */}
                <div className="bg-base-200/30 border-b border-base-200 p-3">
                  <p className="field-label">切换状态为</p>
                </div>
                
                {/* 状态选项 */}
                <div className="p-1">
                  {availableStatuses.length > 0 ? (
                    availableStatuses.map((statusOption) => {
                      const styleClasses = generateStyleClasses(statusOption.color);
                      const OptionIcon = getIconComponent(statusOption.icon_name);
                      const isSelected = statusOption.status_code === status;
                      
                      return (
                        <motion.button
                          key={statusOption.status_code}
                          className={`
                            w-full flex items-center btn btn-sm rounded-lg gap-2 px-3 py-2
                            transition-all duration-200
                            ${isSelected 
                              ? `${styleClasses.bgClass} ${styleClasses.borderClass} border` 
                              : 'hover:bg-base-200/50'
                            }
                          `}
                          onClick={() => handleStatusSelect(statusOption.status_code)}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* 图标 */}
                          <div className={`
                            rounded-lg ${styleClasses.iconBgClass} p-1
                          `}>
                            <OptionIcon className={`icon-sm ${styleClasses.textClass}`} />
                          </div>
                          
                          {/* 标签 */}
                          <span className={`
                            flex-1 text-left field-value
                            ${isSelected ? styleClasses.textClass : 'text-base-content'}
                          `}>
                            {statusOption.label}
                          </span>
                          
                          {/* 选中指示器 */}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`
                                rounded-full flex items-center justify-center w-6 h-6
                                ${styleClasses.bgClass}
                              `}
                            >
                              <Check className={`icon-xs ${styleClasses.textClass}`} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })
                  ) : (
                    <div className="text-center field-label py-2 px-3">
                      暂无可切换的状态
                    </div>
                  )}
                </div>

                {/* 快速操作提示 */}
                <div className="border-t border-base-200 bg-base-200/30 py-2 px-3">
                  <p className="field-label opacity-70">
                    提示：点击状态即可快速切换
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// 简化版状态切换按钮（用于批量操作）
export const InvoiceStatusToggle: React.FC<{
  status: InvoiceStatus;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ status, onToggle, size = 'md' }) => {
  const config = statusConfig[status];
  const isActive = status === 'reimbursed';
  
  return (
    <motion.button
      className={`
        relative inline-flex items-center gap-2 rounded-full
        px-4 py-2 font-medium transition-all duration-200
        ${isActive 
          ? 'bg-success/20 border-2 border-success/30 text-success hover:bg-success/30' 
          : 'bg-base-200 border-2 border-base-300 text-base-content/70 hover:bg-base-300'
        }
      `}
      onClick={onToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ x: isActive ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
      </motion.div>
      <span>{isActive ? '已报销' : '未报销'}</span>
    </motion.button>
  );
};

export default InvoiceStatusBadge;