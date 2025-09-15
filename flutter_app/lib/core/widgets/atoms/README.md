# Atoms 组件库

基于Cupertino设计系统的原子级组件，遵循iOS Human Interface Guidelines设计规范。

## 组件清单

- [AppButton](#appbutton-组件) - 统一按钮组件
- [AppTextField](#apptextfield-组件) - 统一文本输入组件
- AppText - 统一文本显示组件
- AppIcon - 统一图标组件
- AppCard - 统一卡片组件
- AppDivider - 统一分隔线组件

---

# AppTextField 组件

基于CupertinoTextField的统一文本输入组件，提供丰富的功能特性和完整的状态管理。

## 特性

### 🎯 输入类型
- **Text (文本)**：基础文本输入
- **Password (密码)**：自动隐藏文本，支持显示/隐藏切换
- **Email (邮箱)**：邮箱键盘类型，内置格式验证
- **Phone (手机)**：电话键盘类型，支持号码格式化
- **Number (数字)**：数字键盘，限制数字输入
- **Search (搜索)**：搜索键盘，优化搜索体验
- **Multiline (多行)**：支持多行文本输入
- **URL (网址)**：URL键盘类型

### 🎨 验证状态
- **Normal (正常)**：默认状态
- **Error (错误)**：错误状态，红色边框
- **Success (成功)**：成功状态，绿色边框
- **Warning (警告)**：警告状态，橙色边框

### 🔧 功能特性
- 前缀和后缀图标支持
- 清除按钮功能
- 字符计数显示
- 实时输入验证
- 帮助文本和错误文本
- 完整的无障碍支持
- 自适应主题颜色

## 基础用法

```dart
import 'package:flutter/cupertino.dart';
import 'core/widgets/atoms/app_text_field.dart';

// 基础文本输入
AppTextField(
  placeholder: '请输入用户名',
  onChanged: (value) => print('输入: $value'),
)
```

## 快速构造器

### 密码输入框
```dart
AppTextField.password(
  placeholder: '请输入密码',
  validator: (value) => value?.isEmpty == true ? '请输入密码' : null,
  onSubmitted: (value) => handleLogin(),
)
```

### 邮箱输入框
```dart
AppTextField.email(
  validator: (value) {
    if (value?.isEmpty == true) return '请输入邮箱';
    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value!)) {
      return '请输入有效邮箱';
    }
    return null;
  },
)
```

### 搜索输入框
```dart
AppTextField.search(
  placeholder: '搜索商品',
  onSubmitted: (value) => performSearch(value),
)
```

### 数字输入框
```dart
AppTextField.number(
  placeholder: '请输入数量',
  maxLength: 5,
  validator: (value) {
    final number = int.tryParse(value ?? '');
    if (number == null) return '请输入有效数字';
    if (number <= 0) return '数量必须大于0';
    return null;
  },
)
```

### 多行文本输入框
```dart
AppTextField.multiline(
  placeholder: '请输入备注',
  maxLines: 4,
  maxLength: 200,
  showCharacterCount: true,
)
```

## 高级配置

### 带图标和验证
```dart
AppTextField(
  placeholder: '用户名',
  type: AppTextFieldType.text,
  validationState: AppTextFieldValidationState.success,
  prefixIcon: CupertinoIcons.person,
  suffixIcon: CupertinoIcons.checkmark_circle,
  showClearButton: true,
  validator: (value) => value?.isEmpty == true ? '请输入用户名' : null,
  helperText: '用户名格式正确',
  onChanged: (value) => validateUsername(value),
)
```

### 字符计数和限制
```dart
AppTextField(
  placeholder: '输入描述',
  maxLength: 100,
  showCharacterCount: true,
  helperText: '简短描述您的需求',
  onChanged: (value) => updateDescription(value),
)
```

### 自定义样式
```dart
AppTextField(
  placeholder: '自定义样式',
  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: CupertinoColors.activeBlue),
  ),
  padding: EdgeInsets.all(16),
)
```

## 表单集成示例

```dart
class RegistrationForm extends StatefulWidget {
  @override
  _RegistrationFormState createState() => _RegistrationFormState();
}

class _RegistrationFormState extends State<RegistrationForm> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 用户名
        AppTextField(
          controller: _nameController,
          placeholder: '请输入用户名',
          prefixIcon: CupertinoIcons.person,
          showClearButton: true,
          validator: (value) => value?.isEmpty == true ? '请输入用户名' : null,
        ),
        
        SizedBox(height: 16),
        
        // 邮箱
        AppTextField.email(
          controller: _emailController,
          validator: _validateEmail,
        ),
        
        SizedBox(height: 16),
        
        // 密码
        AppTextField.password(
          controller: _passwordController,
          validator: _validatePassword,
        ),
        
        SizedBox(height: 24),
        
        // 提交按钮
        AppButton(
          text: '注册',
          fullWidth: true,
          onPressed: _handleRegistration,
        ),
      ],
    );
  }
  
  String? _validateEmail(String? value) {
    if (value?.isEmpty == true) return '请输入邮箱地址';
    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value!)) {
      return '请输入有效的邮箱地址';
    }
    return null;
  }
  
  String? _validatePassword(String? value) {
    if (value?.isEmpty == true) return '请输入密码';
    if (value!.length < 6) return '密码长度不能少于6位';
    return null;
  }
  
  void _handleRegistration() {
    // 处理注册逻辑
  }
}
```

---

# AppButton 组件

基于Cupertino设计系统的统一按钮组件，遵循iOS Human Interface Guidelines设计规范。

## 特性

### 🎨 样式支持
- **Filled (填充)**：主要操作按钮，具有实心背景
- **Ghost (幽灵)**：次要操作按钮，透明背景带边框
- **Destructive (危险)**：危险操作按钮，如删除操作

### 📏 尺寸选项
- **Small (小)**：44pt高度，符合iOS最小触摸目标
- **Medium (中等)**：50pt高度，默认尺寸
- **Large (大)**：56pt高度，用于突出的主要操作

### ⚡ 状态管理
- 正常、禁用、加载三种状态
- 自动状态颜色适配
- 完整的无障碍支持

### 🔧 其他功能
- 支持图标+文本组合
- 全宽度按钮选项
- 自定义内边距
- 语义化标签支持

## 基础用法

```dart
import 'package:flutter/cupertino.dart';
import 'core/widgets/atoms/app_button.dart';

// 基础按钮
AppButton(
  text: '确认',
  onPressed: () {
    // 处理点击事件
  },
)
```

## 样式示例

### 填充按钮（默认）
```dart
AppButton(
  text: '提交',
  style: AppButtonStyle.filled,
  onPressed: () => handleSubmit(),
)
```

### 幽灵按钮
```dart
AppButton(
  text: '取消',
  style: AppButtonStyle.ghost,
  onPressed: () => handleCancel(),
)
```

### 危险按钮
```dart
AppButton(
  text: '删除',
  style: AppButtonStyle.destructive,
  onPressed: () => handleDelete(),
)
```

## 尺寸示例

```dart
// 小按钮
AppButton(
  text: '小按钮',
  size: AppButtonSize.small,
  onPressed: () {},
)

// 中等按钮（默认）
AppButton(
  text: '中等按钮',
  size: AppButtonSize.medium,
  onPressed: () {},
)

// 大按钮
AppButton(
  text: '大按钮',
  size: AppButtonSize.large,
  onPressed: () {},
)
```

## 带图标按钮

```dart
AppButton(
  text: '保存',
  icon: CupertinoIcons.download_circle,
  onPressed: () => handleSave(),
)

AppButton(
  text: '删除',
  icon: CupertinoIcons.delete,
  style: AppButtonStyle.destructive,
  onPressed: () => handleDelete(),
)
```

## 状态示例

### 加载状态
```dart
AppButton(
  text: '提交中...',
  loading: true, // 自动显示活动指示器
)
```

### 禁用状态
```dart
AppButton(
  text: '不可用',
  onPressed: null, // null表示禁用
)
```

### 全宽按钮
```dart
AppButton(
  text: '全宽按钮',
  fullWidth: true,
  onPressed: () {},
)
```

## 无障碍支持

```dart
AppButton(
  text: '提交',
  semanticLabel: '提交表单数据', // VoiceOver会读取这个标签
  onPressed: () => handleSubmit(),
)
```

## 自定义内边距

```dart
AppButton(
  text: '自定义',
  padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
  onPressed: () {},
)
```

## 组合使用示例

```dart
Column(
  children: [
    // 主要操作
    AppButton(
      text: '立即购买',
      icon: CupertinoIcons.cart,
      size: AppButtonSize.large,
      fullWidth: true,
      onPressed: () => handlePurchase(),
    ),
    
    SizedBox(height: 16),
    
    // 次要操作
    Row(
      children: [
        Expanded(
          child: AppButton(
            text: '加入购物车',
            style: AppButtonStyle.ghost,
            onPressed: () => handleAddToCart(),
          ),
        ),
        
        SizedBox(width: 16),
        
        AppButton(
          text: '分享',
          icon: CupertinoIcons.share,
          style: AppButtonStyle.ghost,
          size: AppButtonSize.small,
          onPressed: () => handleShare(),
        ),
      ],
    ),
  ],
)
```

## 设计规范

### 颜色系统
- 使用`CupertinoThemeExtensions`中的语义化颜色
- 自动适配深色/浅色模式
- 符合iOS色彩可访问性标准

### 字体排版
- 遵循iOS Typography规范
- 不同尺寸使用不同字体大小和字重
- 合适的字符间距设置

### 触摸目标
- 最小触摸目标44pt（小按钮）
- 符合iOS可访问性指南
- 适当的内边距确保触摸体验

## 注意事项

1. **导入依赖**：确保已导入`cupertino_theme_extensions.dart`
2. **主题管理**：需要在应用中配置`CupertinoThemeManager`
3. **图标选择**：建议使用`CupertinoIcons`中的图标
4. **加载状态**：loading为true时会自动禁用点击
5. **无障碍**：如果未提供semanticLabel，会使用text作为默认值

## 测试

运行组件测试：

```bash
flutter test test/core/widgets/atoms/app_button_test.dart
```

查看使用示例：

```bash
# 在应用中导航到
lib/core/widgets/atoms/app_button_example.dart
```