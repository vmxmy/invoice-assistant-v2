# OCR 服务重构设计方案 (基于 Mineru V4 API)

## 1. 现状分析

### 当前架构问题
- **代码重复**: 两个服务有相同的路径验证、错误处理逻辑
- **V4实现不完整**: ZIP文件下载和解析功能缺失
- **配置分散**: 超时、重试等配置硬编码在类中
- **错误处理不一致**: 异常类型和处理方式不统一
- **轮询机制粗糙**: 缺少指数退避，可能造成API压力

### 决策：专注V4 API优化
- **删除**: `OCRService` (v1版本) - 功能较简单，v4版本更强大
- **保留并优化**: `OCRServiceV4` - 完善批量处理和ZIP解析
- **原因**: V4 API支持批量处理，更适合生产环境

## 2. 目标架构设计

### 2.1 架构原则
- **单一API版本**: 专注V4 API，简化架构复杂度
- **完整功能**: 补全ZIP下载、解析、错误处理
- **生产就绪**: 添加监控、重试、配置管理
- **易于测试**: 清晰的依赖注入和Mock支持

### 2.2 简化类图设计

```
OCRConfig (配置类)
├── API配置 (token, base_url)
├── 超时配置 (timeout, poll_timeout)
├── 重试配置 (max_retries, retry_delay)
└── 功能开关 (mock_mode, enable_zip_cache)

BaseOCRClient (抽象基类)
├── 配置管理
├── HTTP客户端封装 (带重试)
├── 路径验证
├── 健康检查
└── 抽象方法定义

MineruV4Client (核心实现)
├── 批量上传URL获取
├── 预签名URL文件上传
├── 智能轮询 (指数退避)
├── ZIP下载与解析 ⭐ 新增
├── 结构化数据提取
└── Mock模式支持

OCRService (统一入口)
├── 工厂模式创建客户端
├── 向后兼容接口
└── 依赖注入支持
```

### 2.3 简化目录结构

```
app/services/ocr/
├── __init__.py          # 导出主要接口
├── config.py            # OCRConfig配置类
├── exceptions.py        # OCR异常定义
├── models.py            # Pydantic数据模型
├── base.py              # BaseOCRClient基类
├── mineru_v4_client.py  # MineruV4Client实现
├── service.py           # OCRService统一入口
└── utils/
    ├── __init__.py
    ├── path_validator.py # 路径验证
    ├── zip_processor.py  # ZIP文件处理 ⭐ 新增
    └── retry_helper.py   # 重试辅助工具
```

## 3. 详细实现计划

### 3.1 配置管理 (OCRConfig)

```python
@dataclass
class OCRConfig:
    # API配置
    api_token: str
    base_url: str = "https://mineru.net"
    
    # 超时配置
    upload_timeout: int = 60
    poll_timeout: int = 600
    download_timeout: int = 120
    
    # 重试配置
    max_retries: int = 3
    retry_delay: float = 1.0
    max_retry_delay: float = 60.0
    
    # 轮询配置
    initial_poll_interval: int = 10
    max_poll_interval: int = 60
    poll_backoff_factor: float = 1.5
    
    # 功能配置
    mock_mode: bool = False
    enable_zip_cache: bool = True
    zip_cache_dir: Optional[str] = None
    
    @classmethod
    def from_settings(cls) -> 'OCRConfig':
        """从应用配置创建OCR配置"""
        return cls(
            api_token=settings.mineru_api_token,
            base_url=settings.mineru_api_base_url,
            mock_mode=not bool(settings.mineru_api_token)
        )
```

### 3.2 异常系统

```python
class OCRError(Exception):
    """OCR基础异常"""
    def __init__(self, message: str, error_code: str = None, retry_after: int = None):
        self.message = message
        self.error_code = error_code
        self.retry_after = retry_after
        super().__init__(message)

class OCRTimeoutError(OCRError):
    """OCR超时异常"""
    pass

class OCRAPIError(OCRError):
    """OCR API错误"""
    def __init__(self, message: str, status_code: int, response_text: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.response_text = response_text

class OCRZipProcessError(OCRError):
    """ZIP文件处理错误"""
    pass

class OCRPollTimeoutError(OCRTimeoutError):
    """轮询超时异常"""
    pass
```

### 3.3 核心功能增强

#### ZIP文件处理器 (新增)
```python
class ZipProcessor:
    """ZIP文件下载和解析处理器"""
    
    async def download_and_extract(self, zip_url: str, cache_dir: Optional[str] = None) -> Dict[str, Any]:
        """下载并解析ZIP文件"""
        # 1. 下载ZIP文件
        # 2. 解压到临时目录
        # 3. 解析JSON结果文件
        # 4. 提取结构化数据
        # 5. 清理临时文件
        pass
    
    def _parse_json_result(self, json_path: str) -> Dict[str, Any]:
        """解析JSON结果文件"""
        pass
    
    def _extract_structured_data(self, raw_data: Dict[str, Any]) -> StructuredInvoiceData:
        """提取结构化发票数据"""
        pass
```

#### 智能轮询机制 (优化)
```python
class SmartPoller:
    """智能轮询器，支持指数退避"""
    
    def __init__(self, config: OCRConfig):
        self.config = config
        self.current_interval = config.initial_poll_interval
    
    async def poll_until_complete(self, batch_id: str, client: httpx.AsyncClient) -> Dict[str, Any]:
        """轮询直到任务完成"""
        start_time = time.time()
        
        while time.time() - start_time < self.config.poll_timeout:
            result = await self._check_batch_status(batch_id, client)
            
            if self._is_completed(result):
                return result
            
            await asyncio.sleep(self.current_interval)
            self._update_poll_interval()
        
        raise OCRPollTimeoutError(f"轮询超时: {self.config.poll_timeout}秒")
    
    def _update_poll_interval(self):
        """更新轮询间隔（指数退避）"""
        self.current_interval = min(
            self.current_interval * self.config.poll_backoff_factor,
            self.config.max_poll_interval
        )
```

## 4. 实施步骤

### 第一阶段：基础重构
1. **删除旧服务**: 移除 `ocr_service.py`
2. **创建新架构**: 建立配置、异常、模型基础
3. **重构V4客户端**: 基于新架构重写 `OCRServiceV4`

### 第二阶段：功能完善
4. **实现ZIP处理**: 完成ZIP下载和解析功能
5. **优化轮询机制**: 添加智能退避策略
6. **错误处理增强**: 统一异常处理和重试逻辑

### 第三阶段：集成测试
7. **单元测试**: 覆盖所有新功能
8. **集成测试**: 端到端流程验证
9. **性能测试**: 确保优化效果

### 第四阶段：部署上线
10. **文档更新**: API文档和使用说明
11. **监控配置**: 添加关键指标监控
12. **灰度发布**: 逐步替换现有服务

## 5. 迁移计划

### 5.1 代码迁移
```python
# 旧代码调用方式
from app.services.ocr_service import OCRService
ocr = OCRService()

# 新代码调用方式 (保持兼容)
from app.services.ocr import OCRService
ocr = OCRService()  # 内部使用V4客户端
```

### 5.2 配置迁移
```python
# 现有配置保持不变
MINERU_API_TOKEN=xxx
MINERU_API_BASE_URL=https://mineru.net

# 新增可选配置
OCR_POLL_TIMEOUT=600
OCR_MAX_RETRIES=3
OCR_ENABLE_ZIP_CACHE=true
```

## 6. 风险控制

### 6.1 技术风险
- **ZIP解析复杂度**: 通过充分测试和错误处理缓解
- **轮询性能**: 智能退避避免API压力
- **向后兼容**: 保持接口不变，内部实现升级

### 6.2 缓解措施
- 保留原有文件作为备份
- 提供快速回滚机制
- 增加详细的错误日志和监控

## 7. 预期收益

### 7.1 功能完整性
- ✅ 完整的V4 API支持
- ✅ ZIP文件下载和解析
- ✅ 智能轮询和重试

### 7.2 代码质量
- ✅ 消除代码重复
- ✅ 统一错误处理
- ✅ 提高测试覆盖率

### 7.3 运维友好
- ✅ 集中配置管理
- ✅ 详细监控指标
- ✅ 清晰的错误信息

**预计完成时间**: 4个工作日（简化后） 