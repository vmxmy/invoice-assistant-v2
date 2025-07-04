// React + Supabase 用户注册完整示例
// 文件: src/auth/SignUp.jsx

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = 'https://sfenhhtvcyslxplvewmt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE';

const supabase = createClient(supabaseUrl, supabaseKey);

const SignUp = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1); // 1: 注册, 2: 邮箱验证, 3: 完成

  // 第1步: Supabase Auth 注册
  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setMessage('密码不匹配');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 通过Supabase注册用户
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.displayName,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setMessage('注册成功！请检查邮箱并点击确认链接。');
        setStep(2);
        
        // 开始监听认证状态变化
        monitorAuthState();
      }
    } catch (error) {
      setMessage(`注册失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 第2步: 监听邮箱确认
  const monitorAuthState = () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          console.log('用户已登录，创建Profile...');
          await createUserProfile(session.access_token);
          setStep(3);
        }
      }
    );

    // 清理监听器
    return () => subscription.unsubscribe();
  };

  // 第3步: 创建用户Profile
  const createUserProfile = async (accessToken) => {
    try {
      const response = await fetch('http://localhost:8090/api/v1/profiles/me', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: formData.displayName,
          bio: '新用户',
        }),
      });

      if (response.ok) {
        const profile = await response.json();
        console.log('Profile创建成功:', profile);
        setMessage('账户设置完成！欢迎使用发票助手。');
      } else {
        const error = await response.json();
        console.error('Profile创建失败:', error);
        setMessage('账户创建成功，但Profile设置失败，请稍后重试。');
      }
    } catch (error) {
      console.error('Profile创建错误:', error);
      setMessage('网络错误，请检查连接。');
    }
  };

  // 重新发送确认邮件
  const resendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email
      });

      if (error) throw error;
      setMessage('确认邮件已重新发送！');
    } catch (error) {
      setMessage(`发送失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 渲染不同步骤的UI
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleSignUp} className="space-y-4">
            <h2 className="text-2xl font-bold text-center">用户注册</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                显示名称
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="您的姓名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength="8"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="至少8位字符"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                确认密码
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="再次输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '注册中...' : '创建账户'}
            </button>
          </form>
        );

      case 2:
        return (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">验证邮箱</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-blue-800">
                我们已向 <strong>{formData.email}</strong> 发送确认邮件。
              </p>
              <p className="text-blue-600 text-sm mt-2">
                请检查邮箱并点击确认链接以完成注册。
              </p>
            </div>
            
            <button
              onClick={resendConfirmation}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              {loading ? '发送中...' : '重新发送确认邮件'}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-4">
            <div className="text-green-600 text-6xl">✓</div>
            <h2 className="text-2xl font-bold text-green-800">注册成功！</h2>
            <p className="text-gray-600">
              欢迎使用发票助手！您现在可以开始上传和管理发票了。
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              进入系统
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          {renderStep()}
          
          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes('成功') || message.includes('完成') 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            已有账户？{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-800">
              立即登录
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;