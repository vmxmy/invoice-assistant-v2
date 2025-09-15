import 'package:flutter/material.dart'; // ⚠️ 需要保留：使用 CircularProgressIndicator
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/user_permissions.dart';
import '../bloc/permission_bloc.dart';
import '../../core/utils/logger.dart';

/// 角色守护组件
/// 根据用户角色控制子组件的显示
class RoleGuard extends StatelessWidget {
  final Widget child;
  final List<String> roles;
  final bool requireAll;
  final Widget? fallback;
  final Widget? loading;

  const RoleGuard({
    super.key,
    required this.child,
    required this.roles,
    this.requireAll = false,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PermissionBloc, PermissionState>(
      builder: (context, state) {
        if (state is PermissionLoading) {
          return loading ?? const Center(child: CircularProgressIndicator());
        }

        if (state is PermissionLoaded) {
          final permissions = state.permissions;

          bool hasAccess;
          if (requireAll) {
            hasAccess = permissions.hasAllRoles(roles);
          } else {
            hasAccess = permissions.hasAnyRole(roles);
          }

          if (hasAccess) {
            return child;
          }
        }

        return fallback ?? const SizedBox.shrink();
      },
    );
  }
}

/// 权限守护组件
/// 根据具体权限控制子组件的显示
class PermissionGuard extends StatelessWidget {
  final Widget child;
  final List<String> permissions;
  final bool requireAll;
  final Widget? fallback;
  final Widget? loading;

  const PermissionGuard({
    super.key,
    required this.child,
    required this.permissions,
    this.requireAll = false,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PermissionBloc, PermissionState>(
      builder: (context, state) {
        if (state is PermissionLoading) {
          return loading ?? const Center(child: CircularProgressIndicator());
        }

        if (state is PermissionLoaded) {
          final userPermissions = state.permissions;

          bool hasAccess;
          if (requireAll) {
            hasAccess = userPermissions.hasAllPermissions(permissions);
          } else {
            hasAccess = userPermissions.hasAnyPermission(permissions);
          }

          if (hasAccess) {
            return child;
          }
        }

        return fallback ?? const SizedBox.shrink();
      },
    );
  }
}

/// 权限级别守护组件
/// 根据权限级别控制子组件的显示
class PermissionLevelGuard extends StatelessWidget {
  final Widget child;
  final PermissionLevel requiredLevel;
  final Widget? fallback;
  final Widget? loading;

  const PermissionLevelGuard({
    super.key,
    required this.child,
    required this.requiredLevel,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PermissionBloc, PermissionState>(
      builder: (context, state) {
        if (state is PermissionLoading) {
          return loading ?? const Center(child: CircularProgressIndicator());
        }

        if (state is PermissionLoaded) {
          final permissions = state.permissions;

          if (permissions.hasPermissionLevel(requiredLevel)) {
            return child;
          }
        }

        return fallback ?? const SizedBox.shrink();
      },
    );
  }
}

/// 复合权限守护组件
/// 支持角色、权限和权限级别的复合检查
class ComplexPermissionGuard extends StatelessWidget {
  final Widget child;
  final List<String>? roles;
  final List<String>? permissions;
  final PermissionLevel? requiredLevel;
  final bool requireAll;
  final Widget? fallback;
  final Widget? loading;

  const ComplexPermissionGuard({
    super.key,
    required this.child,
    this.roles,
    this.permissions,
    this.requiredLevel,
    this.requireAll = false,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PermissionBloc, PermissionState>(
      builder: (context, state) {
        if (state is PermissionLoading) {
          return loading ?? const Center(child: CircularProgressIndicator());
        }

        if (state is PermissionLoaded) {
          final userPermissions = state.permissions;
          bool hasAccess = true;

          // 检查角色
          if (roles != null && roles!.isNotEmpty) {
            if (requireAll) {
              hasAccess = hasAccess && userPermissions.hasAllRoles(roles!);
            } else {
              hasAccess = hasAccess && userPermissions.hasAnyRole(roles!);
            }
          }

          // 检查权限
          if (permissions != null && permissions!.isNotEmpty) {
            if (requireAll) {
              hasAccess =
                  hasAccess && userPermissions.hasAllPermissions(permissions!);
            } else {
              hasAccess =
                  hasAccess && userPermissions.hasAnyPermission(permissions!);
            }
          }

          // 检查权限级别
          if (requiredLevel != null) {
            hasAccess =
                hasAccess && userPermissions.hasPermissionLevel(requiredLevel!);
          }

          if (hasAccess) {
            return child;
          }
        }

        return fallback ?? const SizedBox.shrink();
      },
    );
  }
}

// 预定义的常用权限组件

/// 管理员专用组件
class AdminOnly extends StatelessWidget {
  final Widget child;
  final Widget? fallback;
  final Widget? loading;

  const AdminOnly({
    super.key,
    required this.child,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return RoleGuard(
      roles: const ['admin', 'super_admin'],
      fallback: fallback,
      loading: loading,
      child: child,
    );
  }
}

/// 超级管理员专用组件
class SuperAdminOnly extends StatelessWidget {
  final Widget child;
  final Widget? fallback;
  final Widget? loading;

  const SuperAdminOnly({
    super.key,
    required this.child,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return RoleGuard(
      roles: const ['super_admin'],
      fallback: fallback,
      loading: loading,
      child: child,
    );
  }
}

/// 版主专用组件（包括更高权限）
class ModeratorOnly extends StatelessWidget {
  final Widget child;
  final Widget? fallback;
  final Widget? loading;

  const ModeratorOnly({
    super.key,
    required this.child,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return RoleGuard(
      roles: const ['moderator', 'admin', 'super_admin'],
      fallback: fallback,
      loading: loading,
      child: child,
    );
  }
}

/// 工作人员专用组件（版主及以上）
class StaffOnly extends StatelessWidget {
  final Widget child;
  final Widget? fallback;
  final Widget? loading;

  const StaffOnly({
    super.key,
    required this.child,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return RoleGuard(
      roles: const ['moderator', 'admin', 'super_admin'],
      fallback: fallback,
      loading: loading,
      child: child,
    );
  }
}

/// 可管理用户权限组件
class CanManageUsers extends StatelessWidget {
  final Widget child;
  final Widget? fallback;
  final Widget? loading;

  const CanManageUsers({
    super.key,
    required this.child,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return PermissionGuard(
      permissions: const ['manage_users'],
      fallback: fallback,
      loading: loading,
      child: child,
    );
  }
}

/// 可查看系统日志权限组件
class CanViewSystemLogs extends StatelessWidget {
  final Widget child;
  final Widget? fallback;
  final Widget? loading;

  const CanViewSystemLogs({
    super.key,
    required this.child,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return PermissionGuard(
      permissions: const ['view_audit_logs'],
      fallback: fallback,
      loading: loading,
      child: child,
    );
  }
}

/// 权限检查工具类
class PermissionChecker {
  /// 检查当前用户是否有指定权限
  static bool hasPermission(BuildContext context, String permission) {
    final bloc = BlocProvider.of<PermissionBloc>(context);
    return bloc.hasPermission(permission);
  }

  /// 检查当前用户是否有指定角色
  static bool hasRole(BuildContext context, String role) {
    final bloc = BlocProvider.of<PermissionBloc>(context);
    return bloc.hasRole(role);
  }

  /// 检查当前用户是否为管理员
  static bool isAdmin(BuildContext context) {
    final bloc = BlocProvider.of<PermissionBloc>(context);
    return bloc.isAdmin;
  }

  /// 检查当前用户是否为超级管理员
  static bool isSuperAdmin(BuildContext context) {
    final bloc = BlocProvider.of<PermissionBloc>(context);
    return bloc.isSuperAdmin;
  }

  /// 检查当前用户是否为版主
  static bool isModerator(BuildContext context) {
    final bloc = BlocProvider.of<PermissionBloc>(context);
    return bloc.isModerator;
  }

  /// 检查当前用户是否为工作人员
  static bool isStaff(BuildContext context) {
    final bloc = BlocProvider.of<PermissionBloc>(context);
    return bloc.isStaff;
  }

  /// 获取当前用户的权限级别
  static PermissionLevel getPermissionLevel(BuildContext context) {
    final bloc = BlocProvider.of<PermissionBloc>(context);
    return bloc.permissionLevel;
  }

  /// 记录权限检查日志
  static void logPermissionCheck(String action, bool hasPermission,
      {String? userId}) {
    AppLogger.debug(
      '🔐 [PermissionCheck] $action: ${hasPermission ? '✅ 允许' : '❌ 拒绝'}',
      tag: 'Permission',
    );
  }
}
