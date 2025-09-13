import 'package:supabase_flutter/supabase_flutter.dart';
import '../bloc/permission_bloc.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_event.dart';
import '../bloc/reimbursement_set_bloc.dart';
import '../bloc/reimbursement_set_event.dart';
import '../../data/services/permission_cache_service.dart';
import '../../core/utils/logger.dart';

/// 权限预加载器和缓存管理器
/// 在应用启动时智能预加载权限，管理用户切换时的缓存清理
class PermissionPreloader {
  static final PermissionPreloader _instance = PermissionPreloader._internal();
  factory PermissionPreloader() => _instance;
  PermissionPreloader._internal();

  final PermissionCacheService _cacheService = PermissionCacheService();
  
  bool _isPreloading = false;
  String? _lastUserId;

  /// 预加载权限
  /// 在应用启动或用户登录后立即调用
  Future<void> preloadPermissions({
    required PermissionBloc permissionBloc,
    bool force = false,
  }) async {
    if (_isPreloading && !force) {
      AppLogger.debug('🔐 [PermissionPreloader] 权限预加载已在进行中', tag: 'Permission');
      return;
    }

    try {
      _isPreloading = true;
      
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null || user.emailConfirmedAt == null) {
        AppLogger.debug('🔐 [PermissionPreloader] 用户未认证，跳过权限预加载', tag: 'Permission');
        return;
      }

      AppLogger.debug('🔐 [PermissionPreloader] 开始权限预加载', tag: 'Permission');

      // 检查是否有有效缓存
      final hasValidCache = await _cacheService.isCacheValid(user.id);
      
      if (hasValidCache) {
        AppLogger.debug('🔐 [PermissionPreloader] 发现有效缓存，触发BLoC加载', tag: 'Permission');
        // 有缓存时，触发BLoC加载（会自动使用缓存）
        permissionBloc.add(const LoadPermissions());
      } else {
        AppLogger.debug('🔐 [PermissionPreloader] 无有效缓存，后台预加载权限', tag: 'Permission');
        // 无缓存时，在后台预加载权限但不阻塞UI
        _backgroundPreload(permissionBloc);
      }

    } catch (e, stackTrace) {
      AppLogger.error(
        '🔐 [PermissionPreloader] 权限预加载失败',
        tag: 'Permission',
        error: e,
        stackTrace: stackTrace,
      );
    } finally {
      _isPreloading = false;
    }
  }

  /// 后台预加载权限（不阻塞UI）
  void _backgroundPreload(PermissionBloc permissionBloc) {
    Future.delayed(const Duration(milliseconds: 100), () async {
      try {
        AppLogger.debug('🔐 [PermissionPreloader] 执行后台权限预加载', tag: 'Permission');
        permissionBloc.add(const LoadPermissions());
      } catch (e) {
        AppLogger.error(
          '🔐 [PermissionPreloader] 后台权限预加载失败',
          tag: 'Permission',
          error: e,
        );
      }
    });
  }

  /// 在认证状态变更时预加载权限和管理缓存
  Future<void> onAuthStateChanged({
    required PermissionBloc permissionBloc,
    required AuthState authState,
    InvoiceBloc? invoiceBloc,
    ReimbursementSetBloc? reimbursementSetBloc,
  }) async {
    try {
      AppLogger.debug('🔐 [PermissionPreloader] 认证状态变更: ${authState.event}', tag: 'Permission');

      switch (authState.event) {
        case AuthChangeEvent.signedIn:
          // 用户登录时检查用户切换并清理缓存
          await _handleUserLogin(
            permissionBloc: permissionBloc,
            invoiceBloc: invoiceBloc,
            reimbursementSetBloc: reimbursementSetBloc,
          );
          break;
          
        case AuthChangeEvent.signedOut:
          // 用户登出时清除所有缓存和状态
          await _handleUserLogout(
            permissionBloc: permissionBloc,
            invoiceBloc: invoiceBloc,
            reimbursementSetBloc: reimbursementSetBloc,
          );
          break;
          
        case AuthChangeEvent.tokenRefreshed:
          // Token刷新时可能权限有变化，强制刷新权限
          AppLogger.debug('🔐 [PermissionPreloader] Token刷新，更新权限', tag: 'Permission');
          permissionBloc.add(const RefreshPermissions());
          break;
          
        default:
          // 其他事件不处理
          break;
      }
    } catch (e, stackTrace) {
      AppLogger.error(
        '🔐 [PermissionPreloader] 认证状态变更处理失败',
        tag: 'Permission',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// 处理用户登录
  Future<void> _handleUserLogin({
    required PermissionBloc permissionBloc,
    InvoiceBloc? invoiceBloc,
    ReimbursementSetBloc? reimbursementSetBloc,
  }) async {
    final currentUser = Supabase.instance.client.auth.currentUser;
    final currentUserId = currentUser?.id;
    
    if (currentUserId == null || currentUser?.emailConfirmedAt == null) {
      AppLogger.warning('🚨 [PermissionPreloader] 用户登录但未验证邮箱', tag: 'Permission');
      return;
    }

    // 检查用户是否切换
    if (_lastUserId != null && _lastUserId != currentUserId) {
      AppLogger.warning(
        '🔄 [PermissionPreloader] 检测到用户切换: $_lastUserId -> $currentUserId',
        tag: 'Permission',
      );
      
      // 用户切换时清理所有BLoC状态，但保留各用户的缓存隔离
      permissionBloc.add(const ClearPermissions());
      invoiceBloc?.add(ClearInvoices());
      reimbursementSetBloc?.add(ClearReimbursementSets());
      
      // 短暂延迟确保状态清理完成
      await Future.delayed(const Duration(milliseconds: 100));
    } else if (_lastUserId == currentUserId) {
      AppLogger.debug('🔐 [PermissionPreloader] 同用户重新登录', tag: 'Permission');
    } else {
      AppLogger.debug('🔐 [PermissionPreloader] 首次用户登录', tag: 'Permission');
    }
    
    _lastUserId = currentUserId;
    
    // 预加载权限
    await preloadPermissions(permissionBloc: permissionBloc);
    
    AppLogger.info('✅ [PermissionPreloader] 用户登录处理完成: $currentUserId', tag: 'Permission');
  }

  /// 处理用户登出
  Future<void> _handleUserLogout({
    required PermissionBloc permissionBloc,
    InvoiceBloc? invoiceBloc,
    ReimbursementSetBloc? reimbursementSetBloc,
  }) async {
    final logoutUserId = _lastUserId;
    
    AppLogger.info('👋 [PermissionPreloader] 用户登出处理: $logoutUserId', tag: 'Permission');
    
    // 清除所有BLoC状态
    permissionBloc.add(const ClearPermissions());
    invoiceBloc?.add(ClearInvoices());
    reimbursementSetBloc?.add(ClearReimbursementSets());
    
    // 重置用户跟踪
    _lastUserId = null;
    
    AppLogger.info('✅ [PermissionPreloader] 用户登出处理完成', tag: 'Permission');
  }

  /// 智能权限检查
  /// 在需要权限时自动检查并预加载
  Future<bool> smartPermissionCheck({
    required PermissionBloc permissionBloc,
    required String permission,
    Duration timeout = const Duration(seconds: 3),
  }) async {
    try {
      // 检查当前状态
      final currentState = permissionBloc.state;
      
      if (currentState is PermissionLoaded) {
        // 权限已加载，直接检查
        return permissionBloc.hasPermission(permission);
      }
      
      if (currentState is PermissionInitial || currentState is PermissionEmpty) {
        // 权限未加载，触发加载
        AppLogger.debug('🔐 [PermissionPreloader] 权限未加载，触发预加载', tag: 'Permission');
        permissionBloc.add(const LoadPermissions());
        
        // 等待权限加载完成
        await _waitForPermissionLoad(permissionBloc, timeout);
        
        return permissionBloc.hasPermission(permission);
      }
      
      if (currentState is PermissionLoading) {
        // 正在加载，等待完成
        await _waitForPermissionLoad(permissionBloc, timeout);
        return permissionBloc.hasPermission(permission);
      }
      
      // 其他状态（如错误）返回false
      return false;
      
    } catch (e) {
      AppLogger.error(
        '🔐 [PermissionPreloader] 智能权限检查失败',
        tag: 'Permission',
        error: e,
      );
      return false;
    }
  }

  /// 等待权限加载完成
  Future<void> _waitForPermissionLoad(
    PermissionBloc permissionBloc,
    Duration timeout,
  ) async {
    final startTime = DateTime.now();
    
    while (DateTime.now().difference(startTime) < timeout) {
      final state = permissionBloc.state;
      
      if (state is PermissionLoaded || state is PermissionError || state is PermissionEmpty) {
        break;
      }
      
      // 等待50毫秒后再次检查
      await Future.delayed(const Duration(milliseconds: 50));
    }
  }

  /// 获取预加载统计信息
  Future<Map<String, dynamic>> getPreloadStats() async {
    final cacheStats = await _cacheService.getCacheStats();
    
    return {
      'isPreloading': _isPreloading,
      'cacheStats': cacheStats,
    };
  }
}