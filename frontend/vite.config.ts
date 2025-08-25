import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 排除源文件和开发文件
        globIgnores: ['**/src/**/*', '**/*.tsx', '**/*.ts', '**/node_modules/**/*'],
        // 排除存在CSS类名问题的文件，避免Service Worker构建错误
        dontCacheBustURLsMatching: /\.(js|css)$/,
        // 最大文件大小限制，避免大文件导致的问题
        maximumFileSizeToCacheInBytes: 3000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30天
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7天
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 2 // 2小时
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: '发票助手 - 智能发票管理系统',
        short_name: '发票助手',
        description: '智能发票管理系统，帮助您高效管理和追踪发票',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          {
            src: '/invoice-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: '上传发票',
            short_name: '上传',
            description: '快速上传新发票',
            url: '/upload',
            icons: [
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: '发票管理',
            short_name: '管理',
            description: '查看和管理发票',
            url: '/invoices',
            icons: [
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: '数据统计',
            short_name: '统计',
            description: '查看发票数据统计',
            url: '/dashboard',
            icons: [
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          }
        ],
        edge_side_panel: {
          preferred_width: 400
        }
      },
      devOptions: {
        enabled: false, // 在开发环境下禁用Service Worker，避免缓存干扰
        type: 'module',
        navigateFallbackAllowlist: [/^index.html$/]
      }
    })
  ],
  server: {
    port: 5174,
    open: true
  },
  build: {
    // 生产环境优化
    minify: 'terser',
    sourcemap: false,
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
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // 优化代码分割 - 移动端性能优化
        manualChunks: (id) => {
          // 核心依赖 - 始终加载
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // 数据层 - 按需加载
          if (id.includes('@tanstack/react-query')) {
            return 'data-layer';
          }
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          
          // UI 库 - 移动端优化分包
          if (id.includes('framer-motion')) {
            return 'animations';
          }
          if (id.includes('lucide-react') || id.includes('@heroicons')) {
            return 'icons';
          }
          if (id.includes('daisyui') || id.includes('tailwindcss')) {
            return 'ui-system';
          }
          
          // 图表和可视化 - 懒加载
          if (id.includes('recharts') || id.includes('chart')) {
            return 'charts';
          }
          
          // 移动端专用组件
          if (id.includes('/mobile/') || id.includes('mobile-')) {
            return 'mobile-components';
          }
          
          // 表格组件 - 桌面端为主
          if (id.includes('@tanstack/react-table') || id.includes('react-window')) {
            return 'table-components';
          }
          
          // 文件处理 - 按需加载
          if (id.includes('react-dropzone') || id.includes('jszip')) {
            return 'file-processing';
          }
          
          // 工具库
          if (id.includes('date-fns') || id.includes('axios')) {
            return 'utilities';
          }
          
          // 其他 node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // 文件命名规范
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 构建性能优化
    target: 'esnext',
    chunkSizeWarningLimit: 500, // 降低chunk大小警告阈值，确保移动端性能
    // 移动端优化配置
    cssCodeSplit: true, // CSS 代码分割
    assetsInlineLimit: 4096, // 小于 4kb 的资源内联为 base64
  },
  preview: {
    port: 5174
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
