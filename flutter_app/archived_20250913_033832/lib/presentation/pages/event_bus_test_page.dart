import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../core/events/app_event_bus.dart';
import '../../core/events/event_bus_tester.dart';

/// 事件总线测试页面
/// 
/// 用于开发时测试事件总线功能
class EventBusTestPage extends StatefulWidget {
  const EventBusTestPage({super.key});

  @override
  State<EventBusTestPage> createState() => _EventBusTestPageState();
}

class _EventBusTestPageState extends State<EventBusTestPage> {
  final AppEventBus _eventBus = AppEventBus.instance;
  Map<String, dynamic> _stats = {};

  @override
  void initState() {
    super.initState();
    _updateStats();
  }

  void _updateStats() {
    setState(() {
      _stats = eventBusTester.getStats();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('事件总线测试'),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.refresh),
            onPressed: _updateStats,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 统计信息
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '事件总线统计',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    _buildStatRow('总事件数', '${_stats['totalEvents'] ?? 0}'),
                    _buildStatRow('历史记录', '${_stats['historyEvents'] ?? 0}'),
                    _buildStatRow('监听状态', _stats['isListening'] == true ? '✅ 已启用' : '❌ 已停用'),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // 事件类型分布
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '事件类型分布',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    ...(_stats['eventTypes'] as Map<String, int>? ?? {})
                        .entries
                        .map((entry) => _buildStatRow(entry.key, '${entry.value}')),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // 测试按钮
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton.icon(
                  onPressed: () {
                    _eventBus.emit(const DataRefreshRequestedEvent(
                      moduleType: 'invoice',
                    ));
                    _updateStats();
                  },
                  icon: const Icon(CupertinoIcons.doc_text),
                  label: const Text('发送发票刷新事件'),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    _eventBus.emit(const TabChangedEvent(
                      newTabIndex: 1,
                      oldTabIndex: 0,
                      tabName: '报销集',
                    ));
                    _updateStats();
                  },
                  icon: const Icon(CupertinoIcons.folder),
                  label: const Text('发送Tab切换事件'),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    _eventBus.emit(AppResumedEvent(
                      resumeTime: DateTime.now(),
                    ));
                    _updateStats();
                  },
                  icon: const Icon(CupertinoIcons.play),
                  label: const Text('发送应用恢复事件'),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    _eventBus.emit(const InvoiceStatusChangedEvent(
                      invoiceId: 'test-invoice-id',
                      newStatus: 'submitted',
                      oldStatus: 'unsubmitted',
                    ));
                    _updateStats();
                  },
                  icon: const Icon(CupertinoIcons.checkmark_circle),
                  label: const Text('发送状态变更事件'),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // 控制按钮
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      eventBusTester.clearStats();
                      _updateStats();
                    },
                    icon: const Icon(CupertinoIcons.clear),
                    label: const Text('清除统计'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      printEventBusStats();
                    },
                    icon: const Icon(CupertinoIcons.printer),
                    label: const Text('打印到控制台'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}