"""
发票类型配置管理 API 端点 V3 - Supabase 优化版本
使用 Supabase 原生特性优化性能和缓存

基于 InvoiceTypeServiceV3Supabase 的 API 端点
"""

from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.dependencies import CurrentUser, get_current_user, get_db_session
from app.core.exceptions import ValidationError, BusinessLogicError
from app.services.invoice_type_service_v3_supabase import (
    InvoiceTypeServiceV3Supabase,
    ClassificationResult,
    InvoiceTypeEnum,
    create_invoice_type_service_supabase
)
from app.utils.responses import success_response, error_response

router = APIRouter()


# ===== Pydantic 模型 =====

class InvoiceFieldRequest(BaseModel):
    """发票字段请求模型"""
    name: str = Field(..., description="字段名称")
    display_name: str = Field(..., description="显示名称")
    value_paths: List[str] = Field(..., description="值路径列表")
    default_value: Optional[Any] = Field(None, description="默认值")
    required: bool = Field(False, description="是否必填")
    data_type: str = Field("string", description="数据类型")
    validation_pattern: Optional[str] = Field(None, description="验证正则")


class InvoiceTypeConfigRequest(BaseModel):
    """发票类型配置请求模型"""
    type_code: str = Field(..., min_length=1, max_length=50, description="类型代码")
    type_name: str = Field(..., min_length=1, max_length=100, description="类型名称")
    display_name: str = Field(..., min_length=1, max_length=100, description="显示名称")
    description: Optional[str] = Field(None, description="描述")
    
    # 识别规则
    pdf_keywords: List[str] = Field(default_factory=list, description="PDF关键词")
    filename_keywords: List[str] = Field(default_factory=list, description="文件名关键词")
    ocr_field_patterns: Dict[str, Any] = Field(default_factory=dict, description="OCR字段模式")
    amount_range: Optional[List[float]] = Field(None, description="金额范围")
    
    # 处理配置
    ocr_config: Optional[Dict[str, Any]] = Field(None, description="OCR配置")
    fields: List[InvoiceFieldRequest] = Field(default_factory=list, description="字段配置")
    validation_rules: List[str] = Field(default_factory=list, description="验证规则")
    
    # 设置
    priority: int = Field(50, ge=1, le=100, description="优先级")
    enabled: bool = Field(True, description="是否启用")


class InvoiceTypeConfigResponse(BaseModel):
    """发票类型配置响应模型"""
    id: UUID
    type_code: str
    type_name: str
    display_name: str
    description: Optional[str]
    pdf_keywords: List[str]
    filename_keywords: List[str]
    ocr_field_patterns: Dict[str, Any]
    amount_range: Optional[List[float]]
    ocr_config: Optional[Dict[str, Any]]
    fields: List[Dict[str, Any]]
    validation_rules: List[str]
    priority: int
    enabled: bool
    created_at: Optional[str]
    updated_at: Optional[str]


class ClassificationTestRequest(BaseModel):
    """分类测试请求模型"""
    pdf_content: Optional[str] = Field(None, description="PDF内容(base64)")
    filename: Optional[str] = Field(None, description="文件名")
    ocr_data: Optional[Dict[str, Any]] = Field(None, description="OCR数据")
    use_high_priority_only: bool = Field(False, description="仅使用高优先级配置")


class ClassificationTestResponse(BaseModel):
    """分类测试响应模型"""
    type_code: str
    display_name: str
    confidence: float
    score_details: Dict[str, float]
    config_used: Dict[str, Any]
    analysis_metadata: Dict[str, Any]
    built_invoice_data: Optional[Dict[str, Any]]


class BatchClassificationRequest(BaseModel):
    """批量分类请求模型"""
    items: List[Dict[str, Any]] = Field(..., description="待分类项目列表")
    use_high_priority_only: bool = Field(False, description="仅使用高优先级配置")


class BatchClassificationResponse(BaseModel):
    """批量分类响应模型"""
    results: List[ClassificationTestResponse]
    total_processed: int
    success_count: int
    error_count: int
    processing_time_ms: float


class PriorityUpdateRequest(BaseModel):
    """优先级更新请求模型"""
    updates: List[Dict[str, Any]] = Field(..., description="优先级更新列表")


class ServiceStatisticsResponse(BaseModel):
    """服务统计响应模型"""
    total_configs: int
    high_priority_configs: int
    cache_statistics: Dict[str, Any]
    service_version: str
    timestamp: str


class SearchRequest(BaseModel):
    """搜索请求模型"""
    keywords: List[str] = Field(..., min_items=1, description="搜索关键词")


# ===== 依赖注入 =====

async def get_invoice_type_service(
    session: AsyncSession = Depends(get_db_session)
) -> InvoiceTypeServiceV3Supabase:
    """获取发票类型服务实例"""
    return await create_invoice_type_service_supabase(session)


# ===== API 端点 =====

@router.get("/", response_model=List[InvoiceTypeConfigResponse], summary="获取发票类型配置列表")
async def get_invoice_type_configs(
    enabled_only: bool = Query(False, description="仅获取启用的配置"),
    high_priority_only: bool = Query(False, description="仅获取高优先级配置"),
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """获取发票类型配置列表 - 使用 Supabase 优化查询"""
    try:
        # 使用 Supabase 优化的查询
        if high_priority_only:
            configs = await service.get_high_priority_configs()
        else:
            configs = await service.get_all_configs()
        
        if enabled_only:
            configs = [config for config in configs if config.enabled]
        
        # 转换为响应格式
        response_configs = []
        for config in configs:
            response_config = InvoiceTypeConfigResponse(
                id=config.id,
                type_code=config.type_code,
                type_name=config.type_name,
                display_name=config.display_name,
                description=config.description,
                pdf_keywords=config.pdf_keywords or [],
                filename_keywords=config.filename_keywords or [],
                ocr_field_patterns=config.ocr_field_patterns or {},
                amount_range=config.amount_range,
                ocr_config=config.ocr_config,
                fields=config.fields or [],
                validation_rules=config.validation_rules or [],
                priority=config.priority,
                enabled=config.enabled,
                created_at=config.created_at.isoformat() if config.created_at else None,
                updated_at=config.updated_at.isoformat() if config.updated_at else None
            )
            response_configs.append(response_config)
        
        return response_configs
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取发票类型配置失败: {str(e)}"
        )


@router.get("/search", response_model=List[InvoiceTypeConfigResponse], summary="搜索发票类型配置")
async def search_invoice_type_configs(
    keywords: List[str] = Query(..., description="搜索关键词"),
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """使用 Supabase 全文搜索功能搜索配置"""
    try:
        # 使用 Supabase 的 JSON 搜索功能
        configs = await service.search_configs_by_keywords(keywords)
        
        # 转换为响应格式
        response_configs = []
        for config in configs:
            response_config = InvoiceTypeConfigResponse(
                id=config.id,
                type_code=config.type_code,
                type_name=config.type_name,
                display_name=config.display_name,
                description=config.description,
                pdf_keywords=config.pdf_keywords or [],
                filename_keywords=config.filename_keywords or [],
                ocr_field_patterns=config.ocr_field_patterns or {},
                amount_range=config.amount_range,
                ocr_config=config.ocr_config,
                fields=config.fields or [],
                validation_rules=config.validation_rules or [],
                priority=config.priority,
                enabled=config.enabled,
                created_at=config.created_at.isoformat() if config.created_at else None,
                updated_at=config.updated_at.isoformat() if config.updated_at else None
            )
            response_configs.append(response_config)
        
        return response_configs
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"搜索发票类型配置失败: {str(e)}"
        )


@router.get("/config/{type_code}", response_model=InvoiceTypeConfigResponse, summary="获取指定发票类型配置")
async def get_invoice_type_config(
    type_code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """获取指定发票类型配置 - 使用 Supabase 索引优化"""
    config = await service.get_config_by_type(type_code)
    if not config:
        raise HTTPException(status_code=404, detail=f"发票类型配置不存在: {type_code}")
    
    return InvoiceTypeConfigResponse(
        id=config.id,
        type_code=config.type_code,
        type_name=config.type_name,
        display_name=config.display_name,
        description=config.description,
        pdf_keywords=config.pdf_keywords or [],
        filename_keywords=config.filename_keywords or [],
        ocr_field_patterns=config.ocr_field_patterns or {},
        amount_range=config.amount_range,
        ocr_config=config.ocr_config,
        fields=config.fields or [],
        validation_rules=config.validation_rules or [],
        priority=config.priority,
        enabled=config.enabled,
        created_at=config.created_at.isoformat() if config.created_at else None,
        updated_at=config.updated_at.isoformat() if config.updated_at else None
    )


@router.post("/", response_model=InvoiceTypeConfigResponse, summary="创建发票类型配置")
async def create_invoice_type_config(
    config_request: InvoiceTypeConfigRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """创建新的发票类型配置 - 使用 Supabase 约束验证"""
    try:
        # 检查类型代码是否已存在
        existing_config = await service.get_config_by_type(config_request.type_code)
        if existing_config:
            raise HTTPException(
                status_code=409,
                detail=f"发票类型代码已存在: {config_request.type_code}"
            )
        
        # 构建配置数据
        config_data = {
            "type_code": config_request.type_code,
            "type_name": config_request.type_name,
            "display_name": config_request.display_name,
            "description": config_request.description,
            "pdf_keywords": config_request.pdf_keywords,
            "filename_keywords": config_request.filename_keywords,
            "ocr_field_patterns": config_request.ocr_field_patterns,
            "amount_range": config_request.amount_range,
            "ocr_config": config_request.ocr_config,
            "fields": [field.dict() for field in config_request.fields],
            "validation_rules": config_request.validation_rules,
            "priority": config_request.priority,
            "enabled": config_request.enabled
        }
        
        # 创建配置
        created_config = await service.create_config(config_data)
        
        return await get_invoice_type_config(created_config.type_code, current_user, service)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"创建发票类型配置失败: {str(e)}"
        )


@router.put("/config/{type_code}", response_model=InvoiceTypeConfigResponse, summary="更新发票类型配置")
async def update_invoice_type_config(
    type_code: str,
    config_request: InvoiceTypeConfigRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """更新发票类型配置 - 使用 Supabase 乐观锁"""
    try:
        # 检查配置是否存在
        existing_config = await service.get_config_by_type(type_code)
        if not existing_config:
            raise HTTPException(status_code=404, detail=f"发票类型配置不存在: {type_code}")
        
        # 构建更新数据
        update_data = {
            "type_name": config_request.type_name,
            "display_name": config_request.display_name,
            "description": config_request.description,
            "pdf_keywords": config_request.pdf_keywords,
            "filename_keywords": config_request.filename_keywords,
            "ocr_field_patterns": config_request.ocr_field_patterns,
            "amount_range": config_request.amount_range,
            "ocr_config": config_request.ocr_config,
            "fields": [field.dict() for field in config_request.fields],
            "validation_rules": config_request.validation_rules,
            "priority": config_request.priority,
            "enabled": config_request.enabled
        }
        
        # 更新配置
        updated_config = await service.update_config(type_code, update_data)
        if not updated_config:
            raise HTTPException(status_code=404, detail=f"发票类型配置不存在: {type_code}")
        
        return await get_invoice_type_config(type_code, current_user, service)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"更新发票类型配置失败: {str(e)}"
        )


@router.delete("/config/{type_code}", summary="删除发票类型配置")
async def delete_invoice_type_config(
    type_code: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """删除发票类型配置 - 使用软删除"""
    try:
        # 检查是否为默认配置
        if type_code in ["train_ticket", "vat_invoice"]:
            raise HTTPException(
                status_code=400,
                detail="不能删除系统默认的发票类型配置"
            )
        
        # 软删除配置
        success = await service.delete_config(type_code)
        if not success:
            raise HTTPException(status_code=404, detail=f"发票类型配置不存在: {type_code}")
        
        return {"message": f"发票类型配置已删除: {type_code}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除发票类型配置失败: {str(e)}"
        )


@router.post("/batch-update-priorities", summary="批量更新优先级")
async def batch_update_priorities(
    request: PriorityUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """批量更新优先级 - 使用 Supabase 事务"""
    try:
        success = await service.batch_update_priorities(request.updates)
        if not success:
            raise HTTPException(
                status_code=500,
                detail="批量更新优先级失败"
            )
        
        return {"message": f"成功更新 {len(request.updates)} 个配置的优先级"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量更新优先级失败: {str(e)}"
        )


@router.post("/classify", response_model=ClassificationTestResponse, summary="智能分类发票")
async def classify_invoice(
    test_request: ClassificationTestRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """智能分类发票 - 使用 Supabase 优化配置查询"""
    try:
        import base64
        import time
        
        start_time = time.time()
        
        # 解码PDF内容
        pdf_content = None
        if test_request.pdf_content:
            try:
                pdf_content = base64.b64decode(test_request.pdf_content)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF内容解码失败: {str(e)}"
                )
        
        # 执行分类
        if test_request.use_high_priority_only:
            result = await service.classify_with_high_priority_only(
                pdf_content=pdf_content,
                filename=test_request.filename,
                ocr_data=test_request.ocr_data
            )
        else:
            result = await service.classify_invoice(
                pdf_content=pdf_content,
                filename=test_request.filename,
                ocr_data=test_request.ocr_data
            )
        
        # 构建发票数据
        built_data = None
        if test_request.ocr_data:
            built_data = await service.build_invoice_data(result, test_request.ocr_data)
        
        # 添加性能指标
        processing_time = (time.time() - start_time) * 1000
        result.analysis_metadata["processing_time_ms"] = processing_time
        
        return ClassificationTestResponse(
            type_code=result.type_code,
            display_name=result.display_name,
            confidence=result.confidence,
            score_details=result.score_details,
            config_used=result.config_used,
            analysis_metadata=result.analysis_metadata,
            built_invoice_data=built_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"发票分类失败: {str(e)}"
        )


@router.post("/classify/batch", response_model=BatchClassificationResponse, summary="批量分类发票")
async def batch_classify_invoices(
    batch_request: BatchClassificationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """批量分类发票 - 使用 Supabase 优化和并行处理"""
    try:
        import base64
        import time
        
        start_time = time.time()
        
        # 处理批量数据
        processed_items = []
        for item in batch_request.items:
            # 解码PDF内容
            pdf_content = None
            if item.get("pdf_content"):
                try:
                    pdf_content = base64.b64decode(item["pdf_content"])
                except Exception:
                    pdf_content = None
            
            processed_items.append({
                "pdf_content": pdf_content,
                "filename": item.get("filename"),
                "ocr_data": item.get("ocr_data")
            })
        
        # 执行批量分类
        results = await service.batch_classify(processed_items)
        
        # 构建响应
        response_results = []
        success_count = 0
        error_count = 0
        
        for i, result in enumerate(results):
            try:
                # 构建发票数据
                built_data = None
                if batch_request.items[i].get("ocr_data"):
                    built_data = await service.build_invoice_data(
                        result, batch_request.items[i]["ocr_data"]
                    )
                
                response_result = ClassificationTestResponse(
                    type_code=result.type_code,
                    display_name=result.display_name,
                    confidence=result.confidence,
                    score_details=result.score_details,
                    config_used=result.config_used,
                    analysis_metadata=result.analysis_metadata,
                    built_invoice_data=built_data
                )
                response_results.append(response_result)
                success_count += 1
            except Exception as e:
                error_count += 1
                # 添加错误结果
                response_results.append(ClassificationTestResponse(
                    type_code="error",
                    display_name="处理失败",
                    confidence=0.0,
                    score_details={},
                    config_used={"error": str(e)},
                    analysis_metadata={"error": True},
                    built_invoice_data=None
                ))
        
        processing_time = (time.time() - start_time) * 1000
        
        return BatchClassificationResponse(
            results=response_results,
            total_processed=len(batch_request.items),
            success_count=success_count,
            error_count=error_count,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量分类失败: {str(e)}"
        )


@router.post("/upload-and-classify", response_model=ClassificationTestResponse, summary="上传文件并分类")
async def upload_and_classify_invoice(
    file: UploadFile = File(...),
    use_high_priority_only: bool = Query(False, description="仅使用高优先级配置"),
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """上传PDF文件并执行智能分类 - 使用 Supabase 优化"""
    try:
        import time
        
        start_time = time.time()
        
        # 验证文件类型
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="仅支持PDF文件"
            )
        
        # 读取文件内容
        pdf_content = await file.read()
        
        # 执行分类
        if use_high_priority_only:
            result = await service.classify_with_high_priority_only(
                pdf_content=pdf_content,
                filename=file.filename
            )
        else:
            result = await service.classify_invoice(
                pdf_content=pdf_content,
                filename=file.filename
            )
        
        # 添加性能指标
        processing_time = (time.time() - start_time) * 1000
        result.analysis_metadata["processing_time_ms"] = processing_time
        result.analysis_metadata["file_size_bytes"] = len(pdf_content)
        
        return ClassificationTestResponse(
            type_code=result.type_code,
            display_name=result.display_name,
            confidence=result.confidence,
            score_details=result.score_details,
            config_used=result.config_used,
            analysis_metadata=result.analysis_metadata,
            built_invoice_data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"文件上传和分类失败: {str(e)}"
        )


@router.get("/statistics/service", response_model=ServiceStatisticsResponse, summary="获取服务统计信息")
async def get_service_statistics(
    current_user: CurrentUser = Depends(get_current_user),
    service: InvoiceTypeServiceV3Supabase = Depends(get_invoice_type_service)
):
    """获取服务统计信息 - 包含 Supabase 缓存统计"""
    try:
        stats = await service.get_service_statistics()
        
        return ServiceStatisticsResponse(
            total_configs=stats["total_configs"],
            high_priority_configs=stats["high_priority_configs"],
            cache_statistics=stats["cache_statistics"],
            service_version=stats["service_version"],
            timestamp=stats["timestamp"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取服务统计失败: {str(e)}"
        )


@router.get("/enum/types", summary="获取发票类型枚举")
async def get_invoice_type_enum():
    """获取发票类型枚举值"""
    return {
        "types": [
            {"code": item.value, "name": item.name}
            for item in InvoiceTypeEnum
        ]
    }


@router.get("/health", summary="健康检查")
async def health_check():
    """服务健康检查"""
    from datetime import datetime
    
    return {
        "status": "healthy",
        "service": "InvoiceTypeServiceV3Supabase",
        "version": "3.0.0_supabase",
        "features": [
            "supabase_native_cache",
            "postgresql_optimization",
            "json_search",
            "batch_operations",
            "high_priority_mode"
        ],
        "timestamp": datetime.now().isoformat()
    }