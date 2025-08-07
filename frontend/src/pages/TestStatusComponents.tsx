import React, { useState } from 'react';
import { InvoiceStatusBadge } from '../components/invoice/InvoiceStatusBadge';
import { InvoiceStatusSwitch, QuickInvoiceStatusSwitch } from '../components/invoice/InvoiceStatusSwitch';
import toast, { Toaster } from 'react-hot-toast';

const TestStatusComponents: React.FC = () => {
  const [badgeStatus, setBadgeStatus] = useState('pending');
  const [switchStatus, setSwitchStatus] = useState('pending');
  const [quickSwitchStatus, setQuickSwitchStatus] = useState('pending');

  const handleStatusChange = (type: string) => (newStatus: string) => {
    toast.success(`${type} 状态已更新为: ${newStatus}`);
    console.log(`${type} status changed to:`, newStatus);
    return Promise.resolve(); // 模拟异步操作
  };

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">状态组件对比测试</h1>
          <p className="text-base-content/70">比较徽章组件和切换组件的交互体验</p>
        </div>

        {/* 徽章组件 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">徽章组件 (InvoiceStatusBadge)</h2>
            <p className="text-sm text-base-content/70 mb-4">
              功能完整的下拉菜单选择，支持多种状态转换，适合需要精确控制的场景
            </p>
            
            <div className="space-y-6">
              {/* 不同尺寸 */}
              <div>
                <h3 className="text-sm font-medium mb-3">不同尺寸</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <InvoiceStatusBadge
                    status={badgeStatus}
                    onStatusChange={(newStatus) => {
                      setBadgeStatus(newStatus);
                      handleStatusChange('徽章 (小)')(newStatus);
                    }}
                    size="sm"
                  />
                  <InvoiceStatusBadge
                    status={badgeStatus}
                    onStatusChange={(newStatus) => {
                      setBadgeStatus(newStatus);
                      handleStatusChange('徽章 (中)')(newStatus);
                    }}
                    size="md"
                  />
                  <InvoiceStatusBadge
                    status={badgeStatus}
                    onStatusChange={(newStatus) => {
                      setBadgeStatus(newStatus);
                      handleStatusChange('徽章 (大)')(newStatus);
                    }}
                    size="lg"
                  />
                </div>
              </div>

              {/* 只读状态 */}
              <div>
                <h3 className="text-sm font-medium mb-3">只读模式</h3>
                <div className="flex flex-wrap gap-4">
                  {['pending', 'processing', 'reimbursed', 'rejected', 'cancelled'].map((status) => (
                    <InvoiceStatusBadge
                      key={status}
                      status={status}
                      interactive={false}
                      size="md"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 切换组件 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">切换组件 (InvoiceStatusSwitch)</h2>
            <p className="text-sm text-base-content/70 mb-4">
              一键切换设计，自动选择下一个可用状态，操作简单直观
            </p>
            
            <div className="space-y-6">
              {/* 不同尺寸 */}
              <div>
                <h3 className="text-sm font-medium mb-3">不同尺寸</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <InvoiceStatusSwitch
                    status={switchStatus}
                    onStatusChange={(newStatus) => {
                      setSwitchStatus(newStatus);
                      handleStatusChange('切换 (小)')(newStatus);
                    }}
                    size="sm"
                  />
                  <InvoiceStatusSwitch
                    status={switchStatus}
                    onStatusChange={(newStatus) => {
                      setSwitchStatus(newStatus);
                      handleStatusChange('切换 (中)')(newStatus);
                    }}
                    size="md"
                  />
                  <InvoiceStatusSwitch
                    status={switchStatus}
                    onStatusChange={(newStatus) => {
                      setSwitchStatus(newStatus);
                      handleStatusChange('切换 (大)')(newStatus);
                    }}
                    size="lg"
                  />
                </div>
              </div>

              {/* 禁用状态 */}
              <div>
                <h3 className="text-sm font-medium mb-3">禁用状态</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <InvoiceStatusSwitch
                    status="pending"
                    onStatusChange={() => {}}
                    disabled={true}
                    size="md"
                  />
                  <InvoiceStatusSwitch
                    status="processing"
                    onStatusChange={() => {}}
                    loading={true}
                    size="md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 快速切换组件 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">快速切换组件 (QuickInvoiceStatusSwitch)</h2>
            <p className="text-sm text-base-content/70 mb-4">
              类似开关的设计，专门用于在"待处理"和"已报销"之间快速切换
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">不同尺寸</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <QuickInvoiceStatusSwitch
                      status={quickSwitchStatus}
                      onToggle={(newStatus) => {
                        setQuickSwitchStatus(newStatus);
                        handleStatusChange('快速切换 (小)')(newStatus);
                      }}
                      size="sm"
                    />
                    <span className="text-xs text-base-content/60">小号</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <QuickInvoiceStatusSwitch
                      status={quickSwitchStatus}
                      onToggle={(newStatus) => {
                        setQuickSwitchStatus(newStatus);
                        handleStatusChange('快速切换 (中)')(newStatus);
                      }}
                      size="md"
                    />
                    <span className="text-xs text-base-content/60">中号</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <QuickInvoiceStatusSwitch
                      status={quickSwitchStatus}
                      onToggle={(newStatus) => {
                        setQuickSwitchStatus(newStatus);
                        handleStatusChange('快速切换 (大)')(newStatus);
                      }}
                      size="lg"
                    />
                    <span className="text-xs text-base-content/60">大号</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 使用场景对比 */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">使用场景对比</h2>
            
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>组件</th>
                    <th>交互方式</th>
                    <th>适用场景</th>
                    <th>优点</th>
                    <th>缺点</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">徽章组件</td>
                    <td>点击下拉选择</td>
                    <td>需要精确控制多种状态转换</td>
                    <td>功能完整、状态清晰、支持复杂流程</td>
                    <td>操作步骤较多、占用空间较大</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">切换组件</td>
                    <td>一键切换</td>
                    <td>快速切换到下一个状态</td>
                    <td>操作简单、响应快速、界面简洁</td>
                    <td>状态转换路径固定、无法跳转</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">快速切换</td>
                    <td>开关切换</td>
                    <td>两种状态间频繁切换</td>
                    <td>直观明了、操作最简单</td>
                    <td>仅支持两种状态</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 推荐使用 */}
        <div className="card bg-primary text-primary-content shadow-lg">
          <div className="card-body">
            <h2 className="card-title mb-4">💡 推荐使用</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-primary-content/10 rounded-lg p-4">
                <h3 className="font-semibold mb-2">管理后台</h3>
                <p className="opacity-90">使用徽章组件，支持完整的状态流程管理</p>
              </div>
              <div className="bg-primary-content/10 rounded-lg p-4">
                <h3 className="font-semibold mb-2">移动端列表</h3>
                <p className="opacity-90">使用切换组件，快速操作，节省空间</p>
              </div>
              <div className="bg-primary-content/10 rounded-lg p-4">
                <h3 className="font-semibold mb-2">批量操作</h3>
                <p className="opacity-90">使用快速切换，专注于报销状态切换</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestStatusComponents;