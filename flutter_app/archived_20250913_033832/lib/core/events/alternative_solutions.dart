// 这个文件展示其他跨 Bloc 通信解决方案，仅供参考

import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';

/// 方案一：共享状态管理器（Repository 层事件）
/// 
/// 优点：业务逻辑集中，数据一致性好
/// 缺点：Repository 层职责过重，违反单一职责原则
abstract class DataChangeNotifier {
  Stream<DataChangeEvent> get changes;
  void notifyDataChanged(DataChangeEvent event);
}

class SharedDataManager implements DataChangeNotifier {
  final StreamController<DataChangeEvent> _controller = 
      StreamController<DataChangeEvent>.broadcast();

  @override
  Stream<DataChangeEvent> get changes => _controller.stream;

  @override
  void notifyDataChanged(DataChangeEvent event) {
    _controller.add(event);
  }

  void dispose() {
    _controller.close();
  }
}

abstract class DataChangeEvent {}

class InvoiceDataChanged extends DataChangeEvent {
  final List<String> affectedInvoiceIds;
  InvoiceDataChanged(this.affectedInvoiceIds);
}

/// 方案二：BlocObserver 全局监听
/// 
/// 优点：统一管理所有 Bloc 状态变化
/// 缺点：容易变成巨型类，调试困难
class AppBlocObserver extends BlocObserver {
  @override
  void onChange(BlocBase bloc, Change change) {
    super.onChange(bloc, change);
    
    // 监听特定 Bloc 的状态变化
    if (bloc is ReimbursementSetBloc && change.nextState is ReimbursementSetCreateSuccess) {
      // 通知其他 Bloc 刷新数据
      _notifyInvoiceDataChanged();
    }
  }

  void _notifyInvoiceDataChanged() {
    // 通过全局访问或依赖注入获取 InvoiceBloc
    // 这种方式容易造成强耦合
  }
}

/// 方案三：Provider + ChangeNotifier
/// 
/// 优点：Flutter 官方推荐，简单易用
/// 缺点：不是 BLoC 模式，状态管理方式不一致
class GlobalAppState extends ChangeNotifier {
  bool _shouldRefreshInvoices = false;

  bool get shouldRefreshInvoices => _shouldRefreshInvoices;

  void markInvoicesForRefresh() {
    _shouldRefreshInvoices = true;
    notifyListeners();
  }

  void clearRefreshFlag() {
    _shouldRefreshInvoices = false;
  }
}

/// 方案四：Stream-based Communication
/// 
/// 优点：响应式编程，类型安全
/// 缺点：需要手动管理订阅，容易内存泄漏
class StreamBasedCommunication {
  static final StreamController<BlocEvent> _globalEventController = 
      StreamController<BlocEvent>.broadcast();

  static Stream<T> listen<T extends BlocEvent>() {
    return _globalEventController.stream.where((event) => event is T).cast<T>();
  }

  static void emit(BlocEvent event) {
    _globalEventController.add(event);
  }
}

abstract class BlocEvent {}

class RefreshInvoicesEvent extends BlocEvent {}

/// 方案五：依赖注入 + 回调函数
/// 
/// 优点：简单直接，易于理解
/// 缺点：容易形成回调地狱，测试困难
class ReimbursementSetBlocWithCallback extends Bloc<dynamic, dynamic> {
  final void Function()? onDataChanged;

  ReimbursementSetBlocWithCallback({
    this.onDataChanged,
  }) : super(null);

  void _handleSuccess() {
    // 业务逻辑完成后调用回调
    onDataChanged?.call();
  }
}

/// 方案六：单例 Bloc Manager
/// 
/// 优点：统一管理，易于扩展
/// 缺点：可能成为God Object，违反SOLID原则
class BlocManager {
  static final BlocManager _instance = BlocManager._();
  static BlocManager get instance => _instance;
  
  BlocManager._();

  final Map<Type, BlocBase> _blocs = {};

  void registerBloc<T extends BlocBase>(T bloc) {
    _blocs[T] = bloc;
  }

  T? getBloc<T extends BlocBase>() {
    return _blocs[T] as T?;
  }

  void refreshRelatedBlocs(Type triggerBlocType) {
    // 根据业务规则刷新相关的 Bloc
    if (triggerBlocType == ReimbursementSetBloc) {
      final invoiceBloc = getBloc<InvoiceBloc>();
      // invoiceBloc?.add(RefreshEvent());
    }
  }
}

/// 推荐的事件总线模式 (当前实现)
/// 
/// 优点：
/// 1. 解耦：Bloc 之间无直接依赖
/// 2. 可扩展：易于添加新的事件类型和监听器
/// 3. 可测试：可以轻松 mock 事件总线
/// 4. 类型安全：编译时检查事件类型
/// 5. 内存安全：明确的资源清理机制
/// 
/// 缺点：
/// 1. 增加复杂性：需要定义事件类和监听逻辑
/// 2. 调试难度：事件驱动的异步逻辑较难调试
/// 3. 过度使用：可能导致事件满天飞的反模式
/// 
/// 适用场景：
/// - 复杂的跨模块通信需求
/// - 需要一对多或多对多通信
/// - 对可测试性要求较高的项目
/// - 团队对事件驱动架构有一定理解

// 本项目选择事件总线模式的原因：
// 1. 发票和报销集模块需要双向通信
// 2. 后续可能还有统计、审批等模块需要监听数据变更
// 3. 提高代码的可维护性和可测试性
// 4. 符合响应式编程的设计理念