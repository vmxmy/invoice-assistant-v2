/// 用户权限实体
/// 包含用户的角色、权限和权限级别信息
class UserPermissions {
  final String userId;
  final List<String> roles;
  final List<String> permissions;
  final PermissionLevel permissionLevel;
  final bool isAdmin;
  final bool isSuperAdmin;
  final bool isModerator;
  final bool canManageUsers;
  final bool canViewSystemLogs;

  const UserPermissions({
    required this.userId,
    required this.roles,
    required this.permissions,
    required this.permissionLevel,
    required this.isAdmin,
    required this.isSuperAdmin,
    required this.isModerator,
    required this.canManageUsers,
    required this.canViewSystemLogs,
  });

  /// 检查是否有特定权限
  bool hasPermission(String permission) {
    return permissions.contains(permission);
  }

  /// 检查是否有特定角色
  bool hasRole(String role) {
    return roles.contains(role);
  }

  /// 检查是否有任意一个指定角色
  bool hasAnyRole(List<String> checkRoles) {
    return checkRoles.any((role) => roles.contains(role));
  }

  /// 检查是否有所有指定角色
  bool hasAllRoles(List<String> checkRoles) {
    return checkRoles.every((role) => roles.contains(role));
  }

  /// 检查是否有任意一个指定权限
  bool hasAnyPermission(List<String> checkPermissions) {
    return checkPermissions
        .any((permission) => permissions.contains(permission));
  }

  /// 检查是否有所有指定权限
  bool hasAllPermissions(List<String> checkPermissions) {
    return checkPermissions
        .every((permission) => permissions.contains(permission));
  }

  /// 检查是否为工作人员（版主、管理员或超级管理员）
  bool get isStaff => isModerator || isAdmin || isSuperAdmin;

  /// 检查是否可以编辑指定权限级别的用户
  bool canEditUser(PermissionLevel targetLevel) {
    // 超级管理员可以编辑所有用户
    if (isSuperAdmin) return true;

    // 管理员不能编辑超级管理员
    if (isAdmin && targetLevel != PermissionLevel.superAdmin) return true;

    // 版主只能编辑普通用户
    if (isModerator && targetLevel == PermissionLevel.user) return true;

    return false;
  }

  /// 检查权限级别是否足够
  bool hasPermissionLevel(PermissionLevel requiredLevel) {
    return permissionLevel.index >= requiredLevel.index;
  }

  /// 从JSON创建实例
  factory UserPermissions.fromJson(Map<String, dynamic> json) {
    return UserPermissions(
      userId: json['user_id'] as String,
      roles: List<String>.from(json['roles'] as List? ?? []),
      permissions: List<String>.from(json['permissions'] as List? ?? []),
      permissionLevel: PermissionLevel.fromString(
          json['permission_level'] as String? ?? 'user'),
      isAdmin: json['is_admin'] as bool? ?? false,
      isSuperAdmin: json['is_super_admin'] as bool? ?? false,
      isModerator: json['is_moderator'] as bool? ?? false,
      canManageUsers: json['can_manage_users'] as bool? ?? false,
      canViewSystemLogs: json['can_view_system_logs'] as bool? ?? false,
    );
  }

  /// 转换为JSON
  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'roles': roles,
      'permissions': permissions,
      'permission_level': permissionLevel.value,
      'is_admin': isAdmin,
      'is_super_admin': isSuperAdmin,
      'is_moderator': isModerator,
      'can_manage_users': canManageUsers,
      'can_view_system_logs': canViewSystemLogs,
    };
  }

  @override
  String toString() {
    return 'UserPermissions{userId: $userId, roles: $roles, permissions: $permissions, level: ${permissionLevel.value}}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is UserPermissions &&
        other.userId == userId &&
        other.roles.toString() == roles.toString() &&
        other.permissions.toString() == permissions.toString() &&
        other.permissionLevel == permissionLevel;
  }

  @override
  int get hashCode {
    return Object.hash(
      userId,
      roles.toString(),
      permissions.toString(),
      permissionLevel,
    );
  }

  /// 创建副本
  UserPermissions copyWith({
    String? userId,
    List<String>? roles,
    List<String>? permissions,
    PermissionLevel? permissionLevel,
    bool? isAdmin,
    bool? isSuperAdmin,
    bool? isModerator,
    bool? canManageUsers,
    bool? canViewSystemLogs,
  }) {
    return UserPermissions(
      userId: userId ?? this.userId,
      roles: roles ?? this.roles,
      permissions: permissions ?? this.permissions,
      permissionLevel: permissionLevel ?? this.permissionLevel,
      isAdmin: isAdmin ?? this.isAdmin,
      isSuperAdmin: isSuperAdmin ?? this.isSuperAdmin,
      isModerator: isModerator ?? this.isModerator,
      canManageUsers: canManageUsers ?? this.canManageUsers,
      canViewSystemLogs: canViewSystemLogs ?? this.canViewSystemLogs,
    );
  }
}

/// 权限级别枚举
enum PermissionLevel {
  user('user'),
  moderator('moderator'),
  admin('admin'),
  superAdmin('super_admin');

  const PermissionLevel(this.value);

  final String value;

  /// 从字符串创建权限级别
  static PermissionLevel fromString(String value) {
    return PermissionLevel.values.firstWhere(
      (level) => level.value == value,
      orElse: () => PermissionLevel.user,
    );
  }

  /// 获取显示名称
  String get displayName {
    switch (this) {
      case PermissionLevel.user:
        return '普通用户';
      case PermissionLevel.moderator:
        return '版主';
      case PermissionLevel.admin:
        return '管理员';
      case PermissionLevel.superAdmin:
        return '超级管理员';
    }
  }

  /// 获取权限级别颜色
  String get colorHex {
    switch (this) {
      case PermissionLevel.user:
        return '#6B7280'; // 灰色
      case PermissionLevel.moderator:
        return '#059669'; // 绿色
      case PermissionLevel.admin:
        return '#DC2626'; // 红色
      case PermissionLevel.superAdmin:
        return '#7C2D12'; // 深红色
    }
  }
}
