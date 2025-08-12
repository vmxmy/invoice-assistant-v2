import React from 'react';
import { CheckCircle, Mail, Settings, Zap } from 'lucide-react';

interface OnboardingStepsProps {
  currentPhase: 'welcome' | 'setup' | 'test' | 'complete';
  currentStep?: number;
  totalSteps?: number;
}

export const OnboardingSteps: React.FC<OnboardingStepsProps> = ({ 
  currentPhase, 
  currentStep = 1, 
  totalSteps = 3 
}) => {
  const getPhaseStatus = (phase: string) => {
    const phases = ['welcome', 'setup', 'test', 'complete'];
    const currentIndex = phases.indexOf(currentPhase);
    const phaseIndex = phases.indexOf(phase);
    
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStepIcon = (phase: string) => {
    switch (phase) {
      case 'welcome': return <Mail className="w-4 h-4" />;
      case 'setup': return <Settings className="w-4 h-4" />;
      case 'test': return <Zap className="w-4 h-4" />;
      case 'complete': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStepTitle = (phase: string) => {
    switch (phase) {
      case 'welcome': return '欢迎使用';
      case 'setup': return '邮件设置';
      case 'test': return '测试验证';
      case 'complete': return '设置完成';
      default: return '';
    }
  };

  const getStepDescription = (phase: string) => {
    switch (phase) {
      case 'welcome': return '了解功能特性';
      case 'setup': return '配置邮件转发';
      case 'test': return '验证配置正确';
      case 'complete': return '开始使用系统';
      default: return '';
    }
  };

  return (
    <div className="w-full">
      {/* 主要引导步骤 */}
      <div className="flex justify-center mb-6">
        <ul className="steps steps-horizontal w-full max-w-4xl">
          {['welcome', 'setup', 'test', 'complete'].map((phase) => {
            const status = getPhaseStatus(phase);
            return (
              <li 
                key={phase}
                className={`step ${
                  status === 'completed' ? 'step-primary' :
                  status === 'active' ? 'step-primary' : 'step-neutral'
                }`}
                data-content={status === 'completed' ? "✓" : ""}
              >
                <div className="step-content text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {getStepIcon(phase)}
                    <span className="hidden sm:inline text-sm font-medium">
                      {getStepTitle(phase)}
                    </span>
                    <span className="sm:hidden text-xs">
                      {getStepTitle(phase).slice(0, 2)}
                    </span>
                  </div>
                  <div className="hidden md:block text-xs text-base-content/60">
                    {getStepDescription(phase)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 当前阶段的子步骤（如果是 setup 阶段）*/}
      {currentPhase === 'setup' && (
        <div className="mb-6">
          <div className="text-center mb-4">
            <div className="text-sm font-medium text-base-content/80">
              邮件设置进度
            </div>
          </div>
          <div className="flex justify-center">
            <ul className="steps steps-horizontal w-full max-w-2xl">
              <li className={`step ${currentStep >= 1 ? 'step-secondary' : 'step-neutral'}`} 
                  data-content={currentStep > 1 ? "✓" : "1"}>
                <span className="text-xs">配置转发</span>
              </li>
              <li className={`step ${currentStep >= 2 ? 'step-secondary' : 'step-neutral'}`} 
                  data-content={currentStep > 2 ? "✓" : "2"}>
                <span className="text-xs">确认设置</span>
              </li>
              <li className={`step ${currentStep >= 3 ? 'step-secondary' : 'step-neutral'}`} 
                  data-content={currentStep >= 3 ? "✓" : "3"}>
                <span className="text-xs">完成配置</span>
              </li>
            </ul>
          </div>
          <div className="text-center mt-2">
            <div className="text-xs text-base-content/50">
              步骤 {currentStep} / {totalSteps}
            </div>
          </div>
        </div>
      )}

      {/* 整体进度指示 */}
      <div className="flex justify-center">
        <div className="bg-base-200 rounded-full px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <div className="flex items-center gap-1">
              {currentPhase === 'welcome' && <Mail className="w-4 h-4 text-primary" />}
              {currentPhase === 'setup' && <Settings className="w-4 h-4 text-primary animate-spin" />}
              {currentPhase === 'test' && <Zap className="w-4 h-4 text-warning" />}
              {currentPhase === 'complete' && <CheckCircle className="w-4 h-4 text-success" />}
              <span className="font-medium">
                {getStepTitle(currentPhase)}
              </span>
            </div>
            {currentPhase === 'setup' && (
              <span className="text-xs">
                ({currentStep}/{totalSteps})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};