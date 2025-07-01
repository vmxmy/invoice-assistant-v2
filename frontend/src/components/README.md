# Components

这个目录用于存放可复用的React组件。

## 组织结构建议

- 每个组件应该有自己的文件夹
- 包含组件文件、样式文件和类型定义
- 示例：
  ```
  components/
  ├── Button/
  │   ├── Button.tsx
  │   ├── Button.module.css
  │   └── index.ts
  └── InvoiceCard/
      ├── InvoiceCard.tsx
      ├── InvoiceCard.module.css
      └── index.ts
  ```