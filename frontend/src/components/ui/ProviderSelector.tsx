import React from 'react';
import { Mail } from 'lucide-react';

interface ProviderSelectorProps {
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  className?: string;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  className = '',
}) => {
  const providers = [
    {
      id: 'gmail',
      name: 'Gmail',
      description: '支持Google Workspace，使用OAuth2认证',
      icon: '📧',
      color: 'bg-red-50 border-red-200 text-red-700',
      popular: true,
    },
    {
      id: 'outlook',
      name: 'Outlook',
      description: '支持Microsoft 365，使用OAuth2认证',
      icon: '📨',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      popular: true,
    },
    {
      id: 'qq',
      name: 'QQ邮箱',
      description: '需要开启IMAP服务并获取授权码',
      icon: '🐧',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      popular: true,
    },
    {
      id: '163',
      name: '163邮箱',
      description: '使用应用密码进行SMTP连接',
      icon: '📮',
      color: 'bg-green-50 border-green-200 text-green-700',
      popular: false,
    },
    {
      id: '126',
      name: '126邮箱',
      description: '使用应用密码进行SMTP连接',
      icon: '📬',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      popular: false,
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-base-content mb-2">
          选择邮箱提供商
        </h3>
        <p className="text-sm text-base-content/70">
          请选择您要配置的邮箱类型
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`
              relative rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-sm
              ${selectedProvider === provider.id 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border-base-200 hover:border-base-300'
              }
            `}
            onClick={() => onProviderChange(provider.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${provider.color} border`}>
                <span className="text-lg">{provider.icon}</span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-base-content">
                    {provider.name}
                  </h4>
                  {provider.popular && (
                    <span className="badge badge-primary badge-sm">推荐</span>
                  )}
                </div>
                <p className="text-sm text-base-content/70">
                  {provider.description}
                </p>
              </div>

              {/* 选中状态指示器 */}
              {selectedProvider === provider.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 text-primary-content" 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 提供商特定的配置提示 */}
      {selectedProvider && (
        <div className="mt-6 p-4 bg-info/10 rounded-lg border border-info/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-info/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-info" />
            </div>
            <div>
              <h4 className="font-medium text-base-content mb-1">
                {providers.find(p => p.id === selectedProvider)?.name} 配置说明
              </h4>
              <div className="text-sm text-base-content/70 space-y-1">
                {selectedProvider === 'gmail' && (
                  <div>
                    <p>• 需要启用"不太安全的应用访问"或使用应用专用密码</p>
                    <p>• 推荐使用OAuth2认证以获得更好的安全性</p>
                  </div>
                )}
                {selectedProvider === 'outlook' && (
                  <div>
                    <p>• 需要启用IMAP访问权限</p>
                    <p>• 推荐使用OAuth2认证连接Microsoft 365</p>
                  </div>
                )}
                {selectedProvider === 'qq' && (
                  <div>
                    <p>• 需要在QQ邮箱设置中开启IMAP/SMTP服务</p>
                    <p>• 使用授权码而非登录密码进行认证</p>
                  </div>
                )}
                {selectedProvider === '163' && (
                  <div>
                    <p>• 需要在163邮箱设置中开启IMAP/SMTP服务</p>
                    <p>• 使用客户端授权密码进行认证</p>
                  </div>
                )}
                {selectedProvider === '126' && (
                  <div>
                    <p>• 需要在126邮箱设置中开启IMAP/SMTP服务</p>
                    <p>• 使用客户端授权密码进行认证</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderSelector;