import { BaseSupabaseService } from './base.service'
import { supabase } from '../supabase'

export interface EmailTaskStats {
  total_tasks: number
  pending_count: number
  processing_count: number
  completed_count: number
  failed_count: number
  retry_count: number
  last_24h_count: number
  last_7d_count: number
  total_processed: number
  total_failed: number
  avg_processing_time: number
  last_activity: string | null
  success_rate: number
}

export interface EmailAccountStats {
  total_accounts: number
  active_accounts: number
  verified_accounts: number
  last_scan_time: string | null
  connection_rate: number
}

export interface EmailDashboardStats {
  tasks: EmailTaskStats
  accounts: EmailAccountStats
}

export class EmailSupabaseService extends BaseSupabaseService<any> {
  constructor() {
    super('email_scan_jobs', 'v_email_task_details')
  }

  // 获取邮件任务统计
  async getTaskStats(): Promise<EmailTaskStats> {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('v_email_task_stats')
      .select('*')
      .eq('user_id', session.session.user.id)
      .maybeSingle() // 使用 maybeSingle 而不是 single

    if (error) {
      console.error('获取邮件任务统计失败:', error)
      throw error
    }

    // 如果没有数据，返回默认值
    if (!data) {
      return {
        total_tasks: 0,
        pending_count: 0,
        processing_count: 0,
        completed_count: 0,
        failed_count: 0,
        retry_count: 0,
        last_24h_count: 0,
        last_7d_count: 0,
        total_processed: 0,
        total_failed: 0,
        avg_processing_time: 0,
        last_activity: null,
        success_rate: 0
      }
    }

    return data
  }

  // 获取邮箱账户统计
  async getAccountStats(): Promise<EmailAccountStats> {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('v_email_account_stats')
      .select('*')
      .eq('user_id', session.session.user.id)
      .maybeSingle() // 使用 maybeSingle 而不是 single

    if (error) {
      console.error('获取邮箱账户统计失败:', error)
      throw error
    }

    // 如果没有数据，返回默认值
    if (!data) {
      return {
        total_accounts: 0,
        active_accounts: 0,
        verified_accounts: 0,
        last_scan_time: null,
        connection_rate: 0
      }
    }

    return data
  }

  // 获取最近的任务列表
  async getRecentTasks(limit: number = 10) {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('v_email_task_details')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('获取最近任务失败:', error)
      return []
    }

    return data || []
  }

  // 获取任务统计汇总（用于仪表盘）
  async getDashboardStats(): Promise<EmailDashboardStats> {
    const [taskStats, accountStats] = await Promise.all([
      this.getTaskStats(),
      this.getAccountStats()
    ])

    return {
      tasks: taskStats,
      accounts: accountStats
    }
  }

  // 实时订阅任务状态变化
  subscribeToTaskUpdates(callback: (payload: any) => void) {
    const channel = supabase.channel('email_task_updates')
    
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'email_scan_jobs'
      },
      (payload) => {
        console.log('邮件任务更新:', payload)
        callback(payload)
      }
    )
    
    return channel.subscribe()
  }
}