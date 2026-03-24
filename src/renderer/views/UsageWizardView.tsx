/**
 * AxonClaw - 使用向导
 * AxonClawX 风格：配置完成度、分步引导、场景Templates
 */

import React, { useEffect, useState } from 'react';
import { Wand2, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentsStore } from '@/stores/agents';
import { useChannelsStore } from '@/stores/channels';
import { useSkillsStore } from '@/stores/skills';
import { useProviderStore } from '@/stores/providers';
import { useGatewayStore } from '@/stores/gateway';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  target?: string;
}

export const UsageWizardView: React.FC<{ onNavigateTo?: (view: string) => void }> = ({
  onNavigateTo,
}) => {
  const { t } = useTranslation('usageWizard');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const agents = useAgentsStore((s) => s.agents);
  const channels = useChannelsStore((s) => s.channels);
  const skills = useSkillsStore((s) => s.skills);
  const accounts = useProviderStore((s) => s.accounts);

  useEffect(() => {
    const list: ChecklistItem[] = [
      { id: 'gateway', label: t('check.gatewayConnected'), done: gatewayStatus.state === 'running', target: 'system' },
      { id: 'model', label: t('check.modelConfigured'), done: (accounts?.length ?? 0) > 0, target: 'model' },
      { id: 'agent', label: t('check.agentCreated'), done: (agents?.length ?? 0) > 0, target: 'agent' },
      { id: 'channel', label: t('check.channelConfigured'), done: (channels?.length ?? 0) > 0, target: 'channel' },
      { id: 'skill', label: t('check.skillsInstalled'), done: (skills?.length ?? 0) > 0, target: 'skill' },
    ];
    setItems(list);
  }, [gatewayStatus.state, agents?.length, channels?.length, skills?.length, accounts?.length, t]);

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isOnline = gatewayStatus.state === 'running';

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-[#0f172a]">
      <div className="sticky top-0 z-10 shrink-0 bg-[#0f172a] pt-4 pb-4">
        <h1 className="text-base font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-xs text-muted-foreground mb-2">
          {t('subtitle')}
        </p>
        <div className={cn(
          'h-[3px] w-full transition-all duration-700 shrink-0',
          isOnline ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : 'bg-black/10 dark:bg-white/10'
        )} />
      </div>
      <div className="flex-1 py-8 w-full">

        {/* 完成度 */}
        <div className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">{t('progressTitle')}</span>
            <span className="text-2xl font-bold text-indigo-400">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#0f172a] overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* 检查清单 */}
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => item.target && onNavigateTo?.(item.target)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors',
                item.done
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-indigo-500/20 hover:border-indigo-500/40 bg-[#1e293b]'
              )}
            >
              {item.done ? (
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              )}
              <span className={cn('flex-1', item.done ? 'text-muted-foreground' : 'text-foreground')}>
                {item.label}
              </span>
              {item.target && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>

        {pct === 100 && (
          <div className="mt-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{t('allDone')}</p>
            <Button
              className="bg-indigo-500 hover:bg-indigo-600"
              onClick={() => onNavigateTo?.('chat')}
            >
              {t('startChat')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageWizardView;
