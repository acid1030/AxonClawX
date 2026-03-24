# 🔀 负载均衡工具 - Load Balancer Skill

**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📋 概述

提供三种经典负载均衡算法的 TypeScript 实现，用于在多个服务器节点之间分配请求。

### 支持的算法

| 算法 | 类名 | 适用场景 |
|------|------|----------|
| **轮询** | `RoundRobinLoadBalancer` | 节点性能相近，请求处理时间相似 |
| **加权轮询** | `WeightedRoundRobinLoadBalancer` | 节点性能不一致，需要按容量分配 |
| **最少连接** | `LeastConnectionsLoadBalancer` | 长连接场景，请求处理时间差异大 |

---

## 🚀 快速开始

### 安装依赖

```bash
# 无需额外依赖，纯 TypeScript 实现
```

### 基本使用

```typescript
import { 
  RoundRobinLoadBalancer,
  WeightedRoundRobinLoadBalancer,
  LeastConnectionsLoadBalancer,
  createLoadBalancer
} from './load-balancer-skill';
```

---

## 📖 API 文档

### 类型定义

#### ServerNode - 服务器节点

```typescript
interface ServerNode {
  id: string;                    // 节点唯一标识
  address: string;               // 节点地址 (IP:Port 或 URL)
  weight?: number;               // 节点权重 (用于加权轮询)
  activeConnections?: number;    // 当前活跃连接数 (用于最少连接)
  healthy?: boolean;             // 节点是否健康
  metadata?: Record<string, any>; // 节点元数据
}
```

#### LoadBalanceResult - 负载均衡结果

```typescript
interface LoadBalanceResult {
  node: ServerNode | null;       // 选中的节点
  nodeId: string | null;         // 节点 ID
  nodeAddress: string | null;    // 节点地址
  algorithm: string;             // 使用的算法
  timestamp: number;             // 时间戳
}
```

---

## 🔄 1. 轮询算法 (Round Robin)

### 算法原理

按顺序循环分配请求到每个节点，每个节点获得均等的请求量。

```
请求 1 → Node A
请求 2 → Node B
请求 3 → Node C
请求 4 → Node A
请求 5 → Node B
...
```

### 适用场景

- ✅ 节点性能相近
- ✅ 请求处理时间相似
- ✅ 简单的负载分配需求
- ❌ 节点性能差异大
- ❌ 请求处理时间波动大

### 使用示例

```typescript
const lb = new RoundRobinLoadBalancer({
  nodes: [
    { id: 'node1', address: '192.168.1.1:8080' },
    { id: 'node2', address: '192.168.1.2:8080' },
    { id: 'node3', address: '192.168.1.3:8080' }
  ]
});

// 获取下一个节点
const result = lb.getNext();
console.log(result.nodeAddress); // 192.168.1.1:8080

const result2 = lb.getNext();
console.log(result2.nodeAddress); // 192.168.1.2:8080

// 添加节点
lb.addNode({ id: 'node4', address: '192.168.1.4:8080' });

// 移除节点
lb.removeNode('node1');

// 获取节点数量
console.log(lb.getNodeCount()); // 3

// 重置索引
lb.reset();
```

---

## ⚖️ 2. 加权轮询算法 (Weighted Round Robin)

### 算法原理

每个节点分配一个权重值，权重越高获得的请求比例越高。使用**平滑加权算法**，避免突发分配。

```
Node A: 权重 5 → 50% 请求
Node B: 权重 3 → 30% 请求
Node C: 权重 2 → 20% 请求
```

### 适用场景

- ✅ 节点性能不一致
- ✅ 需要根据服务器容量分配
- ✅ 灰度发布/金丝雀发布
- ❌ 节点性能完全相同
- ❌ 需要绝对均匀分配

### 使用示例

```typescript
const lb = new WeightedRoundRobinLoadBalancer({
  nodes: [
    { id: 'node1', address: '192.168.1.1:8080', weight: 5 },
    { id: 'node2', address: '192.168.1.2:8080', weight: 3 },
    { id: 'node3', address: '192.168.1.3:8080', weight: 2 }
  ]
});

// 获取权重分布
const distribution = lb.getWeightDistribution();
distribution.forEach(node => {
  console.log(`${node.id}: 权重 ${node.weight}`);
});

// 更新节点权重
lb.updateWeight('node1', 10);

// 获取 10 次，权重高的节点会被更多次选中
const stats = new Map<string, number>();
for (let i = 0; i < 10; i++) {
  const result = lb.getNext();
  stats.set(result.nodeId, (stats.get(result.nodeId) ?? 0) + 1);
}

console.log('分配统计:');
stats.forEach((count, nodeId) => {
  console.log(`  ${nodeId}: ${count} 次`);
});

// 重置权重
lb.reset();
```

### 平滑加权算法说明

传统加权轮询可能导致突发分配（如连续 5 次都选 Node A），平滑加权算法通过维护**当前权重**来避免这个问题：

1. 所有节点的当前权重 += 原始权重
2. 选择当前权重最大的节点
3. 选中节点的当前权重 -= 总权重

这样可以保证权重分布更加平滑。

---

## 🔗 3. 最少连接算法 (Least Connections)

### 算法原理

追踪每个节点的活跃连接数，将新请求分配给连接数最少的节点。

```
Node A: 10 个连接
Node B: 5 个连接  ← 新请求分配到这里
Node C: 20 个连接
```

### 适用场景

- ✅ 请求处理时间差异大
- ✅ 长连接场景 (WebSocket, 数据库连接)
- ✅ 需要动态负载均衡
- ❌ 短连接、快速响应的 HTTP 请求
- ❌ 连接数不能准确反映负载

### 使用示例

```typescript
const lb = new LeastConnectionsLoadBalancer({
  nodes: [
    { id: 'node1', address: '192.168.1.1:8080', activeConnections: 10 },
    { id: 'node2', address: '192.168.1.2:8080', activeConnections: 5 },
    { id: 'node3', address: '192.168.1.3:8080', activeConnections: 20 }
  ]
});

// 获取连接数分布
const distribution = lb.getConnectionDistribution();
distribution.forEach(node => {
  console.log(`${node.id}: ${node.connections} 个连接`);
});

// 获取下一个节点 (会选择 node2，连接数最少)
const result = lb.getNext();
console.log(result.nodeId); // node2

// 增加连接数 (请求开始时调用)
lb.incrementConnections('node2');

// 减少连接数 (请求结束时调用)
lb.decrementConnections('node2');

// 更新连接数
lb.updateConnections('node1', 50);

// 重置连接数
lb.reset();
```

### 典型使用模式

```typescript
// HTTP 服务器示例
app.use('/api', (req, res) => {
  // 1. 选择节点
  const result = lb.getNext();
  
  // 2. 增加连接数
  lb.incrementConnections(result.nodeId);
  
  // 3. 转发请求
  proxy.web(req, res, { target: result.nodeAddress }, (err) => {
    // 4. 请求结束，减少连接数
    lb.decrementConnections(result.nodeId);
  });
});
```

---

## 🏭 工厂函数

使用工厂函数可以更方便地创建不同类型的负载均衡器：

```typescript
import { createLoadBalancer } from './load-balancer-skill';

// 创建轮询负载均衡器
const lb1 = createLoadBalancer('round-robin', {
  nodes: [
    { id: 'node1', address: '192.168.1.1:8080' },
    { id: 'node2', address: '192.168.1.2:8080' }
  ]
});

// 创建加权轮询负载均衡器
const lb2 = createLoadBalancer('weighted-round-robin', {
  nodes: [
    { id: 'node1', address: '192.168.1.1:8080', weight: 5 },
    { id: 'node2', address: '192.168.1.2:8080', weight: 3 }
  ]
});

// 创建最少连接负载均衡器
const lb3 = createLoadBalancer('least-connections', {
  nodes: [
    { id: 'node1', address: '192.168.1.1:8080', activeConnections: 10 },
    { id: 'node2', address: '192.168.1.2:8080', activeConnections: 5 }
  ]
});
```

---

## 🏥 健康检查

所有负载均衡器都支持健康检查功能，自动跳过不健康的节点：

```typescript
const lb = new RoundRobinLoadBalancer({
  healthCheck: true, // 启用健康检查
  nodes: [
    { id: 'node1', address: '192.168.1.1:8080', healthy: true },
    { id: 'node2', address: '192.168.1.2:8080', healthy: false }, // 不健康
    { id: 'node3', address: '192.168.1.3:8080', healthy: true }
  ]
});

// 只会分配到 node1 和 node3
const result = lb.getNext();
console.log(result.nodeId); // node1 或 node3，不会是 node2

// 动态更新节点健康状态
const nodes = lb.getNodes();
nodes.find(n => n.id === 'node2')!.healthy = true;
lb.updateNodes(nodes);

// 现在 node2 也可以接收请求了
```

---

## 🎯 实际应用场景

### 场景 1: API 网关

```typescript
// 使用加权轮询，根据服务器性能分配
const apiLb = new WeightedRoundRobinLoadBalancer({
  nodes: [
    { id: 'api-1', address: 'http://api-1.internal:3000', weight: 10 },
    { id: 'api-2', address: 'http://api-2.internal:3000', weight: 10 },
    { id: 'api-3', address: 'http://api-3.internal:3000', weight: 5 } // 性能较弱
  ]
});

// 在网关中使用
app.use('/api/*', (req, res) => {
  const target = apiLb.getNext();
  proxy.web(req, res, { target: target.nodeAddress });
});
```

### 场景 2: WebSocket 服务器

```typescript
// 使用最少连接，平衡长连接负载
const wsLb = new LeastConnectionsLoadBalancer({
  nodes: [
    { id: 'ws-1', address: 'ws://ws-1.internal:8080', activeConnections: 0 },
    { id: 'ws-2', address: 'ws://ws-2.internal:8080', activeConnections: 0 },
    { id: 'ws-3', address: 'ws://ws-3.internal:8080', activeConnections: 0 }
  ]
});

// 在 WebSocket 代理中使用
wss.on('connection', (client) => {
  const target = wsLb.getNext();
  wsLb.incrementConnections(target.nodeId);
  
  const backend = new WebSocket(target.nodeAddress);
  
  backend.on('close', () => {
    wsLb.decrementConnections(target.nodeId);
  });
  
  // 双向转发...
});
```

### 场景 3: 数据库连接池

```typescript
// 使用最少连接，平衡数据库负载
const dbLb = new LeastConnectionsLoadBalancer({
  nodes: [
    { id: 'db-master', address: 'mysql://master.db:3306', weight: 10 },
    { id: 'db-slave-1', address: 'mysql://slave1.db:3306', weight: 5 },
    { id: 'db-slave-2', address: 'mysql://slave2.db:3306', weight: 5 }
  ]
});

// 查询路由
function getReadConnection() {
  const target = dbLb.getNext();
  dbLb.incrementConnections(target.nodeId);
  
  const conn = createConnection(target.nodeAddress);
  
  conn.on('end', () => {
    dbLb.decrementConnections(target.nodeId);
  });
  
  return conn;
}
```

### 场景 4: 灰度发布

```typescript
// 使用加权轮询，逐步增加新版本流量
const canaryLb = new WeightedRoundRobinLoadBalancer({
  nodes: [
    { id: 'v1', address: 'http://app-v1.internal:3000', weight: 90 }, // 90% 流量
    { id: 'v2', address: 'http://app-v2.internal:3000', weight: 10 }  // 10% 流量
  ]
});

// 逐步调整权重
function increaseCanaryTraffic(percent: number) {
  canaryLb.updateWeight('v1', 100 - percent);
  canaryLb.updateWeight('v2', percent);
}

// 5% → 10% → 25% → 50% → 100%
increaseCanaryTraffic(5);
setTimeout(() => increaseCanaryTraffic(10), 60000);
setTimeout(() => increaseCanaryTraffic(25), 120000);
// ...
```

---

## 🧪 运行示例

直接运行文件查看完整示例：

```bash
# 使用 tsx
npx tsx src/skills/load-balancer-skill.ts

# 或使用 Node.js + ts-node
npx ts-node src/skills/load-balancer-skill.ts

# 输出示例:
# ============================================================
# 🔄 负载均衡工具 - 使用示例
# ============================================================
# 
# 📍 示例 1: 轮询算法 (Round Robin)
# ------------------------------------------------------------
# 节点列表:
#   - node1: 192.168.1.1:8080
#   - node2: 192.168.1.2:8080
#   - node3: 192.168.1.3:8080
# 
# 请求分配 (6 次):
#   请求 1: node1 (192.168.1.1:8080)
#   请求 2: node2 (192.168.1.2:8080)
#   请求 3: node3 (192.168.1.3:8080)
#   请求 4: node1 (192.168.1.1:8080)
#   请求 5: node2 (192.168.1.2:8080)
#   请求 6: node3 (192.168.1.3:8080)
# ...
```

---

## 📊 算法对比

| 特性 | 轮询 | 加权轮询 | 最少连接 |
|------|------|----------|----------|
| **实现复杂度** | ⭐ | ⭐⭐ | ⭐⭐ |
| **性能开销** | 极低 | 低 | 中 |
| **适应性** | 低 | 中 | 高 |
| **状态保持** | 无状态 | 有状态 | 有状态 |
| **适合场景** | 简单均匀分配 | 性能差异场景 | 长连接场景 |
| **健康检查** | ✅ | ✅ | ✅ |
| **动态调整** | ❌ | ✅ | ✅ |

---

## ⚠️ 注意事项

1. **线程安全**: 本实现不是线程安全的，在多线程环境下需要加锁
2. **持久化**: 连接数和权重状态在重启后会丢失，需要外部存储
3. **健康检查**: 健康状态需要外部机制更新（如心跳检测）
4. **性能**: 高并发场景下，最少连接算法的开销最大

---

## 🔧 扩展建议

### 1. 添加持久化

```typescript
import { writeFile, readFile } from 'fs/promises';

class PersistentLoadBalancer extends LeastConnectionsLoadBalancer {
  async saveState(filePath: string) {
    const state = this.getConnectionDistribution();
    await writeFile(filePath, JSON.stringify(state, null, 2));
  }
  
  async loadState(filePath: string) {
    const data = await readFile(filePath, 'utf-8');
    const state = JSON.parse(data);
    state.forEach((node: any) => {
      this.updateConnections(node.id, node.connections);
    });
  }
}
```

### 2. 添加自动健康检查

```typescript
class AutoHealthCheckLoadBalancer extends RoundRobinLoadBalancer {
  private checkInterval: NodeJS.Timeout;
  
  startHealthCheck(intervalMs: number = 5000) {
    this.checkInterval = setInterval(async () => {
      const nodes = this.getNodes();
      for (const node of nodes) {
        try {
          await fetch(`http://${node.address}/health`, { timeout: 2000 });
          node.healthy = true;
        } catch {
          node.healthy = false;
        }
      }
    }, intervalMs);
  }
  
  stopHealthCheck() {
    clearInterval(this.checkInterval);
  }
}
```

### 3. 添加监控指标

```typescript
class MonitoredLoadBalancer extends WeightedRoundRobinLoadBalancer {
  private metrics = {
    totalRequests: 0,
    requestsByNode: new Map<string, number>(),
    lastRequestTime: 0
  };
  
  getNext(): LoadBalanceResult {
    const result = super.getNext();
    
    this.metrics.totalRequests++;
    this.metrics.lastRequestTime = Date.now();
    
    if (result.nodeId) {
      const count = this.metrics.requestsByNode.get(result.nodeId) ?? 0;
      this.metrics.requestsByNode.set(result.nodeId, count + 1);
    }
    
    return result;
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
}
```

---

## 📝 总结

负载均衡工具提供了三种经典算法的完整实现：

- **轮询**: 简单、公平、无状态
- **加权轮询**: 灵活、可配置、适合异构集群
- **最少连接**: 智能、动态、适合长连接

选择建议：
- 简单场景 → 轮询
- 服务器性能不一 → 加权轮询
- 长连接/处理时间差异大 → 最少连接

---

**交付完成!** 🎉
