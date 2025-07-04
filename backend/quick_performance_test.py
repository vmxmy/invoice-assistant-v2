#!/usr/bin/env python3
"""
快速性能诊断测试
快速定位PostgreSQL队列的性能瓶颈
"""

import asyncio
import sys
import time
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

import asyncpg
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def test_raw_database_connection():
    """测试原始数据库连接性能"""
    logger.info("🔗 测试原始数据库连接性能")
    
    db_url = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
    logger.info(f"连接URL: {db_url.split('@')[1] if '@' in db_url else 'masked'}")
    
    # 测试连接时间
    start_time = time.time()
    try:
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
        connect_time = time.time() - start_time
        logger.info(f"✅ 连接成功: {connect_time*1000:.2f}ms")
        
        # 测试简单查询
        start_time = time.time()
        result = await conn.fetchval("SELECT 1")
        query_time = time.time() - start_time
        logger.info(f"✅ 简单查询: {query_time*1000:.2f}ms")
        
        # 测试计数查询
        start_time = time.time()
        count = await conn.fetchval("SELECT COUNT(*) FROM task_queue")
        count_time = time.time() - start_time
        logger.info(f"✅ 计数查询: {count_time*1000:.2f}ms (结果: {count})")
        
        # 测试函数调用
        start_time = time.time()
        task_id = await conn.fetchval("""
            SELECT enqueue_task(
                'ocr_extract'::task_type,
                '{"test": "quick_test"}'::jsonb,
                NULL,
                5,
                0,
                3,
                'quick-test'
            )
        """)
        function_time = time.time() - start_time
        logger.info(f"✅ 函数调用: {function_time*1000:.2f}ms (任务ID: {task_id})")
        
        await conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 数据库连接测试失败: {e}")
        return False


async def test_connection_pool():
    """测试连接池性能"""
    logger.info("🏊 测试连接池性能")
    
    db_url = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
    
    try:
        # 创建连接池
        start_time = time.time()
        pool = await asyncpg.create_pool(
            db_url,
            min_size=2,
            max_size=5,
            command_timeout=30
        )
        pool_time = time.time() - start_time
        logger.info(f"✅ 连接池创建: {pool_time*1000:.2f}ms")
        
        # 测试从池中获取连接
        start_time = time.time()
        async with pool.acquire() as conn:
            acquire_time = time.time() - start_time
            logger.info(f"✅ 获取连接: {acquire_time*1000:.2f}ms")
            
            # 执行查询
            start_time = time.time()
            result = await conn.fetchval("SELECT COUNT(*) FROM task_queue WHERE status = 'pending'")
            query_time = time.time() - start_time
            logger.info(f"✅ 池化查询: {query_time*1000:.2f}ms (结果: {result})")
        
        # 测试多次操作
        logger.info("🔄 测试连续操作...")
        
        total_start = time.time()
        for i in range(5):
            start_time = time.time()
            async with pool.acquire() as conn:
                result = await conn.fetchval("SELECT $1", i)
            op_time = time.time() - start_time
            logger.info(f"   操作 {i+1}: {op_time*1000:.2f}ms")
        
        total_time = time.time() - total_start
        logger.info(f"✅ 5次操作总时间: {total_time*1000:.2f}ms")
        
        await pool.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ 连接池测试失败: {e}")
        return False


async def test_task_queue_operations():
    """测试任务队列操作性能"""
    logger.info("📋 测试任务队列操作性能")
    
    from app.services.postgresql_task_processor import task_queue
    
    try:
        # 测试入队操作
        logger.info("🔄 测试任务入队...")
        
        start_time = time.time()
        task_id = await task_queue.enqueue(
            task_type="ocr_extract",
            payload={"test": "performance_test"},
            priority=1,
            correlation_id="perf-test"
        )
        enqueue_time = time.time() - start_time
        logger.info(f"✅ 任务入队: {enqueue_time*1000:.2f}ms (ID: {task_id})")
        
        # 测试状态查询
        logger.info("🔍 测试状态查询...")
        
        start_time = time.time()
        status = await task_queue.get_task_status(task_id)
        query_time = time.time() - start_time
        logger.info(f"✅ 状态查询: {query_time*1000:.2f}ms")
        logger.info(f"   任务状态: {status['status'] if status else 'None'}")
        
        # 测试统计查询
        logger.info("📊 测试统计查询...")
        
        start_time = time.time()
        stats = await task_queue.get_task_stats(hours_back=1)
        stats_time = time.time() - start_time
        logger.info(f"✅ 统计查询: {stats_time*1000:.2f}ms (结果: {len(stats)} 条)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 任务队列操作测试失败: {e}")
        return False


async def test_network_latency():
    """测试网络延迟"""
    logger.info("🌐 测试网络延迟")
    
    import asyncpg
    
    db_url = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
    
    try:
        latencies = []
        
        for i in range(3):
            start_time = time.time()
            conn = await asyncpg.connect(db_url, statement_cache_size=0)
            await conn.fetchval("SELECT 1")
            await conn.close()
            end_time = time.time()
            
            latency = end_time - start_time
            latencies.append(latency)
            logger.info(f"   测试 {i+1}: {latency*1000:.2f}ms")
        
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        
        logger.info(f"✅ 平均延迟: {avg_latency*1000:.2f}ms")
        logger.info(f"   最小延迟: {min_latency*1000:.2f}ms")
        logger.info(f"   最大延迟: {max_latency*1000:.2f}ms")
        
        # 判断网络状况
        if avg_latency < 0.1:
            logger.info("🚀 网络状况: 优秀")
        elif avg_latency < 0.5:
            logger.info("✅ 网络状况: 良好")
        elif avg_latency < 1.0:
            logger.info("⚠️ 网络状况: 一般")
        else:
            logger.info("❌ 网络状况: 需要优化")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 网络延迟测试失败: {e}")
        return False


async def diagnose_performance_issues():
    """诊断性能问题"""
    logger.info("🔍 诊断性能问题")
    
    # 检查配置
    logger.info("⚙️ 检查配置...")
    logger.info(f"   数据库URL包含pooler: {'pooler' in settings.database_url}")
    logger.info(f"   数据库URL包含supabase: {'supabase' in settings.database_url}")
    logger.info(f"   调试模式: {settings.debug}")
    
    # 检查数据库状态
    db_url = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
    
    try:
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
        
        # 检查活跃连接数
        active_connections = await conn.fetchval("""
            SELECT count(*) 
            FROM pg_stat_activity 
            WHERE state = 'active'
        """)
        logger.info(f"   活跃连接数: {active_connections}")
        
        # 检查数据库版本
        version = await conn.fetchval("SELECT version()")
        logger.info(f"   数据库版本: {version[:50]}...")
        
        # 检查表大小
        table_size = await conn.fetchval("""
            SELECT pg_size_pretty(pg_total_relation_size('task_queue'))
        """)
        logger.info(f"   task_queue表大小: {table_size}")
        
        # 检查索引使用情况
        index_usage = await conn.fetch("""
            SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE tablename = 'task_queue'
        """)
        
        if index_usage:
            logger.info("   索引使用情况:")
            for idx in index_usage:
                logger.info(f"     {idx['indexname']}: 读取 {idx['idx_tup_read']}, 获取 {idx['idx_tup_fetch']}")
        else:
            logger.warning("   ⚠️ 没有找到索引使用统计")
        
        await conn.close()
        
    except Exception as e:
        logger.error(f"❌ 数据库状态检查失败: {e}")


async def main():
    """主函数"""
    logger.info("🚀 PostgreSQL任务队列快速性能诊断")
    logger.info("=" * 60)
    
    tests = [
        ("网络延迟测试", test_network_latency),
        ("原始数据库连接", test_raw_database_connection),
        ("连接池性能", test_connection_pool),
        ("任务队列操作", test_task_queue_operations),
    ]
    
    results = {}
    
    # 先诊断
    await diagnose_performance_issues()
    
    logger.info("\n" + "=" * 60)
    logger.info("开始性能测试")
    logger.info("=" * 60)
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*20} {test_name} {'='*20}")
        
        try:
            start_time = time.time()
            result = await test_func()
            end_time = time.time()
            
            test_duration = end_time - start_time
            results[test_name] = {
                "success": result,
                "duration": test_duration
            }
            
            status = "✅ 成功" if result else "❌ 失败"
            logger.info(f"{status} - 耗时: {test_duration:.2f}s")
            
        except Exception as e:
            logger.error(f"❌ 测试异常: {e}")
            results[test_name] = {"success": False, "error": str(e)}
    
    # 总结
    logger.info("\n" + "=" * 60)
    logger.info("性能诊断总结")
    logger.info("=" * 60)
    
    successful_tests = sum(1 for r in results.values() if r.get("success", False))
    total_tests = len(results)
    
    logger.info(f"📊 测试结果: {successful_tests}/{total_tests} 成功")
    
    for test_name, result in results.items():
        if result.get("success"):
            logger.info(f"✅ {test_name}: {result['duration']:.2f}s")
        else:
            logger.info(f"❌ {test_name}: 失败")
    
    # 性能建议
    logger.info("\n💡 性能优化建议:")
    
    if successful_tests == 0:
        logger.info("🔧 严重性能问题，建议检查:")
        logger.info("   - 网络连接到Supabase")
        logger.info("   - 数据库配置和权限")
        logger.info("   - 防火墙和代理设置")
    elif successful_tests < total_tests:
        logger.info("🔧 部分功能存在性能问题，建议:")
        logger.info("   - 实现连接池以复用连接")
        logger.info("   - 优化数据库查询")
        logger.info("   - 考虑添加缓存层")
    else:
        logger.info("🎉 所有测试通过！")
        logger.info("🔧 进一步优化建议:")
        logger.info("   - 监控生产环境性能")
        logger.info("   - 考虑批量操作优化")
    
    return 0 if successful_tests > 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)