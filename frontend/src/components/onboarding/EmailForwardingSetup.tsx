import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CheckCircle, Mail, Copy, ExternalLink, Loader, ArrowRight, Shield, Zap, Settings } from 'lucide-react';
import { OnboardingSteps } from './OnboardingSteps';

interface EmailForwardingSetupProps {
  onComplete?: () => void;
}

export const EmailForwardingSetup: React.FC<EmailForwardingSetupProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const forwardingEmail = 'emhit51ljg3c041@upload.pipedream.net';

  useEffect(() => {
    if (user?.email) {
      setUserEmail(user.email);
    }
  }, [user]);

  // 实时订阅用户状态变化
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('onboarding-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `auth_user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.forwarding_setup_completed_at) {
            // 自动完成引导流程
            setTimeout(() => {
              onComplete?.();
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onComplete]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(forwardingEmail);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const checkSetupStatus = async () => {
    setIsChecking(true);
    try {
      // 使用 RPC 函数检查用户状态（避免 RLS 问题）
      const { data, error } = await supabase
        .rpc('check_user_onboarding_status', { user_id: user?.id });

      if (error) throw error;

      if (data && data.length > 0) {
        const status = data[0];
        
        // 如果已经完成设置或有成功的邮件
        if (status.has_completed_setup || status.has_successful_emails > 0) {
          setCurrentStep(3);
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        } else {
          // 显示提示信息
          alert('暂未检测到转发成功的邮件，请确保已完成邮箱转发设置并发送了测试邮件。');
        }
      } else {
        alert('无法获取用户状态，请稍后重试。');
      }
    } catch (error) {
      console.error('检查状态失败:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="hero min-h-screen">
      <div className="hero-content text-center px-4">
        <div className="w-full max-w-4xl">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-content rounded-full w-16 h-16 flex items-center justify-center">
              <Settings className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">邮件转发设置</h1>
          <p className="py-6 text-sm sm:text-base">配置转发规则，开始使用</p>

          <ul className="steps steps-vertical sm:steps-horizontal mb-8 w-full">
            <li className={`step ${currentStep >= 1 ? 'step-primary' : ''}`}>复制地址</li>
            <li className={`step ${currentStep >= 2 ? 'step-primary' : ''}`}>设置规则</li>
            <li className={`step ${currentStep >= 3 ? 'step-primary' : ''}`}>验证转发</li>
          </ul>

          {/* 步骤内容 */}
          {currentStep === 1 && (
            <div className="card bg-base-100 shadow-xl mb-6">
              <div className="card-body">
                <h2 className="card-title justify-center">
                  <Mail className="w-5 h-5" />
                  转发地址
                </h2>
                <div className="join w-full">
                  <input
                    type="text"
                    value={forwardingEmail}
                    className="input input-bordered join-item flex-1 text-xs sm:text-sm font-mono"
                    readOnly
                  />
                  <button
                    className={`btn join-item ${copySuccess ? 'text-success' : ''}`}
                    onClick={copyToClipboard}
                    title={copySuccess ? "已复制" : "复制地址"}
                  >
                    {copySuccess ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-sm space-y-1 mt-4">
                  <p>在邮箱中设置转发规则</p>
                  <p>主题包含"发票"关键字</p>
                </div>
                <button
                  className="btn btn-primary w-full sm:w-auto mt-4"
                  onClick={() => setCurrentStep(2)}
                >
                  下一步
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="card bg-base-100 shadow-xl mb-6">
              <div className="card-body">
                <h2 className="card-title justify-center">
                  <Settings className="w-5 h-5" />
                  设置转发规则
                </h2>
                <div className="text-sm space-y-3 mb-4">
                  <div className="alert">
                    <p className="font-semibold">请在您的邮箱中完成以下设置：</p>
                  </div>
                  <div className="space-y-2">
                    <p>1. 打开邮箱设置</p>
                    <p>2. 找到"过滤器"或"规则"设置</p>
                    <p>3. 创建新规则：主题包含"发票"</p>
                    <p>4. 设置操作：转发到第一步的地址</p>
                    <p>5. 保存规则并确认激活</p>
                  </div>
                  <div className="divider">设置完成后</div>
                  <p className="text-center">发送测试邮件验证转发是否正常</p>
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    className="btn btn-ghost"
                    onClick={() => setCurrentStep(1)}
                  >
                    返回
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setCurrentStep(3)}
                  >
                    下一步
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="card bg-base-100 shadow-xl mb-6">
              <div className="card-body">
                <h2 className="card-title justify-center">
                  <Mail className="w-5 h-5" />
                  验证转发
                </h2>
                <div className="text-sm space-y-3 mb-4">
                  <p className="text-center font-semibold">发送测试邮件验证转发功能</p>
                  <div className="mockup-code">
                    <pre data-prefix="收件人:"><code>{userEmail}</code></pre>
                    <pre data-prefix="主题:"><code>测试发票转发</code></pre>
                    <pre data-prefix="内容:"><code>这是一封测试邮件</code></pre>
                  </div>
                  <button 
                    className="btn btn-outline w-full"
                    onClick={() => window.location.href = `mailto:${userEmail}?subject=测试发票转发&body=这是一封测试邮件，用于验证转发规则是否正常工作。`}
                  >
                    <Mail className="w-4 h-4" />
                    发送测试邮件
                  </button>
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    className="btn btn-ghost"
                    onClick={() => setCurrentStep(2)}
                  >
                    返回
                  </button>
                  <button
                    className={`btn btn-primary ${isChecking ? 'loading' : ''}`}
                    onClick={checkSetupStatus}
                    disabled={isChecking}
                  >
                    {isChecking ? '检查中...' : '完成设置'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};