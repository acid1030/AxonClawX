/**
 * JSON Utils Skill - ACE JSON 高级处理工具
 * 
 * 功能:
 * 1. JSON Schema 验证
 * 2. JSON Patch (RFC 6902)
 * 3. JSON 流式解析
 * 
 * @author Axon
 * @created 2026-03-13
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  [key: string]: any;
}

export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  expected?: any;
  actual?: any;
}

export interface StreamParserOptions {
  chunkSize?: number;
  onObject?: (obj: any) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// JSON Schema 验证器
// ============================================================================

export class JsonSchemaValidator {
  /**
   * 验证 JSON 数据是否符合 Schema
   * 
   * @param data - 待验证的数据
   * @param schema - JSON Schema
   * @returns 验证结果
   * 
   * @example
   * const schema = {
   *   type: 'object',
   *   properties: {
   *     name: { type: 'string', minLength: 1 },
   *     age: { type: 'number', minimum: 0 }
   *   },
   *   required: ['name']
   * };
   * const result = JsonSchemaValidator.validate({ name: 'Axon', age: 25 }, schema);
   * console.log(result.valid); // true
   */
  static validate(data: any, schema: JsonSchema, path: string = ''): ValidationResult {
    const errors: ValidationError[] = [];

    // 类型检查
    if (schema.type) {
      const actualType = this.getType(data);
      if (actualType !== schema.type) {
        errors.push({
          path: path || '/',
          message: `类型不匹配`,
          expected: schema.type,
          actual: actualType
        });
        return { valid: false, errors };
      }
    }

    // 枚举检查
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        path: path || '/',
        message: `值不在枚举范围内`,
        expected: schema.enum,
        actual: data
      });
    }

    // 字符串约束
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          path: path || '/',
          message: `字符串长度小于最小值`,
          expected: `>= ${schema.minLength}`,
          actual: data.length
        });
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          path: path || '/',
          message: `字符串长度大于最大值`,
          expected: `<= ${schema.maxLength}`,
          actual: data.length
        });
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
        errors.push({
          path: path || '/',
          message: `字符串不匹配模式`,
          expected: schema.pattern,
          actual: data
        });
      }
    }

    // 数字约束
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          path: path || '/',
          message: `数值小于最小值`,
          expected: `>= ${schema.minimum}`,
          actual: data
        });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          path: path || '/',
          message: `数值大于最大值`,
          expected: `<= ${schema.maximum}`,
          actual: data
        });
      }
    }

    // 对象属性验证
    if (schema.type === 'object' && typeof data === 'object' && data !== null) {
      // 检查必填字段
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in data)) {
            errors.push({
              path: path ? `${path}/${field}` : `/${field}`,
              message: `缺少必填字段`,
              expected: 'present',
              actual: 'missing'
            });
          }
        }
      }

      // 验证每个属性
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in data) {
            const propPath = path ? `${path}/${key}` : `/${key}`;
            const propResult = this.validate(data[key], propSchema, propPath);
            errors.push(...propResult.errors);
          }
        }
      }
    }

    // 数组项验证
    if (schema.type === 'array' && Array.isArray(data) && schema.items) {
      data.forEach((item, index) => {
        const itemPath = path ? `${path}/${index}` : `/${index}`;
        const itemResult = this.validate(item, schema.items!, itemPath);
        errors.push(...itemResult.errors);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static getType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

// ============================================================================
// JSON Patch (RFC 6902)
// ============================================================================

export class JsonPatch {
  /**
   * 应用 JSON Patch 操作到目标文档
   * 
   * @param doc - 原始 JSON 文档
   * @param patch - Patch 操作数组
   * @returns 修改后的文档
   * 
   * @example
   * const doc = { name: 'Axon', version: 1 };
   * const patch = [
   *   { op: 'replace', path: '/version', value: 2 },
   *   { op: 'add', path: '/status', value: 'active' }
   * ];
   * const result = JsonPatch.apply(doc, patch);
   * // { name: 'Axon', version: 2, status: 'active' }
   */
  static apply(doc: any, patch: JsonPatchOperation[]): any {
    const result = JSON.parse(JSON.stringify(doc)); // 深拷贝

    for (const operation of patch) {
      this.applyOperation(result, operation);
    }

    return result;
  }

  /**
   * 生成两个 JSON 文档之间的 Patch
   * 
   * @param original - 原始文档
   * @param modified - 修改后的文档
   * @returns Patch 操作数组
   * 
   * @example
   * const original = { name: 'Axon', version: 1 };
   * const modified = { name: 'Axon', version: 2, status: 'active' };
   * const patch = JsonPatch.generate(original, modified);
   */
  static generate(original: any, modified: any): JsonPatchOperation[] {
    const patch: JsonPatchOperation[] = [];
    this.generatePatch(original, modified, '', patch);
    return patch;
  }

  private static applyOperation(doc: any, operation: JsonPatchOperation): void {
    const { op, path, value, from } = operation;
    const pointers = this.parsePath(path);

    switch (op) {
      case 'add':
        this.add(doc, pointers, value);
        break;
      case 'remove':
        this.remove(doc, pointers);
        break;
      case 'replace':
        this.replace(doc, pointers, value);
        break;
      case 'move':
        if (!from) throw new Error('move 操作需要 from 字段');
        this.move(doc, this.parsePath(from), pointers);
        break;
      case 'copy':
        if (!from) throw new Error('copy 操作需要 from 字段');
        this.copy(doc, this.parsePath(from), pointers);
        break;
      case 'test':
        this.test(doc, pointers, value);
        break;
      default:
        throw new Error(`未知的操作类型：${op}`);
    }
  }

  private static add(doc: any, pointers: string[], value: any): void {
    if (pointers.length === 0) {
      throw new Error('不能替换根节点');
    }

    const parent = this.getParent(doc, pointers.slice(0, -1));
    const key = pointers[pointers.length - 1];

    if (Array.isArray(parent)) {
      if (key === '-') {
        parent.push(value);
      } else {
        const index = parseInt(key, 10);
        parent.splice(index, 0, value);
      }
    } else {
      parent[key] = value;
    }
  }

  private static remove(doc: any, pointers: string[]): void {
    const parent = this.getParent(doc, pointers.slice(0, -1));
    const key = pointers[pointers.length - 1];

    if (Array.isArray(parent)) {
      const index = parseInt(key, 10);
      parent.splice(index, 1);
    } else {
      delete parent[key];
    }
  }

  private static replace(doc: any, pointers: string[], value: any): void {
    const parent = this.getParent(doc, pointers.slice(0, -1));
    const key = pointers[pointers.length - 1];
    parent[key] = value;
  }

  private static move(doc: any, fromPointers: string[], toPointers: string[]): void {
    const value = this.get(doc, fromPointers);
    this.remove(doc, fromPointers);
    this.add(doc, toPointers, value);
  }

  private static copy(doc: any, fromPointers: string[], toPointers: string[]): void {
    const value = JSON.parse(JSON.stringify(this.get(doc, fromPointers)));
    this.add(doc, toPointers, value);
  }

  private static test(doc: any, pointers: string[], value: any): void {
    const actual = this.get(doc, pointers);
    if (JSON.stringify(actual) !== JSON.stringify(value)) {
      throw new Error(`test 失败：期望 ${JSON.stringify(value)}, 实际 ${JSON.stringify(actual)}`);
    }
  }

  private static get(doc: any, pointers: string[]): any {
    let current = doc;
    for (const pointer of pointers) {
      if (current === null || current === undefined) {
        throw new Error(`路径不存在：${pointers.join('/')}`);
      }
      current = Array.isArray(current) ? current[parseInt(pointer, 10)] : current[pointer];
    }
    return current;
  }

  private static getParent(doc: any, pointers: string[]): any {
    if (pointers.length === 0) return doc;
    return this.get(doc, pointers);
  }

  private static parsePath(path: string): string[] {
    if (path === '') return [];
    if (!path.startsWith('/')) throw new Error(`无效的路径：${path}`);
    return path.slice(1).split('/').map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  private static generatePatch(original: any, modified: any, path: string, patch: JsonPatchOperation[]): void {
    if (JSON.stringify(original) === JSON.stringify(modified)) return;

    if (typeof original !== typeof modified || 
        Array.isArray(original) !== Array.isArray(modified)) {
      patch.push({ op: 'replace', path: path || '/', value: modified });
      return;
    }

    if (typeof original === 'object' && original !== null) {
      const allKeys = new Set([...Object.keys(original || {}), ...Object.keys(modified || {})]);
      
      for (const key of allKeys) {
        const keyPath = path ? `${path}/${key}` : `/${key}`;
        const origValue = original?.[key];
        const modValue = modified?.[key];

        if (!(key in original)) {
          patch.push({ op: 'add', path: keyPath, value: modValue });
        } else if (!(key in modified)) {
          patch.push({ op: 'remove', path: keyPath });
        } else {
          this.generatePatch(origValue, modValue, keyPath, patch);
        }
      }
    } else {
      patch.push({ op: 'replace', path: path || '/', value: modified });
    }
  }
}

// ============================================================================
// JSON 流式解析器
// ============================================================================

export class JsonStreamParser {
  private buffer: string = '';
  private depth: number = 0;
  private inString: boolean = false;
  private escape: boolean = false;
  private objects: any[] = [];
  private options: StreamParserOptions;

  constructor(options: StreamParserOptions = {}) {
    this.options = {
      chunkSize: 1024,
      ...options
    };
  }

  /**
   * 解析 JSON 流
   * 
   * @param chunk - 数据块
   * @returns 已解析的对象数组
   * 
   * @example
   * const parser = new JsonStreamParser({
   *   onObject: (obj) => console.log('收到对象:', obj)
   * });
   * 
   * // 模拟流式数据
   * parser.write('{"name": "Axon"}');
   * parser.write('{"version": 1}');
   * parser.end();
   */
  write(chunk: string): any[] {
    this.buffer += chunk;
    const results: any[] = [];

    let i = 0;
    while (i < this.buffer.length) {
      const char = this.buffer[i];

      if (this.escape) {
        this.escape = false;
        i++;
        continue;
      }

      if (char === '\\' && this.inString) {
        this.escape = true;
        i++;
        continue;
      }

      if (char === '"') {
        this.inString = !this.inString;
        i++;
        continue;
      }

      if (!this.inString) {
        if (char === '{' || char === '[') {
          this.depth++;
        } else if (char === '}' || char === ']') {
          this.depth--;
        }

        if (this.depth === 0 && (char === '}' || char === ']')) {
          const jsonStr = this.buffer.substring(0, i + 1);
          try {
            const obj = JSON.parse(jsonStr);
            results.push(obj);
            this.objects.push(obj);
            
            if (this.options.onObject) {
              this.options.onObject(obj);
            }
          } catch (error) {
            if (this.options.onError) {
              this.options.onError(error as Error);
            }
          }
          this.buffer = this.buffer.substring(i + 1).trim();
          i = -1; // 重置索引
        }
      }
      i++;
    }

    return results;
  }

  /**
   * 结束流解析
   * 
   * @returns 所有解析的对象
   */
  end(): any[] {
    if (this.buffer.trim()) {
      try {
        const obj = JSON.parse(this.buffer);
        this.objects.push(obj);
        
        if (this.options.onObject) {
          this.options.onObject(obj);
        }
      } catch (error) {
        if (this.options.onError) {
          this.options.onError(error as Error);
        }
      }
    }
    return this.objects;
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    this.buffer = '';
    this.depth = 0;
    this.inString = false;
    this.escape = false;
    this.objects = [];
  }

  /**
   * 静态方法：快速解析 JSON 流字符串
   * 
   * @param jsonString - 包含多个 JSON 的字符串
   * @returns 解析后的对象数组
   * 
   * @example
   * const data = '{"id": 1}{"id": 2}{"id": 3}';
   * const objects = JsonStreamParser.parseStream(data);
   * // [{id: 1}, {id: 2}, {id: 3}]
   */
  static parseStream(jsonString: string): any[] {
    const parser = new JsonStreamParser();
    parser.write(jsonString);
    return parser.end();
  }

  /**
   * 解析 JSONL (JSON Lines) 格式
   * 
   * @param jsonlString - JSONL 字符串 (每行一个 JSON)
   * @returns 解析后的对象数组
   * 
   * @example
   * const jsonl = '{"name": "Axon"}\n{"version": 1}\n{"status": "active"}';
   * const objects = JsonStreamParser.parseJsonl(jsonl);
   */
  static parseJsonl(jsonlString: string): any[] {
    return jsonlString
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 验证 JSON Schema
 */
export function validateJson(data: any, schema: JsonSchema): ValidationResult {
  return JsonSchemaValidator.validate(data, schema);
}

/**
 * 应用 JSON Patch
 */
export function patchJson(doc: any, patch: JsonPatchOperation[]): any {
  return JsonPatch.apply(doc, patch);
}

/**
 * 生成 JSON Patch
 */
export function generatePatch(original: any, modified: any): JsonPatchOperation[] {
  return JsonPatch.generate(original, modified);
}

/**
 * 解析 JSON 流
 */
export function parseJsonStream(chunk: string): any[] {
  const parser = new JsonStreamParser();
  parser.write(chunk);
  return parser.end();
}

// ============================================================================
// 导出
// ============================================================================

export default {
  JsonSchemaValidator,
  JsonPatch,
  JsonStreamParser,
  validateJson,
  patchJson,
  generatePatch,
  parseJsonStream
};
