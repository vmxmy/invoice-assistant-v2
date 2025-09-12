import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/icon_mapping.dart';

/// 数据分析页面
class AnalysisPage extends StatelessWidget {
  const AnalysisPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: const _AnalysisContent(),
    );
  }
}

/// 分析页面内容
class _AnalysisContent extends StatefulWidget {
  const _AnalysisContent();

  @override
  State<_AnalysisContent> createState() => _AnalysisContentState();
}

class _AnalysisContentState extends State<_AnalysisContent>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedPeriod = '本月';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return NestedScrollView(
      headerSliverBuilder: (context, innerBoxIsScrolled) => [
        // App Bar
        SliverAppBar(
          title: const Text('数据分析'),
          centerTitle: true,
          floating: true,
          pinned: true,
          actions: [
            PopupMenuButton<String>(
              onSelected: (value) => setState(() => _selectedPeriod = value),
              itemBuilder: (context) => [
                const PopupMenuItem(value: '本周', child: Text('本周')),
                const PopupMenuItem(value: '本月', child: Text('本月')),
                const PopupMenuItem(value: '本季度', child: Text('本季度')),
                const PopupMenuItem(value: '本年', child: Text('本年')),
              ],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_selectedPeriod),
                    const Icon(CupertinoIcons.chevron_down),
                  ],
                ),
              ),
            ),
          ],
          bottom: TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: '概览'),
              Tab(text: '趋势'),
              Tab(text: '分类'),
            ],
          ),
        ),
      ],
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(),
          _buildTrendTab(),
          _buildCategoryTab(),
        ],
      ),
    );
  }

  /// 构建概览标签页
  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 总体统计卡片
          _buildOverallStatsCard(),
          const SizedBox(height: 16),

          // 环形图表
          _buildPieChartCard(),
          const SizedBox(height: 16),

          // 快速统计
          _buildQuickStats(),
        ],
      ),
    );
  }

  /// 构建趋势标签页
  Widget _buildTrendTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // 趋势图表
          _buildTrendChartCard(),
          const SizedBox(height: 16),

          // 同比环比
          _buildComparisonCard(),
        ],
      ),
    );
  }

  /// 构建分类标签页
  Widget _buildCategoryTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // 分类柱状图
          _buildCategoryChartCard(),
          const SizedBox(height: 16),

          // 分类详情
          _buildCategoryDetails(),
        ],
      ),
    );
  }

  /// 构建总体统计卡片
  Widget _buildOverallStatsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$_selectedPeriod统计',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    '发票数量',
                    '23',
                    '张',
                    CupertinoIcons.doc_text,
                    Colors.blue,
                    '+12%',
                  ),
                ),
                Container(
                  width: 1,
                  height: 60,
                  color: Theme.of(context).dividerColor,
                ),
                Expanded(
                  child: _buildStatItem(
                    '总金额',
                    '12,345',
                    '元',
                    CupertinoIcons.money_dollar_circle,
                    Colors.green,
                    '+8%',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// 构建统计项目
  Widget _buildStatItem(
    String label,
    String value,
    String unit,
    IconData icon,
    Color color,
    String change,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
              ),
              TextSpan(
                text: unit,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: color,
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.7),
              ),
        ),
        const SizedBox(height: 2),
        Text(
          change,
          style: TextStyle(
            color: Colors.green,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  /// 构建环形图表卡片
  Widget _buildPieChartCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '费用分布',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: Row(
                children: [
                  // 环形图
                  Expanded(
                    flex: 2,
                    child: PieChart(
                      PieChartData(
                        sections: _getPieChartSections(),
                        centerSpaceRadius: 60,
                        sectionsSpace: 2,
                      ),
                    ),
                  ),

                  // 图例
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLegendItem(
                            '餐饮', AppColors.getCategoryColor(context, 0), 35),
                        _buildLegendItem(
                            '交通', AppColors.getCategoryColor(context, 1), 25),
                        _buildLegendItem(
                            '办公', AppColors.getCategoryColor(context, 2), 20),
                        _buildLegendItem(
                            '住宿', AppColors.getCategoryColor(context, 3), 15),
                        _buildLegendItem(
                            '其他', AppColors.getCategoryColor(context, 4), 5),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 获取环形图数据
  List<PieChartSectionData> _getPieChartSections() {
    return [
      PieChartSectionData(
        color: Colors.blue,
        value: 35,
        title: '35%',
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      PieChartSectionData(
        color: Colors.orange,
        value: 25,
        title: '25%',
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      PieChartSectionData(
        color: Colors.green,
        value: 20,
        title: '20%',
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      PieChartSectionData(
        color: Colors.purple,
        value: 15,
        title: '15%',
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      PieChartSectionData(
        color: Colors.grey,
        value: 5,
        title: '5%',
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    ];
  }

  /// 构建图例项目
  Widget _buildLegendItem(String label, Color color, double percentage) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          Text(
            '$percentage%',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
          ),
        ],
      ),
    );
  }

  /// 构建快速统计
  Widget _buildQuickStats() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '快速统计',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildQuickStatCard(
                '平均金额',
                '¥536',
                CupertinoIcons.number_square,
                Colors.indigo,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildQuickStatCard(
                '最大金额',
                '¥2,340',
                CupertinoIcons.graph_circle,
                Colors.red,
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// 构建快速统计卡片
  Widget _buildQuickStatCard(
      String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.7),
                  ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建趋势图表卡片
  Widget _buildTrendChartCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '发票趋势',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  gridData: const FlGridData(show: true),
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: true),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const days = ['1日', '7日', '14日', '21日', '28日'];
                          if (value.toInt() >= 0 &&
                              value.toInt() < days.length) {
                            return Text(days[value.toInt()]);
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  borderData: FlBorderData(show: true),
                  lineBarsData: [
                    LineChartBarData(
                      spots: [
                        const FlSpot(0, 1000),
                        const FlSpot(1, 1500),
                        const FlSpot(2, 1200),
                        const FlSpot(3, 1800),
                        const FlSpot(4, 2200),
                      ],
                      isCurved: true,
                      color: Theme.of(context).colorScheme.primary,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建对比卡片
  Widget _buildComparisonCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '同期对比',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildComparisonItem('环比上月', '+12.5%', Colors.green),
                ),
                Expanded(
                  child: _buildComparisonItem('同比去年', '+8.2%', Colors.blue),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// 构建对比项目
  Widget _buildComparisonItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.7),
              ),
        ),
      ],
    );
  }

  /// 构建分类图表卡片
  Widget _buildCategoryChartCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '分类统计',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: 5000,
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const categories = ['餐饮', '交通', '办公', '住宿', '其他'];
                          if (value.toInt() >= 0 &&
                              value.toInt() < categories.length) {
                            return Text(categories[value.toInt()]);
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: true),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: [
                    BarChartGroupData(x: 0, barRods: [
                      BarChartRodData(
                          toY: 4320,
                          color: AppColors.getCategoryColor(context, 0))
                    ]),
                    BarChartGroupData(x: 1, barRods: [
                      BarChartRodData(
                          toY: 3080,
                          color: AppColors.getCategoryColor(context, 1))
                    ]),
                    BarChartGroupData(x: 2, barRods: [
                      BarChartRodData(
                          toY: 2470,
                          color: AppColors.getCategoryColor(context, 2))
                    ]),
                    BarChartGroupData(x: 3, barRods: [
                      BarChartRodData(
                          toY: 1850,
                          color: AppColors.getCategoryColor(context, 3))
                    ]),
                    BarChartGroupData(x: 4, barRods: [
                      BarChartRodData(
                          toY: 620,
                          color: AppColors.getCategoryColor(context, 4))
                    ]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建分类详情
  Widget _buildCategoryDetails() {
    return Card(
      child: Column(
        children: [
          _buildCategoryDetailItem('餐饮费用', '¥4,320', '12张', Colors.blue, 0.86),
          const Divider(height: 1),
          _buildCategoryDetailItem('交通费用', '¥3,080', '8张', Colors.orange, 0.62),
          const Divider(height: 1),
          _buildCategoryDetailItem('办公费用', '¥2,470', '6张', Colors.green, 0.49),
          const Divider(height: 1),
          _buildCategoryDetailItem('住宿费用', '¥1,850', '3张', Colors.purple, 0.37),
          const Divider(height: 1),
          _buildCategoryDetailItem('其他费用', '¥620', '2张', Colors.grey, 0.12),
        ],
      ),
    );
  }

  /// 构建分类详情项目
  Widget _buildCategoryDetailItem(
    String category,
    String amount,
    String count,
    Color color,
    double progress,
  ) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          _getCategoryIcon(category),
          color: color,
          size: 20,
        ),
      ),
      title: Text(category),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$count发票'),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: color.withValues(alpha: 0.1),
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ],
      ),
      trailing: Text(
        amount,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
      ),
    );
  }

  /// 获取分类图标
  IconData _getCategoryIcon(String category) {
    return IconMapping.getCategoryIcon(category,
        fallback: CupertinoIcons.ellipsis);
  }
}
