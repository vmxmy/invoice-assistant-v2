#!/bin/bash

# 部署脚本使用示例
# 复制此文件为 deploy.local.sh 并根据实际情况修改配置

# 设置部署路径
export INVOICE_ASSIST_PATH="/var/www/html/invoice-assist"

# 执行部署
./deploy.sh

# 或者直接指定路径
# ./deploy.sh /var/www/html/invoice-assist

# 部署完成后的可选操作
echo "部署完成，重启 Nginx..."
# sudo systemctl restart nginx

echo "清理旧的备份文件（保留最近3个）..."
# find /var/www/html -name "invoice-assist_backup_*" -type d | sort -r | tail -n +4 | xargs rm -rf