import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
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
    // PWA配置
    VitePWA({
      registerType: 'autoUpdate', 
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 排除源文件和开发文件
        globIgnores: [
          '**/src/**/*', 
          '**/*.tsx', 
          '**/*.ts', 
          '**/node_modules/**/*',
          '**/@react-refresh',
          '**/@vite-plugin-pwa/**/*',
          '**/@vite/**/*'
        ],
        // 排除存在CSS类名问题的文件，避免Service Worker构建错误
        dontCacheBustURLsMatching: /\.(js|css)$/,
        // 排除开发时依赖和Vite内部资源
        navigateFallbackDenylist: [
          /^\/@react-refresh/,
          /^\/@vite-plugin-pwa/,
          /^\/@vite/,
          /^\/src\//,
          /\.tsx?$/,
          /^\/node_modules/
        ],
        // 清理策略 - 防止缓存开发资源
        cleanupOutdatedCaches: true,
        // 客户端声明 - 立即激活新版本
        clientsClaim: true,
        skipWaiting: true,
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
        type: 'module'
      },
      // 生产模式配置
      injectRegister: 'auto', // 让Vite自动处理注册
      includeAssets: ['favicon.ico', 'favicon.svg', 'icons/*.png', 'invoice-icon.svg'],
      // 确保只在生产环境启用
      disable: process.env.NODE_ENV === 'development'
    })
  ],
  server: {
    port: 5174,
    open: true
  },
  build: {
    // 生产环境优化 - 使用esbuild避免React 19兼容性问题
    minify: 'esbuild',
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
        // 暂时禁用手动代码分割，让Vite自动处理以避免React 19的模块加载问题
        manualChunks: undefined,
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
