# 发票类型专有信息展示功能

## 概述

本功能实现了在发票详情模态框中展示不同类别发票的专有重要信息，如火车票的发车时间、车次、座位级别等。通过模块化设计，支持多种发票类型的扩展。

## 功能特性

### 1. 支持的发票类型

- **火车票** (TRAIN)
  - 发车时间、到达时间
  - 车次、座位级别、座位号
  - 出发站、到达站、里程

- **机票** (FLIGHT)
  - 航班号、航空公司
  - 起飞时间、降落时间
  - 座位号、舱位等级
  - 出发机场、到达机场

- **出租车票** (TAXI)
  - 上车时间、下车时间
  - 里程、单价
  - 等待费、车牌号

- **酒店发票** (HOTEL)
  - 入住日期、离店日期
  - 房型、房间号
  - 住宿晚数、日均房价

### 2. 视觉设计

- 每种发票类型都有专属图标和颜色主题
- 使用 DaisyUI 的 badge 组件展示发票类型
- 在列表和详情页面均有类型标识
- 专有信息采用网格布局，响应式设计

### 3. 技术实现

#### 类型定义 (`src/types/index.ts`)
```typescript
// 发票类型枚举
export enum InvoiceType {
  GENERAL = 'general',
  VAT = 'vat',
  TRAIN = 'train',
  FLIGHT = 'flight',
  TAXI = 'taxi',
  HOTEL = 'hotel',
  // ...
}

// 火车票专有信息接口
export interface TrainInvoiceDetails {
  departure_time: string
  arrival_time: string
  train_number: string
  // ...
}
```

#### 组件结构
```
src/components/invoice/details/
├── InvoiceTypeDetails.tsx      # 主组件，根据类型分发
├── TrainInvoiceDetails.tsx     # 火车票详情组件
├── FlightInvoiceDetails.tsx    # 机票详情组件
├── TaxiInvoiceDetails.tsx      # 出租车票详情组件
└── HotelInvoiceDetails.tsx     # 酒店发票详情组件
```

## 使用方式

### 1. 在发票详情模态框中使用

```tsx
import InvoiceTypeDetails from '../details/InvoiceTypeDetails';

// 在发票基本信息后添加
<InvoiceTypeDetails invoice={invoice} />
```

### 2. 在发票列表中显示类型

```tsx
import { getInvoiceTypeName, getInvoiceTypeIcon } from '../components/invoice/details/InvoiceTypeDetails';

// 在发票号码旁显示类型标签
{invoice.invoice_type && (
  <span className="badge badge-sm badge-ghost">
    {getInvoiceTypeIcon(invoice.invoice_type)} {getInvoiceTypeName(invoice.invoice_type)}
  </span>
)}
```

## 扩展指南

### 添加新的发票类型

1. **更新类型定义**
   ```typescript
   // 在 InvoiceType 枚举中添加
   export enum InvoiceType {
     // ...
     BUS = 'bus',  // 汽车票
   }
   
   // 定义专有信息接口
   export interface BusInvoiceDetails {
     departure_time: string
     bus_number: string
     // ...
   }
   ```

2. **创建详情组件**
   ```tsx
   // src/components/invoice/details/BusInvoiceDetails.tsx
   export const BusInvoiceDetailsComponent: React.FC<Props> = ({ details }) => {
     // 实现组件
   }
   ```

3. **注册到主组件**
   ```tsx
   // 在 InvoiceTypeDetails.tsx 中添加 case
   case InvoiceType.BUS:
     return invoice.bus_details ? (
       <BusInvoiceDetailsComponent details={invoice.bus_details} />
     ) : null;
   ```

## 数据结构示例

### 后端实际数据结构
发票专有信息存储在 `extracted_data` JSONB 字段中：

```json
{
  "id": "123",
  "invoice_number": "INV001",
  "invoice_type": "火车电子客票",
  "seller_name": "中国铁路",
  "extracted_data": {
    "structured_data": {
      "main_info": {
        "invoice_number": "INV001",
        "invoice_type": "火车电子客票"
      },
      "type_specific_data": {
        "train_number": "G1234",
        "departure_station": "北京南",
        "arrival_station": "上海虹桥",
        "departure_time": "2024-01-07T08:00:00",
        "arrival_time": "2024-01-07T12:30:00",
        "seat_class": "二等座",
        "seat_number": "12车15A号"
      }
    }
  }
}
```

### 前端数据读取方式
前端组件从 `extracted_data` 中智能提取专有信息：

```typescript
// InvoiceTypeDetails.tsx
const extractedData = invoice.extracted_data || {};
const structuredData = extractedData.structured_data || {};
const typeSpecificData = structuredData.type_specific_data || {};

// 多级查找，兼容不同的数据结构
const trainDetails = {
  train_number: typeSpecificData.train_number || extractedData.train_number,
  departure_station: typeSpecificData.departure_station || extractedData.departure_station,
  // ...
};
```

## UI/UX 特点

1. **统一的视觉语言**
   - 使用 Lucide 图标保持一致性
   - DaisyUI 主题色彩系统
   - 响应式网格布局

2. **信息层级**
   - 基本信息在上，专有信息在下
   - 使用分隔线区分不同信息块
   - 重要信息使用不同颜色高亮

3. **用户体验**
   - 行程摘要卡片快速预览
   - 时间计算（如出租车行程时长）
   - 友好的数据格式化

## 注意事项

1. **数据兼容性**
   - 所有专有信息字段都是可选的
   - 缺少专有信息时不显示该部分
   - 优雅处理数据缺失情况

2. **性能考虑**
   - 组件按需加载
   - 避免不必要的重渲染
   - 使用 React.memo 优化性能

3. **可维护性**
   - 模块化设计便于扩展
   - 统一的命名规范
   - 完整的 TypeScript 类型支持