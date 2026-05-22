import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Download,
  Headset,
  LineChart,
  Megaphone,
  Palette,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { agentsCreate, agentFileSet } from '@/services/agent-api';

type BuiltinAgentTemplate = {
  id: string;
  name: string;
  description: string;
  tag: string;
  sourcePath: string;
};

type AgentCategory = 'marketing' | 'data' | 'design' | 'support' | 'devops' | 'security' | 'general';

type TemplateViewModel = BuiltinAgentTemplate & {
  displayName: string;
  displayDescription: string;
  displayTag: string;
  category: AgentCategory;
  installed: boolean;
  installedAgentId: string | null;
};

function isAsciiLike(value: string): boolean {
  return /^[\x00-\x7F\s\-_:/.,()]+$/.test(value);
}

function normalizeCatalogDescription(value: string): string {
  const text = String(value || '').trim();
  if (!text) return text;
  return text.replace(/^name\s*:\s*/i, '').trim();
}

function translateAgentIdToZh(id: string): string {
  const dict: Record<string, string> = {
    academic: '学术',
    anthropologist: '人类学家',
    geographer: '地理学家',
    historian: '历史学家',
    narratologist: '叙事学家',
    psychologist: '心理学家',
    planner: '规划师',
    study: '学习',
    accounts: '账务',
    payable: '应付',
    receivable: '应收',
    finance: '财务',
    accounting: '会计',
    marketing: '营销',
    seo: 'SEO',
    baidu: '百度',
    wechat: '微信',
    xiaohongshu: '小红书',
    content: '内容',
    operator: '运营',
    specialist: '专家',
    manager: '管理',
    support: '支持',
    customer: '客户',
    service: '服务',
    design: '设计',
    visual: '视觉',
    ui: '界面',
    ux: '体验',
    devops: '运维',
    sre: 'SRE',
    security: '安全',
    auditor: '审计师',
    compliance: '合规',
    governance: '治理',
    architect: '架构师',
    automation: '自动化',
    orchestrator: '编排',
    agent: '智能体',
    data: '数据',
    pipeline: '管道',
    analyst: '分析师',
    researcher: '研究员',
    writer: '写作',
    editor: '编辑',
    publisher: '发布',
    trainer: '训练',
    trainerx: '训练',
    brand: '品牌',
    guardian: '守护者',
    blockchain: '区块链',
    cloud: '云',
    api: 'API',
    gateway: '网关',
    tool: '工具',
    sales: '销售',
    hr: '人力',
    legal: '法务',
    ops: '运营',
    risk: '风控',
    qa: '测试',
    quality: '质量',
    project: '项目',
    product: '产品',
  };
  const parts = String(id || '').toLowerCase().split(/[-_]+/).filter(Boolean);
  const mapped = parts.map((p) => dict[p] || p.toUpperCase());
  const text = mapped.join(' ');
  return text || '智能体';
}

function buildZhNameFromId(id: string): string {
  const base = translateAgentIdToZh(id).trim();
  if (!base) return '智能体';
  const hasRoleWord = /(师|员|家|专家|管理|守护者|架构师|规划师|分析师|审计师|研究员|智能体)$/u.test(base);
  return hasRoleWord ? base : `${base} 智能体`;
}

function buildZhDescFromId(id: string): string {
  const name = buildZhNameFromId(id);
  return `负责 ${name} 相关任务的执行与协作。`;
}

function localizeTag(tag: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const normalized = String(tag || '').trim().toLowerCase();
  const map: Record<string, string> = {
    academic: t('agentLibrary.tag.academic'),
    specialized: t('agentLibrary.tag.specialized'),
    marketing: t('agentLibrary.tag.marketing'),
    support: t('agentLibrary.tag.support'),
    design: t('agentLibrary.tag.design'),
    data: t('agentLibrary.tag.data'),
    devops: t('agentLibrary.tag.devops'),
    seo: 'SEO',
    finance: t('agentLibrary.tag.finance'),
    operations: t('agentLibrary.tag.operations'),
  };
  return map[normalized] || tag;
}

const BUILTIN_TEMPLATES_FALLBACK: BuiltinAgentTemplate[] = [
  {
    id: 'marketing-xiaohongshu-operator',
    name: '小红书运营专家',
    description: '负责小红书内容运营、种草策略与转化优化。',
    tag: '内容运营',
    sourcePath: '/builtin-agents/agency-agents-zh/openclaw/marketing-xiaohongshu-operator',
  },
  {
    id: 'marketing-wechat-official-account',
    name: '微信公众号管理',
    description: '公众号选题策划、内容生产与运营增长。',
    tag: '私域运营',
    sourcePath: '/builtin-agents/agency-agents-zh/openclaw/marketing-wechat-official-account',
  },
  {
    id: 'marketing-baidu-seo-specialist',
    name: '百度 SEO 专家',
    description: '专注百度生态的关键词优化与内容增长。',
    tag: 'SEO',
    sourcePath: '/builtin-agents/agency-agents-zh/openclaw/marketing-baidu-seo-specialist',
  },
  {
    id: 'support-finance-tracker',
    name: '财务追踪助手',
    description: '跟踪财务指标、记录异常并形成汇总。',
    tag: '运营',
    sourcePath: '/builtin-agents/agency-agents-zh/openclaw/support-finance-tracker',
  },
  {
    id: 'design-inclusive-visuals-specialist',
    name: '包容性视觉设计专家',
    description: '面向多终端的可访问视觉方案设计。',
    tag: '设计',
    sourcePath: '/builtin-agents/agency-agents-zh/openclaw/design-inclusive-visuals-specialist',
  },
];

const TEMPLATE_FILES = ['IDENTITY.md', 'SOUL.md', 'USER.md', 'HEARTBEAT.md', 'AGENTS.md', 'TOOLS.md', 'BOOTSTRAP.md'] as const;
const AGENT_LIBRARY_WORKSPACE_ROOT = '~/.openclaw/agent-library';

interface AgentLibraryViewProps {
  onNavigateTo?: (view: string) => void;
}

function resolveTemplateIcon(category: AgentCategory): LucideIcon {
  switch (category) {
    case 'marketing':
      return Megaphone;
    case 'data':
      return LineChart;
    case 'design':
      return Palette;
    case 'support':
      return Headset;
    case 'devops':
      return Wrench;
    case 'security':
      return ShieldCheck;
    default:
      return Bot;
  }
}

function resolveCategory(name: string, tag: string, id: string): AgentCategory {
  const text = `${name} ${tag} ${id}`.toLowerCase();
  if (text.includes('seo') || text.includes('运营') || text.includes('营销') || text.includes('market')) return 'marketing';
  if (text.includes('财务') || text.includes('数据') || text.includes('报表') || text.includes('data')) return 'data';
  if (text.includes('设计') || text.includes('视觉') || text.includes('design') || text.includes('ui')) return 'design';
  if (text.includes('客服') || text.includes('支持') || text.includes('support')) return 'support';
  if (text.includes('devops') || text.includes('sre') || text.includes('运维')) return 'devops';
  if (text.includes('安全') || text.includes('审计') || text.includes('security')) return 'security';
  return 'general';
}

function buildAgentWorkspace(templateId: string): string {
  const safeId = String(templateId || 'agent')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'agent';
  return `${AGENT_LIBRARY_WORKSPACE_ROOT}/${safeId}`;
}

function normalizeComparableText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function isAgentInstalledFromTemplate(
  agent: { id?: string; name?: string; workspace?: string },
  label: string,
  template: Pick<TemplateViewModel, 'id' | 'name' | 'displayName'>,
): boolean {
  const id = normalizeComparableText(agent.id);
  const name = normalizeComparableText(agent.name);
  const workspace = normalizeComparableText(agent.workspace);
  const resolvedLabel = normalizeComparableText(label);
  const templateId = normalizeComparableText(template.id);
  const templateName = normalizeComparableText(template.name);
  const displayName = normalizeComparableText(template.displayName);
  const expectedWorkspace = normalizeComparableText(buildAgentWorkspace(template.id));

  return id === templateId
    || id.includes(templateId)
    || name === templateName
    || name === displayName
    || resolvedLabel === templateName
    || resolvedLabel === displayName
    || workspace === expectedWorkspace
    || workspace.endsWith(`/${templateId}`);
}

function getAgentIdFromCreateResult(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const obj = result as Record<string, unknown>;
  for (const key of ['agentId', 'id', 'key']) {
    if (typeof obj[key] === 'string' && obj[key].trim()) return obj[key].trim();
  }
  const agent = obj.agent;
  if (agent && typeof agent === 'object') {
    const nested = agent as Record<string, unknown>;
    for (const key of ['agentId', 'id', 'key']) {
      if (typeof nested[key] === 'string' && nested[key].trim()) return nested[key].trim();
    }
  }
  return null;
}

function resolveCategoryColor(category: AgentCategory): {
  border: string;
  cardBg: string;
  iconBg: string;
  iconFg: string;
  tagBg: string;
  tagFg: string;
} {
  switch (category) {
    case 'marketing':
      return {
        border: 'border-amber-400/70',
        cardBg: 'bg-[#121f3f]',
        iconBg: 'bg-amber-500/20',
        iconFg: 'text-amber-300',
        tagBg: 'bg-amber-500/20',
        tagFg: 'text-amber-300',
      };
    case 'data':
      return {
        border: 'border-cyan-400/70',
        cardBg: 'bg-[#10213f]',
        iconBg: 'bg-cyan-500/20',
        iconFg: 'text-cyan-300',
        tagBg: 'bg-cyan-500/20',
        tagFg: 'text-cyan-300',
      };
    case 'design':
      return {
        border: 'border-fuchsia-400/70',
        cardBg: 'bg-[#1a1f40]',
        iconBg: 'bg-fuchsia-500/20',
        iconFg: 'text-fuchsia-300',
        tagBg: 'bg-fuchsia-500/20',
        tagFg: 'text-fuchsia-300',
      };
    case 'support':
      return {
        border: 'border-emerald-400/70',
        cardBg: 'bg-[#11253e]',
        iconBg: 'bg-emerald-500/20',
        iconFg: 'text-emerald-300',
        tagBg: 'bg-emerald-500/20',
        tagFg: 'text-emerald-300',
      };
    case 'devops':
      return {
        border: 'border-orange-400/70',
        cardBg: 'bg-[#1a223e]',
        iconBg: 'bg-orange-500/20',
        iconFg: 'text-orange-300',
        tagBg: 'bg-orange-500/20',
        tagFg: 'text-orange-300',
      };
    case 'security':
      return {
        border: 'border-rose-400/70',
        cardBg: 'bg-[#1b1f3b]',
        iconBg: 'bg-rose-500/20',
        iconFg: 'text-rose-300',
        tagBg: 'bg-rose-500/20',
        tagFg: 'text-rose-300',
      };
    default:
      return {
        border: 'border-indigo-400/65',
        cardBg: 'bg-[#131f3d]',
        iconBg: 'bg-indigo-500/20',
        iconFg: 'text-indigo-300',
        tagBg: 'bg-indigo-500/20',
        tagFg: 'text-indigo-300',
      };
  }
}

export const AgentLibraryView: React.FC<AgentLibraryViewProps> = ({ onNavigateTo }) => {
  const { t, i18n } = useTranslation();
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const resolveLabel = useAgentsStore((s) => s.resolveLabel);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [busyUseAgentId, setBusyUseAgentId] = useState<string | null>(null);
  const [catalogTemplates, setCatalogTemplates] = useState<BuiltinAgentTemplate[]>(BUILTIN_TEMPLATES_FALLBACK);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [refreshingAgents, setRefreshingAgents] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.type === 'error' ? 5000 : 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let stopped = false;
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const resp = await fetch('/builtin-agents/agency-agents-zh/openclaw/catalog.json', { cache: 'no-store' });
        if (!resp.ok) return;
        const data = await resp.json() as { agents?: BuiltinAgentTemplate[] };
        if (!stopped && Array.isArray(data.agents) && data.agents.length > 0) {
          setCatalogTemplates(data.agents);
        }
      } catch {
        // keep fallback
      } finally {
        if (!stopped) setLoadingCatalog(false);
      }
    };
    void loadCatalog();
    void fetchAgents();
    return () => {
      stopped = true;
    };
  }, [fetchAgents]);

  const templates = useMemo<TemplateViewModel[]>(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const isZh = i18n.language.toLowerCase().startsWith('zh');

    return catalogTemplates
      .map((tpl) => {
        const category = resolveCategory(tpl.name, tpl.tag, tpl.id);
        const normalizedDesc = normalizeCatalogDescription(tpl.description);
        const translatedName = t(`agentLibrary.templates.${tpl.id}.name`, { defaultValue: tpl.name });
        const translatedDescription = t(`agentLibrary.templates.${tpl.id}.description`, { defaultValue: normalizedDesc });
        const translatedTag = t(`agentLibrary.templates.${tpl.id}.tag`, { defaultValue: localizeTag(tpl.tag, t) });

        const displayName = isZh && isAsciiLike(translatedName)
          ? buildZhNameFromId(tpl.id)
          : translatedName;
        const displayDescription = isZh && isAsciiLike(translatedDescription)
          ? buildZhDescFromId(tpl.id)
          : translatedDescription;
        const displayTag = isZh && isAsciiLike(translatedTag)
          ? localizeTag(tpl.tag, t)
          : translatedTag;

        const installedAgent = agents.find((agent) => isAgentInstalledFromTemplate(agent, resolveLabel(agent), {
          ...tpl,
          displayName,
        }));
        return {
          ...tpl,
          displayName,
          displayDescription,
          displayTag,
          category,
          installed: !!installedAgent,
          installedAgentId: installedAgent?.id || null,
        };
      })
      .filter((tpl) => {
        if (!normalizedKeyword) return true;
        return `${tpl.displayName} ${tpl.displayDescription} ${tpl.id} ${tpl.displayTag}`
          .toLowerCase()
          .includes(normalizedKeyword);
      });
  }, [agents, catalogTemplates, i18n.language, keyword, resolveLabel, t]);

  const openAgentChat = async (agentId: string) => {
    setBusyUseAgentId(agentId);
    try {
      const agent = useAgentsStore.getState().agents.find((item) => item.id === agentId);
      const sessionKey = agent?.mainSessionKey || `agent:${agentId}:main`;
      const label = agent ? resolveLabel(agent) : agentId;
      useChatStore.getState().setSessionLabel(sessionKey, label);
      useChatStore.getState().switchSession(sessionKey);
      onNavigateTo?.('chat');
      void useChatStore.getState().loadSessions();
      setNotice({ type: 'success', text: t('agentLibrary.useStarted') });
    } catch (error) {
      setNotice({ type: 'error', text: t('agentLibrary.useFailed', { error: String(error) }) });
      toast.error(t('agentLibrary.useFailed', { error: String(error) }), { duration: 5000 });
    } finally {
      setBusyUseAgentId(null);
    }
  };

  const refreshAgentList = async () => {
    setRefreshingAgents(true);
    setNotice({ type: 'info', text: t('agentLibrary.refreshing') });
    try {
      await fetchAgents();
      setNotice({ type: 'success', text: t('agentLibrary.refreshSuccess') });
    } catch (error) {
      setNotice({ type: 'error', text: t('agentLibrary.refreshFailed', { error: String(error) }) });
      toast.error(t('agentLibrary.refreshFailed', { error: String(error) }), { duration: 5000 });
    } finally {
      setRefreshingAgents(false);
    }
  };

  const installTemplate = async (template: TemplateViewModel) => {
    setInstallingId(template.id);
    try {
      await fetchAgents();
      const beforeAgents = useAgentsStore.getState().agents;
      const existingAgent = beforeAgents.find((agent) => {
        const label = resolveLabel(agent);
        return isAgentInstalledFromTemplate(agent, label, template);
      });
      let createResult: unknown = null;
      if (!existingAgent) {
        try {
          createResult = await agentsCreate({
            // OpenClaw derives agentId from name. Use the stable ASCII template id
            // here, then overwrite IDENTITY.md with the localized display name.
            name: template.id,
            workspace: buildAgentWorkspace(template.id),
            emoji: '🤖',
          });
        } catch (error) {
          const text = String(error);
          if (!text.includes('already exists')) {
            throw error;
          }
        }
      }
      await fetchAgents();

      const latestAgents = useAgentsStore.getState().agents;
      const created =
        existingAgent ||
        (getAgentIdFromCreateResult(createResult)
          ? latestAgents.find((a) => a.id === getAgentIdFromCreateResult(createResult))
          : null) ||
        latestAgents.find((a) => isAgentInstalledFromTemplate(a, resolveLabel(a), template)) ||
        null;
      if (!created) {
        throw new Error('Agent created but unable to resolve agent id');
      }

      let writtenCount = 0;
      for (const fileName of TEMPLATE_FILES) {
        const resp = await fetch(`${template.sourcePath}/${fileName}`);
        if (!resp.ok) continue;
        const content = await resp.text();
        await agentFileSet(created.id, fileName, content);
        writtenCount += 1;
      }
      if (writtenCount === 0) {
        throw new Error(`Template files not found: ${template.sourcePath}`);
      }

      toast.success(
        t('agentLibrary.installSuccess', { name: template.displayName }),
        { duration: 3000 },
      );
      setNotice({ type: 'success', text: t('agentLibrary.installSuccess', { name: template.displayName }) });
      await fetchAgents();
    } catch (err) {
      setNotice({ type: 'error', text: t('agentLibrary.installFailed', { error: String(err) }) });
      toast.error(
        t('agentLibrary.installFailed', { error: String(err) }),
        { duration: 5000 },
      );
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-auto px-3 pb-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-panel)] p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {t('agentLibrary.title')}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {t('agentLibrary.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAgentList()}
            disabled={refreshingAgents}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshingAgents ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
        </div>
        {notice && (
          <div
            className={`mt-2.5 rounded-lg border px-3 py-2 text-xs ${
              notice.type === 'success'
                ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
                : notice.type === 'error'
                  ? 'border-rose-400/35 bg-rose-500/10 text-rose-200'
                  : 'border-sky-400/35 bg-sky-500/10 text-sky-200'
            }`}
          >
            {notice.text}
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('agentLibrary.search')}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none"
          />
          {loadingCatalog && (
            <span className="inline-flex items-center text-[11px] text-[var(--color-text-secondary)]">
              <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
              {t('common.loading')}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const Icon = resolveTemplateIcon(template.category);
          const color = resolveCategoryColor(template.category);
          return (
            <div
              key={template.id}
              className={`rounded-xl border ${color.border} ${color.cardBg} p-3.5 shadow-[0_6px_16px_rgba(5,12,32,.28)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.iconBg} ${color.iconFg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[17px] font-semibold leading-6 text-white">{template.displayName}</div>
                    <div className="mt-0.5 text-[11px] text-[#93a7d0]">
                      {t('agentLibrary.sourceExternal')}
                    </div>
                  </div>
                </div>
                {template.installed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/18 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('agentLibrary.installed')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/18 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    {t('agentLibrary.notInstalled')}
                  </span>
                )}
              </div>

              <div className="mt-2.5 min-h-[52px] text-sm leading-6 text-[#c6d2ec]/90">
                <div className="line-clamp-2">{template.displayDescription}</div>
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{t('agentLibrary.needConfigToEnable')}</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {!template.installed ? (
                  <button
                    type="button"
                    onClick={() => void installTemplate(template)}
                    disabled={installingId === template.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-[#132347] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a2f5e] disabled:opacity-60"
                  >
                    {installingId === template.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {t('agentLibrary.install')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => template.installedAgentId && void openAgentChat(template.installedAgentId)}
                    disabled={!template.installedAgentId || busyUseAgentId === template.installedAgentId}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-[#132347] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a2f5e] disabled:opacity-60"
                  >
                    {busyUseAgentId === template.installedAgentId ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    {t('agentLibrary.use')}
                  </button>
                )}
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] ${color.tagBg} ${color.tagFg}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {template.displayTag}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-panel)] p-3.5">
        <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
          <Bot className="h-4 w-4" />
          <span className="text-sm font-medium">{t('agentLibrary.singleAgents')}</span>
        </div>
        <div className="mt-2.5 space-y-2">
          {agents.map((agent) => {
            const label = resolveLabel(agent);
            return (
              <div
                key={agent.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-2.5 hover:bg-[var(--color-surface-raised)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-[var(--color-text-primary)]">{label}</div>
                      <div className="truncate text-[11px] text-[var(--color-text-secondary)]">{agent.id}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openAgentChat(agent.id)}
                    disabled={busyUseAgentId === agent.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-panel)] px-2 py-1 text-[11px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] disabled:opacity-60"
                  >
                    {busyUseAgentId === agent.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {t('agentLibrary.use')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgentLibraryView;
