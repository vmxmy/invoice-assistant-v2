// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'invoice_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

InvoiceModel _$InvoiceModelFromJson(Map<String, dynamic> json) {
  return _InvoiceModel.fromJson(json);
}

/// @nodoc
mixin _$InvoiceModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'invoice_number')
  String get invoiceNumber => throw _privateConstructorUsedError;
  @JsonKey(name: 'invoice_date')
  DateTime get invoiceDate => throw _privateConstructorUsedError;
  @JsonKey(name: 'consumption_date')
  DateTime? get consumptionDate => throw _privateConstructorUsedError;
  @JsonKey(name: 'user_id')
  String get userId => throw _privateConstructorUsedError; // 基本信息
  @JsonKey(name: 'seller_name')
  String? get sellerName => throw _privateConstructorUsedError;
  @JsonKey(name: 'buyer_name')
  String? get buyerName => throw _privateConstructorUsedError;
  @JsonKey(name: 'seller_tax_number')
  String? get sellerTaxId => throw _privateConstructorUsedError;
  @JsonKey(name: 'buyer_tax_number')
  String? get buyerTaxId => throw _privateConstructorUsedError; // 金额信息
  @JsonKey(name: 'amount_without_tax')
  double get amount => throw _privateConstructorUsedError;
  @JsonKey(name: 'total_amount')
  double? get totalAmount => throw _privateConstructorUsedError;
  @JsonKey(name: 'tax_amount')
  double? get taxAmount => throw _privateConstructorUsedError;
  String get currency => throw _privateConstructorUsedError; // 分类和状态
  String? get category => throw _privateConstructorUsedError;
  InvoiceStatus get status => throw _privateConstructorUsedError;
  @JsonKey(name: 'invoice_type')
  String? get invoiceType => throw _privateConstructorUsedError;
  @JsonKey(name: 'invoice_code')
  String? get invoiceCode => throw _privateConstructorUsedError; // 文件信息
  @JsonKey(name: 'file_url')
  String? get fileUrl => throw _privateConstructorUsedError;
  @JsonKey(name: 'file_path')
  String? get filePath => throw _privateConstructorUsedError;
  @JsonKey(name: 'file_hash')
  String? get fileHash => throw _privateConstructorUsedError;
  @JsonKey(name: 'file_size')
  int? get fileSize => throw _privateConstructorUsedError; // 处理状态
  @JsonKey(name: 'processing_status')
  String? get processingStatus => throw _privateConstructorUsedError;
  @JsonKey(name: 'is_verified')
  bool get isVerified => throw _privateConstructorUsedError;
  @JsonKey(name: 'verification_notes')
  String? get verificationNotes => throw _privateConstructorUsedError;
  @JsonKey(name: 'verified_at')
  DateTime? get verifiedAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'verified_by')
  String? get verifiedBy => throw _privateConstructorUsedError; // 数据来源
  InvoiceSource get source => throw _privateConstructorUsedError;
  @JsonKey(name: 'source_metadata')
  Map<String, dynamic>? get sourceMetadata =>
      throw _privateConstructorUsedError;
  @JsonKey(name: 'email_task_id')
  String? get emailTaskId => throw _privateConstructorUsedError; // 标签和元数据
  List<String> get tags => throw _privateConstructorUsedError;
  @JsonKey(name: 'extracted_data')
  Map<String, dynamic>? get extractedData => throw _privateConstructorUsedError;
  Map<String, dynamic>? get metadata =>
      throw _privateConstructorUsedError; // 时间戳
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'deleted_at')
  DateTime? get deletedAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'completed_at')
  DateTime? get completedAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'started_at')
  DateTime? get startedAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'last_activity_at')
  DateTime? get lastActivityAt => throw _privateConstructorUsedError; // 版本控制
  int get version => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_by')
  String? get createdBy => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_by')
  String? get updatedBy => throw _privateConstructorUsedError;

  /// Serializes this InvoiceModel to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of InvoiceModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $InvoiceModelCopyWith<InvoiceModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InvoiceModelCopyWith<$Res> {
  factory $InvoiceModelCopyWith(
          InvoiceModel value, $Res Function(InvoiceModel) then) =
      _$InvoiceModelCopyWithImpl<$Res, InvoiceModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'invoice_number') String invoiceNumber,
      @JsonKey(name: 'invoice_date') DateTime invoiceDate,
      @JsonKey(name: 'consumption_date') DateTime? consumptionDate,
      @JsonKey(name: 'user_id') String userId,
      @JsonKey(name: 'seller_name') String? sellerName,
      @JsonKey(name: 'buyer_name') String? buyerName,
      @JsonKey(name: 'seller_tax_number') String? sellerTaxId,
      @JsonKey(name: 'buyer_tax_number') String? buyerTaxId,
      @JsonKey(name: 'amount_without_tax') double amount,
      @JsonKey(name: 'total_amount') double? totalAmount,
      @JsonKey(name: 'tax_amount') double? taxAmount,
      String currency,
      String? category,
      InvoiceStatus status,
      @JsonKey(name: 'invoice_type') String? invoiceType,
      @JsonKey(name: 'invoice_code') String? invoiceCode,
      @JsonKey(name: 'file_url') String? fileUrl,
      @JsonKey(name: 'file_path') String? filePath,
      @JsonKey(name: 'file_hash') String? fileHash,
      @JsonKey(name: 'file_size') int? fileSize,
      @JsonKey(name: 'processing_status') String? processingStatus,
      @JsonKey(name: 'is_verified') bool isVerified,
      @JsonKey(name: 'verification_notes') String? verificationNotes,
      @JsonKey(name: 'verified_at') DateTime? verifiedAt,
      @JsonKey(name: 'verified_by') String? verifiedBy,
      InvoiceSource source,
      @JsonKey(name: 'source_metadata') Map<String, dynamic>? sourceMetadata,
      @JsonKey(name: 'email_task_id') String? emailTaskId,
      List<String> tags,
      @JsonKey(name: 'extracted_data') Map<String, dynamic>? extractedData,
      Map<String, dynamic>? metadata,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt,
      @JsonKey(name: 'deleted_at') DateTime? deletedAt,
      @JsonKey(name: 'completed_at') DateTime? completedAt,
      @JsonKey(name: 'started_at') DateTime? startedAt,
      @JsonKey(name: 'last_activity_at') DateTime? lastActivityAt,
      int version,
      @JsonKey(name: 'created_by') String? createdBy,
      @JsonKey(name: 'updated_by') String? updatedBy});
}

/// @nodoc
class _$InvoiceModelCopyWithImpl<$Res, $Val extends InvoiceModel>
    implements $InvoiceModelCopyWith<$Res> {
  _$InvoiceModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of InvoiceModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? invoiceNumber = null,
    Object? invoiceDate = null,
    Object? consumptionDate = freezed,
    Object? userId = null,
    Object? sellerName = freezed,
    Object? buyerName = freezed,
    Object? sellerTaxId = freezed,
    Object? buyerTaxId = freezed,
    Object? amount = null,
    Object? totalAmount = freezed,
    Object? taxAmount = freezed,
    Object? currency = null,
    Object? category = freezed,
    Object? status = null,
    Object? invoiceType = freezed,
    Object? invoiceCode = freezed,
    Object? fileUrl = freezed,
    Object? filePath = freezed,
    Object? fileHash = freezed,
    Object? fileSize = freezed,
    Object? processingStatus = freezed,
    Object? isVerified = null,
    Object? verificationNotes = freezed,
    Object? verifiedAt = freezed,
    Object? verifiedBy = freezed,
    Object? source = null,
    Object? sourceMetadata = freezed,
    Object? emailTaskId = freezed,
    Object? tags = null,
    Object? extractedData = freezed,
    Object? metadata = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? deletedAt = freezed,
    Object? completedAt = freezed,
    Object? startedAt = freezed,
    Object? lastActivityAt = freezed,
    Object? version = null,
    Object? createdBy = freezed,
    Object? updatedBy = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      invoiceNumber: null == invoiceNumber
          ? _value.invoiceNumber
          : invoiceNumber // ignore: cast_nullable_to_non_nullable
              as String,
      invoiceDate: null == invoiceDate
          ? _value.invoiceDate
          : invoiceDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      consumptionDate: freezed == consumptionDate
          ? _value.consumptionDate
          : consumptionDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      sellerName: freezed == sellerName
          ? _value.sellerName
          : sellerName // ignore: cast_nullable_to_non_nullable
              as String?,
      buyerName: freezed == buyerName
          ? _value.buyerName
          : buyerName // ignore: cast_nullable_to_non_nullable
              as String?,
      sellerTaxId: freezed == sellerTaxId
          ? _value.sellerTaxId
          : sellerTaxId // ignore: cast_nullable_to_non_nullable
              as String?,
      buyerTaxId: freezed == buyerTaxId
          ? _value.buyerTaxId
          : buyerTaxId // ignore: cast_nullable_to_non_nullable
              as String?,
      amount: null == amount
          ? _value.amount
          : amount // ignore: cast_nullable_to_non_nullable
              as double,
      totalAmount: freezed == totalAmount
          ? _value.totalAmount
          : totalAmount // ignore: cast_nullable_to_non_nullable
              as double?,
      taxAmount: freezed == taxAmount
          ? _value.taxAmount
          : taxAmount // ignore: cast_nullable_to_non_nullable
              as double?,
      currency: null == currency
          ? _value.currency
          : currency // ignore: cast_nullable_to_non_nullable
              as String,
      category: freezed == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as InvoiceStatus,
      invoiceType: freezed == invoiceType
          ? _value.invoiceType
          : invoiceType // ignore: cast_nullable_to_non_nullable
              as String?,
      invoiceCode: freezed == invoiceCode
          ? _value.invoiceCode
          : invoiceCode // ignore: cast_nullable_to_non_nullable
              as String?,
      fileUrl: freezed == fileUrl
          ? _value.fileUrl
          : fileUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      filePath: freezed == filePath
          ? _value.filePath
          : filePath // ignore: cast_nullable_to_non_nullable
              as String?,
      fileHash: freezed == fileHash
          ? _value.fileHash
          : fileHash // ignore: cast_nullable_to_non_nullable
              as String?,
      fileSize: freezed == fileSize
          ? _value.fileSize
          : fileSize // ignore: cast_nullable_to_non_nullable
              as int?,
      processingStatus: freezed == processingStatus
          ? _value.processingStatus
          : processingStatus // ignore: cast_nullable_to_non_nullable
              as String?,
      isVerified: null == isVerified
          ? _value.isVerified
          : isVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      verificationNotes: freezed == verificationNotes
          ? _value.verificationNotes
          : verificationNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      verifiedAt: freezed == verifiedAt
          ? _value.verifiedAt
          : verifiedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      verifiedBy: freezed == verifiedBy
          ? _value.verifiedBy
          : verifiedBy // ignore: cast_nullable_to_non_nullable
              as String?,
      source: null == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as InvoiceSource,
      sourceMetadata: freezed == sourceMetadata
          ? _value.sourceMetadata
          : sourceMetadata // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      emailTaskId: freezed == emailTaskId
          ? _value.emailTaskId
          : emailTaskId // ignore: cast_nullable_to_non_nullable
              as String?,
      tags: null == tags
          ? _value.tags
          : tags // ignore: cast_nullable_to_non_nullable
              as List<String>,
      extractedData: freezed == extractedData
          ? _value.extractedData
          : extractedData // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      metadata: freezed == metadata
          ? _value.metadata
          : metadata // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      deletedAt: freezed == deletedAt
          ? _value.deletedAt
          : deletedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      startedAt: freezed == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      lastActivityAt: freezed == lastActivityAt
          ? _value.lastActivityAt
          : lastActivityAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      version: null == version
          ? _value.version
          : version // ignore: cast_nullable_to_non_nullable
              as int,
      createdBy: freezed == createdBy
          ? _value.createdBy
          : createdBy // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedBy: freezed == updatedBy
          ? _value.updatedBy
          : updatedBy // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$InvoiceModelImplCopyWith<$Res>
    implements $InvoiceModelCopyWith<$Res> {
  factory _$$InvoiceModelImplCopyWith(
          _$InvoiceModelImpl value, $Res Function(_$InvoiceModelImpl) then) =
      __$$InvoiceModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'invoice_number') String invoiceNumber,
      @JsonKey(name: 'invoice_date') DateTime invoiceDate,
      @JsonKey(name: 'consumption_date') DateTime? consumptionDate,
      @JsonKey(name: 'user_id') String userId,
      @JsonKey(name: 'seller_name') String? sellerName,
      @JsonKey(name: 'buyer_name') String? buyerName,
      @JsonKey(name: 'seller_tax_number') String? sellerTaxId,
      @JsonKey(name: 'buyer_tax_number') String? buyerTaxId,
      @JsonKey(name: 'amount_without_tax') double amount,
      @JsonKey(name: 'total_amount') double? totalAmount,
      @JsonKey(name: 'tax_amount') double? taxAmount,
      String currency,
      String? category,
      InvoiceStatus status,
      @JsonKey(name: 'invoice_type') String? invoiceType,
      @JsonKey(name: 'invoice_code') String? invoiceCode,
      @JsonKey(name: 'file_url') String? fileUrl,
      @JsonKey(name: 'file_path') String? filePath,
      @JsonKey(name: 'file_hash') String? fileHash,
      @JsonKey(name: 'file_size') int? fileSize,
      @JsonKey(name: 'processing_status') String? processingStatus,
      @JsonKey(name: 'is_verified') bool isVerified,
      @JsonKey(name: 'verification_notes') String? verificationNotes,
      @JsonKey(name: 'verified_at') DateTime? verifiedAt,
      @JsonKey(name: 'verified_by') String? verifiedBy,
      InvoiceSource source,
      @JsonKey(name: 'source_metadata') Map<String, dynamic>? sourceMetadata,
      @JsonKey(name: 'email_task_id') String? emailTaskId,
      List<String> tags,
      @JsonKey(name: 'extracted_data') Map<String, dynamic>? extractedData,
      Map<String, dynamic>? metadata,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt,
      @JsonKey(name: 'deleted_at') DateTime? deletedAt,
      @JsonKey(name: 'completed_at') DateTime? completedAt,
      @JsonKey(name: 'started_at') DateTime? startedAt,
      @JsonKey(name: 'last_activity_at') DateTime? lastActivityAt,
      int version,
      @JsonKey(name: 'created_by') String? createdBy,
      @JsonKey(name: 'updated_by') String? updatedBy});
}

/// @nodoc
class __$$InvoiceModelImplCopyWithImpl<$Res>
    extends _$InvoiceModelCopyWithImpl<$Res, _$InvoiceModelImpl>
    implements _$$InvoiceModelImplCopyWith<$Res> {
  __$$InvoiceModelImplCopyWithImpl(
      _$InvoiceModelImpl _value, $Res Function(_$InvoiceModelImpl) _then)
      : super(_value, _then);

  /// Create a copy of InvoiceModel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? invoiceNumber = null,
    Object? invoiceDate = null,
    Object? consumptionDate = freezed,
    Object? userId = null,
    Object? sellerName = freezed,
    Object? buyerName = freezed,
    Object? sellerTaxId = freezed,
    Object? buyerTaxId = freezed,
    Object? amount = null,
    Object? totalAmount = freezed,
    Object? taxAmount = freezed,
    Object? currency = null,
    Object? category = freezed,
    Object? status = null,
    Object? invoiceType = freezed,
    Object? invoiceCode = freezed,
    Object? fileUrl = freezed,
    Object? filePath = freezed,
    Object? fileHash = freezed,
    Object? fileSize = freezed,
    Object? processingStatus = freezed,
    Object? isVerified = null,
    Object? verificationNotes = freezed,
    Object? verifiedAt = freezed,
    Object? verifiedBy = freezed,
    Object? source = null,
    Object? sourceMetadata = freezed,
    Object? emailTaskId = freezed,
    Object? tags = null,
    Object? extractedData = freezed,
    Object? metadata = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? deletedAt = freezed,
    Object? completedAt = freezed,
    Object? startedAt = freezed,
    Object? lastActivityAt = freezed,
    Object? version = null,
    Object? createdBy = freezed,
    Object? updatedBy = freezed,
  }) {
    return _then(_$InvoiceModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      invoiceNumber: null == invoiceNumber
          ? _value.invoiceNumber
          : invoiceNumber // ignore: cast_nullable_to_non_nullable
              as String,
      invoiceDate: null == invoiceDate
          ? _value.invoiceDate
          : invoiceDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      consumptionDate: freezed == consumptionDate
          ? _value.consumptionDate
          : consumptionDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      userId: null == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String,
      sellerName: freezed == sellerName
          ? _value.sellerName
          : sellerName // ignore: cast_nullable_to_non_nullable
              as String?,
      buyerName: freezed == buyerName
          ? _value.buyerName
          : buyerName // ignore: cast_nullable_to_non_nullable
              as String?,
      sellerTaxId: freezed == sellerTaxId
          ? _value.sellerTaxId
          : sellerTaxId // ignore: cast_nullable_to_non_nullable
              as String?,
      buyerTaxId: freezed == buyerTaxId
          ? _value.buyerTaxId
          : buyerTaxId // ignore: cast_nullable_to_non_nullable
              as String?,
      amount: null == amount
          ? _value.amount
          : amount // ignore: cast_nullable_to_non_nullable
              as double,
      totalAmount: freezed == totalAmount
          ? _value.totalAmount
          : totalAmount // ignore: cast_nullable_to_non_nullable
              as double?,
      taxAmount: freezed == taxAmount
          ? _value.taxAmount
          : taxAmount // ignore: cast_nullable_to_non_nullable
              as double?,
      currency: null == currency
          ? _value.currency
          : currency // ignore: cast_nullable_to_non_nullable
              as String,
      category: freezed == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as String?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as InvoiceStatus,
      invoiceType: freezed == invoiceType
          ? _value.invoiceType
          : invoiceType // ignore: cast_nullable_to_non_nullable
              as String?,
      invoiceCode: freezed == invoiceCode
          ? _value.invoiceCode
          : invoiceCode // ignore: cast_nullable_to_non_nullable
              as String?,
      fileUrl: freezed == fileUrl
          ? _value.fileUrl
          : fileUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      filePath: freezed == filePath
          ? _value.filePath
          : filePath // ignore: cast_nullable_to_non_nullable
              as String?,
      fileHash: freezed == fileHash
          ? _value.fileHash
          : fileHash // ignore: cast_nullable_to_non_nullable
              as String?,
      fileSize: freezed == fileSize
          ? _value.fileSize
          : fileSize // ignore: cast_nullable_to_non_nullable
              as int?,
      processingStatus: freezed == processingStatus
          ? _value.processingStatus
          : processingStatus // ignore: cast_nullable_to_non_nullable
              as String?,
      isVerified: null == isVerified
          ? _value.isVerified
          : isVerified // ignore: cast_nullable_to_non_nullable
              as bool,
      verificationNotes: freezed == verificationNotes
          ? _value.verificationNotes
          : verificationNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      verifiedAt: freezed == verifiedAt
          ? _value.verifiedAt
          : verifiedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      verifiedBy: freezed == verifiedBy
          ? _value.verifiedBy
          : verifiedBy // ignore: cast_nullable_to_non_nullable
              as String?,
      source: null == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as InvoiceSource,
      sourceMetadata: freezed == sourceMetadata
          ? _value._sourceMetadata
          : sourceMetadata // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      emailTaskId: freezed == emailTaskId
          ? _value.emailTaskId
          : emailTaskId // ignore: cast_nullable_to_non_nullable
              as String?,
      tags: null == tags
          ? _value._tags
          : tags // ignore: cast_nullable_to_non_nullable
              as List<String>,
      extractedData: freezed == extractedData
          ? _value._extractedData
          : extractedData // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      metadata: freezed == metadata
          ? _value._metadata
          : metadata // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      deletedAt: freezed == deletedAt
          ? _value.deletedAt
          : deletedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      startedAt: freezed == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      lastActivityAt: freezed == lastActivityAt
          ? _value.lastActivityAt
          : lastActivityAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      version: null == version
          ? _value.version
          : version // ignore: cast_nullable_to_non_nullable
              as int,
      createdBy: freezed == createdBy
          ? _value.createdBy
          : createdBy // ignore: cast_nullable_to_non_nullable
              as String?,
      updatedBy: freezed == updatedBy
          ? _value.updatedBy
          : updatedBy // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InvoiceModelImpl implements _InvoiceModel {
  const _$InvoiceModelImpl(
      {required this.id,
      @JsonKey(name: 'invoice_number') required this.invoiceNumber,
      @JsonKey(name: 'invoice_date') required this.invoiceDate,
      @JsonKey(name: 'consumption_date') this.consumptionDate,
      @JsonKey(name: 'user_id') required this.userId,
      @JsonKey(name: 'seller_name') this.sellerName,
      @JsonKey(name: 'buyer_name') this.buyerName,
      @JsonKey(name: 'seller_tax_number') this.sellerTaxId,
      @JsonKey(name: 'buyer_tax_number') this.buyerTaxId,
      @JsonKey(name: 'amount_without_tax') this.amount = 0.0,
      @JsonKey(name: 'total_amount') this.totalAmount,
      @JsonKey(name: 'tax_amount') this.taxAmount,
      this.currency = 'CNY',
      this.category,
      this.status = InvoiceStatus.unreimbursed,
      @JsonKey(name: 'invoice_type') this.invoiceType,
      @JsonKey(name: 'invoice_code') this.invoiceCode,
      @JsonKey(name: 'file_url') this.fileUrl,
      @JsonKey(name: 'file_path') this.filePath,
      @JsonKey(name: 'file_hash') this.fileHash,
      @JsonKey(name: 'file_size') this.fileSize,
      @JsonKey(name: 'processing_status') this.processingStatus,
      @JsonKey(name: 'is_verified') this.isVerified = false,
      @JsonKey(name: 'verification_notes') this.verificationNotes,
      @JsonKey(name: 'verified_at') this.verifiedAt,
      @JsonKey(name: 'verified_by') this.verifiedBy,
      this.source = InvoiceSource.upload,
      @JsonKey(name: 'source_metadata')
      final Map<String, dynamic>? sourceMetadata,
      @JsonKey(name: 'email_task_id') this.emailTaskId,
      final List<String> tags = const [],
      @JsonKey(name: 'extracted_data')
      final Map<String, dynamic>? extractedData,
      final Map<String, dynamic>? metadata,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt,
      @JsonKey(name: 'deleted_at') this.deletedAt,
      @JsonKey(name: 'completed_at') this.completedAt,
      @JsonKey(name: 'started_at') this.startedAt,
      @JsonKey(name: 'last_activity_at') this.lastActivityAt,
      this.version = 1,
      @JsonKey(name: 'created_by') this.createdBy,
      @JsonKey(name: 'updated_by') this.updatedBy})
      : _sourceMetadata = sourceMetadata,
        _tags = tags,
        _extractedData = extractedData,
        _metadata = metadata;

  factory _$InvoiceModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$InvoiceModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'invoice_number')
  final String invoiceNumber;
  @override
  @JsonKey(name: 'invoice_date')
  final DateTime invoiceDate;
  @override
  @JsonKey(name: 'consumption_date')
  final DateTime? consumptionDate;
  @override
  @JsonKey(name: 'user_id')
  final String userId;
// 基本信息
  @override
  @JsonKey(name: 'seller_name')
  final String? sellerName;
  @override
  @JsonKey(name: 'buyer_name')
  final String? buyerName;
  @override
  @JsonKey(name: 'seller_tax_number')
  final String? sellerTaxId;
  @override
  @JsonKey(name: 'buyer_tax_number')
  final String? buyerTaxId;
// 金额信息
  @override
  @JsonKey(name: 'amount_without_tax')
  final double amount;
  @override
  @JsonKey(name: 'total_amount')
  final double? totalAmount;
  @override
  @JsonKey(name: 'tax_amount')
  final double? taxAmount;
  @override
  @JsonKey()
  final String currency;
// 分类和状态
  @override
  final String? category;
  @override
  @JsonKey()
  final InvoiceStatus status;
  @override
  @JsonKey(name: 'invoice_type')
  final String? invoiceType;
  @override
  @JsonKey(name: 'invoice_code')
  final String? invoiceCode;
// 文件信息
  @override
  @JsonKey(name: 'file_url')
  final String? fileUrl;
  @override
  @JsonKey(name: 'file_path')
  final String? filePath;
  @override
  @JsonKey(name: 'file_hash')
  final String? fileHash;
  @override
  @JsonKey(name: 'file_size')
  final int? fileSize;
// 处理状态
  @override
  @JsonKey(name: 'processing_status')
  final String? processingStatus;
  @override
  @JsonKey(name: 'is_verified')
  final bool isVerified;
  @override
  @JsonKey(name: 'verification_notes')
  final String? verificationNotes;
  @override
  @JsonKey(name: 'verified_at')
  final DateTime? verifiedAt;
  @override
  @JsonKey(name: 'verified_by')
  final String? verifiedBy;
// 数据来源
  @override
  @JsonKey()
  final InvoiceSource source;
  final Map<String, dynamic>? _sourceMetadata;
  @override
  @JsonKey(name: 'source_metadata')
  Map<String, dynamic>? get sourceMetadata {
    final value = _sourceMetadata;
    if (value == null) return null;
    if (_sourceMetadata is EqualUnmodifiableMapView) return _sourceMetadata;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  @JsonKey(name: 'email_task_id')
  final String? emailTaskId;
// 标签和元数据
  final List<String> _tags;
// 标签和元数据
  @override
  @JsonKey()
  List<String> get tags {
    if (_tags is EqualUnmodifiableListView) return _tags;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_tags);
  }

  final Map<String, dynamic>? _extractedData;
  @override
  @JsonKey(name: 'extracted_data')
  Map<String, dynamic>? get extractedData {
    final value = _extractedData;
    if (value == null) return null;
    if (_extractedData is EqualUnmodifiableMapView) return _extractedData;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  final Map<String, dynamic>? _metadata;
  @override
  Map<String, dynamic>? get metadata {
    final value = _metadata;
    if (value == null) return null;
    if (_metadata is EqualUnmodifiableMapView) return _metadata;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

// 时间戳
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;
  @override
  @JsonKey(name: 'deleted_at')
  final DateTime? deletedAt;
  @override
  @JsonKey(name: 'completed_at')
  final DateTime? completedAt;
  @override
  @JsonKey(name: 'started_at')
  final DateTime? startedAt;
  @override
  @JsonKey(name: 'last_activity_at')
  final DateTime? lastActivityAt;
// 版本控制
  @override
  @JsonKey()
  final int version;
  @override
  @JsonKey(name: 'created_by')
  final String? createdBy;
  @override
  @JsonKey(name: 'updated_by')
  final String? updatedBy;

  @override
  String toString() {
    return 'InvoiceModel(id: $id, invoiceNumber: $invoiceNumber, invoiceDate: $invoiceDate, consumptionDate: $consumptionDate, userId: $userId, sellerName: $sellerName, buyerName: $buyerName, sellerTaxId: $sellerTaxId, buyerTaxId: $buyerTaxId, amount: $amount, totalAmount: $totalAmount, taxAmount: $taxAmount, currency: $currency, category: $category, status: $status, invoiceType: $invoiceType, invoiceCode: $invoiceCode, fileUrl: $fileUrl, filePath: $filePath, fileHash: $fileHash, fileSize: $fileSize, processingStatus: $processingStatus, isVerified: $isVerified, verificationNotes: $verificationNotes, verifiedAt: $verifiedAt, verifiedBy: $verifiedBy, source: $source, sourceMetadata: $sourceMetadata, emailTaskId: $emailTaskId, tags: $tags, extractedData: $extractedData, metadata: $metadata, createdAt: $createdAt, updatedAt: $updatedAt, deletedAt: $deletedAt, completedAt: $completedAt, startedAt: $startedAt, lastActivityAt: $lastActivityAt, version: $version, createdBy: $createdBy, updatedBy: $updatedBy)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InvoiceModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.invoiceNumber, invoiceNumber) ||
                other.invoiceNumber == invoiceNumber) &&
            (identical(other.invoiceDate, invoiceDate) ||
                other.invoiceDate == invoiceDate) &&
            (identical(other.consumptionDate, consumptionDate) ||
                other.consumptionDate == consumptionDate) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.sellerName, sellerName) ||
                other.sellerName == sellerName) &&
            (identical(other.buyerName, buyerName) ||
                other.buyerName == buyerName) &&
            (identical(other.sellerTaxId, sellerTaxId) ||
                other.sellerTaxId == sellerTaxId) &&
            (identical(other.buyerTaxId, buyerTaxId) ||
                other.buyerTaxId == buyerTaxId) &&
            (identical(other.amount, amount) || other.amount == amount) &&
            (identical(other.totalAmount, totalAmount) ||
                other.totalAmount == totalAmount) &&
            (identical(other.taxAmount, taxAmount) ||
                other.taxAmount == taxAmount) &&
            (identical(other.currency, currency) ||
                other.currency == currency) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.invoiceType, invoiceType) ||
                other.invoiceType == invoiceType) &&
            (identical(other.invoiceCode, invoiceCode) ||
                other.invoiceCode == invoiceCode) &&
            (identical(other.fileUrl, fileUrl) || other.fileUrl == fileUrl) &&
            (identical(other.filePath, filePath) ||
                other.filePath == filePath) &&
            (identical(other.fileHash, fileHash) ||
                other.fileHash == fileHash) &&
            (identical(other.fileSize, fileSize) ||
                other.fileSize == fileSize) &&
            (identical(other.processingStatus, processingStatus) ||
                other.processingStatus == processingStatus) &&
            (identical(other.isVerified, isVerified) ||
                other.isVerified == isVerified) &&
            (identical(other.verificationNotes, verificationNotes) ||
                other.verificationNotes == verificationNotes) &&
            (identical(other.verifiedAt, verifiedAt) ||
                other.verifiedAt == verifiedAt) &&
            (identical(other.verifiedBy, verifiedBy) ||
                other.verifiedBy == verifiedBy) &&
            (identical(other.source, source) || other.source == source) &&
            const DeepCollectionEquality()
                .equals(other._sourceMetadata, _sourceMetadata) &&
            (identical(other.emailTaskId, emailTaskId) ||
                other.emailTaskId == emailTaskId) &&
            const DeepCollectionEquality().equals(other._tags, _tags) &&
            const DeepCollectionEquality()
                .equals(other._extractedData, _extractedData) &&
            const DeepCollectionEquality().equals(other._metadata, _metadata) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.deletedAt, deletedAt) ||
                other.deletedAt == deletedAt) &&
            (identical(other.completedAt, completedAt) ||
                other.completedAt == completedAt) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.lastActivityAt, lastActivityAt) ||
                other.lastActivityAt == lastActivityAt) &&
            (identical(other.version, version) || other.version == version) &&
            (identical(other.createdBy, createdBy) ||
                other.createdBy == createdBy) &&
            (identical(other.updatedBy, updatedBy) ||
                other.updatedBy == updatedBy));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
        runtimeType,
        id,
        invoiceNumber,
        invoiceDate,
        consumptionDate,
        userId,
        sellerName,
        buyerName,
        sellerTaxId,
        buyerTaxId,
        amount,
        totalAmount,
        taxAmount,
        currency,
        category,
        status,
        invoiceType,
        invoiceCode,
        fileUrl,
        filePath,
        fileHash,
        fileSize,
        processingStatus,
        isVerified,
        verificationNotes,
        verifiedAt,
        verifiedBy,
        source,
        const DeepCollectionEquality().hash(_sourceMetadata),
        emailTaskId,
        const DeepCollectionEquality().hash(_tags),
        const DeepCollectionEquality().hash(_extractedData),
        const DeepCollectionEquality().hash(_metadata),
        createdAt,
        updatedAt,
        deletedAt,
        completedAt,
        startedAt,
        lastActivityAt,
        version,
        createdBy,
        updatedBy
      ]);

  /// Create a copy of InvoiceModel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$InvoiceModelImplCopyWith<_$InvoiceModelImpl> get copyWith =>
      __$$InvoiceModelImplCopyWithImpl<_$InvoiceModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InvoiceModelImplToJson(
      this,
    );
  }
}

abstract class _InvoiceModel implements InvoiceModel {
  const factory _InvoiceModel(
          {required final String id,
          @JsonKey(name: 'invoice_number') required final String invoiceNumber,
          @JsonKey(name: 'invoice_date') required final DateTime invoiceDate,
          @JsonKey(name: 'consumption_date') final DateTime? consumptionDate,
          @JsonKey(name: 'user_id') required final String userId,
          @JsonKey(name: 'seller_name') final String? sellerName,
          @JsonKey(name: 'buyer_name') final String? buyerName,
          @JsonKey(name: 'seller_tax_number') final String? sellerTaxId,
          @JsonKey(name: 'buyer_tax_number') final String? buyerTaxId,
          @JsonKey(name: 'amount_without_tax') final double amount,
          @JsonKey(name: 'total_amount') final double? totalAmount,
          @JsonKey(name: 'tax_amount') final double? taxAmount,
          final String currency,
          final String? category,
          final InvoiceStatus status,
          @JsonKey(name: 'invoice_type') final String? invoiceType,
          @JsonKey(name: 'invoice_code') final String? invoiceCode,
          @JsonKey(name: 'file_url') final String? fileUrl,
          @JsonKey(name: 'file_path') final String? filePath,
          @JsonKey(name: 'file_hash') final String? fileHash,
          @JsonKey(name: 'file_size') final int? fileSize,
          @JsonKey(name: 'processing_status') final String? processingStatus,
          @JsonKey(name: 'is_verified') final bool isVerified,
          @JsonKey(name: 'verification_notes') final String? verificationNotes,
          @JsonKey(name: 'verified_at') final DateTime? verifiedAt,
          @JsonKey(name: 'verified_by') final String? verifiedBy,
          final InvoiceSource source,
          @JsonKey(name: 'source_metadata')
          final Map<String, dynamic>? sourceMetadata,
          @JsonKey(name: 'email_task_id') final String? emailTaskId,
          final List<String> tags,
          @JsonKey(name: 'extracted_data')
          final Map<String, dynamic>? extractedData,
          final Map<String, dynamic>? metadata,
          @JsonKey(name: 'created_at') final DateTime? createdAt,
          @JsonKey(name: 'updated_at') final DateTime? updatedAt,
          @JsonKey(name: 'deleted_at') final DateTime? deletedAt,
          @JsonKey(name: 'completed_at') final DateTime? completedAt,
          @JsonKey(name: 'started_at') final DateTime? startedAt,
          @JsonKey(name: 'last_activity_at') final DateTime? lastActivityAt,
          final int version,
          @JsonKey(name: 'created_by') final String? createdBy,
          @JsonKey(name: 'updated_by') final String? updatedBy}) =
      _$InvoiceModelImpl;

  factory _InvoiceModel.fromJson(Map<String, dynamic> json) =
      _$InvoiceModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'invoice_number')
  String get invoiceNumber;
  @override
  @JsonKey(name: 'invoice_date')
  DateTime get invoiceDate;
  @override
  @JsonKey(name: 'consumption_date')
  DateTime? get consumptionDate;
  @override
  @JsonKey(name: 'user_id')
  String get userId; // 基本信息
  @override
  @JsonKey(name: 'seller_name')
  String? get sellerName;
  @override
  @JsonKey(name: 'buyer_name')
  String? get buyerName;
  @override
  @JsonKey(name: 'seller_tax_number')
  String? get sellerTaxId;
  @override
  @JsonKey(name: 'buyer_tax_number')
  String? get buyerTaxId; // 金额信息
  @override
  @JsonKey(name: 'amount_without_tax')
  double get amount;
  @override
  @JsonKey(name: 'total_amount')
  double? get totalAmount;
  @override
  @JsonKey(name: 'tax_amount')
  double? get taxAmount;
  @override
  String get currency; // 分类和状态
  @override
  String? get category;
  @override
  InvoiceStatus get status;
  @override
  @JsonKey(name: 'invoice_type')
  String? get invoiceType;
  @override
  @JsonKey(name: 'invoice_code')
  String? get invoiceCode; // 文件信息
  @override
  @JsonKey(name: 'file_url')
  String? get fileUrl;
  @override
  @JsonKey(name: 'file_path')
  String? get filePath;
  @override
  @JsonKey(name: 'file_hash')
  String? get fileHash;
  @override
  @JsonKey(name: 'file_size')
  int? get fileSize; // 处理状态
  @override
  @JsonKey(name: 'processing_status')
  String? get processingStatus;
  @override
  @JsonKey(name: 'is_verified')
  bool get isVerified;
  @override
  @JsonKey(name: 'verification_notes')
  String? get verificationNotes;
  @override
  @JsonKey(name: 'verified_at')
  DateTime? get verifiedAt;
  @override
  @JsonKey(name: 'verified_by')
  String? get verifiedBy; // 数据来源
  @override
  InvoiceSource get source;
  @override
  @JsonKey(name: 'source_metadata')
  Map<String, dynamic>? get sourceMetadata;
  @override
  @JsonKey(name: 'email_task_id')
  String? get emailTaskId; // 标签和元数据
  @override
  List<String> get tags;
  @override
  @JsonKey(name: 'extracted_data')
  Map<String, dynamic>? get extractedData;
  @override
  Map<String, dynamic>? get metadata; // 时间戳
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override
  @JsonKey(name: 'deleted_at')
  DateTime? get deletedAt;
  @override
  @JsonKey(name: 'completed_at')
  DateTime? get completedAt;
  @override
  @JsonKey(name: 'started_at')
  DateTime? get startedAt;
  @override
  @JsonKey(name: 'last_activity_at')
  DateTime? get lastActivityAt; // 版本控制
  @override
  int get version;
  @override
  @JsonKey(name: 'created_by')
  String? get createdBy;
  @override
  @JsonKey(name: 'updated_by')
  String? get updatedBy;

  /// Create a copy of InvoiceModel
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$InvoiceModelImplCopyWith<_$InvoiceModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
