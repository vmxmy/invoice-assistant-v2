import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_typography.dart';
import 'package:sliver_tools/sliver_tools.dart';
import 'package:archive/archive.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
// import 'package:http/http.dart' as http; // 未使用
import 'package:share_plus/share_plus.dart';
// import 'package:open_file/open_file.dart'; // 未使用
import 'package:file_picker/file_picker.dart';
import '../../domain/value_objects/invoice_status.dart';
import '../../domain/repositories/invoice_repository.dart';
import '../../core/utils/invoice_file_utils.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../core/di/injection_container.dart';
// import '../../core/network/supabase_client.dart'; // 未使用
import '../../core/config/app_config.dart';
import '../../domain/entities/invoice_entity.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_event.dart';
import '../bloc/invoice_state.dart';
import '../widgets/invoice_card_widget.dart';
// import '../widgets/invoice_stats_widget.dart'; // 未使用
import '../widgets/invoice_search_filter_bar.dart';
import '../widgets/app_feedback.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/enhanced_error_handler.dart';
import '../widgets/create_reimbursement_set_dialog.dart';
import '../../domain/entities/reimbursement_set_entity.dart';
import '../bloc/reimbursement_set_bloc.dart';
import '../bloc/reimbursement_set_event.dart';
import '../bloc/reimbursement_set_state.dart';
import '../widgets/optimized_reimbursement_set_card.dart';
import '../widgets/responsive_stats_card.dart';

/// 发票管理页面 - 使用新的分层架构
class InvoiceManagementPage extends StatefulWidget {
  const InvoiceManagementPage({super.key});

  @override
  State<InvoiceManagementPage> createState() => _InvoiceManagementPageState();
}

/// 内部页面组件，由BlocProvider包装
class _InvoiceManagementPageContent extends StatefulWidget {
  const _InvoiceManagementPageContent();

  @override
  State<_InvoiceManagementPageContent> createState() =>
      _InvoiceManagementPageContentState();
}

class _InvoiceManagementPageState extends State<InvoiceManagementPage>
    with SingleTickerProviderStateMixin {
  @override
  Widget build(BuildContext context) {
    // print('🏭 [InvoiceManagementPage] 使用来自MainPage的BlocProvider');
    return const _InvoiceManagementPageContent();
  }
}

class _InvoiceManagementPageContentState
    extends State<_InvoiceManagementPageContent>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late TabController _tabController;
  final String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      // print('📋 [TabController] 切换到Tab: ${_tabController.index}');
      // 当切换到报销集页签(index=1)时，刷新报销集数据
      if (_tabController.index == 1 && !_tabController.indexIsChanging) {
        // print('📋 [TabController] 切换到报销集页签，刷新数据');
        context
            .read<ReimbursementSetBloc>()
            .add(const LoadReimbursementSets(refresh: true));
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      // print('🔄 [AppLifecycle] 应用恢复前台，当前页签: ${_tabController.index}');
      // 如果当前在报销集页签，刷新数据
      if (_tabController.index == 1) {
        // print('🔄 [AppLifecycle] 刷新报销集数据');
        context
            .read<ReimbursementSetBloc>()
            .add(const LoadReimbursementSets(refresh: true));
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // print('🏠 [InvoiceManagementPageContent] build 方法执行');

    return BlocListener<InvoiceBloc, InvoiceState>(
      listener: (context, state) {
        // print('🔥 [页面级Listener:${bloc.hashCode}] 接收到状态: ${state.runtimeType}');
        if (state is InvoiceDeleteSuccess) {
          // print('🔥 [页面级Listener:${bloc.hashCode}] 删除成功，立即显示Snackbar: ${state.message}');
          EnhancedErrorHandler.showSuccessSnackBar(context, state.message);
        } else if (state is InvoiceError) {
          // print('🔥 [页面级Listener:${bloc.hashCode}] 操作失败: ${state.message}');
          EnhancedErrorHandler.showErrorSnackBar(
            context,
            state.message,
            onRetry: () {
              // 重试加载列表
              context
                  .read<InvoiceBloc>()
                  .add(const LoadInvoices(refresh: true));
            },
          );
        }
      },
      child: Scaffold(
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            _buildAppBar(context),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              BlocProvider.value(
                value: context.read<InvoiceBloc>(),
                child: Builder(
                  builder: (context) {
                    // print('🏗️ [TabBarView] Builder构建AllInvoicesTab');
                    return _AllInvoicesTab(searchQuery: _searchQuery);
                  },
                ),
              ),
              BlocProvider.value(
                value: context.read<InvoiceBloc>(),
                child: Builder(
                  builder: (context) {
                    // print('🏗️ [TabBarView] Builder构建ReimbursementSetsTab');
                    return _ReimbursementSetsTab();
                  },
                ),
              ),
              BlocProvider.value(
                value: context.read<InvoiceBloc>(),
                child: Builder(
                  builder: (context) {
                    // print('🏗️ [TabBarView] Builder构建FavoritesTab');
                    return _FavoritesTab();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 构建应用栏
  Widget _buildAppBar(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SliverAppBar(
      toolbarHeight: 0, // 移除工具栏高度
      floating: true,
      pinned: true,
      backgroundColor: colorScheme.surfaceContainerHighest, // 浅色背景
      surfaceTintColor: colorScheme.surface.withValues(alpha: 0), // 移除默认的表面色调
      bottom: TabBar(
        controller: _tabController,
        indicatorColor: colorScheme.primary,
        labelColor: colorScheme.primary,
        unselectedLabelColor: colorScheme.onSurfaceVariant,
        tabs: const [
          Tab(text: '全部发票'),
          Tab(text: '报销集'),
          Tab(text: '收藏'),
        ],
      ),
    );
  }
}

/// 全部发票标签页 - 独立组件，确保正确的上下文访问
class _AllInvoicesTab extends StatefulWidget {
  final String searchQuery;

  const _AllInvoicesTab({required this.searchQuery});

  @override
  State<_AllInvoicesTab> createState() => _AllInvoicesTabState();
}

class _AllInvoicesTabState extends State<_AllInvoicesTab> {
  late ScrollController _scrollController;
  bool _isSelectionMode = false;
  Set<String> _selectedInvoices = <String>{};
  String _searchQuery = '';
  FilterOptions _currentFilterOptions = const FilterOptions();

  _AllInvoicesTabState() {
    // print('🏗️ [AllInvoicesTabState] 构造函数执行');
  }

  @override
  void initState() {
    super.initState();
    // print('🏗️ [AllInvoicesTabState] initState执行');
    _scrollController = ScrollController();
    _scrollController.addListener(_onScroll);

    // 检查当前状态，如果没有数据则加载
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final currentState = context.read<InvoiceBloc>().state;
      // print('🏗️ [AllInvoicesTabState] 检查当前状态: ${currentState.runtimeType}');

      if (currentState is! InvoiceLoaded || currentState.invoices.isEmpty) {
        // print('🏗️ [AllInvoicesTabState] 触发加载发票事件');
        context.read<InvoiceBloc>().add(const LoadInvoices(refresh: true));
      } else {
        // print('🏗️ [AllInvoicesTabState] 已有数据，无需重新加载 - 发票数量: ${currentState.invoices.length}');
      }
    });
  }

  /// 进入选择模式
  void _enterSelectionMode(String invoiceId) {
    setState(() {
      _isSelectionMode = true;
      _selectedInvoices.add(invoiceId);
    });
  }

  /// 退出选择模式
  void _exitSelectionMode() {
    setState(() {
      _isSelectionMode = false;
      _selectedInvoices.clear();
    });
  }

  /// 切换发票选择状态
  void _toggleInvoiceSelection(String invoiceId) {
    setState(() {
      if (_selectedInvoices.contains(invoiceId)) {
        _selectedInvoices.remove(invoiceId);
        if (_selectedInvoices.isEmpty) {
          _isSelectionMode = false;
        }
      } else {
        _selectedInvoices.add(invoiceId);
      }
    });
  }

  /// 选择指定月份的所有发票
  void _selectMonthInvoices(String monthKey, List<InvoiceEntity> monthInvoices) {
    // 触感反馈
    HapticFeedback.mediumImpact();
    
    setState(() {
      _isSelectionMode = true;
      // 将该月份的所有发票添加到选择列表中
      for (final invoice in monthInvoices) {
        _selectedInvoices.add(invoice.id);
      }
    });

    // 显示选择成功的提示
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              CupertinoIcons.checkmark_circle_fill,
              color: Theme.of(context).colorScheme.onSecondary,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text('已选择$monthKey的${monthInvoices.length}张发票'),
            ),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.secondary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 2),
      ),
    );
  }


  /// 批量删除选中的发票
  void _deleteSelectedInvoices() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('批量删除'),
        content: Text('确定要删除选中的 ${_selectedInvoices.length} 张发票吗？此操作无法撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              for (final invoiceId in _selectedInvoices) {
                context.read<InvoiceBloc>().add(DeleteInvoice(invoiceId));
              }
              _exitSelectionMode();
            },
            style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  /// 批量下载选中的发票PDF文件
  Future<void> _downloadSelectedInvoices() async {
    if (_selectedInvoices.isEmpty) return;

    try {
      // 显示下载进度对话框
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('正在下载'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text('正在下载并打包 ${_selectedInvoices.length} 张发票...'),
            ],
          ),
        ),
      );

      // 获取选中的发票详细信息
      final invoiceRepository = sl<InvoiceRepository>();
      final selectedInvoicesData = <InvoiceEntity>[];

      // print('📥 [下载] 开始获取 ${_selectedInvoices.length} 张发票的详细信息');

      for (final invoiceId in _selectedInvoices) {
        try {
          final invoice = await invoiceRepository.getInvoiceById(invoiceId);
          selectedInvoicesData.add(invoice);
          // print('📥 [下载] 发票 ${invoice.invoiceNumber}: fileUrl=${invoice.fileUrl}, hasFile=${invoice.hasFile}');
        } catch (e) {
          // print('❌ [下载] 获取发票详情失败: $invoiceId - $e');
        }
      }

      // print('📥 [下载] 成功获取 ${selectedInvoicesData.length} 张发票详情');

      // 创建ZIP压缩包
      final archive = Archive();
      int successCount = 0;
      int noFileCount = 0;
      int downloadFailCount = 0;

      // 过滤出有文件的发票
      final invoicesWithFiles =
          selectedInvoicesData.where((invoice) => invoice.hasFile).toList();
      final invoicesWithoutFiles =
          selectedInvoicesData.where((invoice) => !invoice.hasFile).toList();

      noFileCount = invoicesWithoutFiles.length;

      // 并发下载，限制同时下载数量为3个
      const maxConcurrentDownloads = 3;

      for (int i = 0;
          i < invoicesWithFiles.length;
          i += maxConcurrentDownloads) {
        final batch =
            invoicesWithFiles.skip(i).take(maxConcurrentDownloads).toList();

        final batchTasks = batch.map((invoice) async {
          try {
            // print('📥 [下载] 正在下载: ${invoice.invoiceNumber}');

            // 使用优化后的下载方法（带重试机制）
            final fileBytes =
                await InvoiceFileUtils.getInvoicePdfBytes(invoice);

            // 生成文件名
            final fileName =
                '${invoice.invoiceNumber}_${invoice.sellerName ?? '未知销售方'}.pdf'
                    .replaceAll(RegExp(r'[<>:"/\\|?*]'), '_'); // 移除文件名中的非法字符

            // 添加到压缩包
            final file = ArchiveFile(fileName, fileBytes.length, fileBytes);
            archive.addFile(file);
            successCount++;
            // print('✅ [下载] 成功下载: ${invoice.invoiceNumber} (${fileBytes.length} bytes)');
          } catch (e) {
            downloadFailCount++;
            // print('❌ [下载] 下载发票文件失败: ${invoice.invoiceNumber} - $e');
          }
        });

        // 等待当前批次完成后再进行下一批
        await Future.wait(batchTasks);

        // 批次间短暂停顿，避免服务器压力
        if (i + maxConcurrentDownloads < invoicesWithFiles.length) {
          await Future.delayed(Duration(milliseconds: 500));
        }
      }

      // print('📊 [下载] 统计: 成功=$successCount, 无文件=$noFileCount, 下载失败=$downloadFailCount');

      if (archive.files.isEmpty) {
        if (mounted) {
          Navigator.pop(context); // 关闭进度对话框
          String errorMessage = '没有可下载的PDF文件';
          if (noFileCount > 0) {
            errorMessage += '\n$noFileCount张发票缺少文件链接';
          }
          if (downloadFailCount > 0) {
            errorMessage += '\n$downloadFailCount张发票下载失败';
          }
          AppFeedback.error(context, errorMessage);
        }
        return;
      }

      // 压缩文件
      final zipData = ZipEncoder().encode(archive);
      if (zipData == null) {
        if (mounted) {
          Navigator.pop(context);
          AppFeedback.error(context, '文件压缩失败');
        }
        return;
      }

      if (mounted) {
        Navigator.pop(context); // 关闭进度对话框
      }

      if (Platform.isIOS) {
        // iOS平台：直接分享压缩包，不保存到本地
        await _shareZipFileDirectly(Uint8List.fromList(zipData), successCount);
        if (mounted) {
          AppFeedback.success(context, '已打包 $successCount 张发票');
        }
      } else {
        // 其他平台：保存到用户选择的位置
        final filePath =
            await _saveZipFile(Uint8List.fromList(zipData), successCount);

        if (filePath != null) {
          // 显示成功消息
          if (mounted) {
            AppFeedback.success(context, '成功下载并打包 $successCount 张发票');
          }

          // 打开文件所在位置
          await _openFileLocation(filePath, successCount);
        } else {
          // 用户取消保存或保存失败
          // print('ℹ️ [下载] 用户取消了下载操作');
        }
      }

      _exitSelectionMode();
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // 关闭进度对话框
        AppFeedback.error(context, '下载失败: ${e.toString()}');
      }
    }
  }

  /// 打开文件所在位置并提供操作选项
  Future<void> _openFileLocation(String filePath, int fileCount) async {
    try {
      if (Platform.isMacOS) {
        // macOS：在Finder中显示文件
        await Process.run('open', ['-R', filePath]);
        // print('📁 [macOS] 已在Finder中显示文件: $filePath');

        // 显示macOS标准下载完成对话框
        if (mounted) {
          final fileName = filePath.split('/').last;
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => Dialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Container(
                width: 420,
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 文件图标
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        CupertinoIcons.folder,
                        size: 32,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 标题
                    Text(
                      '已下载',
                      style: AppTypography.headlineSmall(context).copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // 文件名
                    Text(
                      fileName,
                      style: AppTypography.bodyMedium(context).copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),

                    // 文件信息
                    Text(
                      '$fileCount 张发票',
                      style: AppTypography.bodySmall(context).copyWith(
                        color: Theme.of(context).colorScheme.outline,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // 按钮组
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // 在Finder中显示
                        TextButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            // 文件已经在Finder中显示了，这里不需要再次打开
                          },
                          icon:
                              const Icon(CupertinoIcons.folder_open, size: 16),
                          label: const Text('在Finder中显示'),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // 完成按钮
                        ElevatedButton(
                          onPressed: () => Navigator.pop(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                Theme.of(context).colorScheme.primary,
                            foregroundColor:
                                Theme.of(context).colorScheme.onPrimary,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                          child: const Text('完成'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        }
      } else if (Platform.isWindows) {
        // Windows：在资源管理器中显示文件
        await Process.run('explorer', ['/select,', filePath]);
        // print('📁 [Windows] 已在资源管理器中显示文件: $filePath');
      } else if (Platform.isLinux) {
        // Linux：尝试打开文件管理器
        final directory = Directory(filePath).parent.path;
        await Process.run('xdg-open', [directory]);
        // print('📁 [Linux] 已打开文件夹: $directory');
      } else if (Platform.isAndroid || Platform.isIOS) {
        // 移动端：显示文件保存信息并提供分享选项
        if (mounted) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('文件已保存'),
              content: Text('文件已成功保存！\n包含 $fileCount 张发票\n\n是否要分享此文件？'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('稍后'),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _shareOnMobile(filePath, fileCount);
                  },
                  style: TextButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.primary,
                  ),
                  child: const Text('分享'),
                ),
              ],
            ),
          );
        }
      }
    } catch (e) {
      // print('❌ [文件打开] 无法打开文件位置: $e');
      // 如果打开失败，至少显示成功信息
      if (mounted) {
        AppFeedback.success(context, '文件已保存到本地，包含 $fileCount 张发票');
      }
    }
  }

  /// 移动端分享
  Future<void> _shareOnMobile(String filePath, int fileCount) async {
    try {
      await Share.shareXFiles(
        [XFile(filePath)],
      );
      // print('📤 [分享] 移动端分享成功: $filePath');
    } catch (e) {
      // print('❌ [分享] 移动端分享失败: $e');
      if (mounted) {
        AppFeedback.error(context, '分享失败');
      }
    }
  }

  /// 保存ZIP文件到用户选择的位置并返回文件路径
  Future<String?> _saveZipFile(Uint8List zipData, int fileCount) async {
    try {
      // 生成默认文件名
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final defaultFileName = 'invoices_${fileCount}files_$timestamp.zip';

      if (Platform.isMacOS || Platform.isWindows || Platform.isLinux) {
        // 桌面端：显示文件保存对话框
        // print('💾 [保存] 显示文件保存对话框');

        try {
          // print('💾 [保存] 显示文件保存对话框 (file_picker)');

          final fileSavePath = await FilePicker.platform.saveFile(
            dialogTitle: '保存发票文件',
            fileName: defaultFileName,
            type: FileType.custom,
            allowedExtensions: ['zip'],
          );

          // print('💾 [保存] FilePicker.saveFile 返回结果: $fileSavePath');

          if (fileSavePath == null) {
            // print('💾 [保存] 用户取消了保存操作，回退到默认目录');
            // 回退到默认目录而不是返回null
            final directory = await getApplicationDocumentsDirectory();
            final file = File('${directory.path}/$defaultFileName');
            await file.writeAsBytes(zipData);
            // print('✅ [保存] 回退保存到默认位置: ${file.path}');
            return file.path;
          }

          // print('💾 [保存] 用户选择保存到: $fileSavePath');

          // 写入文件到用户选择的位置
          final file = File(fileSavePath);
          await file.writeAsBytes(zipData);

          // print('✅ [保存] 文件已保存到: ${file.path}');
          return file.path;
        } catch (e) {
          // print('❌ [保存] 文件保存对话框错误: $e');
          // 如果保存对话框失败，回退到默认目录
          final directory = await getApplicationDocumentsDirectory();
          final file = File('${directory.path}/$defaultFileName');
          await file.writeAsBytes(zipData);
          // print('✅ [保存] 回退保存到默认位置: ${file.path}');
          return file.path;
        }
      } else if (Platform.isAndroid || Platform.isIOS) {
        // 移动端：请求存储权限并使用默认目录
        final permission =
            Platform.isAndroid ? Permission.storage : Permission.photos;

        final status = await permission.request();
        if (!status.isGranted) {
          throw '存储权限被拒绝';
        }

        late Directory directory;
        if (Platform.isAndroid) {
          final externalDir = await getExternalStorageDirectory();
          if (externalDir == null) {
            throw '无法获取Android存储目录';
          }
          // 创建下载文件夹
          directory = Directory('${externalDir.path}/invoices');
          if (!await directory.exists()) {
            await directory.create(recursive: true);
          }
        } else {
          directory = await getApplicationDocumentsDirectory();
        }

        final file = File('${directory.path}/$defaultFileName');
        await file.writeAsBytes(zipData);

        // print('📁 [保存] 文件已保存到: ${file.path}');
        return file.path;
      }

      throw '不支持的平台';
    } catch (e) {
      throw '保存文件失败: $e';
    }
  }

  /// 创建报销集
  void _createReimbursementSet() {
    if (_selectedInvoices.isEmpty) return;

    // 创建报销集创建对话框
    showDialog(
      context: context,
      barrierDismissible: false, // 防止意外关闭
      builder: (context) => CreateReimbursementSetDialog(
        selectedInvoiceIds: _selectedInvoices.toList(),
        onCreateSuccess: () {
          // 创建成功后退出选择模式并刷新数据
          _exitSelectionMode();
          context.read<InvoiceBloc>().add(const LoadInvoices(refresh: true));
        },
      ),
    );
  }

  /// 处理搜索变化
  void _handleSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
  }

  /// 处理筛选变化
  void _handleFilterChanged(FilterOptions filterOptions) {
    // print('🔍 [ManagementPage] _handleFilterChanged 被调用: $filterOptions');
    // print('🔍 [ManagementPage] 逾期筛选: ${filterOptions.showOverdue}');
    // print('🔍 [ManagementPage] 紧急筛选: ${filterOptions.showUrgent}');
    // print('🔍 [ManagementPage] 待报销筛选: ${filterOptions.showUnreimbursed}');
    setState(() {
      _currentFilterOptions = filterOptions;
    });

    // 根据筛选条件触发相应的数据加载
    _loadInvoicesWithFilter(filterOptions);
  }

  /// 处理筛选清除（带刷新，绕过缓存）
  void _handleFilterClearWithRefresh(FilterOptions filterOptions) {
    // print('🔍 [ManagementPage] _handleFilterClearWithRefresh 被调用: $filterOptions');
    // print('🔍 [ManagementPage] 清除筛选，绕过缓存重新查询全部数据');
    setState(() {
      _currentFilterOptions = filterOptions;
    });

    // 使用refresh模式重新加载数据，绕过缓存
    _loadInvoicesWithFilter(filterOptions, refresh: true);
  }

  /// 根据筛选条件加载发票（公共函数）
  void _loadInvoicesWithFilter(FilterOptions filterOptions,
      {bool refresh = false}) {
    final filters = InvoiceFilters(
      globalSearch: _searchQuery.isNotEmpty ? _searchQuery : null,
      overdue: filterOptions.showOverdue,
      urgent: filterOptions.showUrgent,
      status: _getStatusFromFilter(filterOptions),
      forceRefresh: refresh, // 根据refresh参数决定是否强制刷新
    );

    // print('🔍 [LoadInvoicesWithFilter] 构建的筛选条件${refresh ? '（刷新模式）' : ''}: overdue=${filters.overdue}, urgent=${filters.urgent}, status=${filters.status}, search=${filters.globalSearch}');

    context.read<InvoiceBloc>().add(LoadInvoices(
          page: 1,
          refresh: refresh, // 根据参数决定是否刷新
          filters: filters,
        ));
  }

  /// 根据筛选选项获取状态列表
  List<InvoiceStatus>? _getStatusFromFilter(FilterOptions filterOptions) {
    if (filterOptions.showUnreimbursed) {
      return [InvoiceStatus.unsubmitted, InvoiceStatus.submitted];
    }
    return null; // 返回null表示不筛选状态
  }

  /// 应用搜索和筛选
  List<InvoiceEntity> _applySearchAndFilter(List<InvoiceEntity> invoices) {
    var filteredInvoices = invoices;

    // 应用搜索过滤
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filteredInvoices = filteredInvoices.where((invoice) {
        // 搜索发票号
        if (invoice.invoiceNumber.toLowerCase().contains(query)) {
          return true;
        }

        // 搜索销售方
        if (invoice.sellerName?.toLowerCase().contains(query) == true) {
          return true;
        }

        // 搜索金额（支持部分匹配）
        final amountStr = invoice.amount.toString();
        if (amountStr.contains(query)) {
          return true;
        }

        // 搜索总金额
        final totalAmountStr = invoice.totalAmount?.toString() ?? '';
        if (totalAmountStr.contains(query)) {
          return true;
        }

        // 搜索买方名称
        if (invoice.buyerName?.toLowerCase().contains(query) == true) {
          return true;
        }

        return false;
      }).toList();
    }

    return filteredInvoices;
  }

  /// 按月份分组发票数据（基于消费时间）
  Map<String, List<InvoiceEntity>> _groupInvoicesByMonth(
      List<InvoiceEntity> invoices) {
    final Map<String, List<InvoiceEntity>> groupedInvoices = {};

    for (final invoice in invoices) {
      // 使用消费时间进行分组，如果消费时间为空则使用开票时间作为fallback
      final dateForGrouping = invoice.consumptionDate ?? invoice.invoiceDate;
      final monthKey =
          '${dateForGrouping.year}年${dateForGrouping.month.toString().padLeft(2, '0')}月';
      groupedInvoices.putIfAbsent(monthKey, () => []).add(invoice);
    }

    // 按月份降序排序（最新的月份在前）
    final sortedKeys = groupedInvoices.keys.toList()
      ..sort((a, b) => b.compareTo(a));

    final sortedMap = <String, List<InvoiceEntity>>{};
    for (final key in sortedKeys) {
      // 每个月内按消费时间降序排序（如果消费时间为空则使用开票时间）
      final monthInvoices = groupedInvoices[key]!
        ..sort((a, b) {
          final dateA = a.consumptionDate ?? a.invoiceDate;
          final dateB = b.consumptionDate ?? b.invoiceDate;
          return dateB.compareTo(dateA);
        });
      sortedMap[key] = monthInvoices;
    }

    return sortedMap;
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (AppConfig.enableLogging) {
      // print('📜 [AllInvoicesTab-Scroll] 滚动事件 - 位置: ${_scrollController.offset.toStringAsFixed(1)}');
    }

    // 检查是否到达底部
    if (_scrollController.offset >=
        _scrollController.position.maxScrollExtent - 200) {
      final currentState = context.read<InvoiceBloc>().state;
      if (AppConfig.enableLogging) {
        // print('📜 [AllInvoicesTab-Scroll] 检测到底部，当前状态: ${currentState.runtimeType}');
      }

      if (currentState is InvoiceLoaded &&
          currentState.hasMore &&
          !currentState.isLoadingMore) {
        if (AppConfig.enableLogging) {
          // print('📜 [AllInvoicesTab-Scroll] 🎯 触发加载更多发票');
          // print('📜 [AllInvoicesTab-Scroll] 当前状态 - 已加载: ${currentState.invoices.length}, hasMore: ${currentState.hasMore}, isLoadingMore: ${currentState.isLoadingMore}');
        }
        context.read<InvoiceBloc>().add(const LoadMoreInvoices());
      } else {
        if (AppConfig.enableLogging) {
          if (currentState is InvoiceLoaded) {
            // print('📜 [AllInvoicesTab-Scroll] ⚠️ 跳过加载更多 - hasMore: ${currentState.hasMore}, isLoadingMore: ${currentState.isLoadingMore}, 已加载: ${currentState.invoices.length}');
          } else {
            // print('📜 [AllInvoicesTab-Scroll] ⚠️ 跳过加载更多 - 状态: ${currentState.runtimeType}');
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<InvoiceBloc, InvoiceState>(
      listener: (context, state) {
        if (state is InvoiceDeleteSuccess) {
          AppFeedback.success(context, state.message);
        }
      },
      buildWhen: (previous, current) =>
          current is InvoiceLoading ||
          current is InvoiceError ||
          current is InvoiceLoaded,
      builder: (context, state) {
        if (state is InvoiceLoading) {
          return const InvoiceListSkeleton();
        }

        if (state is InvoiceError) {
          return _buildErrorWidget(state.message, () {
            // 错误重试时也使用当前筛选条件
            if (_currentFilterOptions.hasActiveFilters) {
              _loadInvoicesWithFilter(_currentFilterOptions);
            } else {
              context
                  .read<InvoiceBloc>()
                  .add(const LoadInvoices(refresh: true));
            }
          });
        }

        if (state is InvoiceLoaded) {
          // 应用搜索和筛选
          final filteredInvoices = _applySearchAndFilter(state.invoices);

          return Column(
            children: [
              // 新的搜索筛选组件
              InvoiceSearchFilterBar(
                initialSearchQuery: _searchQuery,
                onSearchChanged: _handleSearchChanged,
                onFilterChanged: _handleFilterChanged,
                onFilterClearWithRefresh: _handleFilterClearWithRefresh,
                showQuickFilters: true,
                showSearchBox: true,
              ),

              // 多选操作栏
              if (_isSelectionMode) _buildSelectionToolbar(filteredInvoices),

              // 发票列表
              Expanded(
                child: _buildInvoiceList(filteredInvoices, state.isLoadingMore),
              ),
            ],
          );
        }

        return const Center(child: Text('暂无数据'));
      },
    );
  }

  /// 构建按月份分组的发票列表
  Widget _buildInvoiceList(List<InvoiceEntity> invoices, bool isLoadingMore) {
    if (invoices.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(CupertinoIcons.tray,
                size: 64,
                color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('暂无发票',
                style: TextStyle(
                    fontSize: 18,
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ],
        ),
      );
    }

    final groupedInvoices = _groupInvoicesByMonth(invoices);
    final monthKeys = groupedInvoices.keys.toList();

    return RefreshIndicator(
      onRefresh: () async {
        context.read<InvoiceBloc>().add(const RefreshInvoices());
      },
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          // 为每个月份创建一个MultiSliver section
          ...monthKeys.map(
            (monthKey) => MultiSliver(
              pushPinnedChildren: true, // 防止多个header堆叠
              children: [
                // 月份标题 (粘性header)
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _MonthHeaderDelegate(
                    monthKey: monthKey,
                    invoiceCount: groupedInvoices[monthKey]!.length,
                    onLongPress: () => _selectMonthInvoices(
                      monthKey, 
                      groupedInvoices[monthKey]!
                    ),
                  ),
                ),
                // 该月份的发票列表
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final invoice = groupedInvoices[monthKey]![index];
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 4),
                        child: InvoiceCardWidget(
                          invoice: invoice,
                          onTap: () => _viewInvoiceDetail(invoice),
                          onDelete: () => _showDeleteConfirmation(invoice),
                          onStatusChanged: (newStatus) =>
                              _handleStatusChange(invoice, newStatus),
                          showConsumptionDateOnly:
                              !kIsWeb && Platform.isIOS,
                          isSelectionMode: _isSelectionMode,
                          isSelected:
                              _selectedInvoices.contains(invoice.id),
                          onLongPress: () =>
                              _enterSelectionMode(invoice.id),
                          onSelectionToggle: () =>
                              _toggleInvoiceSelection(invoice.id),
                        ),
                      );
                    },
                    childCount: groupedInvoices[monthKey]!.length,
                  ),
                ),
              ],
            ),
          ),

          // 加载更多指示器
          if (isLoadingMore)
            SliverToBoxAdapter(
              child: LoadMoreIndicator(
                isLoadingMore: true,
                message: '正在加载更多发票...',
              ),
            ),
        ],
      ),
    );
  }

  /// 构建多选工具栏
  Widget _buildSelectionToolbar(List<InvoiceEntity> allInvoices) {

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor,
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          // 关闭选择模式
          IconButton(
            onPressed: _exitSelectionMode,
            icon: const Icon(CupertinoIcons.xmark),
            tooltip: '取消选择',
          ),

          // 选择计数
          Expanded(
            child: Text(
              '已选择 ${_selectedInvoices.length} 项',
              style: AppTypography.titleMedium(context).copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),


          // 创建报销集
          if (_selectedInvoices.isNotEmpty)
            IconButton(
              onPressed: _createReimbursementSet,
              icon: const Icon(CupertinoIcons.folder_badge_plus),
              tooltip: '创建报销集',
              color: Theme.of(context).colorScheme.secondary,
            ),

          // 批量下载
          if (_selectedInvoices.isNotEmpty)
            IconButton(
              onPressed: _downloadSelectedInvoices,
              icon: const Icon(CupertinoIcons.cloud_download),
              tooltip: '下载选中项',
              color: Theme.of(context).colorScheme.primary,
            ),

          // 批量删除
          if (_selectedInvoices.isNotEmpty)
            IconButton(
              onPressed: _deleteSelectedInvoices,
              icon: const Icon(CupertinoIcons.delete),
              tooltip: '删除选中项',
              color: Theme.of(context).colorScheme.error,
            ),
        ],
      ),
    );
  }

  /// 构建错误组件
  Widget _buildErrorWidget(String message, VoidCallback onRetry) {
    final friendlyMessage =
        EnhancedErrorHandler.getFriendlyErrorMessage(message);

    return EmptyStatePlaceholder(
      title: '加载失败',
      subtitle: friendlyMessage,
      icon: CupertinoIcons.exclamationmark_triangle,
      onAction: onRetry,
      actionText: '重试',
    );
  }

  /// 查看发票详情
  void _viewInvoiceDetail(InvoiceEntity invoice) {
    context.push('/invoice-detail/${invoice.id}');
  }

  /// 显示删除确认对话框
  void _showDeleteConfirmation(InvoiceEntity invoice) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除发票'),
        content: Text(
            '确定要删除 ${invoice.sellerName ?? invoice.invoiceNumber} 吗？此操作无法撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<InvoiceBloc>().add(DeleteInvoice(invoice.id));
            },
            style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  /// 处理发票状态切换
  void _handleStatusChange(InvoiceEntity invoice, InvoiceStatus newStatus) {
    context.read<InvoiceBloc>().add(UpdateInvoiceStatus(
          invoiceId: invoice.id,
          newStatus: newStatus,
        ));
  }

  /// iOS平台：直接分享压缩包，不保存到本地
  Future<void> _shareZipFileDirectly(Uint8List zipData, int fileCount) async {
    try {
      // 生成临时文件名
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = 'invoices_${fileCount}files_$timestamp.zip';

      // 保存到临时目录
      final directory = await getTemporaryDirectory();
      final tempFile = File('${directory.path}/$fileName');
      await tempFile.writeAsBytes(zipData);

      // print('📤 [iOS分享] 创建临时文件: ${tempFile.path}');

      // 直接调用iOS分享菜单
      await Share.shareXFiles(
        [XFile(tempFile.path)],
      );

      // print('📤 [iOS分享] 已调用系统分享菜单');

      // 延迟删除临时文件，给分享菜单足够的时间
      Future.delayed(const Duration(seconds: 30), () {
        try {
          if (tempFile.existsSync()) {
            tempFile.deleteSync();
            // print('🗑️ [iOS分享] 已清理临时文件: ${tempFile.path}');
          }
        } catch (e) {
          // print('⚠️ [iOS分享] 清理临时文件失败: $e');
        }
      });
    } catch (e) {
      // print('❌ [iOS分享] 分享失败: $e');
      if (mounted) {
        AppFeedback.error(context, '分享失败: $e');
      }
    }
  }
}

/// 本月发票标签页
class _ReimbursementSetsTab extends StatefulWidget {
  @override
  State<_ReimbursementSetsTab> createState() => _ReimbursementSetsTabState();
}

class _ReimbursementSetsTabState extends State<_ReimbursementSetsTab>
    with AutomaticKeepAliveClientMixin, WidgetsBindingObserver {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // 加载报销集数据
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context
          .read<ReimbursementSetBloc>()
          .add(const LoadReimbursementSets(refresh: true));
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      // 应用从后台恢复时刷新数据
      _refreshData();
    }
  }

  void _refreshData() {
    context
        .read<ReimbursementSetBloc>()
        .add(const LoadReimbursementSets(refresh: true));
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // 支持 AutomaticKeepAliveClientMixin
    return BlocConsumer<ReimbursementSetBloc, ReimbursementSetState>(
      listener: (context, state) {
        if (state is ReimbursementSetDeleteSuccess) {
          AppFeedback.success(context, '删除成功', message: state.message);
        } else if (state is ReimbursementSetStatusUpdateSuccess) {
          AppFeedback.success(context, '状态更新成功', message: state.message);
        } else if (state is ReimbursementSetError) {
          AppFeedback.error(context, '操作失败', message: state.message);
        }
      },
      builder: (context, state) {
        if (state is ReimbursementSetLoading &&
            state is! ReimbursementSetLoaded) {
          return const InvoiceListSkeleton();
        }

        if (state is ReimbursementSetLoaded) {
          return Column(
            children: [
              // 优化后的响应式统计卡片
              ResponsiveStatsCard(reimbursementSets: state.reimbursementSets),

              // 报销集列表
              Expanded(
                child: _buildReimbursementSetsList(
                    state.reimbursementSets, state.isRefreshing),
              ),
            ],
          );
        }

        if (state is ReimbursementSetError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline,
                    size: 64, color: Theme.of(context).colorScheme.error),
                const SizedBox(height: 16),
                Text('加载失败', style: AppTypography.headlineSmall(context)),
                const SizedBox(height: 8),
                Text(state.message, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    context
                        .read<ReimbursementSetBloc>()
                        .add(const LoadReimbursementSets(refresh: true));
                  },
                  child: const Text('重试'),
                ),
              ],
            ),
          );
        }

        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.folder_copy_outlined,
                  size: 64,
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(height: 16),
              Text('暂无报销集',
                  style: TextStyle(
                      fontSize: 18,
                      color: Theme.of(context).colorScheme.onSurfaceVariant)),
              const SizedBox(height: 8),
              Text('创建您的第一个报销集吧',
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ],
          ),
        );
      },
    );
  }

  /// 构建报销集列表
  Widget _buildReimbursementSetsList(
      List<ReimbursementSetEntity> reimbursementSets, bool isRefreshing) {
    if (reimbursementSets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.folder_copy_outlined,
                size: 64,
                color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('暂无报销集',
                style: TextStyle(
                    fontSize: 18,
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 8),
            Text('在"全部发票"页面多选发票来创建报销集',
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context
            .read<ReimbursementSetBloc>()
            .add(const LoadReimbursementSets(refresh: true));
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: reimbursementSets.length,
        itemBuilder: (context, index) {
          final reimbursementSet = reimbursementSets[index];
          return OptimizedReimbursementSetCard(
            reimbursementSet: reimbursementSet,
            onTap: () => _showReimbursementSetDetail(reimbursementSet),
            onDelete: () => _showDeleteConfirmation(reimbursementSet),
            onStatusChange: (newStatus) =>
                _handleStatusChange(reimbursementSet, newStatus),
          );
        },
      ),
    );
  }

  /// 显示报销集详情
  void _showReimbursementSetDetail(ReimbursementSetEntity reimbursementSet) {
    context.push('/reimbursement-set/${reimbursementSet.id}');
  }

  /// 显示删除报销集确认对话框
  void _showDeleteConfirmation(ReimbursementSetEntity reimbursementSet) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除报销集'),
        content: Text(
            '确定要删除报销集 "${reimbursementSet.setName}" 吗？\n\n包含的发票将重新变为未分配状态。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context
                  .read<ReimbursementSetBloc>()
                  .add(DeleteReimbursementSet(reimbursementSet.id));
            },
            style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  /// 处理报销集状态变更
  void _handleStatusChange(ReimbursementSetEntity reimbursementSet,
      ReimbursementSetStatus newStatus) {
    context.read<ReimbursementSetBloc>().add(UpdateReimbursementSetStatus(
          setId: reimbursementSet.id,
          status: newStatus,
        ));
  }
}

/// 月份标题的SliverPersistentHeader委托
class _MonthHeaderDelegate extends SliverPersistentHeaderDelegate {
  final String monthKey;
  final int invoiceCount;
  final VoidCallback? onLongPress;

  _MonthHeaderDelegate({
    required this.monthKey,
    required this.invoiceCount,
    this.onLongPress,
  });

  @override
  double get minExtent => 48.0;

  @override
  double get maxExtent => 48.0;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final theme = Theme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onLongPress: onLongPress,
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            color: theme.colorScheme.surface.withValues(alpha: 0.95), // 半透明背景
            border: Border(
              bottom: BorderSide(
                color: theme.dividerColor.withValues(alpha: 0.3),
                width: 0.5,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: theme.shadowColor.withValues(alpha: 0.08),
                blurRadius: 2,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(
                  Icons.calendar_month,
                  color: theme.colorScheme.primary,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    monthKey,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$invoiceCount张',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(_MonthHeaderDelegate oldDelegate) {
    return oldDelegate.monthKey != monthKey ||
        oldDelegate.invoiceCount != invoiceCount;
  }
}

/// 收藏标签页
class _FavoritesTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocConsumer<InvoiceBloc, InvoiceState>(
      listener: (context, state) {
        if (state is InvoiceDeleteSuccess) {
          AppFeedback.success(context, state.message);
        }
      },
      buildWhen: (previous, current) =>
          current is InvoiceLoading ||
          current is InvoiceError ||
          current is InvoiceLoaded,
      builder: (context, state) {
        if (state is InvoiceLoaded) {
          // 筛选已验证的发票作为收藏
          final favoriteInvoices = state.invoices.where((invoice) {
            return invoice.isVerified; // 使用已验证字段替代状态判断
          }).toList();

          return _buildFavoritesList(context, favoriteInvoices);
        }

        return const Center(child: Text('暂无收藏的发票'));
      },
    );
  }

  Widget _buildFavoritesList(
      BuildContext context, List<InvoiceEntity> invoices) {
    if (invoices.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite_border,
                size: 64,
                color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('暂无收藏的发票',
                style: TextStyle(
                    fontSize: 18,
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: invoices.length,
      itemBuilder: (context, index) {
        final invoice = invoices[index];
        return InvoiceCardWidget(
          invoice: invoice,
          onTap: () => context.push('/invoice-detail/${invoice.id}'),
          onDelete: () => _showDeleteConfirmation(context, invoice),
          onStatusChanged: (newStatus) =>
              _handleStatusChange(context, invoice, newStatus),
          showConsumptionDateOnly: !kIsWeb && Platform.isIOS,
        );
      },
    );
  }

  void _showDeleteConfirmation(BuildContext context, InvoiceEntity invoice) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除发票'),
        content: Text(
            '确定要删除 ${invoice.sellerName ?? invoice.invoiceNumber} 吗？此操作无法撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<InvoiceBloc>().add(DeleteInvoice(invoice.id));
            },
            style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  void _handleStatusChange(
      BuildContext context, InvoiceEntity invoice, InvoiceStatus newStatus) {
    context.read<InvoiceBloc>().add(UpdateInvoiceStatus(
          invoiceId: invoice.id,
          newStatus: newStatus,
        ));
  }
}
