/**
 * 手势无障碍辅助工具
 * 提供手势操作的无障碍支持，包括屏幕阅读器支持、键盘导航、高对比度模式等
 */

export interface AccessibilityConfig {
  enableScreenReader: boolean;
  enableKeyboardNav: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  enableVoiceAnnouncements: boolean;
  announcementDelay: number;
  keyboardShortcuts: Record<string, KeyboardShortcut>;
  gestureAlternatives: Record<string, GestureAlternative>;
  contrastRatio: number;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  language: string;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'action' | 'zoom' | 'general';
}

export interface GestureAlternative {
  gestureType: string;
  description: string;
  keyboardShortcut?: string;
  buttonElement?: HTMLElement;
  accessibilityHint: string;
  instructions: string[];
}

export interface AccessibilityState {
  isScreenReaderActive: boolean;
  isHighContrastMode: boolean;
  isReducedMotionMode: boolean;
  currentFocusElement: HTMLElement | null;
  announcementQueue: string[];
  lastAnnouncement: string;
}

export interface VoiceAnnouncement {
  message: string;
  priority: 'polite' | 'assertive' | 'off';
  delay?: number;
  interrupt?: boolean;
}

class GestureAccessibilityHelper {
  private config: AccessibilityConfig = {
    enableScreenReader: true,
    enableKeyboardNav: true,
    enableHighContrast: false,
    enableReducedMotion: false,
    enableVoiceAnnouncements: true,
    announcementDelay: 100,
    keyboardShortcuts: {},
    gestureAlternatives: {},
    contrastRatio: 4.5,
    fontSize: 'medium',
    language: 'zh-CN',
  };

  private state: AccessibilityState = {
    isScreenReaderActive: false,
    isHighContrastMode: false,
    isReducedMotionMode: false,
    currentFocusElement: null,
    announcementQueue: [],
    lastAnnouncement: '',
  };

  private announceTimeoutId: NodeJS.Timeout | null = null;
  private keyboardListeners: Array<() => void> = [];
  private ariaLiveRegion: HTMLElement | null = null;
  private focusTrapStack: HTMLElement[] = [];

  // 默认键盘快捷键
  private defaultKeyboardShortcuts: Record<string, KeyboardShortcut> = {
    'zoom-in': {
      key: '=',
      ctrlKey: true,
      action: () => this.triggerZoomIn(),
      description: '放大',
      category: 'zoom',
    },
    'zoom-out': {
      key: '-',
      ctrlKey: true,
      action: () => this.triggerZoomOut(),
      description: '缩小',
      category: 'zoom',
    },
    'reset-zoom': {
      key: '0',
      ctrlKey: true,
      action: () => this.triggerResetZoom(),
      description: '重置缩放',
      category: 'zoom',
    },
    'next-item': {
      key: 'ArrowRight',
      action: () => this.navigateToNext(),
      description: '下一项',
      category: 'navigation',
    },
    'prev-item': {
      key: 'ArrowLeft',
      action: () => this.navigateToPrevious(),
      description: '上一项',
      category: 'navigation',
    },
    'activate': {
      key: 'Enter',
      action: () => this.activateCurrentItem(),
      description: '激活当前项',
      category: 'action',
    },
    'escape': {
      key: 'Escape',
      action: () => this.handleEscape(),
      description: '取消/返回',
      category: 'general',
    },
    'help': {
      key: 'F1',
      action: () => this.showAccessibilityHelp(),
      description: '显示帮助',
      category: 'general',
    },
  };

  // 默认手势替代方案
  private defaultGestureAlternatives: Record<string, GestureAlternative> = {
    pinch: {
      gestureType: 'pinch',
      description: '双指缩放',
      keyboardShortcut: 'Ctrl + 加号/减号',
      accessibilityHint: '使用Ctrl+加号放大，Ctrl+减号缩小',
      instructions: [
        '按住Ctrl键',
        '按加号键放大',
        '按减号键缩小',
        '按0键重置缩放',
      ],
    },
    swipe: {
      gestureType: 'swipe',
      description: '滑动操作',
      keyboardShortcut: '方向键',
      accessibilityHint: '使用方向键导航项目',
      instructions: [
        '使用左右箭头键在项目间导航',
        '使用上下箭头键在不同区域间移动',
        '按Enter键激活当前项',
      ],
    },
    longPress: {
      gestureType: 'longPress',
      description: '长按操作',
      keyboardShortcut: 'Shift + Enter',
      accessibilityHint: '按Shift+Enter执行长按操作',
      instructions: [
        '导航到目标项目',
        '按住Shift键',
        '按Enter键执行长按操作',
      ],
    },
    pullRefresh: {
      gestureType: 'pullRefresh',
      description: '下拉刷新',
      keyboardShortcut: 'Ctrl + R',
      accessibilityHint: '按Ctrl+R刷新页面内容',
      instructions: [
        '按住Ctrl键',
        '按R键刷新内容',
      ],
    },
  };

  constructor(config?: Partial<AccessibilityConfig>) {
    this.config = { ...this.config, ...config };
    this.config.keyboardShortcuts = { ...this.defaultKeyboardShortcuts, ...this.config.keyboardShortcuts };
    this.config.gestureAlternatives = { ...this.defaultGestureAlternatives, ...this.config.gestureAlternatives };

    this.initialize();
  }

  /**
   * 初始化无障碍功能
   */
  private initialize(): void {
    this.detectScreenReader();
    this.setupARIALiveRegion();
    this.setupKeyboardNavigation();
    this.detectUserPreferences();
    this.setupFocusManagement();
  }

  /**
   * 检测屏幕阅读器
   */
  private detectScreenReader(): void {
    // 检测常见的屏幕阅读器
    const userAgent = navigator.userAgent.toLowerCase();
    const hasScreenReader = 
      window.speechSynthesis ||
      userAgent.includes('nvda') ||
      userAgent.includes('jaws') ||
      userAgent.includes('voiceover') ||
      document.documentElement.getAttribute('data-whatinput') === 'keyboard';

    this.state.isScreenReaderActive = hasScreenReader && this.config.enableScreenReader;

    if (this.state.isScreenReaderActive) {
      document.documentElement.setAttribute('data-screen-reader', 'true');
    }
  }

  /**
   * 设置ARIA Live区域
   */
  private setupARIALiveRegion(): void {
    this.ariaLiveRegion = document.createElement('div');
    this.ariaLiveRegion.id = 'gesture-announcements';
    this.ariaLiveRegion.setAttribute('aria-live', 'polite');
    this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    this.ariaLiveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(1px, 1px, 1px, 1px);
      white-space: nowrap;
    `;

    document.body.appendChild(this.ariaLiveRegion);
  }

  /**
   * 设置键盘导航
   */
  private setupKeyboardNavigation(): void {
    if (!this.config.enableKeyboardNav) return;

    const keydownHandler = (event: KeyboardEvent) => {
      this.handleKeyboardShortcut(event);
    };

    document.addEventListener('keydown', keydownHandler);
    this.keyboardListeners.push(() => {
      document.removeEventListener('keydown', keydownHandler);
    });

    // 设置焦点环样式
    const focusStyle = document.createElement('style');
    focusStyle.textContent = `
      .gesture-focus-visible {
        outline: 2px solid #4A90E2;
        outline-offset: 2px;
        border-radius: 4px;
      }
      
      .gesture-high-contrast .gesture-focus-visible {
        outline: 3px solid #FFFFFF;
        background-color: #000000;
        color: #FFFFFF;
      }
    `;
    document.head.appendChild(focusStyle);
  }

  /**
   * 检测用户偏好
   */
  private detectUserPreferences(): void {
    // 检测高对比度模式
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.state.isHighContrastMode = true;
      this.config.enableHighContrast = true;
    }

    // 检测减少动画偏好
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.state.isReducedMotionMode = true;
      this.config.enableReducedMotion = true;
    }

    // 应用偏好设置
    this.applyAccessibilityPreferences();
  }

  /**
   * 应用无障碍偏好设置
   */
  private applyAccessibilityPreferences(): void {
    const root = document.documentElement;

    if (this.config.enableHighContrast) {
      root.classList.add('gesture-high-contrast');
      root.style.setProperty('--contrast-ratio', this.config.contrastRatio.toString());
    }

    if (this.config.enableReducedMotion) {
      root.classList.add('gesture-reduced-motion');
      root.style.setProperty('--animation-duration', '0.01ms');
    }

    // 设置字体大小
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'x-large': '20px',
    };
    root.style.setProperty('--base-font-size', fontSizeMap[this.config.fontSize]);
  }

  /**
   * 设置焦点管理
   */
  private setupFocusManagement(): void {
    let lastFocusedElement: HTMLElement | null = null;

    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      this.state.currentFocusElement = target;
      
      if (this.state.isScreenReaderActive) {
        this.announceElementInfo(target);
      }
    });

    document.addEventListener('focusout', (event) => {
      lastFocusedElement = event.target as HTMLElement;
    });

    // 处理焦点陷阱
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab' && this.focusTrapStack.length > 0) {
        const container = this.focusTrapStack[this.focusTrapStack.length - 1];
        this.handleFocusTrap(event, container);
      }
    });
  }

  /**
   * 处理键盘快捷键
   */
  private handleKeyboardShortcut(event: KeyboardEvent): void {
    for (const [id, shortcut] of Object.entries(this.config.keyboardShortcuts)) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          shortcut.action();
          this.announceAction(`执行了${shortcut.description}`);
        } catch (error) {
          console.error(`Keyboard shortcut error (${id}):`, error);
          this.announceAction(`${shortcut.description}执行失败`);
        }
        
        break;
      }
    }
  }

  /**
   * 检查快捷键是否匹配
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      event.key === shortcut.key &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.shiftKey === !!shortcut.shiftKey
    );
  }

  /**
   * 语音播报
   */
  announceAction(message: string, options: Partial<VoiceAnnouncement> = {}): void {
    if (!this.config.enableVoiceAnnouncements) return;

    const announcement: VoiceAnnouncement = {
      message,
      priority: 'polite',
      delay: this.config.announcementDelay,
      interrupt: false,
      ...options,
    };

    // 防止重复播报
    if (this.state.lastAnnouncement === message) {
      return;
    }

    this.state.lastAnnouncement = message;
    this.state.announcementQueue.push(message);

    // 清除之前的定时器
    if (this.announceTimeoutId) {
      clearTimeout(this.announceTimeoutId);
    }

    this.announceTimeoutId = setTimeout(() => {
      this.processAnnouncementQueue(announcement);
    }, announcement.delay);
  }

  /**
   * 处理播报队列
   */
  private processAnnouncementQueue(announcement: VoiceAnnouncement): void {
    if (!this.ariaLiveRegion) return;

    // 更新ARIA Live区域
    this.ariaLiveRegion.setAttribute('aria-live', announcement.priority);
    this.ariaLiveRegion.textContent = announcement.message;

    // 使用Web Speech API（如果可用）
    if (window.speechSynthesis && this.state.isScreenReaderActive) {
      const utterance = new SpeechSynthesisUtterance(announcement.message);
      utterance.lang = this.config.language;
      utterance.rate = 0.9;
      utterance.pitch = 1;

      if (announcement.interrupt) {
        window.speechSynthesis.cancel();
      }

      window.speechSynthesis.speak(utterance);
    }

    // 清空队列
    setTimeout(() => {
      if (this.ariaLiveRegion) {
        this.ariaLiveRegion.textContent = '';
      }
      this.state.announcementQueue = [];
    }, 1000);
  }

  /**
   * 播报元素信息
   */
  private announceElementInfo(element: HTMLElement): void {
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const label = element.getAttribute('aria-label') || 
                 element.getAttribute('title') || 
                 element.textContent?.trim() || '';

    const description = element.getAttribute('aria-describedby');
    let announcement = `${role} ${label}`;

    if (description) {
      const descElement = document.getElementById(description);
      if (descElement) {
        announcement += ` ${descElement.textContent}`;
      }
    }

    this.announceAction(announcement, { delay: 50 });
  }

  /**
   * 创建手势替代方案的UI
   */
  createGestureAlternativeUI(gestureType: string, container: HTMLElement): HTMLElement {
    const alternative = this.config.gestureAlternatives[gestureType];
    if (!alternative) return container;

    const alternativeUI = document.createElement('div');
    alternativeUI.className = 'gesture-alternative-ui';
    alternativeUI.innerHTML = `
      <div class="sr-only" id="gesture-${gestureType}-description">
        ${alternative.description}的键盘替代方案：${alternative.accessibilityHint}
      </div>
      <button 
        class="gesture-alternative-button"
        aria-describedby="gesture-${gestureType}-description"
        title="${alternative.accessibilityHint}"
      >
        ${alternative.description}
      </button>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .gesture-alternative-ui {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 1000;
      }
      
      .gesture-alternative-button {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: opacity 0.2s;
        opacity: 0;
      }
      
      .gesture-alternative-ui:hover .gesture-alternative-button,
      .gesture-alternative-ui:focus-within .gesture-alternative-button,
      .gesture-high-contrast .gesture-alternative-button {
        opacity: 1;
      }
      
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;
    document.head.appendChild(style);

    container.appendChild(alternativeUI);
    return alternativeUI;
  }

  /**
   * 设置焦点陷阱
   */
  setFocusTrap(container: HTMLElement): void {
    this.focusTrapStack.push(container);
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * 移除焦点陷阱
   */
  removeFocusTrap(): void {
    this.focusTrapStack.pop();
  }

  /**
   * 处理焦点陷阱
   */
  private handleFocusTrap(event: KeyboardEvent, container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * 获取可聚焦元素
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(', '))) as HTMLElement[];
  }

  // 默认动作实现
  private triggerZoomIn(): void {
    document.dispatchEvent(new CustomEvent('gesture-zoom-in'));
  }

  private triggerZoomOut(): void {
    document.dispatchEvent(new CustomEvent('gesture-zoom-out'));
  }

  private triggerResetZoom(): void {
    document.dispatchEvent(new CustomEvent('gesture-reset-zoom'));
  }

  private navigateToNext(): void {
    const focusableElements = this.getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex].focus();
  }

  private navigateToPrevious(): void {
    const focusableElements = this.getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[prevIndex].focus();
  }

  private activateCurrentItem(): void {
    const current = document.activeElement as HTMLElement;
    if (current && current.click) {
      current.click();
    }
  }

  private handleEscape(): void {
    document.dispatchEvent(new CustomEvent('gesture-escape'));
  }

  private showAccessibilityHelp(): void {
    const helpContent = this.generateAccessibilityHelp();
    this.announceAction('显示无障碍帮助信息');
    
    // 可以在这里显示帮助模态框或导航到帮助页面
    console.log('Accessibility Help:', helpContent);
  }

  /**
   * 生成无障碍帮助内容
   */
  private generateAccessibilityHelp(): string {
    const shortcuts = Object.entries(this.config.keyboardShortcuts)
      .map(([id, shortcut]) => {
        const keys = [];
        if (shortcut.ctrlKey) keys.push('Ctrl');
        if (shortcut.altKey) keys.push('Alt');
        if (shortcut.shiftKey) keys.push('Shift');
        keys.push(shortcut.key);
        return `${keys.join(' + ')}: ${shortcut.description}`;
      })
      .join('\n');

    const alternatives = Object.entries(this.config.gestureAlternatives)
      .map(([type, alt]) => `${alt.description}: ${alt.accessibilityHint}`)
      .join('\n');

    return `
键盘快捷键:
${shortcuts}

手势替代方案:
${alternatives}
    `.trim();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...config };
    this.applyAccessibilityPreferences();
  }

  /**
   * 获取无障碍状态
   */
  getAccessibilityState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * 销毁无障碍助手
   */
  destroy(): void {
    // 清除事件监听器
    this.keyboardListeners.forEach(cleanup => cleanup());
    this.keyboardListeners = [];

    // 清除定时器
    if (this.announceTimeoutId) {
      clearTimeout(this.announceTimeoutId);
      this.announceTimeoutId = null;
    }

    // 移除DOM元素
    if (this.ariaLiveRegion && this.ariaLiveRegion.parentNode) {
      this.ariaLiveRegion.parentNode.removeChild(this.ariaLiveRegion);
      this.ariaLiveRegion = null;
    }

    // 清空状态
    this.state.announcementQueue = [];
    this.focusTrapStack = [];
  }
}

export default GestureAccessibilityHelper;