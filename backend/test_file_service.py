"""
文件服务单元测试

测试文件服务的核心功能，不依赖数据库。
"""

import asyncio
import tempfile
from pathlib import Path
from uuid import uuid4

from app.services.file_service import FileService, validate_pdf_file
from app.core.exceptions import ValidationError

async def test_file_service():
    """测试文件服务核心功能"""
    
    print("🧪 开始测试文件服务...")
    
    # 初始化文件服务
    file_service = FileService()
    
    print(f"📁 上传目录: {file_service.upload_dir}")
    print(f"📊 最大文件大小: {file_service.MAX_FILE_SIZE // (1024*1024)}MB")
    print(f"📄 支持的MIME类型: {len(file_service.ALLOWED_MIME_TYPES)}")
    
    # 测试哈希计算
    test_content = b"Hello, World!"
    file_hash = await file_service.calculate_file_hash(test_content)
    print(f"🔐 哈希计算测试: {file_hash[:16]}...")
    
    # 测试用户目录创建
    test_user_id = uuid4()
    user_dir = file_service.get_user_upload_dir(test_user_id)
    print(f"👤 用户目录: {user_dir}")
    print(f"   目录存在: {user_dir.exists()}")
    
    # 测试文件名生成
    unique_filename = file_service.generate_unique_filename("test.pdf", file_hash)
    print(f"📝 唯一文件名: {unique_filename}")
    
    # 测试文件URL生成
    file_url = file_service.get_file_url("user_123/test.pdf")
    print(f"🔗 文件URL: {file_url}")
    
    print("✅ 文件服务核心功能测试完成")


async def test_file_validation():
    """测试文件验证功能"""
    
    print("\n🧪 测试文件验证功能...")
    
    # 模拟UploadFile对象
    class MockUploadFile:
        def __init__(self, filename, content_type, size):
            self.filename = filename
            self.content_type = content_type
            self.size = size
    
    file_service = FileService()
    
    # 测试有效PDF文件
    try:
        pdf_file = MockUploadFile("test.pdf", "application/pdf", 1024)
        await file_service.validate_file(pdf_file)
        print("✅ 有效PDF文件验证通过")
    except ValidationError as e:
        print(f"❌ PDF文件验证失败: {e}")
    
    # 测试文件过大
    try:
        large_file = MockUploadFile("large.pdf", "application/pdf", 20 * 1024 * 1024)
        await file_service.validate_file(large_file)
        print("❌ 大文件应该被拒绝")
    except ValidationError as e:
        print(f"✅ 大文件正确被拒绝: {e}")
    
    # 测试不支持的文件类型
    try:
        exe_file = MockUploadFile("virus.exe", "application/octet-stream", 1024)
        await file_service.validate_file(exe_file)
        print("❌ 不支持的文件类型应该被拒绝")
    except ValidationError as e:
        print(f"✅ 不支持的文件类型正确被拒绝: {e}")
    
    # 测试无文件名
    try:
        no_name_file = MockUploadFile(None, "application/pdf", 1024)
        await file_service.validate_file(no_name_file)
        print("❌ 无文件名应该被拒绝")
    except ValidationError as e:
        print(f"✅ 无文件名正确被拒绝: {e}")
    
    print("✅ 文件验证功能测试完成")


async def test_file_operations():
    """测试文件操作"""
    
    print("\n🧪 测试文件操作...")
    
    file_service = FileService()
    
    # 创建临时测试文件
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        test_content = b"%PDF-1.4\nTest PDF content\n%%EOF"
        tmp_file.write(test_content)
        tmp_file_path = tmp_file.name
    
    try:
        # 测试文件信息获取（不存在的文件）
        file_info = await file_service.get_file_info("nonexistent/file.pdf")
        if file_info is None:
            print("✅ 不存在文件正确返回None")
        else:
            print("❌ 不存在文件应该返回None")
        
        # 测试文件删除（不存在的文件）
        delete_result = await file_service.delete_file("nonexistent/file.pdf")
        if not delete_result:
            print("✅ 删除不存在文件正确返回False")
        else:
            print("❌ 删除不存在文件应该返回False")
        
        # 测试重复文件检查
        test_user_id = uuid4()
        test_hash = "abcd1234"
        existing_file = await file_service.check_file_exists(test_hash, test_user_id)
        if existing_file is None:
            print("✅ 不存在的哈希文件正确返回None")
        else:
            print("❌ 不存在的哈希文件应该返回None")
    
    finally:
        # 清理临时文件
        Path(tmp_file_path).unlink(missing_ok=True)
    
    print("✅ 文件操作测试完成")


def test_api_routes():
    """测试API路由注册"""
    
    print("\n🧪 测试API路由...")
    
    from app.main import app
    
    # 检查文件相关路由
    file_routes = []
    for route in app.routes:
        if hasattr(route, 'path') and '/files' in route.path:
            file_routes.append((route.methods, route.path))
    
    expected_routes = [
        ({'POST'}, '/api/v1/files/upload'),
        ({'POST'}, '/api/v1/files/upload-invoice'),
        ({'GET'}, '/api/v1/files/download/{file_path:path}'),
        ({'GET'}, '/api/v1/files/list'),
        ({'DELETE'}, '/api/v1/files/{file_path:path}'),
        ({'GET'}, '/api/v1/files/info/{file_path:path}'),
    ]
    
    print(f"📊 找到 {len(file_routes)} 个文件路由")
    for methods, path in file_routes:
        print(f"   {methods} {path}")
    
    if len(file_routes) == len(expected_routes):
        print("✅ 所有预期的文件路由都已注册")
    else:
        print(f"❌ 路由数量不匹配，期望 {len(expected_routes)}，实际 {len(file_routes)}")
    
    print("✅ API路由测试完成")


async def main():
    """运行所有测试"""
    await test_file_service()
    await test_file_validation()
    await test_file_operations()
    test_api_routes()
    print("\n🎉 所有文件服务测试完成！")


if __name__ == "__main__":
    asyncio.run(main())