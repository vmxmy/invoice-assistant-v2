import 'package:flutter/cupertino.dart';

import 'app_text_field.dart';

/// AppTextField使用示例页面
///
/// 展示AppTextField组件的各种用法和配置选项，
/// 包括不同类型、状态、配置的完整示例。
class AppTextFieldExamplePage extends StatefulWidget {
  /// 构造函数
  const AppTextFieldExamplePage({super.key});

  @override
  State<AppTextFieldExamplePage> createState() =>
      _AppTextFieldExamplePageState();
}

class _AppTextFieldExamplePageState extends State<AppTextFieldExamplePage> {
  // 控制器
  late final TextEditingController _basicController;
  late final TextEditingController _passwordController;
  late final TextEditingController _emailController;
  late final TextEditingController _searchController;
  late final TextEditingController _numberController;
  late final TextEditingController _multilineController;
  late final TextEditingController _validationController;

  // 焦点节点
  late final FocusNode _basicFocusNode;
  late final FocusNode _passwordFocusNode;

  // 状态变量
  AppTextFieldValidationState _validationState =
      AppTextFieldValidationState.normal;
  String? _validationError;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _initializeFocusNodes();
  }

  @override
  void dispose() {
    _disposeControllers();
    _disposeFocusNodes();
    super.dispose();
  }

  /// 初始化控制器
  void _initializeControllers() {
    _basicController = TextEditingController(text: '基础文本输入');
    _passwordController = TextEditingController();
    _emailController = TextEditingController(text: 'user@example.com');
    _searchController = TextEditingController();
    _numberController = TextEditingController(text: '12345');
    _multilineController =
        TextEditingController(text: '这是一个多行文本输入示例\n支持换行和长文本');
    _validationController = TextEditingController();
  }

  /// 初始化焦点节点
  void _initializeFocusNodes() {
    _basicFocusNode = FocusNode();
    _passwordFocusNode = FocusNode();
  }

  /// 释放控制器
  void _disposeControllers() {
    _basicController.dispose();
    _passwordController.dispose();
    _emailController.dispose();
    _searchController.dispose();
    _numberController.dispose();
    _multilineController.dispose();
    _validationController.dispose();
  }

  /// 释放焦点节点
  void _disposeFocusNodes() {
    _basicFocusNode.dispose();
    _passwordFocusNode.dispose();
  }

  /// 邮箱验证器
  String? _validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return '请输入邮箱地址';
    }

    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return '请输入有效的邮箱地址';
    }

    return null;
  }

  /// 密码验证器
  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return '请输入密码';
    }

    if (value.length < 6) {
      return '密码长度不能少于6位';
    }

    return null;
  }

  /// 动态验证器
  String? _dynamicValidator(String? value) {
    if (value == null || value.isEmpty) {
      setState(() {
        _validationState = AppTextFieldValidationState.normal;
        _validationError = null;
      });
      return null;
    }

    if (value.length < 3) {
      setState(() {
        _validationState = AppTextFieldValidationState.error;
        _validationError = '输入长度不能少于3位';
      });
      return '输入长度不能少于3位';
    }

    if (value.length >= 3 && value.length < 6) {
      setState(() {
        _validationState = AppTextFieldValidationState.warning;
        _validationError = null;
      });
      return null;
    }

    setState(() {
      _validationState = AppTextFieldValidationState.success;
      _validationError = null;
    });
    return null;
  }

  /// 构建章节标题
  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  /// 构建示例项
  Widget _buildExampleItem({
    required String title,
    required String description,
    required Widget child,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: TextStyle(
              fontSize: 14,
              color: CupertinoColors.secondaryLabel.resolveFrom(context),
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('AppTextField 示例'),
      ),
      child: SafeArea(
        child: ListView(
          children: [
            // 基础用法
            _buildSectionTitle('基础用法'),

            _buildExampleItem(
              title: '基础文本输入',
              description: '最简单的文本输入框配置',
              child: AppTextField(
                controller: _basicController,
                placeholder: '请输入文本',
                focusNode: _basicFocusNode,
                onChanged: (value) => print('基础输入: $value'),
              ),
            ),

            _buildExampleItem(
              title: '带图标的输入框',
              description: '配置前缀和后缀图标',
              child: AppTextField(
                placeholder: '用户名',
                prefixIcon: CupertinoIcons.person,
                suffixIcon: CupertinoIcons.checkmark_circle,
                showClearButton: true,
                onChanged: (value) => print('带图标输入: $value'),
              ),
            ),

            // 输入类型
            _buildSectionTitle('输入类型'),

            _buildExampleItem(
              title: '密码输入',
              description: '自动隐藏文本，支持显示/隐藏切换',
              child: AppTextField.password(
                controller: _passwordController,
                validator: _validatePassword,
                onSubmitted: (value) => print('密码提交: $value'),
              ),
            ),

            _buildExampleItem(
              title: '邮箱输入',
              description: '邮箱键盘类型，内置清除按钮',
              child: AppTextField.email(
                controller: _emailController,
                validator: _validateEmail,
                onChanged: (value) => print('邮箱输入: $value'),
              ),
            ),

            _buildExampleItem(
              title: '搜索输入',
              description: '搜索图标和清除按钮，搜索键盘',
              child: AppTextField.search(
                controller: _searchController,
                onSubmitted: (value) => print('搜索提交: $value'),
              ),
            ),

            _buildExampleItem(
              title: '数字输入',
              description: '限制数字输入，支持字符计数',
              child: AppTextField.number(
                controller: _numberController,
                maxLength: 10,
                validator: (value) {
                  if (value == null || value.isEmpty) return '请输入数字';
                  final number = int.tryParse(value);
                  if (number == null) return '请输入有效数字';
                  if (number < 0) return '数字不能为负数';
                  return null;
                },
                onChanged: (value) => print('数字输入: $value'),
              ),
            ),

            _buildExampleItem(
              title: '多行文本',
              description: '支持多行输入，字符计数',
              child: AppTextField.multiline(
                controller: _multilineController,
                maxLength: 200,
                onChanged: (value) => print('多行输入: ${value.length} 字符'),
              ),
            ),

            // 验证状态
            _buildSectionTitle('验证状态'),

            _buildExampleItem(
              title: '动态验证状态',
              description: '根据输入内容动态改变验证状态和颜色',
              child: AppTextField(
                controller: _validationController,
                placeholder: '输入内容查看状态变化',
                validationState: _validationState,
                validator: _dynamicValidator,
                errorText: _validationError,
                helperText: '输入少于3字符显示错误，3-5字符显示警告，6字符以上显示成功',
                showCharacterCount: true,
                maxLength: 20,
                onChanged: (value) => print('动态验证: $value'),
              ),
            ),

            _buildExampleItem(
              title: '错误状态',
              description: '显示错误状态和错误消息',
              child: const AppTextField(
                placeholder: '错误状态示例',
                validationState: AppTextFieldValidationState.error,
                errorText: '这是一个错误消息',
                prefixIcon: CupertinoIcons.exclamationmark_triangle,
              ),
            ),

            _buildExampleItem(
              title: '成功状态',
              description: '显示成功状态',
              child: const AppTextField(
                placeholder: '成功状态示例',
                validationState: AppTextFieldValidationState.success,
                helperText: '输入验证成功',
                prefixIcon: CupertinoIcons.checkmark_circle,
              ),
            ),

            _buildExampleItem(
              title: '警告状态',
              description: '显示警告状态',
              child: const AppTextField(
                placeholder: '警告状态示例',
                validationState: AppTextFieldValidationState.warning,
                helperText: '这是一个警告消息',
                prefixIcon: CupertinoIcons.exclamationmark_triangle_fill,
              ),
            ),

            // 特殊配置
            _buildSectionTitle('特殊配置'),

            _buildExampleItem(
              title: '禁用状态',
              description: '不可编辑的输入框',
              child: const AppTextField(
                placeholder: '禁用状态',
                enabled: false,
                helperText: '此输入框已禁用',
                prefixIcon: CupertinoIcons.lock_fill,
              ),
            ),

            _buildExampleItem(
              title: '只读状态',
              description: '可以获取焦点但不能编辑',
              child: AppTextField(
                controller: TextEditingController(text: '这是只读文本'),
                readOnly: true,
                helperText: '此输入框为只读',
                prefixIcon: CupertinoIcons.eye,
                onTap: () {
                  print('只读输入框被点击');
                },
              ),
            ),

            _buildExampleItem(
              title: '字符计数',
              description: '显示当前字符数和最大字符限制',
              child: const AppTextField(
                placeholder: '输入文本查看字符计数',
                maxLength: 50,
                showCharacterCount: true,
                helperText: '支持最多50个字符',
              ),
            ),

            // 操作回调
            _buildSectionTitle('操作回调'),

            _buildExampleItem(
              title: '完整回调示例',
              description: '演示各种回调事件',
              child: AppTextField(
                placeholder: '触发各种回调事件',
                showClearButton: true,
                prefixIcon: CupertinoIcons.text_cursor,
                onChanged: (value) => print('文本变化: $value'),
                onSubmitted: (value) => print('提交: $value'),
                onTap: () => print('输入框被点击'),
                onEditingComplete: () => print('编辑完成'),
                validator: (value) {
                  print('验证: $value');
                  return null;
                },
              ),
            ),

            // 底部间距
            const SizedBox(height: 50),
          ],
        ),
      ),
    );
  }
}

/// 简化的演示页面
/// 用于快速测试和展示核心功能
class AppTextFieldQuickDemo extends StatelessWidget {
  /// 构造函数
  const AppTextFieldQuickDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('AppTextField 快速演示'),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // 基础输入
              AppTextField(
                placeholder: '基础文本输入',
                showClearButton: true,
              ),

              const SizedBox(height: 16),

              // 密码输入
              AppTextField.password(),

              const SizedBox(height: 16),

              // 邮箱输入
              AppTextField.email(),

              const SizedBox(height: 16),

              // 搜索输入
              AppTextField.search(),

              const SizedBox(height: 16),

              // 多行文本
              AppTextField.multiline(
                maxLength: 100,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 表单示例
/// 展示在实际表单中的使用
class AppTextFieldFormExample extends StatefulWidget {
  /// 构造函数
  const AppTextFieldFormExample({super.key});

  @override
  State<AppTextFieldFormExample> createState() =>
      _AppTextFieldFormExampleState();
}

class _AppTextFieldFormExampleState extends State<AppTextFieldFormExample> {
  final _formKey = GlobalKey();
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _passwordController;
  late final TextEditingController _phoneController;
  late final TextEditingController _bioController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
    _phoneController = TextEditingController();
    _bioController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  /// 提交表单
  void _submitForm() {
    print('表单提交:');
    print('姓名: ${_nameController.text}');
    print('邮箱: ${_emailController.text}');
    print('密码: ${_passwordController.text}');
    print('手机: ${_phoneController.text}');
    print('简介: ${_bioController.text}');
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('表单示例'),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _submitForm,
          child: const Text('提交'),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                // 姓名
                AppTextField(
                  controller: _nameController,
                  placeholder: '请输入姓名',
                  prefixIcon: CupertinoIcons.person,
                  showClearButton: true,
                  validator: (value) => value?.isEmpty == true ? '请输入姓名' : null,
                ),

                const SizedBox(height: 16),

                // 邮箱
                AppTextField.email(
                  controller: _emailController,
                  validator: (value) {
                    if (value?.isEmpty == true) return '请输入邮箱';
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                        .hasMatch(value!)) {
                      return '请输入有效邮箱';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 16),

                // 密码
                AppTextField.password(
                  controller: _passwordController,
                  validator: (value) {
                    if (value?.isEmpty == true) return '请输入密码';
                    if (value!.length < 6) return '密码长度不能少于6位';
                    return null;
                  },
                ),

                const SizedBox(height: 16),

                // 手机号
                AppTextField(
                  controller: _phoneController,
                  placeholder: '请输入手机号',
                  type: AppTextFieldType.phone,
                  prefixIcon: CupertinoIcons.phone,
                  maxLength: 11,
                  showCharacterCount: true,
                ),

                const SizedBox(height: 16),

                // 个人简介
                AppTextField.multiline(
                  controller: _bioController,
                  placeholder: '请输入个人简介',
                  maxLength: 200,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
