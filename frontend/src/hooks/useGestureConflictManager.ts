import { useRef, useCallback, useEffect } from 'react';

export type GestureType = 'swipe' | 'tap' | 'pinch' | 'drag' | 'rotate' | 'longpress' | 'scroll';

export interface GestureContext {
  id: string;
  type: GestureType;
  priority: number;
  startTime: number;
  element?: HTMLElement;
  preventScroll?: boolean;
  exclusiveWith?: GestureType[];
  compatibleWith?: GestureType[];
}

export interface GestureConflictOptions {
  strategy: 'first-wins' | 'priority' | 'hybrid' | 'context-aware';
  defaultPriorities?: Partial<Record<GestureType, number>>;
  conflictResolution?: 'cancel-lower' | 'pause-lower' | 'delegate';
  debugMode?: boolean;
}

const DEFAULT_PRIORITIES: Record<GestureType, number> = {
  pinch: 1,      // 最高优先级，缩放操作
  rotate: 2,     // 旋转操作
  drag: 3,       // 拖拽操作
  swipe: 4,      // 滑动操作
  longpress: 5,  // 长按操作
  tap: 6,        // 点击操作
  scroll: 7,     // 滚动操作（最低优先级）
};

// 兼容的手势组合
const COMPATIBLE_COMBINATIONS: GestureType[][] = [
  ['pinch', 'rotate'],    // 缩放和旋转可以同时进行
  ['drag', 'tap'],        // 拖拽时可以检测tap（用于结束拖拽）
  ['scroll', 'tap'],      // 滚动时可以tap（用于停止滚动）
];

// 互斥的手势组合
const EXCLUSIVE_COMBINATIONS: [GestureType, GestureType[]][] = [
  ['pinch', ['swipe', 'scroll', 'drag']],
  ['rotate', ['swipe', 'scroll', 'drag']],
  ['swipe', ['pinch', 'rotate', 'scroll', 'longpress']],
  ['drag', ['swipe', 'scroll', 'longpress']],
  ['longpress', ['swipe', 'drag', 'scroll']],
];

export class GestureConflictManager {
  private activeGestures = new Map<string, GestureContext>();
  private options: Required<GestureConflictOptions>;
  private listeners = new Set<(gestures: GestureContext[]) => void>();
  
  constructor(options: Partial<GestureConflictOptions> = {}) {
    this.options = {
      strategy: options.strategy || 'hybrid',
      defaultPriorities: { ...DEFAULT_PRIORITIES, ...options.defaultPriorities },
      conflictResolution: options.conflictResolution || 'cancel-lower',
      debugMode: options.debugMode || false,
    };
  }

  private log(...args: any[]) {
    if (this.options.debugMode) {
      console.log('[GestureConflictManager]', ...args);
    }
  }

  private notifyListeners() {
    const gestures = Array.from(this.activeGestures.values());
    this.listeners.forEach(listener => listener(gestures));
  }

  private isCompatible(gestureType: GestureType, activeTypes: GestureType[]): boolean {
    // 检查是否有兼容的组合
    for (const combination of COMPATIBLE_COMBINATIONS) {
      if (combination.includes(gestureType) && 
          activeTypes.every(type => combination.includes(type))) {
        return true;
      }
    }

    // 检查是否有互斥关系
    for (const [exclusive, exclusiveList] of EXCLUSIVE_COMBINATIONS) {
      if (gestureType === exclusive && activeTypes.some(type => exclusiveList.includes(type))) {
        return false;
      }
      if (activeTypes.includes(exclusive) && exclusiveList.includes(gestureType)) {
        return false;
      }
    }

    return activeTypes.length === 0;
  }

  private getGesturePriority(gestureType: GestureType): number {
    return this.options.defaultPriorities[gestureType] || 99;
  }

  private resolveConflict(newGesture: GestureContext, conflictingGestures: GestureContext[]): boolean {
    this.log('Resolving conflict:', newGesture.type, 'vs', conflictingGestures.map(g => g.type));

    switch (this.options.strategy) {
      case 'first-wins':
        return conflictingGestures.length === 0;

      case 'priority':
        const newPriority = newGesture.priority;
        const conflictingPriorities = conflictingGestures.map(g => g.priority);
        const minConflictingPriority = Math.min(...conflictingPriorities);
        
        if (newPriority < minConflictingPriority) {
          // 新手势优先级更高，取消冲突的手势
          conflictingGestures.forEach(gesture => this.cancelGesture(gesture.id));
          return true;
        }
        return false;

      case 'hybrid':
        // 检查是否兼容
        if (this.isCompatible(newGesture.type, conflictingGestures.map(g => g.type))) {
          return true;
        }
        
        // 不兼容时按优先级处理
        const hybridNewPriority = newGesture.priority;
        const hybridConflictingPriorities = conflictingGestures.map(g => g.priority);
        const hybridMinPriority = Math.min(...hybridConflictingPriorities);
        
        if (hybridNewPriority < hybridMinPriority) {
          conflictingGestures.forEach(gesture => this.cancelGesture(gesture.id));
          return true;
        }
        return false;

      case 'context-aware':
        // 基于上下文的智能决策
        return this.contextAwareResolution(newGesture, conflictingGestures);

      default:
        return true;
    }
  }

  private contextAwareResolution(newGesture: GestureContext, conflictingGestures: GestureContext[]): boolean {
    const now = Date.now();
    
    // 如果新手势在相同元素上，优先级更高
    if (newGesture.element) {
      const sameElementGestures = conflictingGestures.filter(
        g => g.element === newGesture.element
      );
      if (sameElementGestures.length > 0) {
        const newPriority = newGesture.priority;
        const sameElementPriorities = sameElementGestures.map(g => g.priority);
        if (newPriority < Math.min(...sameElementPriorities)) {
          sameElementGestures.forEach(g => this.cancelGesture(g.id));
          return true;
        }
      }
    }

    // 如果冲突手势已经持续一段时间，可能需要让位
    const oldGestures = conflictingGestures.filter(g => now - g.startTime > 500);
    if (oldGestures.length > 0 && newGesture.priority <= 3) {
      oldGestures.forEach(g => this.cancelGesture(g.id));
      return true;
    }

    // 特殊情况：scroll手势应该让位给其他手势
    const scrollGestures = conflictingGestures.filter(g => g.type === 'scroll');
    if (scrollGestures.length > 0 && newGesture.type !== 'scroll') {
      scrollGestures.forEach(g => this.cancelGesture(g.id));
      return true;
    }

    // 默认按优先级处理
    const newPriority = newGesture.priority;
    const conflictingPriorities = conflictingGestures.map(g => g.priority);
    const minConflictingPriority = Math.min(...conflictingPriorities);
    
    if (newPriority < minConflictingPriority) {
      conflictingGestures.forEach(gesture => this.cancelGesture(gesture.id));
      return true;
    }
    
    return false;
  }

  public registerGesture(
    id: string,
    type: GestureType,
    options: {
      element?: HTMLElement;
      priority?: number;
      preventScroll?: boolean;
      exclusiveWith?: GestureType[];
      compatibleWith?: GestureType[];
    } = {}
  ): boolean {
    const gesture: GestureContext = {
      id,
      type,
      priority: options.priority || this.getGesturePriority(type),
      startTime: Date.now(),
      element: options.element,
      preventScroll: options.preventScroll,
      exclusiveWith: options.exclusiveWith,
      compatibleWith: options.compatibleWith,
    };

    this.log('Registering gesture:', gesture);

    // 找到冲突的手势
    const activeGestures = Array.from(this.activeGestures.values());
    const conflictingGestures = activeGestures.filter(activeGesture => {
      // 检查自定义互斥关系
      if (gesture.exclusiveWith?.includes(activeGesture.type) ||
          activeGesture.exclusiveWith?.includes(gesture.type)) {
        return true;
      }
      
      // 检查自定义兼容关系
      if (gesture.compatibleWith?.includes(activeGesture.type) ||
          activeGesture.compatibleWith?.includes(gesture.type)) {
        return false;
      }
      
      // 默认兼容性检查
      return !this.isCompatible(gesture.type, [activeGesture.type]);
    });

    if (conflictingGestures.length === 0) {
      // 没有冲突，直接注册
      this.activeGestures.set(id, gesture);
      this.log('Gesture registered successfully:', type);
      this.notifyListeners();
      return true;
    }

    // 解决冲突
    const canRegister = this.resolveConflict(gesture, conflictingGestures);
    
    if (canRegister) {
      this.activeGestures.set(id, gesture);
      this.log('Gesture registered after conflict resolution:', type);
      this.notifyListeners();
      return true;
    } else {
      this.log('Gesture registration rejected due to conflict:', type);
      return false;
    }
  }

  public unregisterGesture(id: string): boolean {
    const gesture = this.activeGestures.get(id);
    if (gesture) {
      this.activeGestures.delete(id);
      this.log('Gesture unregistered:', gesture.type);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public cancelGesture(id: string): boolean {
    const gesture = this.activeGestures.get(id);
    if (gesture) {
      this.activeGestures.delete(id);
      this.log('Gesture cancelled:', gesture.type);
      
      // 触发取消事件（可以通过监听器处理）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gesture-cancelled', { 
          detail: { gestureId: id, gestureType: gesture.type }
        }));
      }
      
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public isGestureActive(id: string): boolean {
    return this.activeGestures.has(id);
  }

  public getActiveGestures(): GestureContext[] {
    return Array.from(this.activeGestures.values());
  }

  public getActiveGestureTypes(): GestureType[] {
    return Array.from(this.activeGestures.values()).map(g => g.type);
  }

  public shouldPreventScroll(): boolean {
    return Array.from(this.activeGestures.values()).some(g => g.preventScroll);
  }

  public canRegisterGesture(type: GestureType, options: { element?: HTMLElement } = {}): boolean {
    const activeTypes = this.getActiveGestureTypes();
    return this.isCompatible(type, activeTypes);
  }

  public addListener(listener: (gestures: GestureContext[]) => void) {
    this.listeners.add(listener);
    // 立即通知当前状态
    listener(this.getActiveGestures());
  }

  public removeListener(listener: (gestures: GestureContext[]) => void) {
    this.listeners.delete(listener);
  }

  public clear() {
    this.activeGestures.clear();
    this.log('All gestures cleared');
    this.notifyListeners();
  }
}

// React Hook
export const useGestureConflictManager = (options: Partial<GestureConflictOptions> = {}) => {
  const managerRef = useRef<GestureConflictManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new GestureConflictManager(options);
  }

  const registerGesture = useCallback((
    id: string,
    type: GestureType,
    options?: Parameters<GestureConflictManager['registerGesture']>[2]
  ) => {
    return managerRef.current?.registerGesture(id, type, options) || false;
  }, []);

  const unregisterGesture = useCallback((id: string) => {
    return managerRef.current?.unregisterGesture(id) || false;
  }, []);

  const cancelGesture = useCallback((id: string) => {
    return managerRef.current?.cancelGesture(id) || false;
  }, []);

  const isGestureActive = useCallback((id: string) => {
    return managerRef.current?.isGestureActive(id) || false;
  }, []);

  const getActiveGestures = useCallback(() => {
    return managerRef.current?.getActiveGestures() || [];
  }, []);

  const getActiveGestureTypes = useCallback(() => {
    return managerRef.current?.getActiveGestureTypes() || [];
  }, []);

  const shouldPreventScroll = useCallback(() => {
    return managerRef.current?.shouldPreventScroll() || false;
  }, []);

  const canRegisterGesture = useCallback((type: GestureType, options?: { element?: HTMLElement }) => {
    return managerRef.current?.canRegisterGesture(type, options) || false;
  }, []);

  const addListener = useCallback((listener: (gestures: GestureContext[]) => void) => {
    managerRef.current?.addListener(listener);
  }, []);

  const removeListener = useCallback((listener: (gestures: GestureContext[]) => void) => {
    managerRef.current?.removeListener(listener);
  }, []);

  const clear = useCallback(() => {
    managerRef.current?.clear();
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      managerRef.current?.clear();
    };
  }, []);

  return {
    registerGesture,
    unregisterGesture,
    cancelGesture,
    isGestureActive,
    getActiveGestures,
    getActiveGestureTypes,
    shouldPreventScroll,
    canRegisterGesture,
    addListener,
    removeListener,
    clear,
    manager: managerRef.current,
  };
};

export default useGestureConflictManager;