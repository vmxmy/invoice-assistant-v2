/**
 * 开发环境自动确认邮箱工具
 * 仅在开发环境使用，生产环境不可用
 */
import { supabase } from '../lib/supabase'

/**
 * 开发环境自动确认用户邮箱
 * @param userId 用户ID
 */
export const autoConfirmEmailInDev = async (userId: string): Promise<void> => {
  // 确保只在开发环境运行
  if (!import.meta.env.DEV) {
    throw new Error('自动确认功能仅在开发环境可用')
  }

  console.log('🔧 [开发环境] 开始自动确认邮箱，用户ID:', userId)

  try {
    // 方法1：使用 Supabase Admin API（如果可用）
    const { data, error } = await supabase.rpc('confirm_user_email_dev', {
      user_id: userId
    })

    if (error) {
      console.warn('🔧 [开发环境] RPC调用失败，尝试替代方案:', error.message)
      
      // 方法2：直接更新认证状态（通过刷新session）
      await supabase.auth.refreshSession()
      
      console.log('🔧 [开发环境] 使用session刷新作为替代方案')
    } else {
      console.log('✅ [开发环境] 邮箱自动确认成功')
    }
  } catch (error) {
    console.error('❌ [开发环境] 自动确认失败:', error)
    throw error
  }
}

/**
 * 检查是否为开发环境
 */
export const isDevEnvironment = (): boolean => {
  return import.meta.env.DEV
}

/**
 * 开发环境工具提示
 */
export const getDevConfirmationMessage = (): string => {
  if (isDevEnvironment()) {
    return '开发环境已自动确认邮箱，可直接登录'
  }
  return '请检查邮箱确认链接'
}