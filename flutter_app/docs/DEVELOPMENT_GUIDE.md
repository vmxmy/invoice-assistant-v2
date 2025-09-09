# 发票助手开发指南

## 🚀 快速开始

### 环境要求
- Flutter SDK: >= 3.16.0
- Dart SDK: >= 3.2.0
- iOS 开发: Xcode 14+
- Android 开发: Android Studio / VS Code

### 项目设置

1. **克隆项目**
```bash
git clone <repository-url>
cd invoice-assistant-v2/flutter_app
```

2. **安装依赖**
```bash
flutter pub get
```

3. **生成代码**
```bash
flutter packages pub run build_runner build --delete-conflicting-outputs
```

4. **配置环境变量**
创建 `.env` 文件并添加必要的配置：
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DB_URL=your_database_url
```

5. **运行应用**
```bash
flutter run
```

## 🏗️ Clean Architecture 开发工作流

### 标准开发顺序

按照 Clean Architecture 的依赖关系，推荐的开发顺序是：

#### 阶段一：核心基础层 (Core Layer) 
**最稳定，无外部依赖**

1. **常量和枚举定义**
```dart
// core/constants/app_constants.dart
class AppConstants {
  static const String appName = '发票助手';
  static const double defaultPadding = 16.0;
}

// domain/value_objects/invoice_status.dart
enum InvoiceStatus {
  pending('pending', '待处理'),
  processing('processing', '处理中'),
  completed('completed', '已完成');
}
```

2. **核心工具类**
```dart
// core/widgets/loading_widget.dart
class LoadingWidget extends StatelessWidget {
  // 通用加载组件
}

// core/widgets/error_widget.dart  
class AppErrorWidget extends StatelessWidget {
  // 通用错误展示组件
}
```

#### 阶段二：领域层 (Domain Layer)
**纯业务逻辑，不依赖外部框架**

3. **业务实体**
```dart
// domain/entities/invoice_entity.dart
class InvoiceEntity extends Equatable {
  final String id;
  final String invoiceNumber;
  final InvoiceStatus status;
  
  // 业务方法
  bool get isCompleted => status == InvoiceStatus.completed;
  double get progressPercent => _calculateProgress();
}
```

4. **仓储接口**
```dart
// domain/repositories/invoice_repository.dart
abstract class InvoiceRepository {
  Future<InvoiceListResult> getInvoices({
    int page = 1,
    InvoiceFilters? filters,
  });
  
  Future<InvoiceEntity> createInvoice(CreateInvoiceRequest request);
  Future<void> updateInvoiceStatus(String id, InvoiceStatus status);
}
```

5. **业务用例**
```dart
// domain/usecases/get_invoices_usecase.dart
class GetInvoicesUseCase {
  final InvoiceRepository _repository;
  
  const GetInvoicesUseCase(this._repository);
  
  Future<InvoiceListResult> call({
    int page = 1,
    InvoiceFilters? filters,
  }) async {
    // 业务逻辑验证
    if (page < 1) {
      throw ArgumentError('页码必须大于0');
    }
    
    return await _repository.getInvoices(
      page: page, 
      filters: filters,
    );
  }
}
```

#### 阶段三：数据层 (Data Layer)
**实现领域层定义的接口**

6. **数据传输对象**
```dart
// data/dtos/invoice_dto.dart
class InvoiceDto {
  final String id;
  final String invoiceNumber;
  final String status;
  
  const InvoiceDto({
    required this.id,
    required this.invoiceNumber,
    required this.status,
  });
  
  factory InvoiceDto.fromJson(Map<String, dynamic> json) => InvoiceDto(
    id: json['id'],
    invoiceNumber: json['invoice_number'],
    status: json['status'],
  );
}
```

7. **数据模型**
```dart
// data/models/invoice_model.dart
@freezed
class InvoiceModel with _$InvoiceModel {
  const factory InvoiceModel({
    required String id,
    @JsonKey(name: 'invoice_number') required String invoiceNumber,
    @JsonKey(name: 'status') required InvoiceStatus status,
  }) = _InvoiceModel;
  
  factory InvoiceModel.fromJson(Map<String, dynamic> json) 
    => _$InvoiceModelFromJson(json);
    
  // 转换为Entity
  InvoiceEntity toEntity() => InvoiceEntity(
    id: id,
    invoiceNumber: invoiceNumber,
    status: status,
  );
}
```

8. **数据源实现**
```dart
// data/datasources/invoice_remote_datasource.dart
abstract class InvoiceRemoteDataSource {
  Future<List<InvoiceModel>> getInvoices({
    int page = 1,
    InvoiceFilters? filters,
  });
}

class InvoiceRemoteDataSourceImpl implements InvoiceRemoteDataSource {
  @override
  Future<List<InvoiceModel>> getInvoices({
    int page = 1,
    InvoiceFilters? filters,
  }) async {
    final response = await SupabaseClientManager.from('invoices')
        .select()
        .range((page - 1) * 20, page * 20 - 1);
        
    return (response as List)
        .map((item) => InvoiceModel.fromJson(item))
        .toList();
  }
}
```

9. **仓储实现**
```dart
// data/repositories/invoice_repository_impl.dart
class InvoiceRepositoryImpl implements InvoiceRepository {
  final InvoiceRemoteDataSource _remoteDataSource;
  
  const InvoiceRepositoryImpl(this._remoteDataSource);
  
  @override
  Future<InvoiceListResult> getInvoices({
    int page = 1,
    InvoiceFilters? filters,
  }) async {
    try {
      final models = await _remoteDataSource.getInvoices(
        page: page,
        filters: filters,
      );
      
      final entities = models.map((model) => model.toEntity()).toList();
      
      return InvoiceListResult(
        invoices: entities,
        page: page,
        hasMore: models.length == 20,
      );
    } catch (e) {
      throw InvoiceException('获取发票列表失败: $e');
    }
  }
}
```

#### 阶段四：表现层 (Presentation Layer)
**用户界面和状态管理**

10. **状态管理**
```dart
// presentation/bloc/invoice_event.dart
sealed class InvoiceEvent extends Equatable {
  const InvoiceEvent();
}

class LoadInvoices extends InvoiceEvent {
  final bool refresh;
  final InvoiceFilters? filters;
  
  const LoadInvoices({this.refresh = false, this.filters});
}

// presentation/bloc/invoice_state.dart
sealed class InvoiceState extends Equatable {
  const InvoiceState();
}

class InvoiceInitial extends InvoiceState {
  @override
  List<Object> get props => [];
}

class InvoiceLoaded extends InvoiceState {
  final List<InvoiceEntity> invoices;
  final bool isLoadingMore;
  
  const InvoiceLoaded(this.invoices, {this.isLoadingMore = false});
  
  @override
  List<Object> get props => [invoices, isLoadingMore];
}

// presentation/bloc/invoice_bloc.dart
class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  final GetInvoicesUseCase _getInvoicesUseCase;
  
  InvoiceBloc(this._getInvoicesUseCase) : super(InvoiceInitial()) {
    on<LoadInvoices>(_onLoadInvoices);
    on<LoadMoreInvoices>(_onLoadMoreInvoices);
  }
  
  Future<void> _onLoadInvoices(LoadInvoices event, Emitter emit) async {
    emit(InvoiceLoading());
    try {
      final result = await _getInvoicesUseCase(filters: event.filters);
      emit(InvoiceLoaded(result.invoices));
    } catch (e) {
      emit(InvoiceError(e.toString()));
    }
  }
}
```

11. **UI组件**
```dart
// presentation/widgets/invoice_card_widget.dart
class InvoiceCardWidget extends StatelessWidget {
  final InvoiceEntity invoice;
  final VoidCallback? onTap;
  final ValueChanged<InvoiceStatus>? onStatusChanged;
  
  const InvoiceCardWidget({
    super.key,
    required this.invoice,
    this.onTap,
    this.onStatusChanged,
  });
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(invoice.invoiceNumber),
        subtitle: Text(invoice.status.displayName),
        onTap: onTap,
        trailing: _buildStatusButton(),
      ),
    );
  }
  
  Widget _buildStatusButton() {
    return PopupMenuButton<InvoiceStatus>(
      onSelected: onStatusChanged,
      itemBuilder: (context) => InvoiceStatus.values.map(
        (status) => PopupMenuItem(
          value: status,
          child: Text(status.displayName),
        ),
      ).toList(),
    );
  }
}
```

12. **页面实现**
```dart
// presentation/pages/invoice_management_page.dart
class InvoiceManagementPage extends StatefulWidget {
  const InvoiceManagementPage({super.key});

  @override
  State<InvoiceManagementPage> createState() => _InvoiceManagementPageState();
}

class _InvoiceManagementPageState extends State<InvoiceManagementPage> {
  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<InvoiceBloc>()
        ..add(const LoadInvoices(refresh: true)),
      child: Scaffold(
        appBar: AppBar(title: const Text('发票管理')),
        body: BlocBuilder<InvoiceBloc, InvoiceState>(
          builder: (context, state) {
            return switch (state) {
              InvoiceInitial() => const SizedBox.shrink(),
              InvoiceLoading() => const LoadingWidget(),
              InvoiceLoaded(:final invoices) => _buildInvoiceList(invoices),
              InvoiceError(:final message) => AppErrorWidget(
                  message: message,
                  onRetry: () => context.read<InvoiceBloc>()
                      .add(const LoadInvoices(refresh: true)),
                ),
            };
          },
        ),
      ),
    );
  }
  
  Widget _buildInvoiceList(List<InvoiceEntity> invoices) {
    return ListView.builder(
      itemCount: invoices.length,
      itemBuilder: (context, index) => InvoiceCardWidget(
        invoice: invoices[index],
        onTap: () => _showInvoiceDetail(invoices[index]),
        onStatusChanged: (status) => _updateInvoiceStatus(
          invoices[index].id,
          status,
        ),
      ),
    );
  }
}
```

#### 阶段五：基础设施层 (Infrastructure)
**外部系统集成**

13. **依赖注入**
```dart
// core/di/injection_container.dart
final sl = GetIt.instance;

Future<void> init() async {
  // Core
  _initCore();
  
  // Data sources
  sl.registerLazySingleton<InvoiceRemoteDataSource>(
    () => InvoiceRemoteDataSourceImpl(),
  );

  // Repositories
  sl.registerLazySingleton<InvoiceRepository>(
    () => InvoiceRepositoryImpl(sl()),
  );

  // Use cases
  sl.registerLazySingleton(() => GetInvoicesUseCase(sl()));
  sl.registerLazySingleton(() => UpdateInvoiceStatusUseCase(sl()));

  // BLoC
  sl.registerFactory(() => InvoiceBloc(sl()));
}
```

14. **应用配置**
```dart
// main.dart & app.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await di.init(); // 初始化依赖注入
  await SupabaseClientManager.initialize(); // 初始化外部服务
  
  runApp(const InvoiceAssistantApp());
}
```

## 🔧 开发最佳实践

### 1. 测试驱动开发 (TDD)

每个功能都应该先写测试：

```dart
// test/domain/usecases/get_invoices_usecase_test.dart
void main() {
  late GetInvoicesUseCase useCase;
  late MockInvoiceRepository mockRepository;

  setUp(() {
    mockRepository = MockInvoiceRepository();
    useCase = GetInvoicesUseCase(mockRepository);
  });

  group('GetInvoicesUseCase', () {
    test('should return invoice list when repository call succeeds', () async {
      // arrange
      final expectedResult = InvoiceListResult(
        invoices: [testInvoiceEntity],
        page: 1,
        hasMore: false,
      );
      when(() => mockRepository.getInvoices())
          .thenAnswer((_) async => expectedResult);

      // act
      final result = await useCase();

      // assert
      expect(result, expectedResult);
      verify(() => mockRepository.getInvoices()).called(1);
    });

    test('should throw InvoiceException when page is invalid', () async {
      // act & assert
      expect(
        () => useCase(page: 0),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
```

### 2. 错误处理策略

```dart
// 统一的异常类
class InvoiceException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;
  
  const InvoiceException(
    this.message, {
    this.code,
    this.originalError,
  });
  
  @override
  String toString() => 'InvoiceException: $message';
}

// 在各层的错误处理
// UseCase层
Future<InvoiceListResult> call() async {
  try {
    return await _repository.getInvoices();
  } on NetworkException catch (e) {
    throw InvoiceException('网络连接失败', originalError: e);
  } catch (e) {
    throw InvoiceException('获取发票失败: ${e.toString()}');
  }
}

// BLoC层
Future<void> _onLoadInvoices(LoadInvoices event, Emitter emit) async {
  emit(InvoiceLoading());
  try {
    final result = await _getInvoicesUseCase();
    emit(InvoiceLoaded(result.invoices));
  } on InvoiceException catch (e) {
    emit(InvoiceError(e.message));
  } catch (e) {
    emit(InvoiceError('未知错误: ${e.toString()}'));
  }
}
```

### 3. 平台兼容性

```dart
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io';

class PlatformUtils {
  static bool get isIOS => !kIsWeb && Platform.isIOS;
  static bool get isAndroid => !kIsWeb && Platform.isAndroid;
  static bool get isWeb => kIsWeb;
  
  static bool get isMobile => isIOS || isAndroid;
  static bool get isDesktop => !kIsWeb && (Platform.isMacOS || Platform.isWindows || Platform.isLinux);
}

// 在组件中使用
class InvoiceCardWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(invoice.invoiceNumber),
        subtitle: Text(_getDateText()), // 根据平台显示不同日期
      ),
    );
  }
  
  String _getDateText() {
    if (PlatformUtils.isIOS) {
      // iOS优先显示消费日期
      return invoice.consumptionDate?.toString() ?? invoice.invoiceDate.toString();
    }
    return invoice.invoiceDate.toString();
  }
}
```

### 4. 性能优化

#### 列表性能优化
```dart
class OptimizedInvoiceList extends StatelessWidget {
  final List<InvoiceEntity> invoices;
  
  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      // 使用 builder 而不是直接构建所有项
      itemCount: invoices.length,
      // 添加缓存
      cacheExtent: 1000,
      itemBuilder: (context, index) {
        return InvoiceCardWidget(
          key: ValueKey(invoices[index].id), // 提供稳定的key
          invoice: invoices[index],
        );
      },
    );
  }
}
```

#### 内存优化
```dart
class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  static const int _maxCacheSize = 100; // 限制缓存大小
  final List<InvoiceEntity> _cachedInvoices = [];
  
  void _addToCacheWithLimit(List<InvoiceEntity> newInvoices) {
    _cachedInvoices.addAll(newInvoices);
    if (_cachedInvoices.length > _maxCacheSize) {
      _cachedInvoices.removeRange(0, _cachedInvoices.length - _maxCacheSize);
    }
  }
}
```

## 📋 代码规范和约定

### 命名约定
- **文件名**: `snake_case` (invoice_entity.dart)
- **类名**: `PascalCase` (InvoiceEntity)  
- **方法/变量**: `camelCase` (loadInvoices)
- **常量**: `SCREAMING_SNAKE_CASE` (MAX_RETRY_COUNT)
- **私有成员**: `_leadingUnderscore` (_privateMethod)

### 文件组织
```dart
class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  // 1. 静态常量
  static const int maxRetryCount = 3;
  
  // 2. 私有字段
  final GetInvoicesUseCase _getInvoicesUseCase;
  final UpdateInvoiceStatusUseCase _updateInvoiceStatusUseCase;
  
  // 3. 构造函数
  InvoiceBloc(
    this._getInvoicesUseCase,
    this._updateInvoiceStatusUseCase,
  ) : super(InvoiceInitial()) {
    on<LoadInvoices>(_onLoadInvoices);
    on<UpdateInvoiceStatus>(_onUpdateInvoiceStatus);
  }
  
  // 4. 公共方法
  void refreshInvoices() {
    add(const LoadInvoices(refresh: true));
  }
  
  // 5. 事件处理方法 (按字母顺序)
  Future<void> _onLoadInvoices(LoadInvoices event, Emitter emit) async {
    // 实现...
  }
  
  Future<void> _onUpdateInvoiceStatus(UpdateInvoiceStatus event, Emitter emit) async {
    // 实现...
  }
  
  // 6. 私有辅助方法
  void _logError(String message, dynamic error) {
    if (AppConfig.enableLogging) {
      print('❌ [InvoiceBloc] $message: $error');
    }
  }
}
```

### 导入顺序
```dart
// 1. Dart 核心库
import 'dart:async';
import 'dart:io';

// 2. Flutter 框架
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

// 3. 第三方包 (按字母顺序)
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

// 4. 项目内部导入 (按层级顺序)
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../core/constants/app_constants.dart';
import '../widgets/invoice_card_widget.dart';
```

## 🧪 测试策略

### 测试金字塔
```
    ┌─────────────┐
    │Widget Tests │ (10%)
    └─────────────┘
   ┌───────────────┐
   │Integration    │ (20%)  
   │Tests          │
   └───────────────┘
 ┌─────────────────────┐
 │   Unit Tests        │ (70%)
 └─────────────────────┘
```

### 单元测试覆盖
- **Domain层**: 100% 覆盖率 (业务逻辑关键)
- **Data层**: 90%+ 覆盖率
- **Presentation层**: 80%+ 覆盖率 (BLoC逻辑)

### 测试工具配置
```dart
// test/helpers/test_helpers.dart
class MockInvoiceRepository extends Mock implements InvoiceRepository {}
class MockGetInvoicesUseCase extends Mock implements GetInvoicesUseCase {}

// 测试数据
final testInvoiceEntity = InvoiceEntity(
  id: 'test-id',
  invoiceNumber: 'INV-001',
  status: InvoiceStatus.completed,
  invoiceDate: DateTime(2024, 1, 1),
);

final testInvoiceListResult = InvoiceListResult(
  invoices: [testInvoiceEntity],
  page: 1,
  hasMore: false,
);
```

## 🚀 部署和维护

### 代码质量检查
```bash
# 完整的质量检查流程
flutter clean                    # 清理构建
flutter pub get                  # 获取依赖
flutter packages pub run build_runner build --delete-conflicting-outputs  # 生成代码
flutter analyze --fatal-infos    # 静态分析 (严格模式)
flutter test --coverage          # 运行测试并生成覆盖率
flutter format --set-exit-if-changed .  # 检查格式化
```

### CI/CD 流程
```yaml
# .github/workflows/flutter.yml
name: Flutter CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.16.0'
    
    - run: flutter pub get
    - run: flutter packages pub run build_runner build --delete-conflicting-outputs
    - run: flutter analyze --fatal-infos
    - run: flutter test --coverage
    - run: flutter format --set-exit-if-changed .
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: coverage/lcov.info
```

### 发布检查清单
- [ ] 所有测试通过
- [ ] 代码覆盖率 > 80%
- [ ] 无静态分析警告
- [ ] 性能基准测试通过
- [ ] 文档更新完成
- [ ] 版本号更新
- [ ] 变更日志编写

## 📚 有用的命令和工具

### 开发命令
```bash
# 热重载运行
flutter run

# 性能分析模式
flutter run --profile

# Web端运行
flutter run -d chrome --web-renderer canvaskit

# 依赖管理
flutter pub deps                 # 查看依赖树
flutter pub outdated            # 检查过时依赖
flutter pub upgrade --major-versions  # 升级主要版本
```

### 代码生成命令
```bash
# 监听模式 (开发期间使用)
flutter packages pub run build_runner watch

# 一次性生成
flutter packages pub run build_runner build

# 强制重新生成所有
flutter packages pub run build_runner build --delete-conflicting-outputs
```

### 调试命令
```bash
# Flutter Inspector
flutter inspector

# 性能分析
flutter run --profile
# 然后在浏览器中打开: http://localhost:9100

# 内存分析
flutter run --debug
# 使用 Observatory 进行内存分析
```

### 构建命令
```bash
# 开发版本
flutter build apk --debug
flutter build ios --debug

# 发布版本
flutter build apk --release --split-per-abi  # Android (分ABI包)
flutter build appbundle --release            # Android App Bundle
flutter build ios --release --no-codesign    # iOS
flutter build web --release --web-renderer canvaskit  # Web
```

## 🤝 团队协作

### Git 工作流
```bash
# 功能分支工作流
git checkout -b feature/invoice-status-update
git add .
git commit -m "feat(invoice): 添加状态更新功能"
git push origin feature/invoice-status-update
# 创建 Pull Request
```

### 代码审查检查项
- [ ] 遵循 Clean Architecture 分层
- [ ] 业务逻辑在 Domain 层
- [ ] UI 逻辑在 Presentation 层
- [ ] 数据访问在 Data 层
- [ ] 错误处理完整
- [ ] 测试覆盖充分
- [ ] 性能影响评估
- [ ] 安全性考虑

这个开发指南确保团队能够一致地构建**高质量**、**可维护**、**可测试**的Flutter应用程序。