/**
 * Git-Ops Skill Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitOpsSkill, GitOpsError } from './git-ops';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Mock exec
vi.mock('child_process');

describe('GitOpsSkill', () => {
  let gitOps: GitOpsSkill;
  let mockWorkspace: string;

  beforeEach(() => {
    mockWorkspace = '/tmp/test-repo';
    gitOps = new GitOpsSkill({ workspaceRoot: mockWorkspace });
  });

  describe('getStatus', () => {
    it('should return clean status for empty repo', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('rev-parse --abbrev-ref HEAD')) {
          callback(null, { stdout: 'main', stderr: '' });
        } else if (command.includes('status --porcelain')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (command.includes('ls-files --others')) {
          callback(null, { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: '0\t0', stderr: '' });
        }
      });

      const status = await gitOps.getStatus();

      expect(status.branch).toBe('main');
      expect(status.clean).toBe(true);
      expect(status.staged).toEqual([]);
      expect(status.unstaged).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it('should detect staged changes', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('status --porcelain')) {
          callback(null, { stdout: 'M  src/index.ts\nA  src/utils.ts', stderr: '' });
        } else if (command.includes('rev-parse --abbrev-ref HEAD')) {
          callback(null, { stdout: 'feature', stderr: '' });
        } else if (command.includes('ls-files --others')) {
          callback(null, { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: '0\t0', stderr: '' });
        }
      });

      const status = await gitOps.getStatus();

      expect(status.staged).toHaveLength(2);
      expect(status.staged[0]).toEqual({ path: 'src/index.ts', status: 'M' });
      expect(status.staged[1]).toEqual({ path: 'src/utils.ts', status: 'A' });
    });

    it('should detect untracked files', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('ls-files --others')) {
          callback(null, { stdout: 'new-file.txt\nanother.md', stderr: '' });
        } else if (command.includes('rev-parse --abbrev-ref HEAD')) {
          callback(null, { stdout: 'main', stderr: '' });
        } else if (command.includes('status --porcelain')) {
          callback(null, { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: '0\t0', stderr: '' });
        }
      });

      const status = await gitOps.getStatus();

      expect(status.untracked).toEqual(['new-file.txt', 'another.md']);
    });
  });

  describe('commit', () => {
    it('should commit successfully', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('commit')) {
          callback(null, { 
            stdout: '[feature a1b2c3d] feat: add new feature\n 1 file changed, 5 insertions(+)', 
            stderr: '' 
          });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await gitOps.commit('feat: add new feature');

      expect(result.success).toBe(true);
      expect(result.hash).toBe('a1b2c3d');
      expect(result.message).toBe('feat: add new feature');
    });

    it('should handle commit failure', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        callback(new Error('nothing to commit, working tree clean'), { stdout: '', stderr: '' });
      });

      const result = await gitOps.commit('test commit');

      expect(result.success).toBe(false);
      expect(result.error).toContain('nothing to commit');
    });

    it('should support --all flag', async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('commit -a')) {
          callback(null, { stdout: '[main abc1234] chore: update', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      await gitOps.commit('chore: update', { all: true });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('commit -a'),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('smartCommit', () => {
    it('should generate commit message automatically', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('rev-parse --abbrev-ref HEAD')) {
          callback(null, { stdout: 'main', stderr: '' });
        } else if (command.includes('status --porcelain')) {
          callback(null, { stdout: 'M  src/components/Button.tsx', stderr: '' });
        } else if (command.includes('ls-files --others')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (command.includes('commit')) {
          callback(null, { stdout: '[main def5678] feat: update Button.tsx', stderr: '' });
        } else {
          callback(null, { stdout: '0\t0', stderr: '' });
        }
      });

      const result = await gitOps.smartCommit();

      expect(result.success).toBe(true);
      expect(result.hash).toBe('def5678');
    });

    it('should fail when no changes', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('rev-parse --abbrev-ref HEAD')) {
          callback(null, { stdout: 'main', stderr: '' });
        } else if (command.includes('status --porcelain')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (command.includes('ls-files --others')) {
          callback(null, { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: '0\t0', stderr: '' });
        }
      });

      const result = await gitOps.smartCommit();

      expect(result.success).toBe(false);
      expect(result.error).toBe('没有需要提交的文件');
    });
  });

  describe('push', () => {
    it('should push to origin successfully', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('push')) {
          callback(null, { stdout: 'Everything up-to-date', stderr: '' });
        } else {
          callback(null, { stdout: 'main', stderr: '' });
        }
      });

      const result = await gitOps.push();

      expect(result.success).toBe(true);
      expect(result.remote).toBe('origin');
      expect(result.branch).toBe('main');
    });

    it('should handle push failure', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('push')) {
          callback(new Error('rejected: main -> main (fetch first)'), { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: 'main', stderr: '' });
        }
      });

      const result = await gitOps.push();

      expect(result.success).toBe(false);
      expect(result.error).toContain('rejected');
    });
  });

  describe('createPullRequest', () => {
    it('should create PR with gh CLI', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('gh pr create')) {
          callback(null, { 
            stdout: 'https://github.com/repo/pull/42 created', 
            stderr: '' 
          });
        } else if (command.includes('push')) {
          callback(null, { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: 'main', stderr: '' });
        }
      });

      const result = await gitOps.createPullRequest({
        title: 'Add new feature',
        body: 'This PR adds a new feature',
        branch: 'feature/new',
        base: 'main',
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('github.com');
    });

    it('should handle PR creation without gh CLI', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        if (command.includes('gh pr create')) {
          callback(new Error('gh not found'), { stdout: '', stderr: '' });
        } else if (command.includes('push')) {
          callback(null, { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: 'main', stderr: '' });
        }
      });

      const result = await gitOps.createPullRequest({
        title: 'Feature',
        body: 'Description',
        branch: 'feature',
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('compare');
    });
  });

  describe('utility methods', () => {
    it('should check if git is available', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        callback(null, { stdout: 'git version 2.40.0', stderr: '' });
      });

      const available = await gitOps.isGitAvailable();
      expect(available).toBe(true);
    });

    it('should check if in git repo', async () => {
      vi.mocked(exec).mockImplementation((command: any, options: any, callback: any) => {
        callback(null, { stdout: '.git', stderr: '' });
      });

      const inRepo = await gitOps.isInGitRepo();
      expect(inRepo).toBe(true);
    });
  });

  describe('GitOpsError', () => {
    it('should create error with cause', () => {
      const error = new GitOpsError('Failed to commit', 'working tree not clean');
      
      expect(error.name).toBe('GitOpsError');
      expect(error.message).toBe('Failed to commit');
      expect(error.cause).toBe('working tree not clean');
    });
  });
});
