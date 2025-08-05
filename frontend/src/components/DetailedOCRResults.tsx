import React, { useState } from 'react';
import { UploadFile } from '../types';

interface DetailedOCRResultsProps {
  fileItem: UploadFile;
}

const DetailedOCRResults: React.FC<DetailedOCRResultsProps> = ({ fileItem }) => {
  const [isExpanded, setIsExpanded] = useState(false); // 默认折叠，点击后展开详细内容
  
  // 仅在开发模式下显示详细OCR结果
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  // 获取OCR相关数据
  const ocrData = fileItem.ocrData;
  const rawOcrData = ocrData?.raw_ocr_data;
  const processingSteps = ocrData?.processing_steps || [];
  const confidence = ocrData?.confidence;
  const validation = ocrData?.validation;
  const metadata = ocrData?.metadata;

  if (!ocrData) {
    return (
      <div className="mt-4 border border-base-300 rounded-lg p-4">
        <div className="text-sm text-base-content/60">暂无OCR数据 (开发模式)</div>
      </div>
    );
  }

  // 调试信息：输出OCR数据结构
  console.log('🔍 DetailedOCRResults - OCR数据:', ocrData);
  console.log('🔍 DetailedOCRResults - 字段数据:', ocrData.fields);

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatConfidence = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="mt-4 border border-base-300 rounded-lg">
      {/* 展开/折叠按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 text-left bg-base-200 hover:bg-base-300 flex items-center justify-between transition-colors ${
          isExpanded ? 'rounded-t-lg' : 'rounded-t-lg'
        }`}
      >
        <span className="font-medium text-base-content">
          📋 详细OCR结果 (开发模式) {isExpanded ? '(点击收起)' : '(点击展开)'}
        </span>
        <svg
          className={`w-5 h-5 text-base-content/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 核心信息 - 始终显示 */}
      <div className={`px-4 py-3 bg-base-200 ${isExpanded ? 'border-b border-base-200' : 'rounded-b-lg'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {/* 发票类型 */}
          <div className="flex items-center gap-2">
            <span className="text-base-content/60">类型:</span>
            <span className="font-medium text-info">
              {ocrData.invoice_type || '未识别'}
            </span>
          </div>
          
          {/* 整体置信度 */}
          <div className="flex items-center gap-2">
            <span className="text-base-content/60">置信度:</span>
            <span className={`font-medium ${
              (confidence?.overall || 0) > 0.9 ? 'text-success' : 
              (confidence?.overall || 0) > 0.7 ? 'text-warning' : 'text-error'
            }`}>
              {confidence?.overall ? formatConfidence(confidence.overall) : 'N/A'}
            </span>
          </div>
          
          {/* 字段数量 */}
          <div className="flex items-center gap-2">
            <span className="text-base-content/60">字段数:</span>
            <span className="font-medium text-primary">
              {ocrData.fields ? Object.keys(ocrData.fields).length : 0}个
            </span>
          </div>
          
          {/* 完整性评分 */}
          <div className="flex items-center gap-2">
            <span className="text-base-content/60">完整性:</span>
            <span className={`font-medium ${
              (validation?.completeness_score || 0) >= 70 ? 'text-success' : 
              (validation?.completeness_score || 0) >= 50 ? 'text-warning' : 'text-error'
            }`}>
              {validation?.completeness_score || 0}%
            </span>
          </div>
        </div>
        
        {/* 处理时间 */}
        {metadata?.total_processing_time && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-base-content/60">
            <span>⏱️ 处理时间: {formatProcessingTime(metadata.total_processing_time)}</span>
            {validation?.overall_errors && validation.overall_errors.length > 0 && (
              <>
                <span className="mx-1">•</span>
                <span className="text-error">
                  ❌ {validation.overall_errors.length}个错误
                </span>
              </>
            )}
            {validation?.overall_warnings && validation.overall_warnings.length > 0 && (
              <>
                <span className="mx-1">•</span>
                <span className="text-warning">
                  ⚠️ {validation.overall_warnings.length}个警告
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 详细内容 */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 基础信息 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-info/10 p-3 rounded-md">
              <div className="text-sm font-medium text-info-content">发票类型</div>
              <div className="text-info">{ocrData.invoice_type || '未识别'}</div>
            </div>
            <div className="bg-success/10 p-3 rounded-md">
              <div className="text-sm font-medium text-success-content">整体置信度</div>
              <div className="text-success font-mono">
                {confidence?.overall ? formatConfidence(confidence.overall) : 'N/A'}
              </div>
            </div>
          </div>

          {/* 处理步骤 */}
          {processingSteps.length > 0 && (
            <div className="bg-base-200 p-3 rounded-md">
              <div className="text-sm font-medium text-base-content mb-2">🔄 处理步骤</div>
              <div className="space-y-1">
                {processingSteps.map((step, index) => (
                  <div key={index} className="text-sm text-base-content/70 font-mono">
                    {index + 1}. {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 字段置信度 */}
          {confidence?.fields && Object.keys(confidence.fields).length > 0 && (
            <div className="bg-warning/10 p-3 rounded-md">
              <div className="text-sm font-medium text-warning-content mb-2">📊 字段置信度</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(confidence.fields).map(([field, conf]) => (
                  <div key={field} className="flex justify-between text-sm">
                    <span className="text-base-content/70">{field}:</span>
                    <span className={`font-mono ${conf > 0.9 ? 'text-success' : conf > 0.7 ? 'text-warning' : 'text-error'}`}>
                      {formatConfidence(conf)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 验证结果 */}
          {validation && (
            <div className="bg-error/10 p-3 rounded-md">
              <div className="text-sm font-medium text-error-content mb-2">✅ 验证结果</div>
              
              {/* 完整性评分 */}
              <div className="mb-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-base-content/70">完整性评分:</span>
                  <span className={`font-bold ${
                    validation.completeness_score >= 70 ? 'text-success' : 
                    validation.completeness_score >= 50 ? 'text-warning' : 'text-error'
                  }`}>
                    {validation.completeness_score}%
                  </span>
                </div>
                <div className="w-full bg-base-300 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${
                      validation.completeness_score >= 70 ? 'bg-success' : 
                      validation.completeness_score >= 50 ? 'bg-warning' : 'bg-error'
                    }`}
                    style={{ width: `${validation.completeness_score}%` }}
                  ></div>
                </div>
              </div>

              {/* 错误信息 */}
              {validation.overall_errors && validation.overall_errors.length > 0 && (
                <div className="mb-2">
                  <div className="text-sm font-medium text-error-content mb-1">❌ 错误:</div>
                  {validation.overall_errors.map((error, index) => (
                    <div key={index} className="text-sm text-error ml-2">• {error}</div>
                  ))}
                </div>
              )}

              {/* 警告信息 */}
              {validation.overall_warnings && validation.overall_warnings.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-warning-content mb-1">⚠️ 警告:</div>
                  {validation.overall_warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-warning ml-2">• {warning}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 性能指标 */}
          {metadata && (
            <div className="bg-secondary/10 p-3 rounded-md">
              <div className="text-sm font-medium text-secondary-content mb-2">⏱️ 性能指标</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-base-content/70">总处理时间:</div>
                  <div className="font-mono text-secondary">
                    {formatProcessingTime(metadata.total_processing_time || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-base-content/70">处理时间:</div>
                  <div className="font-mono text-secondary text-xs">
                    {new Date(metadata.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* 各步骤耗时 */}
              {metadata.step_timings && Object.keys(metadata.step_timings).length > 0 && (
                <div className="mt-2">
                  <div className="text-sm text-base-content/70 mb-1">步骤耗时:</div>
                  {Object.entries(metadata.step_timings).map(([step, time]) => (
                    <div key={step} className="flex justify-between text-xs">
                      <span className="text-base-content/60">{step}:</span>
                      <span className="font-mono text-secondary/80">{formatProcessingTime(time)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 提取的字段数据 */}
          {ocrData.fields && Object.keys(ocrData.fields).length > 0 ? (
            <div className="bg-primary/10 p-3 rounded-md">
              <div className="text-sm font-medium text-primary-content mb-2">📝 提取字段 ({Object.keys(ocrData.fields).length}个)</div>
              <div className="space-y-2">
                {Object.entries(ocrData.fields).map(([key, value]) => (
                  <div key={key} className="border-l-2 border-primary/30 pl-3">
                    <div className="flex flex-col sm:flex-row items-start gap-2">
                      <span className="text-sm font-medium text-base-content/80 w-full sm:min-w-[120px] sm:w-auto bg-base-200 px-2 py-1 rounded">
                        {key}
                      </span>
                      <div className="flex-1 w-full">
                        {/* 处理不同类型的值 */}
                        {Array.isArray(value) ? (
                          <div className="space-y-2">
                            <span className="text-xs text-base-content/60">数组 ({value.length} 项)</span>
                            {value.map((item, index) => (
                              <div key={index} className="bg-base-100 border border-base-300 rounded p-2 text-sm">
                                <div className="text-xs text-base-content/60 mb-1">项目 {index + 1}:</div>
                                {typeof item === 'object' && item !== null ? (
                                  <div className="space-y-1">
                                    {Object.entries(item).map(([subKey, subValue]) => (
                                      <div key={subKey} className="flex flex-col sm:flex-row">
                                        <span className="text-base-content/70 sm:w-24 text-xs">{subKey}:</span>
                                        <span className="text-primary font-mono text-xs break-all flex-1">
                                          {String(subValue)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-primary font-mono text-xs">{String(item)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : typeof value === 'object' && value !== null ? (
                          <div className="bg-base-100 border border-base-300 rounded p-2 space-y-1">
                            <span className="text-xs text-base-content/60">对象:</span>
                            {Object.entries(value).map(([subKey, subValue]) => (
                              <div key={subKey} className="flex flex-col sm:flex-row text-sm">
                                <span className="text-base-content/70 sm:w-24 text-xs">{subKey}:</span>
                                <span className="text-primary font-mono text-xs break-all flex-1">
                                  {String(subValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-base-100 border border-base-300 rounded px-3 py-2">
                            <span className="text-primary font-mono text-sm break-all">
                              {String(value)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-base-200 p-3 rounded-md">
              <div className="text-sm text-base-content/70">📝 暂无提取字段数据</div>
            </div>
          )}

          {/* 原始OCR数据 */}
          {rawOcrData && (
            <div className="bg-base-200 p-3 rounded-md">
              <div className="text-sm font-medium text-base-content mb-2">🔍 原始OCR数据</div>
              <div className="space-y-2">
                {/* 请求ID */}
                {rawOcrData.RequestId && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-base-content/70 bg-base-300 px-2 py-1 rounded">RequestId:</span>
                    <span className="text-xs font-mono text-info">{rawOcrData.RequestId}</span>
                  </div>
                )}
                
                {/* 原始数据内容 */}
                {rawOcrData.Data && (
                  <div className="bg-base-100 border border-base-300 rounded p-3">
                    <div className="text-xs text-base-content/70 mb-2">原始响应数据:</div>
                    <div className="text-xs font-mono text-base-content max-h-40 overflow-y-auto">
                      {(() => {
                        try {
                          // 尝试解析JSON并格式化显示
                          const parsed = JSON.parse(rawOcrData.Data);
                          return (
                            <div className="space-y-1">
                              {parsed.subMsgs && parsed.subMsgs.map((msg, index) => (
                                <div key={index} className="border-l-2 border-info/30 pl-2 mb-2">
                                  <div className="text-xs text-info font-semibold">
                                    消息 {index + 1}: {msg.type}
                                  </div>
                                  {msg.result && (
                                    <div className="mt-1 space-y-1">
                                      {Object.entries(msg.result).map(([key, value]) => (
                                        <div key={key} className="text-xs">
                                          <span className="text-base-content/70 font-medium">{key}:</span>
                                          <span className="ml-2 text-base-content">
                                            {typeof value === 'object' ? 
                                              JSON.stringify(value).substring(0, 100) + '...' : 
                                              String(value)
                                            }
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        } catch (e) {
                          // 如果解析失败，直接显示原始文本
                          return (
                            <pre className="whitespace-pre-wrap break-all">
                              {rawOcrData.Data.length > 500 ? 
                                rawOcrData.Data.substring(0, 500) + '\n\n... (内容过长，已截断)' : 
                                rawOcrData.Data
                              }
                            </pre>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}
                
                {/* 其他原始数据字段 */}
                {Object.entries(rawOcrData)
                  .filter(([key]) => key !== 'Data' && key !== 'RequestId')
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-base-content/70 bg-base-300 px-2 py-1 rounded">{key}:</span>
                      <span className="text-xs font-mono text-base-content">{String(value)}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailedOCRResults;