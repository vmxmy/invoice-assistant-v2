import React, { useState } from 'react';
import { Mail, FileText, Send, CheckCircle, Info, Copy, ArrowRight, Zap, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { OnboardingSteps } from '../onboarding/OnboardingSteps';

export const EmptyStateGuide: React.FC = () => {
  const { user } = useAuth();
  const [copySuccess, setCopySuccess] = useState(false);
  const userEmail = user?.email || '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(userEmail);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="hero min-h-screen">
      <div className="hero-content text-center px-4">
        <div className="w-full max-w-4xl">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-content rounded-full w-16 h-16 flex items-center justify-center">
              <Mail className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">智能发票助手</h1>
          <p className="py-6 text-sm sm:text-base">发送邮件，AI 自动处理发票</p>
          
          <ul className="steps steps-vertical sm:steps-horizontal mb-8 w-full">
            <li className="step step-primary">准备邮件</li>
            <li className="step step-primary">发送</li>
            <li className="step step-primary">AI处理</li>
          </ul>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title justify-center">
                  <Mail className="w-5 h-5" />
                  准备邮件
                </h2>
                <div className="text-sm space-y-1">
                  <p>主题包含"发票"关键字</p>
                  <p>附件：PDF文件</p>
                </div>
              </div>
            </div>
            
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title justify-center">
                  <Send className="w-5 h-5" />
                  发送到
                </h2>
                <div className="join w-full">
                  <input
                    type="text"
                    value={userEmail}
                    className="input input-bordered join-item flex-1 text-xs sm:text-sm"
                    readOnly
                  />
                  <button
                    className="btn join-item"
                    onClick={copyToClipboard}
                    title={copySuccess ? "已复制" : "复制邮箱"}
                  >
                    {copySuccess ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title justify-center">
                  <Zap className="w-5 h-5" />
                  AI 处理
                </h2>
                <div className="text-sm space-y-1">
                  <p>自动提取关键信息</p>
                  <p>智能分类归档</p>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            className="btn btn-primary w-full sm:w-auto"
            onClick={() => window.location.href = `mailto:${userEmail}?subject=发票`}
          >
            <Send className="w-5 h-5" />
            发送第一封发票邮件
          </button>
        </div>
      </div>
    </div>
  );
};