#!/usr/bin/env python3
"""
查询性能基准测试脚本

用于建立查询性能基准和检测回归。
"""

import asyncio
import logging
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

# 设置路径以便导入应用模块
import sys
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import get_db_context
from app.utils.query_monitor import QueryPerformanceTester, query_monitoring

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def run_comprehensive_benchmark():
    """运行综合性能基准测试"""
    logger.info("开始运行查询性能基准测试...")
    
    async with get_db_context() as session:
        tester = QueryPerformanceTester(session)
        
        # 运行多轮测试以获得稳定的基准
        all_results = []
        total_rounds = 5
        
        for round_num in range(1, total_rounds + 1):
            logger.info(f"执行第 {round_num}/{total_rounds} 轮基准测试...")
            
            try:
                results = await tester.run_baseline_tests()
                results["round"] = round_num
                results["timestamp"] = datetime.now().isoformat()
                all_results.append(results)
                
                # 打印当前轮次结果
                for query_name, result in results.items():
                    if query_name in ["round", "timestamp"]:
                        continue
                    
                    if result["status"] == "success":
                        logger.info(f"  {query_name}: {result['execution_time_ms']:.2f}ms")
                    else:
                        logger.error(f"  {query_name}: 失败 - {result['error']}")
                
                # 轮次之间稍作休息
                if round_num < total_rounds:
                    await asyncio.sleep(1)
                    
            except Exception as e:
                logger.error(f"第 {round_num} 轮测试失败: {e}")
                continue
    
    # 分析结果并生成基准
    benchmark_results = analyze_benchmark_results(all_results)
    
    # 保存基准结果
    save_benchmark_results(benchmark_results)
    
    logger.info("基准测试完成!")
    return benchmark_results


def analyze_benchmark_results(all_results: list) -> Dict[str, Any]:
    """分析基准测试结果"""
    if not all_results:
        return {}
    
    # 提取所有查询名称
    query_names = set()
    for result in all_results:
        for key in result.keys():
            if key not in ["round", "timestamp"]:
                query_names.add(key)
    
    analysis = {
        "benchmark_date": datetime.now().isoformat(),
        "total_rounds": len(all_results),
        "query_benchmarks": {}
    }
    
    for query_name in query_names:
        # 收集所有成功的执行时间
        execution_times = []
        error_count = 0
        
        for result in all_results:
            if query_name in result:
                query_result = result[query_name]
                if query_result["status"] == "success":
                    execution_times.append(query_result["execution_time_ms"])
                else:
                    error_count += 1
        
        if execution_times:
            execution_times.sort()
            count = len(execution_times)
            
            benchmark = {
                "query_name": query_name,
                "sample_count": count,
                "error_count": error_count,
                "avg_time_ms": sum(execution_times) / count,
                "min_time_ms": min(execution_times),
                "max_time_ms": max(execution_times),
                "p50_time_ms": execution_times[int(count * 0.5)],
                "p90_time_ms": execution_times[int(count * 0.9)],
                "p95_time_ms": execution_times[int(count * 0.95)],
                "p99_time_ms": execution_times[int(count * 0.99)],
                "execution_times": execution_times
            }
            
            analysis["query_benchmarks"][query_name] = benchmark
            
            logger.info(
                f"基准分析 - {query_name}: "
                f"平均 {benchmark['avg_time_ms']:.2f}ms, "
                f"P95 {benchmark['p95_time_ms']:.2f}ms, "
                f"最大 {benchmark['max_time_ms']:.2f}ms"
            )
    
    return analysis


def save_benchmark_results(benchmark_results: Dict[str, Any]) -> None:
    """保存基准测试结果"""
    try:
        # 创建结果目录
        results_dir = Path("./monitoring/benchmarks")
        results_dir.mkdir(parents=True, exist_ok=True)
        
        # 保存详细结果
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        detailed_file = results_dir / f"benchmark_detailed_{timestamp}.json"
        with open(detailed_file, 'w', encoding='utf-8') as f:
            json.dump(benchmark_results, f, indent=2, ensure_ascii=False)
        
        # 保存基准摘要（用于后续比较）
        summary_file = results_dir / "latest_benchmark.json"
        summary = {
            "benchmark_date": benchmark_results["benchmark_date"],
            "query_benchmarks": {
                name: {
                    k: v for k, v in benchmark.items()
                    if k != "execution_times"  # 不包含原始数据
                }
                for name, benchmark in benchmark_results["query_benchmarks"].items()
            }
        }
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"基准结果已保存到: {detailed_file}")
        logger.info(f"基准摘要已保存到: {summary_file}")
        
    except Exception as e:
        logger.error(f"保存基准结果失败: {e}")


async def compare_with_baseline():
    """与历史基准比较"""
    logger.info("开始与历史基准比较...")
    
    try:
        # 读取最新基准
        latest_file = Path("./monitoring/benchmarks/latest_benchmark.json")
        if not latest_file.exists():
            logger.warning("未找到历史基准，请先运行基准测试")
            return
        
        with open(latest_file, 'r', encoding='utf-8') as f:
            baseline = json.load(f)
        
        # 运行当前测试
        async with get_db_context() as session:
            tester = QueryPerformanceTester(session)
            current_results = await tester.run_baseline_tests()
        
        # 比较结果
        comparison_results = []
        for query_name, current_result in current_results.items():
            if current_result["status"] != "success":
                continue
            
            if query_name in baseline["query_benchmarks"]:
                baseline_benchmark = baseline["query_benchmarks"][query_name]
                current_time = current_result["execution_time_ms"]
                baseline_p95 = baseline_benchmark["p95_time_ms"]
                
                ratio = current_time / baseline_p95
                status = "normal"
                
                if ratio > 2.0:
                    status = "regression"
                elif ratio > 1.5:
                    status = "warning"
                
                comparison = {
                    "query_name": query_name,
                    "current_time_ms": current_time,
                    "baseline_p95_ms": baseline_p95,
                    "ratio": ratio,
                    "status": status,
                    "baseline_date": baseline["benchmark_date"]
                }
                
                comparison_results.append(comparison)
                
                # 打印比较结果
                if status == "regression":
                    logger.error(
                        f"性能回归! {query_name}: {current_time:.2f}ms "
                        f"(基准P95: {baseline_p95:.2f}ms, 比率: {ratio:.2f}x)"
                    )
                elif status == "warning":
                    logger.warning(
                        f"性能告警! {query_name}: {current_time:.2f}ms "
                        f"(基准P95: {baseline_p95:.2f}ms, 比率: {ratio:.2f}x)"
                    )
                else:
                    logger.info(
                        f"性能正常! {query_name}: {current_time:.2f}ms "
                        f"(基准P95: {baseline_p95:.2f}ms, 比率: {ratio:.2f}x)"
                    )
        
        # 保存比较结果
        comparison_file = Path("./monitoring/comparisons") 
        comparison_file.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        comparison_result_file = comparison_file / f"comparison_{timestamp}.json"
        
        with open(comparison_result_file, 'w', encoding='utf-8') as f:
            json.dump({
                "comparison_date": datetime.now().isoformat(),
                "baseline_date": baseline["benchmark_date"],
                "comparisons": comparison_results
            }, f, indent=2, ensure_ascii=False)
        
        logger.info(f"比较结果已保存到: {comparison_result_file}")
        
        # 统计
        regression_count = len([c for c in comparison_results if c["status"] == "regression"])
        warning_count = len([c for c in comparison_results if c["status"] == "warning"])
        
        logger.info(f"比较完成: {len(comparison_results)} 个查询, {regression_count} 个回归, {warning_count} 个告警")
        
        return comparison_results
        
    except Exception as e:
        logger.error(f"与基准比较失败: {e}")
        return None


async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="查询性能基准测试工具")
    parser.add_argument(
        "action",
        choices=["benchmark", "compare"],
        help="执行的操作: benchmark=建立基准, compare=与基准比较"
    )
    
    args = parser.parse_args()
    
    if args.action == "benchmark":
        await run_comprehensive_benchmark()
    elif args.action == "compare":
        await compare_with_baseline()


if __name__ == "__main__":
    asyncio.run(main())