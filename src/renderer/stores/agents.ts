/**
 * Agents Store — 对齐 AxonClawX gwApi 模式
 * 数据获取流程：
 *   1. rpc('agents.list')  — 获取代理列表（与 AxonClawX gwApi.agents() 一致）
 *   2. rpc('config.get')   — 获取配置（model/workspace/bindings 解析）
 *   3. rpc('agent.identity.get') — 获取每个代理的身份信息
 */
import { create } from 'zustand';
import { useGatewayStore } from './gateway';
import type { ChannelType } from '@/types/channel';
import type { AgentSummary, AgentsSnapshot } from '@/types/agent';

interface AgentIdentity {
  name?: string;
  emoji?: string;
  avatar?: string;
  theme?: string;
}

interface AgentsConfig {
  agents?: {
    list?: Array<Record<string, unknown>>;
    defaults?: { model?: string | { primary?: string; fallbacks?: string[] }; workspace?: string; tools?: Record<string, unknown> };
  };
  bindings?: Array<{ agentId?: string; match?: { channel?: string } }>;
  channels?: Record<string, unknown>;
  tools?: Record<string, unknown>;
}

interface AgentsState {
  agents: AgentSummary[];
  defaultAgentId: string;
  configuredChannelTypes: string[];
  channelOwners: Record<string, string>;
  identity: Record<string, AgentIdentity>;
  config: AgentsConfig | null;
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  createAgent: (name: string, opts?: { workspace?: string; emoji?: string }) => Promise<void>;
  updateAgent: (agentId: string, name: string, opts?: { workspace?: string; model?: string; avatar?: string }) => Promise<void>;
  deleteAgent: (agentId: string, deleteFiles?: boolean) => Promise<void>;
  assignChannel: (agentId: string, channelType: ChannelType) => Promise<void>;
  removeChannel: (agentId: string, channelType: ChannelType) => Promise<void>;
  clearError: () => void;
  resolveLabel: (agent: AgentSummary) => string;
  resolveEmoji: (agent: AgentSummary) => string;
  resolveAgentConfig: (agentId: string) => { model: string; workspace: string; skills: unknown; tools: unknown };
}

function rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
  return useGatewayStore.getState().rpc<T>(method, params);
}

function buildAgentsFromRpc(
  rawList: Array<Record<string, unknown>>,
  rawDefaultId: string,
  config: AgentsConfig | null,
): { agents: AgentSummary[]; defaultAgentId: string; configuredChannelTypes: string[]; channelOwners: Record<string, string> } {
  const defaults = config?.agents?.defaults;
  const bindings = config?.bindings ?? [];
  const configChannels = config?.channels ?? {};

  const configuredChannelTypes = Object.keys(configChannels).filter(
    (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof configChannels[k] === 'object',
  );

  const channelOwners: Record<string, string> = {};
  bindings.forEach((b) => {
    const ch = b?.match?.channel;
    if (ch && b?.agentId) channelOwners[ch] = b.agentId;
  });

  const configList = config?.agents?.list ?? [];

  const agents: AgentSummary[] = rawList.map((a) => {
    const configEntry = configList.find((e) => e.id === a.id);
    const rawModel = configEntry?.model ?? a.model ?? defaults?.model;
    const modelDisplay =
      typeof rawModel === 'string'
        ? rawModel
        : typeof rawModel === 'object' && rawModel && 'primary' in (rawModel as object)
          ? (rawModel as { primary?: string }).primary ?? '—'
          : '—';
    const inheritedModel = !configEntry?.model && !a.model;

    const agentChannels = bindings
      .filter((b) => b?.agentId === a.id)
      .map((b) => b?.match?.channel)
      .filter(Boolean) as string[];

    const workspace =
      (a.workspace as string) ??
      (configEntry?.workspace as string) ??
      (typeof defaults?.workspace === 'string' ? defaults.workspace : undefined) ??
      '—';

    return {
      id: String(a.id ?? ''),
      name: String(a.name ?? a.id ?? ''),
      isDefault: a.id === rawDefaultId || !!a.default,
      modelDisplay: String(modelDisplay),
      inheritedModel,
      workspace,
      agentDir: String(a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`),
      mainSessionKey: `${a.id}:main`,
      channelTypes: agentChannels,
    };
  });

  return { agents, defaultAgentId: rawDefaultId, configuredChannelTypes, channelOwners };
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],
  defaultAgentId: 'main',
  configuredChannelTypes: [],
  channelOwners: {},
  identity: {},
  config: null,
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      // 1) agents.list — 与 AxonClawX gwApi.agents() 完全一致
      const data = await rpc<unknown>('agents.list');
      const result = Array.isArray(data) ? { agents: data, defaultId: null } : (data as Record<string, unknown>);
      const list: Array<Record<string, unknown>> = Array.isArray(result?.agents) ? (result.agents as Array<Record<string, unknown>>) : [];
      const defaultId =
        (result?.defaultId as string) ??
        (result?.defaultAgentId as string) ??
        (list.find((a) => a.default)?.id as string) ??
        (list[0]?.id as string) ??
        'main';

      // 2) config.get — 与 AxonClawX gwApi.configGet() 一致
      let config: AgentsConfig | null = null;
      try {
        config = await rpc<AgentsConfig>('config.get');
      } catch {
        // config.get 失败不阻塞
      }

      const snapshot = buildAgentsFromRpc(list, defaultId, config);

      // 3) agent.identity.get — 与 AxonClawX gwApi.agentIdentity() 一致
      const identityBatch = await Promise.allSettled(
        list.map((ag) =>
          rpc<AgentIdentity>('agent.identity.get', { agentId: ag.id }).then((id) => ({
            agentId: String(ag.id),
            id,
          })),
        ),
      );
      const newIdentity: Record<string, AgentIdentity> = {};
      for (const r of identityBatch) {
        if (r.status === 'fulfilled') newIdentity[r.value.agentId] = r.value.id;
      }

      set({
        ...snapshot,
        identity: newIdentity,
        config,
        loading: false,
      });
    } catch (error) {
      console.error('[AgentsStore] fetchAgents failed:', error);
      set({ loading: false, error: String(error) });
    }
  },

  createAgent: async (name: string, opts?: { workspace?: string; emoji?: string }) => {
    set({ error: null });
    try {
      await rpc('agents.create', { name, workspace: opts?.workspace, emoji: opts?.emoji });
      await get().fetchAgents();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateAgent: async (agentId: string, name: string, opts?: { workspace?: string; model?: string; avatar?: string }) => {
    set({ error: null });
    try {
      await rpc('agents.update', { agentId, name, workspace: opts?.workspace, model: opts?.model, avatar: opts?.avatar });
      await get().fetchAgents();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  deleteAgent: async (agentId: string, deleteFiles = true) => {
    set({ error: null });
    try {
      await rpc('agents.delete', { agentId, deleteFiles });
      await get().fetchAgents();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  assignChannel: async (agentId: string, channelType: ChannelType) => {
    set({ error: null });
    try {
      const config = get().config;
      const bindings = [...(config?.bindings ?? [])];
      const exists = bindings.some((b) => b?.match?.channel === channelType && b?.agentId === agentId);
      if (!exists) {
        bindings.push({ agentId, match: { channel: channelType } });
        await rpc('config.patch', { raw: JSON.stringify({ bindings }) });
        await get().fetchAgents();
      }
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  removeChannel: async (agentId: string, channelType: ChannelType) => {
    set({ error: null });
    try {
      const config = get().config;
      const bindings = (config?.bindings ?? []).filter(
        (b) => !(b?.match?.channel === channelType && b?.agentId === agentId),
      );
      await rpc('config.patch', { raw: JSON.stringify({ bindings }) });
      await get().fetchAgents();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  resolveLabel: (agent: AgentSummary) => {
    const id = get().identity[agent.id];
    return id?.name?.trim() || agent.name?.trim() || agent.id;
  },

  resolveEmoji: (agent: AgentSummary) => {
    const id = get().identity[agent.id];
    return id?.emoji?.trim() || id?.avatar?.trim() || '';
  },

  resolveAgentConfig: (agentId: string) => {
    const { config } = get();
    if (!config) return { model: '—', workspace: '默认', skills: null, tools: null };
    const list = config?.agents?.list ?? [];
    const entry = list.find((e) => e.id === agentId);
    const defaults = config?.agents?.defaults;
    const model = (entry?.model ?? defaults?.model) as string | { primary?: string; fallbacks?: string[] } | undefined;
    const modelLabel = typeof model === 'string' ? model : ((model as { primary?: string })?.primary ?? '—');
    const fallbacks = typeof model === 'object' ? (model as { fallbacks?: string[] })?.fallbacks : null;
    return {
      model: modelLabel + (Array.isArray(fallbacks) && fallbacks.length > 0 ? ` (+${fallbacks.length})` : ''),
      workspace: String((entry?.workspace as string) ?? (typeof defaults?.workspace === 'string' ? defaults.workspace : '默认')),
      skills: (entry?.skills as unknown) ?? null,
      tools: (entry?.tools as unknown) ?? config?.tools ?? null,
    };
  },
}));
