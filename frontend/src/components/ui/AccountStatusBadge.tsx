import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';

interface AccountStatusBadgeProps {
  isActive?: boolean;
  isVerified?: boolean;
  lastError?: string | null;
  className?: string;
}

const AccountStatusBadge: React.FC<AccountStatusBadgeProps> = ({ 
  isActive = true, 
  isVerified = false, 
  lastError, 
  className = '' 
}) => {
  const getStatusConfig = () => {
    if (!isActive) {
      return {
        icon: AlertCircle,
        text: '已停用',
        badgeClass: 'badge-neutral',
        iconColor: 'text-neutral',
      };
    }
    
    if (isVerified) {
      return {
        icon: CheckCircle,
        text: '已连接',
        badgeClass: 'badge-success',
        iconColor: 'text-success',
      };
    }
    
    if (lastError) {
      return {
        icon: XCircle,
        text: '连接失败',
        badgeClass: 'badge-error',
        iconColor: 'text-error',
      };
    }
    
    return {
      icon: AlertCircle,
      text: '未知状态',
      badgeClass: 'badge-neutral',
      iconColor: 'text-neutral',
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`badge ${config.badgeClass} gap-1 ${className}`}>
      <Icon className={`w-3 h-3 ${config.iconColor}`} />
      {config.text}
    </div>
  );
};

export default AccountStatusBadge;