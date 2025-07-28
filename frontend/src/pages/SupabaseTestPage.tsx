import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SupabaseTestPage = () => {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testSupabaseConnection = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🔍 开始测试Supabase连接...')
      
      // 测试1: 直接测试Supabase客户端初始化
      addResult('🔧 测试1: Supabase客户端初始化')
      try {
        const testClient = supabase
        addResult(`✅ Supabase客户端创建成功`)
      } catch (error: any) {
        addResult(`❌ Supabase客户端创建失败: ${error.message}`)
        throw error
      }
      
      // 测试2: 最简单的Auth调用
      addResult('🔐 测试2: 基础Auth调用（不涉及网络）')
      try {
        // 这个调用应该不会触发网络请求
        const authClient = supabase.auth
        addResult(`✅ Auth客户端可用`)
      } catch (error: any) {
        addResult(`❌ Auth客户端不可用: ${error.message}`)
        throw error
      }
      
      // 测试3: 获取会话（最简单的方式）
      addResult('👤 测试3: 获取用户会话')
      const startTime = Date.now()
      const { data, error } = await supabase.auth.getSession()
      const endTime = Date.now()
      
      if (error) {
        addResult(`❌ 获取会话失败: ${error.message}`)
      } else {
        addResult(`✅ 获取会话成功，耗时: ${endTime - startTime}ms`)
        addResult(`📊 会话状态: ${data.session ? '有会话' : '无会话'}`)
      }
      
      // 测试4: 测试数据库连接
      addResult('🗄️ 测试4: 数据库连接')
      const { data: testData, error: dbError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        
      if (dbError) {
        addResult(`❌ 数据库连接失败: ${dbError.message}`)
      } else {
        addResult(`✅ 数据库连接成功`)
      }
      
    } catch (error: any) {
      addResult(`❌ 测试失败: ${error.message}`)
    } finally {
      setLoading(false)
      addResult('🏁 测试完成')
    }
  }

  useEffect(() => {
    // 页面加载时自动运行测试
    testSupabaseConnection()
  }, [])

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Supabase 连接测试</h2>
            
            <div className="mb-4">
              <div className="text-sm opacity-70">
                <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</p>
                <p>Anon Key: {import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button 
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                onClick={testSupabaseConnection}
                disabled={loading}
              >
                {loading ? '测试中...' : '重新测试'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setResults([])}
              >
                清空结果
              </button>
            </div>

            <div className="bg-base-200 p-4 rounded-lg">
              <h3 className="font-bold mb-2">测试结果:</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-base-content/50">等待测试结果...</p>
                ) : (
                  results.map((result, index) => (
                    <div key={index} className="text-sm font-mono">
                      {result}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupabaseTestPage