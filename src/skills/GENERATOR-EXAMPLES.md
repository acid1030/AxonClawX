# Generator Utils 技能 - 使用示例

代码生成器工具集，提供模板代码生成、脚手架生成和批量生成功能。

## 快速开始

```typescript
import {
  CodeGenerator,
  ScaffoldGenerator,
  generateFile,
  generateScaffold,
  batchGenerate,
} from './skills/generator-utils-skill';
```

---

## 1. 模板代码生成

### 1.1 生成单个文件

```typescript
import { generateFile } from './skills/generator-utils-skill';

// 简单文件生成
const result = await generateFile(
  'hello.txt',
  'Hello, {{name}}!',
  { name: 'Axon' }
);

console.log(result);
// {
//   filePath: '/path/to/generated/hello.txt',
//   success: true,
//   size: 14,
//   duration: 5
// }
```

### 1.2 使用 CodeGenerator 类

```typescript
import { CodeGenerator } from './skills/generator-utils-skill';

const generator = new CodeGenerator({
  outputDir: './output',
  overwrite: true,
  prefix: '{{',
  suffix: '}}',
});

// 生成 TypeScript 文件
await generator.generateFile(
  'src/utils/{{className}}.ts',
  `/**
 * {{className}} 工具类
 */
export class {{className}} {
  private value: number = {{initialValue}};
  
  getValue(): number {
    return this.value;
  }
}
`,
  {
    className: 'MathUtils',
    initialValue: 42,
  }
);

// 生成文件：./output/src/utils/MathUtils.ts
```

### 1.3 生成多个文件

```typescript
import { CodeGenerator, type FileTemplate } from './skills/generator-utils-skill';

const generator = new CodeGenerator();

const templates: FileTemplate[] = [
  {
    path: 'src/index.ts',
    content: `export * from './{{name}}';`,
  },
  {
    path: 'src/{{name}}.ts',
    content: `export const version = '{{version}}';`,
  },
  {
    path: 'package.json',
    content: `{
  "name": "{{name}}",
  "version": "{{version}}"
}`,
  },
  {
    path: 'README.md',
    content: `# {{name}}\n\nVersion: {{version}}`,
    // 条件生成
    condition: (vars) => vars.name !== 'internal-tool',
  },
];

const results = await generator.generateFiles(
  templates,
  {
    name: 'my-awesome-lib',
    version: '1.0.0',
  }
);

results.forEach(result => {
  console.log(`${result.filePath}: ${result.success ? '✓' : '✗'}`);
});
```

### 1.4 使用回调函数

```typescript
import { CodeGenerator } from './skills/generator-utils-skill';

const generator = new CodeGenerator({
  beforeGenerate: async (filePath, content) => {
    console.log(`Generating: ${filePath}`);
    // 可以在这里修改内容
  },
  afterGenerate: async (filePath) => {
    console.log(`Generated: ${filePath}`);
    // 可以在这里执行后续操作 (如 chmod)
  },
});

await generator.generateFile(
  'script.sh',
  '#!/bin/bash\necho "{{message}}"',
  { message: 'Hello World' }
);
```

---

## 2. 脚手架生成

### 2.1 生成 Node.js 应用

```typescript
import { generateScaffold } from './skills/generator-utils-skill';

const results = await generateScaffold({
  name: 'my-node-app',
  description: 'My awesome Node.js application',
  version: '1.0.0',
  author: 'Axon',
  license: 'MIT',
  type: 'node-app',
});

// 生成文件:
// - my-node-app/package.json
// - my-node-app/src/index.js
// - my-node-app/README.md
// - my-node-app/.gitignore
```

### 2.2 生成 TypeScript 库

```typescript
import { ScaffoldGenerator } from './skills/generator-utils-skill';

const generator = new ScaffoldGenerator();

const results = await generator.generate({
  name: '@axon/math-utils',
  description: 'Mathematical utility functions',
  version: '2.0.0',
  author: 'Axon Team',
  license: 'Apache-2.0',
  type: 'typescript-lib',
  extras: {
    keywords: ['math', 'utils', 'typescript'],
    repository: 'https://github.com/axon/math-utils',
  },
});

// 生成文件:
// - @axon/math-utils/package.json
// - @axon/math-utils/tsconfig.json
// - @axon/math-utils/src/index.ts
// - @axon/math-utils/README.md
```

### 2.3 生成 React 组件

```typescript
import { generateScaffold } from './skills/generator-utils-skill';

await generateScaffold({
  name: 'user-profile',
  description: 'User profile display component',
  author: 'Frontend Team',
  type: 'react-component',
});

// 生成文件:
// - src/components/UserProfile.tsx
// - src/components/UserProfile.test.tsx
// - src/components/index.ts
```

### 2.4 生成 Express API

```typescript
import { generateScaffold } from './skills/generator-utils-skill';

await generateScaffold({
  name: 'rest-api',
  description: 'RESTful API service',
  version: '1.0.0',
  type: 'express-api',
});

// 生成文件:
// - rest-api/package.json
// - rest-api/src/app.js
// - rest-api/src/routes/.gitkeep
// - rest-api/src/middleware/.gitkeep
```

### 2.5 生成 CLI 工具

```typescript
import { generateScaffold } from './skills/generator-utils-skill';

await generateScaffold({
  name: 'deploy-cli',
  description: 'Deployment command-line tool',
  author: 'DevOps Team',
  type: 'cli-tool',
});

// 生成文件:
// - deploy-cli/package.json
// - deploy-cli/bin/cli.js
// - deploy-cli/README.md
```

### 2.6 生成 Skill 模块

```typescript
import { generateScaffold } from './skills/generator-utils-skill';

await generateScaffold({
  name: 'data-validator',
  description: 'Data validation utilities',
  author: 'KAEL',
  version: '1.0.0',
  type: 'skill-module',
});

// 生成文件:
// - src/skills/data-validator-skill.ts
// - src/skills/data-validator-skill.test.ts
// - src/skills/data-validator-README.md
```

---

## 3. 批量生成

### 3.1 批量生成多个模块

```typescript
import { batchGenerate, type BatchGenerateConfig } from './skills/generator-utils-skill';

const config: BatchGenerateConfig = {
  templates: [
    {
      path: 'src/modules/{{moduleName}}/index.ts',
      content: `export * from './{{moduleName}}-service';`,
    },
    {
      path: 'src/modules/{{moduleName}}/{{moduleName}}-service.ts',
      content: `export class {{moduleName | capitalize}}Service {
  async process(data: any): Promise<any> {
    // TODO: Implement logic
    return data;
  }
}
`,
    },
    {
      path: 'src/modules/{{moduleName}}/{{moduleName}}-service.test.ts',
      content: `import { {{moduleName | capitalize}}Service } from './{{moduleName}}-service';

describe('{{moduleName | capitalize}}Service', () => {
  it('should process data', async () => {
    const service = new {{moduleName | capitalize}}Service();
    const result = await service.process({ test: true });
    expect(result).toBeDefined();
  });
});
`,
    },
  ],
  variableSets: [
    { moduleName: 'user' },
    { moduleName: 'order' },
    { moduleName: 'product' },
    { moduleName: 'payment' },
    { moduleName: 'notification' },
  ],
  outputRoot: './src/modules',
  options: {
    overwrite: false,
    createDirs: true,
  },
  parallel: true,
  concurrency: 3,
};

const result = await batchGenerate(config);

console.log(`
批量生成完成:
- 总文件数：${result.total}
- 成功：${result.success}
- 失败：${result.failed}
- 耗时：${result.duration}ms
`);

// 生成文件:
// - src/modules/user/index.ts
// - src/modules/user/user-service.ts
// - src/modules/user/user-service.test.ts
// - src/modules/order/index.ts
// - src/modules/order/order-service.ts
// - ... (共 15 个文件)
```

### 3.2 批量生成 API 端点

```typescript
import { CodeGenerator } from './skills/generator-utils-skill';

const generator = new CodeGenerator();

const endpoints = [
  { resource: 'users', path: '/api/users' },
  { resource: 'posts', path: '/api/posts' },
  { resource: 'comments', path: '/api/comments' },
  { resource: 'tags', path: '/api/tags' },
];

const templates = [
  {
    path: 'src/routes/{{resource}}.ts',
    content: `import express from 'express';

const router = express.Router();

// GET {{path}}
router.get('/', async (req, res) => {
  // TODO: List {{resource}}
  res.json([]);
});

// POST {{path}}
router.post('/', async (req, res) => {
  // TODO: Create {{resource}}
  res.status(201).json({});
});

// GET {{path}}/:id
router.get('/:id', async (req, res) => {
  // TODO: Get {{resource}} by ID
  res.json({});
});

// PUT {{path}}/:id
router.put('/:id', async (req, res) => {
  // TODO: Update {{resource}}
  res.json({});
});

// DELETE {{path}}/:id
router.delete('/:id', async (req, res) => {
  // TODO: Delete {{resource}}
  res.status(204).send();
});

export default router;
`,
  },
];

const results = await generator.generateFiles(
  templates,
  {},
  { outputDir: './src' }
);
```

### 3.3 批量生成数据库模型

```typescript
import { batchGenerate } from './skills/generator-utils-skill';

const models = [
  { name: 'User', table: 'users', fields: 'id, name, email, createdAt' },
  { name: 'Post', table: 'posts', fields: 'id, title, content, authorId, createdAt' },
  { name: 'Comment', table: 'comments', fields: 'id, content, postId, userId, createdAt' },
  { name: 'Tag', table: 'tags', fields: 'id, name, color' },
];

await batchGenerate({
  templates: [
    {
      path: 'src/models/{{name}}.ts',
      content: `import { Model } from 'sequelize';

export class {{name}} extends Model {
  declare id: number;
  {{#each fields}}
  declare {{this}}: any;
  {{/each}}
  
  static associate(models: any) {
    // Define associations here
  }
}
`,
    },
    {
      path: 'src/migrations/create-{{table}}.sql',
      content: `CREATE TABLE {{table}} (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`,
    },
  ],
  variableSets: models,
  outputRoot: './src',
  parallel: true,
});
```

---

## 4. 高级用法

### 4.1 自定义模板引擎

```typescript
import { TemplateEngine } from './skills/generator-utils-skill';

const engine = new TemplateEngine('<%', '%>');

const template = `
Hello, <%name%>!
You are <%age%> years old.
Your hobbies: <%hobbies%>
`;

const result = engine.render(template, {
  name: 'Axon',
  age: 30,
  hobbies: ['coding', 'reading', 'gaming'],
});

console.log(result);
// Hello, Axon!
// You are 30 years old.
// Your hobbies: ["coding", "reading", "gaming"]
```

### 4.2 动态内容生成

```typescript
import { CodeGenerator, type FileTemplate } from './skills/generator-utils-skill';

const generator = new CodeGenerator();

const templates: FileTemplate[] = [
  {
    path: 'src/config.ts',
    // 使用函数动态生成内容
    content: (vars) => {
      const envVars = vars.environments as string[];
      return `
export const config = {
  environments: ${JSON.stringify(envVars)},
  variables: {
    ${envVars.map(env => `${env}: process.env.${env.toUpperCase()}`).join(',\n    ')}
  }
};
`;
    },
  },
];

await generator.generateFiles(
  templates,
  {
    environments: ['dev', 'staging', 'prod'],
  }
);
```

### 4.3 条件生成

```typescript
import { CodeGenerator, type FileTemplate } from './skills/generator-utils-skill';

const templates: FileTemplate[] = [
  {
    path: 'src/index.ts',
    content: `export * from './main';`,
  },
  {
    path: 'src/main.ts',
    content: `// Main module`,
  },
  {
    path: 'src/test.ts',
    content: `// Test module`,
    optional: true,
    // 仅在开发环境生成测试文件
    condition: (vars) => vars.environment === 'development',
  },
  {
    path: 'src/docker-compose.yml',
    content: `version: '3'`,
    optional: true,
    // 仅在启用 Docker 时生成
    condition: (vars) => vars.enableDocker === true,
  },
];

await generator.generateFiles(
  templates,
  {
    environment: 'production',
    enableDocker: true,
  }
);
// 只生成 index.ts, main.ts, docker-compose.yml
```

### 4.4 错误处理

```typescript
import { CodeGenerator } from './skills/generator-utils-skill';

const generator = new CodeGenerator({
  overwrite: false, // 不覆盖已存在文件
});

const result = await generator.generateFile(
  'existing-file.txt',
  'New content',
  {}
);

if (!result.success) {
  console.error(`生成失败: ${result.error}`);
  // 输出：生成失败：File already exists and overwrite is disabled
}

// 处理多个文件的错误
const results = await generator.generateFiles(templates, variables);

const failed = results.filter(r => !r.success);
if (failed.length > 0) {
  console.warn(`有 ${failed.length} 个文件生成失败:`);
  failed.forEach(r => {
    console.warn(`  - ${r.filePath}: ${r.error}`);
  });
}
```

---

## 5. 实际应用场景

### 5.1 创建微服务集群

```typescript
import { batchGenerate } from './skills/generator-utils-skill';

const services = [
  { name: 'user-service', port: 3001, db: 'users' },
  { name: 'order-service', port: 3002, db: 'orders' },
  { name: 'payment-service', port: 3003, db: 'payments' },
  { name: 'notification-service', port: 3004, db: 'notifications' },
];

await batchGenerate({
  templates: [
    {
      path: '{{name}}/package.json',
      content: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  }
}`,
    },
    {
      path: '{{name}}/src/index.ts',
      content: `const express = require('express');
const app = express();
const PORT = {{port}};

app.get('/health', (req, res) => {
  res.json({ service: '{{name}}', status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(\`{{name}} running on port \${PORT}\`);
});
`,
    },
    {
      path: '{{name}}/docker-compose.yml',
      content: `version: '3'
services:
  {{name}}:
    build: .
    ports:
      - "{{port}}:{{port}}"
    environment:
      - DB_NAME={{db}}
`,
    },
  ],
  variableSets: services,
  outputRoot: './services',
  parallel: true,
});
```

### 5.2 生成 CRUD 操作

```typescript
import { CodeGenerator } from './skills/generator-utils-skill';

const generator = new CodeGenerator();

const resources = ['User', 'Post', 'Comment', 'Tag'];

for (const resource of resources) {
  await generator.generateFile(
    `src/controllers/${resource.toLowerCase()}-controller.ts`,
    `import { Request, Response } from 'express';
import { {{resource}}Service } from '../services/{{resource}}-service';

const service = new {{resource}}Service();

export class {{resource}}Controller {
  async list(req: Request, res: Response) {
    const items = await service.findAll();
    res.json(items);
  }

  async get(req: Request, res: Response) {
    const item = await service.findById(req.params.id);
    res.json(item);
  }

  async create(req: Request, res: Response) {
    const item = await service.create(req.body);
    res.status(201).json(item);
  }

  async update(req: Request, res: Response) {
    const item = await service.update(req.params.id, req.body);
    res.json(item);
  }

  async delete(req: Request, res: Response) {
    await service.delete(req.params.id);
    res.status(204).send();
  }
}
`,
    { resource }
  );
}
```

### 5.3 生成国际化文件

```typescript
import { batchGenerate } from './skills/generator-utils-skill';

const locales = [
  { code: 'en', name: 'English', hello: 'Hello', goodbye: 'Goodbye' },
  { code: 'zh', name: '中文', hello: '你好', goodbye: '再见' },
  { code: 'ja', name: '日本語', hello: 'こんにちは', goodbye: 'さようなら' },
  { code: 'ko', name: '한국어', hello: '안녕하세요', goodbye: '안녕히 가세요' },
];

await batchGenerate({
  templates: [
    {
      path: 'locales/{{code}}.json',
      content: `{
  "name": "{{name}}",
  "messages": {
    "hello": "{{hello}}",
    "goodbye": "{{goodbye}}"
  }
}`,
    },
  ],
  variableSets: locales,
  outputRoot: './locales',
  parallel: true,
});

// 生成:
// - locales/en.json
// - locales/zh.json
// - locales/ja.json
// - locales/ko.json
```

---

## 6. 性能优化

### 6.1 控制并发数量

```typescript
import { batchGenerate } from './skills/generator-utils-skill';

// 大量文件生成时控制并发
await batchGenerate({
  templates: [...],
  variableSets: Array(100).fill({}).map((_, i) => ({ id: i })),
  outputRoot: './generated',
  parallel: true,
  concurrency: 5, // 限制同时生成 5 个文件
});
```

### 6.2 串行生成 (避免资源竞争)

```typescript
await batchGenerate({
  templates: [...],
  variableSets: [...],
  outputRoot: './generated',
  parallel: false, // 串行生成
});
```

---

## 7. 最佳实践

### 7.1 使用版本控制

```typescript
// 在生成文件前检查 Git 状态
import { execSync } from 'child_process';

try {
  execSync('git diff --quiet', { stdio: 'ignore' });
} catch {
  console.warn('工作区有未提交的更改，建议先提交');
}
```

### 7.2 添加 .gitkeep 文件

```typescript
const templates: FileTemplate[] = [
  {
    path: 'src/routes/.gitkeep',
    content: '', // 空文件保持目录
    optional: true,
  },
];
```

### 7.3 使用 .gitignore

```typescript
await generator.generateFile(
  '.gitignore',
  `node_modules/
dist/
*.log
.env
.generated/
`,
  {}
);
```

---

## API 参考

### 类型定义

- `TemplateVariables` - 模板变量映射
- `TemplateOptions` - 模板配置选项
- `GenerationResult` - 单个文件生成结果
- `ScaffoldConfig` - 脚手架配置
- `ScaffoldType` - 脚手架类型
- `FileTemplate` - 文件模板定义
- `BatchGenerateConfig` - 批量生成配置
- `BatchGenerateResult` - 批量生成结果

### 类

- `TemplateEngine` - 模板渲染引擎
- `CodeGenerator` - 代码生成器
- `ScaffoldGenerator` - 脚手架生成器

### 便捷函数

- `generateFile()` - 生成单个文件
- `generateScaffold()` - 生成脚手架
- `batchGenerate()` - 批量生成

---

Generated by Axon Code Generator
Version: 1.0.0
