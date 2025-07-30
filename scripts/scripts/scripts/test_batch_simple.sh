#!/bin/bash

# 简化批量测试真实发票OCR
set -e

SUPABASE_URL="https://sfenhhtvcyslxplvewmt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"
TEST_DIR="/Users/xumingyang/Desktop/发票批量导出_2025-07-07_8张"
EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/ocr-dedup-complete"
USER_ID="f673138b-191a-463a-ba01-2782602ffa4d"

echo "🧪 简化批量发票OCR测试"
echo "========================"

count=0
for file in "${TEST_DIR}"/*.pdf; do
    [ ! -f "$file" ] && continue
    
    count=$((count + 1))
    filename=$(basename "$file")
    
    echo ""
    echo "📄 测试文件 ${count}: ${filename}"
    
    # 计算文件信息
    FILE_HASH=$(shasum -a 256 "$file" | cut -d' ' -f1)
    FILE_SIZE=$(stat -f%z "$file")
    
    echo "   📏 大小: ${FILE_SIZE} bytes | 🔐 哈希: ${FILE_HASH:0:12}..."
    echo "   ⏱️ 开始处理..."
    
    # 调用Edge Function
    response=$(curl -s -X POST "${EDGE_FUNCTION_URL}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      -H "X-User-ID: ${USER_ID}" \
      -F "file=@${file};type=application/pdf" \
      -F "fileHash=${FILE_HASH}" \
      -F "fileSize=${FILE_SIZE}" \
      -F "fileName=${filename}" \
      --max-time 60 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
        duplicate=$(echo "$response" | jq -r '.isDuplicate // false' 2>/dev/null)
        time=$(echo "$response" | jq -r '.processingTime // 0' 2>/dev/null)
        
        if [ "$success" = "true" ]; then
            if [ "$duplicate" = "true" ]; then
                echo "   🔄 重复文件 (${time}ms)"
                upload_count=$(echo "$response" | jq -r '.data.upload_count // 1' 2>/dev/null)
                echo "      已上传 ${upload_count} 次"
            else
                echo "   ✅ 处理成功 (${time}ms)"
                
                # 提取关键信息
                invoice_num=$(echo "$response" | jq -r '.data.invoice_number // "N/A"' 2>/dev/null)
                seller=$(echo "$response" | jq -r '.data.seller_name // "N/A"' 2>/dev/null)
                amount=$(echo "$response" | jq -r '.data.total_amount // 0' 2>/dev/null)
                date=$(echo "$response" | jq -r '.data.invoice_date // "N/A"' 2>/dev/null)
                confidence=$(echo "$response" | jq -r '.data.ocr_overall_confidence // 0' 2>/dev/null)
                
                echo "      📄 发票号: ${invoice_num}"
                echo "      🏢 销售方: ${seller:0:30}$([ ${#seller} -gt 30 ] && echo '...')"
                echo "      💰 金额: ¥${amount} | 📅 日期: ${date}"
                echo "      🎯 置信度: ${confidence}"
            fi
        else
            echo "   ❌ 处理失败"
            error=$(echo "$response" | jq -r '.error // "未知错误"' 2>/dev/null)
            echo "      错误: ${error:0:50}$([ ${#error} -gt 50 ] && echo '...')"
        fi
    else
        echo "   ❌ 请求失败或超时"
    fi
    
    # 限制只测试前3个文件，避免超时
    [ $count -ge 3 ] && break
    
    # 间隔2秒避免过频请求
    sleep 2
done

echo ""
echo "🏁 测试完成"