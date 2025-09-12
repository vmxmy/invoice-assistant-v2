# 事件总线系统

## 概述

本项目采用事件总线模式来处理跨 Bloc 通信，避免 Bloc 之间的直接依赖关系，提高代码的可维护性和可测试性。

## 架构优势

### 1. 解耦设计
- **传统方式**：ReimbursementSetBloc 直接依赖 InvoiceBloc
- **事件总线**：通过事件总线进行松耦合通信

### 2. 可扩展性
- 新增监听器只需订阅相应事件
- 不需要修改现有 Bloc 的构造函数
- 支持一对多和多对多的通信模式

### 3. 可测试性
- 可以轻松模拟事件总线进行单元测试
- 事件发送和处理逻辑分离
- 支持事件回放和调试

## 事件类型

### ReimbursementSetChangedEvent (抽象基类)
所有报销集变更事件的基类

### 具体事件类型

#### ReimbursementSetCreatedEvent
```dart
// 报销集创建事件
_eventBus.emit(ReimbursementSetCreatedEvent(
  setId: createdSet.id,
  affectedInvoiceIds: invoiceIds,
));
```

#### ReimbursementSetDeletedEvent
```dart
// 报销集删除事件
_eventBus.emit(ReimbursementSetDeletedEvent(
  setId: setId,
  affectedInvoiceIds: affectedInvoiceIds,
));
```

#### InvoicesAddedToSetEvent
```dart
// 发票添加到报销集事件
_eventBus.emit(InvoicesAddedToSetEvent(
  setId: setId,
  invoiceIds: invoiceIds,
));
```

#### InvoicesRemovedFromSetEvent
```dart
// 发票从报销集移除事件
_eventBus.emit(InvoicesRemovedFromSetEvent(
  invoiceIds: invoiceIds,
));
```

## 使用方式

### 1. 发送事件 (Publisher)

```dart
class ReimbursementSetBloc extends Bloc<ReimbursementSetEvent, ReimbursementSetState> {
  final AppEventBus _eventBus;

  ReimbursementSetBloc({
    required ReimbursementSetRepository repository,
    AppEventBus? eventBus,
  }) : _eventBus = eventBus ?? AppEventBus.instance;

  Future<void> _onCreateReimbursementSet() async {
    // ... 业务逻辑 ...
    
    // 发送事件
    _eventBus.emit(ReimbursementSetCreatedEvent(
      setId: createdSet.id,
      affectedInvoiceIds: invoiceIds,
    ));
  }
}
```

### 2. 监听事件 (Subscriber)

```dart
class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  final AppEventBus _eventBus;
  StreamSubscription<ReimbursementSetChangedEvent>? _eventSubscription;

  InvoiceBloc({
    AppEventBus? eventBus,
  }) : _eventBus = eventBus ?? AppEventBus.instance {
    _setupEventSubscription();
  }

  void _setupEventSubscription() {
    _eventSubscription = _eventBus.on<ReimbursementSetChangedEvent>().listen(
      (event) {
        // 处理事件
        add(const RefreshInvoices());
      },
    );
  }

  @override
  Future<void> close() {
    _eventSubscription?.cancel();
    return super.close();
  }
}
```

## 最佳实践

### 1. 事件命名规范
- 使用过去时态：`Created`, `Deleted`, `Updated`
- 明确事件范围：`ReimbursementSetCreatedEvent`
- 继承适当的基类：`extends ReimbursementSetChangedEvent`

### 2. 事件数据设计
- 包含最少必要信息
- 使用不可变数据结构
- 提供足够的上下文信息

### 3. 错误处理
- 事件监听器中的异常不应影响发送者
- 使用 try-catch 包装事件处理逻辑
- 记录事件处理错误但不抛出异常

### 4. 测试策略
```dart
// 单元测试示例
void main() {
  group('ReimbursementSetBloc Event Bus', () {
    late MockAppEventBus mockEventBus;
    late ReimbursementSetBloc bloc;

    setUp(() {
      mockEventBus = MockAppEventBus();
      bloc = ReimbursementSetBloc(
        repository: mockRepository,
        eventBus: mockEventBus,
      );
    });

    test('should emit ReimbursementSetCreatedEvent when set created', () async {
      // Arrange
      when(() => mockRepository.createReimbursementSet())
          .thenAnswer((_) async => testReimbursementSet);

      // Act
      bloc.add(CreateReimbursementSet(setName: 'Test Set'));
      await untilCalled(() => mockEventBus.emit(any()));

      // Assert
      verify(() => mockEventBus.emit(any<ReimbursementSetCreatedEvent>()));
    });
  });
}
```

## 性能考虑

### 1. 事件总线单例
- 使用单例模式避免多个事件总线实例
- 在应用生命周期内复用同一实例

### 2. 内存管理
- 及时取消事件订阅避免内存泄漏
- 在 Bloc 的 `close()` 方法中清理资源

### 3. 事件过滤
- 使用类型过滤减少不必要的事件处理
- 考虑事件的处理频率和复杂度

## 扩展场景

### 1. 全局状态同步
- 用户认证状态变更
- 应用主题切换
- 网络连接状态变化

### 2. 跨模块通信
- 发票模块 ↔ 报销集模块
- 统计模块监听业务数据变更
- 日志模块记录用户操作

### 3. 实时数据同步
- WebSocket 消息分发
- 推送通知处理
- 数据缓存失效

## 监控和调试

### 1. 事件日志
```dart
void _setupEventSubscription() {
  _eventSubscription = _eventBus.on<ReimbursementSetChangedEvent>().listen(
    (event) {
      if (AppConfig.enableLogging) {
        print('🔄 [InvoiceBloc] 收到事件: ${event.runtimeType}');
      }
      add(const RefreshInvoices());
    },
  );
}
```

### 2. 事件追踪
- 记录事件发送时间和处理时间
- 追踪事件处理链路
- 监控事件处理性能

这种事件总线模式为跨 Bloc 通信提供了一个优雅、可扩展的解决方案，特别适合复杂的 Flutter 应用架构。