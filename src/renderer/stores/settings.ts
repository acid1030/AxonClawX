/**
 * Settings State Store
 * Manages application settings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';
import { hostApiFetch } from '@/lib/host-api';

type Theme = 'light' | 'dark' | 'system';
type UpdateChannel = 'stable' | 'beta' | 'dev';

export interface FeatureVisibility {
  simpleMode: boolean;
  showAdvanced: boolean;
  showExperimental: boolean;
  items: {
    agentConfig: boolean;
    knowledge: boolean;
    cron: boolean;
    nodes: boolean;
    monitor: boolean;
    usage: boolean;
    diagnostics: boolean;
  };
}

function normalizeLanguageCode(input: string | undefined | null): string {
  const raw = String(input || '').trim();
  if (!raw) return 'en';
  const lower = raw.toLowerCase();
  if (lower === 'cn' || lower === 'zh-cn') return 'zh';
  // The main AxonClawX UI currently ships a complete Simplified Chinese
  // resource set. Normalize old persisted Traditional Chinese values back to
  // zh so the configuration center does not silently fall into zh-TW text.
  if (lower === 'zh-tw' || lower.startsWith('zh-hant') || lower.startsWith('zh-hk')) return 'zh';
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('ko')) return 'ko';
  if (lower.startsWith('en')) return 'en';
  return raw;
}

interface SettingsState {
  // General
  theme: Theme;
  language: string;
  startMinimized: boolean;
  launchAtStartup: boolean;
  telemetryEnabled: boolean;

  // Gateway
  gatewayAutoStart: boolean;
  gatewayPort: number;
  proxyEnabled: boolean;
  proxyServer: string;
  proxyHttpServer: string;
  proxyHttpsServer: string;
  proxyAllServer: string;
  proxyBypassRules: string;

  // Update
  updateChannel: UpdateChannel;
  autoCheckUpdate: boolean;
  autoDownloadUpdate: boolean;

  // UI State
  sidebarCollapsed: boolean;
  devModeUnlocked: boolean;

  // Notifications
  alertDesktopNotification: boolean;

  // Setup
  setupComplete: boolean;
  featureVisibility: FeatureVisibility;

  // Actions
  init: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  applyLanguageFromExternal: (language: string) => void;
  setStartMinimized: (value: boolean) => void;
  setLaunchAtStartup: (value: boolean) => void;
  setTelemetryEnabled: (value: boolean) => void;
  setGatewayAutoStart: (value: boolean) => void;
  setGatewayPort: (port: number) => void;
  setProxyEnabled: (value: boolean) => void;
  setProxyServer: (value: string) => void;
  setProxyHttpServer: (value: string) => void;
  setProxyHttpsServer: (value: string) => void;
  setProxyAllServer: (value: string) => void;
  setProxyBypassRules: (value: string) => void;
  setUpdateChannel: (channel: UpdateChannel) => void;
  setAutoCheckUpdate: (value: boolean) => void;
  setAutoDownloadUpdate: (value: boolean) => void;
  setSidebarCollapsed: (value: boolean) => void;
  setDevModeUnlocked: (value: boolean) => void;
  setAlertDesktopNotification: (value: boolean) => void;
  setFeatureVisibility: (value: Partial<FeatureVisibility>) => void;
  setFeatureItemVisible: (key: keyof FeatureVisibility['items'], value: boolean) => void;
  resetFeatureVisibility: () => void;
  markSetupComplete: () => Promise<void>;
  resetSettings: () => void;
}

const defaultSettings = {
  theme: 'system' as Theme,
  language: (() => {
    return normalizeLanguageCode(navigator.language);
  })(),
  startMinimized: false,
  launchAtStartup: false,
  telemetryEnabled: true,
  gatewayAutoStart: true,
  gatewayPort: 18789,
  proxyEnabled: false,
  proxyServer: '',
  proxyHttpServer: '',
  proxyHttpsServer: '',
  proxyAllServer: '',
  proxyBypassRules: '<local>;localhost;127.0.0.1;::1',
  updateChannel: 'stable' as UpdateChannel,
  autoCheckUpdate: true,
  autoDownloadUpdate: false,
  sidebarCollapsed: false,
  devModeUnlocked: false,
  alertDesktopNotification: true,
  setupComplete: false,
  featureVisibility: {
    simpleMode: true,
    showAdvanced: false,
    showExperimental: false,
    items: {
      agentConfig: false,
      knowledge: false,
      cron: false,
      nodes: false,
      monitor: false,
      usage: false,
      diagnostics: false,
    },
  } satisfies FeatureVisibility,
};

const PENDING_LANGUAGE_KEY = 'clawx:pending-language';

function readPendingLanguage(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(PENDING_LANGUAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writePendingLanguage(language: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_LANGUAGE_KEY, language);
  } catch {
    // ignore
  }
}

function clearPendingLanguage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PENDING_LANGUAGE_KEY);
  } catch {
    // ignore
  }
}

type HostSettingsResponse = Partial<Omit<typeof defaultSettings, 'setupComplete'>> & {
  setupComplete?: boolean;
};

type PersistedSettingsState = Partial<SettingsState>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      init: async () => {
        try {
          const settings = await hostApiFetch<HostSettingsResponse>('/api/settings');
          const pendingLanguage = readPendingLanguage();
          const mergedLanguage = normalizeLanguageCode(pendingLanguage || settings.language || '');
          const setupComplete = typeof settings.setupComplete === 'boolean' ? settings.setupComplete : get().setupComplete;
          set((state) => ({
            ...state,
            ...settings,
            setupComplete,
            ...(mergedLanguage ? { language: mergedLanguage } : {}),
          }));
          if (mergedLanguage) {
            i18n.changeLanguage(mergedLanguage);
          }
          if (pendingLanguage) {
            void hostApiFetch('/api/settings/language', {
              method: 'PUT',
              body: JSON.stringify({ value: pendingLanguage }),
            })
              .then(() => clearPendingLanguage())
              .catch(() => {
                // Keep pending language for next retry if host API is temporarily unavailable.
              });
          }
        } catch {
          // Keep renderer-persisted settings as a fallback when the main
          // process store is not reachable.
        }
      },

      setTheme: (theme) => {
        set({ theme });
        void hostApiFetch('/api/settings/theme', {
          method: 'PUT',
          body: JSON.stringify({ value: theme }),
        }).catch(() => { });
      },
      setLanguage: (language) => {
        const nextLanguage = normalizeLanguageCode(language);
        if (get().language === nextLanguage) return;
        i18n.changeLanguage(nextLanguage);
        set({ language: nextLanguage });
        writePendingLanguage(nextLanguage);
        void hostApiFetch('/api/settings/language', {
          method: 'PUT',
          body: JSON.stringify({ value: nextLanguage }),
        })
          .then(() => clearPendingLanguage())
          .catch(() => {
            // Keep pending language for next retry if host API is temporarily unavailable.
          });
      },
      applyLanguageFromExternal: (language) => {
        const nextLanguage = normalizeLanguageCode(language);
        if (!nextLanguage || get().language === nextLanguage) return;
        i18n.changeLanguage(nextLanguage);
        set({ language: nextLanguage });
      },
      setStartMinimized: (startMinimized) => set({ startMinimized }),
      setLaunchAtStartup: (launchAtStartup) => {
        set({ launchAtStartup });
        void hostApiFetch('/api/settings/launchAtStartup', {
          method: 'PUT',
          body: JSON.stringify({ value: launchAtStartup }),
        }).catch(() => { });
      },
      setTelemetryEnabled: (telemetryEnabled) => {
        set({ telemetryEnabled });
        void hostApiFetch('/api/settings/telemetryEnabled', {
          method: 'PUT',
          body: JSON.stringify({ value: telemetryEnabled }),
        }).catch(() => { });
      },
      setGatewayAutoStart: (gatewayAutoStart) => {
        set({ gatewayAutoStart });
        void hostApiFetch('/api/settings/gatewayAutoStart', {
          method: 'PUT',
          body: JSON.stringify({ value: gatewayAutoStart }),
        }).catch(() => { });
      },
      setGatewayPort: (gatewayPort) => {
        set({ gatewayPort });
        void hostApiFetch('/api/settings/gatewayPort', {
          method: 'PUT',
          body: JSON.stringify({ value: gatewayPort }),
        }).catch(() => { });
      },
      setProxyEnabled: (proxyEnabled) => set({ proxyEnabled }),
      setProxyServer: (proxyServer) => set({ proxyServer }),
      setProxyHttpServer: (proxyHttpServer) => set({ proxyHttpServer }),
      setProxyHttpsServer: (proxyHttpsServer) => set({ proxyHttpsServer }),
      setProxyAllServer: (proxyAllServer) => set({ proxyAllServer }),
      setProxyBypassRules: (proxyBypassRules) => set({ proxyBypassRules }),
      setUpdateChannel: (updateChannel) => set({ updateChannel }),
      setAutoCheckUpdate: (autoCheckUpdate) => set({ autoCheckUpdate }),
      setAutoDownloadUpdate: (autoDownloadUpdate) => set({ autoDownloadUpdate }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setDevModeUnlocked: (devModeUnlocked) => set({ devModeUnlocked }),
      setAlertDesktopNotification: (alertDesktopNotification) => set({ alertDesktopNotification }),
      setFeatureVisibility: (value) => {
        set((state) => ({
          featureVisibility: {
            ...state.featureVisibility,
            ...value,
            items: {
              ...state.featureVisibility.items,
              ...(value.items ?? {}),
            },
          },
        }));
      },
      setFeatureItemVisible: (key, value) => {
        set((state) => ({
          featureVisibility: {
            ...state.featureVisibility,
            items: {
              ...state.featureVisibility.items,
              [key]: value,
            },
          },
        }));
      },
      resetFeatureVisibility: () => {
        set((state) => ({
          featureVisibility: {
            ...defaultSettings.featureVisibility,
            items: { ...defaultSettings.featureVisibility.items },
          },
          sidebarCollapsed: state.sidebarCollapsed,
        }));
      },
      markSetupComplete: async () => {
        set({ setupComplete: true });
        try {
          await hostApiFetch('/api/settings/setup-complete', {
            method: 'PUT',
            body: JSON.stringify({ value: true }),
          });
        } catch {
          // Keep local state even if persistence is temporarily unavailable.
        }
      },
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'clawx-settings',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as PersistedSettingsState) || {};
        // setupComplete must come from host config, not stale renderer cache.
        const { setupComplete: _ignored, ...rest } = persisted;
        return {
          ...currentState,
          ...rest,
        };
      },
    }
  )
);
