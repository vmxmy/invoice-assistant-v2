# NSXPCSharedListener 错误缓解方案

## 问题描述

NSXPCSharedListener错误是macOS系统级别的ViewBridge连接问题，通常在调用NSOpenPanel/NSSavePanel（文件选择器）时出现。这是系统层面的非致命错误，不影响应用的核心功能。

## 实施的缓解措施

### 1. 统一的文件操作服务 (`FileOperationService`)

创建了统一的文件操作服务来处理所有文件选择器调用：

**位置**: `lib/core/services/file_operation_service.dart`

**主要功能**:
- 确保文件选择器调用在主线程执行
- 提供重试机制（最多3次尝试）
- 专门识别和处理ViewBridge错误
- 用户友好的错误对话框
- 详细的错误日志记录

**错误检测逻辑**:
```dart
if (e.code == 'read_external_storage_denied' || 
    e.message?.contains('NSXPCSharedListener') == true ||
    e.message?.contains('ViewBridge') == true) {
    // ViewBridge 错误特殊处理
}
```

### 2. 优化的文件选择器调用

**更新的文件**:
- `lib/presentation/pages/upload/widgets/ios_file_picker_widget.dart`
- `lib/presentation/pages/invoice_management_page.dart`
- `lib/presentation/widgets/optimized_reimbursement_set_card.dart`

**改进措施**:
- 替换直接调用 `FilePicker.platform` 为 `FileOperationService`
- 添加 `mounted` 检查防止内存泄漏
- 增加错误处理和用户反馈

### 3. macOS 权限配置增强

**更新的文件**:
- `macos/Runner/Info.plist` - 添加文件访问权限描述
- `macos/Runner/DebugProfile.entitlements` - 增加调试环境权限
- `macos/Runner/Release.entitlements` - 增加生产环境权限

**新增权限**:
```xml
<!-- 文件访问权限 -->
<key>com.apple.security.files.user-selected.read-write</key>
<key>com.apple.security.files.downloads.read-write</key>
<key>com.apple.security.device.camera</key>
```

### 4. 错误用户体验优化

**专门的错误对话框**:
- ViewBridge错误：解释这是系统级非致命问题
- 权限错误：指导用户检查权限设置
- 通用错误：提供重试建议

**错误处理流程**:
1. 检测错误类型
2. 自动重试（ViewBridge错误）
3. 显示相应的用户友好提示
4. 记录详细日志用于调试

## 验证测试

**测试文件**: `test/file_operation_service_test.dart`

- 基础Widget构建测试
- 错误检测逻辑验证
- 代码质量检查通过

## 使用指南

### 替换现有FilePicker调用

**之前**:
```dart
final result = await FilePicker.platform.pickFiles(
  type: FileType.custom,
  allowedExtensions: ['pdf', 'jpg'],
  allowMultiple: true,
);
```

**现在**:
```dart
final result = await FileOperationService.pickFiles(
  type: FileType.custom,
  allowedExtensions: ['pdf', 'jpg'],
  allowMultiple: true,
  context: context, // 必需参数
);
```

### 文件保存调用

**之前**:
```dart
final path = await FilePicker.platform.saveFile(
  dialogTitle: '保存文件',
  fileName: 'example.zip',
);
```

**现在**:
```dart
final path = await FileOperationService.saveFile(
  dialogTitle: '保存文件',
  fileName: 'example.zip',
  context: context, // 必需参数
);
```

## 预期效果

1. **错误容忍**: 即使出现NSXPCSharedListener日志，应用继续正常运行
2. **用户体验**: 提供清晰的错误反馈，不会让用户困惑
3. **稳定性**: 重试机制提高文件操作成功率
4. **可维护性**: 统一的错误处理便于后续维护

## 注意事项

- 这是缓解方案，不能完全消除macOS系统级错误日志
- 重点在于确保功能可用性和用户体验
- 建议在生产环境持续监控相关错误频率
- 如果错误频率过高，可考虑调整重试策略或延迟时间

## 后续改进建议

1. 监控错误发生频率和模式
2. 根据用户反馈调整错误提示内容
3. 考虑实现备用的文件选择方式
4. 定期更新file_picker包版本