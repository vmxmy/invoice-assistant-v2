// React Query Provider 配置
import React from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 默认查询配置
      retry: 2, // 失败重试2次
      staleTime: 1 * 60 * 1000, // 1分钟内数据视为新鲜
      gcTime: 5 * 60 * 1000, // 5分钟后清理未使用的数据
      refetchOnWindowFocus: false, // 窗口获得焦点时不自动重新获取
      refetchOnReconnect: true, // 网络重连时重新获取
    },
    mutations: {
      // 默认变更配置
      retry: 1, // 失败重试1次
    },
  },
})

interface QueryProviderProps {
  children: ReactNode
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 开发环境显示React Query调试工具 */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}

export default QueryProvider