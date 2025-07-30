# 前端API更新报告

## 问题描述
通过网页上传发票页面上传的PDF没有储存在Supabase Storage中。

## 原因分析
前端上传页面使用的是旧的API端点：
- **旧端点**: `/api/v1/files/upload-invoice`
- **问题**: 使用`FileService`将文件保存到本地文件系统，而不是云存储

## 解决方案
已更新前端API调用，使用新的增强文件端点：
- **新端点**: `/api/v1/enhanced-files/upload-invoice`
- **优势**: 
  - 文件直接上传到Supabase Storage
  - 支持文件去重（基于SHA256哈希）
  - 无本地文件依赖

## 更新内容

### 文件: `frontend/src/services/apiClient.ts`
```javascript
// 之前
create: (data: FormData) => apiClient.post('/api/v1/files/upload-invoice', data, {
  headers: { 'Content-Type': 'multipart/form-data' }
}),

// 之后
create: (data: FormData) => apiClient.post('/api/v1/enhanced-files/upload-invoice', data, {
  headers: { 'Content-Type': 'multipart/form-data' }
}),
```

## 功能差异

### 旧端点 (`/api/v1/files/upload-invoice`)
1. 文件保存到本地: `uploads/user_{user_id}/`
2. 无去重机制
3. 依赖本地文件系统

### 新端点 (`/api/v1/enhanced-files/upload-invoice`)
1. 文件保存到Supabase Storage: `invoices/user_{user_id}/`
2. 基于文件哈希的去重机制
3. 纯云存储，无本地依赖
4. 返回签名URL用于下载

## 注意事项
- 新端点会检测重复文件，相同内容的文件不会重复上传
- 如果上传重复文件，会返回现有文件信息
- 所有文件访问通过签名URL，有效期默认1小时

## 测试建议
1. 清除浏览器缓存
2. 重新加载前端应用
3. 上传新的PDF文件
4. 验证文件是否出现在Supabase Storage的`invoices`桶中