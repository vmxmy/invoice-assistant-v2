# 最佳实践和代码示例

## 📚 目录

1. [清洁架构实施](#清洁架构实施)
2. [BLoC 模式最佳实践](#bloc-模式最佳实践)
3. [错误处理策略](#错误处理策略)
4. [性能优化技巧](#性能优化技巧)
5. [测试策略](#测试策略)
6. [代码复用和组件化](#代码复用和组件化)
7. [安全实践](#安全实践)

## 🏗️ 清洁架构实施

### 1. 依赖倒置原则

❌ **错误示例**: 高层依赖低层
```dart
// 错误: UseCase 直接依赖具体实现
class GetInvoicesUseCase {
  final InvoiceApiService _apiService; // 直接依赖具体实现
  
  GetInvoicesUseCase(this._apiService);
}
```

✅ **正确示例**: 依赖抽象接口
```dart
// 正确: UseCase 依赖抽象接口
class GetInvoicesUseCase {
  final InvoiceRepository _repository; // 依赖抽象接口
  
  GetInvoicesUseCase(this._repository);
  
  Future<InvoiceListResult> call([InvoiceFilters? filters]) async {
    // 验证业务规则
    if (filters?.startDate?.isAfter(DateTime.now()) == true) {
      throw InvoiceException('开始日期不能是未来时间');
    }
    
    return await _repository.getInvoices(filters: filters);
  }
}
```

### 2. 实体和模型分离

✅ **实体定义** (domain/entities/)
```dart
// 纯业务逻辑，无外部依赖
class InvoiceEntity {
  final String id;
  final String invoiceNumber;
  final DateTime invoiceDate;
  final DateTime? consumptionDate;
  final double amount;
  final InvoiceStatus status;
  
  const InvoiceEntity({
    required this.id,
    required this.invoiceNumber,
    required this.invoiceDate,
    this.consumptionDate,
    required this.amount,
    required this.status,
  });
  
  // 业务逻辑方法
  String get formattedAmount => '¥${amount.toStringAsFixed(2)}';
  
  bool get isOverdue {
    final now = DateTime.now();
    final dueDate = invoiceDate.add(const Duration(days: 30));
    return now.isAfter(dueDate) && status == InvoiceStatus.pending;
  }
  
  double get progressPercent {
    switch (status) {
      case InvoiceStatus.pending:
        return 0.0;
      case InvoiceStatus.processing:
        return 0.5;
      case InvoiceStatus.verified:
      case InvoiceStatus.completed:
        return 1.0;
      default:
        return 0.0;
    }
  }
}
```

✅ **数据模型** (data/models/)
```dart
// 用于序列化，包含转换逻辑
@freezed
class InvoiceModel with _$InvoiceModel {
  const factory InvoiceModel({
    required String id,
    @JsonKey(name: 'invoice_number') required String invoiceNumber,
    @JsonKey(name: 'invoice_date') required DateTime invoiceDate,
    @JsonKey(name: 'consumption_date') DateTime? consumptionDate,
    required double amount,
    @Default(InvoiceStatus.pending) InvoiceStatus status,
  }) = _InvoiceModel;

  factory InvoiceModel.fromJson(Map<String, dynamic> json) =>
      _$InvoiceModelFromJson(json);
}

// 转换扩展
extension InvoiceModelX on InvoiceModel {
  InvoiceEntity toEntity() {
    return InvoiceEntity(
      id: id,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      consumptionDate: consumptionDate,
      amount: amount,
      status: status,
    );
  }
}

extension InvoiceEntityX on InvoiceEntity {
  InvoiceModel toModel() {
    return InvoiceModel(
      id: id,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      consumptionDate: consumptionDate,
      amount: amount,
      status: status,
    );
  }
}
```

## 🎯 BLoC 模式最佳实践

### 1. 事件设计

✅ **良好的事件设计**
```dart
// 使用密封类和具体的事件类型
sealed class InvoiceEvent {}

// 加载事件，支持可选参数
class LoadInvoices extends InvoiceEvent {
  final InvoiceFilters? filters;
  final bool refresh;
  
  const LoadInvoices({this.filters, this.refresh = false});
}

// 删除事件，明确参数
class DeleteInvoice extends InvoiceEvent {
  final String invoiceId;
  final bool showConfirmation;
  
  const DeleteInvoice(this.invoiceId, {this.showConfirmation = true});
}

// 批量操作事件
class BatchDeleteInvoices extends InvoiceEvent {
  final List<String> invoiceIds;
  
  const BatchDeleteInvoices(this.invoiceIds);
}
```

### 2. 状态设计

✅ **状态管理最佳实践**
```dart
// 使用密封类确保类型安全
sealed class InvoiceState {}

class InvoiceInitial extends InvoiceState {}

class InvoiceLoading extends InvoiceState {
  final bool isRefreshing;
  
  InvoiceLoading({this.isRefreshing = false});
}

class InvoiceLoaded extends InvoiceState {
  final InvoiceListResult result;
  final InvoiceFilters? activeFilters;
  final bool isLoadingMore;
  
  InvoiceLoaded(
    this.result, {
    this.activeFilters,
    this.isLoadingMore = false,
  });
  
  // 便捷的计算属性
  List<InvoiceEntity> get invoices => result.invoices;
  bool get hasMore => result.hasMore;
  
  // 复制方法用于状态更新
  InvoiceLoaded copyWith({
    InvoiceListResult? result,
    InvoiceFilters? activeFilters,
    bool? isLoadingMore,
  }) {
    return InvoiceLoaded(
      result ?? this.result,
      activeFilters: activeFilters ?? this.activeFilters,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }
}

class InvoiceError extends InvoiceState {
  final String message;
  final Exception? exception;
  
  InvoiceError(this.message, [this.exception]);
}
```

### 3. BLoC 实现

✅ **BLoC 最佳实践**
```dart
class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  final GetInvoicesUseCase _getInvoicesUseCase;
  final DeleteInvoiceUseCase _deleteInvoiceUseCase;
  
  InvoiceBloc(
    this._getInvoicesUseCase,
    this._deleteInvoiceUseCase,
  ) : super(InvoiceInitial()) {
    // 注册事件处理器
    on<LoadInvoices>(_onLoadInvoices);
    on<LoadMoreInvoices>(_onLoadMoreInvoices);
    on<DeleteInvoice>(_onDeleteInvoice);
    on<RefreshInvoices>(_onRefreshInvoices);
  }

  Future<void> _onLoadInvoices(
    LoadInvoices event,
    Emitter<InvoiceState> emit,
  ) async {
    if (event.refresh) {
      emit(InvoiceLoading(isRefreshing: true));
    } else {
      emit(InvoiceLoading());
    }

    try {
      final result = await _getInvoicesUseCase(event.filters);
      emit(InvoiceLoaded(result, activeFilters: event.filters));
      
      // 可选的成功日志
      if (AppConfig.enableLogging) {
        print('✅ 成功加载 ${result.invoices.length} 张发票');
      }
    } catch (e, stackTrace) {
      // 错误日志
      if (AppConfig.enableLogging) {
        print('❌ 加载发票失败: $e');
        print('Stack trace: $stackTrace');
      }
      
      emit(InvoiceError(_getErrorMessage(e), e is Exception ? e : null));
    }
  }

  Future<void> _onLoadMoreInvoices(
    LoadMoreInvoices event,
    Emitter<InvoiceState> emit,
  ) async {
    final currentState = state;
    if (currentState is! InvoiceLoaded || !currentState.hasMore) {
      return; // 无更多数据或状态不正确
    }

    // 显示加载更多状态
    emit(currentState.copyWith(isLoadingMore: true));

    try {
      final nextPage = currentState.result.page + 1;
      final moreResult = await _getInvoicesUseCase(
        currentState.activeFilters?.copyWith(page: nextPage),
      );

      // 合并数据
      final combinedInvoices = [
        ...currentState.invoices,
        ...moreResult.invoices,
      ];

      final combinedResult = InvoiceListResult(
        invoices: combinedInvoices,
        total: moreResult.total,
        page: nextPage,
        pageSize: moreResult.pageSize,
        hasMore: moreResult.hasMore,
      );

      emit(InvoiceLoaded(
        combinedResult,
        activeFilters: currentState.activeFilters,
      ));
    } catch (e) {
      // 恢复之前状态，但显示错误
      emit(currentState.copyWith(isLoadingMore: false));
      // 可以选择显示 snackbar 而不是完整错误状态
    }
  }

  String _getErrorMessage(dynamic error) {
    if (error is InvoiceException) {
      return error.message;
    }
    if (error is NetworkException) {
      return '网络连接异常，请检查网络设置';
    }
    return '加载数据时发生未知错误';
  }
}
```

## 🛡️ 错误处理策略

### 1. 分层错误处理

✅ **数据源层错误处理**
```dart
class InvoiceRemoteDataSourceImpl implements InvoiceRemoteDataSource {
  @override
  Future<List<InvoiceModel>> getInvoices({
    int page = 1,
    int pageSize = 20,
    InvoiceFilters? filters,
  }) async {
    try {
      final response = await SupabaseClientManager
          .from('invoices')
          .select()
          .eq('user_id', getCurrentUserId())
          .range((page - 1) * pageSize, page * pageSize - 1);
      
      return (response as List)
          .map((json) => InvoiceModel.fromJson(json))
          .toList();
          
    } on PostgrestException catch (e) {
      // Supabase 特定错误
      throw DataSourceException(
        'Database error: ${e.message}',
        code: e.code,
      );
    } on SocketException {
      // 网络错误
      throw NetworkException('网络连接失败，请检查网络设置');
    } catch (e) {
      // 其他未知错误
      if (AppConfig.enableLogging) {
        print('❌ [DataSource] Unexpected error: $e');
      }
      throw DataSourceException('数据获取失败: $e');
    }
  }
}
```

✅ **用例层错误处理**
```dart
class GetInvoicesUseCase {
  final InvoiceRepository _repository;
  
  Future<InvoiceListResult> call([InvoiceFilters? filters]) async {
    try {
      // 业务规则验证
      _validateFilters(filters);
      
      final result = await _repository.getInvoices(filters: filters);
      
      // 业务规则后处理
      if (result.invoices.isEmpty && filters != null) {
        throw InvoiceException('没有找到符合条件的发票');
      }
      
      return result;
    } on InvoiceException {
      // 业务异常直接抛出
      rethrow;
    } catch (e) {
      // 包装其他异常为业务异常
      throw InvoiceException('获取发票列表失败: $e');
    }
  }
  
  void _validateFilters(InvoiceFilters? filters) {
    if (filters?.startDate?.isAfter(DateTime.now()) == true) {
      throw InvoiceException('开始日期不能是未来时间');
    }
    
    if (filters?.endDate?.isBefore(filters?.startDate ?? DateTime.now()) == true) {
      throw InvoiceException('结束日期不能早于开始日期');
    }
  }
}
```

### 2. 自定义异常类型

✅ **异常层次结构**
```dart
// 基础异常类
abstract class AppException implements Exception {
  final String message;
  final String? code;
  
  const AppException(this.message, [this.code]);
  
  @override
  String toString() => 'AppException: $message${code != null ? ' (code: $code)' : ''}';
}

// 业务异常
class InvoiceException extends AppException {
  const InvoiceException(super.message, [super.code]);
}

// 网络异常
class NetworkException extends AppException {
  const NetworkException(super.message, [super.code]);
}

// 数据源异常
class DataSourceException extends AppException {
  const DataSourceException(super.message, [super.code]);
}

// 认证异常
class AuthException extends AppException {
  const AuthException(super.message, [super.code]);
}
```

## 🚀 性能优化技巧

### 1. 列表性能优化

✅ **虚拟滚动和懒加载**
```dart
class OptimizedInvoiceList extends StatelessWidget {
  final List<InvoiceEntity> invoices;
  final VoidCallback? onLoadMore;
  final bool isLoadingMore;

  const OptimizedInvoiceList({
    super.key,
    required this.invoices,
    this.onLoadMore,
    this.isLoadingMore = false,
  });

  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: _onScrollNotification,
      child: ListView.builder(
        // 性能优化配置
        itemExtent: 120, // 固定高度提升性能
        cacheExtent: 1000, // 缓存范围
        itemCount: invoices.length + (isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= invoices.length) {
            // 加载更多指示器
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }
          
          return OptimizedInvoiceCard(
            key: ValueKey(invoices[index].id), // 使用稳定的key
            invoice: invoices[index],
          );
        },
      ),
    );
  }

  bool _onScrollNotification(ScrollNotification notification) {
    if (notification is ScrollEndNotification &&
        notification.metrics.extentAfter < 500) {
      // 距离底部500像素时加载更多
      onLoadMore?.call();
    }
    return false;
  }
}
```

### 2. Widget 性能优化

✅ **使用 const 构造函数和缓存**
```dart
class OptimizedInvoiceCard extends StatelessWidget {
  final InvoiceEntity invoice;
  final VoidCallback? onTap;
  
  // 使用 const 构造函数
  const OptimizedInvoiceCard({
    super.key,
    required this.invoice,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // 缓存复杂的组件
              _buildStatusIndicator(),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 使用 const Text 当可能时
                    Text(
                      invoice.invoiceNumber,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      invoice.formattedAmount,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusIndicator() {
    // 缓存状态指示器，避免重复创建
    return Container(
      width: 8,
      height: 40,
      decoration: BoxDecoration(
        color: _getStatusColor(),
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }

  Color _getStatusColor() {
    switch (invoice.status) {
      case InvoiceStatus.pending:
        return Colors.orange;
      case InvoiceStatus.processing:
        return Colors.blue;
      case InvoiceStatus.verified:
        return Colors.green;
      case InvoiceStatus.failed:
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
```

### 3. 图片优化

✅ **图片加载和缓存优化**
```dart
class OptimizedInvoiceImage extends StatelessWidget {
  final String? imageUrl;
  final double width;
  final double height;

  const OptimizedInvoiceImage({
    super.key,
    this.imageUrl,
    this.width = 100,
    this.height = 100,
  });

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null) {
      return _buildPlaceholder();
    }

    return CachedNetworkImage(
      imageUrl: imageUrl!,
      width: width,
      height: height,
      fit: BoxFit.cover,
      
      // 内存缓存优化
      memCacheWidth: width.toInt(),
      memCacheHeight: height.toInt(),
      maxHeightDiskCache: 500,
      maxWidthDiskCache: 500,
      
      // 占位符和错误处理
      placeholder: (context, url) => _buildPlaceholder(),
      errorWidget: (context, url, error) => _buildErrorWidget(),
      
      // 淡入动画
      fadeInDuration: const Duration(milliseconds: 300),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        Icons.receipt,
        color: Colors.grey,
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.red.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        Icons.error,
        color: Colors.red,
      ),
    );
  }
}
```

## 🧪 测试策略

### 1. 单元测试模板

✅ **UseCase 测试模板**
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// Mock 类
class MockInvoiceRepository extends Mock implements InvoiceRepository {}

void main() {
  group('GetInvoicesUseCase', () {
    late GetInvoicesUseCase useCase;
    late MockInvoiceRepository mockRepository;

    setUp(() {
      mockRepository = MockInvoiceRepository();
      useCase = GetInvoicesUseCase(mockRepository);
    });

    group('成功场景', () {
      test('应该返回发票列表', () async {
        // Arrange
        const filters = InvoiceFilters(page: 1);
        final expectedResult = InvoiceListResult(
          invoices: [testInvoiceEntity],
          total: 1,
          page: 1,
          pageSize: 20,
          hasMore: false,
        );
        
        when(() => mockRepository.getInvoices(filters: filters))
            .thenAnswer((_) async => expectedResult);

        // Act
        final result = await useCase(filters);

        // Assert
        expect(result, expectedResult);
        verify(() => mockRepository.getInvoices(filters: filters)).called(1);
      });
    });

    group('错误场景', () {
      test('应该抛出异常当开始日期是未来时间', () async {
        // Arrange
        final invalidFilters = InvoiceFilters(
          startDate: DateTime.now().add(const Duration(days: 1)),
        );

        // Act & Assert
        expect(
          () => useCase(invalidFilters),
          throwsA(isA<InvoiceException>()),
        );
      });

      test('应该处理仓储异常', () async {
        // Arrange
        when(() => mockRepository.getInvoices())
            .thenThrow(Exception('Network error'));

        // Act & Assert
        expect(
          () => useCase(),
          throwsA(isA<InvoiceException>()),
        );
      });
    });
  });
}
```

### 2. Widget 测试模板

✅ **Widget 测试最佳实践**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';

class MockInvoiceBloc extends MockBloc<InvoiceEvent, InvoiceState>
    implements InvoiceBloc {}

void main() {
  group('InvoiceManagementPage', () {
    late MockInvoiceBloc mockBloc;

    setUp(() {
      mockBloc = MockInvoiceBloc();
    });

    Widget createWidgetUnderTest() {
      return MaterialApp(
        home: BlocProvider<InvoiceBloc>.value(
          value: mockBloc,
          child: const InvoiceManagementPage(),
        ),
      );
    }

    testWidgets('应该显示加载状态', (tester) async {
      // Arrange
      when(() => mockBloc.state).thenReturn(InvoiceLoading());

      // Act
      await tester.pumpWidget(createWidgetUnderTest());

      // Assert
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('应该显示发票列表', (tester) async {
      // Arrange
      final invoices = [testInvoiceEntity];
      final state = InvoiceLoaded(InvoiceListResult(invoices: invoices));
      when(() => mockBloc.state).thenReturn(state);

      // Act
      await tester.pumpWidget(createWidgetUnderTest());
      await tester.pump(); // 等待构建完成

      // Assert
      expect(find.byType(InvoiceCardWidget), findsOneWidget);
      expect(find.text(testInvoiceEntity.invoiceNumber), findsOneWidget);
    });

    testWidgets('应该处理下拉刷新', (tester) async {
      // Arrange
      final state = InvoiceLoaded(InvoiceListResult(invoices: []));
      when(() => mockBloc.state).thenReturn(state);

      // Act
      await tester.pumpWidget(createWidgetUnderTest());
      await tester.fling(find.byType(RefreshIndicator), const Offset(0, 300), 1000);
      await tester.pump();

      // Assert
      verify(() => mockBloc.add(const LoadInvoices(refresh: true))).called(1);
    });
  });
}

// 测试工具函数
const testInvoiceEntity = InvoiceEntity(
  id: 'test-id',
  invoiceNumber: 'INV-001',
  invoiceDate: DateTime(2024, 1, 1),
  amount: 100.0,
  status: InvoiceStatus.verified,
);
```

### 3. 集成测试

✅ **端到端测试示例**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:invoice_assistant/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('发票管理端到端测试', () {
    testWidgets('用户可以查看发票列表', (tester) async {
      // 启动应用
      app.main();
      await tester.pumpAndSettle();

      // 等待数据加载
      await tester.pump(const Duration(seconds: 2));

      // 验证发票列表显示
      expect(find.byType(InvoiceCardWidget), findsWidgets);
      
      // 验证可以滚动
      await tester.fling(find.byType(ListView), const Offset(0, -500), 1000);
      await tester.pumpAndSettle();
    });

    testWidgets('用户可以搜索发票', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // 点击搜索按钮
      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      // 输入搜索内容
      await tester.enterText(find.byType(TextField), 'INV-001');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      // 验证搜索结果
      expect(find.text('INV-001'), findsWidgets);
    });
  });
}
```

## 🔐 安全实践

### 1. 敏感数据处理

✅ **环境变量和配置**
```dart
// core/config/env_config.dart
class EnvConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );
  
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY', 
    defaultValue: '',
  );
  
  // 验证配置完整性
  static bool get isValid {
    return supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
  }
  
  // 开发环境检查
  static void validateConfig() {
    if (!isValid) {
      throw ConfigurationException('Missing required environment variables');
    }
  }
}
```

### 2. 数据验证和清理

✅ **输入验证**
```dart
class InputValidator {
  // 发票号验证
  static String? validateInvoiceNumber(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '发票号不能为空';
    }
    
    // 清理输入
    final cleaned = value.trim();
    
    // 格式验证
    if (!RegExp(r'^[A-Z0-9\-]+$').hasMatch(cleaned)) {
      return '发票号格式无效';
    }
    
    if (cleaned.length < 3 || cleaned.length > 50) {
      return '发票号长度应在3-50字符之间';
    }
    
    return null;
  }
  
  // 金额验证
  static String? validateAmount(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '金额不能为空';
    }
    
    final amount = double.tryParse(value.trim());
    if (amount == null) {
      return '请输入有效的金额';
    }
    
    if (amount <= 0) {
      return '金额必须大于0';
    }
    
    if (amount > 999999999.99) {
      return '金额过大';
    }
    
    return null;
  }
  
  // HTML 和脚本清理
  static String sanitizeInput(String input) {
    return input
        .replaceAll(RegExp(r'<[^>]*>'), '') // 移除HTML标签
        .replaceAll(RegExp(r'javascript:', caseSensitive: false), '') // 移除JavaScript
        .trim();
  }
}
```

### 3. 权限和认证

✅ **安全的API调用**
```dart
class SecureApiClient {
  static const Duration _timeout = Duration(seconds: 30);
  
  Future<T> secureRequest<T>({
    required String endpoint,
    required T Function(Map<String, dynamic>) parser,
    Map<String, dynamic>? data,
    String method = 'GET',
  }) async {
    try {
      // 验证用户认证状态
      final user = SupabaseClientManager.currentUser;
      if (user == null) {
        throw AuthException('用户未登录');
      }
      
      // 构建安全的请求
      final client = SupabaseClientManager.client;
      final response = await client
          .from(endpoint)
          .select()
          .eq('user_id', user.id) // 确保数据隔离
          .timeout(_timeout);
      
      // 验证响应
      if (response == null) {
        throw DataSourceException('服务器响应为空');
      }
      
      return parser(response as Map<String, dynamic>);
      
    } on TimeoutException {
      throw NetworkException('请求超时，请稍后重试');
    } on AuthException {
      // 认证错误，可能需要重新登录
      rethrow;
    } catch (e) {
      if (AppConfig.enableLogging) {
        print('🔒 [SecureApi] Request failed: $e');
      }
      throw DataSourceException('请求失败: $e');
    }
  }
}
```

这些最佳实践和代码示例提供了完整的开发指导，确保代码质量、性能和安全性。记住始终遵循这些准则来维护项目的高标准。