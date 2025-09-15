/// 邮件过滤器实体
/// 对应Web项目的EmailFilters接口
library;

import 'package:equatable/equatable.dart';

class EmailFilters extends Equatable {
  final String? category;
  final String? status;
  final String? search;
  final DateTime? dateFrom;
  final DateTime? dateTo;

  const EmailFilters({
    this.category,
    this.status,
    this.search,
    this.dateFrom,
    this.dateTo,
  });

  @override
  List<Object?> get props => [
    category,
    status,
    search,
    dateFrom,
    dateTo,
  ];

  // 检查是否有任何过滤条件
  bool get hasFilters {
    return category != null ||
           status != null ||
           (search != null && search!.isNotEmpty) ||
           dateFrom != null ||
           dateTo != null;
  }

  // 获取活动过滤器数量
  int get activeFiltersCount {
    int count = 0;
    if (category != null) count++;
    if (status != null) count++;
    if (search != null && search!.isNotEmpty) count++;
    if (dateFrom != null) count++;
    if (dateTo != null) count++;
    return count;
  }

  // 清除所有过滤器
  static const EmailFilters empty = EmailFilters();

  EmailFilters copyWith({
    String? category,
    String? status,
    String? search,
    DateTime? dateFrom,
    DateTime? dateTo,
    bool clearCategory = false,
    bool clearStatus = false,
    bool clearSearch = false,
    bool clearDateFrom = false,
    bool clearDateTo = false,
  }) {
    return EmailFilters(
      category: clearCategory ? null : (category ?? this.category),
      status: clearStatus ? null : (status ?? this.status),
      search: clearSearch ? null : (search ?? this.search),
      dateFrom: clearDateFrom ? null : (dateFrom ?? this.dateFrom),
      dateTo: clearDateTo ? null : (dateTo ?? this.dateTo),
    );
  }

  // 清除所有过滤器
  EmailFilters clear() {
    return const EmailFilters();
  }

  // 转换为查询参数映射
  Map<String, dynamic> toQueryParams() {
    final Map<String, dynamic> params = {};
    
    if (category != null) params['category'] = category;
    if (status != null) params['status'] = status;
    if (search != null && search!.isNotEmpty) params['search'] = search;
    if (dateFrom != null) params['dateFrom'] = dateFrom!.toIso8601String();
    if (dateTo != null) params['dateTo'] = dateTo!.toIso8601String();
    
    return params;
  }

  // 从查询参数创建过滤器
  factory EmailFilters.fromQueryParams(Map<String, dynamic> params) {
    return EmailFilters(
      category: params['category'],
      status: params['status'],
      search: params['search'],
      dateFrom: params['dateFrom'] != null 
        ? DateTime.tryParse(params['dateFrom']) 
        : null,
      dateTo: params['dateTo'] != null 
        ? DateTime.tryParse(params['dateTo']) 
        : null,
    );
  }

  @override
  String toString() {
    return 'EmailFilters(category: $category, status: $status, search: $search, dateFrom: $dateFrom, dateTo: $dateTo)';
  }
}