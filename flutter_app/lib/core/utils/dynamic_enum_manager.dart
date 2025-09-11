import '../utils/logger.dart';
import '../../core/network/supabase_client.dart';
import '../../core/config/app_config.dart';

/// 动态枚举管理器 - 从数据库动态获取枚举值
class DynamicEnumManager {
  static final DynamicEnumManager _instance = DynamicEnumManager._();
  static DynamicEnumManager get instance => _instance;
  
  DynamicEnumManager._();

  // 缓存枚举值，避免重复查询
  final Map<String, List<EnumValue>> _cachedEnums = {};
  final Map<String, DateTime> _cacheTime = {};
  static const Duration _cacheExpiry = Duration(minutes: 30);

  /// 获取发票状态枚举值
  Future<List<EnumValue>> getInvoiceStatuses() async {
    return _getEnumValues('invoice_status', 'SELECT DISTINCT status, status as display_name FROM invoices WHERE status IS NOT NULL ORDER BY status');
  }

  /// 获取发票来源枚举值
  Future<List<EnumValue>> getInvoiceSources() async {
    return _getEnumValues('invoice_source', 'SELECT DISTINCT source, source as display_name FROM invoices WHERE source IS NOT NULL ORDER BY source');
  }

  /// 获取发票类型枚举值
  Future<List<EnumValue>> getInvoiceTypes() async {
    return _getEnumValues('invoice_type', 'SELECT DISTINCT invoice_type, invoice_type as display_name FROM invoices WHERE invoice_type IS NOT NULL ORDER BY invoice_type');
  }

  /// 获取发票分类枚举值
  Future<List<EnumValue>> getInvoiceCategories() async {
    return _getEnumValues('invoice_category', 'SELECT DISTINCT category, category as display_name FROM invoices WHERE category IS NOT NULL ORDER BY category');
  }

  /// 通用的枚举值获取方法
  Future<List<EnumValue>> _getEnumValues(String enumType, String query) async {
    // 检查缓存
    if (_cachedEnums.containsKey(enumType) && _cacheTime.containsKey(enumType)) {
      final cacheTime = _cacheTime[enumType]!;
      if (DateTime.now().difference(cacheTime) < _cacheExpiry) {
        return _cachedEnums[enumType]!;
      }
    }

    try {
      // 根据不同的枚举类型执行不同的查询
      List<Map<String, dynamic>> response;
      
      switch (enumType) {
        case 'invoice_status':
          response = await SupabaseClientManager.client
              .from('invoices')
              .select('status')
              .neq('status', 'null')
              .then((data) => (data as List).cast<Map<String, dynamic>>());
          break;
        case 'invoice_source':
          response = await SupabaseClientManager.client
              .from('invoices')
              .select('source')
              .neq('source', 'null')
              .then((data) => (data as List).cast<Map<String, dynamic>>());
          break;
        case 'invoice_type':
          response = await SupabaseClientManager.client
              .from('invoices')
              .select('invoice_type')
              .neq('invoice_type', 'null')
              .then((data) => (data as List).cast<Map<String, dynamic>>());
          break;
        case 'invoice_category':
          response = await SupabaseClientManager.client
              .from('invoices')
              .select('category')
              .neq('category', 'null')
              .then((data) => (data as List).cast<Map<String, dynamic>>());
          break;
        default:
          response = [];
      }

      // 提取唯一值
      final Set<String> uniqueValues = {};
      for (final item in response) {
        final fieldName = enumType.replaceAll('invoice_', '');
        final value = item[fieldName]?.toString();
        if (value != null && value.isNotEmpty) {
          uniqueValues.add(value);
        }
      }

      // 转换为EnumValue对象
      final List<EnumValue> enumValues = uniqueValues
          .map((value) => EnumValue(
                value: value,
                displayName: _getDisplayName(value, value),
              ))
          .toList();

      enumValues.sort((a, b) => a.value.compareTo(b.value));

      // 缓存结果
      _cachedEnums[enumType] = enumValues;
      _cacheTime[enumType] = DateTime.now();

      if (AppConfig.enableLogging) {
        AppLogger.debug('✅ 动态获取 $enumType 枚举值: ${enumValues.length} 项', tag: 'Debug');
      }

      return enumValues;
    } catch (e) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ 获取 $enumType 枚举值失败: $e', tag: 'Debug');
      }
      
      // 返回默认值或缓存值
      return _cachedEnums[enumType] ?? _getDefaultValues(enumType);
    }
  }

  /// 获取中文显示名称
  String _getDisplayName(String value, String defaultDisplay) {
    // 状态映射
    const statusMap = {
      'unreimbursed': '未报销',
      'reimbursed': '已报销',
      'pending': '待处理',
      'processing': '处理中',
      'completed': '已完成',
      'failed': '失败',
      'verified': '已验证',
      'deleted': '已删除',
      'archived': '已归档',
    };

    // 来源映射
    const sourceMap = {
      'upload': '上传',
      'manual': '手动上传',
      'email': '邮件导入',
      'scanner': '扫描识别',
      'api': 'API导入',
      'batch': '批量导入',
    };

    return statusMap[value] ?? sourceMap[value] ?? defaultDisplay;
  }

  /// 获取默认枚举值（当数据库查询失败时使用）
  List<EnumValue> _getDefaultValues(String enumType) {
    switch (enumType) {
      case 'invoice_status':
        return [
          const EnumValue(value: 'unreimbursed', displayName: '未报销'),
          const EnumValue(value: 'reimbursed', displayName: '已报销'),
        ];
      case 'invoice_source':
        return [
          const EnumValue(value: 'upload', displayName: '上传'),
          const EnumValue(value: 'manual', displayName: '手动上传'),
        ];
      default:
        return [];
    }
  }

  /// 清除缓存
  void clearCache() {
    _cachedEnums.clear();
    _cacheTime.clear();
  }

  /// 清除特定枚举的缓存
  void clearEnumCache(String enumType) {
    _cachedEnums.remove(enumType);
    _cacheTime.remove(enumType);
  }

  /// 根据值获取显示名称
  String getDisplayNameByValue(String enumType, String value) {
    final enumValues = _cachedEnums[enumType];
    if (enumValues != null) {
      try {
        final enumValue = enumValues.firstWhere((e) => e.value == value);
        return enumValue.displayName;
      } catch (e) {
        // 如果没找到，返回映射的显示名称
        return _getDisplayName(value, value);
      }
    }
    return _getDisplayName(value, value);
  }

  /// 检查值是否有效
  bool isValidValue(String enumType, String value) {
    final enumValues = _cachedEnums[enumType];
    if (enumValues != null) {
      return enumValues.any((e) => e.value == value);
    }
    return false;
  }
}

/// 枚举值数据类
class EnumValue {
  final String value;
  final String displayName;

  const EnumValue({
    required this.value,
    required this.displayName,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is EnumValue && other.value == value;
  }

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'EnumValue(value: $value, displayName: $displayName)';
}