// AxonClaw - Sessions Service
// 参考 AxonClawX services/sessions.ts

import { BaseService } from './base';

export interface Session {
  key: string;
  label: string;
  model?: string;
  createdAt: string;
  lastMessage?: string;
  messageCount: number;
}

export class SessionsService extends BaseService {
  async list(params: { limit?: number; offset?: number } = {}): Promise<Session[]> {
    const result = await this.call<{ sessions: Session[] }>('sessions.list', params);
    return result.sessions;
  }

  async create(label: string, model?: string): Promise<Session> {
    return this.call<Session>('sessions.create', { label, model });
  }

  async delete(key: string): Promise<void> {
    return this.call('sessions.delete', { key });
  }

  async send(key: string, message: string): Promise<void> {
    return this.call('sessions.send', { key, message });
  }

  async history(key: string, limit: number = 50): Promise<any[]> {
    const result = await this.call<{ messages: any[] }>('sessions.history', { key, limit });
    return result.messages;
  }
}

export const sessionsService = new SessionsService(null);
