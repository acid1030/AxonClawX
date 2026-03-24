/**
 * Composite Pattern Pro Skill - ACE
 * 
 * 组合模式专业实现
 * 功能：组件定义、树形结构、统一操作
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 基础组件接口 ==============

/**
 * 组件基类接口
 * 所有组件（叶子和复合）必须实现此接口
 */
export interface IComponent {
  /** 组件唯一标识 */
  id: string;
  
  /** 组件名称 */
  name: string;
  
  /** 父组件 ID */
  parentId: string | null;
  
  /** 组件类型 */
  type: 'leaf' | 'composite';
  
  /** 添加子组件 */
  add(child: IComponent): void;
  
  /** 移除子组件 */
  remove(child: IComponent): void;
  
  /** 获取子组件列表 */
  getChildren(): IComponent[];
  
  /** 执行操作 */
  operation(data?: any): any;
  
  /** 获取组件深度 */
  getDepth(): number;
  
  /** 获取完整路径 */
  getPath(): string;
}

// ============== 叶子组件 ==============

/**
 * 叶子组件 - 树形结构的末端节点
 * 不包含子组件
 */
export class LeafComponent implements IComponent {
  id: string;
  name: string;
  parentId: string | null;
  type: 'leaf' = 'leaf';
  
  private depth: number = 0;
  private metadata: Map<string, any> = new Map();
  
  constructor(id: string, name: string, parentId: string | null = null) {
    this.id = id;
    this.name = name;
    this.parentId = parentId;
  }
  
  add(child: IComponent): void {
    throw new Error('LeafComponent 不能添加子组件');
  }
  
  remove(child: IComponent): void {
    throw new Error('LeafComponent 没有子组件可移除');
  }
  
  getChildren(): IComponent[] {
    return [];
  }
  
  operation(data?: any): any {
    // 叶子节点的具体操作逻辑
    return {
      componentId: this.id,
      componentName: this.name,
      componentType: 'leaf',
      executedAt: new Date().toISOString(),
      data: data || null,
      metadata: Object.fromEntries(this.metadata)
    };
  }
  
  getDepth(): number {
    return this.depth;
  }
  
  setDepth(depth: number): void {
    this.depth = depth;
  }
  
  getPath(): string {
    return `/${this.name}`;
  }
  
  /** 设置元数据 */
  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }
  
  /** 获取元数据 */
  getMetadata(key: string): any {
    return this.metadata.get(key);
  }
}

// ============== 复合组件 ==============

/**
 * 复合组件 - 可包含子组件的容器节点
 */
export class CompositeComponent implements IComponent {
  id: string;
  name: string;
  parentId: string | null;
  type: 'composite' = 'composite';
  
  private children: Map<string, IComponent> = new Map();
  private depth: number = 0;
  private metadata: Map<string, any> = new Map();
  
  constructor(id: string, name: string, parentId: string | null = null) {
    this.id = id;
    this.name = name;
    this.parentId = parentId;
  }
  
  add(child: IComponent): void {
    if (this.children.has(child.id)) {
      throw new Error(`子组件 ${child.id} 已存在`);
    }
    child.parentId = this.id;
    this.children.set(child.id, child);
  }
  
  remove(child: IComponent): void {
    if (!this.children.has(child.id)) {
      throw new Error(`子组件 ${child.id} 不存在`);
    }
    this.children.delete(child.id);
    child.parentId = null;
  }
  
  getChildren(): IComponent[] {
    return Array.from(this.children.values());
  }
  
  operation(data?: any): any {
    // 复合节点操作：递归执行所有子组件
    const results = {
      componentId: this.id,
      componentName: this.name,
      componentType: 'composite',
      executedAt: new Date().toISOString(),
      data: data || null,
      childrenResults: [] as any[],
      metadata: Object.fromEntries(this.metadata)
    };
    
    for (const child of this.children.values()) {
      results.childrenResults.push(child.operation(data));
    }
    
    return results;
  }
  
  getDepth(): number {
    return this.depth;
  }
  
  setDepth(depth: number): void {
    this.depth = depth;
    // 递归设置子组件深度
    for (const child of this.children.values()) {
      if (child instanceof CompositeComponent || child instanceof LeafComponent) {
        child.setDepth(depth + 1);
      }
    }
  }
  
  getPath(): string {
    return `/${this.name}`;
  }
  
  /** 获取完整路径（包含父级） */
  getFullPath(): string {
    const parts: string[] = [this.name];
    let current: IComponent | null = this;
    
    // 简单实现，实际使用时需要维护父级引用
    return parts.reverse().join('/');
  }
  
  /** 设置元数据 */
  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }
  
  /** 获取元数据 */
  getMetadata(key: string): any {
    return this.metadata.get(key);
  }
  
  /** 查找组件 */
  findComponent(id: string): IComponent | null {
    if (this.id === id) {
      return this;
    }
    
    for (const child of this.children.values()) {
      const found = child instanceof CompositeComponent 
        ? child.findComponent(id) 
        : (child.id === id ? child : null);
      
      if (found) return found;
    }
    
    return null;
  }
  
  /** 获取所有叶子节点 */
  getAllLeaves(): LeafComponent[] {
    const leaves: LeafComponent[] = [];
    
    for (const child of this.children.values()) {
      if (child instanceof LeafComponent) {
        leaves.push(child);
      } else if (child instanceof CompositeComponent) {
        leaves.push(...child.getAllLeaves());
      }
    }
    
    return leaves;
  }
  
  /** 获取组件总数 */
  getComponentCount(): number {
    let count = 1; // 自身
    
    for (const child of this.children.values()) {
      if (child instanceof CompositeComponent) {
        count += child.getComponentCount();
      } else {
        count += 1;
      }
    }
    
    return count;
  }
}

// ============== 组合模式管理器 ==============

/**
 * 组合模式管理器
 * 提供树形结构的管理和操作功能
 */
export class CompositeManager {
  private components: Map<string, IComponent> = new Map();
  private root: CompositeComponent | null = null;
  
  /** 设置根组件 */
  setRoot(root: CompositeComponent): void {
    this.root = root;
    this.components.set(root.id, root);
    root.setDepth(0);
  }
  
  /** 获取根组件 */
  getRoot(): CompositeComponent | null {
    return this.root;
  }
  
  /** 注册组件 */
  register(component: IComponent): void {
    this.components.set(component.id, component);
    
    // 如果有父组件，自动添加到父组件
    if (component.parentId && this.components.has(component.parentId)) {
      const parent = this.components.get(component.parentId);
      if (parent instanceof CompositeComponent) {
        parent.add(component);
      }
    }
  }
  
  /** 获取组件 */
  getComponent(id: string): IComponent | null {
    return this.components.get(id) || null;
  }
  
  /** 移除组件 */
  removeComponent(id: string): void {
    const component = this.components.get(id);
    if (!component) return;
    
    // 从父组件中移除
    if (component.parentId) {
      const parent = this.components.get(component.parentId);
      if (parent instanceof CompositeComponent) {
        parent.remove(component);
      }
    }
    
    // 如果是复合组件，递归移除所有子组件
    if (component instanceof CompositeComponent) {
      for (const child of component.getChildren()) {
        this.removeComponent(child.id);
      }
    }
    
    this.components.delete(id);
  }
  
  /** 执行全局操作 */
  executeOperation(data?: any): any {
    if (!this.root) {
      throw new Error('未设置根组件');
    }
    return this.root.operation(data);
  }
  
  /** 获取所有组件 */
  getAllComponents(): IComponent[] {
    return Array.from(this.components.values());
  }
  
  /** 获取所有叶子组件 */
  getAllLeaves(): LeafComponent[] {
    if (!this.root) return [];
    return this.root.getAllLeaves();
  }
  
  /** 获取树形结构 JSON */
  getTreeJson(): any {
    if (!this.root) return null;
    return this.componentToJson(this.root);
  }
  
  private componentToJson(component: IComponent): any {
    const result = {
      id: component.id,
      name: component.name,
      type: component.type,
      depth: component.getDepth(),
      children: [] as any[]
    };
    
    if (component instanceof CompositeComponent) {
      for (const child of component.getChildren()) {
        result.children.push(this.componentToJson(child));
      }
    }
    
    return result;
  }
  
  /** 从 JSON 恢复树形结构 */
  fromTreeJson(json: any): CompositeComponent {
    return this.jsonToComponent(json);
  }
  
  private jsonToComponent(json: any): CompositeComponent | LeafComponent {
    if (json.type === 'leaf') {
      const leaf = new LeafComponent(json.id, json.name, json.parentId);
      return leaf;
    } else {
      const composite = new CompositeComponent(json.id, json.name, json.parentId);
      for (const childJson of json.children || []) {
        const child = this.jsonToComponent(childJson);
        composite.add(child);
      }
      return composite;
    }
  }
  
  /** 清空所有组件 */
  clear(): void {
    this.components.clear();
    this.root = null;
  }
  
  /** 获取组件统计信息 */
  getStats(): {
    total: number;
    composites: number;
    leaves: number;
    maxDepth: number;
  } {
    let composites = 0;
    let leaves = 0;
    let maxDepth = 0;
    
    for (const component of this.components.values()) {
      if (component.type === 'composite') {
        composites++;
      } else {
        leaves++;
      }
      maxDepth = Math.max(maxDepth, component.getDepth());
    }
    
    return {
      total: this.components.size,
      composites,
      leaves,
      maxDepth
    };
  }
}

// ============== 使用示例 ==============

/**
 * 使用示例演示
 */
export function demonstrateCompositePattern(): void {
  console.log('=== 组合模式专业版使用示例 ===\n');
  
  // 1. 创建管理器
  const manager = new CompositeManager();
  
  // 2. 创建根组件（复合）
  const root = new CompositeComponent('root', '应用根节点');
  manager.setRoot(root);
  
  // 3. 创建功能模块（复合）
  const userModule = new CompositeComponent('user-module', '用户模块');
  const orderModule = new CompositeComponent('order-module', '订单模块');
  
  // 4. 创建叶子组件
  const loginComp = new LeafComponent('login', '登录组件');
  const registerComp = new LeafComponent('register', '注册组件');
  const profileComp = new LeafComponent('profile', '个人资料');
  
  const createOrderComp = new LeafComponent('create-order', '创建订单');
  const cancelOrderComp = new LeafComponent('cancel-order', '取消订单');
  const orderHistoryComp = new LeafComponent('order-history', '订单历史');
  
  // 5. 构建组件树
  root.add(userModule);
  root.add(orderModule);
  
  userModule.add(loginComp);
  userModule.add(registerComp);
  userModule.add(profileComp);
  
  orderModule.add(createOrderComp);
  orderModule.add(cancelOrderComp);
  orderModule.add(orderHistoryComp);
  
  // 6. 设置元数据
  loginComp.setMetadata('priority', 'high');
  loginComp.setMetadata('authRequired', false);
  
  profileComp.setMetadata('priority', 'medium');
  profileComp.setMetadata('authRequired', true);
  
  // 7. 执行统一操作
  console.log('执行全局操作:');
  const result = manager.executeOperation({ action: 'render' });
  console.log(JSON.stringify(result, null, 2));
  
  // 8. 查找组件
  console.log('\n查找组件 "login":');
  const found = root.findComponent('login');
  console.log(`找到: ${found?.name} (${found?.type})`);
  
  // 9. 获取所有叶子节点
  console.log('\n所有叶子组件:');
  const leaves = root.getAllLeaves();
  leaves.forEach(leaf => console.log(`  - ${leaf.name}`));
  
  // 10. 获取统计信息
  console.log('\n组件统计:');
  const stats = manager.getStats();
  console.log(`  总数：${stats.total}`);
  console.log(`  复合组件：${stats.composites}`);
  console.log(`  叶子组件：${stats.leaves}`);
  console.log(`  最大深度：${stats.maxDepth}`);
  
  // 11. 导出树形结构 JSON
  console.log('\n树形结构 JSON:');
  const treeJson = manager.getTreeJson();
  console.log(JSON.stringify(treeJson, null, 2));
  
  console.log('\n=== 示例完成 ===');
}

// ============== 导出 ==============

export default {
  IComponent,
  LeafComponent,
  CompositeComponent,
  CompositeManager,
  demonstrateCompositePattern
};
