#!/bin/bash

# 测试 exclude_keywords 多关键字支持

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

# 测试1: 单个排除关键字
echo "=== 测试1: 单个排除关键字 ==="
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
            \"max_emails\": 10,
            \"download_attachments\": false
        },
        \"description\": \"测试单个排除关键字\"
    }")

if echo "$RESPONSE" | jq -e '.job_id' > /dev/null; then
    echo "✅ 创建任务成功"
    echo "任务ID: $(echo "$RESPONSE" | jq -r '.job_id')"
else
    echo "❌ 创建任务失败"
    echo "$RESPONSE"
fi
echo ""

# 测试2: 多个排除关键字
echo "=== 测试2: 多个排除关键字 ==="
echo "排除关键字: [\"测试\", \"广告\", \"垃圾\", \"推广\"]"
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
            \"exclude_keywords\": [\"测试\", \"广告\", \"垃圾\", \"推广\"],
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 10,
            \"download_attachments\": false
        },
        \"description\": \"测试多个排除关键字\"
    }")

if echo "$RESPONSE" | jq -e '.job_id' > /dev/null; then
    echo "✅ 创建任务成功"
    echo "任务ID: $(echo "$RESPONSE" | jq -r '.job_id')"
else
    echo "❌ 创建任务失败"
    echo "$RESPONSE"
fi
echo ""

# 测试3: 大量排除关键字（10个）
echo "=== 测试3: 大量排除关键字（10个）==="
echo "排除关键字: [\"测试\", \"广告\", \"垃圾\", \"推广\", \"营销\", \"促销\", \"优惠\", \"活动\", \"折扣\", \"特价\"]"

RESPONSE=$(curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\"],
            \"exclude_keywords\": [\"测试\", \"广告\", \"垃圾\", \"推广\", \"营销\", \"促销\", \"优惠\", \"活动\", \"折扣\", \"特价\"],
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 10,
            \"download_attachments\": false
        },
        \"description\": \"测试10个排除关键字\"
    }")

if echo "$RESPONSE" | jq -e '.job_id' > /dev/null; then
    echo "✅ 创建任务成功"
    echo "任务ID: $(echo "$RESPONSE" | jq -r '.job_id')"
else
    echo "❌ 创建任务失败"
    echo "$RESPONSE"
fi
echo ""

# 测试4: 空排除关键字列表
echo "=== 测试4: 空排除关键字列表 ==="
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
            \"max_emails\": 10,
            \"download_attachments\": false
        },
        \"description\": \"测试空排除关键字列表\"
    }")

if echo "$RESPONSE" | jq -e '.job_id' > /dev/null; then
    echo "✅ 创建任务成功"
    echo "任务ID: $(echo "$RESPONSE" | jq -r '.job_id')"
else
    echo "❌ 创建任务失败"
    echo "$RESPONSE"
fi
echo ""

# 测试5: 超过50个排除关键字
echo "=== 测试5: 超过50个排除关键字（应该被拒绝）==="

# 生成55个关键字
EXCLUDE_KEYWORDS=$(python3 -c "print(','.join(['\"关键字{0}\"'.format(i) for i in range(55)]))")

RESPONSE=$(curl -s -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\"],
            \"exclude_keywords\": [$EXCLUDE_KEYWORDS],
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 10,
            \"download_attachments\": false
        },
        \"description\": \"测试超过50个排除关键字\"
    }")

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:8090/api/v1/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email_account_id\": \"$EMAIL_ACCOUNT_ID\",
        \"job_type\": \"manual\",
        \"scan_params\": {
            \"folders\": [\"INBOX\"],
            \"subject_keywords\": [\"发票\"],
            \"exclude_keywords\": [$EXCLUDE_KEYWORDS],
            \"date_from\": \"2024-01-01\",
            \"max_emails\": 10,
            \"download_attachments\": false
        },
        \"description\": \"测试超过50个排除关键字\"
    }")

if [ "$STATUS_CODE" = "400" ]; then
    echo "✅ 正确拒绝了超过50个排除关键字的请求"
    echo "错误信息: $(echo "$RESPONSE" | jq -r '.detail')"
else
    echo "❌ 应该拒绝超过50个排除关键字的请求，但返回了状态码: $STATUS_CODE"
fi
echo ""

# 测试6: 测试包含关键字（应该被限制为单个）
echo "=== 测试6: 测试多个包含关键字（应该被拒绝）==="
echo "包含关键字: [\"发票\", \"报销\"]"

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
            \"max_emails\": 10,
            \"download_attachments\": false
        },
        \"description\": \"测试多个包含关键字\"
    }")

if echo "$RESPONSE" | jq -e '.detail' > /dev/null; then
    echo "✅ 正确拒绝了多个包含关键字的请求"
    echo "错误信息: $(echo "$RESPONSE" | jq -r '.detail')"
else
    echo "❌ 应该拒绝多个包含关键字的请求"
    echo "$RESPONSE"
fi

echo ""
echo "=== 测试完成 ==="