// import '../utils/logger.dart'; // 暂时注释掉未找到的logger
import 'package:flutter/material.dart';
import 'core/network/supabase_client.dart';
import 'core/di/injection_container.dart' as di;
import 'app.dart';

void main() async {
  // 确保Flutter binding初始化
  WidgetsFlutterBinding.ensureInitialized();

  try {
    // 初始化依赖注入容器
    await di.init();

    // 初始化Supabase客户端
    await SupabaseClientManager.initialize();

  } catch (e) {
    // Initialization error - handled silently
  }

  runApp(
    const InvoiceAssistantApp(),
  );
}
