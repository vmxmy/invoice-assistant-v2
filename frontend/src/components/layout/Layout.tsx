import React from 'react';
import AppNavbar from './AppNavbar';

interface LayoutProps {
  children: React.ReactNode;
  useNewNavbar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, useNewNavbar = true }) => {
  return (
    <div className="min-h-screen bg-base-200">
      {useNewNavbar ? <AppNavbar /> : null}
      <main className={useNewNavbar ? '' : 'pt-0'}>
        {children}
      </main>
    </div>
  );
};

export default Layout;