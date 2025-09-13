import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/database/status_consistency_manager.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_state.dart';
import '../widgets/unified_bottom_sheet.dart';

/// 状态一致性测试页面
/// 
/// 用于测试和验证发票与报销集状态一致性约束的实现
class StatusConsistencyTestPage extends StatefulWidget {
  const StatusConsistencyTestPage({super.key});

  @override
  State<StatusConsistencyTestPage> createState() => _StatusConsistencyTestPageState();
}

class _StatusConsistencyTestPageState extends State<StatusConsistencyTestPage> {
  final _consistencyManager = StatusConsistencyManager.instance;
  StatusConsistencyReport? _currentReport;
  bool _isLoading = false;
  final List<String> _testResults = [];

  @override
  void initState() {
    super.initState();
    _runInitialCheck();
  }

  /// 运行初始一致性检查
  Future<void> _runInitialCheck() async {
    await _checkConsistency();
  }

  /// 检查状态一致性
  Future<void> _checkConsistency() async {
    setState(() => _isLoading = true);
    
    try {
      final report = await _consistencyManager.generateReport();
      setState(() {
        _currentReport = report;
        _addTestResult('✅ 一致性检查完成: ${report.summary}');
      });
    } catch (e) {
      _addTestResult('❌ 一致性检查失败: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// 修复状态不一致问题
  Future<void> _fixConsistency() async {
    setState(() => _isLoading = true);
    
    try {
      final result = await _consistencyManager.fixConsistency();
      _addTestResult('🔧 修复结果: $result');
      
      // 重新检查
      await _checkConsistency();
    } catch (e) {
      _addTestResult('❌ 修复失败: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// 测试发票状态约束
  Future<void> _testInvoiceConstraints() async {
    _addTestResult('🧪 开始测试发票状态约束...');
    
    // 测试1：独立发票状态约束
    final isValid1 = _consistencyManager.validateInvoiceStatusChange(
      invoiceId: 'test-invoice-1',
      reimbursementSetId: null,
      oldStatus: 'unsubmitted',
      newStatus: 'submitted', // 这应该被拒绝
    );
    _addTestResult(
      '📄 独立发票状态修改测试: ${isValid1 ? "❌ 意外通过" : "✅ 正确拒绝"}'
    );

    // 测试2：报销集中发票状态约束
    final isValid2 = _consistencyManager.validateInvoiceStatusChange(
      invoiceId: 'test-invoice-2',
      reimbursementSetId: 'test-set-1',
      oldStatus: 'unsubmitted',
      newStatus: 'submitted', // 这应该被拒绝
    );
    _addTestResult(
      '📋 报销集中发票状态修改测试: ${isValid2 ? "❌ 意外通过" : "✅ 正确拒绝"}'
    );

    // 测试3：合法的独立发票状态
    final isValid3 = _consistencyManager.validateInvoiceStatusChange(
      invoiceId: 'test-invoice-3',
      reimbursementSetId: null,
      oldStatus: 'submitted',
      newStatus: 'unsubmitted', // 这应该被允许
    );
    _addTestResult(
      '✅ 独立发票状态重置测试: ${isValid3 ? "✅ 正确允许" : "❌ 意外拒绝"}'
    );
  }

  /// 展示发票状态详情
  void _showInvoiceStatusDetails() {
    final invoices = _getCurrentInvoices();
    
    if (invoices.isEmpty) {
      _addTestResult('ℹ️ 当前没有发票数据可供分析');
      return;
    }

    final stats = _analyzeInvoiceStatuses(invoices);
    _addTestResult('📊 发票状态分析完成:');
    _addTestResult('  - 总计: ${stats['total']} 张发票');
    _addTestResult('  - 独立发票: ${stats['independent']} 张');
    _addTestResult('  - 报销集中: ${stats['inSet']} 张');
    _addTestResult('  - 状态一致: ${stats['consistent']} 张');
    _addTestResult('  - 状态不一致: ${stats['inconsistent']} 张');
  }

  /// 获取当前发票列表
  List<InvoiceEntity> _getCurrentInvoices() {
    final invoiceState = context.read<InvoiceBloc>().state;
    if (invoiceState is InvoiceLoaded) {
      return invoiceState.invoices;
    }
    return [];
  }

  /// 分析发票状态统计
  Map<String, int> _analyzeInvoiceStatuses(List<InvoiceEntity> invoices) {
    int independent = 0;
    int inSet = 0;
    int consistent = 0;
    int inconsistent = 0;

    for (final invoice in invoices) {
      if (invoice.isInReimbursementSet) {
        inSet++;
        // 检查状态是否一致（有效状态 = 原始状态）
        if (invoice.effectiveStatus == invoice.rawStatus) {
          consistent++;
        } else {
          inconsistent++;
        }
      } else {
        independent++;
        // 独立发票有效状态应该是未提交
        if (invoice.effectiveStatus == InvoiceStatus.unsubmitted) {
          consistent++;
        } else {
          inconsistent++;
        }
      }
    }

    return {
      'total': invoices.length,
      'independent': independent,
      'inSet': inSet,
      'consistent': consistent,
      'inconsistent': inconsistent,
    };
  }

  /// 添加测试结果
  void _addTestResult(String result) {
    setState(() {
      _testResults.add('${DateTime.now().toString().substring(11, 19)} - $result');
    });
  }

  /// 清空测试结果
  void _clearResults() {
    setState(() {
      _testResults.clear();
    });
  }

  /// 显示详细报告
  void _showDetailedReport() {
    if (_currentReport == null) {
      UnifiedBottomSheet.showConfirmDialog(
        context: context,
        title: '提示',
        content: '请先运行一致性检查',
        confirmText: '确定',
      );
      return;
    }

    UnifiedBottomSheet.showCustomSheet(
      context: context,
      title: '详细一致性报告',
      child: _buildDetailedReport(),
    );
  }

  /// 构建详细报告
  Widget _buildDetailedReport() {
    final report = _currentReport!;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '检查时间: ${report.checkTime.toString()}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 16),
        
        Text(
          report.summary,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        
        if (report.inconsistencies.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            '不一致记录详情:',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          
          ...report.inconsistencies.map((inconsistency) => Card(
            margin: const EdgeInsets.symmetric(vertical: 4),
            child: ListTile(
              dense: true,
              leading: Icon(
                inconsistency.inconsistencyType == 'STATUS_MISMATCH' 
                  ? CupertinoIcons.exclamationmark_triangle
                  : CupertinoIcons.doc_text,
                color: Theme.of(context).colorScheme.error,
                size: 20,
              ),
              title: Text(
                '发票: ${inconsistency.invoiceId.substring(0, 8)}...',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              subtitle: Text(
                '状态: ${inconsistency.invoiceStatus} | '
                '类型: ${inconsistency.inconsistencyType}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          )),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('状态一致性测试'),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // 控制按钮区域
            Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: CupertinoButton.filled(
                          onPressed: _isLoading ? null : _checkConsistency,
                          child: const Text('检查一致性'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: CupertinoButton(
                          onPressed: _isLoading ? null : _fixConsistency,
                          color: CupertinoColors.destructiveRed,
                          child: const Text('修复问题'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: CupertinoButton(
                          onPressed: _isLoading ? null : _testInvoiceConstraints,
                          child: const Text('测试约束'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: CupertinoButton(
                          onPressed: _isLoading ? null : _showInvoiceStatusDetails,
                          child: const Text('分析状态'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: CupertinoButton(
                          onPressed: _showDetailedReport,
                          child: const Text('详细报告'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: CupertinoButton(
                          onPressed: _clearResults,
                          child: const Text('清空结果'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            // 当前报告摘要
            if (_currentReport != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _currentReport!.isConsistent 
                    ? CupertinoColors.systemGreen.withOpacity(0.1)
                    : CupertinoColors.systemRed.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _currentReport!.isConsistent 
                      ? CupertinoColors.systemGreen
                      : CupertinoColors.systemRed,
                    width: 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '当前状态',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _currentReport!.summary,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            
            const SizedBox(height: 16),
            
            // 测试结果列表
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(8),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(CupertinoIcons.text_alignleft, size: 16),
                          const SizedBox(width: 8),
                          Text(
                            '测试结果 (${_testResults.length})',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          if (_isLoading) ...[
                            const Spacer(),
                            const CupertinoActivityIndicator(radius: 8),
                          ],
                        ],
                      ),
                    ),
                    Expanded(
                      child: _testResults.isEmpty
                        ? Center(
                            child: Text(
                              '点击上方按钮开始测试',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(8),
                            itemCount: _testResults.length,
                            itemBuilder: (context, index) {
                              final result = _testResults[_testResults.length - 1 - index];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 4),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.surface,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  result,
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                  ),
                                ),
                              );
                            },
                          ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}