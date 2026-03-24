/**
 * Patch Utils Skill - ACE (Agent Core Extension)
 * 
 * 对象补丁操作工具集
 * 
 * 功能:
 * 1. JSON Patch 生成 (RFC 6902 标准)
 * 2. 补丁应用
 * 3. 补丁验证
 * 
 * @module patch-utils-skill
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * JSON Patch 操作类型 (RFC 6902)
 */
export type PatchOperationType = 
  | 'add'      // 添加值
  | 'remove'   // 删除值
  | 'replace'  // 替换值
  | 'move'     // 移动值
  | 'copy'     // 复制值
  | 'test';    // 测试值

/**
 * JSON Patch 操作接口
 */
export interface PatchOperation {
  op: PatchOperationType;
  path: string;
  value?: any;
  from?: string; // 用于 move 和 copy 操作
}

/**
 * JSON Patch 数组
 */
export type JsonPatch = PatchOperation[];

/**
 * 补丁验证结果
 */
export interface PatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 补丁应用结果
 */
export interface PatchApplyResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  operationsApplied?: number;
}

// ============================================================================
// JSON Pointer 工具函数 (RFC 6901)
// ============================================================================

/**
 * 将 JSON Pointer 字符串解析为路径数组
 * 
 * @param pointer - JSON Pointer 字符串 (如: "/foo/bar/0")
 * @returns 路径数组 (如: ["foo", "bar", "0"])
 */
export function parsePointer(pointer: string): string[] {
  if (pointer === '') {
    return [];
  }
  
  if (!pointer.startsWith('/')) {
    throw new Error(`Invalid JSON Pointer: must start with '/' - got "${pointer}"`);
  }
  
  return pointer
    .slice(1)
    .split('/')
    .map(segment => 
      segment.replace(/~1/g, '/').replace(/~0/g, '~')
    );
}

/**
 * 将路径数组转换为 JSON Pointer 字符串
 * 
 * @param path - 路径数组 (如: ["foo", "bar", "0"])
 * @returns JSON Pointer 字符串 (如: "/foo/bar/0")
 */
export function toPointer(path: (string | number)[]): string {
  if (path.length === 0) {
    return '';
  }
  
  return '/' + path
    .map(segment => 
      String(segment)
        .replace(/~/g, '~0')
        .replace(/\//g, '~1')
    )
    .join('/');
}

/**
 * 通过 JSON Pointer 获取对象中的值
 * 
 * @param obj - 目标对象
 * @param pointer - JSON Pointer 字符串
 * @returns 目标值
 */
export function getValueByPointer<T = any>(obj: any, pointer: string): T {
  const path = parsePointer(pointer);
  let current: any = obj;
  
  for (const segment of path) {
    if (current === null || current === undefined) {
      throw new Error(`Cannot access property "${segment}" of ${current}`);
    }
    
    if (Array.isArray(current)) {
      if (segment === '-') {
        throw new Error('Cannot get value at "-" pointer (array append marker)');
      }
      const index = parseInt(segment, 10);
      if (isNaN(index) || index < 0 || index >= current.length) {
        throw new Error(`Array index out of bounds: ${segment}`);
      }
      current = current[index];
    } else if (typeof current === 'object') {
      current = current[segment];
    } else {
      throw new Error(`Cannot access property "${segment}" of primitive value`);
    }
  }
  
  return current as T;
}

/**
 * 通过 JSON Pointer 设置对象中的值
 * 
 * @param obj - 目标对象 (会被修改)
 * @param pointer - JSON Pointer 字符串
 * @param value - 要设置的值
 */
export function setValueByPointer(obj: any, pointer: string, value: any): void {
  const path = parsePointer(pointer);
  
  if (path.length === 0) {
    throw new Error('Cannot set value at root pointer');
  }
  
  let current: any = obj;
  
  // 遍历到父节点
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    
    if (current === null || current === undefined) {
      throw new Error(`Cannot access property "${segment}" of ${current}`);
    }
    
    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (isNaN(index) || index < 0) {
        throw new Error(`Invalid array index: ${segment}`);
      }
      if (index >= current.length) {
        throw new Error(`Array index out of bounds: ${segment}`);
      }
      current = current[index];
    } else if (typeof current === 'object') {
      if (!(segment in current)) {
        current[segment] = {};
      }
      current = current[segment];
    } else {
      throw new Error(`Cannot access property "${segment}" of primitive value`);
    }
  }
  
  // 设置最后一个 segment
  const lastSegment = path[path.length - 1];
  
  if (Array.isArray(current)) {
    if (lastSegment === '-') {
      current.push(value);
    } else {
      const index = parseInt(lastSegment, 10);
      if (isNaN(index) || index < 0) {
        throw new Error(`Invalid array index: ${lastSegment}`);
      }
      current[index] = value;
    }
  } else if (typeof current === 'object') {
    current[lastSegment] = value;
  } else {
    throw new Error(`Cannot set property on primitive value`);
  }
}

/**
 * 通过 JSON Pointer 删除对象中的值
 * 
 * @param obj - 目标对象 (会被修改)
 * @param pointer - JSON Pointer 字符串
 * @returns 被删除的值
 */
export function deleteValueByPointer(obj: any, pointer: string): any {
  const path = parsePointer(pointer);
  
  if (path.length === 0) {
    throw new Error('Cannot delete root pointer');
  }
  
  let current: any = obj;
  
  // 遍历到父节点
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    
    if (current === null || current === undefined) {
      throw new Error(`Cannot access property "${segment}" of ${current}`);
    }
    
    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (isNaN(index) || index < 0) {
        throw new Error(`Invalid array index: ${segment}`);
      }
      current = current[index];
    } else if (typeof current === 'object') {
      current = current[segment];
    } else {
      throw new Error(`Cannot access property "${segment}" of primitive value`);
    }
  }
  
  // 删除最后一个 segment
  const lastSegment = path[path.length - 1];
  
  if (Array.isArray(current)) {
    const index = parseInt(lastSegment, 10);
    if (isNaN(index) || index < 0 || index >= current.length) {
      throw new Error(`Array index out of bounds: ${lastSegment}`);
    }
    return current.splice(index, 1)[0];
  } else if (typeof current === 'object') {
    if (!(lastSegment in current)) {
      throw new Error(`Property "${lastSegment}" does not exist`);
    }
    const value = current[lastSegment];
    delete current[lastSegment];
    return value;
  } else {
    throw new Error(`Cannot delete property from primitive value`);
  }
}

// ============================================================================
// JSON Patch 生成
// ============================================================================

/**
 * 比较两个值并生成补丁操作
 * 
 * @param original - 原始对象
 * @param modified - 修改后的对象
 * @param path - 当前路径
 * @param patches - 补丁数组 (会被修改)
 */
function generatePatches(
  original: any,
  modified: any,
  path: string,
  patches: PatchOperation[]
): void {
  // 类型不同，直接替换
  if (typeof original !== typeof modified) {
    patches.push({ op: 'replace', path, value: modified });
    return;
  }
  
  // 都是 null 或 undefined
  if (original === null || original === undefined) {
    if (original !== modified) {
      patches.push({ op: 'replace', path, value: modified });
    }
    return;
  }
  
  // 都是数组
  if (Array.isArray(original) && Array.isArray(modified)) {
    const maxLength = Math.max(original.length, modified.length);
    
    for (let i = 0; i < maxLength; i++) {
      const itemPath = `${path}/${i}`;
      
      if (i >= original.length) {
        // 新添加的数组项
        patches.push({ op: 'add', path: itemPath, value: modified[i] });
      } else if (i >= modified.length) {
        // 被删除的数组项 (从后往前删，避免索引变化)
        patches.push({ op: 'remove', path: itemPath });
      } else {
        // 递归比较
        generatePatches(original[i], modified[i], itemPath, patches);
      }
    }
    return;
  }
  
  // 都是对象
  if (typeof original === 'object' && typeof modified === 'object') {
    const allKeysSet = new Set([
      ...Object.keys(original || {}),
      ...Object.keys(modified || {})
    ]);
    const allKeys = Array.from(allKeysSet);
    
    for (const key of allKeys) {
      const keyPath = `${path}/${key}`;
      
      if (!(key in original)) {
        // 新添加的属性
        patches.push({ op: 'add', path: keyPath, value: modified[key] });
      } else if (!(key in modified)) {
        // 被删除的属性
        patches.push({ op: 'remove', path: keyPath });
      } else {
        // 递归比较
        generatePatches(original[key], modified[key], keyPath, patches);
      }
    }
    return;
  }
  
  // 基本类型，值不同则替换
  if (original !== modified) {
    patches.push({ op: 'replace', path, value: modified });
  }
}

/**
 * 生成两个对象之间的 JSON Patch
 * 
 * @param original - 原始对象
 * @param modified - 修改后的对象
 * @returns JSON Patch 数组
 */
export function generatePatch(original: any, modified: any): JsonPatch {
  const patches: PatchOperation[] = [];
  generatePatches(original, modified, '', patches);
  return patches;
}

/**
 * 创建单个添加操作
 * 
 * @param path - JSON Pointer 路径
 * @param value - 要添加的值
 * @returns Patch 操作
 */
export function createAddOperation(path: string, value: any): PatchOperation {
  return { op: 'add', path, value };
}

/**
 * 创建单个删除操作
 * 
 * @param path - JSON Pointer 路径
 * @returns Patch 操作
 */
export function createRemoveOperation(path: string): PatchOperation {
  return { op: 'remove', path };
}

/**
 * 创建单个替换操作
 * 
 * @param path - JSON Pointer 路径
 * @param value - 新值
 * @returns Patch 操作
 */
export function createReplaceOperation(path: string, value: any): PatchOperation {
  return { op: 'replace', path, value };
}

/**
 * 创建单个移动操作
 * 
 * @param from - 源路径
 * @param path - 目标路径
 * @returns Patch 操作
 */
export function createMoveOperation(from: string, path: string): PatchOperation {
  return { op: 'move', from, path };
}

/**
 * 创建单个复制操作
 * 
 * @param from - 源路径
 * @param path - 目标路径
 * @returns Patch 操作
 */
export function createCopyOperation(from: string, path: string): PatchOperation {
  return { op: 'copy', from, path };
}

/**
 * 创建单个测试操作
 * 
 * @param path - JSON Pointer 路径
 * @param value - 期望值
 * @returns Patch 操作
 */
export function createTestOperation(path: string, value: any): PatchOperation {
  return { op: 'test', path, value };
}

// ============================================================================
// JSON Patch 应用
// ============================================================================

/**
 * 应用单个补丁操作
 * 
 * @param obj - 目标对象 (会被修改)
 * @param operation - 补丁操作
 */
function applyOperation(obj: any, operation: PatchOperation): void {
  const { op, path, value, from } = operation;
  
  switch (op) {
    case 'add':
      setValueByPointer(obj, path, value);
      break;
      
    case 'remove':
      deleteValueByPointer(obj, path);
      break;
      
    case 'replace':
      // 先验证路径存在
      getValueByPointer(obj, path);
      setValueByPointer(obj, path, value);
      break;
      
    case 'move':
      if (!from) {
        throw new Error('Move operation requires "from" property');
      }
      const movedValue = deleteValueByPointer(obj, from);
      setValueByPointer(obj, path, movedValue);
      break;
      
    case 'copy':
      if (!from) {
        throw new Error('Copy operation requires "from" property');
      }
      const copiedValue = getValueByPointer(obj, from);
      setValueByPointer(obj, path, JSON.parse(JSON.stringify(copiedValue)));
      break;
      
    case 'test':
      const actualValue = getValueByPointer(obj, path);
      if (JSON.stringify(actualValue) !== JSON.stringify(value)) {
        throw new Error(`Test failed at "${path}": expected ${JSON.stringify(value)}, got ${JSON.stringify(actualValue)}`);
      }
      break;
      
    default:
      throw new Error(`Unknown operation type: ${(op as any)}`);
  }
}

/**
 * 应用 JSON Patch 到对象
 * 
 * @param obj - 目标对象
 * @param patch - JSON Patch 数组
 * @param mutate - 是否修改原对象 (默认 false，返回新对象)
 * @returns 应用补丁后的结果
 */
export function applyPatch<T = any>(
  obj: any,
  patch: JsonPatch,
  mutate: boolean = false
): PatchApplyResult<T> {
  try {
    const target = mutate ? obj : JSON.parse(JSON.stringify(obj));
    
    for (let i = 0; i < patch.length; i++) {
      applyOperation(target, patch[i]);
    }
    
    return {
      success: true,
      result: target as T,
      operationsApplied: patch.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 应用补丁并返回新对象 (不可变版本)
 * 
 * @param obj - 目标对象
 * @param patch - JSON Patch 数组
 * @returns 新对象
 */
export function applyPatchImmutable<T = any>(obj: any, patch: JsonPatch): T {
  const result = applyPatch<T>(obj, patch, false);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.result!;
}

/**
 * 直接修改原对象应用补丁 (可变版本)
 * 
 * @param obj - 目标对象 (会被修改)
 * @param patch - JSON Patch 数组
 * @returns 操作数量
 */
export function applyPatchMutable(obj: any, patch: JsonPatch): number {
  const result = applyPatch(obj, patch, true);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.operationsApplied!;
}

// ============================================================================
// JSON Patch 验证
// ============================================================================

/**
 * 验证单个补丁操作
 * 
 * @param operation - 补丁操作
 * @param obj - 目标对象 (可选，用于验证路径是否存在)
 * @returns 验证结果
 */
function validateOperation(
  operation: PatchOperation,
  obj?: any
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 验证操作类型
  const validOps: PatchOperationType[] = ['add', 'remove', 'replace', 'move', 'copy', 'test'];
  if (!validOps.includes(operation.op)) {
    errors.push(`Invalid operation type: "${operation.op}"`);
    return { valid: false, errors, warnings };
  }
  
  // 验证路径
  if (!operation.path || typeof operation.path !== 'string') {
    errors.push('Missing or invalid "path" property');
  } else if (!operation.path.startsWith('/')) {
    errors.push(`Path must start with '/': "${operation.path}"`);
  }
  
  // 验证 value 字段
  if (['add', 'replace', 'test'].includes(operation.op)) {
    if (!('value' in operation)) {
      errors.push(`Operation "${operation.op}" requires "value" property`);
    }
  }
  
  // 验证 from 字段
  if (['move', 'copy'].includes(operation.op)) {
    if (!operation.from || typeof operation.from !== 'string') {
      errors.push(`Operation "${operation.op}" requires "from" property`);
    } else if (!operation.from.startsWith('/')) {
      errors.push(`"from" path must start with '/': "${operation.from}"`);
    }
  }
  
  // 如果有对象，验证路径是否存在
  if (obj && operation.path) {
    try {
      if (['remove', 'replace', 'test', 'move', 'copy'].includes(operation.op)) {
        getValueByPointer(obj, operation.path);
      }
      
      if (operation.from) {
        getValueByPointer(obj, operation.from);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证 JSON Patch
 * 
 * @param patch - JSON Patch 数组
 * @param obj - 目标对象 (可选，用于验证路径)
 * @returns 验证结果
 */
export function validatePatch(
  patch: JsonPatch,
  obj?: any
): PatchValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  
  if (!Array.isArray(patch)) {
    return {
      valid: false,
      errors: ['Patch must be an array'],
      warnings: []
    };
  }
  
  for (let i = 0; i < patch.length; i++) {
    const result = validateOperation(patch[i], obj);
    allErrors.push(...result.errors.map(e => `[${i}] ${e}`));
    allWarnings.push(...result.warnings.map(w => `[${i}] ${w}`));
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * 快速验证补丁 (不检查路径存在性)
 * 
 * @param patch - JSON Patch 数组
 * @returns 是否有效
 */
export function isValidPatch(patch: JsonPatch): boolean {
  return validatePatch(patch).valid;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 序列化补丁为 JSON 字符串
 * 
 * @param patch - JSON Patch 数组
 * @param space - 缩进空格数
 * @returns JSON 字符串
 */
export function serializePatch(patch: JsonPatch, space: number = 2): string {
  return JSON.stringify(patch, null, space);
}

/**
 * 从 JSON 字符串解析补丁
 * 
 * @param json - JSON 字符串
 * @returns JSON Patch 数组
 */
export function parsePatch(json: string): JsonPatch {
  try {
    const patch = JSON.parse(json);
    if (!Array.isArray(patch)) {
      throw new Error('Parsed value is not an array');
    }
    return patch;
  } catch (error) {
    throw new Error(`Failed to parse patch: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 合并多个补丁
 * 
 * @param patches - 多个补丁数组
 * @returns 合并后的补丁
 */
export function mergePatches(...patches: JsonPatch[]): JsonPatch {
  return patches.flat();
}

/**
 * 反转补丁 (尝试撤销操作)
 * 
 * @param patch - JSON Patch 数组
 * @param obj - 原始对象 (用于获取被删除的值)
 * @returns 反转后的补丁
 */
export function invertPatch(patch: JsonPatch, obj: any): JsonPatch {
  const inverted: JsonPatch = [];
  
  // 从后往前遍历，反转每个操作
  for (let i = patch.length - 1; i >= 0; i--) {
    const op = patch[i];
    
    switch (op.op) {
      case 'add':
        inverted.push({ op: 'remove', path: op.path });
        break;
        
      case 'remove':
        const removedValue = getValueByPointer(obj, op.path);
        inverted.push({ op: 'add', path: op.path, value: removedValue });
        break;
        
      case 'replace':
        const originalValue = getValueByPointer(obj, op.path);
        inverted.push({ op: 'replace', path: op.path, value: originalValue });
        break;
        
      case 'move':
        if (op.from) {
          inverted.push({ op: 'move', from: op.path, path: op.from });
        }
        break;
        
      case 'copy':
        inverted.push({ op: 'remove', path: op.path });
        break;
        
      case 'test':
        inverted.push(op); // test 操作不需要反转
        break;
    }
  }
  
  return inverted;
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例代码
 * 
 * @remarks
 * 以下示例展示了 patch-utils-skill 的主要用法
 */
export const examples = {
  /**
   * 示例 1: 生成补丁
   */
  generatePatch: () => {
    const original = {
      name: 'Alice',
      age: 25,
      hobbies: ['reading', 'coding']
    };
    
    const modified = {
      name: 'Alice',
      age: 26,
      hobbies: ['reading', 'coding', 'gaming'],
      city: 'Beijing'
    };
    
    const patch = generatePatch(original, modified);
    // 输出:
    // [
    //   { op: 'replace', path: '/age', value: 26 },
    //   { op: 'add', path: '/hobbies/2', value: 'gaming' },
    //   { op: 'add', path: '/city', value: 'Beijing' }
    // ]
    
    return patch;
  },
  
  /**
   * 示例 2: 应用补丁
   */
  applyPatch: () => {
    const obj = { name: 'Alice', age: 25 };
    
    const patch: JsonPatch = [
      { op: 'replace', path: '/age', value: 26 },
      { op: 'add', path: '/city', value: 'Beijing' }
    ];
    
    const result = applyPatch(obj, patch);
    // result.success === true
    // result.result === { name: 'Alice', age: 26, city: 'Beijing' }
    
    return result;
  },
  
  /**
   * 示例 3: 验证补丁
   */
  validatePatch: () => {
    const validPatch: JsonPatch = [
      { op: 'add', path: '/name', value: 'Alice' }
    ];
    
    const invalidPatch: JsonPatch = [
      { op: 'invalid', path: '/name' } as any
    ];
    
    const validResult = validatePatch(validPatch);
    // validResult.valid === true
    
    const invalidResult = validatePatch(invalidPatch);
    // invalidResult.valid === false
    // invalidResult.errors[0] 包含错误信息
    
    return { validResult, invalidResult };
  },
  
  /**
   * 示例 4: 创建操作
   */
  createOperations: () => {
    const patch: JsonPatch = [
      createAddOperation('/name', 'Alice'),
      createReplaceOperation('/age', 26),
      createRemoveOperation('/temp'),
      createTestOperation('/name', 'Alice')
    ];
    
    return patch;
  },
  
  /**
   * 示例 5: 复杂对象补丁
   */
  complexPatch: () => {
    const config = {
      server: {
        host: 'localhost',
        port: 3000,
        ssl: false
      },
      features: ['auth', 'logging']
    };
    
    const patch: JsonPatch = [
      { op: 'replace', path: '/server/port', value: 8080 },
      { op: 'replace', path: '/server/ssl', value: true },
      { op: 'add', path: '/features/2', value: 'metrics' }
    ];
    
    const result = applyPatchImmutable(config, patch);
    // result.server.port === 8080
    // result.server.ssl === true
    // result.features === ['auth', 'logging', 'metrics']
    
    return result;
  }
};

// ============================================================================
// 导出
// ============================================================================

export default {
  // JSON Pointer
  parsePointer,
  toPointer,
  getValueByPointer,
  setValueByPointer,
  deleteValueByPointer,
  
  // Patch 生成
  generatePatch,
  createAddOperation,
  createRemoveOperation,
  createReplaceOperation,
  createMoveOperation,
  createCopyOperation,
  createTestOperation,
  
  // Patch 应用
  applyPatch,
  applyPatchImmutable,
  applyPatchMutable,
  
  // Patch 验证
  validatePatch,
  isValidPatch,
  
  // 工具函数
  serializePatch,
  parsePatch,
  mergePatches,
  invertPatch,
  
  // 示例
  examples
};
