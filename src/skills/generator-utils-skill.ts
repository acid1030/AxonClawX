/**
 * 代码生成器工具技能 - Generator Utils Skill
 * 
 * 功能:
 * 1. 模板代码生成 (Template Code Generation)
 * 2. 脚手架生成 (Scaffolding Generation)
 * 3. 批量生成 (Batch Generation)
 * 
 * @module skills/generator-utils
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

/**
 * 模板变量替换映射
 */
export interface TemplateVariables {
  [key: string]: string | number | boolean | any[];
}

/**
 * 模板配置选项
 */
export interface TemplateOptions {
  /** 输出目录 */
  outputDir?: string;
  /** 文件编码，默认 'utf-8' */
  encoding?: BufferEncoding;
  /** 是否覆盖已存在文件，默认 false */
  overwrite?: boolean;
  /** 文件权限模式 (Unix)，默认 0o644 */
  mode?: number;
  /** 变量替换前后的前缀，默认 '{{' */
  prefix?: string;
  /** 变量替换前后的后缀，默认 '}}' */
  suffix?: string;
  /** 是否创建目录，默认 true */
  createDirs?: boolean;
  /** 回调函数 - 文件生成前 */
  beforeGenerate?: (filePath: string, content: string) => void | Promise<void>;
  /** 回调函数 - 文件生成后 */
  afterGenerate?: (filePath: string) => void | Promise<void>;
}

/**
 * 生成结果
 */
export interface GenerationResult {
  /** 文件路径 */
  filePath: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 (如果失败) */
  error?: string;
  /** 文件大小 (字节) */
  size?: number;
  /** 生成时间 (毫秒) */
  duration?: number;
}

/**
 * 脚手架配置
 */
export interface ScaffoldConfig {
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description?: string;
  /** 项目版本，默认 '1.0.0' */
  version?: string;
  /** 作者信息 */
  author?: string;
  /** 许可证，默认 'MIT' */
  license?: string;
  /** 项目类型 */
  type?: ScaffoldType;
  /** 额外配置 */
  extras?: Record<string, any>;
}

/**
 * 脚手架类型
 */
export type ScaffoldType = 
  | 'node-app'
  | 'typescript-lib'
  | 'react-component'
  | 'express-api'
  | 'cli-tool'
  | 'test-suite'
  | 'skill-module'
  | 'custom';

/**
 * 文件模板定义
 */
export interface FileTemplate {
  /** 文件路径 (支持变量) */
  path: string;
  /** 文件内容模板 */
  content: string | ((variables: TemplateVariables) => string);
  /** 是否可选，默认 true */
  optional?: boolean;
  /** 条件函数，返回 false 则跳过此文件 */
  condition?: (variables: TemplateVariables) => boolean;
}

/**
 * 批量生成配置
 */
export interface BatchGenerateConfig {
  /** 模板列表 */
  templates: FileTemplate[];
  /** 变量列表 (每个变量集生成一套文件) */
  variableSets: TemplateVariables[];
  /** 输出根目录 */
  outputRoot: string;
  /** 通用选项 */
  options?: TemplateOptions;
  /** 是否并行生成，默认 true */
  parallel?: boolean;
  /** 并发数量，默认 5 */
  concurrency?: number;
}

/**
 * 批量生成结果
 */
export interface BatchGenerateResult {
  /** 总文件数 */
  total: number;
  /** 成功数量 */
  success: number;
  /** 失败数量 */
  failed: number;
  /** 总耗时 (毫秒) */
  duration: number;
  /** 详细结果 */
  results: GenerationResult[];
}

// ==================== 模板引擎 ====================

/**
 * 简单的模板引擎
 * 支持 {{variable}} 语法
 */
export class TemplateEngine {
  private prefix: string;
  private suffix: string;

  constructor(prefix: string = '{{', suffix: string = '}}') {
    this.prefix = prefix;
    this.suffix = suffix;
  }

  /**
   * 渲染模板
   * @param template - 模板字符串
   * @param variables - 变量映射
   * @returns 渲染后的字符串
   */
  render(template: string, variables: TemplateVariables): string {
    const pattern = new RegExp(
      this.escapeRegex(this.prefix) + 
      '([\\s\\S]*?)' + 
      this.escapeRegex(this.suffix),
      'g'
    );

    return template.replace(pattern, (match, key) => {
      const trimmedKey = key.trim();
      
      // 支持点访问嵌套对象
      const value = this.resolvePath(variables, trimmedKey);
      
      if (value === undefined) {
        console.warn(`[TemplateEngine] Variable '${trimmedKey}' not found`);
        return match;
      }

      // 处理对象/数组
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }

      return String(value);
    });
  }

  /**
   * 渲染多行模板
   * @param lines - 模板行数组
   * @param variables - 变量映射
   * @returns 渲染后的字符串
   */
  renderLines(lines: string[], variables: TemplateVariables): string {
    return lines.map(line => this.render(line, variables)).join('\n');
  }

  /**
   * 解析嵌套路径
   * @param obj - 对象
   * @param pathStr - 路径字符串 (如 'user.name')
   * @returns 解析的值
   */
  private resolvePath(obj: any, pathStr: string): any {
    const parts = pathStr.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * 转义正则特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// ==================== 代码生成器 ====================

/**
 * 代码生成器主类
 */
export class CodeGenerator {
  private engine: TemplateEngine;
  private defaultOptions: Required<TemplateOptions>;

  constructor(options?: Partial<TemplateOptions>) {
    this.engine = new TemplateEngine(options?.prefix, options?.suffix);
    this.defaultOptions = {
      outputDir: './generated',
      encoding: 'utf-8',
      overwrite: false,
      mode: 0o644,
      prefix: '{{',
      suffix: '}}',
      createDirs: true,
      beforeGenerate: () => {},
      afterGenerate: () => {},
      ...options,
    };
  }

  /**
   * 生成单个文件
   * @param filePath - 输出文件路径
   * @param content - 文件内容 (可以是模板)
   * @param variables - 模板变量
   * @param options - 选项
   * @returns 生成结果
   */
  async generateFile(
    filePath: string,
    content: string,
    variables: TemplateVariables = {},
    options?: Partial<TemplateOptions>
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // 渲染模板
      const renderedContent = this.engine.render(content, variables);
      
      // 解析最终路径 (支持变量)
      const resolvedPath = this.engine.render(filePath, variables);
      const absolutePath = path.resolve(opts.outputDir!, resolvedPath);

      // 检查文件是否存在
      if (fs.existsSync(absolutePath) && !opts.overwrite) {
        return {
          filePath: absolutePath,
          success: false,
          error: 'File already exists and overwrite is disabled',
        };
      }

      // 创建目录
      if (opts.createDirs) {
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // 执行 before 回调
      if (opts.beforeGenerate) {
        await opts.beforeGenerate(absolutePath, renderedContent);
      }

      // 写入文件
      fs.writeFileSync(absolutePath, renderedContent, {
        encoding: opts.encoding,
        mode: opts.mode,
      });

      // 执行 after 回调
      if (opts.afterGenerate) {
        await opts.afterGenerate(absolutePath);
      }

      const duration = Date.now() - startTime;
      const stats = fs.statSync(absolutePath);

      return {
        filePath: absolutePath,
        success: true,
        size: stats.size,
        duration,
      };
    } catch (error: any) {
      return {
        filePath,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 生成多个文件
   * @param templates - 文件模板列表
   * @param variables - 模板变量
   * @param options - 选项
   * @returns 生成结果列表
   */
  async generateFiles(
    templates: FileTemplate[],
    variables: TemplateVariables = {},
    options?: Partial<TemplateOptions>
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];

    for (const template of templates) {
      // 检查条件
      if (template.condition && !template.condition(variables)) {
        continue;
      }

      // 获取内容
      const content = typeof template.content === 'function'
        ? template.content(variables)
        : template.content;

      // 生成文件
      const result = await this.generateFile(
        template.path,
        content,
        variables,
        options
      );

      results.push(result);
    }

    return results;
  }

  /**
   * 批量生成 (多套变量)
   * @param config - 批量生成配置
   * @returns 批量生成结果
   */
  async batchGenerate(config: BatchGenerateConfig): Promise<BatchGenerateResult> {
    const startTime = Date.now();
    const allResults: GenerationResult[] = [];

    const processVariableSet = async (vars: TemplateVariables) => {
      const results = await this.generateFiles(
        config.templates,
        vars,
        config.options
      );
      allResults.push(...results);
    };

    if (config.parallel !== false) {
      // 并行生成
      const concurrency = config.concurrency || 5;
      const chunks = this.chunkArray(config.variableSets, concurrency);

      for (const chunk of chunks) {
        await Promise.all(chunk.map(vars => processVariableSet(vars)));
      }
    } else {
      // 串行生成
      for (const vars of config.variableSets) {
        await processVariableSet(vars);
      }
    }

    const duration = Date.now() - startTime;
    const success = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;

    return {
      total: allResults.length,
      success,
      failed,
      duration,
      results: allResults,
    };
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

// ==================== 脚手架生成器 ====================

/**
 * 脚手架生成器
 */
export class ScaffoldGenerator {
  private codeGenerator: CodeGenerator;

  constructor(options?: Partial<TemplateOptions>) {
    this.codeGenerator = new CodeGenerator(options);
  }

  /**
   * 生成项目脚手架
   * @param config - 脚手架配置
   * @returns 生成结果
   */
  async generate(config: ScaffoldConfig): Promise<GenerationResult[]> {
    const templates = this.getTemplatesForType(config.type || 'node-app');
    const variables = this.buildVariables(config);

    return this.codeGenerator.generateFiles(templates, variables, {
      outputDir: path.join(process.cwd(), config.name),
      createDirs: true,
    });
  }

  /**
   * 根据类型获取模板
   */
  private getTemplatesForType(type: ScaffoldType): FileTemplate[] {
    switch (type) {
      case 'node-app':
        return this.getNodeAppTemplates();
      case 'typescript-lib':
        return this.getTypeScriptLibTemplates();
      case 'react-component':
        return this.getReactComponentTemplates();
      case 'express-api':
        return this.getExpressApiTemplates();
      case 'cli-tool':
        return this.getCliToolTemplates();
      case 'test-suite':
        return this.getTestSuiteTemplates();
      case 'skill-module':
        return this.getSkillModuleTemplates();
      default:
        return [];
    }
  }

  /**
   * 构建模板变量
   */
  private buildVariables(config: ScaffoldConfig): TemplateVariables {
    const now = new Date();
    return {
      name: config.name,
      description: config.description || `Project ${config.name}`,
      version: config.version || '1.0.0',
      author: config.author || 'Unknown',
      license: config.license || 'MIT',
      year: now.getFullYear(),
      date: now.toISOString().split('T')[0],
      timestamp: now.getTime(),
      ...config.extras,
    };
  }

  /**
   * Node.js 应用模板
   */
  private getNodeAppTemplates(): FileTemplate[] {
    return [
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "node --test"
  },
  "keywords": [],
  "author": "{{author}}",
  "license": "{{license}}"
}`,
      },
      {
        path: 'src/index.js',
        content: `/**
 * {{name}} - {{description}}
 * @version {{version}}
 * @author {{author}}
 */

console.log('Hello from {{name}}!');

// TODO: Implement your logic here
`,
      },
      {
        path: 'README.md',
        content: `# {{name}}

{{description}}

## Version

{{version}}

## Author

{{author}}

## License

{{license}}

## Quick Start

\`\`\`bash
npm start
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

---

Generated by Axon Code Generator
`,
      },
      {
        path: '.gitignore',
        content: `node_modules/
dist/
*.log
.env
.DS_Store
`,
      },
    ];
  }

  /**
   * TypeScript 库模板
   */
  private getTypeScriptLibTemplates(): FileTemplate[] {
    return [
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "author": "{{author}}",
  "license": "{{license}}"
}`,
      },
      {
        path: 'tsconfig.json',
        content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`,
      },
      {
        path: 'src/index.ts',
        content: `/**
 * {{name}} - {{description}}
 * @version {{version}}
 * @author {{author}}
 */

export const version = '{{version}}';

export function hello(name: string = 'World'): string {
  return \`Hello, \${name}!\`;
}

// TODO: Export your modules here
`,
      },
      {
        path: 'README.md',
        content: `# {{name}}

{{description}}

## Installation

\`\`\`bash
npm install {{name}}
\`\`\`

## Usage

\`\`\`typescript
import { hello } from '{{name}}';

console.log(hello('Axon'));
\`\`\`

## API

### \`hello(name?: string): string\`

Returns a greeting message.

**Parameters:**
- \`name\` (optional): Name to greet. Default: 'World'

**Returns:** Greeting string

---

Generated by Axon Code Generator
`,
      },
    ];
  }

  /**
   * React 组件模板
   */
  private getReactComponentTemplates(): FileTemplate[] {
    const componentName = this.pascalCase('{{name}}');
    
    return [
      {
        path: `src/components/${componentName}.tsx`,
        content: `import React from 'react';

interface ${componentName}Props {
  /** 组件标题 */
  title?: string;
  /** 子元素 */
  children?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * {{name}} 组件
 * {{description}}
 */
export const ${componentName}: React.FC<${componentName}Props> = ({
  title = '{{name}}',
  children,
  className = '',
}) => {
  return (
    <div className={\`{{name}}-component \${className}\`}>
      <h2>{title}</h2>
      {children}
    </div>
  );
};

export default ${componentName};
`,
      },
      {
        path: `src/components/${componentName}.test.tsx`,
        content: `import React from 'react';
import { render, screen } from '@testing-library/react';
import ${componentName} from './${componentName}';

describe('${componentName}', () => {
  it('renders correctly', () => {
    render(<${componentName} />);
    expect(screen.getByText('{{name}}')).toBeInTheDocument();
  });

  it('accepts custom title', () => {
    render(<${componentName} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<${componentName}><span>Child</span></${componentName}>);
    expect(screen.getByText('Child')).toBeInTheDocument();
  });
});
`,
      },
      {
        path: `src/components/index.ts`,
        content: `export { default as ${componentName} } from './${componentName}';
export * from './${componentName}';
`,
      },
    ];
  }

  /**
   * Express API 模板
   */
  private getExpressApiTemplates(): FileTemplate[] {
    return [
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  },
  "author": "{{author}}",
  "license": "{{license}}"
}`,
      },
      {
        path: 'src/app.js',
        content: `/**
 * {{name}} - {{description}}
 * @version {{version}}
 */

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    name: '{{name}}',
    version: '{{version}}',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(\`{{name}} running on http://localhost:\${PORT}\`);
});

module.exports = app;
`,
      },
      {
        path: 'src/routes/.gitkeep',
        content: '',
        optional: true,
      },
      {
        path: 'src/middleware/.gitkeep',
        content: '',
        optional: true,
      },
    ];
  }

  /**
   * CLI 工具模板
   */
  private getCliToolTemplates(): FileTemplate[] {
    return [
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "bin": {
    "{{name}}": "./bin/cli.js"
  },
  "scripts": {
    "start": "node bin/cli.js",
    "test": "node --test"
  },
  "author": "{{author}}",
  "license": "{{license}}",
  "engines": {
    "node": ">=18.0.0"
  }
}`,
      },
      {
        path: 'bin/cli.js',
        content: `#!/usr/bin/env node

/**
 * {{name}} CLI
 * {{description}}
 */

const args = process.argv.slice(2);

function showHelp() {
  console.log(\`
{{name}} v{{version}}

{{description}}

Usage:
  {{name}} [command] [options]

Commands:
  help     Show this help message
  version  Show version number

Options:
  -h, --help     Show help
  -v, --version  Show version

Examples:
  {{name}} help
  {{name}} --version
\`);
}

function showVersion() {
  console.log('{{version}}');
}

// Parse commands
const command = args[0];

switch (command) {
  case 'help':
  case '-h':
  case '--help':
    showHelp();
    break;
  case 'version':
  case '-v':
  case '--version':
    showVersion();
    break;
  default:
    if (command) {
      console.error(\`Unknown command: \${command}\`);
      console.error('Run "{{name}} --help" for usage.');
      process.exit(1);
    } else {
      showHelp();
    }
}
`,
      },
      {
        path: 'README.md',
        content: `# {{name}} CLI

{{description}}

## Installation

\`\`\`bash
npm install -g {{name}}
\`\`\`

## Usage

\`\`\`bash
{{name}} [command] [options]
\`\`\`

## Commands

| Command | Description |
|---------|-------------|
| \`help\` | Show help message |
| \`version\` | Show version number |

## Options

| Option | Description |
|--------|-------------|
| \`-h, --help\` | Show help |
| \`-v, --version\` | Show version |

---

Generated by Axon Code Generator
`,
      },
    ];
  }

  /**
   * 测试套件模板
   */
  private getTestSuiteTemplates(): FileTemplate[] {
    return [
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "{{version}}",
  "scripts": {
    "test": "node --test",
    "test:coverage": "node --test --experimental-test-coverage",
    "test:watch": "node --test --watch"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}`,
      },
      {
        path: 'test/example.test.js',
        content: `/**
 * 示例测试文件
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

describe('Example Test Suite', () => {
  let testData;

  before(() => {
    testData = { value: 42 };
  });

  after(() => {
    testData = null;
  });

  it('should pass basic assertion', () => {
    assert.strictEqual(testData.value, 42);
  });

  it('should handle async operations', async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(true);
  });

  it('should test array operations', () => {
    const arr = [1, 2, 3];
    assert.deepStrictEqual(arr.map(x => x * 2), [2, 4, 6]);
  });
});
`,
      },
      {
        path: 'test/setup.js',
        content: `/**
 * 测试全局配置
 */

// 全局 beforeEach
global.beforeEach = (fn) => {
  // Setup logic
};

// 全局 afterEach
global.afterEach = (fn) => {
  // Teardown logic
};
`,
      },
    ];
  }

  /**
   * Skill 模块模板
   */
  private getSkillModuleTemplates(): FileTemplate[] {
    const skillName = this.kebabCase('{{name}}');
    const className = this.pascalCase('{{name}}');
    
    return [
      {
        path: `src/skills/${skillName}-skill.ts`,
        content: `/**
 * ${className} 技能
 * 
 * 功能:
 * 1. 功能描述 1
 * 2. 功能描述 2
 * 3. 功能描述 3
 * 
 * @module skills/${skillName}
 * @author {{author}}
 * @version {{version}}
 */

// ==================== 类型定义 ====================

/**
 * ${className} 配置选项
 */
export interface ${className}Options {
  /** 配置项 1 */
  option1?: string;
  /** 配置项 2 */
  option2?: number;
}

/**
 * ${className} 结果
 */
export interface ${className}Result {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
}

// ==================== 主类 ====================

/**
 * ${className} 类
 */
export class ${className} {
  private options: Required<${className}Options>;

  constructor(options?: ${className}Options) {
    this.options = {
      option1: 'default',
      option2: 0,
      ...options,
    };
  }

  /**
   * 执行主要功能
   * @param input - 输入参数
   * @returns 执行结果
   */
  async execute(input: string): Promise<${className}Result> {
    try {
      // TODO: Implement your logic here
      const result = {
        success: true,
        data: { input, processed: true },
      };
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ==================== 工具函数 ====================

/**
 * 便捷函数
 * @param input - 输入
 * @param options - 选项
 * @returns 结果
 */
export async function ${this.camelCase(skillName)}(
  input: string,
  options?: ${className}Options
): Promise<${className}Result> {
  const instance = new ${className}(options);
  return instance.execute(input);
}
`,
      },
      {
        path: `src/skills/${skillName}-skill.test.ts`,
        content: `/**
 * ${className} 技能测试
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { ${className} } from './${skillName}-skill';

describe('${className}', () => {
  let instance: ${className};

  before(() => {
    instance = new ${className}();
  });

  it('should initialize with default options', () => {
    assert.ok(instance);
  });

  it('should execute successfully', async () => {
    const result = await instance.execute('test input');
    assert.strictEqual(result.success, true);
    assert.ok(result.data);
  });
});
`,
      },
      {
        path: `src/skills/${skillName}-README.md`,
        content: `# ${className} 技能

{{description}}

## 快速开始

\`\`\`typescript
import { ${className} } from './skills/${skillName}-skill';

const skill = new ${className}();
const result = await skill.execute('input');
\`\`\`

## API

### \`${className}\` 类

#### 构造函数

\`\`\`typescript
new ${className}(options?: ${className}Options)
\`\`\`

#### \`execute(input: string): Promise<${className}Result>\`

执行主要功能。

**参数:**
- \`input\`: 输入字符串

**返回:** Promise<${className}Result>

### 工具函数

\`\`\`typescript
${this.camelCase(skillName)}(input: string, options?: ${className}Options)
\`\`\`

## 示例

\`\`\`typescript
// 使用类
const skill = new ${className}({ option1: 'custom' });
const result = await skill.execute('test');

// 使用工具函数
const result = await ${this.camelCase(skillName)}('test', { option2: 42 });
\`\`\`

---

Generated by Axon Code Generator
`,
      },
    ];
  }

  /**
   * 转 PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * 转 camelCase
   */
  private camelCase(str: string): string {
    const pascal = this.pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * 转 kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();
  }
}

// ==================== 便捷函数 ====================

/**
 * 快速生成单个文件
 */
export async function generateFile(
  filePath: string,
  content: string,
  variables: TemplateVariables = {},
  options?: Partial<TemplateOptions>
): Promise<GenerationResult> {
  const generator = new CodeGenerator(options);
  return generator.generateFile(filePath, content, variables, options);
}

/**
 * 快速生成脚手架
 */
export async function generateScaffold(
  config: ScaffoldConfig,
  options?: Partial<TemplateOptions>
): Promise<GenerationResult[]> {
  const generator = new ScaffoldGenerator(options);
  return generator.generate(config);
}

/**
 * 快速批量生成
 */
export async function batchGenerate(
  config: BatchGenerateConfig
): Promise<BatchGenerateResult> {
  const generator = new CodeGenerator(config.options);
  return generator.batchGenerate(config);
}
