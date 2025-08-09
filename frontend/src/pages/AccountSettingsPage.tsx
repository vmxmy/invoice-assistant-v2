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
  Settings
} from 'lucide-react';
import { useAuthContext } from "../contexts/AuthContext"
import { supabase } from '../lib/supabase';
import { useDashboardStats } from '../hooks/useDashboardStats';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';

const AccountSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session } = useAuthContext();
  const { data: stats, loading: statsLoading } = useDashboardStats() as any;
  
  const [activeTab, setActiveTab] = useState('overview');
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
    { id: 'activity', label: '使用统计', icon: Activity },
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
                            setDisplayName(user?.user_metadata?.display_name || '');
                            setBio(user?.user_metadata?.bio || '');
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                        >
                          取消
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={handleSaveProfile}
                        >
                          保存
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
                            src={avatarPreview || user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}&backgroundColor=3b82f6&textColor=ffffff`} 
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
                      value={user?.email || ''} 
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
                      value={isEditing ? displayName : (user?.user_metadata?.display_name || '')}
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
                      value={isEditing ? bio : (user?.user_metadata?.bio || '')}
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
                      value={user?.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'} 
                      className="input input-bordered" 
                      disabled 
                    />
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
                  
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="font-semibold mb-4">两步验证</h3>
                      <div className="form-control">
                        <label className="label cursor-pointer">
                          <span className="label-text">启用两步验证</span>
                          <input 
                            type="checkbox" 
                            className="toggle toggle-primary" 
                            disabled
                            title="功能开发中"
                          />
                        </label>
                        <label className="label">
                          <span className="label-text-alt text-base-content/60">
                            两步验证可以为您的账户提供额外的安全保护（功能开发中）
                          </span>
                        </label>
                      </div>
                    </div>
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
                        <li>收件箱邮件信息</li>
                        <li>个人资料和设置</li>
                        <li>所有上传的文件</li>
                      </ul>
                      <div className="card-actions justify-end mt-4">
                        <button 
                          className="btn btn-error gap-2"
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