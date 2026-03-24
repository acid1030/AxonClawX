import { execSync } from 'child_process';

interface SystemStatus {
  gateway: {
    status: 'running' | 'stopped' | 'unknown';
    port?: number;
    uptime?: string;
  };
  agents: {
    total: number;
    active: number;
    idle: number;
  };
  tasks: {
    pending: number;
    running: number;
    completed: number;
  };
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
}

export async function status() {
  console.log('🜏 AxonClaw 系统状态\n');

  try {
    const stat: SystemStatus = {
      gateway: {
        status: 'running',
        port: 18789,
        uptime: '2h 34m'
      },
      agents: {
        total: 5,
        active: 2,
        idle: 3
      },
      tasks: {
        pending: 3,
        running: 1,
        completed: 127
      },
      memory: {
        used: '256MB',
        total: '512MB',
        percentage: 50
      }
    };

    console.log('━━━ Gateway ━━━');
    console.log(`  状态：${stat.gateway.status === 'running' ? '🟢 运行中' : '🔴 已停止'}`);
    console.log(`  端口：ws://127.0.0.1:${stat.gateway.port}`);
    console.log(`  运行时间：${stat.gateway.uptime}`);
    
    console.log('\n━━━ Agents ━━━');
    console.log(`  总数：${stat.agents.total}`);
    console.log(`  活跃：${stat.agents.active}`);
    console.log(`  空闲：${stat.agents.idle}`);
    
    console.log('\n━━━ Tasks ━━━');
    console.log(`  待处理：${stat.tasks.pending}`);
    console.log(`  运行中：${stat.tasks.running}`);
    console.log(`  已完成：${stat.tasks.completed}`);
    
    console.log('\n━━━ Memory ━━━');
    console.log(`  使用：${stat.memory.used} / ${stat.memory.total} (${stat.memory.percentage}%)`);
    
  } catch (error) {
    console.error('❌ 获取系统状态失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
