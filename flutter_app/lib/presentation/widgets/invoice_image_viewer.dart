import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 发票图片查看器组件
class InvoiceImageViewer extends StatefulWidget {
  final String imageUrl;
  final String heroTag;

  const InvoiceImageViewer({
    super.key,
    required this.imageUrl,
    required this.heroTag,
  });

  @override
  State<InvoiceImageViewer> createState() => _InvoiceImageViewerState();
}

class _InvoiceImageViewerState extends State<InvoiceImageViewer> {
  bool _hasError = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showFullScreenImage(context),
      child: Hero(
        tag: widget.heroTag,
        child: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(8),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // 图片
                Image.network(
                  widget.imageUrl,
                  fit: BoxFit.cover,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) {
                          setState(() {
                            _hasError = false;
                          });
                        }
                      });
                      return child;
                    }
                    
                    return Center(
                      child: CircularProgressIndicator(
                        value: loadingProgress.expectedTotalBytes != null
                            ? loadingProgress.cumulativeBytesLoaded /
                                loadingProgress.expectedTotalBytes!
                            : null,
                      ),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted) {
                        setState(() {
                          _hasError = true;
                        });
                      }
                    });
                    
                    // 调试输出错误信息
                    print('🖼️ [图片加载失败] URL: ${widget.imageUrl}');
                    print('🖼️ [错误详情] $error');
                    
                    return Center(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.broken_image,
                              size: 48,
                              color: Colors.grey,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              '图片加载失败',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              '图片加载失败',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            OutlinedButton.icon(
                              onPressed: () => setState(() { _hasError = false; }),
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('重试'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.grey,
                                side: const BorderSide(color: Colors.grey),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                
                // 预览提示
                if (!_hasError)
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.zoom_in,
                            size: 16,
                            color: Colors.white,
                          ),
                          SizedBox(width: 4),
                          Text(
                            '点击查看',
                            style: TextStyle(
                              color: Colors.white,
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

  void _showFullScreenImage(BuildContext context) {
    if (_hasError) return;
    
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black87,
        pageBuilder: (context, animation, secondaryAnimation) {
          return FullScreenImageViewer(
            imageUrl: widget.imageUrl,
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

/// 全屏图片查看器
class FullScreenImageViewer extends StatefulWidget {
  final String imageUrl;
  final String heroTag;

  const FullScreenImageViewer({
    super.key,
    required this.imageUrl,
    required this.heroTag,
  });

  @override
  State<FullScreenImageViewer> createState() => _FullScreenImageViewerState();
}

class _FullScreenImageViewerState extends State<FullScreenImageViewer>
    with SingleTickerProviderStateMixin {
  late TransformationController _transformationController;
  late AnimationController _animationController;
  Animation<Matrix4>? _animation;

  @override
  void initState() {
    super.initState();
    _transformationController = TransformationController();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    
    // 设置沉浸式状态栏
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
  }

  @override
  void dispose() {
    _transformationController.dispose();
    _animationController.dispose();
    
    // 恢复状态栏
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: GestureDetector(
        onTap: () => Navigator.of(context).pop(),
        child: Container(
          width: double.infinity,
          height: double.infinity,
          color: Colors.black87,
          child: Stack(
            children: [
              // 图片查看器
              Center(
                child: Hero(
                  tag: widget.heroTag,
                  child: InteractiveViewer(
                    transformationController: _transformationController,
                    minScale: 0.5,
                    maxScale: 4.0,
                    onInteractionEnd: (details) {
                      _resetAnimation();
                    },
                    child: Image.network(
                      widget.imageUrl,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) {
                        return const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.broken_image,
                                size: 64,
                                color: Colors.white,
                              ),
                              SizedBox(height: 16),
                              Text(
                                '图片加载失败',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
              
              // 顶部操作栏
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
                        Colors.black.withValues(alpha: 0.7),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(
                          Icons.close,
                          color: Colors.white,
                          size: 28,
                        ),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(
                          Icons.share,
                          color: Colors.white,
                          size: 24,
                        ),
                        onPressed: _shareImage,
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.download,
                          color: Colors.white,
                          size: 24,
                        ),
                        onPressed: _downloadImage,
                      ),
                    ],
                  ),
                ),
              ),
              
              // 底部提示
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
                        Colors.black.withValues(alpha: 0.7),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: const Text(
                    '双指缩放查看 • 双击重置 • 点击空白区域关闭',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _resetAnimation() {
    // 如果缩放比例接近1，则重置变换
    final scale = _transformationController.value.getMaxScaleOnAxis();
    if (scale < 1.1 && scale > 0.9) {
      _animation = Matrix4Tween(
        begin: _transformationController.value,
        end: Matrix4.identity(),
      ).animate(CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ));
      
      _animation!.addListener(() {
        _transformationController.value = _animation!.value;
      });
      
      _animationController.forward(from: 0);
    }
  }

  void _shareImage() {
    // 实现图片分享功能
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('分享功能开发中...'),
        backgroundColor: Colors.black,
      ),
    );
  }

  void _downloadImage() {
    // 实现图片下载功能
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('下载功能开发中...'),
        backgroundColor: Colors.black,
      ),
    );
  }
}