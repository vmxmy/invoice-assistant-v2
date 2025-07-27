/**
 * 验证发票详情模态框数据映射
 * 检查各个字段是否正确显示
 */

import { invoiceService } from '../services/invoice';
import { getValueFromPaths } from '../config/invoiceFieldsConfig';

// 测试日志
const log = (message: string, data?: any) => {
  console.log(`[模态框数据验证] ${message}`, data || '');
};

// 验证字段映射
const verifyFieldMapping = (invoice: any, fieldName: string, paths: string[]) => {
  const value = getValueFromPaths(invoice, paths);
  const hasValue = value !== undefined && value !== null && value !== '';
  
  return {
    field: fieldName,
    paths: paths,
    value: value,
    hasValue: hasValue,
    type: typeof value,
    status: hasValue ? '✅' : '❌'
  };
};

// 主验证函数
export const verifyModalData = async (invoiceId?: string) => {
  log('=== 开始验证发票详情模态框数据 ===');
  
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
    
    // 获取发票详情
    log('📥 获取发票详情...');
    const response = await invoiceService.get(invoiceId);
    const invoice = response.data;
    
    if (!invoice) {
      log('❌ 未获取到发票数据');
      return;
    }
    
    log('📋 发票基本信息:', {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_type: invoice.invoice_type,
      seller_name: invoice.seller_name
    });
    
    // 定义要验证的字段
    const fieldsToVerify = [
      {
        name: '发票号码',
        paths: ['extracted_data.structured_data.invoiceNumber', 'extracted_data.invoiceNumber', 'extracted_data.invoice_number', 'invoice_number']
      },
      {
        name: '发票代码',
        paths: ['extracted_data.structured_data.invoiceCode', 'extracted_data.invoiceCode', 'extracted_data.invoice_code', 'invoice_code']
      },
      {
        name: '发票类型',
        paths: ['extracted_data.structured_data.invoiceType', 'extracted_data.invoiceType', 'invoice_type']
      },
      {
        name: '开票日期',
        paths: ['extracted_data.structured_data.invoiceDate', 'extracted_data.invoiceDate', 'extracted_data.invoice_date', 'invoice_date']
      },
      {
        name: '销售方名称',
        paths: ['extracted_data.structured_data.sellerName', 'extracted_data.sellerName', 'extracted_data.seller_name', 'seller_name']
      },
      {
        name: '购买方名称',
        paths: ['extracted_data.structured_data.purchaserName', 'extracted_data.purchaserName', 'extracted_data.buyer_name', 'buyer_name']
      },
      {
        name: '合计金额',
        paths: ['extracted_data.structured_data.totalAmount', 'extracted_data.totalAmount', 'extracted_data.total_amount', 'total_amount']
      },
      {
        name: '不含税金额',
        paths: ['invoice_amount_pre_tax', 'amount_without_tax', 'extracted_data.invoice_amount_pre_tax', 'extracted_data.structured_data.invoice_amount_pre_tax', 'extracted_data.structured_data.invoiceAmountPreTax', 'extracted_data.invoiceAmountPreTax', 'extracted_data.amount_without_tax']
      },
      {
        name: '税额',
        paths: ['invoice_tax', 'tax_amount', 'extracted_data.invoice_tax', 'extracted_data.structured_data.invoice_tax', 'extracted_data.structured_data.invoiceTax', 'extracted_data.invoiceTax', 'extracted_data.tax_amount']
      },
      {
        name: '消费日期',
        paths: ['consumption_date']
      },
      {
        name: '费用分类',
        paths: ['expense_category']
      }
    ];
    
    // 验证每个字段
    log('\n📊 字段映射验证结果:');
    const results = fieldsToVerify.map(field => verifyFieldMapping(invoice, field.name, field.paths));
    
    // 显示结果
    results.forEach(result => {
      log(`${result.status} ${result.field}: ${result.hasValue ? result.value : '无数据'}`);
      if (!result.hasValue) {
        log(`   尝试的路径: ${result.paths.join(', ')}`);
      }
    });
    
    // 统计
    const successCount = results.filter(r => r.hasValue).length;
    const totalCount = results.length;
    const successRate = Math.round((successCount / totalCount) * 100);
    
    log(`\n📈 验证统计:`);
    log(`成功字段: ${successCount}/${totalCount} (${successRate}%)`);
    
    // 检查 extracted_data 结构
    log('\n🔍 extracted_data 结构检查:');
    if (invoice.extracted_data) {
      log('extracted_data 存在');
      log('包含的键:', Object.keys(invoice.extracted_data));
      if (invoice.extracted_data.structured_data) {
        log('structured_data 存在');
        log('structured_data 包含的键:', Object.keys(invoice.extracted_data.structured_data));
      } else {
        log('❌ structured_data 不存在');
      }
    } else {
      log('❌ extracted_data 不存在');
    }
    
    // 返回验证结果
    return {
      invoice,
      results,
      successCount,
      totalCount,
      successRate
    };
    
  } catch (error: any) {
    log('❌ 验证过程出错:', error.message || error);
    throw error;
  }
};

// 导出到 window 对象
if (typeof window !== 'undefined') {
  (window as any).verifyModalData = verifyModalData;
  log('验证函数已加载，在控制台中运行: verifyModalData() 或 verifyModalData("发票ID")');
}