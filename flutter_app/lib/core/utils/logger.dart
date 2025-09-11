import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';

/// 统一的日志管理工具
/// 在开发环境显示详细日志，生产环境仅记录错误
class AppLogger {
  static const String _name = 'InvoiceAssistant';
  
  /// 调试信息
  static void debug(String message, {String? tag, Object? error, StackTrace? stackTrace}) {
    if (kDebugMode) {
      developer.log(
        message,
        name: tag != null ? '$_name:$tag' : _name,
        level: 500, // DEBUG level
        error: error,
        stackTrace: stackTrace,
      );
    }
  }
  
  /// 一般信息
  static void info(String message, {String? tag}) {
    developer.log(
      message,
      name: tag != null ? '$_name:$tag' : _name,
      level: 800, // INFO level
    );
  }
  
  /// 警告信息
  static void warning(String message, {String? tag, Object? error}) {
    developer.log(
      message,
      name: tag != null ? '$_name:$tag' : _name,
      level: 900, // WARNING level
      error: error,
    );
  }
  
  /// 错误信息
  static void error(String message, {String? tag, Object? error, StackTrace? stackTrace}) {
    developer.log(
      message,
      name: tag != null ? '$_name:$tag' : _name,
      level: 1000, // SEVERE level
      error: error,
      stackTrace: stackTrace,
    );
  }
  
  /// 网络请求日志
  static void network(String message, {Object? error, StackTrace? stackTrace}) {
    debug(message, tag: 'Network', error: error, stackTrace: stackTrace);
  }
  
  /// 缓存相关日志
  static void cache(String message, {Object? error}) {
    debug(message, tag: 'Cache', error: error);
  }
  
  /// 配置相关日志
  static void config(String message, {Object? error}) {
    info(message, tag: 'Config');
  }
  
  /// 性能监控日志
  static void performance(String message) {
    debug(message, tag: 'Performance');
  }
}