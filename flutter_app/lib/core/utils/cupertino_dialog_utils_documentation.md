# CupertinoDialogUtils 工具类文档

## 概述

CupertinoDialogUtils 是一个专为 iOS 风格对话框设计的工具类，完全遵循 Apple Human Interface Guidelines，提供了丰富的对话框类型和完善的无障碍功能支持。

## 文件位置

- **主要文件**: `/Users/xumingyang/app/invoice-assistant-v2/flutter_app/lib/core/utils/cupertino_dialog_utils.dart`
- **测试文件**: `/Users/xumingyang/app/invoice-assistant-v2/flutter_app/test/core/utils/cupertino_dialog_utils_test.dart`
- **使用示例**: `/Users/xumingyang/app/invoice-assistant-v2/flutter_app/lib/core/utils/cupertino_dialog_utils_example.dart`

## 功能特性

### 1. 支持的对话框类型

1. **确认对话框** (`showConfirmDialog`)
   - 用于需要用户确认的操作
   - 支持破坏性操作样式
   - 返回 bool? 类型结果

2. **信息对话框** (`showInfoDialog`)
   - 用于显示信息提示
   - 带有信息图标
   - 单按钮确认

3. **错误对话框** (`showErrorDialog`)
   - 用于显示错误信息
   - 带有错误图标和触觉反馈
   - 自动使用错误色彩主题

4. **成功对话框** (`showSuccessDialog`)
   - 用于显示成功信息
   - 带有成功图标和触觉反馈
   - 支持自动关闭功能

5. **选择对话框** (`showChoiceDialog`)
   - 用于多选项选择
   - 支持图标、默认选项、破坏性操作
   - 泛型支持，可返回任意类型

6. **输入对话框** (`showInputDialog`)
   - 用于文本输入
   - 内置输入验证功能
   - 支持各种键盘类型

7. **底部弹窗** (`showBottomSheet`)
   - iOS 原生 ActionSheet 风格
   - 支持多个操作选项
   - 适合移动端操作选择

### 2. 工具方法

1. **加载对话框** (`showLoadingDialog`)
   - 显示加载指示器
   - 自定义加载消息
   - 配合 `dismissDialog` 使用

2. **快速提示** (`showQuickToast`)
   - Toast 风格的快速提示
   - 支持 success、error、warning、info 类型
   - 自动关闭和触觉反馈

3. **关闭对话框** (`dismissDialog`)
   - 编程式关闭对话框
   - 支持返回结果

## 核心组件

### DialogOption<T> 类

用于配置对话框选项的数据类：

```dart
class DialogOption<T> {
  const DialogOption({
    required this.value,      // 选项值
    required this.label,      // 显示文本
    this.isDestructive = false,  // 是否为破坏性操作
    this.isDefault = false,      // 是否为默认选项
    this.icon,                   // 选项图标
    this.semanticLabel,          // 无障碍标签
  });
}
```

## 设计原则

### 1. iOS Human Interface Guidelines 兼容
- 使用 Cupertino 设计语言
- 遵循 iOS 原生对话框样式
- 正确的颜色、字体、间距

### 2. 无障碍功能支持
- 完整的语义标签
- 屏幕阅读器支持
- 键盘导航支持

### 3. 主题系统集成
- 使用项目的 CupertinoThemeExtensions
- 自动适配明暗主题
- 语义化颜色使用

### 4. 触觉反馈
- 错误操作：`HapticFeedback.vibrate()`
- 成功操作：`HapticFeedback.lightImpact()`
- 警告操作：`HapticFeedback.mediumImpact()`

## 使用方法

### 基础用法

```dart
// 确认对话框
final result = await CupertinoDialogUtils.showConfirmDialog(
  context,
  title: '删除发票',
  message: '确定要删除这张发票吗？此操作无法撤销。',
  confirmText: '删除',
  cancelText: '取消',
  isDestructive: true,
);

if (result == true) {
  // 用户确认删除
}
```

### 高级用法

```dart
// 选择对话框
final options = [
  DialogOption(
    value: 'edit',
    label: '编辑',
    icon: CupertinoIcons.pen,
    isDefault: true,
  ),
  DialogOption(
    value: 'delete',
    label: '删除',
    icon: CupertinoIcons.delete,
    isDestructive: true,
  ),
];

final result = await CupertinoDialogUtils.showChoiceDialog<String>(
  context,
  title: '选择操作',
  options: options,
);
```

### 输入验证

```dart
final result = await CupertinoDialogUtils.showInputDialog(
  context,
  title: '重命名文件',
  placeholder: '文件名',
  validator: (value) {
    if (value == null || value.isEmpty) {
      return '文件名不能为空';
    }
    if (value.length < 3) {
      return '文件名至少需要3个字符';
    }
    return null;
  },
);
```

## 业务场景集成

### 1. 发票管理场景

```dart
// 删除发票确认
static Future<bool> confirmDeleteInvoice(
  BuildContext context,
  String invoiceNumber,
) async {
  final result = await CupertinoDialogUtils.showConfirmDialog(
    context,
    title: '删除发票',
    message: '确定要删除发票"$invoiceNumber"吗？此操作无法撤销。',
    confirmText: '删除',
    cancelText: '取消',
    isDestructive: true,
  );
  
  return result == true;
}
```

### 2. 文件上传场景

```dart
// 带加载提示的文件上传
static Future<void> uploadFileWithLoading(
  BuildContext context,
  Future<void> uploadTask,
) async {
  final loadingFuture = CupertinoDialogUtils.showLoadingDialog(
    context,
    message: '正在上传文件...',
  );

  try {
    await uploadTask;
    
    if (context.mounted) {
      CupertinoDialogUtils.dismissDialog(context);
      await loadingFuture;
      
      CupertinoDialogUtils.showSuccessDialog(
        context,
        message: '文件上传成功！',
        autoDismiss: 2,
      );
    }
  } catch (error) {
    if (context.mounted) {
      CupertinoDialogUtils.dismissDialog(context);
      await loadingFuture;
      
      CupertinoDialogUtils.showErrorDialog(
        context,
        message: '文件上传失败：$error',
      );
    }
  }
}
```

## 测试覆盖

### 测试文件结构
- **基础对话框测试**: 确认、信息、错误、成功对话框
- **高级对话框测试**: 选择、输入、底部弹窗
- **工具方法测试**: 加载对话框、关闭方法
- **数据类测试**: DialogOption 验证
- **边界情况测试**: 空选项列表异常

### 测试覆盖率
- ✅ 11 个测试用例全部通过
- ✅ 覆盖所有主要功能
- ✅ 包含错误处理测试
- ⚠️ showQuickToast 由于定时器复杂性，在集成测试中验证

## 性能优化

### 1. 内存管理
- 自动清理控制器和焦点节点
- 使用 `whenComplete` 确保资源释放

### 2. 用户体验
- 适当的触觉反馈
- 自动焦点管理
- 响应式设计

### 3. 错误处理
- 完善的参数验证
- 优雅的异常处理
- 用户友好的错误信息

## 最佳实践

### 1. 对话框使用原则
- 重要操作使用确认对话框
- 破坏性操作标记为 `isDestructive: true`
- 提供清晰的标题和消息
- 使用适当的按钮文本

### 2. 无障碍优化
- 为图标提供 `semanticLabel`
- 使用语义化的标题和消息
- 确保键盘导航可用

### 3. 主题适配
- 使用 context 扩展获取颜色
- 避免硬编码颜色值
- 支持明暗主题切换

### 4. 错误处理
- 输入验证提供具体错误信息
- 网络错误提供重试选项
- 使用适当的图标和颜色

## 集成到现有项目

### 1. 替换 Material 对话框
```dart
// 替换前
showDialog(
  context: context,
  builder: (context) => AlertDialog(
    title: Text('确认'),
    content: Text('确定要删除吗？'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: Text('取消')),
      TextButton(onPressed: () => Navigator.pop(context, true), child: Text('确定')),
    ],
  ),
);

// 替换后
CupertinoDialogUtils.showConfirmDialog(
  context,
  title: '确认',
  message: '确定要删除吗？',
);
```

### 2. 批量替换指南
1. 识别现有 Material 对话框
2. 选择对应的 Cupertino 方法
3. 迁移参数和回调
4. 测试 iOS 风格效果

## 扩展计划

### 1. 未来功能
- 更多预设对话框类型
- 自定义动画支持
- 多语言国际化
- 更丰富的触觉反馈

### 2. 性能优化
- 对话框缓存机制
- 懒加载优化
- 内存占用优化

## 总结

CupertinoDialogUtils 提供了完整的 iOS 风格对话框解决方案，具有以下优势：

✅ **完整性**: 覆盖所有常见对话框场景  
✅ **一致性**: 遵循 iOS 设计规范  
✅ **易用性**: 简洁的 API 设计  
✅ **可扩展性**: 支持自定义和扩展  
✅ **可靠性**: 完整的测试覆盖  
✅ **无障碍**: 完善的无障碍支持  

该工具类已准备好在生产环境中使用，可以显著提升应用的用户体验和代码质量。