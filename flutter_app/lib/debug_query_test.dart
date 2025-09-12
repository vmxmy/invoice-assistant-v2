import 'package:flutter/material.dart';
import 'core/network/supabase_client.dart';
import 'core/config/app_config.dart';

/// 调试查询测试页面
class DebugQueryTestPage extends StatefulWidget {
  const DebugQueryTestPage({super.key});

  @override
  State<DebugQueryTestPage> createState() => _DebugQueryTestPageState();
}

class _DebugQueryTestPageState extends State<DebugQueryTestPage> {
  String _debugOutput = '准备测试查询...\n';

  @override
  void initState() {
    super.initState();
    _runDebugQueries();
  }

  Future<void> _runDebugQueries() async {
    _addOutput('开始调试查询测试...\n');

    try {
      // 1. 测试用户状态
      final currentUser = SupabaseClientManager.currentUser;
      _addOutput('1. 用户状态检查:\n');
      if (currentUser != null) {
        _addOutput('   ✅ 用户已登录: ${currentUser.id}\n');
        _addOutput('   📧 用户邮箱: ${currentUser.email}\n');
      } else {
        _addOutput('   ❌ 用户未登录\n');
        return;
      }

      // 2. 测试数据库连接
      _addOutput('\n2. 数据库连接测试:\n');
      try {
        // final testQuery = SupabaseClientManager.from('invoices').select('count'); // 未使用
        _addOutput('   ✅ 数据库连接正常\n');
      } catch (e) {
        _addOutput('   ❌ 数据库连接失败: $e\n');
        return;
      }

      // 3. 测试表访问和总记录数
      _addOutput('\n3. 表访问测试:\n');
      try {
        final allRecords = await SupabaseClientManager.from('invoices')
            .select('id, user_id, status, created_at, invoice_number');
        _addOutput('   📊 表中总记录数: ${allRecords.length}\n');

        if (allRecords.isNotEmpty) {
          _addOutput('   🔍 前3条记录:\n');
          for (int i = 0; i < 3 && i < allRecords.length; i++) {
            final record = allRecords[i];
            _addOutput(
                '     ${i + 1}. ID: ${record['id']?.toString().substring(0, 8)}...\n');
            _addOutput(
                '        user_id: ${record['user_id']?.toString().substring(0, 8)}...\n');
            _addOutput('        status: ${record['status']}\n');
            _addOutput('        发票号: ${record['invoice_number']}\n');
          }
        }
      } catch (e) {
        _addOutput('   ❌ 表访问失败: $e\n');
      }

      // 4. 测试用户相关记录
      _addOutput('\n4. 用户相关记录测试:\n');
      try {
        final userRecords = await SupabaseClientManager.from('invoices')
            .select('id, user_id, status, invoice_number')
            .eq('user_id', currentUser.id);
        _addOutput('   📊 当前用户记录数: ${userRecords.length}\n');

        if (userRecords.isNotEmpty) {
          _addOutput('   🔍 用户记录:\n');
          for (final record in userRecords) {
            _addOutput(
                '     - ${record['invoice_number']} (状态: ${record['status']})\n');
          }
        }
      } catch (e) {
        _addOutput('   ❌ 用户记录查询失败: $e\n');
      }

      // 5. 测试带条件的查询
      _addOutput('\n5. 带筛选条件查询测试:\n');
      try {
        final filteredRecords = await SupabaseClientManager.from('invoices')
            .select('id, user_id, status, invoice_number')
            .eq('user_id', currentUser.id)
            .neq('status', 'deleted');
        _addOutput('   📊 筛选后记录数: ${filteredRecords.length}\n');
      } catch (e) {
        _addOutput('   ❌ 筛选查询失败: $e\n');
      }
    } catch (e) {
      _addOutput('\n❌ 调试测试失败: $e\n');
    }
  }

  void _addOutput(String text) {
    setState(() {
      _debugOutput += text;
    });
    if (AppConfig.enableLogging) {
      // print('[DEBUG] $text');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('调试查询测试'),
        backgroundColor: Colors.orange,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _debugOutput = '';
                    });
                    _runDebugQueries();
                  },
                  child: const Text('重新测试'),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  child: const Text('返回'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    _debugOutput,
                    style: const TextStyle(
                      color: Colors.green,
                      fontFamily: 'monospace',
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
