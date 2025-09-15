import 'package:flutter/cupertino.dart';
import '../../domain/entities/invoice_entity.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../domain/repositories/invoice_repository.dart';

/// iOS风格的发票统计信息一行显示
/// 遵循iOS Human Interface Guidelines的标准显示方式
/// 类似于照片应用的"1,234 张照片，123 张精选"样式
class InvoiceStatsInline extends StatelessWidget {
  const InvoiceStatsInline({
    super.key,
    required this.invoices,
    this.serverStats,
    this.isLoading = false,
  });

  final List<InvoiceEntity> invoices;
  final InvoiceStats? serverStats; // 服务器统计数据，优先使用
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness;
    final isDark = brightness == Brightness.dark;
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: 16.0,
        vertical: 12.0,
      ),
      child: isLoading 
          ? _buildLoadingText(isDark)
          : _buildStatsText(context, isDark),
    );
  }

  /// 构建加载状态文字
  Widget _buildLoadingText(bool isDark) {
    return Text(
      '加载中...',
      style: TextStyle(
        fontSize: 12.0,
        color: isDark ? CupertinoColors.systemGrey2 : CupertinoColors.systemGrey,
        fontWeight: FontWeight.w400,
      ),
    );
  }

  /// 构建统计信息文字
  Widget _buildStatsText(BuildContext context, bool isDark) {
    final stats = _getEffectiveStats();
    
    // iOS标准的颜色规范
    final secondaryColor = CupertinoColors.secondaryLabel.resolveFrom(context);
    final primaryColor = CupertinoColors.label.resolveFrom(context);
    final highlightColor = CupertinoColors.systemBlue.resolveFrom(context);
    
    return RichText(
      text: TextSpan(
        style: TextStyle(
          fontSize: 12.0,
          fontWeight: FontWeight.w400,
          height: 1.2,
        ),
        children: [
          // 总发票数量和金额
          TextSpan(
            text: '总共 ',
            style: TextStyle(color: secondaryColor),
          ),
          TextSpan(
            text: '${stats.totalCount} 张发票',
            style: TextStyle(
              color: primaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
          TextSpan(
            text: '，',
            style: TextStyle(color: secondaryColor),
          ),
          TextSpan(
            text: _formatAmount(stats.totalAmount),
            style: TextStyle(
              color: primaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
          
          // iOS标准的中点分隔符
          if (stats.unreimbursedCount > 0) ...[
            TextSpan(
              text: ' • ',
              style: TextStyle(color: secondaryColor),
            ),
            
            // 待报销信息（高亮显示）
            TextSpan(
              text: '待报销 ',
              style: TextStyle(color: secondaryColor),
            ),
            TextSpan(
              text: '${stats.unreimbursedCount} 张',
              style: TextStyle(
                color: highlightColor,
                fontWeight: FontWeight.w500,
              ),
            ),
            TextSpan(
              text: '，',
              style: TextStyle(color: secondaryColor),
            ),
            TextSpan(
              text: _formatAmount(stats.unreimbursedAmount),
              style: TextStyle(
                color: highlightColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 获取有效的统计数据（优先使用服务器数据）
  InvoiceStatsData _getEffectiveStats() {
    if (serverStats != null) {
      // 使用服务器统计数据
      return InvoiceStatsData(
        totalCount: serverStats!.totalCount,
        totalAmount: serverStats!.totalAmount,
        unreimbursedCount: serverStats!.getStatusCount('unsubmitted') + serverStats!.getStatusCount('submitted'),
        unreimbursedAmount: _calculateUnreimbursedAmount(serverStats!),
      );
    } else {
      // 回退到客户端计算
      return _calculateStats(invoices);
    }
  }

  /// 从服务器统计数据中计算待报销金额
  double _calculateUnreimbursedAmount(InvoiceStats serverStats) {
    // 注意：这里需要根据实际的服务器统计数据结构来计算
    // 如果服务器没有提供按状态分组的金额，可能需要扩展服务器API
    // 临时使用总金额的估算比例
    final totalCount = serverStats.totalCount;
    final unreimbursedCount = serverStats.getStatusCount('unsubmitted') + serverStats.getStatusCount('submitted');
    if (totalCount > 0) {
      return serverStats.totalAmount * (unreimbursedCount / totalCount);
    }
    return 0.0;
  }

  /// 计算统计数据（客户端回退方案）
  InvoiceStatsData _calculateStats(List<InvoiceEntity> invoices) {
    if (invoices.isEmpty) {
      return const InvoiceStatsData(
        totalCount: 0,
        totalAmount: 0.0,
        unreimbursedCount: 0,
        unreimbursedAmount: 0.0,
      );
    }

    int totalCount = invoices.length;
    double totalAmount = 0.0;
    int unreimbursedCount = 0;
    double unreimbursedAmount = 0.0;

    for (final invoice in invoices) {
      totalAmount += invoice.amount;
      
      // 待报销：未提交和已提交状态都算待报销
      if (invoice.status == InvoiceStatus.unsubmitted || 
          invoice.status == InvoiceStatus.submitted) {
        unreimbursedCount++;
        unreimbursedAmount += invoice.amount;
      }
    }

    return InvoiceStatsData(
      totalCount: totalCount,
      totalAmount: totalAmount,
      unreimbursedCount: unreimbursedCount,
      unreimbursedAmount: unreimbursedAmount,
    );
  }

  /// iOS标准的金额格式化
  /// 遵循iOS原生应用的数字显示规范
  String _formatAmount(double amount) {
    if (amount == 0) {
      return '¥0';
    } else if (amount >= 10000) {
      final wan = amount / 10000;
      if (wan >= 100) {
        return '¥${wan.toStringAsFixed(0)}万';
      } else {
        return '¥${wan.toStringAsFixed(1)}万';
      }
    } else if (amount >= 1000) {
      return '¥${(amount / 1000).toStringAsFixed(1)}k';
    } else {
      return '¥${amount.toStringAsFixed(0)}';
    }
  }
}

/// 发票统计数据类（用于UI显示）
class InvoiceStatsData {
  final int totalCount;
  final double totalAmount;
  final int unreimbursedCount;
  final double unreimbursedAmount;

  const InvoiceStatsData({
    required this.totalCount,
    required this.totalAmount,
    required this.unreimbursedCount,
    required this.unreimbursedAmount,
  });
}