# 图工具技能使用示例

## 快速开始

```typescript
import {
  createGraph,
  addNode,
  addEdge,
  dfs,
  bfs,
  dijkstra,
  topologicalSort,
  hasCycle,
} from './src/skills/graph-utils-skill';
```

---

## 示例 1: 创建图

### 有向图
```typescript
// 创建有向图
const graph = createGraph<string>(true);

// 添加节点
addNode(graph, 'A', '起点');
addNode(graph, 'B', '中间点');
addNode(graph, 'C', '终点');

// 添加带权重的边
addEdge(graph, 'A', 'B', 5);  // A → B，权重 5
addEdge(graph, 'B', 'C', 3);  // B → C，权重 3
```

### 无向图
```typescript
// 创建无向图
const undirectedGraph = createGraph<string>(false);

addNode(undirectedGraph, '北京');
addNode(undirectedGraph, '上海');
addNode(undirectedGraph, '广州');

// 无向图的边会自动添加双向连接
addEdge(undirectedGraph, '北京', '上海', 1000);  // 距离 1000km
addEdge(undirectedGraph, '上海', '广州', 1200);
```

---

## 示例 2: 图遍历

### DFS (深度优先搜索)
```typescript
// 基本用法
const visitOrder = dfs(graph, 'A');
console.log(visitOrder);  // ['A', 'B', 'C']

// 带回调函数
dfs(graph, 'A', (nodeId) => {
  console.log(`访问节点：${nodeId}`);
});
```

### BFS (广度优先搜索)
```typescript
// 基本用法
const visitOrder = bfs(graph, 'A');
console.log(visitOrder);  // ['A', 'B', 'C']

// BFS 适合找最短路径 (无权图)
// 例如：社交网络中找两个人的最短关系链
```

---

## 示例 3: 最短路径 (Dijkstra)

```typescript
// 创建带权重的图
const weightedGraph = createGraph<string>(true);
addNode(weightedGraph, 'A');
addNode(weightedGraph, 'B');
addNode(weightedGraph, 'C');
addNode(weightedGraph, 'D');

addEdge(weightedGraph, 'A', 'B', 1);
addEdge(weightedGraph, 'A', 'C', 4);
addEdge(weightedGraph, 'B', 'C', 2);
addEdge(weightedGraph, 'B', 'D', 5);
addEdge(weightedGraph, 'C', 'D', 1);

// 找 A 到 D 的最短路径
const result = dijkstra(weightedGraph, 'A', 'D');

console.log('最短路径:', result.path);        // ['A', 'B', 'C', 'D']
console.log('总距离:', result.distances.get('D'));  // 4

// 获取所有节点的距离
for (const [node, distance] of result.distances.entries()) {
  console.log(`${node}: ${distance}`);
}
```

### 实际应用场景
```typescript
// 地图导航：找两个城市的最短路径
const cities = createGraph<string>(false);
addNode(cities, '北京');
addNode(cities, '上海');
addNode(cities, '武汉');
addNode(cities, '成都');

addEdge(cities, '北京', '武汉', 1100);
addEdge(cities, '武汉', '上海', 800);
addEdge(cities, '武汉', '成都', 1000);
addEdge(cities, '北京', '成都', 1500);

const route = dijkstra(cities, '北京', '上海');
console.log(`推荐路线：${route.path.join(' → ')}`);
console.log(`总距离：${route.distances.get('上海')} km`);
```

---

## 示例 4: 拓扑排序

```typescript
// 课程依赖关系 (有向无环图)
const courses = createGraph<string>(true);
addNode(courses, '数学基础');
addNode(courses, '线性代数');
addNode(courses, '概率论');
addNode(courses, '机器学习');
addNode(courses, '深度学习');

// 添加依赖关系 (先修课程 → 后续课程)
addEdge(courses, '数学基础', '线性代数');
addEdge(courses, '数学基础', '概率论');
addEdge(courses, '线性代数', '机器学习');
addEdge(courses, '概率论', '机器学习');
addEdge(courses, '机器学习', '深度学习');

// 获取学习顺序
const order = topologicalSort(courses);
if (order) {
  console.log('推荐学习顺序:');
  order.forEach((course, index) => {
    console.log(`${index + 1}. ${course}`);
  });
} else {
  console.log('存在循环依赖，无法确定学习顺序!');
}
```

### 检测循环依赖
```typescript
// 添加一个循环依赖
addEdge(courses, '深度学习', '数学基础');  // 形成环

const hasCycleResult = hasCycle(courses);
console.log('是否存在循环依赖:', hasCycleResult);  // true

const topoResult = topologicalSort(courses);
console.log('拓扑排序结果:', topoResult);  // null (无法排序)
```

---

## 示例 5: 实际项目场景

### 场景 1: 任务调度系统
```typescript
interface Task {
  id: string;
  name: string;
  duration: number;
}

const taskGraph = createGraph<string>(true);

// 添加任务
const tasks: Task[] = [
  { id: 'T1', name: '需求分析', duration: 2 },
  { id: 'T2', name: '设计', duration: 3 },
  { id: 'T3', name: '开发', duration: 5 },
  { id: 'T4', name: '测试', duration: 2 },
  { id: 'T5', name: '部署', duration: 1 },
];

tasks.forEach(task => addNode(taskGraph, task.id, task.name));

// 添加依赖
addEdge(taskGraph, 'T1', 'T2');
addEdge(taskGraph, 'T2', 'T3');
addEdge(taskGraph, 'T3', 'T4');
addEdge(taskGraph, 'T4', 'T5');

// 获取执行顺序
const executionOrder = topologicalSort(taskGraph);
console.log('任务执行顺序:', executionOrder);
```

### 场景 2: 社交网络分析
```typescript
// 找两个人的共同好友 (BFS 应用)
function findMutualFriends(
  socialGraph: Graph<string>,
  personA: string,
  personB: string
): string[] {
  const friendsA = new Set(getNeighbors(socialGraph, personA));
  const friendsB = new Set(getNeighbors(socialGraph, personB));
  
  const mutual: string[] = [];
  for (const friend of friendsA) {
    if (friendsB.has(friend)) {
      mutual.push(friend);
    }
  }
  
  return mutual;
}

// 找两个人之间的最短关系链
function findShortestConnection(
  socialGraph: Graph<string>,
  personA: string,
  personB: string
): string[] {
  const result = dijkstra(socialGraph, personA, personB);
  return result.path;
}
```

### 场景 3: 依赖管理系统 (如 npm/webpack)
```typescript
interface Package {
  name: string;
  version: string;
  dependencies: string[];
}

function resolveInstallOrder(packages: Package[]): string[] | null {
  const graph = createGraph<string>(true);
  
  // 添加所有包
  packages.forEach(pkg => addNode(graph, pkg.name));
  
  // 添加依赖关系
  packages.forEach(pkg => {
    pkg.dependencies.forEach(dep => {
      addEdge(graph, dep, pkg.name);  // 依赖 → 被依赖
    });
  });
  
  // 检测循环依赖
  if (hasCycle(graph)) {
    console.error('存在循环依赖!');
    return null;
  }
  
  // 返回安装顺序
  return topologicalSort(graph)!;
}

// 使用示例
const packages: Package[] = [
  { name: 'react', version: '18.0.0', dependencies: [] },
  { name: 'react-dom', version: '18.0.0', dependencies: ['react'] },
  { name: 'axios', version: '1.0.0', dependencies: [] },
  { name: 'my-app', version: '1.0.0', dependencies: ['react', 'react-dom', 'axios'] },
];

const installOrder = resolveInstallOrder(packages);
console.log('安装顺序:', installOrder);
// 输出：['react', 'axios', 'react-dom', 'my-app']
```

---

## API 参考

### 图构建
| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `createGraph(directed)` | 创建空图 | `directed: boolean` | `Graph<T>` |
| `addNode(graph, id, value)` | 添加节点 | `graph, id, value?` | `void` |
| `addEdge(graph, from, to, weight)` | 添加边 | `graph, from, to, weight?` | `void` |

### 图遍历
| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `dfs(graph, start, visitFn)` | 深度优先搜索 | `graph, start, visitFn?` | `T[]` |
| `bfs(graph, start, visitFn)` | 广度优先搜索 | `graph, start, visitFn?` | `T[]` |

### 最短路径
| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `dijkstra(graph, start, end)` | Dijkstra 算法 | `graph, start, end?` | `{distances, predecessors, path}` |

### 拓扑排序
| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `topologicalSort(graph)` | Kahn 算法 | `graph` | `T[] \| null` |
| `hasCycle(graph)` | 检测环 | `graph` | `boolean` |

### 工具函数
| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getNeighbors(graph, nodeId)` | 获取邻居 | `graph, nodeId` | `T[]` |
| `nodeCount(graph)` | 节点数 | `graph` | `number` |
| `edgeCount(graph)` | 边数 | `graph` | `number` |

---

## 性能说明

| 算法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|----------|
| DFS | O(V + E) | O(V) | 遍历、环检测 |
| BFS | O(V + E) | O(V) | 最短路径 (无权)、层级遍历 |
| Dijkstra | O((V + E) log V) | O(V) | 最短路径 (带权) |
| Topological Sort | O(V + E) | O(V) | 任务调度、依赖解析 |

**V = 节点数，E = 边数**

---

## 注意事项

1. **有向图 vs 无向图**
   - 拓扑排序仅适用于有向图
   - 无向图的边会自动添加双向连接

2. **权重处理**
   - Dijkstra 算法要求权重为非负数
   - 未指定权重时默认为 1

3. **环检测**
   - 当前仅支持有向图的环检测
   - 无向图环检测需要不同算法

4. **泛型支持**
   - 节点 ID 可以是任意类型 (string, number, 自定义对象)
   - 默认使用 string 类型

---

**完成时间:** < 5 分钟  
**文件位置:** `src/skills/graph-utils-skill.ts`
