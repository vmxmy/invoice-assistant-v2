import 'package:flutter/material.dart';
import '../../core/theme/cupertino_semantic_colors.dart';
import '../widgets/permission_guard.dart';

/// 权限工具类
/// 提供便捷的权限检查和UI帮助方法
class PermissionUtils {
  /// 获取权限级别对应的颜色
  static Color getPermissionLevelColor(String level) {
    switch (level) {
      case 'user':
        return CupertinoSemanticColors.systemGray;
      case 'moderator':
        return CupertinoSemanticColors.success;
      case 'admin':
        return CupertinoSemanticColors.warning;
      case 'super_admin':
        return CupertinoSemanticColors.error;
      default:
        return CupertinoSemanticColors.systemGray;
    }
  }

  /// 获取权限级别对应的图标
  static IconData getPermissionLevelIcon(String level) {
    switch (level) {
      case 'user':
        return Icons.person;
      case 'moderator':
        return Icons.verified_user;
      case 'admin':
        return Icons.admin_panel_settings;
      case 'super_admin':
        return Icons.security;
      default:
        return Icons.person;
    }
  }

  /// 获取权限级别对应的显示名称
  static String getPermissionLevelDisplayName(String level) {
    switch (level) {
      case 'user':
        return '普通用户';
      case 'moderator':
        return '版主';
      case 'admin':
        return '管理员';
      case 'super_admin':
        return '超级管理员';
      default:
        return '未知';
    }
  }

  /// 创建权限级别徽章组件
  static Widget buildPermissionLevelBadge(String level, {double size = 12}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: getPermissionLevelColor(level),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            getPermissionLevelIcon(level),
            size: size,
            color: CupertinoSemanticColors.systemBackground,
          ),
          const SizedBox(width: 4),
          Text(
            getPermissionLevelDisplayName(level),
            style: TextStyle(
              color: CupertinoSemanticColors.systemBackground,
              fontSize: size - 2,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  /// 获取角色对应的颜色
  static Color getRoleColor(String role) {
    switch (role) {
      case 'super_admin':
        return CupertinoSemanticColors.error;
      case 'admin':
        return CupertinoSemanticColors.warning;
      case 'moderator':
        return CupertinoSemanticColors.success;
      case 'user':
        return CupertinoSemanticColors.systemGray;
      default:
        return CupertinoSemanticColors.info;
    }
  }

  /// 创建角色标签
  static Widget buildRoleChip(String role, {bool isSmall = false}) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isSmall ? 4 : 8,
        vertical: isSmall ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: getRoleColor(role).withValues(alpha: 0.2),
        border: Border.all(color: getRoleColor(role)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        role,
        style: TextStyle(
          color: getRoleColor(role),
          fontSize: isSmall ? 10 : 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  /// 获取权限对应的图标
  static IconData getPermissionIcon(String permission) {
    switch (permission) {
      case 'manage_users':
        return Icons.group;
      case 'view_audit_logs':
        return Icons.history;
      case 'manage_invoices':
        return Icons.receipt_long;
      case 'delete_invoices':
        return Icons.delete;
      case 'export_data':
        return Icons.download;
      case 'manage_settings':
        return Icons.settings;
      default:
        return Icons.security;
    }
  }

  /// 创建权限标签
  static Widget buildPermissionChip(String permission, {bool isSmall = false}) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isSmall ? 4 : 8,
        vertical: isSmall ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: CupertinoSemanticColors.info.withValues(alpha: 0.2),
        border: Border.all(color: CupertinoSemanticColors.info),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            getPermissionIcon(permission),
            size: isSmall ? 12 : 16,
            color: CupertinoSemanticColors.info,
          ),
          const SizedBox(width: 4),
          Text(
            permission,
            style: TextStyle(
              color: CupertinoSemanticColors.info,
              fontSize: isSmall ? 10 : 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  /// 检查是否应该显示管理员功能
  static bool shouldShowAdminFeatures(BuildContext context) {
    return PermissionChecker.isAdmin(context) || 
           PermissionChecker.isSuperAdmin(context);
  }

  /// 检查是否应该显示版主功能
  static bool shouldShowModeratorFeatures(BuildContext context) {
    return PermissionChecker.isModerator(context) || 
           shouldShowAdminFeatures(context);
  }

  /// 构建无权限提示组件
  static Widget buildNoPermissionWidget({
    String? message,
    IconData? icon,
    VoidCallback? onRetry,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon ?? Icons.lock,
            size: 64,
            color: CupertinoSemanticColors.systemGray,
          ),
          const SizedBox(height: 16),
          Text(
            message ?? '您没有权限访问此内容',
            style: const TextStyle(
              fontSize: 16,
              color: CupertinoSemanticColors.systemGray,
            ),
            textAlign: TextAlign.center,
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('重试'),
            ),
          ],
        ],
      ),
    );
  }

  /// 构建权限加载中组件
  static Widget buildPermissionLoadingWidget({String? message}) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message,
              style: const TextStyle(
                fontSize: 14,
                color: CupertinoSemanticColors.systemGray,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 显示权限错误对话框
  static Future<void> showPermissionErrorDialog(
    BuildContext context, {
    String? title,
    String? message,
    VoidCallback? onRetry,
  }) async {
    return showDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(title ?? '权限不足'),
          content: Text(message ?? '您没有权限执行此操作'),
          actions: <Widget>[
            if (onRetry != null)
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  onRetry();
                },
                child: const Text('重试'),
              ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('确定'),
            ),
          ],
        );
      },
    );
  }
}