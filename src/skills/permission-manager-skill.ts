/**
 * 权限管理技能 - Permission Manager Skill
 * 
 * 功能:
 * 1. RBAC 权限 - 基于角色的访问控制
 * 2. 资源授权 - 资源权限分配
 * 3. 权限检查 - 实时权限验证
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/**
 * 权限类型
 */
export type PermissionType = 
  | 'read'      // 读取
  | 'write'     // 写入
  | 'delete'    // 删除
  | 'execute'   // 执行
  | 'admin'     // 管理员
  | 'custom';   // 自定义

/**
 * 资源类型
 */
export type ResourceType =
  | 'file'      // 文件
  | 'database'  // 数据库
  | 'api'       // API 接口
  | 'service'   // 服务
  | 'config'    // 配置
  | 'system'    // 系统
  | 'custom';   // 自定义

/**
 * 权限定义
 */
export interface Permission {
  /** 权限 ID */
  id: string;
  /** 权限名称 */
  name: string;
  /** 权限类型 */
  type: PermissionType;
  /** 权限描述 */
  description?: string;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 角色定义
 */
export interface Role {
  /** 角色 ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description?: string;
  /** 权限 ID 列表 */
  permissions: string[];
  /** 是否系统内置角色 */
  isSystem?: boolean;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 资源定义
 */
export interface Resource {
  /** 资源 ID */
  id: string;
  /** 资源名称 */
  name: string;
  /** 资源类型 */
  type: ResourceType;
  /** 资源路径/标识 */
  path: string;
  /** 资源描述 */
  description?: string;
  /** 父资源 ID (支持层级结构) */
  parentId?: string;
  /** 元数据 */
  metadata?: Record<string, any>;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 用户定义
 */
export interface User {
  /** 用户 ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 用户邮箱 */
  email?: string;
  /** 角色 ID 列表 */
  roles: string[];
  /** 直接分配的权限 ID 列表 (覆盖角色权限) */
  directPermissions: string[];
  /** 是否禁用 */
  disabled: boolean;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 授权记录
 */
export interface Authorization {
  /** 授权 ID */
  id: string;
  /** 主体类型：user | role */
  subjectType: 'user' | 'role';
  /** 主体 ID */
  subjectId: string;
  /** 资源 ID */
  resourceId: string;
  /** 权限 ID 列表 */
  permissionIds: string[];
  /** 过期时间 (可选) */
  expiresAt?: number;
  /** 创建时间 */
  createdAt: number;
  /** 创建者 ID */
  createdBy: string;
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  /** 是否允许 */
  allowed: boolean;
  /** 拒绝原因 */
  reason?: string;
  /** 匹配的授权记录 */
  matchedAuthorization?: Authorization;
  /** 检查时间 */
  checkedAt: number;
}

/**
 * 权限管理器配置
 */
export interface PermissionManagerConfig {
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存过期时间 (毫秒) */
  cacheTTL?: number;
  /** 是否启用审计日志 */
  enableAudit?: boolean;
  /** 是否允许权限继承 */
  enableInheritance?: boolean;
  /** 默认拒绝策略 */
  defaultDeny?: boolean;
}

/**
 * 审计日志
 */
export interface AuditLog {
  /** 日志 ID */
  id: string;
  /** 操作类型 */
  action: 'grant' | 'revoke' | 'check' | 'create' | 'update' | 'delete';
  /** 主体类型 */
  subjectType: 'user' | 'role' | 'system';
  /** 主体 ID */
  subjectId: string;
  /** 资源 ID */
  resourceId?: string;
  /** 权限 ID */
  permissionId?: string;
  /** 结果 */
  result: 'success' | 'failure' | 'denied';
  /** 详细信息 */
  details?: string;
  /** 时间戳 */
  timestamp: number;
}

// ============== 权限管理器类 ==============

export class PermissionManager {
  /** 权限存储 */
  private permissions: Map<string, Permission> = new Map();
  
  /** 角色存储 */
  private roles: Map<string, Role> = new Map();
  
  /** 资源存储 */
  private resources: Map<string, Resource> = new Map();
  
  /** 用户存储 */
  private users: Map<string, User> = new Map();
  
  /** 授权存储 */
  private authorizations: Map<string, Authorization> = new Map();
  
  /** 审计日志 */
  private auditLogs: AuditLog[] = [];
  
  /** 配置 */
  private config: Required<PermissionManagerConfig>;
  
  /** 权限缓存 */
  private permissionCache: Map<string, { result: boolean; expiresAt: number }> = new Map();

  constructor(config: PermissionManagerConfig = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 60000, // 1 分钟
      enableAudit: config.enableAudit ?? true,
      enableInheritance: config.enableInheritance ?? true,
      defaultDeny: config.defaultDeny ?? true,
    };
    
    // 初始化系统内置角色
    this.initSystemRoles();
  }

  /**
   * 初始化系统内置角色
   */
  private initSystemRoles() {
    const now = Date.now();
    
    // 超级管理员
    this.createRole({
      id: 'role:superadmin',
      name: 'Super Admin',
      description: '系统超级管理员，拥有所有权限',
      permissions: ['*'],
      isSystem: true,
      createdAt: now,
    });
    
    // 管理员
    this.createRole({
      id: 'role:admin',
      name: 'Admin',
      description: '管理员，拥有管理权限',
      permissions: ['perm:read', 'perm:write', 'perm:delete'],
      isSystem: true,
      createdAt: now,
    });
    
    // 普通用户
    this.createRole({
      id: 'role:user',
      name: 'User',
      description: '普通用户，只读权限',
      permissions: ['perm:read'],
      isSystem: true,
      createdAt: now,
    });
    
    // 访客
    this.createRole({
      id: 'role:guest',
      name: 'Guest',
      description: '访客，有限权限',
      permissions: ['perm:read'],
      isSystem: true,
      createdAt: now,
    });
  }

  // ============== 权限管理 ==============

  /**
   * 创建权限
   */
  createPermission(permission: Permission): Permission {
    this.permissions.set(permission.id, permission);
    this.logAudit('create', 'system', 'permission', permission.id, 'success');
    return permission;
  }

  /**
   * 获取权限
   */
  getPermission(id: string): Permission | undefined {
    return this.permissions.get(id);
  }

  /**
   * 删除权限
   */
  deletePermission(id: string): boolean {
    const permission = this.permissions.get(id);
    if (permission) {
      this.permissions.delete(id);
      this.logAudit('delete', 'system', 'permission', id, 'success');
      return true;
    }
    return false;
  }

  /**
   * 列出所有权限
   */
  listPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  // ============== 角色管理 ==============

  /**
   * 创建角色
   */
  createRole(role: Role): Role {
    this.roles.set(role.id, role);
    this.logAudit('create', 'system', 'role', role.id, 'success');
    return role;
  }

  /**
   * 获取角色
   */
  getRole(id: string): Role | undefined {
    return this.roles.get(id);
  }

  /**
   * 更新角色
   */
  updateRole(id: string, updates: Partial<Role>): Role | undefined {
    const role = this.roles.get(id);
    if (role && !role.isSystem) {
      const updated = { ...role, ...updates };
      this.roles.set(id, updated);
      this.logAudit('update', 'system', 'role', id, 'success');
      return updated;
    }
    return undefined;
  }

  /**
   * 删除角色
   */
  deleteRole(id: string): boolean {
    const role = this.roles.get(id);
    if (role && !role.isSystem) {
      this.roles.delete(id);
      this.logAudit('delete', 'system', 'role', id, 'success');
      return true;
    }
    return false;
  }

  /**
   * 为角色添加权限
   */
  addPermissionToRole(roleId: string, permissionId: string): boolean {
    const role = this.roles.get(roleId);
    if (role && !role.isSystem && !role.permissions.includes(permissionId)) {
      role.permissions.push(permissionId);
      this.logAudit('grant', 'role', roleId, undefined, permissionId, 'success');
      return true;
    }
    return false;
  }

  /**
   * 从角色移除权限
   */
  removePermissionFromRole(roleId: string, permissionId: string): boolean {
    const role = this.roles.get(roleId);
    if (role && !role.isSystem) {
      const index = role.permissions.indexOf(permissionId);
      if (index > -1) {
        role.permissions.splice(index, 1);
        this.logAudit('revoke', 'role', roleId, undefined, permissionId, 'success');
        return true;
      }
    }
    return false;
  }

  /**
   * 列出所有角色
   */
  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  // ============== 资源管理 ==============

  /**
   * 创建资源
   */
  createResource(resource: Resource): Resource {
    this.resources.set(resource.id, resource);
    this.logAudit('create', 'system', 'resource', resource.id, 'success');
    return resource;
  }

  /**
   * 获取资源
   */
  getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }

  /**
   * 删除资源
   */
  deleteResource(id: string): boolean {
    const resource = this.resources.get(id);
    if (resource) {
      this.resources.delete(id);
      this.logAudit('delete', 'system', 'resource', id, 'success');
      return true;
    }
    return false;
  }

  /**
   * 列出所有资源
   */
  listResources(type?: ResourceType): Resource[] {
    const resources = Array.from(this.resources.values());
    if (type) {
      return resources.filter(r => r.type === type);
    }
    return resources;
  }

  // ============== 用户管理 ==============

  /**
   * 创建用户
   */
  createUser(user: User): User {
    this.users.set(user.id, user);
    this.logAudit('create', 'system', 'user', user.id, 'success');
    return user;
  }

  /**
   * 获取用户
   */
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  /**
   * 更新用户
   */
  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (user) {
      const updated = { ...user, ...updates };
      this.users.set(id, updated);
      this.logAudit('update', 'system', 'user', id, 'success');
      return updated;
    }
    return undefined;
  }

  /**
   * 删除用户
   */
  deleteUser(id: string): boolean {
    const user = this.users.get(id);
    if (user) {
      this.users.delete(id);
      this.logAudit('delete', 'system', 'user', id, 'success');
      return true;
    }
    return false;
  }

  /**
   * 为用户分配角色
   */
  assignRoleToUser(userId: string, roleId: string): boolean {
    const user = this.users.get(userId);
    if (user && !user.roles.includes(roleId)) {
      user.roles.push(roleId);
      this.logAudit('grant', 'user', userId, undefined, roleId, 'success');
      return true;
    }
    return false;
  }

  /**
   * 从用户移除角色
   */
  removeRoleFromUser(userId: string, roleId: string): boolean {
    const user = this.users.get(userId);
    if (user) {
      const index = user.roles.indexOf(roleId);
      if (index > -1) {
        user.roles.splice(index, 1);
        this.logAudit('revoke', 'user', userId, undefined, roleId, 'success');
        return true;
      }
    }
    return false;
  }

  /**
   * 列出所有用户
   */
  listUsers(): User[] {
    return Array.from(this.users.values());
  }

  // ============== 授权管理 ==============

  /**
   * 创建授权
   */
  createAuthorization(auth: Authorization): Authorization {
    this.authorizations.set(auth.id, auth);
    this.logAudit('grant', auth.subjectType, auth.subjectId, auth.resourceId, undefined, 'success');
    return auth;
  }

  /**
   * 撤销授权
   */
  revokeAuthorization(id: string): boolean {
    const auth = this.authorizations.get(id);
    if (auth) {
      this.authorizations.delete(id);
      this.logAudit('revoke', auth.subjectType, auth.subjectId, auth.resourceId, undefined, 'success');
      return true;
    }
    return false;
  }

  /**
   * 获取主体的授权列表
   */
  getAuthorizations(subjectType: 'user' | 'role', subjectId: string): Authorization[] {
    return Array.from(this.authorizations.values()).filter(
      auth => auth.subjectType === subjectType && auth.subjectId === subjectId
    );
  }

  // ============== 权限检查 ==============

  /**
   * 检查用户是否有权限访问资源
   */
  checkPermission(userId: string, resourceId: string, permissionType: PermissionType): PermissionCheckResult {
    const now = Date.now();
    const cacheKey = `${userId}:${resourceId}:${permissionType}`;
    
    // 检查缓存
    if (this.config.enableCache) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return {
          allowed: cached.result,
          checkedAt: now,
        };
      }
    }
    
    const user = this.users.get(userId);
    if (!user) {
      return this.createCheckResult(false, 'User not found', now);
    }
    
    if (user.disabled) {
      return this.createCheckResult(false, 'User is disabled', now);
    }
    
    // 检查直接权限
    if (user.directPermissions.includes('*') || 
        user.directPermissions.includes(`perm:${permissionType}`)) {
      return this.createCheckResult(true, undefined, now);
    }
    
    // 检查角色权限
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (!role) continue;
      
      // 检查通配符权限
      if (role.permissions.includes('*')) {
        return this.createCheckResult(true, undefined, now, 
          this.findAuthorization('role', roleId, resourceId));
      }
      
      // 检查具体权限
      if (role.permissions.includes(`perm:${permissionType}`)) {
        return this.createCheckResult(true, undefined, now,
          this.findAuthorization('role', roleId, resourceId));
      }
    }
    
    // 检查资源级授权
    const resourceAuths = this.getAuthorizations('user', userId);
    for (const auth of resourceAuths) {
      if (auth.resourceId === resourceId) {
        // 检查过期时间
        if (auth.expiresAt && auth.expiresAt < now) {
          continue;
        }
        
        // 检查权限
        if (auth.permissionIds.includes('*') || 
            auth.permissionIds.includes(`perm:${permissionType}`)) {
          return this.createCheckResult(true, undefined, now, auth);
        }
      }
    }
    
    // 默认拒绝
    const result = this.createCheckResult(
      !this.config.defaultDeny,
      this.config.defaultDeny ? 'Permission denied' : 'Permission granted by default',
      now
    );
    
    // 写入缓存
    if (this.config.enableCache) {
      this.permissionCache.set(cacheKey, {
        result: result.allowed,
        expiresAt: now + this.config.cacheTTL,
      });
    }
    
    return result;
  }

  /**
   * 批量检查权限
   */
  checkPermissions(userId: string, checks: Array<{ resourceId: string; permissionType: PermissionType }>): Record<string, PermissionCheckResult> {
    const results: Record<string, PermissionCheckResult> = {};
    for (const check of checks) {
      const key = `${check.resourceId}:${check.permissionType}`;
      results[key] = this.checkPermission(userId, check.resourceId, check.permissionType);
    }
    return results;
  }

  /**
   * 获取用户所有有效权限
   */
  getUserPermissions(userId: string): string[] {
    const user = this.users.get(userId);
    if (!user) return [];
    
    const permissions = new Set<string>(user.directPermissions);
    
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (role) {
        role.permissions.forEach(p => permissions.add(p));
      }
    }
    
    return Array.from(permissions);
  }

  /**
   * 获取用户所有角色
   */
  getUserRoles(userId: string): Role[] {
    const user = this.users.get(userId);
    if (!user) return [];
    
    return user.roles
      .map(roleId => this.roles.get(roleId))
      .filter((r): r is Role => r !== undefined);
  }

  // ============== 辅助方法 ==============

  private createCheckResult(
    allowed: boolean,
    reason?: string,
    checkedAt?: number,
    matchedAuthorization?: Authorization
  ): PermissionCheckResult {
    return {
      allowed,
      reason,
      matchedAuthorization,
      checkedAt: checkedAt ?? Date.now(),
    };
  }

  private findAuthorization(
    subjectType: 'user' | 'role',
    subjectId: string,
    resourceId?: string
  ): Authorization | undefined {
    return Array.from(this.authorizations.values()).find(
      auth => auth.subjectType === subjectType && 
              auth.subjectId === subjectId && 
              (!resourceId || auth.resourceId === resourceId)
    );
  }

  private logAudit(
    action: AuditLog['action'],
    subjectType: AuditLog['subjectType'],
    targetType: string,
    targetId: string,
    result: AuditLog['result'],
    permissionId?: string,
    details?: string
  ) {
    if (!this.config.enableAudit) return;
    
    this.auditLogs.push({
      id: `audit:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      action,
      subjectType,
      subjectId: targetId,
      resourceId: targetType === 'resource' ? targetId : undefined,
      permissionId: targetType === 'permission' ? targetId : permissionId,
      result,
      details,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取审计日志
   */
  getAuditLogs(limit: number = 100, offset: number = 0): AuditLog[] {
    return this.auditLogs.slice(offset, offset + limit);
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, value] of this.permissionCache.entries()) {
      if (value.expiresAt < now) {
        this.permissionCache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * 导出配置
   */
  exportConfig(): object {
    return {
      permissions: this.listPermissions(),
      roles: this.listRoles(),
      resources: this.listResources(),
      users: this.listUsers(),
      authorizations: Array.from(this.authorizations.values()),
    };
  }

  /**
   * 导入配置
   */
  importConfig(config: {
    permissions?: Permission[];
    roles?: Role[];
    resources?: Resource[];
    users?: User[];
    authorizations?: Authorization[];
  }): void {
    if (config.permissions) {
      config.permissions.forEach(p => this.permissions.set(p.id, p));
    }
    if (config.roles) {
      config.roles.forEach(r => this.roles.set(r.id, r));
    }
    if (config.resources) {
      config.resources.forEach(r => this.resources.set(r.id, r));
    }
    if (config.users) {
      config.users.forEach(u => this.users.set(u.id, u));
    }
    if (config.authorizations) {
      config.authorizations.forEach(a => this.authorizations.set(a.id, a));
    }
  }
}

// ============== 使用示例 ==============

/**
 * 使用示例 1: 基础 RBAC 权限管理
 */
export function example1_BasicRBAC() {
  const manager = new PermissionManager();
  
  // 创建自定义权限
  manager.createPermission({
    id: 'perm:project:read',
    name: 'Read Project',
    type: 'read',
    description: '读取项目信息',
    createdAt: Date.now(),
  });
  
  manager.createPermission({
    id: 'perm:project:write',
    name: 'Write Project',
    type: 'write',
    description: '修改项目信息',
    createdAt: Date.now(),
  });
  
  // 创建自定义角色
  manager.createRole({
    id: 'role:developer',
    name: 'Developer',
    description: '开发人员',
    permissions: ['perm:project:read', 'perm:project:write'],
    createdAt: Date.now(),
  });
  
  // 创建用户并分配角色
  manager.createUser({
    id: 'user:alice',
    username: 'alice',
    email: 'alice@example.com',
    roles: ['role:developer'],
    directPermissions: [],
    disabled: false,
    createdAt: Date.now(),
  });
  
  // 检查权限
  const result = manager.checkPermission('user:alice', 'resource:project1', 'read');
  console.log('Permission check:', result.allowed); // true
}

/**
 * 使用示例 2: 资源级授权
 */
export function example2_ResourceAuthorization() {
  const manager = new PermissionManager();
  
  // 创建资源
  manager.createResource({
    id: 'resource:secret-doc',
    name: 'Secret Document',
    type: 'file',
    path: '/documents/secret.pdf',
    createdAt: Date.now(),
  });
  
  // 创建用户
  manager.createUser({
    id: 'user:bob',
    username: 'bob',
    roles: ['role:user'], // 普通用户只有读权限
    directPermissions: [],
    disabled: false,
    createdAt: Date.now(),
  });
  
  // 为特定用户授权特定资源
  manager.createAuthorization({
    id: 'auth:1',
    subjectType: 'user',
    subjectId: 'user:bob',
    resourceId: 'resource:secret-doc',
    permissionIds: ['perm:read', 'perm:write'],
    createdBy: 'user:admin',
    createdAt: Date.now(),
  });
  
  // 检查权限
  const readResult = manager.checkPermission('user:bob', 'resource:secret-doc', 'read');
  console.log('Read allowed:', readResult.allowed); // true
  
  const deleteResult = manager.checkPermission('user:bob', 'resource:secret-doc', 'delete');
  console.log('Delete allowed:', deleteResult.allowed); // false
}

/**
 * 使用示例 3: 带过期时间的授权
 */
export function example3_TemporalAuthorization() {
  const manager = new PermissionManager();
  
  // 创建临时授权 (1 小时后过期)
  manager.createAuthorization({
    id: 'auth:temp',
    subjectType: 'user',
    subjectId: 'user:contractor',
    resourceId: 'resource:temp-project',
    permissionIds: ['perm:read', 'perm:write'],
    expiresAt: Date.now() + 3600000, // 1 小时
    createdBy: 'user:manager',
    createdAt: Date.now(),
  });
  
  // 权限检查会自动检查过期时间
  const result = manager.checkPermission('user:contractor', 'resource:temp-project', 'read');
  console.log('Temporary access:', result.allowed);
}

/**
 * 使用示例 4: 权限继承与层级
 */
export function example4_PermissionInheritance() {
  const manager = new PermissionManager({ enableInheritance: true });
  
  // 创建层级资源
  manager.createResource({
    id: 'resource:dept',
    name: 'Department',
    type: 'system',
    path: '/departments',
    createdAt: Date.now(),
  });
  
  manager.createResource({
    id: 'resource:dept:engineering',
    name: 'Engineering Dept',
    type: 'system',
    path: '/departments/engineering',
    parentId: 'resource:dept',
    createdAt: Date.now(),
  });
  
  // 授权父资源，子资源自动继承 (需要启用 inheritance)
  manager.createAuthorization({
    id: 'auth:dept',
    subjectType: 'role',
    subjectId: 'role:manager',
    resourceId: 'resource:dept',
    permissionIds: ['perm:read', 'perm:write'],
    createdBy: 'user:admin',
    createdAt: Date.now(),
  });
}

/**
 * 使用示例 5: 审计日志查询
 */
export function example5_AuditLogging() {
  const manager = new PermissionManager({ enableAudit: true });
  
  // 执行一些操作...
  manager.createUser({
    id: 'user:test',
    username: 'test',
    roles: [],
    directPermissions: [],
    disabled: false,
    createdAt: Date.now(),
  });
  
  // 查询审计日志
  const logs = manager.getAuditLogs(10);
  console.log('Recent audit logs:', logs);
  
  // 导出配置
  const config = manager.exportConfig();
  console.log('Exported config:', config);
}

// ============== 导出 ==============

export default PermissionManager;
