#!/usr/bin/env python3
"""
邮件地址管理系统测试运行脚本
支持不同类型的测试执行和报告生成
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path
from typing import List, Optional


class TestRunner:
    """测试运行器"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.tests_dir = project_root / "tests"
        self.reports_dir = project_root / "test_reports"
        
        # 确保报告目录存在
        self.reports_dir.mkdir(exist_ok=True)
    
    def run_command(self, cmd: List[str], description: str) -> bool:
        """运行命令并处理输出"""
        print(f"\n{'='*60}")
        print(f"执行: {description}")
        print(f"命令: {' '.join(cmd)}")
        print('='*60)
        
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                check=True,
                capture_output=False
            )
            print(f"\n✅ {description} - 成功")
            return True
        except subprocess.CalledProcessError as e:
            print(f"\n❌ {description} - 失败 (退出码: {e.returncode})")
            return False
        except Exception as e:
            print(f"\n❌ {description} - 异常: {e}")
            return False
    
    def install_dependencies(self) -> bool:
        """安装测试依赖"""
        requirements_file = self.tests_dir / "requirements.txt"
        if not requirements_file.exists():
            print(f"警告: 测试依赖文件不存在: {requirements_file}")
            return True
        
        cmd = [
            sys.executable, "-m", "pip", "install", 
            "-r", str(requirements_file)
        ]
        return self.run_command(cmd, "安装测试依赖")
    
    def run_unit_tests(self, verbose: bool = False, coverage: bool = False) -> bool:
        """运行单元测试"""
        cmd = [sys.executable, "-m", "pytest"]
        
        # 添加测试目录
        cmd.extend([
            str(self.tests_dir / "test_api_email_addresses.py"),
            str(self.tests_dir / "test_email_address_service.py"),
            str(self.tests_dir / "test_mailgun_service.py"),
            str(self.tests_dir / "test_email_address_model.py")
        ])
        
        # 添加选项
        if verbose:
            cmd.append("-v")
        
        if coverage:
            cmd.extend([
                "--cov=app",
                "--cov-report=html:" + str(self.reports_dir / "coverage"),
                "--cov-report=term-missing",
                "--cov-fail-under=80"
            ])
        
        # 添加报告生成
        cmd.extend([
            "--html=" + str(self.reports_dir / "unit_tests.html"),
            "--self-contained-html",
            "--json-report",
            "--json-report-file=" + str(self.reports_dir / "unit_tests.json")
        ])
        
        return self.run_command(cmd, "单元测试")
    
    def run_integration_tests(self, verbose: bool = False) -> bool:
        """运行集成测试"""
        # 注意：这里假设将来会有集成测试文件
        integration_files = [
            "test_email_workflow_integration.py",
            "test_webhook_integration.py"
        ]
        
        existing_files = []
        for file in integration_files:
            file_path = self.tests_dir / file
            if file_path.exists():
                existing_files.append(str(file_path))
        
        if not existing_files:
            print("⚠️  未找到集成测试文件，跳过集成测试")
            return True
        
        cmd = [sys.executable, "-m", "pytest"]
        cmd.extend(existing_files)
        
        if verbose:
            cmd.append("-v")
        
        cmd.extend([
            "--html=" + str(self.reports_dir / "integration_tests.html"),
            "--self-contained-html"
        ])
        
        return self.run_command(cmd, "集成测试")
    
    def run_performance_tests(self, verbose: bool = False) -> bool:
        """运行性能测试"""
        perf_file = self.tests_dir / "test_performance.py"
        if not perf_file.exists():
            print("⚠️  未找到性能测试文件，跳过性能测试")
            return True
        
        cmd = [
            sys.executable, "-m", "pytest",
            str(perf_file),
            "--benchmark-only",
            "--benchmark-html=" + str(self.reports_dir / "benchmark.html")
        ]
        
        if verbose:
            cmd.append("-v")
        
        return self.run_command(cmd, "性能测试")
    
    def run_specific_test(self, test_pattern: str, verbose: bool = False) -> bool:
        """运行特定测试"""
        cmd = [
            sys.executable, "-m", "pytest",
            "-k", test_pattern
        ]
        
        if verbose:
            cmd.append("-v")
        
        cmd.extend([
            "--html=" + str(self.reports_dir / f"specific_tests_{test_pattern}.html"),
            "--self-contained-html"
        ])
        
        return self.run_command(cmd, f"特定测试: {test_pattern}")
    
    def run_all_tests(self, verbose: bool = False, coverage: bool = False) -> bool:
        """运行所有测试"""
        cmd = [sys.executable, "-m", "pytest", str(self.tests_dir)]
        
        if verbose:
            cmd.append("-v")
        
        if coverage:
            cmd.extend([
                "--cov=app",
                "--cov-report=html:" + str(self.reports_dir / "coverage"),
                "--cov-report=term-missing"
            ])
        
        cmd.extend([
            "--html=" + str(self.reports_dir / "all_tests.html"),
            "--self-contained-html",
            "--json-report",
            "--json-report-file=" + str(self.reports_dir / "all_tests.json")
        ])
        
        return self.run_command(cmd, "所有测试")
    
    def run_parallel_tests(self, workers: int = 4, verbose: bool = False) -> bool:
        """运行并行测试"""
        cmd = [
            sys.executable, "-m", "pytest",
            str(self.tests_dir),
            "-n", str(workers)
        ]
        
        if verbose:
            cmd.append("-v")
        
        cmd.extend([
            "--html=" + str(self.reports_dir / "parallel_tests.html"),
            "--self-contained-html"
        ])
        
        return self.run_command(cmd, f"并行测试 (workers: {workers})")
    
    def generate_test_summary(self) -> None:
        """生成测试总结"""
        print(f"\n{'='*60}")
        print("测试执行总结")
        print('='*60)
        
        print(f"📁 项目根目录: {self.project_root}")
        print(f"📁 测试目录: {self.tests_dir}")
        print(f"📁 报告目录: {self.reports_dir}")
        
        # 列出生成的报告文件
        report_files = list(self.reports_dir.glob("*.html"))
        if report_files:
            print(f"\n📊 生成的测试报告:")
            for report in report_files:
                print(f"   - {report.name}")
        
        # 检查覆盖率报告
        coverage_dir = self.reports_dir / "coverage"
        if coverage_dir.exists():
            print(f"\n📈 代码覆盖率报告: {coverage_dir / 'index.html'}")
        
        print(f"\n🔗 访问报告: file://{self.reports_dir.absolute()}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="邮件地址管理系统测试运行器")
    
    parser.add_argument(
        "test_type",
        choices=["install", "unit", "integration", "performance", "all", "parallel", "specific"],
        help="测试类型"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="详细输出"
    )
    
    parser.add_argument(
        "-c", "--coverage",
        action="store_true",
        help="生成代码覆盖率报告"
    )
    
    parser.add_argument(
        "-w", "--workers",
        type=int,
        default=4,
        help="并行测试工作进程数 (默认: 4)"
    )
    
    parser.add_argument(
        "-k", "--pattern",
        type=str,
        help="测试模式 (用于specific测试类型)"
    )
    
    parser.add_argument(
        "--no-install",
        action="store_true",
        help="跳过依赖安装"
    )
    
    args = parser.parse_args()
    
    # 获取项目根目录
    script_dir = Path(__file__).parent
    project_root = script_dir
    
    runner = TestRunner(project_root)
    
    success = True
    
    # 安装依赖
    if not args.no_install and args.test_type != "install":
        success = runner.install_dependencies()
        if not success:
            print("❌ 依赖安装失败")
            sys.exit(1)
    
    # 执行对应的测试
    if args.test_type == "install":
        success = runner.install_dependencies()
    elif args.test_type == "unit":
        success = runner.run_unit_tests(args.verbose, args.coverage)
    elif args.test_type == "integration":
        success = runner.run_integration_tests(args.verbose)
    elif args.test_type == "performance":
        success = runner.run_performance_tests(args.verbose)
    elif args.test_type == "all":
        success = runner.run_all_tests(args.verbose, args.coverage)
    elif args.test_type == "parallel":
        success = runner.run_parallel_tests(args.workers, args.verbose)
    elif args.test_type == "specific":
        if not args.pattern:
            print("❌ 特定测试需要指定 --pattern 参数")
            sys.exit(1)
        success = runner.run_specific_test(args.pattern, args.verbose)
    
    # 生成总结
    runner.generate_test_summary()
    
    # 退出
    if success:
        print("\n🎉 测试执行完成")
        sys.exit(0)
    else:
        print("\n💥 测试执行失败")
        sys.exit(1)


if __name__ == "__main__":
    main()