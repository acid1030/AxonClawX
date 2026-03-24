/**
 * AxonClaw - Templates View
 * Template Center界面 - AxonClawX 风格内容复刻
 */

import React from 'react';
import { Plus, FileText } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface TemplatesViewProps {
  embedded?: boolean;
}

const templates = [
  { id: '1', name: 'Technical docs', category: 'Docs', uses: 128 },
  { id: '2', name: 'Weekly report template', category: 'Reports', uses: 89 },
  { id: '3', name: 'API Design', category: 'Development', uses: 56 },
];

const TemplatesView: React.FC<TemplatesViewProps> = ({ embedded }) => {
  const { t } = useTranslation('views');
  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        'h-full min-h-0'
      )}
    >
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title="Template Center"
          subtitle="Manage and use preset templates"
          stats={[{ label: 'Templates', value: templates.length }]}
          statsBorderColor="border-cyan-500/40"
          actions={
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors">
              <Plus className="w-4 h-4" />
              {t('templates.new')}
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-xl border-2 border-cyan-500/40 bg-[#1e293b] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {tpl.name}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {tpl.category} · {t('templates.used', { count: tpl.uses })}
              </div>
              <button className="w-full py-2 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-medium text-foreground/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                {t('templates.use')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { TemplatesView };
export default TemplatesView;
