import React from 'react';
import AppNavbar from './AppNavbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-base-200">
      <AppNavbar />
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;