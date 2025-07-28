import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, Shield, Trash2, Camera } from 'lucide-react';
import { useProfile, useUpdateProfile, useSession } from "../contexts/SupabaseAuthContext"
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';

const AccountSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  
  // 个人资料表单状态
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // 密码修改表单状态
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isDeleting, setIsDeleting] = useState(false);

  // 初始化表单数据
  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  // 处理头像选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 保存个人资料
  const handleSaveProfile = async () => {
    try {
      let avatarUrl = profile?.avatar_url;
      
      // 如果有新头像，先上传
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('user-assets')
          .upload(filePath, avatarFile);
          
        if (uploadError) throw uploadError;
        
        // 获取公开URL
        const { data: { publicUrl } } = supabase.storage
          .from('user-assets')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrl;
      }
      
      await updateProfileMutation.mutateAsync({
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
      });
      
      toast.success('个人资料已更新');
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      refetchProfile();
    } catch (error: any) {
      toast.error('更新失败：' + error.message);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('密码长度不能少于6位');
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success('密码修改成功');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('密码修改失败：' + error.message);
    }
  };

  // 删除账户
  const handleDeleteAccount = async () => {
    if (!window.confirm('确定要删除账户吗？此操作不可恢复！')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      // TODO: 实现账户删除逻辑
      toast.error('账户删除功能暂未开放');
    } catch (error: any) {
      toast.error('删除失败：' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'security', label: '安全设置', icon: Lock },
    { id: 'danger', label: '危险操作', icon: Shield },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-base-200/30">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* 页面标题 */}
          <div className="mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <h1 className="text-2xl font-bold">账户设置</h1>
          </div>

          {/* 标签页 */}
          <div className="tabs tabs-boxed mb-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 内容区域 */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              {/* 个人资料 */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">个人资料</h2>
                    {!isEditing ? (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setIsEditing(true)}
                      >
                        编辑资料
                      </button>
                    ) : (
                      <div className="space-x-2">
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setIsEditing(false);
                            setDisplayName(profile?.display_name || '');
                            setBio(profile?.bio || '');
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                        >
                          取消
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={handleSaveProfile}
                          disabled={updateProfileMutation.isLoading}
                        >
                          {updateProfileMutation.isLoading ? '保存中...' : '保存'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 头像 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">头像</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="avatar">
                        <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                          <img 
                            src={avatarPreview || profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session?.user.email}&backgroundColor=3b82f6&textColor=ffffff`} 
                            alt="头像"
                          />
                        </div>
                      </div>
                      {isEditing && (
                        <label className="btn btn-sm btn-outline gap-2">
                          <Camera className="w-4 h-4" />
                          选择图片
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarChange}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 邮箱 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">邮箱</span>
                    </label>
                    <input 
                      type="email" 
                      value={session?.user.email || ''} 
                      className="input input-bordered" 
                      disabled 
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">邮箱不可修改</span>
                    </label>
                  </div>

                  {/* 显示名称 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">显示名称</span>
                    </label>
                    <input 
                      type="text" 
                      value={isEditing ? displayName : (profile?.display_name || '')}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input input-bordered" 
                      disabled={!isEditing}
                      placeholder="请输入显示名称"
                    />
                  </div>

                  {/* 个人简介 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">个人简介</span>
                    </label>
                    <textarea 
                      value={isEditing ? bio : (profile?.bio || '')}
                      onChange={(e) => setBio(e.target.value)}
                      className="textarea textarea-bordered h-24" 
                      disabled={!isEditing}
                      placeholder="介绍一下自己..."
                    />
                  </div>

                  {/* 注册时间 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">注册时间</span>
                    </label>
                    <input 
                      type="text" 
                      value={profile?.created_at ? new Date(profile.created_at).toLocaleString('zh-CN') : '-'} 
                      className="input input-bordered" 
                      disabled 
                    />
                  </div>
                </div>
              )}

              {/* 安全设置 */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">安全设置</h2>
                  
                  <div className="divider">修改密码</div>
                  
                  {/* 当前密码 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">当前密码</span>
                    </label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="input input-bordered" 
                      placeholder="请输入当前密码"
                    />
                  </div>

                  {/* 新密码 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">新密码</span>
                    </label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input input-bordered" 
                      placeholder="请输入新密码（至少6位）"
                    />
                  </div>

                  {/* 确认密码 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">确认新密码</span>
                    </label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input input-bordered" 
                      placeholder="请再次输入新密码"
                    />
                  </div>

                  <button 
                    className="btn btn-primary"
                    onClick={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword}
                  >
                    修改密码
                  </button>

                  <div className="divider">两步验证</div>
                  
                  <div className="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>两步验证功能即将推出，敬请期待</span>
                  </div>
                </div>
              )}

              {/* 危险操作 */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-error">危险操作</h2>
                  
                  <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>以下操作不可撤销，请谨慎操作！</span>
                  </div>

                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-error">删除账户</h3>
                      <p className="text-sm text-base-content/70">
                        删除账户将永久删除您的所有数据，包括：
                      </p>
                      <ul className="list-disc list-inside text-sm text-base-content/70 ml-4">
                        <li>所有发票记录</li>
                        <li>邮箱配置信息</li>
                        <li>个人资料和设置</li>
                        <li>所有上传的文件</li>
                      </ul>
                      <div className="card-actions justify-end mt-4">
                        <button 
                          className="btn btn-error"
                          onClick={handleDeleteAccount}
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                          {isDeleting ? '删除中...' : '永久删除账户'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AccountSettingsPage;