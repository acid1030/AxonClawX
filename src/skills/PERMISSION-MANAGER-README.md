# 🔐 权限管理技能 - Permission Manager Skill

**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📋 功能概述

权限管理技能提供完整的 RBAC (基于角色的访问控制) 系统，支持：

1. **RBAC 权限管理** - 角色定义、权限分配、用户角色绑定
2. **资源授权** - 细粒度资源级权限控制
3. **权限检查** - 实时权限验证、缓存优化
4. **审计日志** - 完整的操作审计追踪

---

## 🚀 快速开始

### 基础用法

```typescript
import PermissionManager from './permission-manager-skill';

// 创建权限管理器实例
const manager = new PermissionManager({
  enableCache: true,      // 启用权限缓存
  cacheTTL: 60000,        // 缓存 1 分钟
  enableAudit: true,      // 启用审计日志
  defaultDeny: true,      // 默认拒绝策略
});
```

---

## 📖 核心概念

### 1. 权限 (Permission)

权限定义了对资源的操作类型：

```typescript
type PermissionType = 'read' | 'write' | 'delete' | 'execute' | 'admin' | 'custom';

interface Permission {
  id: string;           // 权限 ID，如 'perm:project:read'
  name: string;         // 权限名称
  type: PermissionType; // 权限类型
  description?: string; // 描述
  createdAt: number;    // 创建时间
}
```

### 2. 角色 (Role)

角色是权限的集合：

```typescript
interface Role {
  id: string;                    // 角色 ID，如 'role:developer'
  name: string;                  // 角色名称
  description?: string;          // 描述
  permissions: string[];         // 权限 ID 列表
  isSystem?: boolean;            // 是否系统内置角色
  createdAt: number;             // 创建时间
}
```

**系统内置角色:**
- `role:superadmin` - 超级管理员 (所有权限 `*`)
- `role:admin` - 管理员
- `role:user` - 普通用户
- `role:guest` - 访客

### 3. 资源 (Resource)

资源是需要保护的对象：

```typescript
type ResourceType = 'file' | 'database' | 'api' | 'service' | 'config' | 'system' | 'custom';

interface Resource {
  id: string;                    // 资源 ID
  name: string;                  // 资源名称
  type: ResourceType;            // 资源类型
  path: string;                  // 资源路径/标识
  parentId?: string;             // 父资源 ID (支持层级)
  metadata?: Record<string, any>; // 元数据
  createdAt: number;             // 创建时间
}
```

### 4. 用户 (User)

```typescript
interface User {
  id: string;                    // 用户 ID
  username: string;              // 用户名
  email?: string;                // 邮箱
  roles: string[];               // 角色 ID 列表
  directPermissions: string[];   // 直接权限 (覆盖角色)
  disabled: boolean;             // 是否禁用
  createdAt: number;             // 创建时间
}
```

### 5. 授权 (Authorization)

资源级授权，支持过期时间：

```typescript
interface Authorization {
  id: string;                    // 授权 ID
  subjectType: 'user' | 'role';  // 主体类型
  subjectId: string;             // 主体 ID
  resourceId: string;            // 资源 ID
  permissionIds: string[];       // 权限 ID 列表
  expiresAt?: number;            // 过期时间
  createdBy: string;             // 创建者 ID
  createdAt: number;             // 创建时间
}
```

---

## 💡 使用示例

### 示例 1: 基础 RBAC

```typescript
const manager = new PermissionManager();

// 1. 创建自定义权限
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

// 2. 创建自定义角色
manager.createRole({
  id: 'role:developer',
  name: 'Developer',
  description: '开发人员',
  permissions: ['perm:project:read', 'perm:project:write'],
  createdAt: Date.now(),
});

// 3. 创建用户并分配角色
manager.createUser({
  id: 'user:alice',
  username: 'alice',
  email: 'alice@example.com',
  roles: ['role:developer'],
  directPermissions: [],
  disabled: false,
  createdAt: Date.now(),
});

// 4. 检查权限
const result = manager.checkPermission('user:alice', 'resource:project1', 'read');
console.log('Can read?', result.allowed); // true
```

### 示例 2: 资源级授权

```typescript
// 1. 创建敏感资源
manager.createResource({
  id: 'resource:secret-doc',
  name: 'Secret Document',
  type: 'file',
  path: '/documents/secret.pdf',
  createdAt: Date.now(),
});

// 2. 创建普通用户 (只有基础读权限)
manager.createUser({
  id: 'user:bob',
  username: 'bob',
  roles: ['role:user'],
  directPermissions: [],
  disabled: false,
  createdAt: Date.now(),
});

// 3. 为特定用户授权特定资源
manager.createAuthorization({
  id: 'auth:1',
  subjectType: 'user',
  subjectId: 'user:bob',
  resourceId: 'resource:secret-doc',
  permissionIds: ['perm:read', 'perm:write'],
  createdBy: 'user:admin',
  createdAt: Date.now(),
});

// 4. 检查权限
const readResult = manager.checkPermission('user:bob', 'resource:secret-doc', 'read');
console.log('Read allowed:', readResult.allowed); // true

const deleteResult = manager.checkPermission('user:bob', 'resource:secret-doc', 'delete');
console.log('Delete allowed:', deleteResult.allowed); // false
```

### 示例 3: 临时授权 (带过期时间)

```typescript
// 创建 1 小时后过期的临时授权
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

// 权限检查会自动验证过期时间
const result = manager.checkPermission('user:contractor', 'resource:temp-project', 'read');
console.log('Temporary access:', result.allowed);
```

### 示例 4: 批量权限检查

```typescript
const checks = [
  { resourceId: 'resource:doc1', permissionType: 'read' as const },
  { resourceId: 'resource:doc1', permissionType: 'write' as const },
  { resourceId: 'resource:doc2', permissionType: 'read' as const },
];

const results = manager.checkPermissions('user:alice', checks);

for (const [key, result] of Object.entries(results)) {
  console.log(`${key}: ${result.allowed ? '✅' : '❌'}`);
}
```

### 示例 5: 获取用户权限和角色

```typescript
// 获取用户所有有效权限
const permissions = manager.getUserPermissions('user:alice');
console.log('User permissions:', permissions);

// 获取用户所有角色
const roles = manager.getUserRoles('user:alice');
console.log('User roles:', roles.map(r => r.name));
```

### 示例 6: 审计日志查询

```typescript
// 查询最近 100 条审计日志
const logs = manager.getAuditLogs(100);

logs.forEach(log => {
  console.log(`[${new Date(log.timestamp).toISOString()}] ${log.action} - ${log.result}`);
});

// 导出完整配置
const config = manager.exportConfig();
console.log('Exported config:', config);
```

### 示例 7: 导入/导出配置

```typescript
// 导出当前配置
const config = manager.exportConfig();
// 保存到文件或数据库
fs.writeFileSync('permissions.json', JSON.stringify(config, null, 2));

// 从文件加载配置
const loadedConfig = JSON.parse(fs.readFileSync('permissions.json', 'utf-8'));
manager.importConfig(loadedConfig);
```

---

## 🔧 API 参考

### 权限管理

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `createPermission(permission)` | 创建权限 | Permission | Permission |
| `getPermission(id)` | 获取权限 | string | Permission \| undefined |
| `deletePermission(id)` | 删除权限 | string | boolean |
| `listPermissions()` | 列出所有权限 | - | Permission[] |

### 角色管理

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `createRole(role)` | 创建角色 | Role | Role |
| `getRole(id)` | 获取角色 | string | Role \| undefined |
| `updateRole(id, updates)` | 更新角色 | string, Partial\<Role\> | Role \| undefined |
| `deleteRole(id)` | 删除角色 | string | boolean |
| `addPermissionToRole(roleId, permissionId)` | 添加权限到角色 | string, string | boolean |
| `removePermissionFromRole(roleId, permissionId)` | 从角色移除权限 | string, string | boolean |
| `listRoles()` | 列出所有角色 | - | Role[] |

### 资源管理

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `createResource(resource)` | 创建资源 | Resource | Resource |
| `getResource(id)` | 获取资源 | string | Resource \| undefined |
| `deleteResource(id)` | 删除资源 | string | boolean |
| `listResources(type?)` | 列出资源 | ResourceType? | Resource[] |

### 用户管理

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `createUser(user)` | 创建用户 | User | User |
| `getUser(id)` | 获取用户 | string | User \| undefined |
| `updateUser(id, updates)` | 更新用户 | string, Partial\<User\> | User \| undefined |
| `deleteUser(id)` | 删除用户 | string | boolean |
| `assignRoleToUser(userId, roleId)` | 分配角色给用户 | string, string | boolean |
| `removeRoleFromUser(userId, roleId)` | 从用户移除角色 | string, string | boolean |
| `listUsers()` | 列出所有用户 | - | User[] |

### 授权管理

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `createAuthorization(auth)` | 创建授权 | Authorization | Authorization |
| `revokeAuthorization(id)` | 撤销授权 | string | boolean |
| `getAuthorizations(subjectType, subjectId)` | 获取主体授权 | 'user'\|'role', string | Authorization[] |

### 权限检查

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `checkPermission(userId, resourceId, type)` | 检查单个权限 | string, string, PermissionType | PermissionCheckResult |
| `checkPermissions(userId, checks)` | 批量检查权限 | string, Check[] | Record<string, PermissionCheckResult> |
| `getUserPermissions(userId)` | 获取用户所有权限 | string | string[] |
| `getUserRoles(userId)` | 获取用户所有角色 | string | Role[] |

### 审计与配置

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getAuditLogs(limit, offset)` | 获取审计日志 | number, number | AuditLog[] |
| `exportConfig()` | 导出配置 | - | object |
| `importConfig(config)` | 导入配置 | Config | void |
| `clearCache()` | 清除所有缓存 | - | void |
| `clearExpiredCache()` | 清除过期缓存 | - | number |

---

## ⚙️ 配置选项

```typescript
interface PermissionManagerConfig {
  enableCache?: boolean;        // 默认：true - 启用权限缓存
  cacheTTL?: number;            // 默认：60000 - 缓存过期时间 (毫秒)
  enableAudit?: boolean;        // 默认：true - 启用审计日志
  enableInheritance?: boolean;  // 默认：true - 启用权限继承
  defaultDeny?: boolean;        // 默认：true - 默认拒绝策略
}
```

---

## 🎯 最佳实践

### 1. 权限命名规范

```typescript
// 推荐格式：perm:<资源>:<操作>
'perm:project:read'
'perm:project:write'
'perm:user:delete'

// 通配符权限
'*'  // 所有权限
'perm:project:*'  // 项目所有操作 (需自定义实现)
```

### 2. 角色设计原则

```typescript
// 遵循最小权限原则
role:intern     // 只读权限
role:developer  // 读写权限
role:manager    // 管理权限
role:admin      // 系统管理
```

### 3. 资源层级设计

```typescript
// 使用 parentId 建立层级关系
resource:company
  └─ resource:department
      └─ resource:team
          └─ resource:project
```

### 4. 临时授权

```typescript
// 为外包人员、临时项目设置过期时间
authorization.expiresAt = Date.now() + 7 * 24 * 3600000; // 7 天
```

### 5. 审计日志

```typescript
// 定期导出审计日志用于合规审查
const logs = manager.getAuditLogs(10000);
archiveToSecureStorage(logs);
```

---

## 🔒 安全注意事项

1. **默认拒绝** - 始终设置 `defaultDeny: true`
2. **最小权限** - 只授予完成工作所需的最小权限
3. **定期审计** - 定期检查授权记录和审计日志
4. **权限回收** - 员工离职/转岗时立即回收权限
5. **敏感操作** - 对 admin/delete 权限设置额外验证

---

## 📊 性能优化

### 缓存策略

```typescript
// 高并发场景启用缓存
const manager = new PermissionManager({
  enableCache: true,
  cacheTTL: 30000,  // 30 秒缓存
});

// 定期清理过期缓存
setInterval(() => {
  manager.clearExpiredCache();
}, 60000);
```

### 批量检查

```typescript
// 避免多次单独检查，使用批量检查
const checks = resources.map(r => ({
  resourceId: r.id,
  permissionType: 'read' as const,
}));

const results = manager.checkPermissions(userId, checks);
```

---

## 🧪 测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import PermissionManager from './permission-manager-skill';

describe('PermissionManager', () => {
  let manager: PermissionManager;

  beforeEach(() => {
    manager = new PermissionManager();
  });

  it('should create and check permissions', () => {
    manager.createPermission({
      id: 'perm:test:read',
      name: 'Test Read',
      type: 'read',
      createdAt: Date.now(),
    });

    manager.createRole({
      id: 'role:test',
      name: 'Test Role',
      permissions: ['perm:test:read'],
      createdAt: Date.now(),
    });

    manager.createUser({
      id: 'user:test',
      username: 'test',
      roles: ['role:test'],
      directPermissions: [],
      disabled: false,
      createdAt: Date.now(),
    });

    const result = manager.checkPermission('user:test', 'resource:test', 'read');
    expect(result.allowed).toBe(true);
  });

  it('should deny permission by default', () => {
    manager.createUser({
      id: 'user:new',
      username: 'new',
      roles: [],
      directPermissions: [],
      disabled: false,
      createdAt: Date.now(),
    });

    const result = manager.checkPermission('user:new', 'resource:test', 'read');
    expect(result.allowed).toBe(false);
  });
});
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✅ 初始版本
- ✅ RBAC 权限管理
- ✅ 资源授权
- ✅ 权限检查 (带缓存)
- ✅ 审计日志
- ✅ 配置导入/导出

---

**交付完成** ✅  
**文件:** `src/skills/permission-manager-skill.ts`  
**文档:** `src/skills/PERMISSION-MANAGER-README.md`
