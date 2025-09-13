# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目架构

这是一个智能发票管理系统，采用现代化全栈架构：
- **Frontend**: React 19 + TypeScript + Vite + DaisyUI (位于 `frontend/`)
- **Mobile**: Flutter 跨平台应用 (位于 `flutter_app/`)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **部署**: Vercel (前端) + Supabase (后端服务)

## 关键命令

### 前端开发
```bash
cd frontend
npm run dev                    # 开发服务器 (端口 5174)
npm run build:production      # 生产构建
npm run lint                  # ESLint 检查
npm run type-check            # TypeScript 类型检查
```

### Flutter 开发
```bash
cd flutter_app
flutter pub get               # 安装依赖
flutter run                   # 运行应用
flutter build apk            # 构建 Android APK
flutter build ios           # 构建 iOS 应用
```

### 环境管理
```bash
# 前端环境切换
npm run env:local            # 本地开发环境
npm run env:staging          # 测试环境  
npm run env:prod             # 生产环境
```

## 核心架构

### 前端架构
- **状态管理**: TanStack Query (React Query) 
- **路由**: React Router v7
- **UI组件**: DaisyUI + Tailwind CSS
- **类型安全**: TypeScript 严格模式
- **构建工具**: Vite 7.0

### Flutter 架构
- **架构模式**: Clean Architecture + BLoC
- **状态管理**: flutter_bloc
- **依赖注入**: get_it
- **数据层**: Repository 模式
- **UI**: Material Design + Cupertino

### 数据服务
- **数据库**: Supabase PostgreSQL
- **实时通信**: Supabase Realtime
- **认证**: Supabase Auth
- **文件存储**: Supabase Storage
- **OCR服务**: Edge Functions + 阿里云 OCR

## 开发规范

### 前端组件结构
```
src/components/
├── invoice/          # 发票相关组件
├── mobile/          # 移动端特定组件  
├── dashboard/       # 仪表盘组件
└── common/          # 通用组件
```

### Flutter 项目结构
```
lib/
├── core/            # 核心配置和工具
├── data/            # 数据层 (Repository, DataSource)
├── domain/          # 业务逻辑层 (UseCase, Entity)
└── presentation/    # 表现层 (Pages, Widgets, BLoC)
```

### 性能优化要点
- **React**: 使用 React.memo, useMemo, useCallback
- **Flutter**: 使用 const 构造函数，避免不必要的重建
- **数据**: 实现虚拟滚动和分页加载
- **缓存**: TanStack Query 自动缓存管理

## 测试和部署

### 代码质量检查
```bash
# 前端
cd frontend && npm run lint && npm run type-check

# Flutter  
cd flutter_app && flutter analyze && flutter test
```

### 部署流程
- **前端**: 自动部署到 Vercel (推送到 main 分支)
- **Flutter**: 手动构建和发布到应用商店
- **Edge Functions**: 通过 Supabase CLI 部署

## 代码清理流程 (Knip)

### 标准 Knip 清理流程

基于实际项目经验，以下是使用 Knip 进行代码清理的标准化流程：

#### 1. 环境准备
```bash
cd frontend
npm install --save-dev knip
```

#### 2. 配置 Knip (knip.config.ts)
```typescript
import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // 入口文件
  entry: ["src/main.tsx"],
  
  // 项目文件模式
  project: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}"
  ],
  
  // 忽略报告的文件
  ignore: [
    "src/generated/**",
    "**/*.d.ts"
  ],
  
  // 规则配置
  rules: {
    files: "error",         // 未使用文件为错误
    exports: "warn",        // 未使用导出为警告
    dependencies: "error",  // 未使用依赖为错误
    unlisted: "error",      // 未列出的依赖为错误
    unresolved: "warn"      // 无法解析的导入为警告
  },
  
  // 忽略特定依赖（确实需要但工具检测不到的）
  ignoreDependencies: [
    "daisyui",              // Tailwind CSS 插件
    "autoprefixer"          // PostCSS 插件
  ],
  
  // 忽略特定二进制工具
  ignoreBinaries: [
    "vite-bundle-analyzer",
    "supabase"
  ],
  
  // 不报告入口文件的未使用导出
  includeEntryExports: false,
  
  // 启用插件自动检测
  vite: true,
  eslint: true,
  typescript: true
};

export default config;
```

#### 3. 添加 NPM 脚本 (package.json)
```json
{
  "scripts": {
    "knip": "mv CLAUDE.md /tmp/CLAUDE_temp.md 2>/dev/null || true && knip && mv /tmp/CLAUDE_temp.md CLAUDE.md 2>/dev/null || true",
    "knip:files": "mv CLAUDE.md /tmp/CLAUDE_temp.md 2>/dev/null || true && knip --files && mv /tmp/CLAUDE_temp.md CLAUDE.md 2>/dev/null || true",
    "knip:deps": "mv CLAUDE.md /tmp/CLAUDE_temp.md 2>/dev/null || true && knip --dependencies && mv /tmp/CLAUDE_temp.md CLAUDE.md 2>/dev/null || true"
  }
}
```

> **注意**: 临时移动 CLAUDE.md 是为了解决 Knip 的路径解析 bug

#### 4. 分析和验证流程

##### 4.1 运行初始分析
```bash
npm run knip:files    # 检查未使用文件
npm run knip:deps     # 检查未使用依赖
npm run knip          # 完整分析
```

##### 4.2 创建验证脚本 (scripts/analyze-unused-files.js)
```javascript
#!/usr/bin/env node

// 验证 Knip 结果准确性的脚本
// 因为 Knip 在复杂项目中准确率较低（约30%）

import fs from 'fs';
import { execSync } from 'child_process';

function isFileReferenced(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // 搜索多种可能的导入模式
  const patterns = [
    filePath.replace('src/', ''),
    fileName,
    `from './${fileName}'`,
    `from '../${fileName}'`
  ];
  
  for (const pattern of patterns) {
    try {
      const result = execSync(
        `grep -r "${pattern}" src/ --include="*.tsx" --include="*.ts" --exclude="${filePath}" 2>/dev/null || true`,
        { encoding: 'utf8' }
      );
      
      if (result.trim()) {
        return { referenced: true, matches: result.trim().split('\n').slice(0, 3) };
      }
    } catch (e) {
      continue;
    }
  }
  
  return { referenced: false };
}

// 主验证逻辑
// 详细实现见项目中的实际脚本
```

##### 4.3 创建安全的清理环境
```bash
# 创建独立的工作树进行清理
git checkout -b feature/cleanup-unused-files
git checkout main
git worktree add ../project-cleanup feature/cleanup-unused-files
```

#### 5. 执行清理

##### 5.1 删除未使用文件
```bash
#!/bin/bash
# scripts/delete-unused-files.sh

# 基于验证结果的文件列表
UNUSED_FILES=(
  "src/components/unused-component.tsx"
  "src/utils/unused-util.ts"
  # ... 经过验证的未使用文件
)

for file in "${UNUSED_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "🗑️ 删除: $file"
    rm "$file"
  fi
done

# 清理空目录
find src -type d -empty -delete 2>/dev/null || true
```

##### 5.2 清理未使用依赖
```bash
#!/bin/bash
# scripts/cleanup-dependencies.sh

UNUSED_DEPS=(
  "@headlessui/react"
  "axios"
  "date-fns"
  # ... 经过验证的未使用依赖
)

for dep in "${UNUSED_DEPS[@]}"; do
  npm uninstall "$dep"
done
```

#### 6. 验证和提交

##### 6.1 运行完整测试
```bash
# 类型检查
npm run type-check

# 构建测试
npm run build

# 单元测试（如果有）
npm test
```

##### 6.2 提交清理结果
```bash
git add .
git commit -m "feat: 清理未使用的文件和依赖

基于 Knip 分析和手工验证：
- 删除 N 个未使用文件
- 清理 M 个未使用依赖项
- 减少 X 行代码

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### 7. 重要注意事项

##### 7.1 Knip 局限性
- **准确率问题**: 复杂项目中误报率可达 70%
- **动态导入**: 无法检测运行时动态导入
- **类型依赖**: 可能错误标记类型文件为未使用
- **重导出链**: 复杂的 index.ts 重导出容易误报

##### 7.2 手工验证必要性
- **关键文件**: 手工检查所有"未使用"的核心文件
- **导入搜索**: 使用 grep 搜索多种导入模式
- **类型引用**: 特别注意 TypeScript 类型的使用
- **配置文件**: 检查配置文件中的引用

##### 7.3 安全实践
- **独立分支**: 始终在独立分支进行清理
- **备份重要**: 保留 package.json 备份
- **渐进式**: 分批次清理，不要一次性删除所有文件
- **测试验证**: 每次清理后运行完整测试

#### 8. 持续集成建议

##### 8.1 CI/CD 集成
```yaml
# .github/workflows/knip-check.yml
name: Code Cleanliness Check
on: [pull_request]
jobs:
  knip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run knip:deps --silent
```

##### 8.2 定期清理
- **频率**: 建议每月运行一次 Knip 分析
- **监控**: 跟踪代码库大小和依赖数量变化
- **团队**: 培训团队了解死代码的危害

### 清理效果示例

根据实际项目经验：
- **文件清理**: 53个文件，15,568行代码
- **依赖清理**: 12个未使用依赖项
- **性能提升**: 构建速度提升约15%
- **包体积**: 减少约8MB依赖大小
- don't run flutter build apk
- 不要使用flutter analyze进行代码检查,使用专业工具dead_code_analyzer
- 全局状态总线模块，位于：/Users/xumingyang/app/invoice-assistant-v2/flutter_app/lib/co
  re/events/app_event_bus.dart

  全局状态总线模块概览：

  1. 核心组件：
    - AppEventBus - 单例模式的事件总线
    - AppEvent - 事件基类
    - 各种具体事件类型
  2. 主要事件类型：
    - 报销集事件：ReimbursementSetCreatedEvent, ReimbursementSetDeletedEvent,
  InvoicesAddedToSetEvent, InvoicesRemovedFromSetEvent
    - 发票事件：InvoiceStatusChangedEvent, InvoiceDeletedEvent, InvoiceCreatedEvent
    - 状态同步事件：ReimbursementSetStatusChangedEvent, InvoiceStatusSyncedEvent
    - 应用生命周期事件：AppResumedEvent, TabChangedEvent, DataRefreshRequestedEvent
  3. 使用位置：
    - ReimbursementSetBloc - 发送报销集相关事件
    - InvoiceBloc - 监听事件并刷新数据
    - 依赖注入容器中注册
    - 应用生命周期管理器中使用
  4. 功能特点：
    - 解耦不同Bloc之间的通信
    - 支持一对多和多对多通信
    - 类型安全的事件过滤
    - 完整的文档和最佳实践指南
- flutter 架构中的重要体系:Cupertino组件体系,FlexColorScheme主题管理,状态总线架构