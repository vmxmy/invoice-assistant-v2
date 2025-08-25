#!/usr/bin/env node

/**
 * 版本更新脚本
 * 自动更新版本号和构建信息
 * 用于部署时自动更新版本信息
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取命令行参数
const args = process.argv.slice(2);
const versionType = args[0] || 'patch'; // major, minor, patch
const customVersion = args[1]; // 自定义版本号

// 文件路径
const packageJsonPath = path.join(__dirname, '../package.json');
const versionConfigPath = path.join(__dirname, '../src/config/version.ts');

// 读取当前package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 获取Git信息
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD').toString().trim();
    const shortHash = commitHash.substring(0, 7);
    const branch = execSync('git branch --show-current').toString().trim();
    const isDirty = execSync('git status --porcelain').toString().trim() !== '';
    
    return {
      commitHash,
      shortHash,
      branch,
      isDirty
    };
  } catch (error) {
    console.warn('无法获取Git信息:', error.message);
    return {
      commitHash: 'unknown',
      shortHash: 'unknown',
      branch: 'unknown',
      isDirty: false
    };
  }
}

// 更新版本号
function updateVersion(currentVersion, type, custom) {
  if (custom) {
    return custom;
  }
  
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

// 主函数
function main() {
  console.log('🔧 开始更新版本信息...\n');
  
  // 获取Git信息
  const gitInfo = getGitInfo();
  console.log('📋 Git信息:');
  console.log(`   分支: ${gitInfo.branch}`);
  console.log(`   提交: ${gitInfo.shortHash}`);
  console.log(`   状态: ${gitInfo.isDirty ? '有未提交更改' : '干净'}\n`);
  
  // 更新版本号
  const oldVersion = packageJson.version;
  const newVersion = updateVersion(oldVersion, versionType, customVersion);
  
  if (oldVersion !== newVersion) {
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`📦 版本更新: ${oldVersion} → ${newVersion}`);
  } else {
    console.log(`📦 版本保持: ${newVersion}`);
  }
  
  // 更新版本配置文件
  const buildTime = new Date().toISOString();
  const versionConfig = `// 版本配置文件
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
  version: '${newVersion}', // 主版本.次版本.修订版本
  buildTime: '${buildTime}',
  commitHash: '${gitInfo.commitHash}', // 在构建时替换为实际commit hash
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
  return \`v\${info.version}\`;
};

// 获取完整版本信息字符串
export const getFullVersionString = (): string => {
  const info = getVersionInfo();
  const shortHash = info.commitHash.substring(0, 7);
  const buildDate = new Date(info.buildTime).toLocaleDateString('zh-CN');
  return \`v\${info.version} (\${shortHash}) - \${buildDate}\`;
};

// 检查是否为生产环境
export const isProduction = (): boolean => {
  return getVersionInfo().environment === 'production';
};`;

  fs.writeFileSync(versionConfigPath, versionConfig);
  
  console.log(`⏰ 构建时间: ${new Date(buildTime).toLocaleString('zh-CN')}`);
  console.log(`🔗 提交哈希: ${gitInfo.commitHash}`);
  console.log(`✅ 版本配置已更新\n`);
  
  // 输出部署信息
  console.log('🚀 部署信息:');
  console.log(`   版本: v${newVersion}`);
  console.log(`   提交: ${gitInfo.shortHash}`);
  console.log(`   时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`   环境: ${process.env.NODE_ENV || 'development'}\n`);
  
  // 如果有Git变更，提示提交
  if (gitInfo.isDirty || oldVersion !== newVersion) {
    console.log('💡 提示:');
    console.log('   请考虑提交版本更新:');
    console.log(`   git add package.json src/config/version.ts`);
    console.log(`   git commit -m "chore: 更新版本到 v${newVersion}"`);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { updateVersion, getGitInfo };