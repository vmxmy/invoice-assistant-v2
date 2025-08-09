import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
        enabled: true,
        // 解决开发模式下Service Worker CSS处理问题
        type: 'module',
        // 只允许入口页面，避免CSS类名识别问题
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
