/**
 * 示例文件 - 用户模块
 * 用于演示 test-generator 的使用
 */

export interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  age?: number;
}

/**
 * 添加用户
 * @param name 用户名
 * @param email 邮箱
 * @param age 年龄 (可选)
 * @returns 创建的用户对象
 */
export async function addUser(
  name: string,
  email: string,
  age?: number
): Promise<User> {
  if (!name || name.trim().length === 0) {
    throw new Error('Name is required');
  }

  if (!email || !email.includes('@')) {
    throw new Error('Valid email is required');
  }

  if (age !== undefined && (age < 0 || age > 150)) {
    throw new Error('Invalid age');
  }

  return {
    id: Date.now(),
    name: name.trim(),
    email: email.toLowerCase(),
    age
  };
}

/**
 * 验证用户邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 计算用户年龄组
 * @param age 年龄
 * @returns 年龄组标签
 */
export function getAgeGroup(age: number): string {
  if (age < 0) {
    throw new Error('Age cannot be negative');
  }
  
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  if (age < 30) return 'young';
  if (age < 50) return 'adult';
  return 'senior';
}

/**
 * 用户服务类
 */
export class UserService {
  private users: Map<number, User> = new Map();
  private nextId: number = 1;

  /**
   * 创建用户
   */
  async createUser(dto: CreateUserDTO): Promise<User> {
    const user: User = {
      id: this.nextId++,
      name: dto.name,
      email: dto.email,
      age: dto.age
    };

    this.users.set(user.id, user);
    return user;
  }

  /**
   * 根据 ID 获取用户
   */
  getUserById(id: number): User | undefined {
    return this.users.get(id);
  }

  /**
   * 根据邮箱获取用户
   */
  getUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email === email.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  /**
   * 删除用户
   */
  deleteUser(id: number): boolean {
    return this.users.delete(id);
  }

  /**
   * 获取所有用户
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * 更新用户信息
   */
  updateUser(id: number, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  /**
   * 用户数量统计
   */
  getUserCount(): number {
    return this.users.size;
  }
}

/**
 * 用户验证器类
 */
export class UserValidator {
  /**
   * 验证用户名
   */
  static validateName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Name is required' };
    }

    if (name.length < 2 || name.length > 50) {
      return { valid: false, error: 'Name must be between 2 and 50 characters' };
    }

    return { valid: true };
  }

  /**
   * 验证邮箱
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email) {
      return { valid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * 验证年龄
   */
  static validateAge(age: number | undefined): { valid: boolean; error?: string } {
    if (age === undefined) {
      return { valid: true };
    }

    if (age < 0 || age > 150) {
      return { valid: false, error: 'Age must be between 0 and 150' };
    }

    return { valid: true };
  }

  /**
   * 验证完整的用户数据
   */
  static validateUser(dto: CreateUserDTO): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const nameResult = this.validateName(dto.name);
    if (!nameResult.valid) {
      errors.push(nameResult.error!);
    }

    const emailResult = this.validateEmail(dto.email);
    if (!emailResult.valid) {
      errors.push(emailResult.error!);
    }

    const ageResult = this.validateAge(dto.age);
    if (!ageResult.valid) {
      errors.push(ageResult.error!);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
