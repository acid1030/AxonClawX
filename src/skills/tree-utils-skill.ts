/**
 * Tree Utils Skill - 树形数据结构处理工具
 * 
 * 功能:
 * 1. 树形遍历 (DFS/BFS)
 * 2. 扁平化/去扁平化
 * 3. 路径查找
 */

// ============== 类型定义 ==============

export interface TreeNode<T = any> {
  id: string | number;
  name?: string;
  children?: TreeNode<T>[];
  data?: T;
  parentId?: string | number | null;
}

export interface FlatTreeNode<T = any> {
  id: string | number;
  parentId?: string | number | null;
  name?: string;
  data?: T;
  level?: number;
}

export interface TreePath {
  path: (string | number)[];
  nodes: TreeNode[];
  found: boolean;
}

// ============== 1. 树形遍历 ==============

/**
 * DFS 深度优先遍历 (递归)
 * @param tree 树形结构
 * @param callback 访问每个节点的回调
 */
export function dfs<T>(
  tree: TreeNode<T>,
  callback: (node: TreeNode<T>, level: number) => void,
  level: number = 0
): void {
  callback(tree, level);
  if (tree.children && tree.children.length > 0) {
    for (const child of tree.children) {
      dfs(child, callback, level + 1);
    }
  }
}

/**
 * DFS 深度优先遍历 (迭代 - 使用栈)
 * @param tree 树形结构
 * @param callback 访问每个节点的回调
 */
export function dfsIterative<T>(
  tree: TreeNode<T>,
  callback: (node: TreeNode<T>, level: number) => void
): void {
  const stack: { node: TreeNode<T>; level: number }[] = [{ node: tree, level: 0 }];
  
  while (stack.length > 0) {
    const { node, level } = stack.pop()!;
    callback(node, level);
    
    if (node.children && node.children.length > 0) {
      // 逆序入栈以保证从左到右遍历
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push({ node: node.children[i], level: level + 1 });
      }
    }
  }
}

/**
 * BFS 广度优先遍历 (层序遍历)
 * @param tree 树形结构
 * @param callback 访问每个节点的回调
 */
export function bfs<T>(
  tree: TreeNode<T>,
  callback: (node: TreeNode<T>, level: number) => void
): void {
  const queue: { node: TreeNode<T>; level: number }[] = [{ node: tree, level: 0 }];
  
  while (queue.length > 0) {
    const { node, level } = queue.shift()!;
    callback(node, level);
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        queue.push({ node: child, level: level + 1 });
      }
    }
  }
}

/**
 * 按层级分组遍历
 * @param tree 树形结构
 * @returns 按层级分组的节点数组
 */
export function bfsByLevel<T>(tree: TreeNode<T>): TreeNode<T>[][] {
  const result: TreeNode<T>[][] = [];
  const queue: { node: TreeNode<T>; level: number }[] = [{ node: tree, level: 0 }];
  
  while (queue.length > 0) {
    const { node, level } = queue.shift()!;
    
    if (!result[level]) {
      result[level] = [];
    }
    result[level].push(node);
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        queue.push({ node: child, level: level + 1 });
      }
    }
  }
  
  return result;
}

// ============== 2. 扁平化/去扁平化 ==============

/**
 * 树形结构转扁平数组
 * @param tree 树形结构
 * @returns 扁平化节点数组
 */
export function flattenTree<T>(tree: TreeNode<T>): FlatTreeNode<T>[] {
  const result: FlatTreeNode<T>[] = [];
  
  dfs(tree, (node, level) => {
    result.push({
      id: node.id,
      parentId: node.parentId ?? null,
      name: node.name,
      data: node.data,
      level,
    });
  });
  
  return result;
}

/**
 * 扁平数组转树形结构
 * @param flatNodes 扁平节点数组
 * @param rootId 根节点 ID
 * @returns 树形结构
 */
export function unflattenTree<T>(
  flatNodes: FlatTreeNode<T>[],
  rootId: string | number
): TreeNode<T> | null {
  const nodeMap = new Map<string | number, TreeNode<T>>();
  
  // 创建所有节点
  for (const node of flatNodes) {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      data: node.data,
      parentId: node.parentId ?? null,
      children: [],
    });
  }
  
  // 构建树形结构
  const root = nodeMap.get(rootId) ?? null;
  
  for (const node of flatNodes) {
    const treeNode = nodeMap.get(node.id);
    if (!treeNode) continue;
    
    if (node.parentId === null || node.parentId === undefined) {
      continue; // 根节点已处理
    }
    
    const parent = nodeMap.get(node.parentId);
    if (parent && parent.children) {
      parent.children.push(treeNode);
    }
  }
  
  return root;
}

/**
 * 从扁平数组构建多叉树 (支持多个根节点)
 * @param flatNodes 扁平节点数组
 * @returns 树形结构数组
 */
export function buildMultiRootTree<T>(flatNodes: FlatTreeNode<T>[]): TreeNode<T>[] {
  const nodeMap = new Map<string | number, TreeNode<T>>();
  const roots: TreeNode<T>[] = [];
  
  // 创建所有节点
  for (const node of flatNodes) {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name,
      data: node.data,
      parentId: node.parentId ?? null,
      children: [],
    });
  }
  
  // 构建树形结构
  for (const node of flatNodes) {
    const treeNode = nodeMap.get(node.id);
    if (!treeNode) continue;
    
    if (node.parentId === null || node.parentId === undefined) {
      roots.push(treeNode);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent && parent.children) {
        parent.children.push(treeNode);
      }
    }
  }
  
  return roots;
}

// ============== 3. 路径查找 ==============

/**
 * 查找节点路径 (DFS)
 * @param tree 树形结构
 * @param targetId 目标节点 ID
 * @returns 路径信息
 */
export function findPath<T>(tree: TreeNode<T>, targetId: string | number): TreePath {
  const path: (string | number)[] = [];
  const nodes: TreeNode<T>[] = [];
  
  function dfsFind(node: TreeNode<T>, currentPath: (string | number)[], currentNodes: TreeNode<T>[]): boolean {
    currentPath.push(node.id);
    currentNodes.push(node);
    
    if (node.id === targetId) {
      return true;
    }
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (dfsFind(child, currentPath, currentNodes)) {
          return true;
        }
      }
    }
    
    currentPath.pop();
    currentNodes.pop();
    return false;
  }
  
  const found = dfsFind(tree, path, nodes);
  
  return {
    path,
    nodes,
    found,
  };
}

/**
 * 查找所有匹配节点的路径
 * @param tree 树形结构
 * @param predicate 匹配条件
 * @returns 所有匹配路径
 */
export function findAllPaths<T>(
  tree: TreeNode<T>,
  predicate: (node: TreeNode<T>) => boolean
): TreePath[] {
  const results: TreePath[] = [];
  
  function dfsFind(
    node: TreeNode<T>,
    currentPath: (string | number)[],
    currentNodes: TreeNode<T>[]
  ): void {
    currentPath.push(node.id);
    currentNodes.push(node);
    
    if (predicate(node)) {
      results.push({
        path: [...currentPath],
        nodes: [...currentNodes],
        found: true,
      });
    }
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        dfsFind(child, currentPath, currentNodes);
      }
    }
    
    currentPath.pop();
    currentNodes.pop();
  }
  
  dfsFind(tree, [], []);
  return results;
}

/**
 * 获取节点的深度
 * @param tree 树形结构
 * @param nodeId 节点 ID
 * @returns 节点深度 (根节点为 0)
 */
export function getNodeDepth<T>(tree: TreeNode<T>, nodeId: string | number): number {
  const result = findPath(tree, nodeId);
  return result.found ? result.path.length - 1 : -1;
}

/**
 * 获取节点的高度 (到最远叶子节点的距离)
 * @param node 节点
 * @returns 节点高度
 */
export function getNodeHeight<T>(node: TreeNode<T>): number {
  if (!node.children || node.children.length === 0) {
    return 0;
  }
  
  let maxChildHeight = 0;
  for (const child of node.children) {
    const childHeight = getNodeHeight(child);
    maxChildHeight = Math.max(maxChildHeight, childHeight);
  }
  
  return maxChildHeight + 1;
}

// ============== 4. 实用工具函数 ==============

/**
 * 获取树的所有叶子节点
 * @param tree 树形结构
 * @returns 叶子节点数组
 */
export function getLeafNodes<T>(tree: TreeNode<T>): TreeNode<T>[] {
  const leaves: TreeNode<T>[] = [];
  
  dfs(tree, (node) => {
    if (!node.children || node.children.length === 0) {
      leaves.push(node);
    }
  });
  
  return leaves;
}

/**
 * 获取树的最大深度
 * @param tree 树形结构
 * @returns 最大深度
 */
export function getMaxDepth<T>(tree: TreeNode<T>): number {
  let maxDepth = 0;
  
  dfs(tree, (_, level) => {
    maxDepth = Math.max(maxDepth, level);
  });
  
  return maxDepth;
}

/**
 * 根据 ID 查找节点
 * @param tree 树形结构
 * @param nodeId 节点 ID
 * @returns 找到的节点或 null
 */
export function findNodeById<T>(tree: TreeNode<T>, nodeId: string | number): TreeNode<T> | null {
  let found: TreeNode<T> | null = null;
  
  dfs(tree, (node) => {
    if (node.id === nodeId) {
      found = node;
    }
  });
  
  return found;
}

/**
 * 根据条件查找节点
 * @param tree 树形结构
 * @param predicate 匹配条件
 * @returns 找到的节点或 null
 */
export function findNode<T>(tree: TreeNode<T>, predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null {
  let found: TreeNode<T> | null = null;
  
  dfs(tree, (node) => {
    if (predicate(node)) {
      found = node;
    }
  });
  
  return found;
}

/**
 * 获取节点的兄弟节点
 * @param tree 树形结构
 * @param nodeId 节点 ID
 * @returns 兄弟节点数组 (不包含自身)
 */
export function getSiblings<T>(tree: TreeNode<T>, nodeId: string | number): TreeNode<T>[] {
  const path = findPath(tree, nodeId);
  
  if (!path.found || path.nodes.length < 2) {
    return [];
  }
  
  const parent = path.nodes[path.nodes.length - 2];
  if (!parent.children) {
    return [];
  }
  
  return parent.children.filter(child => child.id !== nodeId);
}

/**
 * 计算树的节点总数
 * @param tree 树形结构
 * @returns 节点总数
 */
export function countNodes<T>(tree: TreeNode<T>): number {
  let count = 0;
  dfs(tree, () => count++);
  return count;
}

// ============== 使用示例 ==============

/**
 * 使用示例
 */
export function runExamples(): void {
  console.log('=== Tree Utils Skill Examples ===\n');
  
  // 创建示例树
  const exampleTree: TreeNode = {
    id: 'root',
    name: '根节点',
    children: [
      {
        id: 'a',
        name: '节点 A',
        children: [
          { id: 'a1', name: '节点 A1' },
          { id: 'a2', name: '节点 A2', children: [{ id: 'a21', name: '节点 A21' }] },
        ],
      },
      {
        id: 'b',
        name: '节点 B',
        children: [
          { id: 'b1', name: '节点 B1' },
          { id: 'b2', name: '节点 B2' },
        ],
      },
      { id: 'c', name: '节点 C' },
    ],
  };
  
  // 1. DFS 遍历
  console.log('1. DFS 遍历:');
  dfs(exampleTree, (node, level) => {
    console.log(`  ${'  '.repeat(level)}${node.name} (Level ${level})`);
  });
  
  // 2. BFS 遍历
  console.log('\n2. BFS 遍历:');
  bfs(exampleTree, (node, level) => {
    console.log(`  ${'  '.repeat(level)}${node.name} (Level ${level})`);
  });
  
  // 3. 扁平化
  console.log('\n3. 扁平化:');
  const flat = flattenTree(exampleTree);
  flat.forEach(node => {
    console.log(`  ID: ${node.id}, Parent: ${node.parentId}, Level: ${node.level}`);
  });
  
  // 4. 去扁平化
  console.log('\n4. 去扁平化:');
  const restored = unflattenTree(flat, 'root');
  console.log(`  恢复的树根节点: ${restored?.name}`);
  console.log(`  子节点数量: ${restored?.children?.length}`);
  
  // 5. 路径查找
  console.log('\n5. 路径查找 (查找 a21):');
  const path = findPath(exampleTree, 'a21');
  console.log(`  找到: ${path.found}`);
  console.log(`  路径: ${path.path.join(' → ')}`);
  console.log(`  深度: ${path.path.length - 1}`);
  
  // 6. 实用工具
  console.log('\n6. 实用工具:');
  console.log(`  节点总数: ${countNodes(exampleTree)}`);
  console.log(`  最大深度: ${getMaxDepth(exampleTree)}`);
  console.log(`  叶子节点数: ${getLeafNodes(exampleTree).length}`);
  console.log(`  节点 A 的兄弟节点: ${getSiblings(exampleTree, 'a').map(n => n.name).join(', ')}`);
  
  console.log('\n=== Examples Complete ===');
}

// 导出所有函数
export default {
  // 遍历
  dfs,
  dfsIterative,
  bfs,
  bfsByLevel,
  // 扁平化
  flattenTree,
  unflattenTree,
  buildMultiRootTree,
  // 路径查找
  findPath,
  findAllPaths,
  getNodeDepth,
  getNodeHeight,
  // 工具函数
  getLeafNodes,
  getMaxDepth,
  findNodeById,
  findNode,
  getSiblings,
  countNodes,
  // 示例
  runExamples,
};
