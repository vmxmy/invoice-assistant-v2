# Styles

这个目录用于存放全局样式文件。

## 样式组织建议

- 分离全局样式和组件样式
- 使用CSS模块或Styled Components
- 示例：
  ```
  styles/
  ├── index.css         # 全局样式入口
  ├── globals.css       # 全局样式定义
  ├── variables.css     # CSS变量定义
  ├── mixins.css        # CSS混合器
  └── themes/           # 主题文件
      ├── light.css
      └── dark.css
  ```

## 示例用法

```css
/* variables.css */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  
  --border-radius: 0.375rem;
  --box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

/* globals.css */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```