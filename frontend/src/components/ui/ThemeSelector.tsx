import React, { useEffect, useState } from 'react';

interface Theme {
  id: string;
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

const themes: Theme[] = [
  {
    id: 'light',
    name: '明亮主题',
    description: '清新明亮的热带风格',
    preview: {
      primary: '#4ADEDB',
      secondary: '#F472B6',
      accent: '#A3E635',
      background: '#FEFEFE',
    },
  },
  {
    id: 'dark',
    name: '暗色主题',
    description: '优雅深邃的夜间模式',
    preview: {
      primary: '#67E8F9',
      secondary: '#FB7185',
      accent: '#BEF264',
      background: '#1F2937',
    },
  },
];

interface ThemeSelectorProps {
  className?: string;
  onThemeChange?: (theme: string) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  className = '',
  onThemeChange 
}) => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isOpen, setIsOpen] = useState(false);

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setCurrentTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    const html = document.documentElement;
    html.setAttribute('data-theme', themeId);
    
    // 兼容性设置
    if (themeId === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
    localStorage.setItem('theme', themeId);
    setIsOpen(false);
    onThemeChange?.(themeId);
  };

  const currentThemeData = themes.find(t => t.id === currentTheme) || themes[0];

  return (
    <div className={`relative ${className}`}>
      {/* 主题选择按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm gap-2 normal-case"
        aria-label="选择主题"
      >
        {/* 当前主题预览 */}
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full border border-base-content/20"
            style={{ backgroundColor: currentThemeData.preview.primary }}
          />
          <span className="hidden sm:inline text-sm">
            {currentThemeData.name}
          </span>
        </div>
        
        {/* 下拉箭头 */}
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </button>

      {/* 主题选择下拉菜单 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 下拉菜单 */}
          <div className="absolute right-0 top-full mt-2 z-20 min-w-64 bg-base-100 rounded-box shadow-lg border border-base-300 p-2">
            <div className="text-sm font-medium text-base-content/70 px-3 py-2 border-b border-base-300 mb-2">
              选择主题
            </div>
            
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 hover:bg-base-200 ${
                  currentTheme === theme.id ? 'bg-primary/10 border border-primary/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* 主题颜色预览 */}
                  <div className="flex gap-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.preview.primary }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.preview.secondary }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.preview.accent }}
                    />
                  </div>
                  
                  {/* 主题信息 */}
                  <div className="flex-1">
                    <div className="font-medium text-base-content">
                      {theme.name}
                    </div>
                    <div className="text-xs text-base-content/60">
                      {theme.description}
                    </div>
                  </div>
                  
                  {/* 选中状态 */}
                  {currentTheme === theme.id && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg 
                        className="w-3 h-3 text-primary-content" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
            
            {/* 系统设置选项 */}
            <div className="border-t border-base-300 mt-2 pt-2">
              <button
                onClick={() => {
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const systemTheme = prefersDark ? 'dark' : 'light';
                  handleThemeChange(systemTheme);
                  localStorage.removeItem('theme'); // 移除手动设置，跟随系统
                }}
                className="w-full text-left p-2 rounded-lg text-sm text-base-content/70 hover:bg-base-200 transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  跟随系统设置
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;