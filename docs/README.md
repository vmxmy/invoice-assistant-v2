# 发票管理系统文档

## 项目概述
发票管理系统是一个自动化发票处理平台，支持从邮箱自动下载发票、使用 AI 技术提取发票信息、并提供完整的发票管理功能。

## 文档目录

### 01_产品文档
- [产品需求文档（PRD）](./01_product/prd.md) - 产品功能规格说明

### 02_项目管理
- [开发计划](./02_project_management/development_plan.md) - 项目开发计划和里程碑
- [进度跟踪](./02_project_management/progress_summary.md) - 项目进度总结

### 03_设计文档
#### 架构设计
- [系统架构设计](./03_design/01_architecture/fastapi_zen_architecture.md) - FastAPI Zen 架构说明

#### 数据库设计
- [数据库概览](./03_design/02_database_models/overview.md) - 数据库整体设计
- [用户模型](./03_design/02_database_models/profile.md) - 用户认证和信息管理
- [发票模型](./03_design/02_database_models/invoice.md) - 发票数据结构
- [任务模型](./03_design/02_database_models/task.md) - 异步任务管理

#### API 设计
- [API 接口文档](./03_design/03_api/api_reference.md) - RESTful API 详细说明

### 04_开发指南
- [快速开始](./04_guides_and_practices/quick_start.md) - 环境搭建和运行指南
- [开发规范](./04_guides_and_practices/development_standards.md) - 编码规范和最佳实践
- [测试指南](./04_guides_and_practices/testing_guide.md) - 测试策略和方法
- [MinERU API 最佳实践](./04_guides_and_practices/mineru_api_best_practices.md) - OCR 服务集成

### 05_部署文档
- [部署指南](./05_deployment/deployment_guide.md) - 生产环境部署说明
- [运维手册](./05_deployment/operations_manual.md) - 系统运维和监控

## 技术栈

### 后端
- **FastAPI**: 现代高性能 Web 框架
- **Supabase**: 后端即服务平台（认证、数据库、存储）
- **Dramatiq**: 分布式任务队列
- **阿里云 OCR**: 发票识别服务
- **MinERU API**: 高精度 PDF 解析

### 前端
- **React 19**: 用户界面框架
- **TypeScript**: 类型安全的 JavaScript
- **DaisyUI**: 基于 Tailwind CSS 的组件库
- **React Query**: 数据获取和状态管理

## 快速链接
- [GitHub 仓库](https://github.com/your-repo/invoice-assist)
- [API 文档](http://localhost:8090/docs)
- [产品演示](http://localhost:5174)

## 版本历史
- **V2.0** (当前版本) - FastAPI + Supabase 架构
- **V1.0** - Flask 基础版本

## 联系方式
- 技术负责人：blueyang@gmail.com
- 项目管理：[项目看板](https://github.com/your-repo/invoice-assist/projects)