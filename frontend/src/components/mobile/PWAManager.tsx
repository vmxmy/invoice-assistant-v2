import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAManager: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // PWA更新管理
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker已注册：', r);
      // 每小时检查一次更新
      r && setInterval(() => {
        r.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('Service Worker注册失败：', error);
    },
  });

  useEffect(() => {
    // 检查是否已经是独立应用
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // 监听安装提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // 监听应用安装成功
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setInstallPrompt(null);
      toast.success('应用已成功安装到主屏幕！');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 处理安装
  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('正在安装应用...');
      } else {
        toast.info('您可以随时从浏览器菜单安装应用');
      }
      
      setInstallPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('安装失败：', error);
      toast.error('安装失败，请稍后重试');
    }
  };

  // 处理更新
  const handleUpdate = () => {
    updateServiceWorker(true);
    toast.success('正在更新应用...');
  };

  // 关闭更新提示
  const closeUpdatePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      {/* 安装提示横幅 */}
      {isInstallable && !isStandalone && (
        <div className="fixed top-16 left-4 right-4 bg-primary text-primary-content rounded-lg shadow-xl z-50 animate-slide-down md:max-w-md md:left-auto md:right-4">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-3">
                <h3 className="font-bold text-lg mb-1">安装发票助手应用</h3>
                <p className="text-sm opacity-90">
                  将应用安装到主屏幕，获得更好的使用体验
                </p>
              </div>
              <button
                onClick={() => setIsInstallable(false)}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="btn btn-sm btn-secondary flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                立即安装
              </button>
              <button
                onClick={() => setIsInstallable(false)}
                className="btn btn-sm btn-ghost"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 离线就绪提示 */}
      {offlineReady && (
        <div className="toast toast-bottom toast-center z-50">
          <div className="alert alert-success">
            <span>应用已准备好离线使用！</span>
            <button
              onClick={closeUpdatePrompt}
              className="btn btn-ghost btn-sm"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* 更新提示 */}
      {needRefresh && (
        <div className="fixed bottom-4 left-4 right-4 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 md:max-w-md md:left-auto md:right-4">
          <div className="p-4">
            <div className="flex items-center mb-2">
              <RefreshCw className="w-5 h-5 text-info mr-2" />
              <h3 className="font-bold">有新版本可用</h3>
            </div>
            <p className="text-sm text-base-content/70 mb-3">
              发现新版本，点击更新以获得最新功能和改进
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="btn btn-primary btn-sm flex-1"
              >
                立即更新
              </button>
              <button
                onClick={closeUpdatePrompt}
                className="btn btn-ghost btn-sm"
              >
                忽略
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAManager;