import React, { useState, useEffect } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import SimpleEmailConfigModal from '../components/modals/SimpleEmailConfigModal'
import { toast } from 'react-hot-toast'

interface EmailConfig {
  id: string
  email_address: string
  display_name: string | null
  created_at: string
  is_active: boolean
}

const SimpleEmailConfigPage: React.FC = () => {
  const { user } = useAuthContext()
  const [configs, setConfigs] = useState<EmailConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // 获取邮箱配置
  const fetchConfigs = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      // 调试信息：显示当前用户ID
      console.log('🔍 SimpleEmailConfigPage - 获取配置，当前用户:', {
        userId: user.id,
        userEmail: user.email
      })
      
      const { data, error } = await supabase
        .from('email_accounts')
        .select('id, email_address, display_name, created_at, is_active')
        .eq('user_id', user.id)
        .eq('imap_host', 'forwarding-only') // 只获取转发配置
        .order('created_at', { ascending: false })

      if (error) {
        console.error('获取邮箱配置失败:', error)
        toast.error('获取邮箱配置失败')
        return
      }

      setConfigs(data || [])
    } catch (error) {
      console.error('获取邮箱配置失败:', error)
      toast.error('获取邮箱配置失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 删除配置
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此邮箱配置吗？')) return

    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) {
        console.error('删除配置失败:', error)
        toast.error('删除配置失败')
        return
      }

      toast.success('配置删除成功')
      fetchConfigs()
    } catch (error) {
      console.error('删除配置失败:', error)
      toast.error('删除配置失败')
    }
  }

  // 切换状态
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('email_accounts')
        .update({ is_active: !currentActive })
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) {
        console.error('更新状态失败:', error)
        toast.error('更新状态失败')
        return
      }

      toast.success(`配置已${!currentActive ? '启用' : '禁用'}`)
      fetchConfigs()
    } catch (error) {
      console.error('更新状态失败:', error)
      toast.error('更新状态失败')
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [user])

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl"></div>
        <svg className="w-24 h-24 mx-auto text-base-300 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">暂无邮箱配置</h3>
      <p className="text-base-content/60 mb-6 max-w-sm text-center">
        配置转发邮箱地址，用于 Edge Function 身份关联和邮件转发功能
      </p>
      <button 
        className="btn btn-primary"
        onClick={() => setShowAddModal(true)}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        添加邮箱配置
      </button>
    </div>
  )

  const renderConfigCard = (config: EmailConfig) => (
    <div key={config.id} className="card bg-base-100 shadow-soft border border-base-200/50">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {config.display_name || config.email_address}
            </h3>
            {config.display_name && (
              <p className="text-base-content/70 text-sm">{config.email_address}</p>
            )}
            <p className="text-base-content/50 text-xs mt-1">
              创建时间: {new Date(config.created_at).toLocaleString()}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`badge ${config.is_active ? 'badge-success' : 'badge-neutral'}`}>
              {config.is_active ? '启用' : '禁用'}
            </div>
            
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content z-[10] menu p-2 shadow-lg bg-base-100 rounded-box w-40 border border-base-200/50">
                <li>
                  <a onClick={() => handleToggleActive(config.id, config.is_active)}>
                    {config.is_active ? '禁用' : '启用'}
                  </a>
                </li>
                <li className="text-error">
                  <a onClick={() => handleDelete(config.id)}>删除</a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-base-200/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>用于 Edge Function 身份关联，无需密码配置</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Layout title="邮箱配置">
      <div className="min-h-screen bg-base-200/40">
        <div className="container mx-auto p-4 max-w-4xl space-y-6">
          {/* 页面头部 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-base-content">邮箱配置</h1>
                <p className="text-base-content/70 mt-2">
                  {configs.length > 0 ? (
                    <span className="badge badge-neutral badge-sm">
                      共 {configs.length} 个配置
                    </span>
                  ) : (
                    '配置转发邮箱地址，用于 Edge Function 身份关联'
                  )}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={fetchConfigs}
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新
                </button>
                
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddModal(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  添加配置
                </button>
              </div>
            </div>
          </div>

          {/* 功能说明 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-info mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-lg mb-2">配置说明</h3>
                <div className="text-base-content/70 space-y-2">
                  <p>• 此模块专门用于 Edge Function 身份关联，无需复杂的IMAP/SMTP配置</p>
                  <p>• 只需提供用于转发的邮箱地址，系统将自动处理相关逻辑</p>
                  <p>• 配置完成后，可在发票处理流程中使用此邮箱进行身份验证</p>
                </div>
              </div>
            </div>
          </div>

          {/* 配置列表 */}
          <div className="bg-base-100 rounded-lg shadow-soft p-6">
            <h2 className="text-xl font-semibold mb-4">邮箱配置列表</h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="h-32 bg-base-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : configs.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {configs.map(renderConfigCard)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 添加配置模态框 */}
      <SimpleEmailConfigModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchConfigs()
          setShowAddModal(false)
        }}
      />
    </Layout>
  )
}

export default SimpleEmailConfigPage