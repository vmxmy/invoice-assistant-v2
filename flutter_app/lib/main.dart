import '../utils/logger.dart';
import 'package:flutter/material.dart';
import 'core/network/supabase_client.dart';
import 'core/config/app_config.dart';
import 'core/di/injection_container.dart' as di;
import 'app.dart';

void main() async {
  // 确保Flutter binding初始化
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    // 初始化依赖注入容器
    await di.init();
    
    // 初始化Supabase客户端
    final initialized = await SupabaseClientManager.initialize();
    
    if (!initialized) {
      if (AppConfig.enableLogging) {
        AppLogger.debug('❌ Failed to initialize Supabase client', tag: 'Debug');
      }
    }
  } catch (e) {
    if (AppConfig.enableLogging) {
      AppLogger.debug('❌ Initialization error: $e', tag: 'Debug');
    }
  }
  
  runApp(
    const InvoiceAssistantApp(),
  );
}