/**
 * 网络优化控制面板
 * 提供网络优化功能的可视化控制和监控界面
 */

import React, { useState, useEffect } from 'react';
import { useNetworkOptimization } from '../providers/NetworkOptimizationProvider';
import NetworkPerformancePanel from './NetworkPerformancePanel';

interface NetworkOptimizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NetworkOptimizationPanel: React.FC<NetworkOptimizationPanelProps> = ({
  isOpen,
  onClose
}) => {
  const {
    networkInfo,
    isOptimizationEnabled,
    enableOptimization,
    disableOptimization,
    refreshNetworkInfo,
    getPerformanceData,
    exportNetworkData,
    clearNetworkCache,
    preloader,
    networkAdapter
  } = useNetworkOptimization();

  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'preloader' | 'adapter' | 'settings'>('overview');
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);

  // 自动刷新性能数据
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;

    const updatePerformanceData = () => {
      setPerformanceData(getPerformanceData());
    };

    updatePerformanceData();
    const interval = setInterval(updatePerformanceData, 2000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, getPerformanceData]);

  if (!isOpen) return null;

  const getNetworkStatusColor = () => {
    if (!networkInfo.isOnline) return 'text-red-500';
    switch (networkInfo.connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getNetworkIcon = () => {
    if (!networkInfo.isOnline) return '📵';
    switch (networkInfo.connectionQuality) {
      case 'excellent': return '📶';
      case 'good': return '📶';
      case 'fair': return '📱';
      case 'poor': return '📶';
      default: return '❓';
    }
  };

  const tabs = [
    { id: 'overview', label: '概览', icon: '📊' },
    { id: 'performance', label: '性能', icon: '⚡' },
    { id: 'preloader', label: '预加载', icon: '🔮' },
    { id: 'adapter', label: '适配器', icon: '🔧' },
    { id: 'settings', label: '设置', icon: '⚙️' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" onClick={onClose} />
      <div className="fixed top-4 left-4 right-4 bottom-4 bg-white rounded-lg shadow-2xl z-[9999] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h2 className="text-lg font-semibold">网络优化控制台</h2>
              <div className="flex items-center space-x-2 text-sm">
                <span className={`${getNetworkStatusColor()} font-medium`}>
                  {getNetworkIcon()} {networkInfo.isOnline ? '在线' : '离线'}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">{networkInfo.effectiveType}</span>
                <span className="text-gray-400">|</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isOptimizationEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {isOptimizationEnabled ? '优化启用' : '优化关闭'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 text-sm rounded ${
                autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {autoRefresh ? '🔄 自动刷新' : '⏸️ 手动模式'}
            </button>
            <button
              onClick={() => setShowPerformancePanel(!showPerformancePanel)}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded"
            >
              📈 性能面板
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="border-b bg-gray-50">
          <nav className="px-6 flex space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          {/* 概览页面 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 网络状态卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <h3 className="font-medium text-gray-800">网络状态</h3>
                      <p className={`text-lg font-semibold ${getNetworkStatusColor()}`}>
                        {networkInfo.connectionQuality}
                      </p>
                      <p className="text-sm text-gray-600">{networkInfo.effectiveType}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h3 className="font-medium text-gray-800">优化状态</h3>
                      <p className={`text-lg font-semibold ${
                        isOptimizationEnabled ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {isOptimizationEnabled ? '已启用' : '已禁用'}
                      </p>
                      <button
                        onClick={isOptimizationEnabled ? disableOptimization : enableOptimization}
                        className={`text-sm px-2 py-1 rounded mt-1 ${
                          isOptimizationEnabled 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {isOptimizationEnabled ? '禁用' : '启用'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="font-medium text-gray-800">性能指标</h3>
                      {performanceData?.networkStats && (
                        <>
                          <p className="text-lg font-semibold text-purple-600">
                            {performanceData.networkStats.successRate.toFixed(1)}% 成功率
                          </p>
                          <p className="text-sm text-gray-600">
                            {performanceData.networkStats.averageResponseTime.toFixed(0)}ms 平均延迟
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 快速操作 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">快速操作</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={refreshNetworkInfo}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 text-center"
                  >
                    <div className="text-lg mb-1">🔄</div>
                    <div className="text-sm font-medium">刷新网络</div>
                  </button>
                  
                  <button
                    onClick={exportNetworkData}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 text-center"
                  >
                    <div className="text-lg mb-1">📁</div>
                    <div className="text-sm font-medium">导出数据</div>
                  </button>
                  
                  <button
                    onClick={clearNetworkCache}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 text-center"
                  >
                    <div className="text-lg mb-1">🧹</div>
                    <div className="text-sm font-medium">清空缓存</div>
                  </button>
                  
                  <button
                    onClick={() => setShowPerformancePanel(true)}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 text-center"
                  >
                    <div className="text-lg mb-1">📈</div>
                    <div className="text-sm font-medium">性能监控</div>
                  </button>
                </div>
              </div>

              {/* 实时统计 */}
              {performanceData && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-800">实时统计</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 网络统计 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3">网络请求</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>总请求数:</span>
                          <span className="font-medium">{performanceData.networkStats?.totalRequests || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>成功率:</span>
                          <span className={`font-medium ${
                            (performanceData.networkStats?.successRate || 0) >= 95 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {performanceData.networkStats?.successRate?.toFixed(1) || 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>平均响应时间:</span>
                          <span className="font-medium">
                            {performanceData.networkStats?.averageResponseTime?.toFixed(0) || 0}ms
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Supabase 统计 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3">Supabase 优化</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>总查询数:</span>
                          <span className="font-medium">{performanceData.supabaseStats?.totalQueries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>缓存命中数:</span>
                          <span className="font-medium text-green-600">
                            {performanceData.supabaseStats?.cachedQueries || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>批量操作数:</span>
                          <span className="font-medium">{performanceData.supabaseStats?.batchedOperations || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>缓存命中率:</span>
                          <span className="font-medium text-blue-600">
                            {performanceData.supabaseStats?.cacheStats?.hitRate || '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 性能页面 */}
          {activeTab === 'performance' && performanceData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 网络类型分布 */}
                {performanceData.networkStats?.networkTypeDistribution && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">网络类型分布</h4>
                    <div className="space-y-2">
                      {Object.entries(performanceData.networkStats.networkTypeDistribution).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm">{type}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${((count as number) / performanceData.networkStats.totalRequests * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 错误分布 */}
                {performanceData.networkStats?.errorDistribution && 
                 Object.keys(performanceData.networkStats.errorDistribution).length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">错误分布</h4>
                    <div className="space-y-2">
                      {Object.entries(performanceData.networkStats.errorDistribution).map(([error, count]) => (
                        <div key={error} className="flex justify-between items-center">
                          <span className="text-sm truncate flex-1">{error}</span>
                          <span className="text-sm font-medium text-red-600 ml-2">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 最近请求时间线 */}
              {performanceData.networkStats?.recentRequests && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">最近请求时间线</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {performanceData.networkStats.recentRequests.map((request: any, index: number) => (
                      <div key={index} className="flex items-center space-x-4 p-2 bg-gray-50 rounded">
                        <span className={`w-3 h-3 rounded-full ${
                          request.success ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {request.method} {request.url}
                          </div>
                          <div className="text-xs text-gray-500 flex space-x-2">
                            <span>{request.duration?.toFixed(0)}ms</span>
                            <span>{request.networkType}</span>
                            {request.retryCount > 0 && (
                              <span className="text-orange-600">重试{request.retryCount}次</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(request.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 预加载页面 */}
          {activeTab === 'preloader' && preloader && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">预加载统计</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const stats = preloader.getStats();
                    return (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                          <div className="text-sm text-gray-600">总任务数</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                          <div className="text-sm text-gray-600">已完成</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                          <div className="text-sm text-gray-600">失败</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                          <div className="text-sm text-gray-600">等待中</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* 适配器页面 */}
          {activeTab === 'adapter' && networkAdapter && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">网络适配器统计</h4>
                {(() => {
                  const adapterStats = networkAdapter.getDataUsageStats();
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded">
                        <div className="text-lg font-bold text-gray-800">
                          {(adapterStats?.totalDataUsage / 1024 || 0).toFixed(2)} MB
                        </div>
                        <div className="text-sm text-gray-600">总数据使用量</div>
                      </div>
                      <div className="bg-white p-3 rounded">
                        <div className="text-lg font-bold text-gray-800">
                          {adapterStats?.averagePerRequest?.toFixed(0) || 0} KB
                        </div>
                        <div className="text-sm text-gray-600">平均每请求</div>
                      </div>
                      <div className="bg-white p-3 rounded">
                        <div className="text-lg font-bold text-gray-800">
                          {adapterStats?.totalRequests || 0}
                        </div>
                        <div className="text-sm text-gray-600">总请求数</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 设置页面 */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-4">优化设置</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">启用网络优化</label>
                    <button
                      onClick={isOptimizationEnabled ? disableOptimization : enableOptimization}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isOptimizationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isOptimizationEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">自动刷新监控数据</label>
                    <button
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoRefresh ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 性能监控面板 */}
      <NetworkPerformancePanel
        isOpen={showPerformancePanel}
        onClose={() => setShowPerformancePanel(false)}
        position="right"
      />
    </>
  );
};

export default NetworkOptimizationPanel;