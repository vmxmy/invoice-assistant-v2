import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  ClipboardIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import { apiClient } from '../services/apiClient';
import { EmailAddress, EmailAddressType, EmailAddressStatus } from '../types/emailAddress';

interface EmailAddressManagerProps {
  className?: string;
}

export const EmailAddressManager: React.FC<EmailAddressManagerProps> = ({ className }) => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<EmailAddressType>(EmailAddressType.CUSTOM);
  const [newAddressData, setNewAddressData] = useState({
    alias: '',
    description: '',
    expires_days: '',
    custom_local_part: ''
  });

  // 获取邮件地址列表
  const { data: addressesData, isLoading, error } = useQuery({
    queryKey: ['email-addresses'],
    queryFn: async () => {
      const response = await apiClient.get('/email-addresses/');
      return response.data;
    }
  });

  // 创建邮件地址
  const createAddressMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/email-addresses/', data);
      return response.data;
    },
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ['email-addresses'] });
      setIsCreating(false);
      setNewAddressData({ alias: '', description: '', expires_days: '', custom_local_part: '' });
      toast.success(`邮件地址创建成功: ${newAddress.email_address}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '创建邮件地址失败');
    }
  });

  // 设置默认地址
  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const response = await apiClient.post(`/email-addresses/${addressId}/set-default`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-addresses'] });
      toast.success('默认地址已更新');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '设置默认地址失败');
    }
  });

  // 删除地址
  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await apiClient.delete(`/email-addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-addresses'] });
      toast.success('邮件地址已删除');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '删除邮件地址失败');
    }
  });

  // 停用/激活地址
  const toggleAddressStatusMutation = useMutation({
    mutationFn: async ({ addressId, action }: { addressId: string; action: 'activate' | 'deactivate' }) => {
      const response = await apiClient.post(`/email-addresses/${addressId}/${action}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-addresses'] });
      toast.success(variables.action === 'activate' ? '地址已激活' : '地址已停用');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '操作失败');
    }
  });

  const handleCreateAddress = () => {
    const data = {
      address_type: selectedType,
      ...newAddressData,
      expires_days: newAddressData.expires_days ? parseInt(newAddressData.expires_days) : undefined
    };

    // 清理空值
    Object.keys(data).forEach(key => {
      if (data[key] === '' || data[key] === undefined) {
        delete data[key];
      }
    });

    createAddressMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <span className="badge badge-error badge-sm">已过期</span>;
    }
    
    switch (status) {
      case EmailAddressStatus.ACTIVE:
        return <span className="badge badge-success badge-sm">激活</span>;
      case EmailAddressStatus.INACTIVE:
        return <span className="badge badge-neutral badge-sm">停用</span>;
      case EmailAddressStatus.SUSPENDED:
        return <span className="badge badge-warning badge-sm">暂停</span>;
      default:
        return <span className="badge badge-ghost badge-sm">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap = {
      [EmailAddressType.PRIMARY]: { label: '主要', class: 'badge-primary' },
      [EmailAddressType.WORK]: { label: '工作', class: 'badge-info' },
      [EmailAddressType.PERSONAL]: { label: '个人', class: 'badge-accent' },
      [EmailAddressType.TEMPORARY]: { label: '临时', class: 'badge-warning' },
      [EmailAddressType.CUSTOM]: { label: '自定义', class: 'badge-neutral' }
    };

    const typeInfo = typeMap[type] || { label: type, class: 'badge-ghost' };
    return <span className={`badge badge-sm ${typeInfo.class}`}>{typeInfo.label}</span>;
  };

  if (error) {
    return (
      <div className={`alert alert-error ${className}`}>
        <ExclamationTriangleIcon className="h-6 w-6" />
        <span>加载邮件地址失败</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和创建按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">邮件地址管理</h2>
          <p className="text-base-content/70 mt-1">
            管理您的发票接收邮件地址，供应商可以向这些地址发送发票
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreating(!isCreating)}
          disabled={createAddressMutation.isPending}
        >
          <PlusIcon className="h-5 w-5" />
          创建新地址
        </button>
      </div>

      {/* 创建新地址表单 */}
      {isCreating && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title">创建新邮件地址</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 地址类型 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">地址类型</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as EmailAddressType)}
                >
                  <option value={EmailAddressType.CUSTOM}>自定义</option>
                  <option value={EmailAddressType.WORK}>工作</option>
                  <option value={EmailAddressType.PERSONAL}>个人</option>
                  <option value={EmailAddressType.TEMPORARY}>临时</option>
                </select>
              </div>

              {/* 别名 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">别名 (可选)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="例如：工作发票"
                  value={newAddressData.alias}
                  onChange={(e) => setNewAddressData(prev => ({ ...prev, alias: e.target.value }))}
                />
              </div>

              {/* 自定义前缀 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">自定义前缀 (可选)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="例如：company"
                  value={newAddressData.custom_local_part}
                  onChange={(e) => setNewAddressData(prev => ({ ...prev, custom_local_part: e.target.value }))}
                />
                <label className="label">
                  <span className="label-text-alt">将生成类似 invoice-company-{'{user_id}'}@domain.com 的地址</span>
                </label>
              </div>

              {/* 有效期 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">有效期天数 (可选)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  placeholder="留空表示永久有效"
                  min="1"
                  max="365"
                  value={newAddressData.expires_days}
                  onChange={(e) => setNewAddressData(prev => ({ ...prev, expires_days: e.target.value }))}
                />
              </div>

              {/* 描述 */}
              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">描述 (可选)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder="例如：用于接收公司供应商的发票"
                  rows={2}
                  value={newAddressData.description}
                  onChange={(e) => setNewAddressData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="card-actions justify-end mt-4">
              <button
                className="btn btn-ghost"
                onClick={() => setIsCreating(false)}
                disabled={createAddressMutation.isPending}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateAddress}
                disabled={createAddressMutation.isPending}
              >
                {createAddressMutation.isPending && <span className="loading loading-spinner loading-sm" />}
                创建地址
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 地址列表 */}
      {isLoading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="space-y-4">
          {addressesData?.addresses?.length === 0 ? (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body text-center py-12">
                <h3 className="text-lg font-semibold text-base-content/70">还没有邮件地址</h3>
                <p className="text-base-content/50 mt-2">创建您的第一个邮件地址来接收发票</p>
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => setIsCreating(true)}
                >
                  <PlusIcon className="h-5 w-5" />
                  创建邮件地址
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 统计信息 */}
              <div className="stats stats-horizontal shadow">
                <div className="stat">
                  <div className="stat-title">总地址数</div>
                  <div className="stat-value text-primary">{addressesData?.total_count || 0}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">活跃地址</div>
                  <div className="stat-value text-success">{addressesData?.active_count || 0}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">默认地址</div>
                  <div className="stat-desc">
                    {addressesData?.default_address ? 
                      <span className="badge badge-info badge-sm">已设置</span> : 
                      <span className="badge badge-warning badge-sm">未设置</span>
                    }
                  </div>
                </div>
              </div>

              {/* 地址卡片列表 */}
              {addressesData?.addresses?.map((address: EmailAddress) => (
                <div key={address.id} className="card bg-base-100 shadow-lg">
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{address.display_name}</h3>
                          {address.is_default && (
                            <span className="badge badge-primary badge-sm">默认</span>
                          )}
                          {getTypeBadge(address.address_type)}
                          {getStatusBadge(address.status, address.is_active)}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <code className="bg-base-200 px-2 py-1 rounded text-sm font-mono">
                            {address.email_address}
                          </code>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => copyToClipboard(address.email_address)}
                          >
                            <ClipboardIcon className="h-4 w-4" />
                          </button>
                        </div>

                        {address.description && (
                          <p className="text-base-content/70 text-sm mb-2">{address.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-base-content/70">
                          <span>接收邮件: {address.total_emails_received}</span>
                          {address.last_email_received_at && (
                            <span>最后接收: {new Date(address.last_email_received_at).toLocaleDateString()}</span>
                          )}
                          {address.expires_at && (
                            <span>过期时间: {new Date(address.expires_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="dropdown dropdown-end">
                        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                          <ChevronDownIcon className="h-4 w-4" />
                        </div>
                        <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                          {!address.is_default && (
                            <li>
                              <a onClick={() => setDefaultMutation.mutate(address.id)}>
                                <CheckIcon className="h-4 w-4" />
                                设为默认
                              </a>
                            </li>
                          )}
                          <li>
                            <a onClick={() => toggleAddressStatusMutation.mutate({
                              addressId: address.id,
                              action: address.is_active ? 'deactivate' : 'activate'
                            })}>
                              {address.is_active ? (
                                <>
                                  <XMarkIcon className="h-4 w-4" />
                                  停用地址
                                </>
                              ) : (
                                <>
                                  <CheckIcon className="h-4 w-4" />
                                  激活地址
                                </>
                              )}
                            </a>
                          </li>
                          {!address.is_default && (
                            <li>
                              <a 
                                className="text-error" 
                                onClick={() => {
                                  if (confirm('确定要删除这个邮件地址吗？此操作不可撤销。')) {
                                    deleteAddressMutation.mutate(address.id);
                                  }
                                }}
                              >
                                <TrashIcon className="h-4 w-4" />
                                删除地址
                              </a>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};