// 统一日志工具 - 根据环境变量控制日志输出
// 生产环境下不输出调试信息，避免敏感信息泄露

const isDev = import.meta.env.DEV

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
  
  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args)
    }
  },
  
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args)
    }
  }
}

// 在生产环境中只允许错误日志
export const safeLogger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
  
  error: (...args: any[]) => {
    // 错误信息在所有环境中都应该输出，但要避免敏感信息
    console.error(...args)
  },
  
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  }
}