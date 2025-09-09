import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    exclude: [],
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    port: 5174,
    open: true
  },
  build: {
    // 临时禁用混淆以测试是否解决问题
    minify: false,
    sourcemap: true, // 开启源码映射便于调试
    // 优化预加载策略以减少警告
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps) => {
        // 只预加载关键的依赖，过滤掉可能不立即使用的资源
        return deps.filter(dep => {
          // 过滤掉字体文件和图标文件的预加载
          if (dep.includes('.woff2') || dep.includes('icon-')) {
            return false;
          }
          // 保持核心JS文件的预加载
          return true;
        });
      }
    },
    terserOptions: {
      compress: {
        // 移除console日志
        drop_console: false, // 暂时保留 console 用于调试
        drop_debugger: true,
        // 保留函数名，防止混淆导致的错误
        keep_fnames: true,
        keep_classnames: true,
      },
      mangle: {
        // 保留特定的函数和类名
        keep_fnames: true,
        keep_classnames: true,
        reserved: ['info', 'warn', 'error', 'log', 'debug'] // 保留常用的日志方法名
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@headlessui/react', 'framer-motion', 'lucide-react'],
          utils: ['date-fns', 'clsx', 'axios'],
          charts: ['recharts']
        }
      }
    }
  },
  // 环境变量类型提示
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT_HASH__: JSON.stringify(
      process.env.VITE_COMMIT_HASH || 
      (function() {
        try {
          return execSync('git rev-parse HEAD').toString().trim();
        } catch {
          return 'unknown';
        }
      })()
    )
  }
})