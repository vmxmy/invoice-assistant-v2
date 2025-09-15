import 'dart:convert';

/// 配置混淆服务
/// 在运行时动态解密配置信息，增加逆向工程难度
class ConfigObfuscation {
  // 🔐 混淆的配置片段（示例）
  static const List<String> _obfuscatedParts = [
    'aHR0cHM6Ly8=', // base64: 'https://'
    'LnN1cGFiYXNlLmNv', // base64: '.supabase.co'
  ];

  // 🔐 XOR密钥（应该更复杂）
  static const List<int> _xorKey = [0x42, 0x73, 0x61, 0x66, 0x65];

  /// 动态构建Supabase URL
  static String buildSupabaseUrl(String projectId) {
    // 动态组装URL，避免完整URL出现在二进制中
    final protocol = utf8.decode(base64Decode(_obfuscatedParts[0]));
    final domain = utf8.decode(base64Decode(_obfuscatedParts[1]));

    return '$protocol$projectId$domain';
  }

  /// 解混淆API密钥
  static String deobfuscateApiKey(String obfuscatedKey) {
    final keyBytes = base64Decode(obfuscatedKey);
    final result = <int>[];

    for (int i = 0; i < keyBytes.length; i++) {
      result.add(keyBytes[i] ^ _xorKey[i % _xorKey.length]);
    }

    return utf8.decode(result);
  }

  /// 获取设备指纹（用于密钥派生）
  static String getDeviceFingerprint() {
    // 基于设备特征生成指纹
    // 注意：这是简化示例，生产环境需要更复杂的实现
    return 'device_unique_id';
  }
}

/// 安全配置加载器
class SecureConfigLoader {
  static String? _cachedUrl;
  static String? _cachedApiKey;

  /// 安全获取Supabase URL
  static String getSupabaseUrl() {
    if (_cachedUrl != null) return _cachedUrl!;

    // 优先从环境变量获取
    const envUrl = String.fromEnvironment('SUPABASE_URL');
    if (envUrl.isNotEmpty) {
      _cachedUrl = envUrl;
      return envUrl;
    }

    // 回退到混淆方式（需要配置项目ID）
    const projectId = String.fromEnvironment('SUPABASE_PROJECT_ID');
    if (projectId.isNotEmpty) {
      _cachedUrl = ConfigObfuscation.buildSupabaseUrl(projectId);
      return _cachedUrl!;
    }

    throw Exception('Supabase配置未找到');
  }

  /// 安全获取API密钥
  static String getApiKey() {
    if (_cachedApiKey != null) return _cachedApiKey!;

    // 优先从环境变量获取
    const envKey = String.fromEnvironment('SUPABASE_ANON_KEY');
    if (envKey.isNotEmpty) {
      _cachedApiKey = envKey;
      return envKey;
    }

    // 回退到混淆方式
    const obfuscatedKey = String.fromEnvironment('SUPABASE_OBFUSCATED_KEY');
    if (obfuscatedKey.isNotEmpty) {
      _cachedApiKey = ConfigObfuscation.deobfuscateApiKey(obfuscatedKey);
      return _cachedApiKey!;
    }

    throw Exception('Supabase API密钥未找到');
  }

  /// 清理缓存（安全退出时调用）
  static void clearCache() {
    _cachedUrl = null;
    _cachedApiKey = null;
  }
}
