/**
 * 手势冲突解决器
 * 处理多个手势处理器之间的冲突，确保手势识别的准确性和流畅性
 */

export interface GestureDescriptor {
  id: string;
  type: 'swipe' | 'tap' | 'longPress' | 'pinch' | 'rotate' | 'drag' | 'pullRefresh';
  priority: number;
  element: HTMLElement;
  zIndex: number;
  isActive: boolean;
  startTime: number;
  touchPoints: number;
  velocity: number;
  distance: number;
}

export interface ConflictResolution {
  winningGesture: string | null;
  suppressedGestures: string[];
  reason: string;
  strategy: ConflictStrategy;
}

export type ConflictStrategy = 
  | 'priority-based'
  | 'element-hierarchy' 
  | 'gesture-specificity'
  | 'temporal-precedence'
  | 'hybrid-resolution';

export interface ConflictResolverConfig {
  defaultStrategy: ConflictStrategy;
  gestureTimeouts: Record<string, number>;
  proximityThreshold: number;
  velocityThreshold: number;
  simultaneousGestureLimit: number;
  enableLogging: boolean;
}

class GestureConflictResolver {
  private activeGestures: Map<string, GestureDescriptor> = new Map();
  private conflictHistory: Array<{
    timestamp: number;
    conflicts: string[];
    resolution: ConflictResolution;
  }> = [];

  private config: ConflictResolverConfig = {
    defaultStrategy: 'hybrid-resolution',
    gestureTimeouts: {
      tap: 300,
      longPress: 500,
      swipe: 200,
      drag: 100,
      pinch: 100,
      rotate: 100,
      pullRefresh: 500,
    },
    proximityThreshold: 50,
    velocityThreshold: 0.3,
    simultaneousGestureLimit: 2,
    enableLogging: false,
  };

  // 手势优先级映射（数字越小优先级越高）
  private readonly gestureBasePriority = {
    pinch: 1,
    rotate: 2,
    drag: 3,
    swipe: 4,
    pullRefresh: 5,
    longPress: 6,
    tap: 7,
  };

  // 兼容的手势组合
  private readonly compatibleGestures = [
    ['pinch', 'rotate'],
    ['drag', 'tap'],
    ['swipe', 'tap'],
  ];

  constructor(config?: Partial<ConflictResolverConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 注册手势
   */
  registerGesture(gesture: Omit<GestureDescriptor, 'isActive' | 'startTime'>): void {
    const fullGesture: GestureDescriptor = {
      ...gesture,
      isActive: false,
      startTime: Date.now(),
    };

    this.activeGestures.set(gesture.id, fullGesture);
    this.log(`Registered gesture: ${gesture.id} (${gesture.type})`);
  }

  /**
   * 注销手势
   */
  unregisterGesture(gestureId: string): void {
    this.activeGestures.delete(gestureId);
    this.log(`Unregistered gesture: ${gestureId}`);
  }

  /**
   * 激活手势
   */
  activateGesture(gestureId: string, touchPoints: number = 1, velocity: number = 0, distance: number = 0): ConflictResolution {
    const gesture = this.activeGestures.get(gestureId);
    if (!gesture) {
      return {
        winningGesture: null,
        suppressedGestures: [],
        reason: 'Gesture not registered',
        strategy: this.config.defaultStrategy,
      };
    }

    // 更新手势状态
    gesture.isActive = true;
    gesture.startTime = Date.now();
    gesture.touchPoints = touchPoints;
    gesture.velocity = velocity;
    gesture.distance = distance;

    // 检查冲突
    const activeGestures = this.getActiveGestures();
    
    if (activeGestures.length <= 1) {
      this.log(`Activated gesture without conflicts: ${gestureId}`);
      return {
        winningGesture: gestureId,
        suppressedGestures: [],
        reason: 'No conflicts detected',
        strategy: this.config.defaultStrategy,
      };
    }

    // 解决冲突
    return this.resolveConflict(activeGestures);
  }

  /**
   * 停用手势
   */
  deactivateGesture(gestureId: string): void {
    const gesture = this.activeGestures.get(gestureId);
    if (gesture) {
      gesture.isActive = false;
      this.log(`Deactivated gesture: ${gestureId}`);
    }
  }

  /**
   * 获取活跃的手势
   */
  getActiveGestures(): GestureDescriptor[] {
    return Array.from(this.activeGestures.values()).filter(g => g.isActive);
  }

  /**
   * 主要的冲突解决方法
   */
  private resolveConflict(conflictingGestures: GestureDescriptor[]): ConflictResolution {
    const now = Date.now();
    const strategy = this.config.defaultStrategy;
    
    let resolution: ConflictResolution;

    switch (strategy) {
      case 'priority-based':
        resolution = this.resolvePriorityBased(conflictingGestures);
        break;
      case 'element-hierarchy':
        resolution = this.resolveElementHierarchy(conflictingGestures);
        break;
      case 'gesture-specificity':
        resolution = this.resolveGestureSpecificity(conflictingGestures);
        break;
      case 'temporal-precedence':
        resolution = this.resolveTemporalPrecedence(conflictingGestures);
        break;
      case 'hybrid-resolution':
        resolution = this.resolveHybrid(conflictingGestures);
        break;
      default:
        resolution = this.resolvePriorityBased(conflictingGestures);
    }

    // 记录冲突历史
    this.conflictHistory.push({
      timestamp: now,
      conflicts: conflictingGestures.map(g => g.id),
      resolution,
    });

    // 限制历史记录长度
    if (this.conflictHistory.length > 100) {
      this.conflictHistory = this.conflictHistory.slice(-50);
    }

    // 停用被抑制的手势
    resolution.suppressedGestures.forEach(id => {
      this.deactivateGesture(id);
    });

    this.log(`Conflict resolved: ${resolution.winningGesture} won over [${resolution.suppressedGestures.join(', ')}]`);
    return resolution;
  }

  /**
   * 基于优先级的冲突解决
   */
  private resolvePriorityBased(gestures: GestureDescriptor[]): ConflictResolution {
    const sortedByPriority = gestures.sort((a, b) => {
      const aPriority = this.gestureBasePriority[a.type] + a.priority;
      const bPriority = this.gestureBasePriority[b.type] + b.priority;
      return aPriority - bPriority;
    });

    const winner = sortedByPriority[0];
    const suppressed = sortedByPriority.slice(1).map(g => g.id);

    return {
      winningGesture: winner.id,
      suppressedGestures: suppressed,
      reason: 'Priority-based resolution',
      strategy: 'priority-based',
    };
  }

  /**
   * 基于元素层次结构的冲突解决
   */
  private resolveElementHierarchy(gestures: GestureDescriptor[]): ConflictResolution {
    const sortedByZIndex = gestures.sort((a, b) => b.zIndex - a.zIndex);
    
    // 如果z-index相同，则使用DOM层次结构
    const winner = sortedByZIndex.reduce((prev, current) => {
      if (prev.zIndex > current.zIndex) return prev;
      if (prev.zIndex < current.zIndex) return current;
      
      // z-index相同时，检查DOM层次
      const prevDepth = this.getDOMDepth(prev.element);
      const currentDepth = this.getDOMDepth(current.element);
      
      return currentDepth >= prevDepth ? current : prev;
    });

    const suppressed = gestures.filter(g => g.id !== winner.id).map(g => g.id);

    return {
      winningGesture: winner.id,
      suppressedGestures: suppressed,
      reason: 'Element hierarchy resolution',
      strategy: 'element-hierarchy',
    };
  }

  /**
   * 基于手势特异性的冲突解决
   */
  private resolveGestureSpecificity(gestures: GestureDescriptor[]): ConflictResolution {
    // 多点触控手势优先于单点手势
    const multiTouchGestures = gestures.filter(g => g.touchPoints > 1);
    const singleTouchGestures = gestures.filter(g => g.touchPoints <= 1);

    if (multiTouchGestures.length > 0) {
      // 优先处理多点手势中触点最多的
      const winner = multiTouchGestures.reduce((prev, current) => 
        current.touchPoints > prev.touchPoints ? current : prev
      );
      
      const suppressed = gestures.filter(g => g.id !== winner.id).map(g => g.id);
      
      return {
        winningGesture: winner.id,
        suppressedGestures: suppressed,
        reason: 'Multi-touch gesture priority',
        strategy: 'gesture-specificity',
      };
    }

    // 单点手势中优先高速度手势
    const highVelocityGesture = singleTouchGestures.find(g => 
      g.velocity > this.config.velocityThreshold
    );

    if (highVelocityGesture) {
      const suppressed = gestures.filter(g => g.id !== highVelocityGesture.id).map(g => g.id);
      
      return {
        winningGesture: highVelocityGesture.id,
        suppressedGestures: suppressed,
        reason: 'High velocity gesture priority',
        strategy: 'gesture-specificity',
      };
    }

    // 回退到优先级解决
    return this.resolvePriorityBased(gestures);
  }

  /**
   * 基于时间优先的冲突解决
   */
  private resolveTemporalPrecedence(gestures: GestureDescriptor[]): ConflictResolution {
    const sortedByTime = gestures.sort((a, b) => a.startTime - b.startTime);
    const winner = sortedByTime[0];
    const suppressed = sortedByTime.slice(1).map(g => g.id);

    return {
      winningGesture: winner.id,
      suppressedGestures: suppressed,
      reason: 'First gesture wins',
      strategy: 'temporal-precedence',
    };
  }

  /**
   * 混合策略冲突解决
   */
  private resolveHybrid(gestures: GestureDescriptor[]): ConflictResolution {
    // 1. 检查兼容性
    const compatibleCombination = this.findCompatibleCombination(gestures);
    if (compatibleCombination.length === gestures.length) {
      return {
        winningGesture: gestures[0].id,
        suppressedGestures: [],
        reason: 'Compatible gesture combination',
        strategy: 'hybrid-resolution',
      };
    }

    // 2. 检查明显的多点手势优先级
    const multiTouchGestures = gestures.filter(g => g.touchPoints > 1);
    if (multiTouchGestures.length === 1 && gestures.length > 1) {
      const winner = multiTouchGestures[0];
      const suppressed = gestures.filter(g => g.id !== winner.id).map(g => g.id);
      
      return {
        winningGesture: winner.id,
        suppressedGestures: suppressed,
        reason: 'Clear multi-touch gesture priority',
        strategy: 'hybrid-resolution',
      };
    }

    // 3. 检查元素层次和优先级的组合
    const highestZIndex = Math.max(...gestures.map(g => g.zIndex));
    const topLevelGestures = gestures.filter(g => g.zIndex === highestZIndex);
    
    if (topLevelGestures.length === 1) {
      const winner = topLevelGestures[0];
      const suppressed = gestures.filter(g => g.id !== winner.id).map(g => g.id);
      
      return {
        winningGesture: winner.id,
        suppressedGestures: suppressed,
        reason: 'Top-level element priority',
        strategy: 'hybrid-resolution',
      };
    }

    // 4. 回退到优先级 + 时间的组合
    const now = Date.now();
    const recentGestures = gestures.filter(g => now - g.startTime < 100);
    
    if (recentGestures.length > 0) {
      return this.resolvePriorityBased(recentGestures);
    }

    return this.resolvePriorityBased(gestures);
  }

  /**
   * 查找兼容的手势组合
   */
  private findCompatibleCombination(gestures: GestureDescriptor[]): GestureDescriptor[] {
    const gestureTypes = gestures.map(g => g.type);
    
    for (const combination of this.compatibleGestures) {
      if (gestureTypes.every(type => combination.includes(type))) {
        return gestures;
      }
    }
    
    return [];
  }

  /**
   * 获取DOM深度
   */
  private getDOMDepth(element: HTMLElement): number {
    let depth = 0;
    let current = element;
    
    while (current.parentElement) {
      depth++;
      current = current.parentElement;
    }
    
    return depth;
  }

  /**
   * 检查手势是否应该被取消
   */
  shouldCancelGesture(gestureId: string): boolean {
    const gesture = this.activeGestures.get(gestureId);
    if (!gesture || !gesture.isActive) return false;

    const now = Date.now();
    const gestureAge = now - gesture.startTime;
    const timeout = this.config.gestureTimeouts[gesture.type];

    // 超时取消
    if (timeout && gestureAge > timeout) {
      this.log(`Gesture ${gestureId} cancelled due to timeout`);
      return true;
    }

    // 检查是否有更高优先级的手势激活
    const activeGestures = this.getActiveGestures();
    const higherPriorityGestures = activeGestures.filter(g => {
      const gPriority = this.gestureBasePriority[g.type] + g.priority;
      const currentPriority = this.gestureBasePriority[gesture.type] + gesture.priority;
      return g.id !== gestureId && gPriority < currentPriority;
    });

    if (higherPriorityGestures.length > 0) {
      this.log(`Gesture ${gestureId} cancelled due to higher priority gesture`);
      return true;
    }

    return false;
  }

  /**
   * 获取冲突统计
   */
  getConflictStatistics(): {
    totalConflicts: number;
    conflictsByStrategy: Record<ConflictStrategy, number>;
    averageResolutionTime: number;
    mostConflictedGestures: Array<{ type: string; count: number }>;
  } {
    const stats = {
      totalConflicts: this.conflictHistory.length,
      conflictsByStrategy: {} as Record<ConflictStrategy, number>,
      averageResolutionTime: 0,
      mostConflictedGestures: [] as Array<{ type: string; count: number }>,
    };

    // 统计按策略分组的冲突
    this.conflictHistory.forEach(conflict => {
      const strategy = conflict.resolution.strategy;
      stats.conflictsByStrategy[strategy] = (stats.conflictsByStrategy[strategy] || 0) + 1;
    });

    // 统计最常冲突的手势类型
    const gestureConflictCount: Record<string, number> = {};
    this.conflictHistory.forEach(conflict => {
      conflict.conflicts.forEach(gestureId => {
        const gesture = this.activeGestures.get(gestureId);
        if (gesture) {
          const type = gesture.type;
          gestureConflictCount[type] = (gestureConflictCount[type] || 0) + 1;
        }
      });
    });

    stats.mostConflictedGestures = Object.entries(gestureConflictCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }

  /**
   * 重置冲突历史
   */
  resetConflictHistory(): void {
    this.conflictHistory = [];
    this.log('Conflict history reset');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ConflictResolverConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('Config updated', config);
  }

  /**
   * 日志记录
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[GestureConflictResolver] ${message}`, data || '');
    }
  }

  /**
   * 销毁解析器
   */
  destroy(): void {
    this.activeGestures.clear();
    this.conflictHistory = [];
    this.log('Gesture conflict resolver destroyed');
  }
}

export default GestureConflictResolver;