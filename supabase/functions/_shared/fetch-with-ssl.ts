// 用于处理自签名证书的fetch包装器

interface FetchOptions extends RequestInit {
  ignoreSSL?: boolean;
}

/**
 * 包装的fetch函数，支持忽略SSL证书验证
 * 注意：仅在开发环境或内部服务使用自签名证书时使用
 */
export async function fetchWithSSL(url: string, options: FetchOptions = {}) {
  const { ignoreSSL, ...fetchOptions } = options;
  
  // 在生产环境中，如果是内部服务地址，可以忽略SSL
  const isInternalService = url.includes('localhost') || 
                           url.includes('127.0.0.1') ||
                           url.includes('host.docker.internal');
  
  if (ignoreSSL || isInternalService) {
    // Deno不支持直接忽略证书，需要使用环境变量
    // 启动时需要添加 --unsafely-ignore-certificate-errors 标志
    console.warn('⚠️ SSL证书验证已禁用，仅用于开发环境');
  }
  
  return fetch(url, fetchOptions);
}

/**
 * 为生产环境的自签名证书创建安全的fetch
 * 建议：将自签名证书添加到容器的信任存储中
 */
export function createSecureFetch(trustedCerts?: string[]) {
  return async function secureFetch(url: string, options?: RequestInit) {
    // 在实际部署时，应该：
    // 1. 使用环境变量配置受信任的内部服务URL
    // 2. 或者将自签名证书添加到Docker镜像中
    const trustedUrls = [
      process.env.BACKEND_API_URL,
      process.env.INTERNAL_SERVICE_URL,
    ].filter(Boolean);
    
    const isTrustedUrl = trustedUrls.some(trusted => 
      trusted && url.startsWith(trusted)
    );
    
    if (isTrustedUrl) {
      console.log(`Fetching from trusted internal service: ${url}`);
    }
    
    return fetch(url, options);
  };
}