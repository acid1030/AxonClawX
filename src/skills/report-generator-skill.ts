/**
 * 报告生成工具 - Report Generator Skill
 * 
 * 功能:
 * 1. 数据聚合 - 从多源聚合数据并计算统计指标
 * 2. 模板渲染 - 基于模板生成结构化报告
 * 3. 多格式导出 - 支持 Markdown、JSON、HTML、CSV 格式
 * 
 * @author Axon (via Subagent)
 * @version 1.0.0
 * @created 2026-03-13
 */

// ==================== 类型定义 ====================

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: number;
  sections: ReportSection[];
  metadata?: Record<string, any>;
}

export interface ReportSection {
  title: string;
  type: 'text' | 'table' | 'chart' | 'metrics' | 'list';
  content: any;
  order?: number;
}

export interface MetricsData {
  [key: string]: {
    value: number | string;
    label: string;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
  };
}

export interface TableData {
  headers: string[];
  rows: any[][];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface ReportTemplate {
  name: string;
  header?: string;
  footer?: string;
  sectionOrder: string[];
  styles?: Record<string, string>;
}

export interface ExportOptions {
  format: 'markdown' | 'json' | 'html' | 'csv';
  outputPath?: string;
  includeMetadata?: boolean;
  pretty?: boolean;
}

export interface AggregationConfig {
  groupBy?: string;
  aggregations: {
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median';
    alias?: string;
  }[];
  filters?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: any;
  }>;
}

// ==================== 数据聚合 ====================

/**
 * 聚合数据源
 */
export function aggregateData(
  data: any[],
  config: AggregationConfig
): any[] {
  let filtered = [...data];
  
  // 应用过滤器
  if (config.filters) {
    filtered = filtered.filter(item => {
      return config.filters!.every(filter => {
        const fieldValue = item[filter.field];
        switch (filter.operator) {
          case 'eq': return fieldValue === filter.value;
          case 'ne': return fieldValue !== filter.value;
          case 'gt': return fieldValue > filter.value;
          case 'lt': return fieldValue < filter.value;
          case 'gte': return fieldValue >= filter.value;
          case 'lte': return fieldValue <= filter.value;
          case 'contains': return String(fieldValue).includes(filter.value);
          default: return true;
        }
      });
    });
  }
  
  // 分组聚合
  if (config.groupBy) {
    const groups: Record<string, any[]> = {};
    filtered.forEach(item => {
      const key = item[config.groupBy!];
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    return Object.entries(groups).map(([key, items]) => {
      const aggregated: any = { [config.groupBy!]: key };
      config.aggregations.forEach(agg => {
        const values = items.map(i => i[agg.field]).filter(v => typeof v === 'number');
        aggregated[agg.alias || agg.field] = calculateAggregation(values, agg.operation);
      });
      return aggregated;
    });
  }
  
  // 无分组，直接聚合
  const aggregated: any = {};
  config.aggregations.forEach(agg => {
    const values = filtered
      .map(i => i[agg.field])
      .filter(v => typeof v === 'number');
    aggregated[agg.alias || agg.field] = calculateAggregation(values, agg.operation);
  });
  return [aggregated];
}

/**
 * 计算聚合值
 */
function calculateAggregation(values: number[], operation: string): number {
  if (values.length === 0) return 0;
  
  switch (operation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'median':
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
    default:
      return 0;
  }
}

/**
 * 合并多个数据源
 */
export function mergeDataSources(
  sources: { data: any[]; keyField: string }[],
  mergeType: 'inner' | 'left' | 'outer' = 'inner'
): any[] {
  if (sources.length === 0) return [];
  if (sources.length === 1) return sources[0].data;
  
  const [first, ...rest] = sources;
  let result = [...first.data];
  
  rest.forEach(source => {
    const lookup = new Map(source.data.map(item => [item[source.keyField], item]));
    
    result = result.map(item => {
      const matched = lookup.get(item[first.keyField]);
      if (matched) {
        return { ...item, ...matched };
      }
      return mergeType === 'left' || mergeType === 'outer' ? item : null;
    }).filter(Boolean) as any[];
    
    if (mergeType === 'outer') {
      source.data.forEach(item => {
        if (!result.find(r => r[first.keyField] === item[source.keyField])) {
          result.push(item);
        }
      });
    }
  });
  
  return result;
}

// ==================== 模板渲染 ====================

/**
 * 默认报告模板
 */
export const DEFAULT_TEMPLATES: Record<string, ReportTemplate> = {
  standard: {
    name: '标准报告',
    header: '# {{title}}\n\n{{subtitle}}\n\n---\n',
    footer: '\n---\n\n_生成时间：{{generatedAt}}_',
    sectionOrder: ['metrics', 'table', 'chart', 'text', 'list'],
    styles: {}
  },
  executive: {
    name: '执行摘要',
    header: '# {{title}}\n\n## 执行摘要\n\n{{subtitle}}\n\n',
    footer: '\n\n**报告生成**: {{generatedAt}}',
    sectionOrder: ['metrics', 'text', 'list'],
    styles: { compact: 'true' }
  },
  detailed: {
    name: '详细报告',
    header: '# {{title}}\n\n{{subtitle}}\n\n**生成时间**: {{generatedAt}}\n\n---\n\n',
    footer: '\n---\n\n_end of report_',
    sectionOrder: ['text', 'metrics', 'table', 'chart', 'list'],
    styles: {}
  }
};

/**
 * 渲染报告
 */
export function renderReport(
  data: ReportData,
  templateName: string = 'standard'
): string {
  const template = DEFAULT_TEMPLATES[templateName] || DEFAULT_TEMPLATES.standard;
  let output = '';
  
  // 渲染头部
  if (template.header) {
    output += template.header
      .replace('{{title}}', data.title)
      .replace('{{subtitle}}', data.subtitle || '')
      .replace('{{generatedAt}}', formatTimestamp(data.generatedAt));
  }
  
  // 按模板顺序渲染章节
  const sections = [...data.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  template.sectionOrder.forEach(sectionType => {
    const matchingSections = sections.filter(s => s.type === sectionType);
    matchingSections.forEach(section => {
      output += renderSection(section);
    });
  });
  
  // 渲染尾部
  if (template.footer) {
    output += template.footer
      .replace('{{generatedAt}}', formatTimestamp(data.generatedAt));
  }
  
  return output;
}

/**
 * 渲染单个章节
 */
function renderSection(section: ReportSection): string {
  switch (section.type) {
    case 'text':
      return `\n## ${section.title}\n\n${section.content}\n`;
    
    case 'metrics':
      return renderMetrics(section.title, section.content);
    
    case 'table':
      return renderTable(section.title, section.content);
    
    case 'chart':
      return renderChart(section.title, section.content);
    
    case 'list':
      return renderList(section.title, section.content);
    
    default:
      return `\n## ${section.title}\n\n${JSON.stringify(section.content)}\n`;
  }
}

/**
 * 渲染指标
 */
function renderMetrics(title: string, data: MetricsData): string {
  let output = `\n## ${title}\n\n`;
  Object.entries(data).forEach(([key, metric]) => {
    const trendIcon = metric.trend === 'up' ? '📈' : metric.trend === 'down' ? '📉' : '➡️';
    const changeText = metric.change !== undefined 
      ? ` (${metric.change > 0 ? '+' : ''}${metric.change}%)` 
      : '';
    output += `- **${metric.label}**: ${metric.value}${changeText} ${trendIcon}\n`;
  });
  return output;
}

/**
 * 渲染表格
 */
function renderTable(title: string, data: TableData): string {
  let output = `\n## ${title}\n\n`;
  
  // 表头
  output += '| ' + data.headers.join(' | ') + ' |\n';
  output += '| ' + data.headers.map(() => '---').join(' | ') + ' |\n';
  
  // 数据行
  data.rows.forEach(row => {
    output += '| ' + row.map(cell => String(cell)).join(' | ') + ' |\n';
  });
  
  return output + '\n';
}

/**
 * 渲染图表 (Markdown 兼容格式)
 */
function renderChart(title: string, data: ChartData): string {
  let output = `\n## ${title}\n\n`;
  
  if (data.type === 'bar' || data.type === 'line') {
    output += '```\n';
    const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
    const chartHeight = 10;
    
    for (let i = chartHeight; i >= 0; i--) {
      const threshold = (i / chartHeight) * maxValue;
      let line = '';
      data.datasets.forEach((dataset, idx) => {
        dataset.data.forEach((value, dataIdx) => {
          if (value >= threshold) {
            line += '█ ';
          } else {
            line += '  ';
          }
        });
      });
      output += line + '\n';
    }
    
    output += data.labels.map(l => l.substring(0, 3).padEnd(4)).join('') + '\n';
    output += '```\n';
  } else if (data.type === 'pie') {
    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    output += '```\n';
    data.datasets[0].data.forEach((value, idx) => {
      const percentage = ((value / total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(value / total * 20));
      output += `${data.labels[idx].padEnd(15)} ${bar} ${percentage}%\n`;
    });
    output += '```\n';
  }
  
  return output + '\n';
}

/**
 * 渲染列表
 */
function renderList(title: string, data: string[]): string {
  let output = `\n## ${title}\n\n`;
  data.forEach(item => {
    output += `- ${item}\n`;
  });
  return output + '\n';
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ==================== 多格式导出 ====================

/**
 * 导出报告
 */
export function exportReport(
  data: ReportData,
  options: ExportOptions
): string {
  switch (options.format) {
    case 'markdown':
      return exportAsMarkdown(data, options);
    case 'json':
      return exportAsJson(data, options);
    case 'html':
      return exportAsHtml(data, options);
    case 'csv':
      return exportAsCsv(data, options);
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
}

/**
 * 导出为 Markdown
 */
function exportAsMarkdown(data: ReportData, options: ExportOptions): string {
  return renderReport(data, 'standard');
}

/**
 * 导出为 JSON
 */
function exportAsJson(data: ReportData, options: ExportOptions): string {
  const output = options.includeMetadata 
    ? data 
    : { title: data.title, sections: data.sections };
  
  return options.pretty 
    ? JSON.stringify(output, null, 2) 
    : JSON.stringify(output);
}

/**
 * 导出为 HTML
 */
function exportAsHtml(data: ReportData, options: ExportOptions): string {
  const markdown = renderReport(data, 'standard');
  
  // 简单的 Markdown 转 HTML
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/gim, '<br>');
  
  // 包装为完整 HTML 文档
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
    h2 { color: #16213e; margin-top: 30px; }
    li { margin: 5px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #6366f1; color: white; }
    tr:nth-child(even) { background-color: #f5f5f5; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

/**
 * 导出为 CSV
 */
function exportAsCsv(data: ReportData, options: ExportOptions): string {
  const tableSections = data.sections.filter(s => s.type === 'table');
  
  if (tableSections.length === 0) {
    throw new Error('No table data to export as CSV');
  }
  
  let csv = '';
  tableSections.forEach((section, idx) => {
    if (idx > 0) csv += '\n\n';
    csv += `# ${section.title}\n`;
    
    const tableData: TableData = section.content;
    
    // 表头
    csv += tableData.headers.join(',') + '\n';
    
    // 数据行
    tableData.rows.forEach(row => {
      csv += row.map(cell => {
        const str = String(cell);
        return str.includes(',') || str.includes('"') 
          ? `"${str.replace(/"/g, '""')}"` 
          : str;
      }).join(',') + '\n';
    });
  });
  
  return csv;
}

// ==================== 快捷工具函数 ====================

/**
 * 创建指标章节
 */
export function createMetricsSection(
  title: string,
  metrics: MetricsData,
  order?: number
): ReportSection {
  return {
    title,
    type: 'metrics',
    content: metrics,
    order
  };
}

/**
 * 创建表格章节
 */
export function createTableSection(
  title: string,
  headers: string[],
  rows: any[][],
  order?: number
): ReportSection {
  return {
    title,
    type: 'table',
    content: { headers, rows },
    order
  };
}

/**
 * 创建文本章节
 */
export function createTextSection(
  title: string,
  content: string,
  order?: number
): ReportSection {
  return {
    title,
    type: 'text',
    content,
    order
  };
}

/**
 * 创建图表章节
 */
export function createChartSection(
  title: string,
  chartType: 'bar' | 'line' | 'pie',
  labels: string[],
  datasets: ChartData['datasets'],
  order?: number
): ReportSection {
  return {
    title,
    type: 'chart',
    content: { type: chartType, labels, datasets },
    order
  };
}

/**
 * 生成完整报告 (一站式)
 */
export function generateReport(
  title: string,
  sections: ReportSection[],
  subtitle?: string,
  template?: string
): string {
  const reportData: ReportData = {
    title,
    subtitle,
    generatedAt: Date.now(),
    sections
  };
  
  return renderReport(reportData, template || 'standard');
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import { 
 *   aggregateData, 
 *   generateReport, 
 *   createMetricsSection,
 *   createTableSection,
 *   exportReport
 * } from './report-generator-skill';
 * 
 * // 1. 数据聚合
 * const salesData = [
 *   { region: 'North', product: 'A', revenue: 1000, units: 50 },
 *   { region: 'North', product: 'B', revenue: 1500, units: 75 },
 *   { region: 'South', product: 'A', revenue: 800, units: 40 },
 *   { region: 'South', product: 'B', revenue: 1200, units: 60 }
 * ];
 * 
 * const aggregated = aggregateData(salesData, {
 *   groupBy: 'region',
 *   aggregations: [
 *     { field: 'revenue', operation: 'sum', alias: 'totalRevenue' },
 *     { field: 'units', operation: 'avg', alias: 'avgUnits' }
 *   ]
 * });
 * 
 * // 2. 创建报告章节
 * const sections = [
 *   createMetricsSection('关键指标', {
 *     revenue: { value: 4500, label: '总收入', change: 12.5, trend: 'up' },
 *     units: { value: 225, label: '总销量', change: -3.2, trend: 'down' }
 *   }, 1),
 *   
 *   createTableSection('区域销售', 
 *     ['区域', '总收入', '平均销量'],
 *     aggregated.map(r => [r.region, r.totalRevenue, r.avgUnits]),
 *     2
 *   ),
 *   
 *   createTextSection('分析总结', 
 *     '北部地区表现优异，南部地区有提升空间。建议加大南部市场投入。',
 *     3
 *   )
 * ];
 * 
 * // 3. 生成报告
 * const markdown = generateReport(
 *   '2026 Q1 销售报告',
 *   sections,
 *   '季度销售业绩分析',
 *   'standard'
 * );
 * 
 * // 4. 导出为不同格式
 * const jsonExport = exportReport(
 *   { title: '2026 Q1 销售报告', subtitle: '季度销售业绩分析', generatedAt: Date.now(), sections },
 *   { format: 'json', pretty: true }
 * );
 * 
 * const htmlExport = exportReport(
 *   { title: '2026 Q1 销售报告', subtitle: '季度销售业绩分析', generatedAt: Date.now(), sections },
 *   { format: 'html' }
 * );
 * ```
 */
export const USAGE_EXAMPLE = `
// 完整使用示例请查看文件末尾的 JSDoc 注释
`;
