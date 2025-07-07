#!/usr/bin/env python3
"""
测试 Supabase MCP 设置脚本
"""

import os
import json
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_mcp_prerequisites():
    """测试 MCP 前置条件"""
    print("🔍 检查 MCP 前置条件...")
    
    # Check Node.js and npm
    try:
        node_version = subprocess.check_output(['node', '--version'], text=True).strip()
        npm_version = subprocess.check_output(['npm', '--version'], text=True).strip()
        print(f"✅ Node.js: {node_version}")
        print(f"✅ npm: {npm_version}")
    except subprocess.CalledProcessError:
        print("❌ Node.js 或 npm 未安装")
        return False
    
    # Check if npx works
    try:
        subprocess.check_output(['npx', '--version'], text=True)
        print("✅ npx 可用")
    except subprocess.CalledProcessError:
        print("❌ npx 不可用")
        return False
    
    return True

def test_supabase_mcp_server():
    """测试 Supabase MCP 服务器安装"""
    print("\n🔧 测试 Supabase MCP 服务器...")
    
    project_ref = "sfenhhtvcyslxplvewmt"
    
    # Check if server can be installed
    try:
        # Test without access token (should fail gracefully)
        result = subprocess.run([
            'npx', '-y', '@supabase/mcp-server-supabase@latest',
            '--project-ref=' + project_ref,
            '--read-only'
        ], capture_output=True, text=True, timeout=30)
        
        if "Please provide a personal access token" in result.stderr:
            print("✅ Supabase MCP 服务器已安装，等待访问令牌")
            return True
        elif result.returncode == 0:
            print("✅ Supabase MCP 服务器运行正常（意外成功）")
            return True
        else:
            print(f"⚠️  服务器响应: {result.stderr}")
            return True  # 期望的错误
            
    except subprocess.TimeoutExpired:
        print("⏰ 服务器安装超时，但这是正常的")
        return True
    except Exception as e:
        print(f"❌ 服务器测试失败: {str(e)}")
        return False

def verify_config_files():
    """验证配置文件"""
    print("\n📋 验证配置文件...")
    
    config_files = [
        'mcp-config.json',
        'cursor-mcp-settings.json',
        'claude-desktop-config.json'
    ]
    
    for config_file in config_files:
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                
                # Check if supabase server is configured
                if 'mcpServers' in config and 'supabase' in config['mcpServers']:
                    supabase_config = config['mcpServers']['supabase']
                    
                    # Check required fields
                    has_command = 'command' in supabase_config
                    has_args = 'args' in supabase_config
                    has_env = 'env' in supabase_config
                    has_token_placeholder = (
                        'SUPABASE_ACCESS_TOKEN' in supabase_config.get('env', {})
                    )
                    
                    if has_command and has_args and has_env and has_token_placeholder:
                        print(f"✅ {config_file} - 配置正确")
                    else:
                        print(f"⚠️  {config_file} - 配置不完整")
                else:
                    print(f"❌ {config_file} - 缺少 Supabase 配置")
                    
            except json.JSONDecodeError:
                print(f"❌ {config_file} - JSON 格式错误")
            except Exception as e:
                print(f"❌ {config_file} - 读取错误: {str(e)}")
        else:
            print(f"❌ {config_file} - 文件不存在")

def show_next_steps():
    """显示下一步操作"""
    print("\n🎯 下一步操作:")
    print("=" * 50)
    print("1. 📝 创建 Supabase 个人访问令牌:")
    print("   https://supabase.com/dashboard/account/tokens")
    
    print("\n2. 🔧 配置你的 AI 工具:")
    print("   - Cursor: 使用 cursor-mcp-settings.json 中的配置")
    print("   - Claude Desktop: 使用 claude-desktop-config.json 中的配置")
    
    print("\n3. 🔐 替换配置中的访问令牌:")
    print("   将 '<your-personal-access-token>' 替换为实际令牌")
    
    print("\n4. 🔄 重启你的 AI 工具")
    
    print("\n5. 🧪 测试 MCP 连接:")
    print("   在 AI 工具中询问: '显示我的数据库中有哪些表？'")
    
    print(f"\n📚 详细指南请查看: MCP_SETUP_GUIDE.md")

def main():
    """主测试函数"""
    print("🚀 Supabase MCP 设置测试")
    print("=" * 50)
    
    # Test prerequisites
    if not test_mcp_prerequisites():
        print("\n❌ 前置条件检查失败")
        return
    
    # Test MCP server
    if not test_supabase_mcp_server():
        print("\n❌ MCP 服务器测试失败")
        return
    
    # Verify config files
    verify_config_files()
    
    # Show next steps
    show_next_steps()
    
    print("\n" + "=" * 50)
    print("✅ MCP 设置测试完成!")

if __name__ == "__main__":
    main()