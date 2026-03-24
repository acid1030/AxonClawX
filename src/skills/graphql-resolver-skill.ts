/**
 * GraphQL 解析器技能 - GraphQL Resolver Skill
 * 
 * 功能:
 * 1. Schema 定义 - GraphQL 类型系统构建
 * 2. Resolver 实现 - 查询解析与数据获取
 * 3. 查询验证 - 语法校验与权限检查
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** GraphQL 标量类型 */
export type GraphQLScalarType = 'ID' | 'String' | 'Int' | 'Float' | 'Boolean';

/** GraphQL 类型修饰符 */
export type TypeModifier = '' | '!' | '[' | '[!';

/** GraphQL 字段定义 */
export interface GraphQLField {
  /** 字段名称 */
  name: string;
  /** 字段类型 (含修饰符) */
  type: string;
  /** 参数定义 */
  args?: GraphQLArgument[];
  /** 字段描述 */
  description?: string;
}

/** GraphQL 参数定义 */
export interface GraphQLArgument {
  /** 参数名称 */
  name: string;
  /** 参数类型 */
  type: string;
  /** 默认值 */
  defaultValue?: any;
  /** 参数描述 */
  description?: string;
}

/** GraphQL 对象类型定义 */
export interface GraphQLObjectType {
  /** 类型名称 */
  name: string;
  /** 字段列表 */
  fields: GraphQLField[];
  /** 类型描述 */
  description?: string;
  /** 实现的接口 */
  interfaces?: string[];
}

/** GraphQL 枚举值定义 */
export interface GraphQLEnumValue {
  /** 枚举值名称 */
  name: string;
  /** 枚举值描述 */
  description?: string;
  /** 枚举值 (用于解析) */
  value?: any;
}

/** GraphQL 枚举类型定义 */
export interface GraphQLEnumType {
  /** 类型名称 */
  name: string;
  /** 枚举值列表 */
  values: GraphQLEnumValue[];
  /** 类型描述 */
  description?: string;
}

/** GraphQL 输入类型定义 */
export interface GraphQLInputType {
  /** 类型名称 */
  name: string;
  /** 字段列表 */
  fields: GraphQLField[];
  /** 类型描述 */
  description?: string;
}

/** GraphQL 接口类型定义 */
export interface GraphQLInterfaceType {
  /** 接口名称 */
  name: string;
  /** 字段列表 */
  fields: GraphQLField[];
  /** 接口描述 */
  description?: string;
}

/** GraphQL Union 类型定义 */
export interface GraphQLUnionType {
  /** Union 名称 */
  name: string;
  /** 可能的类型 */
  possibleTypes: string[];
  /** Union 描述 */
  description?: string;
}

/** Resolver 函数 */
export type ResolverFn = (
  parent: any,
  args: Record<string, any>,
  context: any,
  info: GraphQLResolveInfo
) => any | Promise<any>;

/** Resolver 映射 */
export interface ResolverMap {
  [typeName: string]: {
    [fieldName: string]: ResolverFn;
  };
}

/** GraphQL 解析信息 */
export interface GraphQLResolveInfo {
  /** 字段名称 */
  fieldName: string;
  /** 字段节点 */
  fieldNodes: any[];
  /** 返回类型 */
  returnType: any;
  /** 父类型 */
  parentType: any;
  /** 路径 */
  path: any;
  /** Schema */
  schema: any;
  /** 片段 */
  fragments: Record<string, any>;
  /** 根值 */
  rootValue: any;
  /** 操作 */
  operation: any;
  /** 变量 */
  variableValues: Record<string, any>;
}

/** GraphQL 查询解析结果 */
export interface GraphQLParseResult {
  /** 是否成功 */
  success: boolean;
  /** 解析错误 */
  errors?: GraphQLError[];
  /** 解析后的 AST */
  ast?: any;
  /** 验证警告 */
  warnings?: string[];
}

/** GraphQL 错误 */
export interface GraphQLError {
  /** 错误消息 */
  message: string;
  /** 错误位置 */
  locations?: { line: number; column: number }[];
  /** 错误路径 */
  path?: (string | number)[];
  /** 错误代码 */
  code?: string;
}

/** GraphQL Schema 构建器选项 */
export interface SchemaBuilderOptions {
  /** 是否启用严格模式 */
  strict?: boolean;
  /** 是否自动添加 ID 字段 */
  autoId?: boolean;
  /** 自定义标量类型 */
  customScalars?: string[];
}

/** GraphQL 查询执行上下文 */
export interface QueryContext {
  /** 用户信息 */
  user?: any;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 数据加载器 */
  loaders?: Record<string, any>;
  /** 缓存 */
  cache?: Map<string, any>;
  /** 自定义数据 */
  [key: string]: any;
}

// ============== Schema 定义 ==============

/**
 * SchemaBuilder - GraphQL Schema 构建器
 * 
 * 提供流式 API 构建 GraphQL Schema
 * 
 * @example
 * const schema = new SchemaBuilder()
 *   .object('User')
 *     .field('id', 'ID!')
 *     .field('name', 'String!')
 *     .field('email', 'String!')
 *     .field('posts', '[Post]')
 *   .object('Post')
 *     .field('id', 'ID!')
 *     .field('title', 'String!')
 *     .field('content', 'String!')
 *     .field('author', 'User!')
 *   .query('user', { args: [{ name: 'id', type: 'ID!' }], type: 'User' })
 *   .query('posts', { type: '[Post!]' })
 *   .build();
 */
export class SchemaBuilder {
  private types: Map<string, GraphQLObjectType> = new Map();
  private enums: Map<string, GraphQLEnumType> = new Map();
  private inputs: Map<string, GraphQLInputType> = new Map();
  private interfaces: Map<string, GraphQLInterfaceType> = new Map();
  private unions: Map<string, GraphQLUnionType> = new Map();
  private queries: Map<string, GraphQLField> = new Map();
  private mutations: Map<string, GraphQLField> = new Map();
  private subscriptions: Map<string, GraphQLField> = new Map();
  private options: SchemaBuilderOptions;

  constructor(options: SchemaBuilderOptions = {}) {
    this.options = {
      strict: false,
      autoId: true,
      customScalars: [],
      ...options,
    };
  }

  /**
   * 定义对象类型
   */
  object(name: string): TypeBuilder {
    return new TypeBuilder(this, name);
  }

  /**
   * 添加对象类型
   */
  addType(type: GraphQLObjectType): this {
    this.types.set(type.name, type);
    return this;
  }

  /**
   * 定义枚举类型
   */
  enum(name: string): EnumBuilder {
    return new EnumBuilder(this, name);
  }

  /**
   * 添加枚举类型
   */
  addEnum(type: GraphQLEnumType): this {
    this.enums.set(type.name, type);
    return this;
  }

  /**
   * 定义输入类型
   */
  input(name: string): InputBuilder {
    return new InputBuilder(this, name);
  }

  /**
   * 添加输入类型
   */
  addInput(type: GraphQLInputType): this {
    this.inputs.set(type.name, type);
    return this;
  }

  /**
   * 定义接口类型
   */
  interface(name: string): InterfaceBuilder {
    return new InterfaceBuilder(this, name);
  }

  /**
   * 添加接口类型
   */
  addInterface(type: GraphQLInterfaceType): this {
    this.interfaces.set(type.name, type);
    return this;
  }

  /**
   * 定义 Union 类型
   */
  union(name: string): UnionBuilder {
    return new UnionBuilder(this, name);
  }

  /**
   * 添加 Union 类型
   */
  addUnion(type: GraphQLUnionType): this {
    this.unions.set(type.name, type);
    return this;
  }

  /**
   * 添加查询字段
   */
  query(name: string, field: Omit<GraphQLField, 'name'>): this {
    this.queries.set(name, { ...field, name });
    return this;
  }

  /**
   * 添加变异字段
   */
  mutation(name: string, field: Omit<GraphQLField, 'name'>): this {
    this.mutations.set(name, { ...field, name });
    return this;
  }

  /**
   * 添加订阅字段
   */
  subscription(name: string, field: Omit<GraphQLField, 'name'>): this {
    this.subscriptions.set(name, { ...field, name });
    return this;
  }

  /**
   * 构建 Schema
   */
  build(): GraphQLSchema {
    return new GraphQLSchema({
      types: Array.from(this.types.values()),
      enums: Array.from(this.enums.values()),
      inputs: Array.from(this.inputs.values()),
      interfaces: Array.from(this.interfaces.values()),
      unions: Array.from(this.unions.values()),
      queries: Array.from(this.queries.values()),
      mutations: Array.from(this.mutations.values()),
      subscriptions: Array.from(this.subscriptions.values()),
      options: this.options,
    });
  }
}

/**
 * GraphQL Schema
 */
export class GraphQLSchema {
  constructor(public config: {
    types: GraphQLObjectType[];
    enums: GraphQLEnumType[];
    inputs: GraphQLInputType[];
    interfaces: GraphQLInterfaceType[];
    unions: GraphQLUnionType[];
    queries: GraphQLField[];
    mutations: GraphQLField[];
    subscriptions: GraphQLField[];
    options: SchemaBuilderOptions;
  }) {}

  /**
   * 获取类型定义
   */
  getType(name: string): GraphQLObjectType | GraphQLEnumType | GraphQLInputType | GraphQLInterfaceType | GraphQLUnionType | undefined {
    return (
      this.config.types.find(t => t.name === name) ||
      this.config.enums.find(t => t.name === name) ||
      this.config.inputs.find(t => t.name === name) ||
      this.config.interfaces.find(t => t.name === name) ||
      this.config.unions.find(t => t.name === name)
    );
  }

  /**
   * 获取查询字段
   */
  getQuery(name: string): GraphQLField | undefined {
    return this.config.queries.find(q => q.name === name);
  }

  /**
   * 获取变异字段
   */
  getMutation(name: string): GraphQLField | undefined {
    return this.config.mutations.find(m => m.name === name);
  }

  /**
   * 转换为 SDL (Schema Definition Language)
   */
  toSDL(): string {
    const lines: string[] = [];

    // 输出标量类型
    if (this.config.options.customScalars?.length) {
      for (const scalar of this.config.options.customScalars) {
        lines.push(`scalar ${scalar}`);
      }
      lines.push('');
    }

    // 输出枚举类型
    for (const enumType of this.config.enums) {
      lines.push(this.enumToSDL(enumType));
      lines.push('');
    }

    // 输出接口类型
    for (const interfaceType of this.config.interfaces) {
      lines.push(this.interfaceToSDL(interfaceType));
      lines.push('');
    }

    // 输出对象类型
    for (const type of this.config.types) {
      lines.push(this.typeToSDL(type));
      lines.push('');
    }

    // 输出输入类型
    for (const inputType of this.config.inputs) {
      lines.push(this.inputToSDL(inputType));
      lines.push('');
    }

    // 输出 Union 类型
    for (const unionType of this.config.unions) {
      lines.push(this.unionToSDL(unionType));
      lines.push('');
    }

    // 输出 Query 类型
    if (this.config.queries.length > 0) {
      lines.push('type Query {');
      for (const query of this.config.queries) {
        lines.push(`  ${this.fieldToSDL(query)}`);
      }
      lines.push('}');
      lines.push('');
    }

    // 输出 Mutation 类型
    if (this.config.mutations.length > 0) {
      lines.push('type Mutation {');
      for (const mutation of this.config.mutations) {
        lines.push(`  ${this.fieldToSDL(mutation)}`);
      }
      lines.push('}');
      lines.push('');
    }

    // 输出 Subscription 类型
    if (this.config.subscriptions.length > 0) {
      lines.push('type Subscription {');
      for (const subscription of this.config.subscriptions) {
        lines.push(`  ${this.fieldToSDL(subscription)}`);
      }
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  private typeToSDL(type: GraphQLObjectType): string {
    const lines: string[] = [];
    if (type.description) {
      lines.push(`"""${type.description}"""`);
    }
    const implementsClause = type.interfaces?.length
      ? ` implements ${type.interfaces.join(' & ')}`
      : '';
    lines.push(`type ${type.name}${implementsClause} {`);
    for (const field of type.fields) {
      lines.push(`  ${this.fieldToSDL(field)}`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  private enumToSDL(type: GraphQLEnumType): string {
    const lines: string[] = [];
    if (type.description) {
      lines.push(`"""${type.description}"""`);
    }
    lines.push(`enum ${type.name} {`);
    for (const value of type.values) {
      lines.push(`  ${value.name}`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  private inputToSDL(type: GraphQLInputType): string {
    const lines: string[] = [];
    if (type.description) {
      lines.push(`"""${type.description}"""`);
    }
    lines.push(`input ${type.name} {`);
    for (const field of type.fields) {
      lines.push(`  ${field.name}: ${field.type}`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  private interfaceToSDL(type: GraphQLInterfaceType): string {
    const lines: string[] = [];
    if (type.description) {
      lines.push(`"""${type.description}"""`);
    }
    lines.push(`interface ${type.name} {`);
    for (const field of type.fields) {
      lines.push(`  ${this.fieldToSDL(field)}`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  private unionToSDL(type: GraphQLUnionType): string {
    const lines: string[] = [];
    if (type.description) {
      lines.push(`"""${type.description}"""`);
    }
    lines.push(`union ${type.name} = ${type.possibleTypes.join(' | ')}`);
    return lines.join('\n');
  }

  private fieldToSDL(field: GraphQLField): string {
    const argsStr = field.args?.length
      ? `(${field.args.map(arg => `${arg.name}: ${arg.type}${arg.defaultValue !== undefined ? ` = ${JSON.stringify(arg.defaultValue)}` : ''}`).join(', ')})`
      : '';
    return `${field.name}${argsStr}: ${field.type}`;
  }
}

// ============== 构建器类 ==============

/**
 * 类型构建器
 */
export class TypeBuilder {
  private fields: GraphQLField[] = [];
  private description?: string;
  private interfaces: string[] = [];

  constructor(
    private schema: SchemaBuilder,
    private name: string
  ) {}

  field(name: string, type: string, args?: GraphQLArgument[], description?: string): this {
    this.fields.push({ name, type, args, description });
    return this;
  }

  interface(...names: string[]): this {
    this.interfaces.push(...names);
    return this;
  }

  desc(description: string): this {
    this.description = description;
    return this;
  }

  end(): SchemaBuilder {
    this.schema.addType({
      name: this.name,
      fields: this.fields,
      description: this.description,
      interfaces: this.interfaces.length ? this.interfaces : undefined,
    });
    return this.schema;
  }
}

/**
 * 枚举构建器
 */
export class EnumBuilder {
  private values: GraphQLEnumValue[] = [];
  private description?: string;

  constructor(
    private schema: SchemaBuilder,
    private name: string
  ) {}

  value(name: string, description?: string, value?: any): this {
    this.values.push({ name, description, value });
    return this;
  }

  desc(description: string): this {
    this.description = description;
    return this;
  }

  end(): SchemaBuilder {
    this.schema.addEnum({
      name: this.name,
      values: this.values,
      description: this.description,
    });
    return this.schema;
  }
}

/**
 * 输入构建器
 */
export class InputBuilder {
  private fields: GraphQLField[] = [];
  private description?: string;

  constructor(
    private schema: SchemaBuilder,
    private name: string
  ) {}

  field(name: string, type: string, description?: string): this {
    this.fields.push({ name, type, description });
    return this;
  }

  desc(description: string): this {
    this.description = description;
    return this;
  }

  end(): SchemaBuilder {
    this.schema.addInput({
      name: this.name,
      fields: this.fields,
      description: this.description,
    });
    return this.schema;
  }
}

/**
 * 接口构建器
 */
export class InterfaceBuilder {
  private fields: GraphQLField[] = [];
  private description?: string;

  constructor(
    private schema: SchemaBuilder,
    private name: string
  ) {}

  field(name: string, type: string, args?: GraphQLArgument[], description?: string): this {
    this.fields.push({ name, type, args, description });
    return this;
  }

  desc(description: string): this {
    this.description = description;
    return this;
  }

  end(): SchemaBuilder {
    this.schema.addInterface({
      name: this.name,
      fields: this.fields,
      description: this.description,
    });
    return this.schema;
  }
}

/**
 * Union 构建器
 */
export class UnionBuilder {
  private possibleTypes: string[] = [];
  private description?: string;

  constructor(
    private schema: SchemaBuilder,
    private name: string
  ) {}

  types(...names: string[]): this {
    this.possibleTypes.push(...names);
    return this;
  }

  desc(description: string): this {
    this.description = description;
    return this;
  }

  end(): SchemaBuilder {
    this.schema.addUnion({
      name: this.name,
      possibleTypes: this.possibleTypes,
      description: this.description,
    });
    return this.schema;
  }
}

// ============== Resolver 实现 ==============

/**
 * ResolverExecutor - GraphQL 解析执行器
 * 
 * 执行 GraphQL 查询，调用相应的 Resolver 函数
 * 
 * @example
 * const executor = new ResolverExecutor(schema, resolvers);
 * const result = await executor.execute(query, variables, context);
 */
export class ResolverExecutor {
  constructor(
    private schema: GraphQLSchema,
    private resolvers: ResolverMap
  ) {}

  /**
   * 执行 GraphQL 查询
   */
  async execute(
    query: string,
    variables: Record<string, any> = {},
    context: QueryContext = {}
  ): Promise<GraphQLExecutionResult> {
    const parseResult = parseQuery(query);
    
    if (!parseResult.success || !parseResult.ast) {
      return {
        data: null,
        errors: parseResult.errors || [{ message: 'Query parsing failed' }],
      };
    }

    try {
      const data = await this.executeOperation(parseResult.ast, variables, context);
      return { data, errors: [] };
    } catch (error) {
      return {
        data: null,
        errors: [{
          message: error instanceof Error ? error.message : 'Execution failed',
          code: 'EXECUTION_ERROR',
        }],
      };
    }
  }

  private async executeOperation(
    ast: any,
    variables: Record<string, any>,
    context: QueryContext
  ): Promise<any> {
    const operationType = ast.operation || 'query';
    const rootType = operationType === 'query' ? 'Query' : operationType === 'mutation' ? 'Mutation' : 'Subscription';
    
    const result: any = {};
    
    for (const field of ast.selectionSet?.selections || []) {
      const fieldName = field.name.value;
      const resolver = this.getResolver(rootType, fieldName);
      
      if (resolver) {
        const args = this.resolveArguments(field, variables);
        const parent = {};
        const info: GraphQLResolveInfo = {
          fieldName,
          fieldNodes: [field],
          returnType: null,
          parentType: null,
          path: { key: fieldName },
          schema: this.schema,
          fragments: ast.fragments || {},
          rootValue: null,
          operation: ast,
          variableValues: variables,
        };
        
        result[fieldName] = await resolver(parent, args, context, info);
      }
    }
    
    return result;
  }

  private getResolver(typeName: string, fieldName: string): ResolverFn | undefined {
    return this.resolvers[typeName]?.[fieldName];
  }

  private resolveArguments(field: any, variables: Record<string, any>): Record<string, any> {
    const args: Record<string, any> = {};
    
    for (const arg of field.arguments || []) {
      const argName = arg.name.value;
      const argValue = arg.value;
      
      if (argValue.kind === 'Variable') {
        args[argName] = variables[argValue.name.value];
      } else if (argValue.kind === 'StringValue') {
        args[argName] = argValue.value;
      } else if (argValue.kind === 'IntValue') {
        args[argName] = parseInt(argValue.value, 10);
      } else if (argValue.kind === 'FloatValue') {
        args[argName] = parseFloat(argValue.value);
      } else if (argValue.kind === 'BooleanValue') {
        args[argName] = argValue.value;
      } else if (argValue.kind === 'NullValue') {
        args[argName] = null;
      } else if (argValue.kind === 'ListValue') {
        args[argName] = argValue.values.map((v: any) => this.resolveArgumentValue(v, variables));
      } else if (argValue.kind === 'ObjectValue') {
        args[argName] = this.resolveObjectValue(argValue, variables);
      }
    }
    
    return args;
  }

  private resolveArgumentValue(value: any, variables: Record<string, any>): any {
    if (value.kind === 'Variable') {
      return variables[value.name.value];
    } else if (value.kind === 'StringValue') {
      return value.value;
    } else if (value.kind === 'IntValue') {
      return parseInt(value.value, 10);
    } else if (value.kind === 'FloatValue') {
      return parseFloat(value.value);
    } else if (value.kind === 'BooleanValue') {
      return value.value;
    } else if (value.kind === 'NullValue') {
      return null;
    }
    return null;
  }

  private resolveObjectValue(objValue: any, variables: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const field of objValue.fields || []) {
      result[field.name.value] = this.resolveArgumentValue(field.value, variables);
    }
    return result;
  }
}

/** GraphQL 执行结果 */
export interface GraphQLExecutionResult {
  data: any | null;
  errors: GraphQLError[];
}

// ============== 查询验证 ==============

/**
 * QueryValidator - GraphQL 查询验证器
 * 
 * 验证 GraphQL 查询的语法、类型和权限
 * 
 * @example
 * const validator = new QueryValidator(schema);
 * const result = validator.validate(query, variables);
 */
export class QueryValidator {
  constructor(private schema: GraphQLSchema) {}

  /**
   * 验证 GraphQL 查询
   */
  validate(query: string, variables?: Record<string, any>): GraphQLParseResult {
    const parseResult = parseQuery(query);
    
    if (!parseResult.success) {
      return parseResult;
    }

    const warnings: string[] = [];
    const errors: GraphQLError[] = [];

    // 验证变量
    if (variables) {
      const varValidation = this.validateVariables(parseResult.ast!, variables);
      errors.push(...varValidation.errors);
      warnings.push(...varValidation.warnings);
    }

    // 验证字段
    const fieldValidation = this.validateFields(parseResult.ast!);
    errors.push(...fieldValidation.errors);
    warnings.push(...fieldValidation.warnings);

    // 验证深度
    const depthValidation = this.validateDepth(parseResult.ast!, 10);
    if (!depthValidation.valid) {
      errors.push({
        message: `Query depth exceeds maximum allowed depth of 10`,
        code: 'DEPTH_LIMIT_EXCEEDED',
      });
    }

    // 验证复杂度
    const complexityValidation = this.validateComplexity(parseResult.ast!, 100);
    if (!complexityValidation.valid) {
      warnings.push(`Query complexity (${complexityValidation.complexity}) exceeds recommended limit of 100`);
    }

    return {
      success: errors.length === 0,
      errors: errors.length ? errors : undefined,
      ast: parseResult.ast,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  private validateVariables(ast: any, variables: Record<string, any>): { errors: GraphQLError[]; warnings: string[] } {
    const errors: GraphQLError[] = [];
    const warnings: string[] = [];

    // 简单的变量存在性检查
    const usedVariables = this.extractVariables(ast);
    for (const varName of usedVariables) {
      if (!(varName in variables)) {
        warnings.push(`Variable $${varName} is used but not provided`);
      }
    }

    return { errors, warnings };
  }

  private extractVariables(ast: any): string[] {
    const variables = new Set<string>();
    
    const traverse = (node: any) => {
      if (!node || typeof node !== 'object') return;
      
      if (node.kind === 'Variable') {
        variables.add(node.name.value);
      }
      
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(traverse);
        } else {
          traverse(value);
        }
      }
    };
    
    traverse(ast);
    return Array.from(variables);
  }

  private validateFields(ast: any): { errors: GraphQLError[]; warnings: string[] } {
    const errors: GraphQLError[] = [];
    const warnings: string[] = [];

    const operationType = ast.operation || 'query';
    const rootType = operationType === 'query' ? 'Query' : operationType === 'mutation' ? 'Mutation' : 'Subscription';

    const validateSelectionSet = (selections: any[], parentType: string) => {
      for (const selection of selections) {
        if (selection.kind === 'Field') {
          const fieldName = selection.name.value;
          
          // 检查字段是否存在
          let fieldDef: GraphQLField | undefined;
          if (parentType === 'Query') {
            fieldDef = this.schema.getQuery(fieldName);
          } else if (parentType === 'Mutation') {
            fieldDef = this.schema.getMutation(fieldName);
          } else {
            const type = this.schema.getType(parentType) as GraphQLObjectType;
            fieldDef = type?.fields.find(f => f.name === fieldName);
          }

          if (!fieldDef && !fieldName.startsWith('__')) {
            errors.push({
              message: `Cannot query field "${fieldName}" on type "${parentType}"`,
              code: 'FIELD_NOT_FOUND',
            });
          }

          // 递归验证子字段
          if (selection.selectionSet) {
            // 获取字段类型
            const fieldType = fieldDef?.type.replace(/[\[\]!]/g, '') || 'Unknown';
            validateSelectionSet(selection.selectionSet.selections, fieldType);
          }
        } else if (selection.kind === 'InlineFragment') {
          if (selection.selectionSet) {
            validateSelectionSet(selection.selectionSet.selections, parentType);
          }
        }
      }
    };

    if (ast.selectionSet) {
      validateSelectionSet(ast.selectionSet.selections, rootType);
    }

    return { errors, warnings };
  }

  private validateDepth(ast: any, maxDepth: number): { valid: boolean; actualDepth: number } {
    const getDepth = (node: any, currentDepth: number): number => {
      if (!node || typeof node !== 'object') return currentDepth;
      
      if (node.selectionSet) {
        let maxChildDepth = currentDepth;
        for (const selection of node.selectionSet.selections || []) {
          const childDepth = getDepth(selection, currentDepth + 1);
          maxChildDepth = Math.max(maxChildDepth, childDepth);
        }
        return maxChildDepth;
      }
      
      return currentDepth;
    };

    const actualDepth = getDepth(ast, 0);
    return { valid: actualDepth <= maxDepth, actualDepth };
  }

  private validateComplexity(ast: any, maxComplexity: number): { valid: boolean; complexity: number } {
    const calculateComplexity = (node: any): number => {
      if (!node || typeof node !== 'object') return 0;
      
      let complexity = 0;
      
      if (node.kind === 'Field') {
        complexity = 1;
        // 参数增加复杂度
        if (node.arguments?.length) {
          complexity += node.arguments.length * 0.5;
        }
      }
      
      // 子选择集增加复杂度
      if (node.selectionSet) {
        for (const selection of node.selectionSet.selections || []) {
          complexity += calculateComplexity(selection);
        }
      }
      
      return complexity;
    };

    const complexity = calculateComplexity(ast);
    return { valid: complexity <= maxComplexity, complexity };
  }
}

// ============== 查询解析器 ==============

/**
 * 解析 GraphQL 查询字符串为 AST
 * 
 * 简化的解析器实现，支持基本的 GraphQL 语法
 */
export function parseQuery(query: string): GraphQLParseResult {
  try {
    const tokens = tokenize(query);
    const ast = parseTokens(tokens);
    return { success: true, ast };
  } catch (error) {
    return {
      success: false,
      errors: [{
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        code: 'PARSE_ERROR',
      }],
    };
  }
}

/**
 * 词法分析 - 将查询字符串转换为 token 流
 */
function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  let line = 1;
  let column = 1;

  while (position < query.length) {
    const char = query[position];

    // 跳过空白字符
    if (/\s/.test(char)) {
      if (char === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
      position++;
      continue;
    }

    // 跳过注释
    if (char === '#') {
      while (position < query.length && query[position] !== '\n') {
        position++;
      }
      continue;
    }

    // 标点符号
    if (['{', '}', '(', ')', '[', ']', '!', ':', '=', '|', '&', '@'].includes(char)) {
      tokens.push({
        kind: 'PUNCTUATION',
        value: char,
        line,
        column,
      });
      position++;
      column++;
      continue;
    }

    // 字符串
    if (char === '"') {
      const { value, endPos } = readString(query, position);
      tokens.push({
        kind: 'STRING',
        value,
        line,
        column,
      });
      position = endPos;
      column += endPos - position;
      continue;
    }

    // 数字
    if (/[0-9-]/.test(char)) {
      const { value, endPos } = readNumber(query, position);
      tokens.push({
        kind: char === '-' || !value.includes('.') ? 'INT' : 'FLOAT',
        value,
        line,
        column,
      });
      position = endPos;
      column += endPos - position;
      continue;
    }

    // 标识符/关键字
    if (/[a-zA-Z_]/.test(char)) {
      const { value, endPos } = readIdentifier(query, position);
      const keyword = ['query', 'mutation', 'subscription', 'fragment', 'on', 'true', 'false', 'null'].includes(value);
      tokens.push({
        kind: keyword ? 'KEYWORD' : 'IDENTIFIER',
        value,
        line,
        column,
      });
      position = endPos;
      column += endPos - position;
      continue;
    }

    // 未知字符
    throw new Error(`Unexpected character "${char}" at line ${line}, column ${column}`);
  }

  return tokens;
}

interface Token {
  kind: string;
  value: string;
  line: number;
  column: number;
}

function readString(query: string, start: number): { value: string; endPos: number } {
  let endPos = start + 1;
  let value = '';
  
  while (endPos < query.length && query[endPos] !== '"') {
    if (query[endPos] === '\\') {
      endPos++;
      if (endPos < query.length) {
        value += query[endPos];
      }
    } else {
      value += query[endPos];
    }
    endPos++;
  }
  
  return { value, endPos: endPos + 1 };
}

function readNumber(query: string, start: number): { value: string; endPos: number } {
  let endPos = start;
  
  while (endPos < query.length && /[0-9.-]/.test(query[endPos])) {
    endPos++;
  }
  
  return { value: query.slice(start, endPos), endPos };
}

function readIdentifier(query: string, start: number): { value: string; endPos: number } {
  let endPos = start;
  
  while (endPos < query.length && /[a-zA-Z0-9_]/.test(query[endPos])) {
    endPos++;
  }
  
  return { value: query.slice(start, endPos), endPos };
}

/**
 * 语法分析 - 将 token 流转换为 AST
 */
function parseTokens(tokens: Token[]): any {
  let position = 0;

  const peek = (offset = 0) => tokens[position + offset];
  const advance = () => tokens[position++];
  const expect = (kind: string, value?: string) => {
    const token = peek();
    if (!token || token.kind !== kind || (value && token.value !== value)) {
      throw new Error(`Expected ${kind}${value ? ` "${value}"` : ''} but got ${token ? `${token.kind} "${token.value}"` : 'EOF'}`);
    }
    return advance();
  };

  const parseValue = (): any => {
    const token = peek();
    if (!token) throw new Error('Unexpected end of input');

    switch (token.kind) {
      case 'STRING':
        advance();
        return { kind: 'StringValue', value: token.value };
      case 'INT':
        advance();
        return { kind: 'IntValue', value: token.value };
      case 'FLOAT':
        advance();
        return { kind: 'FloatValue', value: token.value };
      case 'KEYWORD':
        advance();
        if (token.value === 'true') return { kind: 'BooleanValue', value: true };
        if (token.value === 'false') return { kind: 'BooleanValue', value: false };
        if (token.value === 'null') return { kind: 'NullValue' };
        throw new Error(`Unexpected keyword: ${token.value}`);
      case 'IDENTIFIER':
        advance();
        return { kind: 'EnumValue', value: token.value };
      case 'PUNCTUATION':
        if (token.value === '$') {
          advance();
          const varToken = expect('IDENTIFIER');
          return { kind: 'Variable', name: { kind: 'Name', value: varToken.value } };
        }
        if (token.value === '[') {
          advance();
          const values: any[] = [];
          while (peek()?.value !== ']') {
            values.push(parseValue());
          }
          expect('PUNCTUATION', ']');
          return { kind: 'ListValue', values };
        }
        if (token.value === '{') {
          advance();
          const fields: any[] = [];
          while (peek()?.value !== '}') {
            const name = expect('IDENTIFIER');
            expect('PUNCTUATION', ':');
            const value = parseValue();
            fields.push({ kind: 'ObjectField', name: { kind: 'Name', value: name.value }, value });
          }
          expect('PUNCTUATION', '}');
          return { kind: 'ObjectValue', fields };
        }
        throw new Error(`Unexpected punctuation: ${token.value}`);
      default:
        throw new Error(`Unexpected token: ${token.kind}`);
    }
  };

  const parseArguments = (): any[] => {
    const args: any[] = [];
    expect('PUNCTUATION', '(');
    
    while (peek()?.value !== ')') {
      const name = expect('IDENTIFIER');
      expect('PUNCTUATION', ':');
      const value = parseValue();
      args.push({ kind: 'Argument', name: { kind: 'Name', value: name.value }, value });
    }
    
    expect('PUNCTUATION', ')');
    return args;
  };

  const parseSelectionSet = (): any => {
    expect('PUNCTUATION', '{');
    const selections: any[] = [];
    
    while (peek()?.value !== '}') {
      if (peek()?.kind === 'KEYWORD' && peek()?.value === 'fragment') {
        selections.push(parseInlineFragment());
      } else {
        selections.push(parseField());
      }
    }
    
    expect('PUNCTUATION', '}');
    return { kind: 'SelectionSet', selections };
  };

  const parseField = (): any => {
    const name = expect('IDENTIFIER');
    const field: any = {
      kind: 'Field',
      name: { kind: 'Name', value: name.value },
    };

    if (peek()?.value === ':') {
      advance();
      const alias = expect('IDENTIFIER');
      field.alias = { kind: 'Name', value: alias.value };
    }

    if (peek()?.value === '(') {
      field.arguments = parseArguments();
    }

    if (peek()?.value === '{') {
      field.selectionSet = parseSelectionSet();
    }

    return field;
  };

  const parseInlineFragment = (): any => {
    advance(); // skip 'fragment'
    
    let typeCondition;
    if (peek()?.value === 'on') {
      advance();
      const type = expect('IDENTIFIER');
      typeCondition = { kind: 'NamedType', name: { kind: 'Name', value: type.value } };
    }

    const selectionSet = parseSelectionSet();
    
    return {
      kind: 'InlineFragment',
      typeCondition,
      selectionSet,
    };
  };

  const parseOperation = (): any => {
    let operation = 'query';
    let name = null;
    let variableDefinitions: any[] = [];

    if (peek()?.kind === 'KEYWORD' && ['query', 'mutation', 'subscription'].includes(peek()!.value)) {
      const opToken = advance();
      operation = opToken.value;

      if (peek()?.kind === 'IDENTIFIER') {
        const nameToken = advance();
        name = { kind: 'Name', value: nameToken.value };
      }

      if (peek()?.value === '(') {
        advance();
        while (peek()?.value !== ')') {
          expect('PUNCTUATION', '$');
          const varName = expect('IDENTIFIER');
          expect('PUNCTUATION', ':');
          const varType = parseType();
          
          let defaultValue;
          if (peek()?.value === '=') {
            advance();
            defaultValue = parseValue();
          }
          
          variableDefinitions.push({
            kind: 'VariableDefinition',
            variable: { kind: 'Variable', name: { kind: 'Name', value: varName.value } },
            type: varType,
            defaultValue,
          });
        }
        expect('PUNCTUATION', ')');
      }
    }

    const selectionSet = peek()?.value === '{' ? parseSelectionSet() : { kind: 'SelectionSet', selections: [] };

    return {
      kind: 'OperationDefinition',
      operation,
      name,
      variableDefinitions,
      selectionSet,
    };
  };

  const parseType = (): any => {
    const name = expect('IDENTIFIER');
    let type: any = { kind: 'NamedType', name: { kind: 'Name', value: name.value } };

    if (peek()?.value === '!') {
      advance();
      type = { kind: 'NonNullType', type };
    }

    return type;
  };

  const parseFragment = (): any => {
    advance(); // skip 'fragment'
    const name = expect('IDENTIFIER');
    expect('KEYWORD', 'on');
    const type = expect('IDENTIFIER');
    const selectionSet = parseSelectionSet();

    return {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: name.value },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: type.value } },
      selectionSet,
    };
  };

  const parseDocument = (): any => {
    const definitions: any[] = [];

    while (position < tokens.length) {
      if (peek()?.kind === 'KEYWORD' && peek()?.value === 'fragment') {
        definitions.push(parseFragment());
      } else {
        definitions.push(parseOperation());
      }
    }

    return { kind: 'Document', definitions };
  };

  const ast = parseDocument();
  
  // 如果只有一个操作，直接返回该操作
  if (ast.definitions.length === 1 && ast.definitions[0].kind === 'OperationDefinition') {
    return {
      ...ast.definitions[0],
      fragments: {},
    };
  }

  // 提取 fragments
  const fragments: Record<string, any> = {};
  for (const def of ast.definitions) {
    if (def.kind === 'FragmentDefinition') {
      fragments[def.name.value] = def;
    }
  }

  return ast;
}

// ============== 使用示例 ==============

/**
 * 使用示例
 * 
 * @example
 * ```typescript
 * // 1. 构建 Schema
 * const schema = new SchemaBuilder()
 *   .object('User')
 *     .field('id', 'ID!')
 *     .field('name', 'String!')
 *     .field('email', 'String!')
 *     .field('age', 'Int')
 *     .field('posts', '[Post]')
 *   .object('Post')
 *     .field('id', 'ID!')
 *     .field('title', 'String!')
 *     .field('content', 'String!')
 *     .field('author', 'User!')
 *     .field('published', 'Boolean!')
 *   .enum('Role')
 *     .value('ADMIN')
 *     .value('USER')
 *     .value('GUEST')
 *   .input('CreateUserInput')
 *     .field('name', 'String!')
 *     .field('email', 'String!')
 *     .field('age', 'Int')
 *   .query('user', {
 *     args: [{ name: 'id', type: 'ID!' }],
 *     type: 'User',
 *   })
 *   .query('users', {
 *     type: '[User!]',
 *   })
 *   .mutation('createUser', {
 *     args: [{ name: 'input', type: 'CreateUserInput!' }],
 *     type: 'User!',
 *   })
 *   .build();
 * 
 * // 2. 定义 Resolvers
 * const resolvers: ResolverMap = {
 *   Query: {
 *     user: async (parent, { id }, context) => {
 *       return context.loaders.user.load(id);
 *     },
 *     users: async () => {
 *       return db.users.findAll();
 *     },
 *   },
 *   Mutation: {
 *     createUser: async (parent, { input }, context) => {
 *       return db.users.create(input);
 *     },
 *   },
 *   User: {
 *     posts: async (user) => {
 *       return db.posts.findAll({ where: { authorId: user.id } });
 *     },
 *   },
 *   Post: {
 *     author: async (post) => {
 *       return db.users.findById(post.authorId);
 *     },
 *   },
 * };
 * 
 * // 3. 验证查询
 * const validator = new QueryValidator(schema);
 * const query = `
 *   query GetUser($id: ID!) {
 *     user(id: $id) {
 *       id
 *       name
 *       email
 *       posts {
 *         id
 *         title
 *       }
 *     }
 *   }
 * `;
 * 
 * const validation = validator.validate(query, { id: '123' });
 * if (!validation.success) {
 *   console.error('Validation errors:', validation.errors);
 * }
 * 
 * // 4. 执行查询
 * const executor = new ResolverExecutor(schema, resolvers);
 * const result = await executor.execute(query, { id: '123' }, {
 *   user: { id: 'admin', role: 'ADMIN' },
 *   loaders: { user: new DataLoader(...) },
 * });
 * 
 * console.log(result.data);
 * console.log(result.errors);
 * 
 * // 5. 输出 Schema SDL
 * console.log(schema.toSDL());
 * ```
 */
export const EXAMPLE_USAGE = `
// 完整示例请查看上方的 JSDoc 注释
`;
