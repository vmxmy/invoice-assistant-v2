import 'package:get_it/get_it.dart';

// 数据层
import '../../data/datasources/invoice_remote_datasource.dart';
import '../../data/repositories/invoice_repository_impl.dart';
import '../../data/repositories/reimbursement_set_repository_impl.dart';

// 领域层
import '../../domain/repositories/invoice_repository.dart';
import '../../domain/repositories/reimbursement_set_repository.dart';
import '../../domain/usecases/get_invoices_usecase.dart';
import '../../domain/usecases/get_invoice_detail_usecase_production.dart';
import '../../domain/usecases/get_invoice_stats_usecase.dart';
import '../../domain/usecases/delete_invoice_usecase.dart';
import '../../domain/usecases/update_invoice_status_usecase.dart';
import '../../domain/usecases/upload_invoice_usecase.dart';

// 表现层
import '../../presentation/bloc/invoice_bloc.dart';
import '../../presentation/bloc/reimbursement_set_bloc.dart';

// 核心服务
import '../events/app_event_bus.dart';

/// 全局依赖注入容器
final sl = GetIt.instance;

/// 初始化所有依赖
Future<void> init() async {
  //! 表现层 (Presentation Layer)
  // BLoCs - 使用事件总线模式进行跨Bloc通信
  sl.registerLazySingleton(
    () => InvoiceBloc(
      getInvoicesUseCase: sl(),
      getInvoiceDetailUseCase: sl(),
      getInvoiceStatsUseCase: sl(),
      deleteInvoiceUseCase: sl(),
      updateInvoiceStatusUseCase: sl(),
      uploadInvoiceUseCase: sl(),
    ),
  );

  sl.registerFactory(
    () => ReimbursementSetBloc(
      repository: sl(),
    ),
  );

  //! 领域层 (Domain Layer)
  // Use cases
  sl.registerLazySingleton(() => GetInvoicesUseCase(sl()));
  sl.registerLazySingleton(() => GetInvoiceDetailUseCaseProduction(sl()));
  sl.registerLazySingleton(() => GetInvoiceStatsUseCase(sl()));
  sl.registerLazySingleton(() => DeleteInvoiceUseCase(sl()));
  sl.registerLazySingleton(() => UpdateInvoiceStatusUseCase(sl()));
  sl.registerLazySingleton(() => UploadInvoiceUseCase(sl()));

  //! 数据层 (Data Layer)
  // Repositories
  sl.registerLazySingleton<InvoiceRepository>(
    () => InvoiceRepositoryImpl(sl()),
  );

  sl.registerLazySingleton<ReimbursementSetRepository>(
    () => ReimbursementSetRepositoryImpl(),
  );

  // Data sources
  sl.registerLazySingleton<InvoiceRemoteDataSource>(
    () => InvoiceRemoteDataSourceImpl(),
  );

  //! 外部依赖 (External Dependencies)
  // 这里可以注册外部服务，如网络客户端、本地存储等

  //! 核心服务 (Core Services)
  // 事件总线 - 用于跨Bloc通信（可选，因为使用单例模式）
  sl.registerLazySingleton<AppEventBus>(() => AppEventBus.instance);
  
  // 其他核心服务，如网络检查、错误处理等
}

/// 重置所有注册的依赖 (主要用于测试)
Future<void> reset() async {
  await sl.reset();
}
