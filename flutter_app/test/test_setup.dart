import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';

/// 测试环境初始化
class TestSetup {
  static bool _isInitialized = false;
  
  /// 初始化测试环境
  static Future<void> initialize() async {
    if (_isInitialized) return;
    
    // 在测试环境中，我们跳过 Supabase 初始化
    // 因为测试环境不支持 shared_preferences 等插件
    
    // 只进行基本的测试环境设置
    TestWidgetsFlutterBinding.ensureInitialized();
    
    _isInitialized = true;
  }
  
  /// 清理测试环境
  static void dispose() {
    // 清理 GetIt 注册的服务（如果有的话）
    try {
      GetIt.instance.reset();
    } catch (e) {
      // 忽略清理错误
    }
    _isInitialized = false;
  }
}