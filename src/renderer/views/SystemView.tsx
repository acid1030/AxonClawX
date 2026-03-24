/**
 * AxonClaw - System View (Settings only)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsView } from './SettingsView';
import { useGatewayStore } from '@/stores/gateway';
import { cn } from '@/lib/utils';

interface SystemViewProps {
  onNavigateTo?: (viewId: string) => void;
}

const SystemView: React.FC<SystemViewProps> = ({ onNavigateTo }) => {
  const isOnline = useGatewayStore((s) => s.status.state === 'running');
  const { t } = useTranslation();

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="sticky top-0 z-10 shrink-0 bg-[#0f172a] pt-4 pb-4">
        <h1 className="text-base font-bold text-foreground mb-2">{t('system.title')}</h1>
        <div className={cn(
          'h-[3px] w-full transition-all duration-700 shrink-0 mb-3',
          isOnline ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : 'bg-black/10 dark:bg-white/10'
        )} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <SettingsView embedded onNavigateTo={onNavigateTo} />
      </div>
    </div>
  );
};

export { SystemView };
export default SystemView;
