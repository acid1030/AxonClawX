/**
 * Pipeline Utils Skill - 使用示例
 * 
 * @file pipeline-utils-examples.ts
 * @description 展示管道工具技能的各种使用场景
 */

import {
  createPipeline,
  createParallelPipeline,
  Transformers,
  Validators,
  type PipelineContext,
  type PipelineStage,
} from './pipeline-utils-skill';

// ============================================================================
// 示例 1: 基础数据处理管道
// ============================================================================

/**
 * 场景：处理用户提交的表单数据
 * 流程：解析 → 验证 → 清洗 → 格式化 → 存储
 */
async function example1_basicPipeline() {
  interface FormData {
    name: string;
    email: string;
    age: number;
    tags: string[];
  }

  const pipeline = createPipeline<string>()
    // 阶段 1: 解析 JSON
    .add<FormData>('parse', Transformers.parseJson<FormData>())
    
    // 阶段 2: 验证必填字段
    .filter((data, ctx) => {
      if (!data.name || !data.email) {
        throw new Error('Name and email are required');
      }
      return true;
    }, 'validate-required')
    
    // 阶段 3: 验证邮箱格式
    .filter((data, ctx) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
      return true;
    }, 'validate-email')
    
    // 阶段 4: 验证年龄范围
    .filter((data, ctx) => {
      if (data.age < 0 || data.age > 150) {
        throw new Error('Age must be between 0 and 150');
      }
      return true;
    }, 'validate-age')
    
    // 阶段 5: 清洗数据 (去除标签重复)
    .map((data, ctx) => ({
      ...data,
      tags: Array.from(new Set(data.tags)),
    }), 'deduplicate-tags')
    
    // 阶段 6: 添加元数据
    .map((data, ctx) => ({
      ...data,
      createdAt: new Date().toISOString(),
      processedBy: ctx.id,
    }), 'add-metadata')
    
    // 配置：重试 3 次，超时 5 秒
    .retry(3, 100)
    .timeout(5000);

  // 执行管道
  const input = JSON.stringify({
    name: 'Axon',
    email: 'axon@example.com',
    age: 25,
    tags: ['AI', 'Automation', 'AI', 'Claw'],
  });

  const result = await pipeline.execute(input);

  console.log('=== 示例 1: 基础管道 ===');
  console.log('成功:', result.success);
  console.log('数据:', result.data);
  console.log('统计:', result.stats);
  console.log('阶段结果:', result.stageResults);
  console.log('');

  return result;
}

// ============================================================================
// 示例 2: 并行管道 - 多数据源聚合
// ============================================================================

/**
 * 场景：从多个 API 获取用户数据并合并
 * 流程：并行请求 → 结果合并 → 统一格式化
 */
async function example2_parallelPipeline() {
  // 模拟 API 调用
  const mockApiCall = async (endpoint: string, delay: number) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return { endpoint, timestamp: Date.now() };
  };

  const result = await createParallelPipeline({
    name: 'user-data-aggregation',
    input: { userId: 123 },
    
    // 定义多个并行分支
    branches: [
      {
        name: 'profile',
        stages: [
          {
            name: 'fetch-profile',
            processor: async (data, ctx) => {
              return await mockApiCall('/api/profile', 200);
            },
          },
          {
            name: 'enrich-profile',
            processor: async (data, ctx) => ({
              ...data,
              enriched: true,
            }),
          },
        ],
      },
      {
        name: 'orders',
        stages: [
          {
            name: 'fetch-orders',
            processor: async (data, ctx) => {
              return await mockApiCall('/api/orders', 300);
            },
          },
          {
            name: 'count-orders',
            processor: async (data, ctx) => ({
              ...data,
              orderCount: Math.floor(Math.random() * 100),
            }),
          },
        ],
      },
      {
        name: 'preferences',
        stages: [
          {
            name: 'fetch-preferences',
            processor: async (data, ctx) => {
              return await mockApiCall('/api/preferences', 150);
            },
          },
        ],
      },
    ],
    
    // 合并函数
    mergeFn: async (results) => {
      return {
        userId: 123,
        profile: results.profile,
        orders: results.orders,
        preferences: results.preferences,
        aggregatedAt: new Date().toISOString(),
      };
    },
    
    // 并发限制
    concurrencyLimit: 3,
  });

  console.log('=== 示例 2: 并行管道 ===');
  console.log('成功:', result.success);
  console.log('数据:', JSON.stringify(result.data, null, 2));
  console.log('总耗时:', result.stats.totalDuration, 'ms');
  console.log('');

  return result;
}

// ============================================================================
// 示例 3: 数据转换链 - ETL 流程
// ============================================================================

/**
 * 场景：ETL (Extract-Transform-Load) 数据处理
 * 流程：提取 → 转换 → 加载
 */
async function example3_etlPipeline() {
  interface RawRecord {
    id: number;
    name: string;
    value: string;
    createdAt: string;
  }

  interface TransformedRecord {
    id: number;
    name: string;
    value: number;
    createdAt: Date;
    category: string;
  }

  // 模拟原始数据
  const rawData: RawRecord[] = [
    { id: 1, name: 'Item A', value: '100', createdAt: '2024-01-01' },
    { id: 2, name: 'Item B', value: '200', createdAt: '2024-01-02' },
    { id: 3, name: 'Item C', value: '300', createdAt: '2024-01-03' },
    { id: 4, name: 'Item D', value: '400', createdAt: '2024-01-04' },
    { id: 5, name: 'Item E', value: '500', createdAt: '2024-01-05' },
  ];

  const pipeline = createPipeline<RawRecord[]>()
    // 阶段 1: 过滤空值
    .add('compact', Transformers.compact<RawRecord>())
    
    // 阶段 2: 数据转换
    .map<TransformedRecord[]>((records, ctx) => {
      return records.map(record => ({
        id: record.id,
        name: record.name.toUpperCase(),
        value: parseInt(record.value, 10),
        createdAt: new Date(record.createdAt),
        category: record.value > '250' ? 'HIGH' : 'LOW',
      }));
    }, 'transform-records')
    
    // 阶段 3: 按类别分组
    .add('group', Transformers.groupBy((item: TransformedRecord) => item.category))
    
    // 阶段 4: 计算每组的统计信息
    .map((groups, ctx) => {
      return Object.entries(groups).map(([category, items]) => ({
        category,
        count: items.length,
        totalValue: items.reduce((sum, item) => sum + item.value, 0),
        avgValue: items.reduce((sum, item) => sum + item.value, 0) / items.length,
        items,
      }));
    }, 'calculate-stats')
    
    // 阶段 5: 按总值排序
    .add('sort', Transformers.sort((a, b) => b.totalValue - a.totalValue))
    
    // 阶段 6: 限制结果数量
    .add('limit', Transformers.limit(10));

  const result = await pipeline.execute(rawData);

  console.log('=== 示例 3: ETL 管道 ===');
  console.log('成功:', result.success);
  console.log('数据:', JSON.stringify(result.data, null, 2));
  console.log('');

  return result;
}

// ============================================================================
// 示例 4: 错误处理与恢复
// ============================================================================

/**
 * 场景：处理可能失败的操作，优雅降级
 * 流程：尝试主流程 → 失败时回退 → 记录错误
 */
async function example4_errorHandling() {
  const errorLog: Array<{ stage: string; error: string; timestamp: string }> = [];

  const pipeline = createPipeline<string>()
    // 阶段 1: 尝试解析 JSON (可能失败)
    .add('parse', (data, ctx) => {
      try {
        return JSON.parse(data);
      } catch (error) {
        throw new Error(`JSON parse failed: ${(error as Error).message}`);
      }
    })
    
    // 阶段 2: 验证数据结构
    .add('validate', (data, ctx) => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure');
      }
      return data;
    })
    
    // 阶段 3: 处理数据 (可能失败)
    .add('process', (data, ctx) => {
      if (!data.value) {
        throw new Error('Missing required field: value');
      }
      return { ...data, processed: true, value: data.value * 2 };
    })
    
    // 错误处理器：优雅降级
    .catch((error, ctx) => {
      // 记录错误
      errorLog.push({
        stage: ctx.executedStages[ctx.executedStages.length - 1] || 'unknown',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      // 返回降级数据
      return {
        error: true,
        fallback: true,
        errorMessage: error.message,
        recoveredAt: new Date().toISOString(),
      };
    })
    
    // 配置：每个阶段重试 2 次
    .retry(2, 50);

  // 测试 1: 有效输入
  console.log('=== 示例 4a: 成功处理 ===');
  const result1 = await pipeline.execute(JSON.stringify({ value: 42 }));
  console.log('成功:', result1.success);
  console.log('数据:', result1.data);
  console.log('');

  // 测试 2: 无效 JSON
  console.log('=== 示例 4b: JSON 解析失败 (降级) ===');
  const result2 = await pipeline.execute('not valid json');
  console.log('成功:', result2.success); // true (因为错误被捕获)
  console.log('数据:', result2.data);
  console.log('错误日志:', errorLog);
  console.log('');

  // 测试 3: 缺少必填字段
  console.log('=== 示例 4c: 验证失败 (降级) ===');
  const result3 = await pipeline.execute(JSON.stringify({ name: 'test' }));
  console.log('成功:', result3.success);
  console.log('数据:', result3.data);
  console.log('');

  return { result1, result2, result3, errorLog };
}

// ============================================================================
// 示例 5: 可选阶段与条件执行
// ============================================================================

/**
 * 场景：某些阶段可能失败但不影响整体流程
 * 流程：核心处理 → 可选增强 → 最终输出
 */
async function example5_optionalStages() {
  const pipeline = createPipeline<{ id: number; name: string }>()
    // 核心阶段：必须成功
    .add('validate', (data, ctx) => {
      if (!data.id || !data.name) {
        throw new Error('ID and name are required');
      }
      return data;
    })
    
    // 可选阶段 1: 尝试获取额外数据 (失败不影响流程)
    .add('enrich-optional', async (data, ctx) => {
      // 模拟可能失败的外部 API 调用
      const shouldFail = Math.random() < 0.5;
      if (shouldFail) {
        throw new Error('External API unavailable');
      }
      return { ...data, enriched: true };
    }, { optional: true })
    
    // 可选阶段 2: 尝试缓存 (失败不影响流程)
    .add('cache-optional', async (data, ctx) => {
      // 模拟可能失败的缓存操作
      throw new Error('Cache service down');
    }, { optional: true })
    
    // 核心阶段：格式化输出
    .add('format', (data, ctx) => ({
      ...data,
      formatted: true,
      timestamp: new Date().toISOString(),
    }));

  const result = await pipeline.execute({ id: 1, name: 'Test Item' });

  console.log('=== 示例 5: 可选阶段 ===');
  console.log('成功:', result.success);
  console.log('数据:', result.data);
  console.log('统计:', {
    总阶段数: result.stats.totalStages,
    成功: result.stats.successfulStages,
    跳过: result.stats.skippedStages,
  });
  console.log('阶段详情:');
  Object.entries(result.stageResults).forEach(([name, stage]) => {
    console.log(`  - ${name}: ${stage.success ? '✓' : '✗'} (${stage.duration}ms)`);
    if (stage.error) {
      console.log(`    错误: ${stage.error}`);
    }
  });
  console.log('');

  return result;
}

// ============================================================================
// 示例 6: 流式批处理
// ============================================================================

/**
 * 场景：处理大量数据，分批执行
 * 流程：分批 → 并行处理批次 → 合并结果
 */
async function example6_batchProcessing() {
  // 生成大量测试数据
  const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
  }));

  const pipeline = createPipeline<typeof largeDataset>()
    // 阶段 1: 分批 (每批 100 条)
    .add('batch', Transformers.batch(100))
    
    // 阶段 2: 并行处理每个批次
    .add('process-batches', async (batches, ctx) => {
      const processBatch = async (batch: typeof largeDataset) => {
        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 10));
        return batch.map(item => ({
          ...item,
          processed: true,
          normalizedValue: item.value / 1000,
        }));
      };
      
      // 并发处理批次
      const results = await Promise.all(batches.map(processBatch));
      return results.flat();
    })
    
    // 阶段 3: 按类别分组
    .add('group', Transformers.groupBy((item: any) => item.category))
    
    // 阶段 4: 计算统计
    .map((groups, ctx) => {
      return Object.entries(groups).map(([category, items]) => ({
        category,
        count: items.length,
        avgValue: items.reduce((sum, item) => sum + item.normalizedValue, 0) / items.length,
      }));
    }, 'calculate-stats')
    
    // 阶段 5: 排序
    .add('sort', Transformers.sort((a, b) => b.count - a.count));

  const startTime = Date.now();
  const result = await pipeline.execute(largeDataset);
  const endTime = Date.now();

  console.log('=== 示例 6: 批处理 ===');
  console.log('成功:', result.success);
  console.log('处理数据量:', largeDataset.length);
  console.log('总耗时:', endTime - startTime, 'ms');
  console.log('结果:', JSON.stringify(result.data, null, 2));
  console.log('');

  return result;
}

// ============================================================================
// 示例 7: 使用内置验证器
// ============================================================================

/**
 * 场景：严格的数据验证管道
 */
async function example7_validation() {
  const pipeline = createPipeline<any>()
    // 验证：非空
    .filter(Validators.required(), 'required')
    
    // 验证：是对象
    .filter(Validators.isObject(), 'is-object')
    
    // 验证：包含必填字段
    .filter((data, ctx) => {
      return Validators.custom<{ name: string; email: string }>((d) => {
        return !!(d.name && d.email);
      })(data, ctx);
    }, 'has-required-fields')
    
    // 验证：邮箱格式
    .filter(Validators.matches(/^[^\s@]+@[^\s@]+\.[^\s@]$/), 'email-format')
    
    // 验证：名称长度
    .filter((data, ctx) => {
      return Validators.minLength(2)(data.name, ctx) && 
             Validators.maxLength(50)(data.name, ctx);
    }, 'name-length')
    
    // 转换：标准化
    .map((data, ctx) => ({
      name: data.name.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      validated: true,
    }), 'normalize');

  // 测试有效数据
  const validResult = await pipeline.execute({
    name: '  Axon  ',
    email: ' AXON@EXAMPLE.COM ',
  });

  console.log('=== 示例 7a: 有效数据 ===');
  console.log('成功:', validResult.success);
  console.log('数据:', validResult.data);
  console.log('');

  // 测试无效数据
  const invalidResult = await pipeline.execute({
    name: 'A', // 太短
    email: 'invalid',
  });

  console.log('=== 示例 7b: 无效数据 ===');
  console.log('成功:', invalidResult.success);
  console.log('错误:', invalidResult.error?.message);
  console.log('');

  return { validResult, invalidResult };
}

// ============================================================================
// 示例 8: 管道组合与复用
// ============================================================================

/**
 * 场景：创建可复用的管道片段
 */
async function example8_composablePipelines() {
  // 可复用的验证管道片段
  const createValidationPipeline = () => {
    return createPipeline<any>()
      .filter(Validators.required(), 'required')
      .filter(Validators.isObject(), 'is-object')
      .filter((data, ctx) => {
        if (!data.id || typeof data.id !== 'number') {
          throw new Error('Valid ID required');
        }
        return true;
      }, 'valid-id');
  };

  // 可复用的转换管道片段
  const createTransformationPipeline = () => {
    return createPipeline<any>()
      .map((data, ctx) => ({
        ...data,
        updatedAt: new Date().toISOString(),
      }), 'add-timestamp')
      .map((data, ctx) => ({
        ...data,
        processedBy: ctx.id,
      }), 'add-processor-id');
  };

  // 组合管道
  const fullPipeline = createValidationPipeline()
    .add('business-logic', (data, ctx) => ({
      ...data,
      computed: data.value * 2,
    }))
    .add('transform', createTransformationPipeline().stages[0]!.processor)
    .add('transform-2', createTransformationPipeline().stages[1]!.processor);

  const result = await fullPipeline.execute({
    id: 123,
    name: 'Test',
    value: 50,
  });

  console.log('=== 示例 8: 管道组合 ===');
  console.log('成功:', result.success);
  console.log('数据:', result.data);
  console.log('');

  return result;
}

// ============================================================================
// 示例 9: 取消执行
// ============================================================================

/**
 * 场景：长时间运行的管道，支持取消
 */
async function example9_cancellation() {
  const abortController = new AbortController();

  const pipeline = createPipeline<number>()
    .add('step-1', async (data, ctx) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return data + 1;
    })
    .add('step-2', async (data, ctx) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return data + 1;
    })
    .add('step-3', async (data, ctx) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return data + 1;
    })
    .add('step-4', async (data, ctx) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return data + 1;
    })
    .add('step-5', async (data, ctx) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return data + 1;
    });

  // 200ms 后取消
  setTimeout(() => {
    console.log('取消管道执行...');
    abortController.abort();
  }, 200);

  const result = await pipeline.execute(0, {
    abortSignal: abortController.signal,
  });

  console.log('=== 示例 9: 取消执行 ===');
  console.log('成功:', result.success);
  console.log('错误:', result.error?.message);
  console.log('已执行阶段:', result.stats.successfulStages);
  console.log('');

  return result;
}

// ============================================================================
// 运行所有示例
// ============================================================================

async function runAllExamples() {
  console.log('🚀 开始运行管道工具技能示例\n');
  console.log('='.repeat(60));
  console.log('');

  try {
    await example1_basicPipeline();
    await example2_parallelPipeline();
    await example3_etlPipeline();
    await example4_errorHandling();
    await example5_optionalStages();
    await example6_batchProcessing();
    await example7_validation();
    await example8_composablePipelines();
    await example9_cancellation();

    console.log('='.repeat(60));
    console.log('✅ 所有示例运行完成!');
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

// 导出示例函数
export {
  example1_basicPipeline,
  example2_parallelPipeline,
  example3_etlPipeline,
  example4_errorHandling,
  example5_optionalStages,
  example6_batchProcessing,
  example7_validation,
  example8_composablePipelines,
  example9_cancellation,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
