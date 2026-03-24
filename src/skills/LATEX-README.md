# LaTeX 文档处理工具

> LaTeX 公式渲染、格式转换、文档模板生成工具

**版本**: 1.0.0  
**创建时间**: 2026-03-13  
**作者**: KAEL Engineering

---

## 🚀 快速开始

```bash
# 导入模块
import {
  extractLatexFormulas,
  latexToMathML,
  latexToMarkdown,
  generateLatexTemplate
} from './src/skills/latex-utils-skill';
```

---

## ✨ 核心功能

### 1. LaTeX 公式提取

```typescript
const formulas = extractLatexFormulas('公式 $E=mc^2$ 和 $$\\int_0^\\infty e^{-x}dx$$');
// 支持：$...$, $$...$$, \\[...\\], \\(...\\), equation, align 环境
```

### 2. LaTeX 转 MathML

```typescript
const mathml = latexToMathML('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', false);
// 输出可直接嵌入 HTML 的 MathML
```

### 3. LaTeX 转 Markdown

```typescript
const markdown = latexToMarkdown(latexDoc, {
  renderEngine: 'katex'
});
// 转换文档结构、公式、表格、列表等
```

### 4. 文档模板

```typescript
const template = generateLatexTemplate({
  documentClass: 'article',
  packages: ['amsmath', 'graphicx'],
  titleInfo: {
    title: '我的论文',
    author: '张三'
  }
});
```

---

## 📦 安装

无需额外依赖，纯 TypeScript 实现。

```typescript
// 复制文件到项目
cp src/skills/latex-utils-skill.ts your-project/
```

---

## 📖 使用示例

### 提取公式

```typescript
import { extractLatexFormulas } from './latex-utils-skill';

const text = `
  行内公式：$E = mc^2$
  独立公式：$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$
`;

const formulas = extractLatexFormulas(text);
console.log(formulas);
// [
//   { type: 'inline', content: 'E = mc^2', ... },
//   { type: 'display', content: '\\sum_{i=1}^{n} i = ...', ... }
// ]
```

### 生成模板

```typescript
import { getPresetTemplate, generateLatexTemplate } from './latex-utils-skill';

const config = getPresetTemplate('thesis');
config.titleInfo = {
  title: '深度学习研究',
  author: '李明',
  date: '2026 年 3 月'
};

const template = generateLatexTemplate(config);
```

### 格式转换

```typescript
import { latexToMarkdown, validateLatexSyntax } from './latex-utils-skill';

const latex = `
\\documentclass{article}
\\begin{document}
\\section{引言}
公式 $E=mc^2$ 很重要。
\\end{document}
`;

// 验证语法
const validation = validateLatexSyntax(latex);
if (!validation.valid) {
  console.error(validation.errors);
}

// 转换为 Markdown
const markdown = latexToMarkdown(latex);
console.log(markdown);
// # 引言
// 公式 $E=mc^2$ 很重要。
```

---

## 📋 API 参考

| 函数 | 描述 |
|------|------|
| `extractLatexFormulas(text, options)` | 提取文本中的 LaTeX 公式 |
| `latexToMathML(latex, inline)` | LaTeX 公式转 MathML |
| `latexToMarkdown(latex, options)` | LaTeX 文档转 Markdown |
| `generateLatexTemplate(config)` | 生成 LaTeX 模板 |
| `getPresetTemplate(type)` | 获取预设模板配置 |
| `validateLatexSyntax(latex)` | 验证 LaTeX 语法 |
| `formatLatex(latex)` | 格式化 LaTeX 代码 |
| `extractCitations(latex)` | 提取引用列表 |
| `extractLabels(latex)` | 提取标签映射 |

---

## 🎯 应用场景

- ✅ **学术写作**: 生成论文模板、验证语法
- ✅ **在线教育**: 公式渲染、教材转换
- ✅ **文档迁移**: LaTeX → Markdown/HTML
- ✅ **知识管理**: 提取公式、引用、标签
- ✅ **内容发布**: 多格式输出 (网页/打印)

---

## ⚙️ 配置选项

### ParseOptions

```typescript
interface ParseOptions {
  preserveFormat?: boolean;
  extractLabels?: boolean;
  delimiters?: {
    inline?: string[];
    display?: string[];
    bracket?: string[];
    parenthesis?: string[];
  };
}
```

### ConvertOptions

```typescript
interface ConvertOptions {
  target?: 'markdown' | 'html' | 'mathml';
  convertFormulas?: boolean;
  renderEngine?: 'katex' | 'mathjax' | 'asciimath';
  preserveEnvironments?: boolean;
  codeBlockLanguage?: string;
}
```

### TemplateConfig

```typescript
interface TemplateConfig {
  documentClass: LatexDocumentType;
  packages: string[];
  customCommands?: Record<string, string>;
  pageSetup?: {
    margins?: { top: string; bottom: string; left: string; right: string };
    paperSize?: 'a4' | 'letter' | 'legal';
    fontSize?: '10pt' | '11pt' | '12pt';
  };
  titleInfo?: {
    title: string;
    author?: string;
    date?: string;
  };
}
```

---

## 🔧 扩展

### 添加新符号映射

```typescript
// 在 latexToMathML 函数中扩展 symbolMap
const symbolMap: Record<string, string> = {
  // ...现有符号
  '\\newcommand': '自定义符号'
};
```

### 支持新环境

```typescript
// 在 extractLatexFormulas 中添加
const newEnvRegex = /\\begin\{newenv\}([\s\S]*?)\\end\{newenv\}/g;
```

---

## 📝 注意事项

1. **复杂表格**: 当前表格转换为简化 Markdown 格式
2. **自定义命令**: 需要手动处理自定义 LaTeX 命令
3. **BibTeX**: 引用提取支持基础格式，复杂引用需额外处理
4. **图片**: `\includegraphics` 转换为 Markdown 图片语法

---

## 📄 许可证

MIT License

---

## 📚 更多示例

查看完整示例文档：[LATEX-EXAMPLES.md](./LATEX-EXAMPLES.md)

---

**最后更新**: 2026-03-13  
**维护者**: KAEL Engineering Team
