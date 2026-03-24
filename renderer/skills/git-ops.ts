/**
 * Git-Ops Skill - Git 操作技能
 * 
 * 功能:
 * 1. git status - 仓库状态
 * 2. git commit - 智能提交
 * 3. git push - 推送代码
 * 4. git pr create - 创建 PR
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { Skill, Command } from './skill-registry';

const execAsync = promisify(exec);

// ============ 类型定义 ============

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
  clean: boolean;
}

export interface FileChange {
  path: string;
  status: string;
}

export interface CommitResult {
  success: boolean;
  hash?: string;
  message?: string;
  error?: string;
}

export interface PushResult {
  success: boolean;
  remote?: string;
  branch?: string;
  error?: string;
}

export interface PullRequest {
  title: string;
  body: string;
  branch: string;
  base?: string;
}

export interface PullRequestResult {
  success: boolean;
  url?: string;
  number?: number;
  error?: string;
}

export interface GitOpsConfig {
  workspaceRoot: string;
  defaultBase?: string;
  autoSync?: boolean;
}

// ============ Git-Ops 技能类 ============

export class GitOpsSkill {
  private config: GitOpsConfig;

  constructor(config?: Partial<GitOpsConfig>) {
    this.config = {
      workspaceRoot: process.cwd(),
      defaultBase: 'main',
      autoSync: false,
      ...config,
    };
  }

  /**
   * 1. Git Status - 获取仓库状态
   * 
   * @returns GitStatus 仓库状态信息
   */
  async getStatus(): Promise<GitStatus> {
    try {
      const [branchInfo, statusOutput, untrackedOutput] = await Promise.all([
        this.execGit('rev-parse --abbrev-ref HEAD'),
        this.execGit('status --porcelain'),
        this.execGit('ls-files --others --exclude-standard'),
      ]);

      const branch = branchInfo.stdout.trim();
      const staged: FileChange[] = [];
      const unstaged: FileChange[] = [];
      
      // 解析 staged/unstaged 文件
      const lines = statusOutput.stdout.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const status = line.substring(0, 2);
        const filePath = line.substring(3).trim();
        
        if (status[0] !== ' ' && status[0] !== '?') {
          staged.push({ path: filePath, status: status[0] });
        }
        if (status[1] !== ' ' && status[1] !== '?') {
          unstaged.push({ path: filePath, status: status[1] });
        }
      }

      const untracked = untrackedOutput.stdout.split('\n').filter(line => line.trim());

      // 检查是否 clean
      const clean = staged.length === 0 && unstaged.length === 0 && untracked.length === 0;

      // 获取 ahead/behind 信息
      let ahead = 0;
      let behind = 0;
      try {
        const { stdout } = await this.execGit(`rev-list --left-right --count origin/${branch}...${branch}`);
        const [aheadCount, behindCount] = stdout.trim().split(/\s+/);
        ahead = parseInt(aheadCount) || 0;
        behind = parseInt(behindCount) || 0;
      } catch {
        // 如果没有 remote，忽略 ahead/behind
      }

      return {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        clean,
      };
    } catch (error) {
      throw new GitOpsError('获取仓库状态失败', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 2. Git Commit - 智能提交
   * 
   * @param message 提交信息
   * @param options 提交选项
   * @returns CommitResult 提交结果
   */
  async commit(message: string, options?: { all?: boolean; amend?: boolean }): Promise<CommitResult> {
    try {
      const args = ['commit'];
      
      if (options?.all) {
        args.push('-a');
      }
      
      if (options?.amend) {
        args.push('--amend');
      }
      
      args.push('-m', message);

      const { stdout } = await this.execGit(args.join(' '));
      
      // 提取 commit hash
      const hashMatch = stdout.match(/\[([^\]]+)\s+([a-f0-9]+)\]/);
      const hash = hashMatch ? hashMatch[2] : undefined;

      return {
        success: true,
        hash,
        message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 智能提交 - 自动生成提交信息
   * 
   * @param options 提交选项
   * @returns CommitResult 提交结果
   */
  async smartCommit(options?: { all?: boolean }): Promise<CommitResult> {
    try {
      const status = await this.getStatus();
      
      if (status.clean) {
        return {
          success: false,
          error: '没有需要提交的文件',
        };
      }

      // 生成提交信息
      const message = await this.generateCommitMessage(status);

      return await this.commit(message, { all: options?.all });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 3. Git Push - 推送代码
   * 
   * @param remote 远程仓库名 (默认: origin)
   * @param branch 分支名 (默认: 当前分支)
   * @returns PushResult 推送结果
   */
  async push(remote?: string, branch?: string): Promise<PushResult> {
    try {
      const status = await this.getStatus();
      const pushRemote = remote || 'origin';
      const pushBranch = branch || status.branch;

      await this.execGit(`push ${pushRemote} ${pushBranch}`);

      return {
        success: true,
        remote: pushRemote,
        branch: pushBranch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 4. Git PR Create - 创建 Pull Request
   * 
   * @param pr Pull Request 信息
   * @returns PullRequestResult 创建结果
   */
  async createPullRequest(pr: PullRequest): Promise<PullRequestResult> {
    try {
      const status = await this.getStatus();
      const baseBranch = pr.base || this.config.defaultBase || 'main';

      // 先推送分支
      const pushResult = await this.push('origin', pr.branch);
      if (!pushResult.success) {
        return {
          success: false,
          error: `推送分支失败: ${pushResult.error}`,
        };
      }

      // 使用 gh CLI 创建 PR (如果可用)
      try {
        const { stdout } = await this.execCommand(
          `gh pr create --title "${pr.title}" --body "${pr.body}" --base ${baseBranch} --head ${pr.branch}`
        );
        
        // 提取 PR URL 和编号
        const urlMatch = stdout.match(/(https?:\/\/[^\s]+)/);
        const numberMatch = stdout.match(/#(\d+)/);

        return {
          success: true,
          url: urlMatch ? urlMatch[1] : undefined,
          number: numberMatch ? parseInt(numberMatch[1]) : undefined,
        };
      } catch (ghError) {
        // 如果没有 gh CLI，返回成功但提示手动创建
        return {
          success: true,
          url: `https://github.com/compare/${baseBranch}...${pr.branch}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 生成智能提交信息
   */
  private async generateCommitMessage(status: GitStatus): Promise<string> {
    const changedFiles = [...status.staged, ...status.unstaged];
    
    if (changedFiles.length === 0) {
      return 'chore: update files';
    }

    // 分析变更类型
    const added = changedFiles.filter(f => f.status === 'A');
    const modified = changedFiles.filter(f => f.status === 'M');
    const deleted = changedFiles.filter(f => f.status === 'D');
    const renamed = changedFiles.filter(f => f.status === 'R');

    // 生成提交类型
    let type = 'chore';
    if (added.length > 0 || modified.length > 0) {
      type = 'feat';
    }
    if (deleted.length > 0) {
      type = 'refactor';
    }
    if (modified.some(f => f.path.includes('.md') || f.path.includes('README'))) {
      type = 'docs';
    }
    if (modified.some(f => f.path.includes('.test.') || f.path.includes('.spec.'))) {
      type = 'test';
    }

    // 生成简短描述
    const primaryFile = changedFiles[0].path;
    const fileName = primaryFile.split('/').pop() || primaryFile;
    const description = `update ${fileName}`;

    // 生成详细变更列表
    const body = changedFiles
      .slice(0, 5)
      .map(f => `- ${f.status}: ${f.path}`)
      .join('\n');

    return `${type}: ${description}\n\n${body}`;
  }

  /**
   * 执行 Git 命令
   */
  private async execGit(command: string): Promise<{ stdout: string; stderr: string }> {
    return this.execCommand(`git ${command}`, this.config.workspaceRoot);
  }

  /**
   * 执行 Shell 命令
   */
  private async execCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || this.config.workspaceRoot,
        encoding: 'utf-8',
      });
      return { stdout, stderr };
    } catch (error) {
      // 抛出带有 stdout/stderr 的错误
      if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
        const execError = error as Error & { stdout: string; stderr: string };
        throw new Error(execError.stderr || execError.message);
      }
      throw error;
    }
  }

  /**
   * 检查 Git 是否可用
   */
  async isGitAvailable(): Promise<boolean> {
    try {
      await this.execGit('--version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查是否在 Git 仓库中
   */
  async isInGitRepo(): Promise<boolean> {
    try {
      await this.execGit('rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 转换为 Skill 对象 (用于技能注册)
   */
  toSkill(): Skill {
    return {
      name: 'git-ops',
      version: '1.0.0',
      description: 'Git 操作技能 - 支持 status, commit, push, PR 创建等功能',
      commands: [
        {
          name: 'status',
          description: '获取 Git 仓库状态',
          handler: () => this.getStatus(),
        },
        {
          name: 'commit',
          description: '提交代码变更',
          parameters: {
            message: '提交信息',
            all: '是否包含所有变更 (可选)',
            amend: '是否修改上一次提交 (可选)',
          },
          handler: (params?: { message?: string; all?: boolean; amend?: boolean }) =>
            this.commit(params?.message || '', { all: params?.all, amend: params?.amend }),
        },
        {
          name: 'smart-commit',
          description: '智能提交 - 自动生成提交信息',
          parameters: {
            all: '是否包含所有变更 (可选)',
          },
          handler: (params?: { all?: boolean }) => this.smartCommit({ all: params?.all }),
        },
        {
          name: 'push',
          description: '推送代码到远程仓库',
          parameters: {
            remote: '远程仓库名 (可选，默认：origin)',
            branch: '分支名 (可选，默认：当前分支)',
          },
          handler: (params?: { remote?: string; branch?: string }) =>
            this.push(params?.remote, params?.branch),
        },
        {
          name: 'pr-create',
          description: '创建 Pull Request',
          parameters: {
            title: 'PR 标题',
            body: 'PR 描述',
            branch: '源分支',
            base: '目标分支 (可选，默认：main)',
          },
          handler: (params?: { title: string; body: string; branch: string; base?: string }) =>
            params
              ? this.createPullRequest({
                  title: params.title,
                  body: params.body,
                  branch: params.branch,
                  base: params.base,
                })
              : Promise.reject(new Error('缺少必要参数')),
        },
      ],
      enabled: true,
      metadata: {
        author: 'ACE',
        category: 'version-control',
      },
    };
  }
}

// ============ 错误类 ============

export class GitOpsError extends Error {
  constructor(message: string, public readonly cause?: string) {
    super(message);
    this.name = 'GitOpsError';
  }
}

// ============ 导出单例 ============

export const gitOps = new GitOpsSkill();

export default gitOps;
