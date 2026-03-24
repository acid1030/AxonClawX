import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore, useUserStore } from './store';
import ThemeToggle from './components/theme/ThemeToggle';

interface MainLayoutProps {
  systemInfo?: any;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ systemInfo }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, color } = useThemeStore();
  const { name, isLoggedIn } = useUserStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Theme color classes
  const themeColorClasses: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
  };

  const activeClass = `bg-gradient-to-r ${themeColorClasses[color]} text-white shadow-lg`;

  const navItems = [
    { id: 'home', label: '首页', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', path: '/' },
    { id: 'memory', label: '记忆', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', path: '/memory' },
    { id: 'channels', label: 'Channel', icon: 'M4.9 19.1c1-1 2.2-2.2 3.4-3.4M2 12a10 10 0 0 1 10-10M2 12a10 10 0 0 0 10 10M19.1 4.9c-1 1-2.2 2.2-3.4 3.4M22 12a10 10 0 0 0-10-10M22 12a10 10 0 0 1-10 10', path: '/channels' },
    { id: 'agents', label: '多 Agent', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', path: '/agents' },
    { id: 'content', label: '内容工厂', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', path: '/content' },
    { id: 'settings', label: '设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', path: '/settings' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // Get current path for breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return [{ label: '首页', path: '/' }];
    
    const currentNav = navItems.find(item => item.path === path);
    if (currentNav) {
      return [
        { label: '首页', path: '/' },
        { label: currentNav.label, path: path }
      ];
    }
    
    return [{ label: '首页', path: '/' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className={`h-screen flex ${mode === 'dark' ? 'dark' : ''} bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950`}>
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 glass border-r border-white/10 transition-all duration-500 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-16'
        } ${isMobile ? 'fixed h-full z-50' : ''}`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
            {isSidebarOpen && (
              <span className="text-lg font-bold gradient-text animate-in fade-in duration-300">🜏 AxonClaw</span>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform duration-500 ${
                  isSidebarOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${
                    isActive
                      ? activeClass
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  {isSidebarOpen && (
                    <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">
                      {item.label}
                    </span>
                  )}
                  {isActive && isSidebarOpen && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          {isSidebarOpen && (
            <div className="p-4 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeColorClasses[color]} flex items-center justify-center text-white font-bold shadow-lg transition-transform duration-300 hover:scale-105`}>
                  🜏
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {name || 'User'}
                  </div>
                  <div className="text-xs text-green-400 truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {isLoggedIn ? '在线' : '离线'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-slate-950/50 via-transparent to-indigo-950/50">
        {/* Top Bar */}
        <div className="h-14 flex-shrink-0 flex items-center justify-between px-6 glass border-b border-white/10">
          <div className="flex items-center gap-4">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && (
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`transition-colors ${
                      index === breadcrumbs.length - 1
                        ? 'text-white font-medium'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400 hidden md:block">
              {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Notifications */}
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors relative group">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto animate-in fade-in duration-300">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
