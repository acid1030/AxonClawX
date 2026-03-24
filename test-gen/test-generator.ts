/**
 * Test Generator - 单元测试生成器
 * 
 * 功能:
 * 1. 代码分析 - 解析 TypeScript/JavaScript 文件
 * 2. 测试生成 - 生成 Jest 测试用例
 * 3. Mock 数据生成
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// ============ 类型定义 ============

interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  startLine: number;
  endLine: number;
}

interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  isRest: boolean;
}

interface ClassInfo {
  name: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  isExported: boolean;
}

interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isAsync: boolean;
  isStatic: boolean;
  isPublic: boolean;
}

interface PropertyInfo {
  name: string;
  type: string;
  isStatic: boolean;
  isPublic: boolean;
}

interface TestGenerationOptions {
  includeEdgeCases: boolean;
  includeErrorCases: boolean;
  generateMocks: boolean;
  testTemplate: 'jest' | 'vitest' | 'mocha';
}

// ============ 代码分析器 ============

export class CodeAnalyzer {
  private sourceFile: ts.SourceFile;

  constructor(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    this.sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
  }

  /**
   * 分析文件中的所有函数
   */
  analyzeFunctions(): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    const visit = (node: ts.Node) => {
      // 函数声明
      if (ts.isFunctionDeclaration(node)) {
        const funcInfo = this.extractFunctionInfo(node);
        if (funcInfo) functions.push(funcInfo);
      }
      
      // 箭头函数赋值
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            const funcInfo = this.extractArrowFunctionInfo(decl, node);
            if (funcInfo) functions.push(funcInfo);
          }
        });
      }

      // 方法
      if (ts.isMethodDeclaration(node)) {
        // 在类中处理
      }

      node.forEachChild(visit);
    };

    visit(this.sourceFile);
    return functions;
  }

  /**
   * 分析文件中的所有类
   */
  analyzeClasses(): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const classInfo = this.extractClassInfo(node);
        if (classInfo) classes.push(classInfo);
      }
      node.forEachChild(visit);
    };

    visit(this.sourceFile);
    return classes;
  }

  private extractFunctionInfo(node: ts.FunctionDeclaration): FunctionInfo | null {
    if (!node.name) return null;

    const parameters = this.extractParameters(node.parameters);
    const returnType = this.extractReturnType(node);
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

    return {
      name: node.name.text,
      parameters,
      returnType,
      isAsync: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
      isExported,
      startLine: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      endLine: this.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
    };
  }

  private extractArrowFunctionInfo(decl: ts.VariableDeclaration, node: ts.VariableStatement): FunctionInfo | null {
    if (!ts.isArrowFunction(decl.initializer)) return null;
    if (!ts.isIdentifier(decl.name)) return null;

    const parameters = this.extractParameters(decl.initializer.parameters);
    const returnType = this.extractReturnType(decl.initializer);
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

    return {
      name: decl.name.text,
      parameters,
      returnType,
      isAsync: decl.initializer.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
      isExported,
      startLine: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      endLine: this.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
    };
  }

  private extractClassInfo(node: ts.ClassDeclaration): ClassInfo | null {
    if (!node.name) return null;

    const methods: MethodInfo[] = [];
    const properties: PropertyInfo[] = [];

    node.members.forEach(member => {
      if (ts.isMethodDeclaration(member)) {
        const methodInfo = this.extractMethodInfo(member);
        if (methodInfo) methods.push(methodInfo);
      }
      
      if (ts.isPropertyDeclaration(member)) {
        const propInfo = this.extractPropertyInfo(member);
        if (propInfo) properties.push(propInfo);
      }
    });

    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

    return {
      name: node.name.text,
      methods,
      properties,
      isExported
    };
  }

  private extractMethodInfo(node: ts.MethodDeclaration): MethodInfo | null {
    const parameters = this.extractParameters(node.parameters);
    const returnType = this.extractReturnType(node);

    return {
      name: node.name.getText(),
      parameters,
      returnType,
      isAsync: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
      isStatic: node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false,
      isPublic: !node.modifiers?.some(m => 
        m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword
      ) ?? true
    };
  }

  private extractPropertyInfo(node: ts.PropertyDeclaration): PropertyInfo | null {
    if (!node.name || !ts.isIdentifier(node.name)) return null;

    const type = node.type ? node.type.getText() : 'any';

    return {
      name: node.name.text,
      type,
      isStatic: node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false,
      isPublic: !node.modifiers?.some(m => 
        m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword
      ) ?? true
    };
  }

  private extractParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): ParameterInfo[] {
    return parameters.map(param => {
      const type = param.type ? param.type.getText() : 'any';
      
      return {
        name: param.name.getText(),
        type,
        isOptional: !!param.questionToken,
        isRest: !!param.dotDotDotToken
      };
    });
  }

  private extractReturnType(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.MethodDeclaration): string {
    if (node.type) {
      return node.type.getText();
    }
    return 'void';
  }
}

// ============ Mock 数据生成器 ============

export class MockGenerator {
  /**
   * 根据类型生成 mock 值
   */
  generateMockValue(type: string, paramName: string): string {
    const normalizedType = type.toLowerCase();

    // 基本类型
    if (normalizedType.includes('string')) {
      return `'test_${paramName}'`;
    }
    if (normalizedType.includes('number') || normalizedType.includes('int')) {
      return '42';
    }
    if (normalizedType.includes('boolean') || normalizedType.includes('bool')) {
      return 'true';
    }
    if (normalizedType.includes('array') || normalizedType.includes('[]')) {
      return '[]';
    }
    if (normalizedType.includes('object') || normalizedType.includes('{}')) {
      return '{}';
    }
    if (normalizedType.includes('null')) {
      return 'null';
    }
    if (normalizedType.includes('undefined')) {
      return 'undefined';
    }
    if (normalizedType.includes('date')) {
      return 'new Date()';
    }
    if (normalizedType.includes('promise')) {
      return 'Promise.resolve()';
    }

    // 默认返回
    return `{} as ${type}`;
  }

  /**
   * 生成 mock 函数
   */
  generateMockFunction(funcName: string, returnType: string): string {
    return `jest.fn().mockResolvedValue(${this.generateMockValue(returnType, 'result')})`;
  }

  /**
   * 生成 mock 对象
   */
  generateMockObject(className: string, properties: PropertyInfo[]): string {
    const mockProps = properties
      .filter(p => p.isPublic)
      .map(p => `  ${p.name}: ${this.generateMockValue(p.type, p.name)}`)
      .join(',\n');

    return `const mock${className}: ${className} = {\n${mockProps}\n};`;
  }
}

// ============ 测试生成器 ============

export class TestGenerator {
  private analyzer: CodeAnalyzer;
  private mockGenerator: MockGenerator;
  private options: TestGenerationOptions;

  constructor(filePath: string, options?: Partial<TestGenerationOptions>) {
    this.analyzer = new CodeAnalyzer(filePath);
    this.mockGenerator = new MockGenerator();
    this.options = {
      includeEdgeCases: true,
      includeErrorCases: true,
      generateMocks: true,
      testTemplate: 'jest',
      ...options
    };
  }

  /**
   * 生成完整的测试文件
   */
  generateTestFile(): string {
    const functions = this.analyzer.analyzeFunctions();
    const classes = this.analyzer.analyzeClasses();
    const sourceFileName = path.basename(this.analyzer['sourceFile'].fileName);
    const testFileName = sourceFileName.replace(/\.ts$/, '.test.ts');

    let testContent = '';

    // 生成导入语句
    testContent += this.generateImports(sourceFileName, functions, classes);
    testContent += '\n\n';

    // 生成函数测试
    functions.forEach(func => {
      testContent += this.generateFunctionTests(func);
      testContent += '\n';
    });

    // 生成类测试
    classes.forEach(cls => {
      testContent += this.generateClassTests(cls);
      testContent += '\n';
    });

    return testContent;
  }

  private generateImports(sourceFileName: string, functions: FunctionInfo[], classes: ClassInfo[]): string {
    const imports: string[] = [];
    
    // 收集需要导入的函数
    const exportedFunctions = functions.filter(f => f.isExported);
    const exportedClasses = classes.filter(c => c.isExported);

    if (exportedFunctions.length > 0) {
      const funcNames = exportedFunctions.map(f => f.name).join(', ');
      const importPath = sourceFileName.replace(/\.ts$/, '');
      imports.push(`import { ${funcNames} } from './${importPath}';`);
    }

    exportedClasses.forEach(cls => {
      const importPath = sourceFileName.replace(/\.ts$/, '');
      imports.push(`import { ${cls.name} } from './${importPath}';`);
    });

    return imports.join('\n');
  }

  private generateFunctionTests(func: FunctionInfo): string {
    let tests = '';

    // 正常情况测试
    tests += this.generateNormalCaseTest(func);

    // 边界情况测试
    if (this.options.includeEdgeCases) {
      tests += this.generateEdgeCaseTests(func);
    }

    // 错误情况测试
    if (this.options.includeErrorCases) {
      tests += this.generateErrorCaseTests(func);
    }

    return tests;
  }

  private generateNormalCaseTest(func: FunctionInfo): string {
    const mockArgs = func.parameters
      .map(p => this.mockGenerator.generateMockValue(p.type, p.name))
      .join(', ');

    const testCode = `describe('${func.name}', () => {
  it('should execute successfully', async () => {
    ${func.isAsync ? 'const result = await ' : 'const result = '}${func.name}(${mockArgs});
    expect(result).toBeDefined();
  });
});`;

    return testCode;
  }

  private generateEdgeCaseTests(func: FunctionInfo): string {
    let tests = '';

    func.parameters.forEach(param => {
      // 空值测试
      if (param.isOptional || param.type.includes('string') || param.type.includes('array')) {
        const otherArgs = func.parameters
          .filter(p => p !== param)
          .map(p => this.mockGenerator.generateMockValue(p.type, p.name))
          .join(', ');
        
        const emptyValue = param.type.includes('string') ? "''" : 
                          param.type.includes('array') ? '[]' : 
                          'undefined';

        tests += `
  it('should handle ${param.name} being ${emptyValue}', async () => {
    ${func.isAsync ? 'const result = await ' : 'const result = '}${func.name}(${otherArgs ? otherArgs + ', ' : ''}${emptyValue});
    expect(result).toBeDefined();
  });`;
      }

      // 边界值测试 (数字类型)
      if (param.type.includes('number')) {
        tests += `
  it('should handle ${param.name} being 0', async () => {
    ${func.isAsync ? 'const result = await ' : 'const result = '}${func.name}(0${func.parameters.length > 1 ? ', ' + func.parameters.filter(p => p !== param).map(p => this.mockGenerator.generateMockValue(p.type, p.name)).join(', ') : ''});
    expect(result).toBeDefined();
  });`;
      }
    });

    return tests;
  }

  private generateErrorCaseTests(func: FunctionInfo): string {
    let tests = '';

    // 为每个参数生成错误情况测试
    func.parameters.forEach(param => {
      if (param.type.includes('string')) {
        tests += `
  it('should throw error when ${param.name} is invalid', async () => {
    await expect(${func.name}('invalid_input'${func.parameters.length > 1 ? ', ' + func.parameters.filter(p => p !== param).map(p => this.mockGenerator.generateMockValue(p.type, p.name)).join(', ') : ''})).rejects.toThrow();
  });`;
      }

      if (param.type.includes('number')) {
        tests += `
  it('should throw error when ${param.name} is negative', async () => {
    await expect(${func.name}(-1${func.parameters.length > 1 ? ', ' + func.parameters.filter(p => p !== param).map(p => this.mockGenerator.generateMockValue(p.type, p.name)).join(', ') : ''})).rejects.toThrow();
  });`;
      }

      if (!param.isOptional) {
        tests += `
  it('should throw error when ${param.name} is undefined', async () => {
    await expect(${func.name}(undefined${func.parameters.length > 1 ? ', ' + func.parameters.filter(p => p !== param).map(p => this.mockGenerator.generateMockValue(p.type, p.name)).join(', ') : ''})).rejects.toThrow();
  });`;
      }
    });

    return tests;
  }

  private generateClassTests(cls: ClassInfo): string {
    let tests = `describe('${cls.name}', () => {`;

    // 构造函数测试
    tests += `
  describe('constructor', () => {
    it('should create instance successfully', () => {
      const instance = new ${cls.name}();
      expect(instance).toBeDefined();
    });
  });`;

    // 方法测试
    cls.methods.forEach(method => {
      tests += `
  describe('${method.name}', () => {
    it('should execute successfully', async () => {
      const instance = new ${cls.name}();
      const mockArgs = ${method.parameters.length > 0 ? method.parameters.map(p => this.mockGenerator.generateMockValue(p.type, p.name)).join(', ') : ''};
      ${method.isAsync ? 'const result = await ' : 'const result = '}instance.${method.name}(${mockArgs});
      expect(result).toBeDefined();
    });
  });`;
    });

    tests += `\n});`;

    return tests;
  }
}

// ============ 命令行接口 ============

export async function generateTests(filePath: string, options?: Partial<TestGenerationOptions>): Promise<string> {
  const generator = new TestGenerator(filePath, options);
  return generator.generateTestFile();
}

export async function analyzeCode(filePath: string): Promise<{ functions: FunctionInfo[], classes: ClassInfo[] }> {
  const analyzer = new CodeAnalyzer(filePath);
  return {
    functions: analyzer.analyzeFunctions(),
    classes: analyzer.analyzeClasses()
  };
}

// CLI 执行
if (require.main === module) {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error('Usage: ts-node test-generator.ts <file-path>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Analyzing: ${filePath}`);
  
  const generator = new TestGenerator(filePath);
  const testContent = generator.generateTestFile();
  
  const testFilePath = filePath.replace(/\.ts$/, '.test.ts');
  fs.writeFileSync(testFilePath, testContent);
  
  console.log(`✓ Test file generated: ${testFilePath}`);
}
