import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: true
  },
  build: {
    // 生产环境优化
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        // 移除console日志
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // 优化代码分割
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react'],
          charts: ['recharts'],
        },
        // 文件命名规范
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 构建性能优化
    target: 'esnext',
    chunkSizeWarningLimit: 1000
  },
  preview: {
    port: 5174
  },
  // 环境变量类型提示
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})
