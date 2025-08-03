/**
 * 收件箱数据服务
 * 与Supabase数据库交互的API服务
 */

import { supabase } from '../lib/supabase'
import type {
  EmailRecord,
  EmailDetail,
  EmailFilters,
  InboxStats,
  EmailListResponse,
  EmailDetailResponse,
  InboxStatsResponse,
  UseInboxEmailsParams
} from '../types/inbox.types'

export class InboxService {
  /**
   * 获取用户邮件列表
   */
  static async getUserEmails(params: UseInboxEmailsParams): Promise<EmailListResponse> {
    try {
      if (!params.userId) {
        throw new Error('用户ID不能为空')
      }

      // 调用数据库函数
      const { data, error } = await supabase.rpc('get_user_emails', {
        user_uuid: params.userId,
        limit_count: params.pageSize,
        offset_count: (params.page - 1) * params.pageSize,
        category_filter: params.filters.category || null,
        status_filter: params.filters.status || null,
        search_query: params.filters.search || null
      })

      if (error) {
        console.error('获取邮件列表失败:', error)
        throw error
      }

      return {
        success: true,
        emails: data || [],
        totalCount: data && data.length > 0 ? data[0].total_count : 0
      }

    } catch (error: any) {
      console.error('InboxService.getUserEmails error:', error)
      return {
        success: false,
        emails: [],
        totalCount: 0,
        error: error.message || '获取邮件列表失败'
      }
    }
  }

  /**
   * 获取邮件详情
   */
  static async getEmailDetail(emailId: string, userId: string): Promise<EmailDetailResponse> {
    try {
      if (!emailId || !userId) {
        throw new Error('邮件ID和用户ID不能为空')
      }

      // 调用数据库函数
      const { data, error } = await supabase.rpc('get_email_detail', {
        email_id: emailId,
        user_uuid: userId
      })

      if (error) {
        console.error('获取邮件详情失败:', error)
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error('邮件不存在或无权限访问')
      }

      return {
        success: true,
        email: data[0] as EmailDetail
      }

    } catch (error: any) {
      console.error('InboxService.getEmailDetail error:', error)
      return {
        success: false,
        email: null,
        error: error.message || '获取邮件详情失败'
      }
    }
  }

  /**
   * 获取收件箱统计信息
   */
  static async getInboxStats(userId: string): Promise<InboxStatsResponse> {
    try {
      if (!userId) {
        throw new Error('用户ID不能为空')
      }

      // 调用数据库函数
      const { data, error } = await supabase.rpc('get_user_inbox_stats', {
        user_uuid: userId
      })

      if (error) {
        console.error('获取收件箱统计失败:', error)
        throw error
      }

      return {
        success: true,
        stats: data as InboxStats || {
          total_emails: 0,
          unread_emails: 0,
          verification_emails: 0,
          invoice_emails: 0,
          successful_processing: 0,
          failed_processing: 0,
          emails_with_attachments: 0,
          emails_with_body: 0,
          recent_emails_today: 0,
          recent_emails_week: 0
        }
      }

    } catch (error: any) {
      console.error('InboxService.getInboxStats error:', error)
      return {
        success: false,
        stats: {
          total_emails: 0,
          unread_emails: 0,
          verification_emails: 0,
          invoice_emails: 0,
          successful_processing: 0,
          failed_processing: 0,
          emails_with_attachments: 0,
          emails_with_body: 0,
          recent_emails_today: 0,
          recent_emails_week: 0
        },
        error: error.message || '获取收件箱统计失败'
      }
    }
  }

  /**
   * 直接查询收件箱视图（备用方法）
   */
  static async queryInboxView(userId: string, filters: EmailFilters = {}, page = 1, pageSize = 20): Promise<EmailListResponse> {
    try {
      if (!userId) {
        throw new Error('用户ID不能为空')
      }

      let query = supabase
        .from('v_user_inbox')
        .select('*', { count: 'exact' })
        .eq('mapped_user_id', userId)
        .order('created_at', { ascending: false })

      // 应用过滤器
      if (filters.category) {
        query = query.eq('email_category', filters.category)
      }

      if (filters.status) {
        query = query.eq('overall_status', filters.status)
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(`email_subject.ilike.${searchTerm},from_email.ilike.${searchTerm},from_name.ilike.${searchTerm}`)
      }

      // 分页
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('查询收件箱视图失败:', error)
        throw error
      }

      return {
        success: true,
        emails: (data as EmailRecord[]) || [],
        totalCount: count || 0
      }

    } catch (error: any) {
      console.error('InboxService.queryInboxView error:', error)
      return {
        success: false,
        emails: [],
        totalCount: 0,
        error: error.message || '查询收件箱视图失败'
      }
    }
  }

  /**
   * 清理HTML内容（用于安全显示邮件正文）
   */
  static sanitizeHTML(html: string): string {
    if (!html) return ''
    
    // 增强的HTML清理，移除潜在危险的标签和属性
    let cleanHtml = html
      // 移除危险的脚本相关标签
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      
      // 移除样式标签但保留内联样式（限制安全的样式）
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      
      // 移除事件处理器
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^"'\s>]+/gi, '')
      
      // 移除Javascript URL
      .replace(/javascript:/gi, 'removed:')
      .replace(/vbscript:/gi, 'removed:')
      // 只移除非图片的data: URLs
      .replace(/data:(?!image\/)/gi, 'removed:')
      
      // 移除危险的嵌入标签
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '[iframe内容已移除]')
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '[object内容已移除]')
      .replace(/<embed[^>]*>/gi, '[embed内容已移除]')
      .replace(/<applet[^>]*>[\s\S]*?<\/applet>/gi, '[applet内容已移除]')
      
      // 移除meta标签
      .replace(/<meta[^>]*>/gi, '')
      
      // 移除link标签（可能加载外部资源）
      .replace(/<link[^>]*>/gi, '')
      
      // 清理危险的表单元素
      .replace(/<form[^>]*>/gi, '<div>')
      .replace(/<\/form>/gi, '</div>')
      .replace(/<input[^>]*>/gi, '[输入框已移除]')
      .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, '[文本区域已移除]')
      .replace(/<select[^>]*>[\s\S]*?<\/select>/gi, '[选择框已移除]')
      
      // 处理图片 - 移除外部图片加载但保留结构
      .replace(/<img([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
        // 只允许data: URL的图片（内嵌图片）
        if (src.startsWith('data:image/')) {
          return match
        }
        return `<div class="removed-image" style="display: inline-block; padding: 8px; background: #f0f0f0; border: 1px dashed #ccc; color: #666; font-size: 12px;">[图片已移除: ${src.length > 50 ? src.substring(0, 50) + '...' : src}]</div>`
      })
      
      // 处理链接 - 确保在新窗口打开且添加安全属性
      .replace(/<a([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi, (match, before, href, after) => {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return `<a${before}href="${href}"${after} target="_blank" rel="noopener noreferrer nofollow">`
        }
        return `<span class="removed-link" style="color: #666; text-decoration: underline;">[链接已移除: ${href}]</span>`
      })
    
    return cleanHtml
  }

  /**
   * 格式化邮件日期
   */
  static formatEmailDate(dateString: string | null | undefined): string {
    if (!dateString) return '未知日期'
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMs = now.getTime() - date.getTime()
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
      
      if (diffInDays === 0) {
        return date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      } else if (diffInDays === 1) {
        return '昨天'
      } else if (diffInDays < 7) {
        return `${diffInDays}天前`
      } else {
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      }
    } catch (error) {
      console.error('日期格式化失败:', error)
      return '无效日期'
    }
  }

  /**
   * 截断文本
   */
  static truncateText(text: string | null | undefined, maxLength = 100): string {
    if (!text) return ''
    
    if (text.length <= maxLength) {
      return text
    }
    
    return text.substring(0, maxLength) + '...'
  }
}