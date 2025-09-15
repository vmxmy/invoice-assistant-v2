# Supabase Publishable Key 使用指南

## 📋 概述

Publishable key（发布密钥）就是Supabase的**匿名密钥(ANON KEY)**，是客户端安全访问Supabase的关键。

## 🔍 获取你的Publishable Key

### 方法1：从Supabase Dashboard获取

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击左侧菜单的 **Settings** → **API**
4. 在API Keys部分复制：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...`

### 方法2：使用MCP工具获取

```bash
# 如果你已经配置了Supabase MCP
supabase status
```

## 🛠️ 在当前项目中配置

### 步骤1：更新.env文件

编辑 `flutter_app/.env` 文件：

```bash
# ==========================================
# Supabase 配置
# ==========================================
# 替换为你的真实项目URL
SUPABASE_URL=https://your-actual-project-id.supabase.co

# 替换为你的真实匿名密钥
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc4ODg4ODg4LCJleHAiOjE5OTQ0NjQ4ODh9.your-signature

# ==========================================
# 安全配置  
# ==========================================
ENABLE_SECURITY_LOGGING=true
ENABLE_DEBUG_MODE=true
BUILD_ENVIRONMENT=development
APP_VERSION=1.0.0
```

### 步骤2：验证配置

```bash
cd flutter_app

# 检查环境变量是否正确加载
./scripts/build_secure.sh debug android
```

### 步骤3：测试连接

```bash
# 运行Flutter应用测试连接
flutter run --dart-define-from-file=.env
```

## 🔐 安全最佳实践

### ✅ 当前项目已实现的安全措施

1. **环境变量隔离**
   ```dart
   // ✅ 正确：从环境变量获取
   static const String supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
   ```

2. **JWT格式验证**
   ```dart
   // ✅ 自动验证JWT格式的完整性
   static bool _isValidJWTFormat(String token) {
     final parts = token.split('.');
     return parts.length == 3 && /* base64验证 */;
   }
   ```

3. **域名安全检查**
   ```dart
   // ✅ 只允许信任的Supabase域名
   if (!uri.host.endsWith('.supabase.co') && !isLocal) {
     return false;
   }
   ```

4. **HTTPS强制**
   ```dart
   // ✅ 生产环境强制HTTPS
   if (uri.scheme != 'https' && !isProduction) {
     return false;
   }
   ```

5. **RLS策略保护**
   - 你的数据库已配置完整的RLS策略
   - 匿名用户只能访问授权的数据

### ⚠️ 重要安全提醒

1. **Publishable Key是安全的**
   - ✅ 可以安全地在客户端使用
   - ✅ 受RLS策略保护
   - ✅ 只能访问public schema中被授权的数据

2. **Service Role Key绝不能用于客户端**
   - ❌ 绝不要在Flutter应用中使用service_role密钥
   - ❌ service_role会绕过所有RLS策略

## 📱 不同环境的配置

### 开发环境 (.env)
```bash
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dev-anon-key
BUILD_ENVIRONMENT=development
ENABLE_DEBUG_MODE=true
```

### 生产环境 (.env.production)
```bash
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.prod-anon-key
BUILD_ENVIRONMENT=production
ENABLE_DEBUG_MODE=false
ENABLE_SECURITY_LOGGING=false
```

## 🚀 部署配置

### Android发布构建
```bash
# 使用安全构建脚本
cd flutter_app
./scripts/build_secure.sh release android
```

### iOS发布构建
```bash
# 使用安全构建脚本
cd flutter_app
./scripts/build_secure.sh release ios
```

## 🧪 测试配置

### 验证环境变量
```bash
# 检查配置状态
flutter run --dart-define-from-file=.env

# 在应用中查看配置状态
# SupabaseConfig.printConfigStatus() 会输出配置信息
```

### 验证RLS策略
```dart
// 测试匿名访问是否被正确限制
final response = await supabase
  .from('invoices')
  .select()
  .limit(1);
  
// 应该只返回当前用户有权限的数据
```

## 🔧 故障排除

### 常见错误解决

1. **"Missing SUPABASE_ANON_KEY"**
   ```bash
   # 确保.env文件存在且格式正确
   cat flutter_app/.env
   ```

2. **"Invalid JWT format"**
   ```bash
   # 检查密钥是否完整（应该有3个.分隔的部分）
   echo $SUPABASE_ANON_KEY | grep -o '\.' | wc -l  # 应该输出2
   ```

3. **"Connection refused"**
   ```bash
   # 检查URL是否正确
   curl -I https://your-project-id.supabase.co/rest/v1/
   ```

## 📊 配置检查清单

- [ ] ✅ 已从Supabase Dashboard获取正确的URL和anon key
- [ ] ✅ 已更新flutter_app/.env文件
- [ ] ✅ JWT密钥格式正确（3个部分，以.分隔）
- [ ] ✅ URL指向正确的.supabase.co域名
- [ ] ✅ 运行`flutter run`能够成功连接
- [ ] ✅ RLS策略已启用并正确配置
- [ ] ✅ 生产构建使用安全脚本

完成这些步骤后，你的Flutter应用就能安全地使用Supabase Publishable Key了！