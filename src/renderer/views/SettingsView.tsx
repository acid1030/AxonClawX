/**
 * AxonClaw - 系统Settings
 * AxonClawX 风格：账户安全 | 异常通知 | 配置备份 | 操作日志 | 软件更新 | 打赏支持 | 关于项目
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bell,
  Cloud,
  ClipboardList,
  Download,
  Heart,
  Info,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Languages,
  Palette,
  BadgeInfo,
} from 'lucide-react';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { Switch } from '@/components/ui/switch';
import { useUpdateStore } from '@/stores/update';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type SettingsSection =
  | 'general'
  | 'account'
  | 'notification'
  | 'backup'
  | 'logs'
  | 'update'
  | 'donate'
  | 'about';

interface StorageInfo {
  dataDir: string;
  logDir: string;
}

interface BindAddressState {
  mode: '0.0.0.0' | '127.0.0.1' | 'custom';
  customHost?: string;
}

const SETTINGS_LABELS: Record<SettingsSection, { key: string; fallback: string }> = {
  general: { key: 'general.menu', fallback: 'General' },
  account: { key: 'account.menu', fallback: 'Account' },
  notification: { key: 'notification.menu', fallback: 'Notifications' },
  backup: { key: 'backup.menu', fallback: 'Backup' },
  logs: { key: 'logs.menu', fallback: 'Logs' },
  update: { key: 'update.menu', fallback: 'Update' },
  donate: { key: 'donate.menu', fallback: 'Support' },
  about: { key: 'about.menu', fallback: 'About' },
};

const SIDEBAR_ITEMS: { id: SettingsSection; icon: React.ElementType; iconColor?: string }[] = [
  { id: 'general', icon: SlidersHorizontal, iconColor: 'text-cyan-400' },
  { id: 'account', icon: Shield, iconColor: 'text-blue-400' },
  { id: 'notification', icon: Bell, iconColor: 'text-amber-400' },
  { id: 'backup', icon: Cloud, iconColor: 'text-emerald-400' },
  { id: 'logs', icon: ClipboardList, iconColor: 'text-orange-400' },
  { id: 'update', icon: Download, iconColor: 'text-blue-400' },
  { id: 'donate', icon: Heart, iconColor: 'text-pink-400' },
  { id: 'about', icon: Info, iconColor: 'text-purple-400' },
];

const BIND_OPTIONS: { value: BindAddressState['mode']; labelKey: string }[] = [
  { value: '0.0.0.0', labelKey: 'settings.account.bindAllNics' },
  { value: '127.0.0.1', labelKey: 'settings.account.bindLocalOnly' },
  { value: 'custom', labelKey: 'settings.account.bindCustom' },
];

const LANGUAGE_OPTIONS: { value: string; labelKey: string; fallbackLabel: string }[] = [
  { value: 'zh', labelKey: 'settings.general.languageOptions.zh', fallbackLabel: 'Simplified Chinese' },
  { value: 'zh-TW', labelKey: 'settings.general.languageOptions.zhTW', fallbackLabel: 'Traditional Chinese' },
  { value: 'en', labelKey: 'settings.general.languageOptions.en', fallbackLabel: 'English' },
  { value: 'ja', labelKey: 'settings.general.languageOptions.ja', fallbackLabel: 'Japanese' },
  { value: 'ko', labelKey: 'settings.general.languageOptions.ko', fallbackLabel: '한국어' },
];

interface AlertSummary {
  high: number;
  medium: number;
  count1h: number;
  count24h: number;
  healthScore: number;
}

interface AlertItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface SettingsViewProps {
  embedded?: boolean;
  onNavigateTo?: (viewId: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ embedded, onNavigateTo }) => {
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [bindAddress, setBindAddress] = useState<BindAddressState>({ mode: '127.0.0.1' });
  const [customBindHost, setCustomBindHost] = useState('');
  const [bindSaving, setBindSaving] = useState(false);
  const [bindSaved, setBindSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [alertList, setAlertList] = useState<AlertItem[]>([]);
  const [alertLoading, setAlertLoading] = useState(false);

  const currentVersion = useUpdateStore((s) => s.currentVersion) || '1.0.0';
  const updateStatus = useUpdateStore((s) => s.status);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const updateProgress = useUpdateStore((s) => s.progress);
  const updateError = useUpdateStore((s) => s.error);
  const initUpdate = useUpdateStore((s) => s.init);
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);
  const downloadUpdate = useUpdateStore((s) => s.downloadUpdate);
  const installUpdate = useUpdateStore((s) => s.installUpdate);
  const isOnline = useGatewayStore((s) => s.status.state === 'running');
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const alertDesktopNotification = useSettingsStore((s) => s.alertDesktopNotification);
  const setAlertDesktopNotification = useSettingsStore((s) => s.setAlertDesktopNotification);

  const currentUser = 'admin';

  useEffect(() => {
    void initUpdate();
  }, [initUpdate]);

  useEffect(() => {
    hostApiFetch<{ dataDir?: string; logDir?: string }>('/api/settings/storage')
      .then((r) => setStorageInfo({ dataDir: r.dataDir ?? '~/.openclaw', logDir: r.logDir ?? '/tmp/openclaw' }))
      .catch(() => setStorageInfo({ dataDir: '~/.openclaw', logDir: '/tmp/openclaw' }));
  }, []);

  useEffect(() => {
    hostApiFetch<BindAddressState>('/api/settings/bind-address')
      .then((r) => {
        setBindAddress({ mode: r.mode ?? '127.0.0.1', customHost: r.customHost });
        setCustomBindHost(r.customHost ?? '');
      })
      .catch(() => setBindAddress({ mode: '127.0.0.1' }));
  }, []);

  const fetchAlertSummary = async () => {
    setAlertLoading(true);
    try {
      const data = await hostApiFetch<{ summary?: AlertSummary; alerts?: AlertItem[] }>('/api/alerts');
      if (data?.summary) setAlertSummary(data.summary);
      else setAlertSummary(null);
      setAlertList(Array.isArray(data?.alerts) ? data.alerts.slice(0, 10) : []);
    } catch {
      setAlertSummary(null);
      setAlertList([]);
    } finally {
      setAlertLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'notification') void fetchAlertSummary();
  }, [activeSection]);

  const handleSaveBindAddress = async () => {
    setBindSaving(true);
    setBindSaved(false);
    setPasswordError(null);
    try {
      await hostApiFetch('/api/settings/bind-address', {
        method: 'PUT',
        body: JSON.stringify({
          mode: bindAddress.mode,
          customHost: bindAddress.mode === 'custom' ? customBindHost : undefined,
        }),
      });
      setBindSaved(true);
      setTimeout(() => setBindSaved(false), 2000);
    } catch (e) {
      setPasswordError(String(e));
    } finally {
      setBindSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError(t('settings.account.mismatch'));
      return;
    }
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await hostApiFetch('/api/settings/password', {
        method: 'POST',
        body: JSON.stringify({
          current: passwordForm.current,
          new: passwordForm.new,
          confirm: passwordForm.confirm,
        }),
      });
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (e) {
      setPasswordError(String(e));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleOpenLogDir = async () => {
    try {
      const { dir } = await hostApiFetch<{ dir: string | null }>('/api/logs/dir');
      if (dir) await invokeIpc('shell:showItemInFolder', dir);
    } catch {
      /* ignore */
    }
  };

  const cardClass = 'rounded-xl border border-white/10 bg-[#1e293b] overflow-hidden';
  const rowClass = 'flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-b-0 gap-4';
  const inputClass = 'h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90 outline-none focus:ring-1 focus:ring-indigo-500/50 min-w-[180px]';
  const btnPrimary = 'px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50';

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-[#0f172a] overflow-hidden', embedded && 'flex-col')}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧导航 - AxonClawX 风格 */}
        <aside className="w-[220px] shrink-0 flex flex-col border-r border-white/10 overflow-y-auto">
          {/* 顶部用户区 */}
          <div className="p-4 flex items-center gap-3 border-b border-white/5">
            <div className="w-10 h-10 rounded-full bg-indigo-500/40 flex items-center justify-center text-lg font-bold text-indigo-300">
              {currentUser.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white/90 truncate">{currentUser}</div>
              <div className="text-xs text-white/40">AxonClawX</div>
            </div>
          </div>
          <nav className="flex-1 py-2 px-2">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] transition-colors',
                  activeSection === item.id
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', item.iconColor ?? 'text-white/60')} />
                <span className="flex-1 text-left">
                  {t(SETTINGS_LABELS[item.id].key, { ns: 'settings', defaultValue: SETTINGS_LABELS[item.id].fallback })}
                </span>
                {activeSection === item.id && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          <div className="max-w-[620px]">

            {activeSection === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.general.title')}</h2>
                  <p className="text-sm text-white/50 mb-4">{t('settings.general.desc')}</p>
                </div>

                <div className={cardClass}>
                  <div className={rowClass}>
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-sm font-medium text-white/80">{t('settings.general.language')}</div>
                        <div className="text-xs text-white/40 mt-0.5">{t('settings.general.languageDesc')}</div>
                      </div>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90"
                    >
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey, { defaultValue: opt.fallbackLabel })}</option>
                      ))}
                    </select>
                  </div>

                  <div className={rowClass}>
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="text-sm font-medium text-white/80">{t('settings.general.theme')}</div>
                        <div className="text-xs text-white/40 mt-0.5">{t('settings.general.themeDesc')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                          theme === 'light' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                        )}
                      >
                        {t('settings.general.themeLight')}
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                          theme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                        )}
                      >
                        {t('settings.general.themeDark')}
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                          theme === 'system' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                        )}
                      >
                        {t('settings.general.themeSystem')}
                      </button>
                    </div>
                  </div>

                  <div className={rowClass}>
                    <div className="flex items-center gap-2">
                      <BadgeInfo className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-sm font-medium text-white/80">{t('settings.general.version')}</div>
                        <div className="text-xs text-white/40 mt-0.5">{t('settings.general.versionDesc')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-white/80">v{currentVersion}</div>
                      <div className={cn('text-xs mt-0.5', isOnline ? 'text-emerald-400' : 'text-amber-400')}>
                        {isOnline ? t('settings.general.gatewayOnline') : t('settings.general.gatewayOffline')}
                      </div>
                    </div>
                  </div>

                  <div className={rowClass}>
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-sm font-medium text-white/80">{t('settings.general.update')}</div>
                        <div className="text-xs text-white/40 mt-0.5">
                          {updateStatus === 'available'
                            ? t('settings.general.updateAvailable', { version: updateInfo?.version ?? '' })
                            : updateStatus === 'downloading'
                              ? t('settings.general.updateDownloading', { percent: Math.round(updateProgress?.percent ?? 0) })
                              : updateStatus === 'downloaded'
                                ? t('settings.general.updateDownloaded')
                                : updateStatus === 'checking'
                                  ? t('settings.general.updateChecking')
                                  : updateStatus === 'error'
                                    ? (updateError || t('settings.general.updateError'))
                                    : t('settings.general.updateDefault')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {updateStatus === 'available' ? (
                        <button
                          onClick={() => void downloadUpdate()}
                          className="px-3 py-1.5 rounded-lg text-xs border bg-indigo-500/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/30"
                        >
                          {t('settings.general.downloadUpdate')}
                        </button>
                      ) : updateStatus === 'downloaded' ? (
                        <button
                          onClick={installUpdate}
                          className="px-3 py-1.5 rounded-lg text-xs border bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                        >
                          {t('settings.general.installNow')}
                        </button>
                      ) : (
                        <button
                          onClick={() => void checkForUpdates()}
                          disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                          className="px-3 py-1.5 rounded-lg text-xs border bg-white/5 border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
                        >
                          {t('settings.general.checkUpdate')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'account' && (
              <div className="space-y-6">
                {/* 修改密码 */}
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.account.passwordTitle')}</h2>
                  <div className={cardClass}>
                    <div className={rowClass}>
                      <label className="text-sm font-medium text-white/80 w-24 shrink-0">{t('settings.account.currentPassword')}</label>
                      <input
                        type="password"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                        placeholder={t('settings.account.placeholderCurrent')}
                        className={inputClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <label className="text-sm font-medium text-white/80 w-24 shrink-0">{t('settings.account.newPassword')}</label>
                      <input
                        type="password"
                        value={passwordForm.new}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))}
                        placeholder={t('settings.account.placeholderNew')}
                        className={inputClass}
                      />
                    </div>
                    <div className={rowClass}>
                      <label className="text-sm font-medium text-white/80 w-24 shrink-0">{t('settings.account.confirmPassword')}</label>
                      <input
                        type="password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                        placeholder={t('settings.account.placeholderConfirm')}
                        className={inputClass}
                      />
                    </div>
                    <div className="px-4 py-3 flex justify-end">
                      <button onClick={handleSavePassword} disabled={passwordSaving} className={btnPrimary}>
                        {passwordSaving ? t('settings.account.saving') : t('settings.account.save')}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    {t('settings.account.desktopNote')}
                  </p>
                </div>

                {/* 访问安全 */}
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.account.accessTitle')}</h2>
                  <p className="text-sm text-white/50 mb-4">
                    {t('settings.account.accessDesc')}
                  </p>
                  <div className={cardClass}>
                    <div className="px-4 py-3">
                      <div className="text-sm font-medium text-white/80 mb-3">{t('settings.account.bindAddress')}</div>
                      <div className="flex flex-wrap gap-2">
                        {BIND_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setBindAddress((b) => ({ ...b, mode: opt.value }))}
                            className={cn(
                              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                              bindAddress.mode === opt.value
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                            )}
                          >
                            {t(opt.labelKey)}
                          </button>
                        ))}
                      </div>
                      {bindAddress.mode === 'custom' && (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={customBindHost}
                            onChange={(e) => setCustomBindHost(e.target.value)}
                            placeholder={t('settings.account.bindPlaceholder')}
                            className={cn(inputClass, 'w-full max-w-[200px]')}
                          />
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={handleSaveBindAddress} disabled={bindSaving} className={btnPrimary}>
                          {bindSaving ? t('settings.account.saving') : bindSaved ? t('settings.account.saved') : t('settings.account.save')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {passwordError && (
                  <div className="text-sm text-red-400">{passwordError}</div>
                )}
              </div>
            )}

            {activeSection === 'notification' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.notification.title')}</h2>
                  <p className="text-sm text-white/50 mb-4">{t('settings.notification.desc')}</p>
                </div>

                {/* 通知方式 */}
                <div className={cardClass}>
                  <div className="px-4 py-3 border-b border-white/5">
                    <div className="text-sm font-medium text-white/80">{t('settings.notification.channelsTitle')}</div>
                    <div className="text-xs text-white/40 mt-0.5">{t('settings.notification.channelsDesc')}</div>
                  </div>
                  <div className={rowClass}>
                    <div>
                      <div className="text-sm font-medium text-white/80">{t('settings.notification.desktopTitle')}</div>
                      <div className="text-xs text-white/40 mt-0.5">{t('settings.notification.desktopDesc')}</div>
                    </div>
                    <Switch checked={alertDesktopNotification} onCheckedChange={setAlertDesktopNotification} />
                  </div>
                </div>

                {/* 告警摘要 */}
                <div className={cardClass}>
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white/80">{t('settings.notification.summaryTitle')}</div>
                      <div className="text-xs text-white/40 mt-0.5">{t('settings.notification.summaryDesc')}</div>
                    </div>
                    <button
                      onClick={fetchAlertSummary}
                      disabled={alertLoading}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors disabled:opacity-50"
                      title={t('settings.notification.refresh')}
                    >
                      <RefreshCw className={cn('w-4 h-4', alertLoading && 'animate-spin')} />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {alertSummary != null ? (
                      <>
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-white/90">{t('settings.notification.severe')}</span>
                            <span className="text-sm font-semibold text-red-400">{alertSummary.high}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            <span className="text-sm text-white/90">{t('settings.notification.warning')}</span>
                            <span className="text-sm font-semibold text-amber-400">{alertSummary.medium}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-xs text-white/50">{t('settings.notification.healthWindow')}</span>
                            <span className="text-sm font-medium text-white/80">{alertSummary.count1h} / {alertSummary.count24h}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-xs text-white/50">{t('settings.notification.healthScore')}</span>
                          <span className={cn(
                            'text-sm font-medium',
                            (alertSummary.healthScore ?? 100) >= 80 ? 'text-emerald-400' : (alertSummary.healthScore ?? 100) >= 60 ? 'text-amber-400' : 'text-red-400'
                          )}>
                            {t('settings.notification.scorePoints', { score: alertSummary.healthScore ?? 100 })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-center text-sm text-white/50">
                        {alertLoading ? t('settings.notification.loading') : t('settings.notification.noAlertData')}
                      </div>
                    )}
                  </div>
                  {onNavigateTo && (
                    <div className="px-4 py-3 border-t border-white/5">
                      <button
                        onClick={() => onNavigateTo('alerts')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('settings.notification.viewAllAlerts')}
                      </button>
                    </div>
                  )}
                </div>

                {/* 近期告警列表 */}
                <div className={cardClass}>
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white/80">{t('settings.notification.recentAlertsTitle')}</div>
                      <div className="text-xs text-white/40 mt-0.5">{t('settings.notification.recentAlertsDesc')}</div>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {alertList.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-white/50">{t('settings.notification.noAlertRecords')}</div>
                    ) : (
                      alertList.map((a) => (
                        <div key={a.id} className="px-4 py-2.5 flex items-start gap-2">
                          <span className={cn(
                            'shrink-0 w-2 h-2 rounded-full mt-1.5',
                            a.level === 'critical' ? 'bg-red-500' : a.level === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                          )} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-white/80">{a.title || t('settings.notification.alertFallbackTitle')}</div>
                            {a.message && <div className="text-xs text-white/50 mt-0.5 line-clamp-2">{a.message}</div>}
                            <div className="text-xs text-white/40 mt-1">{new Date(a.timestamp).toLocaleString(i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : i18n.language)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {alertList.length > 0 && onNavigateTo && (
                    <div className="px-4 py-2 border-t border-white/5">
                      <button
                        onClick={() => onNavigateTo('alerts')}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        {t('settings.notification.viewAllShort')}
                      </button>
                    </div>
                  )}
                </div>

                {/* 通知规则说明 */}
                <div className={cardClass}>
                  <div className="px-4 py-3 border-b border-white/5">
                    <div className="text-sm font-medium text-white/80">{t('settings.notification.rulesTitle')}</div>
                    <div className="text-xs text-white/40 mt-0.5">{t('settings.notification.rulesDesc')}</div>
                  </div>
                  <div className="p-4 text-sm text-white/60 space-y-2">
                    <p>{t('settings.notification.ruleDesktop')}</p>
                    <p>{t('settings.notification.ruleQuietHours')}</p>
                    <p>{t('settings.notification.ruleWebhookEmail')}</p>
                  </div>
                </div>

                <p className="text-xs text-white/40">
                  {t('settings.notification.advancedHint')}
                </p>
              </div>
            )}

            {activeSection === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.backup.title')}</h2>
                  <p className="text-sm text-white/50 mb-4">{t('settings.backup.desc')}</p>
                </div>
                <div className={cardClass}>
                  <div className="p-4 text-sm text-white/60">
                    {t('settings.backup.note')}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'logs' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.logs.title')}</h2>
                  <p className="text-sm text-white/50 mb-4">{t('settings.logs.desc')}</p>
                </div>
                <div className={cardClass}>
                  <div className={rowClass}>
                    <div>
                      <div className="text-sm font-medium text-white/80">{t('settings.logs.logDir')}</div>
                      <div className="text-xs text-white/40 mt-0.5">{t('settings.logs.logDirDesc')}</div>
                    </div>
                    <span className="text-xs font-mono text-white/50">{storageInfo?.logDir ?? '/tmp/openclaw'}</span>
                  </div>
                  <div className={rowClass}>
                    <div>
                      <div className="text-sm font-medium text-white/80">{t('settings.logs.openLogDir')}</div>
                    </div>
                    <button onClick={handleOpenLogDir} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 transition-colors">
                      {t('settings.logs.openInFinder')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'update' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.update.title')}</h2>
                  <p className="text-sm text-white/50 mb-4">{t('settings.update.desc')}</p>
                </div>
                <div className={cardClass}>
                  <div className={rowClass}>
                    <span className="text-sm text-white/80">{t('settings.update.currentVersion')}</span>
                    <span className="font-mono text-sm text-white/50">v{currentVersion}</span>
                  </div>
                  <div className="p-4 text-sm text-white/60">
                    {t('settings.update.manualHint')}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'donate' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.donate.title')}</h2>
                  <p className="text-sm text-white/50 mb-4">{t('settings.donate.desc')}</p>
                </div>
                <div className={cardClass}>
                  <div className="p-4 text-sm text-white/60">
                    {t('settings.donate.hint')}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'about' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">{t('settings.about.title')}</h2>
                  <p className="text-sm text-white/50 mb-4">{t('settings.about.desc')}</p>
                </div>
                <div className={cardClass}>
                  <div className="flex items-center gap-4 p-4 border-b border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-2xl">
                      🦾
                    </div>
                    <div>
                      <div className="text-base font-bold text-white/90">AxonClaw</div>
                      <div className="text-xs text-white/50 mt-0.5">{t('settings.about.appSubtitle')}</div>
                    </div>
                  </div>
                  <div className={rowClass}>
                    <span className="text-sm text-white/50">{t('settings.about.versionLabel')}</span>
                    <span className="font-mono text-sm text-white/80">v{currentVersion}</span>
                  </div>
                  <div className={rowClass}>
                    <span className="text-sm text-white/50">{t('settings.about.gatewayLabel')}</span>
                    <span className={cn('text-sm font-medium', isOnline ? 'text-emerald-400' : 'text-amber-400')}>
                      {isOnline ? t('settings.general.gatewayOnline') : t('settings.general.gatewayOffline')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 页脚 - AxonClawX OS */}
      <footer className="shrink-0 px-4 py-2 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
        <span>{t('settings.footer.os')}</span>
      </footer>
    </div>
  );
};

export { SettingsView };
export default SettingsView;
