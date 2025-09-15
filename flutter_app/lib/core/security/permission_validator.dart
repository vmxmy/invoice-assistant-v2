import '../network/supabase_client.dart';
import '../utils/logger.dart';
import '../config/app_config.dart';

/// 权限验证器
/// 在客户端进行额外的安全验证，配合数据库RLS策略使用
class PermissionValidator {
  PermissionValidator._();

  /// 验证用户是否有权限访问特定发票
  static Future<bool> canAccessInvoice(String invoiceId) async {
    try {
      if (!SupabaseClientManager.isAuthenticated) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('用户未认证，无法访问发票', tag: 'Security');
        }
        return false;
      }

      // 调用数据库函数验证权限
      final response = await SupabaseClientManager.client
          .rpc('user_can_access_invoice', params: {'invoice_id': invoiceId});

      final canAccess = response as bool? ?? false;

      if (AppConfig.enableLogging && !canAccess) {
        AppLogger.warning('用户无权限访问发票', tag: 'Security');
      }

      return canAccess;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('验证发票访问权限失败', tag: 'Security', error: e);
      }
      return false;
    }
  }

  /// 验证用户是否有权限访问特定报销集
  static Future<bool> canAccessReimbursementSet(String setId) async {
    try {
      if (!SupabaseClientManager.isAuthenticated) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('用户未认证，无法访问报销集', tag: 'Security');
        }
        return false;
      }

      // 调用数据库函数验证权限
      final response = await SupabaseClientManager.client
          .rpc('user_can_access_reimbursement_set', params: {'set_id': setId});

      final canAccess = response as bool? ?? false;

      if (AppConfig.enableLogging && !canAccess) {
        AppLogger.warning('用户无权限访问报销集', tag: 'Security');
      }

      return canAccess;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('验证报销集访问权限失败', tag: 'Security', error: e);
      }
      return false;
    }
  }

  /// 验证文件路径是否安全
  static bool isValidFilePath(String filePath) {
    // 检查路径遍历攻击
    if (filePath.contains('..') || filePath.contains('//')) {
      if (AppConfig.enableLogging) {
        AppLogger.warning('检测到路径遍历攻击尝试', tag: 'Security');
      }
      return false;
    }

    // 检查非法字符
    final RegExp invalidChars = RegExp(r'[<>:"|?*\x00-\x1f]');
    if (invalidChars.hasMatch(filePath)) {
      if (AppConfig.enableLogging) {
        AppLogger.warning('文件路径包含非法字符', tag: 'Security');
      }
      return false;
    }

    // 检查路径长度
    if (filePath.length > 500) {
      if (AppConfig.enableLogging) {
        AppLogger.warning('文件路径过长', tag: 'Security');
      }
      return false;
    }

    // 验证文件扩展名
    final allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    final lowercasePath = filePath.toLowerCase();
    bool hasValidExtension = allowedExtensions.any((ext) => lowercasePath.endsWith(ext));
    
    if (!hasValidExtension) {
      if (AppConfig.enableLogging) {
        AppLogger.warning('不支持的文件类型', tag: 'Security');
      }
      return false;
    }

    return true;
  }

  /// 验证用户是否有权限访问文件
  static Future<bool> canAccessFile(String filePath) async {
    try {
      if (!SupabaseClientManager.isAuthenticated) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('用户未认证，无法访问文件', tag: 'Security');
        }
        return false;
      }

      // 验证文件路径安全性
      if (!isValidFilePath(filePath)) {
        return false;
      }

      final currentUserId = SupabaseClientManager.currentUser?.id;
      if (currentUserId == null) {
        return false;
      }

      // 检查文件路径是否属于当前用户
      final userFolder = filePath.split('/').first;
      final canAccess = userFolder == currentUserId;

      if (AppConfig.enableLogging && !canAccess) {
        AppLogger.warning('用户尝试访问其他用户文件', tag: 'Security');
      }

      return canAccess;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('验证文件访问权限失败', tag: 'Security', error: e);
      }
      return false;
    }
  }

  /// 生成安全的文件上传路径
  static Future<String?> generateSecureUploadPath(String fileName) async {
    try {
      if (!SupabaseClientManager.isAuthenticated) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('用户未认证，无法生成上传路径', tag: 'Security');
        }
        return null;
      }

      // 调用数据库函数生成安全路径
      final response = await SupabaseClientManager.client
          .rpc('generate_secure_file_path', params: {'file_name': fileName});

      final securePath = response as String?;

      if (AppConfig.enableLogging && securePath != null) {
        AppLogger.debug('生成安全上传路径成功', tag: 'Security');
      }

      return securePath;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('生成安全上传路径失败', tag: 'Security', error: e);
      }
      return null;
    }
  }

  /// 记录安全事件
  static Future<void> logSecurityEvent({
    required String action,
    required String resourceType,
    String? resourceId,
    String? details,
    String riskLevel = 'low',
  }) async {
    try {
      if (!SupabaseClientManager.isAuthenticated) {
        return;
      }

      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser == null) return;

      // 插入安全日志
      await SupabaseClientManager.client.from('audit_logs').insert({
        'user_id': currentUser.id,
        'user_email': currentUser.email,
        'action': action,
        'table_name': resourceType,
        'record_id': resourceId,
        'risk_level': riskLevel,
        'new_values': details != null ? {'details': details} : null,
        'created_at': DateTime.now().toIso8601String(),
      });

      if (AppConfig.enableLogging) {
        AppLogger.info('安全事件已记录: $action $resourceType', tag: 'Security');
      }
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('记录安全事件失败', tag: 'Security', error: e);
      }
    }
  }

  /// 检查用户是否有异常操作模式
  static Future<bool> hasAnomalousActivity() async {
    try {
      if (!SupabaseClientManager.isAuthenticated) {
        return false;
      }

      // 调用数据库函数检测可疑活动
      final response = await SupabaseClientManager.client
          .rpc('detect_suspicious_activity');

      final suspiciousActivities = response as List<dynamic>? ?? [];
      final currentUserId = SupabaseClientManager.currentUser?.id;
      
      // 检查当前用户是否有可疑活动
      final hasAnomalies = suspiciousActivities.any((activity) => 
          activity['user_id'] == currentUserId);

      if (hasAnomalies && AppConfig.enableLogging) {
        AppLogger.warning('检测到用户异常活动模式', tag: 'Security');
      }

      return hasAnomalies;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.error('检查异常活动失败', tag: 'Security', error: e);
      }
      return false;
    }
  }

  /// 验证操作频率限制
  static final Map<String, DateTime> _lastOperationTime = {};
  static const int _operationCooldownMs = 1000; // 1秒冷却时间

  static bool checkOperationRate(String operationType) {
    final now = DateTime.now();
    final lastTime = _lastOperationTime[operationType];
    
    if (lastTime != null) {
      final timeDiff = now.difference(lastTime).inMilliseconds;
      if (timeDiff < _operationCooldownMs) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('操作频率过高: $operationType', tag: 'Security');
        }
        return false;
      }
    }
    
    _lastOperationTime[operationType] = now;
    return true;
  }

  /// 验证输入数据的安全性
  static bool isValidInput(String input) {
    // 检查SQL注入模式
    final sqlInjectionPatterns = [
      RegExp(r"('|(\\')|(;)|(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b))", caseSensitive: false),
      RegExp(r'(\b(OR|AND)\b\s*\d+\s*=\s*\d+)', caseSensitive: false),
      RegExp(r'(-{2}|/\*|\*/)', caseSensitive: false),
    ];

    for (final pattern in sqlInjectionPatterns) {
      if (pattern.hasMatch(input)) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('检测到潜在的SQL注入尝试', tag: 'Security');
        }
        return false;
      }
    }

    // 检查XSS模式
    final xssPatterns = [
      RegExp(r'<script[^>]*>.*?</script>', caseSensitive: false),
      RegExp(r'javascript:', caseSensitive: false),
      RegExp(r'on\w+\s*=', caseSensitive: false),
    ];

    for (final pattern in xssPatterns) {
      if (pattern.hasMatch(input)) {
        if (AppConfig.enableLogging) {
          AppLogger.warning('检测到潜在的XSS尝试', tag: 'Security');
        }
        return false;
      }
    }

    return true;
  }
}