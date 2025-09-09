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
        print('❌ Failed to initialize Supabase client');
      }
    }
  } catch (e) {
    if (AppConfig.enableLogging) {
      print('❌ Initialization error: $e');
    }
  }
  
  runApp(
    const InvoiceAssistantApp(),
  );
}