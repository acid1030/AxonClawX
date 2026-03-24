/**
 * GraphQL 中间件使用示例
 * 
 * @author Axon
 * @version 1.0.0
 */

import express from 'express';
import {
  graphqlMiddleware,
  createQueryType,
  createMutationType,
  createObjectType,
  registerResolvers,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLSchema,
} from './graphql';

// ============ 示例 1: 使用 Schema 配置字符串 ============

function example1_schemaString() {
  const app = express();
  
  app.use('/graphql', graphqlMiddleware({
    schema: {
      typeDefs: `
        type Query {
          hello(name: String!): String!
          users: [User!]!
          user(id: ID!): User
        }
        
        type Mutation {
          createUser(name: String!, email: String!): User!
          deleteUser(id: ID!): Boolean!
        }
        
        type User {
          id: ID!
          name: String!
          email: String!
          age: Int
        }
      `,
      resolvers: {
        Query: {
          hello: ({ name }) => `Hello, ${name}!`,
          users: () => [
            { id: '1', name: 'Alice', email: 'alice@example.com', age: 25 },
            { id: '2', name: 'Bob', email: 'bob@example.com', age: 30 },
          ],
          user: ({ id }) => {
            // 模拟数据库查询
            return { id, name: 'User', email: 'user@example.com', age: 28 };
          },
        },
        Mutation: {
          createUser: ({ name, email }) => ({
            id: Math.random().toString(36).substr(2, 9),
            name,
            email,
            age: null,
          }),
          deleteUser: ({ id }) => {
            console.log(`Deleting user ${id}`);
            return true;
          },
        },
      },
    },
    graphiql: true, // 启用 GraphiQL 界面
    context: (req) => ({
      user: req.headers['x-user-id'],
      requestId: req.headers['x-request-id'],
    }),
  }));
  
  return app;
}

// ============ 示例 2: 使用程序化 Schema 构建 ============

function example2_programmaticSchema() {
  const app = express();
  
  // 创建 User 对象类型
  const UserType = createObjectType({
    name: 'User',
    description: '用户类型',
    fields: {
      id: { type: new GraphQLNonNull(GraphQLString), description: '用户 ID' },
      name: { type: GraphQLString, description: '用户名' },
      email: { type: GraphQLString, description: '邮箱' },
      age: { type: GraphQLInt, description: '年龄' },
    },
  });
  
  // 创建 Query 类型
  const QueryType = createQueryType({
    fields: {
      hello: {
        type: new GraphQLNonNull(GraphQLString),
        args: { name: { type: new GraphQLNonNull(GraphQLString) } },
        resolve: (_, { name }) => `Hello, ${name}!`,
      },
      users: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
        resolve: () => [
          { id: '1', name: 'Alice', email: 'alice@example.com', age: 25 },
          { id: '2', name: 'Bob', email: 'bob@example.com', age: 30 },
        ],
      },
    },
  });
  
  // 创建 Mutation 类型
  const MutationType = createMutationType({
    fields: {
      createUser: {
        type: new GraphQLNonNull(UserType),
        args: {
          name: { type: new GraphQLNonNull(GraphQLString) },
          email: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (_, { name, email }) => ({
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          age: null,
        }),
      },
    },
  });
  
  // 构建 Schema
  const schema = new GraphQLSchema({
    query: QueryType,
    mutation: MutationType,
  });
  
  app.use('/graphql', graphqlMiddleware({
    schema,
    graphiql: true,
  }));
  
  return app;
}

// ============ 示例 3: 模块化 Resolver 注册 ============

function example3_modularResolvers() {
  const app = express();
  
  // 基础 Resolver
  const baseResolvers = {
    Query: {
      hello: ({ name }: { name: string }) => `Hello, ${name}!`,
    },
  };
  
  // 用户相关 Resolver
  const userResolvers = {
    Query: {
      users: () => [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ],
      user: ({ id }: { id: string }) => ({ id, name: 'User', email: 'user@example.com' }),
    },
    Mutation: {
      createUser: ({ name, email }: { name: string; email: string }) => ({
        id: Math.random().toString(36).substr(2, 9),
        name,
        email,
      }),
    },
  };
  
  // 合并 Resolver
  const resolvers = registerResolvers(baseResolvers, userResolvers);
  
  app.use('/graphql', graphqlMiddleware({
    schema: {
      typeDefs: `
        type Query {
          hello(name: String!): String!
          users: [User!]!
          user(id: ID!): User
        }
        
        type Mutation {
          createUser(name: String!, email: String!): User!
        }
        
        type User {
          id: ID!
          name: String!
          email: String!
        }
      `,
      resolvers,
    },
  }));
  
  return app;
}

// ============ 示例 4: 带认证上下文的 GraphQL ============

function example4_withAuth() {
  const app = express();
  
  // 模拟用户数据库
  const users = [
    { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user' },
  ];
  
  app.use('/graphql', graphqlMiddleware({
    schema: {
      typeDefs: `
        type Query {
          me: User
          users: [User!]!
        }
        
        type Mutation {
          updateUser(id: ID!, name: String): User!
        }
        
        type User {
          id: ID!
          name: String!
          email: String!
          role: String!
        }
      `,
      resolvers: {
        Query: {
          me: (_: any, __: any, context: any) => {
            // 从上下文中获取当前用户
            if (!context.user) {
              throw new Error('Not authenticated');
            }
            return users.find(u => u.id === context.user);
          },
          users: (_: any, __: any, context: any) => {
            // 只有管理员可以查看所有用户
            if (!context.user || context.role !== 'admin') {
              throw new Error('Unauthorized');
            }
            return users;
          },
        },
        Mutation: {
          updateUser: ({ id, name }: { id: string; name?: string }, _: any, context: any) => {
            // 只有用户可以更新自己的信息
            if (!context.user || context.user !== id) {
              throw new Error('Unauthorized');
            }
            const user = users.find(u => u.id === id);
            if (!user) {
              throw new Error('User not found');
            }
            if (name) {
              user.name = name;
            }
            return user;
          },
        },
      },
    },
    context: (req) => {
      // 从 Authorization header 解析用户
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, role: null };
      }
      
      // 模拟 token 解析 (实际项目中使用 JWT 等)
      const token = authHeader.substring(7);
      // const decoded = jwt.verify(token, SECRET);
      
      return {
        user: '1', // 模拟解析后的用户 ID
        role: 'admin',
      };
    },
  }));
  
  return app;
}

// ============ 示例 5: 完整的 Express 应用 ============

function example5_fullApp() {
  const app = express();
  
  // 解析 JSON 请求体
  app.use(express.json());
  
  // GraphQL 中间件
  app.use('/graphql', graphqlMiddleware({
    schema: {
      typeDefs: `
        type Query {
          hello(name: String!): String!
          echo(message: String!): String!
          add(a: Int!, b: Int!): Int!
        }
        
        type Mutation {
          ping: String!
        }
      `,
      resolvers: {
        Query: {
          hello: ({ name }) => `Hello, ${name}!`,
          echo: ({ message }) => message,
          add: ({ a, b }) => a + b,
        },
        Mutation: {
          ping: () => 'pong',
        },
      },
    },
    graphiql: true,
    pretty: true,
    enableCors: true,
  }));
  
  // 健康检查
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  
  return app;
}

// ============ 测试查询示例 ============

/**
 * 示例 GraphQL 查询:
 * 
 * # 查询
 * query {
 *   hello(name: "World")
 *   users {
 *     id
 *     name
 *     email
 *   }
 * }
 * 
 * # 带变量的查询
 * query GetUser($id: ID!) {
 *   user(id: $id) {
 *     id
 *     name
 *     email
 *   }
 * }
 * 
 * # Mutation
 * mutation {
 *   createUser(name: "Charlie", email: "charlie@example.com") {
 *     id
 *     name
 *     email
 *   }
 * }
 */

// ============ 导出 ============

export {
  example1_schemaString,
  example2_programmaticSchema,
  example3_modularResolvers,
  example4_withAuth,
  example5_fullApp,
};

// 默认导出完整应用示例
export default example5_fullApp;
