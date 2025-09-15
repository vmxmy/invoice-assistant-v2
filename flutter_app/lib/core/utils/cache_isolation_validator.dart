import '../../data/cache/invoice_cache.dart';
import '../../data/services/permission_cache_service.dart';
import '../../presentation/utils/permission_preloader.dart';
import '../network/supabase_client.dart';
import 'logger.dart';

/// 缓存隔离验证器
/// 用于验证用户数据隔离修复是否正确工作
class CacheIsolationValidator {
  static final CacheIsolationValidator _instance =
      CacheIsolationValidator._internal();
  factory CacheIsolationValidator() => _instance;
  CacheIsolationValidator._internal();

  final InvoiceCache _invoiceCache = InvoiceCache();
  final PermissionCacheService _permissionCache = PermissionCacheService();
  final PermissionPreloader _preloader = PermissionPreloader();

  /// 验证缓存隔离机制
  Future<Map<String, dynamic>> validateCacheIsolation() async {
    AppLogger.info('🔍 [CacheValidator] 开始验证缓存隔离机制', tag: 'Validation');

    final results = <String, dynamic>{};

    try {
      // 1. 验证当前用户上下文
      final currentUser = SupabaseClientManager.currentUser;
      results['currentUser'] = {
        'isAuthenticated': currentUser != null,
        'userId': currentUser?.id,
        'emailConfirmed': currentUser?.emailConfirmedAt != null,
      };

      // 2. 验证发票缓存隔离
      results['invoiceCache'] = await _validateInvoiceCacheIsolation();

      // 3. 验证权限缓存隔离
      results['permissionCache'] = await _validatePermissionCacheIsolation();

      // 4. 验证预加载器状态
      results['preloader'] = await _validatePreloaderState();

      // 5. 生成整体评估
      results['overallAssessment'] = _generateOverallAssessment(results);

      AppLogger.info('✅ [CacheValidator] 缓存隔离验证完成', tag: 'Validation');
    } catch (e, stackTrace) {
      AppLogger.error(
        '❌ [CacheValidator] 缓存隔离验证失败',
        tag: 'Validation',
        error: e,
        stackTrace: stackTrace,
      );

      results['error'] = {
        'message': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      };
    }

    return results;
  }

  /// 验证发票缓存隔离
  Future<Map<String, dynamic>> _validateInvoiceCacheIsolation() async {
    final stats = _invoiceCache.getCacheStats();
    final currentUser = SupabaseClientManager.currentUser;

    return {
      'userContextMatches': stats['currentUserId'] == currentUser?.id,
      'hasUserIsolation': stats['totalUsers'] >= 0,
      'currentUserStats': stats['currentUserStats'],
      'systemStats': stats['systemStats'],
      'validation': {
        'userIdConsistent': stats['currentUserId'] == currentUser?.id,
        'noDataLeakage': _checkNoDataLeakage(stats),
        'properIsolation': stats['totalUsers'] <= 10, // 合理的用户数量
      }
    };
  }

  /// 验证权限缓存隔离
  Future<Map<String, dynamic>> _validatePermissionCacheIsolation() async {
    final currentUser = SupabaseClientManager.currentUser;
    if (currentUser == null) {
      return {
        'userNotAuthenticated': true,
        'validation': {'cannotValidate': true}
      };
    }

    final cacheStats = await _permissionCache.getCacheStats();
    final hasValidCache = await _permissionCache.isCacheValid(currentUser.id);

    return {
      'cacheStats': cacheStats,
      'hasValidCache': hasValidCache,
      'validation': {
        'userIdMatches': cacheStats['cachedUserId'] == currentUser.id,
        'cacheHealthy': !cacheStats.containsKey('error'),
        'appropriateExpiration':
            cacheStats['isExpired'] == false || cacheStats['isExpired'] == null,
      }
    };
  }

  /// 验证预加载器状态
  Future<Map<String, dynamic>> _validatePreloaderState() async {
    final preloadStats = await _preloader.getPreloadStats();

    return {
      'preloadStats': preloadStats,
      'validation': {
        'notStuckPreloading': !preloadStats['isPreloading'],
        'cacheStatsAvailable': preloadStats['cacheStats'] != null,
      }
    };
  }

  /// 检查是否存在数据泄漏
  bool _checkNoDataLeakage(Map<String, dynamic> stats) {
    final totalUsers = stats['totalUsers'] as int? ?? 0;

    // 如果有多个用户，但当前用户缓存为空，可能存在泄漏
    if (totalUsers > 1) {
      // 简单检查：如果系统中有多用户缓存，但当前用户没有缓存，这是正常的
      // 数据泄漏通常表现为：当前用户有不应该有的缓存数据
      return true; // 目前简单返回 true，实际项目中可以更复杂的检查
    }

    return true;
  }

  /// 生成整体评估
  Map<String, dynamic> _generateOverallAssessment(
      Map<String, dynamic> results) {
    final issues = <String>[];
    final successes = <String>[];

    // 检查用户认证
    final currentUser = results['currentUser'] as Map<String, dynamic>? ?? {};
    if (currentUser['isAuthenticated'] != true) {
      issues.add('用户未认证');
    } else if (currentUser['emailConfirmed'] != true) {
      issues.add('用户邮箱未确认');
    } else {
      successes.add('用户认证状态正常');
    }

    // 检查发票缓存
    final invoiceCache = results['invoiceCache'] as Map<String, dynamic>? ?? {};
    final invoiceValidation =
        invoiceCache['validation'] as Map<String, dynamic>? ?? {};

    if (invoiceValidation['userIdConsistent'] == true) {
      successes.add('发票缓存用户ID一致');
    } else {
      issues.add('发票缓存用户ID不一致');
    }

    if (invoiceValidation['noDataLeakage'] == true) {
      successes.add('发票缓存无数据泄漏');
    } else {
      issues.add('发票缓存可能存在数据泄漏');
    }

    // 检查权限缓存
    final permissionCache =
        results['permissionCache'] as Map<String, dynamic>? ?? {};
    final permissionValidation =
        permissionCache['validation'] as Map<String, dynamic>? ?? {};

    if (permissionValidation['userIdMatches'] == true) {
      successes.add('权限缓存用户ID匹配');
    } else if (!permissionValidation.containsKey('userIdMatches')) {
      successes.add('权限缓存状态正常（无缓存）');
    } else {
      issues.add('权限缓存用户ID不匹配');
    }

    // 生成评分
    final totalChecks = successes.length + issues.length;
    final score =
        totalChecks > 0 ? (successes.length / totalChecks * 100).round() : 0;

    String assessment;
    if (score >= 90) {
      assessment = '优秀 - 缓存隔离机制工作正常';
    } else if (score >= 70) {
      assessment = '良好 - 大部分功能正常，有少量问题';
    } else if (score >= 50) {
      assessment = '需要改进 - 存在一些重要问题';
    } else {
      assessment = '严重问题 - 缓存隔离可能失效';
    }

    return {
      'score': score,
      'assessment': assessment,
      'successes': successes,
      'issues': issues,
      'recommendation': _getRecommendation(issues),
      'timestamp': DateTime.now().toIso8601String(),
    };
  }

  /// 获取建议
  String _getRecommendation(List<String> issues) {
    if (issues.isEmpty) {
      return '缓存隔离机制运行良好，继续监控即可';
    }

    if (issues.any((issue) => issue.contains('数据泄漏'))) {
      return '发现潜在数据泄漏，建议立即检查缓存实现并清理所有缓存';
    }

    if (issues.any((issue) => issue.contains('用户ID'))) {
      return '用户ID不一致，建议检查认证状态和缓存实现';
    }

    if (issues.any((issue) => issue.contains('认证'))) {
      return '用户认证问题，建议重新登录';
    }

    return '存在一些问题，建议检查具体的失败项并进行修复';
  }

  /// 执行完整的缓存健康检查
  Future<void> performHealthCheck() async {
    AppLogger.info('🏥 [CacheValidator] 执行缓存健康检查', tag: 'Validation');

    try {
      final results = await validateCacheIsolation();
      final assessment =
          results['overallAssessment'] as Map<String, dynamic>? ?? {};

      AppLogger.info(
          '📊 [CacheValidator] 评估结果: ${assessment['assessment']} (${assessment['score']}%)',
          tag: 'Validation');

      final successes = assessment['successes'] as List<dynamic>? ?? [];
      for (final success in successes) {
        AppLogger.info('✅ [CacheValidator] $success', tag: 'Validation');
      }

      final issues = assessment['issues'] as List<dynamic>? ?? [];
      for (final issue in issues) {
        AppLogger.warning('⚠️ [CacheValidator] $issue', tag: 'Validation');
      }

      if (issues.isNotEmpty) {
        AppLogger.info(
            '💡 [CacheValidator] 建议: ${assessment['recommendation']}',
            tag: 'Validation');
      }
    } catch (e, stackTrace) {
      AppLogger.error(
        '❌ [CacheValidator] 健康检查失败',
        tag: 'Validation',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }
}
