/**
 * AxonClaw - Run View (Composite)
 * Tab: 会话 | 日志 | 活动
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionsView } from './SessionsView';
import { LogsView } from './LogsView';
import { ActivityView } from './ActivityView';
import { useGatewayStore } from '@/stores/gateway';
import { cn } from '@/lib/utils';

type RunTab = 'session' | 'log' | 'activity';

const tabs: { id: RunTab; labelKey: string }[] = [
  { id: 'session', labelKey: 'run.tabs.sessions' },
  { id: 'log', labelKey: 'run.tabs.logs' },
  { id: 'activity', labelKey: 'run.tabs.activity' },
];

interface RunViewProps {
  onNavigateTo?: (viewId: string) => void;
}

const RunView: React.FC<RunViewProps> = ({ onNavigateTo }) => {
  const [activeTab, setActiveTab] = useState<RunTab>('session');
  const isOnline = useGatewayStore((s) => s.status.state === 'running');
  const { t } = useTranslation();

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="sticky top-0 z-10 shrink-0 bg-[#0f172a] pt-4 pb-4">
        <h1 className="text-base font-bold text-foreground mb-2">{t('run.title')}</h1>
        <div className={cn(
          'h-[3px] w-full transition-all duration-700 shrink-0 mb-3',
          isOnline ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : 'bg-black/10 dark:bg-white/10'
        )} />
      </div>
      <div className="flex items-center gap-1 pb-2 border-b border-white/10 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-t-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-[#1e293b] text-foreground border-t-2 border-x-2 border-indigo-500/40 -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'session' && <SessionsView onNavigateTo={onNavigateTo} embedded />}
        {activeTab === 'log' && <LogsView embedded />}
        {activeTab === 'activity' && <ActivityView embedded />}
      </div>
    </div>
  );
};

export { RunView };
export default RunView;
