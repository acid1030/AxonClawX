/**
 * Feature Utils - Usage Examples
 * 
 * This file demonstrates practical usage of the feature flag management system.
 */

import {
  registerFeature,
  isFeatureEnabled,
  getEnabledFeatures,
  updateFeature,
  addUserToGroup,
  removeUserFromGroup,
  getUserGroups,
  getGroupMembers,
  getAllFeatures,
  getAllGroups,
} from './feature-utils-skill';

// ==================== Setup Example Features ====================

function setupExampleFeatures() {
  // Feature 1: Simple on/off toggle
  registerFeature('dark-mode', {
    enabled: true,
    metadata: {
      description: 'Enable dark mode theme',
      owner: 'ui-team',
      createdAt: new Date().toISOString(),
    },
  });

  // Feature 2: Percentage-based gradual rollout
  registerFeature('new-checkout-flow', {
    enabled: true,
    percentage: 30, // 30% of users
    metadata: {
      description: 'Redesigned checkout experience',
      owner: 'conversion-team',
      createdAt: new Date().toISOString(),
    },
  });

  // Feature 3: User group targeting
  registerFeature('beta-analytics', {
    enabled: true,
    userGroups: ['beta-testers', 'internal'],
    metadata: {
      description: 'Advanced analytics dashboard',
      owner: 'analytics-team',
    },
  });

  // Feature 4: Environment-specific feature
  registerFeature('debug-panel', {
    enabled: true,
    environments: ['dev', 'staging'],
    metadata: {
      description: 'Developer debug panel',
      owner: 'platform-team',
    },
  });

  // Feature 5: Combined targeting (percentage + groups + environment)
  registerFeature('ai-recommendations', {
    enabled: true,
    percentage: 50,
    userGroups: ['premium', 'beta-testers'],
    environments: ['staging', 'prod'],
    metadata: {
      description: 'AI-powered product recommendations',
      owner: 'ml-team',
      expiresAt: '2026-06-01T00:00:00Z',
    },
  });

  // Setup user groups
  addUserToGroup('user-001', 'beta-testers');
  addUserToGroup('user-002', 'beta-testers');
  addUserToGroup('user-003', 'premium');
  addUserToGroup('user-004', 'premium');
  addUserToGroup('user-005', 'internal');
  addUserToGroup('user-001', 'premium'); // User can be in multiple groups
}

// ==================== Usage Scenarios ====================

/**
 * Scenario 1: Check if a feature is enabled before rendering
 */
function renderHomepage(user: { userId: string; groups?: string[]; environment?: string }) {
  console.log(`\n=== Rendering homepage for ${user.userId} ===`);

  // Check dark mode
  if (isFeatureEnabled('dark-mode', user)) {
    console.log('✓ Dark mode enabled');
  }

  // Check new checkout flow
  if (isFeatureEnabled('new-checkout-flow', user)) {
    console.log('✓ Showing new checkout flow');
  } else {
    console.log('✗ Using legacy checkout');
  }

  // Check beta analytics
  if (isFeatureEnabled('beta-analytics', user)) {
    console.log('✓ Beta analytics dashboard available');
  }
}

/**
 * Scenario 2: Get all enabled features for a user profile
 */
function getUserFeatureProfile(userId: string, groups: string[] = [], environment = 'prod') {
  const user = { userId, groups, environment };
  const enabledFeatures = getEnabledFeatures(user);

  console.log(`\n=== Feature Profile for ${userId} ===`);
  console.log('Groups:', groups.join(', ') || 'none');
  console.log('Environment:', environment);
  console.log('Enabled Features:', enabledFeatures.join(', '));
  console.log('Total:', enabledFeatures.length, 'features enabled');

  return enabledFeatures;
}

/**
 * Scenario 3: Gradual rollout management
 */
function manageGradualRollout() {
  console.log('\n=== Managing Gradual Rollout ===');

  // Initial rollout at 10%
  registerFeature('new-search-algo', {
    enabled: true,
    percentage: 10,
    metadata: { description: 'Improved search algorithm' },
  });

  let enabledCount = 0;
  for (let i = 1; i <= 100; i++) {
    if (isFeatureEnabled('new-search-algo', { userId: `user-${i}` })) {
      enabledCount++;
    }
  }
  console.log(`Phase 1 (10%): ${enabledCount}/100 users have access`);

  // Increase to 50%
  updateFeature('new-search-algo', { percentage: 50 });
  enabledCount = 0;
  for (let i = 1; i <= 100; i++) {
    if (isFeatureEnabled('new-search-algo', { userId: `user-${i}` })) {
      enabledCount++;
    }
  }
  console.log(`Phase 2 (50%): ${enabledCount}/100 users have access`);

  // Full rollout at 100%
  updateFeature('new-search-algo', { percentage: 100 });
  console.log('Phase 3 (100%): Full rollout complete');
}

/**
 * Scenario 4: A/B Testing with user groups
 */
function setupABTest() {
  console.log('\n=== A/B Test Setup ===');

  // Create test groups
  const groupA: string[] = [];
  const groupB: string[] = [];

  for (let i = 1; i <= 100; i++) {
    const userId = `ab-test-user-${i}`;
    if (i % 2 === 0) {
      groupA.push(userId);
      addUserToGroup(userId, 'ab-test-group-a');
    } else {
      groupB.push(userId);
      addUserToGroup(userId, 'ab-test-group-b');
    }
  }

  // Feature for Group A
  registerFeature('ab-test-variant-a', {
    enabled: true,
    userGroups: ['ab-test-group-a'],
    metadata: { description: 'Variant A: Blue button' },
  });

  // Feature for Group B
  registerFeature('ab-test-variant-b', {
    enabled: true,
    userGroups: ['ab-test-group-b'],
    metadata: { description: 'Variant B: Green button' },
  });

  // Test access
  console.log('Group A user sees variant A:', 
    isFeatureEnabled('ab-test-variant-a', { 
      userId: 'ab-test-user-2', 
      groups: ['ab-test-group-a'] 
    })
  );

  console.log('Group B user sees variant B:', 
    isFeatureEnabled('ab-test-variant-b', { 
      userId: 'ab-test-user-3', 
      groups: ['ab-test-group-b'] 
    })
  );
}

/**
 * Scenario 5: Environment-based feature gates
 */
function environmentGating() {
  console.log('\n=== Environment-Based Gating ===');

  registerFeature('profiling-tools', {
    enabled: true,
    environments: ['dev'],
    metadata: { description: 'Performance profiling tools' },
  });

  registerFeature('staging-features', {
    enabled: true,
    environments: ['dev', 'staging'],
    metadata: { description: 'Features for staging validation' },
  });

  const testUser = { userId: 'dev-user' };

  console.log('Dev environment:', {
    profiling: isFeatureEnabled('profiling-tools', { ...testUser, environment: 'dev' }),
    staging: isFeatureEnabled('staging-features', { ...testUser, environment: 'staging' }),
    prod: isFeatureEnabled('staging-features', { ...testUser, environment: 'prod' }),
  });
}

/**
 * Scenario 6: Feature flag audit and reporting
 */
function auditFeatures() {
  console.log('\n=== Feature Audit Report ===');

  const allFeatures = getAllFeatures();
  const allGroups = getAllGroups();

  console.log('Total Features:', Object.keys(allFeatures).length);
  console.log('Total Groups:', allGroups.length);
  console.log('\nFeature Details:');

  for (const [key, flag] of Object.entries(allFeatures)) {
    console.log(`\n- ${key}`);
    console.log(`  Enabled: ${flag.enabled}`);
    console.log(`  Percentage: ${flag.percentage ?? 'N/A'}%`);
    console.log(`  Groups: ${flag.userGroups?.join(', ') || 'All'}`);
    console.log(`  Environments: ${flag.environments?.join(', ') || 'All'}`);
    console.log(`  Description: ${flag.metadata?.description || 'N/A'}`);
    console.log(`  Owner: ${flag.metadata?.owner || 'N/A'}`);
  }

  console.log('\nGroup Memberships:');
  for (const group of allGroups) {
    const members = getGroupMembers(group);
    console.log(`- ${group}: ${members.length} members`);
  }
}

// ==================== Main Demo ====================

function runDemo() {
  console.log('🚀 Feature Utils Demo\n');
  console.log('=' .repeat(50));

  // Initialize
  setupExampleFeatures();

  // Run scenarios
  renderHomepage({ userId: 'user-001', groups: ['beta-testers', 'premium'], environment: 'prod' });
  renderHomepage({ userId: 'user-006', groups: [], environment: 'prod' });

  getUserFeatureProfile('user-001', ['beta-testers', 'premium'], 'prod');
  getUserFeatureProfile('user-006', [], 'prod');

  manageGradualRollout();
  setupABTest();
  environmentGating();
  auditFeatures();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Demo Complete\n');
}

// Run demo if executed directly
if (require.main === module) {
  runDemo();
}

// Export for testing
export { runDemo, setupExampleFeatures, renderHomepage, getUserFeatureProfile };
