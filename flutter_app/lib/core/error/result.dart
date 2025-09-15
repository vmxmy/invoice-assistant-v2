/// Result 类型用于处理操作结果
/// 提供类型安全的成功/失败状态处理
library;

abstract class Result<T> {
  const Result();

  /// 创建成功结果
  factory Result.success(T data) = Success<T>;

  /// 创建失败结果
  factory Result.failure(String error) = Failure<T>;

  /// 是否为成功状态
  bool get isSuccess => this is Success<T>;

  /// 是否为失败状态
  bool get isFailure => this is Failure<T>;

  /// 获取成功数据，失败时抛出异常
  T get data {
    if (this is Success<T>) {
      return (this as Success<T>).data;
    }
    throw Exception('Tried to get data from a failure result');
  }

  /// 获取错误信息，成功时抛出异常
  String get error {
    if (this is Failure<T>) {
      return (this as Failure<T>).error;
    }
    throw Exception('Tried to get error from a success result');
  }

  /// 安全获取数据，失败时返回null
  T? get dataOrNull {
    if (this is Success<T>) {
      return (this as Success<T>).data;
    }
    return null;
  }

  /// 安全获取错误信息，成功时返回null
  String? get errorOrNull {
    if (this is Failure<T>) {
      return (this as Failure<T>).error;
    }
    return null;
  }

  /// 映射成功数据
  Result<R> map<R>(R Function(T data) mapper) {
    if (this is Success<T>) {
      try {
        return Result.success(mapper((this as Success<T>).data));
      } catch (e) {
        return Result.failure(e.toString());
      }
    }
    return Result.failure((this as Failure<T>).error);
  }

  /// 处理结果
  R when<R>({
    required R Function(T data) success,
    required R Function(String error) failure,
  }) {
    if (this is Success<T>) {
      return success((this as Success<T>).data);
    }
    return failure((this as Failure<T>).error);
  }
}

/// 成功结果
class Success<T> extends Result<T> {
  @override
  final T data;

  const Success(this.data);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Success<T> && other.data == data;
  }

  @override
  int get hashCode => data.hashCode;

  @override
  String toString() => 'Success(data: $data)';
}

/// 失败结果
class Failure<T> extends Result<T> {
  @override
  final String error;

  const Failure(this.error);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Failure<T> && other.error == error;
  }

  @override
  int get hashCode => error.hashCode;

  @override
  String toString() => 'Failure(error: $error)';
}
