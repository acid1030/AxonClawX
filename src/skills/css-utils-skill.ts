/**
 * CSS Utils Skill - KAEL
 * 
 * 功能:
 * 1. CSS 解析 - 解析 CSS 字符串为 AST
 * 2. 样式计算 - 计算最终样式值 (处理继承、层叠)
 * 3. 自动前缀 - 自动添加浏览器厂商前缀
 * 
 * @module css-utils-skill
 * @author KAEL
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface CSSRule {
  selector: string;
  declarations: Map<string, string>;
  specificity: number;
}

export interface CSSAST {
  rules: CSSRule[];
  atRules: AtRule[];
}

export interface AtRule {
  name: string;
  params: string;
  block?: CSSAST;
}

export interface StyleOptions {
  inherit?: boolean;
  cascade?: boolean;
}

export interface PrefixOptions {
  browsers?: ('webkit' | 'moz' | 'ms' | 'o')[];
  properties?: string[];
}

// ============================================================================
// CSS 解析器
// ============================================================================

/**
 * 解析 CSS 字符串为 AST
 * 
 * @param css - CSS 字符串
 * @returns CSS AST
 * 
 * @example
 * ```typescript
 * const css = `
 *   .container {
 *     display: flex;
 *     color: red;
 *   }
 * `;
 * const ast = parseCSS(css);
 * ```
 */
export function parseCSS(css: string): CSSAST {
  const ast: CSSAST = { rules: [], atRules: [] };
  
  // 移除注释
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 解析 @rules
  const atRuleRegex = /@([\w-]+)\s*([^{;]*?)\s*\{([\s\S]*?)\}/g;
  let match;
  
  while ((match = atRuleRegex.exec(css)) !== null) {
    const [, name, params, block] = match;
    const atRule: AtRule = {
      name,
      params: params.trim(),
    };
    
    if (name === 'media' || name === 'supports' || name === 'keyframes') {
      atRule.block = parseCSS(block);
    }
    
    ast.atRules.push(atRule);
  }
  
  // 移除 @rules 后继续解析普通规则
  css = css.replace(atRuleRegex, '');
  
  // 解析普通规则
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  
  while ((match = ruleRegex.exec(css)) !== null) {
    const [, selector, declarations] = match;
    const declMap = new Map<string, string>();
    
    // 解析声明
    declarations.split(';').forEach(decl => {
      const [property, value] = decl.split(':').map(s => s.trim());
      if (property && value) {
        declMap.set(property, value);
      }
    });
    
    // 计算特异性
    const specificity = calculateSpecificity(selector.trim());
    
    ast.rules.push({
      selector: selector.trim(),
      declarations: declMap,
      specificity,
    });
  }
  
  return ast;
}

/**
 * 计算选择器特异性
 */
function calculateSpecificity(selector: string): number {
  let ids = 0;
  let classes = 0;
  let elements = 0;
  
  // ID 选择器
  ids = (selector.match(/#[\w-]+/g) || []).length;
  
  // 类、属性、伪类选择器
  classes = (selector.match(/\.[\w-]+/g) || []).length;
  classes += (selector.match(/\[[\w-]+/g) || []).length;
  classes += (selector.match(/:[\w-]+/g) || []).length;
  
  // 元素、伪元素选择器
  elements = (selector.match(/(?:^|[\s>+~])[\w]+/g) || []).length;
  elements += (selector.match(/::[\w-]+/g) || []).length;
  
  return ids * 100 + classes * 10 + elements;
}

// ============================================================================
// 样式计算引擎
// ============================================================================

/**
 * 计算元素的最终样式
 * 
 * @param rules - CSS 规则列表
 * @param selector - 目标选择器
 * @param parentStyles - 父元素样式 (用于继承)
 * @param options - 计算选项
 * @returns 最终样式对象
 * 
 * @example
 * ```typescript
 * const rules = parseCSS(`
 *   body { font-size: 16px; color: black; }
 *   .container { color: red; }
 * `).rules;
 * 
 * const styles = computeStyles(rules, '.container', { 'font-size': '16px' });
 * // 结果：{ 'font-size': '16px', color: 'red' }
 * ```
 */
export function computeStyles(
  rules: CSSRule[],
  selector: string,
  parentStyles: Record<string, string> = {},
  options: StyleOptions = {}
): Record<string, string> {
  const { inherit = true, cascade = true } = options;
  
  // 可继承的属性
  const inheritableProps = new Set([
    'color',
    'font',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'text-align',
    'visibility',
    'cursor',
  ]);
  
  // 初始化样式 (从父元素继承)
  const computedStyles: Record<string, string> = inherit ? { ...parentStyles } : {};
  
  // 筛选匹配的规则
  const matchingRules = rules.filter(rule => matchesSelector(rule.selector, selector));
  
  // 按特异性排序
  if (cascade) {
    matchingRules.sort((a, b) => a.specificity - b.specificity);
  }
  
  // 应用样式 (层叠)
  matchingRules.forEach(rule => {
    rule.declarations.forEach((value, property) => {
      // 检查是否应该继承
      if (value === 'inherit') {
        if (parentStyles[property]) {
          computedStyles[property] = parentStyles[property];
        }
      } else {
        computedStyles[property] = value;
      }
    });
  });
  
  return computedStyles;
}

/**
 * 检查选择器是否匹配
 */
function matchesSelector(ruleSelector: string, targetSelector: string): boolean {
  // 简单匹配逻辑 (可扩展为完整的选择器匹配引擎)
  const ruleParts = ruleSelector.split(/[\s,>+~]+/);
  const targetParts = targetSelector.split(/[\s,>+~]+/);
  
  return ruleParts.some(part => {
    return targetParts.some(target => {
      return part === target || 
             part.includes(target) || 
             target.includes(part);
    });
  });
}

// ============================================================================
// 自动前缀生成器
// ============================================================================

/**
 * 需要添加前缀的 CSS 属性映射
 */
const PREFIX_MAP: Record<string, string[]> = {
  'transform': ['webkit', 'moz', 'ms'],
  'transition': ['webkit', 'moz', 'ms'],
  'animation': ['webkit', 'moz', 'ms'],
  'flex': ['webkit', 'moz', 'ms'],
  'flex-direction': ['webkit', 'moz', 'ms'],
  'flex-wrap': ['webkit', 'moz', 'ms'],
  'justify-content': ['webkit', 'moz', 'ms'],
  'align-items': ['webkit', 'moz', 'ms'],
  'align-content': ['webkit', 'moz', 'ms'],
  'order': ['webkit', 'moz', 'ms'],
  'flex-grow': ['webkit', 'moz', 'ms'],
  'flex-shrink': ['webkit', 'moz', 'ms'],
  'flex-basis': ['webkit', 'moz', 'ms'],
  'grid': ['webkit', 'moz', 'ms'],
  'grid-template-columns': ['webkit', 'moz', 'ms'],
  'grid-template-rows': ['webkit', 'moz', 'ms'],
  'grid-column': ['webkit', 'moz', 'ms'],
  'grid-row': ['webkit', 'moz', 'ms'],
  'gap': ['webkit', 'moz', 'ms'],
  'user-select': ['webkit', 'moz', 'ms'],
  'backdrop-filter': ['webkit', 'moz'],
  'appearance': ['webkit', 'moz'],
  'background-clip': ['webkit'],
};

/**
 * 为 CSS 添加浏览器厂商前缀
 * 
 * @param css - CSS 字符串或样式对象
 * @param options - 前缀选项
 * @returns 带前缀的 CSS
 * 
 * @example
 * ```typescript
 * // 字符串模式
 * const css = `.box { display: flex; transform: rotate(45deg); }`;
 * const prefixed = addPrefixes(css);
 * // 结果：`.box { display: flex; -webkit-transform: rotate(45deg); -moz-transform: rotate(45deg); -ms-transform: rotate(45deg); transform: rotate(45deg); }`
 * 
 * // 对象模式
 * const styles = { transform: 'rotate(45deg)', color: 'red' };
 * const prefixed = addPrefixes(styles);
 * // 结果：{ '-webkit-transform': 'rotate(45deg)', '-moz-transform': 'rotate(45deg)', '-ms-transform': 'rotate(45deg)', 'transform': 'rotate(45deg)', 'color': 'red' }
 * ```
 */
export function addPrefixes(
  css: string | Record<string, string>,
  options: PrefixOptions = {}
): string | Record<string, string> {
  const { browsers = ['webkit', 'moz', 'ms'], properties } = options;
  
  if (typeof css === 'string') {
    return addPrefixesToString(css, browsers, properties);
  } else {
    return addPrefixesToObject(css, browsers, properties);
  }
}

/**
 * 为 CSS 字符串添加前缀
 */
function addPrefixesToString(
  css: string,
  browsers: string[],
  properties?: string[]
): string {
  const ast = parseCSS(css);
  const result: string[] = [];
  
  ast.rules.forEach(rule => {
    const declarations: string[] = [];
    
    rule.declarations.forEach((value, property) => {
      const shouldPrefix = !properties || properties.includes(property);
      
      if (shouldPrefix && PREFIX_MAP[property]) {
        const prefixes = PREFIX_MAP[property].filter(p => browsers.includes(p));
        
        prefixes.forEach(prefix => {
          declarations.push(`  -${prefix}-${property}: ${value};`);
        });
      }
      
      declarations.push(`  ${property}: ${value};`);
    });
    
    result.push(`${rule.selector} {\n${declarations.join('\n')}\n}`);
  });
  
  // 处理 @rules
  ast.atRules.forEach(atRule => {
    if (atRule.block) {
      const prefixedBlock = addPrefixesToString(
        stringifyCSS(atRule.block),
        browsers,
        properties
      );
      result.push(`@${atRule.name} ${atRule.params} {\n${prefixedBlock}\n}`);
    } else {
      result.push(`@${atRule.name} ${atRule.params};`);
    }
  });
  
  return result.join('\n\n');
}

/**
 * 为样式对象添加前缀
 */
function addPrefixesToObject(
  styles: Record<string, string>,
  browsers: string[],
  properties?: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  
  Object.entries(styles).forEach(([property, value]) => {
    const shouldPrefix = !properties || properties.includes(property);
    
    if (shouldPrefix && PREFIX_MAP[property]) {
      const prefixes = PREFIX_MAP[property].filter(p => browsers.includes(p));
      
      prefixes.forEach(prefix => {
        result[`-${prefix}-${property}`] = value;
      });
    }
    
    result[property] = value;
  });
  
  return result;
}

/**
 * 将 CSS AST 转换为字符串
 */
function stringifyCSS(ast: CSSAST): string {
  return ast.rules
    .map(rule => {
      const declarations = Array.from(rule.declarations)
        .map(([prop, val]) => `  ${prop}: ${val};`)
        .join('\n');
      return `${rule.selector} {\n${declarations}\n}`;
    })
    .join('\n\n');
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 压缩 CSS (移除空格、换行、注释)
 * 
 * @param css - CSS 字符串
 * @returns 压缩后的 CSS
 * 
 * @example
 * ```typescript
 * const css = `
 *   .container {
 *     color: red; /* comment *\/
 *   }
 * `;
 * const minified = minifyCSS(css);
 * // 结果：`.container{color:red;}`
 * ```
 */
export function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
    .replace(/\s+/g, ' ') // 合并空白
    .replace(/\s*{\s*/g, '{') // 移除 { 周围空格
    .replace(/\s*}\s*/g, '}') // 移除 } 周围空格
    .replace(/\s*:\s*/g, ':') // 移除 : 周围空格
    .replace(/\s*;\s*/g, ';') // 移除 ; 周围空格
    .trim();
}

/**
 * 格式化 CSS (美化输出)
 * 
 * @param css - CSS 字符串
 * @param indent - 缩进空格数 (默认 2)
 * @returns 格式化后的 CSS
 * 
 * @example
 * ```typescript
 * const css = `.container{color:red;}`;
 * const formatted = formatCSS(css, 4);
 * // 结果:
 * // .container {
 * //     color: red;
 * // }
 * ```
 */
export function formatCSS(css: string, indent: number = 2): string {
  const ast = parseCSS(css);
  const indentStr = ' '.repeat(indent);
  
  return ast.rules
    .map(rule => {
      const declarations = Array.from(rule.declarations)
        .map(([prop, val]) => `${indentStr}${prop}: ${val};`)
        .join('\n');
      return `${rule.selector} {\n${declarations}\n}`;
    })
    .join('\n\n');
}

/**
 * 提取关键 CSS (Critical CSS)
 * 
 * @param css - 完整 CSS
 * @param selectors - 关键选择器列表
 * @returns 仅包含关键选择器的 CSS
 * 
 * @example
 * ```typescript
 * const css = `
 *   .header { color: red; }
 *   .footer { color: blue; }
 *   .main { color: green; }
 * `;
 * const critical = extractCriticalCSS(css, ['.header', '.main']);
 * // 结果：`.header { color: red; }\n\n.main { color: green; }`
 * ```
 */
export function extractCriticalCSS(
  css: string,
  selectors: string[]
): string {
  const ast = parseCSS(css);
  
  const criticalRules = ast.rules.filter(rule => {
    return selectors.some(selector => {
      return rule.selector.includes(selector);
    });
  });
  
  return criticalRules
    .map(rule => {
      const declarations = Array.from(rule.declarations)
        .map(([prop, val]) => `  ${prop}: ${val};`)
        .join('\n');
      return `${rule.selector} {\n${declarations}\n}`;
    })
    .join('\n\n');
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 完整使用示例
 */
export function demonstrateUsage() {
  console.log('=== CSS Utils Skill 使用示例 ===\n');
  
  // 1. CSS 解析示例
  console.log('1. CSS 解析:');
  const css = `
    .container {
      display: flex;
      justify-content: center;
      color: #333;
    }
    
    .container .item {
      transform: rotate(45deg);
      transition: all 0.3s;
    }
    
    @media (max-width: 768px) {
      .container {
        flex-direction: column;
      }
    }
  `;
  
  const ast = parseCSS(css);
  console.log(`解析出 ${ast.rules.length} 条规则，${ast.atRules.length} 条 @rules\n`);
  
  // 2. 样式计算示例
  console.log('2. 样式计算:');
  const parentStyles = { 'font-size': '16px', 'color': 'black' };
  const computed = computeStyles(ast.rules, '.container .item', parentStyles);
  console.log('计算后的样式:', computed, '\n');
  
  // 3. 自动前缀示例
  console.log('3. 自动前缀:');
  const styles = {
    transform: 'rotate(45deg)',
    display: 'flex',
    color: 'red',
  };
  const prefixed = addPrefixes(styles);
  console.log('添加前缀后:', prefixed, '\n');
  
  // 4. CSS 压缩示例
  console.log('4. CSS 压缩:');
  const minified = minifyCSS(css);
  console.log('压缩后:', minified.substring(0, 100) + '...\n');
  
  // 5. CSS 格式化示例
  console.log('5. CSS 格式化:');
  const compact = `.box{color:red;}`;
  const formatted = formatCSS(compact, 4);
  console.log('格式化后:\n', formatted, '\n');
  
  // 6. 关键 CSS 提取示例
  console.log('6. 关键 CSS 提取:');
  const critical = extractCriticalCSS(css, ['.container']);
  console.log('关键 CSS:\n', critical, '\n');
}

// ============================================================================
// 导出
// ============================================================================

export default {
  parseCSS,
  computeStyles,
  addPrefixes,
  minifyCSS,
  formatCSS,
  extractCriticalCSS,
  demonstrateUsage,
};
