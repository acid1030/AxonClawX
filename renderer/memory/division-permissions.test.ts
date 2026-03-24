/**
 * Division Permissions Module Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadDivisionConfig,
  checkPermission,
  matchPathPattern,
  safeRead,
  safeWrite,
  getAccessLogs,
  _test
} from '../division-permissions';

describe('Division Permissions', () => {
  const testDivisionId = 'miiow';

  describe('Path Pattern Matching', () => {
    it('should match exact paths', () => {
      expect(matchPathPattern('shared', 'shared')).toBe(true);
      expect(matchPathPattern('members/self', 'members/self')).toBe(true);
    });

    it('should match single wildcard (*)', () => {
      expect(matchPathPattern('members/*', 'members/agent1')).toBe(true);
      expect(matchPathPattern('members/*', 'members/agent2')).toBe(true);
      expect(matchPathPattern('members/*', 'members/')).toBe(false);
    });

    it('should match double wildcard (**)', () => {
      expect(matchPathPattern('shared/**', 'shared/tasks')).toBe(true);
      expect(matchPathPattern('shared/**', 'shared/tasks/current.md')).toBe(true);
      expect(matchPathPattern('shared/**', 'shared/knowledge/guide.md')).toBe(true);
    });

    it('should not match unrelated paths', () => {
      expect(matchPathPattern('shared', 'members')).toBe(false);
      expect(matchPathPattern('members/self', 'shared')).toBe(false);
    });
  });

  describe('Load Division Config', () => {
    it('should load miiow division config', () => {
      const config = loadDivisionConfig('miiow');
      expect(config).not.toBeNull();
      expect(config?.division).toBe('miiow');
      expect(config?.members).toBeDefined();
    });

    it('should cache loaded configs', () => {
      loadDivisionConfig('miiow');
      const cacheSize = _test.configCache.size;
      expect(cacheSize).toBeGreaterThanOrEqual(1);
    });

    it('should return null for non-existent division', () => {
      const config = loadDivisionConfig('nonexistent');
      expect(config).toBeNull();
    });
  });

  describe('Check Permissions', () => {
    it('commander can read and write shared', () => {
      const readResult = checkPermission('miiow', 'commander', 'shared', 'read');
      expect(readResult.allowed).toBe(true);

      const writeResult = checkPermission('miiow', 'commander', 'shared', 'write');
      expect(writeResult.allowed).toBe(true);
    });

    it('commander can read all members', () => {
      const result = checkPermission('miiow', 'commander', 'members/*', 'read');
      expect(result.allowed).toBe(true);
    });

    it('workers can read shared', () => {
      const result = checkPermission('miiow', 'workers', 'shared', 'read');
      expect(result.allowed).toBe(true);
    });

    it('workers can read and write their own memory', () => {
      const readResult = checkPermission('miiow', 'workers', 'members/self', 'read');
      expect(readResult.allowed).toBe(true);

      const writeResult = checkPermission('miiow', 'workers', 'members/self', 'write');
      expect(writeResult.allowed).toBe(true);
    });

    it('workers cannot write to shared', () => {
      const result = checkPermission('miiow', 'workers', 'shared', 'write');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in write permissions');
    });

    it('workers cannot read other members', () => {
      const result = checkPermission('miiow', 'workers', 'members/other', 'read');
      expect(result.allowed).toBe(false);
    });

    it('reviewer can read all members', () => {
      const result = checkPermission('miiow', 'reviewer', 'members/*', 'read');
      expect(result.allowed).toBe(true);
    });

    it('scribe can write to archive', () => {
      const result = checkPermission('miiow', 'scribe', 'archive', 'write');
      expect(result.allowed).toBe(true);
    });

    it('should deny access for non-existent role', () => {
      const result = checkPermission('miiow', 'unknown-role', 'shared', 'read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('Safe Read/Write', () => {
    const testDir = path.join(process.env.HOME || '~', '.openclaw', 'memory', 'divisions', 'miiow', 'shared', 'test');
    const testFile = path.join(testDir, 'test-file.md');

    afterEach(() => {
      // Cleanup test file
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir);
      }
    });

    it('commander can write to shared', () => {
      const success = safeWrite(
        'miiow',
        'commander',
        testFile,
        '# Test Content\n\nThis is a test.'
      );
      expect(success).toBe(true);
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('commander can read from shared', () => {
      // First write as commander
      safeWrite('miiow', 'commander', testFile, '# Test');
      
      // Then read
      const content = safeRead('miiow', 'commander', testFile);
      expect(content).toContain('# Test');
    });

    it('workers cannot write to shared', () => {
      const success = safeWrite(
        'miiow',
        'workers',
        testFile,
        'Unauthorized content'
      );
      expect(success).toBe(false);
    });

    it('should return null for non-existent file', () => {
      const content = safeRead('miiow', 'commander', '/non/existent/file.md');
      expect(content).toBeNull();
    });
  });

  describe('Access Logs', () => {
    it('should log access attempts', () => {
      // Perform some operations
      checkPermission('miiow', 'commander', 'shared', 'read');
      checkPermission('miiow', 'workers', 'shared', 'write');

      const logs = getAccessLogs('miiow', 10);
      expect(logs.length).toBeGreaterThan(0);
      
      const recentLog = logs[0];
      expect(recentLog.division).toBe('miiow');
      expect(recentLog.timestamp).toBeDefined();
      expect(recentLog.action).toMatch(/^(read|write)$/);
    });

    it('should filter logs by division', () => {
      const allLogs = getAccessLogs(undefined, 100);
      const miiowLogs = getAccessLogs('miiow', 100);
      
      expect(miiowLogs.length).toBeLessThanOrEqual(allLogs.length);
      
      miiowLogs.forEach(log => {
        expect(log.division).toBe('miiow');
      });
    });
  });
});
