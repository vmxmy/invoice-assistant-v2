import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';

interface AccountStatusBadgeProps {
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  className?: string;
}

const AccountStatusBadge: React.FC<AccountStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          text: '已连接',
          badgeClass: 'badge-success',
          iconColor: 'text-success',
        };
      case 'disconnected':
        return {
          icon: AlertCircle,
          text: '未连接',
          badgeClass: 'badge-warning',
          iconColor: 'text-warning',
        };
      case 'error':
        return {
          icon: XCircle,
          text: '连接失败',
          badgeClass: 'badge-error',
          iconColor: 'text-error',
        };
      case 'testing':
        return {
          icon: Clock,
          text: '测试中',
          badgeClass: 'badge-info',
          iconColor: 'text-info',
        };
      default:
        return {
          icon: AlertCircle,
          text: '未知状态',
          badgeClass: 'badge-neutral',
          iconColor: 'text-neutral',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className={`badge ${config.badgeClass} gap-1 ${className}`}>
      <Icon className={`w-3 h-3 ${config.iconColor}`} />
      {config.text}
    </div>
  );
};

export default AccountStatusBadge;