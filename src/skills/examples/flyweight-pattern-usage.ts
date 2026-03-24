/**
 * Flyweight Pattern 使用示例
 * 
 * 演示如何在实际项目中使用享元模式技能
 */

import {
  FlyweightPatternSkill,
  FlyweightFactory,
  ConcreteFlyweight,
} from '../flyweight-pattern-skill';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 示例 1: 基础使用
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function basicUsage(): void {
  console.log('=== 基础使用示例 ===\n');
  
  // 创建技能实例
  const skill = new FlyweightPatternSkill({
    maxCacheSize: 100,
    enableLRU: true,
  });
  
  // 获取享元（内部状态相同会复用）
  const flyweight1 = skill.getFlyweight({ type: 'button', color: 'blue' });
  const flyweight2 = skill.getFlyweight({ type: 'button', color: 'blue' }); // 复用
  const flyweight3 = skill.getFlyweight({ type: 'button', color: 'red' });  // 新对象
  
  console.log('flyweight1 === flyweight2:', flyweight1 === flyweight2); // true
  console.log('flyweight1 === flyweight3:', flyweight1 === flyweight3); // false
  
  // 查看统计
  const stats = skill.getStats();
  console.log('\n统计:', stats);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 示例 2: UI 组件渲染优化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface UIComponentStyle {
  componentType: 'button' | 'input' | 'label';
  theme: 'light' | 'dark';
  size: 'small' | 'medium' | 'large';
}

interface UIComponentContext {
  id: string;
  x: number;
  y: number;
  label: string;
}

function uiComponentRendering(): void {
  console.log('\n=== UI 组件渲染优化 ===\n');
  
  const factory = new FlyweightFactory<UIComponentStyle, UIComponentContext>();
  
  // 渲染 1000 个按钮
  const styles: UIComponentStyle[] = [
    { componentType: 'button', theme: 'light', size: 'medium' },
    { componentType: 'button', theme: 'dark', size: 'large' },
    { componentType: 'input', theme: 'light', size: 'small' },
  ];
  
  for (let i = 0; i < 1000; i++) {
    const style = styles[i % 3];
    const context: UIComponentContext = {
      id: `component-${i}`,
      x: (i % 10) * 100,
      y: Math.floor(i / 10) * 50,
      label: `Component ${i}`,
    };
    
    factory.operate(style, context);
  }
  
  console.log('渲染完成，统计:', factory.getStats());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 示例 3: 日志系统优化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  format: 'json' | 'text';
}

interface LogContext {
  timestamp: number;
  message: string;
  metadata?: any;
}

class LogFlyweight extends ConcreteFlyweight<LogConfig, LogContext> {
  operate(context: LogContext): void {
    const logEntry = {
      ...context,
      config: this.getIntrinsicStateHash(),
    };
    
    // 实际项目中这里会写入日志
    console.log(`[${logEntry.config}] ${context.message}`);
  }
}

function loggingSystem(): void {
  console.log('\n=== 日志系统优化 ===\n');
  
  const factory = new FlyweightFactory<LogConfig, LogContext>({
    maxCacheSize: 20, // 日志级别和来源有限
  });
  
  const sources = ['auth', 'api', 'database', 'cache', 'network'];
  const levels: LogConfig['level'][] = ['debug', 'info', 'warn', 'error'];
  
  // 生成 500 条日志
  for (let i = 0; i < 500; i++) {
    const config: LogConfig = {
      level: levels[i % 4],
      source: sources[i % 5],
      format: 'json',
    };
    
    const context: LogContext = {
      timestamp: Date.now(),
      message: `Log message #${i}`,
      metadata: { requestId: i },
    };
    
    factory.operate(config, context);
  }
  
  console.log('\n日志系统统计:', factory.getStats());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 示例 4: 缓存层实现
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CacheEntry<T> {
  key: string;
  value: T;
  ttl: number;
}

interface CacheContext {
  operation: 'get' | 'set' | 'delete';
  data?: any;
}

function cacheLayer(): void {
  console.log('\n=== 缓存层实现 ===\n');
  
  const factory = new FlyweightFactory<CacheEntry<any>, CacheContext>({
    maxCacheSize: 1000,
    enableLRU: true,
    memoryOptimization: 'aggressive',
  });
  
  // 模拟缓存操作
  const keys = ['user:1', 'user:2', 'product:1', 'product:2', 'session:abc'];
  
  for (let i = 0; i < 100; i++) {
    const entry: CacheEntry<any> = {
      key: keys[i % keys.length],
      value: { data: `value-${i}` },
      ttl: 3600,
    };
    
    const context: CacheContext = {
      operation: i % 3 === 0 ? 'set' : 'get',
      data: i % 3 === 0 ? entry.value : undefined,
    };
    
    factory.operate(entry, context);
  }
  
  console.log('缓存层统计:', factory.getStats());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 示例 5: 地图瓦片渲染
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface TileStyle {
  zoomLevel: number;
  tileType: 'road' | 'satellite' | 'terrain' | 'hybrid';
}

interface TileContext {
  x: number;
  y: number;
  visible: boolean;
}

function mapTileRendering(): void {
  console.log('\n=== 地图瓦片渲染 ===\n');
  
  const factory = new FlyweightFactory<TileStyle, TileContext>({
    maxCacheSize: 100,
  });
  
  // 渲染地图瓦片（假设 20x20 的视口）
  const tileTypes: TileStyle['tileType'][] = ['road', 'satellite', 'terrain', 'hybrid'];
  
  for (let zoom = 1; zoom <= 5; zoom++) {
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const style: TileStyle = {
          zoomLevel: zoom,
          tileType: tileTypes[zoom % 4],
        };
        
        const context: TileContext = {
          x,
          y,
          visible: true,
        };
        
        factory.operate(style, context);
      }
    }
  }
  
  console.log('地图瓦片统计:', factory.getStats());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 运行所有示例
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function runAllExamples(): void {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     Flyweight Pattern 使用示例                     ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  basicUsage();
  uiComponentRendering();
  loggingSystem();
  cacheLayer();
  mapTileRendering();
  
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║     所有示例执行完成                               ║');
  console.log('╚════════════════════════════════════════════════════╝');
}

// 导出示例函数
export {
  basicUsage,
  uiComponentRendering,
  loggingSystem,
  cacheLayer,
  mapTileRendering,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
