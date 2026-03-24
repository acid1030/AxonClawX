/**
 * ACE Interpreter Pattern Pro Skill
 * 
 * 专业解释器模式实现
 * - 解释器定义
 * - 语法解析
 * - 表达式求值
 * 
 * @author Axon
 * @version 1.0.0
 */

// ==================== 抽象表达式接口 ====================
interface Expression {
  interpret(context: Context): number;
  toString(): string;
}

// ==================== 上下文类 ====================
class Context {
  private variables: Map<string, number> = new Map();

  setVariable(name: string, value: number): void {
    this.variables.set(name, value);
  }

  getVariable(name: string): number {
    const value = this.variables.get(name);
    if (value === undefined) {
      throw new Error(`未定义的变量：${name}`);
    }
    return value;
  }

  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }
}

// ==================== 终结符表达式 ====================

/** 数字终结符 */
class NumberExpression implements Expression {
  constructor(private value: number) {}

  interpret(_: Context): number {
    return this.value;
  }

  toString(): string {
    return this.value.toString();
  }
}

/** 变量终结符 */
class VariableExpression implements Expression {
  constructor(private name: string) {}

  interpret(context: Context): number {
    return context.getVariable(this.name);
  }

  toString(): string {
    return this.name;
  }
}

// ==================== 非终结符表达式 ====================

/** 加法表达式 */
class AddExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Context): number {
    return this.left.interpret(context) + this.right.interpret(context);
  }

  toString(): string {
    return `(${this.left.toString()} + ${this.right.toString()})`;
  }
}

/** 减法表达式 */
class SubtractExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Context): number {
    return this.left.interpret(context) - this.right.interpret(context);
  }

  toString(): string {
    return `(${this.left.toString()} - ${this.right.toString()})`;
  }
}

/** 乘法表达式 */
class MultiplyExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Context): number {
    return this.left.interpret(context) * this.right.interpret(context);
  }

  toString(): string {
    return `(${this.left.toString()} * ${this.right.toString()})`;
  }
}

/** 除法表达式 */
class DivideExpression implements Expression {
  constructor(
    private left: Expression,
    private right: Expression
  ) {}

  interpret(context: Context): number {
    const divisor = this.right.interpret(context);
    if (divisor === 0) {
      throw new Error('除数不能为零');
    }
    return this.left.interpret(context) / divisor;
  }

  toString(): string {
    return `(${this.left.toString()} / ${this.right.toString()})`;
  }
}

/** 幂运算表达式 */
class PowerExpression implements Expression {
  constructor(
    private base: Expression,
    private exponent: Expression
  ) {}

  interpret(context: Context): number {
    return Math.pow(this.base.interpret(context), this.exponent.interpret(context));
  }

  toString(): string {
    return `(${this.base.toString()} ^ ${this.exponent.toString()})`;
  }
}

// ==================== 词法分析器 ====================
enum TokenType {
  NUMBER,
  VARIABLE,
  PLUS,
  MINUS,
  MULTIPLY,
  DIVIDE,
  POWER,
  LPAREN,
  RPAREN,
  EOF
}

interface Token {
  type: TokenType;
  value?: string | number;
}

class Lexer {
  private input: string;
  private position: number = 0;
  private currentChar: string | null = null;

  constructor(input: string) {
    this.input = input;
    this.currentChar = input[0] || null;
  }

  private advance(): void {
    this.position++;
    this.currentChar = this.position < this.input.length ? this.input[this.position] : null;
  }

  private skipWhitespace(): void {
    while (this.currentChar && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  private number(): Token {
    let result = '';
    while (this.currentChar && /[0-9.]/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }
    return { type: TokenType.NUMBER, value: parseFloat(result) };
  }

  private identifier(): Token {
    let result = '';
    while (this.currentChar && /[a-zA-Z_]/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }
    return { type: TokenType.VARIABLE, value: result };
  }

  nextToken(): Token {
    while (this.currentChar) {
      if (/\s/.test(this.currentChar)) {
        this.skipWhitespace();
        continue;
      }

      if (/[0-9]/.test(this.currentChar)) {
        return this.number();
      }

      if (/[a-zA-Z_]/.test(this.currentChar)) {
        return this.identifier();
      }

      switch (this.currentChar) {
        case '+':
          this.advance();
          return { type: TokenType.PLUS };
        case '-':
          this.advance();
          return { type: TokenType.MINUS };
        case '*':
          this.advance();
          return { type: TokenType.MULTIPLY };
        case '/':
          this.advance();
          return { type: TokenType.DIVIDE };
        case '^':
          this.advance();
          return { type: TokenType.POWER };
        case '(':
          this.advance();
          return { type: TokenType.LPAREN };
        case ')':
          this.advance();
          return { type: TokenType.RPAREN };
        default:
          throw new Error(`未知字符：${this.currentChar}`);
      }
    }

    return { type: TokenType.EOF };
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    let token: Token;
    do {
      token = this.nextToken();
      tokens.push(token);
    } while (token.type !== TokenType.EOF);
    return tokens;
  }
}

// ==================== 语法解析器 ====================
class Parser {
  private tokens: Token[];
  private currentTokenIndex: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private currentToken(): Token {
    return this.tokens[this.currentTokenIndex];
  }

  private consume(expectedType: TokenType): Token {
    const token = this.currentToken();
    if (token.type !== expectedType) {
      throw new Error(`期望 ${TokenType[expectedType]}，但得到 ${TokenType[token.type]}`);
    }
    this.currentTokenIndex++;
    return token;
  }

  /** 解析表达式（最低优先级：加减） */
  parseExpression(): Expression {
    let left = this.parseTerm();

    while (
      this.currentToken().type === TokenType.PLUS ||
      this.currentToken().type === TokenType.MINUS
    ) {
      const operator = this.currentToken();
      this.currentTokenIndex++;
      const right = this.parseTerm();

      if (operator.type === TokenType.PLUS) {
        left = new AddExpression(left, right);
      } else {
        left = new SubtractExpression(left, right);
      }
    }

    return left;
  }

  /** 解析项（中等优先级：乘除） */
  private parseTerm(): Expression {
    let left = this.parsePower();

    while (
      this.currentToken().type === TokenType.MULTIPLY ||
      this.currentToken().type === TokenType.DIVIDE
    ) {
      const operator = this.currentToken();
      this.currentTokenIndex++;
      const right = this.parsePower();

      if (operator.type === TokenType.MULTIPLY) {
        left = new MultiplyExpression(left, right);
      } else {
        left = new DivideExpression(left, right);
      }
    }

    return left;
  }

  /** 解析幂运算（高优先级） */
  private parsePower(): Expression {
    let base = this.parseFactor();

    if (this.currentToken().type === TokenType.POWER) {
      this.currentTokenIndex++;
      const exponent = this.parsePower(); // 右结合
      return new PowerExpression(base, exponent);
    }

    return base;
  }

  /** 解析因子（最高优先级：数字、变量、括号） */
  private parseFactor(): Expression {
    const token = this.currentToken();

    if (token.type === TokenType.NUMBER) {
      this.currentTokenIndex++;
      return new NumberExpression(token.value as number);
    }

    if (token.type === TokenType.VARIABLE) {
      this.currentTokenIndex++;
      return new VariableExpression(token.value as string);
    }

    if (token.type === TokenType.LPAREN) {
      this.currentTokenIndex++;
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN);
      return expr;
    }

    // 处理一元负号
    if (token.type === TokenType.MINUS) {
      this.currentTokenIndex++;
      const factor = this.parseFactor();
      return new MultiplyExpression(new NumberExpression(-1), factor);
    }

    throw new Error(`意外的 token：${TokenType[token.type]}`);
  }

  parse(): Expression {
    const expr = this.parseExpression();
    if (this.currentToken().type !== TokenType.EOF) {
      throw new Error('表达式未结束');
    }
    return expr;
  }
}

// ==================== 解释器主类 ====================
class Interpreter {
  private context: Context = new Context();

  /** 设置变量 */
  setVariable(name: string, value: number): void {
    this.context.setVariable(name, value);
  }

  /** 获取变量 */
  getVariable(name: string): number {
    return this.context.getVariable(name);
  }

  /** 执行表达式字符串 */
  execute(expressionStr: string): number {
    const lexer = new Lexer(expressionStr);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return ast.interpret(this.context);
  }

  /** 执行并返回 AST */
  parseAndExecute(expressionStr: string): { ast: Expression; result: number } {
    const lexer = new Lexer(expressionStr);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const result = ast.interpret(this.context);
    return { ast, result };
  }

  /** 清空所有变量 */
  clear(): void {
    this.context = new Context();
  }
}

// ==================== 导出 API ====================
export {
  Expression,
  Context,
  NumberExpression,
  VariableExpression,
  AddExpression,
  SubtractExpression,
  MultiplyExpression,
  DivideExpression,
  PowerExpression,
  Lexer,
  Parser,
  Interpreter,
  TokenType,
  Token
};

// ==================== 使用示例 ====================
/**
 * 使用示例 1: 基础表达式求值
 */
export function example1_BasicEvaluation(): void {
  console.log('=== 示例 1: 基础表达式求值 ===');
  const interpreter = new Interpreter();
  
  const expressions = [
    '2 + 3',
    '10 - 4',
    '3 * 7',
    '20 / 4',
    '2 ^ 3',
    '2 + 3 * 4',
    '(2 + 3) * 4',
  ];

  expressions.forEach(expr => {
    const result = interpreter.execute(expr);
    console.log(`${expr} = ${result}`);
  });
}

/**
 * 使用示例 2: 变量支持
 */
export function example2_Variables(): void {
  console.log('\n=== 示例 2: 变量支持 ===');
  const interpreter = new Interpreter();
  
  interpreter.setVariable('x', 10);
  interpreter.setVariable('y', 5);
  interpreter.setVariable('z', 2);

  const expressions = [
    'x + y',
    'x * y - z',
    'x ^ z',
    '(x + y) * z',
  ];

  expressions.forEach(expr => {
    const result = interpreter.execute(expr);
    console.log(`${expr} = ${result}`);
  });
}

/**
 * 使用示例 3: 复杂表达式与 AST 查看
 */
export function example3_ComplexExpressionWithAST(): void {
  console.log('\n=== 示例 3: 复杂表达式与 AST ===');
  const interpreter = new Interpreter();
  
  interpreter.setVariable('a', 3);
  interpreter.setVariable('b', 4);

  const expr = '(a + b) * 2 ^ 2';
  const { ast, result } = interpreter.parseAndExecute(expr);
  
  console.log(`表达式：${expr}`);
  console.log(`AST: ${ast.toString()}`);
  console.log(`结果：${result}`);
}

/**
 * 使用示例 4: 错误处理
 */
export function example4_ErrorHandling(): void {
  console.log('\n=== 示例 4: 错误处理 ===');
  const interpreter = new Interpreter();
  
  const errorCases = [
    { expr: '10 / 0', desc: '除零错误' },
    { expr: 'x + 1', desc: '未定义变量' },
    { expr: '2 + * 3', desc: '语法错误' },
  ];

  errorCases.forEach(({ expr, desc }) => {
    try {
      const result = interpreter.execute(expr);
      console.log(`[${desc}] ${expr} = ${result}`);
    } catch (error) {
      console.log(`[${desc}] ${expr} → 错误：${(error as Error).message}`);
    }
  });
}

/**
 * 使用示例 5: 链式计算
 */
export function example5_ChainedCalculations(): void {
  console.log('\n=== 示例 5: 链式计算 ===');
  const interpreter = new Interpreter();
  
  interpreter.setVariable('principal', 1000);
  interpreter.setVariable('rate', 0.05);
  interpreter.setVariable('years', 3);

  // 复利公式：A = P * (1 + r) ^ t
  const compoundInterest = 'principal * (1 + rate) ^ years';
  const result = interpreter.execute(compoundInterest);
  
  console.log('复利计算:');
  console.log(`  本金：${interpreter.getVariable('principal')}`);
  console.log(`  利率：${interpreter.getVariable('rate')}`);
  console.log(`  年数：${interpreter.getVariable('years')}`);
  console.log(`  公式：${compoundInterest}`);
  console.log(`  结果：${result.toFixed(2)}`);
}

// 运行所有示例
if (require.main === module) {
  example1_BasicEvaluation();
  example2_Variables();
  example3_ComplexExpressionWithAST();
  example4_ErrorHandling();
  example5_ChainedCalculations();
  
  console.log('\n✅ ACE Interpreter Pattern Pro Skill 演示完成！');
}
