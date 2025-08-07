/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 自定义字体族
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', 'monospace'],
        display: ['Inter', 'Noto Sans SC', 'PingFang SC', 'sans-serif'],
      },
      // 自定义颜色（补充 DaisyUI 主题）
      colors: {
        // 发票系统专用颜色
        invoice: {
          draft: '#94a3b8',      // 草稿状态
          pending: '#fbbf24',    // 待处理
          processing: '#60a5fa', // 处理中
          completed: '#34d399',  // 已完成
          error: '#f87171',      // 错误
        },
        // 扩展的中性色
        gray: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      // 自定义间距
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        // 紧凑模式专用间距
        'compact-xs': '0.375rem', // 6px
        'compact-sm': '0.5rem',   // 8px
        'compact-md': '0.75rem',  // 12px
        'compact-lg': '1rem',     // 16px
        'compact-xl': '1.5rem',   // 24px
      },
      // 自定义字体大小
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.75rem' }],
        '2.5xl': ['1.75rem', { lineHeight: '2rem' }],
      },
      // 自定义动画
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      // 自定义阴影
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      // 自定义边框圆角
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      // 屏幕断点
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
      // 过渡时间
      transitionDuration: {
        '400': '400ms',
      },
      // Z-index 层级
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  // DaisyUI 配置现在在 CSS 中通过 @plugin 指令处理
  plugins: [],
}