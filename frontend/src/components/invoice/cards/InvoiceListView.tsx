import React from 'react';
import InvoiceCard from './InvoiceCard';

// 视图数据结构 - 来自 invoice_management_view
interface Invoice {
  // 基础发票信息
  id: string;
  user_id: string;
  email_task_id?: string;
  invoice_number: string;
  invoice_code?: string;
  invoice_type?: string;
  status: string;
  processing_status?: string;
  amount: number;
  tax_amount?: number;
  total_amount?: number;
  currency: string;
  invoice_date: string;
  seller_name?: string;
  seller_tax_id?: string;
  buyer_name?: string;
  buyer_tax_id?: string;
  
  // 文件信息
  file_path?: string;
  file_url?: string;
  file_size?: number;
  file_hash?: string;
  source: string;
  source_metadata?: Record<string, any>;
  
  // 验证信息
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;
  
  // 标签和基础分类
  tags?: string[];
  basic_category?: string; // 原来的 category 字段
  
  // 分类信息 - 从关联表获取
  primary_category_id?: string;
  primary_category_name?: string;
  primary_category_code?: string;
  primary_category_color?: string;
  primary_category_icon?: string;
  secondary_category_id?: string;
  secondary_category_name?: string;
  secondary_category_code?: string;
  
  // 自动分类信息
  auto_classified?: boolean;
  classification_confidence?: number;
  classification_metadata?: Record<string, any>;
  
  // 提取数据
  extracted_data: Record<string, any>;
  
  // 计算字段
  remarks: string; // 从多个来源提取的备注
  expense_category: string; // 综合判断的费用类别
  expense_category_code: string;
  category_icon: string;
  category_color: string;
  display_amount: number; // 显示金额
  category_path: string; // 分类层级路径
  status_text: string; // 状态中文显示
  processing_status_text: string; // 处理状态中文显示
  source_text: string; // 来源中文显示
  
  // 时间信息
  started_at?: string;
  completed_at?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // 元数据和版本
  metadata: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  version: number;
}

interface InvoiceListViewProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  onSelectInvoice: (invoiceId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onStatusChange?: (invoiceId: string, newStatus: string) => Promise<boolean>;
  onConsumptionDateChange?: (invoiceId: string, newDate: string) => Promise<boolean>;
  isLoading?: boolean;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({
  invoices,
  selectedInvoices,
  onSelectInvoice,
  onViewInvoice,
  onDownloadInvoice,
  onDeleteInvoice,
  onStatusChange,
  onConsumptionDateChange,
  isLoading = false
}) => {

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-base-300 rounded"></div>
                    <div className="w-24 h-4 bg-base-300 rounded"></div>
                  </div>
                  <div className="w-6 h-6 bg-base-300 rounded-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-32 h-3 bg-base-300 rounded"></div>
                  <div className="w-48 h-3 bg-base-300 rounded"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="w-20 h-5 bg-base-300 rounded"></div>
                  <div className="flex gap-2">
                    <div className="w-12 h-8 bg-base-300 rounded"></div>
                    <div className="w-12 h-8 bg-base-300 rounded"></div>
                    <div className="w-12 h-8 bg-base-300 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* 发票列表 - 响应式网格卡片视图 */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6 w-full">
        {invoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            isSelected={selectedInvoices.includes(invoice.id)}
            onSelect={onSelectInvoice}
            onView={onViewInvoice}
            onEdit={onDownloadInvoice}
            onDelete={onDeleteInvoice}
            onStatusChange={onStatusChange}
            onConsumptionDateChange={onConsumptionDateChange}
          />
        ))}
      </div>
    </div>
  );
};

export default InvoiceListView;