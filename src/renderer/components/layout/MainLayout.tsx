/**
 * AxonClaw - Main Layout (Redesigned)
 * macOS 风格可收缩侧边栏 + 浮动右侧面板
 */

import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings';
import { loadLocale } from '@/axonclawx/locales';
import { hostApiFetch } from '@/lib/host-api';
import { ChatView } from '@/components/chat/ChatView';
import { UnifiedSidebar } from '@/components/Sidebar/UnifiedSidebar';
import { FloatingPanel } from '@/components/Panel/FloatingPanel';
import { PanelContent } from '@/components/Panel/PanelContent';
import { PanelTrigger } from '@/components/Panel/PanelTrigger';
import { useGatewayStore } from '@/stores/gateway';
const lockLogo = '/icon.png';

const HomeView = lazy(() => import('@/views/HomeView').then((m) => ({ default: m.HomeView })));
const DashboardView = lazy(() => import('@/views/DashboardView').then((m) => ({ default: m.DashboardView })));
const AgentsView = lazy(() => import('@/views/AgentsView').then((m) => ({ default: m.AgentsView })));
const Skills = lazy(() => import('@/pages/Skills').then((m) => ({ default: m.Skills })));
const Scheduler = lazy(() => import('@/axonclawx/windows/Scheduler'));
const Nodes = lazy(() => import('@/axonclawx/windows/Nodes'));
const UsageView = lazy(() => import('@/views/UsageView').then((m) => ({ default: m.UsageView })));
const SystemView = lazy(() => import('@/views/SystemView').then((m) => ({ default: m.SystemView })));
const DiagnosticsView = lazy(() => import('@/views/DiagnosticsView').then((m) => ({ default: m.DiagnosticsView })));
const KnowledgeView = lazy(() => import('@/views/KnowledgeView').then((m) => ({ default: m.KnowledgeView })));
const ActivityMonitorView = lazy(() => import('@/views/ActivityMonitorView').then((m) => ({ default: m.ActivityMonitorView })));
const IntelligenceManagementView = lazy(() => import('@/views/IntelligenceManagementView').then((m) => ({ default: m.IntelligenceManagementView })));
const AgentOrchestrationCanvasView = lazy(() => import('@/views/AgentOrchestrationCanvasView').then((m) => ({ default: m.AgentOrchestrationCanvasView })));
const InstallationWizardView = lazy(() => import('@/views/InstallationWizardView').then((m) => ({ default: m.InstallationWizardView })));
const ConfigurationCenterView = lazy(() => import('@/views/ConfigurationCenterView').then((m) => ({ default: m.ConfigurationCenterView })));
const UsageWizardView = lazy(() => import('@/views/UsageWizardView').then((m) => ({ default: m.UsageWizardView })));
const GatewayMonitoringView = lazy(() => import('@/views/GatewayMonitoring/GatewayMonitoringView').then((m) => ({ default: m.GatewayMonitoringView })));
const TasksView = lazy(() => import('@/views/TasksView').then((m) => ({ default: m.TasksView })));
const ResourceLibraryView = lazy(() => import('@/views/ResourceLibraryView').then((m) => ({ default: m.ResourceLibraryView })));

class RenderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[MainLayout] render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-[#0f172a] text-white p-6">
          <div className="max-w-2xl w-full rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
            <div className="text-sm font-semibold text-rose-200 mb-2">页面渲染失败</div>
            <div className="text-xs text-rose-100/90 break-words whitespace-pre-wrap">
              {this.state.message || 'Unknown render error'}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ADVANCED_ROUTE_TO_VISIBILITY_KEY: Record<string, 'agentConfig' | 'knowledge' | 'cron' | 'nodes' | 'monitor'> = {
  'agent-config': 'agentConfig',
  knowledge: 'knowledge',
  cron: 'cron',
  nodes: 'nodes',
  'system-monitor': 'monitor',
};
const FORCE_SETUP_WIZARD_KEY = 'clawx.force-setup-wizard';
const FORCE_SETUP_WIZARD_ALWAYS = false;

const ViewLoadingFallback: React.FC = () => (
  <div className="flex h-full min-h-0 items-center justify-center text-sm text-white/50">
    Loading...
  </div>
);

const MainLayout: React.FC = () => {
  const [activeNav, setActiveNav] = useState('chat');
  const [forceSetupWizard, setForceSetupWizard] = useState<boolean>(() => {
    if (FORCE_SETUP_WIZARD_ALWAYS) return true;
    try {
      const current = window.localStorage.getItem(FORCE_SETUP_WIZARD_KEY);
      if (current == null) {
        // Default to forcing setup wizard until user finishes once.
        window.localStorage.setItem(FORCE_SETUP_WIZARD_KEY, '1');
        return true;
      }
      return current === '1';
    } catch {
      return false;
    }
  });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [monitorTab, setMonitorTab] = useState<'network' | 'activity' | 'usage' | 'health'>('network');
  const [settingsReady, setSettingsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUsername, setLockUsername] = useState('admin');
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [lockNow, setLockNow] = useState(() => new Date());
  const { t } = useTranslation();
  const lastLanguageSyncAtRef = useRef(0);

  // Get connection status from gateway store
  const gatewayStatus = useGatewayStore((state) => state.status);
  const isConnected = gatewayStatus.state === 'running';

  const language = useSettingsStore((s) => s.language);
  const theme = useSettingsStore((s) => s.theme);
  const setupComplete = useSettingsStore((s) => s.setupComplete);
  const featureVisibility = useSettingsStore((s) => s.featureVisibility);
  const applyLanguageFromExternal = useSettingsStore((s) => s.applyLanguageFromExternal);
  const initSettings = useSettingsStore((s) => s.init);

  const resolveAllowedView = (view: string): string => {
    const key = ADVANCED_ROUTE_TO_VISIBILITY_KEY[view];
    if (!key) return view;
    const canOpenAdvanced =
      !featureVisibility.simpleMode &&
      featureVisibility.showAdvanced &&
      featureVisibility.items[key];
    return canOpenAdvanced ? view : 'overview';
  };

  const navigateTo = (view: string) => {
    if (view === 'usage-wizard') {
      setForceSetupWizard(false);
    }
    setActiveNav(resolveAllowedView(view));
  };

  // Initialize settings from config file on mount
  useEffect(() => {
    let stopped = false;
    void initSettings()
      .catch(console.error)
      .finally(() => {
        if (!stopped) setSettingsReady(true);
      });
    return () => {
      stopped = true;
    };
  }, [initSettings]);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const systemDark = media?.matches ?? false;
      const isDark = theme === 'dark' || (theme === 'system' && systemDark);
      root.classList.toggle('dark', isDark);
    };

    applyTheme();
    if (!media) return;

    const onSystemThemeChange = () => {
      if (theme === 'system') applyTheme();
    };

    media.addEventListener?.('change', onSystemThemeChange);
    return () => media.removeEventListener?.('change', onSystemThemeChange);
  }, [theme]);

  // Initialize gateway on mount
  useEffect(() => {
    const { init } = useGatewayStore.getState();
    init().catch(console.error);
  }, []);

  useEffect(() => {
    let stopped = false;
    const syncLockStatus = async () => {
      try {
        const data = await hostApiFetch<{ locked?: boolean }>('/api/auth/lock/status');
        if (!stopped) setIsLocked(Boolean(data?.locked));
      } catch {
        // ignore
      }
    };
    void syncLockStatus();
    return () => {
      stopped = true;
    };
  }, []);

  useEffect(() => {
    if (!isLocked) return;
    const timer = window.setInterval(() => setLockNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [isLocked]);

  // 预加载配置中心 locale，确保中文等非英文语言能正确显示
  useEffect(() => {
    if (language === 'en') return;
    const lang = language?.toLowerCase?.() || '';
    if (lang.startsWith('zh-tw')) {
      loadLocale('zh-TW').catch(() => {});
    } else if (lang.startsWith('zh')) {
      loadLocale('zh').catch(() => {});
    } else if (['ja', 'ko', 'es', 'pt-BR', 'de', 'fr', 'ru', 'ar', 'hi', 'id'].includes(lang)) {
      loadLocale(lang as any).catch(() => {});
    }
  }, [language]);

  // Keep global UI language synced with backend settings (including changes made in Configuration Center).
  const syncLanguageFromBackend = useCallback(async (minIntervalMs = 5000) => {
    const now = Date.now();
    if (now - lastLanguageSyncAtRef.current < minIntervalMs) return;
    lastLanguageSyncAtRef.current = now;
    try {
      const settings = await hostApiFetch<{ language?: string }>('/api/settings');
      const remote = String(settings?.language ?? '').trim();
      if (remote) applyLanguageFromExternal(remote);
    } catch {
      // ignore sync failures
    }
  }, [applyLanguageFromExternal]);

  useEffect(() => {
    let stopped = false;
    const safeSync = async (minIntervalMs = 5000) => {
      if (stopped) return;
      await syncLanguageFromBackend(minIntervalMs);
    };

    void safeSync(0); // first paint sync

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void safeSync(1000);
    };
    const onFocus = () => void safeSync(1000);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    // Low-frequency fallback sync to avoid stale state
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void safeSync(30000);
    }, 30000);

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [syncLanguageFromBackend]);

  // Handle Cmd/Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPanelOpen(!isPanelOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

  useEffect(() => {
    const safeView = resolveAllowedView(activeNav);
    if (safeView !== activeNav) {
      setActiveNav(safeView);
    }
  }, [activeNav, featureVisibility]);

  const renderContent = () => {
    switch (activeNav) {
      case 'overview':
        return <HomeView onNavigateTo={navigateTo} />;
      case 'chat':
        return <ChatView />;
      case 'tasks':
        return <TasksView />;
      case 'channel-config':
        return <ConfigurationCenterView pendingSection="channels" minimal />;
      case 'model-config':
        return <ConfigurationCenterView pendingSection="models" />;
      case 'agent-config':
        return <AgentsView />;
      case 'agent-hub':
        return <AgentOrchestrationCanvasView onNavigateTo={navigateTo} />;
      case 'agent-orchestration':
        return <IntelligenceManagementView />;
      case 'skill-config':
        return <Skills onNavigateTo={navigateTo} />;
      case 'resource-library':
        return <ResourceLibraryView />;
      case 'knowledge':
        return <KnowledgeView />;
      case 'cron':
        return <Scheduler language={language as any} />;
      case 'nodes':
        return <Nodes language={language as any} />;
      case 'system-monitor': {
        const monitorTabs = [
          { key: 'network', label: t('tabs.network', { ns: 'monitor' }) },
          { key: 'activity', label: t('tabs.activity', { ns: 'monitor' }) },
          { key: 'usage', label: t('tabs.usage', { ns: 'monitor' }) },
          { key: 'health', label: t('tabs.health', { ns: 'monitor' }) },
        ] as const;
        return (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-white/10 flex items-center gap-2 flex-wrap">
              {monitorTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMonitorTab(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-sm ${monitorTab === tab.key ? 'bg-white/15 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {monitorTab === 'network' && <GatewayMonitoringView />}
              {monitorTab === 'activity' && <ActivityMonitorView onNavigateTo={navigateTo} />}
              {monitorTab === 'usage' && <UsageView />}
              {monitorTab === 'health' && <DiagnosticsView standalone onNavigateTo={navigateTo} />}
            </div>
          </div>
        );
      }
      case 'system-config':
        return <SystemView onNavigateTo={navigateTo} />;
      default:
        return <DashboardView />;
    }
  };

  const handleLock = async () => {
    try {
      await hostApiFetch('/api/auth/lock', { method: 'POST' });
      setIsLocked(true);
      setLockPassword('');
      setLockError('');
      setLockNow(new Date());
    } catch (err) {
      setLockError(String(err));
    }
  };

  const handleUnlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lockUsername.trim() || !lockPassword) return;
    setUnlocking(true);
    setLockError('');
    try {
      await hostApiFetch('/api/auth/unlock', {
        method: 'POST',
        body: JSON.stringify({
          username: lockUsername.trim(),
          password: lockPassword,
        }),
      });
      setIsLocked(false);
      setLockPassword('');
      setLockError('');
    } catch {
      setLockError(t('lockScreen.invalid'));
    } finally {
      setUnlocking(false);
    }
  };

  const dateLocale = language?.toLowerCase?.().startsWith('zh') ? 'zh-CN' : 'en-US';

  if (!settingsReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a] text-white">
        <div className="text-sm text-white/60">Loading...</div>
      </div>
    );
  }

  if (forceSetupWizard || !setupComplete) {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <InstallationWizardView onNavigateTo={navigateTo} />
      </Suspense>
    );
  }

  if (activeNav === 'usage-wizard') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <UsageWizardView onNavigateTo={navigateTo} />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden">
      {/* Unified Sidebar */}
      <UnifiedSidebar
        activeView={activeNav}
        onViewChange={navigateTo}
        onLock={handleLock}
      />

      {/* Main Content - 左右边距 10px；min-h-0 + flex 确保健康中心等页面的滚动区域正确计算高度 */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden px-[10px] w-full min-w-0">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <RenderErrorBoundary>
            <Suspense fallback={<ViewLoadingFallback />}>
              {renderContent()}
            </Suspense>
          </RenderErrorBoundary>
        </div>
      </main>

      {/* Floating Panel */}
      <FloatingPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      >
        <PanelContent />
      </FloatingPanel>

      {/* Panel Trigger Button */}
      <PanelTrigger
        isOpen={isPanelOpen}
        onClick={() => setIsPanelOpen(true)}
      />

      {/* Connection Status Indicator */}
      <div
        className={`
          fixed top-4 right-4 z-20
          w-3 h-3 rounded-full
          ${isConnected ? 'bg-green-400' : 'bg-red-400'}
          animate-pulse
        `}
        title={isConnected ? t('online', { ns: 'gateway' }) : t('offline', { ns: 'gateway' })}
      />

      {isLocked && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-[#030816]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.28),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(99,102,241,0.24),transparent_45%)] blur-2xl" />
          <div className="absolute inset-0 bg-black/35" />

          <div className="relative z-10 h-full w-full flex flex-col items-center justify-between py-10 px-6">
            <div className="text-center mt-8 select-none">
              <div className="text-white text-[84px] leading-none font-thin tracking-tight">
                {lockNow.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
              <div className="text-white/90 text-xl mt-2 font-medium">
                {lockNow.toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className={`w-full max-w-sm mb-20 ${lockError ? 'lock-shake' : ''}`}>
              <div className="mx-auto mb-5 w-32 h-32 rounded-full border border-white/30 bg-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl overflow-hidden">
                <img
                  src={lockLogo}
                  alt="AxonClawX"
                  className="w-[100px] h-[100px] object-contain drop-shadow-md"
                />
              </div>

              <form
                onSubmit={handleUnlock}
                className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl p-6"
              >
                <h2 className="text-white text-lg font-semibold text-center">{t('lockScreen.title')}</h2>
                <p className="text-white/70 text-sm mt-1 mb-5 text-center">{t('lockScreen.subtitle')}</p>

                <div className="space-y-3">
                  <input
                    value={lockUsername}
                    onChange={(ev) => setLockUsername(ev.target.value)}
                    placeholder={t('lockScreen.username')}
                    className="w-full h-11 rounded-xl px-4 bg-black/25 border border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    autoFocus
                  />
                  <input
                    type="password"
                    value={lockPassword}
                    onChange={(ev) => setLockPassword(ev.target.value)}
                    placeholder={t('lockScreen.password')}
                    className="w-full h-11 rounded-xl px-4 bg-black/25 border border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                  {lockError && <p className="text-xs text-rose-300 text-center">{lockError}</p>}
                  <button
                    type="submit"
                    disabled={unlocking}
                    className="w-full h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-[#062131] font-semibold transition-colors"
                  >
                    {unlocking ? t('lockScreen.loggingIn') : t('lockScreen.login')}
                  </button>
                </div>
              </form>
            </div>

            <div className="text-white/35 text-[11px] font-mono">AxonClawX</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lock-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .lock-shake {
          animation: lock-shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
