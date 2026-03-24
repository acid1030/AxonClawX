/**
 * Division Memory Permission Control Module
 * 
 * Handles access control for division-based memory system.
 * Loads YAML configurations, validates permissions, and logs access.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Types
export interface PermissionRule {
  read: string[];
  write: string[];
}

export interface MemberPermissions {
  [role: string]: PermissionRule;
}

export interface DivisionConfig {
  division: string;
  members: MemberPermissions;
}

export interface AccessLogEntry {
  timestamp: string;
  division: string;
  role: string;
  action: 'read' | 'write';
  path: string;
  allowed: boolean;
  reason?: string;
}

// Constants
const DIVISIONS_BASE_PATH = path.join(process.env.HOME || '~', '.openclaw', 'memory', 'divisions');
const ACCESS_LOG_PATH = path.join(DIVISIONS_BASE_PATH, 'access-log.json');

// Cache for loaded configs
const configCache: Map<string, DivisionConfig> = new Map();

/**
 * Load division configuration from YAML file
 */
export function loadDivisionConfig(divisionId: string): DivisionConfig | null {
  // Check cache first
  if (configCache.has(divisionId)) {
    return configCache.get(divisionId)!;
  }

  const configPath = path.join(DIVISIONS_BASE_PATH, divisionId, 'permissions.yaml');
  
  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`[DivisionPermissions] Config not found for division: ${divisionId}`);
      return null;
    }

    const yamlContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(yamlContent) as DivisionConfig;
    
    // Cache the config
    configCache.set(divisionId, config);
    
    return config;
  } catch (error) {
    console.error(`[DivisionPermissions] Error loading config for ${divisionId}:`, error);
    return null;
  }
}

/**
 * Check if a path matches a permission pattern
 * Supports wildcards: *, **
 */
export function matchPathPattern(pattern: string, targetPath: string): boolean {
  // Exact match
  if (pattern === targetPath) {
    return true;
  }

  // Wildcard patterns
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** matches any path segments
      .replace(/\*/g, '[^/]*'); // * matches within a segment
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(targetPath);
  }

  return false;
}

/**
 * Check if a role has permission to access a path
 */
export function checkPermission(
  divisionId: string,
  role: string,
  targetPath: string,
  action: 'read' | 'write'
): { allowed: boolean; reason?: string } {
  const config = loadDivisionConfig(divisionId);
  
  if (!config) {
    return { allowed: false, reason: 'Division config not found' };
  }

  const memberPerms = config.members[role];
  
  if (!memberPerms) {
    return { allowed: false, reason: `Role '${role}' not found in division '${divisionId}'` };
  }

  const permissions = action === 'read' ? memberPerms.read : memberPerms.write;
  
  // Check if target path matches any allowed pattern
  for (const pattern of permissions) {
    if (matchPathPattern(pattern, targetPath)) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: `Path '${targetPath}' not in ${action} permissions for role '${role}'` };
}

/**
 * Log access attempt
 */
export function logAccess(
  divisionId: string,
  role: string,
  targetPath: string,
  action: 'read' | 'write',
  allowed: boolean,
  reason?: string
): void {
  const logEntry: AccessLogEntry = {
    timestamp: new Date().toISOString(),
    division: divisionId,
    role,
    action,
    path: targetPath,
    allowed,
    reason
  };

  try {
    // Read existing logs
    let logs: AccessLogEntry[] = [];
    if (fs.existsSync(ACCESS_LOG_PATH)) {
      const existing = fs.readFileSync(ACCESS_LOG_PATH, 'utf8');
      logs = JSON.parse(existing);
    }

    // Add new entry
    logs.push(logEntry);

    // Keep only last 1000 entries
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    // Write back
    fs.writeFileSync(ACCESS_LOG_PATH, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('[DivisionPermissions] Error writing access log:', error);
  }
}

/**
 * Safe read operation with permission check
 */
export function safeRead(
  divisionId: string,
  role: string,
  filePath: string
): string | null {
  const relativePath = path.relative(path.join(DIVISIONS_BASE_PATH, divisionId), filePath);
  
  const permission = checkPermission(divisionId, role, relativePath, 'read');
  
  logAccess(divisionId, role, relativePath, 'read', permission.allowed, permission.reason);
  
  if (!permission.allowed) {
    console.warn(`[DivisionPermissions] Read denied: ${permission.reason}`);
    return null;
  }

  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`[DivisionPermissions] Error reading ${filePath}:`, error);
    return null;
  }
}

/**
 * Safe write operation with permission check
 */
export function safeWrite(
  divisionId: string,
  role: string,
  filePath: string,
  content: string
): boolean {
  const relativePath = path.relative(path.join(DIVISIONS_BASE_PATH, divisionId), filePath);
  
  const permission = checkPermission(divisionId, role, relativePath, 'write');
  
  logAccess(divisionId, role, relativePath, 'write', permission.allowed, permission.reason);
  
  if (!permission.allowed) {
    console.warn(`[DivisionPermissions] Write denied: ${permission.reason}`);
    return false;
  }

  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`[DivisionPermissions] Error writing ${filePath}:`, error);
    return false;
  }
}

/**
 * Get all access logs for a division
 */
export function getAccessLogs(divisionId?: string, limit: number = 100): AccessLogEntry[] {
  try {
    if (!fs.existsSync(ACCESS_LOG_PATH)) {
      return [];
    }

    const logs: AccessLogEntry[] = JSON.parse(fs.readFileSync(ACCESS_LOG_PATH, 'utf8'));
    
    // Filter by division if specified
    const filtered = divisionId 
      ? logs.filter(log => log.division === divisionId)
      : logs;
    
    // Return most recent entries
    return filtered.slice(-limit).reverse();
  } catch (error) {
    console.error('[DivisionPermissions] Error reading access logs:', error);
    return [];
  }
}

/**
 * Clear access logs (admin operation)
 */
export function clearAccessLogs(): void {
  try {
    if (fs.existsSync(ACCESS_LOG_PATH)) {
      fs.writeFileSync(ACCESS_LOG_PATH, '[]');
      console.log('[DivisionPermissions] Access logs cleared');
    }
  } catch (error) {
    console.error('[DivisionPermissions] Error clearing access logs:', error);
  }
}

// Export for testing
export const _test = {
  matchPathPattern,
  configCache
};
