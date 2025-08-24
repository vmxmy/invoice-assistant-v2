import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Save,
  ArrowLeft,
  Mail,
  Building,
  CreditCard,
  FileText
} from 'lucide-react';
import { 
  MobileInputV2,
  MobileTextarea,
  MobileSelect,
  MobileNumberInput,
  MobileFormValidator,
  MobileValidator,
  useFormValidation,
  type FieldValidation
} from './index';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  businessType: string;
  revenue: number;
  description: string;
  website: string;
  phone: string;
}

const MobileInputDemoPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    businessType: '',
    revenue: 0,
    description: '',
    website: '',
    phone: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 业务类型选项
  const businessTypes = [
    { value: 'technology', label: '科技公司', icon: <Building className="w-4 h-4" /> },
    { value: 'retail', label: '零售业', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'finance', label: '金融服务', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'consulting', label: '咨询服务', icon: <FileText className="w-4 h-4" /> },
    { value: 'manufacturing', label: '制造业', icon: <Building className="w-4 h-4" /> },
    { value: 'other', label: '其他', icon: <FileText className="w-4 h-4" /> }
  ];

  // 邮箱自动完成建议
  const emailSuggestions = [
    { value: 'user@gmail.com', label: 'Gmail', icon: <Mail className="w-4 h-4" /> },
    { value: 'user@outlook.com', label: 'Outlook', icon: <Mail className="w-4 h-4" /> },
    { value: 'user@company.com', label: 'Company Email', icon: <Mail className="w-4 h-4" /> }
  ];

  // 验证配置
  const validations: FieldValidation[] = [
    {
      name: 'email',
      label: '邮箱地址',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.email(),
        MobileValidator.presets.custom(async (value) => {
          // 模拟异步验证邮箱是否已存在
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (value === 'existing@example.com') {
            return '该邮箱已被注册';
          }
          return null;
        })
      ],
      validateOn: 'blur',
      debounce: 500
    },
    {
      name: 'password',
      label: '密码',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.minLength(8, '密码至少需要8位'),
        MobileValidator.presets.pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          '密码必须包含大小写字母和数字'
        )
      ],
      validateOn: 'change',
      debounce: 300
    },
    {
      name: 'confirmPassword',
      label: '确认密码',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.match('password', '两次密码输入不一致')
      ],
      validateOn: 'blur'
    },
    {
      name: 'companyName',
      label: '公司名称',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.minLength(2, '公司名称至少2个字符'),
        MobileValidator.presets.maxLength(50, '公司名称不能超过50个字符')
      ],
      validateOn: 'blur'
    },
    {
      name: 'businessType',
      label: '业务类型',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.oneOf(
          businessTypes.map(t => t.value),
          '请选择有效的业务类型'
        )
      ],
      validateOn: 'change'
    },
    {
      name: 'revenue',
      label: '年收入',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.min(0, '收入不能为负数'),
        MobileValidator.presets.max(10000000000, '收入不能超过100亿')
      ],
      validateOn: 'blur'
    },
    {
      name: 'description',
      label: '公司描述',
      rules: [
        MobileValidator.presets.maxLength(500, '描述不能超过500字符')
      ],
      validateOn: 'blur'
    },
    {
      name: 'website',
      label: '网站地址',
      rules: [
        MobileValidator.presets.url('请输入有效的网站地址')
      ],
      validateOn: 'blur',
      when: (data) => data.businessType === 'technology' // 只有科技公司需要填写网站
    },
    {
      name: 'phone',
      label: '手机号码',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.phone()
      ],
      validateOn: 'blur'
    }
  ];

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // 模拟表单提交
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('表单提交成功！');
    } catch (error) {
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 pb-safe">
      {/* 页面头部 */}
      <div className="sticky top-0 z-50 bg-base-100 border-b border-base-300 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-circle btn-sm"
              aria-label="返回"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-medium">输入组件系统演示</h1>
          </div>
          <div className="badge badge-primary">V2</div>
        </div>
      </div>

      <div className="container mx-auto max-w-md p-4">
        <MobileFormValidator
          validations={validations}
          formData={formData}
          showSummary={true}
          summaryPosition="top"
          onValidationChange={(result) => {
            console.log('验证结果:', result);
          }}
        >
          <ValidatedForm onSubmit={handleSubmit} />
        </MobileFormValidator>
      </div>
    </div>
  );
};

// 独立的表单组件，使用验证上下文
const ValidatedForm: React.FC<{ onSubmit: (event: React.FormEvent) => void }> = ({ onSubmit }) => {
  const { validateForm, validationResult } = useFormValidation();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    businessType: '',
    revenue: 0,
    description: '',
    website: '',
    phone: ''
  });

  const businessTypes = [
    { value: 'technology', label: '科技公司', icon: <Building className="w-4 h-4" /> },
    { value: 'retail', label: '零售业', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'finance', label: '金融服务', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'consulting', label: '咨询服务', icon: <FileText className="w-4 h-4" /> },
    { value: 'manufacturing', label: '制造业', icon: <Building className="w-4 h-4" /> },
    { value: 'other', label: '其他', icon: <FileText className="w-4 h-4" /> }
  ];

  const emailSuggestions = [
    { value: 'user@gmail.com', label: 'Gmail', icon: <Mail className="w-4 h-4" /> },
    { value: 'user@outlook.com', label: 'Outlook', icon: <Mail className="w-4 h-4" /> },
    { value: 'user@company.com', label: 'Company Email', icon: <Mail className="w-4 h-4" /> }
  ];

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const result = await validateForm();
    if (result.isValid) {
      onSubmit(event);
    } else {
      console.log('表单验证失败:', result.errors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息部分 */}
      <section>
        <h2 className="text-lg font-medium mb-4 text-base-content">基本信息</h2>
        
        <div className="space-y-4">
          <MobileInputV2
            type="email"
            label="邮箱地址"
            placeholder="请输入邮箱地址"
            value={formData.email}
            onChange={(value) => updateField('email', value)}
            autocompleteSuggestions={emailSuggestions}
            required
            helperText="我们将向此邮箱发送验证邮件"
            className="w-full"
          />

          <MobileInputV2
            type="password"
            label="密码"
            placeholder="请设置密码"
            value={formData.password}
            onChange={(value) => updateField('password', value)}
            required
            helperText="密码需包含大小写字母和数字，至少8位"
            className="w-full"
          />

          <MobileInputV2
            type="password"
            label="确认密码"
            placeholder="请再次输入密码"
            value={formData.confirmPassword}
            onChange={(value) => updateField('confirmPassword', value)}
            required
            className="w-full"
          />

          <MobileInputV2
            type="tel"
            label="手机号码"
            placeholder="请输入手机号码"
            value={formData.phone}
            onChange={(value) => updateField('phone', value)}
            required
            className="w-full"
          />
        </div>
      </section>

      {/* 公司信息部分 */}
      <section>
        <h2 className="text-lg font-medium mb-4 text-base-content">公司信息</h2>
        
        <div className="space-y-4">
          <MobileInputV2
            type="text"
            label="公司名称"
            placeholder="请输入公司名称"
            value={formData.companyName}
            onChange={(value) => updateField('companyName', value)}
            required
            className="w-full"
          />

          <MobileSelect
            label="业务类型"
            placeholder="请选择业务类型"
            value={formData.businessType}
            onChange={(value) => updateField('businessType', value)}
            options={businessTypes}
            required
            searchable
            className="w-full"
          />

          <MobileNumberInput
            numberType="currency"
            label="年收入"
            placeholder="请输入年收入"
            value={formData.revenue}
            onChange={(value) => updateField('revenue', value)}
            formatOptions={{
              currency: 'CNY',
              useGrouping: true
            }}
            showSteppers
            required
            className="w-full"
          />

          {/* 条件显示网站地址 */}
          {formData.businessType === 'technology' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MobileInputV2
                type="url"
                label="网站地址"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(value) => updateField('website', value)}
                helperText="科技公司请提供官方网站"
                className="w-full"
              />
            </motion.div>
          )}

          <MobileTextarea
            label="公司描述"
            placeholder="请简要描述您的公司..."
            value={formData.description}
            onChange={(value) => updateField('description', value)}
            maxLength={500}
            showCharCount
            autoResize={{ minRows: 3, maxRows: 6 }}
            helperText="选填，用于更好地了解您的业务"
            className="w-full"
          />
        </div>
      </section>

      {/* 提交按钮 */}
      <div className="sticky bottom-safe bg-base-100 pt-4 pb-2 border-t border-base-300 -mx-4 px-4">
        <button
          type="submit"
          disabled={!validationResult.isValid}
          className={`
            btn w-full
            ${validationResult.isValid ? 'btn-primary' : 'btn-disabled'}
            ${validationResult.pendingFields.length > 0 ? 'loading' : ''}
          `}
        >
          {validationResult.pendingFields.length > 0 ? (
            '验证中...'
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              提交注册
            </>
          )}
        </button>

        {/* 验证状态指示器 */}
        <div className="mt-2 text-center text-sm text-base-content/60">
          {validationResult.isValid ? (
            <span className="text-success">✓ 所有字段验证通过</span>
          ) : (
            <span className="text-error">
              {Object.keys(validationResult.errors).length} 个字段需要修正
            </span>
          )}
        </div>
      </div>
    </form>
  );
};

export default MobileInputDemoPage;