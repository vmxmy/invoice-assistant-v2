/**
 * 发票数据适配器
 * 处理 Supabase 和传统 API 返回数据格式的差异
 */

import type { Invoice } from '../types/index';

/**
 * 适配 Supabase 返回的发票数据
 * 主要处理 extracted_data 结构差异
 */
export const adaptSupabaseInvoiceData = (invoice: any): Invoice => {
  if (!invoice) return invoice;
  
  // 如果数据已经有正确的 extracted_data 结构，直接返回
  if (invoice.extracted_data?.structured_data) {
    return invoice;
  }
  
  // 构建适配后的数据
  const adapted = { ...invoice };
  
  // 确保 extracted_data 存在
  if (!adapted.extracted_data) {
    adapted.extracted_data = {};
  }
  
  // 构建 structured_data 结构，从扁平字段映射
  adapted.extracted_data.structured_data = {
    // 基本信息
    invoiceNumber: invoice.invoice_number || adapted.extracted_data.invoice_number || adapted.extracted_data.invoiceNumber,
    invoiceCode: invoice.invoice_code || adapted.extracted_data.invoice_code || adapted.extracted_data.invoiceCode,
    invoiceType: invoice.invoice_type || adapted.extracted_data.invoice_type || adapted.extracted_data.invoiceType,
    invoiceDate: invoice.invoice_date || adapted.extracted_data.invoice_date || adapted.extracted_data.invoiceDate,
    
    // 金额信息
    totalAmount: invoice.total_amount || adapted.extracted_data.total_amount || adapted.extracted_data.totalAmount,
    invoiceAmountPreTax: invoice.amount_without_tax || invoice.invoice_amount_pre_tax || adapted.extracted_data.amount_without_tax || adapted.extracted_data.invoiceAmountPreTax,
    invoiceTax: invoice.tax_amount || invoice.invoice_tax || adapted.extracted_data.tax_amount || adapted.extracted_data.invoiceTax,
    
    // 买卖方信息
    sellerName: invoice.seller_name || adapted.extracted_data.seller_name || adapted.extracted_data.sellerName,
    sellerTaxNumber: invoice.seller_tax_number || adapted.extracted_data.seller_tax_number || adapted.extracted_data.sellerTaxNumber,
    sellerAddress: invoice.seller_address || adapted.extracted_data.seller_address || adapted.extracted_data.sellerAddress,
    sellerBank: invoice.seller_bank || adapted.extracted_data.seller_bank || adapted.extracted_data.sellerBank,
    
    purchaserName: invoice.buyer_name || adapted.extracted_data.buyer_name || adapted.extracted_data.purchaserName,
    purchaserTaxNumber: invoice.buyer_tax_number || adapted.extracted_data.buyer_tax_number || adapted.extracted_data.purchaserTaxNumber,
    purchaserAddress: invoice.buyer_address || adapted.extracted_data.buyer_address || adapted.extracted_data.purchaserAddress,
    purchaserBank: invoice.buyer_bank || adapted.extracted_data.buyer_bank || adapted.extracted_data.purchaserBank,
    
    // 其他信息
    checkCode: invoice.check_code || adapted.extracted_data.check_code || adapted.extracted_data.checkCode,
    remarks: invoice.remarks || adapted.extracted_data.remarks,
    machineCode: invoice.machine_code || adapted.extracted_data.machine_code || adapted.extracted_data.machineCode,
  };
  
  // 处理发票明细
  if (invoice.invoice_details && !adapted.extracted_data.invoice_details) {
    adapted.extracted_data.invoice_details = invoice.invoice_details;
  }
  
  // 确保顶层字段也存在（向后兼容）
  const ensureTopLevelFields = [
    'invoice_number', 'invoice_code', 'invoice_type', 'invoice_date',
    'total_amount', 'amount_without_tax', 'tax_amount',
    'seller_name', 'seller_tax_number', 'buyer_name', 'buyer_tax_number',
    'consumption_date', 'expense_category', 'primary_category_name', 'secondary_category_name'
  ];
  
  ensureTopLevelFields.forEach(field => {
    if (adapted[field] === undefined && invoice[field] !== undefined) {
      adapted[field] = invoice[field];
    }
  });
  
  // 特殊处理：火车票相关字段
  if (invoice.invoice_type?.includes('火车') || invoice.invoice_type?.includes('铁路')) {
    // 确保火车票特有字段存在
    const trainFields = ['train_number', 'departure_station', 'arrival_station', 'departure_time', 'seat_type', 'seat_number'];
    trainFields.forEach(field => {
      if (invoice[field] && !adapted.extracted_data[field]) {
        adapted.extracted_data[field] = invoice[field];
      }
    });
  }
  
  // 特殊处理：飞机票相关字段
  if (invoice.invoice_type?.includes('航空') || invoice.invoice_type?.includes('机票')) {
    // 确保飞机票特有字段存在
    const flightFields = ['flight_number', 'departure_airport', 'arrival_airport', 'departure_time', 'seat_class'];
    flightFields.forEach(field => {
      if (invoice[field] && !adapted.extracted_data[field]) {
        adapted.extracted_data[field] = invoice[field];
      }
    });
  }
  
  return adapted;
};

/**
 * 批量适配发票数据
 */
export const adaptSupabaseInvoiceList = (invoices: any[]): Invoice[] => {
  if (!Array.isArray(invoices)) return [];
  return invoices.map(adaptSupabaseInvoiceData);
};