/**
 * 字段元数据服务
 * 动态获取发票字段信息，替代硬编码的字段配置
 */

import { supabase } from './supabase'

// 字段元数据接口
export interface FieldMetadata {
  column_name: string
  data_type: string
  is_nullable: boolean
  column_default: string | null
  display_name?: string
  display_order?: number
  is_visible?: boolean
  is_searchable?: boolean
  is_sortable?: boolean
  format_type?: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'array' | 'json'
  filter_type?: 'text' | 'select' | 'date_range' | 'number_range' | 'boolean'
  description?: string
  category?: 'basic' | 'financial' | 'temporal' | 'metadata' | 'system'
  icon?: string
  width?: number
}

// 字段分类定义
export interface FieldCategory {
  id: string
  name: string
  description: string
  icon: string
  order: number
}

class FieldMetadataService {
  private cache = new Map<string, FieldMetadata[]>()
  private cacheTimestamp = 0
  private readonly cacheExpiry = 5 * 60 * 1000 // 5分钟缓存

  /**
   * 获取字段元数据（带缓存）
   */
  async getFieldMetadata(tableName: string = 'v_invoice_detail'): Promise<FieldMetadata[]> {
    const cacheKey = tableName
    const now = Date.now()

    // 检查缓存
    if (this.cache.has(cacheKey) && (now - this.cacheTimestamp) < this.cacheExpiry) {
      return this.cache.get(cacheKey)!
    }

    try {
      // 从数据库获取字段信息
      const { data: columnData, error } = await supabase.rpc('get_table_columns', {
        table_name: tableName,
        schema_name: 'public'
      })

      if (error) {
        console.warn('Failed to get columns from database, using fallback query:', error)
        return this.getFallbackFieldMetadata()
      }

      // 转换为标准格式并添加显示配置
      const dbFields = this.enhanceFieldMetadata(columnData || [])
      
      // 添加特殊字段（选择和操作列）
      const specialFields = this.getSpecialFields()
      
      // 合并数据库字段和特殊字段
      const fieldMetadata = [...specialFields, ...dbFields]
      
      // 更新缓存
      this.cache.set(cacheKey, fieldMetadata)
      this.cacheTimestamp = now

      return fieldMetadata
    } catch (error) {
      console.error('Error getting field metadata:', error)
      return this.getFallbackFieldMetadata()
    }
  }

  /**
   * 获取表格列配置
   */
  async getTableColumns(): Promise<FieldMetadata[]> {
    const allFields = await this.getFieldMetadata()
    
    // 只返回适合在表格中显示的字段
    return allFields.filter(field => 
      field.is_visible && 
      !this.isSystemField(field.column_name)
    ).sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
  }

  /**
   * 获取可搜索字段
   */
  async getSearchableFields(): Promise<FieldMetadata[]> {
    const allFields = await this.getFieldMetadata()
    return allFields.filter(field => field.is_searchable)
  }

  /**
   * 获取可排序字段
   */
  async getSortableFields(): Promise<FieldMetadata[]> {
    const allFields = await this.getFieldMetadata()
    return allFields.filter(field => field.is_sortable)
  }

  /**
   * 获取特殊字段（选择和操作列）
   */
  private getSpecialFields(): FieldMetadata[] {
    return [
      {
        column_name: 'select',
        data_type: 'special',
        is_nullable: false,
        column_default: null,
        display_name: '选择',
        display_order: -1,  // 确保在最左边
        is_visible: true,
        is_searchable: false,
        is_sortable: false,
        format_type: 'text',
        filter_type: 'text',
        category: 'system',
        width: 50
      },
      {
        column_name: 'actions',
        data_type: 'special',
        is_nullable: false,
        column_default: null,
        display_name: '操作',
        display_order: 9999,  // 确保在最右边
        is_visible: true,
        is_searchable: false,
        is_sortable: false,
        format_type: 'text',
        filter_type: 'text',
        category: 'system',
        width: 120
      }
    ]
  }

  /**
   * 获取字段分类
   */
  getFieldCategories(): FieldCategory[] {
    return [
      {
        id: 'basic',
        name: '基础信息',
        description: '发票的基本信息',
        icon: '📄',
        order: 1
      },
      {
        id: 'financial',
        name: '财务信息',
        description: '金额、税务相关信息',
        icon: '💰',
        order: 2
      },
      {
        id: 'temporal',
        name: '时间信息',
        description: '日期时间相关字段',
        icon: '📅',
        order: 3
      },
      {
        id: 'metadata',
        name: '元数据',
        description: '分类、标签等扩展信息',
        icon: '🏷️',
        order: 4
      },
      {
        id: 'system',
        name: '系统信息',
        description: '系统内部字段',
        icon: '⚙️',
        order: 5
      }
    ]
  }

  /**
   * 根据分类获取字段
   */
  async getFieldsByCategory(category: string): Promise<FieldMetadata[]> {
    const allFields = await this.getFieldMetadata()
    return allFields.filter(field => field.category === category)
  }

  /**
   * 增强字段元数据，添加显示配置
   */
  private enhanceFieldMetadata(rawFields: any[]): FieldMetadata[] {
    return rawFields.map(field => {
      const enhanced: FieldMetadata = {
        column_name: field.column_name,
        data_type: field.data_type,
        is_nullable: field.is_nullable === 'YES',
        column_default: field.column_default,
        ...this.getFieldDisplayConfig(field.column_name, field.data_type)
      }
      
      // 调试：检查分类相关字段
      if (field.column_name.includes('category')) {
        console.log('🔍 [FieldMetadata] 分类字段配置:', {
          column_name: field.column_name,
          display_name: enhanced.display_name,
          format_type: enhanced.format_type,
          category: enhanced.category
        })
      }
      
      return enhanced
    })
  }

  /**
   * 获取字段显示配置
   */
  private getFieldDisplayConfig(columnName: string, dataType: string): Partial<FieldMetadata> {
    const config = this.getFieldConfig()
    const fieldConfig = config[columnName] || {}

    // 根据数据类型推断格式
    const formatType = this.inferFormatType(dataType)
    const filterType = this.inferFilterType(dataType, columnName)

    return {
      display_name: fieldConfig.display_name || this.generateDisplayName(columnName),
      display_order: fieldConfig.display_order || 999,
      is_visible: fieldConfig.is_visible !== false, // 默认可见
      is_searchable: fieldConfig.is_searchable !== false, // 默认可搜索
      is_sortable: fieldConfig.is_sortable !== false, // 默认可排序
      format_type: fieldConfig.format_type || formatType,
      filter_type: fieldConfig.filter_type || filterType,
      description: fieldConfig.description,
      category: fieldConfig.category || this.inferCategory(columnName),
      icon: fieldConfig.icon,
      width: fieldConfig.width
    }
  }

  /**
   * 字段配置定义
   */
  private getFieldConfig(): Record<string, Partial<FieldMetadata>> {
    return {
      // 选择和操作列
      'select': {
        display_name: '选择',
        display_order: -1,  // 确保在最左边
        is_visible: true,
        is_searchable: false,
        is_sortable: false,
        category: 'system',
        width: 50
      },
      'actions': {
        display_name: '操作',
        display_order: 9999,  // 确保在最右边
        is_visible: true,
        is_searchable: false,
        is_sortable: false,
        category: 'system',
        width: 120
      },

      // 基础信息 - 只保留用户关心的核心字段
      'invoice_number': {
        display_name: '发票号码',
        display_order: 1,
        format_type: 'text',
        filter_type: 'text',
        category: 'basic',
        is_searchable: true,
        width: 200
      },
      'seller_name': {
        display_name: '商家名称',
        display_order: 2,
        format_type: 'text',
        filter_type: 'text',
        category: 'basic',
        is_searchable: true,
        width: 150
      },

      // 财务信息 - 只保留总金额
      'total_amount': {
        display_name: '发票金额',
        display_order: 10,
        format_type: 'currency',
        filter_type: 'number_range',
        category: 'financial',
        is_searchable: true,
        description: '可按金额范围筛选',
        width: 120
      },

      // 时间信息 - 只保留开票日期
      'invoice_date': {
        display_name: '开票日期',
        display_order: 20,
        format_type: 'date',
        filter_type: 'date_range',
        category: 'temporal',
        is_searchable: true,
        description: '可按日期范围筛选',
        width: 120
      },

      // 分类信息 - 只保留费用分类
      'expense_category': {
        display_name: '费用分类',
        display_order: 30,
        format_type: 'text',
        filter_type: 'select',
        category: 'metadata',
        is_searchable: true,
        description: '如餐饮、交通、办公用品等',
        width: 120
      },

      // 系统字段（不显示，不可搜索）
      'id': { is_visible: false, is_searchable: false, category: 'system' },
      'user_id': { is_visible: false, is_searchable: false, category: 'system' },
      'created_by': { is_visible: false, is_searchable: false, category: 'system' },
      'updated_by': { is_visible: false, is_searchable: false, category: 'system' },
      'deleted_at': { is_visible: false, is_searchable: false, category: 'system' },
      'version': { is_visible: false, is_searchable: false, category: 'system' },
      'file_name': { is_visible: false, is_searchable: false, category: 'system' },
      'file_path': { is_visible: false, is_searchable: false, category: 'system' },
      'file_url': { is_visible: false, is_searchable: false, category: 'system' },
      'file_size': { is_visible: false, is_searchable: false, category: 'system' },
      'invoice_code': { is_visible: false, is_searchable: false, category: 'system' },
      'invoice_type': { is_visible: false, is_searchable: false, category: 'system' },
      'buyer_name': { is_visible: false, is_searchable: false, category: 'system' },
      'currency': { is_visible: false, is_searchable: false, category: 'system' },
      'amount_without_tax': { is_visible: false, is_searchable: false, category: 'system' },
      'tax_amount': { is_visible: false, is_searchable: false, category: 'system' },
      'consumption_date': { is_visible: false, is_searchable: false, category: 'system' },
      'created_at': { is_visible: false, is_searchable: false, category: 'system' },
      'updated_at': { is_visible: false, is_searchable: false, category: 'system' },
      'primary_category_name': { is_visible: false, is_searchable: false, category: 'system' },
      'secondary_category_name': { is_visible: false, is_searchable: false, category: 'system' },
      'category_full_path': { is_visible: false, is_searchable: false, category: 'system' },
      'tags': { is_visible: false, is_searchable: false, category: 'system' },
      'status': { is_visible: false, is_searchable: false, category: 'system' },
      'source': { is_visible: false, is_searchable: false, category: 'system' },
      'remarks': { is_visible: false, is_searchable: false, category: 'system' },
      'notes': { is_visible: false, is_searchable: false, category: 'system' },
      'is_verified': { is_visible: false, is_searchable: false, category: 'system' },
      'verified_at': { is_visible: false, is_searchable: false, category: 'system' }
    }
  }

  /**
   * 推断字段格式类型
   */
  private inferFormatType(dataType: string): FieldMetadata['format_type'] {
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'date'
    if (dataType.includes('numeric') || dataType.includes('integer')) return 'number'
    if (dataType.includes('boolean')) return 'boolean'
    if (dataType.includes('jsonb') || dataType.includes('json')) return 'json'
    if (dataType.includes('ARRAY')) return 'array'
    return 'text'
  }

  /**
   * 推断过滤器类型
   */
  private inferFilterType(dataType: string, columnName: string): FieldMetadata['filter_type'] {
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'date_range'
    if (dataType.includes('numeric') || dataType.includes('integer')) return 'number_range'
    if (dataType.includes('boolean')) return 'boolean'
    if (columnName.includes('status') || columnName.includes('type') || columnName.includes('source')) return 'select'
    return 'text'
  }

  /**
   * 推断字段分类
   */
  private inferCategory(columnName: string): FieldMetadata['category'] {
    if (['id', 'user_id', 'created_by', 'updated_by', 'deleted_at', 'version'].includes(columnName)) {
      return 'system'
    }
    if (columnName.includes('amount') || columnName.includes('tax') || columnName.includes('currency')) {
      return 'financial'
    }
    if (columnName.includes('date') || columnName.includes('time') || columnName.includes('at')) {
      return 'temporal'
    }
    if (columnName.includes('category') || columnName.includes('tag') || columnName.includes('status') || columnName.includes('source')) {
      return 'metadata'
    }
    return 'basic'
  }

  /**
   * 生成显示名称
   */
  private generateDisplayName(columnName: string): string {
    const nameMap: Record<string, string> = {
      'invoice_number': '发票号码',
      'invoice_code': '发票代码',
      'invoice_type': '发票类型',
      'invoice_date': '开票日期',
      'consumption_date': '消费日期',
      'seller_name': '销售方名称',
      'seller_tax_number': '销售方税号',
      'buyer_name': '购买方名称',
      'buyer_tax_number': '购买方税号',
      'total_amount': '总金额',
      'amount_without_tax': '不含税金额',
      'tax_amount': '税额',
      'currency': '币种',
      'status': '状态',
      'source': '来源',
      'created_at': '创建时间',
      'updated_at': '更新时间',
      'expense_category': '费用分类',
      'primary_category_name': '一级分类',
      'secondary_category_name': '二级分类',
      'category_full_path': '分类路径',
      'tags': '标签',
      'remarks': '备注',
      'notes': '笔记',
      'is_verified': '是否验证',
      'verified_at': '验证时间'
    }

    return nameMap[columnName] || columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * 检查是否为系统字段
   */
  private isSystemField(columnName: string): boolean {
    const systemFields = [
      'id', 'user_id', 'created_by', 'updated_by', 'deleted_at', 'version',
      'email_task_id', 'extra_data', 'ocr_field_confidences', 'ocr_overall_confidence',
      'ocr_processing_metadata', 'source_metadata', 'file_hash', 'file_size'
    ]
    return systemFields.includes(columnName)
  }

  /**
   * 备用字段元数据（当数据库查询失败时使用）
   */
  private getFallbackFieldMetadata(): FieldMetadata[] {
    const fallbackFields = [
      'invoice_number', 'seller_name', 'consumption_date', 'total_amount', 
      'status', 'source', 'expense_category', 'primary_category_name', 
      'secondary_category_name', 'created_at'
    ]

    const dbFields = fallbackFields.map((columnName, index) => ({
      column_name: columnName,
      data_type: 'character varying',
      is_nullable: true,
      column_default: null,
      ...this.getFieldDisplayConfig(columnName, 'character varying'),
      display_order: (index + 1) * 10
    }))
    
    // 添加特殊字段
    return [...this.getSpecialFields(), ...dbFields]
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheTimestamp = 0
  }
}

export const fieldMetadataService = new FieldMetadataService()
export default fieldMetadataService