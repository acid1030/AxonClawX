/**
 * Decision Tree Skill - KAEL Engineering
 * 
 * Features:
 * 1. Tree Construction
 * 2. Node Evaluation
 * 3. Path Tracing
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ============== Type Definitions ==============

export interface DecisionNode {
  id: string;
  label: string;
  condition?: (context: Record<string, any>) => boolean;
  children: DecisionNode[];
  parent?: string;
  metadata?: Record<string, any>;
  evaluated?: boolean;
  evaluationResult?: boolean;
}

export interface DecisionTreeConfig {
  rootLabel: string;
  maxDepth?: number;
  evaluationStrategy?: 'depth-first' | 'breadth-first';
}

export interface EvaluationContext {
  variables: Record<string, any>;
  path: string[];
  timestamp: number;
}

export interface EvaluationResult {
  success: boolean;
  path: string[];
  nodesVisited: number;
  finalNode?: string;
  metadata?: Record<string, any>;
}

// ============== Decision Tree Class ==============

export class DecisionTree {
  private root: DecisionNode;
  private nodeMap: Map<string, DecisionNode>;
  private config: Required<DecisionTreeConfig>;

  constructor(config: DecisionTreeConfig) {
    this.config = {
      maxDepth: 10,
      evaluationStrategy: 'depth-first',
      ...config,
    };

    this.root = {
      id: this.generateId(),
      label: config.rootLabel,
      children: [],
      metadata: { depth: 0 },
    };

    this.nodeMap = new Map([[this.root.id, this.root]]);
  }

  // ============== 1. Tree Construction ==============

  /**
   * Add a child node to a parent node
   */
  addChild(
    parentLabel: string,
    childLabel: string,
    condition?: (context: Record<string, any>) => boolean,
    metadata?: Record<string, any>
  ): DecisionNode {
    const parent = this.findNodeByLabel(parentLabel);
    if (!parent) {
      throw new Error(`Parent node "${parentLabel}" not found`);
    }

    const parentDepth = parent.metadata?.depth || 0;
    if (parentDepth >= this.config.maxDepth) {
      throw new Error(`Maximum depth ${this.config.maxDepth} reached`);
    }

    const child: DecisionNode = {
      id: this.generateId(),
      label: childLabel,
      condition,
      children: [],
      parent: parent.id,
      metadata: {
        ...metadata,
        depth: parentDepth + 1,
      },
    };

    parent.children.push(child);
    this.nodeMap.set(child.id, child);

    return child;
  }

  /**
   * Build tree from configuration
   */
  buildFromConfig(treeConfig: Array<{
    parent: string;
    child: string;
    condition?: (context: Record<string, any>) => boolean;
    metadata?: Record<string, any>;
  }>): void {
    for (const nodeConfig of treeConfig) {
      this.addChild(
        nodeConfig.parent,
        nodeConfig.child,
        nodeConfig.condition,
        nodeConfig.metadata
      );
    }
  }

  /**
   * Get tree structure as JSON
   */
  toJSON(): Record<string, any> {
    const serializeNode = (node: DecisionNode): Record<string, any> => ({
      id: node.id,
      label: node.label,
      children: node.children.map(serializeNode),
      metadata: node.metadata,
      hasCondition: !!node.condition,
    });

    return serializeNode(this.root);
  }

  // ============== 2. Node Evaluation ==============

  /**
   * Evaluate a single node with context
   */
  evaluateNode(nodeId: string, context: EvaluationContext): boolean {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Node "${nodeId}" not found`);
    }

    if (!node.condition) {
      node.evaluated = true;
      node.evaluationResult = true;
      return true;
    }

    try {
      const result = node.condition(context.variables);
      node.evaluated = true;
      node.evaluationResult = result;
      return result;
    } catch (error) {
      console.error(`Error evaluating node "${node.label}":`, error);
      node.evaluated = true;
      node.evaluationResult = false;
      return false;
    }
  }

  /**
   * Evaluate entire tree and find decision path
   */
  evaluate(context: EvaluationContext): EvaluationResult {
    const path: string[] = [];
    let nodesVisited = 0;
    let currentNode = this.root;

    path.push(currentNode.label);
    nodesVisited++;

    while (currentNode.children.length > 0) {
      const matchingChild = this.findMatchingChild(
        currentNode.children,
        context
      );

      if (!matchingChild) {
        break;
      }

      currentNode = matchingChild;
      path.push(currentNode.label);
      nodesVisited++;
    }

    return {
      success: true,
      path,
      nodesVisited,
      finalNode: currentNode.label,
      metadata: {
        strategy: this.config.evaluationStrategy,
        timestamp: context.timestamp,
      },
    };
  }

  /**
   * Batch evaluate multiple scenarios
   */
  batchEvaluate(scenarios: Array<{ name: string; variables: Record<string, any> }>): Array<{
    name: string;
    result: EvaluationResult;
  }> {
    return scenarios.map((scenario) => ({
      name: scenario.name,
      result: this.evaluate({
        variables: scenario.variables,
        path: [],
        timestamp: Date.now(),
      }),
    }));
  }

  // ============== 3. Path Tracing ==============

  /**
   * Trace path from root to a specific node
   */
  tracePathToNode(nodeLabel: string): string[] {
    const node = this.findNodeByLabel(nodeLabel);
    if (!node) {
      throw new Error(`Node "${nodeLabel}" not found`);
    }

    const path: string[] = [];
    let current: DecisionNode | undefined = node;

    while (current) {
      path.unshift(current.label);
      current = current.parent ? this.nodeMap.get(current.parent) : undefined;
    }

    return path;
  }

  /**
   * Get all possible paths from root to leaf nodes
   */
  getAllPaths(): string[][] {
    const paths: string[][] = [];

    const traverse = (node: DecisionNode, currentPath: string[]): void => {
      const newPath = [...currentPath, node.label];

      if (node.children.length === 0) {
        paths.push(newPath);
        return;
      }

      for (const child of node.children) {
        traverse(child, newPath);
      }
    };

    traverse(this.root, []);
    return paths;
  }

  /**
   * Get path statistics
   */
  getPathStatistics(): {
    totalPaths: number;
    averageDepth: number;
    maxDepth: number;
    minDepth: number;
  } {
    const paths = this.getAllPaths();
    const depths = paths.map((p) => p.length);

    return {
      totalPaths: paths.length,
      averageDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
      maxDepth: Math.max(...depths),
      minDepth: Math.min(...depths),
    };
  }

  // ============== Utility Methods ==============

  /**
   * Find node by label (first match)
   */
  private findNodeByLabel(label: string): DecisionNode | null {
    for (const node of this.nodeMap.values()) {
      if (node.label === label) {
        return node;
      }
    }
    return null;
  }

  /**
   * Find first child matching condition
   */
  private findMatchingChild(
    children: DecisionNode[],
    context: EvaluationContext
  ): DecisionNode | null {
    if (this.config.evaluationStrategy === 'breadth-first') {
      // Evaluate all children, return first true
      for (const child of children) {
        if (this.evaluateNode(child.id, context)) {
          return child;
        }
      }
    } else {
      // Depth-first: return first child with true condition or no condition
      for (const child of children) {
        if (this.evaluateNode(child.id, context)) {
          return child;
        }
      }
    }
    return null;
  }

  /**
   * Generate unique node ID
   */
  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset all node evaluations
   */
  resetEvaluations(): void {
    for (const node of this.nodeMap.values()) {
      node.evaluated = false;
      node.evaluationResult = undefined;
    }
  }

  /**
   * Get node by ID
   */
  getNodeById(id: string): DecisionNode | undefined {
    return this.nodeMap.get(id);
  }

  /**
   * Get total node count
   */
  getNodeCount(): number {
    return this.nodeMap.size;
  }
}

// ============== Usage Examples ==============

/**
 * Example 1: Simple Yes/No Decision Tree
 */
export function exampleSimpleDecisionTree(): void {
  console.log('=== Example 1: Simple Decision Tree ===');

  const tree = new DecisionTree({ rootLabel: 'Start' });

  // Build tree
  tree.addChild('Start', 'Is it raining?', (ctx) => ctx.weather === 'rainy');
  tree.addChild('Start', 'Is it sunny?', (ctx) => ctx.weather === 'sunny');

  tree.addChild('Is it raining?', 'Take umbrella', undefined, { action: 'take_umbrella' });
  tree.addChild('Is it sunny?', 'Wear sunglasses', undefined, { action: 'wear_sunglasses' });

  // Evaluate
  const rainyResult = tree.evaluate({
    variables: { weather: 'rainy' },
    path: [],
    timestamp: Date.now(),
  });

  console.log('Rainy day path:', rainyResult.path);
  // Output: ['Start', 'Is it raining?', 'Take umbrella']

  const sunnyResult = tree.evaluate({
    variables: { weather: 'sunny' },
    path: [],
    timestamp: Date.now(),
  });

  console.log('Sunny day path:', sunnyResult.path);
  // Output: ['Start', 'Is it sunny?', 'Wear sunglasses']

  console.log('Tree structure:', JSON.stringify(tree.toJSON(), null, 2));
}

/**
 * Example 2: User Permission Decision Tree
 */
export function examplePermissionTree(): void {
  console.log('\n=== Example 2: Permission Decision Tree ===');

  const tree = new DecisionTree({ rootLabel: 'Check Permission', maxDepth: 5 });

  tree.addChild('Check Permission', 'Is user logged in?', (ctx) => ctx.isLoggedIn);
  tree.addChild('Check Permission', 'Guest access denied', undefined, { action: 'deny' });

  tree.addChild('Is user logged in?', 'Is user admin?', (ctx) => ctx.role === 'admin');
  tree.addChild('Is user logged in?', 'Is user moderator?', (ctx) => ctx.role === 'moderator');
  tree.addChild('Is user logged in?', 'Regular user', undefined, { action: 'user_access' });

  tree.addChild('Is user admin?', 'Full admin access', undefined, { action: 'admin_access' });
  tree.addChild('Is user moderator?', 'Moderator access', undefined, { action: 'mod_access' });

  // Test scenarios
  const scenarios = [
    { name: 'Admin user', variables: { isLoggedIn: true, role: 'admin' } },
    { name: 'Moderator user', variables: { isLoggedIn: true, role: 'moderator' } },
    { name: 'Regular user', variables: { isLoggedIn: true, role: 'user' } },
    { name: 'Guest', variables: { isLoggedIn: false, role: 'guest' } },
  ];

  const results = tree.batchEvaluate(scenarios);
  results.forEach((r) => {
    console.log(`${r.name}: ${r.result.path.join(' → ')}`);
  });

  // Path statistics
  const stats = tree.getPathStatistics();
  console.log('\nPath Statistics:', stats);
}

/**
 * Example 3: Complex Business Rule Engine
 */
export function exampleBusinessRules(): void {
  console.log('\n=== Example 3: Business Rule Engine ===');

  const tree = new DecisionTree({
    rootLabel: 'Order Processing',
    maxDepth: 6,
    evaluationStrategy: 'depth-first',
  });

  // Order validation flow
  tree.addChild('Order Processing', 'Valid order?', (ctx) => ctx.orderTotal > 0);
  tree.addChild('Valid order?', 'Premium customer?', (ctx) => ctx.customerTier === 'premium');
  tree.addChild('Valid order?', 'Regular customer', undefined, { process: 'standard' });

  tree.addChild('Premium customer?', 'Express shipping?', (ctx) => ctx.shippingPreference === 'express');
  tree.addChild('Premium customer?', 'Standard shipping', undefined, { process: 'premium_standard' });

  tree.addChild('Express shipping?', 'In stock?', (ctx) => ctx.inStock);
  tree.addChild('Express shipping?', 'Backorder', undefined, { process: 'premium_backorder' });

  tree.addChild('In stock?', 'Process express', undefined, { process: 'express_fulfillment' });
  tree.addChild('In stock?', 'Notify customer', undefined, { process: 'stock_notification' });

  // Test order scenarios
  const orders = [
    {
      name: 'Premium express in-stock',
      variables: { orderTotal: 500, customerTier: 'premium', shippingPreference: 'express', inStock: true },
    },
    {
      name: 'Regular customer',
      variables: { orderTotal: 100, customerTier: 'regular', shippingPreference: 'standard', inStock: true },
    },
    {
      name: 'Premium backorder',
      variables: { orderTotal: 1000, customerTier: 'premium', shippingPreference: 'express', inStock: false },
    },
  ];

  const results = tree.batchEvaluate(orders);
  results.forEach((r) => {
    console.log(`${r.name}:`);
    console.log(`  Path: ${r.path.join(' → ')}`);
    console.log(`  Nodes visited: ${r.nodesVisited}`);
  });

  // Trace specific path
  const path = tree.tracePathToNode('Process express');
  console.log('\nPath to "Process express":', path);
}

/**
 * Example 4: Interactive Decision Tree Builder
 */
export function exampleInteractiveBuilder(): void {
  console.log('\n=== Example 4: Interactive Builder ===');

  const tree = new DecisionTree({ rootLabel: 'Root' });

  // Dynamically build tree
  const nodes = [
    { parent: 'Root', child: 'Node A', condition: (ctx: any) => ctx.value > 50 },
    { parent: 'Root', child: 'Node B', condition: (ctx: any) => ctx.value <= 50 },
    { parent: 'Node A', child: 'A1', condition: (ctx: any) => ctx.category === 'X' },
    { parent: 'Node A', child: 'A2', condition: (ctx: any) => ctx.category === 'Y' },
    { parent: 'Node B', child: 'B1', metadata: { type: 'terminal' } },
  ];

  tree.buildFromConfig(nodes);

  console.log(`Total nodes: ${tree.getNodeCount()}`);
  console.log('All paths:', tree.getAllPaths());

  // Evaluate with context
  const result = tree.evaluate({
    variables: { value: 75, category: 'X' },
    path: [],
    timestamp: Date.now(),
  });

  console.log('Evaluation result:', result);
}

// ============== Export Main Function ==============

/**
 * Create a new decision tree instance
 */
export function createDecisionTree(config: DecisionTreeConfig): DecisionTree {
  return new DecisionTree(config);
}

// Run examples if executed directly
if (require.main === module) {
  exampleSimpleDecisionTree();
  examplePermissionTree();
  exampleBusinessRules();
  exampleInteractiveBuilder();
}
