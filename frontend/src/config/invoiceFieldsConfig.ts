import React from 'react';
import { FileText, Calendar, Building2, User, DollarSign, Hash, Info, Train, MapPin, Clock, Ticket, CreditCard, Calculator, Package, Tag } from 'lucide-react';
import type { Invoice } from '../types/index';

// Lucide 图标组件类型
type LucideIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

// 字段类型定义
export type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'readonly' | 'currency' | 'tags' | 'category';

// 字段配置接口
export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  icon: LucideIcon;
  required?: boolean;
  placeholder?: string;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    message?: string;
  };
  readOnly?: boolean;
  // 字段值的获取路径，支持嵌套对象和多个候选字段
  valuePaths: string[];
  // 显示条件函数
  showWhen?: (invoice: Invoice) => boolean;
  // 字段说明
  description?: string;
}

// 字段分组配置
export interface FieldGroup {
  key: string;
  title: string;
  icon: LucideIcon;
  fields: FieldConfig[];
  // 分组显示条件
  showWhen?: (invoice: Invoice) => boolean;
}

// 发票类型配置
export interface InvoiceTypeConfig {
  type: string;
  displayName: string;
  groups: FieldGroup[];
  // 类型识别函数
  matcher: (invoice: Invoice) => boolean;
}

// 获取嵌套对象值的工具函数
export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// 从多个路径中获取第一个非空值
export const getValueFromPaths = (invoice: Invoice, paths: string[]): any => {
  // 调试发票明细字段的路径解析
  const isInvoiceDetails = paths.some(p => p.includes('invoice_details'));
  if (isInvoiceDetails) {
    console.log('🔍 [getValueFromPaths] invoice_details 路径解析调试:', {
      paths,
      invoice_id: invoice.id,
      invoice_type: invoice.invoice_type
    });
  }
  
  for (const path of paths) {
    const value = getNestedValue(invoice, path);
    
    if (isInvoiceDetails) {
      console.log(`🔍 [getValueFromPaths] 路径 "${path}" 解析结果:`, {
        path,
        value,
        valueType: typeof value,
        isArray: Array.isArray(value),
        hasValue: value !== undefined && value !== null && value !== ''
      });
    }
    
    if (value !== undefined && value !== null && value !== '') {
      // 特殊处理 invoice_details 字段 - 如果是字符串，尝试解析为JSON
      if (path.includes('invoice_details') && typeof value === 'string') {
        console.log('🔍 [getValueFromPaths] 尝试解析 invoice_details 字符串:', value);
        try {
          // 先尝试标准JSON解析
          const parsed = JSON.parse(value);
          console.log('✅ [getValueFromPaths] 标准JSON解析成功:', parsed);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          try {
            // 尝试将Python字典格式转换为JSON格式
            // 先处理字符串中的单引号问题，但要保护已经存在的双引号内的内容
            let jsonStr = value;
            
            // 替换 Python 特有的值
            jsonStr = jsonStr.replace(/None/g, 'null');
            jsonStr = jsonStr.replace(/True/g, 'true');
            jsonStr = jsonStr.replace(/False/g, 'false');
            
            // 处理单引号到双引号的转换，但避免替换字符串内部的单引号
            // 使用更智能的正则表达式
            jsonStr = jsonStr.replace(/(\w+)'/g, '$1"'); // 单词后的单引号
            jsonStr = jsonStr.replace(/'(\w+)/g, '"$1'); // 单词前的单引号
            jsonStr = jsonStr.replace(/': /g, '": '); // 键值对分隔符
            jsonStr = jsonStr.replace(/', '/g, '", "'); // 项之间的分隔符
            jsonStr = jsonStr.replace(/\['/g, '["'); // 数组开始
            jsonStr = jsonStr.replace(/'\]/g, '"]'); // 数组结束
            jsonStr = jsonStr.replace(/\{'/g, '{"'); // 对象开始
            jsonStr = jsonStr.replace(/'\}/g, '"}'); // 对象结束
            
            console.log('🔍 [getValueFromPaths] 尝试Python转JSON:', jsonStr);
            const parsed = JSON.parse(jsonStr);
            console.log('✅ [getValueFromPaths] Python转JSON解析成功:', parsed);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e2) {
            console.warn('❌ [getValueFromPaths] 解析发票明细失败:', e2, 'value:', value);
            return [];
          }
        }
      }
      
      if (isInvoiceDetails) {
        console.log(`✅ [getValueFromPaths] 直接返回路径 "${path}" 的值:`, value);
      }
      return value;
    }
  }
  
  if (isInvoiceDetails) {
    console.log('❌ [getValueFromPaths] 所有路径都没有找到有效值，返回空字符串');
  }
  return '';
};

// 火车票字段配置
const trainTicketConfig: InvoiceTypeConfig = {
  type: 'train_ticket',
  displayName: '火车票',
  matcher: (invoice: Invoice) => {
    return (
      invoice.invoice_type === '火车票' ||
      invoice.extracted_data?.title?.includes('铁路电子客票') ||
      invoice.extracted_data?.title?.includes('电子发票(铁路电子客票)')
    );
  },
  groups: [
    {
      key: 'travel_info',
      title: '行程信息',
      icon: Train,
      fields: [
        {
          key: 'train_number',
          label: '车次',
          type: 'text',
          icon: Train,
          required: true,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.trainNumber',
            'extracted_data.structured_data.train_number',
            'extracted_data.structured_data.trainNumber', 
            'extracted_data.trainNumber', 
            'extracted_data.train_number', 
            'train_details.train_number'
          ],
          validation: {
            pattern: /^[A-Z0-9]+$/,
            message: '车次格式不正确'
          }
        },
        {
          key: 'departure_station',
          label: '出发站',
          type: 'text',
          icon: MapPin,
          required: true,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.departureStation',
            'extracted_data.structured_data.departure_station',
            'extracted_data.structured_data.departureStation', 
            'extracted_data.departureStation', 
            'extracted_data.departure_station', 
            'train_details.departure_station'
          ]
        },
        {
          key: 'arrival_station',
          label: '到达站',
          type: 'text',
          icon: MapPin,
          required: true,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.arrivalStation',
            'extracted_data.structured_data.arrival_station',
            'extracted_data.structured_data.arrivalStation', 
            'extracted_data.arrivalStation', 
            'extracted_data.arrival_station', 
            'train_details.arrival_station'
          ]
        },
        {
          key: 'departure_time',
          label: '出发时间',
          type: 'text',
          icon: Clock,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.departureTime',
            'extracted_data.structured_data.departure_time',
            'extracted_data.structured_data.departureTime', 
            'extracted_data.departureTime', 
            'extracted_data.departure_time', 
            'train_details.departure_time'
          ],
          placeholder: '例：2025年03月24日08:45开'
        },
        {
          key: 'seat_type',
          label: '座位类型',
          type: 'text',
          icon: Ticket,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.seatType',
            'extracted_data.structured_data.seat_type',
            'extracted_data.structured_data.seatType', 
            'extracted_data.seatType', 
            'extracted_data.seat_type', 
            'train_details.seat_class'
          ],
          placeholder: '商务座/一等座/二等座'
        },
        {
          key: 'seat_number',
          label: '座位号',
          type: 'text',
          icon: Hash,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.seatNumber',
            'extracted_data.structured_data.seat_number',
            'extracted_data.structured_data.seatNumber', 
            'extracted_data.seatNumber', 
            'extracted_data.seat_number', 
            'train_details.seat_number'
          ]
        }
      ]
    },
    {
      key: 'passenger_info',
      title: '乘客信息',
      icon: User,
      fields: [
        {
          key: 'passenger_name',
          label: '乘客姓名',
          type: 'text',
          icon: User,
          required: true,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.passengerName',
            'extracted_data.structured_data.passenger_name',
            'extracted_data.structured_data.passengerName', 
            'extracted_data.passengerName', 
            'extracted_data.passenger_name', 
            'buyer_name'
          ]
        },
        {
          key: 'passenger_info',
          label: '身份信息',
          type: 'text',
          icon: CreditCard,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.passengerInfo',
            'extracted_data.structured_data.passenger_info',
            'extracted_data.structured_data.passengerInfo', 
            'extracted_data.passengerInfo', 
            'extracted_data.passenger_info', 
            'extracted_data.id_number'
          ]
        }
      ]
    },
    {
      key: 'ticket_info',
      title: '票据信息',
      icon: FileText,
      fields: [
        {
          key: 'ticket_number',
          label: '车票号',
          type: 'text',
          icon: Hash,
          required: true,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.ticketNumber',
            'extracted_data.structured_data.ticket_number',
            'extracted_data.structured_data.ticketNumber', 
            'extracted_data.ticketNumber', 
            'extracted_data.ticket_number', 
            'invoice_number'
          ]
        },
        {
          key: 'electronic_ticket_number',
          label: '电子客票号',
          type: 'text',
          icon: FileText,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.electronicTicketNumber',
            'extracted_data.structured_data.electronic_ticket_number',
            'extracted_data.structured_data.electronicTicketNumber', 
            'extracted_data.electronicTicketNumber', 
            'invoice_code'
          ]
        },
        {
          key: 'invoice_date',
          label: '开票日期',
          type: 'date',
          icon: Calendar,
          required: true,
          valuePaths: ['extracted_data.structured_data.invoiceDate', 'extracted_data.invoiceDate', 'extracted_data.invoice_date', 'invoice_date']
        },
        {
          key: 'consumption_date',
          label: '发车日期',
          type: 'date',
          icon: Calendar,
          required: false,
          valuePaths: ['consumption_date'],
          description: '实际发车日期'
        },
        {
          key: 'fare',
          label: '票价',
          type: 'currency',
          icon: DollarSign,
          required: true,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.fare',
            'extracted_data.structured_data.total_amount',
            'extracted_data.structured_data.fare', 
            'total_amount', 
            'extracted_data.fare', 
            'extracted_data.ticket_price'
          ],
          validation: {
            min: 0,
            message: '票价必须大于0'
          }
        }
      ]
    },
    {
      key: 'buyer_info',
      title: '购买方信息',
      icon: Building2,
      fields: [
        {
          key: 'buyer_name',
          label: '购买方名称',
          type: 'text',
          icon: Building2,
          required: true,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.buyerName',
            'extracted_data.structured_data.buyer_name',
            'extracted_data.structured_data.buyerName', 
            'extracted_data.buyerName', 
            'buyer_name'
          ]
        },
        {
          key: 'buyer_credit_code',
          label: '统一社会信用代码',
          type: 'text',
          icon: Hash,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.buyerCreditCode',
            'extracted_data.structured_data.buyer_credit_code',
            'extracted_data.structured_data.buyerCreditCode', 
            'extracted_data.buyerCreditCode', 
            'buyer_tax_number'
          ]
        }
      ]
    },
    {
      key: 'other_info',
      title: '其他信息',
      icon: Info,
      fields: [
        {
          key: 'remarks',
          label: '备注',
          type: 'textarea',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.remarks', 'extracted_data.remarks', 'remarks', 'notes'],
          placeholder: '如：始发改签'
        },
        {
          key: 'is_copy',
          label: '是否复印件',
          type: 'readonly',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.isCopy', 'extracted_data.isCopy']
        }
      ]
    }
  ]
};

// 增值税发票字段配置
const vatInvoiceConfig: InvoiceTypeConfig = {
  type: 'vat_invoice',
  displayName: '增值税发票',
  matcher: (invoice: Invoice) => {
    return (
      invoice.invoice_type === '增值税发票' ||
      invoice.invoice_type === '增值税电子普通发票' ||
      invoice.extracted_data?.title?.includes('电子发票(普通发票)') ||
      invoice.extracted_data?.invoiceType?.includes('数电') ||
      !trainTicketConfig.matcher(invoice) // 默认类型
    );
  },
  groups: [
    {
      key: 'basic_info',
      title: '发票信息',
      icon: FileText,
      fields: [
        {
          key: 'invoice_number',
          label: '发票号码',
          type: 'text',
          icon: Hash,
          required: true,
          valuePaths: ['extracted_data.structured_data.invoiceNumber', 'extracted_data.invoiceNumber', 'extracted_data.invoice_number', 'invoice_number'],
          validation: {
            pattern: /^[0-9A-Za-z]+$/,
            message: '发票号码只能包含数字和字母'
          }
        },
        {
          key: 'invoice_code',
          label: '发票代码',
          type: 'text',
          icon: FileText,
          valuePaths: ['extracted_data.structured_data.invoiceCode', 'extracted_data.invoiceCode', 'extracted_data.invoice_code', 'invoice_code']
        },
        {
          key: 'invoice_type',
          label: '发票类型',
          type: 'readonly',
          icon: FileText,
          valuePaths: ['extracted_data.structured_data.invoiceType', 'extracted_data.invoiceType', 'invoice_type']
        },
        {
          key: 'invoice_date',
          label: '开票日期',
          type: 'date',
          icon: Calendar,
          required: true,
          valuePaths: ['extracted_data.structured_data.invoiceDate', 'extracted_data.invoiceDate', 'extracted_data.invoice_date', 'invoice_date']
        },
        {
          key: 'consumption_date',
          label: '消费日期',
          type: 'date',
          icon: Calendar,
          required: false,
          valuePaths: ['consumption_date'],
          description: '商品或服务实际发生的日期'
        },
        {
          key: 'check_code',
          label: '校验码',
          type: 'text',
          icon: Hash,
          valuePaths: ['extracted_data.structured_data.checkCode', 'extracted_data.checkCode']
        },
        {
          key: 'printed_invoice_code',
          label: '纸质发票代码',
          type: 'readonly',
          icon: FileText,
          valuePaths: ['extracted_data.structured_data.printedInvoiceCode', 'extracted_data.printedInvoiceCode'],
          showWhen: (invoice) => {
            const value = getValueFromPaths(invoice, ['extracted_data.structured_data.printedInvoiceCode', 'extracted_data.printedInvoiceCode']);
            return value && value !== '';
          }
        },
        {
          key: 'printed_invoice_number',
          label: '纸质发票号码',
          type: 'readonly',
          icon: Hash,
          valuePaths: ['extracted_data.structured_data.printedInvoiceNumber', 'extracted_data.printedInvoiceNumber'],
          showWhen: (invoice) => {
            const value = getValueFromPaths(invoice, ['extracted_data.structured_data.printedInvoiceNumber', 'extracted_data.printedInvoiceNumber']);
            return value && value !== '';
          }
        },
        {
          key: 'machine_code',
          label: '机器编号',
          type: 'readonly',
          icon: Hash,
          valuePaths: ['extracted_data.structured_data.machineCode', 'extracted_data.machineCode'],
          showWhen: (invoice) => {
            const value = getValueFromPaths(invoice, ['extracted_data.structured_data.machineCode', 'extracted_data.machineCode']);
            return value && value !== '';
          }
        },
        {
          key: 'form_type',
          label: '表单类型',
          type: 'readonly',
          icon: FileText,
          valuePaths: ['extracted_data.structured_data.formType', 'extracted_data.formType'],
          showWhen: (invoice) => {
            const value = getValueFromPaths(invoice, ['extracted_data.structured_data.formType', 'extracted_data.formType']);
            return value && value !== '';
          }
        },
        {
          key: 'special_tag',
          label: '特殊标记',
          type: 'readonly',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.specialTag', 'extracted_data.specialTag'],
          showWhen: (invoice) => {
            const value = getValueFromPaths(invoice, ['extracted_data.structured_data.specialTag', 'extracted_data.specialTag']);
            return value && value !== '';
          }
        }
      ]
    },
    {
      key: 'amount_info',
      title: '金额信息',
      icon: Calculator,
      fields: [
        {
          key: 'total_amount',
          label: '价税合计',
          type: 'currency',
          icon: DollarSign,
          required: true,
          valuePaths: ['extracted_data.structured_data.totalAmount', 'extracted_data.totalAmount', 'extracted_data.total_amount', 'total_amount'],
          validation: {
            min: 0.01,
            max: 9999999.99,
            message: '金额必须在0.01-9,999,999.99之间'
          }
        },
        {
          key: 'amount_without_tax',
          label: '不含税金额',
          type: 'currency',
          icon: DollarSign,
          valuePaths: ['invoice_amount_pre_tax', 'amount_without_tax', 'extracted_data.invoice_amount_pre_tax', 'extracted_data.structured_data.invoice_amount_pre_tax', 'extracted_data.structured_data.invoiceAmountPreTax', 'extracted_data.invoiceAmountPreTax', 'extracted_data.amount_without_tax']
        },
        {
          key: 'tax_amount',
          label: '税额',
          type: 'currency',
          icon: DollarSign,
          valuePaths: ['invoice_tax', 'tax_amount', 'extracted_data.invoice_tax', 'extracted_data.structured_data.invoice_tax', 'extracted_data.structured_data.invoiceTax', 'extracted_data.invoiceTax', 'extracted_data.tax_amount']
        },
        {
          key: 'total_amount_in_words',
          label: '价税合计（大写）',
          type: 'readonly',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.totalAmountInWords', 'extracted_data.totalAmountInWords']
        },
        {
          key: 'password_area',
          label: '密码区',
          type: 'readonly',
          icon: Hash,
          valuePaths: ['extracted_data.structured_data.passwordArea', 'extracted_data.passwordArea'],
          showWhen: (invoice) => {
            const value = getValueFromPaths(invoice, ['extracted_data.structured_data.passwordArea', 'extracted_data.passwordArea']);
            return value && value !== '';
          }
        }
      ]
    },
    {
      key: 'seller_info',
      title: '销售方信息',
      icon: Building2,
      fields: [
        {
          key: 'seller_name',
          label: '销售方名称',
          type: 'text',
          icon: Building2,
          required: true,
          valuePaths: ['extracted_data.structured_data.sellerName', 'extracted_data.sellerName', 'extracted_data.seller_name', 'seller_name']
        },
        {
          key: 'seller_tax_number',
          label: '纳税人识别号',
          type: 'text',
          icon: Hash,
          valuePaths: ['extracted_data.structured_data.sellerTaxNumber', 'extracted_data.sellerTaxNumber', 'extracted_data.seller_tax_number', 'seller_tax_number']
        },
        {
          key: 'seller_contact_info',
          label: '地址电话',
          type: 'readonly',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.sellerContactInfo', 'extracted_data.sellerContactInfo']
        },
        {
          key: 'seller_bank_info',
          label: '开户行及账号',
          type: 'readonly',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.sellerBankAccountInfo', 'extracted_data.sellerBankAccountInfo']
        }
      ]
    },
    {
      key: 'buyer_info',
      title: '购买方信息',
      icon: User,
      fields: [
        {
          key: 'buyer_name',
          label: '购买方名称',
          type: 'text',
          icon: User,
          required: true,
          valuePaths: ['extracted_data.structured_data.purchaserName', 'extracted_data.purchaserName', 'extracted_data.buyer_name', 'buyer_name']
        },
        {
          key: 'buyer_tax_number',
          label: '纳税人识别号',
          type: 'text',
          icon: Hash,
          valuePaths: ['extracted_data.structured_data.purchaserTaxNumber', 'extracted_data.purchaserTaxNumber', 'extracted_data.buyer_tax_number', 'buyer_tax_number']
        },
        {
          key: 'buyer_contact_info',
          label: '地址电话',
          type: 'readonly',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.purchaserContactInfo', 'extracted_data.purchaserContactInfo']
        },
        {
          key: 'buyer_bank_info',
          label: '开户行及账号',
          type: 'readonly',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.purchaserBankAccountInfo', 'extracted_data.purchaserBankAccountInfo']
        }
      ]
    },
    {
      key: 'details_info',
      title: '商品明细',
      icon: Package,
      showWhen: (invoice) => {
        // 使用与字段valuePaths相同的检查逻辑
        const details = 
          invoice.extracted_data?.raw_result?.Data?.subMsgs?.[0]?.result?.data?.invoiceDetails ||
          invoice.extracted_data?.structured_data?.invoice_details || 
          invoice.extracted_data?.invoice_details || 
          invoice.extracted_data?.structured_data?.invoiceDetails || 
          invoice.invoice_details;
        
        console.log('🔍 [details_info showWhen] 检查商品明细分组显示条件:', {
          invoice_type: invoice.invoice_type,
          details,
          isArray: Array.isArray(details),
          length: Array.isArray(details) ? details.length : 'N/A',
          shouldShow: Array.isArray(details) && details.length > 0
        });
        
        return Array.isArray(details) && details.length > 0;
      },
      fields: [
        {
          key: 'invoice_details',
          label: '发票明细',
          type: 'readonly',
          icon: Package,
          valuePaths: [
            'extracted_data.raw_result.Data.subMsgs.0.result.data.invoiceDetails',
            'extracted_data.structured_data.invoice_details',
            'extracted_data.invoice_details',
            'extracted_data.structured_data.invoiceDetails',
            'invoice_details'
          ],
          description: '商品名称、规格型号、单位、数量、单价、金额、税率、税额'
        }
      ]
    },
    {
      key: 'other_info',
      title: '其他信息',
      icon: Info,
      fields: [
        {
          key: 'expense_category',
          label: '费用分类',
          type: 'category',
          icon: Tag,
          valuePaths: ['expense_category'],
          description: '发票的费用分类'
        },
        {
          key: 'drawer',
          label: '开票人',
          type: 'readonly',
          icon: User,
          valuePaths: ['extracted_data.structured_data.drawer', 'extracted_data.drawer']
        },
        {
          key: 'reviewer',
          label: '审核人',
          type: 'readonly',
          icon: User,
          valuePaths: ['extracted_data.structured_data.reviewer', 'extracted_data.reviewer']
        },
        {
          key: 'recipient',
          label: '收款人',
          type: 'readonly',
          icon: User,
          valuePaths: ['extracted_data.structured_data.recipient', 'extracted_data.recipient']
        },
        {
          key: 'remarks',
          label: '备注',
          type: 'textarea',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.remarks', 'extracted_data.remarks', 'remarks', 'notes']
        },
        {
          key: 'is_copy',
          label: '是否复印件',
          type: 'readonly',
          icon: Info,
          valuePaths: ['extracted_data.structured_data.isCopy', 'extracted_data.isCopy']
        }
      ]
    }
  ]
};

// 导出所有配置
export const invoiceTypeConfigs: InvoiceTypeConfig[] = [
  trainTicketConfig,
  vatInvoiceConfig
];

// 根据发票获取对应的配置
export const getInvoiceConfig = (invoice: Invoice): InvoiceTypeConfig => {
  console.log('🔍 [getInvoiceConfig] 检测发票类型:', {
    invoice_type: invoice.invoice_type,
    invoice_number: invoice.invoice_number,
    available_configs: invoiceTypeConfigs.map(c => c.type)
  });
  
  const matchedConfig = invoiceTypeConfigs.find(config => {
    const matches = config.matcher(invoice);
    console.log(`🔍 [getInvoiceConfig] 配置 ${config.type} 匹配结果:`, matches);
    return matches;
  });
  
  const finalConfig = matchedConfig || vatInvoiceConfig;
  console.log('🔍 [getInvoiceConfig] 最终使用配置:', finalConfig.type);
  
  return finalConfig;
};

// 获取字段的当前值
export const getFieldValue = (invoice: Invoice, field: FieldConfig): any => {
  const value = getValueFromPaths(invoice, field.valuePaths);
  
  // 调试发票明细字段
  if (field.key === 'invoice_details') {
    console.log('🔍 [getFieldValue] invoice_details 字段调试:', {
      fieldKey: field.key,
      valuePaths: field.valuePaths,
      value,
      valueType: typeof value,
      isArray: Array.isArray(value),
      invoice_extracted_data: invoice.extracted_data,
      invoice_direct_access: invoice.invoice_details
    });
  }
  
  return value;
};

// 验证字段值
export const validateField = (value: any, field: FieldConfig): string | null => {
  if (field.required && (!value || value.toString().trim() === '')) {
    return `${field.label}不能为空`;
  }

  if (field.validation && value) {
    const { pattern, min, max, message } = field.validation;
    
    if (pattern && !pattern.test(value.toString())) {
      return message || `${field.label}格式不正确`;
    }
    
    if (field.type === 'number' || field.type === 'currency') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return `${field.label}必须是有效数字`;
      }
      
      if (min !== undefined && numValue < min) {
        return message || `${field.label}不能小于${min}`;
      }
      
      if (max !== undefined && numValue > max) {
        return message || `${field.label}不能大于${max}`;
      }
    }
  }

  return null;
};

// 获取发票类型的中文名称
export const getInvoiceTypeName = (type?: string): string => {
  if (!type) return '通用发票';
  
  const typeLower = type.toLowerCase();
  
  // 根据关键词匹配类型名称
  if (typeLower.includes('火车') || typeLower.includes('铁路') || typeLower.includes('train')) {
    return '火车票';
  }
  if (typeLower.includes('机票') || typeLower.includes('航空') || typeLower.includes('flight')) {
    return '机票';
  }
  if (typeLower.includes('出租') || typeLower.includes('taxi')) {
    return '出租车票';
  }
  if (typeLower.includes('酒店') || typeLower.includes('住宿') || typeLower.includes('hotel')) {
    return '酒店发票';
  }
  if (typeLower.includes('餐饮') || typeLower.includes('餐') || typeLower.includes('restaurant')) {
    return '餐饮发票';
  }
  if (typeLower.includes('增值税') || typeLower.includes('vat')) {
    return '增值税发票';
  }
  if (typeLower.includes('过路') || typeLower.includes('高速') || typeLower.includes('toll')) {
    return '过路费发票';
  }
  if (typeLower.includes('停车') || typeLower.includes('parking')) {
    return '停车费发票';
  }
  
  // 如果无法匹配，返回原始类型或通用发票
  return type || '通用发票';
};

// 获取发票类型的图标
export const getInvoiceTypeIcon = (type?: string): string => {
  if (!type) return '📄';
  
  const typeLower = type.toLowerCase();
  
  // 根据关键词匹配图标
  if (typeLower.includes('火车') || typeLower.includes('铁路') || typeLower.includes('train')) {
    return '🚆';
  }
  if (typeLower.includes('机票') || typeLower.includes('航空') || typeLower.includes('flight')) {
    return '✈️';
  }
  if (typeLower.includes('出租') || typeLower.includes('taxi')) {
    return '🚕';
  }
  if (typeLower.includes('酒店') || typeLower.includes('住宿') || typeLower.includes('hotel')) {
    return '🏨';
  }
  if (typeLower.includes('餐饮') || typeLower.includes('餐') || typeLower.includes('restaurant')) {
    return '🍽️';
  }
  if (typeLower.includes('增值税') || typeLower.includes('vat')) {
    return '🧾';
  }
  if (typeLower.includes('过路') || typeLower.includes('高速') || typeLower.includes('toll')) {
    return '🛣️';
  }
  if (typeLower.includes('停车') || typeLower.includes('parking')) {
    return '🅿️';
  }
  
  return '📄';
};