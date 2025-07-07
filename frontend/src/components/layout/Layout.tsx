import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
};

export default Layout;