/**
 * useTableColumns Hook
 * 获取表格列配置的 Hook（当前使用静态数据）
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface TableColumn {
  field: string           // 字段名
  label: string          // 显示名称
  dataType: string       // 数据类型
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'array'  // UI类型
  nullable: boolean      // 是否可为空
  defaultValue?: string  // 默认值
  sortable: boolean      // 是否可排序
  filterable: boolean    // 是否可筛选
  searchable: boolean    // 是否可搜索
  category?: string      // 字段分类
  priority?: number      // 显示优先级
}

export interface TableColumnsResponse {
  tableName: string
  totalFields: number
  categories: Record<string, TableColumn[]>  // 按分类分组的字段
  allColumns: TableColumn[]                  // 所有字段的扁平列表
  defaultVisible: string[]                   // 默认显示的字段
  metadata: {
    generatedAt: string
    version: string
    source: string
  }
}

interface UseTableColumnsOptions {
  tableName: string
  enabled?: boolean
}

export const useTableColumns = ({ tableName, enabled = true }: UseTableColumnsOptions) => {
  const [data, setData] = useState<TableColumnsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchColumns = async () => {
    if (!enabled || !tableName) return

    setLoading(true)
    setError(null)

    try {
      // 使用增强的 Supabase RPC 查询字段信息
      const { data: columnsData, error } = await supabase.rpc('get_table_columns_enhanced', {
        table_name_param: tableName,
        schema_name_param: 'public'
      })

      if (error) {
        console.warn('RPC 查询失败，使用静态数据:', error)
        // 如果 RPC 失败，fallback 到静态数据
        setData(getStaticColumnsData())
        return
      }

      if (!columnsData) {
        throw new Error('未找到表字段信息')
      }

      // 直接使用 RPC 返回的结构化数据
      console.log('✅ RPC 查询成功，获取到字段数据:', columnsData)
      // 检查是否包含地理信息字段
      const regionFields = (columnsData as TableColumnsResponse).allColumns?.filter(col => 
        col.field.includes('issuer_region')
      )
      console.log('🌍 RPC返回的地理信息字段:', regionFields)
      setData(columnsData as TableColumnsResponse)
    } catch (err) {
      console.warn('🚨 获取字段信息失败，使用静态数据 fallback:', err)
      // 出错时使用静态数据作为 fallback
      const staticData = getStaticColumnsData()
      const staticRegionFields = staticData.allColumns.filter(col => 
        col.field.includes('issuer_region')
      )
      console.log('📦 使用静态 fallback 数据:', staticData)
      console.log('🌍 静态数据的地理信息字段:', staticRegionFields)
      setData(staticData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchColumns()
  }, [tableName, enabled])

  return {
    data,
    loading,
    error,
    refetch: fetchColumns,
    // 访问方法
    allColumns: data?.allColumns || [],
    categories: data?.categories || {},
    defaultVisible: data?.defaultVisible || [],
    totalFields: data?.totalFields || 0,
    metadata: data?.metadata
  }
}

// 获取字段的筛选选项
export const useFieldOptions = (fieldName: string) => {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchOptions = async () => {
      if (!fieldName) return

      setLoading(true)
      try {
        // 根据字段类型获取不同的选项
        switch (fieldName) {
          case 'status':
            setOptions([
              { label: '待处理', value: 'pending' },
              { label: '已完成', value: 'completed' },
              { label: '失败', value: 'failed' },
              { label: '草稿', value: 'draft' }
            ])
            break
          case 'source':
            setOptions([
              { label: '上传', value: 'upload' },
              { label: '邮件', value: 'email' },
              { label: 'API', value: 'api' },
              { label: '手动', value: 'manual' }
            ])
            break
          case 'currency':
            setOptions([
              { label: '人民币', value: 'CNY' },
              { label: '美元', value: 'USD' },
              { label: '欧元', value: 'EUR' }
            ])
            break
          case 'processing_status':
            setOptions([
              { label: 'OCR完成', value: 'ocr_completed' },
              { label: 'OCR失败', value: 'ocr_failed' },
              { label: '处理中', value: 'processing' },
              { label: '等待处理', value: 'pending' }
            ])
            break
          default:
            // 对于其他字段，可以从数据库动态获取唯一值
            const { data, error } = await supabase
              .from('invoices')
              .select(fieldName)
              .not(fieldName, 'is', null)
              .limit(100)

            if (!error && data) {
              const uniqueValues = [...new Set(data.map(item => item[fieldName]))]
                .filter(Boolean)
                .map(value => ({
                  label: String(value),
                  value: String(value)
                }))
              setOptions(uniqueValues)
            }
        }
      } catch (error) {
        console.error(`获取${fieldName}字段选项失败:`, error)
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [fieldName])

  return { options, loading }
}

// 辅助函数：获取静态列数据 - 使用实际数据库schema
function getStaticColumnsData(): TableColumnsResponse {
  // 基于实际数据库schema定义列
  const coreFields: TableColumn[] = [
    { field: 'invoice_number', label: '发票号码', dataType: 'character varying', type: 'text', nullable: false, sortable: true, filterable: true, searchable: true, category: 'core', priority: 1 },
    { field: 'consumption_date', label: '消费日期', dataType: 'date', type: 'date', nullable: true, sortable: true, filterable: true, searchable: false, category: 'core', priority: 2 },
    { field: 'seller_name', label: '销售方', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'core', priority: 3 },
    { field: 'buyer_name', label: '购买方', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'core', priority: 4 },
    { field: 'status', label: '状态', dataType: 'character varying', type: 'select', nullable: false, sortable: true, filterable: true, searchable: false, category: 'core', priority: 8 },
    { field: 'invoice_type', label: '发票类型', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'core', priority: 10 }
  ]

  const financialFields: TableColumn[] = [
    // 使用实际数据库列名 - amount, total_amount, tax_amount
    { field: 'amount', label: '发票金额', dataType: 'numeric', type: 'number', nullable: false, sortable: true, filterable: true, searchable: false, category: 'financial', priority: 5 },
    { field: 'total_amount', label: '价税合计', dataType: 'numeric', type: 'number', nullable: true, sortable: true, filterable: true, searchable: false, category: 'financial', priority: 6 },
    { field: 'tax_amount', label: '税额', dataType: 'numeric', type: 'number', nullable: true, sortable: true, filterable: true, searchable: false, category: 'financial', priority: 7 },
    { field: 'currency', label: '币种', dataType: 'character varying', type: 'select', nullable: false, sortable: true, filterable: true, searchable: false, category: 'financial', priority: 12 }
  ]

  const metadataFields: TableColumn[] = [
    { field: 'source', label: '来源', dataType: 'character varying', type: 'select', nullable: false, sortable: true, filterable: true, searchable: false, category: 'metadata', priority: 9 },
    { field: 'invoice_code', label: '发票代码', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 11 },
    { field: 'processing_status', label: '处理状态', dataType: 'character varying', type: 'select', nullable: true, sortable: true, filterable: true, searchable: false, category: 'metadata', priority: 13 },
    { field: 'seller_tax_id', label: '销售方税号', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 14 },
    { field: 'buyer_tax_id', label: '购买方税号', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 15 },
    { field: 'basic_category', label: '基础分类', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 16 },
    { field: 'remarks', label: '备注', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 17 },
    { field: 'expense_category', label: '费用类别', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 18 },
    { field: 'category_path', label: '分类路径', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 19 },
    { field: 'issuer_region_code', label: '地区代码', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 20 },
    { field: 'issuer_region_name', label: '发行地区', dataType: 'character varying', type: 'text', nullable: true, sortable: true, filterable: true, searchable: true, category: 'metadata', priority: 21 },
    { field: 'file_path', label: '文件路径', dataType: 'character varying', type: 'text', nullable: true, sortable: false, filterable: false, searchable: false, category: 'metadata', priority: 23 },
    { field: 'created_at', label: '创建时间', dataType: 'timestamptz', type: 'datetime', nullable: false, sortable: true, filterable: true, searchable: false, category: 'metadata', priority: 24 },
    { field: 'updated_at', label: '更新时间', dataType: 'timestamptz', type: 'datetime', nullable: false, sortable: true, filterable: true, searchable: false, category: 'metadata', priority: 25 }
  ]

  const allColumns = [...coreFields, ...financialFields, ...metadataFields].sort((a, b) => (a.priority || 999) - (b.priority || 999))

  return {
    tableName: 'invoices',
    totalFields: allColumns.length,
    categories: {
      core: coreFields,
      financial: financialFields,
      metadata: metadataFields
    },
    allColumns,
    // 更新默认可见列，包含视图的重要字段
    defaultVisible: ['invoice_number', 'consumption_date', 'seller_name', 'buyer_name', 'total_amount', 'status', 'source', 'expense_category', 'issuer_region_name', 'remarks'],
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '2.0', // 更新版本号
      source: 'static_schema_based'
    }
  }
}

