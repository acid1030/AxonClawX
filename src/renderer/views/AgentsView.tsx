/**
 * AxonClaw - Agents View
 * 参考 AxonClawX：左侧 Agent 列表 + 右侧详情（Overview/Files/Tools/Skills/Channels/Cron/Chat/Scenarios/Multi-Agent）
 * Skills 风格：#0f172a、#1e293b、彩色边框
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Bot,
  FileText,
  Wrench,
  Puzzle,
  MessageSquare,
  Calendar,
  Sparkles,
  Search,
  BarChart3,
  Bell,
  Laptop,
  Languages,
  PenTool,
  BookOpen,
  LayoutTemplate,
  Eye,
  Zap,
  Mail,
  CalendarDays,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentsStore } from '@/stores/agents';
import { useChannelsStore } from '@/stores/channels';
import { useCronStore } from '@/stores/cron';
import { useSkillsStore } from '@/stores/skills';
import { useChatStore } from '@/stores/chat';
import { useGatewayOnline } from '@/hooks/useGatewayOnline';
import { MultiAgentCollaborationPanel } from '@/components/multiagent/MultiAgentCollaborationPanel';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChannelConfigModal } from '@/components/channels/ChannelConfigModal';
import { ChatView } from '@/components/chat/ChatView';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { AgentSummary } from '@/types/agent';
import type { ChannelType } from '@/types/channel';
import { CHANNEL_NAMES, CHANNEL_ICONS } from '@/types/channel';
import { AgentSettingsModal } from '@/pages/Agents';
import { hostApiFetch } from '@/lib/host-api';
import { agentFilesList, agentFileGet, agentFileSet, configGet, agentSkills, wake } from '@/services/agent-api';
import i18n from '@/i18n';

const TABS = [
  { id: 'overview', icon: BarChart3 },
  { id: 'files', icon: FileText },
  { id: 'tools', icon: Wrench },
  { id: 'skills', icon: Puzzle },
  { id: 'multi-agent', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

function formatSchedule(schedule: unknown): string {
  const isZh = /^(zh|cn)/i.test(i18n.language || '');
  if (typeof schedule === 'string') return schedule;
  if (schedule && typeof schedule === 'object') {
    const s = schedule as { kind?: string; expr?: string; everyMs?: number; at?: string };
    if (s.kind === 'cron' && s.expr) return s.expr;
    if (s.kind === 'every' && s.everyMs) {
      const ms = s.everyMs;
      if (ms < 60_000) {
        const n = Math.round(ms / 1000);
        return isZh ? `每 ${n} 秒` : `Every ${n} seconds`;
      }
      if (ms < 3_600_000) {
        const n = Math.round(ms / 60_000);
        return isZh ? `每 ${n} 分钟` : `Every ${n} minutes`;
      }
      if (ms < 86_400_000) {
        const n = Math.round(ms / 3_600_000);
        return isZh ? `每 ${n} 小时` : `Every ${n} hours`;
      }
      return `Every ${Math.round(ms / 86_400_000)}d`;
    }
    if (s.kind === 'at' && s.at) return s.at;
  }
  return String(schedule ?? '—');
}

export const AgentsView: React.FC = () => {
  const { t } = useTranslation('agents');
  const {
    agents,
    loading,
    fetchAgents,
    createAgent,
    assignChannel,
    removeChannel,
    resolveLabel,
    resolveEmoji,
    defaultAgentId,
  } = useAgentsStore();
  const { channels, fetchChannels } = useChannelsStore();
  const { jobs, fetchJobs } = useCronStore();
  const { fetchSkills } = useSkillsStore();
  const switchSession = useChatStore((s) => s.switchSession);
  const isOnline = useGatewayOnline();

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelToRemove, setChannelToRemove] = useState<ChannelType | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [waking, setWaking] = useState(false);
  const [wakeResult, setWakeResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [searchAgent, setSearchAgent] = useState('');

  useEffect(() => {
    void Promise.all([fetchAgents(), fetchChannels()]);
  }, [fetchAgents, fetchChannels]);

  useEffect(() => {
    if (isOnline) {
      void fetchJobs();
      void fetchSkills();
    }
  }, [isOnline, fetchJobs, fetchSkills]);

  const safeAgents = Array.isArray(agents) ? agents : [];
  const filteredAgents = searchAgent
    ? safeAgents.filter(
        (a) =>
          (a.name ?? '').toLowerCase().includes(searchAgent.toLowerCase()) ||
          (a.id ?? '').toLowerCase().includes(searchAgent.toLowerCase())
      )
    : safeAgents;
  const selectedAgent = safeAgents.find((a) => a.id === selectedAgentId) ?? safeAgents[0] ?? null;

  useEffect(() => {
    if (!selectedAgentId && safeAgents.length > 0) {
      setSelectedAgentId(safeAgents[0].id);
    }
  }, [selectedAgentId, safeAgents]);

  // 进入 Chat tab 时切换到该 Agent 的主会话
  useEffect(() => {
    if (activeTab === 'chat' && selectedAgent?.mainSessionKey) {
      switchSession(selectedAgent.mainSessionKey);
    }
  }, [activeTab, selectedAgent?.mainSessionKey, switchSession]);

  const handleRefresh = useCallback(() => {
    void Promise.all([fetchAgents(), fetchChannels(), fetchJobs(), fetchSkills()]);
  }, [fetchAgents, fetchChannels, fetchJobs, fetchSkills]);

  const handleAddAgent = useCallback(async (name: string) => {
    await createAgent(name);
    setShowAddDialog(false);
    toast.success(t('toast.agentCreated'));
  }, [createAgent, t]);

  const { deleteAgent } = useAgentsStore();
  const handleDeleteAgent = useCallback(async () => {
    if (!agentToDelete) return;
    try {
      await deleteAgent(agentToDelete.id, deleteFiles);
      setAgentToDelete(null);
      if (selectedAgentId === agentToDelete.id) {
        setSelectedAgentId(safeAgents.filter((a) => a.id !== agentToDelete.id)[0]?.id ?? null);
      }
      toast.success(t('toast.agentDeleted'));
    } catch (e) {
      toast.error(String(e));
    }
  }, [agentToDelete, deleteFiles, deleteAgent, selectedAgentId, safeAgents, t]);

  const handleChannelSaved = useCallback(async (channelType: ChannelType) => {
    if (!selectedAgent) return;
    try {
      await assignChannel(selectedAgent.id, channelType);
      await fetchChannels();
      setShowChannelModal(false);
      toast.success(t('toast.channelAssigned', { channel: CHANNEL_NAMES[channelType] || channelType }));
    } catch (e) {
      toast.error(t('toast.channelAssignFailed', { error: String(e) }));
      throw e;
    }
  }, [selectedAgent, assignChannel, fetchChannels, t]);

  const handleRemoveChannel = useCallback(async () => {
    if (!channelToRemove || !selectedAgent) return;
    try {
      await removeChannel(selectedAgent.id, channelToRemove);
      await fetchChannels();
      setChannelToRemove(null);
      toast.success(t('toast.channelRemoved', { channel: CHANNEL_NAMES[channelToRemove] || channelToRemove }));
    } catch (e) {
      toast.error(t('toast.channelRemoveFailed', { error: String(e) }));
    }
  }, [channelToRemove, selectedAgent, removeChannel, fetchChannels, t]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f172a]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 bg-[#0f172a] text-white overflow-hidden">
      {/* Left Sidebar - 代理管理 */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-indigo-500/20 bg-[#1e293b]">
        <div className="p-4 border-b border-indigo-500/20">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">{t('view.sidebarTitle', { defaultValue: '代理管理' })}</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-indigo-500/20"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-indigo-500/20"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('view.searchAgent', { defaultValue: '搜索 Agent / 角色...' })}
                value={searchAgent}
                onChange={(e) => setSearchAgent(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-[#0f172a] border border-indigo-500/20 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/40"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('view.agentCount', { count: filteredAgents.length, defaultValue: '{{count}} 个代理' })}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredAgents.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-8">{t('view.noAgents', { defaultValue: '暂无代理' })}</p>
          ) : filteredAgents.map((agent) => {
              const label = resolveLabel(agent);
              const emoji = resolveEmoji(agent);
              return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors border-2',
                  selectedAgentId === agent.id
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-foreground'
                    : 'border-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-500/30 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {emoji || label.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{label}</p>
                  <p className="text-xs opacity-70 truncate">{agent.id}</p>
                </div>
                {agent.isDefault && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 shrink-0">
                    {t('view.defaultBadge', { defaultValue: '默认' })}
                  </span>
                )}
              </button>
              );
            })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0f172a]">
        {!selectedAgent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">{t('view.selectAgentHint', { defaultValue: '选择一个代理查看详情' })}</p>
          </div>
        ) : (
          <>
            {/* Agent Header */}
            <div className="shrink-0 px-4 md:px-5 pt-3 md:pt-4 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg font-bold text-indigo-400 shrink-0">
                  {resolveEmoji(selectedAgent) || resolveLabel(selectedAgent).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground truncate">{resolveLabel(selectedAgent)}</h2>
                    {selectedAgent.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold">{t('view.defaultBadge', { defaultValue: '默认' })}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">{selectedAgent.id}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                    title={t('view.wakeAgent', { defaultValue: '唤醒代理' })}
                    disabled={!isOnline || waking}
                    onClick={async () => {
                      setWaking(true);
                      setWakeResult(null);
                      try {
                        await wake({ mode: 'now', text: 'check' });
                        setWakeResult({ ok: true, text: t('view.woken', { defaultValue: '已唤醒' }) });
                        setTimeout(() => setWakeResult(null), 3000);
                      } catch (e) {
                        setWakeResult({ ok: false, text: t('view.wakeFailed', { error: String(e), defaultValue: '唤醒失败: {{error}}' }) });
                      } finally {
                        setWaking(false);
                      }
                    }}
                  >
                    <Bell className={cn('h-4 w-4', waking && 'animate-spin')} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-indigo-500/20"
                    title={t('view.edit', { defaultValue: '编辑' })}
                    onClick={() => setShowSettingsModal(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!selectedAgent.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/20"
                      title={t('view.delete', { defaultValue: '删除' })}
                      onClick={() => setAgentToDelete(selectedAgent)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {wakeResult && (
                  <div className={cn(
                    'absolute top-14 right-4 px-3 py-1.5 rounded-xl text-[10px] font-bold z-30 shadow-lg',
                    wakeResult.ok ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  )}>
                    {wakeResult.text}
                  </div>
                )}
              </div>

              {/* Tabs — horizontally scrollable */}
              <div className="flex gap-0.5 mt-3 border-b border-white/[0.06] overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-3 py-2 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap shrink-0',
                      activeTab === tab.id
                        ? 'border-indigo-400 text-indigo-400'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t(`view.tabs.${tab.id}`, {
                      defaultValue:
                        tab.id === 'overview' ? '概览' :
                        tab.id === 'files' ? '文件' :
                        tab.id === 'tools' ? '工具' :
                        tab.id === 'skills' ? '技能' :
                        '多代理',
                    })}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              {activeTab === 'overview' && (
                <OverviewTab agent={selectedAgent} />
              )}
              {activeTab === 'files' && <FilesTab agent={selectedAgent} isOnline={isOnline} />}
              {activeTab === 'tools' && <ToolsTab agent={selectedAgent} isOnline={isOnline} />}
              {activeTab === 'skills' && <SkillsTab agent={selectedAgent} isOnline={isOnline} />}
              {activeTab === 'channels' && (
                <ChannelsTab
                  agent={selectedAgent}
                  channels={channels}
                  onAddChannel={() => setShowChannelModal(true)}
                  onRemoveChannel={(t) => setChannelToRemove(t)}
                />
              )}
              {activeTab === 'cron' && <CronTab jobs={jobs} onRefresh={fetchJobs} isOnline={isOnline} />}
              {activeTab === 'chat' && (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatView />
                </div>
              )}
              {activeTab === 'scenarios' && selectedAgent && (
                <ScenariosTab agent={selectedAgent} onRefresh={handleRefresh} />
              )}
              {activeTab === 'multi-agent' && (
                <MultiAgentCollaborationPanel
                  defaultAgentId={defaultAgentId || agents.find((a) => a.isDefault)?.id || selectedAgent.id}
                  onDeploy={handleRefresh}
                  isOnline={isOnline}
                />
              )}
            </div>
          </>
        )}
      </main>

      {showAddDialog && (
        <AgentsAddDialogInline
          onClose={() => setShowAddDialog(false)}
          onCreate={handleAddAgent}
        />
      )}

      {showSettingsModal && selectedAgent && (
        <AgentSettingsModal
          agent={selectedAgent}
          channels={channels}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showChannelModal && selectedAgent && (
        <ChannelConfigModal
          configuredTypes={selectedAgent.channelTypes}
          showChannelName={false}
          allowExistingConfig
          agentId={selectedAgent.id}
          onClose={() => setShowChannelModal(false)}
          onChannelSaved={handleChannelSaved}
        />
      )}

      <ConfirmDialog
        open={!!agentToDelete}
        title={t('deleteDialog.title')}
        message={agentToDelete ? t('deleteDialog.message', { name: agentToDelete.name }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={handleDeleteAgent}
        onCancel={() => setAgentToDelete(null)}
      >
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
            className="rounded border-indigo-500/40"
          />
          <span className="text-sm text-muted-foreground">{t('deleteDialog.deleteWorkspaceFiles', { defaultValue: '同时删除工作区文件' })}</span>
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!channelToRemove}
        title={t('removeChannelDialog.title')}
        message={channelToRemove ? t('removeChannelDialog.message', { name: CHANNEL_NAMES[channelToRemove] || channelToRemove }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={handleRemoveChannel}
        onCancel={() => setChannelToRemove(null)}
      />
    </div>
  );
};

function OverviewTab({ agent }: { agent: AgentSummary }) {
  const { t } = useTranslation('agents');
  const { resolveLabel, resolveEmoji, resolveAgentConfig, identity, defaultAgentId } = useAgentsStore();
  const isOnline = useGatewayOnline();
  const cfg = resolveAgentConfig(agent.id);
  const ident = identity[agent.id];
  const label = resolveLabel(agent);
  const emoji = resolveEmoji(agent);

  const skillsValue = Array.isArray(cfg.skills)
    ? `${cfg.skills.length} 已选`
    : cfg.skills && typeof cfg.skills === 'object' && Object.keys(cfg.skills).length > 0
      ? `${Object.keys(cfg.skills).length} 已选`
      : '全部';

  const cards = [
    { label: '工作区', value: cfg.workspace || '—', icon: Laptop },
    { label: '模型', value: cfg.model || '—', icon: Bot },
    { label: '身份', value: emoji ? `${emoji} ${ident?.name || label}` : (ident?.name || label), icon: Star },
    { label: '状态', value: isOnline ? '在线' : '离线', icon: Zap, statusColor: isOnline ? 'text-emerald-400' : 'text-slate-400' },
    { label: '默认代理', value: agent.id === defaultAgentId ? '是' : '否', icon: Star },
    { label: '技能', value: skillsValue, icon: Puzzle },
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((kv) => (
          <div key={kv.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <kv.icon className={cn('w-3.5 h-3.5', kv.statusColor || 'text-white/40')} />
              <span className="text-[11px] font-bold text-white/40">{kv.label}</span>
            </div>
            <p className={cn('text-[11px] font-semibold font-mono truncate', kv.statusColor || 'text-white/70')}>
              {kv.value}
            </p>
          </div>
        ))}
      </div>

      {ident?.theme && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[11px] font-bold text-white/40 mb-1">{t('view.theme', { defaultValue: '主题' })}</p>
          <p className="text-[11px] text-white/50">{ident.theme}</p>
        </div>
      )}
    </div>
  );
}

function fmtBytes(b?: number): string {
  if (b == null) return '-';
  if (b < 1024) return `${b} B`;
  const u = ['KB', 'MB', 'GB'];
  let s = b / 1024,
    i = 0;
  while (s >= 1024 && i < u.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(s < 10 ? 1 : 0)} ${u[i]}`;
}

function FilesTab({ agent, isOnline }: { agent: AgentSummary; isOnline: boolean }) {
  const { t } = useTranslation('agents');
  const [filesList, setFilesList] = useState<Array<{ name: string; size?: number; missing?: boolean }>>([]);
  const [fileActive, setFileActive] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>({});
  const [fileSaving, setFileSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    if (!agent?.id || !isOnline) return;
    setLoading(true);
    setError(null);
    try {
      const res = await agentFilesList(agent.id);
      setFilesList(res?.files || []);
    } catch (e) {
      setError(String(e));
      setFilesList([]);
    } finally {
      setLoading(false);
    }
  }, [agent?.id, isOnline]);

  const loadFile = useCallback(
    async (name: string) => {
      if (!agent?.id || !isOnline) return;
      setFileActive(name);
      if (fileContents[name] != null) return;
      try {
        const res = await agentFileGet(agent.id, name);
        const content = (res?.file?.content as string) || '';
        setFileContents((prev) => ({ ...prev, [name]: content }));
        setFileDrafts((prev) => ({ ...prev, [name]: content }));
      } catch (e) {
        toast.error(String(e));
      }
    },
    [agent?.id, isOnline, fileContents]
  );

  const saveFile = useCallback(async () => {
    if (!agent?.id || !fileActive) return;
    setFileSaving(true);
    try {
      await agentFileSet(agent.id, fileActive, fileDrafts[fileActive] || '');
      setFileContents((prev) => ({ ...prev, [fileActive!]: fileDrafts[fileActive!] || '' }));
      toast.success(t('view.saved', { defaultValue: '已保存' }));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setFileSaving(false);
    }
  }, [agent?.id, fileActive, fileDrafts]);

  useEffect(() => {
    if (agent?.id && isOnline) {
      loadFiles();
    } else {
      setFilesList([]);
      setFileActive(null);
      setFileContents({});
      setFileDrafts({});
    }
  }, [agent?.id, isOnline, loadFiles]);

  const hasUnsaved = fileActive && fileDrafts[fileActive] !== fileContents[fileActive];

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-5xl flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-48 shrink-0 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">{t('view.coreFiles', { defaultValue: '核心文件' })}</span>
            <button
              onClick={loadFiles}
              disabled={!isOnline || loading}
              className="text-xs text-indigo-400 hover:underline disabled:opacity-40"
            >
              {loading ? t('view.loading', { defaultValue: '加载中...' }) : t('common:actions.refresh', { defaultValue: '刷新' })}
            </button>
          </div>
          {!isOnline ? (
            <p className="text-xs text-muted-foreground py-4">{t('view.gatewayOffline', { defaultValue: 'Gateway 未连接' })}</p>
          ) : filesList.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">{t('view.noFiles', { defaultValue: '暂无文件' })}</p>
          ) : (
            filesList.map((f) => (
              <button
                key={f.name}
                onClick={() => loadFile(f.name)}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all border',
                  fileActive === f.name
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    : 'hover:bg-white/5 border-transparent'
                )}
              >
                <p className="font-mono font-semibold truncate">{f.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {f.missing ? <span className="text-amber-500">{t('view.fileMissing', { defaultValue: '缺失' })}</span> : fmtBytes(f.size)}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="flex-1 min-w-0">
          {!fileActive ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-xs">
              {t('view.selectFile', { defaultValue: '选择一个文件' })}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-foreground">{fileActive}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFileDrafts((prev) => ({ ...prev, [fileActive!]: fileContents[fileActive!] || '' }))}
                    disabled={!hasUnsaved}
                    className="h-7 text-xs border-indigo-500/40"
                  >
                    {t('view.reset', { defaultValue: '重置' })}
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveFile}
                    disabled={fileSaving || !hasUnsaved}
                    className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600"
                  >
                    {fileSaving ? t('view.saving', { defaultValue: '保存中...' }) : t('common:actions.save', { defaultValue: '保存' })}
                  </Button>
                </div>
              </div>
              <textarea
                value={fileDrafts[fileActive] ?? fileContents[fileActive] ?? ''}
                onChange={(e) => setFileDrafts((prev) => ({ ...prev, [fileActive!]: e.target.value }))}
                className="w-full h-80 p-3 rounded-xl bg-[#1e293b] border-2 border-indigo-500/40 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                spellCheck={false}
              />
            </div>
          )}
          {error && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TOOL_SECTIONS = [
  { id: 'files', tools: ['read', 'write', 'edit', 'apply_patch'] },
  { id: 'runtime', tools: ['exec', 'process'] },
  { id: 'web', tools: ['web_search', 'web_fetch'] },
  { id: 'memory', tools: ['memory_search', 'memory_get'] },
  { id: 'sessions', tools: ['sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn', 'session_status'] },
  { id: 'ui', tools: ['browser', 'canvas'] },
  { id: 'messaging', tools: ['message'] },
  { id: 'automation', tools: ['cron', 'gateway'] },
  { id: 'agents', tools: ['agents_list'] },
  { id: 'media', tools: ['image'] },
];

interface AgentConfigEntry {
  id: string;
  tools?: Record<string, unknown>;
}
interface ConfigShape {
  agents?: { list?: AgentConfigEntry[]; defaults?: { tools?: Record<string, unknown> } };
  tools?: Record<string, unknown>;
}

function ToolsTab({ agent, isOnline }: { agent: AgentSummary; isOnline: boolean }) {
  const { t } = useTranslation('agents');
  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [loading, setLoading] = useState(false);
  const sectionLabels: Record<string, string> = {
    files: t('view.toolSections.files', { defaultValue: '文件' }),
    runtime: t('view.toolSections.runtime', { defaultValue: '运行时' }),
    web: t('view.toolSections.web', { defaultValue: '网络' }),
    memory: t('view.toolSections.memory', { defaultValue: '记忆' }),
    sessions: t('view.toolSections.sessions', { defaultValue: '会话' }),
    ui: t('view.toolSections.ui', { defaultValue: '界面' }),
    messaging: t('view.toolSections.messaging', { defaultValue: '消息' }),
    automation: t('view.toolSections.automation', { defaultValue: '自动化' }),
    agents: t('view.toolSections.agents', { defaultValue: '代理' }),
    media: t('view.toolSections.media', { defaultValue: '媒体' }),
  };

  useEffect(() => {
    if (!isOnline) return;
    setLoading(true);
    configGet()
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [isOnline]);

  const tools = (() => {
    if (!config) return {};
    const list = config.agents?.list || [];
    const entry = list.find((e) => e?.id === agent?.id);
    const defaults = config.agents?.defaults;
    return entry?.tools || defaults?.tools || config.tools || {};
  })();

  const profile = (tools as { profile?: string }).profile || 'full';
  const denyList = Array.isArray((tools as { deny?: string[] }).deny) ? (tools as { deny: string[] }).deny : [];

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-5xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('view.tools', { defaultValue: '工具' })}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('view.profile', { defaultValue: '配置档' })}: <span className="font-mono text-indigo-400">{profile}</span>
          </p>
        </div>
        {!isOnline ? (
          <div className="rounded-xl border-2 border-amber-500/40 bg-[#1e293b] p-8 text-center text-muted-foreground">
            {t('view.gatewayOffline', { defaultValue: 'Gateway 未连接' })}
          </div>
        ) : loading ? (
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 text-center text-muted-foreground">
            {t('view.loading', { defaultValue: '加载中...' })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOOL_SECTIONS.map((section) => (
              <div key={section.id} className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{sectionLabels[section.id] ?? section.id}</p>
                <div className="space-y-1">
                  {section.tools.map((tool) => {
                    const denied = denyList.includes(tool);
                    const allowed = !denied;
                    return (
                      <div key={tool} className="flex items-center justify-between py-1">
                        <span className="text-xs font-mono text-foreground/70">{tool}</span>
                        <div className={cn('w-2 h-2 rounded-full', allowed ? 'bg-emerald-500' : 'bg-slate-500/50')} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillsTab({ agent, isOnline }: { agent: AgentSummary; isOnline: boolean }) {
  const { t } = useTranslation('agents');
  const [skillsReport, setSkillsReport] = useState<{ skills?: Array<{ name: string; description?: string; eligible?: boolean; bundled?: boolean; source?: string }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ready' | 'notReady'>('ready');

  const loadSkills = useCallback(async () => {
    if (!agent?.id || !isOnline) return;
    setLoading(true);
    try {
      const r = await agentSkills(agent.id);
      setSkillsReport(r);
    } catch {
      setSkillsReport(null);
    } finally {
      setLoading(false);
    }
  }, [agent?.id, isOnline]);

  useEffect(() => {
    if (agent?.id && isOnline) {
      loadSkills();
    } else {
      setSkillsReport(null);
    }
  }, [agent?.id, isOnline, loadSkills]);

  const allSkills = skillsReport?.skills || [];
  const skills = allSkills.filter((sk) => {
    if (filter === 'ready') return sk.eligible;
    if (filter === 'notReady') return !sk.eligible;
    return true;
  });
  const readyCount = allSkills.filter((s) => s.eligible).length;
  const notReadyCount = allSkills.filter((s) => !s.eligible).length;

  const groups: Record<string, typeof allSkills> = {};
  skills.forEach((sk) => {
    const src = sk.bundled ? t('view.builtIn', { defaultValue: '内置' }) : sk.source || t('view.other', { defaultValue: '其他' });
    if (!groups[src]) groups[src] = [];
    groups[src].push(sk);
  });

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('view.skillsTitle', { defaultValue: '技能' })}</h2>
          <button onClick={loadSkills} disabled={!isOnline || loading} className="text-xs text-indigo-400 hover:underline disabled:opacity-40">
            {loading ? t('view.loading', { defaultValue: '加载中...' }) : t('common:actions.refresh', { defaultValue: '刷新' })}
          </button>
        </div>
        {!isOnline ? (
          <div className="rounded-xl border-2 border-amber-500/40 bg-[#1e293b] p-8 text-center text-muted-foreground">
            {t('view.gatewayOffline', { defaultValue: 'Gateway 未连接' })}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {[
                { key: 'ready' as const, label: t('view.skillsReady', { count: readyCount, defaultValue: '就绪 ({{count}})' }) },
                { key: 'notReady' as const, label: t('view.skillsNotReady', { count: notReadyCount, defaultValue: '未就绪 ({{count}})' }) },
                { key: 'all' as const, label: t('view.skillsAll', { count: allSkills.length, defaultValue: '全部 ({{count}})' }) },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    filter === key
                      ? key === 'ready'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : key === 'notReady'
                          ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {skills.length === 0 ? (
              <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
                <Puzzle className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">{!loading ? t('view.noSkills', { defaultValue: '暂无技能' }) : t('view.loading', { defaultValue: '加载中...' })}</p>
              </div>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{group} ({items.length})</p>
                  <div className="space-y-1">
                    {items.map((sk) => (
                      <div
                        key={sk.name}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 border-indigo-500/40 bg-[#1e293b]"
                      >
                        <div className={cn('w-2 h-2 rounded-full shrink-0', sk.eligible ? 'bg-emerald-500' : 'bg-slate-500/50')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{sk.name}</p>
                          {sk.description && <p className="text-[11px] text-muted-foreground truncate">{sk.description}</p>}
                        </div>
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0',
                            sk.eligible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                          )}
                        >
                          {sk.eligible ? t('view.ready', { defaultValue: '就绪' }) : t('view.notReady', { defaultValue: '未就绪' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ChannelsTab({
  agent,
  channels,
  onAddChannel,
  onRemoveChannel,
}: {
  agent: AgentSummary;
  channels: Array<{ type: string; name: string; status: string }>;
  onAddChannel: () => void;
  onRemoveChannel: (type: ChannelType) => void;
}) {
  const { t } = useTranslation('agents');
  const runtimeByType = Object.fromEntries(channels.map((c) => [c.type, c]));
  const assigned = agent.channelTypes.map((t) => ({
    type: t as ChannelType,
    name: runtimeByType[t]?.name || CHANNEL_NAMES[t as ChannelType] || t,
    status: runtimeByType[t]?.status ?? 'disconnected',
  }));

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('view.channels', { defaultValue: '渠道' })}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('view.channelStatus', { defaultValue: '渠道连接状态' })}</p>
          </div>
          <Button
            onClick={onAddChannel}
            className="bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-indigo-500/40"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('view.addChannel', { defaultValue: '添加渠道' })}
          </Button>
        </div>
        {assigned.length === 0 ? (
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm mb-2">{t('view.noChannels', { defaultValue: '暂无渠道' })}</p>
            <Button variant="outline" size="sm" onClick={onAddChannel} className="border-indigo-500/40">
              {t('view.addChannel', { defaultValue: '添加渠道' })}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {assigned.map((ch) => (
              <div
                key={ch.type}
                className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-lg">{CHANNEL_ICONS[ch.type] || '💬'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{ch.name}</p>
                    <p className="text-xs text-muted-foreground">{CHANNEL_NAMES[ch.type] || ch.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-medium',
                      ch.status === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    )}
                  >
                    {ch.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/20"
                    onClick={() => onRemoveChannel(ch.type)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CronTab({
  jobs,
  onRefresh,
  isOnline,
}: {
  jobs: Array<{ id: string; name: string; schedule: unknown; enabled: boolean; lastRun?: { time?: string } }>;
  onRefresh: () => void;
  isOnline: boolean;
}) {
  const { t } = useTranslation('agents');
  const safe = Array.isArray(jobs) ? jobs : [];

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('view.cronJobs', { defaultValue: '定时任务' })}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('view.cronSchedule', { defaultValue: 'Cron 定时调度' })}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRefresh()}
            disabled={!isOnline}
            className="border-indigo-500/40"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common:actions.refresh', { defaultValue: '刷新' })}
          </Button>
        </div>
        {!isOnline ? (
          <div className="rounded-xl border-2 border-amber-500/40 bg-[#1e293b] p-8 text-center text-muted-foreground">
            {t('view.gatewayOffline', { defaultValue: 'Gateway 未连接' })}
          </div>
        ) : safe.length === 0 ? (
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">{t('view.noCronJobs', { defaultValue: '暂无定时任务' })}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {safe.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{job.name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {formatSchedule(job.schedule)}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium',
                    job.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                  )}
                >
                  {job.enabled ? t('view.running', { defaultValue: '运行中' }) : t('view.paused', { defaultValue: '已暂停' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 场景库分类（与 AxonClawX 一致） */
const SCENE_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'productivity', label: '效率' },
  { id: 'social', label: '社交媒体' },
  { id: 'content', label: '内容创作' },
  { id: 'devops', label: '开发运维' },
  { id: 'research', label: '研究' },
  { id: 'finance', label: '金融' },
  { id: 'home', label: '家庭' },
] as const;

/** 场景模板（AxonClawX 风格） */
const SCENE_LIBRARY_TEMPLATES = [
  {
    id: 'personal-assistant',
    title: 'Personal Assistant',
    desc: 'AI-powered personal assistant for schedules, tasks, and reminders',
    category: 'productivity',
    tags: ['Assistant', 'Productivity', 'Tasks', 'Reminders'],
    badges: ['Simple', 'Recommended'] as const,
    skillCount: 1,
    cronCount: 1,
    icon: MessageSquare,
    iconBg: 'bg-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    id: 'email-butler',
    title: 'Email Manager',
    desc: 'Smart email classification, summarization, and replies',
    category: 'productivity',
    tags: ['Email', 'Productivity', 'Automation'],
    badges: ['Medium'] as const,
    skillCount: 1,
    cronCount: 1,
    icon: Mail,
    iconBg: 'bg-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    id: 'schedule-management',
    title: 'Schedule Manager',
    desc: 'Smart scheduling with conflict detection and optimization',
    category: 'productivity',
    tags: ['Calendar', 'Scheduling', 'Productivity'],
    badges: ['Simple', 'Recommended'] as const,
    skillCount: 1,
    cronCount: 1,
    icon: CalendarDays,
    iconBg: 'bg-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'tech-assistant',
    title: 'Tech Assistant',
    desc: 'Programming, debugging, code review, and technical writing',
    category: 'devops',
    tags: ['Development', 'Tech', 'Code'],
    badges: ['Medium'] as const,
    skillCount: 1,
    cronCount: 0,
    icon: Laptop,
    iconBg: 'bg-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    id: 'translator',
    title: 'Translation Assistant',
    desc: 'Multilingual translation, localization, and terminology consistency',
    category: 'productivity',
    tags: ['Language', 'Translation', 'Localization'],
    badges: ['Simple'] as const,
    skillCount: 1,
    cronCount: 0,
    icon: Languages,
    iconBg: 'bg-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'writer',
    title: 'Writing Assistant',
    desc: 'Drafting, polishing, and structured writing',
    category: 'content',
    tags: ['Writing', 'Content', 'Creation'],
    badges: ['Medium'] as const,
    skillCount: 1,
    cronCount: 0,
    icon: PenTool,
    iconBg: 'bg-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    id: 'content-factory',
    title: 'Content Factory',
    desc: 'End-to-end pipeline: research -> write -> edit -> publish',
    category: 'content',
    tags: ['Content', 'Workflow', 'Creation'],
    badges: ['Medium'] as const,
    skillCount: 2,
    cronCount: 1,
    icon: BookOpen,
    iconBg: 'bg-violet-500/30',
    iconColor: 'text-violet-400',
  },
];

function ScenariosTab({ agent, onRefresh }: { agent: AgentSummary; onRefresh?: () => void }) {
  const { t } = useTranslation('agents');
  const [searchScene, setSearchScene] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [previewScene, setPreviewScene] = useState<typeof SCENE_LIBRARY_TEMPLATES[0] | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const filtered = SCENE_LIBRARY_TEMPLATES.filter((s) => {
    const matchCategory = categoryFilter === 'all' || s.category === categoryFilter;
    const matchSearch =
      !searchScene ||
      s.title.toLowerCase().includes(searchScene.toLowerCase()) ||
      s.desc.toLowerCase().includes(searchScene.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchScene.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const handlePreview = (scene: typeof SCENE_LIBRARY_TEMPLATES[0]) => {
    setPreviewScene(scene);
  };

  const handleApply = async (sceneId: string) => {
    setApplyingId(sceneId);
    try {
      const res = await hostApiFetch<{ success?: boolean; error?: string }>(
        `/api/agents/${encodeURIComponent(agent.id)}/apply-scene`,
        { method: 'POST', body: JSON.stringify({ sceneId }) }
      );
      if (res?.success !== false) {
        toast.success(t('view.scenarioApplied', { defaultValue: '场景已应用到当前代理' }));
        onRefresh?.();
      } else {
        toast.error(res?.error || t('view.applyFailed', { defaultValue: '应用失败' }));
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setApplyingId(null);
    }
  };

  const badgeColor = (b: string) => {
    if (b === 'Simple') return 'bg-emerald-500/20 text-emerald-400';
    if (b === 'Recommended') return 'bg-blue-500/20 text-blue-400';
    if (b === 'Medium') return 'bg-amber-500/20 text-amber-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
          <h2 className="text-lg font-semibold text-foreground">{t('view.scenarioLibrary', { defaultValue: '场景库' })}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('view.scenarioHint', { defaultValue: '选择适合你的使用场景，一键配置' })}</p>
          </div>
          <div className="relative w-48 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('view.searchScenarios', { defaultValue: '搜索场景...' })}
                value={searchScene}
                onChange={(e) => setSearchScene(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#1e293b] border border-indigo-500/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/40"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SCENE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                categoryFilter === c.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-[#1e293b] text-muted-foreground hover:text-foreground border border-indigo-500/20'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((scene) => (
            <div
              key={scene.id}
              className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-4 hover:border-indigo-500/50 transition-colors flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', scene.iconBg, scene.iconColor)}>
                  <scene.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-foreground">{scene.title}</h3>
                    {scene.badges.map((b) => (
                      <span key={b} className={cn('text-[10px] px-2 py-0.5 rounded-full', badgeColor(b))}>
                        {b}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scene.desc}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {scene.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-slate-600/50 text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-4">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-400">
                  <Star className="h-3 w-3" />
                  {scene.skillCount} {t('view.skillsTitle', { defaultValue: '技能' })}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">
                  <Calendar className="h-3 w-3" />
                  {scene.cronCount} {t('view.cronJobs', { defaultValue: '定时任务' })}
                </span>
              </div>
              <div className="flex gap-2 mt-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"
                  onClick={() => handlePreview(scene)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  {t('view.previewConfig', { defaultValue: 'Preview config' })}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 bg-indigo-500 hover:bg-indigo-600"
                  onClick={() => handleApply(scene.id)}
                  disabled={applyingId !== null}
                >
                  {applyingId === scene.id ? (
                    <span className="animate-pulse">{t('view.applying', { defaultValue: 'Applying...' })}</span>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 mr-1" />
                      {t('view.oneClickSetup', { defaultValue: '一键设置' })}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-xl border-2 border-indigo-500/20 bg-[#1e293b] p-8 text-center text-muted-foreground text-sm">
            {t('view.noMatchingScenarios', { defaultValue: '没有匹配的场景' })}
          </div>
        )}
      </div>

      {previewScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewScene(null)}
        >
          <div
            className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">{previewScene.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{previewScene.desc}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {previewScene.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded text-xs bg-slate-600/50 text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t('view.skillsTitle', { defaultValue: '技能' })}: {previewScene.skillCount}</p>
              <p>{t('view.cronJobs', { defaultValue: '定时任务' })}: {previewScene.cronCount}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setPreviewScene(null)}>
                {t('view.close', { defaultValue: 'Close' })}
              </Button>
              <Button
                className="bg-indigo-500 hover:bg-indigo-600"
                onClick={() => {
                  handleApply(previewScene.id);
                  setPreviewScene(null);
                }}
                disabled={applyingId !== null}
              >
                {t('view.oneClickSetup', { defaultValue: '一键设置' })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentsAddDialogInline({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const { t } = useTranslation('agents');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim());
      onClose();
    } catch (e) {
      toast.error(t('toast.agentCreateFailed', { error: String(e) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e293b] border-2 border-indigo-500/40 rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('createDialog.title')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('createDialog.description')}</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('createDialog.namePlaceholder')}
          className="w-full h-11 px-3 rounded-xl bg-[#0f172a] border-2 border-indigo-500/30 text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="border-indigo-500/40 text-foreground">
            {t('common:actions.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={saving || !name.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-indigo-500/40"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('common:actions.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AgentsView;
