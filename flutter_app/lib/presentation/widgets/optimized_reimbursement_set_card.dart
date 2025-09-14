import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:archive/archive.dart';
import 'package:share_plus/share_plus.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../core/constants/accessibility_constants.dart';
import '../../core/animations/micro_interactions.dart';
import '../../core/di/injection_container.dart';
import '../../core/utils/invoice_file_utils.dart';
import '../../core/widgets/molecules/unified_slide_button.dart';
import '../utils/cupertino_notification_utils.dart';
import 'uniform_card_styles.dart';
import 'unified_bottom_sheet.dart';
import 'reimbursement_status_button.dart';
import 'region_badge_widget.dart';
import 'invoice_status_badge.dart';

/// 优化后的报销集卡片组件
/// 基于UI专家审计建议的简化设计，完全使用FlexColorScheme主题
class OptimizedReimbursementSetCard extends StatelessWidget {
  final ReimbursementSetEntity reimbursementSet;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final Function(ReimbursementSetStatus) onStatusChange;
  
  /// 分组标识，具有相同 groupTag 的滑动卡片将互斥
  final Object? groupTag;

  const OptimizedReimbursementSetCard({
    super.key,
    required this.reimbursementSet,
    required this.onTap,
    required this.onDelete,
    required this.onStatusChange,
    this.groupTag,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Slidable(
      key: ValueKey(reimbursementSet.id),
      groupTag: groupTag,
      // 左划区域 - 导出按钮（积极操作）
      startActionPane: ActionPane(
        motion: const StretchMotion(),
        extentRatio: 0.25, // 单个按钮的合理宽度
        children: [
          UnifiedSlideButton.export(
            onTap: () => _exportReimbursementSetPdfs(context),
            colorScheme: colorScheme,
            position: SlideButtonPosition.single,
          ),
        ],
      ),
      // 右划区域 - 删除按钮（危险操作）
      endActionPane: ActionPane(
        motion: const StretchMotion(),
        extentRatio: 0.25, // 单个按钮的合理宽度
        children: [
          UnifiedSlideButton.delete(
            onTap: () async {
              // 使用统一的底部Sheet确认对话框
              final result = await UnifiedBottomSheet.showConfirmDialog(
                context: context,
                title: '删除报销集',
                content: '确定要删除报销集 "${reimbursementSet.setName}" 吗？\n\n包含的发票将重新变为未分配状态。',
                confirmText: '删除',
                confirmColor: colorScheme.error,
                icon: CupertinoIcons.delete,
              );
              
              if (result == true) {
                onDelete();
              }
            },
            colorScheme: colorScheme,
            position: SlideButtonPosition.single,
          ),
        ],
      ),
      child: Semantics(
        label: '报销集: ${reimbursementSet.setName}',
        hint: AccessibilityConstants.cardActionHint,
        child: BounceButton(
          onPressed: onTap,
          child: UniformCardStyles.buildCard(
            context: context,
            onTap: null, // 由 BounceButton 处理
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 头部信息行
              UniformCardStyles.buildSimpleHeaderRow(
                context: context,
                title: reimbursementSet.setName,
                subtitle: '${reimbursementSet.invoiceCount} 张发票',
                trailing: ReimbursementStatusButton(
                  reimbursementSet: reimbursementSet,
                  invoices: [], // 卡片模式不需要具体发票列表
                  isCompact: true,
                  size: BadgeSize.medium,
                ),
              ),

              const SizedBox(height: UniformCardStyles.spacing12),

              // 日期范围显示行（替换总金额）
              _buildDateRangeRow(context),

              const SizedBox(height: UniformCardStyles.spacing12),

              // 区域统计徽章
              _buildRegionStatistics(context),

              const SizedBox(height: UniformCardStyles.spacing8),

              // 底部信息行
              UniformCardStyles.buildBottomRow(
                context: context,
                timeText: _formatUpdateTime(reimbursementSet.updatedAt),
                actionIcons: _buildActionIcons(context),
              ),
            ],
            ),
          ),
        ),
      ),
    );
  }

  /// 构建操作图标列表
  List<Widget> _buildActionIcons(BuildContext context) {
    // 删除按钮已移至右划手势，这里返回空列表
    return <Widget>[];
  }

  /// 构建日期范围显示行
  Widget _buildDateRangeRow(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final dateRangeText = reimbursementSet.dateRangeText ?? reimbursementSet.smartDateRangeText;
    final totalAmount = reimbursementSet.totalAmount;

    return Row(
      children: [
        // 日期范围图标和文本
        Expanded(
          child: Row(
            children: [
              Icon(
                CupertinoIcons.calendar,
                size: 14,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  dateRangeText,
                  style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        // 总金额（使用发票卡片相同样式）
        Text(
          '¥${totalAmount.toStringAsFixed(2)}',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.primary,
          ),
        ),
      ],
    );
  }

  /// 构建区域统计徽章
  Widget _buildRegionStatistics(BuildContext context) {
    if (reimbursementSet.regionStatistics == null || 
        reimbursementSet.regionStatistics!.isEmpty) {
      return const SizedBox.shrink();
    }

    return RegionStatisticsWidget(
      regionStatistics: reimbursementSet.regionStatistics,
      maxVisibleBadges: 3,
      badgeSize: BadgeSize.small,
    );
  }



  // ==================== 辅助方法 ====================




  /// 格式化更新时间
  String _formatUpdateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}天前';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}小时前';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}分钟前';
    } else {
      return '刚刚';
    }
  }

  /// 导出报销集中的全部发票PDF文件
  /// 复用批量下载的完整逻辑，确保一致性和稳定性
  Future<void> _exportReimbursementSetPdfs(BuildContext context) async {
    try {
      // 在async操作之前保存context引用
      final navigatorContext = Navigator.of(context);
      
      // 先确认操作
      final confirmed = await UnifiedBottomSheet.showConfirmDialog(
        context: context,
        title: '导出报销集',
        content: '确定要导出 "${reimbursementSet.setName}" 中的全部发票PDF吗？\n\n共包含 ${reimbursementSet.invoiceCount} 张发票。',
        confirmText: '导出',
        confirmColor: Theme.of(context).colorScheme.primary,
        icon: CupertinoIcons.cloud_download,
      );

      if (confirmed != true) return;

      // 显示下载进度对话框
      if (context.mounted) {
        showCupertinoDialog(
          context: context,
          barrierDismissible: false,
          builder: (dialogContext) => CupertinoAlertDialog(
            title: const Text('正在导出'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 16),
                const CupertinoActivityIndicator(),
                const SizedBox(height: 16),
                Text('正在下载并打包 ${reimbursementSet.invoiceCount} 张发票...'),
              ],
            ),
          ),
        );
      }

      // 获取发票仓库
      final invoiceRepository = sl<InvoiceRepository>();
      
      // 获取属于该报销集的所有发票
      // 使用发票查询API过滤出属于此报销集的发票
      final invoiceListResult = await invoiceRepository.getInvoices(
        page: 1,
        pageSize: 1000, // 设置较大的页面大小以获取所有发票
        filters: InvoiceFilters(), // 可能需要根据实际API调整过滤条件
      );
      
      // 过滤出属于当前报销集的发票
      final invoicesData = invoiceListResult.invoices
          .where((invoice) => invoice.reimbursementSetId == reimbursementSet.id)
          .toList();

      if (invoicesData.isEmpty) {
        navigatorContext.pop(); // 关闭进度对话框
        if (context.mounted) {
          CupertinoNotificationUtils.showError(
            context, 
            '报销集中没有可导出的发票'
          );
        }
        return;
      }

      // 创建ZIP压缩包
      final archive = Archive();
      int successCount = 0;
      int noFileCount = 0;
      int downloadFailCount = 0;

      // 过滤出有文件的发票
      final invoicesWithFiles =
          invoicesData.where((invoice) => invoice.hasFile).toList();
      final invoicesWithoutFiles =
          invoicesData.where((invoice) => !invoice.hasFile).toList();

      noFileCount = invoicesWithoutFiles.length;

      // 并发下载，限制同时下载数量为3个（与批量下载一致）
      const maxConcurrentDownloads = 3;

      for (int i = 0;
          i < invoicesWithFiles.length;
          i += maxConcurrentDownloads) {
        final batch =
            invoicesWithFiles.skip(i).take(maxConcurrentDownloads).toList();

        final batchTasks = batch.map((invoice) async {
          try {
            // 使用与批量下载完全相同的方法
            final fileBytes =
                await InvoiceFileUtils.getInvoicePdfBytes(invoice);

            // 使用InvoiceFileUtils的统一文件名生成规则
            final fileName = InvoiceFileUtils.generateInvoiceFileName(invoice);

            // 添加到压缩包
            final file = ArchiveFile(fileName, fileBytes.length, fileBytes);
            archive.addFile(file);
            successCount++;
          } catch (e) {
            downloadFailCount++;
          }
        });

        // 等待当前批次完成后再进行下一批
        await Future.wait(batchTasks);

        // 批次间短暂停顿，避免服务器压力（与批量下载一致）
        if (i + maxConcurrentDownloads < invoicesWithFiles.length) {
          await Future.delayed(const Duration(milliseconds: 500));
        }
      }

      // 生成发票信息CSV文件并添加到压缩包
      final csvContent = _generateInvoiceListCsv(invoicesData, successCount, noFileCount, downloadFailCount);
      final csvBytes = utf8.encode('\uFEFF$csvContent'); // UTF-8 BOM + 内容
      final csvFile = ArchiveFile('发票清单.csv', csvBytes.length, csvBytes);
      archive.addFile(csvFile);

      if (archive.files.isEmpty) {
        navigatorContext.pop(); // 关闭进度对话框
        String errorMessage = '没有可导出的PDF文件';
        if (noFileCount > 0) {
          errorMessage += '\n$noFileCount张发票缺少文件链接';
        }
        if (downloadFailCount > 0) {
          errorMessage += '\n$downloadFailCount张发票下载失败';
        }
        if (context.mounted) {
          CupertinoNotificationUtils.showError(context, errorMessage);
        }
        return;
      }

      // 压缩文件
      final zipData = ZipEncoder().encode(archive);
      if (zipData == null) {
        navigatorContext.pop();
        if (context.mounted) {
          CupertinoNotificationUtils.showError(context, '文件压缩失败');
        }
        return;
      }

      navigatorContext.pop(); // 关闭进度对话框

      // 生成报销集压缩包文件名
      final zipFileName = _generateReimbursementSetZipFileName();

      if (Platform.isIOS) {
        // iOS平台：直接分享压缩包
        await _shareReimbursementSetZip(Uint8List.fromList(zipData), zipFileName, successCount);
        if (context.mounted) {
          CupertinoNotificationUtils.showSuccess(
            context, 
            '已导出 "${reimbursementSet.setName}" 中的 $successCount 张发票'
          );
        }
      } else {
        // 其他平台：保存到用户选择的位置
        final filePath = await _saveReimbursementSetZip(
          Uint8List.fromList(zipData), 
          zipFileName, 
          successCount
        );

        if (filePath != null) {
          if (context.mounted) {
            CupertinoNotificationUtils.showSuccess(
              context, 
              '成功导出 "${reimbursementSet.setName}" 中的 $successCount 张发票'
            );
          }
        }
      }

    } catch (e) {
      if (context.mounted) {
        Navigator.of(context, rootNavigator: true).pop(); // 确保关闭进度对话框
        CupertinoNotificationUtils.showError(
          context, 
          '导出失败：${InvoiceFileUtils.getDownloadErrorMessage(e)}'
        );
      }
    }
  }

  /// 生成报销集压缩包文件名
  String _generateReimbursementSetZipFileName() {
    // 清理文件名中的特殊字符
    final cleanSetName = reimbursementSet.setName.replaceAll(RegExp(r'[<>:"/\\|?*]'), '_');
    
    // 格式化日期
    final now = DateTime.now();
    final dateStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    
    return '报销集_${cleanSetName}_${reimbursementSet.invoiceCount}张发票_$dateStr.zip';
  }

  /// iOS平台分享压缩包
  Future<void> _shareReimbursementSetZip(Uint8List zipData, String fileName, int successCount) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(zipData);

      await Share.shareXFiles(
        [XFile(file.path)],
      );
    } catch (e) {
      rethrow;
    }
  }

  /// 其他平台保存压缩包
  Future<String?> _saveReimbursementSetZip(
    Uint8List zipData, 
    String fileName, 
    int successCount
  ) async {
    try {
      final outputFile = await FilePicker.platform.saveFile(
        dialogTitle: '保存报销集导出文件',
        fileName: fileName,
        bytes: zipData,
        type: FileType.custom,
        allowedExtensions: ['zip'],
      );

      return outputFile;
    } catch (e) {
      return null;
    }
  }

  /// 生成发票信息CSV文件内容
  /// 包含发票的核心基本信息，便于用户进行数据分析
  String _generateInvoiceListCsv(List<dynamic> invoices, int successCount, int noFileCount, int downloadFailCount) {
    final buffer = StringBuffer();
    
    // CSV表头（中文列名，便于用户理解）
    buffer.writeln('发票号码,开票日期,消费日期,销售方名称,购买方名称,发票金额,税额,币种,类别,状态,发票类型,是否验证,数据来源,创建时间,文件大小KB');
    
    // 遍历发票数据生成CSV行
    for (final invoice in invoices) {
      final row = _formatCsvRow([
        _escapeCsvValue(invoice.invoiceNumber),
        _escapeCsvValue(invoice.formattedDate),
        _escapeCsvValue(invoice.formattedConsumptionDate ?? '--'),
        _escapeCsvValue(invoice.sellerName ?? '--'),
        _escapeCsvValue(invoice.buyerName ?? '--'),
        invoice.displayAmount.toStringAsFixed(2),
        (invoice.taxAmount ?? 0.0).toStringAsFixed(2),
        _escapeCsvValue(invoice.currency),
        _escapeCsvValue(invoice.category ?? '--'),
        _escapeCsvValue(invoice.effectiveStatus.displayName),
        _escapeCsvValue(invoice.invoiceType ?? '--'),
        invoice.isVerified ? '是' : '否',
        _escapeCsvValue(invoice.source.displayName),
        _formatDateTime(invoice.createdAt),
        _formatFileSize(invoice.fileSize),
      ]);
      buffer.writeln(row);
    }
    
    // 添加统计信息作为注释行
    buffer.writeln('');
    buffer.writeln('# 导出统计');
    buffer.writeln('# 报销集名称,${_escapeCsvValue(reimbursementSet.setName)}');
    buffer.writeln('# 总发票数量,${invoices.length}');
    buffer.writeln('# 成功下载PDF,$successCount');
    buffer.writeln('# 缺少文件,$noFileCount');
    buffer.writeln('# 下载失败,$downloadFailCount');
    buffer.writeln('# 导出时间,${_formatDateTime(DateTime.now())}');
    
    return buffer.toString();
  }

  /// CSV值转义处理，包含逗号或引号的值需要用双引号包围
  String _escapeCsvValue(String? value) {
    if (value == null || value.isEmpty) return '--';
    
    // 如果包含逗号、引号或换行符，用双引号包围并转义内部引号
    if (value.contains(',') || value.contains('"') || value.contains('\n')) {
      return '"${value.replaceAll('"', '""')}"';
    }
    return value;
  }

  /// 格式化CSV行，用逗号连接所有字段
  String _formatCsvRow(List<String> fields) {
    return fields.join(',');
  }

  /// 格式化日期时间为可读字符串
  String _formatDateTime(DateTime? dateTime) {
    if (dateTime == null) return '--';
    return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  /// 格式化文件大小为KB
  String _formatFileSize(int? fileSizeBytes) {
    if (fileSizeBytes == null || fileSizeBytes <= 0) return '--';
    return (fileSizeBytes / 1024).toStringAsFixed(1);
  }
}
