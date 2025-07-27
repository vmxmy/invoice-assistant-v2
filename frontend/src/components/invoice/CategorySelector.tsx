import React, { useState, useEffect } from 'react';
import { ChevronRight, Tag } from 'lucide-react';
import { getCategoryIcon, getCategoryColor } from '../../utils/categoryUtils';

// 分类配置
const CATEGORY_CONFIG = {
  primary: ['交通', '住宿', '餐饮', '办公', '其他'],
  secondary: {
    '交通': ['高铁', '飞机', '出租车'],
    '住宿': ['酒店', '民宿'],
    '餐饮': [],
    '办公': ['咨询', '印章'],
    '其他': []
  } as Record<string, string[]>
};

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'md'
}) => {
  // 解析当前值
  const [primaryCategory, setPrimaryCategory] = useState<string>('');
  const [secondaryCategory, setSecondaryCategory] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // 从 value 解析一级和二级分类
  useEffect(() => {
    if (value) {
      // 检查是否是二级分类
      let foundPrimary = '';
      let foundSecondary = '';
      
      for (const [primary, secondaries] of Object.entries(CATEGORY_CONFIG.secondary)) {
        if (secondaries.includes(value)) {
          foundPrimary = primary;
          foundSecondary = value;
          break;
        } else if (primary === value) {
          foundPrimary = value;
          foundSecondary = '';
          break;
        }
      }
      
      setPrimaryCategory(foundPrimary);
      setSecondaryCategory(foundSecondary);
    } else {
      setPrimaryCategory('');
      setSecondaryCategory('');
    }
  }, [value]);

  // 处理一级分类选择
  const handlePrimarySelect = (primary: string) => {
    setPrimaryCategory(primary);
    setSecondaryCategory('');
    
    // 如果没有二级分类，直接应用
    const secondaries = CATEGORY_CONFIG.secondary[primary] || [];
    if (secondaries.length === 0) {
      onChange(primary);
      setIsOpen(false);
    }
  };

  // 处理二级分类选择
  const handleSecondarySelect = (secondary: string) => {
    setSecondaryCategory(secondary);
    onChange(secondary);
    setIsOpen(false);
  };

  // 获取当前选中的分类信息
  const getCurrentCategory = () => {
    if (secondaryCategory) {
      return {
        name: secondaryCategory,
        icon: getCategoryIcon({ expense_category: secondaryCategory } as any),
        color: getCategoryColor({ expense_category: secondaryCategory } as any),
        path: `${primaryCategory} > ${secondaryCategory}`
      };
    } else if (primaryCategory) {
      return {
        name: primaryCategory,
        icon: getCategoryIcon({ primary_category_name: primaryCategory } as any),
        color: getCategoryColor({ primary_category_name: primaryCategory } as any),
        path: primaryCategory
      };
    }
    return null;
  };

  const currentCategory = getCurrentCategory();
  const sizeClasses = {
    sm: 'btn-sm text-sm',
    md: '',
    lg: 'btn-lg text-lg'
  };

  return (
    <div className="relative">
      {/* 触发按钮 */}
      <button
        type="button"
        className={`btn btn-outline w-full justify-start ${sizeClasses[size]} ${disabled ? 'btn-disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {currentCategory ? (
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentCategory.icon}</span>
            <span className="font-medium">{currentCategory.name}</span>
            {secondaryCategory && primaryCategory && (
              <span className="text-base-content/60 text-xs">({primaryCategory})</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-base-content/60">
            <Tag className="w-4 h-4" />
            <span>选择分类</span>
          </div>
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && !disabled && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 菜单内容 */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-2">
              {/* 一级分类 */}
              <div className="mb-2">
                <div className="text-xs text-base-content/60 px-2 py-1">一级分类</div>
                <div className="grid grid-cols-3 gap-1">
                  {CATEGORY_CONFIG.primary.map(primary => {
                    const icon = getCategoryIcon({ primary_category_name: primary } as any);
                    const color = getCategoryColor({ primary_category_name: primary } as any);
                    const isSelected = primaryCategory === primary;
                    
                    return (
                      <button
                        key={primary}
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => handlePrimarySelect(primary)}
                      >
                        <span className="text-sm">{icon}</span>
                        <span>{primary}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 二级分类 */}
              {primaryCategory && CATEGORY_CONFIG.secondary[primaryCategory]?.length > 0 && (
                <div>
                  <div className="text-xs text-base-content/60 px-2 py-1 flex items-center gap-1">
                    <span>{primaryCategory}</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>二级分类</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {CATEGORY_CONFIG.secondary[primaryCategory].map(secondary => {
                      const isSelected = secondaryCategory === secondary;
                      
                      return (
                        <button
                          key={secondary}
                          type="button"
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => handleSecondarySelect(secondary)}
                        >
                          {secondary}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 清除按钮 */}
              {value && (
                <div className="mt-2 pt-2 border-t border-base-300">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-block"
                    onClick={() => {
                      setPrimaryCategory('');
                      setSecondaryCategory('');
                      onChange('');
                      setIsOpen(false);
                    }}
                  >
                    清除分类
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};