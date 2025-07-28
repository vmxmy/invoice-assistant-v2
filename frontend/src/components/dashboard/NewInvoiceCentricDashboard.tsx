import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search,
  Filter,
  FileText, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Plus,
  Eye,
  Download,
  Clock,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Zap,
  Upload,
  CheckCircle,
  AlertTriangle,
  Activity,
  Target,
  Mail,
  Settings
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import StatCard from './StatCard';
import { useSession } from '../../hooks/useAuth';
import { InvoiceSupabaseService } from '../../services/supabase/invoice.service';
import type { Invoice } from '../../types/table';
import EnhancedSearchBar from '../invoice/search/EnhancedSearchBar';
import InvoiceQuickView from '../invoice/view/InvoiceQuickView';

// 快速操作卡片组件
const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'success' | 'warning' | 'info';
}> = ({ title, description, icon: Icon, onClick, variant = 'primary' }) => {
  const variantClasses = {
    primary: 'bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary',
    success: 'bg-success/10 hover:bg-success/20 border-success/20 text-success',
    warning: 'bg-warning/10 hover:bg-warning/20 border-warning/20 text-warning',
    info: 'bg-info/10 hover:bg-info/20 border-info/20 text-info'
  };

  return (
    <div 
      className={`card cursor-pointer transition-all duration-200 border-2 ${variantClasses[variant]} hover:shadow-lg hover:scale-105`}
      onClick={onClick}
    >
      <div className="card-body p-6 text-center">
        <Icon className="w-8 h-8 mx-auto mb-3" />
        <h3 className="font-semibold text-base-content mb-2">{title}</h3>
        <p className="text-sm text-base-content/60">{description}</p>
      </div>
    </div>
  );
};

// 最近发票快速预览组件
const RecentInvoicePreview: React.FC<{
  invoice: Invoice;
  onView: (id: string) => void;
}> = ({ invoice, onView }) => {
  return (
    <div 
      className="card bg-base-100 border border-base-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onView(invoice.id)}
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm truncate">{invoice.invoice_number}</span>
            </div>
            <p className="text-xs text-base-content/60 truncate mb-1">{invoice.seller_name}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/50">
                {new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString('zh-CN')}
              </span>
              <span className="text-sm font-semibold text-success">
                ¥{Number(invoice.total_amount || 0).toLocaleString()}
              </span>
            </div>
          </div>
          <Eye className="w-4 h-4 text-base-content/40 hover:text-primary" />
        </div>
      </div>
    </div>
  );
};

const NewInvoiceCentricDashboard: React.FC = () => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const invoiceService = useMemo(() => new InvoiceSupabaseService(), []);
  
  // 处理来自路由状态的参数
  useEffect(() => {
    const state = location.state as any;
    if (state?.searchQuery) {
      setSearchQuery(state.searchQuery);
      // 清除路由状态避免重复处理
      window.history.replaceState({}, '', location.pathname);
    }
    if (state?.viewInvoiceId) {
      setSelectedInvoiceId(state.viewInvoiceId);
      setIsQuickViewOpen(true);
      // 清除路由状态
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);
  
  // 加载最近搜索记录
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.warn('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // 获取概览统计数据
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', session?.user?.id],
    queryFn: async () => {
      const data = await invoiceService.getStats();
      return {
        totalInvoices: data.dashboard?.total_invoices || 0,
        totalAmount: parseFloat(data.dashboard?.total_amount) || 0,
        thisMonthCount: data.monthlyTrend?.[data.monthlyTrend.length - 1]?.invoice_count || 0,
        thisMonthAmount: parseFloat(data.monthlyTrend?.[data.monthlyTrend.length - 1]?.total_amount) || 0,
        pendingCount: data.dashboard?.pending_count || 0,
        categories: data.categoryAnalysis?.slice(0, 3) || []
      };
    },
    enabled: !!session?.user?.id,
  });

  // 获取最近发票
  const { data: recentInvoices, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-invoices', session?.user?.id],
    queryFn: async () => {
      const result = await invoiceService.findAll(
        {},
        { limit: 6, orderBy: 'created_at', order: 'desc' }
      );
      return result.data || [];
    },
    enabled: !!session?.user?.id,
  });

  // 快速搜索处理
  const handleQuickSearch = (query: string = searchQuery, filters?: Record<string, any>) => {
    if (query.trim()) {
      // 保存搜索记录
      const newSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(newSearches);
      localStorage.setItem('recentSearches', JSON.stringify(newSearches));
    }
    
    navigate('/invoices', { 
      state: { searchQuery: query, searchFilters: filters } 
    });
  };

  const handleViewInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setIsQuickViewOpen(true);
  };
  
  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false);
    setSelectedInvoiceId(null);
  };
  
  const handleAdvancedSearch = () => {
    navigate('/invoices', { 
      state: { showAdvancedSearch: true } 
    });
  };

  return (
    <div className="min-h-screen">
      {/* 页面头部 - 简化版 */}
      <div className="bg-base-100 border-b border-base-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-base-content">
                我的发票
              </h1>
              <p className="text-base-content/60 mt-1">
                管理和查看您的所有发票信息
              </p>
            </div>
            
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-base-200">
        {/* 智能搜索栏 */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <EnhancedSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleQuickSearch}
              onAdvancedSearch={handleAdvancedSearch}
              placeholder="搜索发票号、商家、金额或任何关键词..."
              recentSearches={recentSearches}
              className="w-full"
            />
          </div>
        </div>
        {/* 核心数据概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="全部发票"
            value={stats?.totalInvoices || 0}
            subValue="张发票"
            icon={FileText}
            variant="primary"
            loading={statsLoading}
            onClick={() => navigate('/invoices')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          />
          
          <StatCard
            title="总金额"
            value={stats?.totalAmount || 0}
            icon={DollarSign}
            variant="success"
            loading={statsLoading}
            formatValue={(value) => `¥${value.toLocaleString()}`}
          />
          
          <StatCard
            title="本月新增"
            value={stats?.thisMonthCount || 0}
            subValue={`¥${(stats?.thisMonthAmount || 0).toLocaleString()}`}
            icon={TrendingUp}
            variant="info"
            loading={statsLoading}
          />
          
          <StatCard
            title="待处理"
            value={stats?.pendingCount || 0}
            subValue="需要关注"
            icon={Clock}
            variant="warning"
            loading={statsLoading}
            onClick={() => navigate('/invoices', { state: { filter: 'pending' } })}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：快速操作 */}
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title text-lg mb-4">
                  <Zap className="w-5 h-5" />
                  快速操作
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  <QuickActionCard
                    title="上传发票"
                    description="添加新发票文件"
                    icon={Upload}
                    onClick={() => navigate('/invoices/upload')}
                    variant="primary"
                  />
                  <QuickActionCard
                    title="邮箱配置"
                    description="设置邮箱扫描"
                    icon={Mail}
                    onClick={() => navigate('/settings/email-accounts')}
                    variant="success"
                  />
                  <QuickActionCard
                    title="数据分析"
                    description="查看详细图表分析"
                    icon={BarChart3}
                    onClick={() => navigate('/analytics')}
                    variant="info"
                  />
                </div>
              </div>
            </div>

            {/* 热门分类 */}
            {stats?.categories && stats.categories.length > 0 && (
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title text-lg mb-4">
                    <PieChart className="w-5 h-5" />
                    热门分类
                  </h2>
                  <div className="space-y-3">
                    {stats.categories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                          <span className="text-sm">{category.category_name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{category.invoice_count}张</div>
                          <div className="text-xs text-base-content/60">
                            ¥{Number(category.total_amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link 
                    to="/invoices" 
                    className="btn btn-ghost btn-sm mt-3"
                    state={{ showCategoryFilter: true }}
                  >
                    查看更多分类
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：最近发票 */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title text-lg">
                    <Clock className="w-5 h-5" />
                    最近发票
                  </h2>
                  <Link to="/invoices" className="btn btn-ghost btn-sm">
                    查看全部
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
                
                {recentLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-base-300 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : recentInvoices && recentInvoices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentInvoices.map((invoice) => (
                      <RecentInvoicePreview
                        key={invoice.id}
                        invoice={invoice}
                        onView={handleViewInvoice}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-base-content/20 mx-auto mb-3" />
                    <p className="text-base-content/60 mb-4">还没有发票数据</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => navigate('/invoices/upload')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加第一张发票
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 发票快速查看 */}
      {selectedInvoiceId && (
        <InvoiceQuickView
          invoice={recentInvoices?.find(inv => inv.id === selectedInvoiceId) as Invoice}
          isOpen={isQuickViewOpen}
          onClose={handleCloseQuickView}
          onEdit={(invoice) => {
            navigate('/invoices', { 
              state: { editInvoiceId: invoice.id } 
            });
          }}
          onDownload={(invoice) => {
            // 这里可以添加下载逻辑
            console.log('Download invoice:', invoice.id);
          }}
        />
      )}
    </div>
  );
};

export default NewInvoiceCentricDashboard;