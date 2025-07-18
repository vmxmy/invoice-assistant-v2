# OCR 服务架构设计文档

## 概述

本文档描述了发票识别系统的OCR服务架构，包括服务层设计、依赖注入模式和模块职责划分。

## 架构设计

### 1. 双OCR系统并存

系统支持两种OCR实现：

#### 1.1 阿里云OCR服务
- **位置**: `/app/services/aliyun_ocr_service.py`
- **用途**: 通过阿里云API进行在线OCR识别
- **特点**: 
  - 高准确率
  - 支持多种发票类型
  - 需要网络连接和API密钥

#### 1.2 Invoice2Data本地OCR
- **位置**: `/app/services/ocr/`
- **用途**: 基于模板的本地OCR处理
- **特点**:
  - 离线处理
  - 可自定义模板
  - 适合批量处理

### 2. 服务层设计

#### 2.1 核心服务

```
服务层架构:
├── aliyun_ocr_service.py      # 阿里云OCR服务
├── ocr_parser_service.py      # OCR解析服务
├── ocr_data_parser.py         # OCR数据解析器
└── ocr/                       # Invoice2Data实现
    ├── invoice2data_client.py
    ├── config.py
    └── templates/
```

#### 2.2 依赖注入模式

所有服务均使用FastAPI的依赖注入模式：

```python
# 阿里云OCR服务
def get_aliyun_ocr_service(
    settings: Settings = Depends(get_settings)
) -> AliyunOCRService:
    return AliyunOCRService(settings)

# OCR解析服务
def get_ocr_parser_service() -> OCRParserService:
    return OCRParserService()

# OCR数据解析器
def get_ocr_data_parser() -> OCRDataParser:
    return OCRDataParser()
```

### 3. API端点设计

#### 3.1 `/api/v1/ocr/recognize` - 原始OCR识别
- **功能**: 调用阿里云OCR，返回原始数据
- **服务**: AliyunOCRService
- **用途**: 获取未处理的OCR结果

#### 3.2 `/api/v1/ocr/combined/process` - 一站式处理
- **功能**: OCR识别 + 解析 + 验证
- **服务**: AliyunOCRService + OCRParserService
- **用途**: 完整的发票处理流程

#### 3.3 `/api/v1/parser` - 数据解析
- **功能**: 解析OCR原始数据
- **服务**: 适配器模式 + 字段映射
- **用途**: 将OCR数据转换为结构化发票

#### 3.4 `/api/v1/validator` - 数据验证
- **功能**: 验证发票数据有效性
- **服务**: 基于schema的验证
- **用途**: 确保数据质量

### 4. 数据流程

```
PDF文件 
  ↓
阿里云OCR (aliyun_ocr_service)
  ↓
原始OCR数据
  ↓
解析服务 (ocr_parser_service/ocr_data_parser)
  ↓
结构化数据
  ↓
适配器 (invoice_adapters)
  ↓
BaseInvoice对象
  ↓
验证服务 (validator)
  ↓
最终结果
```

### 5. 关键设计决策

#### 5.1 服务分离
- OCR识别与解析逻辑分离
- 每个服务单一职责
- 便于测试和维护

#### 5.2 依赖注入
- 统一使用FastAPI的Depends机制
- 避免单例模式
- 支持配置注入

#### 5.3 数据解析整合
- 所有解析逻辑集中在`ocr_data_parser.py`
- 支持多种发票类型
- 统一的解析接口

#### 5.4 双系统支持
- 保留Invoice2Data本地实现
- 阿里云OCR作为主要服务
- 可根据需求切换

### 6. 未来优化建议

1. **缓存机制**: 添加OCR结果缓存，避免重复识别
2. **异步处理**: 大文件异步处理支持
3. **错误重试**: OCR失败自动重试机制
4. **监控指标**: 添加OCR性能监控
5. **单元测试**: 完善服务层测试覆盖

## 总结

新的OCR服务架构通过依赖注入和服务分离，实现了更好的可维护性和可扩展性。系统支持阿里云OCR和本地Invoice2Data两种实现，满足不同场景需求。