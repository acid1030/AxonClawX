/**
 * AxonClaw - 配置中心视图
 * 封装 AxonClawX 完整配置编辑器（分类导航、JSON 编辑器、各配置区块）
 */

import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { loadLocale } from '@/clawdeckx/locales';
// 必须使用 Editor/index（完整配置中心），不要用 Editor.tsx（简化版）
import Editor from '@/clawdeckx/windows/Editor/index';
import type { Language } from '@/clawdeckx/types';

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set([
  'zh', 'en', 'ja', 'ko', 'es', 'pt-BR', 'de', 'fr', 'ru', 'zh-TW', 'ar', 'hi', 'id'
]);

function toClawdeckLanguage(lang: string): Language {
  if (!lang) return 'en';
  const lower = lang.toLowerCase();
  if (lower.startsWith('zh-tw') || lower === 'zh-tw') return 'zh-TW';
  if (lower.startsWith('zh')) return 'zh';
  return (SUPPORTED_LANGUAGES.has(lang) ? lang : 'en') as Language;
}

interface ConfigurationCenterViewProps {
  pendingSection?: string | null;
}

export const ConfigurationCenterView: React.FC<ConfigurationCenterViewProps> = ({ pendingSection = null }) => {
  const language = useSettingsStore((s) => s.language);
  const clawdeckLang = toClawdeckLanguage(language);
  const [localeReady, setLocaleReady] = useState(false);
  const [sectionToken, setSectionToken] = useState(0);

  useEffect(() => {
    if (clawdeckLang === 'en') {
      setLocaleReady(true);
      return;
    }
    setLocaleReady(false);
    loadLocale(clawdeckLang).then(() => setLocaleReady(true));
  }, [clawdeckLang]);

  useEffect(() => {
    if (pendingSection) setSectionToken((n) => n + 1);
  }, [pendingSection]);

  if (!localeReady) {
    return (
      <div className="h-full flex items-center justify-center dark">
        <span className="material-symbols-outlined text-2xl text-slate-400 animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden dark">
      <Editor key={`cfg-${sectionToken}-${clawdeckLang}`} language={clawdeckLang} pendingSection={pendingSection} />
    </div>
  );
};

export default ConfigurationCenterView;
