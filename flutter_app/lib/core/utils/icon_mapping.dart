import 'package:flutter/cupertino.dart';

/// Material Icons 到 CupertinoIcons 的映射表
/// 用于统一应用图标风格
class IconMapping {
  static const Map<String, IconData> _iconMap = {
    // 状态和反馈图标
    'error_outline': CupertinoIcons.exclamationmark_triangle,
    'error': CupertinoIcons.exclamationmark_triangle,
    'warning': CupertinoIcons.exclamationmark_triangle,
    'check_circle': CupertinoIcons.checkmark_circle_fill,
    'info': CupertinoIcons.info_circle,
    'done': CupertinoIcons.checkmark,
    'check': CupertinoIcons.checkmark,
    
    // 文档和内容图标
    'picture_as_pdf': CupertinoIcons.doc_text,
    'receipt_long': CupertinoIcons.doc_text,
    'receipt_outlined': CupertinoIcons.doc,
    'description': CupertinoIcons.doc_text,
    'content_copy': CupertinoIcons.doc_on_clipboard,
    
    // 操作图标
    'delete': CupertinoIcons.delete,
    'refresh': CupertinoIcons.refresh,
    'visibility': CupertinoIcons.eye,
    'share': CupertinoIcons.share,
    'upload': CupertinoIcons.cloud_upload,
    'download': CupertinoIcons.cloud_download,
    
    // 金融和商务图标
    'attach_money': CupertinoIcons.money_dollar_circle,
    'monetization_on': CupertinoIcons.money_dollar,
    'trending_up': CupertinoIcons.graph_circle,
    'analytics': CupertinoIcons.chart_bar,
    
    // 购物和交易图标
    'shopping_cart_outlined': CupertinoIcons.cart,
    'shopping_cart': CupertinoIcons.cart_fill,
    
    // 日期和时间图标
    'calendar_month': CupertinoIcons.calendar,
    'schedule': CupertinoIcons.clock,
    'access_time': CupertinoIcons.time,
    
    // 导航图标
    'home': CupertinoIcons.home,
    'home_outlined': CupertinoIcons.house,
    'settings': CupertinoIcons.settings,
    'person': CupertinoIcons.person,
    'menu': CupertinoIcons.line_horizontal_3,
    
    // 编辑和输入图标
    'edit': CupertinoIcons.pencil,
    'add': CupertinoIcons.add,
    'remove': CupertinoIcons.minus,
    'clear': CupertinoIcons.clear,
    'search': CupertinoIcons.search,
    
    // 媒体和查看图标
    'image': CupertinoIcons.photo,
    'camera': CupertinoIcons.camera,
    'folder': CupertinoIcons.folder,
    'file_copy': CupertinoIcons.doc_on_doc,
    
    // 通信图标
    'email': CupertinoIcons.mail,
    'phone': CupertinoIcons.phone,
    'message': CupertinoIcons.chat_bubble,
    
    // 系统图标
    'close': CupertinoIcons.xmark,
    'arrow_back': CupertinoIcons.back,
    'arrow_forward': CupertinoIcons.forward,
    'keyboard_arrow_down': CupertinoIcons.chevron_down,
    'keyboard_arrow_up': CupertinoIcons.chevron_up,
    'keyboard_arrow_right': CupertinoIcons.chevron_right,
    'keyboard_arrow_left': CupertinoIcons.chevron_left,
    
    // 更多图标
    'more_vert': CupertinoIcons.ellipsis_vertical,
    'more_horiz': CupertinoIcons.ellipsis,
    'star': CupertinoIcons.star_fill,
    'star_outline': CupertinoIcons.star,
    'favorite': CupertinoIcons.heart_fill,
    'favorite_outline': CupertinoIcons.heart,
  };

  /// 获取对应的 CupertinoIcon
  /// 如果没有找到映射，返回默认图标
  static IconData getCupertinoIcon(String materialIconName, {IconData? fallback}) {
    return _iconMap[materialIconName] ?? fallback ?? CupertinoIcons.question_circle;
  }

  /// 检查是否有对应的映射
  static bool hasMapping(String materialIconName) {
    return _iconMap.containsKey(materialIconName);
  }

  /// 获取所有可用的映射
  static Map<String, IconData> get allMappings => Map.unmodifiable(_iconMap);
}