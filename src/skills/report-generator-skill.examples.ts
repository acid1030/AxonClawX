/**
 * 报告生成工具 - 使用示例
 * 
 * 演示 report-generator-skill.ts 的各种使用场景
 */

import {
  aggregateData,
  mergeDataSources,
  generateReport,
  renderReport,
  exportReport,
  createMetricsSection,
  createTableSection,
  createTextSection,
  createChartSection,
  type ReportData,
  type ReportSection,
  type AggregationConfig,
  type ExportOptions
} from './report-generator-skill';

// ==================== 示例 1: 基础数据聚合 ====================

export function example1_basicAggregation() {
  console.log('=== 示例 1: 基础数据聚合 ===\n');
  
  const salesData = [
    { region: 'North', product: 'A', revenue: 1000, units: 50, cost: 600 },
    { region: 'North', product: 'B', revenue: 1500, units: 75, cost: 900 },
    { region: 'South', product: 'A', revenue: 800, units: 40, cost: 480 },
    { region: 'South', product: 'B', revenue: 1200, units: 60, cost: 720 },
    { region: 'East', product: 'A', revenue: 1100, units: 55, cost: 660 },
    { region: 'East', product: 'B', revenue: 1400, units: 70, cost: 840 },
  ];
  
  // 按区域分组聚合
  const config: AggregationConfig = {
    groupBy: 'region',
    aggregations: [
      { field: 'revenue', operation: 'sum', alias: 'totalRevenue' },
      { field: 'units', operation: 'avg', alias: 'avgUnits' },
      { field: 'cost', operation: 'sum', alias: 'totalCost' }
    ]
  };
  
  const result = aggregateData(salesData, config);
  
  console.log('按区域聚合结果:');
  console.table(result);
  
  // 计算利润率
  result.forEach(r => {
    r.profitMargin = ((r.totalRevenue - r.totalCost) / r.totalRevenue * 100).toFixed(2) + '%';
  });
  
  console.log('\n添加利润率后:');
  console.table(result);
  
  return result;
}

// ==================== 示例 2: 多数据源合并 ====================

export function example2_mergeDataSources() {
  console.log('\n=== 示例 2: 多数据源合并 ===\n');
  
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' }
  ];
  
  const orders = [
    { id: 1, userId: 1, amount: 100, date: '2026-01-15' },
    { id: 2, userId: 2, amount: 250, date: '2026-01-16' },
    { id: 3, userId: 1, amount: 75, date: '2026-01-17' }
  ];
  
  const shipments = [
    { id: 1, userId: 1, status: 'delivered', trackingNumber: 'TRK001' },
    { id: 2, userId: 2, status: 'shipped', trackingNumber: 'TRK002' }
  ];
  
  // 左连接合并
  const merged = mergeDataSources([
    { data: users, keyField: 'id' },
    { data: orders, keyField: 'userId' },
    { data: shipments, keyField: 'userId' }
  ], 'left');
  
  console.log('合并后的数据:');
  console.table(merged);
  
  return merged;
}

// ==================== 示例 3: 生成销售报告 ====================

export function example3_salesReport() {
  console.log('\n=== 示例 3: 生成销售报告 ===\n');
  
  const sections: ReportSection[] = [
    createMetricsSection('关键业绩指标', {
      revenue: { value: 4500, label: '总收入', change: 12.5, trend: 'up' },
      units: { value: 225, label: '总销量', change: -3.2, trend: 'down' },
      profit: { value: 2700, label: '总利润', change: 8.7, trend: 'up' },
      margin: { value: '60%', label: '利润率', change: 2.1, trend: 'up' }
    }, 1),
    
    createTableSection('区域销售明细',
      ['区域', '总收入', '平均销量', '利润率'],
      [
        ['North', 2500, 62.5, '64%'],
        ['South', 2000, 50, '60%'],
        ['East', 2500, 62.5, '64%']
      ],
      2
    ),
    
    createTextSection('分析总结', 
      `## 业绩概览

本季度总收入达到 **4,500** 元，同比增长 **12.5%**。

### 亮点
- 北部和东部地区表现优异，利润率均超过 60%
- 产品 B 的销量持续领先，贡献了 60% 的收入

### 改进空间
- 南部地区销量下滑 3.2%，需要加强市场推广
- 整体销量略有下降，建议优化产品组合

### 下一步行动
1. 增加南部地区的营销投入
2. 推出产品捆绑销售策略
3. 优化库存管理，降低成本`,
      3
    ),
    
    createChartSection('收入趋势', 'bar',
      ['Q1', 'Q2', 'Q3', 'Q4'],
      [{ label: '收入', data: [3200, 3800, 4100, 4500], color: '#6366f1' }],
      4
    )
  ];
  
  const markdown = generateReport(
    '2026 Q1 销售报告',
    sections,
    '季度销售业绩分析与展望',
    'standard'
  );
  
  console.log(markdown);
  return markdown;
}

// ==================== 示例 4: 项目进度报告 ====================

export function example4_projectReport() {
  console.log('\n=== 示例 4: 项目进度报告 ===\n');
  
  const sections: ReportSection[] = [
    createMetricsSection('项目状态', {
      progress: { value: '75%', label: '整体进度', change: 15, trend: 'up' },
      tasks: { value: 45, label: '已完成任务', change: 12, trend: 'up' },
      bugs: { value: 8, label: '待修复 Bug', change: -5, trend: 'down' },
      days: { value: 12, label: '剩余天数', change: 0, trend: 'stable' }
    }, 1),
    
    createTableSection('任务完成情况',
      ['模块', '负责人', '进度', '状态'],
      [
        ['前端开发', 'Alice', '90%', '✅ 进行中'],
        ['后端 API', 'Bob', '85%', '✅ 进行中'],
        ['数据库', 'Charlie', '100%', '✅ 已完成'],
        ['测试', 'Diana', '60%', '⚠️ 延迟'],
        ['文档', 'Eve', '40%', '⚠️ 延迟']
      ],
      2
    ),
    
    createTextSection('风险评估',
      `## 🚨 高风险项

1. **测试进度延迟** - 测试进度仅为 60%，可能影响上线时间
   - 建议：增加测试人员或延长测试周期

2. **文档完成率低** - 文档进度 40%，需加快编写速度
   - 建议：安排技术写作支持

## ✅ 低风险项

- 开发进度符合预期
- Bug 数量持续下降
- 团队协作良好`,
      3
    ),
    
    createChartSection('任务完成趋势', 'line',
      ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      [
        { label: '计划完成', data: [10, 20, 30, 40], color: '#10b981' },
        { label: '实际完成', data: [8, 18, 32, 45], color: '#6366f1' }
      ],
      4
    )
  ];
  
  const markdown = generateReport(
    '项目进度周报',
    sections,
    'AxonClaw 开发项目 - 第 12 周',
    'executive'
  );
  
  console.log(markdown);
  return markdown;
}

// ==================== 示例 5: 多格式导出 ====================

export function example5_multiFormatExport() {
  console.log('\n=== 示例 5: 多格式导出 ===\n');
  
  const reportData: ReportData = {
    title: '2026 年度财务报告',
    subtitle: '全年财务数据分析',
    generatedAt: Date.now(),
    sections: [
      createMetricsSection('财务概览', {
        revenue: { value: 1250000, label: '年收入', change: 23.5, trend: 'up' },
        expenses: { value: 875000, label: '总支出', change: 15.2, trend: 'up' },
        profit: { value: 375000, label: '净利润', change: 45.8, trend: 'up' }
      }),
      createTableSection('月度收入',
        ['月份', '收入', '支出', '利润'],
        [
          ['1 月', 95000, 72000, 23000],
          ['2 月', 98000, 70000, 28000],
          ['3 月', 102000, 75000, 27000],
          ['4 月', 105000, 73000, 32000],
          ['5 月', 108000, 76000, 32000],
          ['6 月', 112000, 78000, 34000]
        ]
      )
    ],
    metadata: {
      author: '财务部',
      version: '1.0',
      confidential: true
    }
  };
  
  // 导出为 Markdown
  const markdown = exportReport(reportData, {
    format: 'markdown',
    pretty: true
  });
  console.log('=== Markdown 格式 (前 500 字符) ===');
  console.log(markdown.substring(0, 500) + '...\n');
  
  // 导出为 JSON
  const json = exportReport(reportData, {
    format: 'json',
    pretty: true,
    includeMetadata: true
  });
  console.log('=== JSON 格式 (前 500 字符) ===');
  console.log(json.substring(0, 500) + '...\n');
  
  // 导出为 HTML
  const html = exportReport(reportData, {
    format: 'html'
  });
  console.log('=== HTML 格式 (前 500 字符) ===');
  console.log(html.substring(0, 500) + '...\n');
  
  // 导出为 CSV
  try {
    const csv = exportReport(reportData, {
      format: 'csv'
    });
    console.log('=== CSV 格式 ===');
    console.log(csv);
  } catch (e) {
    console.log('CSV 导出错误:', e);
  }
  
  return { markdown, json, html };
}

// ==================== 示例 6: 自定义模板 ====================

export function example6_customTemplate() {
  console.log('\n=== 示例 6: 使用不同模板 ===\n');
  
  const reportData: ReportData = {
    title: '用户体验研究报告',
    subtitle: '2026 年 Q1 用户满意度调查',
    generatedAt: Date.now(),
    sections: [
      createTextSection('研究背景',
        '本研究旨在了解用户对产品的满意度，收集改进建议，为下一季度的产品优化提供数据支持。',
        1
      ),
      createMetricsSection('满意度指标', {
        satisfaction: { value: 4.2, label: '总体满意度 (5 分制)', change: 0.3, trend: 'up' },
        nps: { value: 45, label: 'NPS 净推荐值', change: 8, trend: 'up' },
        retention: { value: '78%', label: '用户留存率', change: 5, trend: 'up' }
      }, 2),
      createChartSection('满意度分布', 'pie',
        ['非常满意', '满意', '一般', '不满意', '非常不满意'],
        [{ label: '用户数', data: [120, 200, 80, 30, 10] }],
        3
      )
    ]
  };
  
  // 使用标准模板
  console.log('--- 标准模板 ---');
  const standard = renderReport(reportData, 'standard');
  console.log(standard.substring(0, 400) + '...\n');
  
  // 使用执行摘要模板
  console.log('--- 执行摘要模板 ---');
  const executive = renderReport(reportData, 'executive');
  console.log(executive.substring(0, 400) + '...\n');
  
  // 使用详细报告模板
  console.log('--- 详细报告模板 ---');
  const detailed = renderReport(reportData, 'detailed');
  console.log(detailed.substring(0, 400) + '...\n');
  
  return { standard, executive, detailed };
}

// ==================== 运行所有示例 ====================

export function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       报告生成工具 - 使用示例演示                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  example1_basicAggregation();
  example2_mergeDataSources();
  example3_salesReport();
  example4_projectReport();
  example5_multiFormatExport();
  example6_customTemplate();
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                  所有示例运行完成 ✅                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
