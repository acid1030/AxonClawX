# LaTeX 工具技能使用示例

本文档展示 `latex-utils-skill.ts` 的使用方法和实际案例。

---

## 📦 导入模块

```typescript
import {
  extractLatexFormulas,
  latexToMathML,
  latexToMarkdown,
  generateLatexTemplate,
  getPresetTemplate,
  validateLatexSyntax,
  formatLatex,
  extractCitations,
  extractLabels
} from './src/skills/latex-utils-skill';
```

---

## 1️⃣ LaTeX 公式提取

### 基础示例

```typescript
const text = `
  这是一个行内公式 $E = mc^2$ 和独立公式：
  $$\\int_{0}^{\\infty} e^{-x} dx = 1$$
  
  还有方程环境：
  \\begin{equation}
    F = ma
    \\label{eq:newton}
  \\end{equation}
`;

const formulas = extractLatexFormulas(text);

console.log(formulas);
// 输出:
// [
//   {
//     raw: '$E = mc^2$',
//     type: 'inline',
//     content: 'E = mc^2',
//     position: { start: 15, end: 26 }
//   },
//   {
//     raw: '$$\\int_{0}^{\\infty} e^{-x} dx = 1$$',
//     type: 'display',
//     content: '\\int_{0}^{\\infty} e^{-x} dx = 1',
//     position: { start: 35, end: 74 }
//   },
//   {
//     raw: '\\begin{equation}...\\end{equation}',
//     type: 'equation',
//     content: 'F = ma',
//     label: 'eq:newton',
//     position: { start: 90, end: 150 }
//   }
// ]
```

### 自定义定界符

```typescript
const formulas = extractLatexFormulas(text, {
  delimiters: {
    inline: ['$', '$'],
    display: ['$$', '$$'],
    bracket: ['\\[', '\\]'],
    parenthesis: ['\\(', '\\)']
  },
  extractLabels: true
});
```

---

## 2️⃣ LaTeX 转 MathML

### 基础转换

```typescript
const latex = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
const result = latexToMathML(latex, false);

console.log(result.mathml);
// 输出:
// <math display="block" xmlns="http://www.w3.org/1998/Math/MathML">
//   <mrow>
//     <mfrac>
//       <mrow>-b &#177; <msqrt><mrow>b^2 - 4ac</mrow></msqrt></mrow>
//       <mrow>2a</mrow>
//     </mfrac>
//   </mrow>
// </math>
```

### 行内公式

```typescript
const inline = latexToMathML('E = mc^2', true);
console.log(inline.inline); // true
console.log(inline.semantics); // "E = mc^2"
```

### 复杂公式

```typescript
const complex = `
  \\sum_{i=1}^{n} x_i^2 = 
  \\int_{0}^{\\infty} e^{-x} dx + 
  \\prod_{j=1}^{m} y_j
`;

const mathml = latexToMathML(complex, false);
// 支持：求和、积分、乘积、分数、根号等
```

---

## 3️⃣ LaTeX 转 Markdown

### 完整文档转换

```typescript
const latexDoc = `
\\documentclass{article}
\\title{我的论文}
\\author{张三}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{引言}
这是\\textbf{重要}的研究，公式 $E = mc^2$ 很关键。

\\section{方法}
我们使用了以下公式：
$$\\int_{0}^{\\infty} e^{-x} dx = 1$$

\\begin{itemize}
  \\item 第一步：收集数据
  \\item 第二步：分析结果
  \\item 第三步：得出结论
\\end{itemize}

\\section{结果}
\\begin{table}
\\begin{tabular}{|c|c|}
\\hline
A & B \\\\
\\hline
1 & 2 \\\\
3 & 4 \\\\
\\hline
\\end{tabular}
\\end{table}

\\end{document}
`;

const markdown = latexToMarkdown(latexDoc);

console.log(markdown);
// 输出:
// # 我的论文
// **作者**: 张三
// **日期**: \today
// ---
// 
// # 引言
// 这是**重要**的研究，公式 $E = mc^2$ 很关键。
// 
// # 方法
// 我们使用了以下公式：
// $$\\int_{0}^{\\infty} e^{-x} dx = 1$$
// 
// - 第一步：收集数据
// - 第二步：分析结果
// - 第三步：得出结论
// 
// # 结果
// A | B
// --- | ---
// 1 | 2
// 3 | 4
```

### 自定义转换选项

```typescript
const markdown = latexToMarkdown(latexDoc, {
  target: 'markdown',
  convertFormulas: true,
  renderEngine: 'katex', // 或 'mathjax', 'asciimath'
  preserveEnvironments: false,
  codeBlockLanguage: 'plaintext'
});
```

### 代码块转换

```typescript
const latexWithCode = `
\\begin{verbatim}
def hello():
    print("Hello, World!")
\\end{verbatim}

\\begin{lstlisting}[language=Python]
import numpy as np
arr = np.array([1, 2, 3])
\\end{lstlisting}
`;

const md = latexToMarkdown(latexWithCode);
// 输出:
// ```plaintext
// def hello():
//     print("Hello, World!")
// ```
// 
// ```Python
// import numpy as np
// arr = np.array([1, 2, 3])
// ```
```

---

## 4️⃣ 文档模板生成

### 使用预设模板

```typescript
// 获取文章模板配置
const articleConfig = getPresetTemplate('article');
const articleTemplate = generateLatexTemplate(articleConfig);

console.log(articleTemplate);
// 输出完整的 LaTeX 文章模板
```

### 自定义模板

```typescript
const customConfig = {
  documentClass: 'article' as const,
  packages: ['amsmath', 'graphicx', 'hyperref', 'listings'],
  pageSetup: {
    margins: {
      top: '2.54cm',
      bottom: '2.54cm',
      left: '3.17cm',
      right: '3.17cm'
    },
    paperSize: 'a4' as const,
    fontSize: '12pt' as const
  },
  titleInfo: {
    title: '深度学习在图像识别中的应用',
    author: '李明 \\and 王芳',
    date: '2026 年 3 月'
  },
  customCommands: {
    '\\R': '\\mathbb{R}',
    '\\norm': '\\| \\cdot \\|',
    '\\argmin': '\\mathop{\\mathrm{argmin}}'
  }
};

const template = generateLatexTemplate(customConfig);
```

### 不同文档类型

```typescript
// 学术论文
const article = getPresetTemplate('article');

// 技术报告
const report = getPresetTemplate('report');

// 学位论文
const thesis = getPresetTemplate('thesis');

// 信件
const letter = getPresetTemplate('letter');

// 演示文稿
const beamer = getPresetTemplate('beamer');
```

---

## 5️⃣ 语法验证

```typescript
const validLatex = '\\frac{1}{2} + \\sum_{i=1}^{n} i';
const invalidLatex = '\\frac{1}{2 + \\sum_{i=1}^{n} i'; // 缺少括号

console.log(validateLatexSyntax(validLatex));
// 输出: { valid: true, errors: [] }

console.log(validateLatexSyntax(invalidLatex));
// 输出: { 
//   valid: false, 
//   errors: ['不匹配的括号: { (1) ≠ } (0)'] 
// }
```

---

## 6️⃣ 代码格式化

```typescript
const messyLatex = `
\\documentclass{article}\\begin{document}\\section{引言}这是内容。
\\begin{equation}E = mc^2\\end{equation}\\section{结论}结束。
\\end{document}
`;

const formatted = formatLatex(messyLatex);

console.log(formatted);
// 输出:
// \\documentclass{article}
// 
// \\begin{document}
// 
// \\section{引言}
// 这是内容。
// 
// \\begin{equation}
//   E = mc^2
// \\end{equation}
// 
// \\section{结论}
// 结束。
// 
// \\end{document}
```

---

## 7️⃣ 提取引用和标签

### 提取引用

```typescript
const latexDoc = `
  根据 \\cite{smith2020} 的研究，...
  如 \\citep{johnson2019} 所述，...
  多项研究 \\cite{lee2021, wang2022, zhang2023} 表明...
`;

const citations = extractCitations(latexDoc);

console.log(citations);
// 输出: ['smith2020', 'johnson2019', 'lee2021', 'wang2022', 'zhang2023']
```

### 提取标签

```typescript
const latexDoc = `
  \\section{引言}\\label{sec:intro}
  
  如公式 \\ref{eq:einstein} 所示：
  \\begin{equation}
    E = mc^2
    \\label{eq:einstein}
  \\end{equation}
  
  \\begin{figure}
    \\includegraphics{image.png}
    \\caption{示例图片}
    \\label{fig:example}
  \\end{figure}
`;

const labels = extractLabels(latexDoc);

console.log(labels);
// 输出:
// {
//   'sec:intro': { type: 'section', context: '\\section{引言}\\label{sec:intro}' },
//   'eq:einstein': { type: 'equation', context: '\\begin{equation}...\\label{eq:einstein}' },
//   'fig:example': { type: 'figure', context: '\\begin{figure}...\\label{fig:example}' }
// }
```

---

## 8️⃣ 综合应用示例

### 学术论文工作流

```typescript
import {
  getPresetTemplate,
  generateLatexTemplate,
  latexToMarkdown,
  extractLatexFormulas,
  validateLatexSyntax
} from './src/skills/latex-utils-skill';

// 1. 生成论文模板
const thesisConfig = getPresetTemplate('thesis');
thesisConfig.titleInfo = {
  title: '基于深度学习的图像识别研究',
  author: '张三',
  date: '2026 年 3 月'
};

const template = generateLatexTemplate(thesisConfig);

// 2. 填充内容
const fullDoc = template.replace(
  '% 在此添加您的内容',
  `
  \\section{引言}
  深度学习在图像识别领域取得了巨大成功 \\cite{lecun2015}。
  
  \\section{方法}
  我们提出了一个新的公式：
  $$\\mathcal{L} = -\\sum_{i=1}^{N} y_i \\log(\\hat{y}_i)$$
  
  \\section{实验}
  实验结果如表 \\ref{tab:results} 所示。
  `
);

// 3. 验证语法
const validation = validateLatexSyntax(fullDoc);
if (!validation.valid) {
  console.error('LaTeX 语法错误:', validation.errors);
}

// 4. 提取公式
const formulas = extractLatexFormulas(fullDoc);
console.log(`文档包含 ${formulas.length} 个公式`);

// 5. 转换为 Markdown (用于网页发布)
const markdown = latexToMarkdown(fullDoc, {
  renderEngine: 'katex'
});

// 6. 保存结果
import { writeFileSync } from 'fs';
writeFileSync('thesis.md', markdown);
console.log('✅ 论文已转换为 Markdown');
```

### 公式渲染器

```typescript
import { extractLatexFormulas, latexToMathML } from './src/skills/latex-utils-skill';

function renderLatexToHTML(latexDoc: string): string {
  // 提取所有公式
  const formulas = extractLatexFormulas(latexDoc);
  
  // 转换为 HTML
  let html = latexDoc;
  
  formulas.forEach((formula, index) => {
    const mathml = latexToMathML(formula.content, formula.type === 'inline');
    const placeholder = `__MATHML_${index}__`;
    
    // 替换公式为占位符
    html = html.replace(formula.raw, placeholder);
    
    // 替换占位符为 MathML
    html = html.replace(placeholder, mathml.mathml);
  });
  
  return html;
}

// 使用示例
const latex = '二次方程的解为 $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$';
const html = renderLatexToHTML(latex);
console.log(html);
```

---

## 9️⃣ 实际应用场景

### 场景 1: 学术写作辅助

```typescript
// 帮助作者从 LaTeX 草稿生成 Markdown 版本用于在线分享
const draft = readFileSync('paper_draft.tex', 'utf-8');
const markdown = latexToMarkdown(draft);
writeFileSync('paper_preview.md', markdown);
```

### 场景 2: 教育平台公式渲染

```typescript
// 将教材中的 LaTeX 公式转换为 MathML 用于网页显示
const textbook = readFileSync('math_textbook.tex', 'utf-8');
const formulas = extractLatexFormulas(textbook);

formulas.forEach(formula => {
  const mathml = latexToMathML(formula.content, formula.type === 'inline');
  // 将 MathML 嵌入到 HTML 教材中
});
```

### 场景 3: 文档迁移工具

```typescript
// 将整个 LaTeX 项目迁移到 Markdown
const files = readdirSync('latex_project');
files.forEach(file => {
  if (file.endsWith('.tex')) {
    const latex = readFileSync(`latex_project/${file}`, 'utf-8');
    const markdown = latexToMarkdown(latex);
    writeFileSync(`markdown_project/${file.replace('.tex', '.md')}`, markdown);
  }
});
```

---

## 📊 API 参考

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `extractLatexFormulas` | 提取文本中的 LaTeX 公式 | `text: string`, `options?: ParseOptions` | `LatexFormula[]` |
| `latexToMathML` | LaTeX 转 MathML | `latex: string`, `inline?: boolean` | `MathMLOutput` |
| `latexToMarkdown` | LaTeX 文档转 Markdown | `latex: string`, `options?: ConvertOptions` | `string` |
| `generateLatexTemplate` | 生成 LaTeX 模板 | `config: TemplateConfig` | `string` |
| `getPresetTemplate` | 获取预设模板 | `type: string` | `TemplateConfig` |
| `validateLatexSyntax` | 验证 LaTeX 语法 | `latex: string` | `{ valid: boolean, errors: string[] }` |
| `formatLatex` | 格式化 LaTeX 代码 | `latex: string` | `string` |
| `extractCitations` | 提取引用 | `latex: string` | `string[]` |
| `extractLabels` | 提取标签 | `latex: string` | `Record<string, ...>` |

---

## ⚡ 性能提示

1. **批量处理**: 对于大量文档，使用并行处理
2. **缓存结果**: 对相同公式的 MathML 转换结果进行缓存
3. **流式处理**: 对于大型文档，使用流式解析
4. **正则优化**: 复杂文档可能需要优化正则表达式

---

## 🐛 常见问题

### Q: 如何处理复杂的数学环境？
A: 当前版本支持 `equation`、`align`、`gather`、`multline` 环境。如需更多支持，可扩展 `extractLatexFormulas` 函数。

### Q: 表格转换不准确怎么办？
A: 当前表格转换为简化 Markdown 格式。复杂表格建议手动调整或使用专业转换工具。

### Q: 如何自定义公式渲染？
A: 修改 `latexToMathML` 中的 `symbolMap` 添加更多符号映射，或集成 KaTeX/MathJS 库。

---

**创建时间**: 2026-03-13  
**版本**: 1.0.0  
**作者**: KAEL Engineering
