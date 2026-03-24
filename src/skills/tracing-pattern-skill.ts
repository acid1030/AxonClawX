/**
 * KAEL - 分布式链路追踪技能
 * 
 * 功能:
 * 1. Span 定义 - 追踪单元
 * 2. 链路传播 - 上下文传递
 * 3. 追踪收集 - 数据聚合
 */

// ============ 类型定义 ============

export interface SpanContext {
  traceId: string;      // 链路 ID (128-bit hex)
  spanId: string;       // Span ID (64-bit hex)
  parentSpanId?: string; // 父 Span ID
  flags: number;        // 追踪标志 (1=采样)
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;    // Unix timestamp (ms)
  endTime?: number;
  duration?: number;    // ms
  tags: Record<string, string>;
  logs: SpanLog[];
  status: 'ok' | 'error' | 'unset';
  errorMessage?: string;
}

export interface SpanLog {
  timestamp: number;
  event: string;
  data?: Record<string, string>;
}

export interface Trace {
  traceId: string;
  spans: Span[];
  startTime: number;
  endTime: number;
  duration: number;
  rootSpan: Span;
  services: string[];
  errors: Span[];
}

// ============ 工具函数 ============

function generateId(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateTraceId(): string {
  return generateId(32); // 128-bit
}

function generateSpanId(): string {
  return generateId(16); // 64-bit
}

function now(): number {
  return Date.now();
}

// ============ 链路传播 (上下文管理) ============

export class TraceContextManager {
  private static storage = new Map<string, SpanContext>();
  private static currentKey = 'default';

  static setContext(ctx: SpanContext, key: string = 'default'): void {
    this.storage.set(key, ctx);
    this.currentKey = key;
  }

  static getContext(key: string = 'default'): SpanContext | undefined {
    return this.storage.get(key);
  }

  static clearContext(key: string = 'default'): void {
    this.storage.delete(key);
  }

  // 从传入的 traceparent 解析 (W3C Trace Context 标准)
  static parseTraceParent(header: string): SpanContext | null {
    // 格式：version-traceId-parentId-flags
    // 例：00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
    const parts = header.split('-');
    if (parts.length !== 4) return null;

    const [, traceId, parentSpanId, flags] = parts;
    return {
      traceId,
      spanId: generateSpanId(),
      parentSpanId,
      flags: parseInt(flags, 16),
    };
  }

  // 生成 traceparent 头 (用于下游服务)
  static toTraceParent(ctx: SpanContext): string {
    const version = '00';
    const flags = ctx.flags.toString(16).padStart(2, '0');
    return `${version}-${ctx.traceId}-${ctx.spanId}-${flags}`;
  }

  // 提取 B3 格式 (Zipkin)
  static parseB3(headers: {
    'X-B3-TraceId'?: string;
    'X-B3-SpanId'?: string;
    'X-B3-ParentSpanId'?: string;
    'X-B3-Sampled'?: string;
  }): SpanContext | null {
    if (!headers['X-B3-TraceId']) return null;

    return {
      traceId: headers['X-B3-TraceId'],
      spanId: headers['X-B3-SpanId'] || generateSpanId(),
      parentSpanId: headers['X-B3-ParentSpanId'],
      flags: headers['X-B3-Sampled'] === '1' ? 1 : 0,
    };
  }
}

// ============ Span 构建器 ============

export class SpanBuilder {
  private span: Span;
  private active = true;

  constructor(operationName: string, parentCtx?: SpanContext) {
    const traceId = parentCtx?.traceId || generateTraceId();
    const spanId = generateSpanId();

    this.span = {
      traceId,
      spanId,
      parentSpanId: parentCtx?.spanId,
      operationName,
      startTime: now(),
      tags: {},
      logs: [],
      status: 'unset',
    };

    // 自动设置当前上下文
    TraceContextManager.setContext({
      traceId,
      spanId,
      parentSpanId: parentCtx?.spanId,
      flags: 1,
    });
  }

  tag(key: string, value: string): this {
    this.span.tags[key] = value;
    return this;
  }

  log(event: string, data?: Record<string, string>): this {
    this.span.logs.push({
      timestamp: now(),
      event,
      data,
    });
    return this;
  }

  setError(message: string): this {
    this.span.status = 'error';
    this.span.errorMessage = message;
    this.tag('error', 'true');
    this.tag('error.message', message);
    return this;
  }

  setService(name: string): this {
    this.tag('service.name', name);
    return this;
  }

  setHttpInfo(method: string, url: string, status?: number): this {
    this.tag('http.method', method);
    this.tag('http.url', url);
    if (status) {
      this.tag('http.status_code', status.toString());
    }
    return this;
  }

  end(): Span {
    if (!this.active) return this.span;
    
    this.span.endTime = now();
    this.span.duration = this.span.endTime - this.span.startTime;
    this.span.status = this.span.status === 'unset' ? 'ok' : this.span.status;
    
    this.active = false;
    return this.span;
  }

  getSpan(): Span {
    return this.span;
  }
}

// ============ 追踪收集器 ============

export class TraceCollector {
  private spans = new Map<string, Span>();
  private traces = new Map<string, Trace>();

  addSpan(span: Span): void {
    this.spans.set(span.spanId, span);

    // 如果链路完成，构建 Trace 对象
    if (this.isTraceComplete(span.traceId)) {
      this.buildTrace(span.traceId);
    }
  }

  private isTraceComplete(traceId: string): boolean {
    const traceSpans = Array.from(this.spans.values()).filter(
      (s) => s.traceId === traceId
    );

    // 检查是否有根 span 且所有 span 都结束
    const rootSpan = traceSpans.find((s) => !s.parentSpanId);
    if (!rootSpan || !rootSpan.endTime) return false;

    return traceSpans.every((s) => s.endTime !== undefined);
  }

  private buildTrace(traceId: string): void {
    const traceSpans = Array.from(this.spans.values()).filter(
      (s) => s.traceId === traceId
    );

    const rootSpan = traceSpans.find((s) => !s.parentSpanId)!;
    const errors = traceSpans.filter((s) => s.status === 'error');
    const services = [
      ...new Set(traceSpans.map((s) => s.tags['service.name']).filter(Boolean)),
    ] as string[];

    const trace: Trace = {
      traceId,
      spans: traceSpans.sort((a, b) => a.startTime - b.startTime),
      startTime: rootSpan.startTime,
      endTime: Math.max(...traceSpans.map((s) => s.endTime || 0)),
      duration: rootSpan.duration || 0,
      rootSpan,
      services,
      errors,
    };

    this.traces.set(traceId, trace);

    // 清理已完成的 spans
    traceSpans.forEach((s) => this.spans.delete(s.spanId));
  }

  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  getAllTraces(): Trace[] {
    return Array.from(this.traces.values());
  }

  getRecentTraces(limit: number = 10): Trace[] {
    return this.getAllTraces()
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  // 导出为 Jaeger 兼容格式
  exportToJaeger(): any[] {
    return Array.from(this.traces.values()).map((trace) => ({
      traceId: trace.traceId,
      spans: trace.spans.map((span) => ({
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        operationName: span.operationName,
        startTime: span.startTime * 1000, // Jaeger uses microseconds
        duration: (span.duration || 0) * 1000,
        tags: Object.entries(span.tags).map(([key, value]) => ({
          key,
          value,
          type: 'string',
        })),
        logs: span.logs.map((log) => ({
          timestamp: log.timestamp * 1000,
          fields: Object.entries(log.data || {}).map(([key, value]) => ({
            key,
            value,
            type: 'string',
          })),
        })),
        references: span.parentSpanId
          ? [
              {
                refType: 'CHILD_OF',
                traceId: span.traceId,
                spanId: span.parentSpanId,
              },
            ]
          : [],
      })),
    }));
  }
}

// ============ 装饰器 (TypeScript) ============

export function Traced(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = operationName || propertyKey;

    descriptor.value = function (...args: any[]) {
      const parentCtx = TraceContextManager.getContext();
      const builder = new SpanBuilder(name, parentCtx);
      builder.setService(this.constructor.name || 'Unknown');

      try {
        const result = originalMethod.apply(this, args);
        
        // 处理 Promise
        if (result instanceof Promise) {
          return result
            .then((res) => {
              builder.end();
              return res;
            })
            .catch((err) => {
              builder.setError(err.message);
              builder.end();
              throw err;
            });
        }

        builder.end();
        return result;
      } catch (error: any) {
        builder.setError(error.message);
        builder.end();
        throw error;
      }
    };

    return descriptor;
  };
}

// ============ 中间件 (Express/Koa) ============

export function createTracingMiddleware(serviceName: string) {
  return function (req: any, res: any, next: () => void) {
    // 尝试从请求头提取追踪上下文
    const traceparent = req.headers['traceparent'];
    const ctx = traceparent
      ? TraceContextManager.parseTraceParent(traceparent)
      : undefined;

    const builder = new SpanBuilder(`${req.method} ${req.path}`, ctx);
    builder.setService(serviceName);
    builder.setHttpInfo(req.method, req.url);

    // 注入追踪头到响应
    res.setHeader(
      'traceparent',
      TraceContextManager.toTraceParent(builder.getSpan())
    );

    // 记录响应状态
    res.on('finish', () => {
      builder.tag('http.status_code', res.statusCode.toString());
      if (res.statusCode >= 400) {
        builder.setError(`HTTP ${res.statusCode}`);
      }
      builder.end();
    });

    next();
  };
}

// ============ 使用示例 ============

/*
// 示例 1: 基础 Span 创建
const span = new SpanBuilder('processOrder');
span.setService('order-service');
span.tag('order.id', '12345');
span.log('validation_started');
// ... 业务逻辑
span.end();

// 示例 2: 链路传播 (HTTP 请求)
// 服务端接收
const ctx = TraceContextManager.parseTraceParent(req.headers['traceparent']);
const span = new SpanBuilder('handleRequest', ctx);

// 客户端发送
const traceparent = TraceContextManager.toTraceParent(
  TraceContextManager.getContext()!
);
fetch('http://api.example.com', {
  headers: { 'traceparent': traceparent }
});

// 示例 3: 装饰器用法
class OrderService {
  @Traced('createOrder')
  async createOrder(data: OrderData) {
    // 自动追踪
    return db.insert(data);
  }
}

// 示例 4: 收集器使用
const collector = new TraceCollector();
collector.addSpan(span.end());
const traces = collector.getRecentTraces(10);
const jaegerData = collector.exportToJaeger();

// 示例 5: 完整链路
// Service A
const spanA = new SpanBuilder('user-request');
spanA.setService('api-gateway');
const traceparent = TraceContextManager.toTraceParent(
  TraceContextManager.getContext()!
);

// Service B (接收 traceparent)
const ctxB = TraceContextManager.parseTraceParent(traceparent);
const spanB = new SpanBuilder('process-data', ctxB);
spanB.setService('data-processor');
spanB.end();

spanA.end();
*/

export default {
  SpanBuilder,
  TraceContextManager,
  TraceCollector,
  Traced,
  createTracingMiddleware,
};
