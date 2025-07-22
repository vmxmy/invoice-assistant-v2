#!/bin/bash
# 测试邮箱账户重置功能

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# API基础URL
API_BASE="http://localhost:8090/api/v1"

# 获取用户token
echo -e "${YELLOW}获取用户token...${NC}"
TOKEN=$(curl -s -X POST "https://sfenhhtvcyslxplvewmt.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE" \
  -H "Content-Type: application/json" \
  -d @test_output/results/auth_request.json | jq -r '.access_token')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 无法获取token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 获取token成功${NC}"

# 1. 获取邮箱账户列表
echo -e "\n${YELLOW}1. 获取邮箱账户列表...${NC}"
ACCOUNTS=$(curl -s -X GET "$API_BASE/email-accounts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$ACCOUNTS" | jq -r '.items[] | "\(.id) - \(.email_address) - 同步状态: \(.sync_state.sync_mode // "未知")"'

# 获取第一个账户ID
ACCOUNT_ID=$(echo "$ACCOUNTS" | jq -r '.items[0].id')

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "null" ]; then
    echo -e "${RED}❌ 没有找到邮箱账户${NC}"
    exit 1
fi

EMAIL=$(echo "$ACCOUNTS" | jq -r '.items[0].email_address')
echo -e "${GREEN}✅ 使用账户: $EMAIL ($ACCOUNT_ID)${NC}"

# 2. 测试重置同步状态
echo -e "\n${YELLOW}2. 测试重置同步状态...${NC}"
RESET_SYNC_RESULT=$(curl -s -X POST "$API_BASE/email-accounts/$ACCOUNT_ID/reset-sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$RESET_SYNC_RESULT" | jq '.'

if [ "$(echo "$RESET_SYNC_RESULT" | jq -r '.success')" = "true" ]; then
    echo -e "${GREEN}✅ 同步状态重置成功${NC}"
else
    echo -e "${RED}❌ 同步状态重置失败${NC}"
fi

# 3. 测试完全重置账户数据
echo -e "\n${YELLOW}3. 测试完全重置账户数据...${NC}"
echo "警告：这将删除该账户的所有相关数据！"
read -p "是否继续？(y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    RESET_ALL_RESULT=$(curl -s -X POST "$API_BASE/email-accounts/$ACCOUNT_ID/reset-all" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    
    echo "$RESET_ALL_RESULT" | jq '.'
    
    if [ "$(echo "$RESET_ALL_RESULT" | jq -r '.success')" = "true" ]; then
        echo -e "${GREEN}✅ 账户数据完全重置成功${NC}"
        echo "删除的记录数："
        echo "$RESET_ALL_RESULT" | jq -r '.deleted_counts | to_entries[] | "  \(.key): \(.value)"'
    else
        echo -e "${RED}❌ 账户数据重置失败${NC}"
    fi
else
    echo -e "${YELLOW}跳过完全重置测试${NC}"
fi

# 4. 验证账户状态
echo -e "\n${YELLOW}4. 验证账户状态...${NC}"
ACCOUNT_STATUS=$(curl -s -X GET "$API_BASE/email-accounts/$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "账户当前状态："
echo "$ACCOUNT_STATUS" | jq '{
  email: .email_address,
  sync_mode: .sync_state.sync_mode,
  total_emails: .sync_state.total_emails_indexed,
  is_synced: .sync_state.is_synced
}'

echo -e "\n${GREEN}✅ 测试完成！${NC}"