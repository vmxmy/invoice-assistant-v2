/**
 * 动画系统演示页面
 * 展示完整的动画系统功能和性能
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AnimatedButton,
  AnimatedCard,
  AnimatedList,
  AnimatedInput,
  LoadingIndicator,
  Skeleton,
  CardSkeleton,
  LoadingState,
  FeedbackToast,
  PageTransitions,
  usePageTransition,
  AnimatedToggle,
  CounterAnimation,
  AddItemAnimation,
  SearchHighlight,
  EmptyStateAnimation,
  ListItemData,
  LoadingState as LoadingStateType
} from '../animations/index';

import { useAnimationContext } from '../animations/AnimationProvider';
import { AnimationSettings } from '../components/settings/AnimationSettings';

// 演示数据
const demoListItems: ListItemData[] = [
  {
    id: '1',
    content: (
      <div className="p-4">
        <h3 className="font-semibold mb-2">发票 #INV-001</h3>
        <p className="text-gray-600 text-sm">客户：阿里巴巴集团</p>
        <p className="text-gray-600 text-sm">金额：¥15,680</p>
      </div>
    )
  },
  {
    id: '2',
    content: (
      <div className="p-4">
        <h3 className="font-semibold mb-2">发票 #INV-002</h3>
        <p className="text-gray-600 text-sm">客户：腾讯科技</p>
        <p className="text-gray-600 text-sm">金额：¥28,950</p>
      </div>
    )
  },
  {
    id: '3',
    content: (
      <div className="p-4">
        <h3 className="font-semibold mb-2">发票 #INV-003</h3>
        <p className="text-gray-600 text-sm">客户：字节跳动</p>
        <p className="text-gray-600 text-sm">金额：¥42,000</p>
      </div>
    )
  }
];

/**
 * 按钮动画演示
 */
const ButtonDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const handleClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowToast(true);
    }, 2000);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">按钮动画</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <AnimatedButton variant="primary" onClick={handleClick} loading={loading}>
          主要按钮
        </AnimatedButton>
        <AnimatedButton variant="secondary" onClick={() => {}}>
          次要按钮
        </AnimatedButton>
        <AnimatedButton variant="ghost" onClick={() => {}}>
          幽灵按钮
        </AnimatedButton>
        <AnimatedButton variant="danger" onClick={() => {}}>
          危险按钮
        </AnimatedButton>
      </div>
      
      <FeedbackToast
        type="success"
        message="操作执行成功！"
        visible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

/**
 * 卡片动画演示
 */
const CardDemo: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">卡片动画</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((index) => (
          <AnimatedCard
            key={index}
            interactive
            elevated={selectedCard === index}
            onClick={() => setSelectedCard(selectedCard === index ? null : index)}
            className="p-6"
          >
            <h4 className="font-semibold mb-2">交互卡片 #{index}</h4>
            <p className="text-gray-600 text-sm mb-3">
              点击选中此卡片，体验悬浮和点击动画效果
            </p>
            {selectedCard === index && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-blue-600 text-sm font-medium"
              >
                ✓ 已选中
              </motion.div>
            )}
          </AnimatedCard>
        ))}
      </div>
    </div>
  );
};

/**
 * 列表动画演示
 */
const ListDemo: React.FC = () => {
  const [items, setItems] = useState(demoListItems);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredItems = items.filter(item =>
    item.content?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const addItem = () => {
    const newItem: ListItemData = {
      id: `new-${Date.now()}`,
      content: (
        <AddItemAnimation>
          <div className="p-4">
            <h3 className="font-semibold mb-2">新发票 #INV-{String(items.length + 1).padStart(3, '0')}</h3>
            <p className="text-gray-600 text-sm">客户：新客户</p>
            <p className="text-gray-600 text-sm">金额：¥0</p>
          </div>
        </AddItemAnimation>
      )
    };
    
    setItems(prev => [...prev, newItem]);
  };
  
  const removeItem = (item: ListItemData) => {
    setItems(prev => prev.filter(i => i.id !== item.id));
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">列表动画</h3>
        <AnimatedButton variant="primary" onClick={addItem}>
          添加项目
        </AnimatedButton>
      </div>
      
      <AnimatedInput
        placeholder="搜索发票..."
        value={searchTerm}
        onChange={setSearchTerm}
      />
      
      {filteredItems.length > 0 ? (
        <AnimatedList
          items={filteredItems.map(item => ({
            ...item,
            content: (
              <SearchHighlight
                text={item.content?.toString() || ''}
                searchTerm={searchTerm}
              />
            )
          }))}
          config={{
            type: 'staggered',
            enableReordering: true
          }}
          onItemRemove={removeItem}
          renderItem={(item, index) => (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {item.content}
            </div>
          )}
        />
      ) : (
        <EmptyStateAnimation
          icon="📄"
          title="没有找到发票"
          description="试试调整搜索条件或添加新的发票项目"
          action={
            <AnimatedButton variant="ghost" onClick={() => setSearchTerm('')}>
              清除搜索
            </AnimatedButton>
          }
        />
      )}
    </div>
  );
};

/**
 * 加载状态演示
 */
const LoadingDemo: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingStateType>('idle');
  const [counter, setCounter] = useState(0);
  
  const simulateLoading = () => {
    setLoadingState('loading');
    
    setTimeout(() => {
      if (Math.random() > 0.3) {
        setLoadingState('success');
        setCounter(prev => prev + 1);
      } else {
        setLoadingState('error');
      }
    }, 2000);
  };
  
  const retry = () => {
    simulateLoading();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">加载状态动画</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            成功次数: <CounterAnimation from={counter - 1} to={counter} />
          </span>
          <AnimatedButton 
            variant="primary" 
            onClick={simulateLoading}
            disabled={loadingState === 'loading'}
          >
            开始加载
          </AnimatedButton>
        </div>
      </div>
      
      {/* 加载指示器样式 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center space-y-2">
          <LoadingIndicator type="spinner" size="medium" />
          <p className="text-sm text-gray-600">旋转加载</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingIndicator type="dots" size="medium" />
          <p className="text-sm text-gray-600">点阵加载</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingIndicator type="pulse" size="medium" />
          <p className="text-sm text-gray-600">脉冲加载</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingIndicator type="wave" size="medium" />
          <p className="text-sm text-gray-600">波浪加载</p>
        </div>
      </div>
      
      {/* 骨架屏演示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">基础骨架屏</h4>
          <Skeleton config={{ lines: 4, avatar: true, showShimmer: true }} />
        </div>
        <div>
          <h4 className="font-medium mb-2">卡片骨架屏</h4>
          <CardSkeleton />
        </div>
      </div>
      
      {/* 状态演示 */}
      <LoadingState
        state={loadingState}
        loadingText="正在处理请求..."
        successText="操作成功完成"
        errorText="操作执行失败"
        onRetry={retry}
      >
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">内容加载完成</p>
        </div>
      </LoadingState>
    </div>
  );
};

/**
 * 表单动画演示
 */
const FormDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    enabled: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validateField = (name: string, value: any) => {
    const newErrors = { ...errors };
    
    if (name === 'name' && !value) {
      newErrors.name = '姓名不能为空';
    } else if (name === 'name') {
      delete newErrors.name;
    }
    
    if (name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      newErrors.email = '邮箱格式不正确';
    } else if (name === 'email' && !value) {
      newErrors.email = '邮箱不能为空';
    } else if (name === 'email') {
      delete newErrors.email;
    }
    
    setErrors(newErrors);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">表单动画</h3>
      
      <div className="max-w-md space-y-4">
        <AnimatedInput
          placeholder="姓名"
          value={formData.name}
          onChange={(value) => {
            setFormData(prev => ({ ...prev, name: value }));
            validateField('name', value);
          }}
          error={errors.name}
          success={formData.name && !errors.name}
        />
        
        <AnimatedInput
          type="email"
          placeholder="邮箱地址"
          value={formData.email}
          onChange={(value) => {
            setFormData(prev => ({ ...prev, email: value }));
            validateField('email', value);
          }}
          error={errors.email}
          success={formData.email && !errors.email}
        />
        
        <div className="flex items-center space-x-3">
          <AnimatedToggle
            checked={formData.enabled}
            onChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
          />
          <span className="text-sm">启用通知</span>
        </div>
      </div>
    </div>
  );
};

/**
 * 主演示页面
 */
export const AnimationDemoPage: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState('buttons');
  const [showSettings, setShowSettings] = useState(false);
  const { isAnimationEnabled, shouldUseSimpleAnimations } = useAnimationContext();
  
  const demos = {
    buttons: <ButtonDemo />,
    cards: <CardDemo />,
    lists: <ListDemo />,
    loading: <LoadingDemo />,
    forms: <FormDemo />
  };
  
  const demoNames = {
    buttons: '按钮动画',
    cards: '卡片动画',
    lists: '列表动画',
    loading: '加载动画',
    forms: '表单动画'
  };
  
  if (showSettings) {
    return (
      <PageTransitions config={{ type: 'slideVertical' }}>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <AnimatedButton 
                variant="ghost" 
                onClick={() => setShowSettings(false)}
              >
                ← 返回演示
              </AnimatedButton>
            </div>
            <AnimationSettings />
          </div>
        </div>
      </PageTransitions>
    );
  }
  
  return (
    <PageTransitions config={{ type: 'fade' }}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* 标题和状态 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              高性能动画系统演示
            </h1>
            <p className="text-gray-600 mb-6">
              体验60fps流畅动画，支持用户偏好和无障碍访问
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className={`flex items-center space-x-1 ${isAnimationEnabled('micro') ? 'text-green-600' : 'text-red-600'}`}>
                <span>{isAnimationEnabled('micro') ? '✅' : '❌'}</span>
                <span>动画状态</span>
              </div>
              <div className={`flex items-center space-x-1 ${shouldUseSimpleAnimations ? 'text-yellow-600' : 'text-blue-600'}`}>
                <span>{shouldUseSimpleAnimations ? '⚡' : '🚀'}</span>
                <span>{shouldUseSimpleAnimations ? '简化模式' : '完整模式'}</span>
              </div>
              <AnimatedButton 
                variant="ghost" 
                onClick={() => setShowSettings(true)}
                className="text-sm"
              >
                动画设置
              </AnimatedButton>
            </div>
          </motion.div>
          
          {/* 导航标签 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mb-8"
          >
            <div className="bg-white rounded-lg p-1 shadow-sm">
              {Object.entries(demoNames).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => setCurrentDemo(key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentDemo === key
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </motion.div>
          
          {/* 演示内容 */}
          <motion.div
            key={currentDemo}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-lg shadow-sm p-8"
          >
            {demos[currentDemo as keyof typeof demos]}
          </motion.div>
          
          {/* 性能提示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center text-sm text-gray-500"
          >
            <p>
              动画系统自动根据设备性能和用户偏好调整，确保最佳体验。
              在开发者工具中查看性能指标。
            </p>
          </motion.div>
        </div>
      </div>
    </PageTransitions>
  );
};

export default AnimationDemoPage;