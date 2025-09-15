/// 配置异常
/// 当必要的配置项缺失或无效时抛出此异常
class ConfigurationException implements Exception {
  final String message;
  final String? configKey;
  final Exception? innerException;

  const ConfigurationException(
    this.message, {
    this.configKey,
    this.innerException,
  });

  @override
  String toString() {
    final buffer = StringBuffer('ConfigurationException: $message');
    if (configKey != null) {
      buffer.write(' (key: $configKey)');
    }
    if (innerException != null) {
      buffer.write(' - Inner: $innerException');
    }
    return buffer.toString();
  }
}
