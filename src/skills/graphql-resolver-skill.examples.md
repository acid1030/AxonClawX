# GraphQL Resolver Skill 使用示例

## 快速开始

### 1. 基础 Schema 定义

```typescript
import { SchemaBuilder } from './graphql-resolver-skill';

// 创建简单的 User/Post Schema
const schema = new SchemaBuilder()
  .object('User')
    .field('id', 'ID!')
    .field('name', 'String!')
    .field('email', 'String!')
    .field('posts', '[Post]')
  .object('Post')
    .field('id', 'ID!')
    .field('title', 'String!')
    .field('content', 'String!')
    .field('author', 'User!')
  .query('user', {
    args: [{ name: 'id', type: 'ID!' }],
    type: 'User',
  })
  .query('posts', {
    type: '[Post!]',
  })
  .build();

// 输出 SDL
console.log(schema.toSDL());
```

**输出:**
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post]
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  user(id: ID!): User
  posts: [Post!]
}
```

---

### 2. 完整 Schema (含枚举、输入、接口)

```typescript
const schema = new SchemaBuilder()
  // 枚举类型
  .enum('Role')
    .value('ADMIN', '管理员')
    .value('USER', '普通用户')
    .value('GUEST', '访客')
  .end()
  
  // 接口类型
  .interface('Node')
    .field('id', 'ID!')
  .end()
  
  // 对象类型实现接口
  .object('User')
    .field('id', 'ID!')
    .field('name', 'String!')
    .field('email', 'String!')
    .field('role', 'Role!')
    .field('posts', '[Post]')
    .interface('Node')
  .end()
  
  .object('Post')
    .field('id', 'ID!')
    .field('title', 'String!')
    .field('content', 'String!')
    .field('published', 'Boolean!')
    .field('author', 'User!')
    .interface('Node')
  .end()
  
  // 输入类型
  .input('CreateUserInput')
    .field('name', 'String!')
    .field('email', 'String!')
    .field('role', 'Role')
  .end()
  
  .input('CreatePostInput')
    .field('title', 'String!')
    .field('content', 'String!')
  .end()
  
  // Query
  .query('user', {
    args: [{ name: 'id', type: 'ID!' }],
    type: 'User',
  })
  .query('users', {
    args: [
      { name: 'limit', type: 'Int', defaultValue: 10 },
      { name: 'offset', type: 'Int', defaultValue: 0 },
    ],
    type: '[User!]',
  })
  .query('post', {
    args: [{ name: 'id', type: 'ID!' }],
    type: 'Post',
  })
  
  // Mutation
  .mutation('createUser', {
    args: [{ name: 'input', type: 'CreateUserInput!' }],
    type: 'User!',
  })
  .mutation('createPost', {
    args: [{ name: 'input', type: 'CreatePostInput!' }],
    type: 'Post!',
  })
  .mutation('deleteUser', {
    args: [{ name: 'id', type: 'ID!' }],
    type: 'Boolean!',
  })
  
  .build();
```

---

### 3. Resolver 实现

```typescript
import { ResolverMap, ResolverExecutor, QueryContext } from './graphql-resolver-skill';

// 模拟数据库
const db = {
  users: new Map([
    ['1', { id: '1', name: 'Alice', email: 'alice@example.com', role: 'ADMIN' }],
    ['2', { id: '2', name: 'Bob', email: 'bob@example.com', role: 'USER' }],
  ]),
  posts: new Map([
    ['1', { id: '1', title: 'Hello World', content: 'First post!', published: true, authorId: '1' }],
    ['2', { id: '2', title: 'GraphQL Guide', content: 'Learn GraphQL', published: true, authorId: '1' }],
  ]),
};

// 定义 Resolvers
const resolvers: ResolverMap = {
  Query: {
    // 获取单个用户
    user: async (parent, { id }, context) => {
      const user = db.users.get(id);
      if (!user) throw new Error('User not found');
      return {
        ...user,
        posts: async () => {
          return Array.from(db.posts.values()).filter(p => p.authorId === id);
        },
      };
    },
    
    // 获取用户列表
    users: async (parent, { limit, offset }, context) => {
      return Array.from(db.users.values())
        .slice(offset, offset + limit)
        .map(user => ({
          ...user,
          posts: async () => Array.from(db.posts.values()).filter(p => p.authorId === user.id),
        }));
    },
    
    // 获取单个帖子
    post: async (parent, { id }, context) => {
      const post = db.posts.get(id);
      if (!post) throw new Error('Post not found');
      return {
        ...post,
        author: async () => {
          const user = db.users.get(post.authorId);
          if (!user) throw new Error('Author not found');
          return user;
        },
      };
    },
  },
  
  Mutation: {
    // 创建用户
    createUser: async (parent, { input }, context) => {
      const id = String(db.users.size + 1);
      const user = { id, ...input };
      db.users.set(id, user);
      return {
        ...user,
        posts: async () => [],
      };
    },
    
    // 创建帖子
    createPost: async (parent, { input }, context) => {
      const id = String(db.posts.size + 1);
      const post = { 
        id, 
        ...input, 
        published: false,
        authorId: context.user?.id || '1', 
      };
      db.posts.set(id, post);
      return {
        ...post,
        author: async () => {
          const user = db.users.get(post.authorId);
          return user;
        },
      };
    },
    
    // 删除用户
    deleteUser: async (parent, { id }, context) => {
      return db.users.delete(id);
    },
  },
  
  // 字段级 Resolver
  User: {
    posts: async (user) => {
      return Array.from(db.posts.values())
        .filter(p => p.authorId === user.id)
        .map(post => ({
          ...post,
          author: async () => user,
        }));
    },
  },
  
  Post: {
    author: async (post) => {
      const user = db.users.get(post.authorId);
      if (!user) throw new Error('Author not found');
      return user;
    },
  },
};
```

---

### 4. 查询验证

```typescript
import { QueryValidator } from './graphql-resolver-skill';

const validator = new QueryValidator(schema);

// 示例 1: 有效查询
const validQuery = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      posts {
        id
        title
      }
    }
  }
`;

const result1 = validator.validate(validQuery, { id: '1' });
console.log('Valid Query:', result1);
// { success: true, ast: {...}, warnings: [...] }

// 示例 2: 无效字段
const invalidQuery = `
  query GetUser {
    user(id: "1") {
      id
      invalidField
      name
    }
  }
`;

const result2 = validator.validate(invalidQuery);
console.log('Invalid Query:', result2);
// { 
//   success: false, 
//   errors: [{ 
//     message: 'Cannot query field "invalidField" on type "User"',
//     code: 'FIELD_NOT_FOUND'
//   }] 
// }

// 示例 3: 查询深度限制
const deepQuery = `
  query DeepQuery {
    users {
      posts {
        author {
          posts {
            author {
              posts {
                author {
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

const result3 = validator.validate(deepQuery);
console.log('Deep Query:', result3);
// { 
//   success: false, 
//   errors: [{ 
//     message: 'Query depth exceeds maximum allowed depth of 10',
//     code: 'DEPTH_LIMIT_EXCEEDED'
//   }] 
// }

// 示例 4: 查询复杂度检查
const complexQuery = `
  query ComplexQuery {
    users {
      id
      name
      email
      posts {
        id
        title
        content
        author {
          id
          name
          posts {
            id
            title
          }
        }
      }
    }
  }
`;

const result4 = validator.validate(complexQuery);
console.log('Complex Query:', result4);
// { 
//   success: true, 
//   warnings: ['Query complexity (25) exceeds recommended limit of 100'] 
// }
```

---

### 5. 查询执行

```typescript
import { ResolverExecutor } from './graphql-resolver-skill';

const executor = new ResolverExecutor(schema, resolvers);

// 执行查询
async function runExample() {
  const query = `
    query GetUserWithPosts($id: ID!) {
      user(id: $id) {
        id
        name
        email
        posts {
          id
          title
          content
        }
      }
    }
  `;
  
  const result = await executor.execute(query, { id: '1' }, {
    user: { id: 'admin', role: 'ADMIN' },
    headers: { 'authorization': 'Bearer token' },
  });
  
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  } else {
    console.log('Data:', JSON.stringify(result.data, null, 2));
  }
}

runExample();

// 输出:
// {
//   "data": {
//     "user": {
//       "id": "1",
//       "name": "Alice",
//       "email": "alice@example.com",
//       "posts": [
//         {
//           "id": "1",
//           "title": "Hello World",
//           "content": "First post!"
//         },
//         {
//           "id": "2",
//           "title": "GraphQL Guide",
//           "content": "Learn GraphQL"
//         }
//       ]
//     }
//   }
// }
```

---

### 6. Mutation 执行

```typescript
async function runMutation() {
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        title
        content
        published
        author {
          id
          name
        }
      }
    }
  `;
  
  const result = await executor.execute(mutation, {
    input: {
      title: 'New Post',
      content: 'This is a new post created via GraphQL mutation.',
    },
  }, {
    user: { id: '1', role: 'USER' },
  });
  
  console.log('Mutation Result:', JSON.stringify(result.data, null, 2));
}

runMutation();
```

---

### 7. 高级用法

#### 7.1 Union 类型

```typescript
const schema = new SchemaBuilder()
  .object('TextPost')
    .field('id', 'ID!')
    .field('content', 'String!')
  .end()
  
  .object('ImagePost')
    .field('id', 'ID!')
    .field('imageUrl', 'String!')
    .field('caption', 'String')
  .end()
  
  .object('VideoPost')
    .field('id', 'ID!')
    .field('videoUrl', 'String!')
    .field('duration', 'Int')
  .end()
  
  .union('PostContent')
    .types('TextPost', 'ImagePost', 'VideoPost')
  .end()
  
  .query('post', {
    args: [{ name: 'id', type: 'ID!' }],
    type: 'PostContent',
  })
  .build();
```

#### 7.2 自定义标量

```typescript
const schema = new SchemaBuilder({
  customScalars: ['DateTime', 'JSON', 'Upload'],
})
  .object('Event')
    .field('id', 'ID!')
    .field('name', 'String!')
    .field('startTime', 'DateTime!')
    .field('metadata', 'JSON')
  .end()
  .build();

// 需要在 resolver 中处理自定义标量的序列化/反序列化
```

#### 7.3 带描述的 Schema

```typescript
const schema = new SchemaBuilder()
  .object('User')
    .desc('系统用户')
    .field('id', 'ID!', undefined, '用户唯一标识')
    .field('name', 'String!', undefined, '用户昵称')
    .field('email', 'String!', undefined, '用户邮箱')
  .end()
  
  .query('user', {
    args: [{ name: 'id', type: 'ID!', description: '用户 ID' }],
    type: 'User',
    description: '根据 ID 获取用户信息',
  })
  .build();
```

---

## API 参考

### SchemaBuilder

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `object(name)` | `name: string` | `TypeBuilder` | 定义对象类型 |
| `enum(name)` | `name: string` | `EnumBuilder` | 定义枚举类型 |
| `input(name)` | `name: string` | `InputBuilder` | 定义输入类型 |
| `interface(name)` | `name: string` | `InterfaceBuilder` | 定义接口类型 |
| `union(name)` | `name: string` | `UnionBuilder` | 定义 Union 类型 |
| `query(name, field)` | `name: string, field: GraphQLField` | `this` | 添加查询字段 |
| `mutation(name, field)` | `name: string, field: GraphQLField` | `this` | 添加变异字段 |
| `subscription(name, field)` | `name: string, field: GraphQLField` | `this` | 添加订阅字段 |
| `build()` | - | `GraphQLSchema` | 构建 Schema |

### QueryValidator

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `validate(query, variables?)` | `query: string, variables?: Record` | `GraphQLParseResult` | 验证查询 |

### ResolverExecutor

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `execute(query, variables?, context?)` | `query: string, variables?: Record, context?: QueryContext` | `Promise<GraphQLExecutionResult>` | 执行查询 |

---

## 错误处理

```typescript
const result = await executor.execute(query, variables, context);

if (result.errors.length > 0) {
  for (const error of result.errors) {
    console.error(`[${error.code}] ${error.message}`);
    
    if (error.locations) {
      error.locations.forEach(loc => {
        console.error(`  at line ${loc.line}, column ${loc.column}`);
      });
    }
    
    if (error.path) {
      console.error(`  path: ${error.path.join('.')}`);
    }
  }
}
```

---

## 最佳实践

1. **Schema 设计**
   - 使用清晰的命名约定
   - 为所有类型和字段添加描述
   - 合理使用枚举类型限制值域

2. **Resolver 实现**
   - 避免 N+1 查询问题（使用 DataLoader）
   - 错误处理要具体，不要吞掉错误
   - 使用 async/await 处理异步操作

3. **查询验证**
   - 始终在执行前验证查询
   - 设置合理的深度和复杂度限制
   - 记录验证警告用于优化

4. **性能优化**
   - 使用字段级 resolver 懒加载关联数据
   - 实现查询缓存
   - 限制列表查询的默认大小

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
