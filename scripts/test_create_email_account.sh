#!/bin/bash

echo "=============================="
echo "创建测试邮箱账户"
echo "=============================="

# 获取访问令牌
echo "1. 获取访问令牌..."
AUTH_RESPONSE=$(curl -s -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE" \
    -H "Content-Type: application/json" \
    -d @backend/test_output/results/auth_request.json)

ACCESS_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')

if [ "$ACCESS_TOKEN" == "null" ]; then
    echo "✗ 认证失败"
    exit 1
fi

echo "✓ 认证成功"

# 检查现有邮箱账户
echo -e "\n2. 检查现有邮箱账户..."
ACCOUNTS=$(curl -s -X GET "http://localhost:8090/api/v1/email-accounts" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "当前邮箱账户："
echo $ACCOUNTS | jq .

# 如果没有账户，创建一个测试账户
ACCOUNT_COUNT=$(echo $ACCOUNTS | jq '.data | length')
if [ "$ACCOUNT_COUNT" == "0" ] || [ "$ACCOUNT_COUNT" == "null" ]; then
    echo -e "\n3. 创建测试邮箱账户..."
    
    # 创建测试邮箱账户数据
    EMAIL_ACCOUNT_DATA='{
        "email": "test@example.com",
        "provider": "qq",
        "imap_host": "imap.qq.com",
        "imap_port": 993,
        "smtp_host": "smtp.qq.com",
        "smtp_port": 465,
        "password": "test_password_123",
        "status": "active"
    }'
    
    echo "创建邮箱账户："
    echo $EMAIL_ACCOUNT_DATA | jq .
    
    CREATE_RESPONSE=$(curl -s -X POST "http://localhost:8090/api/v1/email-accounts" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "${EMAIL_ACCOUNT_DATA}")
    
    echo -e "\n响应："
    echo $CREATE_RESPONSE | jq .
    
    if [ "$(echo $CREATE_RESPONSE | jq -r '.success')" == "true" ]; then
        echo "✓ 邮箱账户创建成功"
        ACCOUNT_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')
        echo "账户ID: $ACCOUNT_ID"
    else
        echo "✗ 创建失败"
    fi
else
    echo "✓ 已有 $ACCOUNT_COUNT 个邮箱账户"
fi

# 再次列出所有账户
echo -e "\n4. 列出所有邮箱账户..."
FINAL_ACCOUNTS=$(curl -s -X GET "http://localhost:8090/api/v1/email-accounts" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo $FINAL_ACCOUNTS | jq '.data[] | {id: .id, email: .email, provider: .provider, status: .status}'