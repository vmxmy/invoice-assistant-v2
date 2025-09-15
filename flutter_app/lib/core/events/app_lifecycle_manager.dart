import 'package:flutter/widgets.dart';
import 'app_event_bus.dart';

/// 应用生命周期管理器
///
/// 负责监听应用生命周期变化和Tab切换，并通过事件总线通知其他模块
class AppLifecycleManager extends WidgetsBindingObserver {
  final AppEventBus _eventBus;
  int _currentTabIndex = 0;

  AppLifecycleManager({AppEventBus? eventBus})
      : _eventBus = eventBus ?? AppEventBus.instance {
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    if (state == AppLifecycleState.resumed) {
      // 发送应用恢复事件
      _eventBus.emit(AppResumedEvent(
        resumeTime: DateTime.now(),
      ));
    }
  }

  /// 处理Tab切换
  void onTabChanged(int newTabIndex, String tabName) {
    if (newTabIndex != _currentTabIndex) {
      _eventBus.emit(TabChangedEvent(
        newTabIndex: newTabIndex,
        oldTabIndex: _currentTabIndex,
        tabName: tabName,
      ));

      _currentTabIndex = newTabIndex;
    }
  }

  /// 请求数据刷新
  void requestDataRefresh(String moduleType,
      {Map<String, dynamic>? parameters}) {
    _eventBus.emit(DataRefreshRequestedEvent(
      moduleType: moduleType,
      parameters: parameters ?? {},
    ));
  }

  /// 销毁管理器
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
  }
}
