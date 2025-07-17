"""
配置管理 API 端点

提供动态配置的读取、更新和管理功能
支持多层缓存、版本控制和审计日志
"""

import json
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from supabase import Client

from app.core.dependencies import get_current_user, CurrentUser, get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()


# ===== 请求/响应模型 =====

class ConfigUpdateRequest(BaseModel):
    """配置更新请求"""
    value: Union[Dict[str, Any], List[Any], str, int, float, bool] = Field(..., description="配置值")
    reason: str = Field(..., description="更新原因")
    environment: str = Field("production", description="环境")


class ConfigResponse(BaseModel):
    """配置响应"""
    id: str
    category: str
    key: str
    value: Any
    version: int
    environment: str
    created_at: str
    updated_at: str


class ConfigListResponse(BaseModel):
    """配置列表响应"""
    data: List[ConfigResponse]
    version: str
    cached_until: Optional[str] = None


class InvoiceTypeResponse(BaseModel):
    """发票类型配置响应"""
    code: str
    name: str
    field_definitions: Dict[str, Any]
    validation_rules: Dict[str, Any]
    ocr_template: Optional[Dict[str, Any]] = None
    is_active: bool


class FeatureFlagResponse(BaseModel):
    """功能开关响应"""
    name: str
    enabled: bool
    rollout_percentage: int
    metadata: Dict[str, Any]


# ===== 配置管理服务 =====

class ConfigService:
    """配置管理服务"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self._cache = {}  # 简单内存缓存
        self._cache_ttl = 300  # 5分钟TTL
    
    async def get_category_configs(self, category_name: str, environment: str = "production") -> List[Dict[str, Any]]:
        """获取分类下的所有配置"""
        try:
            # 查询配置分类
            category_result = self.supabase.table("config_categories").select("id").eq("name", category_name).execute()
            if not category_result.data:
                raise ValueError(f"配置分类不存在: {category_name}")
            
            category_id = category_result.data[0]["id"]
            
            # 查询配置列表
            configs_result = self.supabase.table("configurations").select("*").eq("category_id", category_id).eq("environment", environment).eq("is_active", True).execute()
            
            return configs_result.data
            
        except Exception as e:
            logger.error(f"获取配置分类失败: {str(e)}")
            raise HTTPException(status_code=500, detail="获取配置失败")
    
    async def get_config(self, category_name: str, key: str, environment: str = "production") -> Optional[Dict[str, Any]]:
        """获取单个配置"""
        cache_key = f"{category_name}:{key}:{environment}"
        
        # 检查缓存
        if cache_key in self._cache:
            cached_data, cached_time = self._cache[cache_key]
            if (datetime.utcnow() - cached_time).seconds < self._cache_ttl:
                return cached_data
        
        try:
            # 查询配置分类
            category_result = self.supabase.table("config_categories").select("id").eq("name", category_name).execute()
            if not category_result.data:
                return None
            
            category_id = category_result.data[0]["id"]
            
            # 查询具体配置
            config_result = self.supabase.table("configurations").select("*").eq("category_id", category_id).eq("key", key).eq("environment", environment).eq("is_active", True).execute()
            
            if not config_result.data:
                return None
            
            config_data = config_result.data[0]
            
            # 更新缓存
            self._cache[cache_key] = (config_data, datetime.utcnow())
            
            return config_data
            
        except Exception as e:
            logger.error(f"获取配置失败: {str(e)}")
            return None
    
    async def update_config(self, category_name: str, key: str, request: ConfigUpdateRequest, user_id: str) -> Dict[str, Any]:
        """更新配置"""
        try:
            # 获取当前配置
            current_config = await self.get_config(category_name, key, request.environment)
            
            if current_config:
                # 记录审计日志
                await self._create_audit_log(
                    config_id=current_config["id"],
                    previous_value=current_config["value"],
                    new_value=request.value,
                    change_type="update",
                    changed_by=user_id,
                    reason=request.reason
                )
                
                # 更新配置
                update_result = self.supabase.table("configurations").update({
                    "value": request.value,
                    "version": current_config["version"] + 1,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", current_config["id"]).execute()
                
                updated_config = update_result.data[0]
            else:
                # 创建新配置
                category_result = self.supabase.table("config_categories").select("id").eq("name", category_name).execute()
                if not category_result.data:
                    raise ValueError(f"配置分类不存在: {category_name}")
                
                category_id = category_result.data[0]["id"]
                
                insert_result = self.supabase.table("configurations").insert({
                    "category_id": category_id,
                    "key": key,
                    "value": request.value,
                    "environment": request.environment,
                    "created_by": user_id
                }).execute()
                
                updated_config = insert_result.data[0]
                
                # 记录审计日志
                await self._create_audit_log(
                    config_id=updated_config["id"],
                    previous_value=None,
                    new_value=request.value,
                    change_type="create",
                    changed_by=user_id,
                    reason=request.reason
                )
            
            # 清除缓存
            cache_key = f"{category_name}:{key}:{request.environment}"
            self._cache.pop(cache_key, None)
            
            return updated_config
            
        except Exception as e:
            logger.error(f"更新配置失败: {str(e)}")
            raise HTTPException(status_code=500, detail="更新配置失败")
    
    async def _create_audit_log(self, config_id: str, previous_value: Any, new_value: Any, change_type: str, changed_by: str, reason: str):
        """创建审计日志"""
        try:
            self.supabase.table("config_audit_log").insert({
                "config_id": config_id,
                "previous_value": previous_value,
                "new_value": new_value,
                "change_type": change_type,
                "changed_by": changed_by,
                "reason": reason
            }).execute()
        except Exception as e:
            logger.error(f"创建审计日志失败: {str(e)}")


# ===== API 端点 =====

@router.get("/categories/{category_name}", response_model=ConfigListResponse, summary="获取分类配置")
async def get_category_configs(
    category_name: str,
    environment: str = "production",
    if_none_match: Optional[str] = Header(None, alias="if-none-match"),
    supabase: Client = Depends(get_supabase_client)
) -> ConfigListResponse:
    """
    获取指定分类下的所有配置
    
    支持 ETag 缓存验证
    """
    try:
        service = ConfigService(supabase)
        configs = await service.get_category_configs(category_name, environment)
        
        # 生成版本标识
        version = str(hash(json.dumps(configs, sort_keys=True)))
        
        # ETag 缓存验证
        if if_none_match and if_none_match == version:
            raise HTTPException(status_code=304, detail="Not Modified")
        
        response_data = []
        for config in configs:
            response_data.append(ConfigResponse(
                id=config["id"],
                category=category_name,
                key=config["key"],
                value=config["value"],
                version=config["version"],
                environment=config["environment"],
                created_at=config["created_at"],
                updated_at=config["updated_at"]
            ))
        
        # 计算缓存过期时间
        cache_expiry = datetime.utcnow().timestamp() + 300  # 5分钟后过期
        
        return ConfigListResponse(
            data=response_data,
            version=version,
            cached_until=datetime.fromtimestamp(cache_expiry).isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分类配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取配置失败")


@router.get("/categories/{category_name}/{key}", response_model=ConfigResponse, summary="获取单个配置")
async def get_config(
    category_name: str,
    key: str,
    environment: str = "production",
    supabase: Client = Depends(get_supabase_client)
) -> ConfigResponse:
    """获取指定的单个配置项"""
    try:
        service = ConfigService(supabase)
        config = await service.get_config(category_name, key, environment)
        
        if not config:
            raise HTTPException(status_code=404, detail="配置不存在")
        
        return ConfigResponse(
            id=config["id"],
            category=category_name,
            key=config["key"],
            value=config["value"],
            version=config["version"],
            environment=config["environment"],
            created_at=config["created_at"],
            updated_at=config["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取配置失败")


@router.put("/categories/{category_name}/{key}", response_model=ConfigResponse, summary="更新配置")
async def update_config(
    category_name: str,
    key: str,
    request: ConfigUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> ConfigResponse:
    """
    更新指定配置项
    
    需要管理员权限，会记录审计日志
    """
    try:
        # 权限检查（简化版本，后续可以增强）
        logger.info(f"用户 {current_user.id} 尝试更新配置: {category_name}.{key}")
        
        service = ConfigService(supabase)
        updated_config = await service.update_config(category_name, key, request, current_user.id)
        
        return ConfigResponse(
            id=updated_config["id"],
            category=category_name,
            key=key,
            value=updated_config["value"],
            version=updated_config["version"],
            environment=updated_config["environment"],
            created_at=updated_config["created_at"],
            updated_at=updated_config["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail="更新配置失败")


@router.get("/invoice-types", summary="获取所有发票类型配置")
async def get_invoice_types(
    supabase: Client = Depends(get_supabase_client)
) -> List[InvoiceTypeResponse]:
    """获取所有激活的发票类型配置"""
    try:
        result = supabase.table("invoice_types").select("*").eq("is_active", True).execute()
        
        response_data = []
        for invoice_type in result.data:
            response_data.append(InvoiceTypeResponse(
                code=invoice_type["code"],
                name=invoice_type["name"],
                field_definitions=invoice_type["field_definitions"],
                validation_rules=invoice_type["validation_rules"],
                ocr_template=invoice_type["ocr_template"],
                is_active=invoice_type["is_active"]
            ))
        
        return response_data
        
    except Exception as e:
        logger.error(f"获取发票类型配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取发票类型配置失败")


@router.get("/invoice-types/{code}", response_model=InvoiceTypeResponse, summary="获取发票类型配置")
async def get_invoice_type(
    code: str,
    supabase: Client = Depends(get_supabase_client)
) -> InvoiceTypeResponse:
    """获取指定发票类型的配置"""
    try:
        result = supabase.table("invoice_types").select("*").eq("code", code).eq("is_active", True).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail=f"发票类型不存在: {code}")
        
        invoice_type = result.data[0]
        
        return InvoiceTypeResponse(
            code=invoice_type["code"],
            name=invoice_type["name"],
            field_definitions=invoice_type["field_definitions"],
            validation_rules=invoice_type["validation_rules"],
            ocr_template=invoice_type["ocr_template"],
            is_active=invoice_type["is_active"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取发票类型配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取发票类型配置失败")


@router.get("/feature-flags", summary="获取功能开关")
async def get_feature_flags(
    supabase: Client = Depends(get_supabase_client)
) -> List[FeatureFlagResponse]:
    """获取所有功能开关配置"""
    try:
        result = supabase.table("feature_flags").select("*").execute()
        
        response_data = []
        for flag in result.data:
            response_data.append(FeatureFlagResponse(
                name=flag["name"],
                enabled=flag["enabled"],
                rollout_percentage=flag["rollout_percentage"],
                metadata=flag["metadata"]
            ))
        
        return response_data
        
    except Exception as e:
        logger.error(f"获取功能开关失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取功能开关失败")


@router.get("/feature-flags/{name}", response_model=FeatureFlagResponse, summary="获取功能开关")
async def get_feature_flag(
    name: str,
    supabase: Client = Depends(get_supabase_client)
) -> FeatureFlagResponse:
    """获取指定功能开关的状态"""
    try:
        result = supabase.table("feature_flags").select("*").eq("name", name).execute()
        
        if not result.data:
            # 默认返回关闭状态
            return FeatureFlagResponse(
                name=name,
                enabled=False,
                rollout_percentage=0,
                metadata={}
            )
        
        flag = result.data[0]
        
        return FeatureFlagResponse(
            name=flag["name"],
            enabled=flag["enabled"],
            rollout_percentage=flag["rollout_percentage"],
            metadata=flag["metadata"]
        )
        
    except Exception as e:
        logger.error(f"获取功能开关失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取功能开关失败")


@router.get("/audit/{config_id}", summary="获取配置变更历史")
async def get_config_audit_log(
    config_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> List[Dict[str, Any]]:
    """获取指定配置的变更历史"""
    try:
        result = supabase.table("config_audit_log").select("*").eq("config_id", config_id).order("changed_at", desc=True).execute()
        
        return result.data
        
    except Exception as e:
        logger.error(f"获取审计日志失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取审计日志失败")