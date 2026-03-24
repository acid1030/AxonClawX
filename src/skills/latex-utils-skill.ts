/**
 * LaTeX 文档处理工具技能
 * 
 * 功能:
 * 1. LaTeX 公式渲染 - 将 LaTeX 公式转换为 MathML/HTML
 * 2. LaTeX 转 Markdown - 转换 LaTeX 文档为 Markdown 格式
 * 3. 文档模板 - 提供常用 LaTeX 文档模板
 * 
 * @module skills/latex-utils
 */

// ==================== 类型定义 ====================

/**
 * LaTeX 公式类型
 */
export type LatexFormulaType =
  | 'inline'      // 行内公式 $...$
  | 'display'     // 独立公式 $$...$$
  | 'equation'    // 方程环境
  | 'align'       // 对齐环境
  | 'gather'      // 居中环境
  | 'multline';   // 多行环境

/**
 * LaTeX 文档类型
 */
export type LatexDocumentType =
  | 'article'
  | 'report'
  | 'book'
  | 'beamer'
  | 'letter'
  | 'memoir';

/**
 * 公式解析结果
 */
export interface LatexFormula {
  /** 原始 LaTeX 代码 */
  raw: string;
  /** 公式类型 */
  type: LatexFormulaType;
  /** 内容 (去除定界符) */
  content: string;
  /** 在原文中的位置 */
  position: { start: number; end: number };
  /** 标签/编号 (如果有) */
  label?: string;
}

/**
 * 解析选项
 */
export interface ParseOptions {
  /** 是否保留原始格式 */
  preserveFormat?: boolean;
  /** 是否提取标签 */
  extractLabels?: boolean;
  /** 公式定界符配置 */
  delimiters?: {
    inline?: string[];      // 默认: ['$', '$']
    display?: string[];     // 默认: ['$$', '$$']
    bracket?: string[];     // 默认: ['\\[', '\\]']
    parenthesis?: string[]; // 默认: ['\\(', '\\)']
  };
}

/**
 * 转换选项
 */
export interface ConvertOptions {
  /** 目标格式 */
  target?: 'markdown' | 'html' | 'mathml';
  /** 是否转换公式 */
  convertFormulas?: boolean;
  /** 公式渲染引擎 */
  renderEngine?: 'katex' | 'mathjax' | 'asciimath';
  /** 是否保留 LaTeX 环境 */
  preserveEnvironments?: boolean;
  /** 代码块语言标识 */
  codeBlockLanguage?: string;
}

/**
 * LaTeX 模板配置
 */
export interface TemplateConfig {
  /** 文档类型 */
  documentClass: LatexDocumentType;
  /** 使用的宏包 */
  packages: string[];
  /** 自定义命令 */
  customCommands?: Record<string, string>;
  /** 页面设置 */
  pageSetup?: {
    margins?: { top: string; bottom: string; left: string; right: string };
    paperSize?: 'a4' | 'letter' | 'legal';
    fontSize?: '10pt' | '11pt' | '12pt';
  };
  /** 标题信息 */
  titleInfo?: {
    title: string;
    author?: string;
    date?: string;
  };
}

/**
 * MathML 输出
 */
export interface MathMLOutput {
  /** MathML 字符串 */
  mathml: string;
  /** 行内模式 */
  inline: boolean;
  /** 语义注释 */
  semantics?: string;
}

// ==================== 公式解析器 ====================

/**
 * 从文本中提取 LaTeX 公式
 * @param text - 包含 LaTeX 公式的文本
 * @param options - 解析选项
 * @returns 公式数组
 */
export function extractLatexFormulas(text: string, options: ParseOptions = {}): LatexFormula[] {
  const formulas: LatexFormula[] = [];
  const delimiters = {
    inline: options.delimiters?.inline || ['$', '$'],
    display: options.delimiters?.display || ['$$', '$$'],
    bracket: options.delimiters?.bracket || ['\\[', '\\]'],
    parenthesis: options.delimiters?.parenthesis || ['\\(', '\\)']
  };

  // 提取独立公式 ($$...$$)
  const displayRegex = /(\$\$)([\s\S]*?)(\$\$)/g;
  let match: RegExpExecArray | null;
  
  while ((match = displayRegex.exec(text)) !== null) {
    formulas.push({
      raw: match[0],
      type: 'display',
      content: match[2],
      position: { start: match.index, end: match.index + match[0].length }
    });
  }

  // 提取行内公式 ($...$) - 排除 $$
  const inlineRegex = /(?<!\$)\$(?!\$)([\s\S]*?)(?<!\$)\$(?!\$)/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    formulas.push({
      raw: match[0],
      type: 'inline',
      content: match[1],
      position: { start: match.index, end: match.index + match[0].length }
    });
  }

  // 提取 \[...\] 公式
  const bracketRegex = /(\\\[)([\s\S]*?)(\\\])/g;
  while ((match = bracketRegex.exec(text)) !== null) {
    formulas.push({
      raw: match[0],
      type: 'display',
      content: match[2],
      position: { start: match.index, end: match.index + match[0].length }
    });
  }

  // 提取 \(...\) 公式
  const parenRegex = /(\\\()([\s\S]*?)(\\\))/g;
  while ((match = parenRegex.exec(text)) !== null) {
    formulas.push({
      raw: match[0],
      type: 'inline',
      content: match[2],
      position: { start: match.index, end: match.index + match[0].length }
    });
  }

  // 提取 equation 环境
  const equationRegex = /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g;
  while ((match = equationRegex.exec(text)) !== null) {
    const labelMatch = match[1].match(/\\label\{([^}]+)\}/);
    formulas.push({
      raw: match[0],
      type: 'equation',
      content: match[1].replace(/\\label\{[^}]+\}/g, '').trim(),
      position: { start: match.index, end: match.index + match[0].length },
      label: labelMatch ? labelMatch[1] : undefined
    });
  }

  // 提取 align 环境
  const alignRegex = /\\begin\{align\}([\s\S]*?)\\end\{align\}/g;
  while ((match = alignRegex.exec(text)) !== null) {
    const labelMatch = match[1].match(/\\label\{([^}]+)\}/);
    formulas.push({
      raw: match[0],
      type: 'align',
      content: match[1].replace(/\\label\{[^}]+\}/g, '').trim(),
      position: { start: match.index, end: match.index + match[0].length },
      label: labelMatch ? labelMatch[1] : undefined
    });
  }

  // 按位置排序
  return formulas.sort((a, b) => a.position.start - b.position.start);
}

/**
 * 将 LaTeX 公式转换为 MathML
 * @param latex - LaTeX 公式代码
 * @param inline - 是否为行内公式
 * @returns MathML 输出
 */
export function latexToMathML(latex: string, inline: boolean = true): MathMLOutput {
  // 清理 LaTeX 代码
  const cleaned = latex.trim();
  
  // 基本转换映射
  const symbolMap: Record<string, string> = {
    // 希腊字母
    '\\alpha': '&alpha;', '\\beta': '&beta;', '\\gamma': '&gamma;',
    '\\delta': '&delta;', '\\epsilon': '&epsilon;', '\\zeta': '&zeta;',
    '\\eta': '&eta;', '\\theta': '&theta;', '\\iota': '&iota;',
    '\\kappa': '&kappa;', '\\lambda': '&lambda;', '\\mu': '&mu;',
    '\\nu': '&nu;', '\\xi': '&xi;', '\\pi': '&pi;',
    '\\rho': '&rho;', '\\sigma': '&sigma;', '\\tau': '&tau;',
    '\\upsilon': '&upsilon;', '\\phi': '&phi;', '\\chi': '&chi;',
    '\\psi': '&psi;', '\\omega': '&omega;',
    
    // 运算符
    '\\times': '&#215;', '\\div': '&#247;', '\\pm': '&#177;',
    '\\leq': '&#8804;', '\\geq': '&#8805;', '\\neq': '&#8800;',
    '\\approx': '&#8776;', '\\equiv': '&#8801;', '\\infty': '&#8734;',
    
    // 关系符
    '\\subset': '&#8834;', '\\supset': '&#8835;', '\\in': '&#8712;',
    '\\notin': '&#8713;', '\\cup': '&#8746;', '\\cap': '&#8745;',
    
    // 箭头
    '\\rightarrow': '&#8594;', '\\leftarrow': '&#8592;',
    '\\Rightarrow': '&#8658;', '\\Leftarrow': '&#8656;',
    '\\leftrightarrow': '&#8596;', '\\Leftrightarrow': '&#8660;',
    
    // 其他符号
    '\\partial': '&#8706;', '\\nabla': '&#8711;', '\\forall': '&#8704;',
    '\\exists': '&#8707;', '\\neg': '&#172;', '\\wedge': '&#8743;',
    '\\vee': '&#8744;', '\\int': '&#8747;', '\\sum': '&#8721;',
    '\\prod': '&#8719;', '\\oint': '&#8750;'
  };

  // 替换符号
  let mathmlContent = cleaned;
  Object.entries(symbolMap).forEach(([latex, mathml]) => {
    mathmlContent = mathmlContent.replace(new RegExp(latex, 'g'), mathml);
  });

  // 处理上标
  mathmlContent = mathmlContent.replace(/\^(.+?)\}/g, '<msup><mi></mi><mn>$1</mn></msup>');
  
  // 处理下标
  mathmlContent = mathmlContent.replace(/_(.+?)\}/g, '<msub><mi></mi><mn>$1</mn></msub>');
  
  // 处理分数
  const fracRegex = /\\frac\{([^}]+)\}\{([^}]+)\}/g;
  mathmlContent = mathmlContent.replace(fracRegex, '<mfrac><mrow>$1</mrow><mrow>$2</mrow></mfrac>');
  
  // 处理平方根
  const sqrtRegex = /\\sqrt\{([^}]+)\}/g;
  mathmlContent = mathmlContent.replace(sqrtRegex, '<msqrt><mrow>$1</mrow></msqrt>');
  
  // 处理文本
  mathmlContent = mathmlContent.replace(/\\text\{([^}]+)\}/g, '<mtext>$1</mtext>');

  // 生成 MathML
  const tag = inline ? 'math' : 'math display="block"';
  const mathml = `<${tag} xmlns="http://www.w3.org/1998/Math/MathML">
  <mrow>${mathmlContent}</mrow>
</${tag}>`;

  return {
    mathml,
    inline,
    semantics: cleaned
  };
}

// ==================== LaTeX 转 Markdown ====================

/**
 * 将 LaTeX 文档转换为 Markdown
 * @param latex - LaTeX 文档内容
 * @param options - 转换选项
 * @returns Markdown 字符串
 */
export function latexToMarkdown(latex: string, options: ConvertOptions = {}): string {
  const target = options.target || 'markdown';
  const convertFormulas = options.convertFormulas !== false;
  const renderEngine = options.renderEngine || 'katex';
  
  let markdown = latex;

  // 1. 转换文档结构
  markdown = convertDocumentStructure(markdown);

  // 2. 转换标题
  markdown = markdown.replace(/\\section\*?\{([^}]+)\}/g, '# $1\n');
  markdown = markdown.replace(/\\subsection\*?\{([^}]+)\}/g, '## $1\n');
  markdown = markdown.replace(/\\subsubsection\*?\{([^}]+)\}/g, '### $1\n');
  markdown = markdown.replace(/\\paragraph\*?\{([^}]+)\}/g, '#### $1\n');

  // 3. 转换文本格式
  markdown = markdown.replace(/\\textbf\{([^}]+)\}/g, '**$1**');
  markdown = markdown.replace(/\\textit\{([^}]+)\}/g, '*$1*');
  markdown = markdown.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
  markdown = markdown.replace(/\\emph\{([^}]+)\}/g, '*$1*');

  // 4. 转换列表
  markdown = markdown.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, content) => {
    return content.replace(/\\item\s*/g, '- ').replace(/\\par/g, '\n');
  });
  
  markdown = markdown.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, content) => {
    let counter = 1;
    return content.replace(/\\item\s*/g, () => `${counter++}. `).replace(/\\par/g, '\n');
  });

  // 5. 转换代码块
  const codeLang = options.codeBlockLanguage || 'text';
  markdown = markdown.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, 
    `\`\`\`${codeLang}\n$1\`\`\``);
  
  markdown = markdown.replace(/\\begin\{lstlisting\}\[language=([^\]]+)\]([\s\S]*?)\\end\{lstlisting\}/g,
    '```$1\n$2```');

  // 6. 转换公式
  if (convertFormulas) {
    // 独立公式
    markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
      if (renderEngine === 'katex') {
        return `$$${formula.trim()}$$`;
      } else if (renderEngine === 'mathjax') {
        return `\\[${formula.trim()}\\]`;
      }
      return `$${formula.trim()}$`;
    });

    // 行内公式
    markdown = markdown.replace(/(?<!\$)\$(?!\$)([\s\S]*?)(?<!\$)\$(?!\$)/g, (_, formula) => {
      return `$${formula.trim()}$`;
    });

    // equation 环境
    markdown = markdown.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, 
      '$$ $1 $$');
    
    // align 环境
    markdown = markdown.replace(/\\begin\{align\}([\s\S]*?)\\end\{align\}/g, 
      '$$ $1 $$');
  }

  // 7. 转换引用
  markdown = markdown.replace(/\\cite\{([^}]+)\}/g, '[$1]');
  markdown = markdown.replace(/\\ref\{([^}]+)\}/g, '[$1]');
  markdown = markdown.replace(/\\label\{([^}]+)\}/g, '<a id="$1"></a>');

  // 8. 转换表格 (简化版)
  markdown = markdown.replace(/\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g, 
    (_, content) => {
      const rows = content.split('\\\\').map(row => 
        row.replace(/^\\hline\s*/, '').split('&').map(cell => cell.trim())
      );
      
      if (rows.length === 0) return '';
      
      const header = rows[0];
      const separator = header.map(() => '---').join(' | ');
      const body = rows.slice(1).map(row => row.join(' | ')).join('\n');
      
      return `${header.join(' | ')}\n${separator}\n${body}`;
    });

  // 9. 转换图片
  markdown = markdown.replace(/\\includegraphics(?:\[([^\]]*)\])?\{([^}]+)\}/g, 
    (_, options, path) => {
      const alt = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'image';
      return `![${alt}](${path})`;
    });

  // 10. 转换超链接
  markdown = markdown.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)');
  markdown = markdown.replace(/\\url\{([^}]+)\}/g, '<$1>');

  // 11. 清理 LaTeX 特定命令
  markdown = markdown.replace(/\\(newcommand|usepackage|documentclass|begin|end|label|ref|cite)[^\n]*\n?/g, '');
  markdown = markdown.replace(/\\par/g, '\n\n');
  markdown = markdown.replace(/\\newline/g, '  \n');
  markdown = markdown.replace(/\\quad/g, '  ');
  markdown = markdown.replace(/\\qquad/g, '    ');

  // 12. 清理多余空行
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown.trim();
}

/**
 * 转换文档结构
 */
function convertDocumentStructure(markdown: string): string {
  // 移除文档开始和结束标记
  markdown = markdown.replace(/\\documentclass\[?[^\]]*\]?(\{[^}]+\})?\n?/, '');
  markdown = markdown.replace(/\\begin\{document\}/g, '');
  markdown = markdown.replace(/\\end\{document\}/g, '');
  
  // 提取并转换标题信息
  const titleMatch = markdown.match(/\\title\{([^}]+)\}/);
  const authorMatch = markdown.match(/\\author\{([^}]+)\}/);
  const dateMatch = markdown.match(/\\date\{([^}]+)\}/);
  
  let header = '';
  if (titleMatch || authorMatch || dateMatch) {
    header += '# ';
    if (titleMatch) header += titleMatch[1];
    header += '\n\n';
    
    if (authorMatch) header += `**作者**: ${authorMatch[1]}\n\n`;
    if (dateMatch) header += `**日期**: ${dateMatch[1]}\n\n`;
    
    header += '---\n\n';
  }
  
  // 移除原始的标题命令
  markdown = markdown.replace(/\\(title|author|date|maketitle)\{[^}]*\}\n?/g, '');
  
  return header + markdown;
}

// ==================== 文档模板 ====================

/**
 * 生成 LaTeX 文档模板
 * @param config - 模板配置
 * @returns LaTeX 文档字符串
 */
export function generateLatexTemplate(config: TemplateConfig): string {
  const { documentClass, packages, pageSetup, titleInfo, customCommands } = config;
  
  let template = '';
  
  // 文档类
  const paperSize = pageSetup?.paperSize || 'a4';
  const fontSize = pageSetup?.fontSize || '12pt';
  template += `\\documentclass[${fontSize}, ${paperSize}]${documentClass}\n\n`;
  
  // 宏包
  template += '% 宏包\n';
  const defaultPackages = [
    'utf8{inputenc}',
    'T1{fontenc}',
    'amsmath',
    'amsfonts',
    'amssymb',
    'graphicx',
    'hyperref',
    'geometry'
  ];
  
  [...defaultPackages, ...packages].forEach(pkg => {
    template += `\\usepackage{${pkg}}\n`;
  });
  
  // 页面设置
  if (pageSetup?.margins) {
    const { top, bottom, left, right } = pageSetup.margins;
    template += `\\geometry{top=${top}, bottom=${bottom}, left=${left}, right=${right}}\n`;
  }
  
  // 自定义命令
  if (customCommands) {
    template += '\n% 自定义命令\n';
    Object.entries(customCommands).forEach(([name, definition]) => {
      template += `\\newcommand{${name}}{${definition}}\n`;
    });
  }
  
  // 标题信息
  if (titleInfo) {
    template += '\n% 标题信息\n';
    template += `\\title{${titleInfo.title}}\n`;
    if (titleInfo.author) {
      template += `\\author{${titleInfo.author}}\n`;
    }
    if (titleInfo.date) {
      template += `\\date{${titleInfo.date}}\n`;
    } else {
      template += '\\date{\\today}\n';
    }
  }
  
  // 文档开始
  template += '\n\\begin{document}\n\n';
  
  if (titleInfo) {
    template += '\\maketitle\n\n';
  }
  
  // 示例内容
  template += `% 在此添加您的内容\n`;
  template += `\\section{引言}\n`;
  template += `在此开始撰写您的文档...\n\n`;
  
  template += `\\section{方法}\n`;
  template += `描述您的方法...\n\n`;
  
  template += `\\section{结果}\n`;
  template += `展示您的结果...\n\n`;
  
  template += `\\section{结论}\n`;
  template += `总结您的发现...\n\n`;
  
  // 文档结束
  template += '\\end{document}\n';
  
  return template;
}

/**
 * 获取预设模板
 * @param type - 模板类型
 * @returns 模板配置
 */
export function getPresetTemplate(type: 'article' | 'report' | 'thesis' | 'letter' | 'beamer'): TemplateConfig {
  const presets: Record<string, TemplateConfig> = {
    article: {
      documentClass: 'article',
      packages: ['booktabs', 'caption', 'subcaption'],
      pageSetup: {
        margins: { top: '2.5cm', bottom: '2.5cm', left: '3cm', right: '3cm' },
        paperSize: 'a4',
        fontSize: '12pt'
      }
    },
    report: {
      documentClass: 'report',
      packages: ['booktabs', 'caption', 'subcaption', 'fancyhdr'],
      pageSetup: {
        margins: { top: '2.5cm', bottom: '2.5cm', left: '3cm', right: '3cm' },
        paperSize: 'a4',
        fontSize: '12pt'
      }
    },
    thesis: {
      documentClass: 'book',
      packages: ['booktabs', 'caption', 'subcaption', 'fancyhdr', 'hyperref', 'natbib'],
      pageSetup: {
        margins: { top: '3cm', bottom: '3cm', left: '3.5cm', right: '2.5cm' },
        paperSize: 'a4',
        fontSize: '12pt'
      }
    },
    letter: {
      documentClass: 'letter',
      packages: ['geometry'],
      pageSetup: {
        margins: { top: '2.5cm', bottom: '2.5cm', left: '2.5cm', right: '2.5cm' },
        paperSize: 'letter',
        fontSize: '11pt'
      }
    },
    beamer: {
      documentClass: 'beamer',
      packages: ['graphicx', 'hyperref'],
      pageSetup: {
        paperSize: 'a4',
        fontSize: '11pt'
      }
    }
  };
  
  return presets[type] || presets.article;
}

// ==================== 工具函数 ====================

/**
 * 验证 LaTeX 公式语法
 * @param latex - LaTeX 公式
 * @returns 是否有效
 */
export function validateLatexSyntax(latex: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查括号匹配
  const brackets = [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' }
  ];
  
  brackets.forEach(({ open, close }) => {
    const openCount = (latex.match(new RegExp(`\\${open}`, 'g')) || []).length;
    const closeCount = (latex.match(new RegExp(`\\${close}`, 'g')) || []).length;
    
    if (openCount !== closeCount) {
      errors.push(`不匹配的括号: ${open} (${openCount}) ≠ ${close} (${closeCount})`);
    }
  });
  
  // 检查环境匹配
  const beginMatches = latex.match(/\\begin\{[^}]+\}/g) || [];
  const endMatches = latex.match(/\\end\{[^}]+\}/g) || [];
  
  if (beginMatches.length !== endMatches.length) {
    errors.push(`不匹配的环境: \\begin (${beginMatches.length}) ≠ \\end (${endMatches.length})`);
  }
  
  // 检查常见命令拼写
  const commonCommands = ['frac', 'sqrt', 'sum', 'int', 'lim', 'log', 'sin', 'cos', 'tan'];
  commonCommands.forEach(cmd => {
    if (latex.includes(`\\${cmd}`) === false && 
        latex.includes(cmd) && 
        !latex.includes(`\\text{${cmd}}`)) {
      errors.push(`可能的拼写错误: 应该是 \\${cmd}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 美化 LaTeX 代码格式
 * @param latex - LaTeX 代码
 * @returns 格式化后的代码
 */
export function formatLatex(latex: string): string {
  let formatted = latex;
  
  // 在环境开始/结束处添加换行
  formatted = formatted.replace(/(\\begin\{[^}]+\})/g, '\n$1\n');
  formatted = formatted.replace(/(\\end\{[^}]+\})/g, '\n$1\n');
  
  // 在章节命令后添加换行
  formatted = formatted.replace(/(\\section\{[^}]+\})/g, '\n$1\n');
  formatted = formatted.replace(/(\\subsection\{[^}]+\})/g, '\n$1\n');
  
  // 移除多余空行
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // 缩进环境内容
  const envRegex = /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g;
  formatted = formatted.replace(envRegex, (match, envName, content) => {
    const indented = content.split('\n').map(line => '  ' + line.trim()).join('\n');
    return `\\begin{${envName}}\n${indented}\n\\end{${envName}}`;
  });
  
  return formatted.trim();
}

/**
 * 提取 LaTeX 文档中的引用
 * @param latex - LaTeX 文档
 * @returns 引用列表
 */
export function extractCitations(latex: string): string[] {
  const citations = new Set<string>();
  const citeRegex = /\\cite(?:[tp])?(?:\[?[^\]]*\]?)?\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  
  while ((match = citeRegex.exec(latex)) !== null) {
    match[1].split(',').forEach(cite => {
      citations.add(cite.trim());
    });
  }
  
  return Array.from(citations);
}

/**
 * 提取 LaTeX 文档中的标签
 * @param latex - LaTeX 文档
 * @returns 标签映射
 */
export function extractLabels(latex: string): Record<string, { type: string; context: string }> {
  const labels: Record<string, { type: string; context: string }> = {};
  const labelRegex = /\\label\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  
  while ((match = labelRegex.exec(latex)) !== null) {
    const label = match[1];
    const context = latex.substring(Math.max(0, match.index - 50), match.index + 50);
    const type = context.match(/\\(section|subsection|figure|table|equation)/)?.[1] || 'unknown';
    
    labels[label] = { type, context: context.trim() };
  }
  
  return labels;
}

// ==================== 导出 ====================

export default {
  // 公式解析
  extractLatexFormulas,
  latexToMathML,
  validateLatexSyntax,
  
  // 格式转换
  latexToMarkdown,
  formatLatex,
  
  // 模板生成
  generateLatexTemplate,
  getPresetTemplate,
  
  // 文档分析
  extractCitations,
  extractLabels
};
