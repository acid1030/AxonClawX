/**
 * 🜏 AXON - ACE 微内核架构技能
 * 
 * @description 插件化架构核心实现
 * @version 1.0.0
 * @author Axon
 * 
 * 功能:
 * 1. 核心定义 (Core Definition)
 * 2. 插件管理 (Plugin Management)
 * 3. 扩展点 (Extension Points)
 */

// ─────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────

/**
 * 插件元数据
 */
export interface PluginMeta {
  id: string
  name: string
  version: string
  description: string
  author: string
  dependencies?: string[]
}

/**
 * 插件生命周期
 */
export type PluginLifecycle = 'pending' | 'loading' | 'active' | 'error' | 'disabled'

/**
 * 插件实例
 */
export interface PluginInstance<T = unknown> {
  meta: PluginMeta
  lifecycle: PluginLifecycle
  exports?: T
  error?: Error
}

/**
 * 扩展点定义
 */
export interface ExtensionPoint<T = unknown> {
  id: string
  description: string
  defaultValue?: T
  contributors: Array<{
    pluginId: string
    contribution: T
  }>
}

/**
 * 钩子函数类型
 */
export type HookFn<T = unknown> = (data: T) => T | Promise<T>

/**
 * 钩子注册信息
 */
export interface HookRegistration {
  hookId: string
  pluginId: string
  fn: HookFn
  priority: number
}

/**
 * 微内核核心接口
 */
export interface MicroKernelCore {
  registerPlugin: (plugin: PluginDefinition) => void
  activatePlugin: (pluginId: string) => Promise<void>
  deactivatePlugin: (pluginId: string) => void
  getPlugin: <T>(pluginId: string) => PluginInstance<T> | undefined
  listPlugins: () => PluginInstance[]
  
  registerExtension: <T>(point: ExtensionPoint<T>) => void
  getExtension: <T>(pointId: string) => ExtensionPoint<T> | undefined
  contributeToExtension: <T>(pointId: string, pluginId: string, contribution: T) => void
  
  registerHook: (hookId: string, pluginId: string, fn: HookFn, priority?: number) => void
  executeHooks: <T>(hookId: string, data: T) => Promise<T>
  
  getService: <T>(serviceId: string) => T | undefined
  registerService: <T>(serviceId: string, instance: T) => void
}

/**
 * 插件定义接口
 */
export interface PluginDefinition {
  meta: PluginMeta
  activate: (kernel: MicroKernelCore) => Promise<unknown>
  deactivate?: (kernel: MicroKernelCore) => void
}

// ─────────────────────────────────────────────────────────────────────
// 核心实现
// ─────────────────────────────────────────────────────────────────────

/**
 * ACE 微内核核心实现
 */
export class ACEKernel implements MicroKernelCore {
  private plugins: Map<string, PluginInstance> = new Map()
  private extensions: Map<string, ExtensionPoint> = new Map()
  private hooks: Map<string, HookRegistration[]> = new Map()
  private services: Map<string, unknown> = new Map()
  
  // ───────────────────────────────────────────────────────────────────
  // 插件管理
  // ───────────────────────────────────────────────────────────────────
  
  registerPlugin(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.meta.id)) {
      throw new Error(`Plugin ${plugin.meta.id} already registered`)
    }
    
    const instance: PluginInstance = {
      meta: plugin.meta,
      lifecycle: 'pending',
    }
    
    this.plugins.set(plugin.meta.id, instance)
    console.log(`[ACE] Plugin registered: ${plugin.meta.name} v${plugin.meta.version}`)
  }
  
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }
    
    if (plugin.lifecycle === 'active') {
      console.log(`[ACE] Plugin ${pluginId} already active`)
      return
    }
    
    plugin.lifecycle = 'loading'
    
    try {
      // 检查依赖
      if (plugin.meta.dependencies) {
        for (const depId of plugin.meta.dependencies) {
          const dep = this.plugins.get(depId)
          if (!dep || dep.lifecycle !== 'active') {
            throw new Error(`Missing dependency: ${depId}`)
          }
        }
      }
      
      // 激活插件
      const pluginDef = this.getPluginDefinition(pluginId)
      if (pluginDef) {
        const exports = await pluginDef.activate(this)
        plugin.exports = exports
        plugin.lifecycle = 'active'
        console.log(`[ACE] Plugin activated: ${pluginId}`)
      }
    } catch (error) {
      plugin.lifecycle = 'error'
      plugin.error = error as Error
      console.error(`[ACE] Plugin activation failed: ${pluginId}`, error)
      throw error
    }
  }
  
  deactivatePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }
    
    if (plugin.lifecycle === 'active') {
      const pluginDef = this.getPluginDefinition(pluginId)
      if (pluginDef?.deactivate) {
        pluginDef.deactivate(this)
      }
      plugin.lifecycle = 'disabled'
      plugin.exports = undefined
      console.log(`[ACE] Plugin deactivated: ${pluginId}`)
    }
  }
  
  getPlugin<T>(pluginId: string): PluginInstance<T> | undefined {
    return this.plugins.get(pluginId) as PluginInstance<T> | undefined
  }
  
  listPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values())
  }
  
  private getPluginDefinition(pluginId: string): PluginDefinition | undefined {
    // 实际实现中需要从注册表获取
    // 这里简化处理
    return undefined
  }
  
  // ───────────────────────────────────────────────────────────────────
  // 扩展点管理
  // ───────────────────────────────────────────────────────────────────
  
  registerExtension<T>(point: ExtensionPoint<T>): void {
    if (this.extensions.has(point.id)) {
      throw new Error(`Extension point ${point.id} already exists`)
    }
    
    this.extensions.set(point.id, {
      ...point,
      contributors: [],
    })
    
    console.log(`[ACE] Extension point registered: ${point.id}`)
  }
  
  getExtension<T>(pointId: string): ExtensionPoint<T> | undefined {
    return this.extensions.get(pointId) as ExtensionPoint<T> | undefined
  }
  
  contributeToExtension<T>(pointId: string, pluginId: string, contribution: T): void {
    const point = this.extensions.get(pointId)
    if (!point) {
      throw new Error(`Extension point ${pointId} not found`)
    }
    
    point.contributors.push({
      pluginId,
      contribution,
    })
    
    console.log(`[ACE] Plugin ${pluginId} contributed to ${pointId}`)
  }
  
  // ───────────────────────────────────────────────────────────────────
  // 钩子系统
  // ───────────────────────────────────────────────────────────────────
  
  registerHook(hookId: string, pluginId: string, fn: HookFn, priority: number = 0): void {
    if (!this.hooks.has(hookId)) {
      this.hooks.set(hookId, [])
    }
    
    const hooks = this.hooks.get(hookId)!
    hooks.push({ hookId, pluginId, fn, priority })
    
    // 按优先级排序 (高优先级先执行)
    hooks.sort((a, b) => b.priority - a.priority)
    
    console.log(`[ACE] Hook registered: ${hookId} by ${pluginId} (priority: ${priority})`)
  }
  
  async executeHooks<T>(hookId: string, data: T): Promise<T> {
    const hooks = this.hooks.get(hookId)
    if (!hooks || hooks.length === 0) {
      return data
    }
    
    let result = data
    
    for (const hook of hooks) {
      try {
        result = await hook.fn(result)
        console.log(`[ACE] Hook executed: ${hookId} by ${hook.pluginId}`)
      } catch (error) {
        console.error(`[ACE] Hook failed: ${hookId} by ${hook.pluginId}`, error)
        // 继续执行其他钩子
      }
    }
    
    return result
  }
  
  // ───────────────────────────────────────────────────────────────────
  // 服务注册
  // ───────────────────────────────────────────────────────────────────
  
  registerService<T>(serviceId: string, instance: T): void {
    this.services.set(serviceId, instance)
    console.log(`[ACE] Service registered: ${serviceId}`)
  }
  
  getService<T>(serviceId: string): T | undefined {
    return this.services.get(serviceId) as T | undefined
  }
}

// ─────────────────────────────────────────────────────────────────────
// 使用示例
// ─────────────────────────────────────────────────────────────────────

/**
 * 示例 1: 创建插件
 */
export const createExamplePlugin = (): PluginDefinition => ({
  meta: {
    id: 'example-plugin',
    name: 'Example Plugin',
    version: '1.0.0',
    description: 'An example plugin for ACE microkernel',
    author: 'Axon',
  },
  
  async activate(kernel: MicroKernelCore) {
    console.log('[Example] Activating...')
    
    // 注册服务
    kernel.registerService('example-service', {
      greet: (name: string) => `Hello, ${name}!`,
    })
    
    // 贡献到扩展点
    kernel.contributeToExtension('commands', 'example-plugin', {
      name: 'example-cmd',
      handler: () => console.log('Example command executed'),
    })
    
    // 注册钩子
    kernel.registerHook('before-task', 'example-plugin', async (data) => {
      console.log('[Example] Before task hook', data)
      return data
    }, 10)
    
    return {
      exampleMethod: () => 'Example export',
    }
  },
  
  deactivate(kernel: MicroKernelCore) {
    console.log('[Example] Deactivating...')
  },
})

/**
 * 示例 2: 初始化微内核
 */
export const initializeKernel = (): MicroKernelCore => {
  const kernel = new ACEKernel()
  
  // 注册核心扩展点
  kernel.registerExtension({
    id: 'commands',
    description: 'Command registry for CLI commands',
    contributors: [],
  })
  
  kernel.registerExtension({
    id: 'middlewares',
    description: 'Middleware chain for request processing',
    contributors: [],
  })
  
  // 注册核心服务
  kernel.registerService('logger', {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  })
  
  return kernel
}

/**
 * 示例 3: 完整使用流程
 */
export const runExample = async () => {
  console.log('🜏 ACE Microkernel Example\n')
  
  // 1. 初始化内核
  const kernel = initializeKernel()
  
  // 2. 注册插件
  const examplePlugin = createExamplePlugin()
  kernel.registerPlugin(examplePlugin)
  
  // 3. 激活插件
  await kernel.activatePlugin('example-plugin')
  
  // 4. 使用服务
  const exampleService = kernel.getService<{ greet: (name: string) => string }>('example-service')
  if (exampleService) {
    console.log(exampleService.greet('Axon'))
  }
  
  // 5. 获取扩展点贡献
  const commands = kernel.getExtension('commands')
  console.log('Registered commands:', commands?.contributors.length)
  
  // 6. 执行钩子链
  const result = await kernel.executeHooks('before-task', { taskId: '123' })
  console.log('Hook result:', result)
  
  // 7. 列出所有插件
  const plugins = kernel.listPlugins()
  console.log('Active plugins:', plugins.filter(p => p.lifecycle === 'active').length)
  
  console.log('\n✅ Example completed')
}

// ─────────────────────────────────────────────────────────────────────
// 导出
// ─────────────────────────────────────────────────────────────────────

export { ACEKernel }
export type {
  PluginMeta,
  PluginLifecycle,
  PluginInstance,
  ExtensionPoint,
  HookFn,
  HookRegistration,
  MicroKernelCore,
  PluginDefinition,
}

// 如果直接运行此文件，执行示例
if (import.meta.main) {
  runExample()
}
