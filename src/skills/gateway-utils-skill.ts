/**
 * Gateway Utils Skill - API 网关工具
 * 
 * 功能:
 * 1. 路由转发 - 基于规则的请求路由到不同后端服务
 * 2. 请求聚合 - 并行调用多个服务并聚合响应
 * 3. 协议转换 - HTTP/HTTPS/WebSocket 协议适配
 * 
 * @module gateway-utils-skill
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 请求头类型
 */
export type Headers = Record<string, string>;

/**
 * 查询参数类型
 */
export type QueryParams = Record<string, string | string[]>;

/**
 * 路由规则配置
 */
export interface RouteRule {
  /** 匹配路径模式 (支持通配符 * 和参数 :param) */
  pattern: string;
  /** HTTP 方法 */
  method?: HttpMethod | '*';
  /** 目标后端服务 URL */
  target: string;
  /** 是否保留原始路径 */
  preservePath?: boolean;
  /** 请求头转换规则 */
  headers?: Headers;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 优先级 (数字越大优先级越高) */
  priority?: number;
}

/**
 * 聚合请求配置
 */
export interface AggregateRequest {
  /** 请求 ID */
  id: string;
  /** 子请求列表 */
  requests: SubRequest[];
  /** 聚合模式 */
  mode: 'parallel' | 'sequential' | 'waterfall';
  /** 是否快速失败 */
  failFast?: boolean;
  /** 超时时间 (ms) */
  timeout?: number;
}

/**
 * 子请求配置
 */
export interface SubRequest {
  /** 子请求 ID */
  id: string;
  /** 请求 URL */
  url: string;
  /** HTTP 方法 */
  method?: HttpMethod;
  /** 请求头 */
  headers?: Headers;
  /** 请求体 */
  body?: any;
  /** 依赖的子请求 ID (用于 waterfall 模式) */
  dependsOn?: string[];
  /** 响应转换函数 */
  transform?: (response: any) => any;
}

/**
 * 协议转换配置
 */
export interface ProtocolTransform {
  /** 源协议 */
  from: 'http' | 'https' | 'ws' | 'wss';
  /** 目标协议 */
  to: 'http' | 'https' | 'ws' | 'wss';
  /** 转换规则 */
  rules: TransformRule[];
}

/**
 * 转换规则
 */
export interface TransformRule {
  /** 匹配条件 */
  match: {
    path?: string;
    headers?: Headers;
    method?: HttpMethod;
  };
  /** 转换操作 */
  transform: {
    path?: (path: string) => string;
    headers?: (headers: Headers) => Headers;
    body?: (body: any) => any;
    method?: (method: HttpMethod) => HttpMethod;
  };
}

/**
 * 网关请求上下文
 */
export interface GatewayContext {
  /** 请求 ID */
  requestId: string;
  /** 原始请求 URL */
  url: string;
  /** HTTP 方法 */
  method: HttpMethod;
  /** 请求头 */
  headers: Headers;
  /** 查询参数 */
  query: QueryParams;
  /** 请求体 */
  body?: any;
  /** 匹配的路由规则 */
  route?: RouteRule;
  /** 开始时间戳 */
  timestamp: number;
}

/**
 * 网关响应
 */
export interface GatewayResponse {
  /** 请求 ID */
  requestId: string;
  /** HTTP 状态码 */
  statusCode: number;
  /** 响应头 */
  headers: Headers;
  /** 响应体 */
  body: any;
  /** 处理时间 (ms) */
  duration: number;
  /** 错误信息 (如果有) */
  error?: string;
  /** 来源服务 */
  source?: string;
}

/**
 * 聚合响应
 */
export interface AggregateResponse {
  /** 聚合请求 ID */
  id: string;
  /** 各子请求响应 */
  responses: Record<string, SubResponse>;
  /** 聚合后的数据 */
  aggregated?: any;
  /** 总处理时间 (ms) */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 (如果有) */
  error?: string;
}

/**
 * 子请求响应
 */
export interface SubResponse {
  /** 状态码 */
  statusCode: number;
  /** 响应体 */
  data: any;
  /** 处理时间 (ms) */
  duration: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 负载均衡策略
 */
export type LoadBalanceStrategy = 'round-robin' | 'least-connections' | 'weighted' | 'random';

/**
 * 后端服务配置
 */
export interface BackendService {
  /** 服务 ID */
  id: string;
  /** 服务 URL */
  url: string;
  /** 权重 (用于 weighted 策略) */
  weight?: number;
  /** 健康检查 URL */
  healthCheck?: string;
  /** 是否健康 */
  healthy?: boolean;
  /** 当前连接数 */
  connections?: number;
}

// ==================== 工具函数 ====================

/**
 * 生成唯一请求 ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

/**
 * 解析 URL 参数
 */
export function parseUrlParams(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      // 动态参数
      const paramName = patternPart.substring(1);
      params[paramName] = decodeURIComponent(pathPart);
    } else if (patternPart === '*') {
      // 通配符 - 匹配剩余路径
      const remainingPath = pathParts.slice(i).join('/');
      params['*'] = remainingPath;
      break;
    } else if (patternPart !== pathPart) {
      // 不匹配
      return null;
    }
  }

  return params;
}

/**
 * 匹配路由规则
 */
export function matchRoute(pattern: string, path: string): boolean {
  // 精确匹配
  if (pattern === path) return true;

  // 通配符匹配
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:\w+/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  // 参数匹配
  return parseUrlParams(pattern, path) !== null;
}

/**
 * 合并请求头
 */
export function mergeHeaders(...headersList: Headers[]): Headers {
  return headersList.reduce((acc, headers) => ({ ...acc, ...headers }), {});
}

/**
 * 解析查询参数
 */
export function parseQueryString(queryString: string): QueryParams {
  if (!queryString) return {};

  const params: QueryParams = {};
  const pairs = queryString.replace(/^\?/, '').split('&');

  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    if (key) {
      if (params[key]) {
        const existing = params[key];
        params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      } else {
        params[key] = value;
      }
    }
  }

  return params;
}

// ==================== 网关核心类 ====================

/**
 * API 网关类
 */
export class Gateway {
  private routes: RouteRule[] = [];
  private backends: Map<string, BackendService[]> = new Map();
  private lbStrategy: LoadBalanceStrategy = 'round-robin';
  private lbIndex: Map<string, number> = new Map();
  private protocolTransforms: ProtocolTransform[] = [];

  /**
   * 设置负载均衡策略
   */
  setLoadBalanceStrategy(strategy: LoadBalanceStrategy): Gateway {
    this.lbStrategy = strategy;
    return this;
  }

  /**
   * 注册后端服务
   */
  registerBackend(serviceId: string, services: BackendService[]): Gateway {
    this.backends.set(serviceId, services);
    return this;
  }

  /**
   * 添加路由规则
   */
  addRoute(rule: RouteRule): Gateway {
    this.routes.push(rule);
    // 按优先级排序
    this.routes.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return this;
  }

  /**
   * 批量添加路由规则
   */
  addRoutes(rules: RouteRule[]): Gateway {
    rules.forEach(rule => this.addRoute(rule));
    return this;
  }

  /**
   * 添加协议转换规则
   */
  addProtocolTransform(transform: ProtocolTransform): Gateway {
    this.protocolTransforms.push(transform);
    return this;
  }

  /**
   * 匹配路由规则
   */
  matchRoute(ctx: GatewayContext): RouteRule | null {
    for (const route of this.routes) {
      // 检查方法匹配
      if (route.method !== '*' && route.method !== ctx.method) {
        continue;
      }

      // 检查路径匹配
      const urlObj = new URL(ctx.url, 'http://localhost');
      if (matchRoute(route.pattern, urlObj.pathname)) {
        return route;
      }
    }

    return null;
  }

  /**
   * 选择后端服务 (负载均衡)
   */
  selectBackend(serviceId: string): BackendService | null {
    const services = this.backends.get(serviceId);
    if (!services || services.length === 0) return null;

    const healthyServices = services.filter(s => s.healthy !== false);
    if (healthyServices.length === 0) return null;

    switch (this.lbStrategy) {
      case 'round-robin':
        return this.selectRoundRobin(serviceId, healthyServices);
      case 'least-connections':
        return this.selectLeastConnections(healthyServices);
      case 'weighted':
        return this.selectWeighted(healthyServices);
      case 'random':
        return healthyServices[Math.floor(Math.random() * healthyServices.length)];
      default:
        return healthyServices[0];
    }
  }

  private selectRoundRobin(serviceId: string, services: BackendService[]): BackendService {
    let index = this.lbIndex.get(serviceId) || 0;
    const service = services[index % services.length];
    this.lbIndex.set(serviceId, (index + 1) % services.length);
    return service;
  }

  private selectLeastConnections(services: BackendService[]): BackendService {
    return services.reduce((min, service) => 
      (service.connections || 0) < (min.connections || 0) ? service : min
    );
  }

  private selectWeighted(services: BackendService[]): BackendService {
    const totalWeight = services.reduce((sum, s) => sum + (s.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const service of services) {
      random -= (service.weight || 1);
      if (random <= 0) return service;
    }
    
    return services[services.length - 1];
  }

  /**
   * 转发请求
   */
  async forward(ctx: GatewayContext): Promise<GatewayResponse> {
    const startTime = Date.now();
    const route = this.matchRoute(ctx);

    if (!route) {
      return {
        requestId: ctx.requestId,
        statusCode: 404,
        headers: {},
        body: { error: 'No matching route found' },
        duration: Date.now() - startTime,
        error: 'No matching route'
      };
    }

    ctx.route = route;

    // 应用协议转换
    const transformedCtx = this.applyProtocolTransform(ctx);

    // 构建目标 URL
    const targetUrl = this.buildTargetUrl(route, transformedCtx);

    try {
      // 发送请求
      const response = await this.sendRequest(targetUrl, {
        method: transformedCtx.method,
        headers: mergeHeaders(transformedCtx.headers, route.headers || {}),
        body: transformedCtx.body,
        timeout: route.timeout || 30000
      });

      return {
        requestId: ctx.requestId,
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
        duration: Date.now() - startTime,
        source: route.target
      };
    } catch (error: any) {
      return {
        requestId: ctx.requestId,
        statusCode: 502,
        headers: {},
        body: { error: error.message },
        duration: Date.now() - startTime,
        error: error.message,
        source: route.target
      };
    }
  }

  /**
   * 构建目标 URL
   */
  private buildTargetUrl(route: RouteRule, ctx: GatewayContext): string {
    const urlObj = new URL(ctx.url, 'http://localhost');
    let targetPath = route.preservePath ? urlObj.pathname : '/';

    // 如果有动态参数，进行替换
    const params = parseUrlParams(route.pattern, urlObj.pathname);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        targetPath = targetPath.replace(`:${key}`, value);
      }
    }

    // 保留查询参数
    const queryString = urlObj.search;
    return `${route.target}${targetPath}${queryString}`;
  }

  /**
   * 应用协议转换
   */
  private applyProtocolTransform(ctx: GatewayContext): GatewayContext {
    let transformed = { ...ctx };

    for (const transform of this.protocolTransforms) {
      for (const rule of transform.rules) {
        // 检查匹配条件
        if (rule.match.path && !matchRoute(rule.match.path, ctx.url)) continue;
        if (rule.match.method && rule.match.method !== ctx.method) continue;

        // 应用转换
        if (rule.transform.path) {
          const urlObj = new URL(transformed.url, 'http://localhost');
          urlObj.pathname = rule.transform.path(urlObj.pathname);
          transformed.url = urlObj.toString();
        }
        if (rule.transform.headers) {
          transformed.headers = rule.transform.headers(transformed.headers);
        }
        if (rule.transform.body && transformed.body) {
          transformed.body = rule.transform.body(transformed.body);
        }
        if (rule.transform.method) {
          transformed.method = rule.transform.method(transformed.method);
        }
      }
    }

    return transformed;
  }

  /**
   * 发送 HTTP 请求
   */
  private async sendRequest(
    url: string,
    options: {
      method: HttpMethod;
      headers: Headers;
      body?: any;
      timeout: number;
    }
  ): Promise<{ statusCode: number; headers: Headers; body: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let body;

      if (contentType.includes('application/json')) {
        body = await response.json();
      } else if (contentType.includes('text/')) {
        body = await response.text();
      } else {
        body = await response.arrayBuffer();
      }

      const headers: Headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        statusCode: response.status,
        headers,
        body
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 聚合请求
   */
  async aggregate(request: AggregateRequest): Promise<AggregateResponse> {
    const startTime = Date.now();
    const responses: Record<string, SubResponse> = {};
    let hasError = false;

    try {
      if (request.mode === 'parallel') {
        // 并行模式
        const promises = request.requests.map(subReq => 
          this.executeSubRequest(subReq, responses)
            .then(res => ({ id: subReq.id, res }))
            .catch(err => ({ id: subReq.id, error: err }))
        );

        const results = await Promise.all(request.failFast 
          ? promises.map(p => p.then(r => { if (r.error) throw r.error; return r; }))
          : promises
        );

        for (const result of results) {
          if ('error' in result && result.error) {
            hasError = true;
            responses[result.id] = {
              statusCode: 500,
              data: null,
              duration: 0,
              error: String(result.error)
            };
          } else if ('res' in result) {
            responses[result.id] = result.res;
          }
        }
      } else if (request.mode === 'sequential') {
        // 顺序模式
        for (const subReq of request.requests) {
          try {
            responses[subReq.id] = await this.executeSubRequest(subReq, responses);
          } catch (error: any) {
            hasError = true;
            if (request.failFast) throw error;
            responses[subReq.id] = {
              statusCode: 500,
              data: null,
              duration: 0,
              error: error.message
            };
          }
        }
      } else if (request.mode === 'waterfall') {
        // 瀑布模式 (按依赖顺序执行)
        const executed = new Set<string>();
        const pending = [...request.requests];

        while (pending.length > 0) {
          const ready = pending.filter(req => 
            !req.dependsOn || req.dependsOn.every(id => executed.has(id))
          );

          if (ready.length === 0) {
            throw new Error('Circular dependency detected');
          }

          const results = await Promise.all(
            ready.map(subReq => 
              this.executeSubRequest(subReq, responses)
                .then(res => ({ id: subReq.id, res }))
                .catch(err => ({ id: subReq.id, error: err }))
            )
          );

          for (const result of results) {
            executed.add(result.id);
            if ('error' in result && result.error) {
              hasError = true;
              responses[result.id] = {
                statusCode: 500,
                data: null,
                duration: 0,
                error: String(result.error)
              };
            } else if ('res' in result) {
              responses[result.id] = result.res;
            }
          }

          // 移除已执行的请求
          for (let i = pending.length - 1; i >= 0; i--) {
            if (executed.has(pending[i].id)) {
              pending.splice(i, 1);
            }
          }
        }
      }

      // 聚合响应
      const aggregated = this.aggregateResponses(request, responses);

      return {
        id: request.id,
        responses,
        aggregated,
        duration: Date.now() - startTime,
        success: !hasError
      };
    } catch (error: any) {
      return {
        id: request.id,
        responses,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行子请求
   */
  private async executeSubRequest(
    subReq: SubRequest,
    existingResponses: Record<string, SubResponse>
  ): Promise<SubResponse> {
    const startTime = Date.now();
    let url = subReq.url;

    // 如果有依赖，替换 URL 中的变量
    if (subReq.dependsOn) {
      for (const depId of subReq.dependsOn) {
        const depResp = existingResponses[depId];
        if (depResp && depResp.data) {
          url = url.replace(`\${${depId}}`, JSON.stringify(depResp.data));
        }
      }
    }

    try {
      const response = await fetch(url, {
        method: subReq.method || 'GET',
        headers: subReq.headers || {},
        body: subReq.body ? JSON.stringify(subReq.body) : undefined
      });

      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // 应用响应转换
      if (subReq.transform) {
        data = subReq.transform(data);
      }

      return {
        statusCode: response.status,
        data,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        data: null,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 聚合响应
   */
  private aggregateResponses(
    request: AggregateRequest,
    responses: Record<string, SubResponse>
  ): any {
    const aggregated: any = {};

    for (const [id, response] of Object.entries(responses)) {
      aggregated[id] = response.data;
    }

    return aggregated;
  }
}

// ==================== 快捷工厂函数 ====================

/**
 * 创建网关实例
 */
export function createGateway(): Gateway {
  return new Gateway();
}

/**
 * 创建路由规则
 */
export function createRouteRule(config: Partial<RouteRule>): RouteRule {
  return {
    pattern: config.pattern || '/',
    target: config.target || '',
    method: config.method || '*',
    preservePath: config.preservePath ?? true,
    headers: config.headers || {},
    timeout: config.timeout || 30000,
    retries: config.retries || 0,
    priority: config.priority || 0
  };
}

/**
 * 创建聚合请求
 */
export function createAggregateRequest(config: Partial<AggregateRequest>): AggregateRequest {
  return {
    id: config.id || generateRequestId(),
    requests: config.requests || [],
    mode: config.mode || 'parallel',
    failFast: config.failFast ?? false,
    timeout: config.timeout || 30000
  };
}

// ==================== 导出 ====================

export default {
  Gateway,
  createGateway,
  createRouteRule,
  createAggregateRequest,
  generateRequestId,
  parseUrlParams,
  matchRoute,
  mergeHeaders,
  parseQueryString
};
