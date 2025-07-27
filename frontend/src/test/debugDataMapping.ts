/**
 * 调试数据映射问题
 * 比较 API 和 Supabase 返回的数据格式差异
 */

import { api } from '../services/apiClient';
import { invoiceService } from '../services/invoice';

// 调试日志
const log = (message: string, data?: any) => {
  console.log(`[数据映射调试] ${message}`, data || '');
};

// 比较两个对象的差异
const compareObjects = (obj1: any, obj2: any, path = '') => {
  const differences: Array<{path: string, api: any, supabase: any}> = [];
  
  // 获取所有键
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
  
  allKeys.forEach(key => {
    const currentPath = path ? `${path}.${key}` : key;
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];
    
    if (val1 === undefined && val2 !== undefined) {
      differences.push({
        path: currentPath,
        api: 'undefined',
        supabase: val2
      });
    } else if (val1 !== undefined && val2 === undefined) {
      differences.push({
        path: currentPath,
        api: val1,
        supabase: 'undefined'
      });
    } else if (typeof val1 !== typeof val2) {
      differences.push({
        path: currentPath,
        api: `${typeof val1}: ${val1}`,
        supabase: `${typeof val2}: ${val2}`
      });
    } else if (typeof val1 === 'object' && val1 !== null && val2 !== null) {
      // 递归比较对象
      if (!Array.isArray(val1) && !Array.isArray(val2)) {
        const subDiffs = compareObjects(val1, val2, currentPath);
        differences.push(...subDiffs);
      }
    } else if (val1 !== val2) {
      differences.push({
        path: currentPath,
        api: val1,
        supabase: val2
      });
    }
  });
  
  return differences;
};

// 主调试函数
export const debugDataMapping = async (invoiceId?: string) => {
  log('=== 开始数据映射调试 ===');
  
  try {
    // 如果没有提供 ID，先获取一个
    if (!invoiceId) {
      log('获取发票列表...');
      const listResponse = await invoiceService.list({ page: 1, page_size: 1 });
      if (!listResponse.data?.items?.[0]) {
        log('❌ 没有找到发票数据');
        return;
      }
      invoiceId = listResponse.data.items[0].id;
      log(`使用发票 ID: ${invoiceId}`);
    }
    
    // 1. 获取 Supabase 数据
    log('📥 获取 Supabase 数据...');
    invoiceService.enableSupabase();
    const supabaseResponse = await invoiceService.get(invoiceId);
    const supabaseData = supabaseResponse.data;
    
    // 2. 获取传统 API 数据
    log('📥 获取传统 API 数据...');
    invoiceService.enableAPI();
    let apiData;
    try {
      const apiResponse = await invoiceService.get(invoiceId);
      apiData = apiResponse.data;
    } catch (error) {
      log('⚠️ 传统 API 调用失败，可能后端未启动');
      apiData = null;
    }
    
    // 切回 Supabase
    invoiceService.enableSupabase();
    
    // 3. 分析数据结构
    log('\n📊 Supabase 数据结构:');
    if (supabaseData) {
      const fields = Object.keys(supabaseData);
      log(`字段数量: ${fields.length}`);
      log('字段列表:', fields.sort());
      
      // 检查关键字段
      log('\n🔍 关键字段检查:');
      const keyFields = [
        'id', 'invoice_number', 'invoice_code', 'invoice_type',
        'seller_name', 'buyer_name', 'total_amount', 'invoice_date',
        'expense_category', 'primary_category_name', 'secondary_category_name',
        'consumption_date', 'invoice_details', 'extracted_data'
      ];
      
      keyFields.forEach(field => {
        const value = supabaseData[field];
        const type = typeof value;
        if (value === undefined) {
          log(`❌ ${field}: 未定义`);
        } else if (value === null) {
          log(`⚠️ ${field}: null`);
        } else if (type === 'object') {
          log(`✅ ${field}: ${Array.isArray(value) ? 'array' : 'object'} (${JSON.stringify(value).substring(0, 50)}...)`);
        } else {
          log(`✅ ${field}: ${type} = ${String(value).substring(0, 50)}`);
        }
      });
    }
    
    // 4. 如果有 API 数据，进行比较
    if (apiData) {
      log('\n📊 API vs Supabase 差异:');
      const differences = compareObjects(apiData, supabaseData);
      
      if (differences.length === 0) {
        log('✅ 没有差异');
      } else {
        log(`发现 ${differences.length} 处差异:`);
        differences.forEach(diff => {
          log(`  ${diff.path}:`);
          log(`    API: ${diff.api}`);
          log(`    Supabase: ${diff.supabase}`);
        });
      }
    }
    
    // 5. 检查发票详情字段的特殊处理
    log('\n🔍 invoice_details 字段详细分析:');
    if (supabaseData?.invoice_details) {
      const details = supabaseData.invoice_details;
      log(`类型: ${typeof details}`);
      log(`是否为数组: ${Array.isArray(details)}`);
      if (Array.isArray(details)) {
        log(`数组长度: ${details.length}`);
        if (details.length > 0) {
          log('第一项示例:', details[0]);
        }
      } else {
        log('值:', details);
      }
    } else {
      log('❌ invoice_details 字段不存在或为空');
    }
    
    // 6. 检查 extracted_data 字段
    log('\n🔍 extracted_data 字段详细分析:');
    if (supabaseData?.extracted_data) {
      const extracted = supabaseData.extracted_data;
      log(`类型: ${typeof extracted}`);
      if (typeof extracted === 'object') {
        log('包含的键:', Object.keys(extracted));
      }
    } else {
      log('❌ extracted_data 字段不存在或为空');
    }
    
    // 返回数据供进一步分析
    return {
      supabaseData,
      apiData,
      invoiceId
    };
    
  } catch (error: any) {
    log('❌ 调试过程出错:', error.message || error);
    throw error;
  }
};

// 导出到 window 对象
if (typeof window !== 'undefined') {
  (window as any).debugDataMapping = debugDataMapping;
  log('调试函数已加载，在控制台中运行: debugDataMapping() 或 debugDataMapping("发票ID")');
}