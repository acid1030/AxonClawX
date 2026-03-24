import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// 初始化数据库
async function initializeApp() {
  if (window.electronAPI) {
    try {
      await window.electronAPI.db.initialize();
      console.log('[AxonClaw] Database initialized');
    } catch (error) {
      console.error('[AxonClaw] Database initialization failed:', error);
    }
  }
}

// 启动应用
initializeApp().then(() => {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
