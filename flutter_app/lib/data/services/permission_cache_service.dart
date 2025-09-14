import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/user_permissions.dart';
import '../../core/utils/logger.dart';
import '../../core/config/app_constants.dart';

/// 权限持久化缓存服务
/// 提供权限数据的本地存储，支持离线访问和性能优化
class PermissionCacheService {
  static const String _permissionsCacheKey = 'user_permissions_cache';
  static const String _permissionsCacheTimeKey = 'user_permissions_cache_time';
  static const String _userIdKey = 'cached_user_id';
  
  // 缓存过期时间：2小时
  static Duration get _cacheExpiration => AppConstants.permissionsCacheTtl;

  /// 缓存用户权限到本地存储
  Future<void> cachePermissions(UserPermissions permissions) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // 存储权限数据
      final permissionsJson = json.encode(permissions.toJson());
      await prefs.setString(_permissionsCacheKey, permissionsJson);
      
      // 存储缓存时间戳
      final cacheTime = DateTime.now().millisecondsSinceEpoch;
      await prefs.setInt(_permissionsCacheTimeKey, cacheTime);
      
      // 存储用户ID，用于验证缓存有效性
      await prefs.setString(_userIdKey, permissions.userId);
      
      AppLogger.debug(
        '🔐 [PermissionCache] 权限缓存已保存到本地存储',
        tag: 'Permission'
      );
    } catch (e, stackTrace) {
      AppLogger.error(
        '🔐 [PermissionCache] 权限缓存保存失败',
        tag: 'Permission',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// 从本地存储获取缓存的权限
  Future<UserPermissions?> getCachedPermissions(String currentUserId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // 检查用户ID是否匹配
      final cachedUserId = prefs.getString(_userIdKey);
      if (cachedUserId != currentUserId) {
        AppLogger.debug(
          '🔐 [PermissionCache] 用户ID不匹配，清除旧缓存',
          tag: 'Permission'
        );
        await clearCache();
        return null;
      }
      
      // 检查缓存是否过期
      final cacheTime = prefs.getInt(_permissionsCacheTimeKey);
      if (cacheTime == null) {
        AppLogger.debug('🔐 [PermissionCache] 缓存时间戳不存在', tag: 'Permission');
        return null;
      }
      
      final cacheDateTime = DateTime.fromMillisecondsSinceEpoch(cacheTime);
      final now = DateTime.now();
      final isExpired = now.difference(cacheDateTime) > _cacheExpiration;
      
      if (isExpired) {
        AppLogger.debug(
          '🔐 [PermissionCache] 缓存已过期，清除缓存',
          tag: 'Permission'
        );
        await clearCache();
        return null;
      }
      
      // 获取权限数据
      final permissionsJson = prefs.getString(_permissionsCacheKey);
      if (permissionsJson == null) {
        AppLogger.debug('🔐 [PermissionCache] 权限缓存数据不存在', tag: 'Permission');
        return null;
      }
      
      final permissionsMap = json.decode(permissionsJson) as Map<String, dynamic>;
      final permissions = UserPermissions.fromJson(permissionsMap);
      
      AppLogger.debug(
        '🔐 [PermissionCache] 从本地缓存加载权限成功: ${permissions.permissionLevel.displayName}',
        tag: 'Permission'
      );
      
      return permissions;
    } catch (e, stackTrace) {
      AppLogger.error(
        '🔐 [PermissionCache] 权限缓存读取失败',
        tag: 'Permission',
        error: e,
        stackTrace: stackTrace,
      );
      
      // 发生错误时清除可能损坏的缓存
      await clearCache();
      return null;
    }
  }

  /// 检查缓存是否存在且有效
  Future<bool> isCacheValid(String currentUserId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // 检查用户ID
      final cachedUserId = prefs.getString(_userIdKey);
      if (cachedUserId != currentUserId) return false;
      
      // 检查过期时间
      final cacheTime = prefs.getInt(_permissionsCacheTimeKey);
      if (cacheTime == null) return false;
      
      final cacheDateTime = DateTime.fromMillisecondsSinceEpoch(cacheTime);
      final now = DateTime.now();
      final isExpired = now.difference(cacheDateTime) > _cacheExpiration;
      
      return !isExpired && prefs.containsKey(_permissionsCacheKey);
    } catch (e) {
      AppLogger.warning(
        '🔐 [PermissionCache] 缓存有效性检查失败',
        tag: 'Permission',
        error: e,
      );
      return false;
    }
  }

  /// 清除权限缓存
  Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      await Future.wait([
        prefs.remove(_permissionsCacheKey),
        prefs.remove(_permissionsCacheTimeKey),
        prefs.remove(_userIdKey),
      ]);
      
      AppLogger.debug('🔐 [PermissionCache] 权限缓存已清除', tag: 'Permission');
    } catch (e) {
      AppLogger.error(
        '🔐 [PermissionCache] 权限缓存清除失败',
        tag: 'Permission',
        error: e,
      );
    }
  }

  /// 获取缓存统计信息
  Future<Map<String, dynamic>> getCacheStats() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      final cachedUserId = prefs.getString(_userIdKey);
      final cacheTime = prefs.getInt(_permissionsCacheTimeKey);
      final hasPermissionsData = prefs.containsKey(_permissionsCacheKey);
      
      DateTime? cacheDateTime;
      Duration? cacheAge;
      bool isExpired = true;
      
      if (cacheTime != null) {
        cacheDateTime = DateTime.fromMillisecondsSinceEpoch(cacheTime);
        cacheAge = DateTime.now().difference(cacheDateTime);
        isExpired = cacheAge > _cacheExpiration;
      }
      
      return {
        'hasCache': hasPermissionsData && cachedUserId != null && cacheTime != null,
        'cachedUserId': cachedUserId,
        'cacheTime': cacheDateTime?.toIso8601String(),
        'cacheAgeInMinutes': cacheAge?.inMinutes,
        'isExpired': isExpired,
        'expirationInHours': _cacheExpiration.inHours,
      };
    } catch (e) {
      AppLogger.error(
        '🔐 [PermissionCache] 获取缓存统计信息失败',
        tag: 'Permission',
        error: e,
      );
      
      return {
        'hasCache': false,
        'error': e.toString(),
      };
    }
  }
}