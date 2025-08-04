/**
 * CORS支持工具函数
 */ export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
/**
 * 创建标准响应
 */ export function createResponse(data, status = 200, additionalSteps) {
  const responseData = {
    ...data,
    timestamp: new Date().toISOString()
  };
  if (additionalSteps) {
    responseData.steps = [
      ...responseData.steps || [],
      ...additionalSteps
    ];
  }
  return new Response(JSON.stringify(responseData, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
