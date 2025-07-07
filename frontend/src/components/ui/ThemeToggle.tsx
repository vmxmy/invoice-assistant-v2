import React, { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const [isDark, setIsDark] = useState(false);

  // 初始化主题
  useEffect(() => {
    // 检查本地存储的主题偏好
    const savedTheme = localStorage.getItem('theme');
    // 检查系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldUseDark);
    applyTheme(shouldUseDark ? 'dark' : 'light');
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        // 如果没有手动设置主题，跟随系统设置
        setIsDark(e.matches);
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyTheme = (theme: 'light' | 'dark') => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    
    // 同时设置 class 以兼容其他可能的暗色模式实现
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-base-content">
          {isDark ? '暗色' : '亮色'}
        </span>
      )}
      
      <label className="flex cursor-pointer items-center gap-2">
        {/* 太阳图标 */}
        <svg
          className={`h-5 w-5 transition-opacity duration-200 ${
            isDark ? 'opacity-50' : 'opacity-100 text-warning'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>

        {/* 切换开关 */}
        <input
          type="checkbox"
          checked={isDark}
          onChange={toggleTheme}
          className="toggle toggle-primary"
          aria-label="切换主题"
        />

        {/* 月亮图标 */}
        <svg
          className={`h-5 w-5 transition-opacity duration-200 ${
            isDark ? 'opacity-100 text-info' : 'opacity-50'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
          />
        </svg>
      </label>
    </div>
  );
};

export default ThemeToggle;