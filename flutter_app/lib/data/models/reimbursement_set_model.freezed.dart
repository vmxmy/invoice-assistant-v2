// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'reimbursement_set_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ReimbursementSetModel _$ReimbursementSetModelFromJson(
    Map<String, dynamic> json) {
  return _ReimbursementSetModel.fromJson(json);
}

/// @nodoc
mixin _$ReimbursementSetModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'user_id')
  String get userId => throw _privateConstructorUsedError;
  @JsonKey(name: 'set_name')
  String get setName => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  @JsonKey(name: 'submitted_at')
  DateTime? get submittedAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'reimbursed_at')
  DateTime? get reimbursedAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'total_amount')
  double get totalAmount => throw _privateConstructorUsedError;
  @JsonKey(name: 'invoice_count')
  int get invoiceCount => throw _privateConstructorUsedError;
  @JsonKey(name: 'approver_id')
  String? get approverId => throw _privateConstructorUsedError;
  @JsonKey(name: 'approval_notes')
  String? get approvalNotes => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime get updatedAt => throw _privateConstructorUsedError; // 扩展字段（来自视图查询）
  @JsonKey(name: 'user_email')
  String? get userEmail => throw _privateConstructorUsedError;
  @JsonKey(name: 'approver_email')
  String? get approverEmail => throw _privateConstructorUsedError;
  @JsonKey(name: 'earliest_invoice_date')
  DateTime? get earliestInvoiceDate => throw _privateConstructorUsedError;
  @JsonKey(name: 'latest_invoice_date')
  DateTime? get latestInvoiceDate => throw _privateConstructorUsedError;
  @JsonKey(name: 'region_count')
  int? get regionCount => throw _privateConstructorUsedError;
  @JsonKey(name: 'category_count')
  int? get categoryCount => throw _privateConstructorUsedError;

  /// Serializes this ReimbursementSetModel to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ReimbursementSetModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReimbursementSetModelCopyWith<ReimbursementSetModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReimbursementSetModelCopyWith<$Res> {
  factory $ReimbursementSetModelCopyWith(ReimbursementSetModel value,
          $Res Function(ReimbursementSetModel) then) =
      _$ReimbursementSetModelCopyWithImpl<$Res, ReimbursementSetModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'user_id') String userId,
      @JsonKey(name: 'set_name') String setName,
      String? description,
      String status,
      @JsonKey(name: 'submitted_at') DateTime? submittedAt,
      @JsonKey(name: 'reimbursed_at') DateTime? reimbursedAt,
      @JsonKey(name: 'total_amount') double totalAmount,
      @JsonKey(name: 'invoice_count') int invoiceCount,
      @JsonKey(name: 'approver_id') String? approverId,
      @JsonKey(name: 'approval_notes') String? approvalNotes,
      @JsonKey(name: 'created_at') DateTime createdAt,
      @JsonKey(name: 'updated_at') DateTime updatedAt,
      @JsonKey(name: 'user_email') String? userEmail,
      @JsonKey(name: 'approver_email') String? approverEmail,
      @JsonKey(name: 'earliest_invoice_date') DateTime? earliestInvoiceDate,
      @JsonKey(name: 'latest_invoice_date') DateTime? latestInvoiceDate,
      @JsonKey(name: 'region_count') int? regionCount,
      @JsonKey(name: 'category_count') int? categoryCount});
}

/// @nodoc
class _$ReimbursementSetModelCopyWithImpl<$Res,
        $Val extends ReimbursementSetModel>
    implements $ReimbursementSetModelCopyWith<$Res> {
  _$ReimbursementSetModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ReimbursementSetModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? setName = null,
    Object? description = freezed,
    Object? status = null,
    Object? submittedAt = freezed,
    Object? reimbursedAt = freezed,
    Object? totalAmount = null,
    Object? invoiceCount = null,
    Object? approverId = freezed,
    Object? approvalNotes = freezed,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? userEmail = freezed,
    Object? approverEmail = freezed,
    Object? earliestInvoiceDate = freezed,
    Object? latestInvoiceDate = freezed,
    Object? regionCount = freezed,
    Object? categoryCount = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      setName: null == setName
          ? _value.setName
          : setName // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      submittedAt: freezed == submittedAt
          ? _value.submittedAt
          : submittedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      reimbursedAt: freezed == reimbursedAt
          ? _value.reimbursedAt
          : reimbursedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      totalAmount: null == totalAmount
          ? _value.totalAmount
          : totalAmount // ignore: cast_nullable_to_non_nullable
              as double,
      invoiceCount: null == invoiceCount
          ? _value.invoiceCount
          : invoiceCount // ignore: cast_nullable_to_non_nullable
              as int,
      approverId: freezed == approverId
          ? _value.approverId
          : approverId // ignore: cast_nullable_to_non_nullable
              as String?,
      approvalNotes: freezed == approvalNotes
          ? _value.approvalNotes
          : approvalNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      userEmail: freezed == userEmail
          ? _value.userEmail
          : userEmail // ignore: cast_nullable_to_non_nullable
              as String?,
      approverEmail: freezed == approverEmail
          ? _value.approverEmail
          : approverEmail // ignore: cast_nullable_to_non_nullable
              as String?,
      earliestInvoiceDate: freezed == earliestInvoiceDate
          ? _value.earliestInvoiceDate
          : earliestInvoiceDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      latestInvoiceDate: freezed == latestInvoiceDate
          ? _value.latestInvoiceDate
          : latestInvoiceDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      regionCount: freezed == regionCount
          ? _value.regionCount
          : regionCount // ignore: cast_nullable_to_non_nullable
              as int?,
      categoryCount: freezed == categoryCount
          ? _value.categoryCount
          : categoryCount // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ReimbursementSetModelImplCopyWith<$Res>
    implements $ReimbursementSetModelCopyWith<$Res> {
  factory _$$ReimbursementSetModelImplCopyWith(
          _$ReimbursementSetModelImpl value,
          $Res Function(_$ReimbursementSetModelImpl) then) =
      __$$ReimbursementSetModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'user_id') String userId,
      @JsonKey(name: 'set_name') String setName,
      String? description,
      String status,
      @JsonKey(name: 'submitted_at') DateTime? submittedAt,
      @JsonKey(name: 'reimbursed_at') DateTime? reimbursedAt,
      @JsonKey(name: 'total_amount') double totalAmount,
      @JsonKey(name: 'invoice_count') int invoiceCount,
      @JsonKey(name: 'approver_id') String? approverId,
      @JsonKey(name: 'approval_notes') String? approvalNotes,
      @JsonKey(name: 'created_at') DateTime createdAt,
      @JsonKey(name: 'updated_at') DateTime updatedAt,
      @JsonKey(name: 'user_email') String? userEmail,
      @JsonKey(name: 'approver_email') String? approverEmail,
      @JsonKey(name: 'earliest_invoice_date') DateTime? earliestInvoiceDate,
      @JsonKey(name: 'latest_invoice_date') DateTime? latestInvoiceDate,
      @JsonKey(name: 'region_count') int? regionCount,
      @JsonKey(name: 'category_count') int? categoryCount});
}

/// @nodoc
class __$$ReimbursementSetModelImplCopyWithImpl<$Res>
    extends _$ReimbursementSetModelCopyWithImpl<$Res,
        _$ReimbursementSetModelImpl>
    implements _$$ReimbursementSetModelImplCopyWith<$Res> {
  __$$ReimbursementSetModelImplCopyWithImpl(_$ReimbursementSetModelImpl _value,
      $Res Function(_$ReimbursementSetModelImpl) _then)
      : super(_value, _then);

  /// Create a copy of ReimbursementSetModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? setName = null,
    Object? description = freezed,
    Object? status = null,
    Object? submittedAt = freezed,
    Object? reimbursedAt = freezed,
    Object? totalAmount = null,
    Object? invoiceCount = null,
    Object? approverId = freezed,
    Object? approvalNotes = freezed,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? userEmail = freezed,
    Object? approverEmail = freezed,
    Object? earliestInvoiceDate = freezed,
    Object? latestInvoiceDate = freezed,
    Object? regionCount = freezed,
    Object? categoryCount = freezed,
  }) {
    return _then(_$ReimbursementSetModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      setName: null == setName
          ? _value.setName
          : setName // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      submittedAt: freezed == submittedAt
          ? _value.submittedAt
          : submittedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      reimbursedAt: freezed == reimbursedAt
          ? _value.reimbursedAt
          : reimbursedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      totalAmount: null == totalAmount
          ? _value.totalAmount
          : totalAmount // ignore: cast_nullable_to_non_nullable
              as double,
      invoiceCount: null == invoiceCount
          ? _value.invoiceCount
          : invoiceCount // ignore: cast_nullable_to_non_nullable
              as int,
      approverId: freezed == approverId
          ? _value.approverId
          : approverId // ignore: cast_nullable_to_non_nullable
              as String?,
      approvalNotes: freezed == approvalNotes
          ? _value.approvalNotes
          : approvalNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      userEmail: freezed == userEmail
          ? _value.userEmail
          : userEmail // ignore: cast_nullable_to_non_nullable
              as String?,
      approverEmail: freezed == approverEmail
          ? _value.approverEmail
          : approverEmail // ignore: cast_nullable_to_non_nullable
              as String?,
      earliestInvoiceDate: freezed == earliestInvoiceDate
          ? _value.earliestInvoiceDate
          : earliestInvoiceDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      latestInvoiceDate: freezed == latestInvoiceDate
          ? _value.latestInvoiceDate
          : latestInvoiceDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      regionCount: freezed == regionCount
          ? _value.regionCount
          : regionCount // ignore: cast_nullable_to_non_nullable
              as int?,
      categoryCount: freezed == categoryCount
          ? _value.categoryCount
          : categoryCount // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ReimbursementSetModelImpl extends _ReimbursementSetModel {
  const _$ReimbursementSetModelImpl(
      {required this.id,
      @JsonKey(name: 'user_id') required this.userId,
      @JsonKey(name: 'set_name') required this.setName,
      this.description,
      required this.status,
      @JsonKey(name: 'submitted_at') this.submittedAt,
      @JsonKey(name: 'reimbursed_at') this.reimbursedAt,
      @JsonKey(name: 'total_amount') this.totalAmount = 0.0,
      @JsonKey(name: 'invoice_count') this.invoiceCount = 0,
      @JsonKey(name: 'approver_id') this.approverId,
      @JsonKey(name: 'approval_notes') this.approvalNotes,
      @JsonKey(name: 'created_at') required this.createdAt,
      @JsonKey(name: 'updated_at') required this.updatedAt,
      @JsonKey(name: 'user_email') this.userEmail,
      @JsonKey(name: 'approver_email') this.approverEmail,
      @JsonKey(name: 'earliest_invoice_date') this.earliestInvoiceDate,
      @JsonKey(name: 'latest_invoice_date') this.latestInvoiceDate,
      @JsonKey(name: 'region_count') this.regionCount,
      @JsonKey(name: 'category_count') this.categoryCount})
      : super._();

  factory _$ReimbursementSetModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReimbursementSetModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'user_id')
  final String userId;
  @override
  @JsonKey(name: 'set_name')
  final String setName;
  @override
  final String? description;
  @override
  final String status;
  @override
  @JsonKey(name: 'submitted_at')
  final DateTime? submittedAt;
  @override
  @JsonKey(name: 'reimbursed_at')
  final DateTime? reimbursedAt;
  @override
  @JsonKey(name: 'total_amount')
  final double totalAmount;
  @override
  @JsonKey(name: 'invoice_count')
  final int invoiceCount;
  @override
  @JsonKey(name: 'approver_id')
  final String? approverId;
  @override
  @JsonKey(name: 'approval_notes')
  final String? approvalNotes;
  @override
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;
// 扩展字段（来自视图查询）
  @override
  @JsonKey(name: 'user_email')
  final String? userEmail;
  @override
  @JsonKey(name: 'approver_email')
  final String? approverEmail;
  @override
  @JsonKey(name: 'earliest_invoice_date')
  final DateTime? earliestInvoiceDate;
  @override
  @JsonKey(name: 'latest_invoice_date')
  final DateTime? latestInvoiceDate;
  @override
  @JsonKey(name: 'region_count')
  final int? regionCount;
  @override
  @JsonKey(name: 'category_count')
  final int? categoryCount;

  @override
  String toString() {
    return 'ReimbursementSetModel(id: $id, userId: $userId, setName: $setName, description: $description, status: $status, submittedAt: $submittedAt, reimbursedAt: $reimbursedAt, totalAmount: $totalAmount, invoiceCount: $invoiceCount, approverId: $approverId, approvalNotes: $approvalNotes, createdAt: $createdAt, updatedAt: $updatedAt, userEmail: $userEmail, approverEmail: $approverEmail, earliestInvoiceDate: $earliestInvoiceDate, latestInvoiceDate: $latestInvoiceDate, regionCount: $regionCount, categoryCount: $categoryCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReimbursementSetModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.setName, setName) || other.setName == setName) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.submittedAt, submittedAt) ||
                other.submittedAt == submittedAt) &&
            (identical(other.reimbursedAt, reimbursedAt) ||
                other.reimbursedAt == reimbursedAt) &&
            (identical(other.totalAmount, totalAmount) ||
                other.totalAmount == totalAmount) &&
            (identical(other.invoiceCount, invoiceCount) ||
                other.invoiceCount == invoiceCount) &&
            (identical(other.approverId, approverId) ||
                other.approverId == approverId) &&
            (identical(other.approvalNotes, approvalNotes) ||
                other.approvalNotes == approvalNotes) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.userEmail, userEmail) ||
                other.userEmail == userEmail) &&
            (identical(other.approverEmail, approverEmail) ||
                other.approverEmail == approverEmail) &&
            (identical(other.earliestInvoiceDate, earliestInvoiceDate) ||
                other.earliestInvoiceDate == earliestInvoiceDate) &&
            (identical(other.latestInvoiceDate, latestInvoiceDate) ||
                other.latestInvoiceDate == latestInvoiceDate) &&
            (identical(other.regionCount, regionCount) ||
                other.regionCount == regionCount) &&
            (identical(other.categoryCount, categoryCount) ||
                other.categoryCount == categoryCount));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
        runtimeType,
        id,
        userId,
        setName,
        description,
        status,
        submittedAt,
        reimbursedAt,
        totalAmount,
        invoiceCount,
        approverId,
        approvalNotes,
        createdAt,
        updatedAt,
        userEmail,
        approverEmail,
        earliestInvoiceDate,
        latestInvoiceDate,
        regionCount,
        categoryCount
      ]);

  /// Create a copy of ReimbursementSetModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReimbursementSetModelImplCopyWith<_$ReimbursementSetModelImpl>
      get copyWith => __$$ReimbursementSetModelImplCopyWithImpl<
          _$ReimbursementSetModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ReimbursementSetModelImplToJson(
      this,
    );
  }
}

abstract class _ReimbursementSetModel extends ReimbursementSetModel {
  const factory _ReimbursementSetModel(
      {required final String id,
      @JsonKey(name: 'user_id') required final String userId,
      @JsonKey(name: 'set_name') required final String setName,
      final String? description,
      required final String status,
      @JsonKey(name: 'submitted_at') final DateTime? submittedAt,
      @JsonKey(name: 'reimbursed_at') final DateTime? reimbursedAt,
      @JsonKey(name: 'total_amount') final double totalAmount,
      @JsonKey(name: 'invoice_count') final int invoiceCount,
      @JsonKey(name: 'approver_id') final String? approverId,
      @JsonKey(name: 'approval_notes') final String? approvalNotes,
      @JsonKey(name: 'created_at') required final DateTime createdAt,
      @JsonKey(name: 'updated_at') required final DateTime updatedAt,
      @JsonKey(name: 'user_email') final String? userEmail,
      @JsonKey(name: 'approver_email') final String? approverEmail,
      @JsonKey(name: 'earliest_invoice_date')
      final DateTime? earliestInvoiceDate,
      @JsonKey(name: 'latest_invoice_date') final DateTime? latestInvoiceDate,
      @JsonKey(name: 'region_count') final int? regionCount,
      @JsonKey(name: 'category_count')
      final int? categoryCount}) = _$ReimbursementSetModelImpl;
  const _ReimbursementSetModel._() : super._();

  factory _ReimbursementSetModel.fromJson(Map<String, dynamic> json) =
      _$ReimbursementSetModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'user_id')
  String get userId;
  @override
  @JsonKey(name: 'set_name')
  String get setName;
  @override
  String? get description;
  @override
  String get status;
  @override
  @JsonKey(name: 'submitted_at')
  DateTime? get submittedAt;
  @override
  @JsonKey(name: 'reimbursed_at')
  DateTime? get reimbursedAt;
  @override
  @JsonKey(name: 'total_amount')
  double get totalAmount;
  @override
  @JsonKey(name: 'invoice_count')
  int get invoiceCount;
  @override
  @JsonKey(name: 'approver_id')
  String? get approverId;
  @override
  @JsonKey(name: 'approval_notes')
  String? get approvalNotes;
  @override
  @JsonKey(name: 'created_at')
  DateTime get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime get updatedAt; // 扩展字段（来自视图查询）
  @override
  @JsonKey(name: 'user_email')
  String? get userEmail;
  @override
  @JsonKey(name: 'approver_email')
  String? get approverEmail;
  @override
  @JsonKey(name: 'earliest_invoice_date')
  DateTime? get earliestInvoiceDate;
  @override
  @JsonKey(name: 'latest_invoice_date')
  DateTime? get latestInvoiceDate;
  @override
  @JsonKey(name: 'region_count')
  int? get regionCount;
  @override
  @JsonKey(name: 'category_count')
  int? get categoryCount;

  /// Create a copy of ReimbursementSetModel
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReimbursementSetModelImplCopyWith<_$ReimbursementSetModelImpl>
      get copyWith => throw _privateConstructorUsedError;
}

CreateReimbursementSetRequest _$CreateReimbursementSetRequestFromJson(
    Map<String, dynamic> json) {
  return _CreateReimbursementSetRequest.fromJson(json);
}

/// @nodoc
mixin _$CreateReimbursementSetRequest {
  @JsonKey(name: 'set_name')
  String get setName => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  @JsonKey(name: 'invoice_ids')
  List<String> get invoiceIds => throw _privateConstructorUsedError;

  /// Serializes this CreateReimbursementSetRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CreateReimbursementSetRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CreateReimbursementSetRequestCopyWith<CreateReimbursementSetRequest>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CreateReimbursementSetRequestCopyWith<$Res> {
  factory $CreateReimbursementSetRequestCopyWith(
          CreateReimbursementSetRequest value,
          $Res Function(CreateReimbursementSetRequest) then) =
      _$CreateReimbursementSetRequestCopyWithImpl<$Res,
          CreateReimbursementSetRequest>;
  @useResult
  $Res call(
      {@JsonKey(name: 'set_name') String setName,
      String? description,
      @JsonKey(name: 'invoice_ids') List<String> invoiceIds});
}

/// @nodoc
class _$CreateReimbursementSetRequestCopyWithImpl<$Res,
        $Val extends CreateReimbursementSetRequest>
    implements $CreateReimbursementSetRequestCopyWith<$Res> {
  _$CreateReimbursementSetRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CreateReimbursementSetRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? setName = null,
    Object? description = freezed,
    Object? invoiceIds = null,
  }) {
    return _then(_value.copyWith(
      setName: null == setName
          ? _value.setName
          : setName // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      invoiceIds: null == invoiceIds
          ? _value.invoiceIds
          : invoiceIds // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CreateReimbursementSetRequestImplCopyWith<$Res>
    implements $CreateReimbursementSetRequestCopyWith<$Res> {
  factory _$$CreateReimbursementSetRequestImplCopyWith(
          _$CreateReimbursementSetRequestImpl value,
          $Res Function(_$CreateReimbursementSetRequestImpl) then) =
      __$$CreateReimbursementSetRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'set_name') String setName,
      String? description,
      @JsonKey(name: 'invoice_ids') List<String> invoiceIds});
}

/// @nodoc
class __$$CreateReimbursementSetRequestImplCopyWithImpl<$Res>
    extends _$CreateReimbursementSetRequestCopyWithImpl<$Res,
        _$CreateReimbursementSetRequestImpl>
    implements _$$CreateReimbursementSetRequestImplCopyWith<$Res> {
  __$$CreateReimbursementSetRequestImplCopyWithImpl(
      _$CreateReimbursementSetRequestImpl _value,
      $Res Function(_$CreateReimbursementSetRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of CreateReimbursementSetRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? setName = null,
    Object? description = freezed,
    Object? invoiceIds = null,
  }) {
    return _then(_$CreateReimbursementSetRequestImpl(
      setName: null == setName
          ? _value.setName
          : setName // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      invoiceIds: null == invoiceIds
          ? _value._invoiceIds
          : invoiceIds // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CreateReimbursementSetRequestImpl
    implements _CreateReimbursementSetRequest {
  const _$CreateReimbursementSetRequestImpl(
      {@JsonKey(name: 'set_name') required this.setName,
      this.description,
      @JsonKey(name: 'invoice_ids') required final List<String> invoiceIds})
      : _invoiceIds = invoiceIds;

  factory _$CreateReimbursementSetRequestImpl.fromJson(
          Map<String, dynamic> json) =>
      _$$CreateReimbursementSetRequestImplFromJson(json);

  @override
  @JsonKey(name: 'set_name')
  final String setName;
  @override
  final String? description;
  final List<String> _invoiceIds;
  @override
  @JsonKey(name: 'invoice_ids')
  List<String> get invoiceIds {
    if (_invoiceIds is EqualUnmodifiableListView) return _invoiceIds;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_invoiceIds);
  }

  @override
  String toString() {
    return 'CreateReimbursementSetRequest(setName: $setName, description: $description, invoiceIds: $invoiceIds)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CreateReimbursementSetRequestImpl &&
            (identical(other.setName, setName) || other.setName == setName) &&
            (identical(other.description, description) ||
                other.description == description) &&
            const DeepCollectionEquality()
                .equals(other._invoiceIds, _invoiceIds));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, setName, description,
      const DeepCollectionEquality().hash(_invoiceIds));

  /// Create a copy of CreateReimbursementSetRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CreateReimbursementSetRequestImplCopyWith<
          _$CreateReimbursementSetRequestImpl>
      get copyWith => __$$CreateReimbursementSetRequestImplCopyWithImpl<
          _$CreateReimbursementSetRequestImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CreateReimbursementSetRequestImplToJson(
      this,
    );
  }
}

abstract class _CreateReimbursementSetRequest
    implements CreateReimbursementSetRequest {
  const factory _CreateReimbursementSetRequest(
          {@JsonKey(name: 'set_name') required final String setName,
          final String? description,
          @JsonKey(name: 'invoice_ids')
          required final List<String> invoiceIds}) =
      _$CreateReimbursementSetRequestImpl;

  factory _CreateReimbursementSetRequest.fromJson(Map<String, dynamic> json) =
      _$CreateReimbursementSetRequestImpl.fromJson;

  @override
  @JsonKey(name: 'set_name')
  String get setName;
  @override
  String? get description;
  @override
  @JsonKey(name: 'invoice_ids')
  List<String> get invoiceIds;

  /// Create a copy of CreateReimbursementSetRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CreateReimbursementSetRequestImplCopyWith<
          _$CreateReimbursementSetRequestImpl>
      get copyWith => throw _privateConstructorUsedError;
}

UpdateReimbursementSetStatusRequest
    _$UpdateReimbursementSetStatusRequestFromJson(Map<String, dynamic> json) {
  return _UpdateReimbursementSetStatusRequest.fromJson(json);
}

/// @nodoc
mixin _$UpdateReimbursementSetStatusRequest {
  String get status => throw _privateConstructorUsedError;
  @JsonKey(name: 'approval_notes')
  String? get approvalNotes => throw _privateConstructorUsedError;

  /// Serializes this UpdateReimbursementSetStatusRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of UpdateReimbursementSetStatusRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $UpdateReimbursementSetStatusRequestCopyWith<
          UpdateReimbursementSetStatusRequest>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $UpdateReimbursementSetStatusRequestCopyWith<$Res> {
  factory $UpdateReimbursementSetStatusRequestCopyWith(
          UpdateReimbursementSetStatusRequest value,
          $Res Function(UpdateReimbursementSetStatusRequest) then) =
      _$UpdateReimbursementSetStatusRequestCopyWithImpl<$Res,
          UpdateReimbursementSetStatusRequest>;
  @useResult
  $Res call(
      {String status, @JsonKey(name: 'approval_notes') String? approvalNotes});
}

/// @nodoc
class _$UpdateReimbursementSetStatusRequestCopyWithImpl<$Res,
        $Val extends UpdateReimbursementSetStatusRequest>
    implements $UpdateReimbursementSetStatusRequestCopyWith<$Res> {
  _$UpdateReimbursementSetStatusRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of UpdateReimbursementSetStatusRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? approvalNotes = freezed,
  }) {
    return _then(_value.copyWith(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      approvalNotes: freezed == approvalNotes
          ? _value.approvalNotes
          : approvalNotes // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$UpdateReimbursementSetStatusRequestImplCopyWith<$Res>
    implements $UpdateReimbursementSetStatusRequestCopyWith<$Res> {
  factory _$$UpdateReimbursementSetStatusRequestImplCopyWith(
          _$UpdateReimbursementSetStatusRequestImpl value,
          $Res Function(_$UpdateReimbursementSetStatusRequestImpl) then) =
      __$$UpdateReimbursementSetStatusRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String status, @JsonKey(name: 'approval_notes') String? approvalNotes});
}

/// @nodoc
class __$$UpdateReimbursementSetStatusRequestImplCopyWithImpl<$Res>
    extends _$UpdateReimbursementSetStatusRequestCopyWithImpl<$Res,
        _$UpdateReimbursementSetStatusRequestImpl>
    implements _$$UpdateReimbursementSetStatusRequestImplCopyWith<$Res> {
  __$$UpdateReimbursementSetStatusRequestImplCopyWithImpl(
      _$UpdateReimbursementSetStatusRequestImpl _value,
      $Res Function(_$UpdateReimbursementSetStatusRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of UpdateReimbursementSetStatusRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? approvalNotes = freezed,
  }) {
    return _then(_$UpdateReimbursementSetStatusRequestImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      approvalNotes: freezed == approvalNotes
          ? _value.approvalNotes
          : approvalNotes // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$UpdateReimbursementSetStatusRequestImpl
    implements _UpdateReimbursementSetStatusRequest {
  const _$UpdateReimbursementSetStatusRequestImpl(
      {required this.status,
      @JsonKey(name: 'approval_notes') this.approvalNotes});

  factory _$UpdateReimbursementSetStatusRequestImpl.fromJson(
          Map<String, dynamic> json) =>
      _$$UpdateReimbursementSetStatusRequestImplFromJson(json);

  @override
  final String status;
  @override
  @JsonKey(name: 'approval_notes')
  final String? approvalNotes;

  @override
  String toString() {
    return 'UpdateReimbursementSetStatusRequest(status: $status, approvalNotes: $approvalNotes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$UpdateReimbursementSetStatusRequestImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.approvalNotes, approvalNotes) ||
                other.approvalNotes == approvalNotes));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, status, approvalNotes);

  /// Create a copy of UpdateReimbursementSetStatusRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$UpdateReimbursementSetStatusRequestImplCopyWith<
          _$UpdateReimbursementSetStatusRequestImpl>
      get copyWith => __$$UpdateReimbursementSetStatusRequestImplCopyWithImpl<
          _$UpdateReimbursementSetStatusRequestImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$UpdateReimbursementSetStatusRequestImplToJson(
      this,
    );
  }
}

abstract class _UpdateReimbursementSetStatusRequest
    implements UpdateReimbursementSetStatusRequest {
  const factory _UpdateReimbursementSetStatusRequest(
          {required final String status,
          @JsonKey(name: 'approval_notes') final String? approvalNotes}) =
      _$UpdateReimbursementSetStatusRequestImpl;

  factory _UpdateReimbursementSetStatusRequest.fromJson(
          Map<String, dynamic> json) =
      _$UpdateReimbursementSetStatusRequestImpl.fromJson;

  @override
  String get status;
  @override
  @JsonKey(name: 'approval_notes')
  String? get approvalNotes;

  /// Create a copy of UpdateReimbursementSetStatusRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$UpdateReimbursementSetStatusRequestImplCopyWith<
          _$UpdateReimbursementSetStatusRequestImpl>
      get copyWith => throw _privateConstructorUsedError;
}
