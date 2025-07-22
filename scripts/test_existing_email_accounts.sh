#!/bin/bash
# 测试现有邮箱账户的 API

# API 基础URL
API_BASE_URL="http://localhost:8090/api/v1"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== 测试现有邮箱账户 API ===${NC}"

# 1. 获取认证 token
echo -e "\n${GREEN}1. 获取认证 token${NC}"
TOKEN=$(curl -s -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE" \
    -H "Content-Type: application/json" \
    -d @backend/test_output/results/auth_request.json | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}获取 token 失败${NC}"
    exit 1
fi

echo "Token 获取成功: ${TOKEN:0:20}..."

# 2. 获取邮箱账户列表
echo -e "\n${GREEN}2. 获取邮箱账户列表${NC}"
ACCOUNTS_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/email-accounts" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

echo "响应状态和内容:"
echo "$ACCOUNTS_RESPONSE" | jq '.'

# 检查是否有错误
ERROR=$(echo "$ACCOUNTS_RESPONSE" | jq -r '.error // empty')
if [ ! -z "$ERROR" ]; then
    echo -e "${RED}API 错误: $ERROR${NC}"
    exit 1
fi

# 获取账户数据 - API 返回的是 items 字段
ACCOUNTS_DATA=$(echo "$ACCOUNTS_RESPONSE" | jq '.items // empty')
if [ -z "$ACCOUNTS_DATA" ] || [ "$ACCOUNTS_DATA" = "null" ]; then
    echo -e "${RED}无法获取账户数据${NC}"
    exit 1
fi

# 显示账户信息
ACCOUNT_COUNT=$(echo "$ACCOUNTS_DATA" | jq 'length')
echo -e "\n找到 ${YELLOW}${ACCOUNT_COUNT}${NC} 个邮箱账户:"

echo "$ACCOUNTS_DATA" | jq -r '.[] | "- \(.email_address) (\(.email_provider)) - 状态: \(if .is_active then "活跃" else "未激活" end) - ID: \(.id)"'

# 选择第一个活跃的账户
ACCOUNT_ID=$(echo "$ACCOUNTS_DATA" | jq -r '.[] | select(.is_active == true) | .id' | head -n 1)

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "null" ]; then
    echo -e "${RED}没有找到活跃的邮箱账户${NC}"
    exit 1
fi

ACCOUNT_EMAIL=$(echo "$ACCOUNTS_DATA" | jq -r ".[] | select(.id == \"$ACCOUNT_ID\") | .email_address")
echo -e "\n使用账户: ${GREEN}${ACCOUNT_EMAIL}${NC} (ID: $ACCOUNT_ID)"

# 3. 测试邮箱连接
echo -e "\n${GREEN}3. 测试邮箱连接${NC}"
TEST_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/email-accounts/${ACCOUNT_ID}/test" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

echo "连接测试响应:"
echo "$TEST_RESPONSE" | jq '.'

TEST_SUCCESS=$(echo "$TEST_RESPONSE" | jq -r '.success // false')
if [ "$TEST_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ 邮箱连接测试成功${NC}"
else
    echo -e "${RED}✗ 邮箱连接测试失败${NC}"
    TEST_ERROR=$(echo "$TEST_RESPONSE" | jq -r '.error_detail // .message // "未知错误"')
    echo "错误信息: $TEST_ERROR"
fi

# 4. 创建邮件扫描任务（简单测试）
echo -e "\n${GREEN}4. 创建简单邮件扫描任务${NC}"
SCAN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "email_account_id": "'"$ACCOUNT_ID"'",
        "scan_params": {
            "folders": ["INBOX"],
            "subject_keywords": ["发票", "invoice"],
            "max_emails": 5,
            "download_attachments": false,
            "process_invoices": false
        }
    }')

echo "扫描任务创建响应:"
echo "$SCAN_RESPONSE" | jq '.'

# 提取任务ID
JOB_ID=$(echo "$SCAN_RESPONSE" | jq -r '.data.job_id // empty')

if [ ! -z "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
    echo -e "\n扫描任务ID: ${GREEN}$JOB_ID${NC}"
    
    # 5. 监控任务状态
    echo -e "\n${GREEN}5. 监控任务状态${NC}"
    for i in {1..15}; do
        sleep 2
        STATUS_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/email-scan/jobs/${JOB_ID}" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json")
        
        STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status // empty')
        PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.data.progress // 0')
        CURRENT_STEP=$(echo "$STATUS_RESPONSE" | jq -r '.data.current_step // ""')
        
        echo "第 $i 次检查 - 状态: $STATUS, 进度: $PROGRESS%, 步骤: $CURRENT_STEP"
        
        if [ "$STATUS" = "completed" ]; then
            echo -e "${GREEN}✓ 任务完成!${NC}"
            echo "完整结果:"
            echo "$STATUS_RESPONSE" | jq '.data'
            break
        elif [ "$STATUS" = "failed" ]; then
            echo -e "${RED}✗ 任务失败!${NC}"
            ERROR_MSG=$(echo "$STATUS_RESPONSE" | jq -r '.data.error_message // "未知错误"')
            echo "错误信息: $ERROR_MSG"
            break
        fi
        
        if [ $i -eq 15 ]; then
            echo -e "${YELLOW}任务仍在执行中，停止监控${NC}"
        fi
    done
else
    echo -e "${RED}无法创建扫描任务${NC}"
fi

# 6. 测试获取任务历史
echo -e "\n${GREEN}6. 获取扫描任务历史${NC}"
JOBS_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/email-scan/jobs?limit=5" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

echo "任务历史响应:"
echo "$JOBS_RESPONSE" | jq '.data | length as $count | "找到 \($count) 个任务"'
echo "$JOBS_RESPONSE" | jq -r '.data[]? | "- \(.job_id) | 状态: \(.status) | 创建时间: \(.created_at) | 账户: \(.email_account_id)"'

echo -e "\n${GREEN}测试完成!${NC}"

# 总结
echo -e "\n${YELLOW}=== 测试总结 ===${NC}"
echo "1. Token 获取: ✓"
echo "2. 账户列表获取: ✓ (找到 $ACCOUNT_COUNT 个账户)"
echo "3. 邮箱连接测试: $([ "$TEST_SUCCESS" = "true" ] && echo "✓" || echo "✗")"
echo "4. 扫描任务创建: $([ ! -z "$JOB_ID" ] && [ "$JOB_ID" != "null" ] && echo "✓" || echo "✗")"
echo "5. 使用的是现代化的 imapclient 库替代了旧的 imaplib"