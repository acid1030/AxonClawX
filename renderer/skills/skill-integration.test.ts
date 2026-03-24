/**
 * Skill Registry & Invoker Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry, type Skill, type Command } from './skill-registry';
import { SkillInvoker } from './skill-invoker';

// ============ Mock Skill ============

const mockCommand: Command = {
  name: 'test-command',
  description: 'Test command',
  handler: async (params?: { value?: number }) => {
    return { success: true, value: params?.value || 0 };
  },
};

const mockSkill: Skill = {
  name: 'test-skill',
  version: '1.0.0',
  description: 'Test skill for unit testing',
  commands: [mockCommand],
  enabled: true,
};

// ============ SkillRegistry Tests ============

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry({
      skillsDir: '/tmp/skills',
      autoScan: false,
    });
  });

  describe('register', () => {
    it('should register a skill successfully', () => {
      const result = registry.register(mockSkill);
      expect(result).toBe(true);
      expect(registry.count()).toBe(1);
    });

    it('should reject skill without name', () => {
      const invalidSkill = { ...mockSkill, name: '' };
      const result = registry.register(invalidSkill as Skill);
      expect(result).toBe(false);
    });

    it('should reject skill without version', () => {
      const invalidSkill = { ...mockSkill, version: '' };
      const result = registry.register(invalidSkill as Skill);
      expect(result).toBe(false);
    });

    it('should overwrite existing skill with same name', () => {
      registry.register(mockSkill);
      
      const updatedSkill: Skill = {
        ...mockSkill,
        version: '2.0.0',
        description: 'Updated description',
      };
      
      registry.register(updatedSkill);
      
      const skill = registry.getSkill('test-skill');
      expect(skill?.version).toBe('2.0.0');
      expect(skill?.description).toBe('Updated description');
    });
  });

  describe('unregister', () => {
    it('should unregister existing skill', () => {
      registry.register(mockSkill);
      const result = registry.unregister('test-skill');
      
      expect(result).toBe(true);
      expect(registry.count()).toBe(0);
    });

    it('should return false for non-existent skill', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getSkill', () => {
    it('should return skill by name', () => {
      registry.register(mockSkill);
      const skill = registry.getSkill('test-skill');
      
      expect(skill).toBeDefined();
      expect(skill?.name).toBe('test-skill');
    });

    it('should return undefined for non-existent skill', () => {
      const skill = registry.getSkill('non-existent');
      expect(skill).toBeUndefined();
    });
  });

  describe('getAllSkills', () => {
    it('should return all registered skills', () => {
      const skill2: Skill = {
        name: 'skill-2',
        version: '1.0.0',
        description: 'Second skill',
        commands: [],
      };
      
      registry.register(mockSkill);
      registry.register(skill2);
      
      const allSkills = registry.getAllSkills();
      expect(allSkills).toHaveLength(2);
    });
  });

  describe('getEnabledSkills', () => {
    it('should return only enabled skills', () => {
      const disabledSkill: Skill = {
        ...mockSkill,
        name: 'disabled-skill',
        enabled: false,
      };
      
      registry.register(mockSkill);
      registry.register(disabledSkill);
      
      const enabled = registry.getEnabledSkills();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].name).toBe('test-skill');
    });
  });

  describe('setSkillEnabled', () => {
    it('should enable/disable skill', () => {
      registry.register(mockSkill);
      
      registry.setSkillEnabled('test-skill', false);
      expect(registry.getSkill('test-skill')?.enabled).toBe(false);
      
      registry.setSkillEnabled('test-skill', true);
      expect(registry.getSkill('test-skill')?.enabled).toBe(true);
    });

    it('should return false for non-existent skill', () => {
      const result = registry.setSkillEnabled('non-existent', false);
      expect(result).toBe(false);
    });
  });

  describe('hasSkill', () => {
    it('should return true for existing skill', () => {
      registry.register(mockSkill);
      expect(registry.hasSkill('test-skill')).toBe(true);
    });

    it('should return false for non-existent skill', () => {
      expect(registry.hasSkill('non-existent')).toBe(false);
    });
  });

  describe('getSkillSummaries', () => {
    it('should return skill summaries', () => {
      registry.register(mockSkill);
      
      const summaries = registry.getSkillSummaries();
      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toEqual({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test skill for unit testing',
        commandCount: 1,
        enabled: true,
      });
    });
  });

  describe('exportToJson', () => {
    it('should export skills to JSON string', () => {
      registry.register(mockSkill);
      
      const json = registry.exportToJson();
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all skills', () => {
      registry.register(mockSkill);
      registry.clear();
      
      expect(registry.count()).toBe(0);
    });
  });
});

// ============ SkillInvoker Tests ============

describe('SkillInvoker', () => {
  let registry: SkillRegistry;
  let invoker: SkillInvoker;

  beforeEach(() => {
    registry = new SkillRegistry({
      skillsDir: '/tmp/skills',
      autoScan: false,
    });
    
    invoker = new SkillInvoker({
      registry,
      enableLogging: true,
      maxLogSize: 100,
      defaultTimeout: 5000,
    });
  });

  describe('invoke', () => {
    it('should invoke skill command successfully', async () => {
      registry.register(mockSkill);
      
      const result = await invoker.invoke('test-skill', 'test-command', { value: 42 });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, value: 42 });
      expect(result.skillName).toBe('test-skill');
      expect(result.commandName).toBe('test-command');
      expect(result.duration).toBeDefined();
    });

    it('should return error for non-existent skill', async () => {
      const result = await invoker.invoke('non-existent', 'command');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不存在');
    });

    it('should return error for non-existent command', async () => {
      registry.register(mockSkill);
      
      const result = await invoker.invoke('test-skill', 'non-existent-command');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不存在');
    });

    it('should return error for disabled skill', async () => {
      const disabledSkill: Skill = {
        ...mockSkill,
        enabled: false,
      };
      registry.register(disabledSkill);
      
      const result = await invoker.invoke('test-skill', 'test-command');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('已禁用');
    });

    it('should handle command errors gracefully', async () => {
      const errorSkill: Skill = {
        name: 'error-skill',
        version: '1.0.0',
        description: 'Skill that throws errors',
        commands: [
          {
            name: 'fail',
            description: 'Always fails',
            handler: async () => {
              throw new Error('Intentional error');
            },
          },
        ],
      };
      
      registry.register(errorSkill);
      
      const result = await invoker.invoke('error-skill', 'fail');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Intentional error');
    });

    it('should respect timeout option', async () => {
      const slowSkill: Skill = {
        name: 'slow-skill',
        version: '1.0.0',
        description: 'Slow skill',
        commands: [
          {
            name: 'slow',
            description: 'Slow command',
            handler: async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              return { done: true };
            },
          },
        ],
      };
      
      registry.register(slowSkill);
      
      const result = await invoker.invoke('slow-skill', 'slow', {}, {
        timeout: 2000,
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('batchInvoke', () => {
    it('should invoke multiple commands sequentially', async () => {
      registry.register(mockSkill);
      
      const results = await invoker.batchInvoke([
        { skillName: 'test-skill', commandName: 'test-command', params: { value: 1 } },
        { skillName: 'test-skill', commandName: 'test-command', params: { value: 2 } },
      ]);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('parallelInvoke', () => {
    it('should invoke multiple commands in parallel', async () => {
      registry.register(mockSkill);
      
      const results = await invoker.parallelInvoke([
        { skillName: 'test-skill', commandName: 'test-command', params: { value: 1 } },
        { skillName: 'test-skill', commandName: 'test-command', params: { value: 2 } },
      ]);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('getLogs', () => {
    it('should return invocation logs', async () => {
      registry.register(mockSkill);
      
      await invoker.invoke('test-skill', 'test-command');
      await invoker.invoke('test-skill', 'test-command');
      
      const logs = invoker.getLogs();
      expect(logs).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      registry.register(mockSkill);
      
      await invoker.invoke('test-skill', 'test-command');
      await invoker.invoke('test-skill', 'test-command');
      await invoker.invoke('test-skill', 'test-command');
      
      const logs = invoker.getLogs(2);
      expect(logs).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('should return invocation statistics', async () => {
      registry.register(mockSkill);
      
      await invoker.invoke('test-skill', 'test-command');
      await invoker.invoke('test-skill', 'test-command');
      
      const stats = invoker.getStats();
      
      expect(stats.totalCalls).toBe(2);
      expect(stats.successfulCalls).toBe(2);
      expect(stats.failedCalls).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(stats.avgDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', async () => {
      registry.register(mockSkill);
      
      await invoker.invoke('test-skill', 'test-command');
      invoker.clearLogs();
      
      const logs = invoker.getLogs();
      expect(logs).toHaveLength(0);
    });
  });
});
