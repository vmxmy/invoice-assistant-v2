"""
API测试脚本（不依赖数据库操作）

测试不需要数据库连接的API端点。
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_basic_endpoints():
    """测试基础端点"""
    
    print("🧪 测试基础API端点...")
    
    # 测试根路径
    response = client.get("/")
    print(f"📡 根路径: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   应用: {data['app']}")
        print(f"   版本: {data['version']}")
    
    # 测试应用信息
    response = client.get("/info")
    print(f"📊 应用信息: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   功能: {list(data['features'].keys())}")
    
    # 测试API版本信息
    response = client.get("/api/v1/version")
    print(f"🔢 API版本: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   端点数量: {len(data['endpoints'])}")
    
    print("✅ 基础端点测试完成")


def test_auth_endpoints():
    """测试认证端点（不依赖数据库）"""
    
    print("\n🧪 测试认证端点...")
    
    # 测试认证状态（无token）
    response = client.get("/api/v1/auth/status")
    print(f"🔐 认证状态（无token）: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   认证状态: {data['authenticated']}")
    
    # 测试认证状态（有测试token）
    headers = {"Authorization": "Bearer test-user-token"}
    response = client.get("/api/v1/auth/status", headers=headers)
    print(f"🔐 认证状态（测试token）: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   认证状态: {data['authenticated']}")
        print(f"   用户角色: {data['role']}")
    
    # 测试用户信息
    response = client.get("/api/v1/auth/me", headers=headers)
    print(f"👤 用户信息: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   用户邮箱: {data['email']}")
        print(f"   是否管理员: {data['is_admin']}")
    
    # 测试token验证
    response = client.post("/api/v1/auth/verify-token", headers=headers)
    print(f"🔑 Token验证: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Token有效: {data['valid']}")
    
    print("✅ 认证端点测试完成")


def test_error_handling():
    """测试错误处理"""
    
    print("\n🧪 测试错误处理...")
    
    # 测试无效路径
    response = client.get("/api/v1/nonexistent")
    print(f"❌ 无效路径: {response.status_code}")
    
    # 测试需要认证但无token的端点
    response = client.get("/api/v1/auth/me")
    print(f"🔒 无token访问受保护端点: {response.status_code}")
    
    # 测试无效token
    headers = {"Authorization": "Bearer invalid-token"}
    response = client.get("/api/v1/auth/me", headers=headers)
    print(f"🔒 无效token: {response.status_code}")
    
    print("✅ 错误处理测试完成")


def test_api_structure():
    """测试API结构"""
    
    print("\n🧪 测试API结构...")
    
    # 统计所有路由
    all_routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            if route.path.startswith('/api/v1'):
                all_routes.append((route.methods, route.path))
    
    print(f"📊 API v1 路由统计:")
    print(f"   总路由数: {len(all_routes)}")
    
    # 按模块分组
    modules = {}
    for methods, path in all_routes:
        if '/auth/' in path:
            modules.setdefault('auth', []).append((methods, path))
        elif '/users/' in path:
            modules.setdefault('users', []).append((methods, path))
        elif '/profiles/' in path:
            modules.setdefault('profiles', []).append((methods, path))
        elif '/invoices/' in path:
            modules.setdefault('invoices', []).append((methods, path))
        elif '/files/' in path:
            modules.setdefault('files', []).append((methods, path))
        else:
            modules.setdefault('other', []).append((methods, path))
    
    for module, routes in modules.items():
        print(f"   {module}: {len(routes)} 个端点")
    
    print("✅ API结构测试完成")


if __name__ == "__main__":
    test_basic_endpoints()
    test_auth_endpoints()
    test_error_handling()
    test_api_structure()
    print("\n🎉 所有API测试完成！")
    print("\n💡 注意: 数据库相关端点需要Supabase连接才能测试")