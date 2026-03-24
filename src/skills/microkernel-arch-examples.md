# 🜏 ACE 微内核架构 - 使用示例

**版本:** 1.0.0  
**作者:** Axon  
**描述:** 插件化架构完整使用指南

---

## 📋 目录

1. [快速开始](#快速开始)
2. [核心概念](#核心概念)
3. [插件开发](#插件开发)
4. [扩展点使用](#扩展点使用)
5. [钩子系统](#钩子系统)
6. [服务注册](#服务注册)
7. [完整示例](#完整示例)

---

## 快速开始

### 1. 初始化内核

```typescript
import { ACEKernel, initializeKernel } from './microkernel-arch-skill'

const kernel = new ACEKernel()
```

### 2. 注册插件

```typescript
const myPlugin = {
  meta: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'My awesome plugin',
    author: 'Your Name',
  },
  
  async activate(kernel) {
    console.log('Plugin activated!')
    return { /* exports */ }
  },
}

kernel.registerPlugin(myPlugin)
await kernel.activatePlugin('my-plugin')
```

### 3. 使用服务

```typescript
const logger = kernel.getService<Logger>('logger')
logger?.info('Hello, World!')
```

---

## 核心概念

### 插件生命周期

```
pending → loading → active → disabled
                    ↓
                  error
```

| 状态 | 描述 |
|------|------|
| `pending` | 已注册，未激活 |
| `loading` | 激活中 |
| `active` | 已激活，可正常使用 |
| `disabled` | 已停用 |
| `error` | 激活失败 |

### 架构层次

```
┌─────────────────────────────────────┐
│           Application Layer         │
│         (Your Business Logic)       │
├─────────────────────────────────────┤
│         Plugin Layer                │
│    ┌──────┐ ┌──────┐ ┌──────┐      │
│    │Plugin│ │Plugin│ │Plugin│      │
│    │  A   │ │  B   │ │  C   │      │
│    └──────┘ └──────┘ └──────┘      │
├─────────────────────────────────────┤
│         Extension Points            │
│    (commands, middlewares, etc.)    │
├─────────────────────────────────────┤
│         Hook System                 │
│    (before-task, after-save...)     │
├─────────────────────────────────────┤
│         Core Services               │
│    (logger, config, database...)    │
└─────────────────────────────────────┘
```

---

## 插件开发

### 基础插件模板

```typescript
import type { PluginDefinition, MicroKernelCore } from './microkernel-arch-skill'

export const createMyPlugin = (): PluginDefinition => ({
  meta: {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Description here',
    author: 'Your Name',
    dependencies: ['core-plugin'], // 可选依赖
  },
  
  async activate(kernel: MicroKernelCore) {
    // 1. 注册服务
    kernel.registerService('my-service', {
      doSomething: () => 'Done!',
    })
    
    // 2. 贡献到扩展点
    kernel.contributeToExtension('commands', 'my-plugin', {
      name: 'my-command',
      handler: () => console.log('Command executed'),
    })
    
    // 3. 注册钩子
    kernel.registerHook(
      'before-task',
      'my-plugin',
      async (data) => {
        console.log('Before task:', data)
        return data
      },
      10 // 优先级，数字越大越先执行
    )
    
    // 4. 返回导出内容
    return {
      publicMethod: () => 'Public API',
    }
  },
  
  deactivate(kernel: MicroKernelCore) {
    // 清理资源
    console.log('Cleaning up...')
  },
})
```

### 插件依赖管理

```typescript
// 声明依赖
meta: {
  id: 'advanced-plugin',
  dependencies: ['base-plugin', 'utils-plugin'],
}

// 激活时自动检查依赖
await kernel.activatePlugin('advanced-plugin')
// 如果 base-plugin 未激活，会抛出错误
```

### 插件间通信

```typescript
// 插件 A: 提供服务
kernel.registerService('plugin-a-service', {
  getData: () => ({ value: 42 }),
})

// 插件 B: 使用服务
const serviceA = kernel.getService('plugin-a-service')
const data = serviceA?.getData()
```

---

## 扩展点使用

### 定义扩展点

```typescript
kernel.registerExtension({
  id: 'commands',
  description: 'CLI command registry',
  defaultValue: [],
})

kernel.registerExtension<{ path: string; handler: Function }>({
  id: 'routes',
  description: 'HTTP route registry',
})
```

### 贡献到扩展点

```typescript
// 贡献命令
kernel.contributeToExtension('commands', 'my-plugin', {
  name: 'deploy',
  description: 'Deploy application',
  handler: async () => {
    console.log('Deploying...')
  },
})

// 贡献路由
kernel.contributeToExtension('routes', 'web-plugin', {
  path: '/api/health',
  handler: (req, res) => res.json({ status: 'ok' }),
})
```

### 获取扩展点贡献

```typescript
const commands = kernel.getExtension('commands')
if (commands) {
  for (const contributor of commands.contributors) {
    console.log(`Plugin ${contributor.pluginId} provides:`, contributor.contribution)
  }
}
```

### 内置扩展点示例

```typescript
// 命令扩展点
interface CommandExtension {
  name: string
  description: string
  handler: (args: string[]) => Promise<void>
}

// 中间件扩展点
interface MiddlewareExtension {
  name: string
  priority: number
  handler: (req: Request, next: () => void) => Promise<void>
}

// UI 组件扩展点
interface UIComponentExtension {
  id: string
  component: React.ComponentType
  location: 'sidebar' | 'header' | 'footer'
}
```

---

## 钩子系统

### 注册钩子

```typescript
// 高优先级钩子 (先执行)
kernel.registerHook(
  'before-save',
  'validation-plugin',
  async (data) => {
    if (!data.isValid) {
      throw new Error('Validation failed')
    }
    return data
  },
  100 // 高优先级
)

// 低优先级钩子 (后执行)
kernel.registerHook(
  'before-save',
  'logging-plugin',
  async (data) => {
    console.log('Saving data:', data)
    return data
  },
  1 // 低优先级
)
```

### 执行钩子链

```typescript
// 数据会按优先级依次通过所有钩子
const result = await kernel.executeHooks('before-save', {
  id: '123',
  content: 'Hello',
  isValid: true,
})

// 执行顺序:
// 1. validation-plugin (priority: 100)
// 2. logging-plugin (priority: 1)
```

### 常见钩子点

```typescript
// 任务生命周期
'before-task'      // 任务执行前
'after-task'       // 任务执行后
'task-error'       // 任务出错时

// 数据生命周期
'before-save'      // 保存前
'after-save'       // 保存后
'before-delete'    // 删除前
'after-delete'     // 删除后

// 请求生命周期
'before-request'   // 请求前
'after-request'    // 请求后
'auth-check'       // 认证检查
```

### 钩子中断

```typescript
kernel.registerHook('before-task', 'guard-plugin', async (data) => {
  if (!userHasPermission) {
    throw new Error('Permission denied') // 中断后续钩子
  }
  return data
}, 1000) // 最高优先级，最先执行
```

---

## 服务注册

### 注册服务

```typescript
// 简单服务
kernel.registerService('config', {
  get: (key: string) => process.env[key],
  set: (key: string, value: string) => {
    process.env[key] = value
  },
})

// 类实例
class DatabaseService {
  async connect() { /* ... */ }
  async query(sql: string) { /* ... */ }
}

kernel.registerService('database', new DatabaseService())
```

### 使用服务

```typescript
// TypeScript 方式 (推荐)
const config = kernel.getService<{ get: (key: string) => string }>('config')
const value = config?.get('API_KEY')

// 或者定义接口
interface ConfigService {
  get(key: string): string
  set(key: string, value: string): void
}

const config = kernel.getService<ConfigService>('config')
```

### 内置服务

```typescript
// Logger
interface Logger {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
  debug(msg: string): void
}

const logger = kernel.getService<Logger>('logger')

// Event Emitter
interface EventEmitter {
  on(event: string, fn: Function): void
  emit(event: string, ...args: any[]): void
}

const emitter = kernel.getService<EventEmitter>('events')
```

---

## 完整示例

### 场景：任务管理系统

```typescript
import { ACEKernel, type PluginDefinition } from './microkernel-arch-skill'

// ─────────────────────────────────────────────────────────────────────
// 1. 创建核心插件
// ─────────────────────────────────────────────────────────────────────

const corePlugin: PluginDefinition = {
  meta: {
    id: 'core',
    name: 'Core Plugin',
    version: '1.0.0',
    description: 'Core functionality',
    author: 'Axon',
  },
  
  async activate(kernel) {
    // 注册任务服务
    kernel.registerService('task-service', {
      tasks: new Map(),
      create(task: any) {
        this.tasks.set(task.id, task)
        return task
      },
      get(id: string) {
        return this.tasks.get(id)
      },
    })
    
    // 注册扩展点
    kernel.registerExtension({
      id: 'task-validators',
      description: 'Task validation rules',
    })
    
    kernel.registerExtension({
      id: 'task-notifiers',
      description: 'Task completion notifications',
    })
    
    return { version: '1.0.0' }
  },
}

// ─────────────────────────────────────────────────────────────────────
// 2. 创建验证插件
// ─────────────────────────────────────────────────────────────────────

const validationPlugin: PluginDefinition = {
  meta: {
    id: 'validation',
    name: 'Validation Plugin',
    version: '1.0.0',
    description: 'Task validation',
    author: 'Axon',
    dependencies: ['core'],
  },
  
  async activate(kernel) {
    // 贡献验证规则
    kernel.contributeToExtension('task-validators', 'validation', {
      name: 'required-fields',
      validate: (task: any) => {
        if (!task.title) throw new Error('Title is required')
        if (!task.assignee) throw new Error('Assignee is required')
        return true
      },
    })
    
    // 注册保存前钩子
    kernel.registerHook('before-task-save', 'validation', async (task) => {
      const validators = kernel.getExtension('task-validators')
      for (const validator of validators?.contributors || []) {
        validator.contribution.validate(task)
      }
      return task
    }, 100)
    
    return {}
  },
}

// ─────────────────────────────────────────────────────────────────────
// 3. 创建通知插件
// ─────────────────────────────────────────────────────────────────────

const notificationPlugin: PluginDefinition = {
  meta: {
    id: 'notification',
    name: 'Notification Plugin',
    version: '1.0.0',
    description: 'Task notifications',
    author: 'Axon',
    dependencies: ['core'],
  },
  
  async activate(kernel) {
    // 贡献通知处理器
    kernel.contributeToExtension('task-notifiers', 'notification', {
      name: 'email-notifier',
      notify: (task: any) => {
        console.log(`📧 Email sent to ${task.assignee} for task: ${task.title}`)
      },
    })
    
    // 注册任务完成后钩子
    kernel.registerHook('after-task-complete', 'notification', async (task) => {
      const notifiers = kernel.getExtension('task-notifiers')
      for (const notifier of notifiers?.contributors || []) {
        notifier.contribution.notify(task)
      }
      return task
    }, 10)
    
    return {}
  },
}

// ─────────────────────────────────────────────────────────────────────
// 4. 初始化并运行
// ─────────────────────────────────────────────────────────────────────

async function runTaskSystem() {
  const kernel = new ACEKernel()
  
  // 注册所有插件
  kernel.registerPlugin(corePlugin)
  kernel.registerPlugin(validationPlugin)
  kernel.registerPlugin(notificationPlugin)
  
  // 按依赖顺序激活
  await kernel.activatePlugin('core')
  await kernel.activatePlugin('validation')
  await kernel.activatePlugin('notification')
  
  // 使用任务服务
  const taskService = kernel.getService<any>('task-service')
  
  // 创建任务 (会自动验证和通知)
  const task = await kernel.executeHooks('before-task-save', {
    id: 'task-1',
    title: 'Build feature',
    assignee: 'alice@example.com',
  })
  
  taskService?.create(task)
  
  // 完成任务
  await kernel.executeHooks('after-task-complete', task)
  
  console.log('✅ Task system running!')
}

runTaskSystem()
```

---

## 最佳实践

### ✅ 推荐

1. **小插件原则** - 每个插件只做一件事
2. **明确依赖** - 在 meta.dependencies 中声明所有依赖
3. **错误处理** - 钩子中捕获错误，避免中断整个链
4. **类型安全** - 使用 TypeScript 定义清晰的接口
5. **文档化** - 为扩展点和钩子写清楚文档

### ❌ 避免

1. **循环依赖** - A 依赖 B，B 依赖 A
2. **全局状态** - 通过服务管理状态，不要使用全局变量
3. **过度设计** - 简单场景不需要复杂的扩展点
4. **忽略清理** - deactivate 中释放资源

---

## API 参考

### MicroKernelCore

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `registerPlugin` | `plugin: PluginDefinition` | `void` | 注册插件 |
| `activatePlugin` | `pluginId: string` | `Promise<void>` | 激活插件 |
| `deactivatePlugin` | `pluginId: string` | `void` | 停用插件 |
| `getPlugin<T>` | `pluginId: string` | `PluginInstance<T>` | 获取插件实例 |
| `listPlugins` | - | `PluginInstance[]` | 列出所有插件 |
| `registerExtension` | `point: ExtensionPoint` | `void` | 注册扩展点 |
| `getExtension` | `pointId: string` | `ExtensionPoint` | 获取扩展点 |
| `contributeToExtension` | `pointId, pluginId, contribution` | `void` | 贡献到扩展点 |
| `registerHook` | `hookId, pluginId, fn, priority` | `void` | 注册钩子 |
| `executeHooks` | `hookId, data` | `Promise<T>` | 执行钩子链 |
| `registerService` | `serviceId, instance` | `void` | 注册服务 |
| `getService` | `serviceId` | `T` | 获取服务 |

---

**🜏 Axon - 微内核架构完成**
