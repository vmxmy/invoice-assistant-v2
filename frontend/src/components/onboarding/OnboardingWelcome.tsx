import React from 'react';
import { Mail, Zap, Shield, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { OnboardingSteps } from './OnboardingSteps';

interface OnboardingWelcomeProps {
  onStartSetup: () => void;
}

export const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onStartSetup }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200/50 to-base-300/30 flex items-center justify-center p-4">
      <div className="card w-full max-w-5xl bg-base-100 shadow-2xl border border-base-300">
        <div className="card-body p-6 md:p-8">
          {/* 统一的引导步骤指示器 */}
          <div className="mb-8">
            <OnboardingSteps currentPhase="welcome" />
          </div>

          {/* 简洁欢迎内容 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              智能发票助手
            </h1>
            <p className="text-base text-base-content/70">
              发送邮件，AI 自动处理发票
            </p>
          </div>

          {/* 简化功能展示 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="card bg-primary/10 border-primary/20 h-24">
              <div className="card-body text-center p-3 flex flex-col justify-center">
                <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-bold text-sm">AI识别</h3>
              </div>
            </div>
            <div className="card bg-success/10 border-success/20 h-24">
              <div className="card-body text-center p-3 flex flex-col justify-center">
                <Shield className="w-8 h-8 text-success mx-auto mb-2" />
                <h3 className="font-bold text-sm">安全可靠</h3>
              </div>
            </div>
            <div className="card bg-info/10 border-info/20 h-24">
              <div className="card-body text-center p-3 flex flex-col justify-center">
                <Clock className="w-8 h-8 text-info mx-auto mb-2" />
                <h3 className="font-bold text-sm">秒级处理</h3>
              </div>
            </div>
          </div>

          {/* 简化流程预览 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-center mb-4">3步开始使用</h2>
            <div className="flex justify-center">
              <ul className="steps steps-vertical sm:steps-horizontal w-full max-w-2xl">
                <li className="step step-primary" data-content="1">设置转发</li>
                <li className="step step-primary" data-content="2">发送邮件</li>
                <li className="step step-primary" data-content="3">AI处理</li>
              </ul>
            </div>
          </div>

          {/* 开始设置按钮 */}
          <div className="text-center">
            <button 
              className="btn btn-primary btn-lg w-full sm:w-auto gap-2 shadow-lg hover:scale-105 transition-all"
              onClick={onStartSetup}
            >
              <ArrowRight className="w-5 h-5" />
              开始设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};