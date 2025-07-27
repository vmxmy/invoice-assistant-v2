/**
 * 测试移动端视图显示效果
 */

// 测试日志
const log = (message: string, data?: any) => {
  console.log(`[移动端视图测试] ${message}`, data || '');
};

// 模拟移动端视口
export const simulateMobileView = () => {
  log('=== 开始测试移动端视图 ===');
  
  // 获取当前视口信息
  const currentViewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  log('当前视口尺寸:', currentViewport);
  
  // 检查分类标签
  const categoryBadges = document.querySelectorAll('.badge-primary');
  log(`找到 ${categoryBadges.length} 个分类标签`);
  
  categoryBadges.forEach((badge, index) => {
    const rect = badge.getBoundingClientRect();
    const parent = badge.parentElement?.getBoundingClientRect();
    
    log(`分类标签 ${index + 1}:`, {
      text: badge.textContent,
      width: rect.width,
      parentWidth: parent?.width,
      isOverflowing: parent && rect.right > parent.right
    });
  });
  
  // 检查发票卡片
  const invoiceCards = document.querySelectorAll('.card');
  log(`找到 ${invoiceCards.length} 个发票卡片`);
  
  // 检查文字截断
  const truncatedElements = document.querySelectorAll('.truncate, .break-all');
  log(`找到 ${truncatedElements.length} 个文字处理元素`);
  
  // 检查响应式类
  const responsiveClasses = [
    'sm:', 'md:', 'lg:', 'xl:'
  ];
  
  const elementsWithResponsive = [];
  responsiveClasses.forEach(prefix => {
    const elements = document.querySelectorAll(`[class*="${prefix}"]`);
    if (elements.length > 0) {
      elementsWithResponsive.push({
        prefix,
        count: elements.length
      });
    }
  });
  
  log('响应式类使用情况:', elementsWithResponsive);
  
  // 建议
  log('\n📱 移动端优化建议:');
  if (currentViewport.width < 768) {
    log('- 当前处于移动端视图');
    log('- 检查所有文字是否正确换行或截断');
    log('- 确保按钮和交互元素有足够的点击区域');
    log('- 验证卡片布局是否正确堆叠');
  } else {
    log('- 当前处于桌面视图');
    log('- 请调整浏览器窗口到移动端尺寸（<768px）进行测试');
  }
  
  return {
    viewport: currentViewport,
    categoryBadges: categoryBadges.length,
    invoiceCards: invoiceCards.length,
    truncatedElements: truncatedElements.length,
    isMobile: currentViewport.width < 768
  };
};

// 检查特定元素的溢出情况
export const checkElementOverflow = (selector: string) => {
  const elements = document.querySelectorAll(selector);
  const overflowingElements = [];
  
  elements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement?.getBoundingClientRect();
    
    if (parent && (rect.right > parent.right || rect.width > parent.width)) {
      overflowingElements.push({
        index,
        text: element.textContent,
        elementWidth: rect.width,
        parentWidth: parent.width,
        overflow: rect.right - parent.right
      });
    }
  });
  
  if (overflowingElements.length > 0) {
    log(`⚠️ 发现 ${overflowingElements.length} 个溢出元素:`, overflowingElements);
  } else {
    log('✅ 没有发现溢出元素');
  }
  
  return overflowingElements;
};

// 导出到 window 对象
if (typeof window !== 'undefined') {
  (window as any).simulateMobileView = simulateMobileView;
  (window as any).checkElementOverflow = checkElementOverflow;
  log('移动端测试函数已加载:');
  log('- simulateMobileView() - 检查移动端视图');
  log('- checkElementOverflow(".badge") - 检查特定元素溢出');
}