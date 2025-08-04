#!/usr/bin/env node

/**
 * 环境切换工具
 * 用于在不同的 Supabase 环境之间快速切换
 */

const fs = require('fs')
const path = require('path')

// 支持的环境配置文件映射
const envFiles = {
  local: '.env.development',
  dev: '.env.development',
  development: '.env.development',
  staging: '.env.staging',
  stage: '.env.staging',
  prod: '.env.production',
  production: '.env.production'
}

// 获取命令行参数
const target = process.argv[2]
const force = process.argv.includes('--force') || process.argv.includes('-f')

// 显示帮助信息
function showHelp() {
  console.log(`
📋 环境切换工具使用说明

用法:
  node scripts/env-switch.js <环境名称> [选项]

支持的环境:
  local, dev, development  - 本地开发环境
  staging, stage          - 预发布/测试环境  
  prod, production        - 生产环境

选项:
  --force, -f            - 强制覆盖现有 .env 文件
  --help, -h             - 显示此帮助信息

示例:
  node scripts/env-switch.js local
  node scripts/env-switch.js prod --force
  node scripts/env-switch.js staging

注意:
  - 此工具会将指定环境的配置复制到 .env 文件
  - 建议在切换环境前备份当前的 .env 文件
  - 生产环境密钥应通过 CI/CD 环境变量注入
`)
}

// 检查帮助标志
if (!target || target === '--help' || target === '-h') {
  showHelp()
  process.exit(0)
}

// 验证环境参数
if (!envFiles[target]) {
  console.error(`❌ 不支持的环境: "${target}"`)
  console.log('\n支持的环境:', Object.keys(envFiles).join(', '))
  process.exit(1)
}

const sourceFile = envFiles[target]
const targetFile = '.env'
const backupFile = '.env.backup'

// 检查源文件是否存在
if (!fs.existsSync(sourceFile)) {
  console.error(`❌ 环境配置文件不存在: ${sourceFile}`)
  console.log(`请先创建 ${sourceFile} 文件`)
  process.exit(1)
}

// 检查目标文件是否存在且未强制覆盖
if (fs.existsSync(targetFile) && !force) {
  console.log(`⚠️  .env 文件已存在`)
  console.log(`如需覆盖，请使用 --force 参数`)
  console.log(`或手动备份当前 .env 文件`)
  process.exit(1)
}

try {
  // 备份现有的 .env 文件
  if (fs.existsSync(targetFile)) {
    fs.copyFileSync(targetFile, backupFile)
    console.log(`📦 已备份现有配置到: ${backupFile}`)
  }

  // 复制环境配置文件
  fs.copyFileSync(sourceFile, targetFile)
  
  // 读取并显示关键配置信息
  const envContent = fs.readFileSync(targetFile, 'utf8')
  const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1] || 'Not found'
  const appEnv = envContent.match(/VITE_APP_ENV=(.+)/)?.[1] || 'Not found'
  
  console.log(`✅ 已切换到 ${target} 环境`)
  console.log(`📁 配置文件: ${sourceFile} → ${targetFile}`)
  console.log(`🔗 Supabase URL: ${supabaseUrl}`)
  console.log(`🏷️  环境标识: ${appEnv}`)
  
  // 环境特定的提示信息
  if (target.includes('local') || target.includes('dev')) {
    console.log('\n💡 本地开发提示:')
    console.log('   - 确保本地 Supabase 已启动: supabase start')
    console.log('   - 启动开发服务器: npm run dev')
  } else if (target.includes('prod')) {
    console.log('\n⚠️  生产环境提示:')
    console.log('   - 请确认生产环境密钥已正确配置')
    console.log('   - 建议通过 CI/CD 环境变量管理敏感信息')
    console.log('   - 构建生产版本: npm run build')
  } else if (target.includes('staging')) {
    console.log('\n🧪 测试环境提示:')
    console.log('   - 此环境用于预发布测试')
    console.log('   - 构建测试版本: npm run build --mode staging')
  }

} catch (error) {
  console.error(`❌ 环境切换失败:`, error.message)
  process.exit(1)
}