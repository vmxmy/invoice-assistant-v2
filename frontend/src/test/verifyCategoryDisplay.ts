/**
 * 验证发票详情模态框中的分类显示
 * 检查是否能正确显示一级和二级分类
 */

import { invoiceService } from '../services/invoice';

// 测试日志
const log = (message: string, data?: any) => {
  console.log(`[分类显示验证] ${message}`, data || '');
};

// 主验证函数
export const verifyCategoryDisplay = async (invoiceId?: string) => {
  log('=== 开始验证发票分类显示 ===');
  
  try {
    // 如果没有提供 ID，先获取一个有分类的发票
    if (!invoiceId) {
      log('获取发票列表...');
      const listResponse = await invoiceService.list({ page: 1, page_size: 10 });
      
      // 找一个有分类的发票
      const invoiceWithCategory = listResponse.data?.items?.find((inv: any) => 
        inv.expense_category && inv.expense_category !== ''
      );
      
      if (!invoiceWithCategory) {
        log('❌ 没有找到有分类的发票数据');
        return;
      }
      
      invoiceId = invoiceWithCategory.id;
      log(`使用发票 ID: ${invoiceId}, 分类: ${invoiceWithCategory.expense_category}`);
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
      seller_name: invoice.seller_name,
      expense_category: invoice.expense_category
    });
    
    // 分析分类信息
    log('\n🏷️ 分类信息分析:');
    
    const category = invoice.expense_category;
    if (!category) {
      log('❌ 该发票没有分类信息');
      return;
    }
    
    // 定义分类层级结构
    const categoryHierarchy = {
      '交通': ['高铁', '飞机', '出租车'],
      '住宿': ['酒店', '民宿'],
      '餐饮': [],
      '办公': ['咨询', '印章'],
      '其他': []
    };
    
    // 判断是一级还是二级分类
    let primaryCategory = '';
    let secondaryCategory = '';
    
    // 先检查是否是一级分类
    if (Object.keys(categoryHierarchy).includes(category)) {
      primaryCategory = category;
      log(`✅ 这是一级分类: ${primaryCategory}`);
    } else {
      // 查找对应的一级分类
      for (const [primary, secondaries] of Object.entries(categoryHierarchy)) {
        if (secondaries.includes(category)) {
          primaryCategory = primary;
          secondaryCategory = category;
          log(`✅ 这是二级分类: ${primaryCategory} > ${secondaryCategory}`);
          break;
        }
      }
    }
    
    if (!primaryCategory) {
      log(`⚠️ 未知分类: ${category}`);
    }
    
    // 验证分类显示
    log('\n🔍 分类显示验证:');
    log('当前存储的分类值:', category);
    log('解析后的一级分类:', primaryCategory || '无');
    log('解析后的二级分类:', secondaryCategory || '无');
    
    // 检查其他相关字段
    if (invoice.extracted_data) {
      log('\n📄 extracted_data 中的分类信息:');
      const extractedText = JSON.stringify(invoice.extracted_data);
      
      // 搜索分类相关关键词
      const keywords = ['餐饮', '住宿', '交通', '办公', '高铁', '飞机', '酒店'];
      const foundKeywords = keywords.filter(keyword => extractedText.includes(keyword));
      
      if (foundKeywords.length > 0) {
        log('找到的分类关键词:', foundKeywords);
      } else {
        log('未在 extracted_data 中找到分类关键词');
      }
    }
    
    // 返回验证结果
    return {
      invoice,
      category,
      primaryCategory,
      secondaryCategory,
      isValid: !!primaryCategory,
      displayInfo: {
        shouldShowPrimary: !!primaryCategory,
        shouldShowSecondary: !!secondaryCategory,
        displayText: secondaryCategory ? `${secondaryCategory} (${primaryCategory})` : primaryCategory
      }
    };
    
  } catch (error: any) {
    log('❌ 验证过程出错:', error.message || error);
    throw error;
  }
};

// 测试多个发票的分类显示
export const verifyMultipleCategories = async () => {
  log('\n=== 验证多个发票的分类显示 ===');
  
  try {
    const listResponse = await invoiceService.list({ page: 1, page_size: 20 });
    const invoices = listResponse.data?.items || [];
    
    const categorySummary = {
      total: invoices.length,
      withCategory: 0,
      primaryOnly: 0,
      withSecondary: 0,
      categories: {} as Record<string, number>
    };
    
    for (const invoice of invoices) {
      if (invoice.expense_category) {
        categorySummary.withCategory++;
        categorySummary.categories[invoice.expense_category] = 
          (categorySummary.categories[invoice.expense_category] || 0) + 1;
        
        // 判断是否有二级分类
        const categoryHierarchy = {
          '交通': ['高铁', '飞机', '出租车'],
          '住宿': ['酒店', '民宿'],
          '餐饮': [],
          '办公': ['咨询', '印章'],
          '其他': []
        };
        
        if (Object.keys(categoryHierarchy).includes(invoice.expense_category)) {
          categorySummary.primaryOnly++;
        } else {
          categorySummary.withSecondary++;
        }
      }
    }
    
    log('📊 分类统计:', categorySummary);
    log('各分类分布:', categorySummary.categories);
    
    return categorySummary;
    
  } catch (error: any) {
    log('❌ 批量验证出错:', error.message || error);
    throw error;
  }
};

// 导出到 window 对象
if (typeof window !== 'undefined') {
  (window as any).verifyCategoryDisplay = verifyCategoryDisplay;
  (window as any).verifyMultipleCategories = verifyMultipleCategories;
  log('验证函数已加载，在控制台中运行:');
  log('- verifyCategoryDisplay() 或 verifyCategoryDisplay("发票ID")');
  log('- verifyMultipleCategories() 查看所有发票的分类统计');
}