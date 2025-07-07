# DaisyUI 5.0.43 组件使用指南

> 本指南详细介绍如何在发票管理系统中使用 DaisyUI 5.0.43 的最新组件和功能。

## 目录

1. [DaisyUI 5.0 新特性](#daisyui-50-新特性)
2. [核心组件使用](#核心组件使用)
3. [表单组件](#表单组件)
4. [数据展示组件](#数据展示组件)
5. [反馈组件](#反馈组件)
6. [布局组件](#布局组件)
7. [主题系统](#主题系统)
8. [响应式工具类](#响应式工具类)
9. [最佳实践](#最佳实践)

## DaisyUI 5.0 新特性

### 1. 原生 Dialog 支持
DaisyUI 5.0 完全支持 HTML5 的 `<dialog>` 元素，提供更好的无障碍访问性。

```tsx
// ✅ 推荐：使用原生 dialog
<dialog id="my-modal" className="modal">
  <div className="modal-box">
    <form method="dialog">
      <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
    </form>
    <h3 className="font-bold text-lg">标题</h3>
    <p className="py-4">内容</p>
  </div>
  <form method="dialog" className="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

// 控制模态框
const modal = document.getElementById('my-modal') as HTMLDialogElement;
modal.showModal(); // 打开
modal.close();     // 关闭
```

### 2. 新增组件变体
- **按钮新变体**: `btn-outline` 配合颜色类使用
- **卡片新样式**: `card-bordered`, `card-compact`
- **输入框状态**: `input-success`, `input-warning`

### 3. 改进的响应式类
- 所有组件都支持响应式前缀
- 新增 `2xl` 断点支持
- 更灵活的间距控制

## 核心组件使用

### Modal（模态框）

#### 基础模态框
```tsx
interface ModalProps {
  id: string;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ id, title, children, actions }) => {
  return (
    <dialog id={id} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </form>
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4">{children}</div>
        {actions && <div className="modal-action">{actions}</div>}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

// 使用 Hook 控制模态框
export const useModal = (modalId: string) => {
  const openModal = () => {
    const modal = document.getElementById(modalId) as HTMLDialogElement;
    modal?.showModal();
  };

  const closeModal = () => {
    const modal = document.getElementById(modalId) as HTMLDialogElement;
    modal?.close();
  };

  return { openModal, closeModal };
};
```

#### 发票详情模态框示例
```tsx
export const InvoiceDetailModal: React.FC<{ invoiceId: string }> = ({ invoiceId }) => {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-full"></div>
        <div className="skeleton h-4 w-3/4"></div>
      </div>
    );
  }

  return (
    <dialog id="invoice-detail-modal" className="modal">
      <div className="modal-box max-w-3xl">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </form>
        
        <h3 className="font-bold text-lg mb-4">发票详情</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">发票号码</span>
            </label>
            <input 
              type="text" 
              value={invoice?.invoice_number} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
          {/* 更多字段... */}
        </div>
        
        <div className="modal-action">
          <form method="dialog">
            <button className="btn">关闭</button>
          </form>
          <button className="btn btn-primary">编辑</button>
        </div>
      </div>
    </dialog>
  );
};
```

### Drawer（抽屉）

#### 高级搜索抽屉
```tsx
export const AdvancedSearchDrawer: React.FC = () => {
  return (
    <div className="drawer drawer-end">
      <input id="search-drawer" type="checkbox" className="drawer-toggle" />
      
      <div className="drawer-content">
        {/* 页面主要内容 */}
      </div>
      
      <div className="drawer-side z-50">
        <label htmlFor="search-drawer" className="drawer-overlay"></label>
        
        <div className="p-4 w-80 min-h-full bg-base-200 text-base-content">
          <h3 className="text-lg font-bold mb-4">高级搜索</h3>
          
          {/* 搜索表单 */}
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">发票号码</span>
              </label>
              <input type="text" className="input input-bordered w-full" />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">销售方名称</span>
              </label>
              <input type="text" className="input input-bordered w-full" />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">金额范围</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="最小" 
                  className="input input-bordered w-full" 
                />
                <span className="self-center">-</span>
                <input 
                  type="number" 
                  placeholder="最大" 
                  className="input input-bordered w-full" 
                />
              </div>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">日期范围</span>
              </label>
              <div className="flex gap-2">
                <input type="date" className="input input-bordered w-full" />
                <span className="self-center">-</span>
                <input type="date" className="input input-bordered w-full" />
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-2">
            <button className="btn btn-primary flex-1">搜索</button>
            <button className="btn btn-ghost flex-1">重置</button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 表单组件

### 输入框组件
```tsx
interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required,
  placeholder
}) => {
  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text">{label}</span>
        {required && <span className="label-text-alt text-error">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
        required={required}
      />
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
};
```

### 选择框组件
```tsx
interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: string;
  required?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required
}) => {
  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text">{label}</span>
        {required && <span className="label-text-alt text-error">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`select select-bordered w-full ${error ? 'select-error' : ''}`}
        required={required}
      >
        <option value="">请选择</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
};
```

### 复选框组
```tsx
interface CheckboxOption {
  value: string;
  label: string;
}

interface FormCheckboxGroupProps {
  label: string;
  name: string;
  options: CheckboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
}

export const FormCheckboxGroup: React.FC<FormCheckboxGroupProps> = ({
  label,
  name,
  options,
  values,
  onChange
}) => {
  const handleChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...values, value]);
    } else {
      onChange(values.filter(v => v !== value));
    }
  };

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      <div className="space-y-2">
        {options.map(option => (
          <label key={option.value} className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={values.includes(option.value)}
              onChange={(e) => handleChange(option.value, e.target.checked)}
              className="checkbox checkbox-primary"
            />
            <span className="label-text">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
```

## 数据展示组件

### 表格组件
```tsx
interface TableColumn<T> {
  key: string;
  title: string;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (record: T) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  onRowClick
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key} style={{ width: column.width }}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(record => (
            <tr
              key={record.id}
              className={onRowClick ? "hover cursor-pointer" : ""}
              onClick={() => onRowClick?.(record)}
            >
              {columns.map(column => (
                <td key={column.key}>
                  {column.render
                    ? column.render(record[column.key as keyof T], record)
                    : String(record[column.key as keyof T])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 统计卡片
```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'primary'
}) => {
  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error'
  };

  return (
    <div className="stat bg-base-100 shadow rounded-lg">
      <div className="stat-figure text-primary">
        {icon}
      </div>
      <div className="stat-title">{title}</div>
      <div className={`stat-value ${colorClasses[color]}`}>{value}</div>
      {trend && (
        <div className="stat-desc">
          <span className={trend.isUp ? 'text-success' : 'text-error'}>
            {trend.isUp ? '↗︎' : '↘︎'} {Math.abs(trend.value)}%
          </span>
        </div>
      )}
    </div>
  );
};
```

## 反馈组件

### Toast 通知
```tsx
import toast, { Toaster } from 'react-hot-toast';

// 配置 Toast
export const ToasterConfig = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 3000,
      style: {
        background: 'hsl(var(--b1))',
        color: 'hsl(var(--bc))',
        border: '1px solid hsl(var(--b3))',
      },
    }}
  />
);

// 通知函数
export const notify = {
  success: (message: string) => {
    toast.custom((t) => (
      <div className={`alert alert-success ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{message}</span>
      </div>
    ));
  },
  
  error: (message: string) => {
    toast.custom((t) => (
      <div className={`alert alert-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{message}</span>
      </div>
    ));
  },
  
  info: (message: string) => {
    toast.custom((t) => (
      <div className={`alert alert-info ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>{message}</span>
      </div>
    ));
  },
  
  warning: (message: string) => {
    toast.custom((t) => (
      <div className={`alert alert-warning ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{message}</span>
      </div>
    ));
  }
};
```

### 加载指示器
```tsx
interface LoadingProps {
  fullScreen?: boolean;
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  fullScreen = false, 
  text = "加载中..." 
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="text-base-content/60">{text}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-base-100/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
};
```

### 空状态
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && (
        <div className="text-base-content/20 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-base-content/60 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-base-content/40 mb-4 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <button 
          className="btn btn-primary"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
```

## 布局组件

### 页面布局
```tsx
interface PageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  actions,
  children
}) => {
  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* 页面头部 */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-base-content">{title}</h1>
            {subtitle && (
              <p className="text-base-content/60 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="mt-4 sm:mt-0 flex gap-2">
              {actions}
            </div>
          )}
        </div>
        
        {/* 页面内容 */}
        <div>{children}</div>
      </div>
    </div>
  );
};
```

### 卡片布局
```tsx
interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = ""
}) => {
  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        {(title || actions) && (
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && <h2 className="card-title">{title}</h2>}
              {subtitle && (
                <p className="text-sm text-base-content/60 mt-1">{subtitle}</p>
              )}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
```

## 主题系统

### 主题配置
```tsx
// tailwind.config.js
module.exports = {
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "#3b82f6",
          secondary: "#8b5cf6",
          accent: "#f59e0b",
          neutral: "#374151",
          "base-100": "#ffffff",
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#60a5fa",
          secondary: "#a78bfa",
          accent: "#fbbf24",
          neutral: "#1f2937",
          "base-100": "#111827",
        },
      },
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
    ],
  },
};
```

### 主题切换器
```tsx
export const ThemeSwitcher: React.FC = () => {
  const themes = [
    "light", "dark", "cupcake", "bumblebee", "emerald", 
    "corporate", "synthwave", "retro", "cyberpunk"
  ];
  
  const [currentTheme, setCurrentTheme] = useState("light");
  
  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  };
  
  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-circle">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </label>
      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
        {themes.map(theme => (
          <li key={theme}>
            <a 
              className={currentTheme === theme ? "active" : ""}
              onClick={() => handleThemeChange(theme)}
            >
              {theme}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

## 响应式工具类

### 断点系统
```css
/* DaisyUI 5.0 响应式断点 */
sm: 640px   /* 手机横屏、小平板 */
md: 768px   /* 平板竖屏 */
lg: 1024px  /* 平板横屏、小笔记本 */
xl: 1280px  /* 桌面显示器 */
2xl: 1536px /* 大屏显示器 */
```

### 响应式示例
```tsx
// 响应式网格
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* 内容 */}
</div>

// 响应式间距
<div className="p-4 sm:p-6 lg:p-8">
  {/* 内容 */}
</div>

// 响应式文字
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
  标题
</h1>

// 响应式显示/隐藏
<div className="hidden sm:block">
  {/* 仅在 sm 及以上显示 */}
</div>

<div className="block sm:hidden">
  {/* 仅在移动端显示 */}
</div>

// 响应式 Flex
<div className="flex flex-col sm:flex-row gap-4">
  {/* 移动端垂直排列，桌面端水平排列 */}
</div>
```

### 移动端优化
```tsx
// 移动端友好的模态框
<dialog className="modal modal-bottom sm:modal-middle">
  {/* 移动端从底部滑出，桌面端居中显示 */}
</dialog>

// 移动端友好的按钮
<button className="btn btn-sm sm:btn-md">
  {/* 移动端小尺寸，桌面端中等尺寸 */}
</button>

// 移动端友好的表单
<div className="form-control w-full">
  <input 
    type="text" 
    className="input input-bordered input-md sm:input-lg"
  />
</div>
```

## 最佳实践

### 1. 组件组合
```tsx
// ✅ 好的做法：组合小组件
const InvoiceCard = ({ invoice }) => (
  <Card>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-bold">{invoice.number}</h3>
        <p className="text-sm text-base-content/60">{invoice.seller}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-primary">
          ¥{invoice.amount}
        </p>
        <p className="text-sm text-base-content/60">
          {invoice.date}
        </p>
      </div>
    </div>
  </Card>
);

// ❌ 避免：过度嵌套
const BadCard = ({ invoice }) => (
  <div className="card">
    <div className="card-body">
      <div className="flex">
        <div className="flex-1">
          <div className="mb-2">
            <div className="font-bold">
              {/* 过度嵌套 */}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
```

### 2. 样式组合
```tsx
// ✅ 好的做法：使用 clsx 管理条件样式
import clsx from 'clsx';

const Button = ({ variant, size, disabled, children }) => {
  const className = clsx(
    'btn',
    {
      'btn-primary': variant === 'primary',
      'btn-secondary': variant === 'secondary',
      'btn-sm': size === 'small',
      'btn-lg': size === 'large',
      'btn-disabled': disabled,
    }
  );
  
  return <button className={className}>{children}</button>;
};

// ❌ 避免：字符串拼接
const BadButton = ({ variant, size }) => {
  const className = `btn btn-${variant} btn-${size}`;
  return <button className={className}>Click</button>;
};
```

### 3. 无障碍访问
```tsx
// ✅ 好的做法：添加 ARIA 标签
<button 
  className="btn btn-circle btn-ghost"
  aria-label="关闭模态框"
>
  ✕
</button>

<input
  type="text"
  className="input input-bordered"
  aria-label="发票号码"
  aria-invalid={!!error}
  aria-describedby={error ? "invoice-error" : undefined}
/>

// ✅ 好的做法：键盘导航支持
const Modal = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

### 4. 性能优化
```tsx
// ✅ 好的做法：懒加载大组件
const InvoiceChart = lazy(() => import('./InvoiceChart'));

// ✅ 好的做法：使用 memo 优化渲染
const InvoiceRow = memo(({ invoice, onSelect }) => {
  return (
    <tr>
      <td>{invoice.number}</td>
      <td>{invoice.amount}</td>
    </tr>
  );
});

// ✅ 好的做法：虚拟化长列表
import { FixedSizeList } from 'react-window';

const VirtualInvoiceList = ({ invoices }) => (
  <FixedSizeList
    height={600}
    itemCount={invoices.length}
    itemSize={64}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style} className="border-b border-base-300">
        <InvoiceRow invoice={invoices[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

### 5. 错误处理
```tsx
// ✅ 好的做法：优雅的错误边界
class ErrorBoundary extends Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>出现了一些问题，请刷新页面重试</span>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## 总结

DaisyUI 5.0.43 提供了丰富的组件和工具类，通过合理使用这些组件，可以快速构建美观、响应式的用户界面。关键要点：

1. **充分利用原生功能**：如 `<dialog>` 元素
2. **保持一致性**：使用 DaisyUI 的设计系统
3. **注重无障碍**：添加适当的 ARIA 标签
4. **响应式优先**：使用响应式工具类
5. **性能意识**：适时使用懒加载和虚拟化

遵循这些最佳实践，可以构建出高质量的发票管理系统前端界面。