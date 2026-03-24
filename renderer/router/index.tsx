import React from 'react';
import { createBrowserRouter, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../MainLayout';
import MemoryView from '../views/MemoryView';
import MultiAgentView from '../views/MultiAgentView';
import ContentFactoryView from '../views/ContentFactoryView';
import ChatView from '../views/ChatView';
import { ChannelManagementView } from '../channels/ChannelManagementView';

// Home Dashboard Component
const HomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">🜏 AxonClaw</h1>
        <p className="text-gray-400">至高意志执行者 · 逻辑化身</p>
      </div>
      
      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass rounded-xl p-6 card-hover">
          <div className="text-gray-400 text-sm mb-2">系统状态</div>
          <div className="text-2xl font-bold text-green-400">● 运行中</div>
        </div>
        <div className="glass rounded-xl p-6 card-hover">
          <div className="text-gray-400 text-sm mb-2">平台</div>
          <div className="text-2xl font-bold">Darwin</div>
        </div>
        <div className="glass rounded-xl p-6 card-hover">
          <div className="text-gray-400 text-sm mb-2">Electron</div>
          <div className="text-2xl font-bold">32.2.0</div>
        </div>
        <div className="glass rounded-xl p-6 card-hover">
          <div className="text-gray-400 text-sm mb-2">架构</div>
          <div className="text-2xl font-bold">arm64</div>
        </div>
      </div>

      {/* 快速入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => navigate('/memory')}
          className="glass rounded-xl p-6 card-hover text-left group"
        >
          <div className="text-3xl mb-3">🧠</div>
          <h3 className="text-lg font-semibold mb-2 group-hover:text-indigo-400 transition-colors">向量记忆</h3>
          <p className="text-gray-400 text-sm">ChromaDB 驱动的语义记忆系统</p>
        </button>
        <button 
          onClick={() => navigate('/agents')}
          className="glass rounded-xl p-6 card-hover text-left group"
        >
          <div className="text-3xl mb-3">🤖</div>
          <h3 className="text-lg font-semibold mb-2 group-hover:text-indigo-400 transition-colors">多 Agent 协作</h3>
          <p className="text-gray-400 text-sm">工作流编排与任务分发</p>
        </button>
        <button 
          onClick={() => navigate('/content')}
          className="glass rounded-xl p-6 card-hover text-left group"
        >
          <div className="text-3xl mb-3">📝</div>
          <h3 className="text-lg font-semibold mb-2 group-hover:text-indigo-400 transition-colors">内容工厂</h3>
          <p className="text-gray-400 text-sm">AI 驱动的多平台内容生成</p>
        </button>
      </div>
    </div>
  );
};

// Settings Component
const SettingsView: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">设置</h1>
      <div className="glass rounded-xl p-6">
        <p className="text-gray-400">设置面板开发中...</p>
      </div>
    </div>
  );
};

// Route Guard Component
interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, requireAuth = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // TODO: Implement actual authentication check when auth system is ready
  const isAuthenticated = true;
  
  React.useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [requireAuth, isAuthenticated, navigate, location]);
  
  return <>{children}</>;
};

// Route definitions
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <RouteGuard>
            <HomeDashboard />
          </RouteGuard>
        ),
      },
      {
        path: 'memory',
        element: (
          <RouteGuard>
            <MemoryView />
          </RouteGuard>
        ),
      },
      {
        path: 'agents',
        element: (
          <RouteGuard>
            <MultiAgentView />
          </RouteGuard>
        ),
      },
      {
        path: 'chat',
        element: (
          <RouteGuard>
            <ChatView />
          </RouteGuard>
        ),
      },
      {
        path: 'content',
        element: (
          <RouteGuard>
            <ContentFactoryView />
          </RouteGuard>
        ),
      },
      {
        path: 'channels',
        element: (
          <RouteGuard>
            <ChannelManagementView />
          </RouteGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RouteGuard>
            <SettingsView />
          </RouteGuard>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;
