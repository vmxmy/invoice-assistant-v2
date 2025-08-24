import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Star, 
  Archive, 
  Edit, 
  Heart, 
  Share, 
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import SwipeableItem from './SwipeableItem';
import EnhancedPullToRefresh from './EnhancedPullToRefresh';
import { PinchZoomContainer, PinchZoomRef } from './PinchZoomContainer';
import ZoomableView from './ZoomableView';

// 示例发票数据
const sampleInvoices = [
  {
    id: '1',
    company: '深圳科技有限公司',
    amount: 15600.00,
    date: '2024-01-15',
    status: 'paid',
    category: '设备采购'
  },
  {
    id: '2', 
    company: '广州贸易公司',
    amount: 8750.00,
    date: '2024-01-14',
    status: 'pending',
    category: '办公用品'
  },
  {
    id: '3',
    company: '北京服务中心',
    amount: 23400.00,
    date: '2024-01-13',
    status: 'overdue',
    category: '服务费'
  },
  {
    id: '4',
    company: '上海物流公司',
    amount: 5280.00,
    date: '2024-01-12',
    status: 'paid',
    category: '运输费'
  },
  {
    id: '5',
    company: '杭州软件公司',
    amount: 45600.00,
    date: '2024-01-11',
    status: 'pending',
    category: '软件授权'
  }
];

export const GestureExamples: React.FC = () => {
  const [invoices, setInvoices] = useState(sampleInvoices);
  const [selectedTab, setSelectedTab] = useState<'swipe' | 'pullRefresh' | 'pinchZoom' | 'zoomableView'>('swipe');
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastAction, setLastAction] = useState<string>('');
  
  const pinchZoomRef = useRef<PinchZoomRef>(null);

  // 滑动动作配置
  const leftActions = [
    {
      id: 'favorite',
      icon: <Star className="w-5 h-5" />,
      label: '收藏',
      color: '#f59e0b',
      backgroundColor: '#f59e0b',
      onAction: () => setLastAction('添加到收藏'),
    },
    {
      id: 'share',
      icon: <Share className="w-5 h-5" />,
      label: '分享',
      color: '#3b82f6',
      backgroundColor: '#3b82f6',
      onAction: () => setLastAction('分享发票'),
    }
  ];

  const rightActions = [
    {
      id: 'edit',
      icon: <Edit className="w-5 h-5" />,
      label: '编辑',
      color: '#6b7280',
      backgroundColor: '#6b7280',
      onAction: () => setLastAction('编辑发票'),
    },
    {
      id: 'archive',
      icon: <Archive className="w-5 h-5" />,
      label: '归档',
      color: '#8b5cf6',
      backgroundColor: '#8b5cf6',
      onAction: () => setLastAction('归档发票'),
    },
    {
      id: 'delete',
      icon: <Trash2 className="w-5 h-5" />,
      label: '删除',
      color: '#ef4444',
      backgroundColor: '#ef4444',
      destructive: true,
      confirmRequired: true,
      onAction: () => {
        setLastAction('删除发票');
        // 实际删除逻辑
        setInvoices(prev => prev.filter((_, index) => index !== 0));
      },
    }
  ];

  // 下拉刷新处理
  const handleRefresh = useCallback(async () => {
    // 模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshCount(prev => prev + 1);
    setLastAction(`第 ${refreshCount + 1} 次刷新完成`);
  }, [refreshCount]);

  // 渲染发票卡片
  const renderInvoiceCard = useCallback((invoice: typeof sampleInvoices[0], index: number) => (
    <div key={invoice.id} className="bg-base-100 rounded-lg border border-base-200 p-4 mb-3 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-base-content text-lg">{invoice.company}</h3>
        <span className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${invoice.status === 'paid' ? 'bg-success text-success-content' :
            invoice.status === 'pending' ? 'bg-warning text-warning-content' :
            'bg-error text-error-content'}
        `}>
          {invoice.status === 'paid' ? '已支付' : 
           invoice.status === 'pending' ? '待支付' : '逾期'}
        </span>
      </div>
      
      <div className="flex justify-between items-center text-sm text-base-content/70">
        <span>{invoice.category}</span>
        <span>{invoice.date}</span>
      </div>
      
      <div className="mt-3 text-right">
        <span className="text-2xl font-bold text-primary">
          ¥{invoice.amount.toLocaleString()}
        </span>
      </div>
    </div>
  ), []);

  // 示例图片
  const sampleImage = "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=600&fit=crop";

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-md mx-auto">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-base-content mb-2">手势操作示例</h1>
          <p className="text-base-content/60 text-sm">
            体验滑动、缩放、下拉刷新等手势操作
          </p>
        </div>

        {/* 动作反馈 */}
        <AnimatePresence>
          {lastAction && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-3 bg-success text-success-content rounded-lg text-center"
            >
              {lastAction}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 选项卡导航 */}
        <div className="tabs tabs-boxed mb-6">
          <button 
            className={`tab ${selectedTab === 'swipe' ? 'tab-active' : ''}`}
            onClick={() => setSelectedTab('swipe')}
          >
            滑动操作
          </button>
          <button 
            className={`tab ${selectedTab === 'pullRefresh' ? 'tab-active' : ''}`}
            onClick={() => setSelectedTab('pullRefresh')}
          >
            下拉刷新
          </button>
          <button 
            className={`tab ${selectedTab === 'pinchZoom' ? 'tab-active' : ''}`}
            onClick={() => setSelectedTab('pinchZoom')}
          >
            双指缩放
          </button>
          <button 
            className={`tab ${selectedTab === 'zoomableView' ? 'tab-active' : ''}`}
            onClick={() => setSelectedTab('zoomableView')}
          >
            图片缩放
          </button>
        </div>

        {/* 内容区域 */}
        <div className="bg-base-100 rounded-lg shadow-lg overflow-hidden">
          {selectedTab === 'swipe' && (
            <div className="p-4">
              <div className="mb-4 text-center">
                <h3 className="font-semibold mb-2">滑动操作示例</h3>
                <p className="text-sm text-base-content/60">
                  左滑显示收藏和分享，右滑显示编辑和删除
                </p>
              </div>
              
              <div className="space-y-1">
                {invoices.slice(0, 3).map((invoice, index) => (
                  <SwipeableItem
                    key={invoice.id}
                    leftActions={leftActions}
                    rightActions={rightActions}
                    className="rounded-lg overflow-hidden"
                    itemId={invoice.id}
                  >
                    {renderInvoiceCard(invoice, index)}
                  </SwipeableItem>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-info/10 rounded-lg">
                <p className="text-sm text-info text-center">
                  💡 提示: 轻滑显示操作菜单，重滑直接执行第一个动作
                </p>
              </div>
            </div>
          )}

          {selectedTab === 'pullRefresh' && (
            <div className="h-96">
              <EnhancedPullToRefresh
                onRefresh={handleRefresh}
                indicator={{
                  theme: 'gradient',
                  size: 'medium',
                  showProgress: true,
                  showMessage: true,
                  animation: 'bounce',
                  messages: {
                    pull: '下拉刷新数据',
                    release: '松开开始刷新',
                    refreshing: '正在获取最新数据...',
                    completed: '数据更新完成',
                    error: '刷新失败，请重试'
                  }
                }}
              >
                <div className="p-4">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold mb-2">下拉刷新示例</h3>
                    <p className="text-sm text-base-content/60">
                      在内容顶部下拉即可刷新
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {invoices.map((invoice, index) => (
                      <div key={invoice.id}>
                        {renderInvoiceCard(invoice, index)}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-3 bg-success/10 rounded-lg text-center">
                    <p className="text-success text-sm">
                      刷新次数: {refreshCount}
                    </p>
                  </div>
                </div>
              </EnhancedPullToRefresh>
            </div>
          )}

          {selectedTab === 'pinchZoom' && (
            <div className="h-96">
              <PinchZoomContainer
                ref={pinchZoomRef}
                minScale={0.5}
                maxScale={3}
                enableRotation={true}
                showControls={true}
                onZoomChange={(scale, rotation) => {
                  setLastAction(`缩放: ${(scale * 100).toFixed(0)}%, 旋转: ${rotation.toFixed(0)}°`);
                }}
              >
                <div className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-4">双指缩放示例</h3>
                  
                  <div className="bg-gradient-to-br from-primary to-secondary p-8 rounded-lg text-primary-content">
                    <h4 className="text-xl font-semibold mb-4">发票统计面板</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">156</div>
                        <div className="text-sm opacity-80">本月发票</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">¥234,567</div>
                        <div className="text-sm opacity-80">总金额</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">89</div>
                        <div className="text-sm opacity-80">已支付</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">67</div>
                        <div className="text-sm opacity-80">待处理</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-center gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => pinchZoomRef.current?.zoomIn()}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => pinchZoomRef.current?.zoomOut()}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => pinchZoomRef.current?.resetAll()}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-base-content/60 mt-4">
                    使用双指捏合缩放，双指旋转
                  </p>
                </div>
              </PinchZoomContainer>
            </div>
          )}

          {selectedTab === 'zoomableView' && (
            <div className="h-96">
              <ZoomableView
                minScale={0.5}
                maxScale={4}
                resetOnDoubleTap={true}
                showZoomControls={true}
                enablePanOnZoom={true}
                onZoom={(scale) => {
                  setLastAction(`图片缩放: ${(scale * 100).toFixed(0)}%`);
                }}
                onDoubleTap={(scale) => {
                  setLastAction(`双击${scale > 1 ? '缩放' : '重置'}: ${(scale * 100).toFixed(0)}%`);
                }}
              >
                <div className="w-full h-full relative">
                  <img
                    src={sampleImage}
                    alt="示例发票图片"
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                  
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 text-center">
                      <h4 className="font-semibold mb-2">发票图片查看器</h4>
                      <p className="text-sm text-gray-600">
                        双击缩放，拖拽移动
                      </p>
                    </div>
                  </div>
                </div>
              </ZoomableView>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="mt-6 p-4 bg-base-100 rounded-lg">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-error" />
            手势操作指南
          </h3>
          
          <div className="space-y-2 text-sm text-base-content/70">
            <div>• <strong>滑动操作</strong>: 在列表项上左右滑动显示快捷菜单</div>
            <div>• <strong>下拉刷新</strong>: 在内容顶部向下拖拽触发刷新</div>
            <div>• <strong>双指缩放</strong>: 使用两个手指捏合进行缩放和旋转</div>
            <div>• <strong>图片查看</strong>: 双击快速缩放，拖拽移动视图</div>
            <div>• <strong>键盘支持</strong>: 所有操作都支持键盘快捷键</div>
          </div>
          
          <div className="mt-4 p-3 bg-warning/10 rounded-lg">
            <p className="text-warning text-xs">
              💡 所有手势操作都包含触觉反馈和无障碍支持
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestureExamples;