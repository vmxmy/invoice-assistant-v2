#!/bin/bash

echo "🔧 配置国内镜像源..."

# 检测系统版本
if [ -f /etc/redhat-release ]; then
    VERSION=$(rpm -q --qf "%{VERSION}" $(rpm -qa | grep -E "^(centos|redhat|rocky|almalinux)-release" | head -1))
    DISTRO=$(rpm -qa | grep -E "^(centos|redhat|rocky|almalinux)-release" | head -1 | cut -d'-' -f1)
    echo "检测到系统: $DISTRO $VERSION"
else
    echo "❌ 不是 RedHat 系列系统"
    exit 1
fi

# 备份原有配置
echo "📦 备份原有配置..."
sudo cp -r /etc/yum.repos.d /etc/yum.repos.d.backup.$(date +%Y%m%d)

# 删除有问题的源
echo "🗑️  清理问题源..."
sudo rm -f /etc/yum.repos.d/github-cli.repo

# 根据系统版本配置源
case "$DISTRO" in
    "centos")
        if [ "$VERSION" = "7" ]; then
            echo "📥 配置 CentOS 7 阿里云源..."
            sudo curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.repo
            sudo curl -o /etc/yum.repos.d/epel.repo https://mirrors.aliyun.com/repo/epel-7.repo
        elif [ "$VERSION" = "8" ]; then
            echo "📥 配置 CentOS 8 阿里云源..."
            sudo sed -i 's|^mirrorlist=|#mirrorlist=|g' /etc/yum.repos.d/CentOS-*.repo
            sudo sed -i 's|^#baseurl=http://mirror.centos.org|baseurl=https://mirrors.aliyun.com|g' /etc/yum.repos.d/CentOS-*.repo
        fi
        ;;
    "rocky")
        echo "📥 配置 Rocky Linux 阿里云源..."
        sudo sed -i 's|^mirrorlist=|#mirrorlist=|g' /etc/yum.repos.d/Rocky-*.repo
        sudo sed -i 's|^#baseurl=http://dl.rockylinux.org/$contentdir|baseurl=https://mirrors.aliyun.com/rockylinux|g' /etc/yum.repos.d/Rocky-*.repo
        ;;
    "almalinux")
        echo "📥 配置 AlmaLinux 阿里云源..."
        sudo sed -i 's|^mirrorlist=|#mirrorlist=|g' /etc/yum.repos.d/almalinux*.repo
        sudo sed -i 's|^# baseurl=|baseurl=|g' /etc/yum.repos.d/almalinux*.repo
        sudo sed -i 's|https://repo.almalinux.org|https://mirrors.aliyun.com|g' /etc/yum.repos.d/almalinux*.repo
        ;;
    *)
        echo "⚠️  未知的系统: $DISTRO"
        ;;
esac

# 配置 EPEL 源
echo "📥 配置 EPEL 源..."
if [ "$VERSION" = "7" ]; then
    sudo yum install -y epel-release
    sudo sed -i 's|^metalink=|#metalink=|g' /etc/yum.repos.d/epel*.repo
    sudo sed -i 's|^#baseurl=|baseurl=|g' /etc/yum.repos.d/epel*.repo
    sudo sed -i 's|https://download.fedoraproject.org/pub|https://mirrors.aliyun.com|g' /etc/yum.repos.d/epel*.repo
else
    sudo dnf install -y epel-release
    sudo sed -i 's|^metalink=|#metalink=|g' /etc/yum.repos.d/epel*.repo
    sudo sed -i 's|^#baseurl=|baseurl=|g' /etc/yum.repos.d/epel*.repo
    sudo sed -i 's|https://download.example/pub|https://mirrors.aliyun.com|g' /etc/yum.repos.d/epel*.repo
fi

# 清理并重建缓存
echo "🔄 清理并重建缓存..."
if command -v dnf &> /dev/null; then
    sudo dnf clean all
    sudo dnf makecache
else
    sudo yum clean all
    sudo yum makecache
fi

echo "✅ 国内源配置完成！"
echo ""
echo "📋 可用命令:"
echo "   查看所有源: yum repolist"
echo "   安装软件包: yum install package-name"
echo "   搜索软件包: yum search package-name"
echo ""
echo "💡 如需恢复原有配置:"
echo "   sudo rm -rf /etc/yum.repos.d"
echo "   sudo mv /etc/yum.repos.d.backup.$(date +%Y%m%d) /etc/yum.repos.d"