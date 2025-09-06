// 版本配置文件
// 每次部署时自动更新
export interface VersionInfo {
  version: string;
  buildTime: string;
  commitHash: string;
  environment: string;
}

// 声明全局变量类型
declare global {
  const __APP_VERSION__: string;
  const __BUILD_TIME__: string;
  const __COMMIT_HASH__: string;
}

// 默认版本信息
export const VERSION_INFO: VersionInfo = {
  version: '2.0.32', // 主版本.次版本.修订版本
  buildTime: '2025-09-06T03:23:40.064Z',
  commitHash: 'caebe0cc5162d427f7e24f116c935398b705d899', // 在构建时替换为实际commit hash
  environment: import.meta.env.MODE || 'development'
};

// 获取版本信息的工具函数
export const getVersionInfo = (): VersionInfo => {
  return {
    version: (typeof __BUILD_TIME__ !== 'undefined' && __APP_VERSION__) || VERSION_INFO.version,
    buildTime: (typeof __BUILD_TIME__ !== 'undefined' && __BUILD_TIME__) || 
               import.meta.env.VITE_BUILD_TIME || 
               VERSION_INFO.buildTime,
    commitHash: (typeof __COMMIT_HASH__ !== 'undefined' && __COMMIT_HASH__) || 
                import.meta.env.VITE_COMMIT_HASH || 
                VERSION_INFO.commitHash,
    environment: import.meta.env.MODE || 'development'
  };
};

// 获取简短版本号
export const getShortVersion = (): string => {
  const info = getVersionInfo();
  return `v${info.version}`;
};

// 获取完整版本信息字符串
export const getFullVersionString = (): string => {
  const info = getVersionInfo();
  const shortHash = info.commitHash.substring(0, 7);
  const buildDate = new Date(info.buildTime).toLocaleDateString('zh-CN');
  return `v${info.version} (${shortHash}) - ${buildDate}`;
};

// 检查是否为生产环境
export const isProduction = (): boolean => {
  return getVersionInfo().environment === 'production';
};