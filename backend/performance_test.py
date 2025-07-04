#!/usr/bin/env python3
"""
PostgreSQL任务队列性能测试
详细测试各项性能指标和瓶颈分析
"""

import asyncio
import sys
import time
import statistics
from pathlib import Path
from datetime import datetime, timezone
import concurrent.futures
from typing import List, Dict, Any

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.postgresql_task_processor import task_queue
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PerformanceMetrics:
    """性能指标收集器"""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.enqueue_times = []
        self.query_times = []
        self.stats_times = []
        self.total_operations = 0
        self.errors = []
        self.start_time = None
        self.end_time = None
    
    def add_enqueue_time(self, duration: float):
        self.enqueue_times.append(duration)
        self.total_operations += 1
    
    def add_query_time(self, duration: float):
        self.query_times.append(duration)
        self.total_operations += 1
    
    def add_stats_time(self, duration: float):
        self.stats_times.append(duration)
        self.total_operations += 1
    
    def add_error(self, error: str):
        self.errors.append(error)
    
    def start_timer(self):
        self.start_time = time.time()
    
    def stop_timer(self):
        self.end_time = time.time()
    
    @property
    def total_duration(self) -> float:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0
    
    def get_summary(self) -> Dict[str, Any]:
        """获取性能摘要"""
        def calc_stats(times: List[float]) -> Dict[str, float]:
            if not times:
                return {"count": 0, "avg": 0, "min": 0, "max": 0, "p95": 0, "p99": 0}
            
            return {
                "count": len(times),
                "avg": statistics.mean(times),
                "min": min(times),
                "max": max(times),
                "p95": statistics.quantiles(times, n=20)[18] if len(times) > 20 else max(times),
                "p99": statistics.quantiles(times, n=100)[98] if len(times) > 100 else max(times)
            }
        
        return {
            "total_duration": self.total_duration,
            "total_operations": self.total_operations,
            "operations_per_second": self.total_operations / self.total_duration if self.total_duration > 0 else 0,
            "error_count": len(self.errors),
            "error_rate": len(self.errors) / self.total_operations if self.total_operations > 0 else 0,
            "enqueue_performance": calc_stats(self.enqueue_times),
            "query_performance": calc_stats(self.query_times),
            "stats_performance": calc_stats(self.stats_times),
            "errors": self.errors[:10]  # 只显示前10个错误
        }


async def test_single_operation_latency():
    """测试单操作延迟"""
    logger.info("=" * 60)
    logger.info("测试1: 单操作延迟分析")
    logger.info("=" * 60)
    
    metrics = PerformanceMetrics()
    metrics.start_timer()
    
    try:
        # 测试任务入队延迟
        logger.info("🔄 测试任务入队延迟...")
        
        for i in range(10):
            start_time = time.time()
            
            task_id = await task_queue.enqueue(
                task_type="ocr_extract",
                payload={"test": f"latency_test_{i}", "index": i},
                priority=5,
                correlation_id=f"latency-test-{i}"
            )
            
            end_time = time.time()
            metrics.add_enqueue_time(end_time - start_time)
            
            logger.info(f"   任务 {i+1}: {(end_time - start_time)*1000:.2f}ms")
        
        # 测试状态查询延迟
        logger.info("🔍 测试状态查询延迟...")
        
        # 创建一个测试任务用于查询
        test_task_id = await task_queue.enqueue(
            task_type="send_notification",
            payload={"test": "query_test"},
            correlation_id="query-test"
        )
        
        for i in range(10):
            start_time = time.time()
            
            status = await task_queue.get_task_status(test_task_id)
            
            end_time = time.time()
            metrics.add_query_time(end_time - start_time)
            
            logger.info(f"   查询 {i+1}: {(end_time - start_time)*1000:.2f}ms")
        
        # 测试统计查询延迟
        logger.info("📊 测试统计查询延迟...")
        
        for i in range(5):
            start_time = time.time()
            
            stats = await task_queue.get_task_stats(hours_back=1)
            
            end_time = time.time()
            metrics.add_stats_time(end_time - start_time)
            
            logger.info(f"   统计 {i+1}: {(end_time - start_time)*1000:.2f}ms ({len(stats)} 条记录)")
        
        metrics.stop_timer()
        return metrics.get_summary()
        
    except Exception as e:
        logger.error(f"单操作延迟测试失败: {e}")
        metrics.add_error(str(e))
        metrics.stop_timer()
        return metrics.get_summary()


async def test_batch_operations():
    """测试批量操作性能"""
    logger.info("=" * 60)
    logger.info("测试2: 批量操作性能")
    logger.info("=" * 60)
    
    batch_sizes = [10, 50, 100]
    results = {}
    
    for batch_size in batch_sizes:
        logger.info(f"🚀 测试批量大小: {batch_size}")
        
        metrics = PerformanceMetrics()
        metrics.start_timer()
        
        try:
            # 批量入队
            start_time = time.time()
            
            tasks = []
            for i in range(batch_size):
                task_coro = task_queue.enqueue(
                    task_type="cleanup_files",
                    payload={
                        "test": f"batch_test_{batch_size}_{i}",
                        "batch_size": batch_size,
                        "index": i
                    },
                    priority=3,
                    correlation_id=f"batch-{batch_size}-{i}"
                )
                tasks.append(task_coro)
            
            # 并发执行
            task_ids = await asyncio.gather(*tasks, return_exceptions=True)
            
            end_time = time.time()
            batch_duration = end_time - start_time
            
            # 统计成功和失败
            successful_tasks = [tid for tid in task_ids if isinstance(tid, str)]
            failed_tasks = [tid for tid in task_ids if isinstance(tid, Exception)]
            
            logger.info(f"   批量入队完成:")
            logger.info(f"     成功: {len(successful_tasks)} 个")
            logger.info(f"     失败: {len(failed_tasks)} 个")
            logger.info(f"     总耗时: {batch_duration:.3f}s")
            logger.info(f"     吞吐量: {len(successful_tasks)/batch_duration:.1f} 任务/秒")
            
            # 批量查询状态
            if successful_tasks:
                query_start = time.time()
                
                status_tasks = []
                for task_id in successful_tasks[:10]:  # 只查询前10个
                    status_coro = task_queue.get_task_status(task_id)
                    status_tasks.append(status_coro)
                
                statuses = await asyncio.gather(*status_tasks, return_exceptions=True)
                
                query_end = time.time()
                query_duration = query_end - query_start
                
                successful_queries = [s for s in statuses if isinstance(s, dict)]
                
                logger.info(f"   批量查询完成:")
                logger.info(f"     查询数量: {len(status_tasks)} 个")
                logger.info(f"     成功: {len(successful_queries)} 个")
                logger.info(f"     耗时: {query_duration:.3f}s")
                logger.info(f"     查询吞吐量: {len(successful_queries)/query_duration:.1f} 查询/秒")
            
            metrics.stop_timer()
            
            results[batch_size] = {
                "batch_size": batch_size,
                "successful_enqueue": len(successful_tasks),
                "failed_enqueue": len(failed_tasks),
                "enqueue_duration": batch_duration,
                "enqueue_throughput": len(successful_tasks) / batch_duration,
                "query_duration": query_duration if successful_tasks else 0,
                "query_throughput": len(successful_queries) / query_duration if successful_tasks and query_duration > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"批量操作测试失败 (大小 {batch_size}): {e}")
            results[batch_size] = {"error": str(e)}
    
    return results


async def test_concurrent_access():
    """测试并发访问性能"""
    logger.info("=" * 60)
    logger.info("测试3: 并发访问性能")
    logger.info("=" * 60)
    
    concurrent_levels = [5, 10, 20]
    results = {}
    
    for concurrency in concurrent_levels:
        logger.info(f"🔀 测试并发级别: {concurrency}")
        
        try:
            async def worker_task(worker_id: int):
                """工作器任务"""
                worker_metrics = PerformanceMetrics()
                worker_metrics.start_timer()
                
                operations = 10  # 每个工作器执行10个操作
                
                for i in range(operations):
                    try:
                        # 入队操作
                        start_time = time.time()
                        task_id = await task_queue.enqueue(
                            task_type="process_email",
                            payload={
                                "test": f"concurrent_test_{concurrency}_{worker_id}_{i}",
                                "worker_id": worker_id,
                                "operation": i
                            },
                            priority=1,
                            correlation_id=f"concurrent-{concurrency}-{worker_id}-{i}"
                        )
                        end_time = time.time()
                        worker_metrics.add_enqueue_time(end_time - start_time)
                        
                        # 查询操作
                        start_time = time.time()
                        status = await task_queue.get_task_status(task_id)
                        end_time = time.time()
                        worker_metrics.add_query_time(end_time - start_time)
                        
                    except Exception as e:
                        worker_metrics.add_error(f"Worker {worker_id}, Op {i}: {str(e)}")
                
                worker_metrics.stop_timer()
                return worker_metrics.get_summary()
            
            # 启动并发工作器
            start_time = time.time()
            
            workers = []
            for worker_id in range(concurrency):
                workers.append(worker_task(worker_id))
            
            worker_results = await asyncio.gather(*workers, return_exceptions=True)
            
            end_time = time.time()
            total_duration = end_time - start_time
            
            # 汇总结果
            successful_workers = [r for r in worker_results if isinstance(r, dict)]
            failed_workers = [r for r in worker_results if isinstance(r, Exception)]
            
            total_operations = sum(r["total_operations"] for r in successful_workers)
            total_errors = sum(r["error_count"] for r in successful_workers)
            
            avg_enqueue_time = statistics.mean([
                r["enqueue_performance"]["avg"] 
                for r in successful_workers 
                if r["enqueue_performance"]["count"] > 0
            ]) if successful_workers else 0
            
            avg_query_time = statistics.mean([
                r["query_performance"]["avg"] 
                for r in successful_workers 
                if r["query_performance"]["count"] > 0
            ]) if successful_workers else 0
            
            logger.info(f"   并发测试完成:")
            logger.info(f"     并发工作器: {len(successful_workers)}/{concurrency}")
            logger.info(f"     总操作数: {total_operations}")
            logger.info(f"     总错误数: {total_errors}")
            logger.info(f"     总耗时: {total_duration:.3f}s")
            logger.info(f"     整体吞吐量: {total_operations/total_duration:.1f} 操作/秒")
            logger.info(f"     平均入队延迟: {avg_enqueue_time*1000:.2f}ms")
            logger.info(f"     平均查询延迟: {avg_query_time*1000:.2f}ms")
            
            results[concurrency] = {
                "concurrency": concurrency,
                "successful_workers": len(successful_workers),
                "failed_workers": len(failed_workers),
                "total_operations": total_operations,
                "total_errors": total_errors,
                "total_duration": total_duration,
                "overall_throughput": total_operations / total_duration,
                "avg_enqueue_latency_ms": avg_enqueue_time * 1000,
                "avg_query_latency_ms": avg_query_time * 1000,
                "error_rate": total_errors / total_operations if total_operations > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"并发测试失败 (并发级别 {concurrency}): {e}")
            results[concurrency] = {"error": str(e)}
    
    return results


async def test_database_performance():
    """测试数据库层面性能"""
    logger.info("=" * 60)
    logger.info("测试4: 数据库层面性能")
    logger.info("=" * 60)
    
    import asyncpg
    from app.core.config import settings
    
    try:
        # 直接数据库连接测试
        db_url = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
        
        # 连接时间测试
        logger.info("🔗 测试数据库连接性能...")
        
        connection_times = []
        for i in range(5):
            start_time = time.time()
            conn = await asyncpg.connect(db_url)
            end_time = time.time()
            
            connection_time = end_time - start_time
            connection_times.append(connection_time)
            
            await conn.close()
            
            logger.info(f"   连接 {i+1}: {connection_time*1000:.2f}ms")
        
        avg_connection_time = statistics.mean(connection_times)
        logger.info(f"   平均连接时间: {avg_connection_time*1000:.2f}ms")
        
        # 查询性能测试
        logger.info("📊 测试数据库查询性能...")
        
        conn = await asyncpg.connect(db_url)
        
        try:
            # 简单查询
            start_time = time.time()
            result = await conn.fetchval("SELECT COUNT(*) FROM task_queue")
            end_time = time.time()
            simple_query_time = end_time - start_time
            
            logger.info(f"   简单计数查询: {simple_query_time*1000:.2f}ms (结果: {result})")
            
            # 复杂查询
            start_time = time.time()
            results = await conn.fetch("""
                SELECT task_type, status, COUNT(*) as count
                FROM task_queue 
                WHERE created_at >= NOW() - INTERVAL '1 hour'
                GROUP BY task_type, status
                ORDER BY task_type, status
            """)
            end_time = time.time()
            complex_query_time = end_time - start_time
            
            logger.info(f"   复杂统计查询: {complex_query_time*1000:.2f}ms (结果: {len(results)} 行)")
            
            # 函数调用性能
            start_time = time.time()
            task_id = await conn.fetchval("""
                SELECT enqueue_task(
                    'ocr_extract'::task_type,
                    '{"test": "db_performance"}'::jsonb,
                    NULL,
                    5,
                    0,
                    3,
                    'db-perf-test'
                )
            """)
            end_time = time.time()
            function_call_time = end_time - start_time
            
            logger.info(f"   函数调用 (入队): {function_call_time*1000:.2f}ms")
            
            # 状态查询
            start_time = time.time()
            status_result = await conn.fetchrow("""
                SELECT id, task_type, status, created_at
                FROM task_queue 
                WHERE id = $1
            """, task_id)
            end_time = time.time()
            status_query_time = end_time - start_time
            
            logger.info(f"   状态查询: {status_query_time*1000:.2f}ms")
            
        finally:
            await conn.close()
        
        return {
            "avg_connection_time_ms": avg_connection_time * 1000,
            "simple_query_time_ms": simple_query_time * 1000,
            "complex_query_time_ms": complex_query_time * 1000,
            "function_call_time_ms": function_call_time * 1000,
            "status_query_time_ms": status_query_time * 1000,
            "total_tasks_in_db": result
        }
        
    except Exception as e:
        logger.error(f"数据库性能测试失败: {e}")
        return {"error": str(e)}


async def generate_performance_report():
    """生成性能测试报告"""
    logger.info("🚀 开始PostgreSQL任务队列性能测试")
    logger.info(f"测试时间: {datetime.now(timezone.utc).isoformat()}")
    
    # 运行所有测试
    tests = [
        ("单操作延迟", test_single_operation_latency),
        ("批量操作性能", test_batch_operations),
        ("并发访问性能", test_concurrent_access),
        ("数据库层面性能", test_database_performance),
    ]
    
    results = {}
    total_start_time = time.time()
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*20} 开始 {test_name} {'='*20}")
        
        try:
            test_start = time.time()
            result = await test_func()
            test_end = time.time()
            
            results[test_name] = {
                "result": result,
                "test_duration": test_end - test_start,
                "status": "success"
            }
            
            logger.info(f"✅ {test_name} 完成 (耗时: {test_end - test_start:.2f}s)")
            
        except Exception as e:
            logger.error(f"❌ {test_name} 失败: {e}")
            results[test_name] = {
                "error": str(e),
                "status": "failed"
            }
    
    total_end_time = time.time()
    total_duration = total_end_time - total_start_time
    
    # 生成报告
    logger.info("\n" + "=" * 80)
    logger.info("PostgreSQL任务队列性能测试报告")
    logger.info("=" * 80)
    
    logger.info(f"📅 测试时间: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    logger.info(f"⏱️  总测试时长: {total_duration:.2f}秒")
    logger.info(f"✅ 成功测试: {sum(1 for r in results.values() if r['status'] == 'success')}/{len(tests)}")
    
    # 详细结果分析
    for test_name, test_result in results.items():
        logger.info(f"\n📊 {test_name} 详细结果:")
        
        if test_result["status"] == "success":
            result_data = test_result["result"]
            
            if test_name == "单操作延迟":
                enqueue_perf = result_data["enqueue_performance"]
                query_perf = result_data["query_performance"]
                stats_perf = result_data["stats_performance"]
                
                logger.info(f"   入队操作: 平均 {enqueue_perf['avg']*1000:.2f}ms, P95 {enqueue_perf['p95']*1000:.2f}ms")
                logger.info(f"   查询操作: 平均 {query_perf['avg']*1000:.2f}ms, P95 {query_perf['p95']*1000:.2f}ms")
                logger.info(f"   统计查询: 平均 {stats_perf['avg']*1000:.2f}ms")
                
            elif test_name == "批量操作性能":
                for batch_size, data in result_data.items():
                    if isinstance(data, dict) and "error" not in data:
                        logger.info(f"   批量大小 {batch_size}: 入队吞吐量 {data['enqueue_throughput']:.1f} 任务/秒")
                        
            elif test_name == "并发访问性能":
                for concurrency, data in result_data.items():
                    if isinstance(data, dict) and "error" not in data:
                        logger.info(f"   并发级别 {concurrency}: 吞吐量 {data['overall_throughput']:.1f} 操作/秒, 错误率 {data['error_rate']*100:.1f}%")
                        
            elif test_name == "数据库层面性能":
                if "error" not in result_data:
                    logger.info(f"   连接时间: {result_data['avg_connection_time_ms']:.2f}ms")
                    logger.info(f"   简单查询: {result_data['simple_query_time_ms']:.2f}ms")
                    logger.info(f"   函数调用: {result_data['function_call_time_ms']:.2f}ms")
        else:
            logger.error(f"   ❌ 测试失败: {test_result.get('error', '未知错误')}")
    
    # 性能总结
    logger.info(f"\n🎯 性能总结:")
    
    # 提取关键指标
    if "单操作延迟" in results and results["单操作延迟"]["status"] == "success":
        single_op = results["单操作延迟"]["result"]
        avg_enqueue = single_op["enqueue_performance"]["avg"] * 1000
        avg_query = single_op["query_performance"]["avg"] * 1000
        
        logger.info(f"   ⚡ 平均入队延迟: {avg_enqueue:.1f}ms")
        logger.info(f"   ⚡ 平均查询延迟: {avg_query:.1f}ms")
        
        # 性能等级评估
        if avg_enqueue < 100 and avg_query < 50:
            logger.info("   🚀 性能等级: 优秀")
        elif avg_enqueue < 500 and avg_query < 200:
            logger.info("   ✅ 性能等级: 良好")
        elif avg_enqueue < 1000 and avg_query < 500:
            logger.info("   ⚠️  性能等级: 一般")
        else:
            logger.info("   ❌ 性能等级: 需要优化")
    
    # 建议
    logger.info(f"\n💡 优化建议:")
    
    if "数据库层面性能" in results and results["数据库层面性能"]["status"] == "success":
        db_perf = results["数据库层面性能"]["result"]
        if "avg_connection_time_ms" in db_perf and db_perf["avg_connection_time_ms"] > 100:
            logger.info("   🔧 建议: 实现连接池以减少连接开销")
    
    if "并发访问性能" in results and results["并发访问性能"]["status"] == "success":
        concurrent_perf = results["并发访问性能"]["result"]
        high_error_rates = [
            data.get("error_rate", 0) for data in concurrent_perf.values() 
            if isinstance(data, dict) and "error_rate" in data
        ]
        if any(rate > 0.1 for rate in high_error_rates):
            logger.info("   🔧 建议: 优化错误处理和重试机制")
    
    logger.info("   🔧 建议: 考虑添加本地缓存减少数据库查询")
    logger.info("   🔧 建议: 实现批量操作API提高吞吐量")
    
    return results


async def main():
    """主函数"""
    try:
        results = await generate_performance_report()
        
        # 计算总体成功率
        successful_tests = sum(1 for r in results.values() if r["status"] == "success")
        total_tests = len(results)
        success_rate = successful_tests / total_tests * 100
        
        logger.info(f"\n🏁 测试完成! 成功率: {success_rate:.1f}% ({successful_tests}/{total_tests})")
        
        return 0 if success_rate >= 75 else 1
        
    except Exception as e:
        logger.error(f"性能测试执行失败: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)