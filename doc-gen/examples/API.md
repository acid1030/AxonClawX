# 示例 API 文档

## 目录

- [User](#user)
- [User.id](#user-id)
- [User.name](#user-name)
- [User.email](#user-email)
- [User.createdAt](#user-createdat)
- [addUser](#adduser)
- [findUserById](#finduserbyid)
- [UserService](#userservice)
- [UserService.users](#userservice-users)
- [UserService.listAll](#userservice-listall)
- [UserService.create](#userservice-create)
- [UserService.update](#userservice-update)
- [UserService.delete](#userservice-delete)
- [generateId](#generateid)

---

## interface User

用户接口定义
描述系统中的用户数据结构

---

## id: string

用户唯一标识

---

## name: string

用户名

---

## email: string

用户邮箱

---

## createdAt: Date

创建时间

---

## async addUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>

添加新用户到系统

**参数**:
- `user` - `Omit<User, 'id' | 'createdAt'>` — 用户对象，包含 name 和 email

**返回**:
- `Promise<User>` — 新创建的用户

**示例**:

```typescript
const user = await addUser({ name: 'John', email: 'john@example.com' });
console.log(user.id); // 自动生成的 ID
```

---

## async findUserById(id: string): Promise<User | undefined>

根据 ID 查找用户

**参数**:
- `id` - `string` — 用户 ID

**返回**:
- `Promise<User | undefined>` — 用户对象，未找到返回 undefined

**示例**:

```typescript
const user = await findUserById('user-123');
if (user) {
  console.log(`Found: ${user.name}`);
}
```

---

## class UserService

用户服务类
提供用户相关的 CRUD 操作

**示例**:

```typescript
const service = new UserService();
const users = await service.listAll();
```

---

## users: Map<string, User>

---

## listAll(): User[]

列出所有用户

**返回**:
- `User[]` — 用户数组

---

## create(userData: Omit<User, 'id' | 'createdAt'>): User

创建用户

**参数**:
- `userData` - `Omit<User, 'id' | 'createdAt'>` — 用户数据

**返回**:
- `User` — 创建的用户

---

## update(id: string, updates: Partial<User>): User | undefined

更新用户信息

**参数**:
- `id` - `string` — 用户 ID
- `updates` - `Partial<User>` — 要更新的字段

**返回**:
- `User | undefined` — 更新后的用户，未找到返回 undefined

---

## delete(id: string): boolean

删除用户

**参数**:
- `id` - `string` — 用户 ID

**返回**:
- `boolean` — 是否删除成功

---

## generateId(): string

生成唯一 ID

**返回**:
- `string` — 随机 ID 字符串

---

