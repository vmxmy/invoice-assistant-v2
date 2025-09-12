import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // 只注册插件，窗口管理完全由 SceneDelegate 处理
    // FlutterAppDelegate 的窗口创建在 iOS 13+ 会被 SceneDelegate 覆盖
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // MARK: - UIScene Support (iOS 13+)
  
  @available(iOS 13.0, *)
  override func application(
    _ application: UIApplication, 
    configurationForConnecting connectingSceneSession: UISceneSession, 
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    // 为新连接的场景会话创建配置对象
    let configuration = UISceneConfiguration(
      name: "Default Configuration", 
      sessionRole: connectingSceneSession.role
    )
    
    // 指定场景代理类
    configuration.delegateClass = SceneDelegate.self
    
    return configuration
  }
  
  @available(iOS 13.0, *)
  override func application(
    _ application: UIApplication, 
    didDiscardSceneSessions sceneSessions: Set<UISceneSession>
  ) {
    // 当用户丢弃场景会话时调用
    // 通常用于清理与被丢弃会话相关的资源
  }
}
