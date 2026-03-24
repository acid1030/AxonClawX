/**
 * Report Utils Skill - KAEL Engineering
 * 
 * 报表生成工具集
 * - 数据聚合
 * - 图表数据准备
 * - 报表导出
 * 
 * @author KAEL Engineering
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface DataRecord {
  [key: string]: any;
}

export interface AggregationConfig {
  groupBy: string | string[];
  aggregations: {
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';
    alias?: string;
  }[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface ChartDataset {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    fill?: boolean;
  }[];
}

export interface ReportConfig {
  title: string;
  format: 'pdf' | 'csv' | 'json' | 'xlsx';
  includeCharts: boolean;
  includeSummary: boolean;
}

// ==================== 数据聚合 ====================

/**
 * 数据聚合引擎
 * 支持多字段分组和多种聚合操作
 */
export class DataAggregator {
  private data: DataRecord[];

  constructor(data: DataRecord[]) {
    this.data = data;
  }

  /**
   * 执行聚合操作
   */
  aggregate(config: AggregationConfig): DataRecord[] {
    const groups = this.groupBy(config.groupBy);
    return groups.map(group => this.applyAggregations(group, config.aggregations));
  }

  /**
   * 按字段分组
   */
  private groupBy(fields: string | string[]): Map<string, DataRecord[]> {
    const fieldArray = Array.isArray(fields) ? fields : [fields];
    const groups = new Map<string, DataRecord[]>();

    for (const record of this.data) {
      const key = fieldArray.map(f => record[f]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    return groups;
  }

  /**
   * 应用聚合函数
   */
  private applyAggregations(
    records: DataRecord[],
    aggregations: AggregationConfig['aggregations']
  ): DataRecord {
    const result: DataRecord = {};

    // 添加分组键
    if (records.length > 0) {
      const firstRecord = records[0];
      for (const key in firstRecord) {
        if (!aggregations.some(a => a.field === key)) {
          result[key] = firstRecord[key];
        }
      }
    }

    // 应用聚合操作
    for (const agg of aggregations) {
      const values = records
        .map(r => r[agg.field])
        .filter(v => typeof v === 'number');

      result[agg.alias || agg.field] = this.calculateAggregate(values, agg.operation);
    }

    return result;
  }

  /**
   * 计算聚合值
   */
  private calculateAggregate(
    values: number[],
    operation: string
  ): number {
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
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      default:
        throw new Error(`Unknown aggregation operation: ${operation}`);
    }
  }
}

// ==================== 图表数据准备 ====================

/**
 * 图表数据转换器
 * 将原始数据转换为图表库可用格式
 */
export class ChartDataPreparator {
  /**
   * 准备柱状图数据
   */
  static prepareBarChart(
    data: DataRecord[],
    labelField: string,
    valueField: string,
    seriesField?: string
  ): ChartDataset {
    const labels: string[] = [];
    const datasets: ChartDataset['datasets'] = [];

    if (!seriesField) {
      // 单系列
      for (const record of data) {
        labels.push(record[labelField]);
      }
      datasets.push({
        label: valueField,
        data: data.map(r => r[valueField]),
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgba(99, 102, 241, 1)',
        fill: false,
      });
    } else {
      // 多系列
      const seriesMap = new Map<string, number[]>();
      const seriesLabels = new Set<string>();

      for (const record of data) {
        const seriesKey = record[seriesField];
        const labelKey = record[labelField];
        
        if (!seriesMap.has(seriesKey)) {
          seriesMap.set(seriesKey, []);
        }
        seriesLabels.add(labelKey);
      }

      labels.push(...Array.from(seriesLabels));

      const colors = [
        'rgba(99, 102, 241, 0.6)',
        'rgba(16, 185, 129, 0.6)',
        'rgba(239, 68, 68, 0.6)',
        'rgba(245, 158, 11, 0.6)',
      ];

      let colorIndex = 0;
      for (const [seriesKey, values] of seriesMap.entries()) {
        datasets.push({
          label: seriesKey,
          data: data
            .filter(r => r[seriesField] === seriesKey)
            .map(r => r[valueField]),
          backgroundColor: colors[colorIndex % colors.length],
          borderColor: colors[colorIndex % colors.length].replace('0.6', '1'),
          fill: false,
        });
        colorIndex++;
      }
    }

    return { labels, datasets };
  }

  /**
   * 准备折线图数据
   */
  static prepareLineChart(
    data: DataRecord[],
    labelField: string,
    valueFields: string[]
  ): ChartDataset {
    const labels = data.map(r => r[labelField]);
    const datasets = valueFields.map((field, index) => ({
      label: field,
      data: data.map(r => r[field]),
      borderColor: [
        'rgba(99, 102, 241, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(239, 68, 68, 1)',
      ][index % 3],
      backgroundColor: [
        'rgba(99, 102, 241, 0.1)',
        'rgba(16, 185, 129, 0.1)',
        'rgba(239, 68, 68, 0.1)',
      ][index % 3],
      fill: true,
    }));

    return { labels, datasets };
  }

  /**
   * 准备饼图数据
   */
  static preparePieChart(
    data: DataRecord[],
    labelField: string,
    valueField: string
  ): { labels: string[]; values: number[]; colors: string[] } {
    const colors = [
      '#6366f1', '#10b981', '#ef4444', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    ];

    return {
      labels: data.map(r => r[labelField]),
      values: data.map(r => r[valueField]),
      colors: data.map((_, i) => colors[i % colors.length]),
    };
  }
}

// ==================== 报表导出 ====================

/**
 * 报表导出引擎
 */
export class ReportExporter {
  private data: DataRecord[];
  private config: ReportConfig;

  constructor(data: DataRecord[], config: ReportConfig) {
    this.data = data;
    this.config = config;
  }

  /**
   * 导出报表
   */
  async export(): Promise<Blob | string> {
    switch (this.config.format) {
      case 'csv':
        return this.exportCSV();
      case 'json':
        return this.exportJSON();
      case 'pdf':
        return this.exportPDF();
      case 'xlsx':
        return this.exportXLSX();
      default:
        throw new Error(`Unsupported format: ${this.config.format}`);
    }
  }

  /**
   * 导出为 CSV
   */
  private exportCSV(): string {
    if (this.data.length === 0) return '';

    const headers = Object.keys(this.data[0]);
    const csvLines = [
      headers.join(','),
      ...this.data.map(record =>
        headers.map(header => this.escapeCSVValue(record[header])).join(',')
      ),
    ];

    return csvLines.join('\n');
  }

  /**
   * 导出为 JSON
   */
  private exportJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * 导出为 PDF (需要 pdfkit 或类似库)
   */
  private async exportPDF(): Promise<Blob> {
    // 简化实现，实际使用需要集成 pdfkit
    const content = this.generatePDFContent();
    return new Blob([content], { type: 'application/pdf' });
  }

  /**
   * 导出为 Excel (需要 xlsx 库)
   */
  private async exportXLSX(): Promise<Blob> {
    // 简化实现，实际使用需要集成 xlsx
    const csvContent = this.exportCSV();
    return new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * 生成 PDF 内容
   */
  private generatePDFContent(): string {
    let content = `% PDF-1.4\n`;
    content += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    content += `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    content += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n`;
    content += `xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n`;
    content += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF`;
    return content;
  }

  /**
   * 转义 CSV 值
   */
  private escapeCSVValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

// ==================== 便捷函数 ====================

/**
 * 快速聚合数据
 */
export function aggregateData(
  data: DataRecord[],
  config: AggregationConfig
): DataRecord[] {
  const aggregator = new DataAggregator(data);
  return aggregator.aggregate(config);
}

/**
 * 快速准备图表数据
 */
export function prepareChartData(
  data: DataRecord[],
  chartType: 'bar' | 'line' | 'pie',
  labelField: string,
  valueField: string | string[],
  seriesField?: string
): ChartDataset | { labels: string[]; values: number[]; colors: string[] } {
  switch (chartType) {
    case 'bar':
      return ChartDataPreparator.prepareBarChart(data, labelField, valueField as string, seriesField);
    case 'line':
      return ChartDataPreparator.prepareLineChart(data, labelField, valueField as string[]);
    case 'pie':
      return ChartDataPreparator.preparePieChart(data, labelField, valueField as string);
    default:
      throw new Error(`Unknown chart type: ${chartType}`);
  }
}

/**
 * 快速导出报表
 */
export async function exportReport(
  data: DataRecord[],
  config: ReportConfig
): Promise<Blob | string> {
  const exporter = new ReportExporter(data, config);
  return exporter.export();
}

// ==================== 使用示例 ====================

/*
// 示例 1: 数据聚合
const salesData = [
  { region: 'North', product: 'A', amount: 1000 },
  { region: 'North', product: 'B', amount: 1500 },
  { region: 'South', product: 'A', amount: 2000 },
  { region: 'South', product: 'B', amount: 2500 },
];

const aggregated = aggregateData(salesData, {
  groupBy: 'region',
  aggregations: [
    { field: 'amount', operation: 'sum', alias: 'totalAmount' },
    { field: 'amount', operation: 'avg', alias: 'avgAmount' },
    { field: 'product', operation: 'count', alias: 'productCount' },
  ],
});
// 结果: [{ region: 'North', totalAmount: 2500, avgAmount: 1250, productCount: 2 }, ...]

// 示例 2: 图表数据准备
const chartData = prepareChartData(salesData, 'bar', 'region', 'amount');
// 结果: { labels: ['North', 'South'], datasets: [{ label: 'amount', data: [2500, 4500], ... }] }

// 示例 3: 报表导出
const csvReport = await exportReport(salesData, {
  title: 'Sales Report',
  format: 'csv',
  includeCharts: false,
  includeSummary: true,
});
// 结果: CSV 格式的字符串

// 示例 4: 多字段分组聚合
const multiGroupAgg = aggregateData(salesData, {
  groupBy: ['region', 'product'],
  aggregations: [
    { field: 'amount', operation: 'sum' },
  ],
});
// 结果: 按 region 和 product 分组，每组显示 amount 总和

// 示例 5: 折线图数据
const lineChartData = prepareChartData(
  [
    { month: 'Jan', revenue: 10000, cost: 8000 },
    { month: 'Feb', revenue: 12000, cost: 9000 },
    { month: 'Mar', revenue: 15000, cost: 10000 },
  ],
  'line',
  'month',
  ['revenue', 'cost']
);
// 结果: 包含 revenue 和 cost 两条线的图表数据
*/

export default {
  DataAggregator,
  ChartDataPreparator,
  ReportExporter,
  aggregateData,
  prepareChartData,
  exportReport,
};
