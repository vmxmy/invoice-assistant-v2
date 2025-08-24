/**
 * 批量操作性能测试和验证工具
 * 用于验证批量API优化的效果
 */

import { InvoiceService } from '../services/supabaseDataService'

/**
 * 批量操作性能测试结果
 */
export interface BatchTestResult {
  operation: string
  itemCount: number
  duration: number
  requestCount: number
  successCount: number
  failedCount: number
  averageRequestTime: number
  success: boolean
}

/**
 * 批量操作测试工具
 */
export class BatchOperationTester {
  
  /**
   * 运行批量删除性能测试
   */
  static async testBatchDelete(invoiceIds: string[], userId: string): Promise<BatchTestResult> {
    const startTime = performance.now()
    
    try {
      const result = await InvoiceService.batchDeleteInvoices(invoiceIds, userId)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      return {
        operation: '批量软删除',
        itemCount: invoiceIds.length,
        duration,
        requestCount: 1, // 新方法只需1次请求
        successCount: result.data?.successCount || 0,
        failedCount: result.data?.failedIds?.length || 0,
        averageRequestTime: duration / 1, // 只有1次请求
        success: !result.error
      }
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      return {
        operation: '批量软删除',
        itemCount: invoiceIds.length,
        duration,
        requestCount: 1,
        successCount: 0,
        failedCount: invoiceIds.length,
        averageRequestTime: duration,
        success: false
      }
    }
  }

  /**
   * 运行批量恢复性能测试
   */
  static async testBatchRestore(invoiceIds: string[], userId: string): Promise<BatchTestResult> {
    const startTime = performance.now()
    
    try {
      const result = await InvoiceService.batchRestoreInvoices(invoiceIds, userId)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      return {
        operation: '批量恢复',
        itemCount: invoiceIds.length,
        duration,
        requestCount: 1,
        successCount: result.data?.successCount || 0,
        failedCount: result.data?.failedIds?.length || 0,
        averageRequestTime: duration / 1,
        success: !result.error
      }
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      return {
        operation: '批量恢复',
        itemCount: invoiceIds.length,
        duration,
        requestCount: 1,
        successCount: 0,
        failedCount: invoiceIds.length,
        averageRequestTime: duration,
        success: false
      }
    }
  }

  /**
   * 运行批量状态更新性能测试
   */
  static async testBatchUpdateStatus(
    invoiceIds: string[], 
    userId: string, 
    newStatus: string
  ): Promise<BatchTestResult> {
    const startTime = performance.now()
    
    try {
      const result = await InvoiceService.batchUpdateInvoiceStatus(invoiceIds, userId, newStatus)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      return {
        operation: `批量状态更新(${newStatus})`,
        itemCount: invoiceIds.length,
        duration,
        requestCount: 1,
        successCount: result.data?.successCount || 0,
        failedCount: result.data?.failedIds?.length || 0,
        averageRequestTime: duration / 1,
        success: !result.error
      }
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      return {
        operation: `批量状态更新(${newStatus})`,
        itemCount: invoiceIds.length,
        duration,
        requestCount: 1,
        successCount: 0,
        failedCount: invoiceIds.length,
        averageRequestTime: duration,
        success: false
      }
    }
  }

  /**
   * 计算优化效果对比
   */
  static calculateImprovement(oldResult: BatchTestResult, newResult: BatchTestResult) {
    const timeImprovement = ((oldResult.duration - newResult.duration) / oldResult.duration) * 100
    const requestReduction = oldResult.requestCount - newResult.requestCount
    const speedup = oldResult.duration / newResult.duration
    
    return {
      timeImprovement: Math.round(timeImprovement * 10) / 10, // 保留1位小数
      requestReduction,
      speedup: Math.round(speedup * 10) / 10,
      timeSaved: Math.round(oldResult.duration - newResult.duration)
    }
  }

  /**
   * 格式化测试结果为表格
   */
  static formatTestResult(result: BatchTestResult): string {
    return `
┌────────────────────┬──────────────┐
│ 操作类型           │ ${result.operation.padEnd(10)} │
│ 项目数量           │ ${result.itemCount.toString().padEnd(10)} │
│ 总耗时(ms)         │ ${Math.round(result.duration).toString().padEnd(10)} │
│ 请求次数           │ ${result.requestCount.toString().padEnd(10)} │
│ 成功数量           │ ${result.successCount.toString().padEnd(10)} │
│ 失败数量           │ ${result.failedCount.toString().padEnd(10)} │
│ 平均请求时间(ms)   │ ${Math.round(result.averageRequestTime).toString().padEnd(10)} │
│ 测试状态           │ ${(result.success ? '✅ 成功' : '❌ 失败').padEnd(10)} │
└────────────────────┴──────────────┘`
  }

  /**
   * 生成性能对比报告
   */
  static generateComparisonReport(
    oldMethod: { itemCount: number, avgRequestTime: number },
    newResult: BatchTestResult
  ): string {
    // 计算旧方法的理论耗时
    const oldEstimatedTime = oldMethod.itemCount * (oldMethod.avgRequestTime + 50) // 50ms网络开销
    const oldEstimatedResult: BatchTestResult = {
      operation: '旧循环方法(估算)',
      itemCount: oldMethod.itemCount,
      duration: oldEstimatedTime,
      requestCount: oldMethod.itemCount,
      successCount: oldMethod.itemCount,
      failedCount: 0,
      averageRequestTime: oldMethod.avgRequestTime,
      success: true
    }

    const improvement = this.calculateImprovement(oldEstimatedResult, newResult)

    return `
🚀 批量操作性能优化报告
${'='.repeat(50)}

📊 对比结果:
${this.formatTestResult(oldEstimatedResult)}

${this.formatTestResult(newResult)}

💡 优化效果:
┌────────────────────┬──────────────┐
│ 性能提升           │ ${improvement.timeImprovement}%      │
│ 速度倍数           │ ${improvement.speedup}x        │
│ 请求数量减少       │ ${improvement.requestReduction}次       │
│ 时间节省           │ ${improvement.timeSaved}ms      │
└────────────────────┴──────────────┘

🎯 关键改进:
• 使用 .in() 操作符实现真正的批量操作
• 单次网络请求处理所有项目
• 减少了 ${improvement.requestReduction} 次网络往返
• 避免了 API 速率限制的风险
• 提升了用户体验和操作流畅度

📈 实际收益:
对于 ${newResult.itemCount} 个项目的批量操作：
• 旧方法需要: ~${Math.round(oldEstimatedTime)}ms (${oldMethod.itemCount}次请求)
• 新方法只需: ${Math.round(newResult.duration)}ms (1次请求)
• 节省时间: ${improvement.timeSaved}ms (${improvement.timeImprovement}% 提升)

${'='.repeat(50)}
    `.trim()
  }
}

/**
 * 快速批量操作演示
 */
export const demonstrateBatchOptimizations = async (userId: string) => {
  console.log('🎬 开始批量操作优化演示...\n')

  // 模拟测试数据
  const testCases = [
    { itemCount: 5, operation: '小批量测试' },
    { itemCount: 20, operation: '中等批量测试' },
    { itemCount: 50, operation: '大批量测试' }
  ]

  for (const testCase of testCases) {
    console.log(`\n📝 ${testCase.operation} (${testCase.itemCount}个项目):`)
    console.log('─'.repeat(60))

    // 生成模拟ID (实际使用中应该是真实的发票ID)
    const mockIds = Array.from({ length: testCase.itemCount }, (_, i) => `test-invoice-${i + 1}`)

    // 测试批量状态更新
    const statusUpdateResult = await BatchOperationTester.testBatchUpdateStatus(
      mockIds, 
      userId, 
      'reimbursed'
    )

    // 生成性能报告
    const report = BatchOperationTester.generateComparisonReport(
      { itemCount: testCase.itemCount, avgRequestTime: 100 },
      statusUpdateResult
    )

    console.log(report)
  }

  console.log('\n✅ 批量操作优化演示完成!')
  console.log('\n💡 最佳实践提醒:')
  console.log('• 对于超大批量操作(>100项)，考虑分批处理')
  console.log('• 在生产环境中监控API调用频率')
  console.log('• 添加用户友好的进度指示器')
  console.log('• 实现失败重试机制')
}

// 开发环境导出到全局
if (process.env.NODE_ENV === 'development') {
  (window as any).batchTester = {
    BatchOperationTester,
    demonstrateBatchOptimizations
  }
  console.log('🔧 批量操作测试工具已挂载到 window.batchTester')
}