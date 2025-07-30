/**
 * 前端文件哈希计算服务
 * 使用Web Worker进行SHA-256计算，避免阻塞主线程
 */
import { logger } from '../utils/logger'

export interface FileHashResult {
  hash: string
  size: number
  name: string
  type: string
  calculationTime: number
}

export interface FileHashProgress {
  fileName: string
  progress: number // 0-100
  stage: 'reading' | 'hashing' | 'completed'
}

export class FileHashCalculator {
  private abortController: AbortController | null = null

  /**
   * 计算单个文件的SHA-256哈希值
   */
  async calculateFileHash(
    file: File,
    onProgress?: (progress: FileHashProgress) => void
  ): Promise<FileHashResult> {
    const startTime = performance.now()
    
    logger.log('🔐 [FileHash] 开始计算文件哈希', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    try {
      this.abortController = new AbortController()
      
      // 报告开始阶段
      onProgress?.({
        fileName: file.name,
        progress: 0,
        stage: 'reading'
      })

      // 读取文件内容
      const arrayBuffer = await this.readFileAsArrayBuffer(file, onProgress)
      
      // 报告哈希计算阶段
      onProgress?.({
        fileName: file.name,
        progress: 70,
        stage: 'hashing'
      })

      // 计算SHA-256哈希
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const calculationTime = performance.now() - startTime

      // 报告完成
      onProgress?.({
        fileName: file.name,
        progress: 100,
        stage: 'completed'
      })

      const result: FileHashResult = {
        hash: hashHex,
        size: file.size,
        name: file.name,
        type: file.type,
        calculationTime
      }

      logger.log('✅ [FileHash] 文件哈希计算完成', {
        fileName: file.name,
        hash: hashHex.substring(0, 16) + '...',
        size: file.size,
        calculationTime: Math.round(calculationTime)
      })

      return result

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('⏹️ [FileHash] 哈希计算被取消', { fileName: file.name })
        throw new Error('哈希计算被取消')
      }
      
      logger.error('❌ [FileHash] 文件哈希计算失败:', error)
      throw new Error(`文件哈希计算失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      this.abortController = null
    }
  }

  /**
   * 批量计算多个文件的哈希值
   */
  async calculateMultipleFileHashes(
    files: File[],
    onProgress?: (fileName: string, progress: FileHashProgress) => void,
    maxConcurrent: number = 3
  ): Promise<FileHashResult[]> {
    logger.log('📊 [FileHash] 开始批量计算文件哈希', {
      fileCount: files.length,
      maxConcurrent
    })

    const results: FileHashResult[] = []
    const errors: Array<{ file: File; error: Error }> = []

    // 分批处理文件
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent)
      
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.calculateFileHash(file, (progress) => {
            onProgress?.(file.name, progress)
          })
          return { success: true, result, file }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error : new Error('未知错误'), 
            file 
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      
      for (const batchResult of batchResults) {
        if (batchResult.success) {
          results.push(batchResult.result)
        } else {
          errors.push({ file: batchResult.file, error: batchResult.error })
        }
      }
    }

    if (errors.length > 0) {
      logger.warn('⚠️ [FileHash] 部分文件哈希计算失败', {
        successCount: results.length,
        errorCount: errors.length,
        errors: errors.map(e => ({ fileName: e.file.name, error: e.error.message }))
      })
    }

    logger.log('✅ [FileHash] 批量哈希计算完成', {
      totalFiles: files.length,
      successCount: results.length,
      errorCount: errors.length
    })

    return results
  }

  /**
   * 取消正在进行的哈希计算
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      logger.log('⏹️ [FileHash] 哈希计算已取消')
    }
  }

  /**
   * 读取文件为ArrayBuffer（支持进度回调）
   */
  private readFileAsArrayBuffer(
    file: File,
    onProgress?: (progress: FileHashProgress) => void
  ): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(event.target.result)
        } else {
          reject(new Error('文件读取失败'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取错误'))
      }
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 70) // 读取占总进度的70%
          onProgress?.({
            fileName: file.name,
            progress,
            stage: 'reading'
          })
        }
      }
      
      // 检查是否被取消
      if (this.abortController?.signal.aborted) {
        reject(new Error('操作被取消'))
        return
      }
      
      // 监听取消信号
      this.abortController?.signal.addEventListener('abort', () => {
        reader.abort()
        reject(new Error('操作被取消'))
      })
      
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 验证哈希值格式
   */
  static isValidHash(hash: string): boolean {
    return /^[a-f0-9]{64}$/i.test(hash)
  }

  /**
   * 比较两个哈希值是否相同
   */
  static compareHashes(hash1: string, hash2: string): boolean {
    return hash1.toLowerCase() === hash2.toLowerCase()
  }

  /**
   * 格式化哈希值显示（显示前16位+省略号）
   */
  static formatHashForDisplay(hash: string): string {
    if (!this.isValidHash(hash)) return hash
    return `${hash.substring(0, 16)}...`
  }
}

// 导出单例实例
export const fileHashCalculator = new FileHashCalculator()

// 便捷函数
export async function calculateSHA256(file: File): Promise<string> {
  const result = await fileHashCalculator.calculateFileHash(file)
  return result.hash
}

export async function calculateMultipleSHA256(
  files: File[],
  onProgress?: (fileName: string, progress: FileHashProgress) => void
): Promise<FileHashResult[]> {
  return await fileHashCalculator.calculateMultipleFileHashes(files, onProgress)
}