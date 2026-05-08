import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bot, ChevronDown, ChevronRight, Megaphone, Plus, RefreshCw, Settings2, Sparkles, Trash2, Users, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAgentsStore } from '@/stores/agents';
import { useGatewayStore } from '@/stores/gateway';
import { useTaskMonitorStore } from '@/stores/task-monitor';
import { useGatewayOnline } from '@/hooks/useGatewayOnline';
import { MultiAgentCollaborationPanel } from '@/components/multiagent/MultiAgentCollaborationPanel';
import { OFFICIAL_MULTI_AGENT_TEMPLATES } from '@/data/official-multi-agent/templates';
import { MULTI_AGENT_TEMPLATE_ZH } from '@/data/official-multi-agent/zh-labels';
import type { MultiAgentTemplate } from '@/types/multi-agent-template';
import { agentFileGet, agentFileSet } from '@/services/agent-api';
import { hostApiFetch } from '@/lib/host-api';

type ManagementTab = 'multi' | 'single' | 'hub';
type HubKind = 'single' | 'composite';
type WorkflowType = 'sequential' | 'parallel' | 'collaborative' | 'event-driven' | 'routing';

interface TeamMember {
  id: string;
  templateId: string;
  templateName: string;
  name: string;
  role: string;
  description: string;
  skills: string[];
  custom?: boolean;
}

interface TeamMemberOverride {
  name?: string;
  role?: string;
  description?: string;
  skills?: string[];
}

interface HubItem {
  id: string;
  kind: HubKind;
  name: string;
  description: string;
  skills: string[];
  source: 'official' | 'web' | 'manual';
  url?: string;
  createdAt: string;
}

interface CustomWorkflowMember {
  id: string;
  name: string;
  role: string;
  runtimeAgentId?: string;
}

interface CustomWorkflowStep {
  agent: string;
  action: string;
  parallel?: boolean;
}

interface CustomWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflowType: WorkflowType;
  members: CustomWorkflowMember[];
  steps: CustomWorkflowStep[];
  requirements: { skills: string[]; channels: string[] };
  examples: string[];
  createdAt: string;
}

type EditableWorkflowStep = CustomWorkflowTemplate['steps'][number];

const TEAM_MEMBER_OVERRIDES_KEY = 'axonclaw.agentHub.teamMemberOverrides.v1';
const TEAM_MEMBER_CUSTOM_KEY = 'axonclaw.agentHub.teamMemberCustom.v1';
const HUB_USER_ITEMS_KEY = 'axonclaw.agentHub.userItems.v1';
const CUSTOM_WORKFLOWS_KEY = 'axonclaw.agentHub.customWorkflows.v1';

const CARD_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-sky-500 to-blue-500',
];

const MEMBER_ICON_SET = [Activity, AlertTriangle, Wrench, Megaphone] as const;
const MEMBER_COLOR_SET = [
  'bg-blue-500',
  'bg-red-500',
  'bg-amber-500',
  'bg-emerald-500',
] as const;
const STEP_BADGE_SET = [
  'bg-blue-500 text-white',
  'bg-red-500 text-white',
  'bg-amber-500 text-white',
  'bg-emerald-500 text-white',
] as const;

function pickGradient(seed: string): string {
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  return CARD_GRADIENTS[n % CARD_GRADIENTS.length];
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function splitSkills(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function cloneWorkflow(workflow: CustomWorkflowTemplate): CustomWorkflowTemplate {
  return {
    ...workflow,
    members: workflow.members.map((member) => ({ ...member })),
    steps: workflow.steps.map((step) => ({ ...step })),
    requirements: {
      skills: [...workflow.requirements.skills],
      channels: [...workflow.requirements.channels],
    },
    examples: [...workflow.examples],
  };
}

function mergeMember(base: TeamMember, override?: TeamMemberOverride): TeamMember {
  if (!override) return base;
  return {
    ...base,
    name: override.name?.trim() || base.name,
    role: override.role?.trim() || base.role,
    description: override.description?.trim() || base.description,
    skills: Array.isArray(override.skills) && override.skills.length > 0 ? override.skills : base.skills,
  };
}

function hubKindBadge(kind: HubKind): string {
  return kind === 'composite'
    ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
}

function hubSourceBadge(source: HubItem['source']): string {
  if (source === 'official') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  if (source === 'web') return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
}

export const IntelligenceManagementView: React.FC = () => {
  const { t, i18n } = useTranslation('chat');
  const isZh = /^(zh|cn)/i.test(i18n.language || '');
  const isOnline = useGatewayOnline();
  const { agents, loading, fetchAgents, defaultAgentId, resolveLabel, resolveEmoji } = useAgentsStore();
  const gatewayRpc = useGatewayStore((s) => s.rpc);

  const [activeTab, setActiveTab] = useState<ManagementTab>('multi');

  const [showMemberEditor, setShowMemberEditor] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [showAddSingleDialog, setShowAddSingleDialog] = useState(false);
  const [showAddHubDialog, setShowAddHubDialog] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [workflowDraft, setWorkflowDraft] = useState<CustomWorkflowTemplate | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [memberSourceAgentId, setMemberSourceAgentId] = useState<string>('');
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [panelTemplateId, setPanelTemplateId] = useState<string | null>(null);
  const [officialSeedId, setOfficialSeedId] = useState<string>('');
  const [enhancingWorkflowId, setEnhancingWorkflowId] = useState<string | null>(null);
  const [deployingWorkflowId, setDeployingWorkflowId] = useState<string | null>(null);

  const [hubFilter, setHubFilter] = useState<'all' | HubKind>('all');
  const [hubImportUrl, setHubImportUrl] = useState('');
  const [hubImporting, setHubImporting] = useState(false);

  const [memberOverrides, setMemberOverrides] = useState<Record<string, TeamMemberOverride>>(() =>
    safeJsonParse<Record<string, TeamMemberOverride>>(window.localStorage.getItem(TEAM_MEMBER_OVERRIDES_KEY), {}),
  );
  const [customMembers, setCustomMembers] = useState<TeamMember[]>(() =>
    safeJsonParse<TeamMember[]>(window.localStorage.getItem(TEAM_MEMBER_CUSTOM_KEY), []),
  );
  const [hubUserItems, setHubUserItems] = useState<HubItem[]>(() =>
    safeJsonParse<HubItem[]>(window.localStorage.getItem(HUB_USER_ITEMS_KEY), []),
  );
  const [customWorkflows, setCustomWorkflows] = useState<CustomWorkflowTemplate[]>(() =>
    safeJsonParse<CustomWorkflowTemplate[]>(window.localStorage.getItem(CUSTOM_WORKFLOWS_KEY), []),
  );

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    window.localStorage.setItem(TEAM_MEMBER_OVERRIDES_KEY, JSON.stringify(memberOverrides));
  }, [memberOverrides]);

  useEffect(() => {
    window.localStorage.setItem(TEAM_MEMBER_CUSTOM_KEY, JSON.stringify(customMembers));
  }, [customMembers]);

  useEffect(() => {
    window.localStorage.setItem(HUB_USER_ITEMS_KEY, JSON.stringify(hubUserItems));
  }, [hubUserItems]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_WORKFLOWS_KEY, JSON.stringify(customWorkflows));
  }, [customWorkflows]);

  const baseTemplateMembers = useMemo<TeamMember[]>(() => {
    return OFFICIAL_MULTI_AGENT_TEMPLATES.flatMap((tpl) => {
      const zhTpl = MULTI_AGENT_TEMPLATE_ZH[tpl.id];
      const templateName = isZh && zhTpl?.name ? zhTpl.name : tpl.metadata.name;
      return tpl.content.agents.map((agent) => {
        const zhAgent = MULTI_AGENT_TEMPLATE_ZH[tpl.id]?.agents?.[agent.id];
        return {
          id: `${tpl.id}:${agent.id}`,
          templateId: tpl.id,
          templateName,
          name: isZh ? zhAgent?.name || agent.name : agent.name,
          role: isZh ? zhAgent?.role || agent.role : agent.role,
          description: agent.description || '',
          skills: [],
        } satisfies TeamMember;
      });
    });
  }, [isZh]);

  const members = useMemo<TeamMember[]>(() => {
    const mergedBase = baseTemplateMembers.map((m) => mergeMember(m, memberOverrides[m.id]));
    return [...mergedBase, ...customMembers];
  }, [baseTemplateMembers, memberOverrides, customMembers]);

  const officialHubItems = useMemo<HubItem[]>(() => {
    return OFFICIAL_MULTI_AGENT_TEMPLATES.map((tpl) => {
      const zhTpl = MULTI_AGENT_TEMPLATE_ZH[tpl.id];
      return {
        id: `official:${tpl.id}`,
        kind: 'composite' as const,
        name: isZh && zhTpl?.name ? zhTpl.name : tpl.metadata.name,
        description: isZh && zhTpl?.description ? zhTpl.description : tpl.metadata.description,
        skills: tpl.requirements?.skills || [],
        source: 'official' as const,
        createdAt: new Date(0).toISOString(),
      };
    });
  }, [isZh]);

  const hubItems = useMemo(() => [...hubUserItems, ...officialHubItems], [hubUserItems, officialHubItems]);
  const filteredHubItems = useMemo(() => {
    if (hubFilter === 'all') return hubItems;
    return hubItems.filter((item) => item.kind === hubFilter);
  }, [hubFilter, hubItems]);
  const selectedWorkflow = useMemo(
    () => customWorkflows.find((w) => w.id === selectedWorkflowId) || null,
    [customWorkflows, selectedWorkflowId],
  );
  const customWorkflowTemplates = useMemo<MultiAgentTemplate[]>(
    () =>
      customWorkflows.map((wf) => ({
        id: `custom-${wf.id}`,
        type: 'multi-agent',
        version: '1.0.0',
        metadata: {
          name: wf.name,
          description: wf.description || wf.name,
          category: 'custom',
          difficulty: 'custom',
          icon: 'groups',
          color: pickGradient(wf.id),
          tags: ['custom', wf.workflowType],
          author: 'user',
        },
        requirements: {
          skills: wf.requirements.skills,
          channels: wf.requirements.channels,
        },
        content: {
          agents: wf.members.map((member) => ({
            id: member.id,
            name: member.name,
            role: member.role,
            icon: 'smart_toy',
            color: pickGradient(`${wf.id}:${member.id}`),
            description: member.role,
            soulSnippet: member.role,
          })),
          workflow: {
            type: wf.workflowType,
            description: wf.description || wf.name,
            steps: wf.steps.map((step) => ({
              agent: step.agent,
              action: step.action,
              parallel: !!step.parallel,
            })),
          },
          examples: wf.examples,
        },
      })),
    [customWorkflows],
  );
  const mergedWorkflowTemplates = useMemo<MultiAgentTemplate[]>(
    () => [...customWorkflowTemplates, ...OFFICIAL_MULTI_AGENT_TEMPLATES],
    [customWorkflowTemplates],
  );
  const singleAgentOptions = useMemo(() => {
    const dedup = new Map<string, { id: string; name: string; role: string; description: string; accent: string }>();
    members.forEach((member) => {
      const id = (member.id || '').trim();
      if (!id || dedup.has(id)) return;
      dedup.set(id, {
        id,
        name: member.name || id,
        role: member.role || 'Single Agent',
        description: member.description?.trim() || member.templateName || 'Single Agent',
        accent: pickGradient(id),
      });
    });
    return Array.from(dedup.values());
  }, [members]);
  const resolvedDefaultAgentId = agents.find((agent) => agent.id === defaultAgentId || agent.isDefault)?.id ?? null;
  const runtimeAgentOptions = useMemo(
    () =>
      agents.map((agent) => ({
        id: agent.id,
        name: resolveLabel(agent),
        emoji: resolveEmoji(agent) || '🤖',
      })),
    [agents, resolveEmoji, resolveLabel],
  );

  useEffect(() => {
    if (customWorkflows.length === 0) {
      setSelectedWorkflowId(null);
      setWorkflowDraft(null);
      return;
    }
    setSelectedWorkflowId((prev) => {
      if (prev && customWorkflows.some((workflow) => workflow.id === prev)) {
        return prev;
      }
      return customWorkflows[0].id;
    });
  }, [customWorkflows]);

  useEffect(() => {
    if (!selectedWorkflow) {
      setWorkflowDraft(null);
      setSelectedMemberId(null);
      setSelectedStepIndex(0);
      return;
    }
    setWorkflowDraft(cloneWorkflow(selectedWorkflow));
    setSelectedMemberId(selectedWorkflow.members[0]?.id || null);
    setSelectedStepIndex(0);
  }, [selectedWorkflow]);

  useEffect(() => {
    if (!workflowDraft) return;
    if (!workflowDraft.members.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(workflowDraft.members[0]?.id || null);
    }
    if (selectedStepIndex > workflowDraft.steps.length - 1) {
      setSelectedStepIndex(Math.max(0, workflowDraft.steps.length - 1));
    }
  }, [workflowDraft, selectedMemberId, selectedStepIndex]);

  useEffect(() => {
    if (singleAgentOptions.length === 0) {
      setMemberSourceAgentId('');
      return;
    }
    if (!singleAgentOptions.some((option) => option.id === memberSourceAgentId)) {
      setMemberSourceAgentId(singleAgentOptions[0].id);
    }
  }, [singleAgentOptions, memberSourceAgentId]);

  const handleRefresh = () => {
    void fetchAgents();
  };

  const handleSaveMember = (next: TeamMember) => {
    if (next.custom) {
      setCustomMembers((prev) => prev.map((m) => (m.id === next.id ? next : m)));
      return;
    }
    setMemberOverrides((prev) => ({
      ...prev,
      [next.id]: {
        name: next.name,
        role: next.role,
        description: next.description,
        skills: next.skills,
      },
    }));
  };

  const handleAddCustomMember = (payload: { name: string; role: string; description: string; skills: string[] }) => {
    const id = `custom:${Date.now()}`;
    setCustomMembers((prev) => [
      ...prev,
      {
        id,
        templateId: 'custom',
        templateName: t('agentHub.kind.single'),
        name: payload.name,
        role: payload.role,
        description: payload.description,
        skills: payload.skills,
        custom: true,
      },
    ]);
  };

  const handleImportHubFromUrl = async () => {
    const url = hubImportUrl.trim();
    if (!url) return;
    setHubImporting(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as Record<string, unknown>;

      const isComposite =
        data.type === 'multi-agent' ||
        (!!data.content && typeof data.content === 'object' && Array.isArray((data.content as { agents?: unknown }).agents));

      const next: HubItem = {
        id: `web:${Date.now()}`,
        kind: isComposite ? 'composite' : 'single',
        name: String(data.name || data.title || data.id || 'Imported Agent'),
        description: String(data.description || ''),
        skills: Array.isArray(data.skills) ? (data.skills as unknown[]).map((s) => String(s)) : [],
        source: 'web',
        url,
        createdAt: new Date().toISOString(),
      };

      setHubUserItems((prev) => [next, ...prev]);
      setHubImportUrl('');
      toast.success(t('agentHub.hub.importSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('agentHub.hub.importFailed'));
    } finally {
      setHubImporting(false);
    }
  };

  const addHubItem = (item: Omit<HubItem, 'id' | 'createdAt' | 'source'> & { source?: HubItem['source'] }) => {
    const next: HubItem = {
      id: `${item.source || 'manual'}:${Date.now()}`,
      kind: item.kind,
      name: item.name,
      description: item.description,
      skills: item.skills,
      url: item.url,
      source: item.source || 'manual',
      createdAt: new Date().toISOString(),
    };
    setHubUserItems((prev) => [next, ...prev]);
  };

  const removeHubItem = (id: string) => {
    setHubUserItems((prev) => prev.filter((x) => x.id !== id));
  };

  const addSingleFromHub = (item: HubItem) => {
    if (item.kind !== 'single') return;
    handleAddCustomMember({
      name: item.name,
      role: t('agentHub.kind.single'),
      description: item.description,
      skills: item.skills,
    });
    toast.success(t('agentHub.addSingle'));
  };

  const deleteCustomWorkflow = (workflowId: string) => {
    setCustomWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
    if (selectedWorkflowId === workflowId) {
      setSelectedWorkflowId(null);
      setWorkflowDraft(null);
    }
  };

  const createWorkflowFromOfficialTemplate = () => {
    if (!officialSeedId) return;
    const tpl = OFFICIAL_MULTI_AGENT_TEMPLATES.find((x) => x.id === officialSeedId);
    if (!tpl) return;
    const zhTpl = MULTI_AGENT_TEMPLATE_ZH[tpl.id];
    const id = `wf:${Date.now()}`;
    const next: CustomWorkflowTemplate = {
      id,
      name: isZh && zhTpl?.name ? `${zhTpl.name} ${t('agentHub.workflow.cloneSuffix')}` : `${tpl.metadata.name} Copy`,
      description:
        isZh && zhTpl?.description
          ? zhTpl.description
          : tpl.metadata.description || '',
      workflowType: tpl.content.workflow.type,
      members: tpl.content.agents.map((agent) => ({
        id: agent.id,
        name: isZh ? MULTI_AGENT_TEMPLATE_ZH[tpl.id]?.agents?.[agent.id]?.name || agent.name : agent.name,
        role: isZh ? MULTI_AGENT_TEMPLATE_ZH[tpl.id]?.agents?.[agent.id]?.role || agent.role : agent.role,
        runtimeAgentId: agents.find((a) => a.id === agent.id)?.id || resolvedDefaultAgentId || '',
      })),
      steps: tpl.content.workflow.steps.map((step) => ({
        agent: step.agent || step.agents?.[0] || '',
        action: step.action,
        parallel: !!step.parallel,
      })),
      requirements: {
        skills: tpl.requirements?.skills || [],
        channels: tpl.requirements?.channels || [],
      },
      examples: tpl.content.examples || [],
      createdAt: new Date().toISOString(),
    };
    setCustomWorkflows((prev) => [next, ...prev]);
    setSelectedWorkflowId(id);
    setPanelTemplateId(`custom-${id}`);
    toast.success(t('agentHub.workflow.createFromOfficialSuccess'));
  };

  const runWorkflowDraft = async () => {
    if (!workflowDraft) return;
    if (!isOnline) {
      toast.error(t('agentHub.workflow.runGatewayOffline'));
      return;
    }
    const memberRuntimeMap = new Map<string, string>();
    workflowDraft.members.forEach((member) => {
      const runtimeId = String(member.runtimeAgentId || '').trim();
      if (runtimeId) memberRuntimeMap.set(member.id, runtimeId);
    });

    const unresolved = workflowDraft.steps.filter((step) => !memberRuntimeMap.get(step.agent));
    if (unresolved.length > 0) {
      toast.error(t('agentHub.workflow.runMissingAgentBinding'));
      return;
    }

    const monitor = useTaskMonitorStore.getState();
    const runStamp = Date.now();
    const orchestrationSessionKey = `workflow:${workflowDraft.id}:${runStamp}`;
    const monitorRunId = monitor.registerRun({
      source: 'multi-agent',
      sessionKey: orchestrationSessionKey,
      task: workflowDraft.name || t('agentHub.workflow.runDefaultTask'),
    });
    monitor.appendRunEvent(monitorRunId, {
      type: 'started',
      title: t('agentHub.workflow.runTimelineStarted'),
      detail: workflowDraft.name || workflowDraft.id,
    });

    const dispatchStep = async (step: CustomWorkflowStep, idx: number) => {
      const runtimeAgentId = memberRuntimeMap.get(step.agent) || '';
      const member = workflowDraft.members.find((m) => m.id === step.agent);
      const stepSessionKey = `agent:${runtimeAgentId}:wf-${workflowDraft.id}-${runStamp}-s${idx + 1}`;
      const stepMessage = [
        `[Workflow:${workflowDraft.name || workflowDraft.id}]`,
        `Step ${idx + 1}/${workflowDraft.steps.length}`,
        `Node: ${member?.name || step.agent} (${step.agent})`,
        `Action: ${step.action}`,
      ].join('\n');

      monitor.appendRunEvent(monitorRunId, {
        type: 'tool',
        title: t('agentHub.workflow.runTimelineDispatch'),
        detail: `${member?.name || step.agent} -> ${runtimeAgentId}`,
      });

      const res = await gatewayRpc<{ runId?: string; id?: string; result?: { runId?: string; id?: string } }>('chat.send', {
        sessionKey: stepSessionKey,
        message: stepMessage,
        idempotencyKey: `${stepSessionKey}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      });
      const stepRunId = String(res?.runId || res?.id || res?.result?.runId || res?.result?.id || '').trim();
      if (stepRunId) {
        monitor.attachChildRun(
          monitorRunId,
          stepRunId,
          `${member?.name || step.agent} · ${step.action}`,
        );
        monitor.appendRunEvent(monitorRunId, {
          type: 'message',
          title: t('agentHub.workflow.runTimelineRunAccepted'),
          detail: `${runtimeAgentId} · run=${stepRunId}`,
        });
      }
    };

    try {
      if (workflowDraft.workflowType === 'parallel') {
        await Promise.all(workflowDraft.steps.map((step, idx) => dispatchStep(step, idx)));
      } else {
        for (let i = 0; i < workflowDraft.steps.length; i += 1) {
          await dispatchStep(workflowDraft.steps[i], i);
        }
      }
      monitor.markRunCompleted(monitorRunId, t('agentHub.workflow.runTimelineCompleted'));
      toast.success(t('agentHub.workflow.runSuccess'));
    } catch (error) {
      monitor.markRunFailed(monitorRunId, String(error));
      toast.error(`${t('agentHub.workflow.runFailed')}: ${String(error)}`);
    }
  };

  const handleEnhanceWorkflow = async (wf: CustomWorkflowTemplate) => {
    if (!resolvedDefaultAgentId) {
      toast.error('未找到默认单智能体，请先在智能体管理中设置默认智能体后再增强');
      return;
    }
    if (!isOnline) {
      toast.error(t('agents.view.multiAgent.gatewayOffline'));
      return;
    }
    setEnhancingWorkflowId(wf.id);
    try {
      const workflowId = `custom-${wf.id}`;
      const blockStart = `<!-- workflow:${workflowId} -->`;
      const blockEnd = `<!-- /workflow:${workflowId} -->`;
      const agentIds = wf.members.map((m) => m.id);
      const agentList = wf.members
        .map((member) => `- **${member.id}**: ${member.name} - ${member.role}`)
        .join('\n');
      const workflowSteps = wf.steps
        .map((step, idx) => `${idx + 1}. ${step.agent}: ${step.action}`)
        .join('\n');

      const soulBlock = `
${blockStart}
## ${wf.name}

${wf.description}

### Available Subagents

${agentList}

### How to Use

When you receive a task related to this workflow, use the \`sessions_spawn\` tool to delegate to the appropriate subagent:

\`\`\`
sessions_spawn(task="your task description", agentId="agent-id")
\`\`\`

### Workflow Steps

${workflowSteps}

### Tips

- Analyze the task first, then decide which subagent is most suitable
- You can spawn multiple subagents for complex tasks
- Subagents will automatically report back when they complete their work
- Available agent IDs: ${agentIds.join(', ')}
${blockEnd}
`;

      const heartbeatBlock = `
${blockStart}
## ${wf.name} Workflow

${wf.steps
  .map((step, idx) => `- [ ] Step ${idx + 1} (${step.agent}): ${step.action}`)
  .join('\n')}
${blockEnd}
`;

      for (const file of ['SOUL.md', 'HEARTBEAT.md'] as const) {
        const res = await agentFileGet(resolvedDefaultAgentId, file);
        const cur = (res?.file?.content as string) || '';
        const block = file === 'SOUL.md' ? soulBlock : heartbeatBlock;
        if (cur.includes(blockStart)) {
          toast.message(
            t('agents.view.multiAgent.duplicateSkipped', {
              name: wf.name,
              file,
            }),
          );
          continue;
        }
        await agentFileSet(resolvedDefaultAgentId, file, cur + block);
      }
      toast.success(t('agents.view.multiAgent.quickOk'));
      handleRefresh();
    } catch (e) {
      toast.error(`${t('agents.view.multiAgent.quickFail')}: ${e}`);
    } finally {
      setEnhancingWorkflowId(null);
    }
  };

  const handleDeployWorkflow = async (wf: CustomWorkflowTemplate) => {
    setDeployingWorkflowId(wf.id);
    try {
      const deployRequest = {
        template: {
          id: `custom-${wf.id}`,
          name: wf.name,
          description: wf.description,
          agents: wf.members.map((member) => ({
            id: member.id,
            name: member.name,
            role: member.role,
            description: member.role,
            icon: 'smart_toy',
            color: pickGradient(member.id),
            soul: `# ${member.name}\n\n**Role:** ${member.role}\n\n${member.role}`,
          })),
          workflow: {
            type: wf.workflowType,
            description: wf.description || wf.name,
            steps: wf.steps.map((s) => ({
              agent: s.agent,
              action: s.action,
              parallel: !!s.parallel,
            })),
          },
        },
        prefix: `custom-${wf.id}`,
        skipExisting: true,
      };

      const result = await hostApiFetch<{
        success?: boolean;
        deployedCount?: number;
        errors?: string[];
      }>('/api/v1/multi-agent/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployRequest),
      });

      if (result?.success) {
        toast.success(`${t('agents.view.multiAgent.deployOk')} (${result.deployedCount ?? 0} agents)`);
        handleRefresh();
      } else {
        toast.error(result?.errors?.join(', ') || t('agents.view.multiAgent.deployFail'));
      }
    } catch (e) {
      toast.error(`${t('agents.view.multiAgent.deployFail')}: ${e}`);
    } finally {
      setDeployingWorkflowId(null);
    }
  };

  const createQuickWorkflow = () => {
    const id = `wf:${Date.now()}`;
    const next: CustomWorkflowTemplate = {
      id,
      name: `${t('agentHub.workflow.create')} ${customWorkflows.length + 1}`,
      description: '',
      workflowType: 'sequential',
      members: [{ id: 'creator', name: 'Creator', role: 'Create first draft', runtimeAgentId: resolvedDefaultAgentId || '' }],
      steps: [{ agent: 'creator', action: t('agentHub.workflow.quickDefaultAction'), parallel: false }],
      requirements: { skills: [], channels: [] },
      examples: [],
      createdAt: new Date().toISOString(),
    };
    setCustomWorkflows((prev) => [next, ...prev]);
    setSelectedWorkflowId(id);
  };

  const updateWorkflowDraft = (updater: (draft: CustomWorkflowTemplate) => CustomWorkflowTemplate) => {
    setWorkflowDraft((prev) => (prev ? updater(prev) : prev));
  };

  const addDraftMember = () => {
    const selected = singleAgentOptions.find((option) => option.id === memberSourceAgentId);
    if (!selected) return;
    updateWorkflowDraft((draft) => {
      if (draft.members.some((member) => member.id === selected.id)) {
        toast.message('该单智能体已在当前协作中');
        return draft;
      }
      const memberId = selected.id;
      return {
        ...draft,
        members: [
          ...draft.members,
          {
            id: memberId,
            name: selected.name,
            role: selected.role,
            runtimeAgentId: agents.find((agent) => agent.id === memberId)?.id || resolvedDefaultAgentId || '',
          },
        ],
        steps:
          draft.steps.length === 0
            ? [{ agent: memberId, action: t('agentHub.workflow.quickDefaultAction'), parallel: false }]
            : draft.steps,
      };
    });
  };

  const removeDraftMember = (memberId: string) => {
    updateWorkflowDraft((draft) => {
      const nextMembers = draft.members.filter((member) => member.id !== memberId);
      const fallbackAgentId = nextMembers[0]?.id ?? '';
      return {
        ...draft,
        members: nextMembers,
        steps: draft.steps.map((step) => ({
          ...step,
          agent: step.agent === memberId ? fallbackAgentId : step.agent,
        })),
      };
    });
  };

  const addDraftStep = () => {
    updateWorkflowDraft((draft) => {
      const fallbackAgentId = draft.members[0]?.id ?? '';
      const nextStep: EditableWorkflowStep = {
        agent: fallbackAgentId,
        action: `${t('agentHub.workflow.stepAction')} ${draft.steps.length + 1}`,
        parallel: draft.workflowType === 'parallel',
      };
      return {
        ...draft,
        steps: [...draft.steps, nextStep],
      };
    });
  };

  const saveSelectedWorkflowDraft = () => {
    if (!workflowDraft) return;
    setCustomWorkflows((prev) =>
      prev.map((workflow) =>
        workflow.id === workflowDraft.id
          ? {
              ...workflow,
              ...cloneWorkflow(workflowDraft),
            }
          : workflow,
      ),
    );
    toast.success(t('agentHub.save'));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_28%),linear-gradient(180deg,#0f172a_0%,#0b1220_100%)] text-white">
      <div className="shrink-0 border-b border-white/10 px-4 pt-3 pb-3 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t('agentHub.title')}</h2>
            <p className="text-sm text-white/55 mt-0.5">{t('agentHub.subtitle')}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
            onClick={handleRefresh}
            title={t('agentHub.refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex gap-2">
          <TabButton active={activeTab === 'multi'} onClick={() => setActiveTab('multi')}>
            {t('agentHub.tabs.multi')}
          </TabButton>
          <TabButton active={activeTab === 'single'} onClick={() => setActiveTab('single')}>
            {t('agentHub.tabs.single')}
          </TabButton>
          <TabButton active={activeTab === 'hub'} onClick={() => setActiveTab('hub')}>
            {t('agentHub.tabs.hub')}
          </TabButton>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'multi' && (
          <div className="h-full min-h-0 p-3">
            <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[300px_1fr] gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 min-h-0 overflow-hidden flex flex-col shadow-sm shadow-black/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{t('agentHub.workflow.title')}</h3>
                    <p className="text-xs text-white/50 mt-0.5">{t('agentHub.workflow.subtitle')}</p>
                  </div>
                  <Button onClick={createQuickWorkflow} className="h-9 px-3 text-sm rounded-xl">
                    <Plus className="h-3 w-3 mr-1" />
                    {t('agentHub.workflow.create')}
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5">
                  <select
                    value={officialSeedId}
                    onChange={(e) => setOfficialSeedId(e.target.value)}
                    className="h-10 rounded-xl border border-white/15 bg-[#0f172a] px-3 text-sm text-white/85 outline-none focus:ring-1 focus:ring-cyan-400/40"
                  >
                    <option value="">{t('agentHub.workflow.fromOfficialPlaceholder')}</option>
                    {OFFICIAL_MULTI_AGENT_TEMPLATES.map((tpl) => {
                      const zhTpl = MULTI_AGENT_TEMPLATE_ZH[tpl.id];
                      const label = isZh && zhTpl?.name ? zhTpl.name : tpl.metadata.name;
                      return (
                        <option key={tpl.id} value={tpl.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <Button
                    className="h-9 px-3 text-sm rounded-xl"
                    disabled={!officialSeedId}
                    onClick={createWorkflowFromOfficialTemplate}
                  >
                    {t('agentHub.workflow.createFromOfficial')}
                  </Button>
                </div>

                <div className="mt-3 min-h-0 overflow-y-auto space-y-2.5 pr-1">
                  {customWorkflows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-white/55">
                      {t('agentHub.workflow.empty')}
                    </div>
                  ) : (
                    customWorkflows.map((wf) => {
                      const selected = wf.id === selectedWorkflowId;
                      return (
                        <button
                          key={wf.id}
                          type="button"
                          onClick={() => setSelectedWorkflowId(wf.id)}
                          className={cn(
                            'w-full rounded-xl border px-3 py-2 text-left transition-colors',
                            selected
                              ? 'border-cyan-300/45 bg-cyan-500/12'
                              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06]',
                          )}
                        >
                          <div className="text-sm font-medium truncate">{wf.name || '-'}</div>
                          <div className="text-xs text-white/50 mt-0.5">
                            {wf.members.length} members · {wf.steps.length} steps
                          </div>
                          <div className="text-xs text-white/40 mt-0.5 line-clamp-1">{wf.description || '—'}</div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 min-h-0 overflow-y-auto shadow-sm shadow-black/10">
                {!workflowDraft ? (
                  <div className="h-full rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm text-white/60">
                    {t('agentHub.workflow.empty')}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="rounded-2xl border border-white/10 bg-[#0f172a]/70 p-3">
                      <div className="text-xs font-semibold text-cyan-200 mb-2 tracking-[0.12em] uppercase">{t('agentHub.workflow.basic')}</div>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                        <Input
                          value={workflowDraft.name}
                          onChange={(e) =>
                            updateWorkflowDraft((draft) => ({
                              ...draft,
                              name: e.target.value,
                            }))
                          }
                          placeholder={t('agentHub.namePlaceholder')}
                          className="h-10 text-sm rounded-xl"
                        />
                        <select
                          value={workflowDraft.workflowType}
                          onChange={(e) =>
                            updateWorkflowDraft((draft) => ({
                              ...draft,
                              workflowType: e.target.value as WorkflowType,
                            }))
                          }
                          className="h-10 rounded-xl border border-white/15 bg-[#0f172a] px-3 text-sm text-white/85 outline-none focus:ring-1 focus:ring-cyan-400/40"
                        >
                          <option value="sequential">{t('agentHub.workflow.workflowTypes.sequential')}</option>
                          <option value="parallel">{t('agentHub.workflow.workflowTypes.parallel')}</option>
                          <option value="collaborative">{t('agentHub.workflow.workflowTypes.collaborative')}</option>
                          <option value="event-driven">{t('agentHub.workflow.workflowTypes.eventDriven')}</option>
                          <option value="routing">{t('agentHub.workflow.workflowTypes.routing')}</option>
                        </select>
                      </div>
                      <Textarea
                        value={workflowDraft.description}
                        onChange={(e) =>
                          updateWorkflowDraft((draft) => ({
                            ...draft,
                            description: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder={t('agentHub.workflow.quickDescriptionPlaceholder')}
                        className="mt-2 rounded-xl"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#1f2944] p-3.5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{t('agentHub.workflow.team')}</div>
                          <div className="text-xs text-white/45 mt-0.5">{t('agentHub.workflow.subtitle')}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Select value={memberSourceAgentId} onValueChange={setMemberSourceAgentId} disabled={singleAgentOptions.length === 0}>
                            <SelectTrigger className="h-10 min-w-[260px] border-white/20 bg-[#1f2944] text-sm text-white rounded-xl">
                              <SelectValue placeholder="请选择单智能体" />
                            </SelectTrigger>
                            <SelectContent className="border-white/15 bg-[#1b2540] text-white rounded-xl">
                              {singleAgentOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  <div className="flex items-start gap-2.5 py-1">
                                    <div className={cn('h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center', option.accent)}>
                                      <Bot className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm leading-tight text-white truncate">
                                        {option.name} ({option.id})
                                      </div>
                                      <div className="text-xs leading-tight text-white/60 truncate">
                                        {option.description}
                                      </div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="h-10 px-3 text-sm rounded-xl bg-blue-500 hover:bg-blue-400"
                            onClick={addDraftMember}
                            disabled={!memberSourceAgentId}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('agentHub.workflow.addMember')}
                          </Button>
                        </div>
                      </div>
                      {(() => {
                        const picked = singleAgentOptions.find((option) => option.id === memberSourceAgentId);
                        if (!picked) return null;
                        return (
                          <div className="mb-3 rounded-xl border border-white/10 bg-[#1b2540] px-3 py-2 text-xs text-white/70">
                            选择项：{picked.name} · {picked.description}
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {workflowDraft.members.map((member, index) => {
                          const Icon = MEMBER_ICON_SET[index % MEMBER_ICON_SET.length];
                          const colorClass = MEMBER_COLOR_SET[index % MEMBER_COLOR_SET.length];
                          const isSelected = selectedMemberId === member.id;
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => setSelectedMemberId(member.id)}
                              className={cn(
                                'rounded-2xl border bg-[#25304d] px-3 py-3.5 text-center transition-colors shadow-sm',
                                isSelected ? 'border-cyan-300/55 bg-[#27405e]' : 'border-white/10 hover:border-white/20',
                              )}
                            >
                              <div className={cn('mx-auto h-14 w-14 rounded-2xl flex items-center justify-center shadow-md', colorClass)}>
                                <Icon className="h-7 w-7 text-white" />
                              </div>
                              <div className="mt-3 text-sm font-semibold text-white truncate">{member.name || t('agentHub.workflow.memberName')}</div>
                              <div className="mt-1 text-xs text-white/70 line-clamp-2">{member.role || t('agentHub.workflow.memberRole')}</div>
                            </button>
                          );
                        })}
                      </div>

                      {(() => {
                        const selectedMember = workflowDraft.members.find((m) => m.id === selectedMemberId) || workflowDraft.members[0];
                        if (!selectedMember) return null;
                        return (
                          <div className="mt-3 rounded-xl border border-white/10 bg-[#1b2540] p-3">
                            <div className="grid grid-cols-1 md:grid-cols-[120px_140px_1fr_220px_auto] gap-2 items-center">
                              <div className="h-10 rounded-xl border border-white/20 bg-[#121b34] px-3 text-sm text-white/80 flex items-center">
                                {selectedMember.id}
                              </div>
                              <Input
                                value={selectedMember.name}
                                onChange={(e) =>
                                  updateWorkflowDraft((draft) => ({
                                    ...draft,
                                    members: draft.members.map((m) =>
                                      m.id === selectedMember.id ? { ...m, name: e.target.value } : m,
                                    ),
                                  }))
                                }
                                placeholder={t('agentHub.workflow.memberName')}
                                className="h-10 text-sm rounded-xl"
                              />
                              <Input
                                value={selectedMember.role}
                                onChange={(e) =>
                                  updateWorkflowDraft((draft) => ({
                                    ...draft,
                                    members: draft.members.map((m) =>
                                      m.id === selectedMember.id ? { ...m, role: e.target.value } : m,
                                    ),
                                  }))
                                }
                                placeholder={t('agentHub.workflow.memberRole')}
                                className="h-10 text-sm rounded-xl"
                              />
                              <select
                                value={selectedMember.runtimeAgentId || ''}
                                onChange={(e) =>
                                  updateWorkflowDraft((draft) => ({
                                    ...draft,
                                    members: draft.members.map((m) =>
                                      m.id === selectedMember.id ? { ...m, runtimeAgentId: e.target.value } : m,
                                    ),
                                  }))
                                }
                                className="h-10 rounded-xl border border-white/20 bg-[#1f2944] px-3 text-sm text-white/85 outline-none focus:ring-1 focus:ring-cyan-400/40"
                              >
                                <option value="">{t('agentHub.workflow.memberRuntimeAgentPlaceholder')}</option>
                                {runtimeAgentOptions.map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.emoji} {agent.name} ({agent.id})
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-10 px-3 text-sm rounded-xl text-red-300 hover:text-red-200"
                                disabled={workflowDraft.members.length <= 1}
                                onClick={() => removeDraftMember(selectedMember.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {t('agentHub.actions.remove')}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#1f2944] p-3.5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{t('agentHub.workflow.steps')}</div>
                          <div className="text-xs text-white/45 mt-0.5">{t('agentHub.workflow.subtitle')}</div>
                        </div>
                        <Button size="sm" className="h-10 px-3 text-sm rounded-xl bg-blue-500 hover:bg-blue-400" onClick={addDraftStep}>
                          <Plus className="h-3 w-3 mr-1" />
                          {t('agentHub.workflow.addStep')}
                        </Button>
                      </div>

                      <div className="mb-3 flex items-center gap-2">
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-200">
                          {t('agentHub.workflow.workflowTypes.eventDriven')}
                        </span>
                        <span className="text-sm text-white/75 truncate">{workflowDraft.description || t('agentHub.workflow.subtitle')}</span>
                      </div>

                      <div className="relative pl-7 space-y-3">
                        <div className="absolute left-2.5 top-2 bottom-2 w-[2px] rounded bg-[#3b4668]" />
                        {workflowDraft.steps.map((step, index) => {
                          const memberIndex = workflowDraft.members.findIndex((m) => m.id === step.agent);
                          const member = workflowDraft.members[memberIndex >= 0 ? memberIndex : 0];
                          const badgeClass = STEP_BADGE_SET[(memberIndex >= 0 ? memberIndex : index) % STEP_BADGE_SET.length];
                          const isSelected = selectedStepIndex === index;
                          return (
                            <button
                              key={`${step.agent}-${index}`}
                              type="button"
                              onClick={() => setSelectedStepIndex(index)}
                              className="relative w-full text-left"
                            >
                              <div className="absolute -left-[22px] top-5 h-3.5 w-3.5 rounded-full bg-cyan-400 ring-2 ring-[#1f2944]" />
                              <div
                                className={cn(
                                  'rounded-2xl border bg-[#273350] p-3.5 transition-colors shadow-sm',
                                  isSelected ? 'border-cyan-300/50 bg-[#2a3956]' : 'border-white/10 hover:border-white/20',
                                )}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', badgeClass)}>
                                    {member?.name || step.agent || t('agentHub.workflow.memberName')}
                                  </span>
                                  {step.parallel && (
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                                      {t('agentHub.workflow.workflowTypes.parallel')}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2.5 text-sm text-white/90 line-clamp-2">{step.action || t('agentHub.workflow.stepAction')}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {(() => {
                        const selectedStep = workflowDraft.steps[selectedStepIndex];
                        if (!selectedStep) return null;
                        return (
                          <div className="mt-3 rounded-xl border border-white/10 bg-[#1b2540] p-3">
                            <div className="grid grid-cols-1 md:grid-cols-[170px_1fr_auto_auto] gap-2">
                              <select
                                value={selectedStep.agent}
                                onChange={(e) =>
                                  updateWorkflowDraft((draft) => ({
                                    ...draft,
                                    steps: draft.steps.map((s, i) =>
                                      i === selectedStepIndex ? { ...s, agent: e.target.value } : s,
                                    ),
                                  }))
                                }
                                className="h-10 rounded-xl border border-white/20 bg-[#1f2944] px-3 text-sm text-white/85 outline-none focus:ring-1 focus:ring-cyan-400/40"
                              >
                                {workflowDraft.members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.id})
                                  </option>
                                ))}
                              </select>
                              <Input
                                value={selectedStep.action}
                                onChange={(e) =>
                                  updateWorkflowDraft((draft) => ({
                                    ...draft,
                                    steps: draft.steps.map((s, i) =>
                                      i === selectedStepIndex ? { ...s, action: e.target.value } : s,
                                    ),
                                  }))
                                }
                                placeholder={t('agentHub.workflow.stepAction')}
                                className="h-10 text-sm rounded-xl"
                              />
                              <button
                                type="button"
                                className={cn(
                                  'h-10 rounded-xl border px-3 text-sm font-semibold',
                                  selectedStep.parallel
                                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                                    : 'border-white/20 text-white/70',
                                )}
                                onClick={() =>
                                  updateWorkflowDraft((draft) => ({
                                    ...draft,
                                    steps: draft.steps.map((s, i) =>
                                      i === selectedStepIndex ? { ...s, parallel: !s.parallel } : s,
                                    ),
                                  }))
                                }
                              >
                                {t('agentHub.workflow.workflowTypes.parallel')}
                              </button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-10 px-3 text-sm rounded-xl text-red-300 hover:text-red-200"
                                disabled={workflowDraft.steps.length <= 1}
                                onClick={() =>
                                  updateWorkflowDraft((draft) => ({
                                    ...draft,
                                    steps: draft.steps.filter((_, i) => i !== selectedStepIndex),
                                  }))
                                }
                              >
                                {t('agentHub.actions.remove')}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button className="h-10 px-3 text-sm rounded-xl" onClick={saveSelectedWorkflowDraft}>
                        {t('agentHub.save')}
                      </Button>
                      <Button
                        className="h-10 px-3 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => void runWorkflowDraft()}
                      >
                        {t('agentHub.workflow.run')}
                      </Button>
                      <Button
                        className="h-10 px-3 text-sm rounded-xl bg-violet-600 hover:bg-violet-500"
                        disabled={deployingWorkflowId === workflowDraft.id}
                        onClick={() => void handleDeployWorkflow(workflowDraft)}
                      >
                        {t('agentHub.workflow.deploy')}
                      </Button>
                      <Button
                        className="h-10 px-3 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500"
                        disabled={enhancingWorkflowId === workflowDraft.id}
                        onClick={() => void handleEnhanceWorkflow(workflowDraft)}
                      >
                        {t('agentHub.workflow.enhance')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 px-3 text-sm rounded-xl text-red-300 hover:text-red-200"
                        onClick={() => deleteCustomWorkflow(workflowDraft.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {t('agentHub.workflow.delete')}
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdvancedPanel((prev) => !prev);
                          setPanelTemplateId(`custom-${workflowDraft.id}`);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <div className="text-sm font-semibold text-cyan-200">{t('agentHub.workflow.canvasTitle')}</div>
                        {showAdvancedPanel ? <ChevronDown className="h-4 w-4 text-white/60" /> : <ChevronRight className="h-4 w-4 text-white/60" />}
                      </button>
                      {showAdvancedPanel && (
                        <div className="border-t border-white/10 p-3">
                          <MultiAgentCollaborationPanel
                            defaultAgentId={resolvedDefaultAgentId}
                            onDeploy={handleRefresh}
                            isOnline={isOnline}
                            templates={mergedWorkflowTemplates}
                            initialSelectedId={panelTemplateId || `custom-${workflowDraft.id}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'single' && (
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{t('agentHub.single.title')}</h3>
                <p className="text-xs text-white/50 mt-0.5">{t('agentHub.single.subtitle')}</p>
              </div>
              <Button onClick={() => setShowAddSingleDialog(true)} className="h-10 px-3.5 text-sm rounded-xl">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {t('agentHub.addSingle')}
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-white/50">{t('agentHub.loading')}</div>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm text-white/60">
                {t('agentHub.single.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {members.map((member) => {
                  const gradient = pickGradient(member.id || member.templateId);
                  return (
                  <div
                    key={member.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0',
                              gradient,
                            )}
                          >
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{member.name}</p>
                            <p className="text-xs text-white/45 truncate">{member.role}</p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-white/60">
                          <p>{t('agentHub.fields.description')}: {member.description || '—'}</p>
                          <p>{t('agentHub.fields.skills')}: {member.skills.length ? member.skills.join(', ') : '—'}</p>
                          <p className="text-white/45">{member.templateName}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 px-3 text-sm rounded-xl text-white/75 hover:text-white hover:bg-white/10"
                        onClick={() => {
                          setEditingMember(member);
                          setShowMemberEditor(true);
                        }}
                      >
                        <Settings2 className="h-3.5 w-3.5 mr-1" />
                        {t('agentHub.single.configure')}
                      </Button>
                    </div>
                  </div>
                );})}
              </div>
            )}
          </div>
        )}

        {activeTab === 'hub' && (
          <div className="h-full min-h-0 overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{t('agentHub.hub.title')}</h3>
                <p className="text-xs text-white/50 mt-0.5">{t('agentHub.hub.subtitle')}</p>
              </div>
              <Button onClick={() => setShowAddHubDialog(true)} className="h-10 px-3.5 text-sm rounded-xl">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {t('agentHub.hub.addManual')}
              </Button>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 mb-3">
              <div className="text-xs text-white/60 mb-2">{t('agentHub.hub.importFromUrl')}</div>
              <div className="flex gap-2">
                <Input
                  value={hubImportUrl}
                  onChange={(e) => setHubImportUrl(e.target.value)}
                  placeholder={t('agentHub.hub.urlPlaceholder')}
                  className="h-10 rounded-xl"
                />
                <Button className="h-10 px-3.5 rounded-xl" onClick={() => void handleImportHubFromUrl()} disabled={hubImporting || !hubImportUrl.trim()}>
                  {hubImporting ? t('agentHub.loading') : t('agentHub.hub.import')}
                </Button>
              </div>
            </div>

            <div className="mb-3 flex gap-2">
              <TabButton active={hubFilter === 'all'} onClick={() => setHubFilter('all')}>
                {t('agentHub.hub.all')}
              </TabButton>
              <TabButton active={hubFilter === 'single'} onClick={() => setHubFilter('single')}>
                {t('agentHub.hub.single')}
              </TabButton>
              <TabButton active={hubFilter === 'composite'} onClick={() => setHubFilter('composite')}>
                {t('agentHub.hub.composite')}
              </TabButton>
            </div>

            {filteredHubItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm text-white/60">
                {t('agentHub.hub.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredHubItems.map((item) => {
                  const gradient = pickGradient(`${item.kind}:${item.source}:${item.id}`);
                  return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0',
                              gradient,
                            )}
                          >
                            {item.kind === 'composite' ? <Users className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', hubKindBadge(item.kind))}>
                                {item.kind === 'composite' ? t('agentHub.kind.composite') : t('agentHub.kind.single')}
                              </span>
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', hubSourceBadge(item.source))}>
                                {item.source === 'official' ? t('agentHub.hub.sourceOfficial') : item.source === 'web' ? t('agentHub.hub.sourceWeb') : t('agentHub.hub.sourceManual')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-white/60 line-clamp-2">{item.description || '—'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {item.kind === 'single' && (
                        <Button size="sm" className="h-10 px-3 text-sm rounded-xl" onClick={() => addSingleFromHub(item)}>
                          {t('agentHub.actions.addToSingle')}
                        </Button>
                      )}
                      {item.source !== 'official' && (
                        <Button size="sm" variant="ghost" className="h-10 px-3 text-sm rounded-xl" onClick={() => removeHubItem(item.id)}>
                          {t('agentHub.actions.remove')}
                        </Button>
                      )}
                    </div>
                  </div>
                );})}
              </div>
            )}
          </div>
        )}
      </div>

      {showMemberEditor && editingMember && (
        <MemberEditorDialog
          t={t}
          member={editingMember}
          onClose={() => {
            setShowMemberEditor(false);
            setEditingMember(null);
          }}
          onSave={(next) => {
            handleSaveMember(next);
            setShowMemberEditor(false);
            setEditingMember(null);
          }}
        />
      )}

      {showAddSingleDialog && (
        <AddSingleMemberDialog
          t={t}
          onClose={() => setShowAddSingleDialog(false)}
          onSave={(payload) => {
            handleAddCustomMember(payload);
            setShowAddSingleDialog(false);
          }}
        />
      )}

      {showAddHubDialog && (
        <AddHubItemDialog
          t={t}
          onClose={() => setShowAddHubDialog(false)}
          onSave={(payload) => {
            addHubItem(payload);
            setShowAddHubDialog(false);
          }}
        />
      )}

    </div>
  );
};

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-sm border',
        active
          ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10',
      )}
    >
      {children}
    </button>
  );
}

const DIALOG_CONTENT_CLASS =
  'bg-[#111a2f] border border-indigo-500/30 text-white shadow-2xl shadow-indigo-950/50';
const DIALOG_TITLE_CLASS = 'text-indigo-200';
const DIALOG_MESSAGE_CLASS = 'text-indigo-200/70';
const DIALOG_CANCEL_CLASS = 'border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white';
const DIALOG_CONFIRM_CLASS = 'bg-indigo-600 hover:bg-indigo-500 text-white';
const DIALOG_FIELD_LABEL_CLASS = 'text-indigo-100/90';
const DIALOG_FIELD_INPUT_CLASS =
  'bg-[#0f172a] border-white/10 text-white placeholder:text-white/35 focus-visible:ring-indigo-500/40';

function MemberEditorDialog({
  t,
  member,
  onClose,
  onSave,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  member: TeamMember;
  onClose: () => void;
  onSave: (member: TeamMember) => void;
}) {
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [description, setDescription] = useState(member.description || '');
  const [skills, setSkills] = useState(member.skills.join(', '));

  return (
    <ConfirmDialog
      open
      title={t('agentHub.single.configure')}
      message={member.templateName}
      confirmLabel={t('agentHub.save')}
      cancelLabel={t('agentHub.cancel')}
      contentClassName={DIALOG_CONTENT_CLASS}
      titleClassName={DIALOG_TITLE_CLASS}
      messageClassName={DIALOG_MESSAGE_CLASS}
      cancelButtonClassName={DIALOG_CANCEL_CLASS}
      confirmButtonClassName={DIALOG_CONFIRM_CLASS}
      onConfirm={async () => {
        onSave({
          ...member,
          name: name.trim() || member.name,
          role: role.trim() || member.role,
          description: description.trim(),
          skills: splitSkills(skills),
        });
      }}
      onCancel={onClose}
      confirmDisabled={!name.trim()}
    >
      <div className="space-y-2">
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.name')}</Label>
        <Input className={DIALOG_FIELD_INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.role')}</Label>
        <Input className={DIALOG_FIELD_INPUT_CLASS} value={role} onChange={(e) => setRole(e.target.value)} />
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.description')}</Label>
        <Textarea
          className={DIALOG_FIELD_INPUT_CLASS}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('agentHub.single.descriptionPlaceholder')}
        />
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.skills')}</Label>
        <Input
          className={DIALOG_FIELD_INPUT_CLASS}
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder={t('agentHub.single.skillsPlaceholder')}
        />
      </div>
    </ConfirmDialog>
  );
}

function AddSingleMemberDialog({
  t,
  onClose,
  onSave,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  onClose: () => void;
  onSave: (payload: { name: string; role: string; description: string; skills: string[] }) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');

  return (
    <ConfirmDialog
      open
      title={t('agentHub.addSingle')}
      message={t('agentHub.addDesc')}
      confirmLabel={t('agentHub.save')}
      cancelLabel={t('agentHub.cancel')}
      contentClassName={DIALOG_CONTENT_CLASS}
      titleClassName={DIALOG_TITLE_CLASS}
      messageClassName={DIALOG_MESSAGE_CLASS}
      cancelButtonClassName={DIALOG_CANCEL_CLASS}
      confirmButtonClassName={DIALOG_CONFIRM_CLASS}
      onConfirm={async () => {
        onSave({
          name: name.trim(),
          role: role.trim(),
          description: description.trim(),
          skills: splitSkills(skills),
        });
      }}
      onCancel={onClose}
      confirmDisabled={!name.trim()}
    >
      <div className="space-y-2">
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.name')}</Label>
        <Input className={DIALOG_FIELD_INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('agentHub.namePlaceholder')} />
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.role')}</Label>
        <Input className={DIALOG_FIELD_INPUT_CLASS} value={role} onChange={(e) => setRole(e.target.value)} />
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.description')}</Label>
        <Textarea className={DIALOG_FIELD_INPUT_CLASS} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.skills')}</Label>
        <Input className={DIALOG_FIELD_INPUT_CLASS} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={t('agentHub.single.skillsPlaceholder')} />
      </div>
    </ConfirmDialog>
  );
}

function AddHubItemDialog({
  t,
  onClose,
  onSave,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  onClose: () => void;
  onSave: (payload: Omit<HubItem, 'id' | 'createdAt' | 'source'> & { source?: HubItem['source'] }) => void;
}) {
  const [kind, setKind] = useState<HubKind>('single');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');

  return (
    <ConfirmDialog
      open
      title={t('agentHub.hub.addManual')}
      message={t('agentHub.hub.subtitle')}
      confirmLabel={t('agentHub.save')}
      cancelLabel={t('agentHub.cancel')}
      contentClassName={DIALOG_CONTENT_CLASS}
      titleClassName={DIALOG_TITLE_CLASS}
      messageClassName={DIALOG_MESSAGE_CLASS}
      cancelButtonClassName={DIALOG_CANCEL_CLASS}
      confirmButtonClassName={DIALOG_CONFIRM_CLASS}
      onConfirm={async () => {
        onSave({
          kind,
          name: name.trim(),
          description: description.trim(),
          skills: splitSkills(skills),
        });
      }}
      onCancel={onClose}
      confirmDisabled={!name.trim()}
    >
      <div className="space-y-2">
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.name')}</Label>
        <Input className={DIALOG_FIELD_INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('agentHub.namePlaceholder')} />
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.role')}</Label>
        <div className="flex gap-2">
          <TabButton active={kind === 'single'} onClick={() => setKind('single')}>
            {t('agentHub.kind.single')}
          </TabButton>
          <TabButton active={kind === 'composite'} onClick={() => setKind('composite')}>
            {t('agentHub.kind.composite')}
          </TabButton>
        </div>
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.description')}</Label>
        <Textarea className={DIALOG_FIELD_INPUT_CLASS} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Label className={DIALOG_FIELD_LABEL_CLASS}>{t('agentHub.fields.skills')}</Label>
        <Input className={DIALOG_FIELD_INPUT_CLASS} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={t('agentHub.single.skillsPlaceholder')} />
      </div>
    </ConfirmDialog>
  );
}

export default IntelligenceManagementView;
