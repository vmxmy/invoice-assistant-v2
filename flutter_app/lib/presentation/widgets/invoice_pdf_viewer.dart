import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/network/supabase_client.dart';

/// 发票PDF查看器组件
class InvoicePdfViewer extends StatefulWidget {
  final String pdfUrl;
  final String? filePath; // 添加filePath参数
  final String heroTag;

  const InvoicePdfViewer({
    super.key,
    required this.pdfUrl,
    this.filePath,
    required this.heroTag,
  });

  @override
  State<InvoicePdfViewer> createState() => _InvoicePdfViewerState();
}

class _InvoicePdfViewerState extends State<InvoicePdfViewer> {
  bool _hasError = false;
  bool _isLoading = true;
  String? _errorMessage;
  String? _signedUrl;

  @override
  void initState() {
    super.initState();
    _loadSignedUrl();
  }

  Future<void> _loadSignedUrl() async {
    try {
      String? filePath;

      // 优先使用 filePath，如果没有则从 fileUrl 解析
      if (widget.filePath != null && widget.filePath!.isNotEmpty) {
        filePath = widget.filePath;
        // print('📄 [PDF] 使用 filePath: $filePath');
      } else {
        // 从完整URL提取文件路径（fallback方式）
        filePath = SupabaseClientManager.extractFilePathFromUrl(widget.pdfUrl);
        // print('📄 [PDF] 从 URL 解析 filePath: $filePath');
      }

      if (filePath == null || filePath.isEmpty) {
        throw Exception('文件路径不能为空');
      }

      // 获取签名URL
      final signedUrl = await SupabaseClientManager.getSignedUrl(
        bucketName: 'invoice-files',
        filePath: filePath,
        expiresIn: 3600, // 1小时过期
      );

      if (mounted) {
        setState(() {
          _signedUrl = signedUrl;
          _isLoading = false;
          _hasError = false;
        });
      }

      // print('📄 [PDF] 签名URL获取成功: $signedUrl');
    } catch (e) {
      // print('📄 [PDF] 签名URL获取失败: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showFullScreenPdf(context),
      child: Hero(
        tag: widget.heroTag,
        child: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // PDF预览
                if (_signedUrl != null && !_hasError)
                  kIsWeb
                      ? _buildWebPdfPreview()
                      : SfPdfViewer.network(
                          _signedUrl!,
                          enableDoubleTapZooming: false,
                          enableTextSelection: false,
                          canShowScrollHead: false,
                          canShowScrollStatus: false,
                          canShowPaginationDialog: false,
                          onDocumentLoaded: (details) {
                            // print('📄 [PDF] 文档加载成功: ${details.document.pages.count} 页');
                          },
                          onDocumentLoadFailed: (details) {
                            // print('📄 [PDF] 文档加载失败: ${details.error}');
                            // print('📄 [PDF] 完整签名URL: $_signedUrl');
                            // print('📄 [PDF] 错误详情: ${details.description}');
                            if (mounted) {
                              setState(() {
                                _hasError = true;
                                _errorMessage = details.error;
                              });
                            }
                          },
                        ),

                // 加载中指示器
                if (_isLoading)
                  Container(
                    color: Theme.of(context)
                        .colorScheme
                        .surface
                        .withValues(alpha: 0.8),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(),
                          const SizedBox(height: 16),
                          Text(
                            '正在加载PDF...',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.outline,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                // 错误状态
                if (_hasError)
                  Container(
                    color: Theme.of(context).colorScheme.surface,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.picture_as_pdf,
                              size: 48,
                              color: Theme.of(context).colorScheme.error,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'PDF加载失败',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _getErrorMessage(_errorMessage),
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.outline,
                                fontSize: 12,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            OutlinedButton.icon(
                              onPressed: () => _retryLoadPdf(),
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('重试'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor:
                                    Theme.of(context).colorScheme.error,
                                side: BorderSide(
                                    color: Theme.of(context).colorScheme.error),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                // 预览提示
                if (!_hasError && !_isLoading)
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .inverseSurface
                            .withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.fullscreen,
                            size: 16,
                            color:
                                Theme.of(context).colorScheme.onInverseSurface,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '点击查看',
                            style: TextStyle(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onInverseSurface,
                              fontSize: 12,
                            ),
                          ),
                        ],
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

  String _getErrorMessage(String? error) {
    if (error == null) return '未知错误';

    if (error.toLowerCase().contains('network')) {
      return '网络连接问题';
    } else if (error.toLowerCase().contains('403')) {
      return '访问权限不足';
    } else if (error.toLowerCase().contains('404')) {
      return '文件不存在';
    } else if (error.toLowerCase().contains('timeout')) {
      return '加载超时';
    } else {
      return '加载失败';
    }
  }

  void _retryLoadPdf() {
    setState(() {
      _hasError = false;
      _isLoading = true;
      _errorMessage = null;
      _signedUrl = null;
    });
    _loadSignedUrl();
  }

  Widget _buildWebPdfPreview() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.picture_as_pdf,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'PDF预览',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '点击在新窗口中查看',
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchPdfUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication, // 在新标签页中打开
          webOnlyWindowName: '_blank',
        );
        // print('📄 [PDF] 在新窗口打开PDF: $url');
      } else {
        throw Exception('无法打开URL');
      }
    } catch (e) {
      // print('📄 [PDF] 打开新窗口失败: $e');
      // 显示错误信息
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('无法在新窗口中打开PDF: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  void _showFullScreenPdf(BuildContext context) {
    if (_hasError || _isLoading) return;

    if (kIsWeb) {
      // Web平台：使用url_launcher在新窗口打开PDF
      if (_signedUrl != null) {
        _launchPdfUrl(_signedUrl!);
      }
    } else {
      // 移动平台：使用全屏PDF查看器
      Navigator.of(context).push(
        PageRouteBuilder(
          opaque: false,
          barrierDismissible: true,
          barrierColor: Theme.of(context)
              .colorScheme
              .inverseSurface
              .withValues(alpha: 0.87),
          pageBuilder: (context, animation, secondaryAnimation) {
            return FullScreenPdfViewer(
              pdfUrl: _signedUrl ?? widget.pdfUrl,
              filePath: widget.filePath,
              heroTag: widget.heroTag,
            );
          },
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
        ),
      );
    }
  }
}

/// 全屏PDF查看器
class FullScreenPdfViewer extends StatefulWidget {
  final String pdfUrl;
  final String? filePath; // 添加filePath参数
  final String heroTag;

  const FullScreenPdfViewer({
    super.key,
    required this.pdfUrl,
    this.filePath,
    required this.heroTag,
  });

  @override
  State<FullScreenPdfViewer> createState() => _FullScreenPdfViewerState();
}

class _FullScreenPdfViewerState extends State<FullScreenPdfViewer> {
  late PdfViewerController _pdfController;
  int _currentPage = 1;
  int _totalPages = 0;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _pdfController = PdfViewerController();

    // 设置沉浸式状态栏
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
  }

  @override
  void dispose() {
    _pdfController.dispose();

    // 恢复状态栏
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor:
          Theme.of(context).colorScheme.inverseSurface.withValues(alpha: 0.87),
      body: Stack(
        children: [
          // PDF查看器
          Center(
            child: Hero(
              tag: widget.heroTag,
              child: SizedBox(
                width: double.infinity,
                height: double.infinity,
                child: SfPdfViewer.network(
                  widget.pdfUrl,
                  controller: _pdfController,
                  enableDoubleTapZooming: true,
                  enableTextSelection: true,
                  canShowScrollHead: true,
                  canShowScrollStatus: false,
                  canShowPaginationDialog: true,
                  onDocumentLoaded: (details) {
                    setState(() {
                      _isLoading = false;
                      _hasError = false;
                      _totalPages = details.document.pages.count;
                    });
                  },
                  onDocumentLoadFailed: (details) {
                    setState(() {
                      _isLoading = false;
                      _hasError = true;
                      _errorMessage = details.error;
                    });
                  },
                  onPageChanged: (details) {
                    setState(() {
                      _currentPage = details.newPageNumber;
                    });
                  },
                ),
              ),
            ),
          ),

          // 加载中指示器
          if (_isLoading)
            Container(
              color: Theme.of(context)
                  .colorScheme
                  .inverseSurface
                  .withValues(alpha: 0.87),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(
                        color: Theme.of(context).colorScheme.onInverseSurface),
                    const SizedBox(height: 16),
                    Text(
                      '正在加载PDF文档...',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onInverseSurface,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // 错误状态
          if (_hasError)
            Container(
              color: Theme.of(context)
                  .colorScheme
                  .inverseSurface
                  .withValues(alpha: 0.87),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Theme.of(context).colorScheme.onInverseSurface,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'PDF加载失败',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onInverseSurface,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _errorMessage ?? '未知错误',
                      style: TextStyle(
                        color: Theme.of(context)
                            .colorScheme
                            .onInverseSurface
                            .withValues(alpha: 0.7),
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close),
                      label: const Text('关闭'),
                      style: ElevatedButton.styleFrom(
                        foregroundColor:
                            Theme.of(context).colorScheme.onSurface,
                        backgroundColor: Theme.of(context).colorScheme.surface,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // 顶部操作栏
          if (!_isLoading && !_hasError)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: EdgeInsets.only(
                  top: MediaQuery.of(context).padding.top + 8,
                  bottom: 8,
                  left: 8,
                  right: 8,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Theme.of(context)
                          .colorScheme
                          .inverseSurface
                          .withValues(alpha: 0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: Icon(
                        Icons.close,
                        color: Theme.of(context).colorScheme.onInverseSurface,
                        size: 28,
                      ),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    Expanded(
                      child: Text(
                        '第 $_currentPage 页，共 $_totalPages 页',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onInverseSurface,
                          fontSize: 16,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.share,
                        color: Theme.of(context).colorScheme.onInverseSurface,
                        size: 24,
                      ),
                      onPressed: _sharePdf,
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.download,
                        color: Theme.of(context).colorScheme.onInverseSurface,
                        size: 24,
                      ),
                      onPressed: _downloadPdf,
                    ),
                  ],
                ),
              ),
            ),

          // 底部导航栏
          if (!_isLoading && !_hasError && _totalPages > 1)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: EdgeInsets.only(
                  bottom: MediaQuery.of(context).padding.bottom + 16,
                  top: 16,
                  left: 16,
                  right: 16,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Theme.of(context)
                          .colorScheme
                          .inverseSurface
                          .withValues(alpha: 0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton(
                      onPressed: _currentPage > 1 ? _previousPage : null,
                      icon: Icon(
                        Icons.navigate_before,
                        color: Theme.of(context).colorScheme.onInverseSurface,
                        size: 32,
                      ),
                    ),
                    IconButton(
                      onPressed: _jumpToPage,
                      icon: Icon(
                        Icons.apps,
                        color: Theme.of(context).colorScheme.onInverseSurface,
                        size: 24,
                      ),
                    ),
                    IconButton(
                      onPressed: _currentPage < _totalPages ? _nextPage : null,
                      icon: Icon(
                        Icons.navigate_next,
                        color: Theme.of(context).colorScheme.onInverseSurface,
                        size: 32,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _previousPage() {
    if (_currentPage > 1) {
      _pdfController.previousPage();
    }
  }

  void _nextPage() {
    if (_currentPage < _totalPages) {
      _pdfController.nextPage();
    }
  }

  void _jumpToPage() {
    _pdfController.jumpToPage(_currentPage);
  }

  void _sharePdf() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('分享功能开发中...'),
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
    );
  }

  void _downloadPdf() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('下载功能开发中...'),
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
    );
  }
}
