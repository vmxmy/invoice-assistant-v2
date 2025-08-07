import React from 'react';
import { useCompactMode } from '../ui/CompactModeToggle';
import CompactLayout from '../layout/CompactLayout';
import { InvoiceCardCompact } from '../invoice/cards/InvoiceCardCompact';
import { BaseIndicatorCardCompact, StatItemCompact, ProgressBarCompact } from '../invoice/indicators/BaseIndicatorCardCompact';
import { useDeviceDetection } from '../../hooks/useMediaQuery';

// 示例发票数据
const sampleInvoice = {
  id: '1',
  user_id: 'user1',
  invoice_number: 'INV-2024-001',
  invoice_type: '增值税专用发票',
  status: 'unreimbursed',
  amount: 1200.50,
  total_amount: 1350.75,
  currency: 'CNY',
  invoice_date: '2024-01-15',
  consumption_date: '2024-01-15',
  seller_name: '北京科技有限公司',
  buyer_name: '上海贸易公司',
  seller_tax_id: '91110000MA123456XX',
  buyer_tax_id: '91310000MA654321XX',
  file_url: 'https://example.com/invoice.pdf',
  source: 'upload',
  is_verified: true,
  tags: ['办公用品', '日常采购'],
  expense_category: '办公用品',
  primary_category_name: '办公用品',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  extracted_data: {},
  version: 1
};

const CompactModeExample: React.FC = () => {
  const { isCompactMode } = useCompactMode();
  const device = useDeviceDetection();

  return (
    <CompactLayout compactMode="auto">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`font-bold ${isCompactMode ? 'text-xl' : 'text-2xl'}`}>
                紧凑模式演示
              </h1>
              <p className={`text-base-content/60 ${isCompactMode ? 'text-sm' : 'text-base'}`}>
                当前使用 {isCompactMode ? '紧凑模式' : '标准模式'} 显示
              </p>
            </div>
            
            <div className="badge badge-info">
              {device.isMobile ? '移动端' : '桌面端'}
            </div>
          </div>

          {/* 指示器卡片对比 */}
          <section>
            <h2 className={`font-semibold mb-4 ${isCompactMode ? 'text-lg' : 'text-xl'}`}>
              指示器卡片
            </h2>
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${isCompactMode ? 'gap-3' : 'gap-4'}`}>
              <BaseIndicatorCardCompact
                icon="💰"
                title="总收入"
                variant="success"
                borderHighlight
                onClick={() => console.log('点击总收入')}
              >
                <div className="space-y-2">
                  <StatItemCompact 
                    value="¥125,689" 
                    size="lg" 
                    variant="success"
                  />
                  <StatItemCompact 
                    value="+12.5%" 
                    label="vs 上月" 
                    size="sm" 
                    variant="success"
                  />
                  <ProgressBarCompact 
                    value={75} 
                    variant="success" 
                    showLabel 
                  />
                </div>
              </BaseIndicatorCardCompact>

              <BaseIndicatorCardCompact
                icon="📊"
                title="待处理发票"
                variant="warning"
                borderHighlight
              >
                <div className="space-y-2">
                  <StatItemCompact 
                    value="23" 
                    unit="张" 
                    size="lg" 
                    variant="warning"
                  />
                  <StatItemCompact 
                    value="¥8,450" 
                    label="总金额" 
                    size="sm"
                  />
                  <ProgressBarCompact 
                    value={35} 
                    variant="warning" 
                    showLabel 
                  />
                </div>
              </BaseIndicatorCardCompact>

              <BaseIndicatorCardCompact
                icon="✅"
                title="已完成"
                variant="info"
              >
                <div className="space-y-2">
                  <StatItemCompact 
                    value="187" 
                    unit="张" 
                    size="lg" 
                    variant="info"
                  />
                  <StatItemCompact 
                    value="98.5%" 
                    label="完成率" 
                    size="sm" 
                    variant="success"
                  />
                  <ProgressBarCompact 
                    value={98} 
                    variant="info" 
                    showLabel 
                  />
                </div>
              </BaseIndicatorCardCompact>

              <BaseIndicatorCardCompact
                icon="⚠️"
                title="异常发票"
                variant="error"
                borderHighlight
              >
                <div className="space-y-2">
                  <StatItemCompact 
                    value="3" 
                    unit="张" 
                    size="lg" 
                    variant="error"
                  />
                  <StatItemCompact 
                    value="需要处理" 
                    size="sm" 
                    variant="error"
                  />
                  <ProgressBarCompact 
                    value={15} 
                    variant="error" 
                    showLabel 
                  />
                </div>
              </BaseIndicatorCardCompact>
            </div>
          </section>

          {/* 发票卡片对比 */}
          <section>
            <h2 className={`font-semibold mb-4 ${isCompactMode ? 'text-lg' : 'text-xl'}`}>
              发票卡片
            </h2>
            
            <div className={`grid grid-cols-1 lg:grid-cols-2 ${isCompactMode ? 'gap-3' : 'gap-4'}`}>
              <InvoiceCardCompact
                invoice={sampleInvoice as any}
                isSelected={false}
                onSelect={(id) => console.log('选择发票:', id)}
                onView={(id) => console.log('查看发票:', id)}
                onEdit={(invoice) => console.log('编辑发票:', invoice)}
                onDelete={(invoice) => console.log('删除发票:', invoice)}
                onStatusChange={async (id, status) => {
                  console.log('更改状态:', id, status);
                  return true;
                }}
              />

              <InvoiceCardCompact
                invoice={{
                  ...sampleInvoice,
                  id: '2',
                  invoice_number: 'INV-2024-002',
                  status: 'reimbursed',
                  expense_category: '差旅费',
                  primary_category_name: '差旅费',
                  seller_name: '深圳酒店管理有限公司',
                  amount: 850.00,
                  total_amount: 935.00
                } as any}
                isSelected={true}
                onSelect={(id) => console.log('选择发票:', id)}
                onView={(id) => console.log('查看发票:', id)}
                onEdit={(invoice) => console.log('编辑发票:', invoice)}
                onDelete={(invoice) => console.log('删除发票:', invoice)}
              />
            </div>
          </section>

          {/* 对比说明 */}
          <section>
            <h2 className={`font-semibold mb-4 ${isCompactMode ? 'text-lg' : 'text-xl'}`}>
              模式对比说明
            </h2>
            
            <div className="alert alert-info">
              <div>
                <h3 className="font-semibold">当前模式特点:</h3>
                <div className="mt-2 space-y-1 text-sm">
                  {isCompactMode ? (
                    <>
                      <div>• 卡片内边距从 p-4/p-5 减少到 p-3</div>
                      <div>• 网格间距从 gap-4/gap-6 减少到 gap-3</div>
                      <div>• 按钮高度从 h-10 减少到 h-8</div>
                      <div>• 字体大小适当缩小但保持可读性</div>
                      <div>• 元素间距更紧凑，信息密度更高</div>
                      <div>• 移动端仍保持44px最小触控区域</div>
                    </>
                  ) : (
                    <>
                      <div>• 使用标准的间距和内边距</div>
                      <div>• 较大的触控区域和按钮</div>
                      <div>• 更宽松的元素排列</div>
                      <div>• 适合触控操作和阅读</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 使用指南 */}
          <section>
            <h2 className={`font-semibold mb-4 ${isCompactMode ? 'text-lg' : 'text-xl'}`}>
              使用指南
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-base-100 shadow">
                <div className="card-body p-4">
                  <h3 className="card-title text-sm">何时使用紧凑模式</h3>
                  <ul className="text-xs space-y-1 text-base-content/70">
                    <li>• 大屏幕显示器 (≥1024px)</li>
                    <li>• 需要查看更多信息</li>
                    <li>• 专业用户频繁操作</li>
                    <li>• 数据密集型场景</li>
                  </ul>
                </div>
              </div>
              
              <div className="card bg-base-100 shadow">
                <div className="card-body p-4">
                  <h3 className="card-title text-sm">何时使用标准模式</h3>
                  <ul className="text-xs space-y-1 text-base-content/70">
                    <li>• 移动设备和小屏幕</li>
                    <li>• 偶尔使用的用户</li>
                    <li>• 需要更好的触控体验</li>
                    <li>• 注重视觉舒适性</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </CompactLayout>
  );
};

export default CompactModeExample;