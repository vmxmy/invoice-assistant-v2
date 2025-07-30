# Render + Vercel 部署指南

## 问题诊断

当后端部署在 Render，前端部署在 Vercel 时，OCR 功能可能因为以下原因失败：

1. **超时限制**
   - Render 免费版 HTTP 超时：30秒
   - Vercel 免费版函数超时：10秒
   - OCR 处理可能需要更长时间

2. **文件大小限制**
   - Render 请求体限制：100MB
   - Vercel API Routes 限制：4.5MB

3. **CORS 配置问题**

## 解决方案

### 1. 前端修改（已完成）

修改 `frontend/src/services/apiClient.ts`：

```typescript
// 创建专门用于 OCR 的 Axios 实例（更长的超时时间）
const ocrClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8090',
  timeout: 60000, // OCR 需要 60 秒超时
  headers: {
    'Content-Type': 'multipart/form-data',
  },
})
```

### 2. 后端优化（Render）

#### 环境变量配置

在 Render Dashboard 中设置：

```bash
# 基础配置
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8090

# CORS 配置 - 重要！
CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com

# OCR 超时配置
OCR_TIMEOUT=50  # 设置为 50 秒，留出余量

# 文件大小限制
MAX_UPLOAD_SIZE=10485760  # 10MB

# 性能优化
WORKERS=2  # Render 免费版建议 2 个 worker
```

#### 修改后端 OCR 处理

创建文件 `backend/app/core/config.py` 添加：

```python
# OCR 配置
OCR_TIMEOUT = int(os.getenv("OCR_TIMEOUT", "50"))
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", "10485760"))  # 10MB

# 添加请求超时中间件
@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    try:
        return await asyncio.wait_for(call_next(request), timeout=60.0)
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=504,
            content={"detail": "Request timeout"}
        )
```

### 3. OCR 优化策略

#### 方案 A：异步处理（推荐）

修改 OCR 流程为异步：

```python
# backend/app/api/v1/endpoints/ocr.py

@router.post("/combined/full")
async def ocr_full_async(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    # 1. 快速返回任务 ID
    task_id = str(uuid.uuid4())
    
    # 2. 后台处理
    background_tasks.add_task(
        process_ocr_async,
        task_id=task_id,
        file=file,
        user_id=current_user.id
    )
    
    # 3. 立即返回
    return {
        "task_id": task_id,
        "status": "processing",
        "message": "OCR 处理已开始，请稍后查询结果"
    }

@router.get("/tasks/{task_id}/status")
async def get_ocr_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    # 返回处理状态
    result = await get_ocr_result(task_id)
    return result
```

前端相应修改：

```typescript
// 修改上传流程
const handleOCR = async (file: File) => {
  // 1. 提交 OCR 任务
  const { data } = await api.ocr.full(formData);
  const taskId = data.task_id;
  
  // 2. 轮询检查状态
  const checkStatus = async () => {
    const result = await api.ocr.getStatus(taskId);
    if (result.data.status === 'completed') {
      // 处理完成
      return result.data.result;
    } else if (result.data.status === 'failed') {
      throw new Error(result.data.error);
    } else {
      // 继续轮询
      await new Promise(resolve => setTimeout(resolve, 2000));
      return checkStatus();
    }
  };
  
  return checkStatus();
};
```

#### 方案 B：使用 Supabase Edge Functions

将 OCR 处理迁移到 Supabase Edge Functions：

```typescript
// supabase/functions/ocr-process/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    // 调用阿里云 OCR
    const result = await processOCR(file)
    
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
```

### 4. Vercel 前端配置

`vercel.json`:

```json
{
  "functions": {
    "api/proxy-ocr.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend.onrender.com/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        }
      ]
    }
  ]
}
```

### 5. 性能监控

添加性能监控来诊断问题：

```typescript
// frontend/src/utils/performance.ts
export const trackOCRPerformance = (file: File) => {
  const metrics = {
    fileName: file.name,
    fileSize: file.size,
    startTime: Date.now(),
    uploadStartTime: 0,
    uploadEndTime: 0,
    ocrStartTime: 0,
    ocrEndTime: 0,
    totalTime: 0
  };
  
  return {
    startUpload: () => metrics.uploadStartTime = Date.now(),
    endUpload: () => metrics.uploadEndTime = Date.now(),
    startOCR: () => metrics.ocrStartTime = Date.now(),
    endOCR: () => {
      metrics.ocrEndTime = Date.now();
      metrics.totalTime = metrics.ocrEndTime - metrics.startTime;
      
      console.log('📊 OCR Performance Metrics:', {
        fileName: metrics.fileName,
        fileSize: `${(metrics.fileSize / 1024 / 1024).toFixed(2)} MB`,
        uploadTime: `${metrics.uploadEndTime - metrics.uploadStartTime} ms`,
        ocrTime: `${metrics.ocrEndTime - metrics.ocrStartTime} ms`,
        totalTime: `${metrics.totalTime} ms`
      });
      
      // 如果处理时间超过 20 秒，记录警告
      if (metrics.totalTime > 20000) {
        console.warn('⚠️ OCR 处理时间过长，建议优化');
      }
    }
  };
};
```

### 6. 临时解决方案

如果以上方案都无法解决，可以考虑：

1. **降低图片质量**
   ```typescript
   // 压缩图片后再上传
   const compressImage = async (file: File): Promise<File> => {
     // 使用 browser-image-compression 库
     const options = {
       maxSizeMB: 1,
       maxWidthOrHeight: 1920,
       useWebWorker: true
     };
     return await imageCompression(file, options);
   };
   ```

2. **使用 CDN 加速**
   - 将静态资源部署到 CDN
   - 使用 Cloudflare 代理加速 API 请求

3. **升级服务套餐**
   - Render Starter: $7/月，无超时限制
   - Vercel Pro: $20/月，函数超时 60 秒

## 测试步骤

1. 部署修改后的前端代码到 Vercel
2. 检查 Render 日志确认请求是否到达
3. 测试不同大小的 PDF 文件
4. 监控性能指标

## 故障排除

### 常见错误

1. **CORS 错误**
   ```
   Access to XMLHttpRequest blocked by CORS policy
   ```
   解决：检查后端 CORS_ORIGINS 配置

2. **504 Gateway Timeout**
   ```
   The request could not be satisfied
   ```
   解决：实施异步处理方案

3. **413 Request Entity Too Large**
   ```
   PayloadTooLargeError: request entity too large
   ```
   解决：压缩图片或限制文件大小

### 调试技巧

1. 在浏览器控制台查看网络请求
2. 检查 Render 实时日志
3. 使用 Postman 直接测试 API
4. 添加更多日志输出