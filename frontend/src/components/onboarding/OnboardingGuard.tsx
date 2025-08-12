import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EmailForwardingSetup } from './EmailForwardingSetup';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // 使用 RPC 函数检查用户的引导状态（避免 RLS 权限问题）
      const { data, error } = await supabase
        .rpc('check_user_onboarding_status', { user_id: user.id });

      if (error) {
        console.error('检查引导状态失败:', error);
        // 权限错误时，默认不显示引导（让用户进入应用）
        setNeedsOnboarding(false);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const status = data[0];
        // 如果用户没有成功的邮件记录，显示邮件转发引导
        const hasNoSuccessfulEmails = status.has_successful_emails === 0;
        setNeedsOnboarding(hasNoSuccessfulEmails);
        
        console.log('🔍 [OnboardingGuard] 引导状态检查:', {
          userId: user.id,
          hasCompletedSetup: status.has_completed_setup,
          successfulEmails: status.has_successful_emails,
          needsOnboarding: hasNoSuccessfulEmails
        });
      } else {
        // 没有数据，显示引导
        setNeedsOnboarding(true);
        console.log('🔍 [OnboardingGuard] 新用户，显示引导');
      }
    } catch (error) {
      console.error('检查引导状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    // 可以选择刷新页面或导航到特定页面
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (needsOnboarding) {
    return <EmailForwardingSetup onComplete={handleOnboardingComplete} />;
  }

  return <>{children}</>;
};