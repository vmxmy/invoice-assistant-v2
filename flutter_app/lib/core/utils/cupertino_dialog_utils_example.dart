import 'package:flutter/cupertino.dart';

import 'cupertino_dialog_utils.dart';

/// CupertinoDialogUtils 使用示例
///
/// 本文件展示了如何在实际项目中使用 CupertinoDialogUtils 工具类的各种对话框。
/// 包含了常见的业务场景和最佳实践。
class CupertinoDialogUtilsExample extends StatefulWidget {
  const CupertinoDialogUtilsExample({super.key});

  @override
  State<CupertinoDialogUtilsExample> createState() =>
      _CupertinoDialogUtilsExampleState();
}

class _CupertinoDialogUtilsExampleState
    extends State<CupertinoDialogUtilsExample> {
  String _result = '点击按钮查看对话框效果';

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Cupertino对话框示例'),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 结果显示区域
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: CupertinoColors.systemGrey6,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _result,
                  style: const TextStyle(fontSize: 16),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 24),

              // 示例按钮组
              _buildExampleSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildExampleSection() {
    return Column(
      children: [
        // 基础对话框
        _buildSectionHeader('基础对话框'),
        _buildExampleButton(
          '确认对话框',
          () => _showConfirmDialogExample(),
        ),
        _buildExampleButton(
          '信息对话框',
          () => _showInfoDialogExample(),
        ),
        _buildExampleButton(
          '错误对话框',
          () => _showErrorDialogExample(),
        ),
        _buildExampleButton(
          '成功对话框',
          () => _showSuccessDialogExample(),
        ),

        const SizedBox(height: 20),

        // 高级对话框
        _buildSectionHeader('高级对话框'),
        _buildExampleButton(
          '选择对话框',
          () => _showChoiceDialogExample(),
        ),
        _buildExampleButton(
          '输入对话框',
          () => _showInputDialogExample(),
        ),
        _buildExampleButton(
          '底部弹窗',
          () => _showBottomSheetExample(),
        ),

        const SizedBox(height: 20),

        // 工具对话框
        _buildSectionHeader('工具对话框'),
        _buildExampleButton(
          '加载对话框',
          () => _showLoadingDialogExample(),
        ),
        _buildExampleButton(
          '快速提示',
          () => _showQuickToastExample(),
        ),

        const SizedBox(height: 20),

        // 业务场景示例
        _buildSectionHeader('业务场景示例'),
        _buildExampleButton(
          '删除发票确认',
          () => _showDeleteInvoiceExample(),
        ),
        _buildExampleButton(
          '创建报销集',
          () => _showCreateReimbursementSetExample(),
        ),
        _buildExampleButton(
          '图片操作选择',
          () => _showImageActionExample(),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildExampleButton(String title, VoidCallback onPressed) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: CupertinoButton.filled(
        onPressed: onPressed,
        child: Text(title),
      ),
    );
  }

  // ==================== 基础对话框示例 ====================

  Future<void> _showConfirmDialogExample() async {
    final result = await CupertinoDialogUtils.showConfirmDialog(
      context,
      title: '确认操作',
      message: '这是一个确认对话框示例。点击确认或取消来查看返回值。',
      confirmText: '确认',
      cancelText: '取消',
      isDestructive: false,
      onConfirm: () {
        print('用户点击了确认');
      },
      onCancel: () {
        print('用户点击了取消');
      },
    );

    _updateResult('确认对话框结果: ${result ?? "null"}');
  }

  Future<void> _showInfoDialogExample() async {
    final result = await CupertinoDialogUtils.showInfoDialog(
      context,
      title: '信息提示',
      message: '这是一个信息对话框，通常用于显示重要信息或提示内容。',
      buttonText: '知道了',
      onPressed: () {
        print('用户查看了信息');
      },
    );

    _updateResult('信息对话框结果: ${result ?? "null"}');
  }

  Future<void> _showErrorDialogExample() async {
    final result = await CupertinoDialogUtils.showErrorDialog(
      context,
      title: '操作失败',
      message: '网络连接超时，请检查网络设置后重试。',
      buttonText: '重试',
      onPressed: () {
        print('用户选择重试');
      },
    );

    _updateResult('错误对话框结果: ${result ?? "null"}');
  }

  Future<void> _showSuccessDialogExample() async {
    final result = await CupertinoDialogUtils.showSuccessDialog(
      context,
      title: '操作成功',
      message: '数据已成功保存到云端。',
      buttonText: '完成',
      autoDismiss: 3, // 3秒后自动关闭
      onPressed: () {
        print('用户确认了成功操作');
      },
    );

    _updateResult(
        '成功对话框结果: ${result ?? "null"} (${result == false ? "自动关闭" : "手动点击"})');
  }

  // ==================== 高级对话框示例 ====================

  Future<void> _showChoiceDialogExample() async {
    final options = [
      DialogOption(
        value: 'edit',
        label: '编辑',
        icon: CupertinoIcons.pen,
        isDefault: true,
      ),
      DialogOption(
        value: 'duplicate',
        label: '复制',
        icon: CupertinoIcons.doc_on_doc,
      ),
      DialogOption(
        value: 'archive',
        label: '归档',
        icon: CupertinoIcons.archivebox,
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
      message: '请选择要对此项目执行的操作：',
      options: options,
      cancelText: '取消',
      onSelected: (value) {
        print('用户选择了: $value');
      },
    );

    _updateResult('选择对话框结果: ${result ?? "null"}');
  }

  Future<void> _showInputDialogExample() async {
    final result = await CupertinoDialogUtils.showInputDialog(
      context,
      title: '重命名文件',
      message: '请输入新的文件名称：',
      placeholder: '文件名',
      initialValue: 'invoice_001',
      confirmText: '确认',
      cancelText: '取消',
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return '文件名不能为空';
        }
        if (value.trim().length < 3) {
          return '文件名至少需要3个字符';
        }
        if (value.contains(RegExp(r'[<>:"/\\|?*]'))) {
          return '文件名包含非法字符';
        }
        return null;
      },
      onConfirm: (value) {
        print('用户输入了: $value');
      },
      onCancel: () {
        print('用户取消了输入');
      },
    );

    _updateResult('输入对话框结果: ${result ?? "null"}');
  }

  Future<void> _showBottomSheetExample() async {
    final actions = [
      DialogOption(
        value: 'camera',
        label: '拍照',
        icon: CupertinoIcons.camera,
      ),
      DialogOption(
        value: 'gallery',
        label: '从相册选择',
        icon: CupertinoIcons.photo,
        isDefault: true,
      ),
      DialogOption(
        value: 'files',
        label: '从文件选择',
        icon: CupertinoIcons.folder,
      ),
      DialogOption(
        value: 'remove',
        label: '移除当前图片',
        icon: CupertinoIcons.trash,
        isDestructive: true,
      ),
    ];

    final result = await CupertinoDialogUtils.showBottomSheet<String>(
      context,
      title: '选择图片来源',
      message: '请选择获取图片的方式',
      actions: actions,
      cancelText: '取消',
      onSelected: (value) {
        print('用户选择了: $value');
      },
    );

    _updateResult('底部弹窗结果: ${result ?? "null"}');
  }

  // ==================== 工具对话框示例 ====================

  Future<void> _showLoadingDialogExample() async {
    // 显示加载对话框
    final loadingFuture = CupertinoDialogUtils.showLoadingDialog(
      context,
      message: '正在上传文件...',
    );

    // 模拟耗时操作
    await Future.delayed(const Duration(seconds: 3));

    // 关闭加载对话框
    if (mounted) {
      CupertinoDialogUtils.dismissDialog(context);
    }

    await loadingFuture;
    _updateResult('加载对话框已关闭');
  }

  Future<void> _showQuickToastExample() async {
    const types = ['success', 'error', 'warning', 'info'];
    const messages = ['操作成功！', '操作失败！', '警告提示！', '信息提示！'];

    for (int i = 0; i < types.length; i++) {
      if (mounted) {
        CupertinoDialogUtils.showQuickToast(
          context,
          message: messages[i],
          type: types[i],
          duration: 2,
        );
      }

      // 等待上一个提示关闭
      if (i < types.length - 1) {
        await Future.delayed(const Duration(seconds: 3));
      }
    }

    _updateResult('快速提示演示完成');
  }

  // ==================== 业务场景示例 ====================

  Future<void> _showDeleteInvoiceExample() async {
    final result = await CupertinoDialogUtils.showConfirmDialog(
      context,
      title: '删除发票',
      message: '确定要删除发票"INV-2024-001"吗？删除后无法恢复。',
      confirmText: '删除',
      cancelText: '取消',
      isDestructive: true,
      onConfirm: () async {
        // 显示删除进度
        if (mounted) {
          final deleteFuture = CupertinoDialogUtils.showLoadingDialog(
            context,
            message: '正在删除发票...',
          );

          // 模拟删除操作
          await Future.delayed(const Duration(seconds: 2));

          if (mounted) {
            CupertinoDialogUtils.dismissDialog(context);
          }

          await deleteFuture;

          // 显示删除成功提示
          if (mounted) {
            CupertinoDialogUtils.showSuccessDialog(
              context,
              message: '发票已成功删除',
              autoDismiss: 2,
            );
          }
        }
      },
    );

    _updateResult('删除发票操作: ${result == true ? "已确认删除" : "已取消"}');
  }

  Future<void> _showCreateReimbursementSetExample() async {
    final name = await CupertinoDialogUtils.showInputDialog(
      context,
      title: '创建报销集',
      message: '请输入报销集名称：',
      placeholder: '例如：2024年第一季度差旅费',
      confirmText: '创建',
      cancelText: '取消',
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return '报销集名称不能为空';
        }
        if (value.trim().length < 2) {
          return '报销集名称至少需要2个字符';
        }
        if (value.trim().length > 50) {
          return '报销集名称不能超过50个字符';
        }
        return null;
      },
    );

    if (name != null) {
      // 模拟创建过程
      if (mounted) {
        final createFuture = CupertinoDialogUtils.showLoadingDialog(
          context,
          message: '正在创建报销集...',
        );

        await Future.delayed(const Duration(seconds: 2));

        if (mounted) {
          CupertinoDialogUtils.dismissDialog(context);
        }

        await createFuture;

        // 显示创建成功
        if (mounted) {
          await CupertinoDialogUtils.showSuccessDialog(
            context,
            message: '报销集"$name"创建成功！',
          );
        }
      }

      _updateResult('创建报销集: $name');
    } else {
      _updateResult('取消创建报销集');
    }
  }

  Future<void> _showImageActionExample() async {
    final actions = [
      DialogOption(
        value: 'view',
        label: '查看原图',
        icon: CupertinoIcons.eye,
        isDefault: true,
      ),
      DialogOption(
        value: 'edit',
        label: '编辑图片',
        icon: CupertinoIcons.pencil,
      ),
      DialogOption(
        value: 'share',
        label: '分享图片',
        icon: CupertinoIcons.share,
      ),
      DialogOption(
        value: 'save',
        label: '保存到相册',
        icon: CupertinoIcons.tray_arrow_down,
      ),
      DialogOption(
        value: 'replace',
        label: '替换图片',
        icon: CupertinoIcons.photo_on_rectangle,
      ),
      DialogOption(
        value: 'delete',
        label: '删除图片',
        icon: CupertinoIcons.trash,
        isDestructive: true,
      ),
    ];

    final result = await CupertinoDialogUtils.showBottomSheet<String>(
      context,
      title: '图片操作',
      message: '选择对发票图片执行的操作',
      actions: actions,
      cancelText: '取消',
      onSelected: (value) async {
        switch (value) {
          case 'delete':
            // 二次确认删除
            final confirmDelete = await CupertinoDialogUtils.showConfirmDialog(
              context,
              title: '确认删除',
              message: '确定要删除这张发票图片吗？',
              confirmText: '删除',
              cancelText: '取消',
              isDestructive: true,
            );

            if (confirmDelete == true && mounted) {
              CupertinoDialogUtils.showQuickToast(
                context,
                message: '图片已删除',
                type: 'success',
              );
            }
            break;
          case 'save':
            CupertinoDialogUtils.showQuickToast(
              context,
              message: '图片已保存到相册',
              type: 'success',
            );
            break;
          default:
            CupertinoDialogUtils.showQuickToast(
              context,
              message: '执行操作: $value',
              type: 'info',
            );
        }
      },
    );

    _updateResult('图片操作选择: ${result ?? "取消"}');
  }

  void _updateResult(String result) {
    setState(() {
      _result = result;
    });
  }
}

/// 在现有页面中集成对话框的示例
class DialogIntegrationExample {
  /// 在发票管理页面中使用确认对话框
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

  /// 在设置页面中使用输入对话框
  static Future<String?> editUserName(
    BuildContext context,
    String currentName,
  ) async {
    return CupertinoDialogUtils.showInputDialog(
      context,
      title: '修改姓名',
      message: '请输入新的姓名：',
      placeholder: '姓名',
      initialValue: currentName,
      confirmText: '保存',
      cancelText: '取消',
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return '姓名不能为空';
        }
        if (value.trim().length < 2) {
          return '姓名至少需要2个字符';
        }
        if (value.trim().length > 20) {
          return '姓名不能超过20个字符';
        }
        return null;
      },
    );
  }

  /// 在文件上传时使用加载对话框
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

      // 关闭加载对话框
      if (context.mounted) {
        CupertinoDialogUtils.dismissDialog(context);
      }

      await loadingFuture;

      // 显示成功提示
      if (context.mounted) {
        CupertinoDialogUtils.showSuccessDialog(
          context,
          message: '文件上传成功！',
          autoDismiss: 2,
        );
      }
    } catch (error) {
      // 关闭加载对话框
      if (context.mounted) {
        CupertinoDialogUtils.dismissDialog(context);
      }

      await loadingFuture;

      // 显示错误对话框
      if (context.mounted) {
        CupertinoDialogUtils.showErrorDialog(
          context,
          message: '文件上传失败：$error',
        );
      }
    }
  }

  /// 显示操作结果提示
  static void showOperationResult(
    BuildContext context, {
    required bool success,
    required String message,
  }) {
    if (success) {
      CupertinoDialogUtils.showQuickToast(
        context,
        message: message,
        type: 'success',
      );
    } else {
      CupertinoDialogUtils.showErrorDialog(
        context,
        message: message,
      );
    }
  }
}
