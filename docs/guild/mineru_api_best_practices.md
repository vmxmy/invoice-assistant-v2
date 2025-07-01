# Mineru API 调用最佳实践

本文档旨在提供调用 Mineru API 进行批量文件处理时的最佳实践，以确保高效、可靠地获取结果。

## API端点信息

- **基础URL**: `https://mineru.net/api/v4`

### 主要端点

1.  **获取批量上传URL**:
    -   **URL**: `/file-urls/batch`
    -   **方法**: `POST`
    -   **作用**: 为一批文件请求预签名的上传URL。

2.  **获取批量提取结果**:
    -   **URL**: `/extract-results/batch/{batch_id}`
    -   **方法**: `GET`
    -   **作用**: 根据 `batch_id` 轮询文件的处理状态和结果。

## 核心原则

### 1. 避免使用固定等待时间

在文件上传完成后，应避免使用 `time.sleep()` 等方式进行固定时长的等待。由于文件处理时间受多种因素影响（如文件大小、服务器负载等），固定等待可能导致不必要的延迟或过早的查询。

**错误示例：**
```python
# 不推荐：上传后固定等待 2 分钟
time.sleep(120) 
poll_for_results(batch_id)
```

### 2. 采用动态轮询机制

最佳实践是，在文件上传成功后立即开始轮询 `extract-results` 端点，以获取实时处理状态。

- **立即开始**：不要在上传和轮询之间设置任何初始延迟。
- **合理间隔**：设置一个合理的轮询间隔（例如，15秒），以在及时性和API请求频率之间取得平衡。
- **持续轮询**：持续轮询，直到所有任务的状态都变为 `done` 或 `failed`。

**推荐示例：**
```python
upload_successful = upload_files(local_file_paths, urls)
if upload_successful:
    print("All files uploaded. Starting to poll for results...")
    # 立即开始轮询，无需等待
    final_results = poll_for_results(batch_id)
```

### 3. 设置轮询超时

为防止因意外问题（如任务卡死）导致无限轮询，必须为轮询过程设置一个总的超时时间。如果在超时时间内未能获取到所有结果，应中断轮询并记录错误。

**推荐示例：**
```python
POLL_TIMEOUT_SECONDS = 600  # 设置10分钟的超时
start_time = time.time()

while time.time() - start_time < POLL_TIMEOUT_SECONDS:
    # ... 轮询逻辑 ...
    if all_tasks_completed:
        break
    time.sleep(POLL_INTERVAL_SECONDS)
```

### 4. 提供清晰的日志记录

在流程的每个关键步骤都添加详细的日志输出，这对于调试和监控至关重要。

- **请求上传URL**：记录请求的URL和获取到的 `batch_id`。
- **文件上传**：记录每个文件的上传状态（成功或失败）。
- **轮询状态**：在每次轮询时，打印当前已完成、失败和进行中的任务数量，让用户了解实时进度。
- **最终结果**：清晰地展示最终获取到的结果或错误信息。

### 5. 完整的错误处理

确保在代码中对所有可能失败的操作进行捕获和处理。

- **API 请求**：使用 `try...except` 块捕获 `requests.exceptions.RequestException` 等网络异常。
- **文件操作**：处理 `FileNotFoundError` 等文件系统相关的异常。
- **API 业务错误**：检查API返回的 `code` 字段，并根据其值处理业务逻辑错误。
