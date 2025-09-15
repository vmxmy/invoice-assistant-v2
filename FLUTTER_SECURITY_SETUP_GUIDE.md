# Flutter 应用安全配置指南

**版本**: 1.0  
**更新时间**: 2025-01-15  
**适用范围**: 发票管理系统 Flutter 应用

## 📋 概述

本指南提供了完整的Flutter应用安全配置步骤，确保应用符合生产环境的安全标准。

---

## 🚨 Critical：环境变量配置

### 1. 移除硬编码凭据

**问题**: Supabase凭据硬编码在源代码中  
**风险**: 源代码泄露将导致后端完全暴露

#### 配置步骤

**开发环境**:
```bash
# 设置环境变量
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key-here"

# 或在 ~/.bashrc / ~/.zshrc 中添加
echo 'export SUPABASE_URL="https://your-project.supabase.co"' >> ~/.bashrc
echo 'export SUPABASE_ANON_KEY="your-anon-key-here"' >> ~/.bashrc
```

**Flutter构建命令**:
```bash
# 开发构建
flutter run --dart-define=SUPABASE_URL="https://your-project.supabase.co" \
            --dart-define=SUPABASE_ANON_KEY="your-anon-key"

# 生产构建
flutter build apk --dart-define=SUPABASE_URL="https://your-project.supabase.co" \
                  --dart-define=SUPABASE_ANON_KEY="your-anon-key"

# iOS构建
flutter build ios --dart-define=SUPABASE_URL="https://your-project.supabase.co" \
                  --dart-define=SUPABASE_ANON_KEY="your-anon-key"
```

### 2. CI/CD配置

**GitHub Actions示例**:
```yaml
# .github/workflows/build.yml
name: Build Flutter App
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.22.0'
      
      - name: Install dependencies
        run: flutter pub get
        working-directory: flutter_app
      
      - name: Build APK
        run: |
          flutter build apk \
            --dart-define=SUPABASE_URL="${{ secrets.SUPABASE_URL }}" \
            --dart-define=SUPABASE_ANON_KEY="${{ secrets.SUPABASE_ANON_KEY }}"
        working-directory: flutter_app
        
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

**设置GitHub Secrets**:
1. 进入仓库 Settings → Secrets and variables → Actions
2. 添加以下secrets:
   - `SUPABASE_URL`: 您的Supabase项目URL
   - `SUPABASE_ANON_KEY`: 您的Supabase匿名密钥

---

## 🔐 权限缓存加密

### 安全特性

已实施的加密措施：
- ✅ **AES加密存储**: 权限数据使用PBKDF2派生密钥进行加密
- ✅ **HMAC完整性验证**: 防止数据被篡改
- ✅ **设备密钥绑定**: 加密密钥与设备相关联
- ✅ **自动过期机制**: 缓存数据自动过期（2小时）

### 验证加密效果

检查权限缓存是否正确加密：

```dart
// 在调试时查看存储内容
final prefs = await SharedPreferences.getInstance();
final encryptedData = prefs.getString('user_permissions_cache');
print('加密数据: $encryptedData'); // 应该是不可读的加密字符串
```

---

## 🔒 JWT Token安全验证

### 增强的Token验证

新增的安全检查：
- ✅ **格式验证**: 确保JWT有正确的三部分结构
- ✅ **过期时间检查**: 验证token未过期
- ✅ **声明验证**: 检查issuer、audience等关键声明
- ✅ **自动刷新**: 过期token自动尝试刷新

### 监控Token安全

在生产环境中监控token相关的安全事件：

```dart
// 检查token验证日志
AppLogger.info('Token验证状态', tag: 'Security');
```

---

## 🛡️ 会话安全验证

### 多层安全检查

实施的会话验证：
- ✅ **基础存在性检查**: 验证session和user存在
- ✅ **邮箱确认验证**: 强制要求邮箱确认
- ✅ **过期时间检查**: 防止使用过期会话
- ✅ **Token格式验证**: 确保JWT格式正确
- ✅ **用户状态检查**: 验证用户未被禁用
- ✅ **异常会话检测**: 检测异常长期会话

### 会话安全监控

监控可疑的会话活动：

```bash
# 检查应用日志中的安全事件
grep "🚨.*Security" flutter_logs.txt
```

---

## ⚙️ 开发环境配置

### 1. IDE配置

**VS Code launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flutter (Debug)",
      "request": "launch",
      "type": "dart",
      "args": [
        "--dart-define=SUPABASE_URL=https://your-project.supabase.co",
        "--dart-define=SUPABASE_ANON_KEY=your-anon-key"
      ]
    }
  ]
}
```

**Android Studio**:
1. Run/Debug Configurations
2. 在 "Additional run args" 中添加:
   ```
   --dart-define=SUPABASE_URL=https://your-project.supabase.co --dart-define=SUPABASE_ANON_KEY=your-anon-key
   ```

### 2. 脚本自动化

创建构建脚本 `scripts/build.sh`:
```bash
#!/bin/bash

# 检查环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "错误: 请设置 SUPABASE_URL 和 SUPABASE_ANON_KEY 环境变量"
    exit 1
fi

# 构建应用
flutter build apk \
    --dart-define=SUPABASE_URL="$SUPABASE_URL" \
    --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"

echo "✅ 构建完成"
```

---

## 🔍 安全验证清单

### 部署前检查

- [ ] **环境变量配置**: 确认所有环境变量正确设置
- [ ] **硬编码检查**: 确认代码中无硬编码凭据
- [ ] **加密验证**: 确认权限缓存正确加密
- [ ] **Token验证**: 确认JWT验证逻辑正常工作
- [ ] **会话检查**: 确认会话验证规则生效
- [ ] **日志检查**: 确认安全事件正确记录
- [ ] **错误处理**: 确认安全异常得到妥善处理

### 运行时监控

```bash
# 检查安全相关日志
grep -E "(Security|🚨|🔐)" app_logs.txt

# 监控认证失败
grep "Authentication failed" app_logs.txt

# 检查异常会话
grep "异常长期会话" app_logs.txt
```

---

## 🚨 应急响应

### 发现安全问题时的步骤

1. **立即响应**:
   ```bash
   # 轮换API密钥
   # 在Supabase控制台重新生成anon key
   
   # 更新环境变量
   export SUPABASE_ANON_KEY="new-anon-key"
   
   # 重新部署应用
   flutter build apk --dart-define=SUPABASE_ANON_KEY="new-anon-key"
   ```

2. **用户通知**: 如需要，通知用户重新登录

3. **日志分析**: 分析安全日志确定影响范围

4. **修复验证**: 确认安全问题已解决

---

## 📚 最佳实践

### 1. 凭据管理
- ✅ 使用环境变量存储所有敏感信息
- ✅ 定期轮换API密钥
- ✅ 不在版本控制中存储凭据
- ✅ 使用不同环境的不同凭据

### 2. 加密存储
- ✅ 敏感数据必须加密存储
- ✅ 使用强加密算法和密钥派生
- ✅ 实施完整性验证
- ✅ 定期清理过期数据

### 3. 会话管理
- ✅ 实施多层会话验证
- ✅ 监控异常会话活动
- ✅ 自动处理过期会话
- ✅ 强制邮箱验证

### 4. 监控和日志
- ✅ 记录所有安全事件
- ✅ 实施实时监控
- ✅ 定期安全审计
- ✅ 建立应急响应机制

---

## 🔧 故障排除

### 常见问题

**1. 环境变量未生效**
```bash
# 检查环境变量
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# 确认构建命令包含dart-define参数
flutter run --dart-define=SUPABASE_URL="..." --dart-define=SUPABASE_ANON_KEY="..."
```

**2. 加密存储失败**
```dart
// 检查SecureStorageService初始化
await SecureStorageService.initialize();
```

**3. Token验证失败**
```dart
// 检查JWT格式
final token = SupabaseClientManager.accessToken;
print('Token: ${token?.substring(0, 20)}...');
```

---

## 📞 支持

如需帮助，请查看：
- 项目文档: `FLUTTER_SECURITY_AUDIT_REPORT.md`
- 错误日志: 检查应用日志中的安全标签
- 社区支持: Flutter和Supabase官方文档

---

**重要提醒**: 本指南包含生产环境的关键安全配置。请确保所有团队成员了解并遵循这些安全实践。