// 业务逻辑相关常量配置
// 
// 管理所有与业务规则、限制和配置相关的常量
// 便于业务规则的统一管理和快速调整

/// 发票状态常量
class InvoiceStatus {
  InvoiceStatus._(); // 私有构造函数
  
  static const String pending = 'pending';
  static const String approved = 'approved'; 
  static const String rejected = 'rejected';
  static const String processing = 'processing';
  static const String archived = 'archived';
}

/// 发票类型常量
class InvoiceType {
  InvoiceType._(); // 私有构造函数
  
  static const String vat = 'vat';                    // 增值税发票
  static const String general = 'general';            // 普通发票
  static const String electronic = 'electronic';      // 电子发票
  static const String special = 'special';            // 专票
  static const String receipt = 'receipt';            // 收据
}

/// 发票金额限制常量
class InvoiceAmountLimits {
  InvoiceAmountLimits._(); // 私有构造函数
  
  /// 最小金额 (0.01元)
  static const double minAmount = 0.01;
  
  /// 最大金额 (999万元)
  static const double maxAmount = 99999999.99;
  
  /// 大额发票阈值 (1万元)
  static const double largeAmountThreshold = 10000.0;
  
  /// 特殊审批阈值 (5万元)
  static const double specialApprovalThreshold = 50000.0;
}

/// 发票时间限制常量
class InvoiceTimeConstraints {
  InvoiceTimeConstraints._(); // 私有构造函数
  
  /// 最大开票日期回溯天数 (2年)
  static const int maxBackdateDays = 730;
  
  /// 最大未来开票天数 (30天)
  static const int maxFutureDays = 30;
  
  /// 发票有效期 (5年)
  static const int validityYears = 5;
  
  /// 报销期限 (6个月)
  static const int reimbursementDeadlineMonths = 6;
}

/// 报销集状态常量
class ReimbursementSetStatus {
  ReimbursementSetStatus._(); // 私有构造函数
  
  static const String draft = 'draft';                // 草稿
  static const String submitted = 'submitted';        // 已提交
  static const String approved = 'approved';          // 已审批
  static const String rejected = 'rejected';          // 已拒绝
  static const String paid = 'paid';                  // 已支付
  static const String archived = 'archived';          // 已归档
}

/// 报销集限制常量
class ReimbursementSetLimits {
  ReimbursementSetLimits._(); // 私有构造函数
  
  /// 单个报销集最大发票数量
  static const int maxInvoicesPerSet = 50;
  
  /// 单个报销集最大金额 (10万元)
  static const double maxAmountPerSet = 100000.0;
  
  /// 报销集名称最大长度
  static const int maxNameLength = 100;
  
  /// 报销集描述最大长度
  static const int maxDescriptionLength = 500;
  
  /// 最大批量操作数量
  static const int maxBatchOperationCount = 100;
}

/// 权限级别常量
class PermissionLevel {
  PermissionLevel._(); // 私有构造函数
  
  static const String guest = 'guest';                // 访客
  static const String user = 'user';                  // 普通用户
  static const String admin = 'admin';                // 管理员
  static const String superAdmin = 'super_admin';     // 超级管理员
}

/// 权限操作常量
class PermissionActions {
  PermissionActions._(); // 私有构造函数
  
  static const String view = 'view';                  // 查看
  static const String create = 'create';              // 创建
  static const String edit = 'edit';                  // 编辑
  static const String delete = 'delete';              // 删除
  static const String approve = 'approve';            // 审批
  static const String export = 'export';              // 导出
  static const String import = 'import';              // 导入
}

/// 文件类型限制常量
class FileTypeConstraints {
  FileTypeConstraints._(); // 私有构造函数
  
  /// PDF文件
  static const String pdf = 'pdf';
  static const int pdfMaxSize = 10 * 1024 * 1024;     // 10MB
  
  /// 图片文件
  static const String jpg = 'jpg';
  static const String jpeg = 'jpeg';
  static const String png = 'png';
  static const String webp = 'webp';
  static const int imageMaxSize = 5 * 1024 * 1024;    // 5MB
  
  /// 压缩包文件
  static const String zip = 'zip';
  static const int zipMaxSize = 50 * 1024 * 1024;     // 50MB
  
  /// 所有支持的扩展名
  static const List<String> supportedExtensions = [
    pdf, jpg, jpeg, png, webp, zip
  ];
  
  /// 图片扩展名
  static const List<String> imageExtensions = [
    jpg, jpeg, png, webp
  ];
}

/// OCR处理限制常量
class OcrConstraints {
  OcrConstraints._(); // 私有构造函数
  
  /// OCR识别最小置信度
  static const double minConfidence = 0.6;
  
  /// OCR处理超时时间 (2分钟)
  static const Duration ocrTimeout = Duration(minutes: 2);
  
  /// 最大重试次数
  static const int maxRetryAttempts = 3;
  
  /// 支持的OCR语言
  static const List<String> supportedLanguages = ['zh', 'en'];
}

/// 搜索限制常量
class SearchConstraints {
  SearchConstraints._(); // 私有构造函数
  
  /// 最小搜索关键字长度
  static const int minQueryLength = 2;
  
  /// 最大搜索关键字长度
  static const int maxQueryLength = 100;
  
  /// 搜索结果最大数量
  static const int maxSearchResults = 1000;
  
  /// 搜索历史保存数量
  static const int searchHistoryLimit = 20;
}

/// 排序选项常量
class SortOptions {
  SortOptions._(); // 私有构造函数
  
  static const String dateAsc = 'date_asc';           // 日期升序
  static const String dateDesc = 'date_desc';         // 日期降序
  static const String amountAsc = 'amount_asc';       // 金额升序
  static const String amountDesc = 'amount_desc';     // 金额降序
  static const String nameAsc = 'name_asc';           // 名称升序
  static const String nameDesc = 'name_desc';         // 名称降序
  static const String statusAsc = 'status_asc';       // 状态升序
  static const String statusDesc = 'status_desc';     // 状态降序
}

/// 业务常量辅助工具类
class BusinessConstants {
  BusinessConstants._(); // 私有构造函数

  /// 验证发票金额是否在有效范围内
  static bool isValidInvoiceAmount(double amount) {
    return amount >= InvoiceAmountLimits.minAmount && 
           amount <= InvoiceAmountLimits.maxAmount;
  }
  
  /// 判断是否为大额发票
  static bool isLargeAmountInvoice(double amount) {
    return amount >= InvoiceAmountLimits.largeAmountThreshold;
  }
  
  /// 判断是否需要特殊审批
  static bool requiresSpecialApproval(double amount) {
    return amount >= InvoiceAmountLimits.specialApprovalThreshold;
  }
  
  /// 获取文件类型的最大大小限制
  static int getMaxFileSizeForType(String extension) {
    if (extension.toLowerCase() == FileTypeConstraints.pdf) {
      return FileTypeConstraints.pdfMaxSize;
    } else if (FileTypeConstraints.imageExtensions.contains(extension.toLowerCase())) {
      return FileTypeConstraints.imageMaxSize;
    } else if (extension.toLowerCase() == FileTypeConstraints.zip) {
      return FileTypeConstraints.zipMaxSize;
    }
    return 0; // 不支持的文件类型
  }
  
  /// 检查文件扩展名是否被支持
  static bool isSupportedFileExtension(String extension) {
    return FileTypeConstraints.supportedExtensions.contains(extension.toLowerCase());
  }
  
  /// 验证搜索查询长度
  static bool isValidSearchQuery(String query) {
    return query.length >= SearchConstraints.minQueryLength && 
           query.length <= SearchConstraints.maxQueryLength;
  }
}