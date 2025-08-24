import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Lock, 
  Shield, 
  Trash2, 
  Camera, 
  BarChart3,
  Activity,
  FileText,
  Calendar,
  Trash,
  Upload,
  Download,
  Clock,
  TrendingUp,
  Mail,
  Settings,
  Bell,
  Monitor,
  Moon,
  Sun,
  Palette,
  Volume2,
  Globe,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { useAuthContext } from "../contexts/AuthContext"
import { supabase } from '../lib/supabase';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDeviceDetection } from '../hooks/useMediaQuery';
import { MobileInput, MobileOptimizedForm } from '../components/ui/MobileOptimizedForm';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';

const AccountSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const device = useDeviceDetection();
  const { user, session } = useAuthContext();
  const { data: stats, loading: statsLoading } = useDashboardStats() as any;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 个人资料表单状态
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // 密码修改表单状态
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 偏好设置状态
  const [darkMode, setDarkMode] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);

  // 初始化表单数据
  React.useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        // 先尝试从 profiles 表读取
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, bio, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setDisplayName(profile.display_name || user.user_metadata?.display_name || '');
          setBio(profile.bio || user.user_metadata?.bio || '');
        } else {
          // 如果 profiles 表没有数据，使用 user_metadata
          setDisplayName(user.user_metadata?.display_name || '');
          setBio(user.user_metadata?.bio || '');
        }
      }
    };
    
    loadProfile();
  }, [user]);

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
    setIsSaving(true);
    try {
      let avatarUrl = user?.user_metadata?.avatar_url;
      
      // 如果有新头像，先上传
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        // 检查并创建存储桶
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'avatars');
        
        if (!bucketExists) {
          // 创建avatars存储桶
          await supabase.storage.createBucket('avatars', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
          });
        }
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        // 获取公开URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrl;
      }
      
      // 1. 更新用户元数据
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
        }
      });
      
      if (authError) throw authError;
      
      // 2. 更新或插入 profiles 表
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          auth_user_id: user?.id,
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (profileError) throw profileError;
      
      toast.success('个人资料已更新');
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error: any) {
      console.error('保存个人资料失败:', error);
      toast.error('更新失败：' + error.message);
    } finally {
      setIsSaving(false);
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
    const confirmText = '删除我的账户';
    const userInput = window.prompt(
      `此操作将永久删除您的账户和所有数据，且无法恢复！\n\n如果您确定要继续，请在下方输入: ${confirmText}`
    );
    
    if (userInput !== confirmText) {
      if (userInput !== null) {
        toast.error('输入不匹配，操作已取消');
      }
      return;
    }
    
    setIsDeleting(true);
    try {
      // 调用后端API删除账户
      const { error } = await supabase.rpc('delete_user_account', {
        user_id: user?.id
      });
      
      if (error) throw error;
      
      // 登出并跳转
      await supabase.auth.signOut();
      window.location.href = '/login';
      toast.success('账户已成功删除');
    } catch (error: any) {
      toast.error('删除失败：' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: '概览', icon: BarChart3 },
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'preferences', label: '偏好设置', icon: Settings },
    { id: 'activity', label: '使用统计', icon: Activity },
    { id: 'security', label: '安全设置', icon: Lock },
    { id: 'danger', label: '危险操作', icon: Shield },
  ];

  return (
    <Layout>
      <div className={`min-h-screen bg-base-200/30 ${device.isMobile ? 'mobile-full-container' : ''}`}>
        <div className={`container mx-auto px-4 py-6 max-w-4xl ${device.isMobile ? 'px-0 py-0' : ''}`}>
          {/* 移动端顶部导航栏 */}
          {device.isMobile ? (
            <div className="sticky top-0 z-20 bg-base-100 border-b border-base-300 safe-area-top">
              <div className="flex items-center justify-between px-4 py-3">
                <button 
                  onClick={() => navigate(-1)}
                  className="btn btn-ghost btn-sm gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-semibold">账户设置</h1>
                <div className="w-12"></div> {/* 占位平衡 */}
              </div>
            </div>
          ) : (
            /* 桌面端标题 */
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
          )}

          {/* 标签页 */}
          {device.isMobile ? (
            /* 移动端标签页 - 可滑动水平布局 */
            <div className="mobile-tabs">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* 桌面端标签页 */
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
          )}

          {/* 内容区域 */}
          <div className={`${device.isMobile ? '' : 'card bg-base-100 shadow-lg'}`}>
            <div className={`${device.isMobile ? '' : 'card-body'} ${device.isMobile ? 'pb-24 safe-area-bottom' : ''}`}>
              {/* 概览 */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">账户概览</h2>
                    <div className="text-sm text-base-content/60">
                      欢迎回来，{user?.user_metadata?.display_name || user?.email?.split('@')[0]}
                    </div>
                  </div>

                  {/* 用户信息卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 基本信息 */}
                    <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                      <div className="card-body">
                        <div className="flex items-center gap-4">
                          <div className="avatar">
                            <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                              <img 
                                src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}&backgroundColor=3b82f6&textColor=ffffff`} 
                                alt="头像"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {user?.user_metadata?.display_name || '未设置昵称'}
                            </h3>
                            <p className="text-sm text-base-content/70">
                              {user?.email}
                            </p>
                            <p className="text-xs text-base-content/50">
                              注册于 {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                            </p>
                          </div>
                        </div>
                        {user?.user_metadata?.bio && (
                          <p className="text-sm text-base-content/70 mt-3 border-t border-primary/20 pt-3">
                            {user.user_metadata.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 账户状态 */}
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h3 className="font-semibold mb-4">账户状态</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">账户状态</span>
                            <div className="badge badge-success">正常</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">邮箱验证</span>
                            <div className="badge badge-success">已验证</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">两步验证</span>
                            <div className="badge badge-warning">未启用</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">最后登录</span>
                            <span className="text-xs text-base-content/60">
                              {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '未知'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 数据统计概览 */}
                  <div className="divider">数据统计</div>
                  
                  {statsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="card bg-base-200 animate-pulse">
                          <div className="card-body p-4">
                            <div className="w-8 h-8 bg-base-300 rounded mb-2"></div>
                            <div className="w-16 h-6 bg-base-300 rounded mb-1"></div>
                            <div className="w-12 h-4 bg-base-300 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                        <div className="card-body p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-600">总发票</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-700">
                            {stats?.total_invoices || 0}
                          </div>
                          <div className="text-xs text-blue-600">张</div>
                        </div>
                      </div>

                      <div className="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                        <div className="card-body p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-600">总金额</span>
                          </div>
                          <div className="text-2xl font-bold text-green-700">
                            ¥{stats?.total_amount?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-xs text-green-600">元</div>
                        </div>
                      </div>

                      <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                        <div className="card-body p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-purple-600">本月</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-700">
                            {stats?.this_month_count || 0}
                          </div>
                          <div className="text-xs text-purple-600">张</div>
                        </div>
                      </div>

                      <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                        <div className="card-body p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Trash className="w-5 h-5 text-orange-600" />
                            <span className="text-sm text-orange-600">回收站</span>
                          </div>
                          <div className="text-2xl font-bold text-orange-700">
                            {stats?.deleted_count || 0}
                          </div>
                          <div className="text-xs text-orange-600">张</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 快捷操作 */}
                  <div className="divider">快捷操作</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                      className="btn btn-outline btn-block justify-start gap-3"
                      onClick={() => navigate('/invoices/upload')}
                    >
                      <Upload className="w-5 h-5" />
                      上传发票
                    </button>
                    <button 
                      className="btn btn-outline btn-block justify-start gap-3"
                      onClick={() => navigate('/invoices')}
                    >
                      <FileText className="w-5 h-5" />
                      管理发票
                    </button>
                    <button 
                      className="btn btn-outline btn-block justify-start gap-3"
                      onClick={() => navigate('/inbox')}
                    >
                      <Mail className="w-5 h-5" />
                      查看收件箱
                    </button>
                  </div>
                </div>
              )}

              {/* 个人资料 */}
              {activeTab === 'profile' && (
                <div className={`${device.isMobile ? 'p-0' : 'space-y-6'}`}>
                  {/* 移动端固定顶部操作栏 */}
                  {device.isMobile && (
                    <div className="sticky top-[60px] z-10 bg-base-100 border-b border-base-300 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">个人资料</h2>
                        {!isEditing ? (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => setIsEditing(true)}
                          >
                            编辑
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setIsEditing(false);
                                setDisplayName(user?.user_metadata?.display_name || '');
                                setBio(user?.user_metadata?.bio || '');
                                setAvatarFile(null);
                                setAvatarPreview(null);
                              }}
                              disabled={isSaving}
                            >
                              取消
                            </button>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={handleSaveProfile}
                              disabled={isSaving}
                            >
                              {isSaving ? '保存中...' : '保存'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 桌面端标题 */}
                  {!device.isMobile && (
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
                              setDisplayName(user?.user_metadata?.display_name || '');
                              setBio(user?.user_metadata?.bio || '');
                              setAvatarFile(null);
                              setAvatarPreview(null);
                            }}
                            disabled={isSaving}
                          >
                            取消
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                          >
                            {isSaving ? '保存中...' : '保存'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <MobileOptimizedForm className={device.isMobile ? 'p-4 space-y-6' : 'space-y-6'}>
                    {/* 头像 */}
                    <div className={`mobile-form-section ${device.isMobile ? '' : 'bg-transparent border-0 p-0 shadow-none'}`}>
                      <div className="flex flex-col items-center gap-4">
                        <div className="avatar">
                          <div className={`${device.isMobile ? 'w-20' : 'w-24'} rounded-full ring ring-primary ring-offset-base-100 ring-offset-2`}>
                            <img 
                              src={avatarPreview || user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}&backgroundColor=3b82f6&textColor=ffffff`} 
                              alt="头像"
                            />
                          </div>
                        </div>
                        {isEditing && (
                          <label className="btn btn-sm btn-outline gap-2">
                            <Camera className="w-4 h-4" />
                            {device.isMobile ? '选择' : '选择图片'}
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

                    {/* 基本信息 */}
                    <div className={`mobile-form-section ${device.isMobile ? '' : 'bg-transparent border-0 p-0 shadow-none'}`}>
                      {/* 邮箱 */}
                      <MobileInput
                        type="email"
                        label="邮箱"
                        value={user?.email || ''}
                        onChange={() => {}}
                        disabled={true}
                        description="邮箱不可修改"
                        icon={<Mail className="w-4 h-4" />}
                      />

                      {/* 显示名称 */}
                      <MobileInput
                        type="text"
                        label="显示名称"
                        value={isEditing ? displayName : (user?.user_metadata?.display_name || '')}
                        onChange={(value) => setDisplayName(value as string)}
                        disabled={!isEditing}
                        placeholder="请输入显示名称"
                        icon={<User className="w-4 h-4" />}
                      />

                      {/* 个人简介 */}
                      <MobileInput
                        type="textarea"
                        label="个人简介"
                        value={isEditing ? bio : (user?.user_metadata?.bio || '')}
                        onChange={(value) => setBio(value as string)}
                        disabled={!isEditing}
                        placeholder="介绍一下自己..."
                        rows={3}
                        maxLength={200}
                      />

                      {/* 注册时间 */}
                      <MobileInput
                        type="text"
                        label="注册时间"
                        value={user?.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'}
                        onChange={() => {}}
                        disabled={true}
                        icon={<Calendar className="w-4 h-4" />}
                      />
                    </div>
                  </MobileOptimizedForm>
                </div>
              )}

              {/* 偏好设置 */}
              {activeTab === 'preferences' && (
                <div className={`${device.isMobile ? 'p-0' : 'space-y-6'}`}>
                  {/* 移动端标题 */}
                  {device.isMobile && (
                    <div className="sticky top-[60px] z-10 bg-base-100 border-b border-base-300 px-4 py-3">
                      <h2 className="text-lg font-semibold">偏好设置</h2>
                    </div>
                  )}

                  {/* 桌面端标题 */}
                  {!device.isMobile && <h2 className="text-xl font-semibold">偏好设置</h2>}
                  
                  <div className={device.isMobile ? 'space-y-0' : 'space-y-6'}>
                    {/* 外观设置 */}
                    <div className={`mobile-form-section ${device.isMobile ? 'mx-4' : 'bg-base-200 border-0'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Palette className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">外观设置</h3>
                          <p className="text-sm text-base-content/60">个性化您的界面体验</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {/* 深色模式 */}
                        <div className="mobile-list-item">
                          <div className="mobile-list-item-icon">
                            <Moon className="w-5 h-5" />
                          </div>
                          <div className="mobile-list-item-content">
                            <div className="mobile-list-item-title">深色模式</div>
                            <div className="mobile-list-item-subtitle">启用深色主题</div>
                          </div>
                          <div className="mobile-list-item-action">
                            <input 
                              type="checkbox" 
                              className="toggle toggle-primary" 
                              checked={darkMode}
                              onChange={(e) => setDarkMode(e.target.checked)}
                            />
                          </div>
                        </div>

                        {/* 紧凑布局 */}
                        <div className="mobile-list-item">
                          <div className="mobile-list-item-icon">
                            <Monitor className="w-5 h-5" />
                          </div>
                          <div className="mobile-list-item-content">
                            <div className="mobile-list-item-title">紧凑布局</div>
                            <div className="mobile-list-item-subtitle">减少界面留白，提升信息密度</div>
                          </div>
                          <div className="mobile-list-item-action">
                            <input 
                              type="checkbox" 
                              className="toggle toggle-primary" 
                              checked={compactLayout}
                              onChange={(e) => setCompactLayout(e.target.checked)}
                            />
                          </div>
                        </div>

                        {/* 移动端特有：字体大小 */}
                        {device.isMobile && (
                          <div className="mobile-list-item">
                            <div className="mobile-list-item-icon">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="mobile-list-item-content">
                              <div className="mobile-list-item-title">字体大小</div>
                              <div className="mobile-list-item-subtitle">调整文字显示大小</div>
                            </div>
                            <div className="mobile-list-item-action">
                              <select className="select select-sm select-bordered">
                                <option>标准</option>
                                <option>大号</option>
                                <option>超大</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 通知设置 */}
                    <div className={`mobile-form-section ${device.isMobile ? 'mx-4' : 'bg-base-200 border-0'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-info" />
                        </div>
                        <div>
                          <h3 className="font-semibold">通知设置</h3>
                          <p className="text-sm text-base-content/60">管理您的通知偏好</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {/* 邮件通知 */}
                        <div className="mobile-list-item">
                          <div className="mobile-list-item-icon">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="mobile-list-item-content">
                            <div className="mobile-list-item-title">邮件通知</div>
                            <div className="mobile-list-item-subtitle">接收重要更新邮件</div>
                          </div>
                          <div className="mobile-list-item-action">
                            <input 
                              type="checkbox" 
                              className="toggle toggle-primary" 
                              checked={emailNotifications}
                              onChange={(e) => setEmailNotifications(e.target.checked)}
                            />
                          </div>
                        </div>

                        {/* 推送通知（移动端） */}
                        {device.isMobile && (
                          <div className="mobile-list-item">
                            <div className="mobile-list-item-icon">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="mobile-list-item-content">
                              <div className="mobile-list-item-title">推送通知</div>
                              <div className="mobile-list-item-subtitle">接收实时推送消息</div>
                            </div>
                            <div className="mobile-list-item-action">
                              <input 
                                type="checkbox" 
                                className="toggle toggle-primary" 
                                checked={pushNotifications}
                                onChange={(e) => setPushNotifications(e.target.checked)}
                              />
                            </div>
                          </div>
                        )}

                        {/* 声音提醒 */}
                        <div className="mobile-list-item">
                          <div className="mobile-list-item-icon">
                            <Volume2 className="w-5 h-5" />
                          </div>
                          <div className="mobile-list-item-content">
                            <div className="mobile-list-item-title">声音提醒</div>
                            <div className="mobile-list-item-subtitle">操作成功时播放提示音</div>
                          </div>
                          <div className="mobile-list-item-action">
                            <input 
                              type="checkbox" 
                              className="toggle toggle-primary" 
                              defaultChecked
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 数据与隐私 */}
                    <div className={`mobile-form-section ${device.isMobile ? 'mx-4' : 'bg-base-200 border-0'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold">数据与隐私</h3>
                          <p className="text-sm text-base-content/60">数据处理和隐私设置</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {/* 数据导出格式 */}
                        <div className="mobile-list-item">
                          <div className="mobile-list-item-icon">
                            <Download className="w-5 h-5" />
                          </div>
                          <div className="mobile-list-item-content">
                            <div className="mobile-list-item-title">默认导出格式</div>
                            <div className="mobile-list-item-subtitle">选择数据导出的默认格式</div>
                          </div>
                          <div className="mobile-list-item-action">
                            <select className="select select-sm select-bordered">
                              <option>Excel (.xlsx)</option>
                              <option>CSV (.csv)</option>
                              <option>PDF 报告</option>
                            </select>
                          </div>
                        </div>

                        {/* 自动备份 */}
                        <div className="mobile-list-item">
                          <div className="mobile-list-item-icon">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="mobile-list-item-content">
                            <div className="mobile-list-item-title">自动备份</div>
                            <div className="mobile-list-item-subtitle">定期备份您的数据</div>
                          </div>
                          <div className="mobile-list-item-action">
                            <input 
                              type="checkbox" 
                              className="toggle toggle-primary" 
                              defaultChecked
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 移动端特有设置 */}
                    {device.isMobile && (
                      <div className="mobile-form-section mx-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-warning" />
                          </div>
                          <div>
                            <h3 className="font-semibold">移动端设置</h3>
                            <p className="text-sm text-base-content/60">专为移动设备优化的功能</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {/* 触觉反馈 */}
                          <div className="mobile-list-item">
                            <div className="mobile-list-item-icon">
                              <Volume2 className="w-5 h-5" />
                            </div>
                            <div className="mobile-list-item-content">
                              <div className="mobile-list-item-title">触觉反馈</div>
                              <div className="mobile-list-item-subtitle">操作时的震动反馈</div>
                            </div>
                            <div className="mobile-list-item-action">
                              <input 
                                type="checkbox" 
                                className="toggle toggle-primary" 
                                defaultChecked
                              />
                            </div>
                          </div>

                          {/* 手势导航 */}
                          <div className="mobile-list-item">
                            <div className="mobile-list-item-icon">
                              <Activity className="w-5 h-5" />
                            </div>
                            <div className="mobile-list-item-content">
                              <div className="mobile-list-item-title">手势导航</div>
                              <div className="mobile-list-item-subtitle">启用滑动手势操作</div>
                            </div>
                            <div className="mobile-list-item-action">
                              <input 
                                type="checkbox" 
                                className="toggle toggle-primary" 
                                defaultChecked
                              />
                            </div>
                          </div>

                          {/* 省电模式 */}
                          <div className="mobile-list-item">
                            <div className="mobile-list-item-icon">
                              <Settings className="w-5 h-5" />
                            </div>
                            <div className="mobile-list-item-content">
                              <div className="mobile-list-item-title">省电模式</div>
                              <div className="mobile-list-item-subtitle">减少动画和后台活动</div>
                            </div>
                            <div className="mobile-list-item-action">
                              <input 
                                type="checkbox" 
                                className="toggle toggle-primary"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 使用统计 */}
              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">使用统计</h2>
                  
                  {/* 月度统计 */}
                  <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                    <div className="card-body">
                      <h3 className="font-semibold text-blue-700 mb-4">本月活动概览</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{stats?.this_month_count || 0}</div>
                          <div className="text-sm text-blue-600">新增发票</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">¥{stats?.this_month_amount?.toFixed(2) || '0.00'}</div>
                          <div className="text-sm text-green-600">本月金额</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{stats?.active_days || 0}</div>
                          <div className="text-sm text-purple-600">活跃天数</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{stats?.total_operations || 0}</div>
                          <div className="text-sm text-orange-600">操作次数</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 使用趋势 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          发票处理趋势
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">今日处理</span>
                            <span className="font-medium">{stats?.today_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">本周处理</span>
                            <span className="font-medium">{stats?.this_week_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">本月处理</span>
                            <span className="font-medium">{stats?.this_month_count || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">总计处理</span>
                            <span className="font-medium">{stats?.total_invoices || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          最近活动
                        </h3>
                        <div className="space-y-3">
                          {stats?.recent_activities && stats.recent_activities.length > 0 ? (
                            stats.recent_activities.slice(0, 4).map((activity: any, index: number) => (
                              <div key={index} className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  activity.type === 'upload' ? 'bg-success' :
                                  activity.type === 'edit' ? 'bg-info' :
                                  activity.type === 'delete' ? 'bg-warning' :
                                  'bg-primary'
                                }`}></div>
                                <div className="flex-1">
                                  <div className="text-sm">{activity.description}</div>
                                  <div className="text-xs text-base-content/60">{activity.time_ago}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-base-content/60">暂无最近活动</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 存储使用情况 */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        存储使用情况
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {((stats?.total_invoices || 0) * 0.8).toFixed(1)} MB
                          </div>
                          <div className="text-sm text-base-content/60">已使用</div>
                          <progress className="progress progress-primary w-full mt-2" value="32" max="100"></progress>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">1 GB</div>
                          <div className="text-sm text-base-content/60">总容量</div>
                          <div className="text-xs text-success mt-2">免费额度</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {(1000 - ((stats?.total_invoices || 0) * 0.8)).toFixed(1)} MB
                          </div>
                          <div className="text-sm text-base-content/60">剩余</div>
                          <div className="text-xs text-info mt-2">充足</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 偏好设置 */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">偏好设置</h2>
                  
                  {/* 界面设置 */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="font-semibold mb-4">界面设置</h3>
                      <div className="space-y-4">
                        <div className="form-control">
                          <label className="label cursor-pointer">
                            <span className="label-text">深色模式</span>
                            <input type="checkbox" className="toggle toggle-primary" />
                          </label>
                        </div>
                        <div className="form-control">
                          <label className="label cursor-pointer">
                            <span className="label-text">紧凑布局</span>
                            <input type="checkbox" className="toggle toggle-primary" />
                          </label>
                        </div>
                        <div className="form-control">
                          <label className="label cursor-pointer">
                            <span className="label-text">显示动画效果</span>
                            <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 通知设置 */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="font-semibold mb-4">通知设置</h3>
                      <div className="space-y-4">
                        <div className="form-control">
                          <label className="label cursor-pointer">
                            <span className="label-text">邮件通知</span>
                            <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                          </label>
                        </div>
                        <div className="form-control">
                          <label className="label cursor-pointer">
                            <span className="label-text">桌面通知</span>
                            <input type="checkbox" className="toggle toggle-primary" />
                          </label>
                        </div>
                        <div className="form-control">
                          <label className="label cursor-pointer">
                            <span className="label-text">系统维护通知</span>
                            <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 数据导出设置 */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="font-semibold mb-4">数据导出</h3>
                      <div className="space-y-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">默认导出格式</span>
                          </label>
                          <select className="select select-bordered">
                            <option>Excel (.xlsx)</option>
                            <option>CSV (.csv)</option>
                            <option>PDF 报告</option>
                          </select>
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">导出日期格式</span>
                          </label>
                          <select className="select select-bordered">
                            <option>YYYY-MM-DD</option>
                            <option>DD/MM/YYYY</option>
                            <option>MM/DD/YYYY</option>
                          </select>
                        </div>
                        <div className="form-control">
                          <label className="label cursor-pointer">
                            <span className="label-text">包含已删除的发票</span>
                            <input type="checkbox" className="toggle toggle-primary" />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 安全设置 */}
              {activeTab === 'security' && (
                <div className={`${device.isMobile ? 'p-0' : 'space-y-6'}`}>
                  {/* 移动端标题 */}
                  {device.isMobile && (
                    <div className="sticky top-[60px] z-10 bg-base-100 border-b border-base-300 px-4 py-3">
                      <h2 className="text-lg font-semibold">安全设置</h2>
                    </div>
                  )}

                  {/* 桌面端标题 */}
                  {!device.isMobile && <h2 className="text-xl font-semibold">安全设置</h2>}
                  
                  <MobileOptimizedForm className={device.isMobile ? 'p-4 space-y-6' : 'space-y-6'}>
                    {/* 修改密码 */}
                    <div className={`mobile-form-section ${device.isMobile ? '' : 'bg-transparent border-0 p-0 shadow-none'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <h3 className="font-semibold">修改密码</h3>
                          <p className="text-sm text-base-content/60">定期更新密码保护账户安全</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* 当前密码 */}
                        <MobileInput
                          type="password"
                          label="当前密码"
                          value={currentPassword}
                          onChange={(value) => setCurrentPassword(value as string)}
                          placeholder="请输入当前密码"
                          required
                          icon={<Lock className="w-4 h-4" />}
                        />

                        {/* 新密码 */}
                        <MobileInput
                          type="password"
                          label="新密码"
                          value={newPassword}
                          onChange={(value) => setNewPassword(value as string)}
                          placeholder="请输入新密码（至少6位）"
                          required
                          icon={<Shield className="w-4 h-4" />}
                        />

                        {/* 确认密码 */}
                        <MobileInput
                          type="password"
                          label="确认新密码"
                          value={confirmPassword}
                          onChange={(value) => setConfirmPassword(value as string)}
                          placeholder="请再次输入新密码"
                          required
                          error={confirmPassword && newPassword !== confirmPassword ? '两次输入的密码不一致' : undefined}
                          icon={<Shield className="w-4 h-4" />}
                        />

                        <div className={`${device.isMobile ? 'mobile-button-group' : ''}`}>
                          <button 
                            className={`btn btn-primary ${device.isMobile ? 'flex-1' : ''}`}
                            onClick={handleChangePassword}
                            disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                          >
                            修改密码
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 两步验证 */}
                    <div className={`mobile-form-section ${device.isMobile ? '' : 'bg-base-200 border-0'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-info" />
                        </div>
                        <div>
                          <h3 className="font-semibold">两步验证</h3>
                          <p className="text-sm text-base-content/60">为账户添加额外保护层</p>
                        </div>
                      </div>

                      <div className="mobile-list-item">
                        <div className="mobile-list-item-icon">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="mobile-list-item-content">
                          <div className="mobile-list-item-title">启用两步验证</div>
                          <div className="mobile-list-item-subtitle">使用手机验证码进行二次验证（开发中）</div>
                        </div>
                        <div className="mobile-list-item-action">
                          <input 
                            type="checkbox" 
                            className="toggle toggle-primary" 
                            disabled
                            title="功能开发中"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 登录记录 */}
                    <div className={`mobile-form-section ${device.isMobile ? '' : 'bg-base-200 border-0'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold">登录记录</h3>
                          <p className="text-sm text-base-content/60">查看最近的登录活动</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="mobile-list-item">
                          <div className="mobile-list-item-icon">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="mobile-list-item-content">
                            <div className="mobile-list-item-title">当前设备</div>
                            <div className="mobile-list-item-subtitle">
                              {device.deviceType} • {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '未知时间'}
                            </div>
                          </div>
                          <div className="mobile-list-item-action">
                            <div className="mobile-status-indicator mobile-status-success">
                              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                              活跃
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </MobileOptimizedForm>
                </div>
              )}

              {/* 危险操作 */}
              {activeTab === 'danger' && (
                <div className={`${device.isMobile ? 'p-0' : 'space-y-6'}`}>
                  {/* 移动端标题 */}
                  {device.isMobile && (
                    <div className="sticky top-[60px] z-10 bg-base-100 border-b border-error/20 px-4 py-3">
                      <h2 className="text-lg font-semibold text-error">危险操作</h2>
                    </div>
                  )}

                  {/* 桌面端标题 */}
                  {!device.isMobile && <h2 className="text-xl font-semibold text-error">危险操作</h2>}

                  <div className={device.isMobile ? 'p-4 space-y-6' : 'space-y-6'}>
                    {/* 警告提示 */}
                    <div className="alert alert-warning">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <h3 className="font-bold">请谨慎操作</h3>
                        <div className="text-sm">以下操作不可撤销，请确认后再执行</div>
                      </div>
                    </div>

                    {/* 删除账户 */}
                    <div className={`mobile-form-section border-error/20 ${device.isMobile ? '' : 'bg-error/5'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                          <Trash2 className="w-5 h-5 text-error" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-error">删除账户</h3>
                          <p className="text-sm text-base-content/60">永久删除您的账户和所有数据</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-error/5 border border-error/20 rounded-lg p-4">
                          <h4 className="font-medium text-error mb-2">删除后将无法恢复以下内容：</h4>
                          <ul className="list-disc list-inside text-sm text-base-content/70 space-y-1">
                            <li>所有发票记录和数据</li>
                            <li>收件箱邮件信息</li>
                            <li>个人资料和账户设置</li>
                            <li>所有上传的文件和图片</li>
                            <li>使用统计和历史记录</li>
                          </ul>
                        </div>

                        <div className={`${device.isMobile ? 'mobile-button-group' : 'flex justify-end'}`}>
                          <button 
                            className={`btn btn-error gap-2 ${device.isMobile ? 'flex-1' : ''}`}
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4" />
                            {isDeleting ? '删除中...' : (device.isMobile ? '删除账户' : '永久删除账户')}
                          </button>
                        </div>

                        {device.isMobile && (
                          <div className="text-xs text-base-content/50 text-center">
                            删除操作将需要您输入确认文本
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 移动端特有的样式 */}
      {device.isMobile && (
        <style jsx>{`
          /* 移动端标签页优化 */
          .mobile-tabs {
            display: flex;
            background: rgba(var(--fallback-b2));
            border-radius: 0;
            border-bottom: 1px solid rgba(var(--fallback-bc) / 0.1);
            padding: 0;
            margin: 0;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .mobile-tabs::-webkit-scrollbar {
            display: none;
          }

          .mobile-tab {
            flex: 1;
            min-width: 80px;
            padding: 12px 8px;
            text-align: center;
            border-radius: 0;
            font-size: 0.75rem;
            font-weight: 500;
            color: rgba(var(--fallback-bc) / 0.6);
            transition: all 0.2s ease-out;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          }

          .mobile-tab.active {
            background: none;
            color: rgba(var(--fallback-p));
            border-bottom: 2px solid rgba(var(--fallback-p));
          }

          .mobile-tab:active {
            background: rgba(var(--fallback-bc) / 0.05);
          }

          /* 移动端表单区域优化 */
          .mobile-form-section {
            background: rgba(var(--fallback-b1));
            border-radius: 12px;
            margin: 16px 0;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(var(--fallback-bc) / 0.1);
            border: 1px solid rgba(var(--fallback-bc) / 0.1);
          }

          .mobile-form-section:first-child {
            margin-top: 0;
          }

          .mobile-form-section:last-child {
            margin-bottom: 0;
          }

          /* 移动端列表项样式 */
          .mobile-list-item {
            padding: 16px 0;
            border-bottom: 1px solid rgba(var(--fallback-bc) / 0.08);
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 60px;
            transition: all 0.2s ease-out;
          }

          .mobile-list-item:last-child {
            border-bottom: none;
          }

          .mobile-list-item:active {
            background: rgba(var(--fallback-bc) / 0.05);
            margin: 0 -16px;
            padding: 16px;
            border-radius: 8px;
          }

          .mobile-list-item-content {
            flex: 1;
            min-width: 0;
          }

          .mobile-list-item-title {
            font-weight: 500;
            color: rgba(var(--fallback-bc));
            margin-bottom: 2px;
          }

          .mobile-list-item-subtitle {
            font-size: 0.875rem;
            color: rgba(var(--fallback-bc) / 0.6);
            line-height: 1.3;
          }

          .mobile-list-item-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: rgba(var(--fallback-p) / 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(var(--fallback-p));
            flex-shrink: 0;
          }

          .mobile-list-item-action {
            color: rgba(var(--fallback-bc) / 0.4);
            flex-shrink: 0;
          }

          /* 移动端按钮组 */
          .mobile-button-group {
            display: flex;
            gap: 12px;
            padding: 16px 0 0 0;
          }

          .mobile-button-group .btn {
            min-height: 48px;
            font-weight: 500;
            border-radius: 12px;
          }

          /* 移动端状态指示器 */
          .mobile-status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .mobile-status-success {
            background: rgba(var(--fallback-su) / 0.1);
            color: rgba(var(--fallback-su));
          }

          .mobile-status-warning {
            background: rgba(var(--fallback-wa) / 0.1);
            color: rgba(var(--fallback-wa));
          }

          .mobile-status-error {
            background: rgba(var(--fallback-er) / 0.1);
            color: rgba(var(--fallback-er));
          }

          .mobile-status-info {
            background: rgba(var(--fallback-in) / 0.1);
            color: rgba(var(--fallback-in));
          }

          /* 触控优化 */
          @media (hover: none) and (pointer: coarse) {
            .mobile-tab {
              min-height: 60px;
              padding: 16px 8px;
            }
            
            .mobile-list-item {
              min-height: 64px;
              padding: 18px 0;
            }
            
            .mobile-button-group .btn {
              min-height: 52px;
            }
            
            .toggle {
              transform: scale(1.1);
            }
            
            .select {
              min-height: 44px;
            }
          }

          /* 安全区域适配 */
          .safe-area-top {
            padding-top: env(safe-area-inset-top);
          }

          .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }

          /* 移动端全屏容器 */
          .mobile-full-container {
            min-height: 100vh;
            min-height: 100dvh; /* 动态视口高度 */
          }
        `}</style>
      )}
    </Layout>
  );
};

export default AccountSettingsPage;