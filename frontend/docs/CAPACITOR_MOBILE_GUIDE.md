# 发票助手 - Capacitor 移动端开发指南

## 概述

本项目已成功集成 Capacitor 7.4.3，可以将 React Web 应用打包为原生 iOS 和 Android 应用。

## 项目结构

```
frontend/
├── android/              # Android 原生项目
├── ios/                 # iOS 原生项目
├── capacitor.config.ts  # Capacitor 配置文件
├── dist/               # Web 构建输出目录
└── src/                # React 源代码
```

## 开发环境配置

### Android 开发环境

1. **安装 Android Studio**
   ```bash
   # 下载并安装 Android Studio
   # https://developer.android.com/studio
   ```

2. **配置 Android SDK**
   - 打开 Android Studio
   - 安装 Android SDK (API 22+)
   - 配置环境变量：
     ```bash
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
     ```

3. **创建 AVD (模拟器)**
   ```bash
   # 通过 Android Studio AVD Manager 创建虚拟设备
   ```

### iOS 开发环境 (仅 macOS)

1. **安装 Xcode**
   ```bash
   # 从 App Store 安装 Xcode
   ```

2. **安装 CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

3. **iOS 模拟器**
   ```bash
   # Xcode 自带 iOS 模拟器
   ```

## 开发工作流

### 1. 构建和同步

```bash
# 构建 Web 应用并同步到原生平台
npm run mobile:build

# 仅同步(当只需要更新配置时)
npm run mobile:sync
```

### 2. 原生应用开发

```bash
# Android - 在模拟器中运行
npm run mobile:android

# iOS - 在模拟器中运行 (仅 macOS)
npm run mobile:ios

# 打开原生 IDE 进行详细开发
npm run mobile:open:android  # Android Studio
npm run mobile:open:ios      # Xcode
```

### 3. 实时开发 (Live Reload)

```bash
# Android 实时开发 - 支持热重载
npm run mobile:android:dev

# iOS 实时开发 - 支持热重载 (仅 macOS)
npm run mobile:ios:dev
```

## 应用配置

### capacitor.config.ts 配置说明

```typescript
const config: CapacitorConfig = {
  appId: 'com.invoiceassist.app',        // 应用包名
  appName: '发票助手',                    // 应用名称
  webDir: 'dist',                        // Web 构建目录
  server: {
    androidScheme: 'https',              // Android HTTPS 协议
    iosScheme: 'https'                   // iOS HTTPS 协议  
  },
  plugins: {
    SplashScreen: {                      // 启动屏配置
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      spinnerColor: "#3B82F6"
    },
    StatusBar: {                         // 状态栏配置
      style: "light",
      backgroundColor: "#3B82F6"
    },
    Keyboard: {                          // 键盘配置
      resize: "body",
      style: "light",
      resizeOnFullScreen: true
    }
  }
};
```

## 功能特性

### ✅ 已实现功能

- **PWA 功能完全保留**
  - Service Worker 缓存
  - 离线访问支持
  - 安装提示

- **移动端优化界面**
  - 响应式布局 (手机/平板/桌面)
  - 触控友好的交互
  - 手势支持 (滑动、缩放等)

- **原生移动端体验**
  - 启动屏幕
  - 状态栏样式
  - 键盘适配
  - 原生导航

- **性能优化**
  - 代码分割和懒加载
  - 图片优化和缓存
  - 网络请求优化

### 🔄 开发中功能

- **原生插件集成**
  - 相机和相册访问
  - 文件系统访问
  - 推送通知

- **应用商店发布**
  - 图标和启动屏
  - 应用签名配置
  - 发布流程

## 常用命令

```bash
# 开发相关
npm run dev                    # Web 开发服务器
npm run build                  # 构建 Web 应用
npm run mobile:build          # 构建并同步到移动端

# 移动端测试
npm run mobile:android        # Android 模拟器
npm run mobile:ios           # iOS 模拟器  
npm run mobile:android:dev   # Android 热重载开发
npm run mobile:ios:dev      # iOS 热重载开发

# 原生开发
npm run mobile:open:android  # 打开 Android Studio
npm run mobile:open:ios     # 打开 Xcode

# 同步和配置
npm run mobile:sync         # 同步到原生平台
npx cap doctor             # 检查环境配置
```

## 故障排除

### Android 相关问题

1. **Gradle 构建失败**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run mobile:sync
   ```

2. **SDK 版本问题**
   - 确保安装了正确的 Android SDK 版本
   - 检查 `android/variables.gradle` 中的版本配置

### iOS 相关问题 (macOS)

1. **Pod 安装失败**
   ```bash
   cd ios/App
   pod repo update
   pod install
   cd ../..
   ```

2. **Xcode 版本问题**
   - 确保使用最新版本的 Xcode
   - 检查 iOS 部署目标版本

### 通用问题

1. **网络请求失败**
   - 检查 `capacitor.config.ts` 中的 server 配置
   - 确认 HTTPS 设置正确

2. **热重载不工作**
   - 确保设备和开发机在同一网络
   - 检查防火墙设置

## 下一步计划

1. **配置开发环境**
   - [ ] 安装 Android Studio
   - [ ] 配置 Android SDK
   - [ ] 安装 Xcode (macOS)
   - [ ] 配置 CocoaPods (macOS)

2. **功能扩展**
   - [ ] 集成原生相机插件
   - [ ] 添加推送通知支持
   - [ ] 实现原生文件访问

3. **应用商店发布**
   - [ ] 准备应用图标和启动屏
   - [ ] 配置应用签名
   - [ ] 测试发布流程

## 技术栈

- **Capacitor**: 7.4.3
- **React**: 19.1.0  
- **Vite**: 7.0.0
- **TypeScript**: 5.8.3
- **Tailwind CSS**: 4.1.11
- **DaisyUI**: 5.0.43

## 参考文档

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Android 开发指南](https://developer.android.com)
- [iOS 开发指南](https://developer.apple.com/ios)
- [React Native 迁移指南](https://capacitorjs.com/docs/getting-started/environment-setup)