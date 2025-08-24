/**
 * 列表动画组件
 * 提供虚拟化列表的高性能动画，支持增删改查动画
 */

import React, { ReactNode, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LIST_ANIMATIONS, animationSystem } from './animationSystem';

// 列表项数据接口
export interface ListItemData {
  id: string;
  content: ReactNode;
  height?: number;
}

// 列表动画配置
export interface ListAnimationConfig {
  type: 'staggered' | 'slideIn' | 'expandCard';
  staggerDelay: number;
  enableReordering: boolean;
  enableVirtualization: boolean;
  itemHeight: number;
  visibleItems: number;
}

interface AnimatedListProps {
  items: ListItemData[];
  config?: Partial<ListAnimationConfig>;
  className?: string;
  onItemClick?: (item: ListItemData, index: number) => void;
  onItemRemove?: (item: ListItemData, index: number) => void;
  renderItem?: (item: ListItemData, index: number) => ReactNode;
}

const DEFAULT_CONFIG: ListAnimationConfig = {
  type: 'staggered',
  staggerDelay: 0.05,
  enableReordering: true,
  enableVirtualization: false,
  itemHeight: 80,
  visibleItems: 10
};

/**
 * 单个列表项动画组件
 */
interface AnimatedListItemProps {
  item: ListItemData;
  index: number;
  config: ListAnimationConfig;
  onRemove?: () => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
}

const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  item,
  index,
  config,
  onRemove,
  onReorder,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  
  // 获取优化后的动画配置
  const animationConfig = animationSystem.getOptimizedConfig(
    'list',
    LIST_ANIMATIONS[config.type]
  );
  
  const handleDragStart = () => {
    setIsDragging(true);
    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // 删除动画
  const removeVariants = {
    initial: { opacity: 1, scale: 1, height: 'auto' },
    exit: {
      opacity: 0,
      scale: 0.8,
      height: 0,
      marginTop: 0,
      marginBottom: 0,
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  };
  
  return (
    <motion.div
      layout
      layoutId={item.id}
      {...animationConfig}
      custom={index}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={removeVariants}
      drag={config.enableReordering ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{
        scale: 1.05,
        rotate: 2,
        zIndex: 10,
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}
      className={`
        list-item
        ${isDragging ? 'dragging' : ''}
        cursor-pointer
        select-none
      `}
      style={{
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
      
      {/* 删除按钮 */}
      {onRemove && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
        >
          ×
        </motion.button>
      )}
    </motion.div>
  );
};

/**
 * 主列表动画组件
 */
export const AnimatedList: React.FC<AnimatedListProps> = ({
  items,
  config = {},
  className = '',
  onItemClick,
  onItemRemove,
  renderItem
}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [localItems, setLocalItems] = useState(items);
  
  // 同步外部items变化
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);
  
  // 处理项目删除
  const handleItemRemove = useCallback((item: ListItemData, index: number) => {
    setLocalItems(prev => prev.filter(i => i.id !== item.id));
    onItemRemove?.(item, index);
  }, [onItemRemove]);
  
  // 处理项目重排序
  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setLocalItems(prev => {
      const newItems = [...prev];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });
  }, []);
  
  // 虚拟化计算
  const visibleItems = useMemo(() => {
    if (!finalConfig.enableVirtualization) return localItems;
    
    // 简单的虚拟化实现
    const startIndex = 0;
    const endIndex = Math.min(startIndex + finalConfig.visibleItems, localItems.length);
    return localItems.slice(startIndex, endIndex);
  }, [localItems, finalConfig]);
  
  return (
    <LayoutGroup>
      <motion.div 
        className={`animated-list ${className}`}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, index) => (
            <AnimatedListItem
              key={item.id}
              item={item}
              index={index}
              config={finalConfig}
              onRemove={() => handleItemRemove(item, index)}
              onReorder={handleReorder}
            >
              <div
                onClick={() => onItemClick?.(item, index)}
                className="w-full"
              >
                {renderItem ? renderItem(item, index) : item.content}
              </div>
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
};

/**
 * 新增项目动画
 */
interface AddItemAnimationProps {
  children: ReactNode;
  onAnimationComplete?: () => void;
}

export const AddItemAnimation: React.FC<AddItemAnimationProps> = ({
  children,
  onAnimationComplete
}) => {
  const variants = {
    initial: {
      opacity: 0,
      scale: 0.8,
      y: -20,
      backgroundColor: 'rgba(34, 197, 94, 0.1)' // 绿色背景提示
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      backgroundColor: 'rgba(34, 197, 94, 0)',
      transition: {
        duration: 0.5,
        ease: 'easeOut',
        backgroundColor: {
          duration: 2,
          delay: 0.5
        }
      }
    }
  };
  
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      onAnimationComplete={onAnimationComplete}
      className="border-2 border-green-200 rounded-lg"
      style={{
        willChange: 'transform, opacity, background-color'
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 删除项目动画
 */
interface RemoveItemAnimationProps {
  children: ReactNode;
  onAnimationComplete?: () => void;
}

export const RemoveItemAnimation: React.FC<RemoveItemAnimationProps> = ({
  children,
  onAnimationComplete
}) => {
  const variants = {
    exit: {
      opacity: 0,
      scale: 0.8,
      x: 100,
      backgroundColor: 'rgba(239, 68, 68, 0.1)', // 红色背景提示
      transition: {
        duration: 0.4,
        ease: 'easeIn'
      }
    }
  };
  
  return (
    <motion.div
      variants={variants}
      exit="exit"
      onAnimationComplete={onAnimationComplete}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
};

/**
 * 列表搜索动画
 */
interface SearchHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  searchTerm,
  className = ''
}) => {
  if (!searchTerm) return <span className={className}>{text}</span>;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return (
    <span className={className}>
      {parts.map((part, index) => (
        <motion.span
          key={index}
          initial={part.toLowerCase() === searchTerm.toLowerCase() ? 
            { backgroundColor: 'transparent' } : {}}
          animate={part.toLowerCase() === searchTerm.toLowerCase() ? 
            { backgroundColor: '#fef3c7' } : {}}
          transition={{ duration: 0.3 }}
          className={part.toLowerCase() === searchTerm.toLowerCase() ? 
            'font-semibold' : ''}
        >
          {part}
        </motion.span>
      ))}
    </span>
  );
};

/**
 * 空状态动画
 */
interface EmptyStateAnimationProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyStateAnimation: React.FC<EmptyStateAnimationProps> = ({
  icon,
  title,
  description,
  action
}) => {
  const variants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };
  
  const childVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };
  
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      {icon && (
        <motion.div
          variants={childVariants}
          className="mb-4 text-gray-400 text-6xl"
        >
          {icon}
        </motion.div>
      )}
      
      <motion.h3
        variants={childVariants}
        className="text-lg font-semibold text-gray-700 mb-2"
      >
        {title}
      </motion.h3>
      
      {description && (
        <motion.p
          variants={childVariants}
          className="text-gray-500 mb-6 max-w-sm"
        >
          {description}
        </motion.p>
      )}
      
      {action && (
        <motion.div
          variants={childVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
};

// 导出列表动画相关的CSS类
export const listAnimationStyles = `
.animated-list {
  position: relative;
  overflow: visible;
}

.list-item {
  position: relative;
  margin-bottom: 0.5rem;
  touch-action: pan-y;
}

.list-item.dragging {
  z-index: 10;
  cursor: grabbing;
}

/* 性能优化 */
.animated-list * {
  will-change: transform;
  backface-visibility: hidden;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .list-item {
    margin-bottom: 0.25rem;
  }
}
`;