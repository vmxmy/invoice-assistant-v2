import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Edit, 
  Trash2, 
  FileText,
  Calendar,
  Building,
  DollarSign,
  Tag,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import type { Invoice } from '../../../types/table';

interface InvoiceQuickViewProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  showImage?: boolean;
}

// 字段显示组件
const FieldDisplay: React.FC<{
  label: string;
  value: string | number | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
  type?: 'text' | 'currency' | 'date' | 'tag';
  copyable?: boolean;
}> = ({ label, value, icon: Icon, type = 'text', copyable = false }) => {
  const [copied, setCopied] = useState(false);

  const formatValue = () => {
    if (!value) return '-';
    
    switch (type) {
      case 'currency':
        return `¥${Number(value).toLocaleString()}`;
      case 'date':
        return new Date(value).toLocaleDateString('zh-CN');
      case 'tag':
        return String(value);
      default:
        return String(value);
    }
  };

  const handleCopy = async () => {
    if (value) {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-start justify-between py-3 border-b border-base-200 last:border-b-0">
      <div className="flex items-center gap-2 text-sm text-base-content/60 min-w-0 flex-1">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
        <span className="text-sm text-base-content truncate max-w-48">
          {formatValue()}
        </span>
        {copyable && value && (
          <button
            className="btn btn-ghost btn-xs"
            onClick={handleCopy}
            title="复制"
          >
            {copied ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const InvoiceQuickView: React.FC<InvoiceQuickViewProps> = ({
  invoice,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDownload,
  showImage = true
}) => {
  const [imageExpanded, setImageExpanded] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);

  if (!isOpen) return null;

  // 核心字段
  const coreFields = [
    { label: '发票号码', value: invoice.invoice_number, icon: FileText, copyable: true },
    { label: '开票日期', value: invoice.invoice_date, icon: Calendar, type: 'date' as const },
    { label: '销售方', value: invoice.seller_name, icon: Building, copyable: true },
    { label: '购买方', value: invoice.buyer_name, icon: Building },
    { label: '总金额', value: invoice.total_amount, icon: DollarSign, type: 'currency' as const },
  ];

  // 扩展字段
  const extendedFields = [
    { label: '发票代码', value: invoice.invoice_code, copyable: true },
    { label: '发票类型', value: invoice.invoice_type },
    { label: '消费日期', value: invoice.consumption_date, type: 'date' as const },
    { label: '不含税金额', value: invoice.amount_without_tax, type: 'currency' as const },
    { label: '税额', value: invoice.tax_amount, type: 'currency' as const },
    { label: '费用分类', value: invoice.expense_category, icon: Tag },
    { label: '状态', value: invoice.status },
    { label: '来源', value: invoice.source },
    { label: '创建时间', value: invoice.created_at, type: 'date' as const },
  ].filter(field => field.value); // 只显示有值的字段

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-base-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{invoice.invoice_number}</h2>
              <p className="text-sm text-base-content/60">{invoice.seller_name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 操作按钮 */}
            {onDownload && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onDownload(invoice)}
                title="下载"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onEdit(invoice)}
                title="编辑"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                className="btn btn-ghost btn-sm text-error"
                onClick={() => onDelete(invoice)}
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* 左侧：发票图片 */}
          {showImage && invoice.file_url && (
            <div className="lg:w-1/2 bg-base-200 flex items-center justify-center relative">
              <div className="w-full h-full flex items-center justify-center p-4">
                {imageExpanded ? (
                  <div className="relative w-full h-full">
                    <img
                      src={invoice.file_url}
                      alt="发票图片"
                      className="w-full h-full object-contain"
                    />
                    <button
                      className="absolute top-4 right-4 btn btn-sm btn-circle btn-ghost bg-base-100/80"
                      onClick={() => setImageExpanded(false)}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={invoice.file_url}
                      alt="发票缩略图"
                      className="max-w-full max-h-64 object-contain cursor-pointer"
                      onClick={() => setImageExpanded(true)}
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="bg-base-100 rounded-full p-2">
                        <ZoomIn className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 右侧：发票信息 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* 核心信息 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base">基本信息</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {invoice.status === 'unreimbursed' ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : invoice.status === 'reimbursed' ? (
                        <AlertCircle className="w-4 h-4 text-info" />
                      ) : invoice.status === 'voided' ? (
                        <XCircle className="w-4 h-4 text-error" />
                      ) : null}
                      <span className={`badge ${
                        invoice.status === 'unreimbursed' ? 'badge-success' : 
                        invoice.status === 'reimbursed' ? 'badge-info' :
                        invoice.status === 'voided' ? 'badge-error' : 'badge-ghost'
                      }`}>
                        {invoice.status === 'unreimbursed' ? '未报销' :
                         invoice.status === 'reimbursed' ? '已报销' :
                         invoice.status === 'voided' ? '作废' : invoice.status}
                      </span>
                    </div>
                    {invoice.total_amount && (
                      <span className="text-lg font-bold text-success">
                        ¥{Number(invoice.total_amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {coreFields.map((field, index) => (
                    <FieldDisplay key={index} {...field} />
                  ))}
                </div>
              </div>

              {/* 扩展信息 */}
              {extendedFields.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-base">详细信息</h3>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowAllFields(!showAllFields)}
                    >
                      {showAllFields ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          收起
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          展开 ({extendedFields.length})
                        </>
                      )}
                    </button>
                  </div>
                  
                  {showAllFields && (
                    <div className="space-y-1">
                      {extendedFields.map((field, index) => (
                        <FieldDisplay key={index} {...field} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 标签 */}
              {invoice.tags && invoice.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base mb-3">标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {invoice.tags.map((tag, index) => (
                      <span key={index} className="badge badge-outline">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 快捷操作提示 */}
              <div className="bg-base-200/50 rounded-lg p-3 mb-4">
                <div className="text-xs text-base-content/60 space-y-1">
                  <p>• 按 <kbd className="kbd kbd-xs">ESC</kbd> 关闭窗口</p>
                  <p>• 按 <kbd className="kbd kbd-xs">Ctrl+E</kbd> 编辑发票</p>
                  <p>• 按 <kbd className="kbd kbd-xs">Ctrl+D</kbd> 下载发票</p>
                  {showNavigation && (
                    <p>• 按 <kbd className="kbd kbd-xs">←</kbd> <kbd className="kbd kbd-xs">→</kbd> 切换发票</p>
                  )}
                </div>
              </div>
              
              {/* 操作区域 */}
              <div className="pt-4 border-t border-base-200">
                <div className="grid grid-cols-2 gap-3">
                  {onEdit && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onEdit(invoice)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      编辑发票
                    </button>
                  )}
                  {onDownload && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => onDownload(invoice)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下载文件
                    </button>
                  )}
                  {invoice.file_url && (
                    <a
                      href={invoice.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm col-span-2"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      在新页面中打开原图
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceQuickView;