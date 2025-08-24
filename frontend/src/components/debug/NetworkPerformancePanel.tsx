/**
 * 网络性能监控面板
 * 显示网络状态、性能指标、离线操作等信息
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus, useNetworkPerformance } from '../../hooks/useNetworkRequest';
import { networkRequestManager } from '../../utils/networkRequestManager';

interface NetworkPerformancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const NetworkPerformancePanel: React.FC<NetworkPerformancePanelProps> = ({
  isOpen,
  onClose,
  position = 'bottom'
}) => {
  const { networkInfo } = useNetworkStatus();
  const { stats, exportData, clearMetrics } = useNetworkPerformance();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !isOpen) return;

    const interval = setInterval(() => {
      // 触发重新渲染以更新数据
      setExpandedSection(prev => prev);
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, isOpen]);

  const handleExport = useCallback(() => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-performance-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportData]);

  const getConnectionIcon = () => {
    if (!networkInfo.isOnline) return '📵';
    
    switch (networkInfo.connectionQuality) {
      case 'excellent': return '📶';
      case 'good': return '📶';
      case 'fair': return '📱';
      case 'poor': return '📶';
      default: return '❓';
    }
  };

  const getConnectionColor = () => {
    if (!networkInfo.isOnline) return 'text-red-500';
    
    switch (networkInfo.connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  if (!isOpen) return null;

  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    left: 'left-0 top-0 bottom-0 w-80',
    right: 'right-0 top-0 bottom-0 w-80'
  };

  return (
    <div className={`fixed ${positionClasses[position]} bg-white border shadow-lg z-[9999] overflow-auto max-h-screen`}>
      {/* 头部 */}
      <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📊</span>
          <span className="font-medium text-sm">网络性能监控</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2 py-1 text-xs rounded ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {autoRefresh ? '自动刷新' : '手动刷新'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 网络状态 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="font-medium text-sm mb-2">网络状态</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className={`text-lg ${getConnectionColor()}`}>
                {getConnectionIcon()}
              </span>
              <span>{networkInfo.isOnline ? '在线' : '离线'}</span>
            </div>
            <div>
              <span className="text-gray-500">连接质量: </span>
              <span className={getConnectionColor()}>
                {networkInfo.connectionQuality}
              </span>
            </div>
            <div>
              <span className="text-gray-500">网络类型: </span>
              <span>{networkInfo.effectiveType}</span>
            </div>
            <div>
              <span className="text-gray-500">设备类型: </span>
              <span>{networkInfo.isMobile ? '移动设备' : '桌面设备'}</span>
            </div>
            {networkInfo.estimatedBandwidth && (
              <div className="col-span-2">
                <span className="text-gray-500">预估带宽: </span>
                <span>{networkInfo.estimatedBandwidth.toFixed(1)} Mbps</span>
              </div>
            )}
          </div>
        </div>

        {/* 性能统计 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'stats' ? null : 'stats')}
          >
            <h3 className="font-medium text-sm">性能统计</h3>
            <span className="text-xs">
              {expandedSection === 'stats' ? '收起' : '展开'}
            </span>
          </div>
          
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">总请求: </span>
              <span>{stats.totalRequests}</span>
            </div>
            <div>
              <span className="text-gray-500">成功率: </span>
              <span className={stats.successRate >= 95 ? 'text-green-600' : 
                             stats.successRate >= 90 ? 'text-yellow-600' : 'text-red-600'}>
                {stats.successRate.toFixed(1)}%
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">平均响应时间: </span>
              <span className={stats.averageResponseTime <= 1000 ? 'text-green-600' : 
                             stats.averageResponseTime <= 3000 ? 'text-yellow-600' : 'text-red-600'}>
                {stats.averageResponseTime.toFixed(0)}ms
              </span>
            </div>
          </div>

          {expandedSection === 'stats' && (
            <div className="mt-3 space-y-2">
              {/* 网络类型分布 */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">网络类型分布</h4>
                <div className="space-y-1">
                  {Object.entries(stats.networkTypeDistribution).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span>{type}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 错误分布 */}
              {Object.keys(stats.errorDistribution).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">错误分布</h4>
                  <div className="space-y-1">
                    {Object.entries(stats.errorDistribution).map(([error, count]) => (
                      <div key={error} className="flex justify-between text-xs">
                        <span className="truncate flex-1">{error}</span>
                        <span className="text-red-600">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 最近请求 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'recent' ? null : 'recent')}
          >
            <h3 className="font-medium text-sm">最近请求</h3>
            <span className="text-xs">
              {expandedSection === 'recent' ? '收起' : '展开'}
            </span>
          </div>

          {expandedSection === 'recent' && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {stats.recentRequests?.map((request: any, index: number) => (
                <div key={index} className="text-xs border-b border-gray-200 pb-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-mono text-xs truncate">
                        {request.method} {request.url}
                      </div>
                      <div className="flex space-x-2 text-gray-500 mt-1">
                        <span>{request.duration?.toFixed(0)}ms</span>
                        <span>{request.networkType}</span>
                        {request.retryCount > 0 && (
                          <span className="text-orange-600">
                            重试{request.retryCount}次
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-1 py-0.5 rounded text-xs ${
                      request.success 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {request.success ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              ))}
              {(!stats.recentRequests || stats.recentRequests.length === 0) && (
                <div className="text-xs text-gray-500 text-center py-2">
                  暂无请求记录
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="flex-1 bg-blue-500 text-white text-xs py-2 px-3 rounded hover:bg-blue-600"
          >
            导出数据
          </button>
          <button
            onClick={clearMetrics}
            className="flex-1 bg-red-500 text-white text-xs py-2 px-3 rounded hover:bg-red-600"
          >
            清空记录
          </button>
        </div>

        {/* 帮助信息 */}
        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
          <p className="mb-1">💡 <strong>使用提示:</strong></p>
          <ul className="space-y-0.5 text-xs">
            <li>• 绿色指标表示性能良好</li>
            <li>• 黄色指标需要关注</li>
            <li>• 红色指标需要优化</li>
            <li>• 可导出数据进行详细分析</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NetworkPerformancePanel;