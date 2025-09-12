import Flutter
import UIKit

@available(iOS 13.0, *)
@objc class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?
    private var flutterEngine: FlutterEngine?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        // 创建共享的 Flutter 引擎实例
        flutterEngine = FlutterEngine(name: "InvoiceAssistantEngine")
        
        // 运行 Flutter 引擎
        flutterEngine?.run()
        
        // 注册 Flutter 插件
        if let engine = flutterEngine {
            GeneratedPluginRegistrant.register(with: engine)
        }
        
        // 创建 Flutter 视图控制器
        let flutterViewController = FlutterViewController(
            engine: flutterEngine!, 
            nibName: nil, 
            bundle: nil
        )
        
        // 设置窗口场景
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = flutterViewController
        window?.makeKeyAndVisible()
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // 场景断开连接时的清理工作
        // 保留引擎实例以便重用
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // 场景变为活跃状态
        // Flutter 的生命周期将由 AppDelegate 处理
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // 场景即将失去活跃状态
        // Flutter 的生命周期将由 AppDelegate 处理
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // 场景即将进入前台
        // Flutter 的生命周期将由 AppDelegate 处理
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // 场景已进入后台
        // Flutter 的生命周期将由 AppDelegate 处理
    }
}