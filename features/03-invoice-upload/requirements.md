# 03 - 发票上传功能

## 功能概述
实现发票文件上传，直接调用现有 Supabase Edge Function 进行 OCR 处理。

## 核心需求
- 相机拍照功能（iOS 原生集成）
- 相册选择功能
- 文件预览和确认
- 直接调用现有 `ocr-dedup-complete` Edge Function
- 上传进度显示
- OCR 结果展示
- 去重检查和文件恢复功能

## 技术集成
- 使用 image_picker 插件
- 直接复用现有 Edge Function API
- 支持文件哈希计算和去重
- 错误处理和重试机制

## 交付成果
- 文件选择和预览界面
- Edge Function 调用服务
- 上传进度和状态管理
- OCR 结果显示组件