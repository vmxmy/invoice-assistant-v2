/**
 * 发票导出Hook
 * 支持单个和批量导出发票
 */
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  seller_name: string
  buyer_name?: string
  total_amount: number
  status: string
  source: string
  invoice_type?: string
}

interface ExportProgress {
  invoiceId: string
  invoiceNumber: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  progress: number
  error?: string
  filePath?: string
  downloadUrl?: string
}

// 生成智能文件名：[消费日期-消费类型-销售方-金额-发票号].pdf
const generateSmartFileName = (invoice: Invoice | any) => {
  const parts = []
  
  // 消费日期
  if (invoice.created_at) {
    parts.push(invoice.created_at.split('T')[0])
  }
  
  // 消费类型 (发票类型)
  if (invoice.invoice_type) {
    parts.push(invoice.invoice_type)
  }
  
  // 销售方 (截取前10个字符避免文件名太长)
  if (invoice.seller_name) {
    const sellerName = invoice.seller_name.length > 10 
      ? invoice.seller_name.substring(0, 10) 
      : invoice.seller_name
    parts.push(sellerName)
  }
  
  // 金额
  if (invoice.total_amount > 0) {
    parts.push(`${invoice.total_amount}元`)
  }
  
  // 发票号
  if (invoice.invoice_number) {
    parts.push(invoice.invoice_number)
  }
  
  // 如果没有足够信息，使用发票号作为备选
  if (parts.length === 0) {
    return `${invoice.invoice_number || 'unknown'}.pdf`
  }
  
  return `${parts.join('-')}.pdf`
}

export function useInvoiceExport() {
  const { user } = useAuthContext()
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress[]>([])
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)

  // 单个发票导出
  const exportSingle = async (invoice: Invoice) => {
    if (!user?.id) return

    try {
      setIsExporting(true)
      setExportProgress([{
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: 'downloading',
        progress: 0,
        filePath: '',
        downloadUrl: ''
      }])
      setIsProgressModalOpen(true)

      // 获取发票文件路径
      const { data: invoiceData, error: fetchError } = await supabase
        .from('invoices')
        .select('file_path')
        .eq('id', invoice.id)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !invoiceData?.file_path) {
        throw new Error('发票文件不存在')
      }

      // 生成签名下载地址（因为存储桶是私有的）
      const { data: urlData, error: urlError } = await supabase.storage
        .from('invoice-files')
        .createSignedUrl(invoiceData.file_path, 3600) // 1小时有效期

      if (urlError) {
        console.error('生成签名URL失败:', urlError)
        throw new Error(`无法生成下载链接: ${urlError.message}`)
      }

      // 更新进度，显示文件路径和下载地址
      setExportProgress(prev => prev.map(item => 
        item.invoiceId === invoice.id 
          ? { 
              ...item, 
              filePath: invoiceData.file_path,
              downloadUrl: urlData?.signedUrl || '',
              progress: 25
            }
          : item
      ))

      // 从Supabase Storage下载文件
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('invoice-files')
        .download(invoiceData.file_path)

      if (downloadError || !fileData) {
        throw new Error('下载发票文件失败')
      }

      // 创建下载链接
      const url = URL.createObjectURL(fileData)
      const link = document.createElement('a')
      link.href = url
      
      link.download = generateSmartFileName(invoice)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // 更新进度
      setExportProgress(prev => prev.map(item => 
        item.invoiceId === invoice.id 
          ? { ...item, status: 'completed', progress: 100 }
          : item
      ))

      // 延迟关闭进度框
      setTimeout(() => {
        setIsProgressModalOpen(false)
        setExportProgress([])
      }, 1500)

    } catch (error) {
      console.error('导出发票失败:', error)
      setExportProgress(prev => prev.map(item => 
        item.invoiceId === invoice.id 
          ? { 
              ...item, 
              status: 'error', 
              error: error instanceof Error ? error.message : '导出失败'
            }
          : item
      ))
    } finally {
      setIsExporting(false)
    }
  }

  // 批量发票导出
  const exportBatch = async (invoices: Invoice[]) => {
    if (!user?.id || invoices.length === 0) return

    try {
      setIsExporting(true)
      
      // 初始化进度
      const initialProgress: ExportProgress[] = invoices.map(invoice => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: 'pending',
        progress: 0,
        filePath: '',
        downloadUrl: ''
      }))
      setExportProgress(initialProgress)
      setIsProgressModalOpen(true)

      // 获取所有发票的完整信息（用于智能文件命名）
      const { data: invoicesData, error: fetchError } = await supabase
        .from('invoices')
        .select('id, file_path, invoice_number, created_at, invoice_type, seller_name, total_amount')
        .in('id', invoices.map(inv => inv.id))
        .eq('user_id', user.id)

      if (fetchError) {
        throw new Error('获取发票文件信息失败')
      }

      // 使用JSZip创建压缩包
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      let completedCount = 0
      const totalCount = invoices.length

      // 并发下载文件（限制并发数）
      const concurrencyLimit = 3
      const chunks: typeof invoicesData[] = []
      
      for (let i = 0; i < invoicesData.length; i += concurrencyLimit) {
        chunks.push(invoicesData.slice(i, i + concurrencyLimit))
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(async (invoiceData) => {
            try {
              // 生成签名下载地址（因为存储桶是私有的）
              const { data: urlData, error: urlError } = await supabase.storage
                .from('invoice-files')
                .createSignedUrl(invoiceData.file_path, 3600) // 1小时有效期

              if (urlError) {
                console.error('生成签名URL失败:', urlError)
                throw new Error(`无法生成下载链接: ${urlError.message}`)
              }

              // 更新状态为下载中，并添加文件路径和下载地址
              setExportProgress(prev => prev.map(item => 
                item.invoiceId === invoiceData.id 
                  ? { 
                      ...item, 
                      status: 'downloading',
                      filePath: invoiceData.file_path,
                      downloadUrl: urlData?.signedUrl || ''
                    }
                  : item
              ))

              if (!invoiceData.file_path) {
                throw new Error('文件路径不存在')
              }

              // 下载文件
              const { data: fileData, error: downloadError } = await supabase.storage
                .from('invoice-files')
                .download(invoiceData.file_path)

              if (downloadError || !fileData) {
                throw new Error('下载文件失败')
              }

              // 添加到压缩包，使用智能文件名
              const smartFileName = generateSmartFileName(invoiceData)
              zip.file(smartFileName, fileData)

              // 更新进度
              completedCount++
              const progress = Math.round((completedCount / totalCount) * 100)
              
              setExportProgress(prev => prev.map(item => 
                item.invoiceId === invoiceData.id 
                  ? { ...item, status: 'completed', progress: 100 }
                  : item
              ))

            } catch (error) {
              console.error(`导出发票 ${invoiceData.invoice_number} 失败:`, error)
              setExportProgress(prev => prev.map(item => 
                item.invoiceId === invoiceData.id 
                  ? { 
                      ...item, 
                      status: 'error', 
                      error: error instanceof Error ? error.message : '导出失败'
                    }
                  : item
              ))
            }
          })
        )
      }

      // 生成压缩包
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      // 下载压缩包
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `发票批量导出_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // 延迟关闭进度框
      setTimeout(() => {
        setIsProgressModalOpen(false)
        setExportProgress([])
      }, 2000)

    } catch (error) {
      console.error('批量导出失败:', error)
      // 标记所有未完成的为错误状态
      setExportProgress(prev => prev.map(item => 
        item.status === 'pending' || item.status === 'downloading'
          ? { 
              ...item, 
              status: 'error', 
              error: error instanceof Error ? error.message : '导出失败'
            }
          : item
      ))
    } finally {
      setIsExporting(false)
    }
  }

  // 取消导出
  const cancelExport = () => {
    setIsExporting(false)
    setIsProgressModalOpen(false)
    setExportProgress([])
  }

  // 关闭进度模态框
  const closeProgressModal = () => {
    if (!isExporting) {
      setIsProgressModalOpen(false)
      setExportProgress([])
    }
  }

  // 计算总体进度
  const totalProgress = exportProgress.length > 0 
    ? Math.round(
        exportProgress.reduce((sum, item) => sum + item.progress, 0) / exportProgress.length
      )
    : 0

  return {
    isExporting,
    exportProgress,
    isProgressModalOpen,
    totalProgress,
    exportSingle,
    exportBatch,
    cancelExport,
    closeProgressModal
  }
}