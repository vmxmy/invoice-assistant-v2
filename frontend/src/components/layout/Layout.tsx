import React from 'react';
import AppNavbar from './AppNavbar';
import { VersionDisplay } from '../common/VersionDisplay';

interface LayoutProps {
  children: React.ReactNode;
  useNewNavbar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, useNewNavbar = true }) => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {useNewNavbar ? <AppNavbar /> : null}
      <main className={`flex-1 ${useNewNavbar ? '' : 'pt-0'}`}>
        {children}
      </main>
      
      {/* 版本信息显示 */}
      <footer className="bg-base-300/50 px-4 py-2 mt-auto">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xs text-base-content/60">
            © 2024 发票助手 - 智能发票管理系统
          </div>
          <VersionDisplay position="footer" />
        </div>
      </footer>
      
      {/* 右下角版本快捷显示(可选) */}
      <VersionDisplay position="corner" className="lg:hidden" />
    </div>
  );
};

export default Layout;