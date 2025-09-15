import 'package:flutter/material.dart'; // ⚠️ 需要保留：使用 Icons 类

/// 图标映射工具类
class IconMapping {
  /// 根据文件扩展名获取图标
  static IconData getFileIcon(String? fileName) {
    if (fileName == null || fileName.isEmpty) {
      return Icons.description;
    }

    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return Icons.image;
      case 'doc':
      case 'docx':
        return Icons.article;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart;
      case 'txt':
        return Icons.text_snippet;
      case 'zip':
      case 'rar':
      case '7z':
        return Icons.archive;
      default:
        return Icons.description;
    }
  }

  /// 根据发票类型获取图标
  static IconData getInvoiceTypeIcon(String? type) {
    if (type == null) return Icons.receipt;

    switch (type.toLowerCase()) {
      case 'vat':
      case '增值税发票':
        return Icons.receipt_long;
      case 'general':
      case '普通发票':
        return Icons.receipt;
      case 'electronic':
      case '电子发票':
        return Icons.phone_android;
      case 'special':
      case '专用发票':
        return Icons.star;
      default:
        return Icons.receipt;
    }
  }

  /// 根据金额范围获取图标
  static IconData getAmountIcon(double? amount) {
    if (amount == null) return Icons.monetization_on;

    if (amount < 100) {
      return Icons.monetization_on_outlined;
    } else if (amount < 1000) {
      return Icons.monetization_on;
    } else {
      return Icons.account_balance_wallet;
    }
  }
}
