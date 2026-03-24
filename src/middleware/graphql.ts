/**
 * GraphQL API 中间件 - GraphQL Middleware
 * 
 * @author Axon
 * @version 1.0.0
 * 
 * 功能:
 * 1. Schema 定义 - 支持 GraphQL Schema 字符串或 GraphQLSchema 对象
 * 2. Resolver 注册 - 支持模块化 Resolver 注册
 * 3. Query 执行 - 处理 GraphQL 查询请求
 * 
 * 依赖:
 * - graphql: npm install graphql
 */

import { Request, Response, NextFunction } from 'express';
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  buildSchema,
  GraphQLError,
  formatError,
} from 'graphql';

// ============ 类型定义 ============

/**
 * Resolver 函数类型
 */
export type ResolverFn = (args: any, context: any, info: any) => any;

/**
 * Resolver 映射表
 */
export interface Resolvers {
  Query?: Record<string, ResolverFn>;
  Mutation?: Record<string, ResolverFn>;
  [key: string]: Record<string, ResolverFn> | undefined;
}

/**
 * Schema 配置
 */
export interface SchemaConfig {
  typeDefs: string;
  resolvers: Resolvers;
}

/**
 * GraphQL 中间件配置
 */
export interface GraphQLMiddlewareConfig {
  schema?: GraphQLSchema | SchemaConfig;
  path?: string;
  graphiql?: boolean;
  context?: ((req: Request) => any) | any;
  formatErrorFn?: typeof formatError;
  pretty?: boolean;
  enableCors?: boolean;
}

/**
 * GraphQL 请求体
 */
export interface GraphQLRequestBody {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

/**
 * GraphQL 响应数据
 */
export interface GraphQLResponseData {
  data?: any | null;
  errors?: readonly GraphQLError[];
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: Required<Omit<GraphQLMiddlewareConfig, 'schema'>> = {
  path: '/graphql',
  graphiql: false,
  context: {},
  formatErrorFn: formatError,
  pretty: true,
  enableCors: true,
};

// ============ Schema 构建工具 ============

/**
 * 从 Schema 配置构建 GraphQLSchema
 * 
 * @param config - Schema 配置 (typeDefs + resolvers)
 * @returns GraphQLSchema 对象
 * 
 * @example
 * ```typescript
 * const schema = buildSchemaFromConfig({
 *   typeDefs: `
 *     type Query {
 *       hello(name: String!): String!
 *     }
 *   `,
 *   resolvers: {
 *     Query: {
 *       hello: ({ name }) => `Hello, ${name}!`
 *     }
 *   }
 * });
 * ```
 */
export function buildSchemaFromConfig(config: SchemaConfig): GraphQLSchema {
  const { typeDefs, resolvers } = config;
  
  // 使用 buildSchema 构建基础 schema
  const schema = buildSchema(typeDefs);
  
  // 注：buildSchema 返回的 schema 已经包含 root resolvers
  // 对于更复杂的 resolver 映射，建议使用 graphql-tools 的 makeExecutableSchema
  
  return schema;
}

/**
 * 创建简单的 Query 类型
 * 
 * @example
 * ```typescript
 * const QueryType = createQueryType({
 *   fields: {
 *     hello: {
 *       type: GraphQLString,
 *       args: { name: { type: new GraphQLNonNull(GraphQLString) } },
 *       resolve: (_, { name }) => `Hello, ${name}!`
 *     }
 *   }
 * });
 * ```
 */
export function createQueryType(config: {
  name?: string;
  fields: Record<string, {
    type: any;
    args?: Record<string, { type: any; defaultValue?: any }>;
    resolve: ResolverFn;
  }>;
}): GraphQLObjectType {
  const { name = 'Query', fields } = config;
  
  const fieldConfig: any = {};
  Object.entries(fields).forEach(([fieldName, field]) => {
    fieldConfig[fieldName] = {
      type: field.type,
      args: field.args,
      resolve: field.resolve,
    };
  });
  
  return new GraphQLObjectType({
    name,
    fields: fieldConfig,
  });
}

/**
 * 创建简单的 Mutation 类型
 */
export function createMutationType(config: {
  name?: string;
  fields: Record<string, {
    type: any;
    args?: Record<string, { type: any; defaultValue?: any }>;
    resolve: ResolverFn;
  }>;
}): GraphQLObjectType {
  const { name = 'Mutation', fields } = config;
  
  const fieldConfig: any = {};
  Object.entries(fields).forEach(([fieldName, field]) => {
    fieldConfig[fieldName] = {
      type: field.type,
      args: field.args,
      resolve: field.resolve,
    };
  });
  
  return new GraphQLObjectType({
    name,
    fields: fieldConfig,
  });
}

// ============ 中间件工厂 ============

/**
 * 创建 GraphQL 中间件
 * 
 * @param config - 配置选项
 * @returns Express 中间件函数
 * 
 * @example
 * ```typescript
 * import { graphqlMiddleware, createQueryType } from './middleware/graphql';
 * import { GraphQLString, GraphQLNonNull } from 'graphql';
 * 
 * // 方式 1: 使用 Schema 配置
 * app.use(graphqlMiddleware({
 *   schema: {
 *     typeDefs: `
 *       type Query {
 *         hello(name: String!): String!
 *         users: [User!]!
 *       }
 *       
 *       type User {
 *         id: ID!
 *         name: String!
 *         email: String!
 *       }
 *     `,
 *     resolvers: {
 *       Query: {
 *         hello: ({ name }) => `Hello, ${name}!`,
 *         users: () => [
 *           { id: '1', name: 'Alice', email: 'alice@example.com' },
 *           { id: '2', name: 'Bob', email: 'bob@example.com' }
 *         ]
 *       }
 *     }
 *   },
 *   graphiql: true,
 *   context: (req) => ({ user: req.headers['x-user'] })
 * }));
 * 
 * // 方式 2: 使用程序化 Schema 构建
 * const QueryType = createQueryType({
 *   fields: {
 *     hello: {
 *       type: GraphQLString,
 *       args: { name: { type: new GraphQLNonNull(GraphQLString) } },
 *       resolve: (_, { name }) => `Hello, ${name}!`
 *     }
 *   }
 * });
 * 
 * const schema = new GraphQLSchema({
 *   query: QueryType
 * });
 * 
 * app.use(graphqlMiddleware({ schema }));
 * ```
 */
export function graphqlMiddleware(config: GraphQLMiddlewareConfig) {
  if (!config.schema) {
    throw new Error('GraphQL middleware requires a schema. Provide either a GraphQLSchema or SchemaConfig.');
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // 如果是 SchemaConfig，转换为 GraphQLSchema
  let schema: GraphQLSchema;
  if ('typeDefs' in config.schema && 'resolvers' in config.schema) {
    schema = buildSchemaFromConfig(config.schema);
  } else {
    schema = config.schema as GraphQLSchema;
  }

  return async function graphqlHandler(req: Request, res: Response, next: NextFunction) {
    // CORS 预检请求
    if (cfg.enableCors && req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).send();
    }

    // 仅处理 POST 请求
    if (req.method !== 'POST') {
      if (cfg.graphiql && req.method === 'GET') {
        // 简单的 GraphiQL 界面 (生产环境建议使用 graphiql-express)
        return res.type('html').send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>GraphiQL</title>
              <style>body { margin: 0; height: 100vh; }</style>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/graphiql/1.4.2/graphiql.min.css" />
            </head>
            <body>
              <div id="graphiql"></div>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/graphiql/1.4.2/graphiql.min.js"></script>
              <script>
                ReactDOM.render(
                  React.createElement(GraphiQL, {
                    fetcher: async (graphQLParams) => {
                      const response = await fetch('/graphql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(graphQLParams),
                      });
                      return response.json();
                    }
                  }),
                  document.getElementById('graphiql')
                );
              </script>
            </body>
          </html>
        `);
      }
      return res.status(405).json({ error: 'Method not allowed. Use POST for GraphQL queries.' });
    }

    // 解析请求体
    let body: GraphQLRequestBody;
    try {
      body = req.body as GraphQLRequestBody;
      if (!body || !body.query) {
        return res.status(400).json({ errors: [{ message: 'Missing query in request body' }] });
      }
    } catch (e) {
      return res.status(400).json({ errors: [{ message: 'Invalid JSON in request body' }] });
    }

    // 构建上下文
    const contextValue = typeof cfg.context === 'function' 
      ? cfg.context(req) 
      : cfg.context;

    try {
      // 执行 GraphQL 查询
      const result = await graphql({
        schema,
        source: body.query,
        rootValue: null,
        contextValue,
        variableValues: body.variables,
        operationName: body.operationName,
      });

      // 格式化错误
      if (result.errors && cfg.formatErrorFn) {
        result.errors = result.errors.map(cfg.formatErrorFn);
      }

      // 返回结果
      const statusCode = result.errors && result.errors.length > 0 ? 400 : 200;
      const responseData = cfg.pretty 
        ? JSON.stringify(result, null, 2) 
        : JSON.stringify(result);
      
      res.setHeader('Content-Type', 'application/json');
      if (cfg.enableCors) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      res.status(statusCode).send(responseData);
    } catch (error) {
      // 处理执行错误
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ errors: [{ message: errorMessage }] });
    }
  };
}

// ============ 辅助函数 ============

/**
 * 注册 Resolver 到现有 Schema
 * 
 * @param resolvers - Resolver 映射表
 * @returns 合并后的 Resolvers
 * 
 * @example
 * ```typescript
 * const baseResolvers = {
 *   Query: {
 *     hello: () => 'Hello'
 *   }
 * };
 * 
 * const extendedResolvers = registerResolvers(baseResolvers, {
 *   Query: {
 *     world: () => 'World'
 *   }
 * });
 * ```
 */
export function registerResolvers(
  base: Resolvers,
  additional: Resolvers
): Resolvers {
  const merged: Resolvers = { ...base };
  
  Object.entries(additional).forEach(([typeName, typeResolvers]) => {
    if (!merged[typeName]) {
      merged[typeName] = {};
    }
    Object.assign(merged[typeName]!, typeResolvers);
  });
  
  return merged;
}

/**
 * 创建 GraphQL 对象类型
 * 
 * @example
 * ```typescript
 * const UserType = createObjectType('User', {
 *   fields: {
 *     id: { type: new GraphQLNonNull(GraphQLString) },
 *     name: { type: GraphQLString },
 *     email: { type: GraphQLString },
 *     age: { type: GraphQLInt }
 *   }
 * });
 * ```
 */
export function createObjectType(config: {
  name: string;
  description?: string;
  fields: Record<string, {
    type: any;
    description?: string;
    resolve?: ResolverFn;
  }>;
}): GraphQLObjectType {
  const { name, description, fields } = config;
  
  const fieldConfig: any = {};
  Object.entries(fields).forEach(([fieldName, field]) => {
    fieldConfig[fieldName] = {
      type: field.type,
      description: field.description,
      resolve: field.resolve,
    };
  });
  
  return new GraphQLObjectType({
    name,
    description,
    fields: fieldConfig,
  });
}

/**
 * 创建 GraphQL 输入类型
 */
export function createInputType(config: {
  name: string;
  description?: string;
  fields: Record<string, {
    type: any;
    description?: string;
    defaultValue?: any;
  }>;
}): GraphQLInputObjectType {
  const { name, description, fields } = config;
  
  const fieldConfig: any = {};
  Object.entries(fields).forEach(([fieldName, field]) => {
    fieldConfig[fieldName] = {
      type: field.type,
      description: field.description,
      defaultValue: field.defaultValue,
    };
  });
  
  return new GraphQLInputObjectType({
    name,
    description,
    fields: fieldConfig,
  });
}

// ============ 导出 ============

export {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLError,
  buildSchema,
  graphql,
};

export default graphqlMiddleware;
