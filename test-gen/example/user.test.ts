/**
 * 示例文件生成的测试
 * 由 test-generator 自动生成
 */

import { 
  addUser, 
  validateEmail, 
  getAgeGroup, 
  UserService, 
  UserValidator 
} from './user';

// ============ 函数测试 ============

describe('addUser', () => {
  it('should execute successfully', async () => {
    const result = await addUser('test_name', 'test_email', 42);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe('test_name');
    expect(result.email).toBe('test_email');
    expect(result.age).toBe(42);
  });

  it('should handle age being undefined', async () => {
    const result = await addUser('test_name', 'test_email', undefined);
    expect(result).toBeDefined();
    expect(result.age).toBeUndefined();
  });

  it('should throw error when name is empty', async () => {
    await expect(addUser('', 'test@example.com')).rejects.toThrow('Name is required');
  });

  it('should throw error when name is whitespace only', async () => {
    await expect(addUser('   ', 'test@example.com')).rejects.toThrow('Name is required');
  });

  it('should throw error when email is invalid', async () => {
    await expect(addUser('John', 'invalid-email')).rejects.toThrow('Valid email is required');
  });

  it('should throw error when email is empty', async () => {
    await expect(addUser('John', '')).rejects.toThrow('Valid email is required');
  });

  it('should throw error when age is negative', async () => {
    await expect(addUser('John', 'john@example.com', -5)).rejects.toThrow('Invalid age');
  });

  it('should throw error when age is over 150', async () => {
    await expect(addUser('John', 'john@example.com', 200)).rejects.toThrow('Invalid age');
  });

  it('should throw error when name is undefined', async () => {
    await expect(addUser(undefined as any, 'test@example.com')).rejects.toThrow();
  });

  it('should throw error when email is undefined', async () => {
    await expect(addUser('John', undefined as any)).rejects.toThrow();
  });

  it('should trim name and lowercase email', async () => {
    const result = await addUser('  John Doe  ', 'JOHN@EXAMPLE.COM');
    expect(result.name).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
  });
});

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.org')).toBe(true);
    expect(validateEmail('user+tag@example.co.uk')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('invalid@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validateEmail('test@example')).toBe(false);
    expect(validateEmail('test@.com')).toBe(false);
    expect(validateEmail(' ')).toBe(false);
  });
});

describe('getAgeGroup', () => {
  it('should return correct age group for child', () => {
    expect(getAgeGroup(5)).toBe('child');
    expect(getAgeGroup(12)).toBe('child');
  });

  it('should return correct age group for teen', () => {
    expect(getAgeGroup(13)).toBe('teen');
    expect(getAgeGroup(17)).toBe('teen');
  });

  it('should return correct age group for young', () => {
    expect(getAgeGroup(18)).toBe('young');
    expect(getAgeGroup(29)).toBe('young');
  });

  it('should return correct age group for adult', () => {
    expect(getAgeGroup(30)).toBe('adult');
    expect(getAgeGroup(49)).toBe('adult');
  });

  it('should return correct age group for senior', () => {
    expect(getAgeGroup(50)).toBe('senior');
    expect(getAgeGroup(100)).toBe('senior');
  });

  it('should throw error when age is negative', () => {
    expect(() => getAgeGroup(-1)).toThrow('Age cannot be negative');
  });

  it('should handle boundary values', () => {
    expect(getAgeGroup(0)).toBe('child');
    expect(getAgeGroup(13)).toBe('teen');
    expect(getAgeGroup(18)).toBe('young');
    expect(getAgeGroup(30)).toBe('adult');
    expect(getAgeGroup(50)).toBe('senior');
  });
});

// ============ 类测试 ============

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(service).toBeDefined();
      expect(service.getUserCount()).toBe(0);
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const dto = { name: 'John', email: 'john@example.com', age: 30 };
      const user = await service.createUser(dto);
      
      expect(user).toBeDefined();
      expect(user.id).toBe(1);
      expect(user.name).toBe('John');
      expect(user.email).toBe('john@example.com');
      expect(user.age).toBe(30);
    });

    it('should increment user id for multiple users', async () => {
      await service.createUser({ name: 'User1', email: 'user1@example.com' });
      await service.createUser({ name: 'User2', email: 'user2@example.com' });
      await service.createUser({ name: 'User3', email: 'user3@example.com' });
      
      expect(service.getUserCount()).toBe(3);
    });

    it('should create user without age', async () => {
      const user = await service.createUser({ name: 'Jane', email: 'jane@example.com' });
      expect(user.age).toBeUndefined();
    });
  });

  describe('getUserById', () => {
    it('should return user when exists', async () => {
      const created = await service.createUser({ name: 'John', email: 'john@example.com' });
      const found = service.getUserById(created.id);
      
      expect(found).toBeDefined();
      expect(found?.name).toBe('John');
    });

    it('should return undefined when user not found', () => {
      const result = service.getUserById(999);
      expect(result).toBeUndefined();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when exists', async () => {
      await service.createUser({ name: 'John', email: 'john@example.com' });
      const found = service.getUserByEmail('john@example.com');
      
      expect(found).toBeDefined();
      expect(found?.name).toBe('John');
    });

    it('should be case-insensitive', async () => {
      await service.createUser({ name: 'John', email: 'john@example.com' });
      const found = service.getUserByEmail('JOHN@EXAMPLE.COM');
      
      expect(found).toBeDefined();
    });

    it('should return undefined when email not found', () => {
      const result = service.getUserByEmail('notfound@example.com');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const created = await service.createUser({ name: 'John', email: 'john@example.com' });
      const deleted = service.deleteUser(created.id);
      
      expect(deleted).toBe(true);
      expect(service.getUserCount()).toBe(0);
    });

    it('should return false when user not found', () => {
      const result = service.deleteUser(999);
      expect(result).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should return empty array when no users', () => {
      const users = service.getAllUsers();
      expect(users).toEqual([]);
    });

    it('should return all users', async () => {
      await service.createUser({ name: 'User1', email: 'user1@example.com' });
      await service.createUser({ name: 'User2', email: 'user2@example.com' });
      
      const users = service.getAllUsers();
      expect(users.length).toBe(2);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const created = await service.createUser({ name: 'John', email: 'john@example.com', age: 30 });
      const updated = service.updateUser(created.id, { name: 'Jane', age: 25 });
      
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Jane');
      expect(updated?.age).toBe(25);
      expect(updated?.email).toBe('john@example.com'); // unchanged
    });

    it('should return undefined when user not found', () => {
      const result = service.updateUser(999, { name: 'Jane' });
      expect(result).toBeUndefined();
    });

    it('should partially update user', async () => {
      const created = await service.createUser({ name: 'John', email: 'john@example.com', age: 30 });
      const updated = service.updateUser(created.id, { age: 31 });
      
      expect(updated?.age).toBe(31);
      expect(updated?.name).toBe('John'); // unchanged
    });
  });

  describe('getUserCount', () => {
    it('should return 0 initially', () => {
      expect(service.getUserCount()).toBe(0);
    });

    it('should return correct count after adding users', async () => {
      await service.createUser({ name: 'User1', email: 'user1@example.com' });
      expect(service.getUserCount()).toBe(1);
      
      await service.createUser({ name: 'User2', email: 'user2@example.com' });
      expect(service.getUserCount()).toBe(2);
    });
  });
});

describe('UserValidator', () => {
  describe('validateName', () => {
    it('should return valid for normal name', () => {
      const result = UserValidator.validateName('John Doe');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty name', () => {
      const result = UserValidator.validateName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should return invalid for whitespace only', () => {
      const result = UserValidator.validateName('   ');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for name too short', () => {
      const result = UserValidator.validateName('J');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Name must be between 2 and 50 characters');
    });

    it('should return invalid for name too long', () => {
      const longName = 'a'.repeat(51);
      const result = UserValidator.validateName(longName);
      expect(result.valid).toBe(false);
    });

    it('should accept name with exactly 2 characters', () => {
      const result = UserValidator.validateName('Jo');
      expect(result.valid).toBe(true);
    });

    it('should accept name with exactly 50 characters', () => {
      const name = 'a'.repeat(50);
      const result = UserValidator.validateName(name);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should return valid for normal email', () => {
      const result = UserValidator.validateEmail('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty email', () => {
      const result = UserValidator.validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should return invalid for invalid format', () => {
      const result = UserValidator.validateEmail('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should return invalid for missing @', () => {
      const result = UserValidator.validateEmail('testexample.com');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for missing domain', () => {
      const result = UserValidator.validateEmail('test@');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAge', () => {
    it('should return valid for normal age', () => {
      const result = UserValidator.validateAge(30);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined age', () => {
      const result = UserValidator.validateAge(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for age 0', () => {
      const result = UserValidator.validateAge(0);
      expect(result.valid).toBe(true);
    });

    it('should return valid for age 150', () => {
      const result = UserValidator.validateAge(150);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for negative age', () => {
      const result = UserValidator.validateAge(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Age must be between 0 and 150');
    });

    it('should return invalid for age over 150', () => {
      const result = UserValidator.validateAge(151);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUser', () => {
    it('should return valid for complete user data', () => {
      const result = UserValidator.validateUser({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return valid without age', () => {
      const result = UserValidator.validateUser({
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(result.valid).toBe(true);
    });

    it('should return invalid with multiple errors', () => {
      const result = UserValidator.validateUser({
        name: '',
        email: 'invalid',
        age: -5
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    it('should collect all validation errors', () => {
      const result = UserValidator.validateUser({
        name: 'J',
        email: '',
        age: 200
      });
      expect(result.errors).toContain('Name must be between 2 and 50 characters');
      expect(result.errors).toContain('Email is required');
      expect(result.errors).toContain('Age must be between 0 and 150');
    });
  });
});
