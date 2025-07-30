#!/bin/bash

# 邮件正文获取测试运行脚本

echo "🚀 邮件正文获取测试"
echo "===================="

# 检查是否存在配置文件
if [ ! -f "email_config.json" ]; then
    echo "⚠️  配置文件 email_config.json 不存在"
    echo "📝 请复制 email_config_template.json 为 email_config.json 并填入你的邮箱配置"
    echo ""
    echo "步骤："
    echo "1. cp email_config_template.json email_config.json"
    echo "2. 编辑 email_config.json，填入真实的邮箱账号和密码"
    echo "3. 重新运行此脚本"
    exit 1
fi

echo "📋 选择测试模式："
echo "1. 简单测试 (测试最新1封邮件的多种获取方式)"
echo "2. 完整测试 (测试多封邮件的正文获取)"
echo ""
read -p "请选择 (1 或 2): " choice

case $choice in
    1)
        echo "🔍 运行简单测试..."
        deno run --allow-net --allow-read --allow-env simple_body_test.ts
        ;;
    2)
        echo "🔍 运行完整测试..."
        deno run --allow-net --allow-read --allow-env test_email_body_extraction.ts
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "✅ 测试完成！"