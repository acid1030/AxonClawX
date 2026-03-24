/**
 * Skills Page
 * Browse and manage AI skills
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Puzzle,
  Lock,
  Package,
  X,
  AlertCircle,
  Plus,
  Key,
  Trash2,
  RefreshCw,
  FolderOpen,
  FolderPlus,
  FileCode,
  Globe,
  Copy,
  Settings,
  Shield,
  Wrench,
  Plug,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useSkillsStore } from '@/stores/skills';
import { useGatewayStore } from '@/stores/gateway';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { trackUiEvent } from '@/lib/telemetry';
import { toast } from 'sonner';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type MainCategory = 'skills' | 'tools' | 'plugins' | 'clawhub' | 'skillhub';

// Skill detail dialog component
interface SkillDetailDialogProps {
  skill: Skill | null;
  isOpen: boolean;
  onClose: () => void;
  onToggle: (enabled: boolean) => void;
  onUninstall?: (slug: string) => void;
  onOpenFolder?: (skill: Skill) => Promise<void> | void;
}

function resolveSkillSourceLabel(skill: Skill, t: TFunction<'skills'>): string {
  const source = (skill.source || '').trim().toLowerCase();
  if (!source) {
    if (skill.isBundled) return t('source.badge.bundled', { defaultValue: '内置' });
    return t('source.badge.unknown', { defaultValue: '未知来源' });
  }
  if (source === 'openclaw-bundled') return t('source.badge.bundled', { defaultValue: '内置' });
  if (source === 'openclaw-managed') return t('source.badge.managed', { defaultValue: '托管' });
  if (source === 'openclaw-workspace') return t('source.badge.workspace', { defaultValue: '工作区' });
  if (source === 'openclaw-extra') return t('source.badge.extra', { defaultValue: '额外目录' });
  if (source === 'agents-skills-personal') return t('source.badge.agentsPersonal', { defaultValue: '个人 .agents' });
  if (source === 'agents-skills-project') return t('source.badge.agentsProject', { defaultValue: '项目 .agents' });
  return source;
}

/** 根据Skills来源返回边框颜色类名 */
function getSkillBorderClass(skill: Skill): string {
  const source = (skill.source || '').trim().toLowerCase();
  if (!source && skill.isBundled) return 'border-violet-500/60 dark:border-violet-400/50';
  if (source === 'openclaw-bundled') return 'border-violet-500/60 dark:border-violet-400/50';
  if (source === 'openclaw-managed') return 'border-cyan-500/60 dark:border-cyan-400/50';
  if (source === 'openclaw-workspace') return 'border-emerald-500/60 dark:border-emerald-400/50';
  if (source === 'openclaw-extra') return 'border-amber-500/60 dark:border-amber-400/50';
  if (source === 'agents-skills-personal') return 'border-orange-500/60 dark:border-orange-400/50';
  if (source === 'agents-skills-project') return 'border-amber-500/60 dark:border-amber-400/50';
  return 'border-slate-400/50 dark:border-slate-500/50';
}

/** Agent Tools目录 - Tools Tab 内容 */
const TOOL_SECTIONS: { label: string; tools: { id: string; desc: string }[] }[] = [
  { label: '文件', tools: [
    { id: 'read', desc: '读取文件内容' },
    { id: 'write', desc: '写入文件' },
    { id: 'edit', desc: '编辑文件' },
    { id: 'apply_patch', desc: '应用补丁' },
  ]},
  { label: '运行时', tools: [
    { id: 'exec', desc: '执行命令' },
    { id: 'process', desc: '进程管理' },
  ]},
  { label: '网络', tools: [
    { id: 'web_search', desc: '网络搜索' },
    { id: 'web_fetch', desc: '网页抓取' },
  ]},
  { label: '记忆', tools: [
    { id: 'memory_search', desc: '记忆检索' },
    { id: 'memory_get', desc: '读取记忆' },
  ]},
  { label: '会话', tools: [
    { id: 'sessions_list', desc: '会话列表' },
    { id: 'sessions_history', desc: '会话历史' },
    { id: 'sessions_send', desc: '发送消息' },
    { id: 'sessions_spawn', desc: '创建会话' },
    { id: 'session_status', desc: '会话状态' },
  ]},
  { label: '界面', tools: [
    { id: 'browser', desc: '浏览器自动化' },
    { id: 'canvas', desc: '画布' },
  ]},
  { label: '消息', tools: [
    { id: 'message', desc: '消息发送' },
  ]},
  { label: '自动化', tools: [
    { id: 'cron', desc: '定时任务' },
    { id: 'gateway', desc: 'Gateway' },
  ]},
  { label: '代理', tools: [
    { id: 'agents_list', desc: '代理列表' },
  ]},
  { label: '媒体', tools: [
    { id: 'image', desc: '图像生成' },
  ]},
];

function ToolsTabContent({ isOnline, onNavigateConfig, t }: {
  isOnline: boolean;
  onNavigateConfig: () => void;
  t: TFunction<'skills'>;
}) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">{t('tabs.toolsDesc', { defaultValue: '代理可调用的工具目录；权限请在配置中心设置' })}</p>
        <div className="flex items-center gap-2">
          {onNavigateConfig && (
            <Button variant="outline" size="sm" className="rounded-lg border-[var(--color-border)] text-[var(--color-text-secondary)]" onClick={onNavigateConfig}>
              {t('tabs.goToConfig', { defaultValue: '前往配置中心' })}
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-lg border-[var(--color-border)] text-[var(--color-text-secondary)]" onClick={() => invokeIpc('shell:openExternal', 'https://clawhub.ai')}>
            <ExternalLink className="h-4 w-4 mr-1.5" />
            {t('tabs.visitClawHub', { defaultValue: 'ClawHub' })}
          </Button>
        </div>
      </div>
      {!isOnline ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-8 text-center text-[var(--color-text-secondary)]">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{t('gatewayWarning', { defaultValue: '请先启动 Gateway' })}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOL_SECTIONS.map((section) => (
            <div key={section.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
              <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">{section.label}</p>
              <div className="space-y-2">
                {section.tools.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)]">
                    <code className="text-[12px] font-mono text-sky-400">{tool.id}</code>
                    <span className="text-xs text-[var(--color-text-muted)] truncate">{tool.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Plugins Tab 内容 - 完整复刻 PluginsView */
function PluginsTabContent({
  skills,
  loading,
  fetchSkills,
  handleToggle,
  setSelectedSkill,
  isOnline,
  setInstallSheetOpen,
  t,
}: {
  skills: Skill[];
  loading: boolean;
  fetchSkills: () => Promise<void>;
  handleToggle: (skillId: string, enable: boolean) => Promise<void>;
  setSelectedSkill: (s: Skill | null) => void;
  isOnline: boolean;
  setInstallSheetOpen: (v: boolean) => void;
  t: TFunction<'skills'>;
}) {
  const enabledCount = skills.filter((s) => s.enabled || s.isCore).length;
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-text-secondary)]">
            {t('stats.enabled', { count: enabledCount, total: skills.length, defaultValue: '已启用 {{count}}/{{total}}' })}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded', isOnline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}>
            {isOnline ? t('gateway.online', { defaultValue: 'Gateway 在线' }) : t('gateway.offline', { defaultValue: 'Gateway 离线' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => fetchSkills()} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            {t('common.refresh', { defaultValue: '刷新' })}
          </Button>
          <Button size="sm" className="h-8 rounded-lg bg-sky-500 hover:bg-sky-600" onClick={() => setInstallSheetOpen(true)}>
            <Package className="h-3.5 w-3.5 mr-1.5" />
            {t('marketplace.installFromMarketplace', { defaultValue: '从市场安装' })}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {!isOnline ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-8 text-center text-[var(--color-text-secondary)]">
            <p className="text-sm">{t('gateway.startFirstForPlugins', { defaultValue: '请先启动 Gateway 以加载插件' })}</p>
          </div>
        ) : skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Plug className="h-12 w-12 mb-4 opacity-50" />
            <p>{t('plugins.empty', { defaultValue: '暂无插件' })}</p>
            <Button size="sm" className="mt-4 rounded-lg" onClick={() => setInstallSheetOpen(true)}>
              {t('marketplace.installFromMarketplace', { defaultValue: '从市场安装' })}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 flex items-center justify-between gap-4 hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedSkill(skill)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--color-surface-raised)] text-xl">
                    {skill.icon || '🧩'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{skill.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      v{skill.version ?? '1.0'} · {resolveSkillSourceLabel(skill, t)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium',
                    (skill.enabled || skill.isCore) ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  )}>
                    {(skill.enabled || skill.isCore) ? t('available', { defaultValue: '已启用' }) : t('unavailable', { defaultValue: '已禁用' })}
                  </span>
                  {!skill.isCore && (
                    <Switch
                      checked={skill.enabled}
                      onCheckedChange={(checked) => handleToggle(skill.id, checked)}
                      className="scale-90"
                    />
                  )}
                  <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => setSelectedSkill(skill)}>
                    <Settings className="h-3.5 w-3.5" />
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

/** ClawHub Tab 内容 - 内嵌完整Marketplace */
function ClawHubTabContent({
  installQuery,
  setInstallQuery,
  searchSkills,
  searchResults,
  searching,
  searchError,
  safeSkills,
  installing,
  handleInstall,
  handleUninstall,
  skillsDirPath,
  setInstallSheetOpen,
  t,
}: {
  installQuery: string;
  setInstallQuery: (v: string) => void;
  searchSkills: (q: string) => void;
  searchResults: Array<{ slug: string; name: string; description?: string; author?: string; version?: string }>;
  searching: boolean;
  searchError: string | null;
  safeSkills: Skill[];
  installing: Record<string, boolean>;
  handleInstall: (slug: string) => Promise<void>;
  handleUninstall: (slug: string) => Promise<void>;
  skillsDirPath: string;
  setInstallSheetOpen: (v: boolean) => void;
  t: TFunction<'skills'>;
}) {
  useEffect(() => {
    if (installQuery.trim().length === 0) {
      searchSkills('');
      return;
    }
    const timer = setTimeout(() => searchSkills(installQuery), 300);
    return () => clearTimeout(timer);
  }, [installQuery, searchSkills]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex items-center flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <input
            placeholder={t('searchMarketplace', { defaultValue: '搜索 ClawHub 技能...' })}
            value={installQuery}
            onChange={(e) => setInstallQuery(e.target.value)}
            className="ml-3 bg-transparent outline-none flex-1 text-[13px] text-white placeholder:text-[var(--color-text-muted)] min-w-0"
          />
          {installQuery && (
            <button type="button" onClick={() => setInstallQuery('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] shrink-0 ml-1">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-xl border-[var(--color-border)] text-[var(--color-text-secondary)] shrink-0" disabled>
          {t('marketplace.sourceClawHub')}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {searchError && (
          <div className="mb-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{['searchTimeoutError', 'searchRateLimitError'].includes(searchError.replace('Error: ', '')) ? t(`toast.${searchError.replace('Error: ', '')}`, { path: skillsDirPath }) : t('marketplace.searchError')}</span>
          </div>
        )}
        {searching && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm">{t('marketplace.searching')}</p>
          </div>
        )}
        {!searching && searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((skill) => {
              const isInstalled = safeSkills.some(s => s.id === skill.slug || s.name === skill.name);
              const isInstallLoading = !!installing[skill.slug];
              return (
                <div
                  key={skill.slug}
                  className="flex items-center justify-between py-3.5 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] cursor-pointer"
                  onClick={() => invokeIpc('shell:openExternal', `https://clawhub.ai/s/${skill.slug}`)}
                >
                  <div className="flex items-start gap-4 flex-1 overflow-hidden pr-4">
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center text-xl bg-[var(--color-surface-raised)] rounded-xl">📦</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-white truncate">{skill.name}</h3>
                        {skill.author && <span className="text-xs text-[var(--color-text-muted)]">• {skill.author}</span>}
                      </div>
                      <p className="text-[13px] text-[var(--color-text-secondary)] line-clamp-1">{skill.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    {skill.version && <span className="text-xs font-mono text-[var(--color-text-muted)]">v{skill.version}</span>}
                    {isInstalled ? (
                      <Button variant="destructive" size="sm" className="h-8" onClick={() => handleUninstall(skill.slug)} disabled={isInstallLoading}>
                        {isInstallLoading ? <LoadingSpinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    ) : (
                      <Button size="sm" className="h-8 rounded-full bg-sky-500 hover:bg-sky-600" onClick={() => handleInstall(skill.slug)} disabled={isInstallLoading}>
                        {isInstallLoading ? <LoadingSpinner size="sm" /> : t('marketplace.install', '安装')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!searching && searchResults.length === 0 && !searchError && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p>{installQuery.trim() ? t('marketplace.noResults') : t('marketplace.emptyPrompt')}</p>
            <Button size="sm" className="mt-4 rounded-lg" onClick={() => setInstallSheetOpen(true)}>
              {t('marketplace.installDialogTitle', { defaultValue: '打开安装面板' })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** SkillHub Tab 内容 - 同类Marketplace */
function SkillHubTabContent({
  installQuery,
  setInstallQuery,
  searchSkills,
  searchResults,
  searching,
  searchError,
  safeSkills,
  installing,
  handleInstall,
  handleUninstall,
  skillsDirPath,
  t,
}: {
  installQuery: string;
  setInstallQuery: (v: string) => void;
  searchSkills: (q: string) => void;
  searchResults: Array<{ slug: string; name: string; description?: string; author?: string; version?: string }>;
  searching: boolean;
  searchError: string | null;
  safeSkills: Skill[];
  installing: Record<string, boolean>;
  handleInstall: (slug: string) => Promise<void>;
  handleUninstall: (slug: string) => Promise<void>;
  skillsDirPath: string;
  t: TFunction<'skills'>;
}) {
  useEffect(() => {
    if (installQuery.trim().length === 0) {
      searchSkills('');
      return;
    }
    const timer = setTimeout(() => searchSkills(installQuery), 300);
    return () => clearTimeout(timer);
  }, [installQuery, searchSkills]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex items-center flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <input
            placeholder={t('tabs.skillhubSearch', { defaultValue: '搜索 SkillHub 技能...' })}
            value={installQuery}
            onChange={(e) => setInstallQuery(e.target.value)}
            className="ml-3 bg-transparent outline-none flex-1 text-[13px] text-white placeholder:text-[var(--color-text-muted)] min-w-0"
          />
          {installQuery && (
            <button type="button" onClick={() => setInstallQuery('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] shrink-0 ml-1">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-xl border-[var(--color-border)] text-[var(--color-text-secondary)] shrink-0" disabled>
          SkillHub
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {searchError && (
          <div className="mb-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{t('marketplace.searchError')}</span>
          </div>
        )}
        {searching && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm">{t('marketplace.searching')}</p>
          </div>
        )}
        {!searching && searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((skill) => {
              const isInstalled = safeSkills.some(s => s.id === skill.slug || s.name === skill.name);
              const isInstallLoading = !!installing[skill.slug];
              return (
                <div
                  key={skill.slug}
                  className="flex items-center justify-between py-3.5 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] cursor-pointer"
                  onClick={() => invokeIpc('shell:openExternal', `https://clawhub.ai/s/${skill.slug}`)}
                >
                  <div className="flex items-start gap-4 flex-1 overflow-hidden pr-4">
                    <div className="h-10 w-10 shrink-0 flex items-center justify-center text-xl bg-[var(--color-surface-raised)] rounded-xl">📦</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-white truncate">{skill.name}</h3>
                        {skill.author && <span className="text-xs text-[var(--color-text-muted)]">• {skill.author}</span>}
                      </div>
                      <p className="text-[13px] text-[var(--color-text-secondary)] line-clamp-1">{skill.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    {skill.version && <span className="text-xs font-mono text-[var(--color-text-muted)]">v{skill.version}</span>}
                    {isInstalled ? (
                      <Button variant="destructive" size="sm" className="h-8" onClick={() => handleUninstall(skill.slug)} disabled={isInstallLoading}>
                        {isInstallLoading ? <LoadingSpinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    ) : (
                      <Button size="sm" className="h-8 rounded-full bg-sky-500 hover:bg-sky-600" onClick={() => handleInstall(skill.slug)} disabled={isInstallLoading}>
                        {isInstallLoading ? <LoadingSpinner size="sm" /> : t('marketplace.install', '安装')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!searching && searchResults.length === 0 && !searchError && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p>{installQuery.trim() ? t('marketplace.noResults') : t('tabs.skillhubEmpty', { defaultValue: '搜索 SkillHub 技能或访问官网' })}</p>
            <Button size="sm" className="mt-4 rounded-lg" onClick={() => invokeIpc('shell:openExternal', 'https://clawhub.ai')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('tabs.visitSkillHub', { defaultValue: '访问 SkillHub' })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillDetailDialog({ skill, isOpen, onClose, onToggle, onUninstall, onOpenFolder }: SkillDetailDialogProps) {
  const { t } = useTranslation('skills');
  const { fetchSkills } = useSkillsStore();
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize config from skill
  useEffect(() => {
    if (!skill) return;

    // API Key
    if (skill.config?.apiKey) {
      setApiKey(String(skill.config.apiKey));
    } else {
      setApiKey('');
    }

    // Env Vars
    if (skill.config?.env) {
      const vars = Object.entries(skill.config.env).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setEnvVars(vars);
    } else {
      setEnvVars([]);
    }
  }, [skill]);

  const handleOpenClawhub = async () => {
    if (!skill?.slug) return;
    await invokeIpc('shell:openExternal', `https://clawhub.ai/s/${skill.slug}`);
  };

  const handleOpenEditor = async () => {
    if (!skill?.id) return;
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/clawhub/open-readme', {
        method: 'POST',
        body: JSON.stringify({ skillKey: skill.id, slug: skill.slug, baseDir: skill.baseDir }),
      });
      if (result.success) {
        toast.success(t('toast.openedEditor'));
      } else {
        toast.error(result.error || t('toast.failedEditor'));
      }
    } catch (err) {
      toast.error(t('toast.failedEditor') + ': ' + String(err));
    }
  };

  const handleCopyPath = async () => {
    if (!skill?.baseDir) return;
    try {
      await navigator.clipboard.writeText(skill.baseDir);
      toast.success(t('toast.copiedPath'));
    } catch (err) {
      toast.error(t('toast.failedCopyPath') + ': ' + String(err));
    }
  };

  const handleAddEnv = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleUpdateEnv = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...envVars];
    newVars[index] = { ...newVars[index], [field]: value };
    setEnvVars(newVars);
  };

  const handleRemoveEnv = (index: number) => {
    const newVars = [...envVars];
    newVars.splice(index, 1);
    setEnvVars(newVars);
  };

  const handleSaveConfig = async () => {
    if (isSaving || !skill) return;
    setIsSaving(true);
    try {
      // Build env object, filtering out empty keys
      const envObj = envVars.reduce((acc, curr) => {
        const key = curr.key.trim();
        const value = curr.value.trim();
        if (key) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      // Use direct file access instead of Gateway RPC for reliability
      const result = await invokeIpc<{ success: boolean; error?: string }>(
        'skill:updateConfig',
        {
          skillKey: skill.id,
          apiKey: apiKey || '', // Empty string will delete the key
          env: envObj // Empty object will clear all env vars
        }
      ) as { success: boolean; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      // Refresh skills from gateway to get updated config
      await fetchSkills();

      toast.success(t('detail.configSaved'));
    } catch (err) {
      toast.error(t('toast.failedSave') + ': ' + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!skill) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        title={skill ? `${t('detail.configure', { defaultValue: '配置' })}: ${skill.name}` : t('detail.skillDetails', { defaultValue: '技能详情' })}
        className="w-full sm:max-w-[450px] p-0 flex flex-col border-l border-[var(--color-border)] bg-[#1e293b] shadow-[0_0_40px_rgba(0,0,0,0.4)]"
        side="right"
      >
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[var(--color-surface-sunken)] border border-[var(--color-border)] shrink-0 mb-4 relative">
              <span className="text-3xl">{skill.icon || '🔧'}</span>
              {skill.isCore && (
                <div className="absolute -bottom-1 -right-1 bg-[#1e293b] rounded-full p-1 border border-[var(--color-border)]">
                  <Lock className="h-3 w-3 text-[var(--color-text-muted)] shrink-0" />
                </div>
              )}
            </div>
            <h2 className="text-[28px] font-serif text-white font-normal mb-3 text-center tracking-tight">
              {skill.name}
            </h2>
            <div className="flex items-center justify-center gap-2.5 mb-6 opacity-90">
              <Badge variant="secondary" className="font-mono text-[11px] font-medium px-3 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                v{skill.version}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[11px] font-medium px-3 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                {skill.isCore ? t('detail.coreSystem') : skill.isBundled ? t('detail.bundled') : t('detail.userInstalled')}
              </Badge>
            </div>

            {skill.description && (
              <p className="text-[14px] text-[var(--color-text-secondary)] font-medium leading-[1.6] text-center px-4">
                {skill.description}
              </p>
            )}
          </div>

          <div className="space-y-7 px-1">
            <div className="space-y-2">
              <h3 className="text-[13px] font-bold text-[var(--color-text-secondary)]">{t('detail.source')}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="font-mono text-[11px] font-medium px-3 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  {resolveSkillSourceLabel(skill, t)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={skill.baseDir || t('detail.pathUnavailable')}
                  readOnly
                  className="h-[38px] font-mono text-[12px] bg-[var(--color-surface-sunken)] border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)]"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-[38px] w-[38px] border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-white"
                  disabled={!skill.baseDir}
                  onClick={handleCopyPath}
                  title={t('detail.copyPath')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-[38px] w-[38px] border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-white"
                  disabled={!skill.baseDir}
                  onClick={() => onOpenFolder?.(skill)}
                  title={t('detail.openActualFolder')}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* API Key Section */}
            {!skill.isCore && (
              <div className="space-y-2">
                <h3 className="text-[13px] font-bold flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <Key className="h-3.5 w-3.5 text-sky-400" />
                  {t('detail.apiKey')}
                </h3>
                <Input
                  placeholder={t('detail.apiKeyPlaceholder', 'Enter API Key (optional)')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  className="h-[44px] font-mono text-[13px] bg-[var(--color-surface-sunken)] border-[var(--color-border)] rounded-xl focus-visible:ring-2 focus-visible:ring-sky-500/50 text-white placeholder:text-[var(--color-text-muted)]"
                />
                <p className="text-[12px] text-[var(--color-text-muted)] mt-2 font-medium">
                  {t('detail.apiKeyDesc', 'The primary API key for this skill. Leave blank if not required or configured elsewhere.')}
                </p>
              </div>
            )}

            {/* Environment Variables Section */}
            {!skill.isCore && (
              <div className="space-y-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-[var(--color-text-secondary)]">
                      {t('detail.envVars')}
                      {envVars.length > 0 && (
                        <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px] h-5 bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]">
                          {envVars.length}
                        </Badge>
                      )}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[12px] font-semibold text-[var(--color-text-secondary)] gap-1.5 px-2.5 hover:bg-[var(--color-surface-raised)]"
                    onClick={handleAddEnv}
                  >
                    <Plus className="h-3 w-3" strokeWidth={3} />
                    {t('detail.addVariable', 'Add Variable')}
                  </Button>
                </div>

                <div className="space-y-2">
                  {envVars.length === 0 && (
                    <div className="text-[13px] text-[var(--color-text-muted)] font-medium italic flex items-center bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-xl px-4 py-3">
                      {t('detail.noEnvVars', 'No environment variables configured.')}
                    </div>
                  )}

                  {envVars.map((env, index) => (
                    <div className="flex items-center gap-3" key={index}>
                      <Input
                        value={env.key}
                        onChange={(e) => handleUpdateEnv(index, 'key', e.target.value)}
                        className="flex-1 h-[40px] font-mono text-[13px] bg-[var(--color-surface-sunken)] border-[var(--color-border)] rounded-xl focus-visible:ring-2 focus-visible:ring-sky-500/50 text-white placeholder:text-[var(--color-text-muted)]"
                        placeholder={t('detail.keyPlaceholder', 'Key')}
                      />
                      <Input
                        value={env.value}
                        onChange={(e) => handleUpdateEnv(index, 'value', e.target.value)}
                        className="flex-1 h-[40px] font-mono text-[13px] bg-[var(--color-surface-sunken)] border-[var(--color-border)] rounded-xl focus-visible:ring-2 focus-visible:ring-sky-500/50 text-white placeholder:text-[var(--color-text-muted)]"
                        placeholder={t('detail.valuePlaceholder', 'Value')}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive/70 hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-xl transition-colors"
                        onClick={() => handleRemoveEnv(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            {skill.slug && !skill.isBundled && !skill.isCore && (
              <div className="flex gap-2 justify-center pt-8">
                <Button variant="outline" size="sm" className="h-[28px] text-[11px] font-medium px-3 gap-1.5 rounded-full border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]" onClick={handleOpenClawhub}>
                  <Globe className="h-[12px] w-[12px]" />
                  ClawHub
                </Button>
                <Button variant="outline" size="sm" className="h-[28px] text-[11px] font-medium px-3 gap-1.5 rounded-full border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]" onClick={handleOpenEditor}>
                  <FileCode className="h-[12px] w-[12px]" />
                  {t('detail.openManual')}
                </Button>
              </div>
            )}
          </div>

          {/* Centered Footer Buttons */}
          <div className="pt-8 pb-4 flex items-center justify-center gap-4 w-full px-2 max-w-[340px] mx-auto">
            {!skill.isCore && (
              <Button
                onClick={handleSaveConfig}
                className={cn(
                  "flex-1 h-[42px] text-[13px] rounded-full font-semibold shadow-sm border border-transparent transition-all",
                  "bg-[#0a84ff] hover:bg-[#007aff] text-white"
                )}
                disabled={isSaving}
              >
                {isSaving ? t('detail.saving') : t('detail.saveConfig')}
              </Button>
            )}

            {!skill.isCore && (
              <Button
                variant="outline"
                className="flex-1 h-[42px] text-[13px] rounded-full font-semibold bg-transparent border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                onClick={() => {
                  if (!skill.isBundled && onUninstall && skill.slug) {
                    onUninstall(skill.slug);
                    onClose();
                  } else {
                    onToggle(!skill.enabled);
                  }
                }}
              >
                {!skill.isBundled && onUninstall
                  ? t('detail.uninstall')
                  : (skill.enabled ? t('detail.disable') : t('detail.enable'))}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface SkillsProps {
  onNavigateTo?: (view: string) => void;
}

export function Skills({ onNavigateTo }: SkillsProps) {
  const {
    skills,
    loading,
    error,
    fetchSkills,
    enableSkill,
    disableSkill,
    searchResults,
    searchSkills,
    installSkill,
    uninstallSkill,
    loadSkillsFromDir,
    searching,
    searchError,
    installing
  } = useSkillsStore();
  const { t } = useTranslation('skills');
  const gatewayStatus = useGatewayStore((state) => state.status);
  const [searchQuery, setSearchQuery] = useState('');
  const [installQuery, setInstallQuery] = useState('');
  const [installSheetOpen, setInstallSheetOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedSource, setSelectedSource] = useState<'all' | 'workspace' | 'managed' | 'bundled'>('all');
  const [selectedTab, setSelectedTab] = useState<'all' | 'available' | 'unavailable' | 'market'>('all');
  const [mainCategory, setMainCategory] = useState<MainCategory>('skills');

  const isGatewayRunning = gatewayStatus.state === 'running';
  const [showGatewayWarning, setShowGatewayWarning] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isGatewayRunning) {
      timer = setTimeout(() => {
        setShowGatewayWarning(true);
      }, 1500);
    } else {
      timer = setTimeout(() => {
        setShowGatewayWarning(false);
      }, 0);
    }
    return () => clearTimeout(timer);
  }, [isGatewayRunning]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const safeSkills = Array.isArray(skills) ? skills : [];
  const availableCount = safeSkills.filter(s => s.enabled || s.isCore).length;
  const unavailableCount = safeSkills.filter(s => !s.enabled && !s.isCore).length;
  const bundledCount = safeSkills.filter(s => s.isBundled || (s.source || '').toLowerCase().includes('bundled')).length;

  const filteredSkills = safeSkills.filter((skill) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q.length === 0 ||
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q) ||
      skill.id.toLowerCase().includes(q) ||
      (skill.slug || '').toLowerCase().includes(q) ||
      (skill.author || '').toLowerCase().includes(q);

    let matchesSource = true;
    const src = (skill.source || '').toLowerCase();
    if (selectedSource === 'workspace') {
      matchesSource = src.includes('workspace');
    } else if (selectedSource === 'managed') {
      matchesSource = src.includes('managed') || (src.includes('agents') && !skill.isBundled);
    } else if (selectedSource === 'bundled') {
      matchesSource = !!skill.isBundled || src.includes('bundled');
    }

    let matchesTab = true;
    if (selectedTab === 'available') {
      matchesTab = skill.enabled || !!skill.isCore;
    } else if (selectedTab === 'unavailable') {
      matchesTab = !skill.enabled && !skill.isCore;
    } else if (selectedTab === 'market') {
      matchesTab = false; // Marketplace在单独面板，此处不显示Skills卡片
    }

    return matchesSearch && matchesSource && matchesTab;
  }).sort((a, b) => {
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && b.enabled) return 1;
    if (a.isCore && !b.isCore) return -1;
    if (!a.isCore && b.isCore) return 1;
    return a.name.localeCompare(b.name);
  });

  const sourceStats = {
    all: safeSkills.length,
    workspace: safeSkills.filter(s => (s.source || '').toLowerCase().includes('workspace')).length,
    managed: safeSkills.filter(s => (s.source || '').toLowerCase().includes('managed') || ((s.source || '').toLowerCase().includes('agents') && !s.isBundled)).length,
    bundled: safeSkills.filter(s => s.isBundled || (s.source || '').toLowerCase().includes('bundled')).length,
  };

  const bulkToggleVisible = useCallback(async (enable: boolean) => {
    const candidates = filteredSkills.filter((skill) => !skill.isCore && skill.enabled !== enable);
    if (candidates.length === 0) {
      toast.info(enable ? t('toast.noBatchEnableTargets') : t('toast.noBatchDisableTargets'));
      return;
    }

    let succeeded = 0;
    for (const skill of candidates) {
      try {
        if (enable) {
          await enableSkill(skill.id);
        } else {
          await disableSkill(skill.id);
        }
        succeeded += 1;
      } catch {
        // Continue to next skill and report final summary.
      }
    }

    trackUiEvent('skills.batch_toggle', { enable, total: candidates.length, succeeded });
    if (succeeded === candidates.length) {
      toast.success(enable ? t('toast.batchEnabled', { count: succeeded }) : t('toast.batchDisabled', { count: succeeded }));
      return;
    }
    toast.warning(t('toast.batchPartial', { success: succeeded, total: candidates.length }));
  }, [disableSkill, enableSkill, filteredSkills, t]);

  const handleToggle = useCallback(async (skillId: string, enable: boolean) => {
    try {
      if (enable) {
        await enableSkill(skillId);
        toast.success(t('toast.enabled'));
      } else {
        await disableSkill(skillId);
        toast.success(t('toast.disabled'));
      }
    } catch (err) {
      toast.error(String(err));
    }
  }, [enableSkill, disableSkill, t]);

  const hasInstalledSkills = safeSkills.some(s => !s.isBundled);

  const handleOpenSkillsFolder = useCallback(async () => {
    try {
      const skillsDir = await invokeIpc<string>('openclaw:getSkillsDir');
      if (!skillsDir) {
        throw new Error('Skills directory not available');
      }
      const result = await invokeIpc<string>('shell:openPath', skillsDir);
      if (result) {
        if (result.toLowerCase().includes('no such file') || result.toLowerCase().includes('not found') || result.toLowerCase().includes('failed to open')) {
          toast.error(t('toast.failedFolderNotFound'));
        } else {
          throw new Error(result);
        }
      }
    } catch (err) {
      toast.error(t('toast.failedOpenFolder') + ': ' + String(err));
    }
  }, [t]);

  const [loadingFromDir, setLoadingFromDir] = useState(false);
  const handleLoadFromDir = useCallback(async () => {
    try {
      const result = await invokeIpc<{ canceled?: boolean; filePaths?: string[] }>('dialog:open', {
        properties: ['openDirectory'],
      });
      if (result?.canceled || !result?.filePaths?.length) return;
      const dirPath = result.filePaths[0];
      setLoadingFromDir(true);
      await loadSkillsFromDir(dirPath);
      toast.success(t('toast.loadedFromDir', { count: 1, defaultValue: '已从工作区目录加载技能' }));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoadingFromDir(false);
    }
  }, [loadSkillsFromDir, t]);

  const handleOpenSkillFolder = useCallback(async (skill: Skill) => {
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/clawhub/open-path', {
        method: 'POST',
        body: JSON.stringify({
          skillKey: skill.id,
          slug: skill.slug,
          baseDir: skill.baseDir,
        }),
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to open folder');
      }
    } catch (err) {
      toast.error(t('toast.failedOpenActualFolder') + ': ' + String(err));
    }
  }, [t]);

  const [skillsDirPath, setSkillsDirPath] = useState('~/.openclaw/skills');

  useEffect(() => {
    invokeIpc<string>('openclaw:getSkillsDir')
      .then((dir) => setSkillsDirPath(dir as string))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!installSheetOpen) {
      return;
    }

    const query = installQuery.trim();
    if (query.length === 0) {
      searchSkills('');
      return;
    }

    const timer = setTimeout(() => {
      searchSkills(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [installQuery, installSheetOpen, searchSkills]);

  const handleInstall = useCallback(async (slug: string) => {
    try {
      await installSkill(slug);
      await enableSkill(slug);
      toast.success(t('toast.installed'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (['installTimeoutError', 'installRateLimitError'].includes(errorMessage)) {
        toast.error(t(`toast.${errorMessage}`, { path: skillsDirPath }), { duration: 10000 });
      } else {
        toast.error(t('toast.failedInstall') + ': ' + errorMessage);
      }
    }
  }, [installSkill, enableSkill, t, skillsDirPath]);

  const handleUninstall = useCallback(async (slug: string) => {
    try {
      await uninstallSkill(slug);
      toast.success(t('toast.uninstalled'));
    } catch (err) {
      toast.error(t('toast.failedUninstall') + ': ' + String(err));
    }
  }, [uninstallSkill, t]);

  const mainTabs: { id: MainCategory; label: string; count?: number }[] = [
    { id: 'skills', label: t('tabs.skills'), count: safeSkills.length },
    { id: 'tools', label: t('tabs.tools') },
    { id: 'plugins', label: t('tabs.plugins') },
    { id: 'clawhub', label: t('tabs.clawhub') },
    { id: 'skillhub', label: t('tabs.skillhub') },
  ];

  if (loading) {
    return (
      <div className="flex flex-col w-full min-h-full dark:bg-background items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      {/* AxonClawX 风格顶部 */}
      <div className="shrink-0 pt-4 pb-4">
        <h1 className="text-base font-bold text-[var(--color-text)]">{t('title', { defaultValue: '⚡ 技能管理' })}</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t('subtitle', { defaultValue: '浏览并管理 AI 能力扩展' })}</p>
      </div>

      {/* 主分类 Tab 栏 - 胶囊式 */}
      <div className="shrink-0 mb-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/40 border border-[var(--color-border)]">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMainCategory(tab.id);
                if (tab.id === 'clawhub') setInstallSheetOpen(true);
              }}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                mainCategory === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              )}
            >
              {tab.label}
              {tab.count != null && (
                <span className={cn(
                  'ml-1.5',
                  mainCategory === tab.id ? 'text-white' : 'text-[var(--color-text-muted)]'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full flex flex-col h-full py-4 flex-1 min-h-0 overflow-hidden">

        {/* Skills Tab: Search + Filter Badges (AxonClawX) */}
        {mainCategory === 'skills' && (
        <>
        {/* Row 1: Search + Filter Badges */}
        <div className="flex items-center gap-3 flex-wrap shrink-0 mb-4">
          <div className="relative flex-1 min-w-[280px] flex items-center rounded-xl border border-[var(--color-border)] bg-[#1e293b] px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              placeholder={t('searchSkills')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ml-3 bg-transparent outline-none flex-1 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] min-w-0"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] shrink-0 ml-1">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedTab('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                selectedTab === 'all' ? 'bg-sky-500/15 text-sky-400' : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
              )}
            >
              {t('filter.all')} ({sourceStats.all})
            </button>
            <button
              onClick={() => setSelectedTab('available')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                selectedTab === 'available' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
              )}
            >
              {t('available')} ({availableCount})
            </button>
            <button
              onClick={() => setSelectedTab('unavailable')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                selectedTab === 'unavailable' ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
              )}
            >
              {t('unavailable')} ({unavailableCount})
            </button>
            <button
              onClick={() => { setSelectedTab('market'); setInstallSheetOpen(true); }}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                selectedTab === 'market' ? 'bg-sky-500/15 text-sky-400' : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
              )}
            >
              {t('marketplace.sourceLabel')} {t('marketplace.sourceClawHub')}
            </button>
          </div>
        </div>

        {/* Row 2: Actions + Tools (AxonClawX) */}
        <div className="flex items-center gap-2 shrink-0 mb-4 flex-wrap">
          <button
            onClick={() => bulkToggleVisible(true)}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)]"
          >
            {t('actions.batchEnable')}
          </button>
          <button
            onClick={() => bulkToggleVisible(false)}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)]"
          >
            {t('actions.batchDisable')}
          </button>
          <button
            onClick={() => { setInstallQuery(''); setInstallSheetOpen(true); }}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white border border-sky-500/50"
          >
            {t('actions.installFromClawHub')}
          </button>
          <div className="flex items-center gap-1.5 ml-2 border-l border-[var(--color-border)] pl-2">
            <button
              onClick={() => fetchSkills()}
              disabled={loading}
              className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)]"
              title={t('refresh')}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={handleLoadFromDir}
              disabled={loadingFromDir}
              className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)]"
              title={t('actions.loadFromDir', { defaultValue: '加载目录' })}
            >
              {loadingFromDir ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            </button>
            {hasInstalledSkills && (
              <button
                onClick={handleOpenSkillsFolder}
                className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)]"
                title={t('openFolder')}
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Gateway Warning */}
        {showGatewayWarning && (
          <div className="mb-4 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 flex items-center gap-2 text-[var(--color-text-secondary)] text-sm font-medium">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            {t('gatewayWarning')}
          </div>
        )}

        {/* Content: Grid of Cards */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">
          {error && (
            <div className="mb-4 p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{['fetchTimeoutError', 'fetchRateLimitError', 'timeoutError', 'rateLimitError'].includes(error) ? t(`toast.${error}`, { path: skillsDirPath }) : error}</span>
            </div>
          )}

          {selectedTab === 'market' ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p className="mb-4">{t('marketplace.emptyPrompt', { defaultValue: '在 ClawHub 搜索并安装技能' })}</p>
              <Button onClick={() => { setInstallQuery(''); setInstallSheetOpen(true); }} className="rounded-full">
                {t('marketplace.installDialogTitle', { defaultValue: '打开 ClawHub 市场' })}
              </Button>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
              <Puzzle className="h-10 w-10 mb-4 opacity-50" />
              <p>{searchQuery ? t('noSkillsSearch') : t('noSkillsAvailable')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((skill) => {
                const isAvailable = skill.enabled || !!skill.isCore;
                return (
                  <div
                    key={skill.id}
                    className={cn(
                      "group relative flex flex-col rounded-xl border-2 bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-raised)] border-[var(--color-border)] transition-colors overflow-hidden",
                      getSkillBorderClass(skill)
                    )}
                  >
                    <div className="p-4 cursor-pointer" onClick={() => setSelectedSkill(skill)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-10 w-10 shrink-0 flex items-center justify-center text-xl bg-black/5 dark:bg-[var(--color-surface-sunken)] rounded-lg overflow-hidden">
                            {skill.icon || '🧩'}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[15px] font-semibold text-[var(--color-text)] truncate">{skill.name}</h3>
                            <p className="text-[11px] text-[var(--color-text-secondary)] font-mono truncate">
                              {resolveSkillSourceLabel(skill, t)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                          <span className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-full",
                            isAvailable ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          )}>
                            {isAvailable ? t('available') : t('unavailable')}
                          </span>
                          {!skill.isCore && (
                            <Switch
                              checked={skill.enabled}
                              onCheckedChange={(checked) => handleToggle(skill.id, checked)}
                              className="scale-90"
                            />
                          )}
                        </div>
                      </div>
                      <p className="text-[13px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                        {skill.description || '—'}
                      </p>
                      {!isAvailable && !skill.isCore && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('unavailableHint', { defaultValue: '配置后启用' })}</span>
                        </div>
                      )}
                    </div>
                    <div className="px-4 pb-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg shrink-0" onClick={() => setSelectedSkill(skill)}>
                        <Settings className="h-3 w-3 mr-1.5" />
                        {t('detail.configure')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between shrink-0 pt-3 border-t border-[var(--color-border)] text-[12px] text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-4">
            <span className="font-medium text-[var(--color-text)]">{sourceStats.all} {t('statusBar.skills', { defaultValue: '技能' })}</span>
            <span className="text-emerald-400">{availableCount} {t('statusBar.ready', { defaultValue: '可用' })}</span>
            <span className="text-amber-400">{unavailableCount} {t('statusBar.missing', { defaultValue: '缺失' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            <span>{t('statusBar.bundled', { defaultValue: '内置' })}: {bundledCount}</span>
          </div>
        </div>
        </>
        )}

        {/* Tools Tab - Agent Tools目录 */}
        {mainCategory === 'tools' && (
          <ToolsTabContent
            isOnline={isGatewayRunning}
            onNavigateConfig={() => onNavigateTo?.('config')}
            t={t}
          />
        )}

        {/* Plugins Tab - 完整Plugins管理 (PluginsView 功能) */}
        {mainCategory === 'plugins' && (
          <PluginsTabContent
            skills={safeSkills}
            loading={loading}
            fetchSkills={fetchSkills}
            handleToggle={handleToggle}
            setSelectedSkill={setSelectedSkill}
            isOnline={isGatewayRunning}
            setInstallSheetOpen={setInstallSheetOpen}
            t={t}
          />
        )}

        {/* ClawHub Tab - 内嵌完整Marketplace */}
        {mainCategory === 'clawhub' && (
          <ClawHubTabContent
            installQuery={installQuery}
            setInstallQuery={setInstallQuery}
            searchSkills={searchSkills}
            searchResults={searchResults}
            searching={searching}
            searchError={searchError}
            safeSkills={safeSkills}
            installing={installing}
            handleInstall={handleInstall}
            handleUninstall={handleUninstall}
            skillsDirPath={skillsDirPath}
            setInstallSheetOpen={setInstallSheetOpen}
            t={t}
          />
        )}

        {/* SkillHub Tab - 同类Marketplace功能 */}
        {mainCategory === 'skillhub' && (
          <SkillHubTabContent
            installQuery={installQuery}
            setInstallQuery={setInstallQuery}
            searchSkills={searchSkills}
            searchResults={searchResults}
            searching={searching}
            searchError={searchError}
            safeSkills={safeSkills}
            installing={installing}
            handleInstall={handleInstall}
            handleUninstall={handleUninstall}
            skillsDirPath={skillsDirPath}
            t={t}
          />
        )}
      </div>

      <Sheet open={installSheetOpen} onOpenChange={setInstallSheetOpen}>
        <SheetContent
          title={t('marketplace.installDialogTitle', { defaultValue: '从 ClawHub 安装' })}
          className="w-full sm:max-w-[560px] p-0 flex flex-col border-l border-[var(--color-border)] bg-[#1e293b] shadow-[0_0_40px_rgba(0,0,0,0.4)]"
          side="right"
        >
          <div className="px-7 py-6 border-b border-[var(--color-border)]">
            <h2 className="text-[24px] font-serif text-white font-normal tracking-tight">{t('marketplace.installDialogTitle')}</h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{t('marketplace.installDialogSubtitle')}</p>
            <div className="mt-4 flex flex-col md:flex-row gap-2">
              <div className="relative flex items-center bg-[var(--color-surface-sunken)] rounded-xl px-3 py-2 border border-[var(--color-border)] flex-1">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  placeholder={t('searchMarketplace')}
                  value={installQuery}
                  onChange={(e) => setInstallQuery(e.target.value)}
                  className="ml-2 h-auto border-0 bg-transparent p-0 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[13px] text-white placeholder:text-[var(--color-text-muted)]"
                />
                {installQuery && (
                  <button
                    type="button"
                    onClick={() => setInstallQuery('')}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] shrink-0 ml-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                disabled
                className="h-10 rounded-xl border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)]"
              >
                {t('marketplace.sourceLabel')}: {t('marketplace.sourceClawHub')}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {searchError && (
              <div className="mb-4 p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>
                  {['searchTimeoutError', 'searchRateLimitError', 'timeoutError', 'rateLimitError'].includes(searchError.replace('Error: ', ''))
                    ? t(`toast.${searchError.replace('Error: ', '')}`, { path: skillsDirPath })
                    : t('marketplace.searchError')}
                </span>
              </div>
            )}

            {searching && (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-sm">{t('marketplace.searching')}</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="flex flex-col gap-1">
                {searchResults.map((skill) => {
                  const isInstalled = safeSkills.some(s => s.id === skill.slug || s.name === skill.name);
                  const isInstallLoading = !!installing[skill.slug];

                  return (
                    <div
                      key={skill.slug}
                      className="group flex flex-row items-center justify-between py-3.5 px-3 rounded-xl hover:bg-[var(--color-surface-sunken)] transition-colors cursor-pointer border-b border-[var(--color-border-subtle)] last:border-0"
                      onClick={() => invokeIpc('shell:openExternal', `https://clawhub.ai/s/${skill.slug}`)}
                    >
                      <div className="flex items-start gap-4 flex-1 overflow-hidden pr-4">
                        <div className="h-10 w-10 shrink-0 flex items-center justify-center text-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                          📦
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[15px] font-semibold text-white truncate">{skill.name}</h3>
                            {skill.author && (
                              <span className="text-xs text-[var(--color-text-secondary)]">• {skill.author}</span>
                            )}
                          </div>
                          <p className="text-[13.5px] text-[var(--color-text-secondary)] line-clamp-1 pr-6 leading-relaxed">
                            {skill.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                        {skill.version && (
                          <span className="text-[13px] font-mono text-[var(--color-text-secondary)] mr-2">
                            v{skill.version}
                          </span>
                        )}
                        {isInstalled ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUninstall(skill.slug)}
                            disabled={isInstallLoading}
                            className="h-8 shadow-none"
                          >
                            {isInstallLoading ? <LoadingSpinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleInstall(skill.slug)}
                            disabled={isInstallLoading}
                            className="h-8 px-4 rounded-full shadow-none font-medium text-xs"
                          >
                            {isInstallLoading ? <LoadingSpinner size="sm" /> : t('marketplace.install', '安装')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!searching && searchResults.length === 0 && !searchError && (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
                <Package className="h-10 w-10 mb-4 opacity-50" />
                <p>{installQuery.trim() ? t('marketplace.noResults') : t('marketplace.emptyPrompt')}</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Skill Detail Dialog */}
      <SkillDetailDialog
        skill={selectedSkill}
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onToggle={(enabled) => {
          if (!selectedSkill) return;
          handleToggle(selectedSkill.id, enabled);
          setSelectedSkill({ ...selectedSkill, enabled });
        }}
        onUninstall={handleUninstall}
        onOpenFolder={handleOpenSkillFolder}
      />
    </div>
  );
}

export default Skills;
