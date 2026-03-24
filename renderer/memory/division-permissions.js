"use strict";
/**
 * Division Memory Permission Control Module
 *
 * Handles access control for division-based memory system.
 * Loads YAML configurations, validates permissions, and logs access.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports._test = void 0;
exports.loadDivisionConfig = loadDivisionConfig;
exports.matchPathPattern = matchPathPattern;
exports.checkPermission = checkPermission;
exports.logAccess = logAccess;
exports.safeRead = safeRead;
exports.safeWrite = safeWrite;
exports.getAccessLogs = getAccessLogs;
exports.clearAccessLogs = clearAccessLogs;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
// Constants
const DIVISIONS_BASE_PATH = path.join(process.env.HOME || '~', '.openclaw', 'memory', 'divisions');
const ACCESS_LOG_PATH = path.join(DIVISIONS_BASE_PATH, 'access-log.json');
// Cache for loaded configs
const configCache = new Map();
/**
 * Load division configuration from YAML file
 */
function loadDivisionConfig(divisionId) {
    // Check cache first
    if (configCache.has(divisionId)) {
        return configCache.get(divisionId);
    }
    const configPath = path.join(DIVISIONS_BASE_PATH, divisionId, 'permissions.yaml');
    try {
        if (!fs.existsSync(configPath)) {
            console.warn(`[DivisionPermissions] Config not found for division: ${divisionId}`);
            return null;
        }
        const yamlContent = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(yamlContent);
        // Cache the config
        configCache.set(divisionId, config);
        return config;
    }
    catch (error) {
        console.error(`[DivisionPermissions] Error loading config for ${divisionId}:`, error);
        return null;
    }
}
/**
 * Check if a path matches a permission pattern
 * Supports wildcards: *, **
 */
function matchPathPattern(pattern, targetPath) {
    // Exact match
    if (pattern === targetPath) {
        return true;
    }
    // Wildcard patterns
    if (pattern.includes('*')) {
        const regexPattern = pattern
            .replace(/\*\*/g, '.*') // ** matches any path segments
            .replace(/\*/g, '[^/]*'); // * matches within a segment
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(targetPath);
    }
    return false;
}
/**
 * Check if a role has permission to access a path
 */
function checkPermission(divisionId, role, targetPath, action) {
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
function logAccess(divisionId, role, targetPath, action, allowed, reason) {
    const logEntry = {
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
        let logs = [];
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
    }
    catch (error) {
        console.error('[DivisionPermissions] Error writing access log:', error);
    }
}
/**
 * Safe read operation with permission check
 */
function safeRead(divisionId, role, filePath) {
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
    }
    catch (error) {
        console.error(`[DivisionPermissions] Error reading ${filePath}:`, error);
        return null;
    }
}
/**
 * Safe write operation with permission check
 */
function safeWrite(divisionId, role, filePath, content) {
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
    }
    catch (error) {
        console.error(`[DivisionPermissions] Error writing ${filePath}:`, error);
        return false;
    }
}
/**
 * Get all access logs for a division
 */
function getAccessLogs(divisionId, limit = 100) {
    try {
        if (!fs.existsSync(ACCESS_LOG_PATH)) {
            return [];
        }
        const logs = JSON.parse(fs.readFileSync(ACCESS_LOG_PATH, 'utf8'));
        // Filter by division if specified
        const filtered = divisionId
            ? logs.filter(log => log.division === divisionId)
            : logs;
        // Return most recent entries
        return filtered.slice(-limit).reverse();
    }
    catch (error) {
        console.error('[DivisionPermissions] Error reading access logs:', error);
        return [];
    }
}
/**
 * Clear access logs (admin operation)
 */
function clearAccessLogs() {
    try {
        if (fs.existsSync(ACCESS_LOG_PATH)) {
            fs.writeFileSync(ACCESS_LOG_PATH, '[]');
            console.log('[DivisionPermissions] Access logs cleared');
        }
    }
    catch (error) {
        console.error('[DivisionPermissions] Error clearing access logs:', error);
    }
}
// Export for testing
exports._test = {
    matchPathPattern,
    configCache
};
