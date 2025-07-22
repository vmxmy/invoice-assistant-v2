#!/bin/bash
# 简化版的API限制测试脚本

# API 基础URL
API_BASE_URL="http://localhost:8090/api/v1"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 测试邮件API限制和时间范围 ===${NC}"

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

# 2. 获取邮箱账户
echo -e "\n${GREEN}2. 获取邮箱账户${NC}"
ACCOUNT_ID=$(curl -s -X GET "${API_BASE_URL}/email-accounts" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq -r '.items[0].id')

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "null" ]; then
    echo -e "${RED}无法获取邮箱账户${NC}"
    exit 1
fi

ACCOUNT_EMAIL=$(curl -s -X GET "${API_BASE_URL}/email-accounts" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq -r '.items[0].email_address')

echo "使用账户: $ACCOUNT_EMAIL (ID: $ACCOUNT_ID)"

# 测试函数：监控任务状态
monitor_job() {
    local job_id=$1
    local test_name=$2
    local max_checks=${3:-30}
    
    echo "监控任务: $job_id ($test_name)"
    
    for i in $(seq 1 $max_checks); do
        sleep 2
        
        RESULT=$(curl -s -X GET "${API_BASE_URL}/email-scan/jobs/${job_id}" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json")
        
        STATUS=$(echo "$RESULT" | jq -r '.data.status // "unknown"')
        PROGRESS=$(echo "$RESULT" | jq -r '.data.progress // 0')
        STEP=$(echo "$RESULT" | jq -r '.data.current_step // ""')
        
        echo "  第 $i 次检查 - 状态: $STATUS, 进度: $PROGRESS%, 步骤: $STEP"
        
        if [ "$STATUS" = "completed" ]; then
            echo -e "  ${GREEN}✓ 任务完成${NC}"
            
            # 提取结果统计
            TOTAL_EMAILS=$(echo "$RESULT" | jq -r '.data.scan_results.total_emails // 0')
            MATCHED_EMAILS=$(echo "$RESULT" | jq -r '.data.scan_results.matched_emails // 0')
            RETURNED_COUNT=$(echo "$RESULT" | jq -r '.data.scan_results.emails | length // 0')
            
            echo "  📊 结果统计:"
            echo "    - 总邮件数: $TOTAL_EMAILS"
            echo "    - 匹配邮件数: $MATCHED_EMAILS"
            echo "    - 返回邮件数: $RETURNED_COUNT"
            
            # 返回结果用于分析
            echo "$RESULT" > "/tmp/scan_result_${test_name}.json"
            return 0
            
        elif [ "$STATUS" = "failed" ]; then
            echo -e "  ${RED}✗ 任务失败${NC}"
            ERROR_MSG=$(echo "$RESULT" | jq -r '.data.error_message // "未知错误"')
            echo "  错误: $ERROR_MSG"
            return 1
        fi
    done
    
    echo -e "  ${YELLOW}任务监控超时${NC}"
    return 2
}

# 测试1: 无限制邮件数量
echo -e "\n${BLUE}=== 测试1: 不设定任何限制的最大邮件数量 ===${NC}"

JOB_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/email-scan/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "email_account_id": "'"$ACCOUNT_ID"'",
        "scan_params": {
            "folders": ["INBOX"],
            "subject_keywords": ["发票", "invoice", "收据", "账单"],
            "download_attachments": false,
            "process_invoices": false
        }
    }')

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.data.job_id // empty')

if [ ! -z "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
    echo "创建无限制扫描任务成功: $JOB_ID"
    monitor_job "$JOB_ID" "unlimited" 60
    
    if [ -f "/tmp/scan_result_unlimited.json" ]; then
        UNLIMITED_COUNT=$(cat /tmp/scan_result_unlimited.json | jq -r '.data.scan_results.emails | length')
        echo -e "${YELLOW}📈 无限制测试结果: 返回了 $UNLIMITED_COUNT 封邮件${NC}"
    fi
else
    echo -e "${RED}创建无限制扫描任务失败${NC}"
    echo "$JOB_RESPONSE" | jq '.'
fi

echo -e "\n等待3秒后进行下一个测试..."
sleep 3

# 测试2: 时间范围限制测试
echo -e "\n${BLUE}=== 测试2: 时间范围限制收缩能否有效执行 ===${NC}"

# 定义时间范围
declare -a TIME_RANGES=(
    "最近7天:$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ):$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    "最近30天:$(date -u -v-30d +%Y-%m-%dT%H:%M:%SZ):$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    "最近3天:$(date -u -v-3d +%Y-%m-%dT%H:%M:%SZ):$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    "2024年全年:2024-01-01T00:00:00Z:2024-12-31T23:59:59Z"
)

RESULTS_SUMMARY=""

for range in "${TIME_RANGES[@]}"; do
    IFS=':' read -r name date_from date_to <<< "$range"
    
    echo -e "\n${GREEN}--- 测试时间范围: $name ---${NC}"
    echo "从 $date_from 到 $date_to"
    
    JOB_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/email-scan/jobs" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "email_account_id": "'"$ACCOUNT_ID"'",
            "scan_params": {
                "folders": ["INBOX"],
                "subject_keywords": ["发票", "invoice"],
                "date_from": "'"$date_from"'",
                "date_to": "'"$date_to"'",
                "max_emails": 20,
                "download_attachments": false,
                "process_invoices": false
            }
        }')
    
    JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.data.job_id // empty')
    
    if [ ! -z "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
        echo "创建时间范围扫描任务成功: $JOB_ID"
        if monitor_job "$JOB_ID" "timerange_$(echo $name | tr ' ' '_')" 30; then
            # 分析结果中的时间范围
            RESULT_FILE="/tmp/scan_result_timerange_$(echo $name | tr ' ' '_').json"
            if [ -f "$RESULT_FILE" ]; then
                EMAILS=$(cat "$RESULT_FILE" | jq -r '.data.scan_results.emails // []')
                EMAIL_COUNT=$(echo "$EMAILS" | jq 'length')
                
                if [ "$EMAIL_COUNT" -gt 0 ]; then
                    # 获取邮件日期范围
                    EARLIEST=$(echo "$EMAILS" | jq -r 'sort_by(.date) | .[0].date // "N/A"')
                    LATEST=$(echo "$EMAILS" | jq -r 'sort_by(.date) | .[-1].date // "N/A"')
                    
                    echo "  📅 实际邮件时间范围:"
                    echo "    - 最早: $EARLIEST"
                    echo "    - 最新: $LATEST"
                    
                    RESULTS_SUMMARY="${RESULTS_SUMMARY}\n$name: $EMAIL_COUNT 封邮件 ($EARLIEST 到 $LATEST)"
                else
                    RESULTS_SUMMARY="${RESULTS_SUMMARY}\n$name: 0 封邮件"
                fi
            fi
        fi
    else
        echo -e "${RED}创建时间范围扫描任务失败: $name${NC}"
        echo "$JOB_RESPONSE" | jq '.'
    fi
    
    # 在测试之间等待
    sleep 3
done

# 输出汇总结果
echo -e "\n${BLUE}=== 测试汇总 ===${NC}"
echo -e "${RESULTS_SUMMARY}"

# 清理临时文件
rm -f /tmp/scan_result_*.json

echo -e "\n${GREEN}测试完成!${NC}"