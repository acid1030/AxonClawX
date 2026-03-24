# 🚀 插件系统快速入门

**5 分钟上手指南**

---

## 1️⃣ 安装与配置

无需安装，直接使用:

```typescript
import {
  discoverAllPlugins,
  loadPlugin,
  sendPluginMessage,
  subscribeToPluginMessages
} from './skills/plugin-system-skill';
```

---

## 2️⃣ 创建你的第一个插件

### 步骤 1: 创建插件目录

```bash
mkdir -p plugins/my-first-plugin
```

### 步骤 2: 创建插件清单

`plugins/my-first-plugin/openclaw.plugin.json`:

```json
{
  "id": "my-first-plugin",
  "kind": "demo",
  "version": "1.0.0",
  "description": "我的第一个插件",
  "main": "index.ts"
}
```

### 步骤 3: 创建插件入口

`plugins/my-first-plugin/index.ts`:

```typescript
export class Plugin {
  async onInit(): Promise<void> {
    console.log('🎉 我的插件初始化了!');
  }

  async onLoad(): Promise<void> {
    console.log('✅ 插件加载完成');
  }

  async onEnable(): Promise<void> {
    console.log('▶️ 插件已启用');
  }

  async onDisable(): Promise<void> {
    console.log('⏸️ 插件已禁用');
  }

  async onUnload(): Promise<void> {
    console.log('👋 插件卸载中...');
  }
}

export default Plugin;
```

---

## 3️⃣ 加载和使用插件

### 发现插件

```typescript
const plugins = await discoverAllPlugins();
console.log(`发现 ${plugins.length} 个插件`);
// 输出：发现 1 个插件
```

### 加载插件

```typescript
const plugin = await loadPlugin('my-first-plugin');
if (plugin) {
  console.log(`加载成功：${plugin.manifest.id}`);
}
// 输出：
// 🎉 我的插件初始化了!
// ✅ 插件加载完成
// 加载成功：my-first-plugin
```

### 启用/禁用插件

```typescript
await enablePlugin('my-first-plugin');
// 输出：▶️ 插件已启用

await disablePlugin('my-first-plugin');
// 输出：⏸️ 插件已禁用
```

---

## 4️⃣ 插件间通信

### 订阅消息

```typescript
import { subscribeToPluginMessages } from './skills/plugin-system-skill';

subscribeToPluginMessages('custom-event', async (msg) => {
  console.log(`收到消息：${msg.from} -> ${msg.type}`);
  console.log('内容:', msg.payload);
});
```

### 发送消息

```typescript
import { sendPluginMessage } from './skills/plugin-system-skill';

// 广播消息 (所有订阅者都会收到)
await sendPluginMessage('my-plugin', 'custom-event', { data: 'Hello!' });

// 发送给特定插件
await sendPluginMessage('my-plugin', 'custom-event', { data: 'Hello!' }, 'target-plugin');
```

---

## 5️⃣ 完整示例

```typescript
import {
  discoverAllPlugins,
  loadPlugin,
  enablePlugin,
  sendPluginMessage,
  subscribeToPluginMessages,
  getPluginStats
} from './skills/plugin-system-skill';

async function main() {
  // 1. 发现所有插件
  const plugins = await discoverAllPlugins();
  console.log(`发现 ${plugins.length} 个插件`);

  // 2. 订阅消息
  subscribeToPluginMessages('data-ready', async (msg) => {
    console.log(`数据处理：${msg.payload.count} 条记录`);
  });

  // 3. 加载插件
  for (const plugin of plugins) {
    await loadPlugin(plugin.id);
  }

  // 4. 启用所有插件
  for (const plugin of plugins) {
    await enablePlugin(plugin.id);
  }

  // 5. 发送测试消息
  await sendPluginMessage('main-app', 'data-ready', { count: 42 });

  // 6. 查看统计
  const stats = getPluginStats();
  console.log(`统计：${stats.loaded}/${stats.total} 插件已加载`);
}

main();
```

---

## 📚 更多资源

- **完整 API 文档**: [PLUGIN-SYSTEM-README.md](./PLUGIN-SYSTEM-README.md)
- **使用示例**: [examples/plugin-system-example.ts](../../examples/plugin-system-example.ts)
- **示例插件**: [plugins/example-plugin/](../../plugins/example-plugin/)

---

## ❓ 常见问题

### Q: 插件目录在哪里？
A: 默认在 `workspace/plugins/`，可以通过参数自定义:
```typescript
await discoverAllPlugins('./custom/plugins/dir');
```

### Q: 如何调试插件？
A: 插件的日志会输出到控制台，使用 `console.log` 即可。

### Q: 插件可以依赖 npm 包吗？
A: 可以，在插件目录添加 `package.json` 并安装依赖。

### Q: 如何热更新插件？
A: 使用 `reloadPlugin(pluginId)` 重新加载。

---

**开始时间:** 5 分钟  
**难度:** ⭐☆☆☆☆ 简单
