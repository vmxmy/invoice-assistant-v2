import { supabase } from '../supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

export abstract class BaseSupabaseService<T> {
  protected tableName: string
  protected viewName?: string

  constructor(tableName: string, viewName?: string) {
    this.tableName = tableName
    this.viewName = viewName
  }

  // 基础 CRUD 操作
  async findAll(filters?: Record<string, any>, options?: QueryOptions) {
    let query = supabase
      .from(this.viewName || this.tableName)
      .select('*')
    
    // 应用过滤器
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else {
            query = query.eq(key, value)
          }
        }
      })
    }
    
    // 应用选项
    if (options) {
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.order === 'asc' })
      }
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
      }
    }
    
    const { data, error, count } = await query
    if (error) throw error
    
    return { data: data || [], count }
  }

  async findOne(id: string) {
    const { data, error } = await supabase
      .from(this.viewName || this.tableName)
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  async create(data: Partial<T>) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return result
  }

  async update(id: string, data: Partial<T>) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return result
  }

  async delete(id: string) {
    const { error } = await supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  }

  async batchDelete(ids: string[]) {
    const { error } = await supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
    
    if (error) throw error
  }

  // 实时订阅
  subscribe(
    callback: (payload: any) => void,
    filter?: Record<string, any>
  ): RealtimeChannel {
    const channel = supabase.channel(`${this.tableName}_changes`)
    
    const subscription = filter
      ? channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: this.tableName,
            filter: Object.entries(filter)
              .map(([key, value]) => `${key}=eq.${value}`)
              .join(',')
          },
          callback
        )
      : channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: this.tableName
          },
          callback
        )
    
    return subscription.subscribe()
  }

  // 取消订阅
  unsubscribe(channel: RealtimeChannel) {
    supabase.removeChannel(channel)
  }
}