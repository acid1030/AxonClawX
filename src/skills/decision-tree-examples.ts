/**
 * Decision Tree Skill - Usage Examples
 * 
 * Quick start guide for using the DecisionTree class
 */

import { createDecisionTree, DecisionTree } from './decision-tree-skill';

// ============== Quick Start ==============

/**
 * Basic Usage - 3 Steps
 * 1. Create tree
 * 2. Build nodes
 * 3. Evaluate
 */
function quickStart() {
  // Step 1: Create tree
  const tree = createDecisionTree({ rootLabel: 'Start' });

  // Step 2: Add nodes with conditions
  tree.addChild('Start', 'Yes Path', (ctx) => ctx.choice === 'yes');
  tree.addChild('Start', 'No Path', (ctx) => ctx.choice === 'no');

  // Step 3: Evaluate
  const result = tree.evaluate({
    variables: { choice: 'yes' },
    path: [],
    timestamp: Date.now(),
  });

  console.log('Path:', result.path); // ['Start', 'Yes Path']
}

// ============== Real-World Examples ==============

/**
 * Example: Customer Support Triage
 * Route customers to appropriate support tier
 */
function customerSupportTriage() {
  const tree = createDecisionTree({ rootLabel: 'Support Request' });

  // Tier 1: Authentication
  tree.addChild('Support Request', 'VIP Customer', (ctx) => ctx.tier === 'vip');
  tree.addChild('Support Request', 'Standard Customer', (ctx) => ctx.tier === 'standard');

  // VIP branch
  tree.addChild('VIP Customer', 'Priority Queue', undefined, {
    action: 'route_vip_priority',
    sla: '15min',
  });

  // Standard branch
  tree.addChild('Standard Customer', 'Technical Issue?', (ctx) => ctx.type === 'technical');
  tree.addChild('Standard Customer', 'Billing Issue?', (ctx) => ctx.type === 'billing');

  tree.addChild('Technical Issue?', 'Level 2 Support', undefined, { action: 'route_l2' });
  tree.addChild('Billing Issue?', 'Billing Team', undefined, { action: 'route_billing' });

  // Evaluate
  const vipTechIssue = tree.evaluate({
    variables: { tier: 'vip', type: 'technical' },
    path: [],
    timestamp: Date.now(),
  });

  console.log('VIP Tech Issue:', vipTechIssue.path);
  // ['Support Request', 'VIP Customer', 'Priority Queue']

  const standardBilling = tree.evaluate({
    variables: { tier: 'standard', type: 'billing' },
    path: [],
    timestamp: Date.now(),
  });

  console.log('Standard Billing:', standardBilling.path);
  // ['Support Request', 'Standard Customer', 'Billing Issue?', 'Billing Team']
}

/**
 * Example: Feature Flag System
 * Determine which features a user should see
 */
function featureFlagSystem() {
  const tree = createDecisionTree({ rootLabel: 'Feature Check' });

  tree.addChild('Feature Check', 'Beta Program?', (ctx) => ctx.isBetaUser);
  tree.addChild('Feature Check', 'Standard Features', undefined, { features: ['basic'] });

  tree.addChild('Beta Program?', 'Enterprise?', (ctx) => ctx.plan === 'enterprise');
  tree.addChild('Beta Program?', 'Pro Plan', undefined, { features: ['basic', 'pro', 'beta'] });

  tree.addChild('Enterprise?', 'All Features', undefined, {
    features: ['basic', 'pro', 'enterprise', 'beta', 'alpha'],
  });

  // Test different user types
  const users = [
    { name: 'Free User', variables: { isBetaUser: false, plan: 'free' } },
    { name: 'Pro Beta User', variables: { isBetaUser: true, plan: 'pro' } },
    { name: 'Enterprise Beta', variables: { isBetaUser: true, plan: 'enterprise' } },
  ];

  const results = tree.batchEvaluate(users);
  results.forEach((r) => {
    console.log(`${r.name}: ${r.result.path.join(' → ')}`);
  });
}

/**
 * Example: Loan Approval System
 * Multi-criteria decision making
 */
function loanApprovalSystem() {
  const tree = createDecisionTree({ rootLabel: 'Loan Application' });

  // Credit score check
  tree.addChild('Loan Application', 'Excellent Credit', (ctx) => ctx.creditScore >= 750);
  tree.addChild('Loan Application', 'Good Credit', (ctx) => ctx.creditScore >= 650);
  tree.addChild('Loan Application', 'Fair Credit', (ctx) => ctx.creditScore >= 550);
  tree.addChild('Loan Application', 'Poor Credit', undefined, { decision: 'denied' });

  // Excellent credit branch
  tree.addChild('Excellent Credit', 'High Income?', (ctx) => ctx.income >= 100000);
  tree.addChild('Excellent Credit', 'Standard Approval', undefined, {
    decision: 'approved',
    rate: 3.5,
    term: 30,
  });

  tree.addChild('High Income?', 'Premium Rate', undefined, {
    decision: 'approved',
    rate: 2.9,
    term: 30,
  });

  // Good credit branch
  tree.addChild('Good Credit', 'Stable Employment?', (ctx) => ctx.employmentYears >= 2);
  tree.addChild('Good Credit', 'Standard Rate', undefined, {
    decision: 'approved',
    rate: 4.5,
    term: 30,
  });

  tree.addChild('Stable Employment?', 'Good Rate', undefined, {
    decision: 'approved',
    rate: 4.0,
    term: 30,
  });

  // Test applicants
  const applicants = [
    {
      name: 'Perfect Candidate',
      variables: { creditScore: 800, income: 150000, employmentYears: 5 },
    },
    {
      name: 'Good Candidate',
      variables: { creditScore: 700, income: 75000, employmentYears: 3 },
    },
    {
      name: 'Risky Candidate',
      variables: { creditScore: 500, income: 40000, employmentYears: 0.5 },
    },
  ];

  const results = tree.batchEvaluate(applicants);
  results.forEach((r) => {
    console.log(`\n${r.name}:`);
    console.log(`  Decision Path: ${r.result.path.join(' → ')}`);
    console.log(`  Nodes Evaluated: ${r.result.nodesVisited}`);
  });

  // Get all possible decision paths
  console.log('\nAll Possible Paths:');
  const allPaths = tree.getAllPaths();
  allPaths.forEach((path, i) => {
    console.log(`  Path ${i + 1}: ${path.join(' → ')}`);
  });

  // Path statistics
  const stats = tree.getPathStatistics();
  console.log('\nPath Statistics:', stats);
}

/**
 * Example: Game AI Decision Tree
 * NPC behavior selection
 */
function gameAIDecisionTree() {
  const tree = createDecisionTree({ rootLabel: 'NPC Decision' });

  // Combat state
  tree.addChild('NPC Decision', 'Enemy Visible?', (ctx) => ctx.enemyVisible);
  tree.addChild('NPC Decision', 'Patrol Mode', undefined, { action: 'patrol' });

  tree.addChild('Enemy Visible?', 'Health Low?', (ctx) => ctx.health < 30);
  tree.addChild('Enemy Visible?', 'Has Ammo?', (ctx) => ctx.ammo > 0);

  tree.addChild('Health Low?', 'Retreat', undefined, { action: 'retreat' });
  tree.addChild('Has Ammo?', 'Attack', (ctx) => ctx.distance < 50, { action: 'attack' });
  tree.addChild('Has Ammo?', 'Take Cover', undefined, { action: 'cover' });

  // Evaluate game state
  const gameState = {
    enemyVisible: true,
    health: 25,
    ammo: 50,
    distance: 30,
  };

  const result = tree.evaluate({
    variables: gameState,
    path: [],
    timestamp: Date.now(),
  });

  console.log('NPC Action:', result.path);
  // ['NPC Decision', 'Enemy Visible?', 'Health Low?', 'Retreat']
}

// ============== Advanced Patterns ==============

/**
 * Pattern: Dynamic Condition Building
 */
function dynamicConditions() {
  const tree = createDecisionTree({ rootLabel: 'Dynamic Rules' });

  // Build conditions dynamically
  const rules = [
    { threshold: 100, label: 'High Value' },
    { threshold: 50, label: 'Medium Value' },
    { threshold: 0, label: 'Low Value' },
  ];

  rules.forEach((rule, index) => {
    const parent = index === 0 ? 'Dynamic Rules' : rules[index - 1].label;
    tree.addChild(parent, rule.label, (ctx) => ctx.value >= rule.threshold);
  });

  const result = tree.evaluate({
    variables: { value: 75 },
    path: [],
    timestamp: Date.now(),
  });

  console.log('Dynamic Result:', result.path);
}

/**
 * Pattern: Path Tracing and Analysis
 */
function pathAnalysis() {
  const tree = createDecisionTree({ rootLabel: 'Root' });

  tree.addChild('Root', 'A', (ctx) => ctx.path === 'A');
  tree.addChild('Root', 'B', (ctx) => ctx.path === 'B');
  tree.addChild('A', 'A1', undefined, { terminal: true });
  tree.addChild('A', 'A2', undefined, { terminal: true });
  tree.addChild('B', 'B1', undefined, { terminal: true });

  // Trace path to specific node
  const pathToA1 = tree.tracePathToNode('A1');
  console.log('Path to A1:', pathToA1); // ['Root', 'A', 'A1']

  // Get all paths
  const allPaths = tree.getAllPaths();
  console.log('All paths:', allPaths);

  // Statistics
  const stats = tree.getPathStatistics();
  console.log('Statistics:', stats);
}

// ============== Export Examples ==============

export {
  quickStart,
  customerSupportTriage,
  featureFlagSystem,
  loanApprovalSystem,
  gameAIDecisionTree,
  dynamicConditions,
  pathAnalysis,
};

// Run all examples
if (require.main === module) {
  console.log('=== Decision Tree Examples ===\n');
  quickStart();
  customerSupportTriage();
  featureFlagSystem();
  loanApprovalSystem();
  gameAIDecisionTree();
  dynamicConditions();
  pathAnalysis();
}
