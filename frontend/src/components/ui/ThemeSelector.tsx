import React, { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';

interface ThemeSelectorProps {
  className?: string;
  showLabel?: boolean;
}

// DaisyUI 官方主题列表
const DAISYUI_THEMES = [
  { value: 'light', label: '明亮', category: '浅色' },
  { value: 'dark', label: '暗黑', category: '深色' },
  { value: 'cupcake', label: '纸杯蛋糕', category: '浅色' },
  { value: 'bumblebee', label: '大黄蜂', category: '浅色' },
  { value: 'emerald', label: '翡翠', category: '浅色' },
  { value: 'corporate', label: '企业', category: '浅色' },
  { value: 'synthwave', label: '合成波', category: '深色' },
  { value: 'retro', label: '复古', category: '浅色' },
  { value: 'cyberpunk', label: '赛博朋克', category: '浅色' },
  { value: 'valentine', label: '情人节', category: '浅色' },
  { value: 'halloween', label: '万圣节', category: '深色' },
  { value: 'garden', label: '花园', category: '浅色' },
  { value: 'forest', label: '森林', category: '深色' },
  { value: 'aqua', label: '水族', category: '深色' },
  { value: 'lofi', label: 'Lo-Fi', category: '浅色' },
  { value: 'pastel', label: '粉彩', category: '浅色' },
  { value: 'fantasy', label: '幻想', category: '浅色' },
  { value: 'wireframe', label: '线框', category: '浅色' },
  { value: 'black', label: '纯黑', category: '深色' },
  { value: 'luxury', label: '奢华', category: '深色' },
  { value: 'dracula', label: '德古拉', category: '深色' },
  { value: 'cmyk', label: 'CMYK', category: '浅色' },
  { value: 'autumn', label: '秋天', category: '浅色' },
  { value: 'business', label: '商务', category: '深色' },
  { value: 'acid', label: '酸性', category: '浅色' },
  { value: 'lemonade', label: '柠檬水', category: '浅色' },
  { value: 'night', label: '夜晚', category: '深色' },
  { value: 'coffee', label: '咖啡', category: '深色' },
  { value: 'winter', label: '冬天', category: '浅色' },
  { value: 'dim', label: '暗淡', category: '深色' },
  { value: 'nord', label: 'Nord', category: '浅色' },
  { value: 'sunset', label: '日落', category: '深色' },
];

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const [currentTheme, setCurrentTheme] = useState('light');

  // 初始化主题
  useEffect(() => {
    // 检查本地存储的主题偏好
    const savedTheme = localStorage.getItem('theme');
    // 检查系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const defaultTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setCurrentTheme(defaultTheme);
    applyTheme(defaultTheme);
  }, []);

  const applyTheme = (theme: string) => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    
    // 判断是否为深色主题，用于某些组件的兼容性
    const isDarkTheme = DAISYUI_THEMES.find(t => t.value === theme)?.category === '深色';
    if (isDarkTheme) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  const selectTheme = (theme: string) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  };

  const currentThemeData = DAISYUI_THEMES.find(t => t.value === currentTheme);

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div 
        tabIndex={0} 
        role="button"
        className="btn btn-ghost btn-sm gap-2"
      >
        <Palette className="w-4 h-4" />
        {showLabel && (
          <span className="hidden sm:inline">{currentThemeData?.label || '主题'}</span>
        )}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      <div 
        tabIndex={0} 
        className="dropdown-content z-[1] shadow-xl bg-base-100 rounded-box mt-3 border border-base-300 p-0 w-auto max-h-[70vh] overflow-y-auto"
      >
        {/* 浅色主题组 */}
        <div className="sticky top-0 bg-base-200/90 backdrop-blur-sm px-2 py-1 border-b border-base-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-base-content/60">浅色主题</span>
        </div>
        <ul className="menu menu-xs p-0">
          {DAISYUI_THEMES.filter(theme => theme.category === '浅色').map((theme) => (
            <li key={theme.value}>
              <button
                onClick={() => selectTheme(theme.value)}
                className={`justify-start gap-2 py-1.5 ${
                  currentTheme === theme.value ? 'active' : ''
                }`}
                data-theme={theme.value}
              >
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-3 rounded-sm bg-primary"></div>
                  <div className="w-1.5 h-3 rounded-sm bg-secondary"></div>
                  <div className="w-1.5 h-3 rounded-sm bg-accent"></div>
                </div>
                <span className="text-xs">{theme.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* 深色主题组 */}
        <div className="sticky top-0 bg-base-200/90 backdrop-blur-sm px-2 py-1 border-y border-base-300 mt-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-base-content/60">深色主题</span>
        </div>
        <ul className="menu menu-xs p-0">
          {DAISYUI_THEMES.filter(theme => theme.category === '深色').map((theme) => (
            <li key={theme.value}>
              <button
                onClick={() => selectTheme(theme.value)}
                className={`justify-start gap-2 py-1.5 ${
                  currentTheme === theme.value ? 'active' : ''
                }`}
                data-theme={theme.value}
              >
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-3 rounded-sm bg-primary"></div>
                  <div className="w-1.5 h-3 rounded-sm bg-secondary"></div>
                  <div className="w-1.5 h-3 rounded-sm bg-accent"></div>
                </div>
                <span className="text-xs">{theme.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ThemeSelector;