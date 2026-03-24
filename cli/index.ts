#!/usr/bin/env node

/**
 * AxonClaw CLI - 命令行工具
 * 
 * 提供系统状态查看、任务管理、Agent 控制、技能调用和部署功能
 */

import { Command } from 'commander';
import { status } from './commands/status.js';
import { tasks } from './commands/tasks.js';
import { agents } from './commands/agents.js';
import { skills } from './commands/skills.js';
import { deploy } from './commands/deploy.js';
import { divisions } from './commands/divisions.js';
import { skill } from './commands/skill.js';

const program = new Command();

program
  .name('axon')
  .description('AxonClaw CLI - AI 驱动的全渠道智能运营平台命令行工具')
  .version('1.0.0');

// 核心命令
program
  .command('status')
  .description('查看系统状态')
  .action(status);

program
  .command('tasks')
  .description('任务管理')
  .addCommand(
    new Command('list')
      .description('查看任务队列')
      .action(tasks.list)
  );

program
  .command('agents')
  .description('Agent 管理')
  .addCommand(
    new Command('list')
      .description('查看 Agent 状态')
      .action(agents.list)
  );

program
  .command('skills')
  .description('技能管理')
  .addCommand(
    new Command('list')
      .description('查看可用技能')
      .action(skills.list)
  );

program
  .command('deploy <env>')
  .description('部署应用')
  .option('-b, --build', '构建后部署')
  .option('-f, --force', '强制部署')
  .action(deploy);

// 技能调用
program
  .command('skill <name> [args...]')
  .description('调用技能')
  .allowUnknownOption()
  .action(skill);

// 分队管理
program
  .command('divisions')
  .description('分队管理')
  .addCommand(
    new Command('list')
      .description('查看所有分队')
      .action(divisions.list)
  )
  .addCommand(
    new Command('<name>')
      .description('分队操作')
      .addCommand(
        new Command('status')
          .description('查看分队状态')
          .action(divisions.status)
      )
      .addCommand(
        new Command('reports')
          .description('查看分队报告')
          .action(divisions.reports)
      )
  );

program.parse(process.argv);
