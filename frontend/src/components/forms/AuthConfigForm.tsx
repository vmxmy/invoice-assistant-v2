import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, HelpCircle } from 'lucide-react';
import { LoadingButton } from '../ui/LoadingButton';
import { 
  validateEmailAccountConfig, 
  getFieldError, 
  type EmailAuthConfig,
  type EmailProvider 
} from '../../schemas/emailAccountSchema';

interface AuthConfigFormProps {
  provider: string;
  onSubmit: (config: {
    email: string;
    credential: string;
    displayName?: string;
  }) => void;
  onTestConnection?: (config: {
    email: string;
    credential: string;
  }) => void;
  isLoading?: boolean;
  isTesting?: boolean;
  testResult?: {
    success: boolean;
    message?: string;
    error?: string;
  };
}

const AuthConfigForm: React.FC<AuthConfigFormProps> = ({
  provider,
  onSubmit,
  onTestConnection,
  isLoading = false,
  isTesting = false,
  testResult,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    credential: '',
    displayName: '',
  });
  const [showCredential, setShowCredential] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // 获取提供商配置
  const getProviderConfig = (provider: string) => {
    switch (provider) {
      case 'gmail':
        return {
          name: 'Gmail',
          credentialLabel: 'Google应用密码',
          credentialPlaceholder: '16位应用专用密码',
          credentialHelp: '在Google账户安全设置中生成应用专用密码',
        };
      case 'outlook':
        return {
          name: 'Outlook',
          credentialLabel: 'Microsoft应用密码',
          credentialPlaceholder: '应用密码',
          credentialHelp: '在Microsoft账户安全设置中生成应用密码',
        };
      case 'qq':
        return {
          name: 'QQ邮箱',
          credentialLabel: 'QQ邮箱授权码',
          credentialPlaceholder: '16位授权码',
          credentialHelp: '在QQ邮箱设置→账户中开启IMAP/SMTP服务并获取授权码',
        };
      case '163':
        return {
          name: '163邮箱',
          credentialLabel: '163邮箱授权码',
          credentialPlaceholder: '客户端授权密码',
          credentialHelp: '在163邮箱设置→客户端授权密码中生成授权码',
        };
      case '126':
        return {
          name: '126邮箱',
          credentialLabel: '126邮箱授权码',
          credentialPlaceholder: '客户端授权密码',
          credentialHelp: '在126邮箱设置→客户端授权密码中生成授权码',
        };
      default:
        return {
          name: '邮箱',
          credentialLabel: '密码',
          credentialPlaceholder: '请输入密码',
          credentialHelp: '请输入您的邮箱密码',
        };
    }
  };

  const config = getProviderConfig(provider);

  // 表单验证
  const validateForm = () => {
    const configData: EmailAuthConfig = {
      provider: provider as EmailProvider,
      email: formData.email,
      credential: formData.credential,
      displayName: formData.displayName || undefined,
    };

    const validation = validateEmailAccountConfig(configData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        email: formData.email,
        credential: formData.credential,
        displayName: formData.displayName || formData.email,
      });
    }
  };

  const handleTestConnection = () => {
    if (validateForm() && onTestConnection) {
      onTestConnection({
        email: formData.email,
        credential: formData.credential,
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: [] }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-base-content mb-2">
          配置 {config.name} 账户
        </h3>
        <p className="text-sm text-base-content/70">
          请填写您的邮箱账户信息
        </p>
      </div>

      {/* 邮箱地址 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">邮箱地址 *</span>
        </label>
        <div className="relative">
          <input
            type="email"
            className={`input input-bordered w-full pl-10 ${getFieldError(errors, 'email') ? 'input-error' : ''}`}
            placeholder={`请输入您的${config.name}邮箱地址`}
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={isLoading}
          />
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
        </div>
        {getFieldError(errors, 'email') && (
          <label className="label">
            <span className="label-text-alt text-error">{getFieldError(errors, 'email')}</span>
          </label>
        )}
      </div>

      {/* 认证凭据 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">{config.credentialLabel} *</span>
          <div className="tooltip tooltip-left" data-tip={config.credentialHelp}>
            <HelpCircle className="w-4 h-4 text-base-content/40 cursor-help" />
          </div>
        </label>
        <div className="relative">
          <input
            type={showCredential ? 'text' : 'password'}
            className={`input input-bordered w-full pl-10 pr-10 ${getFieldError(errors, 'credential') ? 'input-error' : ''}`}
            placeholder={config.credentialPlaceholder}
            value={formData.credential}
            onChange={(e) => handleInputChange('credential', e.target.value)}
            disabled={isLoading}
          />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/40 hover:text-base-content"
            onClick={() => setShowCredential(!showCredential)}
          >
            {showCredential ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {getFieldError(errors, 'credential') && (
          <label className="label">
            <span className="label-text-alt text-error">{getFieldError(errors, 'credential')}</span>
          </label>
        )}
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            {config.credentialHelp}
          </span>
        </label>
      </div>

      {/* 显示名称 */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">显示名称</span>
        </label>
        <div className="relative">
          <input
            type="text"
            className="input input-bordered w-full pl-10"
            placeholder="可选，用于识别此账户"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            disabled={isLoading}
          />
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
        </div>
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            留空则使用邮箱地址作为显示名称
          </span>
        </label>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{testResult.message || testResult.error}</span>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-3 pt-4">
        {onTestConnection && (
          <LoadingButton
            type="button"
            variant="outline"
            isLoading={isTesting}
            onClick={handleTestConnection}
            disabled={!formData.email || !formData.credential}
          >
            {isTesting ? '测试中...' : '测试连接'}
          </LoadingButton>
        )}
        
        <LoadingButton
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={!formData.email || !formData.credential}
        >
          {isLoading ? '保存中...' : '保存配置'}
        </LoadingButton>
      </div>
    </form>
  );
};

export default AuthConfigForm;