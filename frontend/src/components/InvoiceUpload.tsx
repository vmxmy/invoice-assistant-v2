/**
 * 发票上传组件
 * 支持拖拽和点击上传PDF文件，集成哈希计算和去重检查
 */
import React, { useState, useRef } from 'react'
import { fileHashCalculator } from '../services/fileHashCalculator'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

interface InvoiceUploadProps {
  onUpload?: (files: File[]) => void
  className?: string
}

interface FileProcessingState {
  [fileName: string]: {
    status: 'pending' | 'hashing' | 'checking_duplicate' | 'uploading' | 'processing_ocr' | 'completed' | 'duplicate' | 'error'
    progress: number
    message: string
    error?: string
    isDuplicate?: boolean
    duplicateInfo?: any
  }
}

export function InvoiceUpload({ onUpload, className = '' }: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileStates, setFileStates] = useState<FileProcessingState>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const pdfFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    )

    if (pdfFiles.length === 0) {
      alert('请选择PDF格式的发票文件')
      return
    }

    if (pdfFiles.length > 5) {
      alert('一次最多上传5个文件')
      return
    }

    setUploading(true)
    
    // 初始化文件状态
    const initialStates: FileProcessingState = {}
    pdfFiles.forEach(file => {
      initialStates[file.name] = {
        status: 'pending',
        progress: 0,
        message: '准备处理...'
      }
    })
    setFileStates(initialStates)

    try {
      // 处理每个文件
      const results = await Promise.allSettled(
        pdfFiles.map(file => processFile(file))
      )

      // 统计结果
      const successful = results.filter(r => r.status === 'fulfilled').length
      const duplicates = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any)?.isDuplicate
      ).length
      const errors = results.filter(r => r.status === 'rejected').length

      // 显示结果摘要
      let message = `处理完成: `
      if (successful > 0) message += `${successful - duplicates}个新文件上传成功`
      if (duplicates > 0) message += `，${duplicates}个重复文件已跳过`
      if (errors > 0) message += `，${errors}个文件处理失败`

      alert(message)
      onUpload?.(pdfFiles)
      
    } catch (error) {
      console.error('批量处理失败:', error)
      alert('文件处理失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const processFile = async (file: File) => {
    const fileName = file.name

    try {
      // 第1步: 计算文件哈希
      updateFileState(fileName, {
        status: 'hashing',
        progress: 0,
        message: '正在计算文件哈希...'
      })

      const hashResult = await fileHashCalculator.calculateFileHash(
        file,
        (progress) => {
          updateFileState(fileName, {
            status: 'hashing',
            progress: Math.round(progress.progress * 0.3), // 哈希计算占总进度30%
            message: `正在计算哈希: ${progress.progress}%`
          })
        }
      )

      logger.log('📋 [Upload] 文件哈希计算完成', {
        fileName,
        hash: hashResult.hash.substring(0, 16) + '...',
        size: hashResult.size,
        calculationTime: hashResult.calculationTime
      })

      // 第2步: 调用Edge Function处理（包含去重检查）
      updateFileState(fileName, {
        status: 'checking_duplicate',
        progress: 30,
        message: '检查文件是否重复...'
      })

      const result = await processFileWithEdgeFunction(file, hashResult.hash)

      if (result.isDuplicate) {
        // 检查是否是已删除文件的重复
        if (result.deletedFileInfo?.canRestore) {
          // 显示恢复选项
          const shouldRestore = confirm(
            `检测到相同文件在回收站中:\n发票号: ${result.deletedFileInfo.deletedInvoice.invoice_number}\n销售方: ${result.deletedFileInfo.deletedInvoice.seller_name}\n\n是否恢复此发票？`
          )
          
          if (shouldRestore) {
            // 恢复发票
            updateFileState(fileName, {
              status: 'processing_ocr',
              progress: 80,
              message: '正在恢复发票...'
            })
            
            try {
              // 直接使用Supabase恢复发票
              const { error } = await supabase
                .from('invoices')
                .update({ 
                  status: 'active',
                  deleted_at: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', result.deletedFileInfo.deletedInvoice.id)
              
              if (!error) {
                updateFileState(fileName, {
                  status: 'completed',
                  progress: 100,
                  message: '发票恢复成功！'
                })
                return { success: true, isDuplicate: false, data: result.deletedFileInfo.deletedInvoice }
              } else {
                throw new Error(error.message || '恢复失败')
              }
            } catch (restoreError) {
              updateFileState(fileName, {
                status: 'error',
                progress: 0,
                message: '恢复失败',
                error: '无法恢复发票'
              })
              throw restoreError
            }
          } else {
            // 用户选择不恢复
            updateFileState(fileName, {
              status: 'duplicate',
              progress: 100,
              message: '文件在回收站中，已跳过上传',
              isDuplicate: true
            })
            return { success: true, isDuplicate: true, data: null }
          }
        } else {
          // 普通重复文件
          updateFileState(fileName, {
            status: 'duplicate',
            progress: 100,
            message: `文件重复，已跳过处理`,
            isDuplicate: true,
            duplicateInfo: result.existingData
          })
          return { success: true, isDuplicate: true, data: result.existingData }
        }
      } else {
        // 新文件处理完成
        updateFileState(fileName, {
          status: 'completed',
          progress: 100,
          message: '文件处理完成！'
        })

        return { success: true, isDuplicate: false, data: result.data }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      updateFileState(fileName, {
        status: 'error',
        progress: 0,
        message: '处理失败',
        error: errorMessage
      })

      logger.error('❌ [Upload] 文件处理失败:', {
        fileName,
        error: errorMessage
      })

      throw error
    }
  }

  const processFileWithEdgeFunction = async (file: File, fileHash: string) => {
    // 调用新的去重OCR Edge Function
    // 传递文件和哈希值，Edge Function会先检查重复再处理
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileHash', fileHash)
    formData.append('fileSize', file.size.toString())
    formData.append('fileName', file.name)

    try {
      // 获取用户认证token
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        logger.error('❌ [Upload] 获取认证失败:', authError)
        throw new Error('认证失败，请重新登录')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      
      logger.log('📡 [Upload] 发起去重OCR Edge Function请求', {
        fileName: file.name,
        fileHash: fileHash.substring(0, 16) + '...',
        hasToken: !!session?.access_token
      })

      // 调用新的去重OCR Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/ocr-dedup-complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'X-User-ID': session?.user?.id || 'anonymous'
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('❌ [Upload] Edge Function调用失败:', {
          status: response.status,
          error: errorText
        })
        throw new Error(`Edge Function处理失败: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      
      // 将结果保存到全局变量以便调试
      if (typeof window !== 'undefined') {
        (window as any).lastUploadResult = result
      }
      
      logger.log('✅ [Upload] Edge Function处理完成', {
        success: result.success,
        isDuplicate: result.isDuplicate,
        processingTime: result.processingTime,
        steps: result.steps,
        ocrData: result.data
      })

      return result
      
    } catch (error) {
      logger.error('❌ [Upload] Edge Function处理异常:', error)
      throw new Error(`Edge Function处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const updateFileState = (fileName: string, update: Partial<FileProcessingState[string]>) => {
    setFileStates(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        ...update
      }
    }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-base-content/20 hover:border-primary hover:bg-primary/5'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {uploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full max-w-md space-y-3">
              {Object.entries(fileStates).map(([fileName, state]) => (
                <div key={fileName} className="bg-base-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate max-w-[200px]" title={fileName}>
                      {fileName}
                    </span>
                    <div className="flex items-center space-x-2">
                      {state.status === 'duplicate' && (
                        <span className="badge badge-warning badge-sm">重复</span>
                      )}
                      {state.status === 'completed' && (
                        <span className="badge badge-success badge-sm">完成</span>
                      )}
                      {state.status === 'error' && (
                        <span className="badge badge-error badge-sm">失败</span>
                      )}
                      {!['duplicate', 'completed', 'error'].includes(state.status) && (
                        <div className="loading loading-spinner loading-xs"></div>
                      )}
                    </div>
                  </div>
                  
                  {/* 进度条 */}
                  <div className="w-full bg-base-300 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        state.status === 'error' ? 'bg-error' :
                        state.status === 'duplicate' ? 'bg-warning' :
                        state.status === 'completed' ? 'bg-success' :
                        'bg-primary'
                      }`}
                      style={{ width: `${state.progress}%` }}
                    ></div>
                  </div>
                  
                  {/* 状态消息 */}
                  <p className={`text-xs ${
                    state.status === 'error' ? 'text-error' :
                    state.status === 'duplicate' ? 'text-warning' :
                    state.status === 'completed' ? 'text-success' :
                    'text-base-content/60'
                  }`}>
                    {state.message}
                  </p>
                  
                  {/* 错误详情 */}
                  {state.error && (
                    <p className="text-xs text-error mt-1 font-mono">
                      {state.error}
                    </p>
                  )}
                  
                  {/* 重复文件信息 */}
                  {state.isDuplicate && state.duplicateInfo && (
                    <div className="mt-2 text-xs text-base-content/70">
                      <p>上次上传: {new Date(state.duplicateInfo.last_accessed_at).toLocaleString()}</p>
                      {state.duplicateInfo.invoice_data?.invoice_number && (
                        <p>发票号: {state.duplicateInfo.invoice_data.invoice_number}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold">正在处理文件...</h3>
              <p className="text-sm text-base-content/60">
                计算哈希 → 检查重复 → OCR识别 → 保存数据
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">
              {isDragging ? '📥' : '📤'}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {isDragging ? '松开以上传文件' : '上传发票文件'}
              </h3>
              <p className="text-sm text-base-content/60 mb-4">
                支持PDF格式，可拖拽文件到此处或点击选择
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-base-content/50">
                <span className="badge badge-outline">PDF格式</span>
                <span className="badge badge-outline">多文件上传</span>
                <span className="badge badge-outline">最多5个文件</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}