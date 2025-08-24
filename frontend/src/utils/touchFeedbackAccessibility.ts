/**
 * 触摸反馈无障碍增强工具
 * 提供屏幕阅读器支持、键盘导航和高对比度模式适配
 */

// 无障碍配置接口
interface AccessibilityConfig {
  /** 是否启用屏幕阅读器支持 */
  screenReaderSupport: boolean;
  /** 是否启用键盘导航支持 */
  keyboardSupport: boolean;
  /** 是否启用高对比度模式 */
  highContrast: boolean;
  /** 是否遵守用户的减少动画偏好 */
  respectMotionPreference: boolean;
  /** 语音提示语言 */
  language: 'zh-CN' | 'en-US';
  /** 提示详细程度 */
  verbosity: 'minimal' | 'normal' | 'detailed';
}

// 触摸反馈类型的无障碍描述
interface AccessibilityDescriptions {
  [key: string]: {
    action: string;
    result: string;
    hint?: string;
  };
}

// 无障碍事件接口
interface AccessibilityEvent {
  type: 'announce' | 'focus' | 'action' | 'status';
  message: string;
  priority: 'low' | 'medium' | 'high';
  interrupts?: boolean;
}

class TouchFeedbackAccessibilityManager {
  private static instance: TouchFeedbackAccessibilityManager | null = null;
  private config: AccessibilityConfig;
  private liveRegion: HTMLElement | null = null;
  private statusRegion: HTMLElement | null = null;
  private isScreenReaderActive = false;
  
  // 触摸反馈的无障碍描述
  private descriptions: AccessibilityDescriptions = {
    // 中文描述
    'zh-CN': {
      ripple: {
        action: '触摸反馈',
        result: '已激活涟漪效果',
        hint: '表示元素已被触摸',
      },
      longPress: {
        action: '长按检测',
        result: '长按操作已触发',
        hint: '保持按压以激活长按功能',
      },
      longPressStart: {
        action: '开始长按',
        result: '长按计时开始',
        hint: '继续按压以完成长按操作',
      },
      longPressCancel: {
        action: '取消长按',
        result: '长按操作已取消',
        hint: '长按被中断或移动超出范围',
      },
      hapticLight: {
        action: '轻微触觉反馈',
        result: '轻微震动反馈',
        hint: '表示轻微交互',
      },
      hapticMedium: {
        action: '中等触觉反馈',
        result: '中等震动反馈',
        hint: '表示重要交互',
      },
      hapticSuccess: {
        action: '成功触觉反馈',
        result: '操作成功反馈',
        hint: '表示操作已成功完成',
      },
      hapticError: {
        action: '错误触觉反馈',
        result: '操作错误反馈',
        hint: '表示操作遇到错误',
      },
    },
    // 英文描述
    'en-US': {
      ripple: {
        action: 'Touch feedback',
        result: 'Ripple effect activated',
        hint: 'Indicates element has been touched',
      },
      longPress: {
        action: 'Long press detection',
        result: 'Long press action triggered',
        hint: 'Hold to activate long press functionality',
      },
      longPressStart: {
        action: 'Long press started',
        result: 'Long press timing started',
        hint: 'Continue holding to complete long press',
      },
      longPressCancel: {
        action: 'Long press cancelled',
        result: 'Long press action cancelled',
        hint: 'Long press interrupted or moved out of range',
      },
      hapticLight: {
        action: 'Light haptic feedback',
        result: 'Light vibration feedback',
        hint: 'Indicates minor interaction',
      },
      hapticMedium: {
        action: 'Medium haptic feedback',
        result: 'Medium vibration feedback',
        hint: 'Indicates important interaction',
      },
      hapticSuccess: {
        action: 'Success haptic feedback',
        result: 'Operation success feedback',
        hint: 'Indicates successful operation',
      },
      hapticError: {
        action: 'Error haptic feedback',
        result: 'Operation error feedback',
        hint: 'Indicates operation encountered error',
      },
    },
  };

  private constructor() {
    this.config = this.getDefaultConfig();
    this.detectScreenReader();
    this.initializeLiveRegions();
    this.setupEventListeners();
  }

  static getInstance(): TouchFeedbackAccessibilityManager {
    if (!this.instance) {
      this.instance = new TouchFeedbackAccessibilityManager();
    }
    return this.instance;
  }

  private getDefaultConfig(): AccessibilityConfig {
    return {
      screenReaderSupport: true,
      keyboardSupport: true,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      respectMotionPreference: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      language: navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
      verbosity: 'normal',
    };
  }

  private detectScreenReader(): void {
    // 检测常见的屏幕阅读器
    const userAgent = navigator.userAgent.toLowerCase();
    const screenReaders = [
      'nvda', 'jaws', 'voiceover', 'talkback', 
      'narrator', 'dragon', 'orca', 'chromevox'
    ];
    
    this.isScreenReaderActive = screenReaders.some(sr => 
      userAgent.includes(sr) || 
      document.documentElement.hasAttribute(`aria-${sr}`)
    );

    // 检测是否启用了辅助技术
    if ('speechSynthesis' in window) {
      // 如果支持语音合成，很可能有屏幕阅读器
      this.isScreenReaderActive = true;
    }

    // 检查是否有aria-live区域，通常表示有屏幕阅读器
    const ariaLiveElements = document.querySelectorAll('[aria-live]');
    if (ariaLiveElements.length > 0) {
      this.isScreenReaderActive = true;
    }
  }

  private initializeLiveRegions(): void {
    // 创建公告区域（用于重要提示）
    this.liveRegion = document.createElement('div');
    this.liveRegion.id = 'touch-feedback-announcer';
    this.liveRegion.className = 'sr-only';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('role', 'status');
    document.body.appendChild(this.liveRegion);

    // 创建状态区域（用于状态变化）
    this.statusRegion = document.createElement('div');
    this.statusRegion.id = 'touch-feedback-status';
    this.statusRegion.className = 'sr-only';
    this.statusRegion.setAttribute('aria-live', 'assertive');
    this.statusRegion.setAttribute('aria-atomic', 'true');
    this.statusRegion.setAttribute('role', 'alert');
    document.body.appendChild(this.statusRegion);
  }

  private setupEventListeners(): void {
    // 监听系统偏好变化
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      this.config.respectMotionPreference = e.matches;
      this.announcePreferenceChange('motion', e.matches);
    });

    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    contrastQuery.addEventListener('change', (e) => {
      this.config.highContrast = e.matches;
      this.announcePreferenceChange('contrast', e.matches);
    });

    // 监听自定义优化事件
    document.addEventListener('touchFeedbackOptimize', (e: CustomEvent) => {
      this.announceOptimization(e.detail);
    });
  }

  // 公告触摸反馈事件
  announce(
    feedbackType: string, 
    eventType: 'start' | 'complete' | 'cancel' | 'error' = 'complete',
    options?: {
      priority?: 'low' | 'medium' | 'high';
      interrupts?: boolean;
      customMessage?: string;
    }
  ): void {
    if (!this.config.screenReaderSupport || !this.isScreenReaderActive) {
      return;
    }

    const { priority = 'low', interrupts = false, customMessage } = options || {};
    const langDescriptions = this.descriptions[this.config.language];
    const description = langDescriptions[feedbackType];
    
    if (!description && !customMessage) {
      return;
    }

    let message = customMessage;
    
    if (!message && description) {
      switch (this.config.verbosity) {
        case 'minimal':
          message = description.result;
          break;
        case 'detailed':
          message = `${description.action}：${description.result}。${description.hint || ''}`;
          break;
        default:
          message = `${description.action}，${description.result}`;
      }
    }

    if (!message) return;

    const event: AccessibilityEvent = {
      type: 'announce',
      message,
      priority,
      interrupts,
    };

    this.dispatchAccessibilityEvent(event);
  }

  // 公告长按进度
  announceLongPressProgress(progress: number, threshold: number): void {
    if (!this.config.screenReaderSupport || !this.isScreenReaderActive) {
      return;
    }

    const percentage = Math.round(progress * 100);
    const remaining = Math.round(threshold * (1 - progress));
    
    let message: string;
    
    if (this.config.language === 'zh-CN') {
      message = `长按进度 ${percentage}%，还需 ${remaining} 毫秒`;
    } else {
      message = `Long press ${percentage}%, ${remaining}ms remaining`;
    }

    // 只在特定进度节点公告，避免过于频繁
    if (percentage % 25 === 0) {
      this.announce('longPress', 'start', {
        customMessage: message,
        priority: 'low',
      });
    }
  }

  // 公告触觉反馈
  announceHapticFeedback(type: string, success: boolean): void {
    if (!this.config.screenReaderSupport) return;

    const langKey = this.config.language;
    let message: string;
    
    if (langKey === 'zh-CN') {
      message = success 
        ? `${type} 触觉反馈已触发`
        : `${type} 触觉反馈不可用`;
    } else {
      message = success
        ? `${type} haptic feedback triggered`
        : `${type} haptic feedback unavailable`;
    }

    this.announce(`haptic${type}`, success ? 'complete' : 'error', {
      customMessage: message,
      priority: 'low',
    });
  }

  // 公告系统偏好变化
  private announcePreferenceChange(type: 'motion' | 'contrast', enabled: boolean): void {
    if (!this.config.screenReaderSupport) return;

    let message: string;
    
    if (this.config.language === 'zh-CN') {
      if (type === 'motion') {
        message = enabled ? '已启用减少动画模式' : '已禁用减少动画模式';
      } else {
        message = enabled ? '已启用高对比度模式' : '已禁用高对比度模式';
      }
    } else {
      if (type === 'motion') {
        message = enabled ? 'Reduced motion enabled' : 'Reduced motion disabled';
      } else {
        message = enabled ? 'High contrast enabled' : 'High contrast disabled';
      }
    }

    this.dispatchAccessibilityEvent({
      type: 'status',
      message,
      priority: 'medium',
      interrupts: false,
    });
  }

  // 公告性能优化
  private announceOptimization(detail: any): void {
    if (!this.config.screenReaderSupport) return;

    let message: string;
    
    if (this.config.language === 'zh-CN') {
      message = `触摸反馈已优化：${detail.recommendation.description}`;
    } else {
      message = `Touch feedback optimized: ${detail.recommendation.description}`;
    }

    this.dispatchAccessibilityEvent({
      type: 'status',
      message,
      priority: 'medium',
      interrupts: false,
    });
  }

  // 分发无障碍事件
  private dispatchAccessibilityEvent(event: AccessibilityEvent): void {
    const region = event.type === 'announce' || event.priority === 'low' 
      ? this.liveRegion 
      : this.statusRegion;
    
    if (!region) return;

    // 清空区域内容
    region.textContent = '';
    
    // 稍微延迟后设置新内容，确保屏幕阅读器能够检测到变化
    setTimeout(() => {
      region.textContent = event.message;
      
      // 记录无障碍事件
      console.debug('Accessibility announcement:', {
        type: event.type,
        message: event.message,
        priority: event.priority,
      });
    }, 10);

    // 如果设置了中断标志，清空其他区域
    if (event.interrupts && this.liveRegion && this.statusRegion) {
      const otherRegion = region === this.liveRegion ? this.statusRegion : this.liveRegion;
      otherRegion.textContent = '';
    }
  }

  // 为元素添加无障碍属性
  enhanceElement(element: HTMLElement, options: {
    role?: string;
    label?: string;
    description?: string;
    hasPopup?: boolean;
    expanded?: boolean;
    pressed?: boolean;
    longPressHint?: boolean;
  }): void {
    const {
      role,
      label,
      description,
      hasPopup,
      expanded,
      pressed,
      longPressHint,
    } = options;

    // 设置角色
    if (role) {
      element.setAttribute('role', role);
    }

    // 设置标签
    if (label) {
      element.setAttribute('aria-label', label);
    }

    // 设置描述
    if (description) {
      const descId = `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const descElement = document.createElement('span');
      descElement.id = descId;
      descElement.className = 'sr-only';
      descElement.textContent = description;
      element.appendChild(descElement);
      element.setAttribute('aria-describedby', descId);
    }

    // 设置弹出菜单指示
    if (hasPopup !== undefined) {
      element.setAttribute('aria-haspopup', hasPopup.toString());
    }

    // 设置展开状态
    if (expanded !== undefined) {
      element.setAttribute('aria-expanded', expanded.toString());
    }

    // 设置按压状态
    if (pressed !== undefined) {
      element.setAttribute('aria-pressed', pressed.toString());
    }

    // 添加长按提示
    if (longPressHint) {
      const hintText = this.config.language === 'zh-CN' 
        ? '长按以获得更多选项'
        : 'Long press for more options';
      
      const hintId = `hint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const hintElement = document.createElement('span');
      hintElement.id = hintId;
      hintElement.className = 'sr-only';
      hintElement.textContent = hintText;
      element.appendChild(hintElement);
      
      const existingDescBy = element.getAttribute('aria-describedby');
      element.setAttribute(
        'aria-describedby', 
        existingDescBy ? `${existingDescBy} ${hintId}` : hintId
      );
    }

    // 设置键盘可访问性
    if (this.config.keyboardSupport) {
      if (!element.hasAttribute('tabindex') && (role === 'button' || element.onclick)) {
        element.setAttribute('tabindex', '0');
      }
    }
  }

  // 处理键盘事件
  handleKeyboardEvent(
    event: KeyboardEvent, 
    callbacks: {
      onActivate?: () => void;
      onLongPress?: () => void;
      onCancel?: () => void;
    }
  ): boolean {
    if (!this.config.keyboardSupport) return false;

    const { onActivate, onLongPress, onCancel } = callbacks;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (event.repeat && onLongPress) {
          onLongPress();
          this.announce('longPress', 'complete');
        } else if (onActivate) {
          onActivate();
          this.announce('ripple', 'complete');
        }
        return true;
        
      case 'Escape':
        if (onCancel) {
          onCancel();
          this.announce('longPress', 'cancel');
        }
        return true;
        
      default:
        return false;
    }
  }

  // 获取配置
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // 如果禁用了屏幕阅读器支持，清空live regions
    if (!this.config.screenReaderSupport) {
      if (this.liveRegion) this.liveRegion.textContent = '';
      if (this.statusRegion) this.statusRegion.textContent = '';
    }
  }

  // 检查是否应该禁用动画
  shouldReduceMotion(): boolean {
    return this.config.respectMotionPreference;
  }

  // 检查是否为高对比度模式
  isHighContrastMode(): boolean {
    return this.config.highContrast;
  }

  // 检查屏幕阅读器是否活跃
  isScreenReaderActive(): boolean {
    return this.isScreenReaderActive;
  }

  // 清理资源
  dispose(): void {
    if (this.liveRegion) {
      document.body.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
    
    if (this.statusRegion) {
      document.body.removeChild(this.statusRegion);
      this.statusRegion = null;
    }
  }
}

// 导出单例实例
export const accessibilityManager = TouchFeedbackAccessibilityManager.getInstance();

// 便捷函数
export const announceTouch = (type: string, event?: string, options?: any) => 
  accessibilityManager.announce(type, event, options);

export const announceLongPress = (progress: number, threshold: number) =>
  accessibilityManager.announceLongPressProgress(progress, threshold);

export const announceHaptic = (type: string, success: boolean) =>
  accessibilityManager.announceHapticFeedback(type, success);

export const enhanceAccessibility = (element: HTMLElement, options: any) =>
  accessibilityManager.enhanceElement(element, options);

export const handleKeyboard = (event: KeyboardEvent, callbacks: any) =>
  accessibilityManager.handleKeyboardEvent(event, callbacks);

export { type AccessibilityConfig, type AccessibilityEvent };
export default TouchFeedbackAccessibilityManager;