import React, { useState, useEffect } from 'react'
import { ChevronDown, Tag, Filter } from 'lucide-react'
import { getAvailableCategories, categoryIcons, categoryColors } from '../utils/categoryUtils'

interface CategorySelectorProps {
  selectedPrimary?: string
  selectedSecondary?: string
  onSelectionChange: (primary?: string, secondary?: string) => void
  placeholder?: string
  showAllOption?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedPrimary,
  selectedSecondary,
  onSelectionChange,
  placeholder = '选择分类',
  showAllOption = true,
  size = 'md',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const categories = getAvailableCategories()

  const handlePrimarySelect = (primary: string) => {
    if (primary === selectedPrimary) {
      // 如果点击的是已选中的一级分类，则取消选择
      onSelectionChange(undefined, undefined)
    } else {
      // 选择新的一级分类，清除二级分类选择
      onSelectionChange(primary, undefined)
    }
    setIsOpen(false)
  }

  const handleSecondarySelect = (primary: string, secondary: string) => {
    onSelectionChange(primary, secondary)
    setIsOpen(false)
  }

  const getDisplayText = () => {
    if (selectedSecondary && selectedPrimary) {
      return `${selectedPrimary} > ${selectedSecondary}`
    }
    if (selectedPrimary) {
      return selectedPrimary
    }
    return placeholder
  }

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'btn-sm'
      case 'lg': return 'btn-lg'
      default: return ''
    }
  }

  return (
    <div className={`dropdown ${isOpen ? 'dropdown-open' : ''} ${className}`}>
      <button
        type="button"
        tabIndex={0}
        className={`btn btn-outline ${getButtonSize()} justify-between min-w-48`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="truncate">{getDisplayText()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 rounded-box w-80 max-h-96 overflow-y-auto">
          {showAllOption && (
            <li>
              <button
                type="button"
                className={`flex items-center gap-2 ${!selectedPrimary ? 'active' : ''}`}
                onClick={() => {
                  onSelectionChange(undefined, undefined)
                  setIsOpen(false)
                }}
              >
                <Tag className="w-4 h-4" />
                <span>全部分类</span>
              </button>
            </li>
          )}
          
          {showAllOption && <div className="divider my-1"></div>}
          
          {categories.primary.map(primary => (
            <li key={primary} className="menu-item">
              {/* 一级分类 */}
              <div className="flex flex-col">
                <button
                  type="button"
                  className={`flex items-center gap-2 font-medium ${
                    selectedPrimary === primary && !selectedSecondary ? 'active' : ''
                  }`}
                  onClick={() => handlePrimarySelect(primary)}
                >
                  <span className="text-lg">{categoryIcons[primary] || '📁'}</span>
                  <span>{primary}</span>
                  <div 
                    className="w-3 h-3 rounded-full ml-auto"
                    style={{ backgroundColor: categoryColors[primary] || '#6b7280' }}
                  ></div>
                </button>
                
                {/* 二级分类 */}
                {categories.secondary[primary] && categories.secondary[primary].length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {categories.secondary[primary].map(secondary => (
                      <button
                        key={secondary}
                        type="button"
                        className={`flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-base-200 w-full text-left ${
                          selectedSecondary === secondary ? 'bg-primary text-primary-content' : ''
                        }`}
                        onClick={() => handleSecondarySelect(primary, secondary)}
                      >
                        <span>{categoryIcons[secondary] || '📄'}</span>
                        <span>{secondary}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </div>
      )}
    </div>
  )
}

export default CategorySelector