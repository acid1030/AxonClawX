/**
 * Feature Flag Management Utility
 * 
 * Features:
 * 1. Feature switch definition
 * 2. Percentage-based gradual rollout
 * 3. User group targeting
 * 
 * @module feature-utils
 */

// ==================== Types ====================

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  percentage?: number; // 0-100 for gradual rollout
  userGroups?: string[]; // Allowed user groups
  environments?: string[]; // Allowed environments (dev, staging, prod)
  metadata?: {
    description?: string;
    owner?: string;
    createdAt?: string;
    expiresAt?: string;
  };
};

export type FeatureFlagsConfig = Record<string, FeatureFlag>;

export type UserContext = {
  userId: string;
  groups?: string[];
  environment?: string;
  attributes?: Record<string, any>;
};

// ==================== Feature Registry ====================

class FeatureRegistry {
  private flags: FeatureFlagsConfig = {};

  /**
   * Register a new feature flag
   */
  register(key: string, config: Omit<FeatureFlag, 'key'>): FeatureFlag {
    const flag: FeatureFlag = {
      key,
      enabled: config.enabled ?? false,
      percentage: config.percentage,
      userGroups: config.userGroups,
      environments: config.environments,
      metadata: config.metadata,
    };
    this.flags[key] = flag;
    return flag;
  }

  /**
   * Get a feature flag by key
   */
  get(key: string): FeatureFlag | undefined {
    return this.flags[key];
  }

  /**
   * Get all registered flags
   */
  getAll(): FeatureFlagsConfig {
    return { ...this.flags };
  }

  /**
   * Update a feature flag
   */
  update(key: string, updates: Partial<FeatureFlag>): FeatureFlag | null {
    const flag = this.flags[key];
    if (!flag) return null;
    
    this.flags[key] = { ...flag, ...updates };
    return this.flags[key];
  }

  /**
   * Remove a feature flag
   */
  remove(key: string): boolean {
    return delete this.flags[key];
  }

  /**
   * Clear all flags
   */
  clear(): void {
    this.flags = {};
  }
}

// ==================== Feature Evaluation ====================

class FeatureEvaluator {
  private registry: FeatureRegistry;

  constructor(registry: FeatureRegistry) {
    this.registry = registry;
  }

  /**
   * Check if a feature is enabled for a user
   */
  isEnabled(key: string, user: UserContext): boolean {
    const flag = this.registry.get(key);
    if (!flag) return false;

    // Check if feature is globally enabled
    if (!flag.enabled) return false;

    // Check environment
    if (flag.environments && user.environment) {
      if (!flag.environments.includes(user.environment)) {
        return false;
      }
    }

    // Check user groups
    if (flag.userGroups && user.groups) {
      const hasGroupAccess = flag.userGroups.some(group => 
        user.groups?.includes(group)
      );
      if (!hasGroupAccess) return false;
    }

    // Check percentage rollout
    if (flag.percentage !== undefined) {
      const userHash = this.hashUser(user.userId, key);
      const userPercentage = (userHash % 100);
      if (userPercentage >= flag.percentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all enabled features for a user
   */
  getEnabledFeatures(user: UserContext): string[] {
    const enabled: string[] = [];
    const allFlags = this.registry.getAll();
    
    for (const key of Object.keys(allFlags)) {
      if (this.isEnabled(key, user)) {
        enabled.push(key);
      }
    }
    
    return enabled;
  }

  /**
   * Hash user ID for consistent percentage assignment
   */
  private hashUser(userId: string, featureKey: string): number {
    let hash = 0;
    const str = `${userId}:${featureKey}`;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }
}

// ==================== User Group Management ====================

class UserGroupManager {
  private groups: Map<string, Set<string>> = new Map();

  /**
   * Create a new user group
   */
  createGroup(name: string): void {
    if (!this.groups.has(name)) {
      this.groups.set(name, new Set());
    }
  }

  /**
   * Add user to a group
   */
  addUserToGroup(userId: string, groupName: string): void {
    this.createGroup(groupName);
    this.groups.get(groupName)?.add(userId);
  }

  /**
   * Remove user from a group
   */
  removeUserFromGroup(userId: string, groupName: string): void {
    this.groups.get(groupName)?.delete(userId);
  }

  /**
   * Get all groups for a user
   */
  getUserGroups(userId: string): string[] {
    const userGroups: string[] = [];
    
    for (const [groupName, members] of this.groups.entries()) {
      if (members.has(userId)) {
        userGroups.push(groupName);
      }
    }
    
    return userGroups;
  }

  /**
   * Get all members of a group
   */
  getGroupMembers(groupName: string): string[] {
    return Array.from(this.groups.get(groupName) || []);
  }

  /**
   * Delete a group
   */
  deleteGroup(groupName: string): void {
    this.groups.delete(groupName);
  }

  /**
   * Get all groups
   */
  getAllGroups(): string[] {
    return Array.from(this.groups.keys());
  }
}

// ==================== Singleton Instances ====================

const registry = new FeatureRegistry();
const evaluator = new FeatureEvaluator(registry);
const groupManager = new UserGroupManager();

// ==================== Public API ====================

/**
 * Register a new feature flag
 * 
 * @example
 * registerFeature('new-checkout', {
 *   enabled: true,
 *   percentage: 50,
 *   userGroups: ['beta-testers'],
 *   environments: ['staging', 'prod'],
 *   metadata: {
 *     description: 'New checkout flow',
 *     owner: 'checkout-team'
 *   }
 * });
 */
export function registerFeature(key: string, config: Omit<FeatureFlag, 'key'>): FeatureFlag {
  return registry.register(key, config);
}

/**
 * Check if a feature is enabled for a user
 * 
 * @example
 * if (isFeatureEnabled('new-checkout', { userId: 'user123', groups: ['beta-testers'] })) {
 *   // Show new checkout
 * }
 */
export function isFeatureEnabled(key: string, user: UserContext): boolean {
  return evaluator.isEnabled(key, user);
}

/**
 * Get all enabled features for a user
 * 
 * @example
 * const enabled = getEnabledFeatures({ userId: 'user123', groups: ['beta-testers'] });
 */
export function getEnabledFeatures(user: UserContext): string[] {
  return evaluator.getEnabledFeatures(user);
}

/**
 * Update a feature flag
 * 
 * @example
 * updateFeature('new-checkout', { percentage: 75 });
 */
export function updateFeature(key: string, updates: Partial<FeatureFlag>): FeatureFlag | null {
  return registry.update(key, updates);
}

/**
 * Get a feature flag
 * 
 * @example
 * const flag = getFeature('new-checkout');
 */
export function getFeature(key: string): FeatureFlag | undefined {
  return registry.get(key);
}

/**
 * Get all feature flags
 * 
 * @example
 * const allFlags = getAllFeatures();
 */
export function getAllFeatures(): FeatureFlagsConfig {
  return registry.getAll();
}

/**
 * Remove a feature flag
 * 
 * @example
 * removeFeature('old-feature');
 */
export function removeFeature(key: string): boolean {
  return registry.remove(key);
}

/**
 * Add user to a group
 * 
 * @example
 * addUserToGroup('user123', 'beta-testers');
 */
export function addUserToGroup(userId: string, groupName: string): void {
  groupManager.addUserToGroup(userId, groupName);
}

/**
 * Remove user from a group
 * 
 * @example
 * removeUserFromGroup('user123', 'beta-testers');
 */
export function removeUserFromGroup(userId: string, groupName: string): void {
  groupManager.removeUserFromGroup(userId, groupName);
}

/**
 * Get all groups for a user
 * 
 * @example
 * const groups = getUserGroups('user123');
 */
export function getUserGroups(userId: string): string[] {
  return groupManager.getUserGroups(userId);
}

/**
 * Get all members of a group
 * 
 * @example
 * const members = getGroupMembers('beta-testers');
 */
export function getGroupMembers(groupName: string): string[] {
  return groupManager.getGroupMembers(groupName);
}

/**
 * Get all groups
 * 
 * @example
 * const allGroups = getAllGroups();
 */
export function getAllGroups(): string[] {
  return groupManager.getAllGroups();
}

/**
 * Reset all feature flags and groups
 */
export function reset(): void {
  registry.clear();
  // Note: Not clearing groups to preserve user assignments
}

// ==================== Usage Examples ====================

/**
 * Example usage scenarios
 */
export const examples = {
  // Example 1: Simple feature toggle
  simpleToggle: () => {
    registerFeature('dark-mode', {
      enabled: true,
      metadata: {
        description: 'Enable dark mode UI',
        owner: 'ui-team'
      }
    });
    
    const user = { userId: 'user123' };
    console.log('Dark mode enabled:', isFeatureEnabled('dark-mode', user));
  },

  // Example 2: Percentage rollout
  percentageRollout: () => {
    registerFeature('new-homepage', {
      enabled: true,
      percentage: 25, // 25% of users
      metadata: {
        description: 'New homepage design',
        owner: 'growth-team'
      }
    });
    
    // Test with multiple users to see distribution
    for (let i = 1; i <= 10; i++) {
      const user = { userId: `user${i}` };
      const enabled = isFeatureEnabled('new-homepage', user);
      console.log(`User ${i}: ${enabled ? '✓' : '✗'}`);
    }
  },

  // Example 3: User group targeting
  groupTargeting: () => {
    // Setup groups
    addUserToGroup('user1', 'beta-testers');
    addUserToGroup('user2', 'beta-testers');
    addUserToGroup('user3', 'internal');
    
    registerFeature('experimental-api', {
      enabled: true,
      userGroups: ['beta-testers', 'internal'],
      metadata: {
        description: 'Experimental API endpoints',
        owner: 'platform-team'
      }
    });
    
    console.log('User1 (beta):', isFeatureEnabled('experimental-api', { 
      userId: 'user1', 
      groups: ['beta-testers'] 
    }));
    
    console.log('User4 (regular):', isFeatureEnabled('experimental-api', { 
      userId: 'user4', 
      groups: [] 
    }));
  },

  // Example 4: Environment-based rollout
  environmentRollout: () => {
    registerFeature('new-payment-flow', {
      enabled: true,
      percentage: 100,
      environments: ['dev', 'staging'], // Not in prod yet
      metadata: {
        description: 'New payment processing flow',
        owner: 'payments-team'
      }
    });
    
    console.log('Dev:', isFeatureEnabled('new-payment-flow', { 
      userId: 'user1', 
      environment: 'dev' 
    }));
    
    console.log('Prod:', isFeatureEnabled('new-payment-flow', { 
      userId: 'user1', 
      environment: 'prod' 
    }));
  },

  // Example 5: Gradual rollout progression
  gradualRollout: () => {
    registerFeature('ai-assistant', {
      enabled: true,
      percentage: 10, // Start with 10%
      userGroups: ['beta-testers'],
      metadata: {
        description: 'AI-powered assistant',
        owner: 'ai-team',
        createdAt: new Date().toISOString()
      }
    });
    
    // Week 1: 10%
    console.log('Week 1 (10%):', isFeatureEnabled('ai-assistant', { 
      userId: 'user1', 
      groups: ['beta-testers'] 
    }));
    
    // Week 2: Increase to 50%
    updateFeature('ai-assistant', { percentage: 50 });
    
    // Week 3: Increase to 100%
    updateFeature('ai-assistant', { percentage: 100 });
  },

  // Example 6: Get all enabled features for a user
  userFeatureProfile: () => {
    // Setup multiple features
    registerFeature('feature-a', { enabled: true });
    registerFeature('feature-b', { enabled: true, percentage: 50 });
    registerFeature('feature-c', { enabled: false });
    
    addUserToGroup('user123', 'premium');
    registerFeature('feature-d', { 
      enabled: true, 
      userGroups: ['premium'] 
    });
    
    const enabled = getEnabledFeatures({ 
      userId: 'user123', 
      groups: ['premium'] 
    });
    
    console.log('Enabled features:', enabled);
  },
};

// Export for module usage
export default {
  registerFeature,
  isFeatureEnabled,
  getEnabledFeatures,
  updateFeature,
  getFeature,
  getAllFeatures,
  removeFeature,
  addUserToGroup,
  removeUserFromGroup,
  getUserGroups,
  getGroupMembers,
  getAllGroups,
  reset,
  examples,
};
