/**
 * AxonClaw - Workflow View
 * Workflow界面 - AxonClawX 风格内容复刻
 */

import React from 'react';
import { Plus, GitBranch, Play, Pause } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const workflows = [
  { id: '1', name: 'Daily report generation', status: 'active' as const, trigger: 'Daily 08:00', steps: 3 },
  { id: '2', name: 'Content publishing', status: 'inactive' as const, trigger: 'Manual', steps: 5 },
];

const WorkflowView: React.FC = () => {
  const { t } = useTranslation('views');
  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title="Workflow"
          subtitle="Create and manage automated workflows"
          stats={[
            { label: 'Total', value: workflows.length },
            { label: 'Running', value: workflows.filter((w) => w.status === 'active').length },
          ]}
          statsBorderColor="border-teal-500/40"
          actions={
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors">
              <Plus className="w-4 h-4" />
              {t('workflow.new')}
            </button>
          }
        />

        <div className="space-y-3 max-w-2xl">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="rounded-xl border-2 border-teal-500/40 bg-[#1e293b] p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    wf.status === 'active' ? 'bg-emerald-500/15' : 'bg-black/5 dark:bg-white/5'
                  )}
                >
                  <GitBranch
                    className={cn(
                      'w-5 h-5',
                      wf.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {wf.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t('workflow.trigger')}: {wf.trigger} · {wf.steps} {t('workflow.steps')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium',
                    wf.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
                  )}
                >
                  {wf.status === 'active' ? 'Running' : 'Stopped'}
                </span>
                <button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  {wf.status === 'active' ? (
                    <Pause className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Play className="w-4 h-4 text-emerald-500" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { WorkflowView };
export default WorkflowView;
