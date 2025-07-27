/**
 * 测试前端 API 迁移功能
 * 运行方式：在浏览器控制台中执行
 */

import { invoiceService } from '../services/invoice';
import { exportService } from '../services/exportService';

// 测试结果接口
interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: any;
}

// 测试日志
const log = (message: string, data?: any) => {
  console.log(`[API迁移测试] ${message}`, data || '');
};

// 测试单个功能
const runTest = async (name: string, testFn: () => Promise<any>): Promise<TestResult> => {
  log(`开始测试: ${name}`);
  try {
    const data = await testFn();
    log(`✅ ${name} 成功`, data);
    return { name, success: true, data };
  } catch (error: any) {
    log(`❌ ${name} 失败`, error);
    return { name, success: false, error: error.message || String(error) };
  }
};

// 主测试函数
export const runApiMigrationTests = async () => {
  log('=== 开始前端 API 迁移测试 ===');
  
  const results: TestResult[] = [];
  
  // 1. 测试发票列表
  results.push(await runTest('获取发票列表', async () => {
    const response = await invoiceService.list({
      page: 1,
      page_size: 10
    });
    if (!response.data?.items) {
      throw new Error('响应格式错误：缺少 items');
    }
    return {
      total: response.data.total,
      count: response.data.items.length,
      firstItem: response.data.items[0]
    };
  }));
  
  // 2. 测试发票详情
  if (results[0].success && results[0].data?.firstItem) {
    const invoiceId = results[0].data.firstItem.id;
    results.push(await runTest('获取发票详情', async () => {
      const response = await invoiceService.get(invoiceId);
      if (!response.data) {
        throw new Error('未返回发票数据');
      }
      return {
        id: response.data.id,
        invoice_number: response.data.invoice_number,
        has_category_info: !!response.data.expense_category
      };
    }));
  }
  
  // 3. 测试发票统计
  results.push(await runTest('获取发票统计', async () => {
    const response = await invoiceService.stats();
    if (!response.data) {
      throw new Error('未返回统计数据');
    }
    return {
      has_dashboard: !!response.data.dashboard,
      has_monthly_trend: !!response.data.monthlyTrend,
      has_category_analysis: !!response.data.categoryAnalysis
    };
  }));
  
  // 4. 测试发票更新
  if (results[0].success && results[0].data?.firstItem) {
    const invoice = results[0].data.firstItem;
    results.push(await runTest('更新发票', async () => {
      const testNote = `API迁移测试 - ${new Date().toISOString()}`;
      const response = await invoiceService.update(invoice.id, {
        notes: testNote
      });
      return {
        id: response.data.id,
        notes_updated: response.data.notes === testNote
      };
    }));
  }
  
  // 5. 测试下载URL
  if (results[0].success && results[0].data?.firstItem) {
    const invoiceId = results[0].data.firstItem.id;
    results.push(await runTest('获取下载URL', async () => {
      const response = await invoiceService.getDownloadUrl(invoiceId);
      if (!response.data?.download_url) {
        throw new Error('未返回下载URL');
      }
      return {
        has_download_url: !!response.data.download_url,
        has_filename: !!response.data.filename
      };
    }));
  }
  
  // 6. 测试批量下载URL
  if (results[0].success && results[0].data?.firstItem) {
    const invoiceIds = [results[0].data.firstItem.id];
    results.push(await runTest('获取批量下载URL', async () => {
      const response = await invoiceService.getBatchDownloadUrls(invoiceIds);
      const files = response.data?.files || response.data?.urls || [];
      if (files.length === 0) {
        throw new Error('未返回文件列表');
      }
      return {
        file_count: files.length,
        first_file: files[0]
      };
    }));
  }
  
  // 7. 测试服务切换
  results.push(await runTest('服务切换状态', async () => {
    const isUsingSupabase = invoiceService.isUsingSupabase();
    return {
      using_supabase: isUsingSupabase,
      service_type: isUsingSupabase ? 'Supabase' : 'Traditional API'
    };
  }));
  
  // 生成测试报告
  log('=== 测试结果汇总 ===');
  const summary = {
    total: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results: results
  };
  
  // 详细结果
  results.forEach(result => {
    if (result.success) {
      log(`✅ ${result.name}`);
    } else {
      log(`❌ ${result.name}: ${result.error}`);
    }
  });
  
  // 总结
  log(`总计: ${summary.total} 项测试`);
  log(`通过: ${summary.passed} 项`);
  log(`失败: ${summary.failed} 项`);
  
  return summary;
};

// 导出到 window 对象，方便在控制台中调用
if (typeof window !== 'undefined') {
  (window as any).runApiMigrationTests = runApiMigrationTests;
  log('测试函数已加载，在控制台中运行: runApiMigrationTests()');
}