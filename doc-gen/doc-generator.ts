#!/usr/bin/env ts-node
/**
 * API 文档生成器 - doc-gen 技能核心
 * 
 * 功能:
 * 1. 解析 TypeScript 文件
 * 2. 提取函数/类/接口签名
 * 3. 提取 JSDoc 注释
 * 4. 生成 Markdown API 文档
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// ============ 类型定义 ============

interface DocParam {
  name: string;
  type: string;
  description: string;
  optional: boolean;
}

interface DocReturn {
  type: string;
  description: string;
}

interface DocExample {
  language: string;
  code: string;
}

interface ApiDoc {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'method' | 'property';
  signature: string;
  description: string;
  params: DocParam[];
  returns?: DocReturn;
  examples: DocExample[];
  sourceFile: string;
  line: number;
}

interface GeneratorOptions {
  inputDir: string;
  outputDir: string;
  outputFile?: string;
  exclude?: string[];
  includePrivate?: boolean;
}

// ============ TypeScript 解析器 ============

class TypeScriptParser {
  private sourceFile: ts.SourceFile;
  private docs: ApiDoc[] = [];

  constructor(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    this.sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
  }

  parse(): ApiDoc[] {
    this.docs = [];
    ts.forEachChild(this.sourceFile, (node) => {
      this.visitNode(node);
    });
    return this.docs;
  }

  private visitNode(node: ts.Node) {
    // 函数声明
    if (ts.isFunctionDeclaration(node)) {
      this.extractFunction(node);
    }
    // 类声明
    else if (ts.isClassDeclaration(node)) {
      this.extractClass(node);
    }
    // 接口声明
    else if (ts.isInterfaceDeclaration(node)) {
      this.extractInterface(node);
    }
    // 变量声明 (可能是箭头函数)
    else if (ts.isVariableStatement(node)) {
      this.extractVariable(node);
    }

    // 递归访问子节点
    ts.forEachChild(node, (child) => this.visitNode(child));
  }

  private extractFunction(node: ts.FunctionDeclaration) {
    if (!node.name) return;

    const jsdoc = this.extractJSDoc(node);
    if (!jsdoc.description && !node.name) return;

    const params = this.extractParameters(node.parameters, node);
    const returnType = this.extractType(node.type);
    const signature = this.buildFunctionSignature(node);

    this.docs.push({
      name: node.name.text,
      kind: 'function',
      signature,
      description: jsdoc.description,
      params,
      returns: returnType ? { type: returnType, description: jsdoc.returns } : undefined,
      examples: jsdoc.examples,
      sourceFile: this.sourceFile.fileName,
      line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    });
  }

  private extractClass(node: ts.ClassDeclaration) {
    if (!node.name) return;

    const jsdoc = this.extractJSDoc(node);
    const signature = `class ${node.name.text}`;

    const classDoc: ApiDoc = {
      name: node.name.text,
      kind: 'class',
      signature,
      description: jsdoc.description,
      params: [],
      examples: jsdoc.examples,
      sourceFile: this.sourceFile.fileName,
      line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };

    this.docs.push(classDoc);

    // 提取类成员
    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member)) {
        this.extractMethod(member, node.name!.text);
      } else if (ts.isPropertyDeclaration(member)) {
        this.extractProperty(member, node.name!.text);
      }
    });
  }

  private extractMethod(node: ts.MethodDeclaration, className: string) {
    if (!node.name) return;

    const jsdoc = this.extractJSDoc(node);
    const params = this.extractParameters(node.parameters, node);
    const returnType = this.extractType(node.type);
    const methodName = ts.isIdentifier(node.name) ? node.name.text : node.name.getText();
    const signature = `${methodName}(${params.map(p => `${p.name}: ${p.type}`).join(', ')}): ${returnType || 'void'}`;

    this.docs.push({
      name: `${className}.${methodName}`,
      kind: 'method',
      signature,
      description: jsdoc.description,
      params,
      returns: returnType ? { type: returnType, description: jsdoc.returns } : undefined,
      examples: jsdoc.examples,
      sourceFile: this.sourceFile.fileName,
      line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    });
  }

  private extractProperty(node: ts.PropertyDeclaration, className: string) {
    if (!node.name) return;

    const jsdoc = this.extractJSDoc(node);
    const propName = ts.isIdentifier(node.name) ? node.name.text : node.name.getText();
    const propType = this.extractType(node.type) || 'any';
    const signature = `${propName}: ${propType}`;

    this.docs.push({
      name: `${className}.${propName}`,
      kind: 'property',
      signature,
      description: jsdoc.description,
      params: [],
      examples: jsdoc.examples,
      sourceFile: this.sourceFile.fileName,
      line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    });
  }

  private extractInterface(node: ts.InterfaceDeclaration) {
    const jsdoc = this.extractJSDoc(node);
    const signature = `interface ${node.name.text}`;

    this.docs.push({
      name: node.name.text,
      kind: 'interface',
      signature,
      description: jsdoc.description,
      params: [],
      examples: jsdoc.examples,
      sourceFile: this.sourceFile.fileName,
      line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    });

    // 提取接口成员
    node.members.forEach((member) => {
      if (ts.isPropertySignature(member)) {
        this.extractInterfaceProperty(member, node.name.text);
      } else if (ts.isMethodSignature(member)) {
        this.extractInterfaceMethod(member, node.name.text);
      }
    });
  }

  private extractInterfaceProperty(node: ts.PropertySignature, interfaceName: string) {
    if (!node.name) return;

    const jsdoc = this.extractJSDoc(node);
    const propName = ts.isIdentifier(node.name) ? node.name.text : node.name.getText();
    const propType = this.extractType(node.type) || 'any';
    const signature = `${propName}: ${propType}`;

    this.docs.push({
      name: `${interfaceName}.${propName}`,
      kind: 'property',
      signature,
      description: jsdoc.description,
      params: [],
      examples: jsdoc.examples,
      sourceFile: this.sourceFile.fileName,
      line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    });
  }

  private extractInterfaceMethod(node: ts.MethodSignature, interfaceName: string) {
    if (!node.name) return;

    const jsdoc = this.extractJSDoc(node);
    const params = this.extractParameters(node.parameters, node);
    const returnType = this.extractType(node.type);
    const methodName = ts.isIdentifier(node.name) ? node.name.text : node.name.getText();
    const signature = `${methodName}(${params.map(p => `${p.name}: ${p.type}`).join(', ')}): ${returnType || 'void'}`;

    this.docs.push({
      name: `${interfaceName}.${methodName}`,
      kind: 'method',
      signature,
      description: jsdoc.description,
      params,
      returns: returnType ? { type: returnType, description: jsdoc.returns } : undefined,
      examples: jsdoc.examples,
      sourceFile: this.sourceFile.fileName,
      line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    });
  }

  private extractVariable(node: ts.VariableStatement) {
    node.declarationList.declarations.forEach((decl) => {
      if (!ts.isIdentifier(decl.name)) return;

      const jsdoc = this.extractJSDoc(node);
      
      // 检查是否是函数类型
      if (decl.type && ts.isFunctionTypeNode(decl.type)) {
        const params = this.extractParameters(decl.type.parameters, node);
        const returnType = this.extractType(decl.type.type);
        const signature = `${decl.name.text}(${params.map(p => `${p.name}: ${p.type}`).join(', ')}): ${returnType || 'void'}`;

        this.docs.push({
          name: decl.name.text,
          kind: 'function',
          signature,
          description: jsdoc.description,
          params,
          returns: returnType ? { type: returnType, description: jsdoc.returns } : undefined,
          examples: jsdoc.examples,
          sourceFile: this.sourceFile.fileName,
          line: this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        });
      }
    });
  }

  private extractJSDoc(node: ts.Node): { description: string; returns: string; examples: DocExample[] } {
    const jsdocTags = ts.getJSDocTags(node);
    let description = '';
    let returns = '';
    const examples: DocExample[] = [];

    // 获取 JSDoc 注释
    const jsdocComments = ts.getJSDocCommentsAndTags(node);
    if (jsdocComments && jsdocComments.length > 0) {
      const firstJsdoc = jsdocComments[0];
      if (ts.isJSDoc(firstJsdoc) && firstJsdoc.comment) {
        description = typeof firstJsdoc.comment === 'string' 
          ? firstJsdoc.comment 
          : (firstJsdoc.comment as any).text || '';
      }
    }

    // 解析标签
    jsdocTags.forEach((tag) => {
      const tagName = tag.tagName.text;
      const comment = tag.comment;
      const commentText = typeof comment === 'string' ? comment : (comment as any)?.text || '';

      if (tagName === 'param') {
        // 参数描述已在 extractParameters 中处理
      } else if (tagName === 'returns' || tagName === 'return') {
        returns = commentText;
      } else if (tagName === 'example') {
        const exampleText = typeof comment === 'string' ? comment : (comment as any)?.text || '';
        const match = exampleText.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) {
          examples.push({
            language: match[1] || 'typescript',
            code: match[2].trim(),
          });
        } else {
          examples.push({
            language: 'typescript',
            code: exampleText,
          });
        }
      }
    });

    return { description, returns, examples };
  }

  private extractParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>, parentNode?: ts.Node): DocParam[] {
    const parentNodeToUse = parentNode || (parameters.length > 0 ? parameters[0].parent : undefined);
    const jsdocTags = parentNodeToUse ? ts.getJSDocTags(parentNodeToUse) : [];
    const paramDescriptions = new Map<string, string>();

    // 提取 @param 描述
    jsdocTags.forEach((tag) => {
      if (tag.tagName.text === 'param') {
        const name = (tag as any).name?.text || '';
        const comment = tag.comment;
        let commentText = typeof comment === 'string' ? comment : (comment as any)?.text || '';
        // 清理描述文本：移除前导的破折号和空格
        commentText = commentText.replace(/^\s*[-–—]\s*/, '').trim();
        paramDescriptions.set(name, commentText);
      }
    });

    return parameters.map((param) => {
      const paramName = ts.isIdentifier(param.name) ? param.name.text : param.name.getText();
      const paramType = this.extractType(param.type) || 'any';
      const isOptional = param.questionToken !== undefined || param.initializer !== undefined;

      return {
        name: paramName,
        type: paramType,
        description: paramDescriptions.get(paramName) || '',
        optional: isOptional,
      };
    });
  }

  private extractType(typeNode: ts.TypeNode | undefined): string {
    if (!typeNode) return '';
    return typeNode.getText(this.sourceFile);
  }

  private buildFunctionSignature(node: ts.FunctionDeclaration): string {
    const name = node.name?.text || 'anonymous';
    const params = node.parameters.map((p) => {
      const paramName = ts.isIdentifier(p.name) ? p.name.text : p.name.getText();
      const paramType = this.extractType(p.type) || 'any';
      const isOptional = p.questionToken !== undefined || p.initializer !== undefined;
      return `${paramName}${isOptional ? '?' : ''}: ${paramType}`;
    }).join(', ');

    const returnType = this.extractType(node.type) || 'void';
    const asyncPrefix = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';

    return `${asyncPrefix}${name}(${params}): ${returnType}`;
  }
}

// ============ Markdown 生成器 ============

class MarkdownGenerator {
  generate(docs: ApiDoc[], options: { title?: string; includeIndex?: boolean } = {}): string {
    const { title = 'API 文档', includeIndex = true } = options;
    let markdown = `# ${title}\n\n`;

    // 生成索引
    if (includeIndex && docs.length > 0) {
      markdown += `## 目录\n\n`;
      docs.forEach((doc, index) => {
        const anchor = this.toAnchor(doc.name);
        markdown += `- [${doc.name}](#${anchor})\n`;
      });
      markdown += `\n---\n\n`;
    }

    // 生成每个 API 文档
    docs.forEach((doc) => {
      markdown += this.generateApiDoc(doc);
    });

    return markdown;
  }

  private generateApiDoc(doc: ApiDoc): string {
    let markdown = `## ${doc.signature}\n\n`;

    if (doc.description) {
      markdown += `${doc.description}\n\n`;
    }

    // 参数
    if (doc.params.length > 0) {
      markdown += `**参数**:\n`;
      doc.params.forEach((param) => {
        const optional = param.optional ? ' (可选)' : '';
        markdown += `- \`${param.name}\`${optional} - \`${param.type}\``;
        if (param.description) {
          markdown += ` — ${param.description}`;
        }
        markdown += `\n`;
      });
      markdown += `\n`;
    }

    // 返回值
    if (doc.returns) {
      markdown += `**返回**:\n`;
      markdown += `- \`${doc.returns.type}\``;
      if (doc.returns.description) {
        markdown += ` — ${doc.returns.description}`;
      }
      markdown += `\n\n`;
    }

    // 示例
    if (doc.examples.length > 0) {
      markdown += `**示例**:\n\n`;
      doc.examples.forEach((example) => {
        markdown += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
      });
    }

    markdown += `---\n\n`;

    return markdown;
  }

  private toAnchor(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

// ============ 文档生成器主类 ============

class DocGenerator {
  private parser: TypeScriptParser | null = null;
  private generator: MarkdownGenerator;
  private allDocs: ApiDoc[] = [];

  constructor() {
    this.generator = new MarkdownGenerator();
  }

  /**
   * 解析单个 TypeScript 文件
   */
  parseFile(filePath: string): ApiDoc[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在：${filePath}`);
    }

    this.parser = new TypeScriptParser(filePath);
    const docs = this.parser.parse();
    this.allDocs.push(...docs);
    return docs;
  }

  /**
   * 解析目录中的所有 TypeScript 文件
   */
  parseDirectory(dirPath: string, exclude: string[] = []): ApiDoc[] {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`目录不存在：${dirPath}`);
    }

    const files = this.findTypeScriptFiles(dirPath, exclude);
    files.forEach((file) => {
      try {
        this.parseFile(file);
      } catch (error) {
        console.warn(`解析失败 ${file}:`, error);
      }
    });

    return this.allDocs;
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdown(options: { title?: string; includeIndex?: boolean } = {}): string {
    return this.generator.generate(this.allDocs, options);
  }

  /**
   * 保存文档到文件
   */
  saveToFile(outputPath: string, options: { title?: string; includeIndex?: boolean } = {}): void {
    const markdown = this.generateMarkdown(options);
    
    // 确保目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`✓ 文档已生成：${outputPath}`);
  }

  /**
   * 重置解析器
   */
  reset(): void {
    this.allDocs = [];
    this.parser = null;
  }

  /**
   * 获取所有文档
   */
  getDocs(): ApiDoc[] {
    return this.allDocs;
  }

  private findTypeScriptFiles(dirPath: string, exclude: string[] = []): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // 跳过排除的目录
      if (entry.isDirectory() && exclude.some(e => entry.name.includes(e))) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...this.findTypeScriptFiles(fullPath, exclude));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        // 跳过测试文件和声明文件
        if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }
}

// ============ CLI 接口 ============

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
API 文档生成器 - doc-gen

用法:
  doc-gen <input> [options]

参数:
  input          输入文件或目录路径

选项:
  -o, --output   输出文件路径 (默认：API.md)
  -t, --title    文档标题 (默认：API 文档)
  --no-index     不生成目录索引
  -e, --exclude  排除的目录 (逗号分隔)
  -h, --help     显示帮助

示例:
  doc-gen ./src
  doc-gen ./src -o docs/api.md -t "我的 API"
  doc-gen ./src --exclude node_modules,dist,test
`);
    process.exit(0);
  }

  const inputPath = args[0];
  const outputOption = args.indexOf('-o') !== -1 ? args[args.indexOf('-o') + 1] 
    : args.indexOf('--output') !== -1 ? args[args.indexOf('--output') + 1] 
    : 'API.md';
  const titleOption = args.indexOf('-t') !== -1 ? args[args.indexOf('-t') + 1] 
    : args.indexOf('--title') !== -1 ? args[args.indexOf('--title') + 1] 
    : 'API 文档';
  const noIndex = args.includes('--no-index');
  const excludeOption = args.indexOf('-e') !== -1 ? args[args.indexOf('-e') + 1] 
    : args.indexOf('--exclude') !== -1 ? args[args.indexOf('--exclude') + 1] 
    : 'node_modules,dist,test';

  const generator = new DocGenerator();
  const stats = fs.statSync(inputPath);

  if (stats.isDirectory()) {
    console.log(`📁 解析目录：${inputPath}`);
    generator.parseDirectory(inputPath, excludeOption.split(','));
  } else {
    console.log(`📄 解析文件：${inputPath}`);
    generator.parseFile(inputPath);
  }

  const docs = generator.getDocs();
  console.log(`✓ 找到 ${docs.length} 个 API 项`);

  generator.saveToFile(outputOption, {
    title: titleOption,
    includeIndex: !noIndex,
  });
}

// 导出
export { DocGenerator, TypeScriptParser, MarkdownGenerator };
export type { ApiDoc, DocParam, DocReturn, DocExample, GeneratorOptions };

// CLI 入口
if (require.main === module) {
  main();
}
