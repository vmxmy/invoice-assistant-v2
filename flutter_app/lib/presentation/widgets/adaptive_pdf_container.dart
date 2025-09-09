import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../../core/network/supabase_client.dart';

/// 自适应高度的PDF容器
class AdaptivePdfContainer extends StatefulWidget {
  final String pdfUrl;
  final String? filePath;
  final String heroTag;
  final double minHeight;
  final double maxHeight;

  const AdaptivePdfContainer({
    super.key,
    required this.pdfUrl,
    this.filePath,
    required this.heroTag,
    this.minHeight = 300,
    this.maxHeight = 800,
  });

  @override
  State<AdaptivePdfContainer> createState() => _AdaptivePdfContainerState();
}

class _AdaptivePdfContainerState extends State<AdaptivePdfContainer> {
  double _calculatedHeight;
  bool _isCalculating = true;
  String? _signedUrl;
  bool _hasError = false;
  String? _errorMessage;
  DateTime? _pdfLoadStartTime;
  
  _AdaptivePdfContainerState() : _calculatedHeight = 300;
  
  @override
  void initState() {
    super.initState();
    _calculateUniversalHeight();
    _loadSignedUrl();
  }

  void _calculateUniversalHeight() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      
      final screenWidth = MediaQuery.of(context).size.width;
      final containerWidth = screenWidth - 64;
      
      // 使用横向A4比例 (297x210mm ≈ 0.707)
      const double landscapeA4Ratio = 0.707; // 横向A4比例
      double universalHeight = containerWidth * landscapeA4Ratio;
      universalHeight = universalHeight.clamp(widget.minHeight, widget.maxHeight);
      
      print('📄 [AdaptivePDF] 使用横向A4比例高度: $universalHeight');
      
      setState(() {
        _calculatedHeight = universalHeight;
        _isCalculating = false; // 直接设置为完成状态
      });
    });
  }

  Future<void> _loadSignedUrl() async {
    try {
      String? filePath;
      if (widget.filePath != null && widget.filePath!.isNotEmpty) {
        filePath = widget.filePath;
        print('📄 [AdaptivePDF] 使用 filePath: $filePath');
      } else {
        filePath = SupabaseClientManager.extractFilePathFromUrl(widget.pdfUrl);
        print('📄 [AdaptivePDF] 从 URL 解析 filePath: $filePath');
      }
      
      if (filePath == null || filePath.isEmpty) {
        throw Exception('文件路径不能为空');
      }
      
      final signedUrl = await SupabaseClientManager.getSignedUrl(
        bucketName: 'invoice-files',
        filePath: filePath,
        expiresIn: 3600,
      );
      
      if (mounted) {
        setState(() {
          _signedUrl = signedUrl;
          _hasError = false;
        });
      }
      
      print('📄 [AdaptivePDF] 签名URL获取成功');
      print('📄 [AdaptivePDF] 准备创建SfPdfViewer widget');
      _pdfLoadStartTime = DateTime.now();
      
    } catch (e) {
      print('📄 [AdaptivePDF] 签名URL获取失败: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
          _isCalculating = false;
          _errorMessage = e.toString();
        });
      }
    }
  }


  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return Container(
        height: widget.minHeight,
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text('PDF加载失败', style: TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
              Text(
                _errorMessage ?? '未知错误',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () {
                  setState(() {
                    _hasError = false;
                    _isCalculating = true;
                    _errorMessage = null;
                    _signedUrl = null;
                  });
                  _loadSignedUrl();
                },
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      );
    }

    if (_isCalculating || _signedUrl == null) {
      return SizedBox(
        height: widget.minHeight,
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                '正在加载发票',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    print('📄 [AdaptivePDF] 构建PDF查看器 - 高度: $_calculatedHeight');
    
    return GestureDetector(
      onTap: () => _showFullScreenPdf(),
      child: Container(
        height: _calculatedHeight,
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(8),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SfPdfViewer.network(
            _signedUrl!,
            enableDoubleTapZooming: false,
            enableTextSelection: false,
            canShowScrollHead: false,
            canShowScrollStatus: false,
            canShowPaginationDialog: false,
            onDocumentLoaded: (PdfDocumentLoadedDetails details) {
              final loadTime = _pdfLoadStartTime != null 
                  ? DateTime.now().difference(_pdfLoadStartTime!).inMilliseconds
                  : -1;
              print('📄 [AdaptivePDF] PDF加载完成 - 耗时: ${loadTime}ms, 页数: ${details.document.pages.count}');
            },
            onDocumentLoadFailed: (PdfDocumentLoadFailedDetails details) {
              print('📄 [AdaptivePDF] SfPdfViewer PDF加载失败: ${details.error}');
              print('📄 [AdaptivePDF] 失败详情: ${details.description}');
              if (mounted) {
                setState(() {
                  _hasError = true;
                  _isCalculating = false;
                  _errorMessage = details.error;
                });
              }
            },
          ),
        ),
      ),
    );
  }

  void _showFullScreenPdf() {
    if (_signedUrl == null) return;
    
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black87,
        pageBuilder: (context, animation, secondaryAnimation) {
          return Scaffold(
            backgroundColor: Colors.black87,
            body: Stack(
              children: [
                Center(
                  child: SfPdfViewer.network(
                    _signedUrl!,
                    enableDoubleTapZooming: true,
                    enableTextSelection: true,
                    canShowScrollHead: true,
                    canShowScrollStatus: false,
                    canShowPaginationDialog: true,
                  ),
                ),
                Positioned(
                  top: MediaQuery.of(context).padding.top + 16,
                  right: 16,
                  child: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white, size: 28),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
              ],
            ),
          );
        },
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }
}