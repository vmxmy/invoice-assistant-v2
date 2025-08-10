// 环境变量调试工具
export function debugEnvironmentVariables() {
  const envInfo = {
    // Vite 环境变量
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    
    // 自定义环境变量
    VITE_APP_DOMAIN: import.meta.env.VITE_APP_DOMAIN,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    
    // 浏览器信息
    windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
    windowHost: typeof window !== 'undefined' ? window.location.host : 'N/A',
    windowProtocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
    
    // 计算的重定向 URL
    calculatedRedirectURL: (() => {
      const configuredDomain = import.meta.env.VITE_APP_DOMAIN
      const currentURL = configuredDomain || (typeof window !== 'undefined' ? window.location.origin : '')
      return `${currentURL}/email-confirmation`
    })(),
    
    // 构建时间戳
    buildTime: new Date().toISOString()
  }
  
  // 在控制台输出
  console.group('🔍 环境变量调试信息')
  console.table(envInfo)
  console.groupEnd()
  
  // 在页面上显示（仅开发模式）
  if (import.meta.env.DEV || !import.meta.env.VITE_APP_DOMAIN) {
    displayDebugPanel(envInfo)
  }
  
  return envInfo
}

// 在页面上显示调试面板
function displayDebugPanel(info: Record<string, any>) {
  // 检查是否已存在调试面板
  if (document.getElementById('env-debug-panel')) {
    return
  }
  
  const panel = document.createElement('div')
  panel.id = 'env-debug-panel'
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: #00ff00;
    padding: 15px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 99999;
    max-width: 400px;
    max-height: 300px;
    overflow: auto;
    border: 1px solid #00ff00;
  `
  
  const title = document.createElement('div')
  title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #ffff00;'
  title.textContent = '⚠️ 环境变量调试信息'
  
  const content = document.createElement('pre')
  content.style.cssText = 'margin: 0; white-space: pre-wrap; word-break: break-all;'
  
  // 高亮显示问题
  const formattedInfo = Object.entries(info).map(([key, value]) => {
    const displayValue = value === undefined ? '❌ undefined' : 
                        value === '' ? '⚠️ (empty)' : 
                        value
    const color = value === undefined || value === '' ? '#ff0000' : '#00ff00'
    return `<span style="color: ${color}">${key}: ${displayValue}</span>`
  }).join('\n')
  
  content.innerHTML = formattedInfo
  
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    background: transparent;
    border: none;
    color: #ff0000;
    cursor: pointer;
    font-size: 18px;
  `
  closeBtn.onclick = () => panel.remove()
  
  panel.appendChild(closeBtn)
  panel.appendChild(title)
  panel.appendChild(content)
  
  // 添加警告信息
  if (!import.meta.env.VITE_APP_DOMAIN) {
    const warning = document.createElement('div')
    warning.style.cssText = 'margin-top: 10px; padding: 10px; background: #ff0000; color: white; border-radius: 4px;'
    warning.textContent = '⚠️ VITE_APP_DOMAIN 未配置！邮件重定向将使用当前域名。'
    panel.appendChild(warning)
  }
  
  document.body.appendChild(panel)
}

export default debugEnvironmentVariables