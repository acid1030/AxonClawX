/**
 * 用户接口定义
 * 描述系统中的用户数据结构
 */
export interface User {
  /** 用户唯一标识 */
  id: string;
  
  /** 用户名 */
  name: string;
  
  /** 用户邮箱 */
  email: string;
  
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 添加新用户到系统
 * 
 * @param user - 用户对象，包含 name 和 email
 * @returns 新创建的用户
 * 
 * @example
 * ```typescript
 * const user = await addUser({ name: 'John', email: 'john@example.com' });
 * console.log(user.id); // 自动生成的 ID
 * ```
 */
export async function addUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const newUser: User = {
    ...user,
    id: generateId(),
    createdAt: new Date(),
  };
  return newUser;
}

/**
 * 根据 ID 查找用户
 * 
 * @param id - 用户 ID
 * @returns 用户对象，未找到返回 undefined
 * 
 * @example
 * ```typescript
 * const user = await findUserById('user-123');
 * if (user) {
 *   console.log(`Found: ${user.name}`);
 * }
 * ```
 */
export async function findUserById(id: string): Promise<User | undefined> {
  // 实现...
  return undefined;
}

/**
 * 用户服务类
 * 提供用户相关的 CRUD 操作
 * 
 * @example
 * ```typescript
 * const service = new UserService();
 * const users = await service.listAll();
 * ```
 */
export class UserService {
  private users: Map<string, User> = new Map();

  /**
   * 列出所有用户
   * @returns 用户数组
   */
  listAll(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * 创建用户
   * @param userData - 用户数据
   * @returns 创建的用户
   */
  create(userData: Omit<User, 'id' | 'createdAt'>): User {
    const user: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  /**
   * 更新用户信息
   * @param id - 用户 ID
   * @param updates - 要更新的字段
   * @returns 更新后的用户，未找到返回 undefined
   */
  update(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  /**
   * 删除用户
   * @param id - 用户 ID
   * @returns 是否删除成功
   */
  delete(id: string): boolean {
    return this.users.delete(id);
  }
}

/**
 * 生成唯一 ID
 * @returns 随机 ID 字符串
 */
function generateId(): string {
  return `user-${Math.random().toString(36).substr(2, 9)}`;
}
