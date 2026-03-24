// AxonClaw - Agents Service
// 参考 AxonClawX services/agents.ts

import { BaseService } from './base';
import { Agent } from '@/stores/agentsStore';

export class AgentsService extends BaseService {
  async list(): Promise<Agent[]> {
    const result = await this.call<{ agents: Agent[] }>('agents.list');
    return result.agents;
  }

  async create(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    return this.call<Agent>('agents.create', agent);
  }

  async update(id: string, updates: Partial<Agent>): Promise<Agent> {
    return this.call<Agent>('agents.update', { id, ...updates });
  }

  async delete(id: string): Promise<void> {
    return this.call('agents.delete', { id });
  }

  async get(id: string): Promise<Agent> {
    return this.call<Agent>('agents.get', { id });
  }

  async getStatus(id: string): Promise<'idle' | 'busy' | 'error' | 'offline'> {
    const result = await this.call<{ status: string }>('agents.status', { id });
    return result.status as any;
  }
}

export const agentsService = new AgentsService(
  // 后续会注入真实的 gatewayClient
  null
);
