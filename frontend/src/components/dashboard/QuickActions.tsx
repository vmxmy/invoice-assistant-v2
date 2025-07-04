import React from 'react';
import { Plus, Upload, FileText, Search, Settings, Download } from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  disabled?: boolean;
  badge?: string | number;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  onUploadInvoice?: () => void;
  onCreateInvoice?: () => void;
  onSearchInvoices?: () => void;
  onExportData?: () => void;
  onSettings?: () => void;
  loading?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  onUploadInvoice,
  onCreateInvoice,
  onSearchInvoices,
  onExportData,
  onSettings,
  loading = false,
}) => {
  const defaultActions: QuickAction[] = [
    {
      id: 'upload',
      title: '上传发票',
      description: '从文件上传新发票',
      icon: <Upload className="w-5 h-5" />,
      onClick: onUploadInvoice || (() => {}),
      variant: 'primary',
    },
    {
      id: 'create',
      title: '创建发票',
      description: '手动创建新发票',
      icon: <Plus className="w-5 h-5" />,
      onClick: onCreateInvoice || (() => {}),
      variant: 'secondary',
    },
    {
      id: 'search',
      title: '搜索发票',
      description: '查找和筛选发票',
      icon: <Search className="w-5 h-5" />,
      onClick: onSearchInvoices || (() => {}),
      variant: 'ghost',
    },
    {
      id: 'export',
      title: '导出数据',
      description: '下载发票数据',
      icon: <Download className="w-5 h-5" />,
      onClick: onExportData || (() => {}),
      variant: 'ghost',
    },
    {
      id: 'settings',
      title: '设置',
      description: '账户和偏好设置',
      icon: <Settings className="w-5 h-5" />,
      onClick: onSettings || (() => {}),
      variant: 'ghost',
    },
  ];

  const actionsToRender = actions || defaultActions;

  const getButtonVariant = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      case 'accent':
        return 'btn-accent';
      case 'ghost':
        return 'btn-ghost';
      default:
        return 'btn-ghost';
    }
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">快速操作</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-20 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title text-lg">快速操作</h3>
          <FileText className="w-5 h-5 text-base-content/50" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actionsToRender.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`btn ${getButtonVariant(action.variant)} h-auto p-4 flex-col items-start text-left normal-case relative transition-all duration-200 hover:scale-105 ${
                action.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {action.badge && (
                <div className="badge badge-primary badge-sm absolute -top-2 -right-2">
                  {action.badge}
                </div>
              )}
              
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0">
                  {action.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">
                    {action.title}
                  </div>
                  {action.description && (
                    <div className="text-xs opacity-70 mt-1">
                      {action.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <div className="text-xs text-base-content/50">
            快速访问常用功能，提高工作效率
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;