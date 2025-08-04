# Frontend 服务层问题分析与优化方案

## 执行摘要

经过深度分析，发现 Frontend 服务层存在严重的架构问题、性能瓶颈和安全隐患。主要问题包括静态类反模式、代码复杂度过高、localStorage 滥用、内存泄漏风险、事务完整性缺失等。本文档提供了详细的问题分析和分阶段的优化方案。

## 一、核心问题清单

### 🔴 严重问题（Critical）

1. **事务完整性缺失**
   - 位置：`supabaseDataService.ts:deleteInvoice`
   - 影响：数据不一致风险
   - 示例：删除发票涉及多个操作但无事务保证

2. **localStorage 滥用**
   - 位置：多处使用 localStorage 存储大量数据
   - 影响：存储溢出、性能下降
   - 问题：无容量限制、无过期机制、同步阻塞

3. **敏感信息泄露**
   - 位置：全局 console.log
   - 影响：生产环境暴露 token、用户 ID
   - 示例：`console.log('token:', session.access_token)`

### 🟠 高优先级问题（High）

1. **静态类反模式**
   ```typescript
   // 现状：所有服务使用静态方法
   export class InvoiceService {
     static async getInvoices(...) { }
   }
   ```
   - 问题：无法进行依赖注入、难以测试、无法管理生命周期

2. **代码复杂度失控**
   - `edgeFunctionOCR.ts:convertOcrDedupResponseToEdgeFormat` 超过 300 行
   - 违反单一职责原则
   - 难以维护和测试

3. **内存泄漏风险**
   - 文件处理多次 arrayBuffer() 转换
   - 大文件无流式处理
   - React 组件未清理订阅

4. **认证机制缺陷**
   - 硬编码 fallback userId：`'bd9a6722-a781-4f0b-8856-c6c5e261cbd0'`
   - 使用 `'current-user'` 字符串作为占位符
   - 缺少 token 刷新机制

### 🟡 中优先级问题（Medium）

1. **缺少抽象层**
   - 无统一 HTTP 客户端
   - 缺少 Repository 模式
   - 服务直接操作 Supabase

2. **配置管理僵化**
   - 配置从 JSON 文件静态加载
   - 环境变量分散
   - 无法动态更新

3. **性能优化缺失**
   - 无请求去重和合并
   - 缺少缓存策略
   - React 渲染未优化

4. **代码重复严重**
   - 错误处理模板化重复
   - 火车票/普通发票处理逻辑重复
   - OCR 字段映射大量重复代码

## 二、详细问题分析

### 2.1 架构问题

#### 静态类和单例模式的问题

**现状代码：**
```typescript
// 所有服务都使用静态方法
export class InvoiceService {
  static async getInvoices(userId: string, page: number) {
    // 直接导入和使用 supabase
    const { data, error } = await supabase.from('invoices').select()
  }
}

// 单例模式但构造函数可能抛异常
export class EdgeFunctionOCRService {
  constructor() {
    if (!this.supabaseUrl) {
      throw new Error('Missing configuration')
    }
  }
}
export const edgeFunctionOCR = new EdgeFunctionOCRService()
```

**问题：**
- 无法进行依赖注入
- 难以进行单元测试（无法 Mock）
- 无法支持多租户场景
- 服务生命周期无法管理

#### 缺少分层架构

**现状：**
- 组件直接调用服务静态方法
- 服务直接操作 Supabase
- 业务逻辑与数据访问耦合

**影响：**
- 难以更换数据源
- 业务逻辑难以复用
- 测试需要真实数据库

### 2.2 性能问题

#### localStorage 性能问题

**问题代码：**
```typescript
// 无限制存储
localStorage.setItem(configKey, JSON.stringify(newConfig))

// 频繁读写
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  // 遍历所有 key
}

// 大数据存储
localStorage.setItem('invoiceTableState', JSON.stringify(state))
```

**影响：**
- 存储可能超过 5-10MB 限制
- 同步操作阻塞主线程
- 序列化/反序列化开销大

#### 文件处理效率低

**问题代码：**
```typescript
// 多次转换，浪费内存
const fileBuffer = await file.arrayBuffer()  // 第一次
const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)

// FormData 中又添加了文件
formData.append('file', file)  // 文件被复制
```

#### 缺少请求优化

**现状：**
- 无请求去重机制
- 无请求合并
- 60 秒超时过长
- 缺少缓存策略

### 2.3 安全问题

#### 敏感信息暴露

**问题代码：**
```typescript
console.log('🚀 [DEBUG] 发送Edge Function请求', {
  token: session?.access_token ? session.access_token.substring(0, 20) + '...' : 'none'
})

logger.log('📡 [EdgeFunctionOCR] 发起Edge Function请求', {
  userId: session?.user?.id,
  fileHash: fileHash.substring(0, 16) + '...'
})
```

#### 输入验证缺失

**现状：**
- 文件上传无统一验证
- SQL 参数清理不充分
- HTML 内容 XSS 风险

#### 认证处理不当

**问题代码：**
```typescript
// 硬编码 fallback
return user?.id || 'bd9a6722-a781-4f0b-8856-c6c5e261cbd0'

// 字符串占位符
const result = await InvoiceService.getInvoices('current-user', page)
```

### 2.4 代码质量问题

#### 方法复杂度过高

**convertOcrDedupResponseToEdgeFormat 方法分析：**
- 总行数：300+
- 圈复杂度：>20
- 嵌套深度：5 层
- 职责：字段映射、类型转换、数据修复

#### 代码重复

**重复模式示例：**
```typescript
// 每个服务方法都有相似的错误处理
try {
  // 业务逻辑
  return { data, error: null }
} catch (error) {
  console.error('操作失败:', error)
  return {
    data: null,
    error: error instanceof Error ? error.message : '未知错误'
  }
}
```

## 三、优化方案

### 3.1 立即修复（P0 - 1周内）

#### 1. 移除敏感日志

```typescript
// 使用环境变量控制日志
const logger = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const sanitized = sanitizeLogData(data)
      console.log(message, sanitized)
    }
  }
}

function sanitizeLogData(data: any) {
  const sensitive = ['token', 'password', 'access_token', 'refresh_token']
  // 递归清理敏感字段
  return cleanSensitiveFields(data, sensitive)
}
```

#### 2. 修复事务完整性

```typescript
async function deleteInvoiceWithTransaction(invoiceId: string, userId: string) {
  const { data, error } = await supabase.rpc('delete_invoice_transaction', {
    invoice_id: invoiceId,
    user_id: userId
  })
  
  if (error) {
    // 实现补偿机制
    await this.compensateDelete(invoiceId, userId)
    throw new AppError('DELETE_FAILED', error.message)
  }
  
  return data
}
```

#### 3. localStorage 容量管理

```typescript
class SafeStorage {
  private maxSize = 5 * 1024 * 1024 // 5MB
  private cache = new Map<string, { value: any, expires: number }>()
  
  setItem(key: string, value: any, ttl = 3600000) {
    const size = this.calculateSize()
    if (size > this.maxSize) {
      this.evictOldest()
    }
    
    const expires = Date.now() + ttl
    this.cache.set(key, { value, expires })
    
    // 异步写入 IndexedDB
    this.persistToIndexedDB(key, value, expires)
  }
  
  getItem(key: string) {
    const cached = this.cache.get(key)
    if (cached && cached.expires > Date.now()) {
      return cached.value
    }
    
    // 从 IndexedDB 读取
    return this.loadFromIndexedDB(key)
  }
}
```

### 3.2 架构重构（P1 - 2-4周）

#### 1. 依赖注入模式

```typescript
// 定义接口
interface IInvoiceService {
  getInvoices(userId: string, filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>>
  createInvoice(invoice: CreateInvoiceDto): Promise<Invoice>
  updateInvoice(id: string, updates: UpdateInvoiceDto): Promise<Invoice>
  deleteInvoice(id: string): Promise<void>
}

// 实现类
class InvoiceService implements IInvoiceService {
  constructor(
    private readonly repository: IInvoiceRepository,
    private readonly logger: ILogger,
    private readonly cache: ICache,
    private readonly eventBus: IEventBus
  ) {}
  
  async createInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
    this.logger.log('Creating invoice', { dto })
    
    const invoice = await this.repository.create(dto)
    
    // 发布事件
    await this.eventBus.publish('invoice.created', invoice)
    
    // 更新缓存
    await this.cache.set(`invoice:${invoice.id}`, invoice)
    
    return invoice
  }
}

// 依赖注入容器
class DIContainer {
  private services = new Map<string, any>()
  
  register<T>(token: string, factory: () => T) {
    this.services.set(token, factory())
  }
  
  get<T>(token: string): T {
    if (!this.services.has(token)) {
      throw new Error(`Service ${token} not found`)
    }
    return this.services.get(token)
  }
}

// 服务注册
const container = new DIContainer()
container.register('InvoiceService', () => new InvoiceService(
  container.get('InvoiceRepository'),
  container.get('Logger'),
  container.get('Cache'),
  container.get('EventBus')
))

// React Context
const ServiceContext = React.createContext<DIContainer>(container)

// 使用 Hook
function useInvoiceService() {
  const container = useContext(ServiceContext)
  return container.get<IInvoiceService>('InvoiceService')
}
```

#### 2. Repository 模式

```typescript
// Repository 接口
interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>
  findByUserId(userId: string, options?: QueryOptions): Promise<Invoice[]>
  create(data: CreateInvoiceData): Promise<Invoice>
  update(id: string, data: UpdateInvoiceData): Promise<Invoice>
  delete(id: string): Promise<void>
}

// Supabase 实现
class SupabaseInvoiceRepository implements IInvoiceRepository {
  constructor(private supabase: SupabaseClient) {}
  
  async findById(id: string): Promise<Invoice | null> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      throw new RepositoryError('FIND_BY_ID_FAILED', error)
    }
    
    return data ? this.mapToEntity(data) : null
  }
  
  private mapToEntity(data: any): Invoice {
    // 数据映射逻辑
    return new Invoice(data)
  }
}

// 业务逻辑层
class InvoiceUseCase {
  constructor(
    private repository: IInvoiceRepository,
    private ocrService: IOCRService,
    private validator: IInvoiceValidator
  ) {}
  
  async processInvoiceUpload(file: File, userId: string): Promise<Invoice> {
    // 1. OCR 处理
    const ocrResult = await this.ocrService.process(file)
    
    // 2. 数据验证
    const validationResult = await this.validator.validate(ocrResult)
    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors)
    }
    
    // 3. 创建发票
    const invoice = await this.repository.create({
      ...ocrResult.fields,
      user_id: userId,
      validation_status: 'valid'
    })
    
    return invoice
  }
}
```

#### 3. 策略模式处理发票类型

```typescript
// 策略接口
interface IInvoiceProcessor {
  canProcess(type: string): boolean
  extractFields(ocrData: any): InvoiceFields
  validate(fields: InvoiceFields): ValidationResult
  transform(fields: InvoiceFields): Invoice
}

// 具体策略
class TrainTicketProcessor implements IInvoiceProcessor {
  canProcess(type: string): boolean {
    return type === 'TRAIN_TICKET'
  }
  
  extractFields(ocrData: any): InvoiceFields {
    return {
      invoice_number: ocrData.electronic_ticket_number,
      invoice_date: ocrData.departure_time,
      total_amount: ocrData.fare,
      // 火车票特有字段
      train_number: ocrData.train_number,
      departure_station: ocrData.departure_station,
      arrival_station: ocrData.arrival_station,
      seat_type: ocrData.seat_type,
      passenger_name: ocrData.passenger_name
    }
  }
  
  validate(fields: InvoiceFields): ValidationResult {
    const errors = []
    
    if (!fields.train_number) {
      errors.push({ field: 'train_number', message: '车次号不能为空' })
    }
    
    if (!this.isValidTrainNumber(fields.train_number)) {
      errors.push({ field: 'train_number', message: '车次号格式无效' })
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  private isValidTrainNumber(number: string): boolean {
    return /^[GCDZTSPKXLY]\d{1,4}$/.test(number)
  }
}

class VATInvoiceProcessor implements IInvoiceProcessor {
  canProcess(type: string): boolean {
    return type === 'VAT_INVOICE'
  }
  
  extractFields(ocrData: any): InvoiceFields {
    return {
      invoice_number: ocrData.invoice_number,
      invoice_code: ocrData.invoice_code,
      invoice_date: ocrData.invoice_date,
      seller_name: ocrData.seller_name,
      seller_tax_number: ocrData.seller_tax_number,
      buyer_name: ocrData.buyer_name,
      buyer_tax_number: ocrData.buyer_tax_number,
      total_amount: ocrData.total_amount,
      tax_amount: ocrData.tax_amount,
      amount_without_tax: ocrData.amount_without_tax
    }
  }
  
  validate(fields: InvoiceFields): ValidationResult {
    // 增值税发票验证逻辑
    return this.validateVATInvoice(fields)
  }
}

// 处理器工厂
class InvoiceProcessorFactory {
  private processors: IInvoiceProcessor[] = [
    new TrainTicketProcessor(),
    new VATInvoiceProcessor(),
    new FlightTicketProcessor(),
    new TaxiTicketProcessor()
  ]
  
  getProcessor(type: string): IInvoiceProcessor {
    const processor = this.processors.find(p => p.canProcess(type))
    
    if (!processor) {
      throw new Error(`No processor found for type: ${type}`)
    }
    
    return processor
  }
}

// 使用
class OCRService {
  constructor(private processorFactory: InvoiceProcessorFactory) {}
  
  async processOCRResult(ocrData: any): Promise<Invoice> {
    const type = this.detectInvoiceType(ocrData)
    const processor = this.processorFactory.getProcessor(type)
    
    const fields = processor.extractFields(ocrData)
    const validation = processor.validate(fields)
    
    if (!validation.isValid) {
      throw new ValidationError(validation.errors)
    }
    
    return processor.transform(fields)
  }
}
```

### 3.3 性能优化（P1 - 2-3周）

#### 1. 实现请求中间件

```typescript
class ApiClient {
  private cache = new Map<string, CacheEntry>()
  private pending = new Map<string, Promise<any>>()
  private requestQueue = new RequestQueue()
  
  constructor(
    private baseURL: string,
    private timeout = 30000
  ) {}
  
  async request<T>(config: RequestConfig): Promise<T> {
    const key = this.generateKey(config)
    
    // 1. 检查是否有相同的请求正在进行
    if (this.pending.has(key)) {
      return this.pending.get(key)
    }
    
    // 2. 检查缓存
    const cached = this.getFromCache(key)
    if (cached) {
      return cached
    }
    
    // 3. 创建请求
    const promise = this.executeRequest<T>(config)
      .then(data => {
        this.saveToCache(key, data, config.cacheTTL)
        return data
      })
      .finally(() => {
        this.pending.delete(key)
      })
    
    this.pending.set(key, promise)
    
    return promise
  }
  
  private async executeRequest<T>(config: RequestConfig): Promise<T> {
    // 请求合并
    if (config.batchable) {
      return this.requestQueue.add(config)
    }
    
    // 添加超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)
    
    try {
      const response = await fetch(config.url, {
        ...config,
        signal: controller.signal
      })
      
      if (!response.ok) {
        throw new ApiError(response.status, await response.text())
      }
      
      return await response.json()
    } finally {
      clearTimeout(timeoutId)
    }
  }
  
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  private saveToCache(key: string, data: any, ttl = 60000) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    })
    
    // 限制缓存大小
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }
}

// 请求队列实现批量请求
class RequestQueue {
  private queue: RequestConfig[] = []
  private timer: NodeJS.Timeout | null = null
  
  add<T>(config: RequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        ...config,
        resolve,
        reject
      })
      
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), 10)
      }
    })
  }
  
  private async flush() {
    const batch = this.queue.splice(0, this.queue.length)
    this.timer = null
    
    if (batch.length === 0) return
    
    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        body: JSON.stringify(batch.map(b => ({
          url: b.url,
          method: b.method,
          body: b.body
        })))
      })
      
      const results = await response.json()
      
      batch.forEach((req, index) => {
        if (results[index].error) {
          req.reject(new Error(results[index].error))
        } else {
          req.resolve(results[index].data)
        }
      })
    } catch (error) {
      batch.forEach(req => req.reject(error))
    }
  }
}
```

#### 2. 文件处理优化

```typescript
class FileProcessor {
  async processLargeFile(file: File, options: ProcessOptions = {}) {
    const chunkSize = options.chunkSize || 1024 * 1024 // 1MB
    const stream = file.stream()
    const reader = stream.getReader()
    const hasher = new StreamHasher()
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        // 处理块
        hasher.update(value)
        
        // 进度回调
        if (options.onProgress) {
          options.onProgress({
            loaded: hasher.bytesProcessed,
            total: file.size
          })
        }
        
        // 允许中断
        if (options.signal?.aborted) {
          throw new Error('Processing aborted')
        }
      }
      
      return {
        hash: hasher.digest(),
        size: file.size
      }
    } finally {
      reader.releaseLock()
    }
  }
}

// SHA-256 流式计算
class StreamHasher {
  private chunks: Uint8Array[] = []
  public bytesProcessed = 0
  
  update(chunk: Uint8Array) {
    this.chunks.push(chunk)
    this.bytesProcessed += chunk.length
  }
  
  async digest(): Promise<string> {
    const blob = new Blob(this.chunks)
    const buffer = await blob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
}
```

#### 3. React 性能优化

```typescript
// 1. 使用 memo 优化组件
const InvoiceCard = memo(({ 
  invoice, 
  onSelect,
  onDelete 
}: InvoiceCardProps) => {
  const handleSelect = useCallback(() => {
    onSelect(invoice.id)
  }, [invoice.id, onSelect])
  
  const handleDelete = useCallback(() => {
    onDelete(invoice.id)
  }, [invoice.id, onDelete])
  
  return (
    <div className="invoice-card">
      <h3>{invoice.invoice_number}</h3>
      <p>{invoice.seller_name}</p>
      <button onClick={handleSelect}>查看</button>
      <button onClick={handleDelete}>删除</button>
    </div>
  )
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return (
    prevProps.invoice.id === nextProps.invoice.id &&
    prevProps.invoice.updated_at === nextProps.invoice.updated_at
  )
})

// 2. 虚拟列表优化大数据渲染
import { useVirtualizer } from '@tanstack/react-virtual'

function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: invoices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5
  })
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <InvoiceCard invoice={invoices[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}

// 3. 使用 useMemo 缓存计算结果
function InvoiceStats({ invoices }: { invoices: Invoice[] }) {
  const stats = useMemo(() => {
    return {
      total: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
      byType: groupBy(invoices, 'invoice_type'),
      byMonth: groupByMonth(invoices)
    }
  }, [invoices])
  
  return (
    <div className="stats">
      <div>总数：{stats.total}</div>
      <div>总金额：{stats.totalAmount}</div>
    </div>
  )
}
```

### 3.4 安全加固（P1 - 2周）

#### 1. 输入验证

```typescript
import { z } from 'zod'

// 定义验证模式
const InvoiceSchema = z.object({
  invoice_number: z.string()
    .min(1, '发票号码不能为空')
    .max(50, '发票号码不能超过50个字符')
    .regex(/^[A-Z0-9]+$/, '发票号码格式无效'),
  
  invoice_date: z.string()
    .datetime('日期格式无效'),
  
  total_amount: z.number()
    .positive('金额必须大于0')
    .max(999999999, '金额超出范围'),
  
  seller_name: z.string()
    .min(1, '销售方名称不能为空')
    .max(200, '销售方名称过长'),
  
  invoice_type: z.enum(['VAT_INVOICE', 'TRAIN_TICKET', 'FLIGHT_TICKET'])
})

// 文件验证
const FileSchema = z.object({
  name: z.string(),
  size: z.number().max(10 * 1024 * 1024, '文件不能超过10MB'),
  type: z.enum(['image/jpeg', 'image/png', 'application/pdf'])
})

// 验证函数
function validateInvoice(data: unknown): Invoice {
  try {
    return InvoiceSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      )
    }
    throw error
  }
}

// 在服务中使用
class InvoiceService {
  async createInvoice(data: unknown): Promise<Invoice> {
    // 1. 输入验证
    const validated = validateInvoice(data)
    
    // 2. 业务规则验证
    await this.validateBusinessRules(validated)
    
    // 3. 创建发票
    return this.repository.create(validated)
  }
  
  private async validateBusinessRules(invoice: Invoice) {
    // 检查重复
    const existing = await this.repository.findByNumber(invoice.invoice_number)
    if (existing) {
      throw new BusinessError('DUPLICATE_INVOICE', '发票号码已存在')
    }
    
    // 检查金额
    if (invoice.tax_amount && invoice.amount_without_tax) {
      const calculated = invoice.amount_without_tax + invoice.tax_amount
      if (Math.abs(calculated - invoice.total_amount) > 0.01) {
        throw new BusinessError('AMOUNT_MISMATCH', '金额计算不一致')
      }
    }
  }
}
```

#### 2. 安全存储

```typescript
class SecureStorage {
  private encryptionKey: CryptoKey | null = null
  
  async initialize() {
    // 生成或加载加密密钥
    this.encryptionKey = await this.getOrCreateKey()
  }
  
  private async getOrCreateKey(): Promise<CryptoKey> {
    // 尝试从 IndexedDB 加载密钥
    const stored = await this.loadKey()
    if (stored) return stored
    
    // 生成新密钥
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    
    // 保存密钥
    await this.saveKey(key)
    
    return key
  }
  
  async setItem(key: string, value: any): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('Storage not initialized')
    }
    
    const data = JSON.stringify(value)
    const encrypted = await this.encrypt(data)
    
    // 存储加密数据
    await this.store(key, encrypted)
  }
  
  async getItem(key: string): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error('Storage not initialized')
    }
    
    const encrypted = await this.retrieve(key)
    if (!encrypted) return null
    
    const decrypted = await this.decrypt(encrypted)
    return JSON.parse(decrypted)
  }
  
  private async encrypt(data: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      encoder.encode(data)
    )
    
    // 组合 IV 和加密数据
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return combined.buffer
  }
  
  private async decrypt(data: ArrayBuffer): Promise<string> {
    const combined = new Uint8Array(data)
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      encrypted
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }
}
```

#### 3. XSS 防护

```typescript
import DOMPurify from 'dompurify'

class HTMLSanitizer {
  private config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class', 'id'],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true
  }
  
  sanitize(html: string): string {
    return DOMPurify.sanitize(html, this.config)
  }
  
  // 用于邮件内容
  sanitizeEmail(html: string): string {
    // 更严格的配置
    const emailConfig = {
      ...this.config,
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
      ALLOWED_ATTR: []
    }
    
    return DOMPurify.sanitize(html, emailConfig)
  }
}

// 在组件中使用
function EmailContent({ html }: { html: string }) {
  const sanitizer = new HTMLSanitizer()
  const safe = sanitizer.sanitizeEmail(html)
  
  return (
    <div 
      className="email-content"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
```

### 3.5 代码质量改进（P2 - 持续）

#### 1. 拆分复杂方法

```typescript
// 原始复杂方法拆分
class OCRResponseConverter {
  convert(response: any): EdgeFunctionOCRResponse {
    const invoiceType = this.detectInvoiceType(response)
    const processor = this.getProcessor(invoiceType)
    
    return {
      success: response.success,
      invoice_type: invoiceType,
      fields: processor.extractFields(response),
      confidence: processor.calculateConfidence(response),
      validation: processor.validate(response),
      metadata: this.extractMetadata(response)
    }
  }
  
  private detectInvoiceType(response: any): string {
    // 类型检测逻辑
    if (response.data?.invoice_type) {
      return response.data.invoice_type
    }
    
    if (response.fields?.train_number) {
      return 'TRAIN_TICKET'
    }
    
    return 'UNKNOWN'
  }
  
  private getProcessor(type: string): IFieldProcessor {
    const processors = {
      'TRAIN_TICKET': new TrainTicketFieldProcessor(),
      'VAT_INVOICE': new VATInvoiceFieldProcessor(),
      'UNKNOWN': new DefaultFieldProcessor()
    }
    
    return processors[type] || processors['UNKNOWN']
  }
}

// 字段处理器
interface IFieldProcessor {
  extractFields(response: any): InvoiceFields
  calculateConfidence(response: any): Confidence
  validate(response: any): ValidationResult
}

class TrainTicketFieldProcessor implements IFieldProcessor {
  extractFields(response: any): InvoiceFields {
    const data = response.data || {}
    
    return {
      invoice_number: data.electronic_ticket_number,
      invoice_date: this.parseDate(data.departure_time),
      total_amount: this.parseAmount(data.fare),
      train_number: data.train_number,
      departure_station: data.departure_station,
      arrival_station: data.arrival_station,
      seat_type: data.seat_type,
      passenger_name: data.passenger_name
    }
  }
  
  private parseDate(dateStr: string): string {
    // 日期解析逻辑
    return new Date(dateStr).toISOString()
  }
  
  private parseAmount(amount: any): number {
    if (typeof amount === 'number') return amount
    if (typeof amount === 'string') return parseFloat(amount)
    return 0
  }
}
```

#### 2. 错误处理标准化

```typescript
// 错误类型定义
enum ErrorCode {
  // 认证错误
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // 业务错误
  DUPLICATE_INVOICE = 'DUPLICATE_INVOICE',
  INVALID_INVOICE_TYPE = 'INVALID_INVOICE_TYPE',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  
  // 系统错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// 基础错误类
class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    }
  }
}

// 特定错误类
class ValidationError extends AppError {
  constructor(details: ValidationErrorDetail[]) {
    super(
      ErrorCode.VALIDATION_FAILED,
      '数据验证失败',
      details,
      400
    )
  }
}

class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(
      ErrorCode.AUTH_FAILED,
      message,
      null,
      401
    )
  }
}

// 错误处理器
class ErrorHandler {
  handle(error: Error): ServiceResponse {
    // 记录错误
    this.logError(error)
    
    // 处理已知错误
    if (error instanceof AppError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }
    }
    
    // 处理 Supabase 错误
    if (this.isSupabaseError(error)) {
      return this.handleSupabaseError(error)
    }
    
    // 未知错误
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: '系统错误，请稍后重试'
      }
    }
  }
  
  private logError(error: Error) {
    if (process.env.NODE_ENV === 'production') {
      // 发送到错误监控服务
      Sentry.captureException(error)
    } else {
      console.error(error)
    }
  }
  
  private isSupabaseError(error: any): boolean {
    return error.code && error.message && error.details
  }
  
  private handleSupabaseError(error: any): ServiceResponse {
    const errorMap = {
      '23505': ErrorCode.DUPLICATE_INVOICE,
      'PGRST116': ErrorCode.UNAUTHORIZED,
      'PGRST301': ErrorCode.NOT_FOUND
    }
    
    const code = errorMap[error.code] || ErrorCode.INTERNAL_ERROR
    
    return {
      success: false,
      error: {
        code,
        message: this.getUserFriendlyMessage(code),
        details: error.details
      }
    }
  }
  
  private getUserFriendlyMessage(code: ErrorCode): string {
    const messages = {
      [ErrorCode.DUPLICATE_INVOICE]: '发票已存在',
      [ErrorCode.UNAUTHORIZED]: '无权限访问',
      [ErrorCode.NOT_FOUND]: '资源不存在',
      [ErrorCode.INTERNAL_ERROR]: '系统错误'
    }
    
    return messages[code] || '操作失败'
  }
}

// 在服务中使用
class InvoiceService {
  constructor(
    private repository: IInvoiceRepository,
    private errorHandler: ErrorHandler
  ) {}
  
  async createInvoice(data: CreateInvoiceDto): Promise<ServiceResponse<Invoice>> {
    try {
      const invoice = await this.repository.create(data)
      return { success: true, data: invoice }
    } catch (error) {
      return this.errorHandler.handle(error)
    }
  }
}
```

### 3.6 监控和可观测性（P2 - 2-3周）

#### 1. 集成 Sentry

```typescript
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

// 初始化 Sentry
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true
    })
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  beforeSend(event, hint) {
    // 过滤敏感信息
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers?.authorization
    }
    
    // 过滤开发环境的某些错误
    if (process.env.NODE_ENV === 'development') {
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null
      }
    }
    
    return event
  }
})

// 错误边界组件
export const ErrorBoundary = Sentry.ErrorBoundary

// 性能监控
export const withProfiler = Sentry.withProfiler
```

#### 2. 性能监控

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>()
  
  startMeasure(name: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(name, duration)
    }
  }
  
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${name}:error`, duration)
      throw error
    }
  }
  
  private recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(duration)
    
    // 保留最近 100 条记录
    if (values.length > 100) {
      values.shift()
    }
    
    // 记录到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱ ${name}: ${duration.toFixed(2)}ms`)
    }
    
    // 发送到分析服务
    this.sendToAnalytics(name, duration)
  }
  
  private sendToAnalytics(name: string, duration: number) {
    // 批量发送，避免频繁请求
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // 发送到 Google Analytics 或其他分析服务
        if (window.gtag) {
          window.gtag('event', 'timing_complete', {
            name,
            value: Math.round(duration)
          })
        }
      })
    }
  }
  
  getStats(name: string) {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null
    
    const sorted = [...values].sort((a, b) => a - b)
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }
}

// 使用示例
const monitor = new PerformanceMonitor()

// React 组件性能监控
function InvoiceList() {
  useEffect(() => {
    const end = monitor.startMeasure('InvoiceList:mount')
    return () => {
      end()
    }
  }, [])
  
  const loadInvoices = async () => {
    return monitor.measureAsync('InvoiceList:load', async () => {
      const response = await invoiceService.getInvoices()
      return response.data
    })
  }
}
```

#### 3. 用户行为追踪

```typescript
class Analytics {
  private queue: AnalyticsEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  
  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        userId: this.getUserId()
      }
    }
    
    this.queue.push(analyticsEvent)
    this.scheduleFlush()
  }
  
  private scheduleFlush() {
    if (this.flushTimer) return
    
    this.flushTimer = setTimeout(() => {
      this.flush()
      this.flushTimer = null
    }, 1000)
  }
  
  private async flush() {
    if (this.queue.length === 0) return
    
    const events = this.queue.splice(0, this.queue.length)
    
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      })
    } catch (error) {
      // 失败时放回队列
      this.queue.unshift(...events)
      console.error('Analytics flush failed:', error)
    }
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id')
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36)}`
      sessionStorage.setItem('analytics_session_id', sessionId)
    }
    
    return sessionId
  }
  
  private getUserId(): string | null {
    // 从认证服务获取用户 ID
    return localStorage.getItem('user_id')
  }
}

// React Hook
function useAnalytics() {
  const analytics = useMemo(() => new Analytics(), [])
  
  const trackEvent = useCallback((event: string, properties?: any) => {
    analytics.track(event, properties)
  }, [analytics])
  
  return { trackEvent }
}

// 使用示例
function InvoiceUpload() {
  const { trackEvent } = useAnalytics()
  
  const handleUpload = async (file: File) => {
    trackEvent('invoice:upload:start', {
      fileSize: file.size,
      fileType: file.type
    })
    
    try {
      const result = await uploadInvoice(file)
      
      trackEvent('invoice:upload:success', {
        invoiceId: result.id,
        processingTime: result.processingTime
      })
    } catch (error) {
      trackEvent('invoice:upload:error', {
        error: error.message
      })
    }
  }
}
```

## 四、实施计划

### 第一阶段：紧急修复（1周）
- [ ] 移除所有敏感信息日志
- [ ] 修复硬编码的 userId
- [ ] 实现基础事务处理
- [ ] 添加 localStorage 容量检查

### 第二阶段：架构改进（2-3周）
- [ ] 实现依赖注入容器
- [ ] 重构服务层为实例方法
- [ ] 实现 Repository 模式
- [ ] 添加策略模式处理发票类型

### 第三阶段：性能优化（2-3周）
- [ ] 实现请求中间件和缓存
- [ ] 优化文件处理流程
- [ ] React 组件性能优化
- [ ] 实现虚拟列表

### 第四阶段：安全加固（2周）
- [ ] 实现输入验证层
- [ ] 添加数据加密存储
- [ ] XSS 防护加强
- [ ] 实现安全的错误处理

### 第五阶段：监控部署（1-2周）
- [ ] 集成 Sentry 错误监控
- [ ] 添加性能监控
- [ ] 实现用户行为分析
- [ ] 部署监控仪表板

### 持续改进
- [ ] 代码质量提升
- [ ] 单元测试覆盖
- [ ] 文档完善
- [ ] 技术债务清理

## 五、预期收益

### 性能提升
- 页面加载时间减少 40%
- API 响应时间减少 30%
- 内存使用减少 25%

### 可维护性改善
- 代码复杂度降低 50%
- 测试覆盖率提升至 80%
- 部署频率提升 3 倍

### 安全性增强
- 零敏感信息泄露
- 100% 输入验证覆盖
- 完整的审计日志

### 业务价值
- 用户体验显著提升
- 系统稳定性增强
- 开发效率提高 2 倍

## 六、风险和缓解措施

### 风险 1：重构影响现有功能
- **缓解**：分阶段实施，每阶段充分测试
- **回滚计划**：保留旧代码分支，可快速回滚

### 风险 2：性能优化引入新问题
- **缓解**：建立性能基准，持续监控
- **预防**：A/B 测试新优化

### 风险 3：团队学习成本
- **缓解**：提供培训和文档
- **支持**：建立代码审查机制

## 七、总结

Frontend 服务层当前存在的问题严重影响了系统的可维护性、性能和安全性。通过系统性的重构和优化，可以显著提升代码质量，增强系统稳定性，并为未来的业务增长奠定坚实基础。

建议按照优先级分阶段实施，确保每个阶段都有明确的目标和可衡量的成果。同时，建立完善的监控和反馈机制，持续跟踪优化效果，及时调整策略。

这是一个长期的改进过程，需要团队的共同努力和持续投入。但通过这些改进，将构建一个更加健壮、高效和可扩展的前端服务架构。