"""
OCR服务异常定义
"""

from typing import Optional, Dict, Any


class OCRError(Exception):
    """OCR基础异常"""
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None, 
        retry_after: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.retry_after = retry_after
        self.context = context or {}
        
        # 构建详细的错误消息
        detailed_message = message
        if error_code:
            detailed_message = f"[{error_code}] {message}"
        if context:
            context_str = ", ".join(f"{k}={v}" for k, v in context.items())
            detailed_message = f"{detailed_message} (Context: {context_str})"
            
        super().__init__(detailed_message)


class OCRTimeoutError(OCRError):
    """OCR超时异常"""
    
    def __init__(
        self, 
        message: str, 
        timeout_seconds: Optional[float] = None,
        operation: Optional[str] = None,
        **kwargs
    ):
        context = kwargs.get('context', {})
        if timeout_seconds:
            context['timeout_seconds'] = timeout_seconds
        if operation:
            context['operation'] = operation
        kwargs['context'] = context
        super().__init__(message, **kwargs)


class OCRAPIError(OCRError):
    """OCR API错误"""
    
    def __init__(
        self, 
        message: str, 
        status_code: int, 
        response_text: str = "",
        request_url: Optional[str] = None,
        **kwargs
    ):
        context = kwargs.get('context', {})
        context.update({
            'status_code': status_code,
            'response_preview': response_text[:200] if response_text else None,
            'request_url': request_url
        })
        kwargs['context'] = context
        super().__init__(message, **kwargs)
        self.status_code = status_code
        self.response_text = response_text


class OCRZipProcessError(OCRError):
    """ZIP文件处理错误"""
    
    def __init__(
        self, 
        message: str, 
        zip_path: Optional[str] = None,
        operation: Optional[str] = None,
        **kwargs
    ):
        context = kwargs.get('context', {})
        if zip_path:
            context['zip_path'] = zip_path
        if operation:
            context['operation'] = operation
        kwargs['context'] = context
        super().__init__(message, **kwargs)


class OCRPollTimeoutError(OCRTimeoutError):
    """轮询超时异常"""
    
    def __init__(
        self, 
        message: str, 
        batch_id: Optional[str] = None,
        poll_count: Optional[int] = None,
        **kwargs
    ):
        context = kwargs.get('context', {})
        if batch_id:
            context['batch_id'] = batch_id
        if poll_count:
            context['poll_count'] = poll_count
        kwargs['context'] = context
        kwargs['operation'] = 'polling'
        super().__init__(message, **kwargs)


class OCRConfigError(OCRError):
    """OCR配置错误"""
    
    def __init__(
        self, 
        message: str, 
        config_key: Optional[str] = None,
        config_value: Optional[Any] = None,
        **kwargs
    ):
        context = kwargs.get('context', {})
        if config_key:
            context['config_key'] = config_key
        if config_value is not None:
            context['config_value'] = str(config_value)
        kwargs['context'] = context
        super().__init__(message, **kwargs)


class OCRValidationError(OCRError):
    """OCR数据验证错误"""
    
    def __init__(
        self, 
        message: str, 
        field_name: Optional[str] = None,
        field_value: Optional[Any] = None,
        validation_rule: Optional[str] = None,
        **kwargs
    ):
        context = kwargs.get('context', {})
        if field_name:
            context['field_name'] = field_name
        if field_value is not None:
            context['field_value'] = str(field_value)
        if validation_rule:
            context['validation_rule'] = validation_rule
        kwargs['context'] = context
        super().__init__(message, **kwargs)


class OCRProcessError(OCRError):
    """OCR处理错误"""
    
    def __init__(
        self, 
        message: str, 
        file_path: Optional[str] = None,
        process_stage: Optional[str] = None,
        **kwargs
    ):
        context = kwargs.get('context', {})
        if file_path:
            context['file_path'] = file_path
        if process_stage:
            context['process_stage'] = process_stage
        kwargs['context'] = context
        super().__init__(message, **kwargs) 