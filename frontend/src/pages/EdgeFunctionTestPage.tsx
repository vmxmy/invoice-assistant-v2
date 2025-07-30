/**
 * Edge Function 测试页面
 * 用于测试和验证各个Edge Function模块的功能
 */

import React, { useState } from 'react'
import { Upload, TestTube, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Layout from '../components/layout/Layout'
import { edgeFunctionOCR } from '../services/edgeFunctionOCR'
import { logger } from '../utils/logger'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  data?: any
  duration?: number
}

const EdgeFunctionTestPage: React.FC = () => {
  const [testFile, setTestFile] = useState<File | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const tests = [
    {
      name: 'Edge Function 可用性',
      func: () => edgeFunctionOCR.getEdgeFunctionStatus()
    },
    {
      name: '文件验证器',
      func: () => testFile ? edgeFunctionOCR.callIndividualFunction('file-validator', createFormDataForTest()) : Promise.reject('需要上传文件')
    },
    {
      name: 'OCR识别器', 
      func: () => testFile ? edgeFunctionOCR.callIndividualFunction('ocr-recognizer', createFormDataForTest()) : Promise.reject('需要上传文件')
    },
    {
      name: '完整OCR流程',
      func: () => testFile ? edgeFunctionOCR.processOCRComplete(testFile) : Promise.reject('需要上传文件')
    }
  ]

  const createFormDataForTest = () => {
    const formData = new FormData()
    if (testFile) {
      formData.append('file', testFile)
    }
    return formData
  }

  const runTest = async (test: any, index: number) => {
    setTestResults(prev => prev.map((result, i) => 
      i === index ? { ...result, status: 'running' } : result
    ))

    const startTime = performance.now()

    try {
      logger.log(`🧪 [EdgeFunctionTest] 开始测试: ${test.name}`)
      const result = await test.func()
      const endTime = performance.now()
      const duration = endTime - startTime

      setTestResults(prev => prev.map((testResult, i) => 
        i === index ? {
          ...testResult,
          status: 'success',
          message: '测试通过',
          data: result,
          duration
        } : testResult
      ))

      logger.log(`✅ [EdgeFunctionTest] 测试成功: ${test.name}`, { duration, result })

    } catch (error: any) {
      const endTime = performance.now()
      const duration = endTime - startTime

      setTestResults(prev => prev.map((testResult, i) => 
        i === index ? {
          ...testResult,
          status: 'error',
          message: error.message || '测试失败',
          duration
        } : testResult
      ))

      logger.error(`❌ [EdgeFunctionTest] 测试失败: ${test.name}`, { error: error.message, duration })
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    
    // 初始化测试结果
    setTestResults(tests.map(test => ({
      name: test.name,
      status: 'pending'
    })))

    // 逐个运行测试
    for (let i = 0; i < tests.length; i++) {
      await runTest(tests[i], i)
      // 在测试之间添加短暂延迟
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setTestFile(file)
      setTestResults([]) // 清空之前的测试结果
      logger.log('📁 [EdgeFunctionTest] 测试文件已选择', { 
        name: file.name, 
        size: file.size, 
        type: file.type 
      })
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return 'border-blue-200 bg-blue-50'
      case 'success': return 'border-green-200 bg-green-50' 
      case 'error': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 页面标题 */}
          <div>
            <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
              <TestTube className="w-8 h-8 text-primary" />
              Edge Function 测试
            </h1>
            <p className="text-base-content/60 mt-1">
              测试和验证Supabase Edge Functions的OCR处理功能
            </p>
          </div>

          {/* 文件上传区域 */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title">测试文件上传</h2>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">选择发票文件进行测试</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  className="file-input file-input-bordered w-full"
                />
                {testFile && (
                  <div className="mt-2 p-2 bg-base-200 rounded">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">
                        {testFile.name} ({(testFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 测试控制 */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title">测试执行</h2>
                <button
                  className={`btn btn-primary ${isRunning ? 'loading' : ''}`}
                  onClick={runAllTests}
                  disabled={isRunning}
                >
                  {isRunning ? '运行中...' : '运行所有测试'}
                </button>
              </div>
            </div>
          </div>

          {/* 测试结果 */}
          {testResults.length > 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">测试结果</h2>
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <h3 className="font-medium">{result.name}</h3>
                            {result.message && (
                              <p className="text-sm text-base-content/60">
                                {result.message}
                              </p>
                            )}
                          </div>
                        </div>
                        {result.duration && (
                          <div className="text-sm text-base-content/60">
                            {result.duration.toFixed(0)}ms
                          </div>
                        )}
                      </div>

                      {/* 详细结果 */}
                      {result.data && result.status === 'success' && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-primary">
                            查看详细结果
                          </summary>
                          <pre className="mt-2 p-2 bg-base-200 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>

                {/* 总体统计 */}
                <div className="mt-4 p-3 bg-base-200 rounded">
                  <div className="text-sm text-base-content/80">
                    <span className="font-medium">测试统计: </span>
                    <span className="text-green-600">
                      通过 {testResults.filter(r => r.status === 'success').length}
                    </span>
                    <span className="mx-2">•</span>
                    <span className="text-red-600">
                      失败 {testResults.filter(r => r.status === 'error').length}
                    </span>
                    <span className="mx-2">•</span>
                    <span className="text-blue-600">
                      总计 {testResults.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title">使用说明</h2>
              <div className="prose prose-sm max-w-none">
                <ul>
                  <li><strong>Edge Function 可用性:</strong> 检查Edge Functions是否可以正常访问</li>
                  <li><strong>文件验证器:</strong> 测试文件格式、大小、安全性验证</li>
                  <li><strong>OCR识别器:</strong> 测试阿里云OCR识别功能</li>
                  <li><strong>完整OCR流程:</strong> 测试完整的发票处理管道</li>
                </ul>
                <p className="text-sm text-base-content/60 mt-4">
                  建议使用真实的发票PDF文件进行测试，以获得最准确的结果。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default EdgeFunctionTestPage