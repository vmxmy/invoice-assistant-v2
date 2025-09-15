import 'package:flutter/cupertino.dart';

/// Material图标到Cupertino图标的适配器
///
/// 为了实现纯Cupertino架构，将所有Material图标替换为对应的Cupertino图标
/// 保持语义一致性和视觉连贯性
class IconAdapter {
  IconAdapter._();

  /// Material Icons 到 Cupertino Icons 的映射表
  static const Map<String, IconData> _iconMapping = {
    // 文档类图标
    'Icons.description': CupertinoIcons.doc_text,
    'Icons.picture_as_pdf': CupertinoIcons.doc_text_fill,
    'Icons.image': CupertinoIcons.photo,
    'Icons.article': CupertinoIcons.doc_text,
    'Icons.table_chart': CupertinoIcons.table,
    'Icons.text_snippet': CupertinoIcons.textformat,

    // 文件和存档
    'Icons.archive': CupertinoIcons.archivebox,
    'Icons.folder_copy_outlined': CupertinoIcons.folder,
    'Icons.folder': CupertinoIcons.folder,
    'Icons.folder_open': CupertinoIcons.folder_open,

    // 发票和收据类
    'Icons.receipt': CupertinoIcons.doc_text,
    'Icons.receipt_long': CupertinoIcons.doc_text_fill,
    'Icons.monetization_on': CupertinoIcons.money_yen_circle,

    // 设备和平台
    'Icons.phone_android': CupertinoIcons.device_phone_portrait,
    'Icons.computer': CupertinoIcons.desktopcomputer,

    // 评级和标记
    'Icons.star': CupertinoIcons.star,
    'Icons.star_outlined': CupertinoIcons.star,
    'Icons.favorite': CupertinoIcons.heart_fill,
    'Icons.favorite_border': CupertinoIcons.heart,

    // 操作类图标
    'Icons.share': CupertinoIcons.share,
    'Icons.download': CupertinoIcons.cloud_download,
    'Icons.upload': CupertinoIcons.cloud_upload,
    'Icons.delete': CupertinoIcons.trash,
    'Icons.delete_outline': CupertinoIcons.trash,
    'Icons.edit': CupertinoIcons.pencil,
    'Icons.edit_outlined': CupertinoIcons.pencil,
    'Icons.add': CupertinoIcons.add,
    'Icons.remove': CupertinoIcons.minus,
    'Icons.close': CupertinoIcons.xmark,
    'Icons.check': CupertinoIcons.check_mark,

    // 导航图标
    'Icons.arrow_back': CupertinoIcons.back,
    'Icons.arrow_forward': CupertinoIcons.forward,
    'Icons.arrow_back_ios': CupertinoIcons.chevron_back,
    'Icons.arrow_forward_ios': CupertinoIcons.chevron_forward,
    'Icons.keyboard_arrow_up': CupertinoIcons.chevron_up,
    'Icons.keyboard_arrow_down': CupertinoIcons.chevron_down,
    'Icons.keyboard_arrow_left': CupertinoIcons.chevron_left,
    'Icons.keyboard_arrow_right': CupertinoIcons.chevron_right,

    // 状态图标
    'Icons.check_circle': CupertinoIcons.checkmark_circle_fill,
    'Icons.error': CupertinoIcons.exclamationmark_circle_fill,
    'Icons.warning': CupertinoIcons.exclamationmark_triangle_fill,
    'Icons.info': CupertinoIcons.info_circle_fill,

    // 搜索和过滤
    'Icons.search': CupertinoIcons.search,
    'Icons.filter_list': CupertinoIcons.slider_horizontal_3,
    'Icons.sort': CupertinoIcons.sort_up,

    // 设置和配置
    'Icons.settings': CupertinoIcons.settings,
    'Icons.more_vert': CupertinoIcons.ellipsis_vertical,
    'Icons.more_horiz': CupertinoIcons.ellipsis,

    // 时间和日期
    'Icons.access_time': CupertinoIcons.clock,
    'Icons.date_range': CupertinoIcons.calendar,
    'Icons.schedule': CupertinoIcons.clock_fill,

    // 通信
    'Icons.email': CupertinoIcons.mail,
    'Icons.phone': CupertinoIcons.phone,
    'Icons.message': CupertinoIcons.chat_bubble,

    // 用户和账户
    'Icons.person': CupertinoIcons.person,
    'Icons.person_outline': CupertinoIcons.person,
    'Icons.account_circle': CupertinoIcons.person_circle_fill,

    // 安全和隐私
    'Icons.lock': CupertinoIcons.lock_fill,
    'Icons.lock_outline': CupertinoIcons.lock,
    'Icons.visibility': CupertinoIcons.eye_fill,
    'Icons.visibility_off': CupertinoIcons.eye_slash_fill,

    // 媒体控制
    'Icons.play_arrow': CupertinoIcons.play_fill,
    'Icons.pause': CupertinoIcons.pause_fill,
    'Icons.stop': CupertinoIcons.stop_fill,
    'Icons.skip_next': CupertinoIcons.forward_fill,
    'Icons.skip_previous': CupertinoIcons.backward_fill,

    // 网络和连接
    'Icons.wifi': CupertinoIcons.wifi,
    'Icons.signal_wifi_off': CupertinoIcons.wifi_slash,
    'Icons.cloud': CupertinoIcons.cloud,
    'Icons.cloud_upload': CupertinoIcons.cloud_upload,
    'Icons.cloud_download': CupertinoIcons.cloud_download,

    // 购物和商业
    'Icons.shopping_cart': CupertinoIcons.cart,
    'Icons.attach_money': CupertinoIcons.money_yen,
    'Icons.payment': CupertinoIcons.creditcard,

    // 位置和地图
    'Icons.location_on': CupertinoIcons.location_fill,
    'Icons.location_off': CupertinoIcons.location_slash,
    'Icons.map': CupertinoIcons.map,

    // 音量和音频
    'Icons.volume_up': CupertinoIcons.volume_up,
    'Icons.volume_down': CupertinoIcons.volume_down,
    'Icons.volume_off': CupertinoIcons.volume_off,
    'Icons.volume_mute': CupertinoIcons.volume_mute,

    // 电池和电源
    'Icons.battery_full': CupertinoIcons.battery_100,
    'Icons.battery_charging_full': CupertinoIcons.battery_100,

    // 相机和图像
    'Icons.camera': CupertinoIcons.camera,
    'Icons.camera_alt': CupertinoIcons.camera_fill,
    'Icons.photo_camera': CupertinoIcons.camera,
    'Icons.photo_library': CupertinoIcons.photo_on_rectangle,

    // 主页和导航
    'Icons.home': CupertinoIcons.house,
    'Icons.home_outlined': CupertinoIcons.house,
    'Icons.dashboard': CupertinoIcons.square_grid_2x2,
    'Icons.menu': CupertinoIcons.line_horizontal_3,

    // 购物和电商
    'Icons.add_shopping_cart': CupertinoIcons.cart_badge_plus,
    'Icons.shopping_bag': CupertinoIcons.bag,
  };

  /// 获取对应的Cupertino图标
  ///
  /// [materialIconName] Material图标的名称 (例如: 'Icons.description')
  /// 返回对应的CupertinoIcons，如果没有映射则返回默认图标
  static IconData getCupertinoIcon(String materialIconName) {
    return _iconMapping[materialIconName] ?? CupertinoIcons.question_circle;
  }

  /// 批量获取图标映射
  ///
  /// [materialIconNames] Material图标名称列表
  /// 返回对应的Cupertino图标列表
  static List<IconData> getCupertinoIcons(List<String> materialIconNames) {
    return materialIconNames.map(getCupertinoIcon).toList();
  }

  /// 检查是否有对应的映射
  ///
  /// [materialIconName] Material图标名称
  /// 返回是否存在映射关系
  static bool hasMapping(String materialIconName) {
    return _iconMapping.containsKey(materialIconName);
  }

  /// 获取所有支持的Material图标名称
  static List<String> get supportedMaterialIcons => _iconMapping.keys.toList();

  /// 获取所有映射的Cupertino图标
  static List<IconData> get allCupertinoIcons => _iconMapping.values.toList();

  /// 获取映射统计信息
  static Map<String, dynamic> get mappingStats => {
        'totalMappings': _iconMapping.length,
        'categories': {
          'documents': _iconMapping.keys
              .where((k) =>
                  k.contains('doc') ||
                  k.contains('text') ||
                  k.contains('article'))
              .length,
          'actions': _iconMapping.keys
              .where((k) =>
                  k.contains('edit') ||
                  k.contains('delete') ||
                  k.contains('add'))
              .length,
          'navigation': _iconMapping.keys
              .where((k) =>
                  k.contains('arrow') ||
                  k.contains('chevron') ||
                  k.contains('back'))
              .length,
          'status': _iconMapping.keys
              .where((k) =>
                  k.contains('check') ||
                  k.contains('error') ||
                  k.contains('warning'))
              .length,
        }
      };
}

/// Material图标替换的扩展方法
extension MaterialIconReplacement on String {
  /// 将Material图标名称转换为Cupertino图标
  IconData toCupertinoIcon() => IconAdapter.getCupertinoIcon(this);

  /// 检查是否为已知的Material图标
  bool get isMaterialIcon => IconAdapter.hasMapping(this);
}

/// 图标使用的最佳实践常量
class IconUsageBestPractices {
  IconUsageBestPractices._();

  /// 推荐的图标尺寸
  static const double small = 16.0;
  static const double medium = 24.0;
  static const double large = 32.0;
  static const double xLarge = 48.0;

  /// 常用图标语义映射
  static const Map<String, IconData> commonActions = {
    'share': CupertinoIcons.share,
    'edit': CupertinoIcons.pencil,
    'delete': CupertinoIcons.trash,
    'add': CupertinoIcons.add,
    'remove': CupertinoIcons.minus,
    'search': CupertinoIcons.search,
    'filter': CupertinoIcons.slider_horizontal_3,
    'settings': CupertinoIcons.settings,
    'back': CupertinoIcons.chevron_left,
    'forward': CupertinoIcons.chevron_right,
    'close': CupertinoIcons.xmark,
    'done': CupertinoIcons.check_mark,
  };

  /// 状态图标映射
  static const Map<String, IconData> statusIcons = {
    'success': CupertinoIcons.checkmark_circle_fill,
    'error': CupertinoIcons.exclamationmark_circle_fill,
    'warning': CupertinoIcons.exclamationmark_triangle_fill,
    'info': CupertinoIcons.info_circle_fill,
    'loading': CupertinoIcons.clock,
  };

  /// 文件类型图标映射
  static const Map<String, IconData> fileTypeIcons = {
    'pdf': CupertinoIcons.doc_text_fill,
    'image': CupertinoIcons.photo,
    'document': CupertinoIcons.doc_text,
    'folder': CupertinoIcons.folder,
    'archive': CupertinoIcons.archivebox,
  };
}
