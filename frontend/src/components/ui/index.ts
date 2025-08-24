/**
 * 统一触摸反馈系统导出
 * 提供完整的触摸反馈解决方案
 */

// 核心组件
export { RippleEffect, RippleButton, ripplePresets } from './RippleEffect';
export { LongPressHandler, LongPressButton } from './LongPressHandler';
export { 
  TouchFeedbackWrapper,
  TouchButton,
  TouchCard,
  TouchListItem,
  TouchNavItem,
} from './TouchFeedbackWrapper';
export { TouchFeedbackSettings } from './TouchFeedbackSettings';

// Hooks
export { 
  useTouchFeedback,
  touchFeedbackPresets,
  type TouchFeedbackConfig,
  type TouchFeedbackHandlers,
  type TouchFeedbackState,
} from '../../hooks/useTouchFeedback';

// 服务和管理器
export { 
  HapticFeedbackManager,
  hapticManager,
  triggerHaptic,
  hapticPresets,
  type HapticType,
} from '../../services/hapticFeedbackManager';

// 优化工具
export {
  touchFeedbackOptimizer,
  registerRipple,
  unregisterRipple,
  registerLongPress,
  unregisterLongPress,
  registerHapticTrigger,
  usePerformanceMonitoring,
  PerformanceLevel,
  type PerformanceMetrics,
  type OptimizationRecommendation,
  type DevicePerformance,
} from '../../utils/touchFeedbackOptimization';

// 无障碍工具
export {
  accessibilityManager,
  announceTouch,
  announceLongPress,
  announceHaptic,
  enhanceAccessibility,
  handleKeyboard,
  type AccessibilityConfig,
  type AccessibilityEvent,
} from '../../utils/touchFeedbackAccessibility';