# Pages

这个目录用于存放页面组件，通常对应路由。

## 页面结构建议

- 每个页面应该有自己的文件夹
- 包含页面组件和相关子组件
- 示例：
  ```
  pages/
  ├── Dashboard/
  │   ├── Dashboard.tsx
  │   ├── Dashboard.module.css
  │   └── index.ts
  ├── InvoiceList/
  │   ├── InvoiceList.tsx
  │   ├── InvoiceList.module.css
  │   └── index.ts
  └── InvoiceDetail/
      ├── InvoiceDetail.tsx
      ├── InvoiceDetail.module.css
      └── index.ts
  ```