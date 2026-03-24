# 🔌 插件系统技能 (Plugin System Skill)

**技能名称:** `plugin-system-skill`  
**开发者:** ACE  
**版本:** 1.0.0  
**依赖:** `src/plugins/plugin-manager.ts`

---

## 📋 功能概览

| 功能模块 | 描述 | 核心 API |
|---------|------|---------|
| **插件加载** | 发现、加载、卸载、重载插件 | `discoverAllPlugins()`, `loadPlugin()`, `unloadPlugin()` |
| **生命周期管理** | 启用、禁用、状态查询 | `enablePlugin()`, `disablePlugin()`, `getPluginStatus()` |
| **插件通信** | 消息总线、事件订阅、广播 | `sendPluginMessage()`, `subscribeToPluginMessages()` |

---

## 🚀 快速开始

### 1. 基础使用

```typescript
import {
  discoverAllPlugins,
  loadPlugin,
  unloadPlugin,
  getPluginStats
} from './skills/plugin-system-skill';

// 扫描插件目录
const plugins = await discoverAllPlugins();
console.log(`发现 ${plugins.length} 个插件`);

// 加载指定插件
const plugin = await loadPlugin('my-plugin');
if (plugin) {
  console.log(`插件 ${plugin.manifest.id} 加载成功`);
}

// 查看统计
const stats = getPluginStats();
console.log(stats); // { total: 5, loaded: 3, failed: 1, unloaded: 1 }
```

### 2. 生命周期管理

```typescript
import {
  enablePlugin,
  disablePlugin,
  getPluginStatus,
  PluginStatus
} from './skills/plugin-system-skill';

// 启用插件
await enablePlugin('my-plugin');

// 禁用插件
await disablePlugin('my-plugin');

// 查询状态
const status = getPluginStatus('my-plugin');
console.log(`当前状态：${status}`);
// 可能值：'discovered' | 'loading' | 'loaded' | 'failed' | 'unloaded'
```

### 3. 插件通信

```typescript
import {
  sendPluginMessage,
  subscribeToPluginMessages,
  unsubscribeFromPluginMessages
} from './skills/plugin-system-skill';

// 订阅消息
subscribeToPluginMessages('data-update', async (msg) => {
  console.log(`收到来自 ${msg.from} 的消息:`, msg.payload);
});

// 广播消息 (所有订阅者都会收到)
await sendPluginMessage('plugin-a', 'data-update', { key: 'value' });

// 发送给特定插件
await sendPluginMessage('plugin-a', 'data-update', { key: 'value' }, 'plugin-b');

// 取消订阅
// (需要持有 handler 引用)
const handler = async (msg: any) => { /* ... */ };
subscribeToPluginMessages('data-update', handler);
unsubscribeFromPluginMessages('data-update', handler);
```

---

## 📦 插件结构

### 目录结构

```
plugins/
└── my-plugin/
    ├── openclaw.plugin.json  # 插件清单 (必需)
    ├── index.ts              # 入口文件 (默认)
    └── package.json          # npm 依赖 (可选)
```

### 插件清单 (openclaw.plugin.json)

```json
{
  "id": "my-plugin",
  "kind": "service",
  "version": "1.0.0",
  "description": "我的插件描述",
  "main": "index.ts",
  "dependencies": {
    "lodash": "^4.17.21"
  },
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": { "type": "string" }
    }
  },
  "uiHints": {
    "icon": "puzzle",
    "color": "#6366f1"
  }
}
```

### 插件生命周期钩子

```typescript
// plugins/my-plugin/index.ts

export class Plugin {
  /**
   * 初始化钩子 (插件加载时调用)
   */
  async onInit(): Promise<void> {
    console.log('插件初始化...');
  }

  /**
   * 加载完成钩子
   */
  async onLoad(): Promise<void> {
    console.log('插件加载完成');
  }

  /**
   * 启用钩子
   */
  async onEnable(): Promise<void> {
    console.log('插件已启用');
  }

  /**
   * 禁用钩子
   */
  async onDisable(): Promise<void> {
    console.log('插件已禁用');
  }

  /**
   * 卸载钩子
   */
  async onUnload(): Promise<void> {
    console.log('插件卸载中...');
  }
}

// 或者使用默认导出
export default Plugin;
```

---

## 🔧 API 参考

### 插件加载

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `discoverAllPlugins(pluginsDir?)` | `pluginsDir?: string` | `Promise<PluginInfo[]>` | 扫描插件目录 |
| `loadPlugin(pluginId, pluginsDir?)` | `pluginId: string` | `Promise<PluginInstance \| null>` | 加载单个插件 |
| `unloadPlugin(pluginId, pluginsDir?)` | `pluginId: string` | `Promise<boolean>` | 卸载插件 |
| `reloadPlugin(pluginId, pluginsDir?)` | `pluginId: string` | `Promise<PluginInstance \| null>` | 重新加载插件 |
| `autoLoadAllPlugins(pluginsDir?)` | `pluginsDir?: string` | `Promise<Stats>` | 自动加载所有插件 |

### 生命周期管理

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `enablePlugin(pluginId, pluginsDir?)` | `pluginId: string` | `Promise<boolean>` | 启用插件 |
| `disablePlugin(pluginId, pluginsDir?)` | `pluginId: string` | `Promise<boolean>` | 禁用插件 |
| `getPluginStatus(pluginId, pluginsDir?)` | `pluginId: string` | `PluginStatus \| undefined` | 获取状态 |
| `getLoadedPlugins(pluginsDir?)` | `pluginsDir?: string` | `PluginInstance[]` | 获取已加载插件 |
| `getDiscoveredPlugins(pluginsDir?)` | `pluginsDir?: string` | `PluginInfo[]` | 获取所有发现插件 |
| `getPluginStats(pluginsDir?)` | `pluginsDir?: string` | `Stats` | 获取统计信息 |

### 插件通信

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `sendPluginMessage(from, type, payload, to?)` | `from: string, type: string, payload: any, to?: string` | `Promise<void>` | 发送消息 |
| `subscribeToPluginMessages(type, handler)` | `type: string, handler: MessageHandler` | `void` | 订阅消息 |
| `unsubscribeFromPluginMessages(type, handler)` | `type: string, handler: MessageHandler` | `void` | 取消订阅 |
| `getEventBus()` | - | `PluginEventBus` | 获取事件总线实例 |

---

## 💡 使用场景

### 场景 1: 动态加载功能模块

```typescript
// 主应用启动时自动加载所有插件
const stats = await autoLoadAllPlugins();
console.log(`启动完成：${stats.loaded}/${stats.total} 插件已加载`);

// 运行时按需加载
await loadPlugin('analytics-plugin');
```

### 场景 2: 插件热更新

```typescript
// 监听插件目录变化
fs.watch(pluginsDir, async (eventType, filename) => {
  if (eventType === 'change') {
    const pluginId = path.basename(filename);
    await reloadPlugin(pluginId);
    console.log(`插件 ${pluginId} 已热更新`);
  }
});
```

### 场景 3: 插件间协作

```typescript
// 插件 A: 发布数据
await sendPluginMessage('data-plugin', 'data-ready', { records: 100 });

// 插件 B: 订阅并处理
subscribeToPluginMessages('data-ready', async (msg) => {
  if (msg.from === 'data-plugin') {
    await processRecords(msg.payload.records);
    await sendPluginMessage('report-plugin', 'process-complete', { status: 'ok' });
  }
});
```

---

## ⚠️ 注意事项

1. **插件目录**: 默认使用 `workspace/plugins/`，可通过 `pluginsDir` 参数自定义
2. **依赖管理**: 设置 `strictDependencies: true` 会严格检查依赖
3. **消息队列**: 事件总线保留最近 1000 条消息
4. **错误处理**: 插件加载失败不会中断其他插件加载
5. **内存管理**: 卸载插件会清理引用，但需确保插件自身清理定时器/监听器

---

## 🧪 测试示例

```typescript
import {
  resetPluginManager,
  resetEventBus,
  discoverAllPlugins,
  loadPlugin,
  sendPluginMessage,
  subscribeToPluginMessages
} from './skills/plugin-system-skill';

describe('Plugin System Skill', () => {
  beforeEach(() => {
    resetPluginManager();
    resetEventBus();
  });

  test('should discover plugins', async () => {
    const plugins = await discoverAllPlugins('./test/plugins');
    expect(plugins.length).toBeGreaterThan(0);
  });

  test('should load plugin', async () => {
    const plugin = await loadPlugin('test-plugin', './test/plugins');
    expect(plugin).not.toBeNull();
    expect(plugin?.manifest.id).toBe('test-plugin');
  });

  test('should send and receive messages', async () => {
    const received: any[] = [];
    subscribeToPluginMessages('test', (msg) => received.push(msg));
    
    await sendPluginMessage('sender', 'test', { data: 'hello' });
    
    expect(received.length).toBe(1);
    expect(received[0].payload.data).toBe('hello');
  });
});
```

---

## 📝 更新日志

- **v1.0.0** (2026-03-13) - 初始版本
  - ✅ 插件加载系统
  - ✅ 生命周期管理
  - ✅ 插件通信总线

---

**最后更新:** 2026-03-13  
**维护者:** ACE
