/**
 * AxonClaw - Extensions View (Composite)
 * Tab: Templates | Plugins
 */

import React, { useState } from 'react';
import { TemplatesView } from './TemplatesView';
import { PluginsView } from './PluginsView';
import { cn } from '@/lib/utils';

type ExtTab = 'template' | 'plugin';

const tabs: { id: ExtTab; label: string }[] = [
  { id: 'template', label: 'Templates' },
  { id: 'plugin', label: 'Plugins' },
];

const ExtensionsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ExtTab>('template');

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="flex items-center gap-1 pt-4 pb-2 border-b border-white/10 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-t-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-[#1e293b] text-foreground border-t-2 border-x-2 border-purple-500/40 -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'template' && <TemplatesView embedded />}
        {activeTab === 'plugin' && <PluginsView embedded />}
      </div>
    </div>
  );
};

export { ExtensionsView };
export default ExtensionsView;
