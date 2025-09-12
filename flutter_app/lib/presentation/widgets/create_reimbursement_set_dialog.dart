import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/reimbursement_set_bloc.dart';
import '../bloc/reimbursement_set_event.dart';
import '../bloc/reimbursement_set_state.dart';

/// 创建报销集对话框
class CreateReimbursementSetDialog extends StatefulWidget {
  final List<String> selectedInvoiceIds;
  final VoidCallback onCreateSuccess;

  const CreateReimbursementSetDialog({
    super.key,
    required this.selectedInvoiceIds,
    required this.onCreateSuccess,
  });

  @override
  State<CreateReimbursementSetDialog> createState() =>
      _CreateReimbursementSetDialogState();
}

class _CreateReimbursementSetDialogState
    extends State<CreateReimbursementSetDialog> {
  final _formKey = GlobalKey<FormState>();
  final _setNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // 智能生成默认名称
    _generateDefaultSetName();
  }

  @override
  void dispose() {
    _setNameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  /// 智能生成报销集默认名称
  void _generateDefaultSetName() {
    final now = DateTime.now();
    final monthName = '${now.year}年${now.month.toString().padLeft(2, '0')}月';
    final defaultName = '$monthName报销单_${widget.selectedInvoiceIds.length}张发票';
    _setNameController.text = defaultName;
  }

  /// 创建报销集
  void _createReimbursementSet() {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    // 使用BLoC创建报销集
    context.read<ReimbursementSetBloc>().add(
          CreateReimbursementSet(
            setName: _setNameController.text.trim(),
            description: _descriptionController.text.trim().isNotEmpty
                ? _descriptionController.text.trim()
                : null,
            invoiceIds: widget.selectedInvoiceIds,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ReimbursementSetBloc, ReimbursementSetState>(
      listener: (context, state) {
        if (state is ReimbursementSetCreateSuccess) {
          Navigator.of(context).pop();
          widget.onCreateSuccess();

          // 显示成功消息
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    color: Theme.of(context).colorScheme.onPrimary,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(state.message),
                  ),
                ],
              ),
              backgroundColor: Theme.of(context).colorScheme.primary,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              margin: const EdgeInsets.all(16),
            ),
          );
        } else if (state is ReimbursementSetError) {
          setState(() {
            _isLoading = false;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(
                    Icons.error,
                    color: Theme.of(context).colorScheme.onError,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(state.message),
                  ),
                ],
              ),
              backgroundColor: Theme.of(context).colorScheme.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              margin: const EdgeInsets.all(16),
            ),
          );
        }
      },
      child: BlocBuilder<ReimbursementSetBloc, ReimbursementSetState>(
        builder: (context, state) {
          return AlertDialog(
            title: Row(
              children: [
                Icon(
                  Icons.folder_copy,
                  color: Theme.of(context).colorScheme.primary,
                  size: 24,
                ),
                const SizedBox(width: 8),
                const Text('创建报销集'),
              ],
            ),
            contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
            content: SizedBox(
              width: MediaQuery.of(context).size.width * 0.85,
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 选中发票信息卡片
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .primaryContainer
                            .withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Theme.of(context)
                              .colorScheme
                              .primary
                              .withValues(alpha: 0.3),
                          width: 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.receipt_long,
                                color: Theme.of(context).colorScheme.primary,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '将创建包含以下发票的报销集',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w500,
                                      color:
                                          Theme.of(context).colorScheme.primary,
                                    ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              '${widget.selectedInvoiceIds.length} 张发票',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color:
                                        Theme.of(context).colorScheme.onPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // 报销集名称输入框
                    TextFormField(
                      controller: _setNameController,
                      decoration: InputDecoration(
                        labelText: '报销集名称',
                        hintText: '请输入报销集名称',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        prefixIcon: const Icon(Icons.folder_copy),
                        filled: true,
                        fillColor: Theme.of(context).colorScheme.surface,
                      ),
                      maxLength: 100,
                      textInputAction: TextInputAction.next,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return '请输入报销集名称';
                        }
                        if (value.trim().length < 2) {
                          return '报销集名称至少需要2个字符';
                        }
                        return null;
                      },
                      onFieldSubmitted: (_) =>
                          FocusScope.of(context).nextFocus(),
                    ),

                    const SizedBox(height: 16),

                    // 描述输入框
                    TextFormField(
                      controller: _descriptionController,
                      decoration: InputDecoration(
                        labelText: '描述（可选）',
                        hintText: '请输入报销集描述，如用途、项目等',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        prefixIcon: const Icon(Icons.description),
                        filled: true,
                        fillColor: Theme.of(context).colorScheme.surface,
                      ),
                      maxLines: 3,
                      maxLength: 500,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _createReimbursementSet(),
                    ),
                  ],
                ),
              ),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            actions: [
              TextButton(
                onPressed:
                    _isLoading ? null : () => Navigator.of(context).pop(),
                style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                child: const Text('取消'),
              ),
              ElevatedButton(
                onPressed: _isLoading ? null : _createReimbursementSet,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Theme.of(context).colorScheme.onPrimary,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        '创建报销集',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
