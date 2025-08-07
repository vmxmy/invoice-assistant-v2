import React, { useState } from 'react';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  Building2, 
  User, 
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDeviceDetection } from '../../hooks/useMediaQuery';
import { InvoiceCardOptimized } from '../invoice/cards/InvoiceCardOptimized';
import { ResponsiveIndicatorCard, MiniIndicatorCard } from '../invoice/indicators/ResponsiveIndicatorCard';

// 模拟数据
const mockInvoice = {
  id: 'demo-001',
  user_id: 'user-001',
  invoice_number: 'INV-2024-001',
  status: 'pending',
  amount: 1250.00,
  total_amount: 1250.00,
  currency: 'CNY',
  invoice_date: '2024-01-15',
  consumption_date: '2024-01-14',
  seller_name: '北京科技有限公司',
  buyer_name: '上海创新企业',
  is_verified: true,
  expense_category: '办公用品',
  primary_category_name: '办公费用',
  secondary_category_name: '文具用品',
  created_at: '2024-01-15',
  updated_at: '2024-01-15',
  extracted_data: {},
  version: 1
};

export const CompactDesignDemo: React.FC = () => {
  const device = useDeviceDetection();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [demoVariant, setDemoVariant] = useState<'default' | 'ultra-compact'>('default');

  const handleCardSelect = (id: string) => {
    setSelectedCards(prev => 
      prev.includes(id) 
        ? prev.filter(cardId => cardId !== id)
        : [...prev, id]
    );
  };

  const handleCardAction = (action: string, invoice: any) => {
    console.log(`执行操作: ${action}`, invoice);
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    console.log(`状态变更: ${invoiceId} -> ${newStatus}`);
    return true;
  };

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 标题区域 */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-base-content mb-4">
            🎨 紧凑设计系统演示
          </h1>
          <p className="text-base-content/70 max-w-2xl mx-auto">
            展示统一的组件尺寸标准、紧凑布局设计和响应式适配效果
          </p>
          
          {/* 模式切换 */}
          <div className="flex justify-center gap-2 mt-6">
            <button 
              className={`btn btn-compact-md ${demoVariant === 'default' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setDemoVariant('default')}
            >
              标准模式
            </button>
            <button 
              className={`btn btn-compact-md ${demoVariant === 'ultra-compact' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setDemoVariant('ultra-compact')}
            >
              超紧凑模式
            </button>
          </div>
        </div>

        {/* 按钮系统演示 */}
        <section className="card-compact card-compact-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="icon-container-compact-md bg-primary/10 text-primary">
              🔘
            </div>
            按钮系统
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-base-content/70 mb-2">紧凑按钮尺寸</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <button className="btn btn-compact-xs btn-primary">超小按钮</button>
                <button className="btn btn-compact-sm btn-secondary">小按钮</button>
                <button className="btn btn-compact-md btn-accent">标准按钮</button>
                <button className="btn btn-compact-lg btn-success">大按钮</button>
                {device.isMobile && (
                  <button className="btn btn-compact-touch btn-info">触控按钮</button>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-base-content/70 mb-2">按钮状态</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <button className="btn btn-compact-md btn-primary">主要操作</button>
                <button className="btn btn-compact-md btn-outline btn-primary">次要操作</button>
                <button className="btn btn-compact-md btn-ghost">幽灵按钮</button>
                <button className="btn btn-compact-md btn-primary" disabled>禁用状态</button>
              </div>
            </div>
          </div>
        </section>

        {/* 徽章系统演示 */}
        <section className="card-compact card-compact-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="icon-container-compact-md bg-success/10 text-success">
              🏷️
            </div>
            徽章系统
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-base-content/70 mb-2">徽章尺寸</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="badge badge-compact-xs badge-primary">超小</div>
                <div className="badge badge-compact-sm badge-secondary">小号</div>
                <div className="badge badge-compact-md badge-accent">标准</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-base-content/70 mb-2">状态徽章</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="status-badge-compact badge-success badge-compact-sm">已报销</div>
                <div className="status-badge-compact status-badge-interactive badge-warning badge-compact-sm">
                  待处理
                </div>
                <div className="status-badge-compact badge-error badge-compact-sm">已拒绝</div>
                <div className="status-badge-compact badge-info badge-compact-sm">处理中</div>
              </div>
            </div>
          </div>
        </section>

        {/* 指标卡片演示 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="icon-container-compact-md bg-info/10 text-info">
              📊
            </div>
            指标卡片系统
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ResponsiveIndicatorCard
              icon="💰"
              title="总金额"
              value="¥125,430"
              subtitle="本月报销"
              trend="up"
              trendValue="+12%"
              trendLabel="较上月增长12%"
              variant="success"
              highlight
              onClick={() => console.log('点击了总金额卡片')}
              actionLabel="查看详情"
            />
            
            <ResponsiveIndicatorCard
              icon={<DollarSign className="w-5 h-5" />}
              title="待处理"
              value="23"
              subtitle="张发票"
              trend="down"
              trendValue="-5%"
              variant="warning"
              onClick={() => console.log('点击了待处理卡片')}
            />
            
            <ResponsiveIndicatorCard
              icon="📈"
              title="本月增长"
              value="+15.2%"
              subtitle="对比上月"
              variant="primary"
              compact={demoVariant === 'ultra-compact'}
            />
            
            <ResponsiveIndicatorCard
              icon={<Calendar className="w-5 h-5" />}
              title="平均处理时间"
              value="2.3天"
              subtitle="效率提升"
              trend="up"
              variant="info"
              loading={false}
            />
          </div>
          
          {/* 迷你指标卡 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">迷你指标卡</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MiniIndicatorCard
                icon="🔍"
                label="今日扫描"
                value="15张"
                trend="up"
                onClick={() => console.log('点击今日扫描')}
              />
              <MiniIndicatorCard
                icon="✅"
                label="已验证"
                value="95%"
                onClick={() => console.log('点击已验证')}
              />
              <MiniIndicatorCard
                icon="⏰"
                label="平均用时"
                value="1.2分钟"
                trend="down"
              />
            </div>
          </div>
        </section>

        {/* 发票卡片演示 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="icon-container-compact-md bg-accent/10 text-accent">
              📄
            </div>
            发票卡片系统
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InvoiceCardOptimized
              invoice={mockInvoice}
              isSelected={selectedCards.includes('demo-001')}
              onSelect={handleCardSelect}
              onView={(id) => handleCardAction('view', { id })}
              onEdit={(invoice) => handleCardAction('edit', invoice)}
              onDelete={(invoice) => handleCardAction('delete', invoice)}
              onStatusChange={handleStatusChange}
              variant={demoVariant}
              statusComponent="switch"
            />
            
            <InvoiceCardOptimized
              invoice={{
                ...mockInvoice,
                id: 'demo-002',
                invoice_number: 'INV-2024-002',
                amount: 856.50,
                total_amount: 856.50,
                status: 'reimbursed',
                seller_name: '深圳餐饮服务有限公司',
                expense_category: '餐饮费',
                primary_category_name: '差旅费用',
                is_verified: false
              }}
              isSelected={selectedCards.includes('demo-002')}
              onSelect={handleCardSelect}
              onView={(id) => handleCardAction('view', { id })}
              onEdit={(invoice) => handleCardAction('edit', invoice)}
              onDelete={(invoice) => handleCardAction('delete', invoice)}
              onStatusChange={handleStatusChange}
              variant={demoVariant}
              statusComponent="badge"
            />
          </div>
        </section>

        {/* 交互组件演示 */}
        <section className="card-compact card-compact-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="icon-container-compact-md bg-error/10 text-error">
              🎛️
            </div>
            交互组件
          </h2>
          
          <div className="space-y-6">
            {/* 输入框系统 */}
            <div>
              <h3 className="text-sm font-semibold text-base-content/70 mb-2">输入框尺寸</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input 
                  type="text" 
                  placeholder="小号输入框" 
                  className="input input-bordered input-compact-sm w-full" 
                />
                <input 
                  type="text" 
                  placeholder="标准输入框" 
                  className="input input-bordered input-compact-md w-full" 
                />
                <input 
                  type="text" 
                  placeholder="大号输入框" 
                  className="input input-bordered input-compact-lg w-full" 
                />
              </div>
            </div>
            
            {/* 选择框系统 */}
            <div>
              <h3 className="text-sm font-semibold text-base-content/70 mb-2">选择框系统</h3>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    className={device.isMobile ? 'invoice-checkbox-mobile' : 'invoice-checkbox-compact'} 
                  />
                  <span className="text-sm">桌面端选择框</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    className="invoice-checkbox-mobile" 
                  />
                  <span className="text-sm">移动端选择框</span>
                </label>
              </div>
            </div>
            
            {/* 下拉菜单 */}
            <div>
              <h3 className="text-sm font-semibold text-base-content/70 mb-2">下拉菜单</h3>
              <div className="dropdown dropdown-compact">
                <div tabIndex={0} role="button" className="btn btn-compact-md">
                  紧凑菜单 <MoreVertical className="w-4 h-4 ml-1" />
                </div>
                <ul className="dropdown-content z-50 menu">
                  <li><button className="flex items-center gap-2"><Eye className="w-4 h-4" />查看</button></li>
                  <li><button className="flex items-center gap-2"><Edit className="w-4 h-4" />编辑</button></li>
                  <li><button className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-error" />删除</button></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 动效演示 */}
        <section className="card-compact card-compact-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="icon-container-compact-md bg-secondary/10 text-secondary">
              ✨
            </div>
            动效系统
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div 
              className="card-compact card-compact-md bg-gradient-to-br from-primary/10 to-primary/5 compact-hover-lift cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center">
                <div className="icon-container-compact-lg bg-primary/15 text-primary mx-auto mb-2">
                  🚀
                </div>
                <p className="font-medium">悬停上升</p>
                <p className="text-xs text-base-content/60">hover效果</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="card-compact card-compact-md bg-gradient-to-br from-success/10 to-success/5 compact-scale-press cursor-pointer"
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-center">
                <div className="icon-container-compact-lg bg-success/15 text-success mx-auto mb-2">
                  👆
                </div>
                <p className="font-medium">按压缩放</p>
                <p className="text-xs text-base-content/60">tap效果</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="card-compact card-compact-md bg-gradient-to-br from-accent/10 to-accent/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            >
              <div className="text-center">
                <div className="icon-container-compact-lg bg-accent/15 text-accent mx-auto mb-2">
                  🎭
                </div>
                <p className="font-medium">淡入动画</p>
                <p className="text-xs text-base-content/60">循环演示</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 响应式演示信息 */}
        <section className="card-compact card-compact-lg bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <div className="icon-container-compact-md bg-info/15 text-info">
              📱
            </div>
            响应式信息
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-info mb-2">当前设备</h3>
              <p>类型: {device.isMobile ? '移动设备' : '桌面设备'}</p>
              <p>屏幕: {device.isMobile ? '≤768px' : '>768px'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-info mb-2">当前模式</h3>
              <p>布局: {demoVariant}</p>
              <p>选中卡片: {selectedCards.length}张</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-info mb-2">设计系统</h3>
              <p>版本: v1.0</p>
              <p>组件: 15+</p>
            </div>
          </div>
        </section>

        {/* 底部信息 */}
        <footer className="text-center py-8 text-base-content/60">
          <p className="text-sm">
            🎨 紧凑设计系统演示 - 为发票助手应用量身定制
          </p>
          <p className="text-xs mt-2">
            统一组件尺寸 • 优化视觉层次 • 响应式设计 • 移动端优先
          </p>
        </footer>
      </div>
    </div>
  );
};

export default CompactDesignDemo;