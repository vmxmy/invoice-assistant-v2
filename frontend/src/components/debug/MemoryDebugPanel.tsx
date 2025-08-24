import React, { useState, useEffect, useCallback, useRef } from 'react';
import { memoryMonitor } from '../../utils/memoryMonitor';
import { imageCacheManager } from '../../utils/imageCacheManager';
import { invoiceDataCache } from '../../utils/dataCache';
import { getGlobalStateStats, clearAllStates } from '../../hooks/useMemoryOptimizedState';
import useMobileMemoryAdaptation from '../../hooks/useMobileMemoryAdaptation';

/**
 * 内存调试面板组件
 * 提供实时内存监控、分析和清理功能
 */

interface MemorySnapshot {
  timestamp: number;
  memoryUsage: number;
  imageCache: number;
  dataCache: number;
  stateSize: number;
}

interface ComponentStats {
  name: string;
  instances: number;
  memoryEstimate: number;
  lastUpdate: number;
}

const MemoryDebugPanel: React.FC = () => {
  // 状态管理
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cache' | 'leaks' | 'performance'>('overview');
  const [memorySnapshots, setMemorySnapshots] = useState<MemorySnapshot[]>([]);
  const [componentStats, setComponentStats] = useState<ComponentStats[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoCleanup, setAutoCleanup] = useState(false);
  
  // Hooks
  const memoryAdaptation = useMobileMemoryAdaptation();
  
  // 引用
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * 收集内存快照
   */
  const collectMemorySnapshot = useCallback(() => {
    try {
      // @ts-ignore
      const memory = (performance as any).memory;
      const memoryUsage = memory ? memory.usedJSHeapSize / 1024 / 1024 : 0;
      
      const imageStats = imageCacheManager.getStats();
      const dataStats = invoiceDataCache.getStats();
      const stateStats = getGlobalStateStats();
      
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        memoryUsage,
        imageCache: imageStats.totalSize / 1024 / 1024,
        dataCache: dataStats.totalMemoryUsage / 1024 / 1024,
        stateSize: stateStats.totalSize / 1024 / 1024
      };
      
      setMemorySnapshots(prev => {
        const updated = [...prev, snapshot];
        return updated.slice(-50); // 保留最近50个快照
      });
      
      return snapshot;
    } catch (error) {
      console.error('收集内存快照失败:', error);
      return null;
    }
  }, []);

  /**
   * 绘制内存使用图表
   */
  const drawMemoryChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || memorySnapshots.length < 2) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 找到最大值用于缩放
    const maxMemory = Math.max(...memorySnapshots.map(s => s.memoryUsage));
    const timeSpan = memorySnapshots[memorySnapshots.length - 1].timestamp - memorySnapshots[0].timestamp;
    
    // 绘制网格
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // 垂直网格线
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // 绘制内存使用线
    const drawLine = (data: number[], color: string, label: string) => {
      if (data.length < 2) return;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      data.forEach((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - (value / maxMemory) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // 绘制标签
      ctx.fillStyle = color;
      ctx.font = '12px sans-serif';
      ctx.fillText(label, 10, 20 + Object.keys(arguments).indexOf(color) * 20);
    };
    
    // 绘制各种内存使用情况
    drawLine(memorySnapshots.map(s => s.memoryUsage), '#ef4444', '总内存');
    drawLine(memorySnapshots.map(s => s.imageCache), '#3b82f6', '图片缓存');
    drawLine(memorySnapshots.map(s => s.dataCache), '#10b981', '数据缓存');
    drawLine(memorySnapshots.map(s => s.stateSize), '#f59e0b', '状态管理');
  }, [memorySnapshots]);

  /**
   * 检测内存泄漏
   */
  const detectMemoryLeaks = useCallback(() => {
    if (memorySnapshots.length < 10) return null;
    
    const recent = memorySnapshots.slice(-10);
    const growth = recent.map((snapshot, index) => {
      if (index === 0) return 0;
      return snapshot.memoryUsage - recent[index - 1].memoryUsage;
    });
    
    const averageGrowth = growth.reduce((a, b) => a + b, 0) / growth.length;
    const isIncreasing = averageGrowth > 0.1; // 平均增长超过0.1MB
    
    return {
      isLeaking: isIncreasing,
      averageGrowth,
      recommendation: isIncreasing 
        ? '检测到持续内存增长，建议检查组件清理和缓存策略' 
        : '内存使用稳定'
    };
  }, [memorySnapshots]);

  /**
   * 启动监控
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    memoryMonitor.startMonitoring(2000);
    
    monitoringIntervalRef.current = setInterval(() => {
      collectMemorySnapshot();
    }, 1000);
    
    console.log('🔍 内存监控已启动');
  }, [isMonitoring, collectMemorySnapshot]);

  /**
   * 停止监控
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    memoryMonitor.stopMonitoring();
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    
    console.log('🔍 内存监控已停止');
  }, [isMonitoring]);

  /**
   * 执行内存清理
   */
  const performCleanup = useCallback((type: 'images' | 'data' | 'states' | 'all') => {
    switch (type) {
      case 'images':
        imageCacheManager.clear();
        break;
      case 'data':
        invoiceDataCache.clear();
        break;
      case 'states':
        clearAllStates();
        break;
      case 'all':
        imageCacheManager.clear();
        invoiceDataCache.clear();
        clearAllStates();
        
        // 强制垃圾回收
        if ('gc' in window) {
          (window as any).gc();
        }
        break;
    }
    
    // 立即收集快照以显示清理效果
    setTimeout(collectMemorySnapshot, 100);
    
    console.log(`🧹 已执行${type}清理`);
  }, [collectMemorySnapshot]);

  /**
   * 格式化字节数
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * 格式化百分比
   */
  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // 组件挂载时的效果
  useEffect(() => {
    // 监听键盘快捷键
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'M') {
        setIsVisible(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // 绘制图表
  useEffect(() => {
    drawMemoryChart();
  }, [memorySnapshots, drawMemoryChart]);

  // 自动清理逻辑
  useEffect(() => {
    if (!autoCleanup || !isMonitoring) return;
    
    const latest = memorySnapshots[memorySnapshots.length - 1];
    if (latest && latest.memoryUsage > 100) { // 超过100MB时自动清理
      performCleanup('images');
    }
  }, [autoCleanup, isMonitoring, memorySnapshots, performCleanup]);

  // 获取当前统计信息
  const currentStats = {
    memory: memorySnapshots[memorySnapshots.length - 1],
    imageCache: imageCacheManager.getStats(),
    dataCache: invoiceDataCache.getStats(),
    stateStats: getGlobalStateStats(),
    leakDetection: detectMemoryLeaks()
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        title="打开内存调试面板 (Ctrl+Shift+M)"
      >
        🧠
      </button>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">内存调试面板</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`px-3 py-1 rounded text-sm font-medium ${
                isMonitoring 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isMonitoring ? '停止监控' : '开始监控'}
            </button>
            <label className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={autoCleanup}
                onChange={(e) => setAutoCleanup(e.target.checked)}
                className="rounded"
              />
              <span>自动清理</span>
            </label>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'overview', label: '概览' },
          { key: 'cache', label: '缓存' },
          { key: 'leaks', label: '泄漏检测' },
          { key: 'performance', label: '性能' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 p-4 overflow-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 实时统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600">总内存使用</div>
                <div className="text-lg font-semibold text-blue-900">
                  {currentStats.memory ? `${currentStats.memory.memoryUsage.toFixed(2)} MB` : 'N/A'}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600">图片缓存</div>
                <div className="text-lg font-semibold text-green-900">
                  {formatBytes(currentStats.imageCache.totalSize)}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600">数据缓存</div>
                <div className="text-lg font-semibold text-purple-900">
                  {formatBytes(currentStats.dataCache.totalMemoryUsage)}
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600">状态大小</div>
                <div className="text-lg font-semibold text-orange-900">
                  {formatBytes(currentStats.stateStats.totalSize)}
                </div>
              </div>
            </div>

            {/* 内存使用图表 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-2">内存使用趋势</h3>
              <canvas
                ref={canvasRef}
                width={800}
                height={300}
                className="w-full h-auto border border-gray-200 rounded"
              />
            </div>

            {/* 设备信息 */}
            {memoryAdaptation.deviceInfo && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-2">设备信息</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">总内存: </span>
                    <span className="font-medium">{memoryAdaptation.deviceInfo.totalMemory}GB</span>
                  </div>
                  <div>
                    <span className="text-gray-600">设备类型: </span>
                    <span className={`font-medium ${
                      memoryAdaptation.deviceInfo.deviceCategory === 'low-end' ? 'text-red-600' : 
                      memoryAdaptation.deviceInfo.deviceCategory === 'high-end' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {memoryAdaptation.deviceInfo.deviceCategory}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">当前模式: </span>
                    <span className={`font-medium ${
                      memoryAdaptation.currentMode.mode === 'critical-memory' ? 'text-red-600' : 
                      memoryAdaptation.currentMode.mode === 'low-memory' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {memoryAdaptation.currentMode.mode}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">内存压力: </span>
                    <span className="font-medium">
                      {memoryAdaptation.adaptationStats.memoryPressureLevel.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cache' && (
          <div className="space-y-4">
            {/* 缓存操作 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => performCleanup('images')}
                className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                清理图片缓存
              </button>
              <button
                onClick={() => performCleanup('data')}
                className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              >
                清理数据缓存
              </button>
              <button
                onClick={() => performCleanup('states')}
                className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors"
              >
                清理状态存储
              </button>
              <button
                onClick={() => performCleanup('all')}
                className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
              >
                全部清理
              </button>
            </div>

            {/* 缓存详情 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 图片缓存详情 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-2">图片缓存</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>图片数量:</span>
                    <span className="font-medium">{currentStats.imageCache.totalImages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>缓存大小:</span>
                    <span className="font-medium">{formatBytes(currentStats.imageCache.totalSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>命中率:</span>
                    <span className="font-medium">{formatPercent(currentStats.imageCache.hitRate / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>压缩率:</span>
                    <span className="font-medium">{formatPercent(currentStats.imageCache.compressionSavings)}</span>
                  </div>
                </div>
              </div>

              {/* 数据缓存详情 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-2">数据缓存</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>页面数量:</span>
                    <span className="font-medium">{currentStats.dataCache.totalPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>缓存大小:</span>
                    <span className="font-medium">{formatBytes(currentStats.dataCache.totalMemoryUsage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>命中率:</span>
                    <span className="font-medium">{formatPercent(currentStats.dataCache.hitRate / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>驱逐次数:</span>
                    <span className="font-medium">{currentStats.dataCache.evictionCount}</span>
                  </div>
                </div>
              </div>

              {/* 状态存储详情 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-2">状态存储</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>状态数量:</span>
                    <span className="font-medium">{currentStats.stateStats.itemCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>存储大小:</span>
                    <span className="font-medium">{formatBytes(currentStats.stateStats.totalSize)}</span>
                  </div>
                </div>
                
                {/* 状态列表 */}
                <div className="mt-3 max-h-32 overflow-y-auto">
                  {currentStats.stateStats.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs py-1">
                      <span className="truncate mr-2">{item.key}</span>
                      <span>{formatBytes(item.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaks' && (
          <div className="space-y-4">
            {/* 泄漏检测结果 */}
            {currentStats.leakDetection && (
              <div className={`p-4 rounded-lg ${
                currentStats.leakDetection.isLeaking ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <h3 className={`text-md font-medium mb-2 ${
                  currentStats.leakDetection.isLeaking ? 'text-red-900' : 'text-green-900'
                }`}>
                  内存泄漏检测
                </h3>
                <p className={`text-sm ${
                  currentStats.leakDetection.isLeaking ? 'text-red-700' : 'text-green-700'
                }`}>
                  {currentStats.leakDetection.recommendation}
                </p>
                {currentStats.leakDetection.isLeaking && (
                  <div className="mt-2 text-sm text-red-600">
                    平均增长率: {currentStats.leakDetection.averageGrowth.toFixed(2)} MB/分钟
                  </div>
                )}
              </div>
            )}

            {/* 内存增长分析 */}
            {memorySnapshots.length > 5 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-2">内存增长分析</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">过去5分钟增长: </span>
                    <span className="font-medium">
                      {(() => {
                        const recent = memorySnapshots.slice(-5);
                        const growth = recent[recent.length - 1].memoryUsage - recent[0].memoryUsage;
                        return growth > 0 ? `+${growth.toFixed(2)} MB` : `${growth.toFixed(2)} MB`;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">最大内存使用: </span>
                    <span className="font-medium">
                      {Math.max(...memorySnapshots.map(s => s.memoryUsage)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 优化建议 */}
            {memoryAdaptation.suggestions.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-blue-900 mb-2">优化建议</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  {memoryAdaptation.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            {/* 性能指标 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">平均加载时间</div>
                <div className="text-lg font-semibold text-gray-900">
                  {memoryAdaptation.adaptationStats.performanceImpact.loadTime.toFixed(2)} ms
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">渲染时间</div>
                <div className="text-lg font-semibold text-gray-900">
                  {memoryAdaptation.adaptationStats.performanceImpact.renderTime.toFixed(2)} ms
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">交互延迟</div>
                <div className="text-lg font-semibold text-gray-900">
                  {memoryAdaptation.adaptationStats.performanceImpact.interactionDelay.toFixed(2)} ms
                </div>
              </div>
            </div>

            {/* 已激活的适配 */}
            {memoryAdaptation.adaptationStats.activatedAdaptations.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-yellow-900 mb-2">已激活的内存适配</h3>
                <div className="flex flex-wrap gap-2">
                  {memoryAdaptation.adaptationStats.activatedAdaptations.map((adaptation, index) => (
                    <span key={index} className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                      {adaptation}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 紧急操作 */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-md font-medium text-red-900 mb-2">紧急操作</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={memoryAdaptation.performEmergencyCleanup}
                  className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                >
                  紧急内存清理
                </button>
                <button
                  onClick={() => {
                    if ('gc' in window) {
                      (window as any).gc();
                      console.log('🗑️ 强制垃圾回收');
                    } else {
                      console.warn('当前环境不支持手动垃圾回收');
                    }
                  }}
                  className="px-3 py-2 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors"
                >
                  强制垃圾回收
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 快捷键提示 */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
        快捷键: Ctrl+Shift+M 开关面板 | 数据每秒更新
      </div>
    </div>
  );
};

export default MemoryDebugPanel;