# 集群管理工具 - ACE Cluster Utils

**版本:** 1.0.0  
**作者:** ACE (Autonomous Cluster Executor)  
**最后更新:** 2026-03-13

---

## 📋 概述

ACE Cluster Utils 是一个功能完整的集群管理工具，提供节点管理、负载均衡和故障转移能力。

### 核心功能

| 功能 | 描述 |
|------|------|
| **节点管理** | 动态添加/移除节点，实时监控节点状态 |
| **负载均衡** | 支持 4 种策略：轮询、加权、最少连接、IP 哈希 |
| **故障转移** | 自动健康检查，故障节点隔离，请求自动重试 |
| **会话粘滞** | 可选的客户端会话保持 |
| **统计监控** | 实时集群统计和节点指标 |

---

## 🚀 快速开始

### 安装

```bash
# 无需额外依赖，直接导入使用
import { ClusterManager, LoadBalanceStrategy } from './src/skills/cluster-utils-skill'
```

### 基础用法

```typescript
import { ClusterManager, LoadBalanceStrategy } from './src/skills/cluster-utils-skill'

// 1. 创建集群管理器
const cluster = new ClusterManager({
  name: 'api-cluster',
  strategy: LoadBalanceStrategy.ROUND_ROBIN,
  healthCheck: {
    enabled: true,
    interval: 10000,      // 10 秒检查一次
    timeout: 5000,        // 5 秒超时
    unhealthyThreshold: 3, // 连续 3 次失败标记为不健康
    healthyThreshold: 2,   // 连续 2 次成功恢复健康
  },
  stickySessions: true,   // 启用会话粘滞
  maxRetries: 3,          // 最大重试次数
})

// 2. 添加节点
cluster.addNode({
  id: 'node-1',
  name: 'API Server 1',
  host: '192.168.1.10',
  port: 8080,
  weight: 2,  // 权重 (用于加权负载均衡)
})

cluster.addNode({
  id: 'node-2',
  name: 'API Server 2',
  host: '192.168.1.11',
  port: 8080,
  weight: 1,
})

// 3. 选择节点处理请求
const node = cluster.selectNode({
  clientId: 'user-123',
  ip: '192.168.1.100',
  path: '/api/data',
  method: 'GET',
  timestamp: Date.now(),
})

if (node) {
  console.log(`Selected: ${node.name} (${node.host}:${node.port})`)
}
```

---

## 📖 API 文档

### 类型定义

#### NodeStatus (节点状态)

```typescript
enum NodeStatus {
  HEALTHY = 'healthy',     // 健康
  UNHEALTHY = 'unhealthy', // 不健康
  DEGRADED = 'degraded',   // 降级 (临时状态)
  OFFLINE = 'offline',     // 离线
}
```

#### LoadBalanceStrategy (负载均衡策略)

```typescript
enum LoadBalanceStrategy {
  ROUND_ROBIN = 'round-robin',           // 轮询
  WEIGHTED = 'weighted',                 // 加权
  LEAST_CONNECTIONS = 'least-connections', // 最少连接数
  IP_HASH = 'ip-hash',                   // IP 哈希
}
```

#### ClusterNode (集群节点)

```typescript
interface ClusterNode {
  id: string
  name: string
  host: string
  port: number
  weight?: number
  status: NodeStatus
  activeConnections: number
  totalRequests: number
  failedRequests: number
  lastHealthCheck?: number
  metadata?: Record<string, any>
}
```

### ClusterManager 方法

#### 节点管理

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `addNode(node)` | 添加节点 | `Omit<ClusterNode, ...>` | `ClusterNode` |
| `removeNode(nodeId)` | 移除节点 | `string` | `boolean` |
| `updateNodeStatus(nodeId, status)` | 更新节点状态 | `string, NodeStatus` | `boolean` |
| `getNode(nodeId)` | 获取节点 | `string` | `ClusterNode \| undefined` |
| `getAllNodes()` | 获取所有节点 | - | `ClusterNode[]` |
| `getHealthyNodes()` | 获取健康节点 | - | `ClusterNode[]` |

#### 负载均衡

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `selectNode(context)` | 选择下一个节点 | `RequestContext` | `ClusterNode \| null` |
| `getStickyNode(clientId)` | 获取会话粘滞节点 | `string` | `ClusterNode \| null` |

#### 故障转移

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `handleRequestFailure(nodeId, context, retryCount)` | 处理请求失败 | `string, RequestContext, number` | `Promise<ClusterNode \| null>` |
| `handleRequestSuccess(nodeId, responseTime)` | 处理请求成功 | `string, number?` | `void` |

#### 统计监控

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getStats()` | 获取集群统计 | - | `ClusterStats` |
| `getNodeStats(nodeId)` | 获取节点统计 | `string` | `Partial<ClusterNode> \| null` |
| `resetStats()` | 重置统计 | - | `void` |

---

## 💡 使用场景

### 场景 1: API 网关负载均衡

```typescript
import * as http from 'http'
import { ClusterManager, LoadBalanceStrategy } from './cluster-utils-skill'

const cluster = new ClusterManager({
  name: 'api-gateway',
  strategy: LoadBalanceStrategy.LEAST_CONNECTIONS,
  healthCheck: {
    enabled: true,
    interval: 5000,
    timeout: 3000,
    unhealthyThreshold: 2,
    healthyThreshold: 2,
  },
})

// 添加后端服务节点
cluster.addNode({ id: 'api-1', name: 'API 1', host: '10.0.0.1', port: 3000 })
cluster.addNode({ id: 'api-2', name: 'API 2', host: '10.0.0.2', port: 3000 })
cluster.addNode({ id: 'api-3', name: 'API 3', host: '10.0.0.3', port: 3000 })

// 创建 HTTP 服务器
http.createServer(async (req, res) => {
  const node = cluster.selectNode({
    ip: req.socket.remoteAddress || '',
    path: req.url || '/',
    method: req.method || 'GET',
    timestamp: Date.now(),
  })

  if (!node) {
    res.writeHead(503)
    res.end('Service Unavailable')
    return
  }

  try {
    // 代理请求到后端节点
    const proxyReq = http.request({
      hostname: node.host,
      port: node.port,
      path: req.url,
      method: req.method,
      headers: req.headers,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
      proxyRes.pipe(res)
      
      cluster.handleRequestSuccess(node.id)
    })

    proxyReq.on('error', async (err) => {
      const newNode = await cluster.handleRequestFailure(node.id, {
        ip: req.socket.remoteAddress || '',
        timestamp: Date.now(),
      })

      if (newNode) {
        // 重试逻辑...
      } else {
        res.writeHead(502)
        res.end('Bad Gateway')
      }
    })

    req.pipe(proxyReq)
  } catch (error) {
    cluster.handleRequestFailure(node.id, {
      ip: req.socket.remoteAddress || '',
      timestamp: Date.now(),
    })
    res.writeHead(500)
    res.end('Internal Server Error')
  }
}).listen(8080)

console.log('API Gateway running on port 8080')
```

### 场景 2: 自定义健康检查

```typescript
import * as http from 'http'
import { ClusterManager, ClusterNode } from './cluster-utils-skill'

class HTTPClusterManager extends ClusterManager {
  protected async performHealthCheck(node: ClusterNode): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://${node.host}:${node.port}/health`,
        { timeout: this.config.healthCheck.timeout },
        (res) => {
          resolve(res.statusCode === 200)
        }
      )

      req.on('error', () => resolve(false))
      req.on('timeout', () => {
        req.destroy()
        resolve(false)
      })
    })
  }
}

const httpCluster = new HTTPClusterManager({
  name: 'http-cluster',
  strategy: LoadBalanceStrategy.ROUND_ROBIN,
  healthCheck: {
    enabled: true,
    interval: 5000,
    timeout: 3000,
    unhealthyThreshold: 2,
    healthyThreshold: 2,
  },
})
```

### 场景 3: WebSocket 集群

```typescript
import { WebSocket } from 'ws'
import { ClusterManager, LoadBalanceStrategy } from './cluster-utils-skill'

const wsCluster = new ClusterManager({
  name: 'websocket-cluster',
  strategy: LoadBalanceStrategy.IP_HASH,
  stickySessions: true, // WebSocket 需要会话粘滞
  healthCheck: {
    enabled: true,
    interval: 10000,
    timeout: 5000,
    unhealthyThreshold: 3,
    healthyThreshold: 2,
  },
})

// 添加 WebSocket 服务器节点
wsCluster.addNode({ id: 'ws-1', name: 'WS Server 1', host: '10.0.0.1', port: 8080 })
wsCluster.addNode({ id: 'ws-2', name: 'WS Server 2', host: '10.0.0.2', port: 8080 })

// 客户端连接时分配节点
function handleClientConnection(clientId: string, clientIP: string) {
  // 先检查是否有粘滞节点
  let node = wsCluster.getStickyNode(clientId)
  
  if (!node) {
    node = wsCluster.selectNode({
      clientId,
      ip: clientIP,
      timestamp: Date.now(),
    })
  }

  if (node) {
    console.log(`Client ${clientId} connected to ${node.name}`)
    return node
  }

  throw new Error('No WebSocket servers available')
}
```

### 场景 4: 数据库读写分离

```typescript
import { ClusterManager, LoadBalanceStrategy } from './cluster-utils-skill'

// 写集群 (主库)
const writeCluster = new ClusterManager({
  name: 'db-write',
  strategy: LoadBalanceStrategy.ROUND_ROBIN,
  healthCheck: { enabled: true, interval: 5000, timeout: 3000, unhealthyThreshold: 2, healthyThreshold: 2 },
})

// 读集群 (从库)
const readCluster = new ClusterManager({
  name: 'db-read',
  strategy: LoadBalanceStrategy.LEAST_CONNECTIONS,
  healthCheck: { enabled: true, interval: 5000, timeout: 3000, unhealthyThreshold: 2, healthyThreshold: 2 },
})

// 添加主库
writeCluster.addNode({ id: 'db-master', name: 'Master DB', host: 'db-master.local', port: 5432, weight: 1 })

// 添加从库
readCluster.addNode({ id: 'db-slave-1', name: 'Slave DB 1', host: 'db-slave-1.local', port: 5432, weight: 2 })
readCluster.addNode({ id: 'db-slave-2', name: 'Slave DB 2', host: 'db-slave-2.local', port: 5432, weight: 1 })

// 使用示例
async function executeQuery(sql: string, isWrite: boolean) {
  const cluster = isWrite ? writeCluster : readCluster
  const node = cluster.selectNode()

  if (!node) {
    throw new Error('Database unavailable')
  }

  try {
    // 执行数据库查询...
    const result = await dbQuery(node.host, node.port, sql)
    cluster.handleRequestSuccess(node.id)
    return result
  } catch (error) {
    await cluster.handleRequestFailure(node.id, { timestamp: Date.now() })
    throw error
  }
}
```

---

## 📊 监控与统计

### 获取集群统计

```typescript
const stats = cluster.getStats()

console.log('=== Cluster Statistics ===')
console.log(`Total Nodes: ${stats.totalNodes}`)
console.log(`Healthy Nodes: ${stats.healthyNodes}`)
console.log(`Unhealthy Nodes: ${stats.unhealthyNodes}`)
console.log(`Total Requests: ${stats.totalRequests}`)
console.log(`Failed Requests: ${stats.failedRequests}`)
console.log(`Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`)
console.log('Requests per Node:', stats.requestsPerNode)
```

### 实时监控

```typescript
setInterval(() => {
  const stats = cluster.getStats()
  
  // 发送到监控系统
  metricsService.gauge('cluster.nodes.total', stats.totalNodes)
  metricsService.gauge('cluster.nodes.healthy', stats.healthyNodes)
  metricsService.gauge('cluster.requests.total', stats.totalRequests)
  metricsService.gauge('cluster.requests.failed', stats.failedRequests)
  metricsService.histogram('cluster.response_time', stats.averageResponseTime)
  
  // 告警
  if (stats.healthyNodes === 0) {
    alertService.critical('All cluster nodes are down!')
  } else if (stats.healthyNodes < stats.totalNodes / 2) {
    alertService.warning('More than half of cluster nodes are unhealthy')
  }
}, 30000) // 每 30 秒
```

---

## ⚙️ 配置选项

### ClusterConfig

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `name` | `string` | 必填 | 集群名称 |
| `strategy` | `LoadBalanceStrategy` | 必填 | 负载均衡策略 |
| `healthCheck.enabled` | `boolean` | `true` | 是否启用健康检查 |
| `healthCheck.interval` | `number` | `10000` | 健康检查间隔 (毫秒) |
| `healthCheck.timeout` | `number` | `5000` | 健康检查超时 (毫秒) |
| `healthCheck.unhealthyThreshold` | `number` | `3` | 标记为不健康的失败次数 |
| `healthCheck.healthyThreshold` | `number` | `2` | 恢复健康的成功次数 |
| `stickySessions` | `boolean` | `false` | 是否启用会话粘滞 |
| `maxRetries` | `number` | `3` | 故障转移最大重试次数 |

---

## 🎯 最佳实践

### 1. 选择合适的负载均衡策略

- **轮询 (ROUND_ROBIN)**: 适用于节点性能相近的场景
- **加权 (WEIGHTED)**: 适用于节点性能差异较大的场景
- **最少连接数 (LEAST_CONNECTIONS)**: 适用于长连接场景 (如 WebSocket)
- **IP 哈希 (IP_HASH)**: 适用于需要会话保持的场景

### 2. 健康检查调优

```typescript
// 生产环境推荐配置
healthCheck: {
  enabled: true,
  interval: 5000,      // 5 秒检查一次
  timeout: 3000,       // 3 秒超时
  unhealthyThreshold: 2, // 连续 2 次失败即标记
  healthyThreshold: 3,   // 连续 3 次成功才恢复 (避免抖动)
}
```

### 3. 故障转移策略

```typescript
// 优雅降级
async function handleRequestWithFallback(request: any) {
  try {
    return await handleRequest(cluster, request)
  } catch (error) {
    // 集群完全不可用时，使用备用方案
    return await handleWithFallback(request)
  }
}
```

### 4. 资源清理

```typescript
// 应用关闭时清理资源
process.on('SIGTERM', () => {
  cluster.destroy()
  process.exit(0)
})
```

---

## 🔧 故障排查

### 常见问题

#### 1. 节点一直被标记为不健康

**原因:** 健康检查配置过于严格或网络问题

**解决方案:**
```typescript
// 增加阈值和超时
healthCheck: {
  unhealthyThreshold: 5,  // 增加失败容忍
  timeout: 10000,         // 增加超时时间
}
```

#### 2. 负载不均衡

**原因:** 使用了轮询策略但节点性能差异大

**解决方案:**
```typescript
// 改用加权策略
strategy: LoadBalanceStrategy.WEIGHTED

// 为高性能节点设置更高权重
cluster.addNode({ id: 'node-1', ..., weight: 3 })
cluster.addNode({ id: 'node-2', ..., weight: 1 })
```

#### 3. 会话粘滞失效

**原因:** 节点故障后会话丢失

**解决方案:**
```typescript
// 结合外部会话存储
const sessionStore = new Map()

function getSessionNode(clientId: string) {
  let node = cluster.getStickyNode(clientId)
  
  if (!node) {
    // 从外部存储恢复
    const savedNodeId = sessionStore.get(clientId)
    if (savedNodeId) {
      node = cluster.getNode(savedNodeId)
    }
  }
  
  if (node) {
    sessionStore.set(clientId, node.id)
  }
  
  return node
}
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✅ 初始版本发布
- ✅ 支持 4 种负载均衡策略
- ✅ 自动健康检查
- ✅ 故障转移机制
- ✅ 会话粘滞支持
- ✅ 实时统计监控

---

## 📄 许可证

MIT License

---

**作者:** ACE (Autonomous Cluster Executor)  
**联系:** axon-cluster@example.com
