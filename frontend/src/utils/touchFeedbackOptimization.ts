/**
 * 触摸反馈性能优化工具
 * 提供性能监控、内存管理和自适应优化功能
 */

// 性能指标接口
interface PerformanceMetrics {
  /** 平均帧率 */
  averageFPS: number;
  /** 内存使用量(MB) */
  memoryUsage: number;
  /** 活跃的涟漪数量 */
  activeRipples: number;
  /** 活跃的长按检测数量 */
  activeLongPresses: number;
  /** 触觉反馈触发频率(次/秒) */
  hapticTriggerRate: number;
  /** 最后更新时间 */
  lastUpdate: number;
}

// 性能等级枚举
enum PerformanceLevel {
  HIGH = 'high',
  MEDIUM = 'medium', 
  LOW = 'low',
  CRITICAL = 'critical',
}

// 优化建议接口
interface OptimizationRecommendation {
  /** 建议类型 */
  type: 'disable' | 'reduce' | 'throttle' | 'simplify';
  /** 影响组件 */
  target: 'ripple' | 'longpress' | 'haptic' | 'all';
  /** 建议描述 */
  description: string;
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high';
  /** 是否自动应用 */
  autoApply: boolean;
}

// 设备性能分类
interface DevicePerformance {
  /** 设备等级 */
  level: PerformanceLevel;
  /** CPU 核心数 */
  cpuCores: number;
  /** 可用内存估计(MB) */
  estimatedRAM: number;
  /** 是否支持硬件加速 */
  hardwareAcceleration: boolean;
  /** 是否为移动设备 */
  isMobile: boolean;
}

class TouchFeedbackOptimizer {
  private static instance: TouchFeedbackOptimizer | null = null;
  private metrics: PerformanceMetrics;
  private devicePerformance: DevicePerformance;
  private frameTimeHistory: number[] = [];
  private lastFrameTime = 0;
  private rafId: number | null = null;
  private isMonitoring = false;
  
  // 统计数据
  private stats = {
    rippleCount: 0,
    longPressCount: 0,
    hapticTriggerCount: 0,
    lastHapticTime: 0,
  };

  private constructor() {
    this.devicePerformance = this.detectDevicePerformance();
    this.metrics = this.initializeMetrics();
    this.startPerformanceMonitoring();
  }

  static getInstance(): TouchFeedbackOptimizer {
    if (!this.instance) {
      this.instance = new TouchFeedbackOptimizer();
    }
    return this.instance;
  }

  // 检测设备性能
  private detectDevicePerformance(): DevicePerformance {
    const nav = navigator as any;
    
    // 检测CPU核心数
    const cpuCores = nav.hardwareConcurrency || 4;
    
    // 检测内存（如果支持）
    const memoryInfo = (performance as any).memory;
    let estimatedRAM = 2048; // 默认2GB
    
    if (memoryInfo) {
      // JSHeapSizeLimit 通常是可用内存的一部分
      estimatedRAM = Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024));
    }

    // 检测硬件加速支持
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const hardwareAcceleration = !!gl;

    // 检测移动设备
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 综合评估性能等级
    let level = PerformanceLevel.MEDIUM;
    
    if (isMobile) {
      if (cpuCores >= 8 && estimatedRAM >= 4096) {
        level = PerformanceLevel.HIGH;
      } else if (cpuCores >= 4 && estimatedRAM >= 2048) {
        level = PerformanceLevel.MEDIUM;
      } else {
        level = PerformanceLevel.LOW;
      }
    } else {
      if (cpuCores >= 8 && estimatedRAM >= 8192 && hardwareAcceleration) {
        level = PerformanceLevel.HIGH;
      } else if (cpuCores >= 4 && estimatedRAM >= 4096) {
        level = PerformanceLevel.MEDIUM;
      } else {
        level = PerformanceLevel.LOW;
      }
    }

    return {
      level,
      cpuCores,
      estimatedRAM,
      hardwareAcceleration,
      isMobile,
    };
  }

  // 初始化性能指标
  private initializeMetrics(): PerformanceMetrics {
    return {
      averageFPS: 60,
      memoryUsage: 0,
      activeRipples: 0,
      activeLongPresses: 0,
      hapticTriggerRate: 0,
      lastUpdate: performance.now(),
    };
  }

  // 开始性能监控
  private startPerformanceMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorFrameRate();
    
    // 定期更新指标
    setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }

  // 监控帧率
  private monitorFrameRate(): void {
    const measureFrame = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const deltaTime = timestamp - this.lastFrameTime;
        this.frameTimeHistory.push(deltaTime);
        
        // 保持最近60帧的历史
        if (this.frameTimeHistory.length > 60) {
          this.frameTimeHistory.shift();
        }
      }
      
      this.lastFrameTime = timestamp;
      
      if (this.isMonitoring) {
        this.rafId = requestAnimationFrame(measureFrame);
      }
    };
    
    this.rafId = requestAnimationFrame(measureFrame);
  }

  // 更新性能指标
  private updateMetrics(): void {
    const now = performance.now();
    
    // 计算平均帧率
    if (this.frameTimeHistory.length > 0) {
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.metrics.averageFPS = Math.round(1000 / avgFrameTime);
    }

    // 更新内存使用量
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      this.metrics.memoryUsage = Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024));
    }

    // 计算触觉反馈触发频率
    const timeDiff = now - this.metrics.lastUpdate;
    if (timeDiff > 0) {
      this.metrics.hapticTriggerRate = (this.stats.hapticTriggerCount * 1000) / timeDiff;
    }

    this.metrics.lastUpdate = now;
    
    // 重置计数器
    this.stats.hapticTriggerCount = 0;
  }

  // 注册涟漪创建
  registerRipple(): void {
    this.stats.rippleCount++;
    this.metrics.activeRipples++;
  }

  // 注册涟漪销毁
  unregisterRipple(): void {
    this.metrics.activeRipples = Math.max(0, this.metrics.activeRipples - 1);
  }

  // 注册长按开始
  registerLongPress(): void {
    this.stats.longPressCount++;
    this.metrics.activeLongPresses++;
  }

  // 注册长按结束
  unregisterLongPress(): void {
    this.metrics.activeLongPresses = Math.max(0, this.metrics.activeLongPresses - 1);
  }

  // 注册触觉反馈触发
  registerHapticTrigger(): void {
    this.stats.hapticTriggerCount++;
    this.stats.lastHapticTime = performance.now();
  }

  // 获取当前性能指标
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // 获取设备性能信息
  getDevicePerformance(): DevicePerformance {
    return { ...this.devicePerformance };
  }

  // 分析性能并提供建议
  analyzePerformance(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // 帧率过低
    if (this.metrics.averageFPS < 30) {
      recommendations.push({
        type: 'disable',
        target: 'ripple',
        description: '帧率过低，建议禁用涟漪效果以提升性能',
        severity: 'high',
        autoApply: true,
      });
    } else if (this.metrics.averageFPS < 45) {
      recommendations.push({
        type: 'simplify',
        target: 'ripple',
        description: '帧率较低，建议简化涟漪动画',
        severity: 'medium',
        autoApply: true,
      });
    }

    // 内存使用过高
    if (this.metrics.memoryUsage > this.devicePerformance.estimatedRAM * 0.8) {
      recommendations.push({
        type: 'reduce',
        target: 'all',
        description: '内存使用过高，建议减少触摸反馈功能',
        severity: 'high',
        autoApply: true,
      });
    }

    // 活跃涟漪过多
    if (this.metrics.activeRipples > 10) {
      recommendations.push({
        type: 'throttle',
        target: 'ripple',
        description: '同时活跃的涟漪过多，建议限制创建频率',
        severity: 'medium',
        autoApply: true,
      });
    }

    // 触觉反馈频率过高
    if (this.metrics.hapticTriggerRate > 10) {
      recommendations.push({
        type: 'throttle',
        target: 'haptic',
        description: '触觉反馈触发过于频繁，建议增加节流间隔',
        severity: 'medium',
        autoApply: true,
      });
    }

    // 长按检测过多
    if (this.metrics.activeLongPresses > 5) {
      recommendations.push({
        type: 'reduce',
        target: 'longpress',
        description: '同时进行的长按检测过多，可能影响性能',
        severity: 'low',
        autoApply: false,
      });
    }

    return recommendations;
  }

  // 获取推荐的配置
  getRecommendedConfig(): {
    ripple: {
      enabled: boolean;
      maxActive: number;
      duration: number;
      throttle: number;
    };
    longPress: {
      enabled: boolean;
      maxActive: number;
      threshold: number;
    };
    haptic: {
      enabled: boolean;
      throttle: number;
      intensity: number;
    };
  } {
    const level = this.devicePerformance.level;
    
    const configs = {
      [PerformanceLevel.HIGH]: {
        ripple: { enabled: true, maxActive: 20, duration: 600, throttle: 0 },
        longPress: { enabled: true, maxActive: 10, threshold: 500 },
        haptic: { enabled: true, throttle: 30, intensity: 1.0 },
      },
      [PerformanceLevel.MEDIUM]: {
        ripple: { enabled: true, maxActive: 10, duration: 400, throttle: 50 },
        longPress: { enabled: true, maxActive: 5, threshold: 600 },
        haptic: { enabled: true, throttle: 50, intensity: 0.8 },
      },
      [PerformanceLevel.LOW]: {
        ripple: { enabled: true, maxActive: 5, duration: 300, throttle: 100 },
        longPress: { enabled: true, maxActive: 3, threshold: 700 },
        haptic: { enabled: true, throttle: 100, intensity: 0.6 },
      },
      [PerformanceLevel.CRITICAL]: {
        ripple: { enabled: false, maxActive: 0, duration: 0, throttle: 200 },
        longPress: { enabled: false, maxActive: 0, threshold: 1000 },
        haptic: { enabled: false, throttle: 200, intensity: 0.4 },
      },
    };

    return configs[level];
  }

  // 自动优化
  autoOptimize(): boolean {
    const recommendations = this.analyzePerformance();
    const autoRecommendations = recommendations.filter(r => r.autoApply);
    
    if (autoRecommendations.length === 0) {
      return false;
    }

    // 应用优化建议
    autoRecommendations.forEach(rec => {
      console.log(`自动优化: ${rec.description}`);
      
      // 这里可以通知相关组件应用优化
      document.dispatchEvent(new CustomEvent('touchFeedbackOptimize', {
        detail: {
          type: rec.type,
          target: rec.target,
          recommendation: rec,
        },
      }));
    });

    return true;
  }

  // 生成性能报告
  generatePerformanceReport(): string {
    const metrics = this.getMetrics();
    const device = this.getDevicePerformance();
    const recommendations = this.analyzePerformance();
    
    const report = `
触摸反馈性能报告
================

设备信息:
- 性能等级: ${device.level}
- CPU核心数: ${device.cpuCores}
- 预估内存: ${device.estimatedRAM}MB
- 硬件加速: ${device.hardwareAcceleration ? '支持' : '不支持'}
- 设备类型: ${device.isMobile ? '移动设备' : '桌面设备'}

当前指标:
- 平均帧率: ${metrics.averageFPS} FPS
- 内存使用: ${metrics.memoryUsage}MB
- 活跃涟漪: ${metrics.activeRipples}
- 活跃长按: ${metrics.activeLongPresses}
- 触觉频率: ${metrics.hapticTriggerRate.toFixed(2)}/秒

优化建议:
${recommendations.length === 0 
  ? '- 性能良好，无需优化' 
  : recommendations.map(r => `- [${r.severity}] ${r.description}`).join('\n')
}

统计数据:
- 总涟漪数: ${this.stats.rippleCount}
- 总长按数: ${this.stats.longPressCount}
- 触觉触发: ${this.stats.hapticTriggerCount}
    `;

    return report.trim();
  }

  // 停止监控
  stop(): void {
    this.isMonitoring = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // 重置统计
  resetStats(): void {
    this.stats = {
      rippleCount: 0,
      longPressCount: 0,
      hapticTriggerCount: 0,
      lastHapticTime: 0,
    };
    this.frameTimeHistory = [];
  }
}

// 导出单例实例
export const touchFeedbackOptimizer = TouchFeedbackOptimizer.getInstance();

// 便捷函数
export const registerRipple = () => touchFeedbackOptimizer.registerRipple();
export const unregisterRipple = () => touchFeedbackOptimizer.unregisterRipple();
export const registerLongPress = () => touchFeedbackOptimizer.registerLongPress();
export const unregisterLongPress = () => touchFeedbackOptimizer.unregisterLongPress();
export const registerHapticTrigger = () => touchFeedbackOptimizer.registerHapticTrigger();

// 性能监控钩子
export const usePerformanceMonitoring = () => {
  const getMetrics = () => touchFeedbackOptimizer.getMetrics();
  const getDevicePerformance = () => touchFeedbackOptimizer.getDevicePerformance();
  const getRecommendations = () => touchFeedbackOptimizer.analyzePerformance();
  const autoOptimize = () => touchFeedbackOptimizer.autoOptimize();
  const generateReport = () => touchFeedbackOptimizer.generatePerformanceReport();
  
  return {
    getMetrics,
    getDevicePerformance,
    getRecommendations,
    autoOptimize,
    generateReport,
  };
};

export { PerformanceLevel, type PerformanceMetrics, type OptimizationRecommendation, type DevicePerformance };
export default TouchFeedbackOptimizer;