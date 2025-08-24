# 移动端输入组件系统使用指南 V2

## 概述

移动端输入组件系统 V2 是专为移动设备深度优化的完整表单解决方案，包含了高级输入、选择、文件上传、表单验证和键盘适配等功能。该系统完全支持 TypeScript，提供完整的类型安全和智能提示。

## 核心特性

### 🎯 移动端优化
- **防缩放处理**: 自动设置16px字体防止iOS自动缩放
- **触摸友好**: 44px最小触摸目标，适配手指操作
- **键盘适配**: 智能检测虚拟键盘，自动调整布局
- **安全区域**: 支持刘海屏和底部指示器

### 🔧 输入体验
- **智能键盘**: 根据输入类型自动显示对应键盘
- **实时验证**: 支持防抖验证，避免过度请求
- **错误反馈**: 清晰的错误提示和成功状态
- **自动补全**: 支持历史记录和自定义建议

### 🎨 视觉体验
- **浮动标签**: 流畅的标签动画效果
- **状态指示**: 清楚的加载、成功、错误状态
- **响应式设计**: 适配不同屏幕尺寸
- **主题兼容**: 完美配合DaisyUI主题

## 组件详解

### 1. MobileInputV2 - 高级输入组件 ⭐ 新版本

最全面的移动端输入组件，支持16种输入类型和高级功能。

```tsx
import { MobileInputV2 } from '@/components/mobile';

<MobileInputV2
  type="email"
  label="邮箱地址"
  value={email}
  onChange={setEmail}
  required
  validateOnChange
  debounceValidation={500}
  validator={async (value) => {
    // 自定义异步验证
    const exists = await checkEmailExists(value);
    return exists ? '邮箱已被使用' : null;
  }}
  autocompleteSuggestions={[
    { 
      value: 'user@gmail.com', 
      label: 'Gmail', 
      description: 'Google邮箱',
      icon: <Mail className="w-4 h-4" />
    },
    { 
      value: 'user@outlook.com', 
      label: 'Outlook',
      description: 'Microsoft邮箱',
      icon: <Mail className="w-4 h-4" />
    }
  ]}
  enableVoiceInput
  enableQRScan
  preventZoom={true}
  showPasswordToggle={true}
  enableKeyboardAdjustment={true}
  ariaLabel="用户邮箱地址"
/>
```

#### 支持的输入类型
- `text`: 普通文本
- `password`: 密码（支持可见性切换）
- `email`: 邮箱地址
- `tel`: 电话号码
- `url`: 网址
- `search`: 搜索
- `number`: 数字
- `date`: 日期
- `datetime-local`: 日期时间
- `time`: 时间
- `month`: 月份
- `week`: 周
- `currency`: 货币（自定义类型）
- `percentage`: 百分比（自定义类型）

#### V2 新增特性
- ✅ 16种输入类型，完全覆盖移动端需求
- ✅ 智能键盘类型映射和Enter键提示
- ✅ 高级自动补全，支持图标和描述
- ✅ 密码可见性切换
- ✅ 实时和防抖异步验证
- ✅ 语音输入和二维码扫描
- ✅ iOS缩放防护（16px字体）
- ✅ 完整的键盘适配系统
- ✅ 丰富的无障碍支持
- ✅ TypeScript类型安全

### 2. MobileTextarea - 多行文本输入

专为移动端优化的文本区域组件。

```tsx
import { MobileTextarea } from '@/components/mobile';

<MobileTextarea
  label="商品描述"
  value={description}
  onChange={setDescription}
  maxLength={1000}
  showCharCount
  autoResize={{ minRows: 3, maxRows: 10 }}
  enableVoiceInput
  enableFullscreen
/>
```

#### 主要特性
- ✅ 自动高度调整
- ✅ 字符计数显示
- ✅ 全屏编辑模式
- ✅ 语音输入支持
- ✅ 键盘快捷键 (Cmd+Enter提交)

### 3. MobileSelect - 移动端选择器

触摸友好的选择器组件，支持单选和多选。

```tsx
import { MobileSelect } from '@/components/mobile';

const options = [
  { 
    value: 'apple', 
    label: 'Apple',
    description: '苹果公司',
    icon: <AppleIcon />,
    group: '科技公司'
  },
  // ...
];

<MobileSelect
  label="选择公司"
  value={selectedCompany}
  onChange={setSelectedCompany}
  options={options}
  searchable
  multiple
  showSelectAll
  maxSelections={3}
/>
```

#### 主要特性
- ✅ 单选和多选模式
- ✅ 实时搜索过滤
- ✅ 分组选项支持
- ✅ 全选功能
- ✅ 最大选择数量限制
- ✅ 自定义选项渲染

### 4. MobileNumberInput - 数字输入专用

专门为数字输入优化的组件。

```tsx
import { MobileNumberInput } from '@/components/mobile';

<MobileNumberInput
  numberType="currency"
  label="产品价格"
  value={price}
  onChange={setPrice}
  min={0}
  max={999999}
  step={0.01}
  showSteppers
  formatOptions={{
    currency: 'CNY',
    useGrouping: true
  }}
/>
```

#### 支持的数字类型
- `integer`: 整数
- `decimal`: 小数 
- `currency`: 货币
- `percentage`: 百分比

#### 主要特性
- ✅ 多种数字格式化
- ✅ 范围限制和步进器
- ✅ 本地化货币显示
- ✅ 键盘导航支持
- ✅ 精度控制

### 5. MobileFileUpload - 文件上传组件

功能完整的移动端文件上传解决方案。

```tsx
import { MobileFileUpload, type UploadedFile } from '@/components/mobile';

<MobileFileUpload
  label="上传附件"
  value={files}
  onChange={setFiles}
  multiple
  maxFiles={5}
  acceptedTypes={[
    { 
      accept: 'image/*', 
      maxSize: 5 * 1024 * 1024, 
      description: '图片文件' 
    },
    { 
      accept: '.pdf', 
      maxSize: 10 * 1024 * 1024, 
      description: 'PDF文档' 
    }
  ]}
  enableCamera
  enableImageCrop
  enablePreview
  customUpload={async (file) => {
    // 自定义上传逻辑
    const result = await uploadToServer(file);
    return { url: result.url, thumbnail: result.thumbnail };
  }}
/>
```

#### 主要特性
- ✅ 拖拽和点击上传
- ✅ 相机拍照支持
- ✅ 图片压缩和裁剪
- ✅ 上传进度显示
- ✅ 文件类型限制
- ✅ 缩略图预览
- ✅ 自定义上传处理

### 6. MobileFormValidator - 表单验证系统

统一的表单验证解决方案。

```tsx
import { 
  MobileFormValidator, 
  MobileValidator,
  type FieldValidation 
} from '@/components/mobile';

const validations: FieldValidation[] = [
  {
    name: 'email',
    label: '邮箱',
    rules: [
      MobileValidator.presets.required(),
      MobileValidator.presets.email(),
      MobileValidator.presets.custom(async (value) => {
        const exists = await checkEmailExists(value);
        return exists ? '邮箱已被使用' : null;
      })
    ],
    validateOn: 'change',
    debounce: 500
  }
];

<MobileFormValidator
  validations={validations}
  formData={formData}
  onValidationChange={(result) => {
    setIsFormValid(result.isValid);
  }}
  showSummary
>
  {/* 表单内容 */}
</MobileFormValidator>
```

#### 内置验证规则
- `required`: 必填验证
- `email`: 邮箱格式
- `phone`: 手机号格式
- `url`: 网址格式
- `minLength/maxLength`: 长度限制
- `min/max`: 数值范围
- `pattern`: 正则匹配
- `custom`: 自定义验证

## 键盘适配系统

### useKeyboardAdjustment Hook

```tsx
import { useKeyboardAdjustment } from '@/hooks/useKeyboardAdjustment';

const keyboard = useKeyboardAdjustment({
  autoScroll: true,
  scrollOffset: 20,
  adjustViewport: true,
  enableSafeArea: true
});

// 键盘状态
console.log(keyboard.isVisible); // 键盘是否显示
console.log(keyboard.height); // 键盘高度
```

### CSS 变量支持

系统自动注入CSS变量供样式使用：

```css
.my-component {
  /* 键盘高度 */
  padding-bottom: var(--keyboard-height, 0px);
  
  /* 可用高度 */
  height: var(--available-height, 100vh);
  
  /* 视口调整量 */
  transform: translateY(calc(-1 * var(--viewport-adjustment, 0px)));
}
```

## 最佳实践

### 1. 表单结构

```tsx
const MyForm = () => {
  const [formData, setFormData] = useState({
    // 表单数据
  });
  
  const validations = [
    // 验证配置
  ];
  
  return (
    <MobileFormValidator
      validations={validations}
      formData={formData}
      onValidationChange={handleValidationChange}
    >
      <form onSubmit={handleSubmit}>
        {/* 输入组件 */}
      </form>
    </MobileFormValidator>
  );
};
```

### 2. 防抖验证

对于需要异步验证的字段，建议使用防抖：

```tsx
<MobileInputV2
  validateOnChange
  debounceValidation={500} // 500ms防抖
  validator={asyncValidator}
/>
```

### 3. 键盘类型优化

根据输入内容设置合适的键盘类型：

```tsx
// 邮箱输入
<MobileInputV2 type="email" keyboardType="email" />

// 数字输入
<MobileInputV2 type="number" keyboardType="numeric" />

// 手机号输入  
<MobileInputV2 type="tel" keyboardType="tel" />
```

### 4. 无障碍支持

确保设置适当的无障碍属性：

```tsx
<MobileInputV2
  ariaLabel="用户邮箱地址"
  ariaDescribedBy="email-help"
  helperText="我们不会分享您的邮箱"
/>
```

### 5. 性能优化

- 使用 `React.memo` 包装复杂的表单组件
- 合理设置验证防抖时间
- 对大型选项列表使用虚拟滚动
- 图片上传启用压缩和缩略图

## 故障排除

### 1. iOS键盘缩放问题

确保输入组件的 `preventZoom` 属性为 `true`：

```tsx
<MobileInputV2 preventZoom={true} />
```

### 2. 键盘遮挡问题

启用键盘适配功能：

```tsx
<MobileInputV2 enableKeyboardAdjustment={true} />
```

### 3. 验证不生效

检查验证配置是否正确：

```tsx
// 确保字段名称匹配
const validation = {
  name: 'email', // 必须与表单字段名一致
  rules: [...]
};
```

### 4. 文件上传失败

检查文件类型和大小限制：

```tsx
<MobileFileUpload
  acceptedTypes={[
    {
      accept: 'image/jpeg,image/png', // 明确指定MIME类型
      maxSize: 5 * 1024 * 1024 // 确保大小限制合理
    }
  ]}
/>
```

## 完整使用示例

### 复杂表单示例

```tsx
import React, { useState } from 'react';
import { 
  MobileInputV2,
  MobileTextarea,
  MobileSelect,
  MobileNumberInput,
  MobileFormValidator,
  MobileValidator,
  useFormValidation,
  type FieldValidation
} from '@/components/mobile';

const RegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    businessType: '',
    revenue: 0,
    description: '',
    phone: ''
  });

  // 验证配置
  const validations: FieldValidation[] = [
    {
      name: 'email',
      label: '邮箱地址',
      rules: [
        MobileValidator.presets.required(),
        MobileValidator.presets.email(),
        MobileValidator.presets.custom(async (value) => {
          // 异步验证邮箱是否已存在
          const exists = await checkEmailExists(value);
          return exists ? '该邮箱已被注册' : null;
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
        MobileValidator.presets.minLength(8),
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
        MobileValidator.presets.match('password')
      ],
      validateOn: 'blur'
    }
  ];

  const businessTypes = [
    { value: 'tech', label: '科技公司', icon: <Building /> },
    { value: 'retail', label: '零售业', icon: <Store /> }
  ];

  return (
    <MobileFormValidator
      validations={validations}
      formData={formData}
      showSummary={true}
      onValidationChange={(result) => {
        console.log('验证结果:', result);
      }}
    >
      <form className="space-y-4">
        <MobileInputV2
          type="email"
          label="邮箱地址"
          value={formData.email}
          onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
          autocompleteSuggestions={emailSuggestions}
          required
        />

        <MobileInputV2
          type="password"
          label="密码"
          value={formData.password}
          onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
          required
          helperText="密码需包含大小写字母和数字，至少8位"
        />

        <MobileSelect
          label="业务类型"
          value={formData.businessType}
          onChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
          options={businessTypes}
          searchable
          required
        />

        <MobileNumberInput
          numberType="currency"
          label="年收入"
          value={formData.revenue}
          onChange={(value) => setFormData(prev => ({ ...prev, revenue: value }))}
          formatOptions={{ currency: 'CNY', useGrouping: true }}
          showSteppers
        />

        <MobileTextarea
          label="公司描述"
          value={formData.description}
          onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
          maxLength={500}
          showCharCount
          autoResize={{ minRows: 3, maxRows: 6 }}
        />
      </form>
    </MobileFormValidator>
  );
};
```

### 实时验证示例

```tsx
const LiveValidationExample: React.FC = () => {
  const { validateField, fieldStatuses } = useFormValidation();

  return (
    <MobileInputV2
      type="email"
      label="邮箱地址"
      value={email}
      onChange={setEmail}
      validateOnChange={true}
      debounceValidation={300}
      validator={async (value) => {
        if (!value.includes('@')) return '请输入有效邮箱';
        
        // 模拟API检查
        const response = await fetch(`/api/check-email/${value}`);
        const data = await response.json();
        return data.exists ? '邮箱已被使用' : null;
      }}
      validationState={
        fieldStatuses.email?.isValidating ? 'validating' :
        fieldStatuses.email?.error ? 'invalid' : 
        fieldStatuses.email?.isValid ? 'valid' : 'idle'
      }
      error={fieldStatuses.email?.error || undefined}
    />
  );
};
```

## 最佳实践指南

### 1. 表单结构设计

```tsx
// 推荐的表单结构
const FormWithSections: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* 验证摘要 */}
      <MobileFormValidator showSummary summaryPosition="top">
        
        {/* 基本信息部分 */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium">基本信息</h2>
          {/* 输入组件 */}
        </section>

        {/* 详细信息部分 */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium">详细信息</h2>
          {/* 输入组件 */}
        </section>

        {/* 提交区域 */}
        <div className="sticky bottom-0 bg-white pt-4">
          <button type="submit" className="btn btn-primary w-full">
            提交
          </button>
        </div>
      </MobileFormValidator>
    </div>
  );
};
```

### 2. 验证策略

```tsx
// 不同验证时机的使用场景
const validations: FieldValidation[] = [
  // 实时验证 - 适合格式检查
  {
    name: 'email',
    validateOn: 'change',
    debounce: 300,
    rules: [MobileValidator.presets.email()]
  },
  
  // 失焦验证 - 适合完整性检查
  {
    name: 'password',
    validateOn: 'blur',
    rules: [
      MobileValidator.presets.required(),
      MobileValidator.presets.minLength(8)
    ]
  },
  
  // 提交验证 - 适合服务端检查
  {
    name: 'username',
    validateOn: 'submit',
    rules: [
      MobileValidator.presets.custom(async (value) => {
        return await checkUsernameAvailability(value);
      })
    ]
  }
];
```

### 3. 键盘适配优化

```tsx
// 针对不同输入类型优化键盘
const InputWithKeyboard: React.FC = () => {
  return (
    <>
      {/* 邮箱输入 - 邮箱键盘 */}
      <MobileInputV2
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      {/* 数字输入 - 数字键盘 */}
      <MobileInputV2
        type="number"
        inputMode="numeric"
        enterKeyHint="done"
      />
      
      {/* 搜索输入 - 搜索键盘 */}
      <MobileInputV2
        type="search"
        inputMode="search"
        enterKeyHint="search"
      />
    </>
  );
};
```

### 4. 无障碍支持

```tsx
// 完整的无障碍属性
<MobileInputV2
  type="email"
  label="邮箱地址"
  ariaLabel="用户注册邮箱地址"
  ariaDescribedBy="email-help email-error"
  ariaInvalid={!!error}
  helperText="我们将向此邮箱发送验证链接"
  error={error}
  required
/>
```

## 性能优化建议

### 1. 防抖验证
```tsx
// 合理设置防抖时间
<MobileInputV2
  validateOnChange={true}
  debounceValidation={500} // 用户停止输入500ms后验证
/>
```

### 2. 条件验证
```tsx
// 只在需要时验证
{
  name: 'website',
  when: (formData) => formData.businessType === 'technology',
  rules: [MobileValidator.presets.url()]
}
```

### 3. 组件懒加载
```tsx
const MobileFileUpload = lazy(() => import('./MobileFileUpload'));
const MobileSelect = lazy(() => import('./MobileSelect'));
```

## 更新日志

### v2.0.0 (2024-08-24) ⭐ 主要版本
- ✅ 全新 MobileInputV2 高级输入组件
- ✅ 16种输入类型支持
- ✅ 高级自动补全系统
- ✅ 智能键盘类型映射
- ✅ 增强的表单验证系统
- ✅ 完整的 TypeScript 类型支持
- ✅ iOS 缩放防护机制
- ✅ 密码可见性切换
- ✅ 语音输入和二维码扫描支持

### v1.0.0 (2024-01-20)
- ✅ 完成基础输入组件系统
- ✅ 实现键盘适配机制
- ✅ 添加表单验证系统
- ✅ 支持文件上传功能
- ✅ 完善无障碍支持

## 支持

如有问题或建议，请查看：
- [完整使用示例](./MobileInputDemoPage.tsx)
- [键盘适配Hook](../../hooks/useKeyboardAdjustment.ts)
- [设备检测Hook](../../hooks/useMediaQuery.ts)
- [防抖Hook](../../hooks/useDebounce.ts)