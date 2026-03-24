/**
 * ACE Plugin System - Plugin Utils Skill
 * 
 * 功能:
 * 1. 插件加载 (Plugin Loading)
 * 2. 插件管理 (Plugin Management)
 * 3. 插件钩子 (Plugin Hooks)
 * 
 * @author Axon
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  load: () => Promise<void>;
  unload: () => Promise<void>;
  hooks?: PluginHooks;
}

export interface PluginHooks {
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onMessage?: (message: any) => void | Promise<void>;
  onCommand?: (command: string, args: string[]) => void | Promise<void>;
  onTick?: () => void | Promise<void>;
}

export interface PluginManagerState {
  plugins: Map<string, Plugin>;
  loadedPlugins: Set<string>;
  hookRegistry: Map<string, Array<(data: any) => void | Promise<void>>>;
}

// ==================== 插件管理器 ====================

export class PluginManager {
  private state: PluginManagerState;
  private tickInterval?: NodeJS.Timeout;

  constructor() {
    this.state = {
      plugins: new Map(),
      loadedPlugins: new Set(),
      hookRegistry: new Map(),
    };
  }

  /**
   * 注册插件
   */
  register(plugin: Plugin): void {
    if (this.state.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} already registered`);
    }
    this.state.plugins.set(plugin.id, plugin);
    console.log(`[ACE] Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * 加载插件
   */
  async load(pluginId: string): Promise<void> {
    const plugin = this.state.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    if (this.state.loadedPlugins.has(pluginId)) {
      console.log(`[ACE] Plugin ${pluginId} already loaded`);
      return;
    }

    try {
      await plugin.load();
      this.state.loadedPlugins.add(pluginId);
      plugin.enabled = true;
      
      // 触发 onLoad 钩子
      if (plugin.hooks?.onLoad) {
        await plugin.hooks.onLoad();
      }
      
      // 注册插件钩子
      this.registerPluginHooks(plugin);
      
      console.log(`[ACE] Plugin loaded: ${plugin.name}`);
    } catch (error) {
      console.error(`[ACE] Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async unload(pluginId: string): Promise<void> {
    const plugin = this.state.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    if (!this.state.loadedPlugins.has(pluginId)) {
      console.log(`[ACE] Plugin ${pluginId} not loaded`);
      return;
    }

    try {
      // 触发 onUnload 钩子
      if (plugin.hooks?.onUnload) {
        await plugin.hooks.onUnload();
      }

      // 注销插件钩子
      this.unregisterPluginHooks(plugin);
      
      await plugin.unload();
      this.state.loadedPlugins.delete(pluginId);
      plugin.enabled = false;
      
      console.log(`[ACE] Plugin unloaded: ${plugin.name}`);
    } catch (error) {
      console.error(`[ACE] Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * 注册插件钩子到全局钩子注册表
   */
  private registerPluginHooks(plugin: Plugin): void {
    if (!plugin.hooks) return;

    const hookTypes = ['onMessage', 'onCommand', 'onTick'] as const;
    
    hookTypes.forEach(hookType => {
      if (plugin.hooks?.[hookType]) {
        const hookName = `${plugin.id}:${hookType}`;
        const existingHooks = this.state.hookRegistry.get(hookType) || [];
        existingHooks.push(plugin.hooks[hookType]!);
        this.state.hookRegistry.set(hookType, existingHooks);
        console.log(`[ACE] Hook registered: ${hookName}`);
      }
    });
  }

  /**
   * 注销插件钩子
   */
  private unregisterPluginHooks(plugin: Plugin): void {
    if (!plugin.hooks) return;

    const hookTypes = ['onMessage', 'onCommand', 'onTick'] as const;
    
    hookTypes.forEach(hookType => {
      if (plugin.hooks?.[hookType]) {
        const hooks = this.state.hookRegistry.get(hookType) || [];
        const filteredHooks = hooks.filter(hook => hook !== plugin.hooks![hookType]);
        this.state.hookRegistry.set(hookType, filteredHooks);
        console.log(`[ACE] Hook unregistered: ${plugin.id}:${hookType}`);
      }
    });
  }

  /**
   * 触发钩子
   */
  async triggerHook<T = any>(hookType: string, data?: T): Promise<void> {
    const hooks = this.state.hookRegistry.get(hookType) || [];
    
    await Promise.all(
      hooks.map(async hook => {
        try {
          await hook(data);
        } catch (error) {
          console.error(`[ACE] Hook ${hookType} error:`, error);
        }
      })
    );
  }

  /**
   * 获取已加载的插件列表
   */
  getLoadedPlugins(): string[] {
    return Array.from(this.state.loadedPlugins);
  }

  /**
   * 获取所有注册的插件
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.state.plugins.values());
  }

  /**
   * 获取插件状态
   */
  getPluginStatus(pluginId: string): { loaded: boolean; enabled: boolean } | null {
    const plugin = this.state.plugins.get(pluginId);
    if (!plugin) return null;
    
    return {
      loaded: this.state.loadedPlugins.has(pluginId),
      enabled: plugin.enabled,
    };
  }

  /**
   * 启动插件 tick 循环 (用于 onTick 钩子)
   */
  startTickLoop(intervalMs: number = 1000): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    
    this.tickInterval = setInterval(async () => {
      await this.triggerHook('onTick');
    }, intervalMs);
    
    console.log(`[ACE] Tick loop started (interval: ${intervalMs}ms)`);
  }

  /**
   * 停止插件 tick 循环
   */
  stopTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
      console.log(`[ACE] Tick loop stopped`);
    }
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    this.stopTickLoop();
    
    // 卸载所有插件
    const loadedPlugins = Array.from(this.state.loadedPlugins);
    await Promise.all(
      loadedPlugins.map(id => this.unload(id).catch(err => console.error(err)))
    );
    
    this.state.plugins.clear();
    this.state.loadedPlugins.clear();
    this.state.hookRegistry.clear();
    
    console.log(`[ACE] Plugin manager disposed`);
  }
}

// ==================== 插件加载器 ====================

export class PluginLoader {
  private manager: PluginManager;

  constructor(manager: PluginManager) {
    this.manager = manager;
  }

  /**
   * 从文件加载插件
   */
  async loadFromFile(pluginPath: string): Promise<Plugin> {
    const module = await import(pluginPath);
    const plugin = module.default || module.plugin;
    
    if (!plugin || typeof plugin !== 'object') {
      throw new Error(`Invalid plugin format in ${pluginPath}`);
    }

    this.manager.register(plugin);
    return plugin;
  }

  /**
   * 从目录批量加载插件
   */
  async loadFromDirectory(dirPath: string): Promise<Plugin[]> {
    const fs = await import('fs');
    const path = await import('path');
    
    const loadedPlugins: Plugin[] = [];
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      if (file.endsWith('.plugin.ts') || file.endsWith('.plugin.js')) {
        const pluginPath = path.join(dirPath, file);
        try {
          const plugin = await this.loadFromFile(pluginPath);
          loadedPlugins.push(plugin);
        } catch (error) {
          console.error(`[ACE] Failed to load plugin from ${file}:`, error);
        }
      }
    }
    
    return loadedPlugins;
  }
}

// ==================== 使用示例 ====================

/**
 * 示例插件：日志插件
 */
export const LoggerPlugin: Plugin = {
  id: 'logger',
  name: 'Logger Plugin',
  version: '1.0.0',
  description: 'Simple logging plugin',
  author: 'Axon',
  enabled: false,
  
  load: async () => {
    console.log('[Logger] Plugin loaded');
  },
  
  unload: async () => {
    console.log('[Logger] Plugin unloaded');
  },
  
  hooks: {
    onLoad: () => {
      console.log('[Logger] Initializing logger...');
    },
    
    onUnload: () => {
      console.log('[Logger] Cleaning up logger...');
    },
    
    onMessage: (message: any) => {
      console.log(`[Logger] Message received:`, message);
    },
    
    onCommand: (command: string, args: string[]) => {
      console.log(`[Logger] Command executed: ${command}`, args);
    },
    
    onTick: () => {
      // 每秒执行一次
      console.log(`[Logger] Tick at ${new Date().toISOString()}`);
    },
  },
};

/**
 * 示例插件：监控插件
 */
export const MonitorPlugin: Plugin = {
  id: 'monitor',
  name: 'Monitor Plugin',
  version: '1.0.0',
  description: 'System monitoring plugin',
  author: 'Axon',
  enabled: false,
  
  load: async () => {
    console.log('[Monitor] Starting system monitoring...');
  },
  
  unload: async () => {
    console.log('[Monitor] Stopping system monitoring...');
  },
  
  hooks: {
    onTick: () => {
      const memoryUsage = process.memoryUsage();
      console.log(`[Monitor] Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
    },
  },
};

// ==================== 使用示例代码 ====================

/**
 * 使用示例
 * 
 * ```typescript
 * import { PluginManager, PluginLoader, LoggerPlugin, MonitorPlugin } from './plugin-utils-skill';
 * 
 * // 1. 创建插件管理器
 * const manager = new PluginManager();
 * const loader = new PluginLoader(manager);
 * 
 * // 2. 注册插件
 * manager.register(LoggerPlugin);
 * manager.register(MonitorPlugin);
 * 
 * // 3. 加载插件
 * await manager.load('logger');
 * await manager.load('monitor');
 * 
 * // 4. 触发钩子
 * await manager.triggerHook('onMessage', { text: 'Hello World' });
 * await manager.triggerHook('onCommand', 'ping', []);
 * 
 * // 5. 启动 tick 循环
 * manager.startTickLoop(1000); // 每秒触发一次 onTick
 * 
 * // 6. 查看插件状态
 * console.log(manager.getLoadedPlugins()); // ['logger', 'monitor']
 * console.log(manager.getPluginStatus('logger')); // { loaded: true, enabled: true }
 * 
 * // 7. 卸载插件
 * await manager.unload('monitor');
 * 
 * // 8. 清理资源
 * await manager.dispose();
 * ```
 * 
 * 从文件加载插件示例:
 * 
 * ```typescript
 * const loader = new PluginLoader(manager);
 * 
 * // 加载单个插件文件
 * await loader.loadFromFile('./plugins/custom.plugin.ts');
 * 
 * // 批量加载目录中的所有插件
 * await loader.loadFromDirectory('./plugins');
 * ```
 */

export default PluginManager;
