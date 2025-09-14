/// 收件箱主页面
/// 整合邮件列表、过滤器、统计信息等功能
library;

import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/di/injection_container.dart';
import '../../../domain/entities/email_filters.dart';
import '../../../domain/repositories/inbox_repository.dart';
import '../../../core/network/supabase_client.dart';
import '../../bloc/inbox/inbox_bloc.dart';
import '../../bloc/inbox/inbox_event.dart';
import '../../bloc/inbox/inbox_state.dart';
import '../../widgets/inbox/email_list_item.dart';
import '../../widgets/inbox/inbox_stats_widget.dart';
import '../../widgets/inbox/email_filters_widget.dart';
import '../../widgets/inbox/email_detail_sheet.dart';
import '../../widgets/common/loading_widget.dart';
import '../../widgets/common/error_widget.dart' as custom_error;

class InboxPage extends StatefulWidget {
  const InboxPage({super.key});

  @override
  State<InboxPage> createState() => _InboxPageState();
}

class _InboxPageState extends State<InboxPage> with AutomaticKeepAliveClientMixin {
  late ScrollController _scrollController;
  
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _scrollController.addListener(_onScroll);
    
    // 初始化时加载数据
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadInitialData();
    });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  /// 加载初始数据
  void _loadInitialData() {
    final currentUser = SupabaseClientManager.currentUser;
    if (currentUser != null) {
      final userId = currentUser.id;
      context.read<InboxBloc>().add(LoadEmailsRequested(userId: userId));
      context.read<InboxBloc>().add(LoadInboxStatsRequested(userId: userId));
    }
  }

  /// 监听滚动事件，实现无限滚动
  void _onScroll() {
    if (_scrollController.position.pixels >= 
        _scrollController.position.maxScrollExtent - 200) {
      final currentUser = SupabaseClientManager.currentUser;
      if (currentUser != null) {
        context.read<InboxBloc>().add(LoadMoreEmailsRequested(userId: currentUser.id));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final colorScheme = Theme.of(context).colorScheme;

    return CupertinoPageScaffold(
      backgroundColor: colorScheme.surface,
      navigationBar: _buildNavigationBar(colorScheme),
      child: SafeArea(
        child: BlocConsumer<InboxBloc, InboxState>(
          listener: _handleBlocStateChanges,
          builder: (context, state) {
            return Column(
              children: [
                // 固定头部区域：统计信息 + 过滤器
                Container(
                  color: colorScheme.surface,
                  child: Column(
                    children: [
                      // 统计信息区域
                      _buildStatsWidget(state, colorScheme),
                      
                      // 过滤器区域
                      _buildFiltersWidget(state, colorScheme),
                      
                      // 分隔线
                      Container(
                        height: 1,
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: colorScheme.outline.withValues(alpha: 0.12),
                              width: 0.5,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // 可滚动的邮件列表区域
                Expanded(
                  child: _buildScrollableEmailList(state, colorScheme),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  /// 构建导航栏
  CupertinoNavigationBar _buildNavigationBar(ColorScheme colorScheme) {
    return CupertinoNavigationBar(
      backgroundColor: colorScheme.surface,
      border: Border(
        bottom: BorderSide(
          color: colorScheme.outline.withValues(alpha: 0.2),
          width: 0.5,
        ),
      ),
      leading: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          context.go('/');
        },
        child: Icon(
          CupertinoIcons.back,
          color: colorScheme.primary,
        ),
      ),
      middle: Text(
        '收件箱',
        style: TextStyle(
          color: colorScheme.onSurface,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: BlocBuilder<InboxBloc, InboxState>(
        builder: (context, state) {
          return GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              _handleRefresh();
            },
            child: Icon(
              CupertinoIcons.refresh,
              color: state is InboxLoading && state.isRefreshing
                  ? colorScheme.onSurface.withValues(alpha: 0.3)
                  : colorScheme.primary,
            ),
          );
        },
      ),
    );
  }

  /// 构建统计信息Widget（非Sliver版本）
  Widget _buildStatsWidget(InboxState state, ColorScheme colorScheme) {
    if (state is InboxLoaded) {
      return InboxStatsWidget(
        stats: state.stats,
        isLoading: state.isRefreshing,
      );
    } else if (state is InboxEmpty) {
      return InboxStatsWidget(
        stats: state.stats,
        isLoading: false,
      );
    }
    return const SizedBox.shrink();
  }

  /// 构建过滤器Widget（非Sliver版本）
  Widget _buildFiltersWidget(InboxState state, ColorScheme colorScheme) {
    EmailFilters filters = const EmailFilters();
    
    if (state is InboxLoaded) {
      filters = state.activeFilters;
    } else if (state is InboxEmpty) {
      filters = state.activeFilters;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: EmailFiltersWidget(
        filters: filters,
        onFiltersChanged: (newFilters) {
          context.read<InboxBloc>().add(EmailFiltersChanged(filters: newFilters));
        },
        onClearFilters: () {
          context.read<InboxBloc>().add(
            EmailFiltersChanged(filters: const EmailFilters()),
          );
        },
      ),
    );
  }

  /// 构建可滚动的邮件列表
  Widget _buildScrollableEmailList(InboxState state, ColorScheme colorScheme) {
    if (state is InboxLoading && state.isFirstLoad) {
      return Center(
        child: LoadingWidget(
          message: '正在加载邮件列表...',
          color: colorScheme.primary,
        ),
      );
    }

    if (state is InboxError) {
      return Center(
        child: custom_error.ErrorWidget(
          message: state.message,
          onRetry: state.canRetry ? _handleRetry : null,
        ),
      );
    }

    if (state is InboxEmpty) {
      return SingleChildScrollView(
        child: _buildEmptyState(state, colorScheme),
      );
    }

    if (state is InboxLoaded) {
      return ListView.builder(
        controller: _scrollController,
        physics: const BouncingScrollPhysics(), // iOS风格滚动
        padding: const EdgeInsets.only(
          top: 8,
          bottom: 20,
        ),
        itemCount: state.emails.length + (state.isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          // 加载更多指示器
          if (index == state.emails.length) {
            return _buildLoadMoreIndicatorNonSliver(colorScheme);
          }
          
          // 邮件项
          final email = state.emails[index];
          return EmailListItem(
            email: email,
            isSelected: email.id == state.selectedEmailId,
            onTap: () => _handleEmailTap(email.id),
            onMarkAsRead: () => _handleMarkAsRead(email.id),
            onDelete: () => _handleDeleteEmail(email.id),
          );
        },
      );
    }

    return const SizedBox.shrink();
  }

  /// 构建加载更多指示器（非Sliver版本）
  Widget _buildLoadMoreIndicatorNonSliver(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: colorScheme.primary,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              '加载更多邮件...',
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建空状态
  Widget _buildEmptyState(InboxEmpty state, ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(40),
            ),
            child: Icon(
              state.activeFilters.hasFilters 
                ? CupertinoIcons.search 
                : CupertinoIcons.mail,
              size: 40,
              color: colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          
          const SizedBox(height: 20),
          
          Text(
            state.displayMessage,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
              height: 1.4,
            ),
          ),
          
          if (state.activeFilters.hasFilters) ...[
            const SizedBox(height: 20),
            CupertinoButton(
              onPressed: () {
                context.read<InboxBloc>().add(
                  EmailFiltersChanged(filters: const EmailFilters()),
                );
              },
              color: colorScheme.primary,
              borderRadius: BorderRadius.circular(25),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              child: const Text(
                '清除过滤条件',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// 处理BLoC状态变化
  void _handleBlocStateChanges(BuildContext context, InboxState state) {
    // 处理操作成功状态
    if (state is InboxOperationSuccess) {
      _showSuccessMessage(state.successMessage);
      
      // 自动返回到加载状态
      final inboxBloc = context.read<InboxBloc>();
      Future.delayed(const Duration(milliseconds: 1500), () {
        if (mounted) {
          final currentUser = SupabaseClientManager.currentUser;
          if (currentUser != null) {
            inboxBloc.add(RefreshRequested(userId: currentUser.id));
          }
        }
      });
    }

    // 处理操作错误状态
    if (state is InboxError && state.previousState != null) {
      _showErrorMessage(state.message);
    }
  }

  /// 处理邮件点击
  void _handleEmailTap(String emailId) async {
    final currentUser = SupabaseClientManager.currentUser;
    if (currentUser == null) return;

    // 选择邮件
    context.read<InboxBloc>().add(EmailSelected(emailId: emailId));

    try {
      // 获取邮件详情
      final repository = sl<InboxRepository>();
      final result = await repository.getEmailDetail(
        emailId: emailId,
        userId: currentUser.id,
      );
      
      if (result.isSuccess && mounted) {
        // 显示邮件详情
        await EmailDetailSheet.show(
          context: context,
          emailDetail: result.data,
          onMarkAsRead: () => _handleMarkAsRead(emailId),
          onDelete: () => _handleDeleteEmail(emailId),
        );
      } else if (mounted) {
        _showErrorMessage(result.error);
      }
    } catch (e) {
      if (mounted) {
        _showErrorMessage('获取邮件详情失败: ${e.toString()}');
      }
    }
  }

  /// 处理标记已读
  void _handleMarkAsRead(String emailId) {
    final currentUser = SupabaseClientManager.currentUser;
    if (currentUser != null) {
      context.read<InboxBloc>().add(MarkEmailAsReadRequested(
        emailId: emailId,
        userId: currentUser.id,
      ));
    }
  }

  /// 处理删除邮件
  void _handleDeleteEmail(String emailId) {
    final currentUser = SupabaseClientManager.currentUser;
    if (currentUser != null) {
      context.read<InboxBloc>().add(DeleteEmailRequested(
        emailId: emailId,
        userId: currentUser.id,
      ));
    }
  }

  /// 处理刷新
  void _handleRefresh() {
    final currentUser = SupabaseClientManager.currentUser;
    if (currentUser != null) {
      context.read<InboxBloc>().add(RefreshRequested(userId: currentUser.id));
    }
  }

  /// 处理重试
  void _handleRetry() {
    final currentUser = SupabaseClientManager.currentUser;
    if (currentUser != null) {
      context.read<InboxBloc>().add(RetryRequested(userId: currentUser.id));
    }
  }

  /// 显示成功消息
  void _showSuccessMessage(String message) {
    if (!mounted) return;
    
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              CupertinoIcons.checkmark_circle_fill,
              color: CupertinoColors.systemGreen,
              size: 20,
            ),
            const SizedBox(width: 8),
            const Text('成功'),
          ],
        ),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            child: const Text('确定'),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }

  /// 显示错误消息
  void _showErrorMessage(String message) {
    if (!mounted) return;
    
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              CupertinoIcons.exclamationmark_triangle_fill,
              color: CupertinoColors.systemRed,
              size: 20,
            ),
            const SizedBox(width: 8),
            const Text('错误'),
          ],
        ),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            child: const Text('确定'),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }
}