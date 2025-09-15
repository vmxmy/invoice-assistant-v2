import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../../../domain/entities/invoice_entity.dart';
import '../../../utils/icon_mapping.dart';
import '../../../theme/design_constants.dart';
import '../../atoms/app_text.dart';
import '../../atoms/app_icon.dart';

/// 发票卡片主体组件
/// 
/// 负责显示发票的详细信息：日期、类型、金额等核心数据
class InvoiceCardBody extends StatelessWidget {
  /// 发票实体
  final InvoiceEntity invoice;
  
  /// 是否只显示消费日期
  final bool showConsumptionDateOnly;
  
  /// 自定义金额样式
  final TextStyle? amountStyle;
  
  /// 是否显示类型图标
  final bool showCategoryIcon;
  
  /// 是否显示日期信息
  final bool showDateInfo;
  
  /// 日期信息布局方式
  final DateInfoLayout dateInfoLayout;

  const InvoiceCardBody({
    super.key,
    required this.invoice,
    this.showConsumptionDateOnly = false,
    this.amountStyle,
    this.showCategoryIcon = true,
    this.showDateInfo = true,
    this.dateInfoLayout = DateInfoLayout.leftAligned,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 主要信息行：日期 + 类型图标 + 金额
        _buildMainInfoRow(context),
        
        // 可选的额外信息
        if (_hasAdditionalInfo()) ...[
          SizedBox(height: DesignConstants.spacingS),
          _buildAdditionalInfo(context),
        ],
      ],
    );
  }

  /// 构建主要信息行
  Widget _buildMainInfoRow(BuildContext context) {
    switch (dateInfoLayout) {
      case DateInfoLayout.leftAligned:
        return _buildLeftAlignedLayout(context);
      case DateInfoLayout.spaceBetween:
        return _buildSpaceBetweenLayout(context);
      case DateInfoLayout.stacked:
        return _buildStackedLayout(context);
    }
  }

  /// 左对齐布局（原始布局）
  Widget _buildLeftAlignedLayout(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // 左侧：日期和类型信息
        Flexible(
          flex: 2,
          child: _buildDateAndCategoryInfo(context),
        ),
        
        SizedBox(width: DesignConstants.spacingM),
        
        // 右侧：金额
        _buildAmountDisplay(context),
      ],
    );
  }

  /// 两端对齐布局
  Widget _buildSpaceBetweenLayout(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildDateAndCategoryInfo(context),
        _buildAmountDisplay(context),
      ],
    );
  }

  /// 堆叠布局（垂直排列）
  Widget _buildStackedLayout(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildDateAndCategoryInfo(context),
        SizedBox(height: DesignConstants.spacingS),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            _buildAmountDisplay(context),
          ],
        ),
      ],
    );
  }

  /// 构建日期和类型信息
  Widget _buildDateAndCategoryInfo(BuildContext context) {
    final dateText = _getFormattedDate();
    final categoryText = _getCategoryText();
    
    if (!showDateInfo && (!showCategoryIcon || categoryText.isEmpty)) {
      return const SizedBox.shrink();
    }
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 日期信息
        if (showDateInfo && dateText.isNotEmpty) ...[
          _buildDateInfo(context, dateText),
          if (showCategoryIcon && categoryText.isNotEmpty)
            SizedBox(width: DesignConstants.spacingS),
        ],
        
        // 类型图标
        if (showCategoryIcon && categoryText.isNotEmpty)
          _buildCategoryIcon(context, categoryText),
      ],
    );
  }

  /// 构建日期信息
  Widget _buildDateInfo(BuildContext context, String dateText) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppIcon(
          icon: _getDateIcon(),
          size: IconSize.extraSmall,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          semanticLabel: '消费日期',
        ),
        SizedBox(width: DesignConstants.spacingXS),
        AppText(
          text: dateText,
          variant: TextVariant.bodySmall,
          semanticLabel: '消费日期: $dateText',
        ),
      ],
    );
  }

  /// 构建类型图标
  Widget _buildCategoryIcon(BuildContext context, String categoryText) {
    return Tooltip(
      message: '消费类型: $categoryText',
      child: AppIcon(
        icon: IconMapping.getCategoryIcon(categoryText),
        size: IconSize.extraSmall,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        semanticLabel: '消费类型: $categoryText',
      ),
    );
  }

  /// 构建金额显示
  Widget _buildAmountDisplay(BuildContext context) {
    
    return AppText(
      text: invoice.formattedAmount,
      variant: TextVariant.titleMedium,
      fontWeight: FontWeight.w600,
      color: Theme.of(context).colorScheme.primary,
      semanticLabel: '发票金额: ${invoice.formattedAmount}',
    );
  }

  /// 构建额外信息
  Widget _buildAdditionalInfo(BuildContext context) {
    final items = <Widget>[];
    
    
    
    if (items.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Wrap(
      spacing: DesignConstants.spacingM,
      runSpacing: DesignConstants.spacingXS,
      children: items,
    );
  }


  /// 获取格式化日期
  String _getFormattedDate() {
    if (invoice.consumptionDate != null) {
      return invoice.formattedConsumptionDate ?? '';
    }
    
    if (!showConsumptionDateOnly) {
      return invoice.formattedDate;
    }
    
    return '';
  }

  /// 获取类型文本
  String _getCategoryText() {
    String? expenseCategory = invoice.expenseCategory;
    if (expenseCategory == 'null') expenseCategory = null;
    return expenseCategory ?? '';
  }

  /// 获取日期图标
  IconData _getDateIcon() {
    if (invoice.consumptionDate != null) {
      return CupertinoIcons.cart; // 消费日期使用购物车图标
    }
    return CupertinoIcons.calendar; // 发票日期使用日历图标
  }

  /// 是否有额外信息需要显示
  bool _hasAdditionalInfo() {
    return false;
  }
}

/// 紧凑版本的发票卡片主体
/// 
/// 只显示最核心的信息：日期和金额
class InvoiceCardBodyCompact extends StatelessWidget {
  /// 发票实体
  final InvoiceEntity invoice;
  
  /// 是否只显示消费日期
  final bool showConsumptionDateOnly;

  const InvoiceCardBodyCompact({
    super.key,
    required this.invoice,
    this.showConsumptionDateOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    return InvoiceCardBody(
      invoice: invoice,
      showConsumptionDateOnly: showConsumptionDateOnly,
      showCategoryIcon: false,
      dateInfoLayout: DateInfoLayout.spaceBetween,
    );
  }
}

/// 详细版本的发票卡片主体
/// 
/// 显示所有可用信息
class InvoiceCardBodyDetailed extends StatelessWidget {
  /// 发票实体
  final InvoiceEntity invoice;
  
  /// 是否只显示消费日期
  final bool showConsumptionDateOnly;

  const InvoiceCardBodyDetailed({
    super.key,
    required this.invoice,
    this.showConsumptionDateOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    return InvoiceCardBody(
      invoice: invoice,
      showConsumptionDateOnly: showConsumptionDateOnly,
      showCategoryIcon: true,
      showDateInfo: true,
      dateInfoLayout: DateInfoLayout.stacked,
    );
  }
}

/// 日期信息布局方式枚举
enum DateInfoLayout {
  leftAligned,   // 左对齐（原始布局）
  spaceBetween,  // 两端对齐
  stacked,       // 堆叠布局
}