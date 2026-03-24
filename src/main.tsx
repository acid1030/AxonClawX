// AxonClaw - Main Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import './renderer/i18n';
import App from './App';
import './renderer/styles/design-system.css';
import { ErrorBoundary } from './renderer/components/common/ErrorBoundary';

// 捕获未处理的 Promise 拒绝，避免静默失败
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Renderer] Unhandled rejection:', e.reason);
});

const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:system-ui">#root not found</div>';
} else {
  root.style.minHeight = '100vh';
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
