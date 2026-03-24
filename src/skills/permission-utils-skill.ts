/**
 * Permission Utils - RBAC 权限控制工具
 * 
 * 功能:
 * 1. 角色定义与管理
 * 2. 权限检查与验证
 * 3. 资源授权与访问控制
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** 权限类型 */
export type PermissionType = 
  | 'read'
  | 'write'
  | 'delete'
  | 'admin'
  | 'execute'
  | 'manage'
  | string;

/** 资源类型 */
export type ResourceType = 
  | 'document'
  | 'user'
  | 'role'
  | 'permission'
  | 'system'
  | 'api'
  | string;

/** 权限定义 */
export interface Permission {
  /** 权限标识符 (e.g., 'document:read', 'user:write') */
  id: string;
  /** 资源类型 */
  resource: ResourceType;
  /** 权限类型 */
  action: PermissionType;
  /** 权限描述 */
  description?: string;
}

/** 角色定义 */
export interface Role {
  /** 角色标识符 */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description?: string;
  /** 角色拥有的权限 ID 列表 */
  permissions: string[];
  /** 继承的角色 ID 列表 */
  inherits?: string[];
  /** 是否为系统内置角色 */
  builtIn?: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 用户定义 */
export interface User {
  /** 用户标识符 */
  id: string;
  /** 用户名 */
  username: string;
  /** 用户分配的角色 ID 列表 */
  roles: string[];
  /** 用户直接拥有的权限 ID 列表 (可选) */
  directPermissions?: string[];
}

/** 授权策略 */
export type AuthorizationPolicy = 'allow' | 'deny';

/** 授权规则 */
export interface AuthorizationRule {
  /** 规则 ID */
  id: string;
  /** 策略 (允许/拒绝) */
  policy: AuthorizationPolicy;
  /** 角色 ID (可选，为空表示所有角色) */
  roleId?: string;
  /** 用户 ID (可选，为空表示所有用户) */
  userId?: string;
  /** 资源类型 */
  resource: ResourceType;
  /** 权限类型 */
  action: PermissionType;
  /** 优先级 (数字越大优先级越高) */
  priority: number;
  /** 条件表达式 (可选) */
  condition?: (context: AuthorizationContext) => boolean;
}

/** 授权上下文 */
export interface AuthorizationContext {
  /** 用户 ID */
  userId: string;
  /** 资源 ID */
  resourceId: string;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 请求的操作 */
  action: PermissionType;
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

/** 授权结果 */
export interface AuthorizationResult {
  /** 是否授权成功 */
  allowed: boolean;
  /** 拒绝原因 */
  reason?: string;
  /** 匹配的规则 ID */
  matchedRuleId?: string;
}

/** 权限管理器配置 */
export interface PermissionManagerOptions {
  /** 是否启用规则优先级 */
  enablePriority?: boolean;
  /** 默认拒绝 (true) 或默认允许 (false) */
  defaultDeny?: boolean;
  /** 是否缓存权限检查结果 */
  enableCache?: boolean;
  /** 缓存 TTL (毫秒) */
  cacheTTL?: number;
}

interface CacheEntry {
  result: AuthorizationResult;
  expireAt: number;
}

// ============== 权限管理器类 ==============

/**
 * RBAC 权限管理器
 * 
 * 提供完整的基于角色的访问控制功能
 * 
 * @example
 * ```typescript
 * // 创建权限管理器
 * const manager = new PermissionManager();
 * 
 * // 定义权限
 * manager.definePermission({
 *   id: 'document:read',
 *   resource: 'document',
 *   action: 'read',
 *   description: '读取文档'
 * });
 * 
 * // 创建角色
 * manager.createRole({
 *   id: 'viewer',
 *   name: '查看者',
 *   permissions: ['document:read']
 * });
 * 
 * // 分配角色给用户
 * manager.assignRoleToUser('user123', 'viewer');
 * 
 * // 检查权限
 * const hasAccess = manager.checkPermission('user123', 'document:read');
 * ```
 */
export class PermissionManager {
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, Set<string>> = new Map(); // userId -> roleIds
  private userDirectPermissions: Map<string, Set<string>> = new Map(); // userId -> permissionIds
  private rules: AuthorizationRule[] = [];
  private options: Required<PermissionManagerOptions>;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheInterval?: NodeJS.Timeout;

  constructor(options: PermissionManagerOptions = {}) {
    this.options = {
      enablePriority: options.enablePriority ?? true,
      defaultDeny: options.defaultDeny ?? true,
      enableCache: options.enableCache ?? false,
      cacheTTL: options.cacheTTL ?? 60000,
    };
    
    // 创建内置角色
    this.createBuiltInRoles();
    
    // 启动缓存清理
    if (this.options.enableCache) {
      this.startCacheCleanup();
    }
  }

  /**
   * 创建内置角色
   */
  private createBuiltInRoles(): void {
    const now = Date.now();
    
    // 超级管理员
    this.createRole({
      id: 'admin',
      name: '超级管理员',
      description: '拥有所有权限',
      permissions: ['*'],
      builtIn: true,
      createdAt: now,
      updatedAt: now,
    });
    
    // 普通用户
    this.createRole({
      id: 'user',
      name: '普通用户',
      description: '基础访问权限',
      permissions: [],
      builtIn: true,
      createdAt: now,
      updatedAt: now,
    });
    
    // 访客
    this.createRole({
      id: 'guest',
      name: '访客',
      description: '只读权限',
      permissions: [],
      builtIn: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * 定义权限
   * 
   * @param permission - 权限定义
   */
  definePermission(permission: Permission): void {
    this.permissions.set(permission.id, permission);
  }

  /**
   * 批量定义权限
   * 
   * @param permissions - 权限列表
   */
  definePermissions(permissions: Permission[]): void {
    permissions.forEach(p => this.definePermission(p));
  }

  /**
   * 获取权限定义
   * 
   * @param permissionId - 权限 ID
   */
  getPermission(permissionId: string): Permission | undefined {
    return this.permissions.get(permissionId);
  }

  /**
   * 获取所有权限
   */
  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * 创建角色
   * 
   * @param role - 角色定义
   */
  createRole(role: Omit<Role, 'createdAt' | 'updatedAt'>): Role {
    const now = Date.now();
    const newRole: Role = {
      ...role,
      createdAt: now,
      updatedAt: now,
    };
    this.roles.set(role.id, newRole);
    return newRole;
  }

  /**
   * 更新角色
   * 
   * @param roleId - 角色 ID
   * @param updates - 更新内容
   */
  updateRole(roleId: string, updates: Partial<Omit<Role, 'id' | 'createdAt'>>): Role | undefined {
    const role = this.roles.get(roleId);
    if (!role) return undefined;
    
    if (role.builtIn) {
      throw new Error(`Cannot update built-in role: ${roleId}`);
    }
    
    const updatedRole: Role = {
      ...role,
      ...updates,
      updatedAt: Date.now(),
    };
    this.roles.set(roleId, updatedRole);
    return updatedRole;
  }

  /**
   * 删除角色
   * 
   * @param roleId - 角色 ID
   */
  deleteRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;
    
    if (role.builtIn) {
      throw new Error(`Cannot delete built-in role: ${roleId}`);
    }
    
    // 从所有用户中移除该角色
    this.userRoles.forEach(roles => roles.delete(roleId));
    
    return this.roles.delete(roleId);
  }

  /**
   * 获取角色
   * 
   * @param roleId - 角色 ID
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * 获取所有角色
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * 为角色添加权限
   * 
   * @param roleId - 角色 ID
   * @param permissionIds - 权限 ID 列表
   */
  addPermissionsToRole(roleId: string, permissionIds: string[]): Role | undefined {
    const role = this.roles.get(roleId);
    if (!role) return undefined;
    
    if (role.builtIn) {
      throw new Error(`Cannot modify built-in role: ${roleId}`);
    }
    
    const newPermissions = [...new Set([...role.permissions, ...permissionIds])];
    return this.updateRole(roleId, { permissions: newPermissions });
  }

  /**
   * 从角色移除权限
   * 
   * @param roleId - 角色 ID
   * @param permissionIds - 权限 ID 列表
   */
  removePermissionsFromRole(roleId: string, permissionIds: string[]): Role | undefined {
    const role = this.roles.get(roleId);
    if (!role) return undefined;
    
    if (role.builtIn) {
      throw new Error(`Cannot modify built-in role: ${roleId}`);
    }
    
    const newPermissions = role.permissions.filter(p => !permissionIds.includes(p));
    return this.updateRole(roleId, { permissions: newPermissions });
  }

  /**
   * 分配角色给用户
   * 
   * @param userId - 用户 ID
   * @param roleId - 角色 ID
   */
  assignRoleToUser(userId: string, roleId: string): void {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role not found: ${roleId}`);
    }
    
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }
    this.userRoles.get(userId)!.add(roleId);
    
    // 清除缓存
    this.clearUserCache(userId);
  }

  /**
   * 从用户移除角色
   * 
   * @param userId - 用户 ID
   * @param roleId - 角色 ID
   */
  removeRoleFromUser(userId: string, roleId: string): void {
    const userRoleSet = this.userRoles.get(userId);
    if (userRoleSet) {
      userRoleSet.delete(roleId);
      this.clearUserCache(userId);
    }
  }

  /**
   * 设置用户的角色列表 (替换原有角色)
   * 
   * @param userId - 用户 ID
   * @param roleIds - 角色 ID 列表
   */
  setUserRoles(userId: string, roleIds: string[]): void {
    // 验证所有角色存在
    for (const roleId of roleIds) {
      if (!this.roles.has(roleId)) {
        throw new Error(`Role not found: ${roleId}`);
      }
    }
    
    this.userRoles.set(userId, new Set(roleIds));
    this.clearUserCache(userId);
  }

  /**
   * 获取用户的所有角色
   * 
   * @param userId - 用户 ID
   */
  getUserRoles(userId: string): Role[] {
    const roleIds = this.userRoles.get(userId) || new Set();
    const roles: Role[] = [];
    
    for (const roleId of roleIds) {
      const role = this.roles.get(roleId);
      if (role) {
        roles.push(role);
      }
    }
    
    return roles;
  }

  /**
   * 为用户添加直接权限
   * 
   * @param userId - 用户 ID
   * @param permissionIds - 权限 ID 列表
   */
  addDirectPermissionsToUser(userId: string, permissionIds: string[]): void {
    if (!this.userDirectPermissions.has(userId)) {
      this.userDirectPermissions.set(userId, new Set());
    }
    permissionIds.forEach(p => this.userDirectPermissions.get(userId)!.add(p));
    this.clearUserCache(userId);
  }

  /**
   * 获取用户的所有权限 (包括角色权限和直接权限)
   * 
   * @param userId - 用户 ID
   */
  getUserPermissions(userId: string): Set<string> {
    const permissions = new Set<string>();
    
    // 添加直接权限
    const directPerms = this.userDirectPermissions.get(userId);
    if (directPerms) {
      directPerms.forEach(p => permissions.add(p));
    }
    
    // 添加角色权限
    const roleIds = this.userRoles.get(userId) || new Set();
    for (const roleId of roleIds) {
      const role = this.roles.get(roleId);
      if (role) {
        // 添加角色直接权限
        role.permissions.forEach(p => permissions.add(p));
        
        // 处理继承角色
        if (role.inherits) {
          for (const inheritedRoleId of role.inherits) {
            const inheritedRole = this.roles.get(inheritedRoleId);
            if (inheritedRole) {
              inheritedRole.permissions.forEach(p => permissions.add(p));
            }
          }
        }
      }
    }
    
    return permissions;
  }

  /**
   * 检查用户是否有指定权限
   * 
   * @param userId - 用户 ID
   * @param permissionId - 权限 ID (e.g., 'document:read')
   */
  checkPermission(userId: string, permissionId: string): boolean {
    // 检查缓存
    if (this.options.enableCache) {
      const cacheKey = `${userId}:${permissionId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expireAt > Date.now()) {
        return cached.result.allowed;
      }
    }
    
    const permissions = this.getUserPermissions(userId);
    
    // 检查通配符权限
    if (permissions.has('*')) {
      return true;
    }
    
    const hasPermission = permissions.has(permissionId);
    
    // 缓存结果
    if (this.options.enableCache) {
      const cacheKey = `${userId}:${permissionId}`;
      this.cache.set(cacheKey, {
        result: { allowed: hasPermission },
        expireAt: Date.now() + this.options.cacheTTL,
      });
    }
    
    return hasPermission;
  }

  /**
   * 检查用户是否有任一权限
   * 
   * @param userId - 用户 ID
   * @param permissionIds - 权限 ID 列表
   */
  checkAnyPermission(userId: string, permissionIds: string[]): boolean {
    return permissionIds.some(p => this.checkPermission(userId, p));
  }

  /**
   * 检查用户是否有所有权限
   * 
   * @param userId - 用户 ID
   * @param permissionIds - 权限 ID 列表
   */
  checkAllPermissions(userId: string, permissionIds: string[]): boolean {
    return permissionIds.every(p => this.checkPermission(userId, p));
  }

  /**
   * 添加授权规则
   * 
   * @param rule - 授权规则
   */
  addAuthorizationRule(rule: AuthorizationRule): void {
    this.rules.push(rule);
    if (this.options.enablePriority) {
      this.rules.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * 移除授权规则
   * 
   * @param ruleId - 规则 ID
   */
  removeAuthorizationRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;
    this.rules.splice(index, 1);
    return true;
  }

  /**
   * 授权检查 (基于规则)
   * 
   * @param context - 授权上下文
   */
  authorize(context: AuthorizationContext): AuthorizationResult {
    // 遍历规则 (已按优先级排序)
    for (const rule of this.rules) {
      // 检查规则是否匹配
      if (rule.roleId) {
        const userRoles = this.userRoles.get(context.userId) || new Set();
        if (!userRoles.has(rule.roleId)) {
          continue;
        }
      }
      
      if (rule.userId && rule.userId !== context.userId) {
        continue;
      }
      
      if (rule.resource !== context.resourceType) {
        continue;
      }
      
      if (rule.action !== '*' && rule.action !== context.action) {
        continue;
      }
      
      // 检查条件
      if (rule.condition && !rule.condition(context)) {
        continue;
      }
      
      // 规则匹配，返回结果
      return {
        allowed: rule.policy === 'allow',
        reason: rule.policy === 'allow' ? undefined : `Denied by rule: ${rule.id}`,
        matchedRuleId: rule.id,
      };
    }
    
    // 没有匹配的规则，返回默认策略
    return {
      allowed: !this.options.defaultDeny,
      reason: this.options.defaultDeny ? 'Default deny policy' : 'Default allow policy',
    };
  }

  /**
   * 检查用户是否可以访问资源
   * 
   * @param userId - 用户 ID
   * @param resourceType - 资源类型
   * @param action - 操作类型
   * @param resourceId - 资源 ID (可选)
   */
  canAccess(
    userId: string,
    resourceType: ResourceType,
    action: PermissionType,
    resourceId?: string
  ): AuthorizationResult {
    const context: AuthorizationContext = {
      userId,
      resourceType,
      action,
      resourceId: resourceId || '',
    };
    
    return this.authorize(context);
  }

  /**
   * 清除用户缓存
   * 
   * @param userId - 用户 ID
   */
  private clearUserCache(userId: string): void {
    if (!this.options.enableCache) return;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 启动缓存清理
   */
  private startCacheCleanup(): void {
    this.cacheInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expireAt <= now) {
          this.cache.delete(key);
        }
      }
    }, Math.min(this.options.cacheTTL, 60000));
    
    this.cacheInterval.unref();
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
    }
    this.permissions.clear();
    this.roles.clear();
    this.userRoles.clear();
    this.userDirectPermissions.clear();
    this.rules = [];
    this.cache.clear();
  }

  /**
   * 导出权限配置
   */
  exportConfig(): object {
    return {
      permissions: this.getAllPermissions(),
      roles: this.getAllRoles(),
      rules: this.rules.map(r => ({ ...r, condition: undefined })), // 不导出函数
    };
  }

  /**
   * 导入权限配置
   * 
   * @param config - 配置对象
   */
  importConfig(config: {
    permissions?: Permission[];
    roles?: Role[];
    rules?: AuthorizationRule[];
  }): void {
    if (config.permissions) {
      this.definePermissions(config.permissions);
    }
    
    if (config.roles) {
      config.roles.forEach(role => {
        if (!this.roles.has(role.id)) {
          this.createRole(role);
        }
      });
    }
    
    if (config.rules) {
      config.rules.forEach(rule => this.addAuthorizationRule(rule));
    }
  }
}

// ============== 便捷函数 ==============

/**
 * 创建权限 ID
 * 
 * @param resource - 资源类型
 * @param action - 操作类型
 */
export function createPermissionId(resource: ResourceType, action: PermissionType): string {
  return `${resource}:${action}`;
}

/**
 * 解析权限 ID
 * 
 * @param permissionId - 权限 ID
 */
export function parsePermissionId(permissionId: string): { resource: string; action: string } | null {
  const parts = permissionId.split(':');
  if (parts.length !== 2) return null;
  return { resource: parts[0], action: parts[1] };
}

/**
 * 检查权限 ID 是否匹配
 * 
 * @param permissionId - 权限 ID
 * @param resource - 资源类型
 * @param action - 操作类型
 */
export function permissionMatches(
  permissionId: string,
  resource: ResourceType,
  action: PermissionType
): boolean {
  if (permissionId === '*') return true;
  const parsed = parsePermissionId(permissionId);
  if (!parsed) return false;
  return parsed.resource === resource && (parsed.action === action || parsed.action === '*');
}

/**
 * 创建授权规则
 * 
 * @param options - 规则选项
 */
export function createAuthorizationRule(options: {
  id: string;
  policy: AuthorizationPolicy;
  roleId?: string;
  userId?: string;
  resource: ResourceType;
  action: PermissionType;
  priority?: number;
  condition?: (context: AuthorizationContext) => boolean;
}): AuthorizationRule {
  return {
    id: options.id,
    policy: options.policy,
    roleId: options.roleId,
    userId: options.userId,
    resource: options.resource,
    action: options.action,
    priority: options.priority ?? 0,
    condition: options.condition,
  };
}
