#!/bin/bash

# 批处理执行脚本 - 处理所有28个PDF文件
# 使用方法: ./run_all_batches.sh

echo "🚀 开始执行全量PDF文件测试..."

# 配置参数
BATCH_SIZE=5  # 每批处理5个文件
TOTAL_FILES=28
TOTAL_BATCHES=$(((TOTAL_FILES + BATCH_SIZE - 1) / BATCH_SIZE))

echo "📊 配置信息:"
echo "   总文件数: ${TOTAL_FILES}"
echo "   批大小: ${BATCH_SIZE}"
echo "   总批次: ${TOTAL_BATCHES}"

# 执行每个批次
for ((i=1; i<=TOTAL_BATCHES; i++)); do
    echo ""
    echo "=" $(printf "%0.s=" {1..60})
    echo "🔄 执行批次 ${i}/${TOTAL_BATCHES}"
    echo "=" $(printf "%0.s=" {1..60})
    
    # 设置环境变量并执行测试
    BATCH_SIZE=${BATCH_SIZE} CURRENT_BATCH=${i} node test_models.js
    
    # 检查执行结果
    if [ $? -eq 0 ]; then
        echo "✅ 批次 ${i} 执行成功"
    else
        echo "❌ 批次 ${i} 执行失败，继续下一批次..."
    fi
    
    # 批次间暂停，避免API限制
    if [ ${i} -lt ${TOTAL_BATCHES} ]; then
        echo "⏱️  批次间暂停 10 秒..."
        sleep 10
    fi
done

echo ""
echo "🎉 全量测试完成！"
echo "📋 生成的报告文件:"
ls -la multi_pdf_llm_test_report_batch*.md | head -10

echo ""
echo "📝 合并所有批次报告:"
echo "   可手动合并或使用脚本处理多个报告文件"