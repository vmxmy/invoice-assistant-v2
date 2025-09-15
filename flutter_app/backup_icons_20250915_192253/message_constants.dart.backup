/// 统一的消息映射配置
/// 管理应用中所有的用户友好消息显示
class MessageConstants {
  // 私有构造函数，防止实例化
  MessageConstants._();

  /// 重复发票相关消息映射
  static const Map<String, String> duplicateMessageMap = {
    // 后端返回的原始消息 -> 用户友好消息
    '文件重复': '重复发票',
    '该文件已存在': '重复发票',
    '检测到重复发票': '重复发票',
    '发票已存在': '重复发票',
    'duplicate': '重复发票',
    'file_duplicate': '重复发票',
  };

  /// 需要移除的无关文本模式
  static const List<String> removeTextPatterns = [
    '，已跳过OCR处理（节省资源）',
    '已跳过OCR处理（节省资源）',
    '，节省资源',
    '（节省资源）',
    '节省资源',
    '，跳过处理',
    '跳过处理',
    '，省略步骤',
    '省略步骤',
  ];

  /// 上传结果徽章文本映射
  static const Map<String, String> badgeTextMap = {
    'success': '上传成功',
    'duplicate': '重复发票',
    'cross_user_duplicate': '检测到跨用户重复发票',
    'error': '上传失败',
  };

  /// 错误消息友好化映射
  static const Map<String, String> errorMessageMap = {
    // 网络相关
    '网络连接': '网络连接异常，请检查网络后重试',
    'connection': '网络连接异常，请检查网络后重试',
    'timeout': '网络连接异常，请检查网络后重试',
    'network': '网络连接异常，请检查网络后重试',
    
    // 文件相关
    '文件大小': '文件大小超出限制，单个文件不能超过10MB',
    'file size': '文件大小超出限制，单个文件不能超过10MB',
    'too large': '文件大小超出限制，单个文件不能超过10MB',
    '格式': '文件格式不支持，请选择PDF格式的发票文件',
    'format': '文件格式不支持，请选择PDF格式的发票文件',
    'invalid': '文件格式不支持，请选择PDF格式的发票文件',
    
    // 服务器相关
    '服务器错误': '服务器暂时无法处理请求，请稍后重试',
    'server error': '服务器暂时无法处理请求，请稍后重试',
    'internal error': '服务器暂时无法处理请求，请稍后重试',
    
    // 权限相关
    '权限': '操作权限不足，请重新登录后重试',
    'permission': '操作权限不足，请重新登录后重试',
    'unauthorized': '操作权限不足，请重新登录后重试',
    
    // 数据库相关
    '数据操作失败': '数据保存失败，请检查网络连接后重试',
    'database': '数据保存失败，请检查网络连接后重试',
    
    // 重复相关 - 统一处理
    '重复': '重复发票',
    'duplicate': '重复发票',
    
    // OCR相关
    'OCR': '发票信息识别失败，请确保文件清晰可读',
    '识别': '发票信息识别失败，请确保文件清晰可读',
    
    // 服务相关
    'uploadInvoice': '上传服务暂时不可用，请稍后重试',
    'service': '服务暂时不可用，请稍后重试',
  };

  /// 清理消息文本，移除不必要的信息
  static String cleanMessage(String? message) {
    if (message == null || message.isEmpty) {
      return '';
    }

    String cleaned = message;
    
    // 移除无关文本模式
    for (final pattern in removeTextPatterns) {
      cleaned = cleaned.replaceAll(pattern, '');
    }
    
    // 去除多余空格和标点
    cleaned = cleaned.trim();
    if (cleaned.endsWith('，') || cleaned.endsWith(',')) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }
    
    return cleaned;
  }

  /// 获取用户友好的重复发票消息
  static String getDuplicateMessage(String? originalMessage) {
    if (originalMessage == null || originalMessage.isEmpty) {
      return duplicateMessageMap['检测到重复发票']!;
    }
    
    // 先清理消息
    final cleaned = cleanMessage(originalMessage);
    
    // 检查是否匹配已知的重复消息模式
    for (final entry in duplicateMessageMap.entries) {
      if (cleaned.contains(entry.key)) {
        return entry.value;
      }
    }
    
    // 如果清理后的消息为空，返回默认消息
    if (cleaned.isEmpty) {
      return duplicateMessageMap['检测到重复发票']!;
    }
    
    // 如果不匹配任何模式，但包含"重复"相关关键词，返回统一消息
    if (cleaned.contains('重复') || cleaned.contains('duplicate') || 
        cleaned.contains('已存在') || cleaned.contains('exist')) {
      return duplicateMessageMap['检测到重复发票']!;
    }
    
    return cleaned;
  }

  /// 获取用户友好的错误消息
  static String getErrorMessage(String? originalError) {
    if (originalError == null || originalError.isEmpty) {
      return '操作失败，请重试';
    }
    
    // 移除技术性前缀
    String cleanError = originalError;
    if (cleanError.contains('UploadInvoiceException:')) {
      cleanError = cleanError.split('UploadInvoiceException:').last.trim();
    }
    
    // 先清理消息
    final cleaned = cleanMessage(cleanError);
    final lowerCleaned = cleaned.toLowerCase();
    
    // 检查错误消息映射
    for (final entry in errorMessageMap.entries) {
      if (lowerCleaned.contains(entry.key.toLowerCase())) {
        return entry.value;
      }
    }
    
    // 如果消息过长，返回通用错误
    if (cleaned.length > 50) {
      return '上传失败，请检查文件格式和网络连接后重试';
    }
    
    return cleaned.isEmpty ? '上传失败，请重试' : cleaned;
  }

  /// 获取徽章文本
  static String getBadgeText(String type) {
    return badgeTextMap[type] ?? '未知状态';
  }
}