/**
 * 插件系统技能 - ACE
 * 
 * 功能:
 * 1. 插件加载 - 发现、加载、卸载插件
 * 2. 生命周期管理 - 初始化、启用、禁用、销毁
 * 3. 插件通信 - 插件间消息传递、事件总线
 * 
 * @module plugin-system-skill
 */

import * as path from 'path';
import { PluginManager, PluginInstance, PluginInfo, PluginStatus, PluginLifecycle } from '../plugins/plugin-manager';

// ============================================
// 全局插件管理器实例
// ============================================
let globalPluginManager: PluginManager | null = null;

/**
 * 获取或创建全局插件管理器
 * 
 * @param pluginsDir - 插件目录路径，默认为 workspace/plugins
 * @returns 插件管理器实例
 */
export function getPluginManager(pluginsDir?: string): PluginManager {
  if (!globalPluginManager) {
    const defaultPluginsDir = path.join(process.cwd(), 'plugins');
    globalPluginManager = new PluginManager({
      pluginsDir: pluginsDir || defaultPluginsDir,
      autoLoad: false,
      strictDependencies: false,
    });
  }
  return globalPluginManager;
}

/**
 * 重置全局插件管理器 (用于测试)
 */
export function resetPluginManager(): void {
  globalPluginManager = null;
}

// ============================================
// 1. 插件加载功能
// ============================================

/**
 * 扫描并发现所有可用插件
 * 
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 发现的插件信息列表
 * 
 * @example
 * const plugins = await discoverAllPlugins();
 * console.log(`发现 ${plugins.length} 个插件`);
 */
export async function discoverAllPlugins(pluginsDir?: string): Promise<PluginInfo[]> {
  const manager = getPluginManager(pluginsDir);
  return await manager.discoverPlugins();
}

/**
 * 加载单个插件
 * 
 * @param pluginId - 插件 ID
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 加载成功返回插件实例，失败返回 null
 * 
 * @example
 * const plugin = await loadPlugin('my-plugin');
 * if (plugin) {
 *   console.log(`插件 ${plugin.manifest.id} 加载成功`);
 * }
 */
export async function loadPlugin(pluginId: string, pluginsDir?: string): Promise<PluginInstance | null> {
  const manager = getPluginManager(pluginsDir);
  return await manager.loadPlugin(pluginId);
}

/**
 * 卸载插件
 * 
 * @param pluginId - 插件 ID
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 卸载是否成功
 * 
 * @example
 * const success = await unloadPlugin('my-plugin');
 * console.log(success ? '卸载成功' : '卸载失败');
 */
export async function unloadPlugin(pluginId: string, pluginsDir?: string): Promise<boolean> {
  const manager = getPluginManager(pluginsDir);
  return await manager.unloadPlugin(pluginId);
}

/**
 * 重新加载插件
 * 
 * @param pluginId - 插件 ID
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 重新加载后的插件实例，失败返回 null
 * 
 * @example
 * const plugin = await reloadPlugin('my-plugin');
 */
export async function reloadPlugin(pluginId: string, pluginsDir?: string): Promise<PluginInstance | null> {
  const manager = getPluginManager(pluginsDir);
  return await manager.reloadPlugin(pluginId);
}

/**
 * 自动加载所有发现的插件
 * 
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 加载统计信息
 * 
 * @example
 * const stats = await autoLoadAllPlugins();
 * console.log(`加载成功：${stats.loaded}, 失败：${stats.failed}`);
 */
export async function autoLoadAllPlugins(pluginsDir?: string): Promise<{
  total: number;
  loaded: number;
  failed: number;
  unloaded: number;
}> {
  const manager = getPluginManager(pluginsDir);
  await manager.autoLoad();
  return manager.getStats();
}

// ============================================
// 2. 生命周期管理功能
// ============================================

/**
 * 启用插件 (调用 onEnable 钩子)
 * 
 * @param pluginId - 插件 ID
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 启用是否成功
 * 
 * @example
 * const success = await enablePlugin('my-plugin');
 */
export async function enablePlugin(pluginId: string, pluginsDir?: string): Promise<boolean> {
  const manager = getPluginManager(pluginsDir);
  return await manager.enablePlugin(pluginId);
}

/**
 * 禁用插件 (调用 onDisable 钩子)
 * 
 * @param pluginId - 插件 ID
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 禁用是否成功
 * 
 * @example
 * const success = await disablePlugin('my-plugin');
 */
export async function disablePlugin(pluginId: string, pluginsDir?: string): Promise<boolean> {
  const manager = getPluginManager(pluginsDir);
  return await manager.disablePlugin(pluginId);
}

/**
 * 获取插件当前状态
 * 
 * @param pluginId - 插件 ID
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 插件状态枚举值
 * 
 * @example
 * const status = getPluginStatus('my-plugin');
 * console.log(`插件状态：${status}`);
 */
export function getPluginStatus(pluginId: string, pluginsDir?: string): PluginStatus | undefined {
  const manager = getPluginManager(pluginsDir);
  return manager.getPluginStatus(pluginId);
}

/**
 * 获取所有已加载的插件
 * 
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 已加载插件实例列表
 * 
 * @example
 * const loaded = getLoadedPlugins();
 * loaded.forEach(p => console.log(p.manifest.id));
 */
export function getLoadedPlugins(pluginsDir?: string): PluginInstance[] {
  const manager = getPluginManager(pluginsDir);
  return manager.getLoadedPlugins();
}

/**
 * 获取所有发现的插件信息
 * 
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 插件信息列表
 * 
 * @example
 * const discovered = getDiscoveredPlugins();
 * discovered.forEach(p => console.log(`${p.id}: ${p.status}`));
 */
export function getDiscoveredPlugins(pluginsDir?: string): PluginInfo[] {
  const manager = getPluginManager(pluginsDir);
  return manager.getDiscoveredPlugins();
}

/**
 * 获取插件统计信息
 * 
 * @param pluginsDir - 插件目录路径 (可选)
 * @returns 统计信息对象
 * 
 * @example
 * const stats = getPluginStats();
 * console.log(`总数：${stats.total}, 已加载：${stats.loaded}`);
 */
export function getPluginStats(pluginsDir?: string): {
  total: number;
  loaded: number;
  failed: number;
  unloaded: number;
} {
  const manager = getPluginManager(pluginsDir);
  return manager.getStats();
}

// ============================================
// 3. 插件通信功能
// ============================================

/**
 * 插件间消息接口
 */
export interface PluginMessage {
  from: string;       // 发送方插件 ID
  to?: string;        // 接收方插件 ID (可选，广播时为 undefined)
  type: string;       // 消息类型
  payload: any;       // 消息内容
  timestamp: number;  // 时间戳
}

/**
 * 消息处理器类型
 */
export type MessageHandler = (message: PluginMessage) => Promise<void> | void;

/**
 * 事件总线 - 用于插件间通信
 */
class PluginEventBus {
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private messageQueue: PluginMessage[] = [];

  /**
   * 订阅消息类型
   * 
   * @param messageType - 消息类型
   * @param handler - 消息处理函数
   */
  subscribe(messageType: string, handler: MessageHandler): void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, new Set());
    }
    this.handlers.get(messageType)!.add(handler);
  }

  /**
   * 取消订阅
   * 
   * @param messageType - 消息类型
   * @param handler - 消息处理函数
   */
  unsubscribe(messageType: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 发布消息
   * 
   * @param message - 消息对象
   */
  async publish(message: PluginMessage): Promise<void> {
    message.timestamp = Date.now();
    this.messageQueue.push(message);

    // 保持队列大小 (最多 1000 条)
    if (this.messageQueue.length > 1000) {
      this.messageQueue.shift();
    }

    // 通知订阅者
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      const promises = Array.from(handlers).map(h => {
        try {
          return Promise.resolve(h(message));
        } catch (error) {
          console.error(`[PluginEventBus] Handler error for ${message.type}:`, error);
        }
      });
      await Promise.all(promises);
    }
  }

  /**
   * 广播消息给所有插件
   * 
   * @param from - 发送方插件 ID
   * @param type - 消息类型
   * @param payload - 消息内容
   */
  async broadcast(from: string, type: string, payload: any): Promise<void> {
    const message: PluginMessage = {
      from,
      type,
      payload,
      timestamp: Date.now(),
    };
    await this.publish(message);
  }

  /**
   * 发送消息给特定插件
   * 
   * @param from - 发送方插件 ID
   * @param to - 接收方插件 ID
   * @param type - 消息类型
   * @param payload - 消息内容
   */
  async sendTo(from: string, to: string, type: string, payload: any): Promise<void> {
    const message: PluginMessage = {
      from,
      to,
      type,
      payload,
      timestamp: Date.now(),
    };
    await this.publish(message);
  }

  /**
   * 获取历史消息
   * 
   * @param limit - 返回数量限制，默认 100
   * @returns 历史消息列表
   */
  getHistory(limit: number = 100): PluginMessage[] {
    return this.messageQueue.slice(-limit);
  }

  /**
   * 清空消息队列
   */
  clear(): void {
    this.messageQueue = [];
  }
}

// 全局事件总线实例
let globalEventBus: PluginEventBus | null = null;

/**
 * 获取全局事件总线
 * 
 * @returns 事件总线实例
 */
export function getEventBus(): PluginEventBus {
  if (!globalEventBus) {
    globalEventBus = new PluginEventBus();
  }
  return globalEventBus;
}

/**
 * 重置事件总线 (用于测试)
 */
export function resetEventBus(): void {
  globalEventBus = null;
}

/**
 * 插件消息发送快捷方式
 * 
 * @param from - 发送方插件 ID
 * @param type - 消息类型
 * @param payload - 消息内容
 * @param to - 接收方插件 ID (可选，不传则广播)
 * 
 * @example
 * // 广播消息
 * await sendPluginMessage('plugin-a', 'data-update', { key: 'value' });
 * 
 * // 发送给特定插件
 * await sendPluginMessage('plugin-a', 'data-update', { key: 'value' }, 'plugin-b');
 */
export async function sendPluginMessage(
  from: string,
  type: string,
  payload: any,
  to?: string
): Promise<void> {
  const eventBus = getEventBus();
  if (to) {
    await eventBus.sendTo(from, to, type, payload);
  } else {
    await eventBus.broadcast(from, type, payload);
  }
}

/**
 * 订阅插件消息
 * 
 * @param messageType - 消息类型
 * @param handler - 消息处理函数
 * 
 * @example
 * subscribeToPluginMessages('data-update', async (msg) => {
 *   console.log(`收到来自 ${msg.from} 的消息:`, msg.payload);
 * });
 */
export function subscribeToPluginMessages(
  messageType: string,
  handler: MessageHandler
): void {
  const eventBus = getEventBus();
  eventBus.subscribe(messageType, handler);
}

/**
 * 取消订阅插件消息
 * 
 * @param messageType - 消息类型
 * @param handler - 消息处理函数
 */
export function unsubscribeFromPluginMessages(
  messageType: string,
  handler: MessageHandler
): void {
  const eventBus = getEventBus();
  eventBus.unsubscribe(messageType, handler);
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 插件系统技能 - 使用示例 ===\n');
  
  // 示例 1: 发现插件
  console.log('1️⃣ 发现插件:');
  console.log('   调用 discoverAllPlugins()...');
  console.log('   (需要 plugins/ 目录下有实际插件)\n');
  
  // 示例 2: 加载插件
  console.log('2️⃣ 加载插件:');
  console.log('   调用 loadPlugin("example-plugin")...');
  console.log('   (需要先创建示例插件)\n');
  
  // 示例 3: 插件通信
  console.log('3️⃣ 插件通信:');
  console.log('   设置消息订阅...');
  
  subscribeToPluginMessages('test-message', async (msg) => {
    console.log(`   📨 收到消息: 来自 ${msg.from}, 类型 ${msg.type}, 内容:`, msg.payload);
  });
  
  console.log('   发送测试消息...');
  sendPluginMessage('plugin-a', 'test-message', { data: 'Hello from Plugin A' });
  
  console.log('   发送带目标的测试消息...');
  sendPluginMessage('plugin-b', 'test-message', { data: 'Hello to Plugin B' }, 'plugin-a');
  
  console.log('\n4️⃣ 获取插件统计:');
  const stats = getPluginStats();
  console.log(`   总数：${stats.total}, 已加载：${stats.loaded}, 失败：${stats.failed}, 未加载：${stats.unloaded}`);
  
  console.log('\n✅ 所有示例执行完成!');
  console.log('\n💡 提示: 要测试完整功能，请在 plugins/ 目录下创建示例插件');
}
