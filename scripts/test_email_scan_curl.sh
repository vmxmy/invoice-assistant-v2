#!/bin/bash

echo "=============================="
echo "邮箱扫描API测试 (使用curl)"
echo "=============================="

# API基础URL
BASE_URL="http://localhost:8090"

# Supabase配置
SUPABASE_URL="https://sfenhhtvcyslxplvewmt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"

# 步骤1: 获取访问令牌
echo -e "\n1. 获取用户Token..."
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "blueyang@gmail.com",
        "password": "Xumy8!75"
    }')

# 提取token
ACCESS_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')
USER_ID=$(echo $AUTH_RESPONSE | jq -r '.user.id')

if [ "$ACCESS_TOKEN" == "null" ]; then
    echo "✗ 认证失败"
    echo $AUTH_RESPONSE | jq .
    exit 1
fi

echo "✓ 认证成功"
echo "  用户ID: $USER_ID"
echo "  Token前缀: ${ACCESS_TOKEN:0:20}..."

# 步骤2: 获取邮箱账户
echo -e "\n2. 获取邮箱账户列表..."
ACCOUNTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/email-accounts/" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "响应内容:"
echo $ACCOUNTS_RESPONSE | jq .

# 提取第一个邮箱账户ID (注意：这个API直接返回对象，不是包装在data中)
EMAIL_ACCOUNT_ID=$(echo $ACCOUNTS_RESPONSE | jq -r '.items[0].id')

if [ "$EMAIL_ACCOUNT_ID" == "null" ]; then
    echo "✗ 没有找到邮箱账户"
    exit 1
fi

echo "✓ 使用邮箱账户ID: $EMAIL_ACCOUNT_ID"

# 步骤3: 创建扫描任务
echo -e "\n3. 创建扫描任务..."

# 准备扫描参数
SCAN_DATA='{
    "email_account_id": "'${EMAIL_ACCOUNT_ID}'",
    "job_type": "manual",
    "scan_params": {
        "folders": ["INBOX"],
        "subject_keywords": ["发票", "invoice", "账单"],
        "download_attachments": true,
        "attachment_types": [".pdf", ".jpg", ".jpeg", ".png"],
        "max_emails": 10
    },
    "description": "Curl测试扫描任务"
}'

echo "请求数据:"
echo $SCAN_DATA | jq .

echo -e "\n发送请求..."
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${SCAN_DATA}")

echo -e "\n响应:"
echo $CREATE_RESPONSE | jq .

# 提取任务ID
JOB_ID=$(echo $CREATE_RESPONSE | jq -r '.data.job_id')

if [ "$JOB_ID" == "null" ]; then
    echo "✗ 创建任务失败"
    exit 1
fi

echo "✓ 任务创建成功，任务ID: $JOB_ID"

# 步骤4: 查询任务进度
echo -e "\n4. 查询任务进度..."

for i in {1..10}; do
    echo -e "\n第 $i 次查询 ($(date '+%H:%M:%S'))..."
    
    PROGRESS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/email-scan/jobs/${JOB_ID}/progress" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    STATUS=$(echo $PROGRESS_RESPONSE | jq -r '.data.status')
    PROGRESS=$(echo $PROGRESS_RESPONSE | jq -r '.data.progress')
    CURRENT_STEP=$(echo $PROGRESS_RESPONSE | jq -r '.data.current_step')
    
    echo "  状态: $STATUS"
    echo "  进度: $PROGRESS%"
    echo "  当前步骤: $CURRENT_STEP"
    
    # 显示统计信息
    echo "  统计:"
    echo "    - 总邮件数: $(echo $PROGRESS_RESPONSE | jq -r '.data.total_emails')"
    echo "    - 已扫描: $(echo $PROGRESS_RESPONSE | jq -r '.data.scanned_emails')"
    echo "    - 匹配邮件: $(echo $PROGRESS_RESPONSE | jq -r '.data.matched_emails')"
    echo "    - 下载附件: $(echo $PROGRESS_RESPONSE | jq -r '.data.downloaded_attachments')"
    echo "    - 处理发票: $(echo $PROGRESS_RESPONSE | jq -r '.data.processed_invoices')"
    
    if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ] || [ "$STATUS" == "cancelled" ]; then
        echo -e "\n任务结束，最终状态: $STATUS"
        break
    fi
    
    sleep 3
done

# 步骤5: 获取任务详情
echo -e "\n5. 获取任务详情..."
DETAIL_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/email-scan/jobs/${JOB_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo $DETAIL_RESPONSE | jq .

# 步骤6: 列出所有任务
echo -e "\n6. 列出最近的扫描任务..."
LIST_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/email-scan/jobs?limit=5" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo $LIST_RESPONSE | jq '.data.items[] | {job_id: .job_id, status: .status, created_at: .created_at, progress: .progress}'

echo -e "\n测试完成！"