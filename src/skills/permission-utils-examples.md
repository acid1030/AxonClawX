# Permission Utils - 使用示例

RBAC 权限控制工具完整使用指南

---

## 📦 快速开始

### 1. 基础权限检查

```typescript
import { PermissionManager, createPermissionId } from './permission-utils-skill';

// 创建权限管理器
const manager = new PermissionManager();

// 定义权限
manager.definePermission({
  id: 'document:read',
  resource: 'document',
  action: 'read',
  description: '读取文档'
});

manager.definePermission({
  id: 'document:write',
  resource: 'document',
  action: 'write',
  description: '编辑文档'
});

manager.definePermission({
  id: 'document:delete',
  resource: 'document',
  action: 'delete',
  description: '删除文档'
});

// 创建角色
manager.createRole({
  id: 'editor',
  name: '编辑者',
  description: '可以读写文档',
  permissions: ['document:read', 'document:write']
});

manager.createRole({
  id: 'admin',
  name: '管理员',
  description: '所有权限',
  permissions: ['document:read', 'document:write', 'document:delete']
});

// 分配角色给用户
manager.assignRoleToUser('user123', 'editor');
manager.assignRoleToUser('user456', 'admin');

// 检查权限
console.log(manager.checkPermission('user123', 'document:read'));  // true
console.log(manager.checkPermission('user123', 'document:write')); // true
console.log(manager.checkPermission('user123', 'document:delete')); // false

console.log(manager.checkPermission('user456', 'document:delete')); // true
```

---

## 🎭 角色管理

### 2. 角色继承

```typescript
// 创建基础角色
manager.createRole({
  id: 'viewer',
  name: '查看者',
  description: '只能查看',
  permissions: ['document:read']
});

// 创建继承角色
manager.createRole({
  id: 'contributor',
  name: '贡献者',
  description: '可以查看和编辑',
  permissions: ['document:write'],
  inherits: ['viewer'] // 继承 viewer 的权限
});

manager.assignRoleToUser('user789', 'contributor');

// 用户同时拥有 viewer 和 contributor 的权限
console.log(manager.checkPermission('user789', 'document:read'));  // true (继承)
console.log(manager.checkPermission('user789', 'document:write')); // true (直接)
```

### 3. 动态修改角色权限

```typescript
// 添加权限到角色
manager.addPermissionsToRole('editor', ['document:delete']);

// 从角色移除权限
manager.removePermissionsFromRole('editor', ['document:delete']);

// 更新角色信息
manager.updateRole('editor', {
  name: '高级编辑者',
  description: '可以读写和删除文档'
});
```

### 4. 用户多角色

```typescript
// 为用户分配多个角色
manager.assignRoleToUser('user123', 'editor');
manager.assignRoleToUser('user123', 'viewer');

// 或者一次性设置所有角色
manager.setUserRoles('user123', ['editor', 'viewer']);

// 获取用户的所有角色
const roles = manager.getUserRoles('user123');
console.log(roles.map(r => r.name)); // ['编辑者', '查看者']

// 获取用户的所有权限 (合并所有角色)
const permissions = manager.getUserPermissions('user123');
console.log(Array.from(permissions)); // ['document:read', 'document:write', ...]
```

---

## 🔐 直接权限

### 5. 用户直接权限

```typescript
// 为用户添加直接权限 (不通过角色)
manager.addDirectPermissionsToUser('user123', ['document:delete']);

// 直接权限会和角色权限合并
console.log(manager.checkPermission('user123', 'document:delete')); // true
```

---

## 📋 授权规则系统

### 6. 基于规则的授权

```typescript
import { createAuthorizationRule } from './permission-utils-skill';

// 创建授权规则
manager.addAuthorizationRule(createAuthorizationRule({
  id: 'rule-1',
  policy: 'allow',
  roleId: 'admin',
  resource: 'document',
  action: '*',
  priority: 100
}));

manager.addAuthorizationRule(createAuthorizationRule({
  id: 'rule-2',
  policy: 'deny',
  resource: 'document',
  action: 'delete',
  priority: 50
}));

manager.addAuthorizationRule(createAuthorizationRule({
  id: 'rule-3',
  policy: 'allow',
  userId: 'user123',
  resource: 'document',
  action: 'delete',
  priority: 75
}));

// 执行授权检查
const result1 = manager.authorize({
  userId: 'admin-user',
  resourceId: 'doc-1',
  resourceType: 'document',
  action: 'delete'
});
console.log(result1.allowed); // true (rule-1 允许 admin 所有操作)

const result2 = manager.authorize({
  userId: 'user123',
  resourceId: 'doc-1',
  resourceType: 'document',
  action: 'delete'
});
console.log(result2.allowed); // true (rule-3 允许 user123 删除)

const result3 = manager.authorize({
  userId: 'user456',
  resourceId: 'doc-1',
  resourceType: 'document',
  action: 'delete'
});
console.log(result3.allowed); // false (rule-2 默认拒绝删除)
```

### 7. 条件授权

```typescript
// 带条件的授权规则
manager.addAuthorizationRule({
  id: 'time-based-rule',
  policy: 'allow',
  roleId: 'editor',
  resource: 'document',
  action: 'write',
  priority: 60,
  condition: (context) => {
    // 只允许在工作时间 (9-18 点) 编辑
    const hour = new Date().getHours();
    return hour >= 9 && hour < 18;
  }
});

manager.addAuthorizationRule({
  id: 'owner-rule',
  policy: 'allow',
  resource: 'document',
  action: '*',
  priority: 80,
  condition: (context) => {
    // 只允许文档所有者操作
    return context.metadata?.ownerId === context.userId;
  }
});
```

### 8. 便捷授权检查

```typescript
// 检查是否可以访问资源
const canAccess = manager.canAccess(
  'user123',
  'document',
  'write',
  'doc-001'
);

console.log(canAccess.allowed); // true/false
console.log(canAccess.reason);  // 拒绝原因 (如果有)
```

---

## 🛠️ 高级功能

### 9. 批量操作

```typescript
// 批量定义权限
manager.definePermissions([
  { id: 'user:read', resource: 'user', action: 'read' },
  { id: 'user:write', resource: 'user', action: 'write' },
  { id: 'user:delete', resource: 'user', action: 'delete' },
  { id: 'system:admin', resource: 'system', action: 'admin' },
]);

// 获取所有权限
const allPermissions = manager.getAllPermissions();

// 获取所有角色
const allRoles = manager.getAllRoles();
```

### 10. 权限工具函数

```typescript
import { 
  createPermissionId, 
  parsePermissionId, 
  permissionMatches 
} from './permission-utils-skill';

// 创建权限 ID
const permId = createPermissionId('document', 'read');
console.log(permId); // 'document:read'

// 解析权限 ID
const parsed = parsePermissionId('document:read');
console.log(parsed); // { resource: 'document', action: 'read' }

// 检查权限匹配
console.log(permissionMatches('document:read', 'document', 'read')); // true
console.log(permissionMatches('*', 'document', 'read')); // true (通配符)
console.log(permissionMatches('document:*', 'document', 'read')); // false (需要精确匹配)
```

### 11. 配置导入导出

```typescript
// 导出配置
const config = manager.exportConfig();
console.log(JSON.stringify(config, null, 2));

// 保存配置到文件
import { writeFileSync } from 'fs';
writeFileSync('permissions-config.json', JSON.stringify(config, null, 2));

// 导入配置
import { readFileSync } from 'fs';
const savedConfig = JSON.parse(readFileSync('permissions-config.json', 'utf-8'));

const newManager = new PermissionManager();
newManager.importConfig(savedConfig);
```

### 12. 缓存配置

```typescript
// 启用缓存提高性能
const managerWithCache = new PermissionManager({
  enableCache: true,
  cacheTTL: 60000, // 1 分钟
  defaultDeny: true,
  enablePriority: true
});

// 缓存会自动在权限变更时清除
managerWithCache.assignRoleToUser('user123', 'editor'); // 清除 user123 的缓存
```

---

## 🎯 实际应用场景

### 场景 1: API 权限中间件

```typescript
import { PermissionManager } from './permission-utils-skill';
import { Request, Response, NextFunction } from 'express';

const manager = new PermissionManager();

// 权限检查中间件
function requirePermission(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const hasPermission = manager.checkPermission(userId, `${resource}:${action}`);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// 使用示例
app.get('/documents/:id', requirePermission('document', 'read'), (req, res) => {
  // 只有有 document:read 权限的用户能访问
});

app.post('/documents', requirePermission('document', 'write'), (req, res) => {
  // 只有有 document:write 权限的用户能访问
});
```

### 场景 2: 资源级权限控制

```typescript
// 文档所有者检查
function checkDocumentOwnership(userId: string, documentId: string): boolean {
  const result = manager.authorize({
    userId,
    resourceId: documentId,
    resourceType: 'document',
    action: 'write',
    metadata: {
      ownerId: getDocumentOwner(documentId) // 获取文档所有者
    }
  });
  
  return result.allowed;
}
```

### 场景 3: 角色管理界面

```typescript
// 获取用户所有角色和权限
function getUserPermissionDetails(userId: string) {
  const roles = manager.getUserRoles(userId);
  const permissions = manager.getUserPermissions(userId);
  
  return {
    userId,
    roles: roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions
    })),
    allPermissions: Array.from(permissions)
  };
}
```

---

## ⚠️ 注意事项

1. **内置角色**: `admin`, `user`, `guest` 是内置角色，不能删除或修改
2. **通配符权限**: `*` 表示所有权限，谨慎使用
3. **规则优先级**: 数字越大优先级越高，先匹配的规则生效
4. **缓存**: 启用缓存后，权限变更会自动清除相关缓存
5. **性能**: 大量权限检查时建议启用缓存

---

## 📊 API 参考

### PermissionManager

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `definePermission` | 定义权限 | permission: Permission | void |
| `definePermissions` | 批量定义权限 | permissions: Permission[] | void |
| `createRole` | 创建角色 | role: Omit<Role> | Role |
| `updateRole` | 更新角色 | roleId, updates | Role \| undefined |
| `deleteRole` | 删除角色 | roleId | boolean |
| `assignRoleToUser` | 分配角色给用户 | userId, roleId | void |
| `removeRoleFromUser` | 移除用户角色 | userId, roleId | void |
| `setUserRoles` | 设置用户角色列表 | userId, roleIds | void |
| `getUserRoles` | 获取用户角色 | userId | Role[] |
| `getUserPermissions` | 获取用户权限 | userId | Set<string> |
| `checkPermission` | 检查权限 | userId, permissionId | boolean |
| `checkAnyPermission` | 检查任一权限 | userId, permissionIds | boolean |
| `checkAllPermissions` | 检查所有权限 | userId, permissionIds | boolean |
| `addAuthorizationRule` | 添加授权规则 | rule: AuthorizationRule | void |
| `authorize` | 执行授权检查 | context: AuthorizationContext | AuthorizationResult |
| `canAccess` | 便捷授权检查 | userId, resourceType, action, resourceId | AuthorizationResult |

### 工具函数

| 函数 | 描述 |
|------|------|
| `createPermissionId(resource, action)` | 创建权限 ID |
| `parsePermissionId(permissionId)` | 解析权限 ID |
| `permissionMatches(permissionId, resource, action)` | 检查权限匹配 |
| `createAuthorizationRule(options)` | 创建授权规则 |

---

**版本:** 1.0.0  
**作者:** Axon  
**许可:** MIT
