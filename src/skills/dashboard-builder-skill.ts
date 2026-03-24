/**
 * Dashboard Builder Skill - 仪表板构建工具
 * 
 * 功能:
 * 1. 组件定义 - 定义和注册仪表板组件
 * 2. 布局管理 - 网格布局管理和响应式适配
 * 3. 数据绑定 - 动态数据绑定和实时更新
 * 
 * @author Axon (ACE Subagent)
 * @version 1.0.0
 * @dependencies 无 (纯 Node.js 原生模块)
 */

// ============== 类型定义 ==============

/** 组件类型 */
export type ComponentType = 
  | 'metric-card'      // 指标卡片
  | 'chart'           // 图表
  | 'table'           // 表格
  | 'feed'            // 实时 Feed
  | 'gauge'           // 仪表盘
  | 'progress'        // 进度条
  | 'text'            // 文本
  | 'iframe';         // 内嵌框架

/** 布局位置 */
export interface LayoutPosition {
  /** X 坐标 (列) */
  x: number;
  /** Y 坐标 (行) */
  y: number;
  /** 宽度 (列数) */
  w: number;
  /** 高度 (行数) */
  h: number;
}

/** 响应式断点 */
export type ResponsiveBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** 响应式配置 */
export interface ResponsiveConfig {
  /** 断点 */
  breakpoint: ResponsiveBreakpoint;
  /** 列数 */
  columns: number;
  /** 行高 (px) */
  rowHeight: number;
  /** 间距 (px) */
  margin: number;
}

/** 数据源类型 */
export type DataSourceType = 
  | 'static'          // 静态数据
  | 'api'            // API 接口
  | 'websocket'      // WebSocket
  | 'polling'        // 轮询
  | 'event';         // 事件驱动

/** 数据源配置 */
export interface DataSourceConfig {
  /** 数据源 ID */
  id: string;
  /** 数据源类型 */
  type: DataSourceType;
  /** 数据获取配置 */
  config: {
    /** 静态数据 */
    data?: any;
    /** API URL */
    url?: string;
    /** 请求方法 */
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    /** 请求头 */
    headers?: Record<string, string>;
    /** 轮询间隔 (ms) */
    interval?: number;
    /** WebSocket URL */
    wsUrl?: string;
    /** 事件名称 */
    eventName?: string;
  };
  /** 数据转换函数 */
  transform?: (data: any) => any;
  /** 错误处理函数 */
  onError?: (error: Error) => void;
}

/** 数据绑定配置 */
export interface DataBinding {
  /** 数据源 ID */
  dataSourceId: string;
  /** 数据路径 (支持嵌套，如 'user.name') */
  dataPath?: string;
  /** 刷新间隔 (ms) */
  refreshInterval?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存时间 (ms) */
  cacheTime?: number;
}

/** 组件配置 */
export interface ComponentConfig {
  /** 组件 ID */
  id: string;
  /** 组件类型 */
  type: ComponentType;
  /** 组件标题 */
  title?: string;
  /** 组件描述 */
  description?: string;
  /** 布局位置 */
  layout: LayoutPosition;
  /** 数据绑定 */
  dataBinding?: DataBinding;
  /** 组件特定配置 */
  props?: Record<string, any>;
  /** 样式配置 */
  style?: {
    /** 背景色 */
    backgroundColor?: string;
    /** 文字颜色 */
    color?: string;
    /** 边框 */
    border?: string;
    /** 圆角 */
    borderRadius?: string;
    /** 阴影 */
    boxShadow?: string;
  };
  /** 响应式布局 (可选) */
  responsiveLayout?: Partial<Record<ResponsiveBreakpoint, Partial<LayoutPosition>>>;
}

/** 仪表板配置 */
export interface DashboardConfig {
  /** 仪表板 ID */
  id: string;
  /** 仪表板名称 */
  name: string;
  /** 仪表板描述 */
  description?: string;
  /** 组件列表 */
  components: ComponentConfig[];
  /** 数据源列表 */
  dataSources: DataSourceConfig[];
  /** 响应式配置 */
  responsive?: ResponsiveConfig[];
  /** 主题配置 */
  theme?: {
    /** 主色调 */
    primaryColor?: string;
    /** 背景色 */
    backgroundColor?: string;
    /** 文字颜色 */
    textColor?: string;
    /** 字体 */
    fontFamily?: string;
  };
  /** 网格配置 */
  grid?: {
    /** 列数 */
    columns: number;
    /** 行高 (px) */
    rowHeight: number;
    /** 间距 (px) */
    margin: number;
  };
}

/** 组件实例 */
export interface ComponentInstance {
  /** 组件配置 */
  config: ComponentConfig;
  /** 当前数据 */
  data?: any;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error?: string;
  /** 最后更新时间 */
  lastUpdated?: number;
}

/** 仪表板实例 */
export interface DashboardInstance {
  /** 仪表板配置 */
  config: DashboardConfig;
  /** 组件实例映射 */
  components: Map<string, ComponentInstance>;
  /** 数据源实例映射 */
  dataSources: Map<string, DataSourceConfig>;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  lastUpdated: number;
}

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深拷贝对象
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 获取嵌套对象值
 */
function getNestedValue(obj: any, path: string): any {
  if (!path) return obj;
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

// ============== 组件库 ==============

/** 预定义组件模板 */
const ComponentTemplates: Record<ComponentType, Partial<ComponentConfig>> = {
  'metric-card': {
    props: {
      showTrend: true,
      trendPrecision: 2,
      showSubtitle: true,
    },
    layout: { x: 0, y: 0, w: 3, h: 2 },
    style: {
      backgroundColor: '#13131a',
      color: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 0 32px rgba(99, 102, 241, 0.1)',
    },
  },
  'chart': {
    props: {
      chartType: 'line',
      showLegend: true,
      showGrid: true,
      animation: true,
    },
    layout: { x: 0, y: 0, w: 6, h: 4 },
    style: {
      backgroundColor: '#13131a',
      borderRadius: '12px',
    },
  },
  'table': {
    props: {
      showHeader: true,
      striped: true,
      hoverable: true,
      pageSize: 10,
    },
    layout: { x: 0, y: 0, w: 12, h: 6 },
    style: {
      backgroundColor: '#13131a',
      borderRadius: '12px',
    },
  },
  'feed': {
    props: {
      autoScroll: true,
      maxItems: 100,
      showTimestamp: true,
      showBadge: true,
    },
    layout: { x: 0, y: 0, w: 6, h: 8 },
    style: {
      backgroundColor: '#13131a',
      borderRadius: '12px',
    },
  },
  'gauge': {
    props: {
      min: 0,
      max: 100,
      showValue: true,
      showLabel: true,
      gaugeColor: '#6366f1',
    },
    layout: { x: 0, y: 0, w: 3, h: 3 },
    style: {
      backgroundColor: '#13131a',
      borderRadius: '12px',
    },
  },
  'progress': {
    props: {
      showPercentage: true,
      showLabel: true,
      striped: false,
      animated: true,
    },
    layout: { x: 0, y: 0, w: 6, h: 1 },
    style: {
      backgroundColor: '#13131a',
      borderRadius: '8px',
    },
  },
  'text': {
    props: {
      fontSize: '14px',
      lineHeight: 1.6,
      textAlign: 'left',
    },
    layout: { x: 0, y: 0, w: 6, h: 2 },
    style: {
      backgroundColor: 'transparent',
      color: '#ffffff',
    },
  },
  'iframe': {
    props: {
      sandbox: 'allow-same-origin allow-scripts',
      loading: 'lazy',
    },
    layout: { x: 0, y: 0, w: 12, h: 8 },
    style: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
    },
  },
};

// ============== 主类 ==============

/**
 * Dashboard Builder - 仪表板构建器
 */
export class DashboardBuilder {
  /** 仪表板实例存储 */
  private dashboards: Map<string, DashboardInstance> = new Map();
  
  /** 组件模板注册表 */
  private componentRegistry: Map<string, Partial<ComponentConfig>> = new Map();
  
  /** 数据源运行时 */
  private dataSourceRuntimes: Map<string, any> = new Map();

  constructor() {
    // 注册预定义组件模板
    Object.entries(ComponentTemplates).forEach(([type, template]) => {
      this.componentRegistry.set(type, template);
    });
  }

  // ============== 组件管理 ==============

  /**
   * 创建组件
   */
  createComponent(
    type: ComponentType,
    overrides: Partial<ComponentConfig> = {}
  ): ComponentConfig {
    const template = this.componentRegistry.get(type);
    if (!template) {
      throw new Error(`Unknown component type: ${type}`);
    }

    const component: ComponentConfig = {
      id: generateId('comp'),
      type,
      title: overrides.title || `${type} Component`,
      layout: { ...template.layout!, ...overrides.layout },
      props: { ...template.props, ...overrides.props },
      style: { ...template.style, ...overrides.style },
      ...overrides,
    };

    return component;
  }

  /**
   * 注册自定义组件模板
   */
  registerComponentTemplate(
    type: string,
    template: Partial<ComponentConfig>
  ): void {
    this.componentRegistry.set(type, template);
  }

  /**
   * 获取组件模板
   */
  getComponentTemplate(type: string): Partial<ComponentConfig> | undefined {
    return this.componentRegistry.get(type);
  }

  // ============== 布局管理 ==============

  /**
   * 创建网格布局
   */
  createGridLayout(
    columns: number = 12,
    rowHeight: number = 80,
    margin: number = 16
  ): { columns: number; rowHeight: number; margin: number } {
    return { columns, rowHeight, margin };
  }

  /**
   * 自动排列组件 (简单算法)
   */
  autoLayoutComponents(
    components: ComponentConfig[],
    columns: number = 12
  ): ComponentConfig[] {
    const layoutComponents = deepClone(components);
    let currentX = 0;
    let currentY = 0;
    let rowMaxHeight = 0;

    layoutComponents.forEach((component) => {
      const width = component.layout.w || 3;
      const height = component.layout.h || 2;

      // 检查是否需要换行
      if (currentX + width > columns) {
        currentX = 0;
        currentY += rowMaxHeight;
        rowMaxHeight = 0;
      }

      component.layout.x = currentX;
      component.layout.y = currentY;
      
      currentX += width;
      rowMaxHeight = Math.max(rowMaxHeight, height);
    });

    return layoutComponents;
  }

  /**
   * 检查布局冲突
   */
  checkLayoutConflicts(components: ComponentConfig[]): Array<{
    component1: string;
    component2: string;
    overlap: LayoutPosition;
  }> {
    const conflicts: Array<{
      component1: string;
      component2: string;
      overlap: LayoutPosition;
    }> = [];

    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const comp1 = components[i];
        const comp2 = components[j];
        
        const overlap = this.getOverlap(comp1.layout, comp2.layout);
        if (overlap) {
          conflicts.push({
            component1: comp1.id,
            component2: comp2.id,
            overlap,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 计算两个布局的重叠区域
   */
  private getOverlap(
    layout1: LayoutPosition,
    layout2: LayoutPosition
  ): LayoutPosition | null {
    const x1 = Math.max(layout1.x, layout2.x);
    const y1 = Math.max(layout1.y, layout2.y);
    const x2 = Math.min(layout1.x + layout1.w, layout2.x + layout2.w);
    const y2 = Math.min(layout1.y + layout1.h, layout2.y + layout2.h);

    if (x1 < x2 && y1 < y2) {
      return {
        x: x1,
        y: y1,
        w: x2 - x1,
        h: y2 - y1,
      };
    }

    return null;
  }

  // ============== 数据源管理 ==============

  /**
   * 创建数据源
   */
  createDataSource(config: DataSourceConfig): DataSourceConfig {
    const dataSource: DataSourceConfig = {
      ...config,
      id: config.id || generateId('ds'),
    };

    // 验证配置
    if (config.type === 'static' && !config.config.data) {
      throw new Error('Static data source requires data');
    }
    if (config.type === 'api' && !config.config.url) {
      throw new Error('API data source requires URL');
    }
    if (config.type === 'websocket' && !config.config.wsUrl) {
      throw new Error('WebSocket data source requires wsUrl');
    }

    return dataSource;
  }

  /**
   * 获取数据 (模拟)
   */
  async fetchData(dataSource: DataSourceConfig): Promise<any> {
    try {
      switch (dataSource.type) {
        case 'static':
          return dataSource.config.data;
        
        case 'api':
          // 在实际实现中会调用 fetch/axios
          console.log(`[Dashboard] Fetching from API: ${dataSource.config.url}`);
          return { mock: 'api-data' };
        
        case 'websocket':
          console.log(`[Dashboard] WebSocket: ${dataSource.config.wsUrl}`);
          return { mock: 'ws-data' };
        
        case 'polling':
          console.log(`[Dashboard] Polling: ${dataSource.config.url}`);
          return { mock: 'poll-data', timestamp: Date.now() };
        
        case 'event':
          console.log(`[Dashboard] Event: ${dataSource.config.eventName}`);
          return { mock: 'event-data' };
        
        default:
          throw new Error(`Unknown data source type: ${dataSource.type}`);
      }
    } catch (error) {
      if (dataSource.onError) {
        dataSource.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * 转换数据
   */
  transformData(data: any, transform?: (data: any) => any): any {
    if (!transform) return data;
    return transform(data);
  }

  // ============== 数据绑定 ==============

  /**
   * 创建数据绑定
   */
  createDataBinding(
    dataSourceId: string,
    options: Partial<DataBinding> = {}
  ): DataBinding {
    return {
      dataSourceId,
      dataPath: options.dataPath,
      refreshInterval: options.refreshInterval,
      enableCache: options.enableCache ?? true,
      cacheTime: options.cacheTime ?? 5000,
    };
  }

  /**
   * 绑定数据到组件
   */
  bindDataToComponent(
    component: ComponentConfig,
    dataSource: DataSourceConfig,
    options: Partial<DataBinding> = {}
  ): ComponentConfig {
    const binding = this.createDataBinding(dataSource.id, options);
    return {
      ...component,
      dataBinding: binding,
    };
  }

  // ============== 仪表板构建 ==============

  /**
   * 创建仪表板
   */
  createDashboard(config: DashboardConfig): DashboardInstance {
    const dashboard: DashboardInstance = {
      config: {
        ...config,
        id: config.id || generateId('dash'),
      },
      components: new Map(),
      dataSources: new Map(),
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    // 初始化数据源
    config.dataSources.forEach((ds) => {
      dashboard.dataSources.set(ds.id, ds);
    });

    // 初始化组件
    config.components.forEach((comp) => {
      dashboard.components.set(comp.id, {
        config: comp,
        loading: false,
        lastUpdated: Date.now(),
      });
    });

    this.dashboards.set(dashboard.config.id, dashboard);
    return dashboard;
  }

  /**
   * 获取仪表板
   */
  getDashboard(id: string): DashboardInstance | undefined {
    return this.dashboards.get(id);
  }

  /**
   * 更新仪表板
   */
  updateDashboard(
    id: string,
    updates: Partial<DashboardConfig>
  ): DashboardInstance | undefined {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${id}`);
    }

    dashboard.config = { ...dashboard.config, ...updates };
    dashboard.lastUpdated = Date.now();

    return dashboard;
  }

  /**
   * 删除仪表板
   */
  deleteDashboard(id: string): boolean {
    return this.dashboards.delete(id);
  }

  /**
   * 列出所有仪表板
   */
  listDashboards(): Array<{ id: string; name: string; createdAt: number }> {
    return Array.from(this.dashboards.values()).map((dash) => ({
      id: dash.config.id,
      name: dash.config.name,
      createdAt: dash.createdAt,
    }));
  }

  // ============== 组件操作 ==============

  /**
   * 添加组件到仪表板
   */
  addComponent(
    dashboardId: string,
    component: ComponentConfig
  ): DashboardInstance {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    dashboard.components.set(component.id, {
      config: component,
      loading: false,
      lastUpdated: Date.now(),
    });
    dashboard.config.components.push(component);
    dashboard.lastUpdated = Date.now();

    return dashboard;
  }

  /**
   * 移除组件
   */
  removeComponent(dashboardId: string, componentId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const index = dashboard.config.components.findIndex(
      (c) => c.id === componentId
    );
    if (index !== -1) {
      dashboard.config.components.splice(index, 1);
      dashboard.components.delete(componentId);
      dashboard.lastUpdated = Date.now();
      return true;
    }

    return false;
  }

  /**
   * 更新组件
   */
  updateComponent(
    dashboardId: string,
    componentId: string,
    updates: Partial<ComponentConfig>
  ): ComponentInstance | undefined {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const instance = dashboard.components.get(componentId);
    if (!instance) {
      throw new Error(`Component not found: ${componentId}`);
    }

    instance.config = { ...instance.config, ...updates };
    instance.lastUpdated = Date.now();

    return instance;
  }

  // ============== 数据刷新 ==============

  /**
   * 刷新组件数据
   */
  async refreshComponentData(
    dashboardId: string,
    componentId: string
  ): Promise<ComponentInstance> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const instance = dashboard.components.get(componentId);
    if (!instance) {
      throw new Error(`Component not found: ${componentId}`);
    }

    if (!instance.config.dataBinding) {
      throw new Error('Component has no data binding');
    }

    const dataSource = dashboard.dataSources.get(
      instance.config.dataBinding.dataSourceId
    );
    if (!dataSource) {
      throw new Error(
        `Data source not found: ${instance.config.dataBinding.dataSourceId}`
      );
    }

    instance.loading = true;

    try {
      const rawData = await this.fetchData(dataSource);
      const transformedData = this.transformData(
        rawData,
        dataSource.transform
      );
      const boundData = instance.config.dataBinding.dataPath
        ? getNestedValue(transformedData, instance.config.dataBinding.dataPath)
        : transformedData;

      instance.data = boundData;
      instance.lastUpdated = Date.now();
      instance.error = undefined;

      return instance;
    } catch (error) {
      instance.error = (error as Error).message;
      throw error;
    } finally {
      instance.loading = false;
    }
  }

  /**
   * 刷新所有组件数据
   */
  async refreshAllComponents(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const promises = Array.from(dashboard.components.keys()).map((id) =>
      this.refreshComponentData(dashboardId, id).catch(() => {
        // 忽略单个组件刷新错误
      })
    );

    await Promise.all(promises);
  }

  // ============== 导出/导入 ==============

  /**
   * 导出仪表板配置为 JSON
   */
  exportDashboard(dashboardId: string): string {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    return JSON.stringify(dashboard.config, null, 2);
  }

  /**
   * 从 JSON 导入仪表板
   */
  importDashboard(json: string): DashboardInstance {
    const config: DashboardConfig = JSON.parse(json);
    return this.createDashboard(config);
  }

  /**
   * 导出为可渲染的布局配置
   */
  exportRenderConfig(dashboardId: string): any {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    return {
      id: dashboard.config.id,
      name: dashboard.config.name,
      grid: dashboard.config.grid || { columns: 12, rowHeight: 80, margin: 16 },
      components: dashboard.config.components.map((comp) => ({
        id: comp.id,
        type: comp.type,
        layout: comp.layout,
        props: comp.props,
        style: comp.style,
        data: dashboard.components.get(comp.id)?.data,
      })),
      theme: dashboard.config.theme,
    };
  }
}

// ============== 快捷创建函数 ==============

/**
 * 创建指标卡片组件
 */
export function createMetricCard(
  title: string,
  overrides: Partial<ComponentConfig> = {}
): ComponentConfig {
  const builder = new DashboardBuilder();
  return builder.createComponent('metric-card', {
    title,
    ...overrides,
  });
}

/**
 * 创建图表组件
 */
export function createChart(
  title: string,
  chartType: 'line' | 'bar' | 'pie' | 'area' = 'line',
  overrides: Partial<ComponentConfig> = {}
): ComponentConfig {
  const builder = new DashboardBuilder();
  return builder.createComponent('chart', {
    title,
    props: { chartType, ...overrides.props },
    ...overrides,
  });
}

/**
 * 创建仪表盘组件
 */
export function createGauge(
  title: string,
  min: number = 0,
  max: number = 100,
  overrides: Partial<ComponentConfig> = {}
): ComponentConfig {
  const builder = new DashboardBuilder();
  return builder.createComponent('gauge', {
    title,
    props: { min, max, ...overrides.props },
    ...overrides,
  });
}

/**
 * 创建实时 Feed 组件
 */
export function createFeed(
  title: string,
  overrides: Partial<ComponentConfig> = {}
): ComponentConfig {
  const builder = new DashboardBuilder();
  return builder.createComponent('feed', {
    title,
    ...overrides,
  });
}

/**
 * 创建表格组件
 */
export function createTable(
  title: string,
  overrides: Partial<ComponentConfig> = {}
): ComponentConfig {
  const builder = new DashboardBuilder();
  return builder.createComponent('table', {
    title,
    ...overrides,
  });
}

// ============== 使用示例 ==============

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import { 
 *   DashboardBuilder,
 *   createMetricCard,
 *   createChart,
 *   createGauge 
 * } from './dashboard-builder-skill';
 * 
 * // 1. 创建构建器
 * const builder = new DashboardBuilder();
 * 
 * // 2. 创建数据源
 * const cpuDataSource = builder.createDataSource({
 *   id: 'cpu-data',
 *   type: 'polling',
 *   config: {
 *     url: '/api/system/cpu',
 *     interval: 5000,
 *   },
 * });
 * 
 * // 3. 创建组件
 * const cpuCard = createMetricCard('CPU 使用率', {
 *   layout: { x: 0, y: 0, w: 3, h: 2 },
 *   props: { unit: '%', precision: 1 },
 * });
 * 
 * const memoryGauge = createGauge('内存使用', 0, 100, {
 *   layout: { x: 3, y: 0, w: 3, h: 3 },
 *   props: { gaugeColor: '#6366f1' },
 * });
 * 
 * const networkChart = createChart('网络流量', 'line', {
 *   layout: { x: 0, y: 2, w: 6, h: 4 },
 *   props: { showLegend: true },
 * });
 * 
 * // 4. 绑定数据
 * const cpuCardWithBinding = builder.bindDataToComponent(
 *   cpuCard,
 *   cpuDataSource,
 *   { dataPath: 'usage', refreshInterval: 5000 }
 * );
 * 
 * // 5. 创建仪表板
 * const dashboard = builder.createDashboard({
 *   id: 'system-monitor',
 *   name: '系统监控仪表板',
 *   components: [cpuCardWithBinding, memoryGauge, networkChart],
 *   dataSources: [cpuDataSource],
 *   grid: { columns: 12, rowHeight: 80, margin: 16 },
 *   theme: {
 *     primaryColor: '#6366f1',
 *     backgroundColor: '#0a0a0f',
 *     textColor: '#ffffff',
 *   },
 * });
 * 
 * // 6. 导出配置
 * const config = builder.exportRenderConfig('system-monitor');
 * console.log(JSON.stringify(config, null, 2));
 * 
 * // 7. 刷新数据
 * await builder.refreshComponentData('system-monitor', cpuCard.id);
 * ```
 */
export const EXAMPLE_USAGE = `
// 完整示例请查看上方的 @example 注释
`;

// ============== 导出 ==============

export default DashboardBuilder;
