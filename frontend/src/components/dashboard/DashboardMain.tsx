import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle,
  TrendingUp,
  BarChart3,
  Calendar
} from 'lucide-react';

import StatCard from './StatCard';
import ActivityFeed from './ActivityFeed';
import QuickActions from './QuickActions';
import LazyInvoiceChart from './LazyInvoiceChart';
import { useSession } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import type { DashboardStats, DashboardMainProps } from '../../types';

export const DashboardMain: React.FC<DashboardMainProps> = ({
  onUploadInvoice,
  onCreateInvoice,
  onSearchInvoices,
  onExportData,
  onSettings,
}) => {
  const { data: session } = useSession();
  const user = session?.user;
  const navigate = useNavigate();

  // 获取仪表盘统计数据
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [invoiceStats, profileResponse] = await Promise.all([
        apiClient.get('/api/v1/invoices/statistics'),
        apiClient.get('/api/v1/profiles/me')
      ]);

      // 从API获取真实的图表数据
      const monthlyData = invoiceStats.data.monthly_data || [];
      const categoryData = invoiceStats.data.category_data || [];

      // 从API获取真实的活动数据，如果没有则使用空数组
      const defaultActivity: any[] = [];

      // 映射后端返回的统计数据
      const statsData = invoiceStats.data;
      
      return {
        totalInvoices: statsData.total_count || 0,
        pendingInvoices: statsData.status_distribution?.pending || 0,
        completedInvoices: statsData.status_distribution?.completed || 0,
        totalAmount: statsData.amount_stats?.total || 0,
        monthlyGrowth: 12.5, // 暂时固定值，后续从后端获取
        recentActivity: statsData.recent_activity?.recent_invoices || defaultActivity,
        monthlyData,
        categoryData,
      };
    },
    enabled: !!user,
  });

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'upload':
        navigate('/invoices/upload');
        break;
      case 'create':
        navigate('/invoices/upload');
        break;
      case 'search':
        navigate('/invoices');
        break;
      case 'export':
        onExportData?.();
        break;
      case 'settings':
        onSettings?.();
        break;
    }
  }, [navigate, onExportData, onSettings]);

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-base-content">
              发票管理仪表盘
            </h1>
            <p className="text-base-content/60 mt-1">
              欢迎回来，{user?.email || '用户'}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="text-sm text-base-content/60">
              <Calendar className="w-4 h-4 inline mr-1" />
              {useMemo(() => new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }), [])}
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="总发票数"
            value={stats?.totalInvoices || 0}
            subValue="张发票"
            icon={FileText}
            variant="primary"
            loading={statsLoading}
            trend={{
              value: stats?.monthlyGrowth || 0,
              direction: (stats?.monthlyGrowth || 0) > 0 ? 'up' : 'down',
              label: '较上月'
            }}
          />
          
          <StatCard
            title="总金额"
            value={stats?.totalAmount || 0}
            icon={DollarSign}
            variant="success"
            loading={statsLoading}
          />
          
          <StatCard
            title="待处理"
            value={stats?.pendingInvoices || 0}
            subValue="张待处理"
            icon={Clock}
            variant="warning"
            loading={statsLoading}
          />
          
          <StatCard
            title="已完成"
            value={stats?.completedInvoices || 0}
            subValue="张已完成"
            icon={CheckCircle}
            variant="info"
            loading={statsLoading}
          />
        </div>

        {/* 图表和操作 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 图表区域 */}
          <div className="lg:col-span-2 space-y-6">
            <LazyInvoiceChart
              type="area"
              data={stats?.monthlyData || []}
              title="发票趋势"
              height={300}
              loading={statsLoading}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LazyInvoiceChart
                type="bar"
                data={stats?.monthlyData || []}
                title="月度对比"
                height={250}
                loading={statsLoading}
              />
              
              <LazyInvoiceChart
                type="pie"
                data={stats?.categoryData || []}
                title="类别分布"
                height={250}
                loading={statsLoading}
              />
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            <QuickActions
              onUploadInvoice={useCallback(() => handleQuickAction('upload'), [handleQuickAction])}
              onCreateInvoice={useCallback(() => handleQuickAction('create'), [handleQuickAction])}
              onSearchInvoices={useCallback(() => handleQuickAction('search'), [handleQuickAction])}
              onExportData={useCallback(() => handleQuickAction('export'), [handleQuickAction])}
              onSettings={useCallback(() => handleQuickAction('settings'), [handleQuickAction])}
              loading={statsLoading}
            />
            
            <ActivityFeed
              activities={stats?.recentActivity || []}
              loading={statsLoading}
              maxItems={8}
            />
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center text-sm text-base-content/50 py-4">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" />
            数据实时更新，最后刷新时间: {useMemo(() => new Date().toLocaleTimeString('zh-CN'), [])}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMain;