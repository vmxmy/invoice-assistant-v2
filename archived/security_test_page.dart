import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/security/security_test_utils.dart';
import '../../core/utils/logger.dart';

/// 安全功能测试页面
/// 用于验证所有安全修复是否正确工作
class SecurityTestPage extends StatefulWidget {
  const SecurityTestPage({super.key});

  @override
  State<SecurityTestPage> createState() => _SecurityTestPageState();
}

class _SecurityTestPageState extends State<SecurityTestPage> {
  List<SecurityTestResult> _testResults = [];
  bool _isRunning = false;
  String _fullReport = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🔐 安全功能测试'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 20),
            _buildActionButtons(),
            const SizedBox(height: 20),
            _buildTestResults(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.security,
                  color: Theme.of(context).colorScheme.primary,
                  size: 24,
                ),
                const SizedBox(width: 8),
                Text(
                  '安全功能验证',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              '此页面用于验证所有安全修复是否正确工作，包括：',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            const Text('• 环境变量配置验证'),
            const Text('• 权限缓存加密存储验证'),
            const Text('• JWT Token验证机制验证'),
            const Text('• 会话安全验证'),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        ElevatedButton.icon(
          onPressed: _isRunning ? null : _runAllTests,
          icon: _isRunning 
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.play_arrow),
          label: Text(_isRunning ? '运行中...' : '运行所有测试'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.primary,
            foregroundColor: Theme.of(context).colorScheme.onPrimary,
          ),
        ),
        const SizedBox(width: 12),
        if (_fullReport.isNotEmpty) ...[
          ElevatedButton.icon(
            onPressed: _copyReport,
            icon: const Icon(Icons.copy),
            label: const Text('复制报告'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.secondary,
              foregroundColor: Theme.of(context).colorScheme.onSecondary,
            ),
          ),
          const SizedBox(width: 12),
          ElevatedButton.icon(
            onPressed: _clearResults,
            icon: const Icon(Icons.clear),
            label: const Text('清除结果'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
              foregroundColor: Theme.of(context).colorScheme.onError,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTestResults() {
    if (_testResults.isEmpty && !_isRunning) {
      return Expanded(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.security,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                '点击"运行所有测试"开始安全验证',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_testResults.isNotEmpty) _buildTestSummary(),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.builder(
              itemCount: _testResults.length,
              itemBuilder: (context, index) {
                final result = _testResults[index];
                return _buildTestResultCard(result);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTestSummary() {
    final total = _testResults.length;
    final passed = _testResults.where((r) => r.passed).length;
    final failed = total - passed;
    final successRate = total > 0 ? (passed / total * 100) : 0;

    return Card(
      color: passed == total ? Colors.green[50] : Colors.orange[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(
              passed == total ? Icons.check_circle : Icons.warning,
              color: passed == total ? Colors.green : Colors.orange,
              size: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '测试摘要',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('总测试数: $total | 通过: $passed | 失败: $failed'),
                  Text('成功率: ${successRate.toStringAsFixed(1)}%'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTestResultCard(SecurityTestResult result) {
    final isSuccess = result.passed;
    final color = isSuccess ? Colors.green : Colors.red;

    return Card(
      margin: const EdgeInsets.only(bottom: 8.0),
      child: ExpansionTile(
        leading: Icon(
          isSuccess ? Icons.check_circle : Icons.error,
          color: color,
        ),
        title: Text(
          result.testName,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        subtitle: Text(
          isSuccess ? '✅ 测试通过' : '❌ 测试失败',
          style: TextStyle(color: color),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (result.details.isNotEmpty) ...[
                  Text(
                    '详细信息:',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...result.details.map((detail) => Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Text(
                      detail,
                      style: const TextStyle(fontSize: 12),
                    ),
                  )),
                ],
                if (result.issues.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    '发现的问题:',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.red,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...result.issues.map((issue) => Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Text(
                      '• $issue',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.red,
                      ),
                    ),
                  )),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _runAllTests() async {
    setState(() {
      _isRunning = true;
      _testResults.clear();
      _fullReport = '';
    });

    try {
      AppLogger.info('🧪 开始运行安全功能测试', tag: 'SecurityTestPage');
      
      final results = await SecurityTestUtils.runAllSecurityTests();
      final report = SecurityTestUtils.generateTestReport(results);
      
      setState(() {
        _testResults = results;
        _fullReport = report;
        _isRunning = false;
      });

      AppLogger.info('🧪 安全功能测试完成', tag: 'SecurityTestPage');
      
      // 显示测试完成通知
      if (mounted) {
        final passedCount = results.where((r) => r.passed).length;
        final totalCount = results.length;
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '测试完成: $passedCount/$totalCount 项通过',
            ),
            backgroundColor: passedCount == totalCount ? Colors.green : Colors.orange,
            duration: const Duration(seconds: 3),
          ),
        );
      }
      
    } catch (e) {
      AppLogger.error('🧪 安全功能测试异常', tag: 'SecurityTestPage', error: e);
      
      setState(() {
        _isRunning = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('测试运行异常: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  void _copyReport() {
    if (_fullReport.isNotEmpty) {
      Clipboard.setData(ClipboardData(text: _fullReport));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('测试报告已复制到剪贴板'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _clearResults() {
    setState(() {
      _testResults.clear();
      _fullReport = '';
    });
  }
}