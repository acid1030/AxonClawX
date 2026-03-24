// AxonClaw - Skills Service
// 参考 AxonClawX services/skills.ts

import { BaseService } from './base';

export interface Skill {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  installed: boolean;
  category?: string;
}

export class SkillsService extends BaseService {
  async list(params: { installed?: boolean; category?: string } = {}): Promise<Skill[]> {
    const result = await this.call<{ skills: Skill[] }>('skills.list', params);
    return result.skills;
  }

  async install(skillId: string): Promise<void> {
    return this.call('skills.install', { skillId });
  }

  async uninstall(skillId: string): Promise<void> {
    return this.call('skills.uninstall', { skillId });
  }

  async update(skillId: string): Promise<void> {
    return this.call('skills.update', { skillId });
  }

  async search(query: string): Promise<Skill[]> {
    const result = await this.call<{ skills: Skill[] }>('skills.search', { query });
    return result.skills;
  }
}

export const skillsService = new SkillsService(null);
