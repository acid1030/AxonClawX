/**
 * ACE Plugin System - 使用示例
 * 
 * 演示如何使用 plugin-utils-skill.ts 中的插件系统
 */

import { 
  PluginManager, 
  PluginLoader, 
  Plugin,
  LoggerPlugin, 
  MonitorPlugin 
} from './plugin-utils-skill';

// ==================== 示例 1: 基础使用 ====================

async function basicExample() {
  console.log('=== 基础使用示例 ===\n');
  
  // 1. 创建插件管理器
  const manager = new PluginManager();
  
  // 2. 注册插件
  manager.register(LoggerPlugin);
  manager.register(MonitorPlugin);
  
  // 3. 加载插件
  await manager.load('logger');
  await manager.load('monitor');
  
  // 4. 查看已加载的插件
  console.log('已加载的插件:', manager.getLoadedPlugins());
  
  // 5. 查看插件状态
  console.log('Logger 状态:', manager.getPluginStatus('logger'));
  console.log('Monitor 状态:', manager.getPluginStatus('monitor'));
  
  // 6. 触发消息钩子
  await manager.triggerHook('onMessage', { 
    from: 'user', 
    text: 'Hello World',
    timestamp: Date.now()
  });
  
  // 7. 触发命令钩子
  await manager.triggerHook('onCommand', 'ping', ['--verbose']);
  
  // 8. 启动 tick 循环 (每秒触发一次 onTick)
  manager.startTickLoop(1000);
  
  // 9. 运行 5 秒后停止
  setTimeout(async () => {
    console.log('\n=== 停止示例 ===');
    manager.stopTickLoop();
    
    // 10. 卸载插件
    await manager.unload('monitor');
    await manager.unload('logger');
    
    // 11. 清理资源
    await manager.dispose();
    
    console.log('示例完成!');
  }, 5000);
}

// ==================== 示例 2: 自定义插件 ====================

const CustomPlugin: Plugin = {
  id: 'custom',
  name: 'Custom Plugin',
  version: '1.0.0',
  description: '自定义功能插件',
  author: 'You',
  enabled: false,
  
  load: async () => {
    console.log('[Custom] 插件加载完成');
    // 可以在这里初始化数据库连接、API 客户端等
  },
  
  unload: async () => {
    console.log('[Custom] 插件卸载完成');
    // 可以在这里清理资源
  },
  
  hooks: {
    onLoad: () => {
      console.log('[Custom] 初始化钩子触发');
    },
    
    onUnload: () => {
      console.log('[Custom] 清理钩子触发');
    },
    
    onMessage: async (message: any) => {
      console.log('[Custom] 收到消息:', message);
      // 处理消息逻辑
      if (message.text === 'ping') {
        console.log('[Custom] Pong!');
      }
    },
    
    onCommand: async (command: string, args: string[]) => {
      console.log('[Custom] 执行命令:', command, args);
      // 处理命令逻辑
      switch (command) {
        case 'help':
          console.log('[Custom] 可用命令: help, ping, status');
          break;
        case 'status':
          console.log('[Custom] 插件运行正常');
          break;
      }
    },
    
    onTick: () => {
      // 定期任务，例如：数据同步、健康检查等
      console.log('[Custom] 定期任务执行');
    },
  },
};

async function customPluginExample() {
  console.log('=== 自定义插件示例 ===\n');
  
  const manager = new PluginManager();
  
  // 注册自定义插件
  manager.register(CustomPlugin);
  
  // 加载插件
  await manager.load('custom');
  
  // 触发一些操作
  await manager.triggerHook('onMessage', { text: 'ping' });
  await manager.triggerHook('onCommand', 'help', []);
  
  // 清理
  await manager.unload('custom');
  await manager.dispose();
}

// ==================== 示例 3: 从文件加载插件 ====================

async function fileLoaderExample() {
  console.log('=== 文件加载器示例 ===\n');
  
  const manager = new PluginManager();
  const loader = new PluginLoader(manager);
  
  try {
    // 从单个文件加载插件
    // const plugin = await loader.loadFromFile('./plugins/my-plugin.plugin.ts');
    // await manager.load(plugin.id);
    
    // 从目录批量加载所有插件
    // const plugins = await loader.loadFromDirectory('./plugins');
    // console.log(`加载了 ${plugins.length} 个插件`);
    
    // 加载所有插件
    // for (const plugin of plugins) {
    //   await manager.load(plugin.id);
    // }
    
    console.log('文件加载器示例 (注释状态，取消注释后使用)');
  } catch (error) {
    console.error('加载插件失败:', error);
  } finally {
    await manager.dispose();
  }
}

// ==================== 示例 4: 错误处理 ====================

async function errorHandlingExample() {
  console.log('=== 错误处理示例 ===\n');
  
  const manager = new PluginManager();
  
  try {
    // 尝试加载不存在的插件
    await manager.load('non-existent');
  } catch (error) {
    console.log('捕获错误:', (error as Error).message);
  }
  
  try {
    // 重复注册插件
    manager.register(LoggerPlugin);
    manager.register(LoggerPlugin); // 会抛出错误
  } catch (error) {
    console.log('捕获错误:', (error as Error).message);
  }
  
  await manager.dispose();
}

// ==================== 示例 5: 插件依赖管理 ====================

const DatabasePlugin: Plugin = {
  id: 'database',
  name: 'Database Plugin',
  version: '1.0.0',
  description: '数据库连接插件',
  author: 'Axon',
  enabled: false,
  
  load: async () => {
    console.log('[Database] 数据库连接已建立');
  },
  
  unload: async () => {
    console.log('[Database] 数据库连接已关闭');
  },
};

const CachePlugin: Plugin = {
  id: 'cache',
  name: 'Cache Plugin',
  version: '1.0.0',
  description: '缓存插件 (依赖 database)',
  author: 'Axon',
  enabled: false,
  
  load: async () => {
    console.log('[Cache] 缓存系统已启动');
  },
  
  unload: async () => {
    console.log('[Cache] 缓存系统已关闭');
  },
};

async function dependencyExample() {
  console.log('=== 插件依赖管理示例 ===\n');
  
  const manager = new PluginManager();
  
  // 注册插件
  manager.register(DatabasePlugin);
  manager.register(CachePlugin);
  
  // 按依赖顺序加载
  await manager.load('database'); // 先加载数据库
  await manager.load('cache');    // 再加载缓存
  
  console.log('已加载插件:', manager.getLoadedPlugins());
  
  // 卸载时按相反顺序
  await manager.unload('cache');
  await manager.unload('database');
  
  await manager.dispose();
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('🚀 ACE Plugin System - 使用示例\n');
  console.log('=' .repeat(50));
  
  await basicExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await customPluginExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await fileLoaderExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await errorHandlingExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await dependencyExample();
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ 所有示例运行完成!');
}

// 导出示例函数
export { 
  basicExample, 
  customPluginExample, 
  fileLoaderExample, 
  errorHandlingExample, 
  dependencyExample,
  runAllExamples 
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
