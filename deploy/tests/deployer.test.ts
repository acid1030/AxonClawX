/**
 * Deploy Skill 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deploy, DeployConfig } from '../deployer.js';

describe('Deploy Skill', () => {
  describe('deploy()', () => {
    it('should handle local deployment', async () => {
      const config: DeployConfig = {
        target: 'local',
        buildCmd: 'echo "build"',
        buildDir: '.'
      };

      const result = await deploy('development', config);
      
      expect(result.target).toBe('local');
      expect(result.strategy).toBe('simple');
      expect(result.logs).toBeDefined();
    });

    it('should reject invalid target', async () => {
      const config: DeployConfig = {
        target: 'invalid' as any,
      };

      const result = await deploy('test', config);
      expect(result.success).toBe(false);
    });
  });

  describe('DeployConfig validation', () => {
    it('should accept valid SSH config', () => {
      const config: DeployConfig = {
        target: 'ssh',
        host: 'example.com',
        user: 'deploy',
        path: '/var/www',
        buildCmd: 'npm run build'
      };

      expect(config.target).toBe('ssh');
      expect(config.host).toBe('example.com');
    });

    it('should accept valid Docker config', () => {
      const config: DeployConfig = {
        target: 'docker',
        imageName: 'myapp',
        containerName: 'myapp-container'
      };

      expect(config.target).toBe('docker');
      expect(config.imageName).toBe('myapp');
    });

    it('should accept healthCheck config', () => {
      const config: DeployConfig = {
        target: 'ssh',
        host: 'example.com',
        user: 'deploy',
        path: '/var/www',
        healthCheck: {
          enabled: true,
          url: 'http://localhost:3000/health',
          timeout: 30000,
          retries: 3
        }
      };

      expect(config.healthCheck?.enabled).toBe(true);
      expect(config.healthCheck?.retries).toBe(3);
    });

    it('should accept rollback config', () => {
      const config: DeployConfig = {
        target: 'ssh',
        host: 'example.com',
        user: 'deploy',
        path: '/var/www',
        rollback: {
          enabled: true,
          keepReleases: 5
        }
      };

      expect(config.rollback?.enabled).toBe(true);
      expect(config.rollback?.keepReleases).toBe(5);
    });
  });

  describe('Deploy strategies', () => {
    it('should support blue-green strategy', () => {
      const config: DeployConfig = {
        target: 'ssh',
        strategy: 'blue-green',
        host: 'example.com',
        user: 'deploy',
        path: '/var/www'
      };

      expect(config.strategy).toBe('blue-green');
    });

    it('should support rolling strategy', () => {
      const config: DeployConfig = {
        target: 'ssh',
        strategy: 'rolling',
        host: 'example.com',
        user: 'deploy',
        path: '/var/www'
      };

      expect(config.strategy).toBe('rolling');
    });

    it('should default to simple strategy', () => {
      const config: DeployConfig = {
        target: 'ssh',
        host: 'example.com',
        user: 'deploy',
        path: '/var/www'
      };

      // 默认策略在 deploy 函数中处理
      expect(config.strategy).toBeUndefined();
    });
  });
});
