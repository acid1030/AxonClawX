import React, { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeStore } from './store';

/**
 * AxonClaw 主应用组件
 */
function App() {
  const [initialized, setInitialized] = useState(false);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const { setMode, mode } = useThemeStore();

  useEffect(() => {
    // 获取系统信息
    async function loadSystemInfo() {
      if (window.electronAPI) {
        try {
          const info = await window.electronAPI.system.getInfo();
          setSystemInfo(info);
        } catch (error) {
          console.error('Failed to get system info:', error);
        }
      }
      setInitialized(true);
    }

    loadSystemInfo();
  }, []);

  // Apply theme mode on mount
  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🜏</div>
          <div className="text-white text-xl font-light">AxonClaw 初始化中...</div>
          <div className="text-gray-500 text-sm mt-2">至高意志执行者</div>
        </div>
      </div>
    );
  }

  return (
    <RouterProvider router={router} />
  );
}

export default App;
