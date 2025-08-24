/**
 * 统一手势操作系统管理器
 * 提供完整的手势识别、冲突解决、性能优化和无障碍支持
 */

export interface GestureEvent {
  type: 'swipe' | 'tap' | 'longPress' | 'pinch' | 'rotate' | 'drag' | 'pullRefresh';
  position: { x: number; y: number };
  delta?: { x: number; y: number };
  scale?: number;
  rotation?: number;
  velocity?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  timeStamp: number;
  target: EventTarget;
}

export interface GestureConfig {
  // 基础手势配置
  swipeThreshold: number;
  tapThreshold: number;
  longPressDelay: number;
  doubleTapTimeout: number;
  
  // 缩放配置
  pinchThreshold: number;
  minScale: number;
  maxScale: number;
  scaleStep: number;
  
  // 旋转配置
  rotationThreshold: number;
  
  // 拖拽配置
  dragThreshold: number;
  dragMomentum: boolean;
  
  // 下拉刷新配置
  pullRefreshThreshold: number;
  pullRefreshMaxDistance: number;
  
  // 性能配置
  throttleInterval: number;
  enableRAF: boolean;
  enableHaptics: boolean;
  hapticIntensity: 'light' | 'medium' | 'heavy';
  
  // 冲突解决
  conflictStrategy: 'priority' | 'hybrid' | 'first-wins';
  gesturePriority: string[];
  
  // 无障碍支持
  enableAccessibility: boolean;
  announceGestures: boolean;
  enableHighContrast: boolean;
}

export interface GestureHandler {
  id: string;
  element: HTMLElement;
  handlers: Partial<{
    onSwipeLeft: (event: GestureEvent) => void;
    onSwipeRight: (event: GestureEvent) => void;
    onSwipeUp: (event: GestureEvent) => void;
    onSwipeDown: (event: GestureEvent) => void;
    onTap: (event: GestureEvent) => void;
    onDoubleTap: (event: GestureEvent) => void;
    onLongPress: (event: GestureEvent) => void;
    onPinchStart: (event: GestureEvent) => void;
    onPinch: (event: GestureEvent) => void;
    onPinchEnd: (event: GestureEvent) => void;
    onRotateStart: (event: GestureEvent) => void;
    onRotate: (event: GestureEvent) => void;
    onRotateEnd: (event: GestureEvent) => void;
    onDragStart: (event: GestureEvent) => void;
    onDrag: (event: GestureEvent) => void;
    onDragEnd: (event: GestureEvent) => void;
    onPullRefreshStart: (event: GestureEvent) => void;
    onPullRefresh: (event: GestureEvent) => void;
    onPullRefreshEnd: (event: GestureEvent) => void;
  }>;
  config?: Partial<GestureConfig>;
  enabled: boolean;
  zIndex: number;
}

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  timeStamp: number;
  element: HTMLElement;
}

export interface GestureState {
  activeGestures: Set<string>;
  touches: Map<number, TouchPoint>;
  lastTapTime: number;
  lastTapPosition: { x: number; y: number };
  currentScale: number;
  currentRotation: number;
  initialDistance: number;
  initialAngle: number;
  dragStartPosition: { x: number; y: number } | null;
  pullRefreshStartY: number | null;
  velocityHistory: Array<{ x: number; y: number; timeStamp: number }>;
}

class GestureSystemManager {
  private handlers: Map<string, GestureHandler> = new Map();
  private state: GestureState = {
    activeGestures: new Set(),
    touches: new Map(),
    lastTapTime: 0,
    lastTapPosition: { x: 0, y: 0 },
    currentScale: 1,
    currentRotation: 0,
    initialDistance: 0,
    initialAngle: 0,
    dragStartPosition: null,
    pullRefreshStartY: null,
    velocityHistory: [],
  };

  private defaultConfig: GestureConfig = {
    swipeThreshold: 50,
    tapThreshold: 10,
    longPressDelay: 500,
    doubleTapTimeout: 300,
    pinchThreshold: 10,
    minScale: 0.5,
    maxScale: 3.0,
    scaleStep: 0.1,
    rotationThreshold: 15,
    dragThreshold: 5,
    dragMomentum: true,
    pullRefreshThreshold: 80,
    pullRefreshMaxDistance: 120,
    throttleInterval: 16,
    enableRAF: true,
    enableHaptics: true,
    hapticIntensity: 'light',
    conflictStrategy: 'priority',
    gesturePriority: ['pinch', 'rotate', 'drag', 'swipe', 'tap', 'pullRefresh'],
    enableAccessibility: true,
    announceGestures: false,
    enableHighContrast: false,
  };

  private rafId: number | null = null;
  private longPressTimer: NodeJS.Timeout | null = null;
  private throttleTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupGlobalListeners();
  }

  /**
   * 注册手势处理器
   */
  register(handler: GestureHandler): void {
    this.handlers.set(handler.id, handler);
    this.setupElementListeners(handler.element, handler.id);
  }

  /**
   * 注销手势处理器
   */
  unregister(id: string): void {
    const handler = this.handlers.get(id);
    if (handler) {
      this.removeElementListeners(handler.element);
      this.handlers.delete(id);
    }
  }

  /**
   * 更新手势处理器配置
   */
  updateConfig(id: string, config: Partial<GestureConfig>): void {
    const handler = this.handlers.get(id);
    if (handler) {
      handler.config = { ...handler.config, ...config };
    }
  }

  /**
   * 启用/禁用手势处理器
   */
  setEnabled(id: string, enabled: boolean): void {
    const handler = this.handlers.get(id);
    if (handler) {
      handler.enabled = enabled;
    }
  }

  /**
   * 获取当前手势状态
   */
  getState(): Readonly<GestureState> {
    return this.state;
  }

  /**
   * 触发触觉反馈
   */
  triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this.defaultConfig.enableHaptics) return;

    try {
      if ('vibrate' in navigator) {
        const durations = { light: 10, medium: 25, heavy: 50 };
        navigator.vibrate(durations[intensity]);
      }

      // iOS 触觉反馈支持
      if ('hapticFeedback' in window) {
        const impact = (window as any).hapticFeedback?.impactOccurred;
        if (impact) {
          const intensities = { light: 0, medium: 1, heavy: 2 };
          impact(intensities[intensity]);
        }
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * 无障碍手势播报
   */
  announceGesture(gestureType: string, details?: string): void {
    if (!this.defaultConfig.enableAccessibility || !this.defaultConfig.announceGestures) {
      return;
    }

    try {
      const message = details ? `${gestureType}: ${details}` : gestureType;
      
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (error) {
      console.warn('Accessibility announcement failed:', error);
    }
  }

  private setupGlobalListeners(): void {
    // 防止默认触摸行为
    document.addEventListener('touchstart', this.handleGlobalTouchStart.bind(this), {
      passive: false,
    });
    
    document.addEventListener('touchmove', this.handleGlobalTouchMove.bind(this), {
      passive: false,
    });
    
    document.addEventListener('touchend', this.handleGlobalTouchEnd.bind(this), {
      passive: false,
    });
    
    document.addEventListener('touchcancel', this.handleGlobalTouchCancel.bind(this), {
      passive: false,
    });
  }

  private setupElementListeners(element: HTMLElement, handlerId: string): void {
    const handler = (event: TouchEvent) => {
      event.stopPropagation();
      (event as any)._handlerId = handlerId;
    };

    element.addEventListener('touchstart', handler, { passive: false });
    element.addEventListener('touchmove', handler, { passive: false });
    element.addEventListener('touchend', handler, { passive: false });
    element.addEventListener('touchcancel', handler, { passive: false });
  }

  private removeElementListeners(element: HTMLElement): void {
    const events = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
    events.forEach(event => {
      element.removeEventListener(event, () => {});
    });
  }

  private handleGlobalTouchStart(event: TouchEvent): void {
    const handlerId = (event as any)._handlerId;
    if (!handlerId) return;

    const handler = this.handlers.get(handlerId);
    if (!handler || !handler.enabled) return;

    const config = { ...this.defaultConfig, ...handler.config };
    const now = Date.now();

    // 更新触摸点状态
    Array.from(event.touches).forEach(touch => {
      this.state.touches.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        timeStamp: now,
        element: event.target as HTMLElement,
      });
    });

    // 重置手势状态
    this.state.velocityHistory = [];
    
    // 处理单点触摸
    if (event.touches.length === 1) {
      const touch = this.state.touches.get(event.touches[0].identifier);
      if (!touch) return;

      // 长按检测
      if (handler.handlers.onLongPress) {
        this.longPressTimer = setTimeout(() => {
          this.dispatchGestureEvent(handler, 'longPress', {
            position: { x: touch.x, y: touch.y },
          });
          this.triggerHapticFeedback('medium');
          this.announceGesture('Long press detected');
        }, config.longPressDelay);
      }

      // 下拉刷新检测
      if (handler.handlers.onPullRefreshStart && this.isAtTop(event.target as HTMLElement)) {
        this.state.pullRefreshStartY = touch.y;
      }
    }

    // 处理双点触摸（缩放/旋转）
    if (event.touches.length === 2) {
      const touches = Array.from(this.state.touches.values());
      if (touches.length >= 2) {
        const [touch1, touch2] = touches;
        this.state.initialDistance = this.getDistance(touch1, touch2);
        this.state.initialAngle = this.getAngle(touch1, touch2);
        this.state.currentScale = 1;
        this.state.currentRotation = 0;

        if (handler.handlers.onPinchStart) {
          const center = this.getCenter([touch1, touch2]);
          this.dispatchGestureEvent(handler, 'pinch', {
            position: center,
            scale: 1,
          });
        }
      }
    }
  }

  private handleGlobalTouchMove(event: TouchEvent): void {
    const handlerId = (event as any)._handlerId;
    if (!handlerId) return;

    const handler = this.handlers.get(handlerId);
    if (!handler || !handler.enabled) return;

    const config = { ...this.defaultConfig, ...handler.config };
    const now = Date.now();

    // 清除长按定时器
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // 更新触摸点
    Array.from(event.touches).forEach(touch => {
      const existingTouch = this.state.touches.get(touch.identifier);
      if (existingTouch) {
        this.state.touches.set(touch.identifier, {
          ...existingTouch,
          x: touch.clientX,
          y: touch.clientY,
          timeStamp: now,
        });
      }
    });

    // 节流处理
    this.throttleEvent(() => {
      const touches = Array.from(this.state.touches.values());
      
      if (touches.length === 1) {
        this.handleSingleTouchMove(handler, touches[0], config);
      } else if (touches.length === 2) {
        this.handleMultiTouchMove(handler, touches, config);
      }

      // 更新速度历史
      this.updateVelocityHistory(touches, now);
    }, config.throttleInterval);

    // 阻止默认滚动行为（当手势活跃时）
    if (this.state.activeGestures.size > 0) {
      event.preventDefault();
    }
  }

  private handleGlobalTouchEnd(event: TouchEvent): void {
    const handlerId = (event as any)._handlerId;
    if (!handlerId) return;

    const handler = this.handlers.get(handlerId);
    if (!handler || !handler.enabled) return;

    const config = { ...this.defaultConfig, ...handler.config };
    const now = Date.now();

    // 清除定时器
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // 获取已结束的触摸点
    const remainingTouches = Array.from(event.touches);
    const endedTouches = Array.from(this.state.touches.values()).filter(
      touch => !remainingTouches.some(t => t.identifier === touch.id)
    );

    // 处理手势结束
    if (remainingTouches.length === 0) {
      this.handleGestureEnd(handler, endedTouches, config, now);
    }

    // 移除已结束的触摸点
    endedTouches.forEach(touch => {
      this.state.touches.delete(touch.id);
    });

    // 重置状态（如果没有剩余触摸）
    if (remainingTouches.length === 0) {
      this.resetGestureState();
    }
  }

  private handleGlobalTouchCancel(event: TouchEvent): void {
    this.clearAllTimers();
    this.resetGestureState();
  }

  private handleSingleTouchMove(handler: GestureHandler, touch: TouchPoint, config: GestureConfig): void {
    const deltaX = touch.x - touch.startX;
    const deltaY = touch.y - touch.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 拖拽检测
    if (distance > config.dragThreshold && handler.handlers.onDrag) {
      if (this.canActivateGesture('drag', config)) {
        this.state.activeGestures.add('drag');
        
        if (!this.state.dragStartPosition) {
          this.state.dragStartPosition = { x: touch.startX, y: touch.startY };
          handler.handlers.onDragStart?.({
            type: 'drag',
            position: { x: touch.x, y: touch.y },
            timeStamp: touch.timeStamp,
            target: touch.element,
          });
        }

        handler.handlers.onDrag({
          type: 'drag',
          position: { x: touch.x, y: touch.y },
          delta: { x: deltaX, y: deltaY },
          timeStamp: touch.timeStamp,
          target: touch.element,
        });
      }
    }

    // 下拉刷新检测
    if (this.state.pullRefreshStartY !== null && handler.handlers.onPullRefresh) {
      const pullDistance = touch.y - this.state.pullRefreshStartY;
      
      if (pullDistance > 0 && pullDistance <= config.pullRefreshMaxDistance) {
        handler.handlers.onPullRefresh({
          type: 'pullRefresh',
          position: { x: touch.x, y: touch.y },
          distance: pullDistance,
          timeStamp: touch.timeStamp,
          target: touch.element,
        });
      }
    }
  }

  private handleMultiTouchMove(handler: GestureHandler, touches: TouchPoint[], config: GestureConfig): void {
    if (touches.length < 2) return;

    const [touch1, touch2] = touches;
    const currentDistance = this.getDistance(touch1, touch2);
    const currentAngle = this.getAngle(touch1, touch2);
    const center = this.getCenter([touch1, touch2]);

    // 缩放检测
    if (Math.abs(currentDistance - this.state.initialDistance) > config.pinchThreshold) {
      const scale = Math.max(
        config.minScale,
        Math.min(config.maxScale, currentDistance / this.state.initialDistance)
      );
      
      if (this.canActivateGesture('pinch', config) && handler.handlers.onPinch) {
        this.state.activeGestures.add('pinch');
        this.state.currentScale = scale;
        
        handler.handlers.onPinch({
          type: 'pinch',
          position: center,
          scale,
          timeStamp: touch1.timeStamp,
          target: touch1.element,
        });

        this.triggerHapticFeedback('light');
      }
    }

    // 旋转检测
    const angleDelta = currentAngle - this.state.initialAngle;
    if (Math.abs(angleDelta) > config.rotationThreshold) {
      if (this.canActivateGesture('rotate', config) && handler.handlers.onRotate) {
        this.state.activeGestures.add('rotate');
        this.state.currentRotation = angleDelta;
        
        handler.handlers.onRotate({
          type: 'rotate',
          position: center,
          rotation: angleDelta,
          timeStamp: touch1.timeStamp,
          target: touch1.element,
        });
      }
    }
  }

  private handleGestureEnd(handler: GestureHandler, endedTouches: TouchPoint[], config: GestureConfig, now: number): void {
    if (endedTouches.length === 1) {
      const touch = endedTouches[0];
      const deltaX = touch.x - touch.startX;
      const deltaY = touch.y - touch.startY;
      const deltaTime = now - touch.timeStamp;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = this.calculateVelocity();

      // 处理拖拽结束
      if (this.state.activeGestures.has('drag') && handler.handlers.onDragEnd) {
        handler.handlers.onDragEnd({
          type: 'drag',
          position: { x: touch.x, y: touch.y },
          velocity: velocity,
          timeStamp: now,
          target: touch.element,
        });
        this.announceGesture('Drag ended');
      }
      
      // 处理滑动手势
      else if (distance > config.swipeThreshold && velocity > 0.3) {
        this.handleSwipeGesture(handler, { deltaX, deltaY, velocity, distance, touch, now });
      }
      
      // 处理点击手势
      else if (distance < config.tapThreshold && deltaTime < 300) {
        this.handleTapGesture(handler, { touch, now, config });
      }

      // 处理下拉刷新结束
      if (this.state.pullRefreshStartY !== null && handler.handlers.onPullRefreshEnd) {
        const pullDistance = touch.y - this.state.pullRefreshStartY;
        const shouldRefresh = pullDistance >= config.pullRefreshThreshold;
        
        handler.handlers.onPullRefreshEnd({
          type: 'pullRefresh',
          position: { x: touch.x, y: touch.y },
          distance: pullDistance,
          timeStamp: now,
          target: touch.element,
        });

        if (shouldRefresh) {
          this.triggerHapticFeedback('medium');
        }
      }
    }
    
    // 处理缩放/旋转结束
    else if (endedTouches.length === 2) {
      if (this.state.activeGestures.has('pinch') && handler.handlers.onPinchEnd) {
        const center = this.getCenter(endedTouches);
        handler.handlers.onPinchEnd({
          type: 'pinch',
          position: center,
          scale: this.state.currentScale,
          timeStamp: now,
          target: endedTouches[0].element,
        });
        this.announceGesture('Pinch ended', `Scale: ${this.state.currentScale.toFixed(2)}`);
      }

      if (this.state.activeGestures.has('rotate') && handler.handlers.onRotateEnd) {
        const center = this.getCenter(endedTouches);
        handler.handlers.onRotateEnd({
          type: 'rotate',
          position: center,
          rotation: this.state.currentRotation,
          timeStamp: now,
          target: endedTouches[0].element,
        });
        this.announceGesture('Rotation ended', `Angle: ${this.state.currentRotation.toFixed(1)}°`);
      }
    }
  }

  private handleSwipeGesture(handler: GestureHandler, params: any): void {
    const { deltaX, deltaY, velocity, distance, touch, now } = params;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    let direction: 'left' | 'right' | 'up' | 'down';
    let handlerMethod: keyof typeof handler.handlers;

    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left';
      handlerMethod = deltaX > 0 ? 'onSwipeRight' : 'onSwipeLeft';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
      handlerMethod = deltaY > 0 ? 'onSwipeDown' : 'onSwipeUp';
    }

    const gestureHandler = handler.handlers[handlerMethod];
    if (gestureHandler) {
      gestureHandler({
        type: 'swipe',
        position: { x: touch.x, y: touch.y },
        direction,
        velocity,
        distance,
        timeStamp: now,
        target: touch.element,
      });
      
      this.triggerHapticFeedback();
      this.announceGesture(`Swiped ${direction}`);
    }
  }

  private handleTapGesture(handler: GestureHandler, params: any): void {
    const { touch, now, config } = params;
    const position = { x: touch.x, y: touch.y };
    const timeSinceLastTap = now - this.state.lastTapTime;
    const distanceFromLastTap = this.getDistance(position, this.state.lastTapPosition);

    if (timeSinceLastTap < config.doubleTapTimeout && distanceFromLastTap < config.tapThreshold) {
      // 双击
      handler.handlers.onDoubleTap?.({
        type: 'tap',
        position,
        timeStamp: now,
        target: touch.element,
      });
      this.announceGesture('Double tap');
    } else {
      // 单击
      setTimeout(() => {
        handler.handlers.onTap?.({
          type: 'tap',
          position,
          timeStamp: now,
          target: touch.element,
        });
        this.announceGesture('Tap');
      }, config.doubleTapTimeout);
    }

    this.state.lastTapTime = now;
    this.state.lastTapPosition = position;
    this.triggerHapticFeedback('light');
  }

  private canActivateGesture(gestureType: string, config: GestureConfig): boolean {
    switch (config.conflictStrategy) {
      case 'first-wins':
        return this.state.activeGestures.size === 0;
      
      case 'priority':
        const currentPriorities = Array.from(this.state.activeGestures)
          .map(gesture => config.gesturePriority.indexOf(gesture))
          .filter(priority => priority !== -1);
        
        const newPriority = config.gesturePriority.indexOf(gestureType);
        
        return newPriority !== -1 && (
          currentPriorities.length === 0 ||
          newPriority <= Math.min(...currentPriorities)
        );
      
      case 'hybrid':
        // 允许兼容的手势组合
        const compatibleCombinations = [
          ['pinch', 'rotate'],
          ['drag', 'tap'],
        ];
        
        for (const combination of compatibleCombinations) {
          if (combination.includes(gestureType) && 
              Array.from(this.state.activeGestures).every(gesture => combination.includes(gesture))) {
            return true;
          }
        }
        
        return this.state.activeGestures.size === 0;
      
      default:
        return true;
    }
  }

  private dispatchGestureEvent(handler: GestureHandler, type: string, event: Partial<GestureEvent>): void {
    const gestureEvent: GestureEvent = {
      type: type as any,
      position: { x: 0, y: 0 },
      timeStamp: Date.now(),
      target: document.body,
      ...event,
    };

    // 根据类型分发到相应处理器
    const methodName = `on${type.charAt(0).toUpperCase()}${type.slice(1)}` as keyof typeof handler.handlers;
    const method = handler.handlers[methodName];
    
    if (method) {
      (method as any)(gestureEvent);
    }
  }

  private throttleEvent(callback: () => void, delay: number): void {
    if (this.throttleTimer) return;
    
    if (this.defaultConfig.enableRAF) {
      this.rafId = requestAnimationFrame(callback);
    } else {
      this.throttleTimer = setTimeout(() => {
        callback();
        this.throttleTimer = null;
      }, delay);
    }
  }

  private updateVelocityHistory(touches: TouchPoint[], timeStamp: number): void {
    if (touches.length > 0) {
      const center = this.getCenter(touches);
      this.state.velocityHistory.push({
        x: center.x,
        y: center.y,
        timeStamp,
      });

      // 保持最近100ms的记录
      const cutoffTime = timeStamp - 100;
      this.state.velocityHistory = this.state.velocityHistory.filter(
        record => record.timeStamp >= cutoffTime
      );
    }
  }

  private calculateVelocity(): number {
    const history = this.state.velocityHistory;
    if (history.length < 2) return 0;

    const first = history[0];
    const last = history[history.length - 1];
    const deltaTime = last.timeStamp - first.timeStamp;
    
    if (deltaTime === 0) return 0;

    const deltaX = last.x - first.x;
    const deltaY = last.y - first.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    return distance / deltaTime;
  }

  private getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getCenter(points: Array<{ x: number; y: number }>): { x: number; y: number } {
    const sum = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  private getAngle(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  }

  private isAtTop(element: HTMLElement): boolean {
    const scrollableParent = this.findScrollableParent(element);
    return !scrollableParent || scrollableParent.scrollTop <= 0;
  }

  private findScrollableParent(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    
    while (parent) {
      const style = window.getComputedStyle(parent);
      const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
      
      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      
      parent = parent.parentElement;
    }
    
    return document.documentElement;
  }

  private clearAllTimers(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private resetGestureState(): void {
    this.state.activeGestures.clear();
    this.state.touches.clear();
    this.state.currentScale = 1;
    this.state.currentRotation = 0;
    this.state.dragStartPosition = null;
    this.state.pullRefreshStartY = null;
    this.state.velocityHistory = [];
  }

  /**
   * 销毁管理器，清理所有资源
   */
  destroy(): void {
    this.clearAllTimers();
    this.handlers.clear();
    this.resetGestureState();
  }
}

// 创建全局实例
export const gestureSystemManager = new GestureSystemManager();
export default gestureSystemManager;