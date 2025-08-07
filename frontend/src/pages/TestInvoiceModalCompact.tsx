/**
 * 测试页面 - InvoiceModal紧凑版本
 * 展示新的紧凑设计系统在模态框中的应用
 */
import React, { useState } from 'react';
import { FileText, Eye, Edit3, Settings } from 'lucide-react';
import InvoiceModal from '../components/invoice/InvoiceModal';
import type { Invoice } from '../types';

// 模拟发票数据
const mockInvoice: Invoice = {
  id: 'test-invoice-001',
  user_id: 'test-user',
  invoice_number: 'INV-2024-001234',
  invoice_code: '032001800111',
  invoice_type: 'special_vat',
  status: 'unreimbursed',
  processing_status: 'completed',
  amount: 1299.99,
  tax_amount: 169.99,
  total_amount: 1469.98,
  currency: 'CNY',
  invoice_date: '2024-01-15',
  consumption_date: '2024-01-15',
  seller_name: '北京科技有限公司',
  seller_tax_id: '91110000000000001X',
  buyer_name: '上海贸易有限公司',
  buyer_tax_id: '91310000000000002Y',
  file_path: 'invoices/2024/01/test-invoice.pdf',
  file_url: 'https://example.com/invoice.pdf',
  file_size: 245760,
  source: 'email',
  source_metadata: {
    email_subject: '发票邮件',
    sender: 'finance@company.com'
  },
  is_verified: true,
  verified_at: '2024-01-16T09:30:00Z',
  tags: ['重要', '急需报销', '差旅'],
  category: '差旅费',
  expense_category: '交通费',
  primary_category_name: '差旅费',
  secondary_category_name: '交通费',
  remarks: '北京出差产生的交通费用，包含高铁票和出租车费用',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-16T09:30:00Z',
  extracted_data: {
    title: '增值税专用发票',
    invoice_details: [
      {
        itemName: '高铁票',
        specification: '北京南-上海虹桥',
        unit: '张',
        quantity: 2,
        unitPrice: 553.50,
        amount: 1107.00,
        taxRate: '9%',
        tax: 99.63
      },
      {
        itemName: '出租车费',
        specification: '市内交通',
        unit: '次',
        quantity: 3,
        unitPrice: 64.33,
        amount: 192.99,
        taxRate: '3%',
        tax: 5.79
      }
    ]
  },
  metadata: {
    extraction_confidence: 0.95,
    manual_review_required: false
  },
  version: 1
};

const TestInvoiceModalCompact: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  const handleOpenModal = (mode: 'view' | 'edit') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleModeChange = (newMode: 'view' | 'edit') => {
    setModalMode(newMode);
  };

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-base-content mb-4">
            发票模态框 - 紧凑设计测试
          </h1>
          <p className="text-base-content/70 max-w-2xl mx-auto">
            测试全新的紧凑版发票模态框，采用统一的设计系统，提供更好的用户体验和响应式布局。
            信息密度提升30%以上，支持键盘快捷键操作。
          </p>
        </div>

        {/* 设计特性展示 */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-base-100 shadow-md border border-base-200">
            <div className="card-body text-center">
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-bold">紧凑布局</h3>
              <p className="text-sm text-base-content/70">
                采用CSS变量统一间距，信息密度提升30%
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-md border border-base-200">
            <div className="card-body text-center">
              <Settings className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-bold">响应式设计</h3>
              <p className="text-sm text-base-content/70">
                移动端全屏，桌面端紧凑，完美适配各种屏幕
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-md border border-base-200">
            <div className="card-body text-center">
              <kbd className="kbd kbd-sm">Ctrl</kbd> + <kbd className="kbd kbd-sm">S</kbd>
              <h3 className="font-bold mt-2">快捷键支持</h3>
              <p className="text-sm text-base-content/70">
                ESC关闭 • Ctrl+S保存 • Ctrl+E编辑
              </p>
            </div>
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">
              <FileText className="w-6 h-6" />
              模拟发票信息
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <span className="font-medium text-base-content/60">发票号码：</span>
                <span>{mockInvoice.invoice_number}</span>
              </div>
              <div>
                <span className="font-medium text-base-content/60">发票类型：</span>
                <span>增值税专用发票</span>
              </div>
              <div>
                <span className="font-medium text-base-content/60">开票日期：</span>
                <span>{new Date(mockInvoice.invoice_date).toLocaleDateString('zh-CN')}</span>
              </div>
              <div>
                <span className="font-medium text-base-content/60">总金额：</span>
                <span className="text-success font-bold">¥{mockInvoice.total_amount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="btn btn-primary btn-md"
                onClick={() => handleOpenModal('view')}
              >
                <Eye className="w-4 h-4" />
                查看模式
              </button>
              
              <button
                className="btn btn-secondary btn-md"
                onClick={() => handleOpenModal('edit')}
              >
                <Edit3 className="w-4 h-4" />
                编辑模式
              </button>
            </div>
          </div>
        </div>

        {/* 设计说明 */}
        <div className="mt-8 prose prose-sm max-w-none">
          <h3>🎨 设计改进亮点</h3>
          <ul>
            <li><strong>去除emoji图标</strong>：使用Lucide图标替代，更专业更一致</li>
            <li><strong>紧凑间距系统</strong>：基于CSS变量的统一间距，减少视觉噪音</li>
            <li><strong>响应式尺寸</strong>：移动端全屏，桌面端紧凑，自适应用户设备</li>
            <li><strong>状态指示优化</strong>：清晰的模式指示器，用户始终知道当前状态</li>
            <li><strong>键盘快捷键</strong>：ESC关闭、Ctrl+S保存、Ctrl+E编辑</li>
            <li><strong>加载状态改进</strong>：更简洁的加载动画和错误提示</li>
            <li><strong>按钮布局优化</strong>：移动端垂直排列，桌面端水平排列</li>
            <li><strong>无障碍支持</strong>：focus状态、screen reader支持</li>
          </ul>
        </div>
      </div>

      {/* 紧凑版模态框 */}
      <InvoiceModal
        invoiceId={mockInvoice.id}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          console.log('发票保存成功');
          setIsModalOpen(false);
        }}
        mode={modalMode}
        onModeChange={handleModeChange}
      />
    </div>
  );
};

export default TestInvoiceModalCompact;