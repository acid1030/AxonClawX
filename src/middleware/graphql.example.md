# GraphQL 中间件使用指南

## 安装依赖

```bash
npm install graphql
# 或
yarn add graphql
# 或
pnpm add graphql
```

## 快速开始

### 基础用法

```typescript
import express from 'express';
import { graphqlMiddleware } from './middleware/graphql';

const app = express();

app.use('/graphql', graphqlMiddleware({
  schema: {
    typeDefs: `
      type Query {
        hello(name: String!): String!
      }
    `,
    resolvers: {
      Query: {
        hello: ({ name }) => `Hello, ${name}!`
      }
    }
  },
  graphiql: true // 启用 GraphiQL 界面
}));

app.listen(3000, () => {
  console.log('GraphQL server running at http://localhost:3000/graphql');
});
```

### 测试查询

打开 GraphiQL 界面 (http://localhost:3000/graphql) 并执行:

```graphql
query {
  hello(name: "World")
}
```

响应:

```json
{
  "data": {
    "hello": "Hello, World!"
  }
}
```

## 高级用法

### 1. 程序化 Schema 构建

```typescript
import {
  graphqlMiddleware,
  createQueryType,
  createObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLList,
  GraphQLSchema
} from './middleware/graphql';

// 创建对象类型
const UserType = createObjectType({
  name: 'User',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLString },
    age: { type: GraphQLInt }
  }
});

// 创建 Query 类型
const QueryType = createQueryType({
  fields: {
    users: {
      type: new GraphQLList(UserType),
      resolve: () => [
        { id: '1', name: 'Alice', age: 25 },
        { id: '2', name: 'Bob', age: 30 }
      ]
    }
  }
});

// 构建 Schema
const schema = new GraphQLSchema({ query: QueryType });

app.use('/graphql', graphqlMiddleware({ schema }));
```

### 2. 模块化 Resolver

```typescript
import { registerResolvers } from './middleware/graphql';

// 基础 Resolver
const baseResolvers = {
  Query: {
    hello: () => 'Hello'
  }
};

// 用户 Resolver
const userResolvers = {
  Query: {
    users: () => [...]
  },
  Mutation: {
    createUser: () => {...}
  }
};

// 合并 Resolver
const resolvers = registerResolvers(baseResolvers, userResolvers);
```

### 3. 自定义上下文

```typescript
app.use('/graphql', graphqlMiddleware({
  schema,
  context: (req) => ({
    user: req.headers['x-user-id'],
    role: req.headers['x-role'],
    requestId: req.headers['x-request-id']
  })
}));
```

在 Resolver 中使用:

```typescript
Query: {
  me: (_, __, context) => {
    if (!context.user) {
      throw new Error('Not authenticated');
    }
    return getUserById(context.user);
  }
}
```

### 4. 错误处理

```typescript
app.use('/graphql', graphqlMiddleware({
  schema,
  formatErrorFn: (error) => {
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      path: error.path,
      code: error.extensions?.code || 'INTERNAL_ERROR'
    };
  }
}));
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `schema` | `GraphQLSchema \| SchemaConfig` | 必填 | GraphQL Schema 或配置 |
| `path` | `string` | `/graphql` | GraphQL 端点路径 |
| `graphiql` | `boolean` | `false` | 是否启用 GraphiQL 界面 |
| `context` | `object \| (req) => object` | `{}` | 查询上下文 |
| `formatErrorFn` | `function` | `formatError` | 错误格式化函数 |
| `pretty` | `boolean` | `true` | 格式化 JSON 响应 |
| `enableCors` | `boolean` | `true` | 启用 CORS |

## 完整示例

参考 `graphql.example.ts` 文件查看 5 个完整示例:

1. **Schema 配置字符串** - 使用 typeDefs + resolvers
2. **程序化 Schema 构建** - 使用 createQueryType 等工具函数
3. **模块化 Resolver** - 使用 registerResolvers 合并多个 Resolver
4. **带认证的 GraphQL** - 实现用户认证和权限控制
5. **完整的 Express 应用** - 包含健康检查等完整配置

## 常见问题

### Q: 如何处理文件上传？

GraphQL 本身不支持文件上传，需要使用 `graphql-upload` 包:

```bash
npm install graphql-upload
```

### Q: 如何实现订阅 (Subscription)?

需要 WebSocket 支持，推荐使用 `graphql-ws` 或 `subscriptions-transport-ws`。

### Q: 如何连接数据库？

在 context 中注入数据库连接:

```typescript
context: (req) => ({
  db: getDatabaseConnection(),
  models: { User, Post, Comment }
})
```

### Q: 如何添加查询复杂度限制？

使用 `graphql-depth-limit` 和 `graphql-query-complexity`:

```bash
npm install graphql-depth-limit graphql-query-complexity
```

```typescript
import depthLimit from 'graphql-depth-limit';
import { createComplexityRule } from 'graphql-query-complexity';

validationRules: [
  depthLimit(5),
  createComplexityRule({ maximumComplexity: 1000 })
]
```

## 性能优化

1. **启用查询缓存** - 缓存频繁查询的结果
2. **使用 DataLoader** - 批量加载和缓存数据库查询
3. **限制查询深度** - 防止恶意深度查询
4. **查询复杂度分析** - 限制复杂查询
5. **持久化查询** - 预注册常用查询

## 安全建议

1. ✅ 始终验证用户输入
2. ✅ 实现查询复杂度限制
3. ✅ 使用 HTTPS
4. ✅ 添加速率限制
5. ✅ 记录所有查询日志
6. ✅ 不要暴露内部错误信息
7. ✅ 实现适当的认证和授权

## 参考资料

- [GraphQL 官方文档](https://graphql.org/learn/)
- [GraphQL.js GitHub](https://github.com/graphql/graphql-js)
- [GraphiQL](https://github.com/graphql/graphiql)
- [Apollo Server](https://www.apollographql.com/docs/apollo-server/)
