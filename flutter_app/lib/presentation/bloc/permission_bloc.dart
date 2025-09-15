import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/user_permissions.dart';
import '../../data/services/permission_service.dart';
import '../../core/utils/logger.dart';

// Events
abstract class PermissionEvent extends Equatable {
  const PermissionEvent();

  @override
  List<Object?> get props => [];
}

class LoadPermissions extends PermissionEvent {
  const LoadPermissions();
}

class RefreshPermissions extends PermissionEvent {
  const RefreshPermissions();
}

class ClearPermissions extends PermissionEvent {
  const ClearPermissions();
}

class CheckPermission extends PermissionEvent {
  final String permission;

  const CheckPermission(this.permission);

  @override
  List<Object?> get props => [permission];
}

class CheckRole extends PermissionEvent {
  final String role;

  const CheckRole(this.role);

  @override
  List<Object?> get props => [role];
}

// States
abstract class PermissionState extends Equatable {
  const PermissionState();

  @override
  List<Object?> get props => [];
}

class PermissionInitial extends PermissionState {
  const PermissionInitial();
}

class PermissionLoading extends PermissionState {
  const PermissionLoading();
}

class PermissionLoaded extends PermissionState {
  final UserPermissions permissions;

  const PermissionLoaded(this.permissions);

  @override
  List<Object?> get props => [permissions];
}

class PermissionError extends PermissionState {
  final String message;

  const PermissionError(this.message);

  @override
  List<Object?> get props => [message];
}

class PermissionEmpty extends PermissionState {
  const PermissionEmpty();
}

// Bloc
class PermissionBloc extends Bloc<PermissionEvent, PermissionState> {
  final PermissionService _permissionService;
  UserPermissions? _cachedPermissions;

  PermissionBloc({
    required PermissionService permissionService,
  })  : _permissionService = permissionService,
        super(const PermissionInitial()) {
    on<LoadPermissions>(_onLoadPermissions);
    on<RefreshPermissions>(_onRefreshPermissions);
    on<ClearPermissions>(_onClearPermissions);
    on<CheckPermission>(_onCheckPermission);
    on<CheckRole>(_onCheckRole);

    AppLogger.debug('🔐 [PermissionBloc] 权限状态管理器已初始化', tag: 'Permission');
  }

  /// 加载权限
  Future<void> _onLoadPermissions(
    LoadPermissions event,
    Emitter<PermissionState> emit,
  ) async {
    try {
      AppLogger.debug('🔐 [PermissionBloc] 开始加载权限信息', tag: 'Permission');

      // 如果已有缓存权限且不是强制刷新，直接返回缓存
      if (_cachedPermissions != null) {
        AppLogger.debug('🔐 [PermissionBloc] 使用缓存的权限信息', tag: 'Permission');
        emit(PermissionLoaded(_cachedPermissions!));
        return;
      }

      emit(const PermissionLoading());

      final permissions = await _permissionService.getCurrentUserPermissions();

      if (permissions != null) {
        _cachedPermissions = permissions;
        AppLogger.info(
            '🔐 [PermissionBloc] 权限加载成功: ${permissions.permissionLevel.displayName}',
            tag: 'Permission');
        emit(PermissionLoaded(permissions));
      } else {
        AppLogger.warning('🔐 [PermissionBloc] 无法获取权限信息', tag: 'Permission');
        emit(const PermissionEmpty());
      }
    } catch (e, stackTrace) {
      AppLogger.error(
        '🔐 [PermissionBloc] 权限加载失败',
        tag: 'Permission',
        error: e,
        stackTrace: stackTrace,
      );
      emit(PermissionError('权限加载失败: ${e.toString()}'));
    }
  }

  /// 刷新权限（强制重新加载）
  Future<void> _onRefreshPermissions(
    RefreshPermissions event,
    Emitter<PermissionState> emit,
  ) async {
    try {
      AppLogger.debug('🔐 [PermissionBloc] 强制刷新权限信息', tag: 'Permission');

      emit(const PermissionLoading());

      // 清除内存缓存，使用PermissionService的刷新方法
      _cachedPermissions = null;

      final permissions = await _permissionService.refreshPermissions();

      if (permissions != null) {
        _cachedPermissions = permissions;
        AppLogger.info(
            '🔐 [PermissionBloc] 权限刷新成功: ${permissions.permissionLevel.displayName}',
            tag: 'Permission');
        emit(PermissionLoaded(permissions));
      } else {
        AppLogger.warning('🔐 [PermissionBloc] 刷新后无法获取权限信息', tag: 'Permission');
        emit(const PermissionEmpty());
      }
    } catch (e, stackTrace) {
      AppLogger.error(
        '🔐 [PermissionBloc] 权限刷新失败',
        tag: 'Permission',
        error: e,
        stackTrace: stackTrace,
      );
      emit(PermissionError('权限刷新失败: ${e.toString()}'));
    }
  }

  /// 清除权限
  Future<void> _onClearPermissions(
    ClearPermissions event,
    Emitter<PermissionState> emit,
  ) async {
    AppLogger.debug('🔐 [PermissionBloc] 清除权限信息', tag: 'Permission');

    // 清除内存缓存
    _cachedPermissions = null;

    // 清除持久化缓存
    await _permissionService.clearPermissionCache();

    emit(const PermissionInitial());
  }

  /// 检查特定权限
  Future<void> _onCheckPermission(
    CheckPermission event,
    Emitter<PermissionState> emit,
  ) async {
    try {
      if (_cachedPermissions == null) {
        // 如果没有缓存权限，先加载
        add(const LoadPermissions());
        return;
      }

      final hasPermission = _cachedPermissions!.hasPermission(event.permission);
      AppLogger.debug(
          '🔐 [PermissionBloc] 权限检查 [${event.permission}]: $hasPermission',
          tag: 'Permission');

      // 保持当前状态，只是用于触发检查
      emit(PermissionLoaded(_cachedPermissions!));
    } catch (e) {
      AppLogger.error(
        '🔐 [PermissionBloc] 权限检查失败',
        tag: 'Permission',
        error: e,
      );
    }
  }

  /// 检查特定角色
  Future<void> _onCheckRole(
    CheckRole event,
    Emitter<PermissionState> emit,
  ) async {
    try {
      if (_cachedPermissions == null) {
        // 如果没有缓存权限，先加载
        add(const LoadPermissions());
        return;
      }

      final hasRole = _cachedPermissions!.hasRole(event.role);
      AppLogger.debug('🔐 [PermissionBloc] 角色检查 [${event.role}]: $hasRole',
          tag: 'Permission');

      // 保持当前状态，只是用于触发检查
      emit(PermissionLoaded(_cachedPermissions!));
    } catch (e) {
      AppLogger.error(
        '🔐 [PermissionBloc] 角色检查失败',
        tag: 'Permission',
        error: e,
      );
    }
  }

  /// 获取当前权限（同步方法）
  UserPermissions? get currentPermissions => _cachedPermissions;

  /// 检查权限（同步方法）
  bool hasPermission(String permission) {
    return _cachedPermissions?.hasPermission(permission) ?? false;
  }

  /// 检查角色（同步方法）
  bool hasRole(String role) {
    return _cachedPermissions?.hasRole(role) ?? false;
  }

  /// 检查是否为管理员
  bool get isAdmin => _cachedPermissions?.isAdmin ?? false;

  /// 检查是否为超级管理员
  bool get isSuperAdmin => _cachedPermissions?.isSuperAdmin ?? false;

  /// 检查是否为版主
  bool get isModerator => _cachedPermissions?.isModerator ?? false;

  /// 检查是否为工作人员
  bool get isStaff => _cachedPermissions?.isStaff ?? false;

  /// 获取权限级别
  PermissionLevel get permissionLevel =>
      _cachedPermissions?.permissionLevel ?? PermissionLevel.user;

  @override
  Future<void> close() {
    AppLogger.debug('🔐 [PermissionBloc] 权限状态管理器已关闭', tag: 'Permission');
    return super.close();
  }
}
