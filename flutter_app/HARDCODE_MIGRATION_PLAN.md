# 硬编码常量迁移方案

本文档详细说明如何将Flutter应用中的硬编码常量转换为统一的配置文件管理系统。

## 📋 迁移概览

### 迁移原则

1. **UI相关常量**: 使用Flutter主题系统的语义化设计令牌
2. **业务逻辑常量**: 集中到业务配置文件
3. **应用配置常量**: 集中到应用配置文件  
4. **特殊常量**: 仅保留主题系统无法覆盖的特殊数值

### 配置文件结构

```
lib/core/config/
├── app_constants.dart           # 应用级通用常量
├── business_constants.dart      # 业务逻辑相关常量
├── ui_constants.dart           # 非主题管理的UI常量
├── theme_usage_guide.dart      # 主题系统使用指南
└── message_constants.dart      # 消息映射配置（已存在）
```

## 🎯 硬编码检查结果

### 发现的硬编码类型

#### 1. 文件大小和限制
```dart
// 发现位置：多个文件
const int maxFileSize = 10 * 1024 * 1024;  // 10MB
const int maxFileCount = 5;
const int maxConcurrentUploads = 3;
```

#### 2. 时间间隔和延迟
```dart
// 发现位置：各种bloc和service文件
Duration(milliseconds: 500)
Duration(minutes: 5)
Duration(hours: 2)
const Duration(days: 90)
```

#### 3. 业务规则数值
```dart
// 发现位置：统计和显示组件
if (amount >= 10000) // 金额阈值
const totalSteps = 20; // OCR处理步骤
const maxImageSize = 10 * 1024 * 1024;
```

#### 4. UI尺寸和间距（需要改用主题系统）
```dart
// 发现位置：UI组件 - 这些应该使用主题系统！
EdgeInsets.all(16.0)
fontSize: 14
BorderRadius.circular(8)
const double spacing4 = 4.0;
```

#### 5. 网络和API配置
```dart
// 发现位置：数据源和配置文件
'https://sfenhhtvcyslxplvewmt.supabase.co'
const Duration(seconds: 30) // 请求超时
```

## 🚀 实施方案

### 阶段1：创建配置文件（已完成）

✅ 已创建以下配置文件：
- `app_constants.dart` - 通用应用常量
- `business_constants.dart` - 业务逻辑常量  
- `ui_constants.dart` - 特殊UI常量（仅非主题管理项）
- `theme_usage_guide.dart` - 主题使用指南

### 阶段2：UI常量迁移到主题系统

#### 2.1 字体大小迁移

❌ **错误做法**：
```dart
Text('标题', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))
```

✅ **正确做法**：
```dart
Text('标题', style: Theme.of(context).textTheme.titleLarge)
```

#### 2.2 间距迁移

❌ **错误做法**：
```dart
padding: const EdgeInsets.all(16.0)
margin: const EdgeInsets.symmetric(horizontal: 8.0)
```

✅ **正确做法**：
```dart
padding: EdgeInsets.all(Theme.of(context).cardTheme.margin?.horizontal ?? 16.0)
// 或者使用语义化间距获取方法：
padding: ThemeUsageGuide.getPagePadding(context)
```

#### 2.3 颜色迁移

❌ **错误做法**：
```dart
color: Colors.blue
backgroundColor: Color(0xFF1976D2)
```

✅ **正确做法**：
```dart
color: Theme.of(context).colorScheme.primary
backgroundColor: Theme.of(context).colorScheme.surface
```

#### 2.4 圆角迁移

❌ **错误做法**：
```dart
borderRadius: BorderRadius.circular(8.0)
```

✅ **正确做法**：
```dart
shape: Theme.of(context).cardTheme.shape
// 或使用语义化圆角：
borderRadius: ThemeUsageGuide.getMediumRadius()
```

### 阶段3：业务常量迁移

#### 3.1 文件相关常量

**迁移前**：
```dart
// 分散在多个文件中
const int maxFileSize = 10 * 1024 * 1024;
const int maxFileCount = 5;
const List<String> supportedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
```

**迁移后**：
```dart
// 使用统一配置
import '../../core/config/app_constants.dart';

if (fileSize > AppConstants.maxFileSize) {
  // 处理文件过大
}

if (!AppConstants.isSupportedFileExtension(extension)) {
  // 处理不支持的文件类型
}
```

#### 3.2 时间相关常量

**迁移前**：
```dart
// 分散的时间配置
await Future.delayed(const Duration(milliseconds: 500));
static const Duration _cacheExpiration = Duration(hours: 2);
final overdueDate = DateTime.now().subtract(const Duration(days: 90));
```

**迁移后**：
```dart
// 使用统一配置
import '../../core/config/app_constants.dart';

await Future.delayed(AppConstants.mediumDelay);
static const Duration _cacheExpiration = AppConstants.permissionsCacheTtl;
final overdueDate = DateTime.now().subtract(Duration(days: AppConstants.invoiceOverdueDays));
```

#### 3.3 业务规则常量

**迁移前**：
```dart
// 分散的业务规则
if (amount >= 10000) {
  return '¥${(amount / 10000).toStringAsFixed(1)}万';
}
```

**迁移后**：
```dart
// 使用统一配置
import '../../core/config/app_constants.dart';

if (amount >= AppConstants.amountWanThreshold) {
  return AppConstants.getFormattedAmount(amount);
}
```

### 阶段4：具体文件迁移计划

#### 4.1 优先级1 - 关键业务文件

**文件**: `lib/presentation/widgets/invoice_stats_widget.dart`
- **硬编码**: `if (amount >= 10000)`, `if (amount >= 1000)`
- **迁移到**: `AppConstants.getFormattedAmount()`
- **预计时间**: 30分钟

**文件**: `lib/data/cache/invoice_cache.dart`  
- **硬编码**: `Duration(minutes: 5)`, `Duration(minutes: 2)`, `_maxListCacheSize = 10`
- **迁移到**: `AppConstants.invoiceListCacheTtl`, `AppConstants.maxListCacheSize`
- **预计时间**: 20分钟

**文件**: `lib/data/datasources/invoice_remote_datasource.dart`
- **硬编码**: `Duration(days: 90)`, `Duration(days: 60)`, `const totalSteps = 20`
- **迁移到**: `AppConstants.invoiceOverdueDays`, `AppConstants.ocrProcessSteps`
- **预计时间**: 45分钟

#### 4.2 优先级2 - UI相关文件（改用主题系统）

**文件**: `lib/presentation/widgets/detail_page_styles.dart`
- **硬编码**: 所有间距、圆角、图标尺寸常量
- **迁移到**: 删除此文件，改用主题系统
- **预计时间**: 1小时

**文件**: `lib/core/theme/component_theme_constants.dart`
- **硬编码**: 间距、字体、动画时长常量
- **迁移到**: 保留动画时长，其他删除改用主题系统  
- **预计时间**: 45分钟

#### 4.3 优先级3 - 配置和工具类

**文件**: `lib/presentation/pages/upload/utils/upload_config.dart`
- **硬编码**: `maxFileSize`, `maxFileCount`
- **迁移到**: `AppConstants.maxFileSize`, `AppConstants.maxFileCount`
- **预计时间**: 15分钟

### 阶段5：验证和测试

#### 5.1 自动化检查脚本

创建脚本检查硬编码残留：

```bash
#!/bin/bash
# scripts/check_hardcoded_constants.sh

echo "检查硬编码常量..."

# 检查数字硬编码（排除合理的数字）
echo "=== 可疑的数字硬编码 ==="
grep -r -n "\b[0-9]\{2,\}\b" lib/ --include="*.dart" | grep -v "test" | grep -v "generated" | head -20

# 检查间距硬编码
echo "=== 间距硬编码（应使用主题系统）==="
grep -r -n "EdgeInsets\.\|SizedBox.*[0-9]\|fontSize.*[0-9]" lib/ --include="*.dart" | head -10

# 检查Duration硬编码
echo "=== Duration硬编码 ==="
grep -r -n "Duration(" lib/ --include="*.dart" | head -10

echo "检查完成。请确认上述硬编码是否已正确迁移。"
```

#### 5.2 迁移验证清单

**业务常量验证**：
- [ ] 文件大小限制使用 `AppConstants.maxFileSize`
- [ ] 时间间隔使用 `AppConstants.*Duration` 常量
- [ ] 金额阈值使用 `AppConstants.*Threshold` 常量
- [ ] 分页配置使用 `AppConstants.defaultPageSize`

**UI常量验证**：
- [ ] 字体大小使用 `Theme.of(context).textTheme.*`
- [ ] 颜色使用 `Theme.of(context).colorScheme.*`  
- [ ] 间距使用主题系统或语义化方法
- [ ] 圆角使用 `Theme.of(context).*Theme.shape`

**特殊常量验证**：
- [ ] 响应式断点使用 `UIConstants.breakpoint*`
- [ ] 网格配置使用 `UIConstants.grid*`
- [ ] 纵横比使用 `UIConstants.*Ratio`

### 阶段6：文档和培训

#### 6.1 更新开发文档

**在 `CLAUDE.md` 中添加**：
```markdown
## 硬编码常量使用规范

### UI相关常量
- ✅ 使用 `Theme.of(context).textTheme.*` 获取字体样式
- ✅ 使用 `Theme.of(context).colorScheme.*` 获取颜色
- ✅ 使用 `ThemeUsageGuide` 中的语义化方法
- ❌ 不使用硬编码的 EdgeInsets、fontSize、Color 值

### 业务常量
- ✅ 使用 `AppConstants.*` 获取通用配置
- ✅ 使用 `BusinessConstants.*` 获取业务规则
- ❌ 不在组件中直接写数字常量

### 代码审查要点
- 检查是否存在硬编码数值
- 验证是否正确使用配置常量
- 确认UI常量使用主题系统
```

#### 6.2 IDE配置提醒

**VSCode设置** (`.vscode/settings.json`):
```json
{
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "dart.lineLength": 100,
  "files.associations": {
    "*.dart": "dart"
  },
  "search.exclude": {
    "**/.*": true,
    "**/node_modules": true,
    "**/archived/**": true
  }
}
```

## 📊 迁移时间估算

| 阶段 | 描述 | 预计时间 | 负责人 |
|------|------|----------|--------|
| 阶段1 | 创建配置文件 | ✅ 已完成 | - |
| 阶段2 | UI常量迁移到主题系统 | 3小时 | 前端开发者 |
| 阶段3 | 业务常量迁移 | 2小时 | 后端开发者 |
| 阶段4 | 文件逐个迁移 | 4小时 | 全栈开发者 |
| 阶段5 | 验证和测试 | 2小时 | QA工程师 |
| 阶段6 | 文档更新 | 1小时 | 技术写作 |
| **总计** | | **12小时** | |

## 🔍 迁移后的效果

### 维护性提升
- 所有配置集中管理，修改一处生效全局
- 语义化命名提高代码可读性
- 主题系统保证UI一致性

### 性能优化
- 减少重复的硬编码数值
- 主题系统优化渲染性能
- 配置缓存减少重复计算

### 代码质量
- 消除硬编码异味
- 提高代码复用率
- 降低维护成本

## ⚠️ 注意事项

1. **渐进式迁移**: 不要一次性修改所有文件，分批次进行
2. **充分测试**: 每个阶段完成后进行完整测试
3. **团队同步**: 确保团队成员了解新的常量使用规范
4. **向后兼容**: 迁移过程中保持应用功能正常

## 📋 迁移检查清单

### 开发阶段
- [ ] 创建所有配置常量文件
- [ ] 更新主题系统配置
- [ ] 迁移所有硬编码常量
- [ ] 运行自动化检查脚本

### 测试阶段  
- [ ] 功能测试通过
- [ ] UI一致性检查
- [ ] 性能测试无回归
- [ ] 不同设备适配测试

### 发布阶段
- [ ] 代码审查通过
- [ ] 文档更新完成
- [ ] 团队培训完成
- [ ] 生产环境部署验证

---

通过这个系统性的迁移方案，我们将显著提高代码的可维护性和一致性，同时遵循Flutter的最佳实践。