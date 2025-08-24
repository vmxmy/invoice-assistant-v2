import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Palette, 
  FileText,
  CheckSquare,
  Hash,
  Upload,
  Mail,
  Phone,
  DollarSign,
  Calendar
} from 'lucide-react';
import {
  MobileInputV2,
  MobileTextarea,
  MobileSelect,
  MobileNumberInput,
  MobileFileUpload,
  MobileFormValidator,
  MobileValidator
} from '../components/mobile';
import type { 
  UploadedFile, 
  FieldValidation,
  ValidationResult
} from '../components/mobile';

const MobileInputDemoPage: React.FC = () => {
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    password: '',
    bio: '',
    category: '',
    tags: [] as string[],
    amount: 0,
    quantity: 1,
    percentage: 0,
    files: [] as UploadedFile[]
  });

  // 验证配置
  const validations: FieldValidation[] = [
    {
      name: 'name',
      label: '姓名',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.minLength(2),
        MobileValidator.presets.maxLength(20)
      ],
      validateOn: 'blur'
    },
    {
      name: 'email',
      label: '邮箱',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.email()
      ],
      validateOn: 'change',
      debounce: 500
    },
    {
      name: 'phone',
      label: '手机号',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.phone()
      ],
      validateOn: 'blur'
    },
    {
      name: 'amount',
      label: '金额',
      rules: [
        MobileValidator.presets.required(),
        ...MobileValidator.presets.range(0, 999999)
      ],
      validateOn: 'change'
    }
  ];

  // 分类选项
  const categoryOptions = [
    { value: 'tech', label: '技术', icon: <Smartphone className="w-4 h-4" /> },
    { value: 'design', label: '设计', icon: <Palette className="w-4 h-4" /> },
    { value: 'business', label: '商务', icon: <FileText className="w-4 h-4" /> },
    { value: 'marketing', label: '市场营销', icon: <CheckSquare className="w-4 h-4" /> },
  ];

  // 标签选项
  const tagOptions = [
    { value: 'frontend', label: '前端开发' },
    { value: 'backend', label: '后端开发' },
    { value: 'mobile', label: '移动开发' },
    { value: 'ui', label: 'UI设计' },
    { value: 'ux', label: 'UX设计' },
    { value: 'data', label: '数据分析' },
    { value: 'ai', label: '人工智能' },
    { value: 'blockchain', label: '区块链' },
  ];

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleValidationChange = (result: ValidationResult) => {
    console.log('Validation result:', result);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* 页面头部 */}
      <div className="bg-primary text-primary-content p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Smartphone className="w-12 h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">移动端输入组件系统</h1>
            <p className="opacity-90">
              演示所有移动端优化的输入组件和表单验证功能
            </p>
          </motion.div>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="max-w-2xl mx-auto p-4">
        <MobileFormValidator
          validations={validations}
          formData={formData}
          onValidationChange={handleValidationChange}
          showSummary={true}
          summaryPosition="top"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基础文本输入 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-base-100 rounded-lg p-4"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                基础输入组件
              </h2>
              
              <div className="space-y-4">
                <MobileInputV2
                  label="姓名"
                  name="name"
                  placeholder="请输入您的姓名"
                  value={formData.name}
                  onChange={(value) => handleFormChange('name', value)}
                  required
                  showClearButton
                />

                <MobileInputV2
                  type="email"
                  label="邮箱地址"
                  name="email"
                  placeholder="example@domain.com"
                  value={formData.email}
                  onChange={(value) => handleFormChange('email', value)}
                  icon={<Mail className="w-5 h-5" />}
                  required
                  validateOnChange
                  debounceValidation={500}
                />

                <MobileInputV2
                  type="tel"
                  label="手机号码"
                  name="phone"
                  placeholder="请输入11位手机号"
                  value={formData.phone}
                  onChange={(value) => handleFormChange('phone', value)}
                  icon={<Phone className="w-5 h-5" />}
                  required
                  maxLength={11}
                />

                <MobileInputV2
                  type="url"
                  label="个人网站"
                  name="website"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(value) => handleFormChange('website', value)}
                  helperText="可选：您的个人网站或作品集"
                />

                <MobileInputV2
                  type="password"
                  label="密码"
                  name="password"
                  placeholder="至少8位字符"
                  value={formData.password}
                  onChange={(value) => handleFormChange('password', value)}
                  minLength={8}
                  helperText="密码应包含大小写字母和数字"
                />
              </div>
            </motion.div>

            {/* 文本区域 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-base-100 rounded-lg p-4"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                多行文本输入
              </h2>
              
              <MobileTextarea
                label="个人简介"
                name="bio"
                placeholder="请介绍一下自己..."
                value={formData.bio}
                onChange={(value) => handleFormChange('bio', value)}
                maxLength={500}
                showCharCount
                enableVoiceInput
                enableFullscreen
                autoResize={{ minRows: 3, maxRows: 8 }}
                helperText="最多500字符，支持语音输入和全屏编辑"
              />
            </motion.div>

            {/* 选择器 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-base-100 rounded-lg p-4"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                选择器组件
              </h2>
              
              <div className="space-y-4">
                <MobileSelect
                  label="专业领域"
                  name="category"
                  placeholder="请选择专业领域"
                  value={formData.category}
                  onChange={(value) => handleFormChange('category', value as string)}
                  options={categoryOptions}
                  searchable
                  clearable
                />

                <MobileSelect
                  label="技能标签"
                  name="tags"
                  placeholder="选择相关技能"
                  value={formData.tags}
                  onChange={(value) => handleFormChange('tags', value)}
                  options={tagOptions}
                  multiple
                  searchable
                  showSelectAll
                  maxSelections={5}
                  helperText="最多选择5个技能标签"
                />
              </div>
            </motion.div>

            {/* 数字输入 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-base-100 rounded-lg p-4"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5" />
                数字输入组件
              </h2>
              
              <div className="space-y-4">
                <MobileNumberInput
                  numberType="currency"
                  label="期望薪资"
                  name="amount"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(value) => handleFormChange('amount', value)}
                  min={0}
                  max={999999}
                  step={1000}
                  showSteppers
                  formatOptions={{
                    currency: 'CNY',
                    useGrouping: true
                  }}
                  required
                />

                <MobileNumberInput
                  numberType="integer"
                  label="工作年限"
                  name="quantity"
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(value) => handleFormChange('quantity', value)}
                  min={0}
                  max={50}
                  showSteppers
                  suffix="年"
                />

                <MobileNumberInput
                  numberType="percentage"
                  label="技能熟练度"
                  name="percentage"
                  placeholder="0"
                  value={formData.percentage}
                  onChange={(value) => handleFormChange('percentage', value)}
                  min={0}
                  max={100}
                  step={5}
                  showSteppers
                />
              </div>
            </motion.div>

            {/* 文件上传 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-base-100 rounded-lg p-4"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                文件上传组件
              </h2>
              
              <MobileFileUpload
                label="作品文件"
                name="files"
                value={formData.files}
                onChange={(files) => handleFormChange('files', files)}
                multiple
                maxFiles={5}
                acceptedTypes={[
                  { accept: 'image/*', maxSize: 5 * 1024 * 1024, description: '图片文件 (最大5MB)' },
                  { accept: '.pdf,.doc,.docx', maxSize: 10 * 1024 * 1024, description: 'PDF/Word文档 (最大10MB)' }
                ]}
                enableCamera
                enablePreview
                showThumbnails
                helperText="支持图片和文档文件，可拍照上传"
              />
            </motion.div>

            {/* 提交按钮 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="pt-6"
            >
              <button
                type="submit"
                className="btn btn-primary w-full h-12 text-lg"
              >
                提交表单
              </button>
            </motion.div>
          </form>
        </MobileFormValidator>

        {/* 调试信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 bg-base-100 rounded-lg p-4"
        >
          <h3 className="text-lg font-semibold mb-2">表单数据预览</h3>
          <pre className="bg-base-200 p-4 rounded-lg text-sm overflow-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </motion.div>
      </div>
    </div>
  );
};

export default MobileInputDemoPage;