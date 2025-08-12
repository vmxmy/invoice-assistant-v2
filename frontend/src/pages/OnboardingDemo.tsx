import React, { useState } from 'react';
import { OnboardingSteps } from '../components/onboarding/OnboardingSteps';
import { OnboardingWelcome } from '../components/onboarding/OnboardingWelcome';
import { EmailForwardingSetup } from '../components/onboarding/EmailForwardingSetup';

export const OnboardingDemo: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState<'demo' | 'welcome' | 'setup' | 'complete'>('demo');
  const [setupStep, setSetupStep] = useState(1);

  const handleStartSetup = () => {
    setCurrentPhase('setup');
    setSetupStep(1);
  };

  const handleSetupComplete = () => {
    setCurrentPhase('complete');
  };

  if (currentPhase === 'welcome') {
    return <OnboardingWelcome onStartSetup={handleStartSetup} />;
  }

  if (currentPhase === 'setup') {
    return <EmailForwardingSetup onComplete={handleSetupComplete} />;
  }

  if (currentPhase === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-2xl">
          <div className="card-body text-center">
            <OnboardingSteps currentPhase="complete" />
            <h1 className="text-3xl font-bold text-success mb-4">🎉 引导流程完成！</h1>
            <p className="text-base-content/70 mb-6">
              所有步骤组件已成功集成 DaisyUI 标准样式
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentPhase('demo')}
            >
              返回演示
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 演示页面
  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">DaisyUI Steps 组件演示</h1>
          <p className="text-base-content/70">
            展示引导流程中使用的标准 DaisyUI steps 组件
          </p>
        </div>

        <div className="space-y-8">
          {/* 完整引导流程指示器 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">完整引导流程指示器</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">欢迎阶段</h3>
                  <OnboardingSteps currentPhase="welcome" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">设置阶段 - 步骤 1</h3>
                  <OnboardingSteps currentPhase="setup" currentStep={1} />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">设置阶段 - 步骤 2</h3>
                  <OnboardingSteps currentPhase="setup" currentStep={2} />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">设置阶段 - 步骤 3</h3>
                  <OnboardingSteps currentPhase="setup" currentStep={3} />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">完成阶段</h3>
                  <OnboardingSteps currentPhase="complete" />
                </div>
              </div>
            </div>
          </div>

          {/* 基础 Steps 样式展示 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">基础 DaisyUI Steps 样式</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">水平步骤 - 默认</h3>
                  <ul className="steps">
                    <li className="step">登录</li>
                    <li className="step step-primary">选择计划</li>
                    <li className="step">购买</li>
                    <li className="step">接收产品</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">水平步骤 - 带数字内容</h3>
                  <ul className="steps">
                    <li className="step step-primary" data-content="✓">登录</li>
                    <li className="step step-primary" data-content="2">选择计划</li>
                    <li className="step" data-content="3">购买</li>
                    <li className="step" data-content="4">接收</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">水平步骤 - 多色彩</h3>
                  <ul className="steps">
                    <li className="step step-info" data-content="1">开始</li>
                    <li className="step step-info" data-content="2">进行中</li>
                    <li className="step step-success" data-content="✓">完成</li>
                    <li className="step step-error" data-content="✕">取消</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">垂直步骤</h3>
                  <ul className="steps steps-vertical">
                    <li className="step step-primary">
                      <div>
                        <div className="font-semibold">配置环境</div>
                        <div className="text-sm text-base-content/60">设置开发环境</div>
                      </div>
                    </li>
                    <li className="step step-primary">
                      <div>
                        <div className="font-semibold">编写代码</div>
                        <div className="text-sm text-base-content/60">实现功能逻辑</div>
                      </div>
                    </li>
                    <li className="step">
                      <div>
                        <div className="font-semibold">测试部署</div>
                        <div className="text-sm text-base-content/60">验证功能正确性</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 交互式演示 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">交互式步骤演示</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">当前步骤: {setupStep}</h3>
                  <ul className="steps">
                    <li className={`step ${setupStep >= 1 ? 'step-primary' : ''}`} data-content={setupStep > 1 ? "✓" : "1"}>
                      步骤 1
                    </li>
                    <li className={`step ${setupStep >= 2 ? 'step-primary' : ''}`} data-content={setupStep > 2 ? "✓" : "2"}>
                      步骤 2
                    </li>
                    <li className={`step ${setupStep >= 3 ? 'step-primary' : ''}`} data-content={setupStep >= 3 ? "✓" : "3"}>
                      步骤 3
                    </li>
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => setSetupStep(Math.max(1, setupStep - 1))}
                    disabled={setupStep === 1}
                  >
                    上一步
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => setSetupStep(Math.min(3, setupStep + 1))}
                    disabled={setupStep === 3}
                  >
                    下一步
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 完整流程演示按钮 */}
          <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <div className="card-body text-center">
              <h2 className="card-title justify-center mb-4">体验完整引导流程</h2>
              <p className="text-base-content/70 mb-6">
                点击下面的按钮体验完整的用户引导流程
              </p>
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => setCurrentPhase('welcome')}
              >
                开始引导流程
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};