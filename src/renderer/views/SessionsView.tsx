/**
 * AxonClaw - Sessions View
 * 会话管理界面 - AxonClawX 风格内容复刻
 * 使用真实 sessions 数据，点击打开跳转对话
 */

import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Plus, RefreshCw } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

interface SessionsViewProps {
  onNavigateTo?: (viewId: string) => void;
  /** 嵌入模式：在 RunView 等复合视图中使用，使用 h-full 而非固定高度 */
  embedded?: boolean;
}

const SessionsView: React.FC<SessionsViewProps> = ({ onNavigateTo, embedded }) => {
  const { t, i18n } = useTranslation();
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionLabels = useChatStore((s) => s.sessionLabels);
  const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const switchSession = useChatStore((s) => s.switchSession);
  const newSession = useChatStore((s) => s.newSession);

  const gatewayStatus = useGatewayStore((s) => s.status);
  const isOnline = gatewayStatus.state === 'running';

  const refresh = useCallback(async () => {
    await loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (isOnline) {
      loadSessions().catch(console.error);
    }
  }, [isOnline, loadSessions]);

  const handleOpenSession = (key: string) => {
    switchSession(key);
    onNavigateTo?.('chat');
  };

  const handleNewSession = () => {
    newSession();
    onNavigateTo?.('chat');
  };

  const timeFormatter = new Intl.DateTimeFormat(i18n.language === 'zh' ? 'zh-CN' : i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
    day: 'numeric',
  });

  const sortedSessions = [...sessions].sort((a, b) => {
    const ta = sessionLastActivity[a.key] ?? a.updatedAt ?? 0;
    const tb = sessionLastActivity[b.key] ?? b.updatedAt ?? 0;
    return tb - ta;
  });

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        'h-full min-h-0'
      )}
    >
      <div className="w-full flex flex-col h-full py-6">
        <PageHeader
          title={t('sessions.title')}
          subtitle={t('sessions.subtitle')}
          stats={[
            { label: t('sessions.count'), value: sessions.length },
            { label: 'Gateway', value: isOnline ? t('sessions.gatewayOnline') : t('sessions.gatewayOffline') },
          ]}
          onRefresh={refresh}
          refreshing={false}
          statsBorderColor="border-indigo-500/40"
          actions={
            <button
              aria-label={t('sessions.newSession')}
              onClick={handleNewSession}
              disabled={!isOnline}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/20 border-2 border-indigo-500/40 text-foreground/80 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              {t('sessions.newSession')}
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          {!isOnline ? (
            <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 text-center">
              <p className="text-muted-foreground text-sm">{t('sessions.gatewayRequired')}</p>
              <p className="text-muted-foreground/70 text-xs mt-1">{t('sessions.clickStartGateway')}</p>
            </div>
          ) : sortedSessions.length === 0 ? (
            <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">{t('sessions.noSessions')}</p>
              <button
                onClick={handleNewSession}
                className="mt-3 px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-sm font-medium"
              >
                {t('sessions.createSession')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSessions.map((session) => {
                const label =
                  sessionLabels[session.key] ||
                  session.displayName ||
                  session.label ||
                  session.key.split(':').pop() ||
                  session.key;
                const lastAt = sessionLastActivity[session.key] ?? session.updatedAt;
                const isCurrent = session.key === currentSessionKey;

                return (
                  <div
                    key={session.key}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer',
                      'border-indigo-500/40',
                      'bg-[#1e293b] hover:bg-[#334155]/50',
                      isCurrent && 'ring-1 ring-primary/30 border-primary/20'
                    )}
                    onClick={() => handleOpenSession(session.key)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          isCurrent ? 'bg-primary/15' : 'bg-black/5 dark:bg-white/5'
                        )}
                      >
                        <MessageSquare
                          className={cn(
                            'w-4 h-4',
                            isCurrent ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {label || t('sessions.unnamed')}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {lastAt
                            ? timeFormatter.format(new Date(lastAt))
                            : session.key}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSession(session.key);
                      }}
                      className="ml-3 px-3 py-1.5 rounded-lg bg-[#334155] text-foreground/80 text-xs font-medium hover:bg-[#475569] transition-colors shrink-0"
                    >
                      {t('sessions.open')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { SessionsView };
export default SessionsView;
