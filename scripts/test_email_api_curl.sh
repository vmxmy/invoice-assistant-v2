#!/bin/bash
# 测试使用 imapclient 后的邮件 API

# API 基础URL
API_BASE_URL="http://localhost:8090/api/v1"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== 测试邮件 API (使用 imapclient) ===${NC}"

# 1. 获取认证 token
echo -e "\n${GREEN}1. 获取认证 token${NC}"
TOKEN=$(curl -s -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE" \
    -H "Content-Type: application/json" \
    -d @backend/test_output/results/auth_request.json | jq -r '.access_token')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}获取 token 失败${NC}"
    exit 1
fi

echo "Token 获取成功: ${TOKEN:0:20}..."

# 2. 获取邮箱账户列表
echo -e "\n${GREEN}2. 获取邮箱账户列表${NC}"
ACCOUNTS=$(curl -s -X GET "${API_BASE_URL}/email-accounts" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

echo "$ACCOUNTS" | jq '.'

# 提取第一个账户ID
ACCOUNT_ID=$(echo "$ACCOUNTS" | jq -r '.data[0].id // empty')

if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${YELLOW}没有找到邮箱账户，创建测试账户${NC}"
    
    # 创建测试邮箱账户
    CREATE_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/email-accounts" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "email_address": "test@example.com",
            "password": "test_password",
            "display_name": "测试邮箱",
            "email_provider": "other",
            "imap_host": "imap.example.com",
            "imap_port": 993,
            "imap_use_ssl": true,
            "scan_folder": "INBOX",
            "scan_rules": {
                "subject_keywords": ["发票", "invoice"],
                "sender_whitelist": []
            },
            "is_active": true
        }')
    
    echo "$CREATE_RESPONSE" | jq '.'
    ACCOUNT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty')
fi

if [ ! -z "$ACCOUNT_ID" ]; then
    echo -e "\n使用账户ID: $ACCOUNT_ID"
    
    # 3. 测试邮箱连接
    echo -e "\n${GREEN}3. 测试邮箱连接${NC}"
    TEST_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/email-accounts/${ACCOUNT_ID}/test" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    echo "$TEST_RESPONSE" | jq '.'
    
    # 4. 创建邮件扫描任务
    echo -e "\n${GREEN}4. 创建邮件扫描任务${NC}"
    SCAN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/email-scan/jobs" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "email_account_ids": ["'"$ACCOUNT_ID"'"],
            "scan_type": "quick",
            "scan_params": {
                "folders": ["INBOX"],
                "subject_keywords": ["发票", "invoice", "收据"],
                "date_from": "'$(date -u -v-30d +%Y-%m-%dT%H:%M:%SZ)'",
                "date_to": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                "max_emails": 10,
                "download_attachments": true,
                "process_invoices": true
            }
        }')
    
    echo "$SCAN_RESPONSE" | jq '.'
    
    # 提取任务ID
    JOB_ID=$(echo "$SCAN_RESPONSE" | jq -r '.data.job_id // empty')
    
    if [ ! -z "$JOB_ID" ]; then
        echo -e "\n扫描任务ID: $JOB_ID"
        
        # 5. 检查任务状态
        echo -e "\n${GREEN}5. 检查任务状态${NC}"
        for i in {1..10}; do
            sleep 2
            STATUS_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/email-scan/jobs/${JOB_ID}" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json")
            
            STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status // empty')
            PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.data.progress // 0')
            
            echo "状态: $STATUS, 进度: $PROGRESS%"
            
            if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
                echo "$STATUS_RESPONSE" | jq '.'
                break
            fi
        done
    fi
fi

# 6. 测试特定功能
echo -e "\n${GREEN}6. 测试 IMAP 特定搜索功能${NC}"

# 测试中文搜索
echo -e "\n${YELLOW}测试中文主题搜索:${NC}"
curl -s -X POST "${API_BASE_URL}/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "email_account_ids": ["'"$ACCOUNT_ID"'"],
        "scan_type": "quick",
        "scan_params": {
            "folders": ["INBOX"],
            "subject_keywords": ["发票"],
            "max_emails": 5
        }
    }' | jq '.data | {job_id, scan_type, scan_params}'

echo -e "\n${GREEN}测试完成!${NC}"