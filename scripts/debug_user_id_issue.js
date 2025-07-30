/**
 * 调试用户ID不一致问题
 * 分析可能的原因并提供解决方案
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://sfenhhtvcyslxplvewmt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugUserIdIssue() {
  console.log('🔍 开始调试用户ID不一致问题...')
  
  try {
    // 1. 查看所有认证用户
    console.log('\n👥 所有认证用户:')
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
    
    if (authError) {
      console.error('❌ 获取认证用户失败:', authError.message)
      return
    }
    
    authUsers?.forEach(user => {
      console.log(`  📧 ${user.email} → ID: ${user.id}`)
    })
    
    // 2. 查看所有邮箱配置及其对应的用户ID
    console.log('\n📧 所有邮箱配置:')
    const { data: emailAccounts, error: emailError } = await supabase
      .from('email_accounts')
      .select('user_id, email_address, display_name, created_at, imap_host')
      .order('created_at', { ascending: false })
    
    if (emailError) {
      console.error('❌ 获取邮箱配置失败:', emailError.message)
      return
    }
    
    emailAccounts?.forEach(account => {
      console.log(`  📮 ${account.email_address} → 用户ID: ${account.user_id} (${account.imap_host})`)
    })
    
    // 3. 分析用户ID映射关系
    console.log('\n🔗 用户ID映射分析:')
    const userEmailMap = new Map()
    
    // 构建映射关系
    emailAccounts?.forEach(account => {
      if (!userEmailMap.has(account.user_id)) {
        userEmailMap.set(account.user_id, [])
      }
      userEmailMap.get(account.user_id).push(account.email_address)
    })
    
    // 显示映射关系
    userEmailMap.forEach((emails, userId) => {
      const authUser = authUsers?.find(u => u.id === userId)
      console.log(`  👤 用户ID: ${userId}`)
      console.log(`     📧 认证邮箱: ${authUser?.email || '未找到'}`)
      console.log(`     📮 配置邮箱: ${emails.join(', ')}`)
      console.log(`     📊 配置数量: ${emails.length}`)
      console.log('')
    })
    
    // 4. 检查可能的问题
    console.log('🚨 潜在问题分析:')
    
    // 检查是否有孤立的邮箱配置（用户ID在auth表中不存在）
    const orphanedConfigs = emailAccounts?.filter(account => 
      !authUsers?.some(user => user.id === account.user_id)
    )
    
    if (orphanedConfigs && orphanedConfigs.length > 0) {
      console.log('⚠️  发现孤立的邮箱配置（用户已删除但配置仍存在）:')
      orphanedConfigs.forEach(config => {
        console.log(`    📮 ${config.email_address} → 无效用户ID: ${config.user_id}`)
      })
    } else {
      console.log('✅ 未发现孤立的邮箱配置')
    }
    
    // 检查是否有同一认证邮箱对应多个用户ID的情况
    const emailToUserMap = new Map()
    authUsers?.forEach(user => {
      if (emailToUserMap.has(user.email)) {
        emailToUserMap.get(user.email).push(user.id)
      } else {
        emailToUserMap.set(user.email, [user.id])
      }
    })
    
    const duplicateEmails = Array.from(emailToUserMap.entries()).filter(([email, userIds]) => userIds.length > 1)
    if (duplicateEmails.length > 0) {
      console.log('⚠️  发现重复的认证邮箱:')
      duplicateEmails.forEach(([email, userIds]) => {
        console.log(`    📧 ${email} → 用户IDs: ${userIds.join(', ')}`)
      })
    } else {
      console.log('✅ 未发现重复的认证邮箱')
    }
    
    // 5. 提供解决建议
    console.log('\n💡 问题分析总结:')
    console.log('基于以上数据分析，用户ID不一致可能的原因:')
    console.log('1. 用户在不同时间注册了多个账号')
    console.log('2. 浏览器缓存问题导致用户状态混乱')
    console.log('3. 会话过期后重新登录了不同账号')
    console.log('4. 前端代码中用户状态管理存在问题')
    
    console.log('\n🔧 建议解决方案:')
    console.log('1. 清除浏览器缓存和localStorage')
    console.log('2. 检查前端认证状态管理逻辑')
    console.log('3. 添加用户状态调试日志')
    console.log('4. 实现统一的用户ID获取机制')
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error.message)
  }
}

// 运行调试
debugUserIdIssue()