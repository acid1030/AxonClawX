import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chat';
import { Icons } from '../Icons/IconComponents';
import { SidebarItem } from './SidebarItem';
import { CollapseButton } from './CollapseButton';

// 新菜单结构（按用户要求）
const menuItems: { id: string; icon: any; labelKey: string }[] = [
  { id: 'overview', icon: Icons.dashboard, labelKey: 'overview' },
  { id: 'chat', icon: Icons.chat, labelKey: 'chat' },
  { id: 'channel-config', icon: Icons.channel, labelKey: 'config' },
  { id: 'agent-config', icon: Icons.agent, labelKey: 'agents' },
  { id: 'skill-config', icon: Icons.skill, labelKey: 'skills' },
  { id: 'knowledge', icon: Icons.knowledge, labelKey: 'knowledge' },
  { id: 'cron', icon: Icons.cron, labelKey: 'cron' },
  { id: 'nodes', icon: Icons.nodes, labelKey: 'nodes' },
  { id: 'system-monitor', icon: Icons.gatewayMonitor, labelKey: 'monitor' },
  { id: 'system-config', icon: Icons.system, labelKey: 'settings' },
];

interface UnifiedSidebarProps {
  activeView?: string;
  onViewChange?: (viewId: string) => void;
}

export function UnifiedSidebar({ activeView = 'dashboard', onViewChange }: UnifiedSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useTranslation();
  const newSession = useChatStore((s) => s.newSession);

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 56 : 240 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className={`
        relative flex flex-col
        bg-gradient-to-b from-[rgba(30,25,50,0.75)] to-[rgba(20,18,40,0.7)]
        backdrop-blur-xl
        border-r border-purple-500/10
        overflow-hidden
      `}
    >
      {/* Logo - Mac needs extra top padding for traffic lights (38px) */}
      <div 
        className="flex-shrink-0 px-3 pb-3 flex items-center" 
        style={{ 
          paddingTop: '48px', // Extra padding for Mac traffic lights
          minHeight: '80px' 
        }}
      >
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 w-full"
            >
              <img 
                src="./logo.png" 
                alt="AxonClaw Logo" 
                className="h-10 w-auto object-contain flex-shrink-0"
              />
              <span className="text-white font-semibold text-base whitespace-nowrap">AxonClaw</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isCollapsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/5 mx-auto"
          >
            <img 
              src="./logo.png" 
              alt="AxonClaw Logo"
              className="w-full h-full object-contain"
            />
          </motion.div>
        )}
      </div>

      {/* New Chat Button */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              newSession();
              onViewChange?.('chat');
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
          >
            <Icons.chat className="w-4 h-4 text-white/60 flex-shrink-0" />
            <span className="text-sm text-white/80">{t('newChatShort', { ns: 'chat' })}</span>
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="px-3 pb-2">
        <div className="h-px bg-white/10" />
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={t(item.labelKey, { ns: 'nav' })}
            isActive={activeView === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onViewChange?.(item.id)}
          />
        ))}
      </nav>

      {/* Collapse Button */}
      <div className="flex-shrink-0 p-3 flex justify-center border-t border-white/5">
        <CollapseButton
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      </div>
    </motion.aside>
  );
}
