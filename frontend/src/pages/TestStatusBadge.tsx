import React, { useState } from 'react';
import { InvoiceStatusBadge, InvoiceStatusToggle, type InvoiceStatus } from '../components/invoice/InvoiceStatusBadge';
import toast, { Toaster } from 'react-hot-toast';

const TestStatusBadge: React.FC = () => {
  const [status1, setStatus1] = useState<InvoiceStatus>('pending');
  const [status2, setStatus2] = useState<InvoiceStatus>('processing');
  const [status3, setStatus3] = useState<InvoiceStatus>('reimbursed');
  const [isReimbursed, setIsReimbursed] = useState(false);

  const handleStatusChange = (id: string) => (newStatus: InvoiceStatus) => {
    toast.success(`状态已更新为: ${newStatus} (ID: ${id})`);
    console.log(`Status changed to: ${newStatus} for ${id}`);
  };

  const allStatuses: InvoiceStatus[] = ['pending', 'processing', 'reimbursed', 'rejected', 'cancelled'];

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <Toaster position="top-right" />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">发票状态徽章组件测试</h1>
          <p className="text-base-content/70">点击徽章可以切换状态，展示不同的交互效果</p>
        </div>

        {/* 交互式徽章示例 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">交互式状态徽章</h2>
            
            <div className="space-y-6">
              {/* 单个交互式徽章 */}
              <div>
                <h3 className="text-sm font-medium text-base-content/70 mb-3">标准尺寸 - 可点击切换</h3>
                <div className="flex flex-wrap gap-4">
                  <InvoiceStatusBadge
                    status={status1}
                    onStatusChange={(newStatus) => {
                      setStatus1(newStatus);
                      handleStatusChange('badge-1')(newStatus);
                    }}
                    size="md"
                  />
                  <InvoiceStatusBadge
                    status={status2}
                    onStatusChange={(newStatus) => {
                      setStatus2(newStatus);
                      handleStatusChange('badge-2')(newStatus);
                    }}
                    size="md"
                  />
                  <InvoiceStatusBadge
                    status={status3}
                    onStatusChange={(newStatus) => {
                      setStatus3(newStatus);
                      handleStatusChange('badge-3')(newStatus);
                    }}
                    size="md"
                  />
                </div>
              </div>

              {/* 不同尺寸 */}
              <div>
                <h3 className="text-sm font-medium text-base-content/70 mb-3">不同尺寸</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <InvoiceStatusBadge
                    status="pending"
                    onStatusChange={handleStatusChange('size-sm')}
                    size="sm"
                  />
                  <InvoiceStatusBadge
                    status="processing"
                    onStatusChange={handleStatusChange('size-md')}
                    size="md"
                  />
                  <InvoiceStatusBadge
                    status="reimbursed"
                    onStatusChange={handleStatusChange('size-lg')}
                    size="lg"
                  />
                </div>
              </div>

              {/* 无下拉箭头版本 */}
              <div>
                <h3 className="text-sm font-medium text-base-content/70 mb-3">无下拉箭头（使用编辑图标）</h3>
                <div className="flex flex-wrap gap-4">
                  <InvoiceStatusBadge
                    status="pending"
                    onStatusChange={handleStatusChange('no-arrow')}
                    showDropdownArrow={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 只读徽章示例 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">只读状态徽章</h2>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-base-content/70 mb-3">所有状态展示</h3>
              <div className="flex flex-wrap gap-4">
                {allStatuses.map((status) => (
                  <InvoiceStatusBadge
                    key={status}
                    status={status}
                    interactive={false}
                    size="md"
                  />
                ))}
              </div>

              <h3 className="text-sm font-medium text-base-content/70 mb-3 mt-6">无标签版本</h3>
              <div className="flex flex-wrap gap-4">
                {allStatuses.map((status) => (
                  <InvoiceStatusBadge
                    key={`no-label-${status}`}
                    status={status}
                    interactive={false}
                    showLabel={false}
                    size="md"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 切换按钮示例 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">简化版切换按钮</h2>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-base-content/70 mb-3">用于批量操作</h3>
              <div className="flex flex-wrap gap-4">
                <InvoiceStatusToggle
                  status={isReimbursed ? 'reimbursed' : 'pending'}
                  onToggle={() => {
                    setIsReimbursed(!isReimbursed);
                    toast.success(`切换为: ${!isReimbursed ? '已报销' : '未报销'}`);
                  }}
                  size="md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">组件特性说明</h2>
            
            <div className="prose max-w-none">
              <ul className="space-y-2 text-sm">
                <li>✨ <strong>点击切换</strong>：点击徽章会弹出下拉菜单，选择新状态</li>
                <li>📱 <strong>移动端优化</strong>：自动适配触控目标大小（最小 48px）</li>
                <li>🎨 <strong>视觉反馈</strong>：悬停和点击时有缩放动画效果</li>
                <li>💡 <strong>状态指示</strong>：
                  <ul className="mt-2 ml-4">
                    <li>• 待处理（黄色）- 时钟图标</li>
                    <li>• 处理中（蓝色）- 旋转动画</li>
                    <li>• 已报销（绿色）- 勾选图标</li>
                    <li>• 已驳回（红色）- 叉号图标</li>
                    <li>• 已取消（灰色）- 警告图标</li>
                  </ul>
                </li>
                <li>🔄 <strong>流畅过渡</strong>：使用 Framer Motion 实现平滑动画</li>
                <li>♿ <strong>无障碍</strong>：支持键盘导航和屏幕阅读器</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 代码示例 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">使用示例</h2>
            
            <div className="mockup-code">
              <pre data-prefix="1"><code>{`import { InvoiceStatusBadge } from './InvoiceStatusBadge';`}</code></pre>
              <pre data-prefix="2"><code>{``}</code></pre>
              <pre data-prefix="3"><code>{`// 基础用法`}</code></pre>
              <pre data-prefix="4"><code>{`<InvoiceStatusBadge`}</code></pre>
              <pre data-prefix="5"><code>{`  status="pending"`}</code></pre>
              <pre data-prefix="6"><code>{`  onStatusChange={(newStatus) => {`}</code></pre>
              <pre data-prefix="7"><code>{`    console.log('New status:', newStatus);`}</code></pre>
              <pre data-prefix="8"><code>{`  }}`}</code></pre>
              <pre data-prefix="9"><code>{`/>`}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestStatusBadge;