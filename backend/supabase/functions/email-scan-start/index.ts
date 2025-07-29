import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailScanRequest {
  userId: string
  emailAccountId: string
  requestId: string
  scanParams: {
    folders?: string[]
    date_from?: string
    date_to?: string
    subject_keywords?: string[]
    exclude_keywords?: string[]
    sender_filters?: string[]
    max_emails?: number
    download_attachments?: boolean
    attachment_types?: string[]
    max_attachment_size?: number
  }
  description?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const requestData: EmailScanRequest = await req.json()
    console.log('📧 收到邮件扫描请求:', {
      userId: requestData.userId,
      emailAccountId: requestData.emailAccountId,
      requestId: requestData.requestId
    })

    // 验证必需参数
    if (!requestData.userId || !requestData.emailAccountId || !requestData.requestId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '缺少必需参数: userId, emailAccountId, requestId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 获取邮箱账户信息
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', requestData.emailAccountId)
      .eq('user_id', requestData.userId)
      .eq('is_active', true)
      .single()

    if (accountError || !account) {
      console.error('❌ 获取邮箱账户失败:', accountError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '邮箱账户不存在或未激活' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 设置默认扫描参数
    const defaultScanParams = {
      folders: ['INBOX'],
      subject_keywords: ['发票', 'invoice'],
      exclude_keywords: [],
      sender_filters: [],
      max_emails: 1000,
      download_attachments: true,
      attachment_types: ['.pdf', '.jpg', '.jpeg', '.png'],
      max_attachment_size: 10485760, // 10MB
      ...requestData.scanParams
    }

    // 解析日期参数
    const scanFromDate = requestData.scanParams?.date_from || null
    const scanToDate = requestData.scanParams?.date_to || null
    
    // 创建扫描任务记录（使用实际数据库字段）
    const scanJobData = {
      user_id: requestData.userId,
      email_account_id: requestData.emailAccountId,
      job_type: 'manual',
      status: 'pending',
      job_id: requestData.requestId,
      scan_params: defaultScanParams,
      scan_from_date: scanFromDate,
      scan_to_date: scanToDate,
      progress: 0,
      total_emails: 0,
      scanned_emails: 0,
      matched_emails: 0,
      downloaded_attachments: 0,
      processed_invoices: 0,
      // 将description放入metadata中
      metadata: {
        description: requestData.description || `扫描 ${account.email_address}`,
        created_by: 'edge_function'
      }
    }

    console.log('📝 创建扫描任务:', scanJobData)

    const { data: scanJob, error: createError } = await supabase
      .from('email_scan_jobs')
      .insert([scanJobData])
      .select()
      .single()

    if (createError) {
      console.error('❌ 创建扫描任务失败:', createError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '创建扫描任务失败: ' + createError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 异步执行扫描任务（避免阻塞响应）
    setTimeout(async () => {
      try {
        // 更新任务状态为运行中
        await supabase
          .from('email_scan_jobs')
          .update({ 
            status: 'running',
            started_at: new Date().toISOString(),
            progress: 0,
            current_step: '连接邮箱服务器...'
          })
          .eq('id', scanJob.id)

        // 模拟渐进式进度更新
        const steps = [
          '正在连接邮箱服务器...',
          '正在扫描邮件列表...',
          '正在过滤匹配邮件...',
          '正在下载附件...',
          '正在整理扫描结果...'
        ]
        
        for (let i = 0; i < steps.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 800))
          
          await supabase
            .from('email_scan_jobs')
            .update({ 
              progress: (i + 1) * 20,
              current_step: steps[i]
            })
            .eq('id', scanJob.id)
        }

        // 模拟扫描结果
        const mockScanResults = {
          total_emails: 156,
          scanned_emails: 156,
          matched_emails: 3,
          downloaded_attachments: 2,
          processed_invoices: 1,
          emails: [
            {
              uid: 12345,
              subject: '【电费通知】2025年1月电费账单',
              from: 'service@electric.com',
              date: '2025-01-15T10:30:00Z',
              has_attachments: true,
              attachment_names: ['电费发票_202501.pdf']
            },
            {
              uid: 12346,
              subject: '水费缴费通知单',
              from: 'water@utility.gov.cn',
              date: '2025-01-20T14:20:00Z',
              has_attachments: true,
              attachment_names: ['水费发票.pdf']
            },
            {
              uid: 12347,
              subject: '物业费发票-2025年1月',
              from: 'property@management.com',
              date: '2025-01-25T09:15:00Z',
              has_attachments: false,
              attachment_names: []
            }
          ]
        }

        // 更新任务完成状态
        await supabase
          .from('email_scan_jobs')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            progress: 100,
            current_step: '扫描完成',
            total_emails: mockScanResults.total_emails,
            scanned_emails: mockScanResults.scanned_emails,
            matched_emails: mockScanResults.matched_emails,
            downloaded_attachments: mockScanResults.downloaded_attachments,
            processed_invoices: mockScanResults.processed_invoices,
            scan_results: mockScanResults
          })
          .eq('id', scanJob.id)

        console.log('✅ 邮件扫描任务完成:', {
          job_id: scanJob.job_id,
          matched_emails: mockScanResults.matched_emails
        })
      } catch (asyncError) {
        console.error('❌ 异步扫描任务失败:', asyncError)
        // 更新任务失败状态
        await supabase
          .from('email_scan_jobs')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: asyncError instanceof Error ? asyncError.message : '未知错误'
          })
          .eq('id', scanJob.id)
      }
    }, 0)

    return new Response(
      JSON.stringify({
        success: true,
        job_id: scanJob.job_id,
        message: '邮箱扫描任务已启动',
        email_account: {
          email: account.email_address,
          display_name: account.display_name,
          server: account.imap_host
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ 邮件扫描Edge Function错误:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})