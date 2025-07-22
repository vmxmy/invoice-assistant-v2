#!/usr/bin/env python3
"""
调试IMAP搜索条件生成和执行
"""
import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from datetime import datetime, date
from app.schemas.email_scan import ScanParams
from app.services.email_scanner_service import EmailScannerService
import logging

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def test_search_criteria_building():
    """测试搜索条件构建"""
    print("=" * 60)
    print("测试IMAP搜索条件构建")
    print("=" * 60)
    
    test_cases = [
        {
            "name": "2025年1月",
            "params": {
                "date_from": date(2025, 1, 1),
                "date_to": date(2025, 1, 31),
                "subject_keywords": ["发票"],
                "folders": ["INBOX"]
            }
        },
        {
            "name": "2025年6月",
            "params": {
                "date_from": date(2025, 6, 1),
                "date_to": date(2025, 6, 30),
                "subject_keywords": ["发票"],
                "folders": ["INBOX"]
            }
        },
        {
            "name": "最近30天",
            "params": {
                "date_from": date(2025, 6, 21),
                "date_to": date(2025, 7, 21),
                "subject_keywords": ["发票"],
                "folders": ["INBOX"]
            }
        },
        {
            "name": "无日期限制",
            "params": {
                "subject_keywords": ["发票"],
                "folders": ["INBOX"]
            }
        }
    ]
    
    for test in test_cases:
        print(f"\n测试案例: {test['name']}")
        print("-" * 40)
        
        # 创建扫描参数
        scan_params = ScanParams(**test['params'])
        
        # 构建搜索条件
        search_criteria = EmailScannerService._build_search_criteria(scan_params)
        
        print(f"参数:")
        if 'date_from' in test['params']:
            print(f"  date_from: {test['params']['date_from']}")
        if 'date_to' in test['params']:
            print(f"  date_to: {test['params']['date_to']}")
        print(f"  keywords: {test['params']['subject_keywords']}")
        
        print(f"\n生成的IMAP搜索条件:")
        print(f"  {search_criteria}")
        
        # 分析搜索条件
        print(f"\n条件分析:")
        if 'SINCE' in search_criteria:
            print("  ✅ 包含SINCE日期条件")
        else:
            print("  ❌ 缺少SINCE日期条件")
            
        if 'BEFORE' in search_criteria:
            print("  ✅ 包含BEFORE日期条件")
        else:
            print("  ❌ 缺少BEFORE日期条件")
            
        if 'SUBJECT' in search_criteria:
            print("  ✅ 包含SUBJECT条件")
        else:
            print("  ❌ 缺少SUBJECT条件")


if __name__ == "__main__":
    test_search_criteria_building()