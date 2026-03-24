/**
 * Graph Utils Skill - KAEL Engineering
 * 
 * 图数据结构处理工具
 * 功能：图遍历 (DFS/BFS)、最短路径 (Dijkstra)、拓扑排序
 */

// ============== 类型定义 ==============

export interface GraphNode<T = string> {
  id: T;
  value?: T;
}

export interface GraphEdge<T = string> {
  from: T;
  to: T;
  weight?: number;
}

export interface Graph<T = string> {
  nodes: Map<T, GraphNode<T>>;
  edges: Map<T, GraphEdge<T>[]>;
  directed: boolean;
}

// ============== 图构建工具 ==============

/**
 * 创建空图
 */
export function createGraph<T = string>(directed: boolean = false): Graph<T> {
  return {
    nodes: new Map<T, GraphNode<T>>(),
    edges: new Map<T, GraphEdge<T>[]>(),
    directed,
  };
}

/**
 * 添加节点
 */
export function addNode<T>(graph: Graph<T>, id: T, value?: T): void {
  if (!graph.nodes.has(id)) {
    graph.nodes.set(id, { id, value });
    graph.edges.set(id, []);
  }
}

/**
 * 添加边
 */
export function addEdge<T>(
  graph: Graph<T>,
  from: T,
  to: T,
  weight?: number
): void {
  if (!graph.edges.has(from)) {
    graph.edges.set(from, []);
  }
  
  graph.edges.get(from)!.push({ from, to, weight });
  
  // 无向图需要添加反向边
  if (!graph.directed) {
    if (!graph.edges.has(to)) {
      graph.edges.set(to, []);
    }
    graph.edges.get(to)!.push({ from: to, to: from, weight });
  }
}

// ============== 图遍历算法 ==============

/**
 * 深度优先搜索 (DFS)
 * @returns 访问顺序的节点 ID 数组
 */
export function dfs<T>(
  graph: Graph<T>,
  start: T,
  visitFn?: (nodeId: T) => void
): T[] {
  const visited = new Set<T>();
  const result: T[] = [];

  function visit(nodeId: T): void {
    if (visited.has(nodeId)) return;
    
    visited.add(nodeId);
    result.push(nodeId);
    
    if (visitFn) {
      visitFn(nodeId);
    }

    const neighbors = graph.edges.get(nodeId) || [];
    for (const edge of neighbors) {
      visit(edge.to);
    }
  }

  visit(start);
  return result;
}

/**
 * 广度优先搜索 (BFS)
 * @returns 访问顺序的节点 ID 数组
 */
export function bfs<T>(
  graph: Graph<T>,
  start: T,
  visitFn?: (nodeId: T) => void
): T[] {
  const visited = new Set<T>();
  const result: T[] = [];
  const queue: T[] = [start];

  visited.add(start);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    if (visitFn) {
      visitFn(nodeId);
    }

    const neighbors = graph.edges.get(nodeId) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push(edge.to);
      }
    }
  }

  return result;
}

// ============== 最短路径算法 ==============

/**
 * Dijkstra 最短路径算法
 * @returns 包含距离和前驱节点的对象
 */
export function dijkstra<T>(
  graph: Graph<T>,
  start: T,
  end?: T
): {
  distances: Map<T, number>;
  predecessors: Map<T, T | null>;
  path: T[];
} {
  const distances = new Map<T, number>();
  const predecessors = new Map<T, T | null>();
  const unvisited = new Set<T>();

  // 初始化
  for (const nodeId of graph.nodes.keys()) {
    distances.set(nodeId, Infinity);
    predecessors.set(nodeId, null);
    unvisited.add(nodeId);
  }
  distances.set(start, 0);

  while (unvisited.size > 0) {
    // 找到距离最小的未访问节点
    let current: T | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId) || Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        current = nodeId;
      }
    }

    if (current === null || minDistance === Infinity) break;

    // 如果已到达目标节点，提前结束
    if (end && current === end) break;

    unvisited.delete(current);

    // 更新邻居节点的距离
    const neighbors = graph.edges.get(current) || [];
    for (const edge of neighbors) {
      if (unvisited.has(edge.to)) {
        const altDistance = (distances.get(current) || 0) + (edge.weight || 1);
        if (altDistance < (distances.get(edge.to) || Infinity)) {
          distances.set(edge.to, altDistance);
          predecessors.set(edge.to, current);
        }
      }
    }
  }

  // 构建路径
  const path: T[] = [];
  if (end) {
    let current: T | null = end;
    while (current !== null) {
      path.unshift(current);
      current = predecessors.get(current) || null;
    }
    if (path[0] !== start) {
      path.length = 0; // 无路径
    }
  }

  return { distances, predecessors, path };
}

// ============== 拓扑排序 ==============

/**
 * 拓扑排序 (Kahn 算法)
 * 仅适用于有向无环图 (DAG)
 * @returns 拓扑排序后的节点数组，如果存在环则返回 null
 */
export function topologicalSort<T>(graph: Graph<T>): T[] | null {
  if (!graph.directed) {
    throw new Error('拓扑排序仅适用于有向图');
  }

  // 计算每个节点的入度
  const inDegree = new Map<T, number>();
  for (const nodeId of graph.nodes.keys()) {
    inDegree.set(nodeId, 0);
  }

  for (const edges of graph.edges.values()) {
    for (const edge of edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }
  }

  // 初始化队列 (入度为 0 的节点)
  const queue: T[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: T[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    const neighbors = graph.edges.get(current) || [];
    for (const edge of neighbors) {
      const newDegree = (inDegree.get(edge.to) || 0) - 1;
      inDegree.set(edge.to, newDegree);
      if (newDegree === 0) {
        queue.push(edge.to);
      }
    }
  }

  // 如果结果节点数不等于总节点数，说明存在环
  if (result.length !== graph.nodes.size) {
    return null;
  }

  return result;
}

// ============== 工具函数 ==============

/**
 * 检查图是否有环 (DFS 方法)
 */
export function hasCycle<T>(graph: Graph<T>): boolean {
  if (!graph.directed) {
    // 无向图的环检测需要不同的算法
    throw new Error('当前仅支持有向图的环检测');
  }

  const WHITE = 0; // 未访问
  const GRAY = 1;  // 正在访问
  const BLACK = 2; // 已访问完成

  const color = new Map<T, number>();
  for (const nodeId of graph.nodes.keys()) {
    color.set(nodeId, WHITE);
  }

  function dfsCycle(nodeId: T): boolean {
    color.set(nodeId, GRAY);

    const neighbors = graph.edges.get(nodeId) || [];
    for (const edge of neighbors) {
      const neighborColor = color.get(edge.to) || WHITE;
      if (neighborColor === GRAY) {
        return true; // 发现后向边，存在环
      }
      if (neighborColor === WHITE && dfsCycle(edge.to)) {
        return true;
      }
    }

    color.set(nodeId, BLACK);
    return false;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (color.get(nodeId) === WHITE) {
      if (dfsCycle(nodeId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 获取节点的所有邻居
 */
export function getNeighbors<T>(graph: Graph<T>, nodeId: T): T[] {
  const edges = graph.edges.get(nodeId) || [];
  return edges.map(edge => edge.to);
}

/**
 * 获取图的节点数
 */
export function nodeCount<T>(graph: Graph<T>): number {
  return graph.nodes.size;
}

/**
 * 获取图的边数
 */
export function edgeCount<T>(graph: Graph<T>): number {
  let count = 0;
  for (const edges of graph.edges.values()) {
    count += edges.length;
  }
  // 无向图的边被计算了两次
  return graph.directed ? count : count / 2;
}

// ============== 使用示例 ==============

/**
 * 使用示例代码
 * 
 * 运行方式：将此文件导入项目后，调用以下函数
 */
export function runExamples(): void {
  console.log('=== 图工具技能使用示例 ===\n');

  // 示例 1: 创建有向图
  console.log('1. 创建有向图:');
  const directedGraph = createGraph<string>(true);
  addNode(directedGraph, 'A', '节点 A');
  addNode(directedGraph, 'B', '节点 B');
  addNode(directedGraph, 'C', '节点 C');
  addNode(directedGraph, 'D', '节点 D');
  addEdge(directedGraph, 'A', 'B', 1);
  addEdge(directedGraph, 'A', 'C', 4);
  addEdge(directedGraph, 'B', 'C', 2);
  addEdge(directedGraph, 'B', 'D', 5);
  addEdge(directedGraph, 'C', 'D', 1);
  console.log(`   节点数：${nodeCount(directedGraph)}`);
  console.log(`   边数：${edgeCount(directedGraph)}\n`);

  // 示例 2: DFS 遍历
  console.log('2. DFS 遍历 (从 A 开始):');
  const dfsResult = dfs(directedGraph, 'A');
  console.log(`   访问顺序：${dfsResult.join(' → ')}\n`);

  // 示例 3: BFS 遍历
  console.log('3. BFS 遍历 (从 A 开始):');
  const bfsResult = bfs(directedGraph, 'A');
  console.log(`   访问顺序：${bfsResult.join(' → ')}\n`);

  // 示例 4: Dijkstra 最短路径
  console.log('4. Dijkstra 最短路径 (A → D):');
  const dijkstraResult = dijkstra(directedGraph, 'A', 'D');
  console.log(`   最短路径：${dijkstraResult.path.join(' → ')}`);
  console.log(`   总距离：${dijkstraResult.distances.get('D')}\n`);

  // 示例 5: 拓扑排序
  console.log('5. 拓扑排序:');
  const topoResult = topologicalSort(directedGraph);
  if (topoResult) {
    console.log(`   拓扑顺序：${topoResult.join(' → ')}`);
  } else {
    console.log('   图中存在环，无法拓扑排序');
  }
  console.log('');

  // 示例 6: 环检测
  console.log('6. 环检测:');
  const hasCycleResult = hasCycle(directedGraph);
  console.log(`   是否存在环：${hasCycleResult}\n`);

  // 示例 7: 创建无向图
  console.log('7. 创建无向图:');
  const undirectedGraph = createGraph<string>(false);
  addNode(undirectedGraph, 'X');
  addNode(undirectedGraph, 'Y');
  addNode(undirectedGraph, 'Z');
  addEdge(undirectedGraph, 'X', 'Y', 3);
  addEdge(undirectedGraph, 'Y', 'Z', 2);
  console.log(`   节点数：${nodeCount(undirectedGraph)}`);
  console.log(`   边数：${edgeCount(undirectedGraph)}\n`);

  console.log('=== 示例完成 ===');
}

// 导出所有公共 API
export default {
  // 类型
  type GraphNode,
  type GraphEdge,
  type Graph,
  
  // 图构建
  createGraph,
  addNode,
  addEdge,
  
  // 图遍历
  dfs,
  bfs,
  
  // 最短路径
  dijkstra,
  
  // 拓扑排序
  topologicalSort,
  
  // 工具函数
  hasCycle,
  getNeighbors,
  nodeCount,
  edgeCount,
  
  // 示例
  runExamples,
};
