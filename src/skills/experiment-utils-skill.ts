/**
 * NOVA A/B 实验框架工具
 * 
 * 功能:
 * 1. 实验分组 - 创建和管理实验组/对照组
 * 2. 流量分配 - 按比例分配用户到不同组别
 * 3. 结果统计 - 收集和分析实验数据
 */

// ============== 类型定义 ==============

export interface ExperimentGroup {
  id: string;
  name: string;
  allocation: number; // 流量占比 (0-100)
  users: Set<string>;
  metrics: {
    conversions: number;
    impressions: number;
    revenue?: number;
  };
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  groups: Map<string, ExperimentGroup>;
  status: 'draft' | 'running' | 'paused' | 'completed';
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  totalUsers: Set<string>;
}

export interface ExperimentResult {
  experimentId: string;
  groupName: string;
  conversionRate: number;
  totalUsers: number;
  conversions: number;
  confidence?: number;
  lift?: number;
}

// ============== 实验管理器 ==============

class ExperimentManager {
  private experiments: Map<string, Experiment> = new Map();

  /**
   * 创建新实验
   */
  createExperiment(
    id: string,
    name: string,
    description: string,
    groups: Array<{ id: string; name: string; allocation: number }>
  ): Experiment {
    // 验证流量分配总和为 100%
    const totalAllocation = groups.reduce((sum, g) => sum + g.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(`流量分配总和必须为 100%，当前为 ${totalAllocation}%`);
    }

    const experiment: Experiment = {
      id,
      name,
      description,
      groups: new Map(
        groups.map(g => [
          g.id,
          {
            id: g.id,
            name: g.name,
            allocation: g.allocation,
            users: new Set(),
            metrics: { conversions: 0, impressions: 0 },
          },
        ])
      ),
      status: 'draft',
      createdAt: Date.now(),
      totalUsers: new Set(),
    };

    this.experiments.set(id, experiment);
    return experiment;
  }

  /**
   * 获取实验
   */
  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  /**
   * 启动实验
   */
  startExperiment(id: string): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`实验 ${id} 不存在`);
    }
    experiment.status = 'running';
    experiment.startedAt = Date.now();
  }

  /**
   * 停止实验
   */
  stopExperiment(id: string): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`实验 ${id} 不存在`);
    }
    experiment.status = 'completed';
    experiment.endedAt = Date.now();
  }

  /**
   * 流量分配 - 根据用户 ID 分配到实验组
   * 使用一致性哈希确保同一用户始终进入同一组
   */
  assignUserToGroup(experimentId: string, userId: string): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`实验 ${experimentId} 不存在`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`实验 ${experimentId} 未运行`);
    }

    // 检查用户是否已分配
    if (experiment.totalUsers.has(userId)) {
      // 找到用户所在的组
      for (const [groupId, group] of experiment.groups) {
        if (group.users.has(userId)) {
          return groupId;
        }
      }
    }

    // 使用用户 ID 的哈希值进行分配
    const hash = this.hashUserId(userId);
    let cumulative = 0;

    for (const [groupId, group] of experiment.groups) {
      cumulative += group.allocation;
      if (hash < cumulative) {
        group.users.add(userId);
        experiment.totalUsers.add(userId);
        group.metrics.impressions++;
        return groupId;
      }
    }

    //  fallback 到最后一组
    const lastGroup = Array.from(experiment.groups.values()).pop()!;
    lastGroup.users.add(userId);
    experiment.totalUsers.add(userId);
    lastGroup.metrics.impressions++;
    return lastGroup.id;
  }

  /**
   * 记录转化事件
   */
  recordConversion(
    experimentId: string,
    userId: string,
    value?: number
  ): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`实验 ${experimentId} 不存在`);
    }

    // 找到用户所在的组
    for (const [groupId, group] of experiment.groups) {
      if (group.users.has(userId)) {
        group.metrics.conversions++;
        if (value !== undefined) {
          group.metrics.revenue = (group.metrics.revenue || 0) + value;
        }
        return;
      }
    }

    throw new Error(`用户 ${userId} 不在实验 ${experimentId} 中`);
  }

  /**
   * 获取实验结果统计
   */
  getResults(experimentId: string): ExperimentResult[] {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`实验 ${experimentId} 不存在`);
    }

    const results: ExperimentResult[] = [];
    const groups = Array.from(experiment.groups.values());
    const controlGroup = groups[0]; // 假设第一组为对照组

    for (const group of groups) {
      const conversionRate =
        group.metrics.impressions > 0
          ? (group.metrics.conversions / group.metrics.impressions) * 100
          : 0;

      const result: ExperimentResult = {
        experimentId,
        groupName: group.name,
        conversionRate,
        totalUsers: group.users.size,
        conversions: group.metrics.conversions,
      };

      // 计算相对对照组的提升
      if (group !== controlGroup && controlGroup.metrics.impressions > 0) {
        const controlRate =
          controlGroup.metrics.conversions / controlGroup.metrics.impressions;
        if (controlRate > 0) {
          result.lift = ((conversionRate / 100 - controlRate) / controlRate) * 100;
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * 获取所有实验
   */
  listExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * 用户 ID 哈希函数 (简单的 MurmurHash 替代)
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }
}

// ============== 导出单例 ==============

export const experimentManager = new ExperimentManager();

// ============== 使用示例 ==============

/**
 * 使用示例 1: 创建并运行一个简单的 A/B 测试
 */
export function example1_SimpleABTest() {
  // 创建实验：测试新按钮颜色对转化率的影响
  const experiment = experimentManager.createExperiment(
    'btn-color-test',
    '按钮颜色 A/B 测试',
    '测试红色按钮 vs 蓝色按钮对购买转化率的影响',
    [
      { id: 'control', name: '对照组 (蓝色)', allocation: 50 },
      { id: 'variant', name: '实验组 (红色)', allocation: 50 },
    ]
  );

  // 启动实验
  experimentManager.startExperiment('btn-color-test');

  // 模拟用户访问
  const users = ['user_001', 'user_002', 'user_003', 'user_004', 'user_005'];
  const assignments: Record<string, string> = {};

  for (const userId of users) {
    const groupId = experimentManager.assignUserToGroup('btn-color-test', userId);
    assignments[userId] = groupId;
    console.log(`用户 ${userId} 被分配到组：${groupId}`);
  }

  // 模拟转化 (假设 user_001 和 user_003 完成了购买)
  experimentManager.recordConversion('btn-color-test', 'user_001', 99.99);
  experimentManager.recordConversion('btn-color-test', 'user_003', 149.99);

  // 获取结果
  const results = experimentManager.getResults('btn-color-test');
  console.log('\n实验结果:');
  results.forEach(r => {
    console.log(
      `${r.groupName}: 转化率 ${r.conversionRate.toFixed(2)}%, ` +
        `用户数 ${r.totalUsers}, 转化数 ${r.conversions}` +
        (r.lift ? `, 提升 ${r.lift.toFixed(2)}%` : '')
    );
  });

  // 停止实验
  experimentManager.stopExperiment('btn-color-test');

  return { experiment, assignments, results };
}

/**
 * 使用示例 2: 多组实验 (A/B/C 测试)
 */
export function example2_MultivariateTest() {
  // 创建实验：测试三种不同的定价策略
  experimentManager.createExperiment(
    'pricing-strategy',
    '定价策略多变量测试',
    '测试三种价格点对转化率的影响',
    [
      { id: 'low', name: '低价策略 ($9.99)', allocation: 33 },
      { id: 'medium', name: '中价策略 ($19.99)', allocation: 34 },
      { id: 'high', name: '高价策略 ($29.99)', allocation: 33 },
    ]
  );

  experimentManager.startExperiment('pricing-strategy');

  // 模拟 100 个用户
  for (let i = 1; i <= 100; i++) {
    const userId = `user_${i.toString().padStart(3, '0')}`;
    const groupId = experimentManager.assignUserToGroup('pricing-strategy', userId);

    // 模拟转化率 (假设中价策略转化率最高)
    const random = Math.random();
    const conversionRates: Record<string, number> = {
      low: 0.15,
      medium: 0.25,
      high: 0.10,
    };

    if (random < conversionRates[groupId]) {
      const prices: Record<string, number> = { low: 9.99, medium: 19.99, high: 29.99 };
      experimentManager.recordConversion('pricing-strategy', userId, prices[groupId]);
    }
  }

  const results = experimentManager.getResults('pricing-strategy');
  console.log('\n定价策略实验结果:');
  results.forEach(r => {
    console.log(
      `${r.groupName}: 转化率 ${r.conversionRate.toFixed(2)}%, ` +
        `收入 $${(experimentManager.getExperiment('pricing-strategy')?.groups.get(r.groupName.toLowerCase().split(' ')[0])?.metrics.revenue || 0).toFixed(2)}` +
        (r.lift ? `, 相对对照提升 ${r.lift.toFixed(2)}%` : '')
    );
  });

  return results;
}

/**
 * 使用示例 3: 查看实验状态和列表
 */
export function example3_ExperimentManagement() {
  // 列出所有实验
  const allExperiments = experimentManager.listExperiments();
  console.log('\n所有实验:');
  allExperiments.forEach(exp => {
    console.log(
      `- ${exp.name} (${exp.id}): 状态=${exp.status}, ` +
        `用户数=${exp.totalUsers.size}, ` +
        `创建时间=${new Date(exp.createdAt).toLocaleString()}`
    );
  });

  // 获取特定实验详情
  const experiment = experimentManager.getExperiment('btn-color-test');
  if (experiment) {
    console.log(`\n实验详情: ${experiment.name}`);
    console.log(`描述：${experiment.description}`);
    console.log(`状态：${experiment.status}`);
    experiment.groups.forEach((group, id) => {
      console.log(
        `  组 ${id} (${group.name}): ${group.users.size} 用户, ` +
          `${group.metrics.conversions} 转化, ` +
          `${group.metrics.impressions} 曝光`
      );
    });
  }

  return { allExperiments, experiment };
}

// ============== 导出 ==============

export {
  ExperimentManager,
  Experiment,
  ExperimentGroup,
  ExperimentResult,
};
