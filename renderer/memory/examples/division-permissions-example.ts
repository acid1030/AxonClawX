/**
 * Division Memory Permissions - Usage Examples
 * 
 * This file demonstrates how to use the division-permissions module
 */

import {
  loadDivisionConfig,
  checkPermission,
  safeRead,
  safeWrite,
  getAccessLogs
} from '../division-permissions';

// ============================================
// Example 1: Load Division Configuration
// ============================================

console.log('=== Example 1: Load Division Config ===');
const miiowConfig = loadDivisionConfig('miiow');
if (miiowConfig) {
  console.log('Division:', miiowConfig.division);
  console.log('Available roles:', Object.keys(miiowConfig.members));
}

// ============================================
// Example 2: Check Permissions
// ============================================

console.log('\n=== Example 2: Check Permissions ===');

// Commander can read shared
const cmdReadShared = checkPermission('miiow', 'commander', 'shared', 'read');
console.log('Commander read shared:', cmdReadShared.allowed); // true

// Commander can write shared
const cmdWriteShared = checkPermission('miiow', 'commander', 'shared', 'write');
console.log('Commander write shared:', cmdWriteShared.allowed); // true

// Worker can only read their own
const workerReadSelf = checkPermission('miiow', 'workers', 'members/self', 'read');
console.log('Worker read self:', workerReadSelf.allowed); // true

// Worker cannot read other members
const workerReadOthers = checkPermission('miiow', 'workers', 'members/other', 'read');
console.log('Worker read others:', workerReadOthers.allowed); // false

// Worker cannot write to shared
const workerWriteShared = checkPermission('miiow', 'workers', 'shared', 'write');
console.log('Worker write shared:', workerWriteShared.allowed); // false

// ============================================
// Example 3: Safe Read/Write Operations
// ============================================

console.log('\n=== Example 3: Safe Read/Write ===');

const divisionId = 'miiow';
const role = 'commander';
const sharedPath = '/Users/nike/.openclaw/memory/divisions/miiow/shared/tasks/current.md';

// Write to shared (commander has permission)
const writeSuccess = safeWrite(
  divisionId,
  role,
  sharedPath,
  '# Current Tasks\n\n- Task 1\n- Task 2'
);
console.log('Write success:', writeSuccess);

// Read from shared
const content = safeRead(divisionId, role, sharedPath);
console.log('Read content:', content);

// Try to write as worker (should fail)
const workerWrite = safeWrite(
  divisionId,
  'workers',
  sharedPath,
  'Unauthorized content'
);
console.log('Worker write to shared:', workerWrite); // false

// ============================================
// Example 4: Access Logs
// ============================================

console.log('\n=== Example 4: Access Logs ===');

// Get recent logs for miiow division
const logs = getAccessLogs('miiow', 10);
console.log('Recent access logs:');
logs.forEach(log => {
  console.log(`  [${log.timestamp}] ${log.role} ${log.action} ${log.path} - ${log.allowed ? '✓' : '✗'}`);
});

// ============================================
// Example 5: Role-Based Access Patterns
// ============================================

console.log('\n=== Example 5: Role-Based Access Patterns ===');

interface AgentContext {
  divisionId: string;
  agentId: string;
  role: string;
}

function createAgentContext(divisionId: string, agentId: string, role: string): AgentContext {
  return { divisionId, agentId, role };
}

function canAccessResource(
  context: AgentContext,
  resourcePath: string,
  action: 'read' | 'write'
): boolean {
  // Replace 'self' with actual agent ID for path matching
  const resolvedPath = resourcePath.replace('self', context.agentId);
  
  const permission = checkPermission(
    context.divisionId,
    context.role,
    resolvedPath,
    action
  );
  
  return permission.allowed;
}

// Usage
const commanderCtx = createAgentContext('miiow', 'MIIOW-COMMANDER', 'commander');
const workerCtx = createAgentContext('miiow', 'MIIOW-WORKER-1', 'workers');

console.log('Commander can read all members:', 
  canAccessResource(commanderCtx, 'members/*', 'read')); // true

console.log('Worker can read own memory:', 
  canAccessResource(workerCtx, 'members/MIIOW-WORKER-1', 'read')); // true

console.log('Worker can read other memory:', 
  canAccessResource(workerCtx, 'members/MIIOW-WORKER-2', 'read')); // false

// ============================================
// Example 6: Batch Permission Check
// ============================================

console.log('\n=== Example 6: Batch Permission Check ===');

interface ResourceAccess {
  path: string;
  action: 'read' | 'write';
}

function checkBatchPermissions(
  divisionId: string,
  role: string,
  resources: ResourceAccess[]
): Array<{ path: string; action: string; allowed: boolean; reason?: string }> {
  return resources.map(resource => {
    const result = checkPermission(divisionId, role, resource.path, resource.action);
    return {
      path: resource.path,
      action: resource.action,
      ...result
    };
  });
}

const resourcesToCheck: ResourceAccess[] = [
  { path: 'shared', action: 'read' },
  { path: 'shared', action: 'write' },
  { path: 'members/self', action: 'read' },
  { path: 'members/self', action: 'write' },
  { path: 'members/other', action: 'read' },
];

const batchResults = checkBatchPermissions('miiow', 'workers', resourcesToCheck);
batchResults.forEach(result => {
  console.log(`  ${result.action.toUpperCase()} ${result.path}: ${result.allowed ? '✓' : '✗'} ${result.reason || ''}`);
});
