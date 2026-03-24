/**
 * AxonClaw - Placeholder View
 * 通用占位视图
 */

import React from 'react';
import { useGatewayStore } from '@/stores/gateway';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface PlaceholderViewProps {
  title?: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title = 'Feature in development' }) => {
  const { t } = useTranslation('placeholder');
  const isOnline = useGatewayStore((s) => s.status.state === 'running');

  return (
    <div className="h-full flex flex-col bg-[#0f172a]">
      <div className="sticky top-0 z-10 shrink-0 pt-4 pb-4 bg-[#0f172a]">
        <h1 className="text-base font-bold text-foreground mb-2">{title}</h1>
        <div className={cn(
          'h-[3px] w-full transition-all duration-700 shrink-0',
          isOnline ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : 'bg-black/10 dark:bg-white/10'
        )} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-sm text-white/60">{t('comingSoon')}</p>
      </div>
    </div>
  );
};

export { PlaceholderView };
export default PlaceholderView;
