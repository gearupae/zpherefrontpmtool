import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import FloatingChatWidget from '../Chat/FloatingChatWidget';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [routeProgress, setRouteProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    // Trigger a lightweight top progress bar on route changes
    setShowProgress(true);
    setRouteProgress(10);
    const t1 = setTimeout(() => setRouteProgress(60), 120);
    const t2 = setTimeout(() => setRouteProgress(85), 260);
    const t3 = setTimeout(() => {
      setRouteProgress(100);
      // Briefly show completed state, then hide and reset
      setTimeout(() => {
        setShowProgress(false);
        setRouteProgress(0);
      }, 200);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="min-h-screen muted-bg">
      {/* Top route progress bar */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
          <div
            className="h-0.5 bg-blue-500 transition-all duration-200"
            style={{ width: `${routeProgress}%` }}
          />
        </div>
      )}
      <Header />
      <main className="page-container space-y-6">
        {children}
      </main>
      <FloatingChatWidget />
    </div>
  );
};

export default Layout;
