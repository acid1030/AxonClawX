/**
 * Skills State Store
 * Manages skill/plugin state
 */
import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { AppError, normalizeAppError } from '@/lib/error-model';
import { useGatewayStore } from './gateway';
import type { Skill, MarketplaceSkill } from '../types/skill';

type GatewaySkillStatus = {
  skillKey: string;
  slug?: string;
  name?: string;
  description?: string;
  disabled?: boolean;
  emoji?: string;
  version?: string;
  author?: string;
  config?: Record<string, unknown>;
  bundled?: boolean;
  always?: boolean;
  source?: string;
  baseDir?: string;
  filePath?: string;
};

type GatewaySkillsStatusResult = {
  skills?: GatewaySkillStatus[];
};

type ClawHubListResult = {
  slug: string;
  version?: string;
  source?: string;
  baseDir?: string;
  name?: string;
  description?: string;
};

function mapErrorCodeToSkillErrorKey(
  code: AppError['code'],
  operation: 'fetch' | 'search' | 'install',
): string {
  if (code === 'TIMEOUT') {
    return operation === 'search'
      ? 'searchTimeoutError'
      : operation === 'install'
        ? 'installTimeoutError'
        : 'fetchTimeoutError';
  }
  if (code === 'RATE_LIMIT') {
    return operation === 'search'
      ? 'searchRateLimitError'
      : operation === 'install'
        ? 'installRateLimitError'
        : 'fetchRateLimitError';
  }
  return 'rateLimitError';
}

interface SkillsState {
  skills: Skill[];
  searchResults: MarketplaceSkill[];
  loading: boolean;
  searching: boolean;
  searchError: string | null;
  installing: Record<string, boolean>; // slug -> boolean
  error: string | null;

  // Actions
  fetchSkills: () => Promise<void>;
  searchSkills: (query: string) => Promise<void>;
  installSkill: (slug: string, version?: string) => Promise<void>;
  uninstallSkill: (slug: string) => Promise<void>;
  enableSkill: (skillId: string) => Promise<void>;
  disableSkill: (skillId: string) => Promise<void>;
  setSkills: (skills: Skill[]) => void;
  updateSkill: (skillId: string, updates: Partial<Skill>) => void;
  /** 从指定工作目录加载技能并合并到列表 */
  loadSkillsFromDir: (dirPath: string) => Promise<void>;
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  searchResults: [],
  loading: false,
  searching: false,
  searchError: null,
  installing: {},
  error: null,

  fetchSkills: async () => {
    if (get().skills.length === 0) {
      set({ loading: true, error: null });
    }
    let gatewayData: GatewaySkillsStatusResult | null = null;
    try {
      gatewayData = await useGatewayStore.getState().rpc<GatewaySkillsStatusResult>('skills.status');
    } catch {
      /* Gateway 未运行时仍从 ClawHub/workspace 加载 */
    }

    try {
      // 1. ClawHub + workspace 作为主数据源（优先直接 IPC，避免 hostapi 路由到 Gateway）
      let clawhubResult: { success: boolean; results?: ClawHubListResult[] };
      try {
        clawhubResult = await invokeIpc<{ success: boolean; results?: ClawHubListResult[] }>('skills:listInstalled');
      } catch {
        clawhubResult = await hostApiFetch<{ success: boolean; results?: ClawHubListResult[] }>('/api/clawhub/list');
      }
      const configResult = await hostApiFetch<Record<string, { apiKey?: string; env?: Record<string, string> }>>('/api/skills/configs');

      const gatewayMap = new Map<string, GatewaySkillStatus>();
      if (gatewayData?.skills?.length) {
        gatewayData.skills.forEach((s) => gatewayMap.set(s.skillKey, s));
      }

      // 2. 以 ClawHub/workspace 结果为基础构建完整列表
      const combinedSkills: Skill[] = [];
      const results = clawhubResult.success && clawhubResult.results ? clawhubResult.results : [];

      for (const cs of results) {
        const gw = gatewayMap.get(cs.slug);
        const directConfig = configResult[cs.slug] || {};
        combinedSkills.push({
          id: cs.slug,
          slug: cs.slug,
          name: cs.name || cs.slug,
          description: cs.description || (cs.source === 'openclaw-workspace' ? 'Workspace skill' : ''),
          enabled: gw ? !gw.disabled : false,
          icon: gw?.emoji || (cs.source === 'openclaw-workspace' ? '📁' : '📦'),
          version: cs.version || 'unknown',
          author: gw?.author,
          config: { ...(gw?.config || {}), ...directConfig },
          isCore: !!gw?.bundled && !!gw?.always,
          isBundled: !!gw?.bundled,
          source: gw?.source || cs.source || 'openclaw-managed',
          baseDir: cs.baseDir || gw?.baseDir,
          filePath: gw?.filePath,
        });
      }

      // 3. 补充 Gateway 有但 ClawHub 未返回的技能（如 bundled）
      if (gatewayData?.skills?.length) {
        for (const gw of gatewayData.skills) {
          if (combinedSkills.some((s) => s.id === gw.skillKey)) continue;
          const directConfig = configResult[gw.skillKey] || {};
          combinedSkills.push({
            id: gw.skillKey,
            slug: gw.slug || gw.skillKey,
            name: gw.name || gw.skillKey,
            description: gw.description || '',
            enabled: !gw.disabled,
            icon: gw.emoji || '📦',
            version: gw.version || '1.0.0',
            author: gw.author,
            config: { ...(gw.config || {}), ...directConfig },
            isCore: !!gw.bundled && !!gw.always,
            isBundled: !!gw.bundled,
            source: gw.source,
            baseDir: gw.baseDir,
            filePath: gw.filePath,
          });
        }
      }

      set({ skills: combinedSkills, loading: false, error: null });
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      const appError = normalizeAppError(error, { module: 'skills', operation: 'fetch' });
      set({ loading: false, error: mapErrorCodeToSkillErrorKey(appError.code, 'fetch') });
    }
  },

  searchSkills: async (query: string) => {
    set({ searching: true, searchError: null });
    try {
      const result = await hostApiFetch<{ success: boolean; results?: MarketplaceSkill[]; error?: string }>('/api/clawhub/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      if (result.success) {
        set({ searchResults: result.results || [] });
      } else {
        throw normalizeAppError(new Error(result.error || 'Search failed'), {
          module: 'skills',
          operation: 'search',
        });
      }
    } catch (error) {
      const appError = normalizeAppError(error, { module: 'skills', operation: 'search' });
      set({ searchError: mapErrorCodeToSkillErrorKey(appError.code, 'search') });
    } finally {
      set({ searching: false });
    }
  },

  installSkill: async (slug: string, version?: string) => {
    set((state) => ({ installing: { ...state.installing, [slug]: true } }));
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/clawhub/install', {
        method: 'POST',
        body: JSON.stringify({ slug, version }),
      });
      if (!result.success) {
        const appError = normalizeAppError(new Error(result.error || 'Install failed'), {
          module: 'skills',
          operation: 'install',
        });
        throw new Error(mapErrorCodeToSkillErrorKey(appError.code, 'install'));
      }
      // Refresh skills after install
      await get().fetchSkills();
    } catch (error) {
      console.error('Install error:', error);
      throw error;
    } finally {
      set((state) => {
        const newInstalling = { ...state.installing };
        delete newInstalling[slug];
        return { installing: newInstalling };
      });
    }
  },

  uninstallSkill: async (slug: string) => {
    set((state) => ({ installing: { ...state.installing, [slug]: true } }));
    try {
      const result = await hostApiFetch<{ success: boolean; error?: string }>('/api/clawhub/uninstall', {
        method: 'POST',
        body: JSON.stringify({ slug }),
      });
      if (!result.success) {
        throw new Error(result.error || 'Uninstall failed');
      }
      // Refresh skills after uninstall
      await get().fetchSkills();
    } catch (error) {
      console.error('Uninstall error:', error);
      throw error;
    } finally {
      set((state) => {
        const newInstalling = { ...state.installing };
        delete newInstalling[slug];
        return { installing: newInstalling };
      });
    }
  },

  enableSkill: async (skillId) => {
    const { updateSkill } = get();

    try {
      await useGatewayStore.getState().rpc('skills.update', { skillKey: skillId, enabled: true });
      updateSkill(skillId, { enabled: true });
    } catch (error) {
      console.error('Failed to enable skill:', error);
      throw error;
    }
  },

  disableSkill: async (skillId) => {
    const { updateSkill, skills } = get();

    const skill = skills.find((s) => s.id === skillId);
    if (skill?.isCore) {
      throw new Error('Cannot disable core skill');
    }

    try {
      await useGatewayStore.getState().rpc('skills.update', { skillKey: skillId, enabled: false });
      updateSkill(skillId, { enabled: false });
    } catch (error) {
      console.error('Failed to disable skill:', error);
      throw error;
    }
  },

  setSkills: (skills) => set({ skills }),

  loadSkillsFromDir: async (dirPath: string) => {
    try {
      const result = await hostApiFetch<{ success: boolean; skills?: Array<{ slug: string; name: string; baseDir: string; description?: string }>; error?: string }>(
        '/api/skills/load-from-dir',
        { method: 'POST', body: JSON.stringify({ dirPath }) },
      );
      if (!result.success || !result.skills?.length) return;
      const configResult = await hostApiFetch<Record<string, { apiKey?: string; env?: Record<string, string> }>>('/api/skills/configs');
      const newSkills: Skill[] = result.skills.map((s) => ({
        id: s.slug,
        slug: s.slug,
        name: s.name,
        description: s.description || '',
        enabled: false,
        icon: '📁',
        version: 'workspace',
        config: configResult[s.slug] || {},
        isCore: false,
        isBundled: false,
        source: 'openclaw-workspace',
        baseDir: s.baseDir,
      }));
      set((state) => {
        const existingIds = new Set(state.skills.map((x) => x.id));
        const toAdd = newSkills.filter((x) => !existingIds.has(x.id));
        return { skills: [...state.skills, ...toAdd] };
      });
    } catch (err) {
      console.error('loadSkillsFromDir error:', err);
      throw err;
    }
  },

  updateSkill: (skillId, updates) => {
    set((state) => ({
      skills: state.skills.map((skill) =>
        skill.id === skillId ? { ...skill, ...updates } : skill
      ),
    }));
  },
}));
