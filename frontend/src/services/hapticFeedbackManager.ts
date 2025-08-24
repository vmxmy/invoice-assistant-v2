/**
 * 触觉反馈管理器
 * 统一管理所有触觉反馈功能，支持用户偏好和设备兼容性
 */

// 触觉反馈类型
export type HapticType = 
  | 'light'      // 轻微触感
  | 'medium'     // 中等触感
  | 'heavy'      // 强烈触感
  | 'success'    // 成功反馈
  | 'warning'    // 警告反馈
  | 'error'      // 错误反馈
  | 'selection'  // 选择反馈
  | 'notification'; // 通知反馈

// 触觉反馈配置
interface HapticConfig {
  /** 震动模式 (Vibration API) */
  pattern: number | number[];
  /** iOS 触觉反馈类型 */
  iosType?: string;
  /** 描述信息 */
  description: string;
  /** 是否需要节流 */
  throttle?: number;
}

// 用户偏好设置
interface HapticPreferences {
  /** 是否启用触觉反馈 */
  enabled: boolean;
  /** 强度等级 (0-1) */
  intensity: number;
  /** 是否仅在静音模式下启用 */
  silentModeOnly: boolean;
  /** 禁用的反馈类型 */
  disabledTypes: HapticType[];
}

// 设备能力检测结果
interface DeviceCapabilities {
  /** 是否支持 Vibration API */
  supportsVibration: boolean;
  /** 是否支持 iOS 触觉反馈 */
  supportsIOSHaptic: boolean;
  /** 是否支持细粒度震动控制 */
  supportsFineControl: boolean;
  /** 设备类型 */
  deviceType: 'mobile' | 'tablet' | 'desktop';
  /** 操作系统 */
  platform: 'ios' | 'android' | 'other';
}

// 反馈配置映射
const HAPTIC_CONFIGS: Record<HapticType, HapticConfig> = {
  light: {
    pattern: [5],
    iosType: 'impactLight',
    description: '轻微触感反馈',
    throttle: 50,
  },
  medium: {
    pattern: [10],
    iosType: 'impactMedium',
    description: '中等触感反馈',
    throttle: 100,
  },
  heavy: {
    pattern: [15],
    iosType: 'impactHeavy',
    description: '强烈触感反馈',
    throttle: 150,
  },
  success: {
    pattern: [10, 50, 10],
    iosType: 'notificationSuccess',
    description: '成功操作反馈',
    throttle: 200,
  },
  warning: {
    pattern: [10, 30, 10, 30, 10],
    iosType: 'notificationWarning',
    description: '警告提示反馈',
    throttle: 300,
  },
  error: {
    pattern: [20, 50, 20],
    iosType: 'notificationError',
    description: '错误提示反馈',
    throttle: 200,
  },
  selection: {
    pattern: [3],
    iosType: 'selectionChanged',
    description: '选择变更反馈',
    throttle: 30,
  },
  notification: {
    pattern: [8, 100, 8],
    iosType: 'notificationSuccess',
    description: '通知提醒反馈',
    throttle: 500,
  },
};

// 默认用户偏好
const DEFAULT_PREFERENCES: HapticPreferences = {
  enabled: true,
  intensity: 0.8,
  silentModeOnly: false,
  disabledTypes: [],
};

// 本地存储键名
const STORAGE_KEY = 'haptic_preferences';

// 节流管理
class ThrottleManager {
  private static lastTrigger = new Map<HapticType, number>();

  static canTrigger(type: HapticType, throttleMs: number = 0): boolean {
    const now = Date.now();
    const lastTime = this.lastTrigger.get(type) || 0;
    
    if (now - lastTime < throttleMs) {
      return false;
    }
    
    this.lastTrigger.set(type, now);
    return true;
  }

  static clear(): void {
    this.lastTrigger.clear();
  }
}

// 设备能力检测
class DeviceDetector {
  private static capabilities: DeviceCapabilities | null = null;

  static getCapabilities(): DeviceCapabilities {
    if (this.capabilities) {
      return this.capabilities;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = /mobile|android|ios|iphone|ipad|ipod/.test(userAgent);
    const isTablet = /ipad|tablet/.test(userAgent) || 
      (isAndroid && !/mobile/.test(userAgent));

    this.capabilities = {
      supportsVibration: 'vibrate' in navigator,
      supportsIOSHaptic: isIOS && 'HapticFeedback' in window,
      supportsFineControl: isAndroid || isIOS,
      deviceType: isMobile ? (isTablet ? 'tablet' : 'mobile') : 'desktop',
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'other',
    };

    return this.capabilities;
  }

  static isMobile(): boolean {
    return this.getCapabilities().deviceType !== 'desktop';
  }

  static canVibrate(): boolean {
    const caps = this.getCapabilities();
    return caps.supportsVibration || caps.supportsIOSHaptic;
  }
}

// 无障碍支持
class AccessibilityManager {
  static announceHaptic(type: HapticType): void {
    const config = HAPTIC_CONFIGS[type];
    const announcement = `触觉反馈: ${config.description}`;
    
    // 使用 aria-live 区域进行无障碍通知
    const liveRegion = this.getLiveRegion();
    if (liveRegion) {
      liveRegion.textContent = announcement;
      
      // 清除文本以避免重复读取
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = '';
        }
      }, 100);
    }
  }

  private static getLiveRegion(): HTMLElement | null {
    let liveRegion = document.getElementById('haptic-announcer');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'haptic-announcer';
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);
    }
    
    return liveRegion;
  }
}

// 主要的触觉反馈管理器类
export class HapticFeedbackManager {
  private static instance: HapticFeedbackManager | null = null;
  private preferences: HapticPreferences;
  private capabilities: DeviceCapabilities;
  private isInitialized = false;

  private constructor() {
    this.preferences = this.loadPreferences();
    this.capabilities = DeviceDetector.getCapabilities();
    this.initialize();
  }

  static getInstance(): HapticFeedbackManager {
    if (!this.instance) {
      this.instance = new HapticFeedbackManager();
    }
    return this.instance;
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // 监听偏好变化
    this.setupPreferencesWatcher();
    
    // 设置用户媒体查询监听
    this.setupMediaQueryListeners();
    
    // 清理节流状态
    ThrottleManager.clear();
    
    this.isInitialized = true;
  }

  private setupPreferencesWatcher(): void {
    // 监听存储变化
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        this.preferences = this.loadPreferences();
      }
    });
  }

  private setupMediaQueryListeners(): void {
    // 监听减少动画偏好
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addListener(() => {
      if (motionQuery.matches) {
        // 用户偏好减少动画，可能也不希望触觉反馈
        this.updatePreference('enabled', false);
      }
    });
  }

  // 触发触觉反馈
  async trigger(type: HapticType, options?: {
    force?: boolean;
    customPattern?: number | number[];
    announceToScreenReader?: boolean;
  }): Promise<boolean> {
    const config = HAPTIC_CONFIGS[type];
    const {
      force = false,
      customPattern,
      announceToScreenReader = false,
    } = options || {};

    // 检查是否应该触发
    if (!this.shouldTrigger(type, force)) {
      return false;
    }

    // 节流检查
    if (!force && !ThrottleManager.canTrigger(type, config.throttle)) {
      return false;
    }

    // 无障碍通知
    if (announceToScreenReader) {
      AccessibilityManager.announceHaptic(type);
    }

    // 执行触觉反馈
    const success = await this.executeHaptic(type, customPattern || config.pattern);
    
    if (success) {
      console.debug(`Haptic feedback triggered: ${type}`, { 
        pattern: customPattern || config.pattern,
        description: config.description,
      });
    }

    return success;
  }

  // 批量触发
  async triggerSequence(
    sequence: Array<{ type: HapticType; delay?: number }>,
    options?: { cancelOnFail?: boolean }
  ): Promise<boolean> {
    const { cancelOnFail = false } = options || {};
    let allSuccessful = true;

    for (let i = 0; i < sequence.length; i++) {
      const { type, delay = 0 } = sequence[i];
      
      if (delay > 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const success = await this.trigger(type, { force: true });
      
      if (!success) {
        allSuccessful = false;
        if (cancelOnFail) {
          break;
        }
      }
    }

    return allSuccessful;
  }

  private shouldTrigger(type: HapticType, force: boolean): boolean {
    // 强制触发
    if (force) return true;

    // 功能未启用
    if (!this.preferences.enabled) return false;

    // 设备不支持
    if (!DeviceDetector.canVibrate()) return false;

    // 类型被禁用
    if (this.preferences.disabledTypes.includes(type)) return false;

    // 静音模式检查
    if (this.preferences.silentModeOnly && !this.isInSilentMode()) {
      return false;
    }

    return true;
  }

  private async executeHaptic(
    type: HapticType,
    pattern: number | number[]
  ): Promise<boolean> {
    const config = HAPTIC_CONFIGS[type];
    let success = false;

    try {
      // iOS 触觉反馈
      if (this.capabilities.supportsIOSHaptic && config.iosType) {
        const HapticFeedback = (window as any).HapticFeedback;
        if (HapticFeedback && HapticFeedback[config.iosType]) {
          await HapticFeedback[config.iosType]();
          success = true;
        }
      }

      // Vibration API 后备方案
      if (!success && this.capabilities.supportsVibration) {
        const vibrationPattern = Array.isArray(pattern) ? pattern : [pattern];
        const adjustedPattern = vibrationPattern.map(
          duration => Math.round(duration * this.preferences.intensity)
        );
        
        navigator.vibrate(adjustedPattern);
        success = true;
      }
    } catch (error) {
      console.debug('Haptic feedback failed:', error);
    }

    return success;
  }

  private isInSilentMode(): boolean {
    // 这个检测在Web端很困难，使用启发式方法
    try {
      // 检查音频上下文状态
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const isSuspended = ctx.state === 'suspended';
        ctx.close();
        return isSuspended;
      }
    } catch (error) {
      console.debug('Cannot detect silent mode:', error);
    }

    // 默认返回 false
    return false;
  }

  // 偏好管理
  getPreferences(): HapticPreferences {
    return { ...this.preferences };
  }

  updatePreference<K extends keyof HapticPreferences>(
    key: K,
    value: HapticPreferences[K]
  ): void {
    this.preferences[key] = value;
    this.savePreferences();
  }

  updatePreferences(updates: Partial<HapticPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }

  resetPreferences(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
  }

  private loadPreferences(): HapticPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.debug('Failed to load haptic preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.debug('Failed to save haptic preferences:', error);
    }
  }

  // 设备信息获取
  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.capabilities };
  }

  // 测试功能
  async testHaptic(type: HapticType): Promise<boolean> {
    console.log(`Testing haptic feedback: ${type}`);
    return this.trigger(type, { 
      force: true, 
      announceToScreenReader: true,
    });
  }

  async testAllHaptics(): Promise<Record<HapticType, boolean>> {
    const results: Partial<Record<HapticType, boolean>> = {};
    
    for (const type of Object.keys(HAPTIC_CONFIGS) as HapticType[]) {
      results[type] = await this.testHaptic(type);
      // 在测试之间添加延迟
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results as Record<HapticType, boolean>;
  }

  // 清理资源
  dispose(): void {
    ThrottleManager.clear();
    this.isInitialized = false;
  }
}

// 导出单例实例和便捷函数
export const hapticManager = HapticFeedbackManager.getInstance();

// 便捷的触觉反馈函数
export const triggerHaptic = (
  type: HapticType,
  options?: Parameters<HapticFeedbackManager['trigger']>[1]
) => hapticManager.trigger(type, options);

// 预设的触觉反馈组合
export const hapticPresets = {
  // UI 交互
  buttonTap: () => triggerHaptic('light'),
  buttonLongPress: () => triggerHaptic('medium'),
  switchToggle: () => triggerHaptic('selection'),
  
  // 导航
  pageTransition: () => triggerHaptic('light'),
  tabSwitch: () => triggerHaptic('selection'),
  drawerOpen: () => triggerHaptic('medium'),
  
  // 反馈
  actionSuccess: () => triggerHaptic('success'),
  actionError: () => triggerHaptic('error'),
  actionWarning: () => triggerHaptic('warning'),
  
  // 通知
  newNotification: () => triggerHaptic('notification'),
  messageReceived: () => triggerHaptic('light'),
  
  // 列表操作
  itemSelect: () => triggerHaptic('selection'),
  itemDelete: () => triggerHaptic('warning'),
  listRefresh: () => triggerHaptic('medium'),
  
  // 表单
  inputFocus: () => triggerHaptic('light'),
  inputError: () => triggerHaptic('error'),
  formSubmit: () => triggerHaptic('success'),
} as const;

export default HapticFeedbackManager;