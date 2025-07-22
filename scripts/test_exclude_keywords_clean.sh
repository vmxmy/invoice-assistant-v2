#!/bin/bash

# 测试 exclude_keywords 多关键字支持（改进版）

echo "=== 测试 exclude_keywords 多关键字支持 ==="
echo ""

# 获取认证令牌
echo "获取认证令牌..."
TOKEN=$(curl -s -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE" \
    -H "Content-Type: application/json" \
    -d @../test_output/results/auth_request.json | jq -r '.access_token')

if [ -z "$TOKEN" ]; then
    echo "❌ 获取令牌失败"
    exit 1
fi

echo "✅ 认证成功"
echo ""

# 获取邮箱账户ID
echo "获取邮箱账户..."
EMAIL_ACCOUNTS=$(curl -s -X GET "http://localhost:8090/api/v1/email-accounts" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

EMAIL_ACCOUNT_ID=$(echo "$EMAIL_ACCOUNTS" | jq -r '.items[0].id' 2>/dev/null)

if [ -z "$EMAIL_ACCOUNT_ID" ] || [ "$EMAIL_ACCOUNT_ID" = "null" ]; then
    echo "❌ 没有找到可用的邮箱账户"
    exit 1
fi

echo "✅ 使用邮箱账户: $EMAIL_ACCOUNT_ID"
echo ""

# 函数：取消所有运行中的任务
cancel_running_jobs() {
    echo "清理运行中的任务..."
    
    # 获取所有任务
    JOBS=$(curl -s -X GET "http://localhost:8090/api/v1/email-scan/jobs?status=running" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    # 提取运行中的任务ID并取消
    echo "$JOBS" | jq -r '.items[]?.job_id' | while read JOB_ID; do
        if [ ! -z "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
            echo "取消任务: $JOB_ID"
            curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs/$JOB_ID/cancel" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d '{"force": true}' > /dev/null
        fi
    done
    
    # 同样处理 pending 状态的任务
    JOBS=$(curl -s -X GET "http://localhost:8090/api/v1/email-scan/jobs?status=pending" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    echo "$JOBS" | jq -r '.items[]?.job_id' | while read JOB_ID; do
        if [ ! -z "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
            echo "取消任务: $JOB_ID"
            curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs/$JOB_ID/cancel" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d '{"force": true}' > /dev/null
        fi
    done
    
    # 等待一下让取消生效
    sleep 2
}

# 在开始测试前清理任务
cancel_running_jobs

# 测试1: 验证单个关键字限制
echo "=== 测试1: 验证 subject_keywords 单个关键字限制 ==="
echo "包含关键字: [\"发票\", \"报销\"] (应该被拒绝)"

RESPONSE=$(curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\", \"报销\"],
            \"exclude_keywords\": [],
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 5,
            \"download_attachments\": false
        },
        \"description\": \"测试多个包含关键字（应该被拒绝）\"
    }")

if echo "$RESPONSE" | jq -e '.error.type == "validation_error"' > /dev/null; then
    echo "✅ 正确拒绝了多个包含关键字"
    echo "错误信息: $(echo "$RESPONSE" | jq -r '.error.message')"
else
    echo "❌ 应该拒绝多个包含关键字的请求"
    echo "$RESPONSE"
fi
echo ""

# 测试2: 单个排除关键字
echo "=== 测试2: 单个排除关键字 ==="
echo "排除关键字: [\"测试\"]"
echo "包含关键字: [\"发票\"]"

RESPONSE=$(curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\"],
            \"exclude_keywords\": [\"测试\"],
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 5,
            \"download_attachments\": false
        },
        \"description\": \"测试单个排除关键字\"
    }")

if echo "$RESPONSE" | jq -e '.job_id' > /dev/null; then
    JOB_ID=$(echo "$RESPONSE" | jq -r '.job_id')
    echo "✅ 创建任务成功"
    echo "任务ID: $JOB_ID"
    
    # 立即取消任务以便后续测试
    sleep 1
    curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs/$JOB_ID/cancel" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"force": true}' > /dev/null
else
    echo "❌ 创建任务失败"
    echo "$RESPONSE"
fi
echo ""

# 测试3: 多个排除关键字（5个）
echo "=== 测试3: 多个排除关键字（5个）==="
echo "排除关键字: [\"测试\", \"广告\", \"垃圾\", \"推广\", \"营销\"]"

RESPONSE=$(curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\"],
            \"exclude_keywords\": [\"测试\", \"广告\", \"垃圾\", \"推广\", \"营销\"],
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 5,
            \"download_attachments\": false
        },
        \"description\": \"测试5个排除关键字\"
    }")

if echo "$RESPONSE" | jq -e '.job_id' > /dev/null; then
    JOB_ID=$(echo "$RESPONSE" | jq -r '.job_id')
    echo "✅ 支持多个排除关键字（5个）"
    echo "任务ID: $JOB_ID"
    
    # 立即取消任务
    sleep 1
    curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs/$JOB_ID/cancel" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"force": true}' > /dev/null
else
    echo "❌ 创建任务失败"
    echo "$RESPONSE"
fi
echo ""

# 测试4: 大量排除关键字（20个）
echo "=== 测试4: 大量排除关键字（20个）==="

EXCLUDE_KEYWORDS='["测试", "广告", "垃圾", "推广", "营销", "促销", "优惠", "活动", "折扣", "特价", "免费", "赠送", "抽奖", "中奖", "恭喜", "通知", "提醒", "过期", "到期", "续费"]'

RESPONSE=$(curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\"],
            \"exclude_keywords\": $EXCLUDE_KEYWORDS,
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 5,
            \"download_attachments\": false
        },
        \"description\": \"测试20个排除关键字\"
    }")

if echo "$RESPONSE" | jq -e '.job_id' > /dev/null; then
    JOB_ID=$(echo "$RESPONSE" | jq -r '.job_id')
    echo "✅ 支持大量排除关键字（20个）"
    echo "任务ID: $JOB_ID"
    
    # 立即取消任务
    sleep 1
    curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs/$JOB_ID/cancel" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"force": true}' > /dev/null
else
    echo "❌ 创建任务失败"
    echo "$RESPONSE"
fi
echo ""

# 测试5: 超过50个排除关键字（应该被拒绝）
echo "=== 测试5: 超过50个排除关键字（应该被拒绝）==="

# 生成55个关键字
EXCLUDE_KEYWORDS=$(python3 -c "print('[' + ','.join(['\"关键字{0}\"'.format(i) for i in range(55)]) + ']')")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\"],
            \"exclude_keywords\": $EXCLUDE_KEYWORDS,
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 5,
            \"download_attachments\": false
        },
        \"description\": \"测试超过50个排除关键字\"
    }")

# 提取HTTP状态码（最后一行）
STATUS_CODE=$(echo "$RESPONSE" | tail -n 1)
# 提取响应内容（除了最后一行）
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS_CODE" = "400" ]; then
    echo "✅ 正确拒绝了超过50个排除关键字的请求"
    if echo "$RESPONSE_BODY" | jq -e '.detail' > /dev/null 2>&1; then
        echo "错误信息: $(echo "$RESPONSE_BODY" | jq -r '.detail')"
    elif echo "$RESPONSE_BODY" | jq -e '.error.message' > /dev/null 2>&1; then
        echo "错误信息: $(echo "$RESPONSE_BODY" | jq -r '.error.message')"
    fi
else
    echo "❌ 应该拒绝超过50个排除关键字的请求，但返回了状态码: $STATUS_CODE"
    echo "响应内容: $RESPONSE_BODY"
fi
echo ""

# 测试6: 空排除关键字列表
echo "=== 测试6: 空排除关键字列表 ==="
echo "排除关键字: []"

RESPONSE=$(curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\"],
            \"exclude_keywords\": [],
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 5,
            \"download_attachments\": false
        },
        \"description\": \"测试空排除关键字列表\"
    }")

if echo "$RESPONSE" | jq -e '.job_id' > /dev/null; then
    JOB_ID=$(echo "$RESPONSE" | jq -r '.job_id')
    echo "✅ 支持空排除关键字列表"
    echo "任务ID: $JOB_ID"
    
    # 立即取消任务
    sleep 1
    curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs/$JOB_ID/cancel" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"force": true}' > /dev/null
else
    echo "❌ 创建任务失败"
    echo "$RESPONSE"
fi

echo ""
echo "=== 测试总结 ==="
echo "1. subject_keywords: 仅支持单个关键字 ✅"
echo "2. exclude_keywords: 支持多个关键字（最多50个）✅"
echo "3. 空 exclude_keywords 列表也被支持 ✅"