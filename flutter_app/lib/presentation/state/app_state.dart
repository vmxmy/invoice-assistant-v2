import 'package:equatable/equatable.dart';

/// 应用程序状态基类
abstract class AppState extends Equatable {
  const AppState();
}

/// 初始状态
class AppInitial extends AppState {
  const AppInitial();
  
  @override
  List<Object?> get props => [];
}

/// 加载状态
class AppLoading extends AppState {
  final String? message;
  
  const AppLoading({this.message});
  
  @override
  List<Object?> get props => [message];
}

/// 成功状态
class AppSuccess<T> extends AppState {
  final T data;
  final String? message;
  
  const AppSuccess(this.data, {this.message});
  
  @override
  List<Object?> get props => [data, message];
}

/// 错误状态
class AppError extends AppState {
  final String message;
  final String? code;
  final dynamic error;
  
  const AppError(this.message, {this.code, this.error});
  
  @override
  List<Object?> get props => [message, code, error];
}

/// 空状态
class AppEmpty extends AppState {
  final String? message;
  
  const AppEmpty({this.message});
  
  @override
  List<Object?> get props => [message];
}