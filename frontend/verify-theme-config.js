#!/usr/bin/env node

/**
 * 验证 Tailwind CSS v4 + DaisyUI 5 主题配置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 检查配置文件
function checkConfig() {
  console.log('🔍 检查主题配置...\n');
  
  // 检查 CSS 配置
  const cssPath = path.join(__dirname, 'src/index.css');
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    console.log('✅ CSS 配置检查:');
    console.log(`   - @import "tailwindcss": ${cssContent.includes('@import "tailwindcss"') ? '✓' : '✗'}`);
    console.log(`   - @plugin "daisyui": ${cssContent.includes('@plugin "daisyui"') ? '✓' : '✗'}`);
    console.log(`   - @custom-variant dark: ${cssContent.includes('@custom-variant dark') ? '✓' : '✗'}`);
    console.log(`   - light theme: ${cssContent.includes('name: "light"') ? '✓' : '✗'}`);
    console.log(`   - dark theme: ${cssContent.includes('name: "dark"') ? '✓' : '✗'}`);
    console.log();
  } else {
    console.log('❌ index.css 文件不存在');
  }
  
  // 检查 Tailwind 配置
  const tailwindPath = path.join(__dirname, 'tailwind.config.js');
  if (fs.existsSync(tailwindPath)) {
    const tailwindContent = fs.readFileSync(tailwindPath, 'utf8');
    
    console.log('✅ Tailwind 配置检查:');
    console.log(`   - plugins 数组为空: ${tailwindContent.includes('plugins: []') ? '✓' : '✗'}`);
    console.log(`   - 移除了旧的 daisyui 配置: ${!tailwindContent.includes('require(\'daisyui\')') ? '✓' : '✗'}`);
    console.log();
  }
  
  // 检查组件文件
  const themeTogglePath = path.join(__dirname, 'src/components/ui/ThemeToggle.tsx');
  const themeSelectorPath = path.join(__dirname, 'src/components/ui/ThemeSelector.tsx');
  const themeDemoPath = path.join(__dirname, 'src/components/ui/ThemeDemo.tsx');
  
  console.log('✅ 组件文件检查:');
  console.log(`   - ThemeToggle.tsx: ${fs.existsSync(themeTogglePath) ? '✓' : '✗'}`);
  console.log(`   - ThemeSelector.tsx: ${fs.existsSync(themeSelectorPath) ? '✓' : '✗'}`);
  console.log(`   - ThemeDemo.tsx: ${fs.existsSync(themeDemoPath) ? '✓' : '✗'}`);
  console.log();
  
  // 检查导航栏集成
  const navbarPath = path.join(__dirname, 'src/components/layout/AppNavbar.tsx');
  if (fs.existsSync(navbarPath)) {
    const navbarContent = fs.readFileSync(navbarPath, 'utf8');
    
    console.log('✅ 导航栏集成检查:');
    console.log(`   - 导入 ThemeToggle: ${navbarContent.includes('import ThemeToggle') ? '✓' : '✗'}`);
    console.log(`   - 桌面端主题切换: ${navbarContent.includes('<ThemeToggle showLabel={false}') ? '✓' : '✗'}`);
    console.log();
  }
  
  // 检查路由配置
  const appPath = path.join(__dirname, 'src/App.tsx');
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    console.log('✅ 路由配置检查:');
    console.log(`   - 导入 ThemeDemo: ${appContent.includes('import ThemeDemo') ? '✓' : '✗'}`);
    console.log(`   - /theme-demo 路由: ${appContent.includes('/theme-demo') ? '✓' : '✗'}`);
    console.log();
  }
}

// 输出使用说明
function printUsage() {
  console.log('🎨 主题配置验证完成！\n');
  console.log('📋 使用说明:');
  console.log('   1. 访问 http://localhost:5175/theme-demo 查看主题演示');
  console.log('   2. 点击导航栏的主题切换按钮测试功能');
  console.log('   3. 主题偏好会自动保存在 localStorage');
  console.log('   4. 支持系统偏好设置自动检测\n');
  
  console.log('🔧 技术实现:');
  console.log('   - Tailwind CSS v4 @custom-variant dark');
  console.log('   - DaisyUI 5 @plugin 配置');
  console.log('   - data-theme 属性控制');
  console.log('   - CSS 变量动态切换');
  console.log('   - 本地存储主题偏好\n');
  
  console.log('🎯 支持的主题:');
  console.log('   - light: 明亮热带风格');
  console.log('   - dark: 深邃夜间模式');
  console.log('   - 系统偏好设置自动检测\n');
}

// 主函数
function main() {
  console.log('🌈 Tailwind CSS v4 + DaisyUI 5 主题配置验证工具\n');
  checkConfig();
  printUsage();
}

main();