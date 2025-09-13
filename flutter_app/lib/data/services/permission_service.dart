import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/user_permissions.dart';
import '../../core/utils/logger.dart';
import 'permission_cache_service.dart';

/// 权限服务
/// 负责与后端API交互，获取和管理用户权限信息
class PermissionService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final PermissionCacheService _cacheService = PermissionCacheService();

  /// 从JWT token解析权限（优先策略）
  UserPermissions? _parsePermissionsFromJWT() {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null || user.emailConfirmedAt == null) {
        return null;
      }

      // 从用户的app_metadata中获取权限信息
      final userRole = user.appMetadata['user_role'] as String?;
      final permissions = user.appMetadata['permissions'] as List<dynamic>?;
      
      if (userRole != null) {
        AppLogger.debug('🔐 [JWT] 从JWT token解析权限成功', tag: 'Permission');
        
        return UserPermissions(
          userId: user.id,
          roles: [userRole],
          permissions: permissions?.cast<String>() ?? [],
          permissionLevel: PermissionLevel.fromString(userRole),
          isAdmin: user.appMetadata['is_admin'] == true,
          isSuperAdmin: user.appMetadata['is_super_admin'] == true,
          isModerator: user.appMetadata['is_moderator'] == true,
          canManageUsers: user.appMetadata['can_manage_users'] == true,
          canViewSystemLogs: user.appMetadata['can_view_system_logs'] == true,
        );
      }
    } catch (e) {
      AppLogger.warning('🔐 [JWT] JWT权限解析失败，将使用RPC fallback', tag: 'Permission', error: e);
    }
    
    return null;
  }

  /// RPC权限加载（备用策略）
  Future<UserPermissions?> _fetchPermissionsFromRPC() async {
    try {
      AppLogger.debug('🔐 [RPC] 从服务器获取权限信息', tag: 'Permission');
      
      final response = await _supabase.rpc('rpc_get_current_user_permissions');
      
      if (response == null) {
        AppLogger.error('🔐 [RPC] 权限服务返回空数据', tag: 'Permission');
        return null;
      }

      if (response is Map && response.containsKey('error')) {
        AppLogger.error('🔐 [RPC] 权限服务错误: ${response['error']}', tag: 'Permission');
        return null;
      }

      final permissions = UserPermissions.fromJson(response as Map<String, dynamic>);
      AppLogger.info('🔐 [RPC] 权限信息加载成功: ${permissions.permissionLevel.displayName}', tag: 'Permission');
      
      return permissions;
    } catch (e, stackTrace) {
      AppLogger.error('🔐 [RPC] 获取权限信息失败', tag: 'Permission', error: e, stackTrace: stackTrace);
      return null;
    }
  }

  /// 获取当前用户权限（多层级混合策略：缓存->JWT->RPC）
  Future<UserPermissions?> getCurrentUserPermissions() async {
    try {
      AppLogger.debug('🔐 [Permission] 获取当前用户权限信息', tag: 'Permission');
      
      // 检查用户是否已登录和邮箱是否已确认
      final user = _supabase.auth.currentUser;
      if (user == null) {
        AppLogger.warning('🔐 [Permission] 用户未登录', tag: 'Permission');
        return null;
      }
      
      if (user.emailConfirmedAt == null) {
        AppLogger.warning('🔐 [Permission] 用户邮箱未确认', tag: 'Permission');
        return null;
      }

      // 1. 尝试从本地缓存获取权限（最快路径）
      final cachedPermissions = await _cacheService.getCachedPermissions(user.id);
      if (cachedPermissions != null) {
        AppLogger.debug('🔐 [Permission] 使用本地缓存权限信息', tag: 'Permission');
        return cachedPermissions;
      }

      // 2. 尝试从JWT获取权限（快速路径）
      final jwtPermissions = _parsePermissionsFromJWT();
      if (jwtPermissions != null) {
        AppLogger.debug('🔐 [Permission] 使用JWT权限信息', tag: 'Permission');
        // 缓存JWT权限到本地
        await _cacheService.cachePermissions(jwtPermissions);
        return jwtPermissions;
      }

      // 3. JWT解析失败，使用RPC获取（备用路径）
      AppLogger.debug('🔐 [Permission] JWT解析失败，使用RPC备用方案', tag: 'Permission');
      final rpcPermissions = await _fetchPermissionsFromRPC();
      
      // 缓存RPC权限到本地
      if (rpcPermissions != null) {
        await _cacheService.cachePermissions(rpcPermissions);
      }
      
      return rpcPermissions;
      
    } catch (e, stackTrace) {
      AppLogger.error('🔐 [Permission] 权限获取异常', tag: 'Permission', error: e, stackTrace: stackTrace);
      return null;
    }
  }

  /// 检查特定权限
  Future<bool> hasPermission(String permission) async {
    final permissions = await getCurrentUserPermissions();
    return permissions?.hasPermission(permission) ?? false;
  }

  /// 检查特定角色
  Future<bool> hasRole(String role) async {
    final permissions = await getCurrentUserPermissions();
    return permissions?.hasRole(role) ?? false;
  }

  /// 检查是否为管理员
  Future<bool> isAdmin() async {
    final permissions = await getCurrentUserPermissions();
    return permissions?.isAdmin ?? false;
  }

  /// 检查是否为超级管理员
  Future<bool> isSuperAdmin() async {
    final permissions = await getCurrentUserPermissions();
    return permissions?.isSuperAdmin ?? false;
  }

  /// 检查是否为版主
  Future<bool> isModerator() async {
    final permissions = await getCurrentUserPermissions();
    return permissions?.isModerator ?? false;
  }

  /// 检查是否为工作人员
  Future<bool> isStaff() async {
    final permissions = await getCurrentUserPermissions();
    return permissions?.isStaff ?? false;
  }

  /// 检查权限级别是否足够
  Future<bool> hasPermissionLevel(PermissionLevel requiredLevel) async {
    final permissions = await getCurrentUserPermissions();
    return permissions?.hasPermissionLevel(requiredLevel) ?? false;
  }

  /// 批量权限检查
  Future<Map<String, bool>> checkMultiplePermissions(List<String> permissionNames) async {
    try {
      final permissions = await getCurrentUserPermissions();
      if (permissions == null) {
        return Map.fromEntries(permissionNames.map((name) => MapEntry(name, false)));
      }

      return Map.fromEntries(
        permissionNames.map((name) => MapEntry(name, permissions.hasPermission(name)))
      );
    } catch (e) {
      AppLogger.error('🔐 [Permission] 批量权限检查失败', tag: 'Permission', error: e);
      return Map.fromEntries(permissionNames.map((name) => MapEntry(name, false)));
    }
  }

  /// 批量角色检查
  Future<Map<String, bool>> checkMultipleRoles(List<String> roleNames) async {
    try {
      final permissions = await getCurrentUserPermissions();
      if (permissions == null) {
        return Map.fromEntries(roleNames.map((name) => MapEntry(name, false)));
      }

      return Map.fromEntries(
        roleNames.map((name) => MapEntry(name, permissions.hasRole(name)))
      );
    } catch (e) {
      AppLogger.error('🔐 [Permission] 批量角色检查失败', tag: 'Permission', error: e);
      return Map.fromEntries(roleNames.map((name) => MapEntry(name, false)));
    }
  }

  /// 复杂权限检查
  Future<bool> checkComplexPermission({
    List<String>? roles,
    List<String>? permissions,
    PermissionLevel? permissionLevel,
    bool requireAll = false,
  }) async {
    try {
      final userPermissions = await getCurrentUserPermissions();
      if (userPermissions == null) return false;

      bool hasAccess = true;

      // 检查角色
      if (roles != null && roles.isNotEmpty) {
        if (requireAll) {
          hasAccess = hasAccess && userPermissions.hasAllRoles(roles);
        } else {
          hasAccess = hasAccess && userPermissions.hasAnyRole(roles);
        }
      }

      // 检查权限
      if (permissions != null && permissions.isNotEmpty) {
        if (requireAll) {
          hasAccess = hasAccess && userPermissions.hasAllPermissions(permissions);
        } else {
          hasAccess = hasAccess && userPermissions.hasAnyPermission(permissions);
        }
      }

      // 检查权限级别
      if (permissionLevel != null) {
        hasAccess = hasAccess && userPermissions.hasPermissionLevel(permissionLevel);
      }

      return hasAccess;
    } catch (e) {
      AppLogger.error('🔐 [Permission] 复杂权限检查失败', tag: 'Permission', error: e);
      return false;
    }
  }

  /// 刷新权限（强制重新从服务器获取）
  Future<UserPermissions?> refreshPermissions() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null || user.emailConfirmedAt == null) {
        return null;
      }

      AppLogger.debug('🔐 [Permission] 强制刷新权限信息', tag: 'Permission');
      
      // 清除本地缓存
      await _cacheService.clearCache();
      
      // 优先尝试RPC获取最新权限
      final rpcPermissions = await _fetchPermissionsFromRPC();
      
      if (rpcPermissions != null) {
        // 缓存新的权限信息
        await _cacheService.cachePermissions(rpcPermissions);
        return rpcPermissions;
      }
      
      // RPC失败时尝试JWT
      final jwtPermissions = _parsePermissionsFromJWT();
      if (jwtPermissions != null) {
        await _cacheService.cachePermissions(jwtPermissions);
        return jwtPermissions;
      }
      
      return null;
    } catch (e, stackTrace) {
      AppLogger.error('🔐 [Permission] 权限刷新失败', tag: 'Permission', error: e, stackTrace: stackTrace);
      return null;
    }
  }

  /// 清除权限缓存
  Future<void> clearPermissionCache() async {
    await _cacheService.clearCache();
    AppLogger.debug('🔐 [Permission] 权限缓存已清除', tag: 'Permission');
  }

  /// 获取缓存统计信息
  Future<Map<String, dynamic>> getCacheStats() async {
    return await _cacheService.getCacheStats();
  }
}