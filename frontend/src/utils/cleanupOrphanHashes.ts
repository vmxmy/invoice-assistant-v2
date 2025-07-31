/**
 * 清理孤立的哈希记录工具
 * 用于清理 invoice_id 为 null 的 file_hashes 记录
 */
import { supabase } from '../lib/supabase'

/**
 * 清理孤立的哈希记录
 */
export async function cleanupOrphanHashes() {
  try {
    console.log('🧹 开始清理孤立的哈希记录...')
    
    // 1. 查询所有孤立记录
    const { data: orphanHashes, error: queryError } = await supabase
      .from('file_hashes')
      .select('id, file_name, file_hash, user_id, created_at')
      .is('invoice_id', null)
    
    if (queryError) {
      console.error('❌ 查询孤立记录失败:', queryError)
      return { success: false, error: queryError.message }
    }
    
    if (!orphanHashes || orphanHashes.length === 0) {
      console.log('✅ 没有找到孤立的哈希记录')
      return { success: true, deletedCount: 0 }
    }
    
    console.log(`📊 找到 ${orphanHashes.length} 条孤立记录:`)
    orphanHashes.forEach((hash, index) => {
      console.log(`  ${index + 1}. ${hash.file_name} (${hash.file_hash.substring(0, 16)}...)`)
    })
    
    // 2. 删除所有孤立记录
    const { data: deletedHashes, error: deleteError } = await supabase
      .from('file_hashes')
      .delete()
      .is('invoice_id', null)
      .select('id')
    
    if (deleteError) {
      console.error('❌ 删除孤立记录失败:', deleteError)
      return { success: false, error: deleteError.message }
    }
    
    const deletedCount = deletedHashes?.length || 0
    console.log(`✅ 成功删除 ${deletedCount} 条孤立记录`)
    
    // 3. 验证清理结果
    const { data: remainingOrphans, error: verifyError } = await supabase
      .from('file_hashes')
      .select('id')
      .is('invoice_id', null)
    
    if (verifyError) {
      console.warn('⚠️ 验证清理结果失败:', verifyError)
    } else {
      const remainingCount = remainingOrphans?.length || 0
      if (remainingCount > 0) {
        console.warn(`⚠️ 还有 ${remainingCount} 条孤立记录未清理`)
      } else {
        console.log('🎯 孤立记录清理验证通过')
      }
    }
    
    return { 
      success: true, 
      deletedCount,
      remainingCount: remainingOrphans?.length || 0
    }
    
  } catch (error) {
    console.error('❌ 清理孤立记录异常:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    }
  }
}

/**
 * 在浏览器控制台调用的便捷函数
 */
export function runCleanup() {
  cleanupOrphanHashes().then(result => {
    console.log('🏁 清理结果:', result)
  })
}

// 如果在浏览器环境中，暴露到全局对象
if (typeof window !== 'undefined') {
  (window as any).cleanupOrphanHashes = runCleanup
}