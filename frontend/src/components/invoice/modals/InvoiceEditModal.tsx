import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Building2, 
  User, 
  DollarSign,
  Tag,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { useUpdateInvoice } from '../../../hooks/useInvoices';
import { notify } from '../../../utils/notifications';
import { LoadingButton } from '../../ui/LoadingButton';
import { SuccessAnimation } from '../../ui/SuccessAnimation';
import type { Invoice } from '../../../types';

interface InvoiceEditModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  invoice_number: string;
  invoice_date: string;
  seller_name: string;
  buyer_name: string;
  total_amount: string;
  tags: string[];
  notes: string;
}

interface FormErrors {
  invoice_number?: string;
  invoice_date?: string;
  seller_name?: string;
  buyer_name?: string;
  total_amount?: string;
}

export const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccess
}) => {
  // 表单数据
  const [formData, setFormData] = useState<FormData>({
    invoice_number: '',
    invoice_date: '',
    seller_name: '',
    buyer_name: '',
    total_amount: '',
    tags: [],
    notes: ''
  });

  // 表单错误
  const [errors, setErrors] = useState<FormErrors>({});

  // 标签输入
  const [tagInput, setTagInput] = useState('');

  // 成功状态
  const [showSuccess, setShowSuccess] = useState(false);

  // 更新发票 mutation
  const updateInvoiceMutation = useUpdateInvoice();

  // 初始化表单数据
  useEffect(() => {
    if (invoice && isOpen) {
      setFormData({
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date.split('T')[0], // 格式化日期
        seller_name: invoice.seller_name,
        buyer_name: invoice.buyer_name,
        total_amount: invoice.total_amount.toString(),
        tags: invoice.tags || [],
        notes: invoice.notes || ''
      });
      setErrors({});
      setTagInput('');
      setShowSuccess(false);
    }
  }, [invoice, isOpen]);

  // 控制模态框显示
  useEffect(() => {
    const modal = document.getElementById('invoice-edit-modal') as HTMLDialogElement;
    if (modal) {
      if (isOpen && invoice) {
        modal.showModal();
      } else {
        modal.close();
      }
    }
  }, [isOpen, invoice]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除对应字段的错误
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 发票号码验证
    if (!formData.invoice_number.trim()) {
      newErrors.invoice_number = '发票号码不能为空';
    } else if (!/^[0-9A-Za-z]+$/.test(formData.invoice_number)) {
      newErrors.invoice_number = '发票号码只能包含数字和字母';
    }

    // 日期验证
    if (!formData.invoice_date) {
      newErrors.invoice_date = '开票日期不能为空';
    } else {
      const selectedDate = new Date(formData.invoice_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        newErrors.invoice_date = '开票日期不能晚于今天';
      }
    }

    // 销售方验证
    if (!formData.seller_name.trim()) {
      newErrors.seller_name = '销售方名称不能为空';
    }

    // 购买方验证
    if (!formData.buyer_name.trim()) {
      newErrors.buyer_name = '购买方名称不能为空';
    }

    // 金额验证
    const amount = parseFloat(formData.total_amount);
    if (!formData.total_amount || isNaN(amount)) {
      newErrors.total_amount = '请输入有效的金额';
    } else if (amount <= 0) {
      newErrors.total_amount = '金额必须大于0';
    } else if (amount > 9999999.99) {
      newErrors.total_amount = '金额不能超过9,999,999.99';
    } else if (!/^\d+(\.\d{1,2})?$/.test(formData.total_amount)) {
      newErrors.total_amount = '金额最多保留2位小数';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 添加标签
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 处理标签输入键盘事件
  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !invoice) {
      return;
    }

    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoice.id,
        data: {
          invoice_number: formData.invoice_number,
          invoice_date: formData.invoice_date,
          seller_name: formData.seller_name,
          buyer_name: formData.buyer_name,
          total_amount: parseFloat(formData.total_amount),
          tags: formData.tags,
          notes: formData.notes
        }
      });

      // 显示成功动画
      setShowSuccess(true);
      
      // 延迟关闭模态框
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error: any) {
      notify.error(error.message || '发票更新失败');
    }
  };

  // 处理取消
  const handleCancel = () => {
    setErrors({});
    setTagInput('');
    onClose();
  };

  return (
    <dialog id="invoice-edit-modal" className="modal modal-bottom sm:modal-middle">
      <div className="modal-box w-full max-w-3xl mx-4 sm:mx-auto">
        {/* 标题 */}
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          编辑发票
        </h3>

        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 发票号码 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  发票号码
                </span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleInputChange}
                className={`input input-bordered ${errors.invoice_number ? 'input-error' : ''}`}
                placeholder="请输入发票号码"
              />
              {errors.invoice_number && (
                <label className="label">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.invoice_number}
                  </span>
                </label>
              )}
            </div>

            {/* 开票日期 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  开票日期
                </span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <input
                type="date"
                name="invoice_date"
                value={formData.invoice_date}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className={`input input-bordered ${errors.invoice_date ? 'input-error' : ''}`}
              />
              {errors.invoice_date && (
                <label className="label">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.invoice_date}
                  </span>
                </label>
              )}
            </div>

            {/* 销售方 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  销售方名称
                </span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <input
                type="text"
                name="seller_name"
                value={formData.seller_name}
                onChange={handleInputChange}
                className={`input input-bordered ${errors.seller_name ? 'input-error' : ''}`}
                placeholder="请输入销售方名称"
              />
              {errors.seller_name && (
                <label className="label">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.seller_name}
                  </span>
                </label>
              )}
            </div>

            {/* 购买方 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <User className="w-4 h-4" />
                  购买方名称
                </span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <input
                type="text"
                name="buyer_name"
                value={formData.buyer_name}
                onChange={handleInputChange}
                className={`input input-bordered ${errors.buyer_name ? 'input-error' : ''}`}
                placeholder="请输入购买方名称"
              />
              {errors.buyer_name && (
                <label className="label">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.buyer_name}
                  </span>
                </label>
              )}
            </div>

            {/* 发票金额 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  发票金额
                </span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                max="9999999.99"
                className={`input input-bordered ${errors.total_amount ? 'input-error' : ''}`}
                placeholder="0.00"
              />
              {errors.total_amount && (
                <label className="label">
                  <span className="label-text-alt text-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.total_amount}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* 标签 */}
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Tag className="w-4 h-4" />
                标签
              </span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="input input-bordered flex-1"
                placeholder="输入标签后按回车添加"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="btn btn-outline btn-primary"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 bg-base-200 rounded-lg">
              {formData.tags.length === 0 ? (
                <span className="text-base-content/50 text-sm">暂无标签</span>
              ) : (
                formData.tags.map((tag, index) => (
                  <div key={index} className="badge badge-primary gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="btn btn-ghost btn-xs p-0 h-4 w-4"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 备注 */}
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">备注</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="textarea textarea-bordered h-24"
              placeholder="添加备注信息..."
            />
          </div>

          {/* 操作按钮 */}
          <div className="modal-action">
            <button
              type="button"
              className="btn"
              onClick={handleCancel}
              disabled={updateInvoiceMutation.isPending}
            >
              取消
            </button>
            <LoadingButton
              type="submit"
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              isLoading={updateInvoiceMutation.isPending}
              loadingText="保存中..."
              disabled={updateInvoiceMutation.isPending}
            >
              保存
            </LoadingButton>
          </div>
        </form>
      </div>

      {/* 背景遮罩 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleCancel}>close</button>
      </form>
      
      {/* 成功动画 */}
      <SuccessAnimation
        show={showSuccess}
        message="发票更新成功"
        onComplete={() => setShowSuccess(false)}
      />
    </dialog>
  );
};

export default InvoiceEditModal;