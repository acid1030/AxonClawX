/**
 * Agent API Service
 * AxonClawX 风格：封装 Gateway RPC 调用
 */
import { hostApiFetch } from '@/lib/host-api';

async function rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
  return hostApiFetch<T>('/api/v1/gw/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params: params ?? {} }),
  });
}

export async function agentFilesList(agentId: string): Promise<{ files?: Array<{ name: string; size?: number; missing?: boolean }> }> {
  return rpc('agents.files.list', { agentId });
}

export async function agentFileGet(agentId: string, name: string): Promise<{ file?: { content?: string } }> {
  return rpc('agents.files.get', { agentId, name });
}

export async function agentFileSet(agentId: string, name: string, content: string): Promise<void> {
  await rpc('agents.files.set', { agentId, name, content });
}

export async function agentSkills(agentId: string): Promise<{ skills?: Array<{ name: string; description?: string; eligible?: boolean; bundled?: boolean; source?: string }> }> {
  return rpc('skills.status', { agentId });
}

export async function agentIdentity(agentId: string): Promise<{ name?: string; emoji?: string; avatar?: string }> {
  return rpc('agent.identity.get', { agentId });
}

export interface ConfigGetResult {
  agents?: {
    list?: Array<{ id: string; name?: string; model?: string | { primary?: string }; workspace?: string; tools?: Record<string, unknown> }>;
    defaults?: { model?: string; workspace?: string; tools?: Record<string, unknown> };
  };
  tools?: Record<string, unknown>;
}

export async function configGet(): Promise<ConfigGetResult> {
  return rpc('config.get');
}

export async function agentsCreate(params: { name: string; workspace?: string; emoji?: string }): Promise<unknown> {
  return rpc('agents.create', params);
}

export async function agentsUpdate(params: { agentId: string; name?: string; workspace?: string; model?: string; avatar?: string }): Promise<unknown> {
  return rpc('agents.update', params);
}

export async function agentsDelete(params: { agentId: string; deleteFiles?: boolean }): Promise<unknown> {
  return rpc('agents.delete', params);
}

export async function wake(params: { mode: 'now' | 'next-heartbeat'; text?: string }): Promise<unknown> {
  return rpc('wake', params);
}

export async function browserRequest(params: { method: string; path: string; body?: unknown }): Promise<{ status?: number }> {
  return rpc('browser.request', params);
}

export async function chatSend(params: { sessionKey: string; message: string; idempotencyKey?: string }): Promise<{ runId?: string }> {
  return rpc('chat.send', params);
}

export async function chatAbort(params: { sessionKey: string; runId?: string }): Promise<unknown> {
  return rpc('chat.abort', params);
}
