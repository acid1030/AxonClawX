/**
 * Composite Pattern Skill - 树形结构组合模式
 * 
 * 功能:
 * 1. 组件定义 (Leaf/Composite)
 * 2. 树形组合
 * 3. 统一操作
 * 
 * @author KAEL
 * @date 2026-03-13
 */

// ==================== 类型定义 ====================

/** 组件接口 - 所有节点的统一抽象 */
interface IComponent {
  name: string;
  parent: IComponent | null;
  
  // 统一操作
  operation(): string;
  add(component: IComponent): void;
  remove(component: IComponent): void;
  getChild(index: number): IComponent | null;
  
  // 树形操作
  getPath(): string;
  getDepth(): number;
  traverse(callback: (node: IComponent) => void): void;
  
  // 类型判断
  isLeaf(): boolean;
  isComposite(): boolean;
  
  // 元数据
  getMetadata(key?: string): any;
}

/** 叶子节点 - 树形结构的基本单元 */
class Leaf implements IComponent {
  name: string;
  parent: IComponent | null = null;
  private metadata: Map<string, any> = new Map();

  constructor(name: string, metadata?: Record<string, any>) {
    this.name = name;
    if (metadata) {
      Object.entries(metadata).forEach(([k, v]) => this.metadata.set(k, v));
    }
  }

  operation(): string {
    return `[Leaf] ${this.name} executed - ${this.getMetadata()}`;
  }

  add(component: IComponent): void {
    throw new Error(`Leaf node "${this.name}" cannot have children`);
  }

  remove(component: IComponent): void {
    throw new Error(`Leaf node "${this.name}" cannot remove children`);
  }

  getChild(index: number): IComponent | null {
    throw new Error(`Leaf node "${this.name}" has no children`);
  }

  getPath(): string {
    const path: string[] = [this.name];
    let current = this.parent;
    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }
    return path.join(' / ');
  }

  getDepth(): number {
    let depth = 0;
    let current = this.parent;
    while (current) {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  traverse(callback: (node: IComponent) => void): void {
    callback(this);
  }

  isLeaf(): boolean {
    return true;
  }

  isComposite(): boolean {
    return false;
  }

  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  getMetadata(key?: string): any {
    if (key) return this.metadata.get(key);
    return Array.from(this.metadata.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join(', ') || 'no metadata';
  }
}

/** 组合节点 - 可包含子节点的容器 */
class Composite implements IComponent {
  name: string;
  parent: IComponent | null = null;
  private children: IComponent[] = [];
  private metadata: Map<string, any> = new Map();

  constructor(name: string, metadata?: Record<string, any>) {
    this.name = name;
    if (metadata) {
      Object.entries(metadata).forEach(([k, v]) => this.metadata.set(k, v));
    }
  }

  operation(): string {
    const results = this.children.map(child => child.operation());
    return `[Composite] ${this.name} executed with ${this.children.length} children:\n  ${results.join('\n  ')}`;
  }

  add(component: IComponent): void {
    if (this.children.includes(component)) {
      throw new Error(`Component "${component.name}" already exists`);
    }
    component.parent = this;
    this.children.push(component);
  }

  remove(component: IComponent): void {
    const index = this.children.indexOf(component);
    if (index === -1) {
      throw new Error(`Component "${component.name}" not found`);
    }
    component.parent = null;
    this.children.splice(index, 1);
  }

  getChild(index: number): IComponent | null {
    return this.children[index] || null;
  }

  getChildren(): IComponent[] {
    return [...this.children];
  }

  getPath(): string {
    const path: string[] = [this.name];
    let current = this.parent;
    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }
    return path.join(' / ');
  }

  getDepth(): number {
    let depth = 0;
    let current = this.parent;
    while (current) {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  traverse(callback: (node: IComponent) => void): void {
    callback(this);
    this.children.forEach(child => child.traverse(callback));
  }

  isLeaf(): boolean {
    return false;
  }

  isComposite(): boolean {
    return true;
  }

  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  getMetadata(key?: string): any {
    if (key) return this.metadata.get(key);
    return Array.from(this.metadata.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join(', ') || 'no metadata';
  }

  // 高级树形操作
  findByName(name: string): IComponent | null {
    let found: IComponent | null = null;
    this.traverse(node => {
      if (node.name === name) found = node;
    });
    return found;
  }

  findByType(type: 'leaf' | 'composite'): IComponent[] {
    const results: IComponent[] = [];
    this.traverse(node => {
      if (type === 'leaf' && node.isLeaf()) results.push(node);
      if (type === 'composite' && node.isComposite()) results.push(node);
    });
    return results;
  }

  count(): number {
    let count = 0;
    this.traverse(() => count++);
    return count;
  }
}

// ==================== 工具函数 ====================

/** 创建叶子节点 */
function createLeaf(name: string, metadata?: Record<string, any>): Leaf {
  return new Leaf(name, metadata);
}

/** 创建组合节点 */
function createComposite(name: string, metadata?: Record<string, any>): Composite {
  return new Composite(name, metadata);
}

/** 构建树形结构 */
function buildTree(
  rootName: string,
  structure: Array<{ name: string; type: 'leaf' | 'composite'; children?: any[] }>
): Composite {
  const root = createComposite(rootName);
  
  function buildNode(struct: any, parent: Composite): void {
    const node = struct.type === 'leaf'
      ? createLeaf(struct.name)
      : createComposite(struct.name);
    
    parent.add(node);
    
    if (struct.type === 'composite' && struct.children) {
      struct.children.forEach((child: any) => buildNode(child, node as Composite));
    }
  }
  
  structure.forEach(struct => buildNode(struct, root));
  return root;
}

/** 序列化树形结构为 JSON */
function serializeTree(root: IComponent): any {
  const metadataObj: Record<string, any> = {};
  const metadataStr = root.getMetadata();
  if (metadataStr && metadataStr !== 'no metadata') {
    metadataStr.split(', ').forEach((pair: string) => {
      const [k, v] = pair.split('=');
      if (k && v) metadataObj[k] = v;
    });
  }
  
  return {
    name: root.name,
    type: root.isLeaf() ? 'leaf' : 'composite',
    metadata: metadataStr === 'no metadata' ? {} : metadataObj,
    children: root.isComposite()
      ? (root as Composite).getChildren().map(child => serializeTree(child))
      : undefined
  };
}

/** 从 JSON 反序列化树形结构 */
function deserializeTree(json: any): IComponent {
  const node = json.type === 'leaf'
    ? createLeaf(json.name, json.metadata)
    : createComposite(json.name, json.metadata);
  
  if (json.children) {
    json.children.forEach((child: any) => {
      const childNode = deserializeTree(child);
      (node as Composite).add(childNode);
    });
  }
  
  return node;
}

// ==================== 导出 ====================

export {
  // 类型
  IComponent,
  
  // 核心类
  Leaf,
  Composite,
  
  // 工具函数
  createLeaf,
  createComposite,
  buildTree,
  serializeTree,
  deserializeTree
};

// ==================== 使用示例 ====================

/**
 * 示例 1: 基础树形结构
 */
export function example1_BasicTree(): void {
  console.log('=== 示例 1: 基础树形结构 ===\n');
  
  // 创建根节点
  const root = createComposite('Project');
  
  // 创建子节点
  const frontend = createComposite('Frontend');
  const backend = createComposite('Backend');
  const docs = createLeaf('README.md', { size: '2KB' });
  
  // 组合结构
  root.add(frontend);
  root.add(backend);
  root.add(docs);
  
  // 添加叶子节点
  frontend.add(createLeaf('App.tsx', { lines: 500 }));
  frontend.add(createLeaf('styles.css', { lines: 200 }));
  backend.add(createLeaf('server.js', { lines: 800 }));
  
  // 统一操作
  console.log(root.operation());
  console.log('\n树形路径:', docs.getPath());
  console.log('树深度:', docs.getDepth());
}

/**
 * 示例 2: 遍历与查找
 */
export function example2_TraverseAndFind(): void {
  console.log('\n=== 示例 2: 遍历与查找 ===\n');
  
  const tree = buildTree('Company', [
    {
      name: 'Engineering',
      type: 'composite',
      children: [
        { name: 'Alice', type: 'leaf' },
        { name: 'Bob', type: 'leaf' },
        {
          name: 'QA Team',
          type: 'composite',
          children: [
            { name: 'Charlie', type: 'leaf' },
            { name: 'Diana', type: 'leaf' }
          ]
        }
      ]
    },
    {
      name: 'Marketing',
      type: 'composite',
      children: [
        { name: 'Eve', type: 'leaf' }
      ]
    }
  ]);
  
  // 遍历所有节点
  console.log('所有节点:');
  tree.traverse(node => {
    console.log(`  - ${node.getPath()} (${node.isLeaf() ? 'Leaf' : 'Composite'})`);
  });
  
  // 查找节点
  const found = tree.findByName('Charlie');
  console.log('\n查找 Charlie:', found?.getPath());
  
  // 按类型筛选
  const leaves = tree.findByType('leaf');
  console.log('所有叶子节点:', leaves.map(l => l.name).join(', '));
  
  // 统计节点数
  console.log('总节点数:', tree.count());
}

/**
 * 示例 3: 序列化与反序列化
 */
export function example3_Serialization(): void {
  console.log('\n=== 示例 3: 序列化与反序列化 ===\n');
  
  const original = buildTree('Root', [
    {
      name: 'Branch1',
      type: 'composite',
      children: [
        { name: 'Leaf1', type: 'leaf' },
        { name: 'Leaf2', type: 'leaf' }
      ]
    },
    { name: 'Branch2', type: 'composite', children: [] }
  ]);
  
  // 序列化
  const json = serializeTree(original);
  console.log('序列化 JSON:', JSON.stringify(json, null, 2));
  
  // 反序列化
  const restored = deserializeTree(json) as Composite;
  console.log('\n反序列化后操作:');
  console.log(restored.operation());
}

/**
 * 示例 4: 实际应用场景 - 文件系统
 */
export function example4_FileSystem(): void {
  console.log('\n=== 示例 4: 文件系统模拟 ===\n');
  
  const fileSystem = buildTree('/', [
    {
      name: 'home',
      type: 'composite',
      children: [
        {
          name: 'user',
          type: 'composite',
          children: [
            { name: 'documents', type: 'composite', children: [
              { name: 'report.pdf', type: 'leaf', },
              { name: 'notes.txt', type: 'leaf' }
            ]},
            { name: 'downloads', type: 'composite', children: [
              { name: 'installer.exe', type: 'leaf' }
            ]},
            { name: '.bashrc', type: 'leaf' }
          ]
        }
      ]
    },
    {
      name: 'etc',
      type: 'composite',
      children: [
        { name: 'hosts', type: 'leaf' },
        { name: 'passwd', type: 'leaf' }
      ]
    }
  ]);
  
  // 查找特定文件
  const report = fileSystem.findByName('report.pdf');
  console.log('文件路径:', report?.getPath());
  console.log('文件深度:', report?.getDepth());
  
  // 列出所有文件
  console.log('\n所有文件:');
  fileSystem.findByType('leaf').forEach(leaf => {
    console.log(`  ${leaf.getPath()}`);
  });
  
  // 列出所有目录
  console.log('\n所有目录:');
  fileSystem.findByType('composite').forEach(comp => {
    console.log(`  ${comp.getPath()} (${comp.isComposite() ? (comp as Composite).getChildren().length : 0} items)`);
  });
}

// 运行所有示例
if (require.main === module) {
  example1_BasicTree();
  example2_TraverseAndFind();
  example3_Serialization();
  example4_FileSystem();
}
