/**
 * Setup Wizard Page
 * First-time setup experience for new users
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Server,
  Globe2,
} from 'lucide-react';
// TitleBar 可选：Electron 无边框窗口时使用
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { toast } from 'sonner';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { subscribeHostEvent } from '@/lib/host-events';
interface SetupStep {
  id: string;
  title: string;
  description: string;
}

const STEP = {
  WELCOME: 0,
  RUNTIME: 1,
  PROVIDER: 2,
  INSTALLING: 3,
  COMPLETE: 4,
} as const;

const getSteps = (t: TFunction): SetupStep[] => [
  {
    id: 'welcome',
    title: t('steps.welcome.title'),
    description: t('steps.welcome.description'),
  },
  {
    id: 'runtime',
    title: t('steps.runtime.title'),
    description: t('steps.runtime.description'),
  },
  {
    id: 'provider',
    title: t('steps.provider.title'),
    description: t('steps.provider.description'),
  },
  {
    id: 'installing',
    title: t('steps.installing.title'),
    description: t('steps.installing.description'),
  },
  {
    id: 'complete',
    title: t('steps.complete.title'),
    description: t('steps.complete.description'),
  },
];

// Default skills to auto-install (no additional API keys required)
interface DefaultSkill {
  id: string;
  name: string;
  description: string;
}

const getDefaultSkills = (t: TFunction): DefaultSkill[] => [
  { id: 'opencode', name: t('defaultSkills.opencode.name'), description: t('defaultSkills.opencode.description') },
  { id: 'python-env', name: t('defaultSkills.python-env.name'), description: t('defaultSkills.python-env.description') },
  { id: 'code-assist', name: t('defaultSkills.code-assist.name'), description: t('defaultSkills.code-assist.description') },
  { id: 'file-tools', name: t('defaultSkills.file-tools.name'), description: t('defaultSkills.file-tools.description') },
  { id: 'terminal', name: t('defaultSkills.terminal.name'), description: t('defaultSkills.terminal.description') },
];

import {
  SETUP_PROVIDERS,
  type ProviderAccount,
  type ProviderType,
  type ProviderTypeInfo,
  getProviderDocsUrl,
  getProviderIconUrl,
  resolveProviderApiKeyForSave,
  resolveProviderModelForSave,
  shouldInvertInDark,
  shouldShowProviderModelId,
} from '@/lib/providers';
import {
  buildProviderAccountId,
  fetchProviderSnapshot,
  hasConfiguredCredentials,
  pickPreferredAccount,
} from '@/lib/provider-accounts';
// 使用 public 目录下的方形 app 图标（从 icon.icns 提取的 PNG）
const clawxIcon = '/icon.png';

// Use the shared provider registry for setup providers
const providers = SETUP_PROVIDERS;

function getProtocolBaseUrlPlaceholder(
  apiProtocol: ProviderAccount['apiProtocol'],
): string {
  if (apiProtocol === 'anthropic-messages') {
    return 'https://api.example.com/anthropic';
  }
  return 'https://api.example.com/v1';
}

// NOTE: Channel types moved to Settings > Channels page
// NOTE: Skill bundles moved to Settings > Skills page - auto-install essential skills during setup

export interface SetupWizardContentProps {
  onComplete: () => void;
  showTitleBar?: boolean;
}

/** 共享安装向导内容，供 Setup 页与 InstallationWizardView 使用 */
export function SetupWizardContent({ onComplete, showTitleBar = false }: SetupWizardContentProps) {
  const { t } = useTranslation(['setup', 'channels']);
  const [currentStep, setCurrentStep] = useState<number>(STEP.WELCOME);

  // Setup state
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  // Installation state for the Installing step
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  // Runtime check status
  const [runtimeChecksPassed, setRuntimeChecksPassed] = useState(false);
  const providerAutoAdvancedRef = useRef(false);

  const steps = getSteps(t);
  const safeStepIndex = Number.isInteger(currentStep)
    ? Math.min(Math.max(currentStep, STEP.WELCOME), steps.length - 1)
    : STEP.WELCOME;
  const step = steps[safeStepIndex] ?? steps[STEP.WELCOME];
  const isFirstStep = safeStepIndex === STEP.WELCOME;
  const isLastStep = safeStepIndex === steps.length - 1;

  // Derive canProceed based on current step - computed directly to avoid useEffect
  const canProceed = useMemo(() => {
    switch (safeStepIndex) {
      case STEP.WELCOME:
        return true;
      case STEP.RUNTIME:
        return runtimeChecksPassed;
      case STEP.PROVIDER:
        return providerConfigured;
      case STEP.INSTALLING:
        return false; // Cannot manually proceed, auto-proceeds when done
      case STEP.COMPLETE:
        return true;
      default:
        return true;
    }
  }, [safeStepIndex, providerConfigured, runtimeChecksPassed]);

  const handleNext = async () => {
    if (isLastStep) {
      toast.success(t('complete.title'));
      onComplete();
    } else {
      setCurrentStep((i) => i + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((i) => Math.max(i - 1, 0));
  };

  const handleSkip = () => {
    onComplete();
  };

  useEffect(() => {
    if (safeStepIndex === STEP.PROVIDER && providerConfigured && !providerAutoAdvancedRef.current) {
      providerAutoAdvancedRef.current = true;
      setTimeout(() => {
        setCurrentStep((i) => Math.min(i + 1, steps.length - 1));
      }, 300);
      return;
    }
    if (safeStepIndex !== STEP.PROVIDER || !providerConfigured) {
      providerAutoAdvancedRef.current = false;
    }
  }, [providerConfigured, safeStepIndex, steps.length]);

  // Auto-proceed when installation is complete
  const handleInstallationComplete = useCallback((skills: string[]) => {
    setInstalledSkills(skills);
    // Auto-proceed to next step after a short delay
    setTimeout(() => {
      setCurrentStep((i) => i + 1);
    }, 1000);
  }, []);


  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {showTitleBar && (
        <div className="h-8 shrink-0 bg-[#0f172a] border-b border-white/5 flex items-center px-4">
          <span className="text-sm font-medium text-white/80">AxonClawX 安装向导</span>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {/* Progress Indicator */}
        <div className="flex justify-center pt-8">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                    i < safeStepIndex
                      ? 'border-primary bg-primary text-primary-foreground'
                      : i === safeStepIndex
                        ? 'border-primary text-primary'
                        : 'border-slate-600 text-slate-600'
                  )}
                >
                  {i < safeStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm">{i + 1}</span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-8 transition-colors',
                      i < safeStepIndex ? 'bg-primary' : 'bg-slate-600'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mx-auto max-w-2xl p-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">{t(`steps.${step.id}.title`)}</h1>
              <p className="text-slate-400">{t(`steps.${step.id}.description`)}</p>
            </div>

            {/* Step-specific content */}
            <div className="rounded-xl bg-card text-card-foreground border shadow-sm p-8 mb-8">
              {safeStepIndex === STEP.WELCOME && <WelcomeContent />}
              {safeStepIndex === STEP.RUNTIME && <RuntimeContent onStatusChange={setRuntimeChecksPassed} />}
              {safeStepIndex === STEP.PROVIDER && (
                <ProviderContent
                  providers={providers}
                  selectedProvider={selectedProvider}
                  onSelectProvider={setSelectedProvider}
                  apiKey={apiKey}
                  onApiKeyChange={setApiKey}
                  onConfiguredChange={setProviderConfigured}
                />
              )}
              {safeStepIndex === STEP.INSTALLING && (
                <InstallingContent
                  skills={getDefaultSkills(t)}
                  onComplete={handleInstallationComplete}
                  onSkip={() => setCurrentStep((i) => i + 1)}
                />
              )}
              {safeStepIndex === STEP.COMPLETE && (
                <CompleteContent
                  selectedProvider={selectedProvider}
                  installedSkills={installedSkills}
                />
              )}
            </div>

            {/* Navigation - hidden during installation step */}
            {safeStepIndex !== STEP.INSTALLING && (
              <div className="flex justify-between">
                <div>
                  {!isFirstStep && (
                    <Button variant="ghost" onClick={handleBack}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      {t('nav.back')}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isLastStep && safeStepIndex !== STEP.RUNTIME && (
                    <Button variant="ghost" onClick={handleSkip}>
                      {t('nav.skipSetup')}
                    </Button>
                  )}
                  <Button onClick={handleNext} disabled={!canProceed}>
                    {isLastStep ? (
                      t('nav.getStarted')
                    ) : (
                      <>
                        {t('nav.next')}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==================== Setup Page (standalone with TitleBar) ====================

export function Setup() {
  const { t } = useTranslation('setup');
  const markSetupComplete = useSettingsStore((state) => state.markSetupComplete);

  return (
    <SetupWizardContent
      showTitleBar
      onComplete={() => {
        markSetupComplete();
        toast.success(t('complete.title'));
      }}
    />
  );
}

// ==================== Step Content Components ====================

function WelcomeContent() {
  const { t } = useTranslation(['setup', 'settings']);
  const { language, setLanguage } = useSettingsStore();

  return (
    <div className="text-center space-y-4">
      <div className="mb-4 flex justify-center">
        <img src={clawxIcon} alt="ClawX" className="h-16 w-16 rounded-xl" />
      </div>
      <h2 className="text-xl font-semibold">{t('welcome.title')}</h2>
      <p className="text-muted-foreground">
        {t('welcome.description')}
      </p>

      {/* Language Selector */}
      <div className="flex justify-center gap-2 py-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Button
            key={lang.code}
            variant={language === lang.code ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setLanguage(lang.code)}
            className="h-7 text-xs"
          >
            {lang.label}
          </Button>
        ))}
      </div>

      <ul className="text-left space-y-2 text-muted-foreground pt-2">
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          {t('welcome.features.noCommand')}
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          {t('welcome.features.modernUI')}
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          {t('welcome.features.bundles')}
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          {t('welcome.features.crossPlatform')}
        </li>
      </ul>
    </div>
  );
}

interface RuntimeContentProps {
  onStatusChange: (canProceed: boolean) => void;
}

function RuntimeContent({ onStatusChange }: RuntimeContentProps) {
  const { t, i18n } = useTranslation('setup');
  type SetupMode = 'local-existing' | 'remote-existing';
  type ScanData = {
    os: string;
    arch: string;
    local: {
      openClawInstalled: boolean;
      openClawVersion?: string;
      gatewayRunning: boolean;
      gatewayPort?: number;
      openclaw?: { path?: string };
      clawhub?: { installed: boolean; version?: string; path?: string };
      node?: { installed: boolean };
      npm?: { installed: boolean };
      git?: { installed: boolean };
    };
    remote?: {
      mode?: 'local' | 'remote';
      protocol?: 'ws' | 'wss';
      host?: string;
      port?: number;
      hasToken?: boolean;
    };
    cloudOptions: Array<{ id: string; name: string; description: string; docsUrl: string; command: string }>;
  };

  const [mode, setMode] = useState<SetupMode>('local-existing');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [localStarting, setLocalStarting] = useState(false);
  const [installingOpenClaw, setInstallingOpenClaw] = useState(false);
  const [remoteTesting, setRemoteTesting] = useState(false);
  const [remoteProtocol, setRemoteProtocol] = useState<'ws' | 'wss'>('ws');
  const [remoteHost, setRemoteHost] = useState('');
  const [remotePort, setRemotePort] = useState('18789');
  const [remoteToken, setRemoteToken] = useState('');
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [localConnected, setLocalConnected] = useState(false);
  const [recommendedMode, setRecommendedMode] = useState<SetupMode | null>(null);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanReady, setScanReady] = useState(false);
  const scanLogRef = useRef<HTMLDivElement | null>(null);

  const appendScanLog = useCallback((message: string) => {
    const locale = (i18n.language || '').toLowerCase().startsWith('zh') ? 'zh-CN' : undefined;
    const stamp = new Date().toLocaleTimeString(locale, { hour12: false });
    setScanLogs((prev) => {
      const next = [...prev, `[${stamp}] ${message}`];
      return next.length > 160 ? next.slice(next.length - 160) : next;
    });
  }, [i18n.language]);

  const getScanLogToneClass = useCallback((line: string) => {
    const text = line.toLowerCase();
    if (
      text.includes('failed')
      || text.includes('error')
      || text.includes('失败')
      || text.includes('异常')
    ) return 'text-rose-300 bg-rose-500/10';
    if (
      text.includes('done')
      || text.includes('completed')
      || text.includes('running')
      || text.includes('推荐')
      || text.includes('完成')
      || text.includes('检测到')
    ) return 'text-emerald-300 bg-emerald-500/10';
    if (
      text.includes('checking')
      || text.includes('detect')
      || text.includes('检查')
      || text.includes('检测')
      || text.includes('读取')
      || text.includes('probe')
    ) return 'text-cyan-300 bg-cyan-500/10';
    return 'text-slate-300 bg-slate-500/10';
  }, []);

  const refreshScan = useCallback(async () => {
    setScanLoading(true);
    setScanReady(false);
    setError('');
    setScanLogs([]);
    appendScanLog(t('runtime.detect.start', { defaultValue: '开始环境检测...' }));
    const progress = [
      t('runtime.detect.progressEnv', { defaultValue: '检测系统环境...' }),
      t('runtime.detect.progressOpenclaw', { defaultValue: '检查 OpenClaw 安装状态...' }),
      t('runtime.detect.progressGateway', { defaultValue: '探测 Gateway 连接状态...' }),
      t('runtime.detect.progressRemote', { defaultValue: '读取远程连接配置...' }),
    ];
    let idx = 0;
    const timer = window.setInterval(() => {
      appendScanLog(progress[idx % progress.length]);
      idx += 1;
    }, 500);
    try {
      const result = await invokeIpc<{ success: boolean; data?: ScanData }>('setup:scan-environment');
      if (!result?.success || !result?.data) {
        setError(t('runtime.status.error', { defaultValue: '环境扫描失败' }));
        appendScanLog(t('runtime.detect.failed', { defaultValue: '环境检测失败，请重试。' }));
        return;
      }
      setScanData(result.data);
      const localReady = result.data.local.openClawInstalled && result.data.local.gatewayRunning;
      setLocalConnected(localReady);
      appendScanLog(
        result.data.local.openClawInstalled
          ? t('runtime.detect.openclawInstalled', { version: result.data.local.openClawVersion || 'unknown', defaultValue: '检测到 OpenClaw: {{version}}' })
          : t('runtime.detect.openclawMissing', { defaultValue: '未检测到本地 OpenClaw 安装。' }),
      );
      appendScanLog(
        result.data.local.gatewayRunning
          ? t('runtime.detect.gatewayRunning', { port: result.data.local.gatewayPort || 'unknown', defaultValue: 'Gateway 运行中（端口 {{port}}）。' })
          : t('runtime.detect.gatewayStopped', { defaultValue: 'Gateway 当前未运行。' }),
      );
      const remote = result.data.remote;
      const remoteAvailable = !!remote?.host;
      if (remoteAvailable) {
        setRemoteProtocol(remote?.protocol === 'wss' ? 'wss' : 'ws');
        setRemoteHost(remote?.host || '');
        if (remote?.port) setRemotePort(String(remote.port));
        appendScanLog(t('runtime.detect.remoteFound', { host: remote?.host || '-', port: remote?.port || '-', defaultValue: '发现远程配置：{{host}}:{{port}}' }));
      } else {
        appendScanLog(t('runtime.detect.remoteMissing', { defaultValue: '未发现可用远程配置。' }));
      }
      const recommended: SetupMode = (localReady || !remoteAvailable)
        ? 'local-existing'
        : 'remote-existing';
      setRecommendedMode(recommended);
      const recommendedLabel = recommended === 'local-existing'
        ? t('runtime.modes.localConnection.title', { defaultValue: '本地连接' })
        : t('runtime.modes.remoteConnection.title', { defaultValue: '远程连接' });
      appendScanLog(t('runtime.detect.recommended', { mode: recommendedLabel, defaultValue: '推荐模式：{{mode}}' }));
      setMode((currentMode) => {
        if (currentMode === 'local-existing' && !result.data.local.openClawInstalled) {
          return remoteAvailable ? 'remote-existing' : 'local-existing';
        }
        return currentMode;
      });
      setScanReady(true);
      appendScanLog(t('runtime.detect.done', { defaultValue: '环境检测完成。' }));
    } catch (err) {
      setError(String(err));
      appendScanLog(`${t('runtime.detect.failed', { defaultValue: '环境检测失败，请重试。' })} ${String(err)}`);
    } finally {
      window.clearInterval(timer);
      setScanLoading(false);
    }
  }, [appendScanLog, t]);

  useEffect(() => {
    refreshScan();
  }, [refreshScan]);

  useEffect(() => {
    if (!scanReady || scanLoading || !scanData) {
      onStatusChange(false);
      return;
    }
    if (mode === 'local-existing') {
      onStatusChange(localConnected);
    } else if (mode === 'remote-existing') {
      onStatusChange(remoteConnected);
    } else {
      onStatusChange(false);
    }
  }, [mode, localConnected, onStatusChange, remoteConnected, scanData, scanLoading, scanReady]);

  useEffect(() => {
    if (!scanLogRef.current) return;
    scanLogRef.current.scrollTop = scanLogRef.current.scrollHeight;
  }, [scanLogs]);

  const handleConnectLocal = async () => {
    setActionLoading(true);
    setError('');
    appendScanLog(t('runtime.local.connecting', { defaultValue: '正在连接本地 Gateway...' }));
    try {
      const res = await invokeIpc<{
        success: boolean;
        error?: string;
        port?: number;
        logs?: string[];
        installedNow?: boolean;
      }>('setup:connect-local-gateway');
      if (Array.isArray(res?.logs)) {
        for (const line of res.logs.slice(-20)) appendScanLog(line);
      }
      if (!res?.success) {
        appendScanLog(t('runtime.local.connectFailed', { defaultValue: '本地 Gateway 连接失败' }));
        setError(res?.error || t('runtime.local.connectFailed', { defaultValue: '本地 Gateway 连接失败' }));
        return;
      }
      if (res.installedNow) {
        appendScanLog(t('runtime.local.installedNow', { defaultValue: 'OpenClaw 已自动安装完成。' }));
      }
      setLocalConnected(true);
      appendScanLog(t('runtime.local.connected', { port: res.port ?? 'unknown', defaultValue: '本地 Gateway 已连接（端口 {{port}}）' }));
      toast.success(t('runtime.local.connected', { port: res.port ?? 'unknown', defaultValue: '本地 Gateway 已连接（端口 {{port}}）' }));
      await refreshScan();
    } catch (err) {
      appendScanLog(`${t('runtime.local.connectFailed', { defaultValue: '本地 Gateway 连接失败' })} ${String(err)}`);
      setError(String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleInstallOpenClaw = async () => {
    setInstallingOpenClaw(true);
    setError('');
    appendScanLog(t('runtime.local.installingOpenclaw', { defaultValue: '未检测到 OpenClaw，正在执行智能安装...' }));
    try {
      const res = await invokeIpc<{ success: boolean; error?: string; logs?: string[]; port?: number }>('setup:install-local-openclaw');
      if (Array.isArray(res?.logs)) {
        for (const line of res.logs.slice(-30)) appendScanLog(line);
      }
      if (!res?.success) {
        setError(res?.error || t('runtime.local.installFailed', { defaultValue: 'OpenClaw 安装失败' }));
        appendScanLog(t('runtime.local.installFailed', { defaultValue: 'OpenClaw 安装失败' }));
        return;
      }
      appendScanLog(t('runtime.local.installSuccess', { defaultValue: 'OpenClaw 安装成功，Gateway 已就绪。' }));
      toast.success(t('runtime.local.installSuccess', { defaultValue: 'OpenClaw 安装成功，Gateway 已就绪。' }));
      await refreshScan();
    } catch (err) {
      setError(String(err));
      appendScanLog(`${t('runtime.local.installFailed', { defaultValue: 'OpenClaw 安装失败' })} ${String(err)}`);
    } finally {
      setInstallingOpenClaw(false);
    }
  };

  const handleStartLocalGateway = async () => {
    setLocalStarting(true);
    setError('');
    appendScanLog(t('runtime.local.starting', { defaultValue: '正在启动本地 Gateway...' }));
    try {
      const status = await invokeIpc<{
        state?: string;
        error?: string;
        diagnostics?: string[];
        logTail?: string[];
        selfHealTried?: boolean;
        selfHealSucceeded?: boolean;
      }>('gateway:start');
      if (status?.state === 'error') {
        appendScanLog(t('runtime.local.startFailed', { defaultValue: '本地 Gateway 启动失败' }));
        const diag = Array.isArray(status.diagnostics) && status.diagnostics.length > 0
          ? `\n\nDiagnostics:\n${status.diagnostics.map((line) => `- ${line}`).join('\n')}`
          : '';
        const tail = Array.isArray(status.logTail) && status.logTail.length > 0
          ? `\n\nRecent Logs:\n${status.logTail.slice(-30).join('\n')}`
          : '';
        setError(`${status.error || t('runtime.local.startFailed', { defaultValue: '本地 Gateway 启动失败' })}${diag}${tail}`);
        return;
      }
      appendScanLog(t('runtime.local.started', { defaultValue: '已启动本地 Gateway' }));
      toast.success(t('runtime.local.started', { defaultValue: '已启动本地 Gateway' }));
      await refreshScan();
    } catch (err) {
      appendScanLog(`${t('runtime.local.startFailed', { defaultValue: '本地 Gateway 启动失败' })} ${String(err)}`);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLocalStarting(false);
    }
  };

  const handleTestRemote = async () => {
    if (!remoteHost.trim() || !remotePort.trim()) return;
    setRemoteTesting(true);
    setError('');
    setRemoteConnected(false);
    appendScanLog(t('runtime.remote.testing', { host: remoteHost.trim(), port: remotePort.trim(), defaultValue: '正在测试远程连接 {{host}}:{{port}} ...' }));
    try {
      const res = await invokeIpc<{ success: boolean; error?: string }>('setup:test-remote-gateway', {
        protocol: remoteProtocol,
        host: remoteHost.trim(),
        port: Number(remotePort),
        token: remoteToken.trim(),
      });
      if (!res?.success) {
        appendScanLog(t('runtime.remote.unavailable', { defaultValue: '远程 Gateway 不可用' }));
        setError(res?.error || t('runtime.remote.unavailable', { defaultValue: '远程 Gateway 不可用' }));
        return;
      }
      setRemoteConnected(true);
      appendScanLog(t('runtime.remote.verified', { defaultValue: '远程 Gateway 验证成功' }));
      toast.success(t('runtime.remote.verified', { defaultValue: '远程 Gateway 验证成功' }));
    } catch (err) {
      appendScanLog(`${t('runtime.remote.unavailable', { defaultValue: '远程 Gateway 不可用' })} ${String(err)}`);
      setError(String(err));
    } finally {
      setRemoteTesting(false);
    }
  };

  const handleSaveRemote = async () => {
    if (!remoteConnected) {
      setError(t('runtime.remote.testFirst', { defaultValue: '请先测试远程连接' }));
      return;
    }
    setActionLoading(true);
    setError('');
    appendScanLog(t('runtime.remote.saving', { defaultValue: '正在保存远程连接配置...' }));
    try {
      const res = await invokeIpc<{ success: boolean; error?: string }>('setup:save-remote-gateway', {
        protocol: remoteProtocol,
        host: remoteHost.trim(),
        port: Number(remotePort),
        token: remoteToken.trim(),
      });
      if (!res?.success) {
        appendScanLog(t('runtime.remote.saveFailed', { defaultValue: '保存远程配置失败' }));
        setError(res?.error || t('runtime.remote.saveFailed', { defaultValue: '保存远程配置失败' }));
        return;
      }
      appendScanLog(t('runtime.remote.saved', { defaultValue: '远程连接已保存并启用' }));
      toast.success(t('runtime.remote.saved', { defaultValue: '远程连接已保存并启用' }));
    } catch (err) {
      appendScanLog(`${t('runtime.remote.saveFailed', { defaultValue: '保存远程配置失败' })} ${String(err)}`);
      setError(String(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('runtime.title', { defaultValue: '环境与连接' })}</h2>
        <Button variant="ghost" size="sm" onClick={refreshScan} disabled={scanLoading}>
          {scanLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {t('runtime.recheck', { defaultValue: '重新扫描' })}
        </Button>
      </div>

      <div className="rounded-lg border border-slate-500/30 bg-[#0b1220]/90 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
          {scanLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
          <span>
            {scanLoading
              ? t('runtime.detect.running', { defaultValue: '正在检测运行环境...' })
              : t('runtime.detect.finished', { defaultValue: '检测日志' })}
          </span>
        </div>
        <div ref={scanLogRef} className="max-h-44 overflow-auto rounded-md border border-slate-500/30 bg-[#070d18] p-2 font-mono text-[11px] leading-5">
          {scanLogs.length > 0 ? (
            <div className="space-y-1">
              {scanLogs.map((line, index) => (
                <div key={`${index}-${line}`} className={cn('rounded px-2 py-0.5', getScanLogToneClass(line))}>
                  <code>{line}</code>
                </div>
              ))}
            </div>
          ) : (
            <code className="text-slate-400">{t('runtime.detect.pending', { defaultValue: '等待检测开始...' })}</code>
          )}
        </div>
      </div>

      {scanData && (
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span>{scanData.os} / {scanData.arch}</span>
            <span>{t('runtime.summary.openclaw', { status: scanData.local.openClawInstalled ? `installed ${scanData.local.openClawVersion || ''}` : 'not installed', defaultValue: 'OpenClaw: {{status}}' })}</span>
            <span>{t('runtime.summary.gateway', { status: scanData.local.gatewayRunning ? `running:${scanData.local.gatewayPort}` : 'offline', defaultValue: 'Gateway: {{status}}' })}</span>
          </div>
          {scanData.local.openclaw?.path && (
            <p className="mt-2 text-xs text-muted-foreground font-mono break-all">{scanData.local.openclaw.path}</p>
          )}
        </div>
      )}

      {scanReady && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={() => setMode('local-existing')} className={cn('p-3 rounded-lg border text-left', mode === 'local-existing' ? 'border-primary bg-primary/10' : 'border-border')}>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 rounded-md bg-sky-500/15 p-1.5">
              <Server className="h-4 w-4 text-sky-300" />
            </span>
            <div>
              <p className="font-medium text-sky-200">1. {t('runtime.modes.localConnection.title', { defaultValue: '本地连接' })}</p>
              <p className="text-xs text-sky-100/70 mt-1">{t('runtime.modes.localConnection.desc', { defaultValue: '连接本机 OpenClaw Gateway' })}</p>
              {recommendedMode === 'local-existing' && <p className="text-[11px] text-emerald-300 mt-1">{t('runtime.recommended', { defaultValue: '推荐' })}</p>}
            </div>
          </div>
        </button>
        <button onClick={() => setMode('remote-existing')} className={cn('p-3 rounded-lg border text-left', mode === 'remote-existing' ? 'border-primary bg-primary/10' : 'border-border')}>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 rounded-md bg-violet-500/15 p-1.5">
              <Globe2 className="h-4 w-4 text-violet-300" />
            </span>
            <div>
              <p className="font-medium text-violet-200">2. {t('runtime.modes.remoteConnection.title', { defaultValue: '远程连接' })}</p>
              <p className="text-xs text-violet-100/70 mt-1">{t('runtime.modes.remoteConnection.desc', { defaultValue: '填写远程 Gateway 地址并连接' })}</p>
              {recommendedMode === 'remote-existing' && <p className="text-[11px] text-emerald-300 mt-1">{t('runtime.recommended', { defaultValue: '推荐' })}</p>}
            </div>
          </div>
        </button>
      </div>
      )}

      {scanReady && mode === 'local-existing' && (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">{t('runtime.local.stepsTitle', { defaultValue: '步骤说明' })}</p>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>{t('runtime.local.step1', { defaultValue: '扫描本机是否已安装 OpenClaw 与 Gateway 状态' })}</li>
            <li>{t('runtime.local.step2', { defaultValue: '切换到本地连接模式并尝试启动 Gateway' })}</li>
            <li>{t('runtime.local.step3', { defaultValue: '连接成功后可进入下一步' })}</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {!scanData?.local.openClawInstalled && (
              <Button
                variant="secondary"
                onClick={handleInstallOpenClaw}
                disabled={installingOpenClaw || actionLoading || localStarting}
              >
                {installingOpenClaw ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t('runtime.local.installOpenclawBtn', { defaultValue: '智能安装 OpenClaw' })}
              </Button>
            )}
            <Button variant="outline" onClick={handleStartLocalGateway} disabled={localStarting || actionLoading}>
              {localStarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('runtime.local.startBtn', { defaultValue: '启动本地 Gateway' })}
            </Button>
            <Button onClick={handleConnectLocal} disabled={actionLoading || localStarting || installingOpenClaw}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('runtime.local.connectBtn', { defaultValue: '连接本地 Gateway' })}
            </Button>
          </div>
          {localConnected && <p className="text-sm text-green-400">{t('runtime.local.connectedDone', { defaultValue: '已完成本地对接' })}</p>}
        </div>
      )}

      {scanReady && mode === 'remote-existing' && (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">{t('runtime.remote.stepsTitle', { defaultValue: '步骤说明' })}</p>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>{t('runtime.remote.step1', { defaultValue: '输入远程 Gateway 地址与端口' })}</li>
            <li>{t('runtime.remote.step2', { defaultValue: '测试远程 WebSocket 连接与鉴权' })}</li>
            <li>{t('runtime.remote.step3', { defaultValue: '保存远程连接配置并启用' })}</li>
          </ol>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={remoteProtocol} onChange={(e) => setRemoteProtocol(e.target.value === 'wss' ? 'wss' : 'ws')}>
              <option value="ws">ws</option>
              <option value="wss">wss</option>
            </select>
            <Input value={remoteHost} onChange={(e) => setRemoteHost(e.target.value)} placeholder={t('runtime.remote.hostPlaceholder', { defaultValue: 'host / ip' })} />
            <Input value={remotePort} onChange={(e) => setRemotePort(e.target.value)} placeholder={t('runtime.remote.portPlaceholder', { defaultValue: 'port' })} />
            <Input value={remoteToken} onChange={(e) => setRemoteToken(e.target.value)} placeholder={t('runtime.remote.tokenPlaceholder', { defaultValue: 'token (optional)' })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTestRemote} disabled={remoteTesting}>
              {remoteTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('runtime.remote.testBtn', { defaultValue: '测试远程连接' })}
            </Button>
            <Button onClick={handleSaveRemote} disabled={actionLoading || !remoteConnected}>
              {t('runtime.remote.saveBtn', { defaultValue: '保存并启用远程' })}
            </Button>
          </div>
          {remoteConnected && <p className="text-sm text-green-400">{t('runtime.remote.connectedDone', { defaultValue: '远程连接验证通过' })}</p>}
        </div>
      )}

      {!!error && (
        <div className="rounded-lg bg-red-900/20 border border-red-500/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

export interface ProviderContentProps {
  providers: ProviderTypeInfo[];
  selectedProvider: string | null;
  onSelectProvider: (id: string | null) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onConfiguredChange: (configured: boolean) => void;
}

type OAuthLoginInfo = {
  loggedIn?: boolean;
  email?: string;
  name?: string;
  userId?: string;
  expires?: string;
  sessionCookiePresent?: boolean;
  source?: string;
};

export function ProviderContent({
  providers,
  selectedProvider,
  onSelectProvider,
  apiKey,
  onApiKeyChange,
  onConfiguredChange,
}: ProviderContentProps) {
  const { t, i18n } = useTranslation(['setup', 'settings']);
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [configuredModelOptions, setConfiguredModelOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [apiProtocol, setApiProtocol] = useState<ProviderAccount['apiProtocol']>('openai-completions');
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const providerMenuRef = useRef<HTMLDivElement | null>(null);
  const [oauthLoginInfo, setOauthLoginInfo] = useState<OAuthLoginInfo | null>(null);
  const [oauthTokenPreview, setOauthTokenPreview] = useState<string | null>(null);
  const [oauthTokenError, setOauthTokenError] = useState<string | null>(null);
  const [oauthLoggingOut, setOauthLoggingOut] = useState(false);

  const [authMode, setAuthMode] = useState<'oauth' | 'apikey'>('oauth');

  // OAuth Flow State
  const [oauthFlowing, setOauthFlowing] = useState(false);
  const [oauthData, setOauthData] = useState<{
    mode: 'device';
    verificationUri: string;
    userCode: string;
    expiresIn: number;
  } | {
    mode: 'manual';
    authorizationUrl: string;
    message?: string;
  } | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [oauthError, setOauthError] = useState<string | null>(null);
  const pendingOAuthRef = useRef<{ accountId: string; label: string } | null>(null);
  const oauthSubmittingRef = useRef(false);
  const oauthSuccessHandledRef = useRef(false);
  const providerRestoreStartedRef = useRef(false);
  const providerUserSelectedRef = useRef(false);
  const openCodexLoginWindow = useCallback(async (options?: { forceReauth?: boolean; url?: string; title?: string }) => {
    const forceReauth = Boolean(options?.forceReauth);
    const url = typeof options?.url === 'string' ? options.url : undefined;
    const title = typeof options?.title === 'string' ? options.title : undefined;
    try {
      const viaIpc = await invokeIpc('codex:open-login', { forceReauth, url, title }) as { success?: boolean; error?: string } | undefined;
      if (viaIpc?.success) return;
    } catch {
      // fallback to host api
    }
    const viaHost = await hostApiFetch<{ success?: boolean; error?: string }>('/api/app/codex/open-login', {
      method: 'POST',
      body: JSON.stringify({ forceReauth, url, title }),
    });
    if (viaHost?.success === false) {
      throw new Error(String(viaHost.error || t('provider.oauth.startFailed')));
    }
  }, [t]);
  const parseOAuthPayload = (raw: unknown) => {
    const obj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : null;
    const nested = (obj?.data && typeof obj.data === 'object') ? (obj.data as Record<string, unknown>) : null;
    const payload = nested || obj;
    const mode = payload?.mode === 'manual' ? 'manual' : 'device';
    const message = typeof payload?.message === 'string' ? payload.message : undefined;
    const error = typeof payload?.error === 'string'
      ? payload.error
      : (typeof obj?.error === 'string' ? obj.error : undefined);
    const success = typeof payload?.success === 'boolean'
      ? payload.success
      : (typeof obj?.success === 'boolean' ? obj.success : undefined);
    return { payload, mode, message, error, success };
  };

  const maskToken = (token?: string | null): string | null => {
    const value = String(token || '').trim();
    if (!value) return null;
    if (value.length <= 12) return `${value.slice(0, 4)}***${value.slice(-2)}`;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const refreshCodexLoginInfo = useCallback(async () => {
    try {
      const tokenState = await hostApiFetch<{ loginInfo?: OAuthLoginInfo; success?: boolean; accessToken?: string; error?: string }>(
        '/api/app/codex/session-token'
      );
      const preview = maskToken(tokenState?.accessToken);
      setOauthTokenPreview(preview);
      setOauthTokenError(tokenState?.success ? null : (tokenState?.error || null));
      const info = tokenState?.loginInfo;
      if (info && (info.loggedIn || info.email || info.name || info.userId)) {
        setOauthLoginInfo(info);
        return info;
      }
      setOauthLoginInfo(null);
      return null;
    } catch {
      setOauthLoginInfo(null);
      setOauthTokenPreview(null);
      setOauthTokenError(null);
      return null;
    }
  }, []);

  const completeOAuthSuccess = useCallback(async (payload?: { accountId?: string; provider?: string; loginInfo?: OAuthLoginInfo; accessToken?: string }) => {
    if (oauthSuccessHandledRef.current) return;
    oauthSuccessHandledRef.current = true;
    setOauthFlowing(false);
    setOauthData(null);
    setManualCodeInput('');
    setKeyValid(true);
    if (payload?.loginInfo && (payload.loginInfo.loggedIn || payload.loginInfo.email || payload.loginInfo.name)) {
      setOauthLoginInfo(payload.loginInfo);
    } else {
      void refreshCodexLoginInfo();
    }

    const accountId = payload?.accountId || pendingOAuthRef.current?.accountId;
    if (accountId) {
      try {
        await hostApiFetch('/api/provider-accounts/default', {
          method: 'PUT',
          body: JSON.stringify({ accountId }),
        });
        setSelectedAccountId(accountId);
      } catch (error) {
        console.error('Failed to set default provider account:', error);
      }
    }

    const oauthProvider = String(payload?.provider || selectedProvider || '').trim().toLowerCase();
    let hasUsableToken = oauthProvider !== 'openai';
    if (oauthProvider === 'openai') {
      let tokenPreview = maskToken(payload?.accessToken);
      let tokenErrorText: string | null = null;
      try {
        const tokenState = await hostApiFetch<{ success?: boolean; accessToken?: string; sessionPayload?: string; error?: string; loginInfo?: OAuthLoginInfo }>(
          '/api/app/codex/session-token'
        );
        tokenPreview = tokenPreview || maskToken(tokenState?.accessToken);
        tokenErrorText = tokenState?.success ? null : (tokenState?.error || null);
        setOauthTokenPreview(tokenPreview);
        setOauthTokenError(tokenErrorText);
        if (tokenState?.loginInfo && (tokenState.loginInfo.loggedIn || tokenState.loginInfo.email || tokenState.loginInfo.name)) {
          setOauthLoginInfo(tokenState.loginInfo);
        }
      } catch (error) {
        console.error('Failed to refresh OpenAI OAuth state after login:', error);
      }
      if (tokenPreview) {
        hasUsableToken = true;
        toast.success(
          t('provider.oauth.loginSuccessWithToken', {
            defaultValue: '登录成功，已获取令牌 {{token}}',
            token: tokenPreview,
          }),
        );
      } else {
        toast.warning(
          t('provider.oauth.loginSuccessNoToken', {
            defaultValue: '登录完成，但暂未读取到令牌',
          }),
        );
        if (tokenErrorText) {
          setOauthError(tokenErrorText);
        }
        // Keep current step retryable when login finished but token was not captured.
        oauthSuccessHandledRef.current = false;
        hasUsableToken = false;
      }
    } else {
      toast.success(t('provider.valid'));
    }

    if (hasUsableToken) {
      pendingOAuthRef.current = null;
      onConfiguredChange(true);
    } else {
      onConfiguredChange(false);
    }
  }, [onConfiguredChange, refreshCodexLoginInfo, selectedProvider, t]);

  // Manage OAuth events
  useEffect(() => {
    const handleCode = (data: unknown) => {
      const payload = data as Record<string, unknown>;
      if (payload?.mode === 'manual') {
        setOauthData({
          mode: 'manual',
          authorizationUrl: String(payload.authorizationUrl || ''),
          message: typeof payload.message === 'string' ? payload.message : undefined,
        });
      } else {
        setOauthData({
          mode: 'device',
          verificationUri: String(payload.verificationUri || ''),
          userCode: String(payload.userCode || ''),
          expiresIn: Number(payload.expiresIn || 300),
        });
      }
      setOauthError(null);
    };

    const handleSuccess = async (data: unknown) => {
      const payload = (data as { accountId?: string; provider?: string; loginInfo?: OAuthLoginInfo; accessToken?: string } | undefined) || undefined;
      await completeOAuthSuccess(payload);
    };

    const handleError = (data: unknown) => {
      setOauthError((data as { message: string }).message);
      setOauthData(null);
      oauthSuccessHandledRef.current = false;
      pendingOAuthRef.current = null;
    };

    const offCode = subscribeHostEvent('oauth:code', handleCode);
    const offSuccess = subscribeHostEvent('oauth:success', handleSuccess);
    const offError = subscribeHostEvent('oauth:error', handleError);

    return () => {
      offCode();
      offSuccess();
      offError();
    };
  }, [completeOAuthSuccess]);

  const handleStartOAuth = async () => {
    if (!selectedProvider) return;

    try {
      const snapshot = await fetchProviderSnapshot();
      const existingVendorIds = new Set(snapshot.accounts.map((account) => account.vendorId));
      if (selectedProvider === 'minimax-portal' && existingVendorIds.has('minimax-portal-cn')) {
        toast.error(t('settings:aiProviders.toast.minimaxConflict'));
        return;
      }
      if (selectedProvider === 'minimax-portal-cn' && existingVendorIds.has('minimax-portal')) {
        toast.error(t('settings:aiProviders.toast.minimaxConflict'));
        return;
      }
    } catch {
      // ignore check failure
    }

    setOauthFlowing(true);
    setOauthData(null);
    setManualCodeInput('');
    setOauthError(null);
    oauthSuccessHandledRef.current = false;

    try {
      const forceReauth = Boolean(selectedProvider === 'openai' && oauthLoginInfo?.loggedIn);
      const snapshot = await fetchProviderSnapshot();
      const accountId = buildProviderAccountId(
        selectedProvider as ProviderType,
        selectedAccountId,
        snapshot.vendors,
      );
      const label = selectedProviderData?.name || selectedProvider;
      pendingOAuthRef.current = { accountId, label };
      const response = await hostApiFetch<unknown>('/api/providers/oauth/start', {
        method: 'POST',
        body: JSON.stringify({ provider: selectedProvider, accountId, label, forceReauth }),
      });
      const { payload, mode, message, error, success } = parseOAuthPayload(response);
      if (error || success === false) {
        throw new Error(error || message || t('provider.oauth.startFailed'));
      }
      if (payload?.verificationUri || payload?.authorizationUrl || payload?.userCode || payload?.mode) {
        if (mode === 'manual') {
          const authorizationUrl = String(payload?.authorizationUrl || '');
          setOauthData({
            mode: 'manual',
            authorizationUrl,
            message,
          });
        } else {
          setOauthData({
            mode: 'device',
            verificationUri: String(payload?.verificationUri || ''),
            userCode: String(payload?.userCode || ''),
            expiresIn: Number(payload?.expiresIn || 300),
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOauthError(msg);
      toast.error(msg);
      setOauthFlowing(false);
      pendingOAuthRef.current = null;
    }
  };

  const handleCancelOAuth = async () => {
    setOauthFlowing(false);
    setOauthData(null);
    setManualCodeInput('');
    setOauthError(null);
    oauthSuccessHandledRef.current = false;
    pendingOAuthRef.current = null;
    await hostApiFetch('/api/providers/oauth/cancel', { method: 'POST' });
  };

  const handleSubmitManualOAuthCode = async (overrideCode?: string) => {
    if (oauthSubmittingRef.current) return;
    oauthSubmittingRef.current = true;
    const value = (overrideCode ?? manualCodeInput).trim();
    try {
      const response = await hostApiFetch<unknown>('/api/providers/oauth/submit', {
        method: 'POST',
        body: JSON.stringify({ code: value }),
      });
      const { payload, message, error, success } = parseOAuthPayload(response);
      if (error || success === false) {
        throw new Error(error || message || t('provider.oauth.submitFailed'));
      }
      setOauthError(null);
      // Fallback: some environments may miss IPC oauth:success event.
      await completeOAuthSuccess({
        accountId: typeof payload?.accountId === 'string' ? payload.accountId : undefined,
        provider: typeof payload?.provider === 'string' ? payload.provider : undefined,
        loginInfo: (payload?.loginInfo as OAuthLoginInfo | undefined),
        accessToken: typeof payload?.accessToken === 'string' ? payload.accessToken : undefined,
      });
    } catch (error) {
      setOauthError(error instanceof Error ? error.message : String(error));
    } finally {
      oauthSubmittingRef.current = false;
    }
  };

  useEffect(() => {
    if (!oauthFlowing || oauthData?.mode !== 'manual' || selectedProvider !== 'openai') {
      return;
    }
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      if (cancelled || oauthSubmittingRef.current || oauthSuccessHandledRef.current) return;
      try {
        const tokenState = await hostApiFetch<{ success?: boolean; accessToken?: string; loginInfo?: OAuthLoginInfo }>(
          '/api/app/codex/session-token'
        );
        if (cancelled) return;
        if (tokenState?.success) {
          await completeOAuthSuccess({
            provider: 'openai',
            loginInfo: tokenState.loginInfo,
            accessToken: tokenState.accessToken,
          });
          await hostApiFetch('/api/providers/oauth/cancel', { method: 'POST' }).catch(() => {});
          return;
        }
      } catch {
        // ignore transient errors while waiting user to complete login
      }
      if (!cancelled) {
        timer = window.setTimeout(poll, 2200);
      }
    };

    timer = window.setTimeout(poll, 2200);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [completeOAuthSuccess, oauthData, oauthFlowing, selectedProvider]);

  useEffect(() => {
    if (selectedProvider !== 'openai') {
      setOauthLoginInfo(null);
      setOauthTokenPreview(null);
      setOauthTokenError(null);
      oauthSuccessHandledRef.current = false;
      return;
    }
    void refreshCodexLoginInfo();
  }, [refreshCodexLoginInfo, selectedProvider]);

  const handleOAuthLogout = useCallback(async () => {
    if (oauthLoggingOut) return;
    setOauthLoggingOut(true);
    try {
      await hostApiFetch('/api/app/codex/logout', {
        method: 'POST',
        body: JSON.stringify({ clearProviderAuth: true }),
      });
      setOauthLoginInfo(null);
      setOauthTokenPreview(null);
      setOauthTokenError(null);
      oauthSuccessHandledRef.current = false;
      onApiKeyChange('');
      onConfiguredChange(false);
      toast.success(t('provider.oauth.loggedOut', { defaultValue: '已退出登录' }));
    } catch (error) {
      toast.error(t('provider.oauth.logoutFailed', { defaultValue: '退出登录失败' }));
      console.error('Failed to logout codex oauth:', error);
    } finally {
      setOauthLoggingOut(false);
    }
  }, [oauthLoggingOut, onApiKeyChange, onConfiguredChange, t]);

  // On mount, try to restore previously configured provider
  useEffect(() => {
    if (providerRestoreStartedRef.current) return;
    providerRestoreStartedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (selectedProvider || providerUserSelectedRef.current) return;
        const snapshot = await fetchProviderSnapshot();
        const statusMap = new Map(snapshot.statuses.map((status) => [status.id, status]));
        const setupProviderTypes = new Set<string>(providers.map((p) => p.id));
        const setupCandidates = snapshot.accounts.filter((account) => setupProviderTypes.has(account.vendorId));
        const preferred =
          (snapshot.defaultAccountId
            && setupCandidates.find((account) => account.id === snapshot.defaultAccountId))
          || setupCandidates.find((account) => hasConfiguredCredentials(account, statusMap.get(account.id)))
          || setupCandidates[0];
        if (preferred && !cancelled && !selectedProvider && !providerUserSelectedRef.current) {
          onSelectProvider(preferred.vendorId);
          setSelectedAccountId(preferred.id);
          const typeInfo = providers.find((p) => p.id === preferred.vendorId);
          const requiresKey = typeInfo?.requiresApiKey ?? false;
          onConfiguredChange(!requiresKey || hasConfiguredCredentials(preferred, statusMap.get(preferred.id)));
          const storedKey = (await hostApiFetch<{ apiKey: string | null }>(
            `/api/providers/${encodeURIComponent(preferred.id)}/api-key`,
          )).apiKey;
          onApiKeyChange(storedKey || '');
        } else if (!cancelled && !selectedProvider && !providerUserSelectedRef.current) {
          onConfiguredChange(false);
          onApiKeyChange('');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load provider list:', error);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [onApiKeyChange, onConfiguredChange, onSelectProvider, providers, selectedProvider]);

  // When provider changes, load stored key + reset base URL
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedProvider) return;
      setApiProtocol('openai-completions');
      try {
        const snapshot = await fetchProviderSnapshot();
        const statusMap = new Map(snapshot.statuses.map((status) => [status.id, status]));
        const preferredAccount = pickPreferredAccount(
          snapshot.accounts,
          snapshot.defaultAccountId,
          selectedProvider,
          statusMap,
        );
        const accountIdForLoad = preferredAccount?.id || selectedProvider;
        setSelectedAccountId(preferredAccount?.id || null);

        const savedProvider = await hostApiFetch<{ baseUrl?: string; model?: string; apiProtocol?: ProviderAccount['apiProtocol'] } | null>(
          `/api/providers/${encodeURIComponent(accountIdForLoad)}`,
        );
        const storedKey = (await hostApiFetch<{ apiKey: string | null }>(
          `/api/providers/${encodeURIComponent(accountIdForLoad)}/api-key`,
        )).apiKey;
        if (!cancelled) {
          onApiKeyChange(storedKey || '');

          const info = providers.find((p) => p.id === selectedProvider);
          setBaseUrl(savedProvider?.baseUrl || info?.defaultBaseUrl || '');
          setModelId(savedProvider?.model || info?.defaultModelId || '');
          setApiProtocol(savedProvider?.apiProtocol || 'openai-completions');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load provider key:', error);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [onApiKeyChange, selectedProvider, providers]);

  useEffect(() => {
    if (!providerMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (providerMenuRef.current && !providerMenuRef.current.contains(event.target as Node)) {
        setProviderMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProviderMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [providerMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedProvider) {
        setConfiguredModelOptions([]);
        return;
      }
      try {
        const payload = await hostApiFetch<{ config?: Record<string, unknown> } | Record<string, unknown>>('/api/v1/config');
        const container = payload as Record<string, unknown>;
        const cfg = (container.config as Record<string, unknown>) || container;
        const providersNode = (((cfg.models as Record<string, unknown>) || {}).providers as Record<string, unknown>) || {};
        const choices: Array<{ value: string; label: string }> = [];
        for (const [providerKey, providerRaw] of Object.entries(providersNode)) {
          const providerObj = (providerRaw as Record<string, unknown>) || {};
          const models = Array.isArray(providerObj.models) ? providerObj.models : [];
          for (const item of models) {
            const rec = (item as Record<string, unknown>) || {};
            const mid = typeof rec.id === 'string' ? rec.id.trim() : '';
            if (!mid) continue;
            const mname = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : mid;
            const full = `${providerKey}/${mid}`;
            choices.push({ value: full, label: `${mname} (${providerKey})` });
          }
        }
        const dedup = Array.from(new Map(choices.map((c) => [c.value, c])).values());
        if (cancelled) return;
        setConfiguredModelOptions(dedup);
        if (dedup.length > 0) {
          const defaults = (((cfg.agents as Record<string, unknown>) || {}).defaults as Record<string, unknown>) || {};
          const modelCfg = (defaults.model as Record<string, unknown>) || {};
          const primary = typeof modelCfg.primary === 'string' ? modelCfg.primary.trim() : '';
          if (primary && dedup.some((x) => x.value === primary)) {
            setModelId(primary);
          } else if (!modelId.trim()) {
            setModelId(dedup[0].value);
          }
          onConfiguredChange(true);
        }
      } catch {
        if (!cancelled) setConfiguredModelOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProvider, onConfiguredChange]);

  const selectedProviderData = providers.find((p) => p.id === selectedProvider);
  const providerDocsUrl = getProviderDocsUrl(selectedProviderData, i18n.language);
  const selectedProviderIconUrl = selectedProviderData
    ? getProviderIconUrl(selectedProviderData.id)
    : undefined;
  const showBaseUrlField = selectedProviderData?.showBaseUrl ?? false;
  const showModelIdField = shouldShowProviderModelId(selectedProviderData, devModeUnlocked);
  const requiresKey = selectedProviderData?.requiresApiKey ?? false;
  const isOAuth = selectedProviderData?.isOAuth ?? false;
  const supportsApiKey = selectedProviderData?.supportsApiKey ?? false;
  const useOAuthFlow = isOAuth && (!supportsApiKey || authMode === 'oauth');

  const handleValidateAndSave = async () => {
    if (!selectedProvider) return;

    try {
      const snapshot = await fetchProviderSnapshot();
      const existingVendorIds = new Set(snapshot.accounts.map((account) => account.vendorId));
      if (selectedProvider === 'minimax-portal' && existingVendorIds.has('minimax-portal-cn')) {
        toast.error(t('settings:aiProviders.toast.minimaxConflict'));
        return;
      }
      if (selectedProvider === 'minimax-portal-cn' && existingVendorIds.has('minimax-portal')) {
        toast.error(t('settings:aiProviders.toast.minimaxConflict'));
        return;
      }
    } catch {
      // ignore check failure
    }

    setValidating(true);
    setKeyValid(null);

    try {
      // Validate key if the provider requires one and a key was entered
      const isApiKeyRequired = requiresKey || (supportsApiKey && authMode === 'apikey');
      if (isApiKeyRequired && apiKey) {
        const result = await invokeIpc(
          'provider:validateKey',
          selectedAccountId || selectedProvider,
          apiKey,
          {
            baseUrl: baseUrl.trim() || undefined,
            apiProtocol: (selectedProvider === 'custom' || selectedProvider === 'ollama')
              ? apiProtocol
              : undefined,
          }
        ) as { valid: boolean; error?: string };

        setKeyValid(result.valid);

        if (!result.valid) {
          toast.error(result.error || t('provider.invalid'));
          setValidating(false);
          return;
        }
      } else {
        setKeyValid(true);
      }

      const effectiveModelId = resolveProviderModelForSave(
        selectedProviderData,
        modelId,
        devModeUnlocked
      );
      const snapshot = await fetchProviderSnapshot();
      const accountIdForSave = buildProviderAccountId(
        selectedProvider as ProviderType,
        selectedAccountId,
        snapshot.vendors,
      );

      const effectiveApiKey = resolveProviderApiKeyForSave(selectedProvider, apiKey);
      const accountPayload: ProviderAccount = {
        id: accountIdForSave,
        vendorId: selectedProvider as ProviderType,
        label: selectedProvider === 'custom'
          ? t('settings:aiProviders.custom')
          : (selectedProviderData?.name || selectedProvider),
        authMode: (selectedProvider === 'ollama' || selectedProvider === 'claude-code')
          ? 'local'
          : 'api_key',
        baseUrl: baseUrl.trim() || undefined,
        apiProtocol: (selectedProvider === 'custom' || selectedProvider === 'ollama' || selectedProvider === 'claude-code')
          ? (apiProtocol || 'anthropic-messages')
          : undefined,
        model: effectiveModelId,
        enabled: true,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saveResult = selectedAccountId
        ? await hostApiFetch<{ success: boolean; error?: string }>(
          `/api/provider-accounts/${encodeURIComponent(accountIdForSave)}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              updates: {
                label: accountPayload.label,
                authMode: accountPayload.authMode,
                baseUrl: accountPayload.baseUrl,
                apiProtocol: accountPayload.apiProtocol,
                model: accountPayload.model,
                enabled: accountPayload.enabled,
              },
              apiKey: effectiveApiKey,
            }),
          },
        )
        : await hostApiFetch<{ success: boolean; error?: string }>('/api/provider-accounts', {
          method: 'POST',
          body: JSON.stringify({ account: accountPayload, apiKey: effectiveApiKey }),
        });

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save provider config');
      }

      // ── Sync provider & model into openclaw.json so chat model-list picks it up ──
      try {
        const cfgRes = await hostApiFetch<Record<string, unknown>>('/api/config', { method: 'GET' });
        const cfg: Record<string, unknown> = (cfgRes && typeof cfgRes === 'object') ? cfgRes : {};
        const modelsSection: Record<string, unknown> =
          (cfg.models && typeof cfg.models === 'object') ? cfg.models as Record<string, unknown> : {};
        const providersSection: Record<string, unknown> =
          (modelsSection.providers && typeof modelsSection.providers === 'object')
            ? modelsSection.providers as Record<string, unknown>
            : {};

        const providerId = selectedProvider as string;
        const existing: Record<string, unknown> =
          (providersSection[providerId] && typeof providersSection[providerId] === 'object')
            ? providersSection[providerId] as Record<string, unknown>
            : {};

        // Resolve baseUrl and api type from account payload or provider defaults
        if (!existing.baseUrl && accountPayload.baseUrl) {
          existing.baseUrl = accountPayload.baseUrl;
        }
        if (!existing.api && accountPayload.apiProtocol) {
          existing.api = accountPayload.apiProtocol;
        }
        // Provide sensible defaults for well-known providers
        if (!existing.baseUrl) {
          const wellKnownBaseUrls: Record<string, string> = {
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com',
            google: 'https://generativelanguage.googleapis.com/v1beta',
            moonshot: 'https://api.moonshot.cn/v1',
            siliconflow: 'https://api.siliconflow.cn/v1',
            deepseek: 'https://api.deepseek.com/v1',
            'claude-code': 'http://localhost:3210/v1',
          };
          if (wellKnownBaseUrls[providerId]) {
            existing.baseUrl = wellKnownBaseUrls[providerId];
          }
        }
        if (!existing.api) {
          const wellKnownApis: Record<string, string> = {
            openai: 'openai-completions',
            anthropic: 'anthropic-messages',
            google: 'google-generative-ai',
            'claude-code': 'anthropic-messages',
          };
          existing.api = wellKnownApis[providerId] || 'openai-completions';
        }

        // Merge the model into the provider's model list
        const existingModels: Array<{ id: string; name: string }> = Array.isArray(existing.models)
          ? (existing.models as Array<{ id: string; name: string }>)
          : [];
        const modelSet = new Set(existingModels.map((m) => m.id));

        // Add the configured model if present
        if (effectiveModelId && !modelSet.has(effectiveModelId)) {
          existingModels.push({ id: effectiveModelId, name: effectiveModelId });
          modelSet.add(effectiveModelId);
        }
        // For well-known providers, ensure at least common models are present
        const wellKnownModels: Record<string, string[]> = {
          openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
          anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
          google: ['gemini-2.5-flash', 'gemini-2.5-pro'],
          'claude-code': ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-20250514'],
        };
        for (const mid of (wellKnownModels[providerId] || [])) {
          if (!modelSet.has(mid)) {
            existingModels.push({ id: mid, name: mid });
            modelSet.add(mid);
          }
        }
        existing.models = existingModels;

        // Store the API key for the config-based provider entry
        if (effectiveApiKey) {
          existing.apiKey = effectiveApiKey;
        }

        providersSection[providerId] = existing;
        modelsSection.providers = providersSection;
        if (!modelsSection.mode) modelsSection.mode = 'merge';
        cfg.models = modelsSection;

        // Also set the default model under agents.defaults
        if (effectiveModelId || existingModels.length > 0) {
          const agents: Record<string, unknown> =
            (cfg.agents && typeof cfg.agents === 'object') ? cfg.agents as Record<string, unknown> : {};
          const defaults: Record<string, unknown> =
            (agents.defaults && typeof agents.defaults === 'object') ? agents.defaults as Record<string, unknown> : {};
          const modelCfg: Record<string, unknown> =
            (defaults.model && typeof defaults.model === 'object') ? defaults.model as Record<string, unknown> : {};
          const primaryModelId = effectiveModelId || existingModels[0]?.id;
          if (primaryModelId) {
            modelCfg.primary = `${providerId}/${primaryModelId}`;
          }
          defaults.model = modelCfg;
          agents.defaults = defaults;
          cfg.agents = agents;
        }

        cfg.meta = {
          ...((cfg.meta && typeof cfg.meta === 'object') ? cfg.meta as Record<string, unknown> : {}),
          lastTouchedAt: new Date().toISOString(),
        };

        await hostApiFetch('/api/config', {
          method: 'POST',
          body: JSON.stringify(cfg),
        });
      } catch (syncErr) {
        console.warn('[Setup] Failed to sync provider to openclaw config:', syncErr);
        // Non-fatal: account was saved, config sync is best-effort
      }

      const defaultResult = await hostApiFetch<{ success: boolean; error?: string }>(
        '/api/provider-accounts/default',
        {
          method: 'PUT',
          body: JSON.stringify({ accountId: accountIdForSave }),
        },
      );

      if (!defaultResult.success) {
        throw new Error(defaultResult.error || 'Failed to set default provider');
      }

      setSelectedAccountId(accountIdForSave);
      onConfiguredChange(true);
      toast.success(t('provider.valid'));
    } catch (error) {
      setKeyValid(false);
      onConfiguredChange(false);
      toast.error('Configuration failed: ' + String(error));
    } finally {
      setValidating(false);
    }
  };

  // Can the user submit?
  const hasConfiguredModels = configuredModelOptions.length > 0;
  const isApiKeyRequired = requiresKey || (supportsApiKey && authMode === 'apikey');
  const canSubmit =
    selectedProvider
    && (isApiKeyRequired ? apiKey.length > 0 : true)
    && (showModelIdField ? modelId.trim().length > 0 : true)
    && !useOAuthFlow;

  const handleSelectProvider = (providerId: string) => {
    providerUserSelectedRef.current = true;
    onSelectProvider(providerId);
    setSelectedAccountId(null);
    onConfiguredChange(false);
    onApiKeyChange('');
    setKeyValid(null);
    setProviderMenuOpen(false);
    setAuthMode('oauth');
  };

  return (
    <div className="space-y-6">
      {/* Provider selector — dropdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>{t('provider.label')}</Label>
          {selectedProvider && providerDocsUrl && (
            <a
              href={providerDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-blue-500 hover:text-blue-600 font-medium inline-flex items-center gap-1"
            >
              {t('settings:aiProviders.dialog.customDoc')}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="relative" ref={providerMenuRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={providerMenuOpen}
            onClick={() => setProviderMenuOpen((open) => !open)}
            style={{ backgroundColor: '#111827', backdropFilter: 'none' }}
            className={cn(
              'w-full rounded-md border border-[#334155] bg-[#111827] px-3 py-2 text-sm text-slate-100',
              'flex items-center justify-between gap-2',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {selectedProvider && selectedProviderData ? (
                selectedProviderIconUrl ? (
                  <img
                    src={selectedProviderIconUrl}
                    alt={selectedProviderData.name}
                    className={cn('h-4 w-4 shrink-0', shouldInvertInDark(selectedProviderData.id) && 'dark:invert')}
                  />
                ) : (
                  <span className="text-sm leading-none shrink-0">{selectedProviderData.icon}</span>
                )
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">—</span>
              )}
              <span className={cn('truncate text-left', !selectedProvider && 'text-muted-foreground')}>
                {selectedProviderData
                  ? `${selectedProviderData.id === 'custom' ? t('settings:aiProviders.custom') : selectedProviderData.name}${selectedProviderData.model ? ` — ${selectedProviderData.model}` : ''}`
                  : t('provider.selectPlaceholder')}
              </span>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', providerMenuOpen && 'rotate-180')} />
          </button>

          {providerMenuOpen && (
            <div
              role="listbox"
              style={{ backgroundColor: '#111827', backdropFilter: 'none' }}
              className="absolute z-20 mt-1 w-full rounded-md border border-[#334155] bg-[#111827] shadow-md max-h-64 overflow-auto"
            >
              {providers.map((p) => {
                const iconUrl = getProviderIconUrl(p.id);
                const isSelected = selectedProvider === p.id;

                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectProvider(p.id)}
                    style={{ backgroundColor: isSelected ? '#1f2937' : '#111827' }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 text-slate-100',
                      'hover:bg-[#1f2937] transition-colors',
                      isSelected && 'bg-[#1f2937]'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={p.name}
                          className={cn('h-4 w-4 shrink-0', shouldInvertInDark(p.id) && 'dark:invert')}
                        />
                      ) : (
                        <span className="text-sm leading-none shrink-0">{p.icon}</span>
                      )}
                      <span className="truncate">{p.id === 'custom' ? t('settings:aiProviders.custom') : p.name}{p.model ? ` — ${p.model}` : ''}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic config fields based on selected provider */}
      {selectedProvider && (
        <motion.div
          key={selectedProvider}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Base URL field (for siliconflow, ollama, custom) */}
          {showBaseUrlField && (
            <div className="space-y-2">
              <Label htmlFor="baseUrl">{t('provider.baseUrl')}</Label>
              <Input
                id="baseUrl"
                type="text"
                placeholder={getProtocolBaseUrlPlaceholder(apiProtocol)}
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  onConfiguredChange(false);
                }}
                autoComplete="off"
                className="bg-background border-input"
              />
            </div>
          )}

          {/* Model ID field (for siliconflow etc.) */}
          {showModelIdField && (
            <div className="space-y-2">
              <Label htmlFor="modelId">{t('provider.modelId')}</Label>
              {configuredModelOptions.length > 0 ? (
                <select
                  id="modelId"
                  value={modelId}
                  onChange={(e) => {
                    setModelId(e.target.value);
                    onConfiguredChange(true);
                  }}
                  style={{ backgroundColor: '#111827', color: '#e2e8f0' }}
                  className="h-10 w-full rounded-md border border-[#334155] bg-[#111827] px-3 text-sm text-slate-100"
                >
                  {configuredModelOptions.map((option) => (
                    <option key={option.value} value={option.value} style={{ backgroundColor: '#111827', color: '#e2e8f0' }}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="modelId"
                  type="text"
                  placeholder={selectedProviderData?.modelIdPlaceholder || 'e.g. deepseek-ai/DeepSeek-V3'}
                  value={modelId}
                  onChange={(e) => {
                    setModelId(e.target.value);
                    onConfiguredChange(false);
                  }}
                  autoComplete="off"
                  className="bg-[#111827] border-[#334155] text-slate-100"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {configuredModelOptions.length > 0
                  ? t('provider.modelConfiguredHint', { defaultValue: 'Loaded from existing OpenClaw configuration' })
                  : t('provider.modelIdDesc')}
              </p>
            </div>
          )}

          {selectedProvider === 'custom' && (
            <div className="space-y-2">
              <Label>{t('provider.protocol')}</Label>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setApiProtocol('openai-completions');
                    onConfiguredChange(false);
                  }}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg border transition-colors',
                    apiProtocol === 'openai-completions'
                      ? 'bg-primary/10 border-primary/30 font-medium'
                      : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {t('provider.protocols.openaiCompletions')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiProtocol('openai-responses');
                    onConfiguredChange(false);
                  }}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg border transition-colors',
                    apiProtocol === 'openai-responses'
                      ? 'bg-primary/10 border-primary/30 font-medium'
                      : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {t('provider.protocols.openaiResponses')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiProtocol('anthropic-messages');
                    onConfiguredChange(false);
                  }}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg border transition-colors',
                    apiProtocol === 'anthropic-messages'
                      ? 'bg-primary/10 border-primary/30 font-medium'
                      : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {t('provider.protocols.anthropic')}
                </button>
              </div>
            </div>
          )}

          {/* Auth mode toggle for providers supporting both */}
          {isOAuth && supportsApiKey && (
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                onClick={() => setAuthMode('oauth')}
                className={cn(
                  'flex-1 py-2 px-3 transition-colors',
                  authMode === 'oauth' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                )}
              >
                {t('settings:aiProviders.oauth.loginMode')}
              </button>
              <button
                onClick={() => setAuthMode('apikey')}
                className={cn(
                  'flex-1 py-2 px-3 transition-colors',
                  authMode === 'apikey' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                )}
              >
                {t('settings:aiProviders.oauth.apikeyMode')}
              </button>
            </div>
          )}

          {/* API Key field (hidden for ollama) */}
          {(!isOAuth || (supportsApiKey && authMode === 'apikey')) && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t('provider.apiKey')}</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  placeholder={selectedProviderData?.placeholder}
                  value={apiKey}
                  onChange={(e) => {
                    onApiKeyChange(e.target.value);
                    onConfiguredChange(false);
                    setKeyValid(null);
                  }}
                  autoComplete="off"
                  className="pr-10 bg-background border-input"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Device OAuth Trigger */}
          {useOAuthFlow && (
            <div className="space-y-4 pt-2">
              {selectedProvider === 'openai' && oauthLoginInfo?.loggedIn && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
                  <div className="text-sm text-emerald-300 font-medium">
                    {t('provider.oauth.loggedInAs', {
                      defaultValue: '当前登录：{{identity}}',
                      identity: oauthLoginInfo.email || oauthLoginInfo.name || oauthLoginInfo.userId || 'OpenAI',
                    })}
                  </div>
                  <div className="mt-1 text-xs text-emerald-200/90">
                    {oauthTokenPreview
                      ? t('provider.oauth.tokenReady', { defaultValue: '令牌状态：已获取 {{token}}', token: oauthTokenPreview })
                      : t('provider.oauth.tokenMissing', { defaultValue: '令牌状态：未获取' })}
                  </div>
                  {oauthTokenError && (
                    <div className="mt-1 text-xs text-amber-300">
                      {oauthTokenError}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      onClick={handleOAuthLogout}
                      disabled={oauthLoggingOut}
                      className="h-9"
                    >
                      {oauthLoggingOut
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : null}
                      {t('provider.oauth.logoutButton', { defaultValue: '退出登录' })}
                    </Button>
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-center">
                <p className="text-sm text-blue-200 mb-3 block">
                  {t('provider.oauth.loginPrompt')}
                </p>
                <Button
                  onClick={handleStartOAuth}
                  disabled={oauthFlowing || oauthLoggingOut}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {oauthFlowing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('provider.oauth.waiting')}</>
                  ) : (
                    (oauthLoginInfo?.loggedIn
                      ? t('provider.oauth.reloginButton', { defaultValue: '重新登录' })
                      : t('provider.oauth.loginButton'))
                  )}
                </Button>
              </div>

              {/* OAuth Active State Modal / Inline View */}
              {oauthFlowing && (
                <div className="mt-4 p-4 border rounded-xl bg-card relative overflow-hidden">
                  {/* Background pulse effect */}
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />

                  <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4">
                    {oauthError ? (
                      <div className="text-red-400 space-y-2">
                        <XCircle className="h-8 w-8 mx-auto" />
                        <p className="font-medium">{t('provider.oauth.authFailed')}</p>
                        <p className="text-sm opacity-80">{oauthError}</p>
                        <Button variant="outline" size="sm" onClick={handleCancelOAuth} className="mt-2">
                          {t('provider.oauth.tryAgain')}
                        </Button>
                      </div>
                    ) : !oauthData ? (
                      <div className="space-y-3 py-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-muted-foreground animate-pulse">{t('provider.oauth.requestingCode')}</p>
                      </div>
                    ) : oauthData.mode === 'manual' ? (
                      <div className="space-y-4 w-full">
                        <div className="space-y-1">
                          <h3 className="font-medium text-lg">{t('provider.oauth.completeLogin')}</h3>
                          <p className="text-sm text-muted-foreground text-left mt-2">
                            {oauthData.message || t('provider.oauth.manualHint')}
                          </p>
                        </div>

                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={async () => {
                            try {
                              await invokeIpc('shell:openExternal', oauthData.authorizationUrl);
                            } catch (err) {
                              const msg = err instanceof Error ? err.message : String(err);
                              setOauthError(msg);
                              toast.error(msg);
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t('provider.oauth.openAuthPage')}
                        </Button>

                        <Input
                          placeholder={t('provider.oauth.pasteCodePlaceholder')}
                          value={manualCodeInput}
                          onChange={(e) => setManualCodeInput(e.target.value)}
                        />

                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleSubmitManualOAuthCode}
                        >
                          {t('provider.oauth.submitCode')}
                        </Button>

                        <Button variant="ghost" size="sm" className="w-full mt-2" onClick={handleCancelOAuth}>
                          {t('provider.oauth.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 w-full">
                        <div className="space-y-1">
                          <h3 className="font-medium text-lg">{t('provider.oauth.approveLogin')}</h3>
                          <div className="text-sm text-muted-foreground text-left mt-2 space-y-1">
                            <p>1. {t('provider.oauth.step1')}</p>
                            <p>2. {t('provider.oauth.step2')}</p>
                            <p>3. {t('provider.oauth.step3')}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 p-3 bg-background border rounded-lg">
                          <code className="text-2xl font-mono tracking-widest font-bold text-primary">
                            {oauthData.userCode}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(oauthData.userCode);
                              toast.success(t('provider.oauth.codeCopied'));
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => invokeIpc('shell:openExternal', oauthData.verificationUri)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t('provider.oauth.openLoginPage')}
                        </Button>

                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>{t('provider.oauth.waitingApproval')}</span>
                        </div>

                        <Button variant="ghost" size="sm" className="w-full mt-2" onClick={handleCancelOAuth}>
                          {t('provider.oauth.cancel')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validate & Save */}
          <Button
            onClick={handleValidateAndSave}
            disabled={!canSubmit || validating}
            className={cn("w-full", useOAuthFlow && "hidden")}
          >
            {validating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {requiresKey ? t('provider.validateSave') : t('provider.save')}
          </Button>

          {keyValid !== null && (
            <p className={cn('text-sm text-center', keyValid ? 'text-green-400' : 'text-red-400')}>
              {keyValid ? `✓ ${t('provider.valid')}` : `✗ ${t('provider.invalid')}`}
            </p>
          )}

          <p className="text-sm text-muted-foreground text-center">
            {t('provider.storedLocally')}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// NOTE: SkillsContent component removed - auto-install essential skills

// Installation status for each skill
type InstallStatus = 'pending' | 'installing' | 'completed' | 'failed';

interface SkillInstallState {
  id: string;
  name: string;
  description: string;
  status: InstallStatus;
}

interface InstallingContentProps {
  skills: DefaultSkill[];
  onComplete: (installedSkills: string[]) => void;
  onSkip: () => void;
}

function InstallingContent({ skills, onComplete, onSkip }: InstallingContentProps) {
  const { t } = useTranslation('setup');
  const [skillStates, setSkillStates] = useState<SkillInstallState[]>(
    skills.map((s) => ({ ...s, status: 'pending' as InstallStatus }))
  );
  const [overallProgress, setOverallProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const installStarted = useRef(false);

  // Real installation process
  useEffect(() => {
    if (installStarted.current) return;
    installStarted.current = true;

    const runRealInstall = async () => {
      try {
        // Step 1: Initialize all skills to 'installing' state for UI
        setSkillStates(prev => prev.map(s => ({ ...s, status: 'installing' })));
        setOverallProgress(10);

        // Step 2: Call the backend to install uv and setup Python
        const result = await invokeIpc('uv:install-all') as {
          success: boolean;
          error?: string
        };

        if (result.success) {
          setSkillStates(prev => prev.map(s => ({ ...s, status: 'completed' })));
          setOverallProgress(100);

          await new Promise((resolve) => setTimeout(resolve, 800));
          onComplete(skills.map(s => s.id));
        } else {
          setSkillStates(prev => prev.map(s => ({ ...s, status: 'failed' })));
          setErrorMessage(result.error || 'Unknown error during installation');
          toast.error('Environment setup failed');
        }
      } catch (err) {
        setSkillStates(prev => prev.map(s => ({ ...s, status: 'failed' })));
        setErrorMessage(String(err));
        toast.error('Installation error');
      }
    };

    runRealInstall();
  }, [skills, onComplete]);

  const getStatusIcon = (status: InstallStatus) => {
    switch (status) {
      case 'pending':
        return <div className="h-5 w-5 rounded-full border-2 border-slate-500" />;
      case 'installing':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const getStatusText = (skill: SkillInstallState) => {
    switch (skill.status) {
      case 'pending':
        return <span className="text-muted-foreground">{t('installing.status.pending')}</span>;
      case 'installing':
        return <span className="text-primary">{t('installing.status.installing')}</span>;
      case 'completed':
        return <span className="text-green-400">{t('installing.status.installed')}</span>;
      case 'failed':
        return <span className="text-red-400">{t('installing.status.failed')}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-xl font-semibold mb-2">{t('installing.title')}</h2>
        <p className="text-muted-foreground">
          {t('installing.subtitle')}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('installing.progress')}</span>
          <span className="text-primary">{overallProgress}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Skill list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {skillStates.map((skill) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg',
              skill.status === 'installing' ? 'bg-muted' : 'bg-muted/50'
            )}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(skill.status)}
              <div>
                <p className="font-medium">{skill.name}</p>
                <p className="text-xs text-muted-foreground">{skill.description}</p>
              </div>
            </div>
            {getStatusText(skill)}
          </motion.div>
        ))}
      </div>

      {/* Error Message Display */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-lg bg-red-900/30 border border-red-500/50 text-red-200 text-sm"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{t('installing.error')}</p>
              <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap font-monospace">
                {errorMessage}
              </pre>
              <Button
                variant="link"
                className="text-red-400 p-0 h-auto text-xs underline"
                onClick={() => window.location.reload()}
              >
                {t('installing.restart')}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {!errorMessage && (
        <p className="text-sm text-slate-400 text-center">
          {t('installing.wait')}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={onSkip}
        >
          {t('installing.skip')}
        </Button>
      </div>
    </div>
  );
}
interface CompleteContentProps {
  selectedProvider: string | null;
  installedSkills: string[];
}

function CompleteContent({ selectedProvider, installedSkills }: CompleteContentProps) {
  const { t } = useTranslation(['setup', 'settings']);
  const gatewayStatus = useGatewayStore((state) => state.status);
  const initGateway = useGatewayStore((state) => state.init);
  const setGatewayStatus = useGatewayStore((state) => state.setStatus);
  const [gatewayChecking, setGatewayChecking] = useState(true);

  const providerData = providers.find((p) => p.id === selectedProvider);
  const installedSkillNames = getDefaultSkills(t)
    .filter((s: DefaultSkill) => installedSkills.includes(s.id))
    .map((s: DefaultSkill) => s.name)
    .join(', ');

  useEffect(() => {
    let cancelled = false;
    const ensureGatewayReady = async () => {
      setGatewayChecking(true);
      try {
        await initGateway();
        let status = await invokeIpc<{ state?: string; port?: number; error?: string }>('gateway:status');
        if (!cancelled && status?.state) {
          setGatewayStatus({
            state: (status.state as 'running' | 'stopped' | 'starting' | 'error' | 'connected') || 'stopped',
            port: status.port,
            error: status.error,
          });
        }

        if ((status?.state || '').toLowerCase() !== 'running') {
          const started = await invokeIpc<{ state?: string; error?: string; diagnostics?: string[]; logTail?: string[] }>('gateway:start');
          if ((started?.state || '').toLowerCase() === 'error') {
            const diag = Array.isArray(started.diagnostics) && started.diagnostics.length > 0
              ? `\n\nDiagnostics:\n${started.diagnostics.map((line) => `- ${line}`).join('\n')}`
              : '';
            const tail = Array.isArray(started.logTail) && started.logTail.length > 0
              ? `\n\nRecent Logs:\n${started.logTail.slice(-25).join('\n')}`
              : '';
            throw new Error(`${started.error || 'Gateway start failed'}${diag}${tail}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 900));
          status = await invokeIpc<{ state?: string; port?: number; error?: string }>('gateway:status');
          if (!cancelled && status?.state) {
            setGatewayStatus({
              state: (status.state as 'running' | 'stopped' | 'starting' | 'error' | 'connected') || 'stopped',
              port: status.port,
              error: status.error,
            });
          }
        }

        const conn = await invokeIpc<{ success?: boolean; port?: number }>('gateway:checkConnection').catch(() => ({ success: false }));
        if (!cancelled && conn?.success) {
          setGatewayStatus({ state: 'running', port: conn.port || status?.port || 18789 });
        }
      } catch {
        // keep current gateway status in UI
      } finally {
        if (!cancelled) setGatewayChecking(false);
      }
    };

    void ensureGatewayReady();
    return () => {
      cancelled = true;
    };
  }, [initGateway, setGatewayStatus]);

  return (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-xl font-semibold">{t('complete.title')}</h2>
      <p className="text-muted-foreground">
        {t('complete.subtitle')}
      </p>

      <div className="space-y-3 text-left max-w-md mx-auto">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span>{t('complete.provider')}</span>
          <span className="text-green-400">
            {providerData ? <span className="flex items-center gap-1.5">{getProviderIconUrl(providerData.id) ? <img src={getProviderIconUrl(providerData.id)} alt={providerData.name} className={`h-4 w-4 inline-block ${shouldInvertInDark(providerData.id) ? 'dark:invert' : ''}`} /> : providerData.icon} {providerData.id === 'custom' ? t('settings:aiProviders.custom') : providerData.name}</span> : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span>{t('complete.components')}</span>
          <span className="text-green-400">
            {installedSkillNames || `${installedSkills.length} ${t('installing.status.installed')}`}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span>{t('complete.gateway')}</span>
          <span className={gatewayStatus.state === 'running' ? 'text-green-400' : 'text-yellow-400'}>
            {gatewayChecking
              ? t('runtime.detecting', { defaultValue: '检测中...' })
              : gatewayStatus.state === 'running'
                ? `✓ ${t('complete.running')}`
                : gatewayStatus.state}
          </span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('complete.footer')}
      </p>
    </div>
  );
}

export default Setup;
