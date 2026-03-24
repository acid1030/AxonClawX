/**
 * 工作流引擎技能 - 使用示例
 * 
 * 展示如何使用 ACE 工作流引擎进行流程编排
 */

import { 
  WorkflowEngine, 
  WorkflowDefinition,
  WorkflowContext,
  createCondition,
  createScript
} from './workflow-engine-skill';

// ============================================
// 示例 1: 数据 ETL 管道
// ============================================

/**
 * ETL (Extract-Transform-Load) 数据处理流程
 * 
 * 流程:
 * 1. 从 API 提取数据
 * 2. 清洗和转换数据
 * 3. 验证数据质量
 * 4. 加载到数据库
 * 5. 生成报告
 */
export async function exampleETLPipeline() {
  const engine = new WorkflowEngine();

  const etlWorkflow: WorkflowDefinition = {
    id: 'etl-pipeline',
    name: '数据 ETL 管道',
    version: '1.0.0',
    description: '从 API 提取数据并加载到数据库',
    nodes: [
      {
        id: 'extract',
        name: '提取数据',
        type: 'script',
        script: async (ctx) => {
          console.log('📥 从 API 提取数据...');
          // 模拟 API 调用
          const data = [
            { id: 1, name: 'Item 1', value: 100 },
            { id: 2, name: 'Item 2', value: 200 },
            { id: 3, name: 'Item 3', value: 300 }
          ];
          ctx.variables.rawData = data;
          return { count: data.length };
        }
      },
      {
        id: 'transform',
        name: '转换数据',
        type: 'script',
        script: async (ctx) => {
          console.log('🔄 转换数据格式...');
          const raw = ctx.variables.rawData;
          const transformed = raw.map((item: any) => ({
            ...item,
            value: item.value * 1.1, // 添加 10% 溢价
            processedAt: Date.now()
          }));
          ctx.variables.transformedData = transformed;
          return { count: transformed.length };
        },
        dependencies: ['extract']
      },
      {
        id: 'validate',
        name: '数据验证',
        type: 'condition',
        condition: (ctx) => {
          const data = ctx.variables.transformedData;
          const isValid = data.length > 0 && 
                         data.every((item: any) => item.value > 0);
          console.log(`✅ 数据验证结果: ${isValid ? '通过' : '失败'}`);
          return isValid;
        },
        trueBranch: 'load',
        falseBranch: 'handle-error',
        dependencies: ['transform']
      },
      {
        id: 'load',
        name: '加载到数据库',
        type: 'script',
        script: async (ctx) => {
          console.log('💾 加载数据到数据库...');
          const data = ctx.variables.transformedData;
          // 模拟数据库插入
          ctx.variables.loadResult = {
            success: true,
            inserted: data.length,
            timestamp: Date.now()
          };
          return ctx.variables.loadResult;
        },
        dependencies: ['validate']
      },
      {
        id: 'handle-error',
        name: '错误处理',
        type: 'script',
        script: async (ctx) => {
          console.log('❌ 数据验证失败，执行错误处理...');
          ctx.variables.error = {
            code: 'VALIDATION_FAILED',
            message: '数据质量检查未通过',
            timestamp: Date.now()
          };
          return ctx.variables.error;
        },
        dependencies: ['validate']
      },
      {
        id: 'report',
        name: '生成报告',
        type: 'script',
        script: async (ctx) => {
          console.log('📊 生成执行报告...');
          const report = {
            workflowId: ctx.workflowId,
            status: ctx.variables.error ? 'failed' : 'completed',
            metrics: {
              extracted: ctx.variables.rawData?.length || 0,
              transformed: ctx.variables.transformedData?.length || 0,
              loaded: ctx.variables.loadResult?.inserted || 0
            },
            duration: Date.now() - ctx.startTime
          };
          console.log('📋 报告:', JSON.stringify(report, null, 2));
          return report;
        },
        dependencies: ['load', 'handle-error']
      }
    ],
    startNode: 'extract'
  };

  engine.registerWorkflow(etlWorkflow);

  console.log('\n=== 示例 1: ETL 管道 ===');
  const result = await engine.execute('etl-pipeline', {
    sourceApi: 'https://api.example.com/data',
    targetDb: 'postgresql://localhost/warehouse'
  });

  console.log(`\n执行状态：${result.status}`);
  console.log(`总耗时：${result.duration}ms`);
  console.log(`节点执行数：${result.nodeResults.length}`);
  
  return result;
}

// ============================================
// 示例 2: 多 Agent 协作流程
// ============================================

/**
 * 多 Agent 协作任务处理
 * 
 * 流程:
 * 1. 任务分析 Agent 分析需求
 * 2. 根据复杂度分发给不同 Agent
 * 3. 并行执行子任务
 * 4. 汇总结果
 */
export async function exampleMultiAgentCollaboration() {
  const engine = new WorkflowEngine();

  const agentWorkflow: WorkflowDefinition = {
    id: 'multi-agent-task',
    name: '多 Agent 协作任务',
    version: '1.0.0',
    description: '智能任务分发与协作',
    nodes: [
      {
        id: 'analyze-task',
        name: '任务分析',
        type: 'script',
        script: async (ctx) => {
          console.log('🧠 分析任务复杂度...');
          const task = ctx.variables.task;
          const complexity = task?.complexity || 'medium';
          ctx.variables.complexity = complexity;
          return { complexity };
        }
      },
      {
        id: 'route-simple',
        name: '简单任务路由',
        type: 'condition',
        condition: (ctx) => ctx.variables.complexity === 'simple',
        trueBranch: 'execute-simple',
        falseBranch: 'check-complex'
      },
      {
        id: 'execute-simple',
        name: '执行简单任务',
        type: 'script',
        script: async (ctx) => {
          console.log('⚡ 快速执行简单任务...');
          return { agent: 'fast-agent', status: 'completed' };
        },
        dependencies: ['route-simple']
      },
      {
        id: 'check-complex',
        name: '复杂任务检查',
        type: 'condition',
        condition: (ctx) => ctx.variables.complexity === 'complex',
        trueBranch: 'parallel-agents',
        falseBranch: 'execute-medium'
      },
      {
        id: 'execute-medium',
        name: '执行中等任务',
        type: 'script',
        script: async (ctx) => {
          console.log('🔧 执行中等复杂度任务...');
          return { agent: 'standard-agent', status: 'completed' };
        },
        dependencies: ['check-complex']
      },
      {
        id: 'parallel-agents',
        name: '多 Agent 并行',
        type: 'parallel',
        parallelNodes: ['agent-research', 'agent-coding', 'agent-testing'],
        dependencies: ['check-complex']
      },
      {
        id: 'agent-research',
        name: '研究 Agent',
        type: 'script',
        script: async (ctx) => {
          console.log('📚 研究 Agent 工作中...');
          await new Promise(r => setTimeout(r, 100));
          return { agent: 'research', findings: ['info1', 'info2'] };
        }
      },
      {
        id: 'agent-coding',
        name: '编码 Agent',
        type: 'script',
        script: async (ctx) => {
          console.log('💻 编码 Agent 工作中...');
          await new Promise(r => setTimeout(r, 150));
          return { agent: 'coding', linesOfCode: 500 };
        }
      },
      {
        id: 'agent-testing',
        name: '测试 Agent',
        type: 'script',
        script: async (ctx) => {
          console.log('🧪 测试 Agent 工作中...');
          await new Promise(r => setTimeout(r, 120));
          return { agent: 'testing', testsPassed: 42 };
        }
      },
      {
        id: 'aggregate-results',
        name: '汇总结果',
        type: 'script',
        script: async (ctx) => {
          console.log('📦 汇总所有 Agent 结果...');
          const results = {
            research: ctx.nodeResults['agent-research']?.result,
            coding: ctx.nodeResults['agent-coding']?.result,
            testing: ctx.nodeResults['agent-testing']?.result
          };
          return { aggregated: true, results };
        },
        dependencies: ['parallel-agents']
      }
    ],
    startNode: 'analyze-task'
  };

  engine.registerWorkflow(agentWorkflow);

  console.log('\n=== 示例 2: 多 Agent 协作 ===');
  const result = await engine.execute('multi-agent-task', {
    task: {
      description: '开发新功能',
      complexity: 'complex'
    }
  });

  console.log(`\n执行状态：${result.status}`);
  console.log(`总耗时：${result.duration}ms`);
  
  return result;
}

// ============================================
// 示例 3: 带重试和错误处理的工作流
// ============================================

/**
 * 健壮的错误处理工作流
 * 
 * 特性:
 * - 自动重试机制
 * - 降级处理
 * - 完整审计日志
 */
export async function exampleRobustErrorHandling() {
  const engine = new WorkflowEngine();

  const robustWorkflow: WorkflowDefinition = {
    id: 'robust-api-call',
    name: '健壮的 API 调用',
    version: '1.0.0',
    description: '带重试和降级的 API 调用流程',
    nodes: [
      {
        id: 'primary-api',
        name: '主 API 调用',
        type: 'script',
        script: async (ctx) => {
          console.log('🌐 调用主 API...');
          // 模拟失败
          const attempt = ctx.variables.attempt || 1;
          ctx.variables.attempt = attempt + 1;
          
          if (attempt < 3) {
            throw new Error('主 API 暂时不可用');
          }
          
          return { source: 'primary', data: 'success' };
        },
        retryCount: 3,
        onError: 'continue'
      },
      {
        id: 'check-primary',
        name: '检查主 API 结果',
        type: 'condition',
        condition: (ctx) => {
          const result = ctx.nodeResults['primary-api']?.result;
          return result?.source === 'primary';
        },
        trueBranch: 'process-data',
        falseBranch: 'fallback-api'
      },
      {
        id: 'fallback-api',
        name: '备用 API 调用',
        type: 'script',
        script: async (ctx) => {
          console.log('🔄 切换到备用 API...');
          return { source: 'fallback', data: 'fallback-success' };
        },
        dependencies: ['check-primary']
      },
      {
        id: 'process-data',
        name: '处理数据',
        type: 'script',
        script: async (ctx) => {
          const primaryResult = ctx.nodeResults['primary-api']?.result;
          const fallbackResult = ctx.nodeResults['fallback-api']?.result;
          
          const data = primaryResult || fallbackResult;
          console.log(`📊 处理来自 ${data?.source} 的数据...`);
          
          return { processed: true, source: data?.source };
        },
        dependencies: ['check-primary', 'fallback-api']
      },
      {
        id: 'audit-log',
        name: '记录审计日志',
        type: 'script',
        script: async (ctx) => {
          const log = {
            workflowId: ctx.workflowId,
            timestamp: Date.now(),
            attempts: ctx.variables.attempt,
            usedFallback: !!ctx.nodeResults['fallback-api']?.result,
            finalResult: ctx.nodeResults['process-data']?.result
          };
          console.log('📝 审计日志:', JSON.stringify(log));
          return log;
        },
        dependencies: ['process-data']
      }
    ],
    startNode: 'primary-api'
  };

  engine.registerWorkflow(robustWorkflow);

  console.log('\n=== 示例 3: 健壮错误处理 ===');
  const result = await engine.execute('robust-api-call');

  console.log(`\n执行状态：${result.status}`);
  console.log(`总耗时：${result.duration}ms`);
  
  return result;
}

// ============================================
// 示例 4: 定时任务调度
// ============================================

/**
 * 定时任务调度工作流
 * 
 * 特性:
 * - 延迟执行
 * - 条件触发
 * - 循环调度
 */
export async function exampleScheduledTask() {
  const engine = new WorkflowEngine();

  const scheduleWorkflow: WorkflowDefinition = {
    id: 'scheduled-cleanup',
    name: '定时清理任务',
    version: '1.0.0',
    description: '定期执行系统清理',
    nodes: [
      {
        id: 'wait-window',
        name: '等待维护窗口',
        type: 'delay',
        delayMs: 1000 // 示例中用 1 秒，实际可能是几小时
      },
      {
        id: 'check-system-load',
        name: '检查系统负载',
        type: 'script',
        script: async (ctx) => {
          console.log('📈 检查系统负载...');
          const load = Math.random(); // 模拟负载
          ctx.variables.systemLoad = load;
          return { load, safe: load < 0.7 };
        },
        dependencies: ['wait-window']
      },
      {
        id: 'load-check',
        name: '负载检查',
        type: 'condition',
        condition: (ctx) => ctx.variables.systemLoad < 0.7,
        trueBranch: 'cleanup',
        falseBranch: 'reschedule'
      },
      {
        id: 'cleanup',
        name: '执行清理',
        type: 'script',
        script: async (ctx) => {
          console.log('🧹 执行系统清理...');
          const tasks = [
            '清理临时文件',
            '清理日志',
            '清理缓存',
            '优化数据库'
          ];
          
          for (const task of tasks) {
            console.log(`   - ${task}`);
            await new Promise(r => setTimeout(r, 50));
          }
          
          return { cleaned: tasks.length };
        },
        dependencies: ['load-check']
      },
      {
        id: 'reschedule',
        name: '重新调度',
        type: 'script',
        script: async (ctx) => {
          console.log('⏰ 系统负载过高，重新调度...');
          ctx.variables.rescheduled = true;
          return { rescheduled: true, reason: 'high-load' };
        },
        dependencies: ['load-check']
      },
      {
        id: 'notify',
        name: '发送通知',
        type: 'script',
        script: async (ctx) => {
          const status = ctx.variables.rescheduled ? 'rescheduled' : 'completed';
          console.log(`📧 发送通知：${status}`);
          return { notified: true, status };
        },
        dependencies: ['cleanup', 'reschedule']
      }
    ],
    startNode: 'wait-window'
  };

  engine.registerWorkflow(scheduleWorkflow);

  console.log('\n=== 示例 4: 定时任务调度 ===');
  const result = await engine.execute('scheduled-cleanup');

  console.log(`\n执行状态：${result.status}`);
  console.log(`总耗时：${result.duration}ms`);
  
  return result;
}

// ============================================
// 示例 5: 审批流程
// ============================================

/**
 * 多级审批工作流
 * 
 * 流程:
 * 1. 提交申请
 * 2. 直属上级审批
 * 3. 部门经理审批 (金额>10000)
 * 4. 财务审批
 * 5. 执行
 */
export async function exampleApprovalFlow() {
  const engine = new WorkflowEngine();

  const approvalWorkflow: WorkflowDefinition = {
    id: 'expense-approval',
    name: '费用审批流程',
    version: '1.0.0',
    description: '多级费用审批',
    nodes: [
      {
        id: 'submit-request',
        name: '提交申请',
        type: 'script',
        script: async (ctx) => {
          console.log('📝 提交费用申请...');
          const request = ctx.variables.request;
          console.log(`   金额：¥${request.amount}`);
          console.log(`   事由：${request.purpose}`);
          return { submitted: true, requestId: 'REQ-' + Date.now() };
        }
      },
      {
        id: 'manager-approval',
        name: '直属上级审批',
        type: 'script',
        script: async (ctx) => {
          console.log('👔 直属上级审批中...');
          // 模拟审批通过
          const approved = true;
          ctx.variables.managerApproved = approved;
          return { approved, role: 'manager' };
        },
        dependencies: ['submit-request']
      },
      {
        id: 'check-amount',
        name: '金额检查',
        type: 'condition',
        condition: (ctx) => {
          const amount = ctx.variables.request?.amount || 0;
          return amount > 10000;
        },
        trueBranch: 'director-approval',
        falseBranch: 'finance-review',
        dependencies: ['manager-approval']
      },
      {
        id: 'director-approval',
        name: '部门经理审批',
        type: 'script',
        script: async (ctx) => {
          console.log('👔 部门经理审批中...');
          const approved = true;
          ctx.variables.directorApproved = approved;
          return { approved, role: 'director' };
        },
        dependencies: ['check-amount']
      },
      {
        id: 'finance-review',
        name: '财务审核',
        type: 'script',
        script: async (ctx) => {
          console.log('💰 财务审核中...');
          const approved = true;
          ctx.variables.financeApproved = approved;
          return { approved, role: 'finance' };
        },
        dependencies: ['check-amount']
      },
      {
        id: 'final-check',
        name: '最终检查',
        type: 'condition',
        condition: (ctx) => {
          const needsDirector = ctx.variables.request?.amount > 10000;
          if (needsDirector) {
            return ctx.variables.directorApproved === true;
          }
          return ctx.variables.financeApproved === true;
        },
        trueBranch: 'execute',
        falseBranch: 'reject',
        dependencies: ['director-approval', 'finance-review']
      },
      {
        id: 'execute',
        name: '执行打款',
        type: 'script',
        script: async (ctx) => {
          console.log('💸 执行打款...');
          return { executed: true, timestamp: Date.now() };
        },
        dependencies: ['final-check']
      },
      {
        id: 'reject',
        name: '拒绝申请',
        type: 'script',
        script: async (ctx) => {
          console.log('❌ 申请被拒绝');
          return { rejected: true, reason: 'approval-failed' };
        },
        dependencies: ['final-check']
      },
      {
        id: 'notify-applicant',
        name: '通知申请人',
        type: 'script',
        script: async (ctx) => {
          const result = ctx.nodeResults['execute']?.result 
                      || ctx.nodeResults['reject']?.result;
          const status = result?.executed ? 'approved' : 'rejected';
          console.log(`📧 通知申请人：${status}`);
          return { notified: true, status };
        },
        dependencies: ['execute', 'reject']
      }
    ],
    startNode: 'submit-request'
  };

  engine.registerWorkflow(approvalWorkflow);

  console.log('\n=== 示例 5: 审批流程 ===');
  const result = await engine.execute('expense-approval', {
    request: {
      amount: 15000,
      purpose: '技术大会参会费用',
      applicant: '张三'
    }
  });

  console.log(`\n执行状态：${result.status}`);
  console.log(`总耗时：${result.duration}ms`);
  
  return result;
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   ACE 工作流引擎 - 使用示例合集       ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await exampleETLPipeline();
    await exampleMultiAgentCollaboration();
    await exampleRobustErrorHandling();
    await exampleScheduledTask();
    await exampleApprovalFlow();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ✅ 所有示例执行完成!               ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
  }
}

// 直接运行示例
if (require.main === module) {
  runAllExamples();
}
