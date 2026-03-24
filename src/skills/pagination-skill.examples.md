# 分页技能使用示例 - Pagination Skill Examples

## 目录

1. [页码分页基础](#页码分页基础)
2. [游标分页基础](#游标分页基础)
3. [API 集成示例](#api 集成示例)
4. [数据库查询集成](#数据库查询集成)

---

## 页码分页基础

### 1. 计算偏移量

```typescript
import { calculateOffset, calculateTotalPages } from './pagination-skill';

// 计算 SQL OFFSET/LIMIT
const { offset, limit } = calculateOffset(3, 20);
// offset: 40, limit: 20
// SQL: SELECT * FROM users LIMIT 20 OFFSET 40

// 计算总页数
const totalPages = calculateTotalPages(153, 20);
// totalPages: 8
```

### 2. 生成分页元数据

```typescript
import { generatePaginationMeta } from './pagination-skill';

const meta = generatePaginationMeta({
  page: 3,
  pageSize: 20,
  total: 153
});

/*
{
  currentPage: 3,
  pageSize: 20,
  total: 153,
  totalPages: 8,
  hasPrevious: true,
  hasNext: true,
  previousPage: 2,
  nextPage: 4,
  startIndex: 40,
  endIndex: 59,
  itemCount: 20
}
*/
```

### 3. 创建分页响应

```typescript
import { createPaginatedResponse } from './pagination-skill';

interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [/* 20 条用户数据 */];

const response = createPaginatedResponse(users, {
  page: 3,
  pageSize: 20,
  total: 153
});

/*
{
  data: [...],
  meta: {
    currentPage: 3,
    pageSize: 20,
    total: 153,
    totalPages: 8,
    hasPrevious: true,
    hasNext: true,
    previousPage: 2,
    nextPage: 4,
    startIndex: 40,
    endIndex: 59,
    itemCount: 20
  }
}
*/
```

### 4. 解析查询参数

```typescript
import { parsePaginationParams } from './pagination-skill';

// Express/Koa 路由
app.get('/users', (req, res) => {
  const { page, pageSize } = parsePaginationParams(req.query, {
    page: 1,
    pageSize: 20
  });
  
  // page: 从 query 获取，默认 1
  // pageSize: 从 query 获取，默认 20，最大 100
});

// 示例查询参数：?page=5&pageSize=50
// 返回：{ page: 5, pageSize: 50 }
```

---

## 游标分页基础

### 1. 编码/解码游标

```typescript
import { encodeCursor, decodeCursor } from './pagination-skill';

// 编码游标
const cursor = encodeCursor({
  id: 12345,
  sortValue: '2024-01-15T10:30:00Z',
  metadata: { username: 'alice' }
});
// cursor: "eyJpZCI6MTIzNDUsInNvcnRWYWx1ZSI6IjIwMjQtMDEtMTVUMTA6MzA6MDBaIiwibWV0YWRhdGEiOnsidXNlcm5hbWUiOiJhbGljZSJ9fQ=="

// 解码游标
const info = decodeCursor(cursor);
/*
{
  id: 12345,
  sortValue: '2024-01-15T10:30:00Z',
  metadata: { username: 'alice' }
}
*/
```

### 2. 从记录生成游标

```typescript
import { generateCursorFromRecord } from './pagination-skill';

interface Message {
  id: number;
  content: string;
  createdAt: string;
}

const message: Message = {
  id: 98765,
  content: 'Hello World',
  createdAt: '2024-01-15T10:30:00Z'
};

const cursor = generateCursorFromRecord(message, 'id', 'createdAt');
// 使用 id 和 createdAt 生成游标
```

### 3. 创建游标分页响应

```typescript
import { createCursorPaginatedResponse } from './pagination-skill';

interface Post {
  id: number;
  title: string;
  createdAt: string;
}

const posts: Post[] = [/* 10 条帖子数据 */];

const response = createCursorPaginatedResponse(posts, {
  cursor: 'eyJpZCI6MTIzfQ==', // 上一页的游标
  limit: 10,
  hasMore: true // 是否还有更多数据
});

/*
{
  data: [...],
  meta: {
    limit: 10,
    hasPrevious: true,
    hasNext: true,
    previousCursor: 'eyJpZCI6MTIzfQ==',
    nextCursor: 'eyJpZCI6NDU2fQ==', // 自动生成
    itemCount: 10
  }
}
*/
```

### 4. 解析游标查询参数

```typescript
import { parseCursorParams } from './pagination-skill';

app.get('/messages', (req, res) => {
  const { cursor, limit } = parseCursorParams(req.query, {
    limit: 20
  });
  
  // cursor: 可选，上一页的游标
  // limit: 每页大小，默认 20，最大 100
});
```

---

## API 集成示例

### RESTful API - 页码分页

```typescript
import express from 'express';
import { createPaginatedResponse, parsePaginationParams } from './pagination-skill';

const app = express();

interface Product {
  id: number;
  name: string;
  price: number;
}

// 模拟数据库查询
async function fetchProducts(offset: number, limit: number): Promise<{ data: Product[]; total: number }> {
  // SELECT * FROM products LIMIT ? OFFSET ?
  // SELECT COUNT(*) FROM products
  const data = [/* ... */];
  const total = 523;
  return { data, total };
}

app.get('/api/products', async (req, res) => {
  try {
    const { page, pageSize } = parsePaginationParams(req.query);
    const { offset, limit } = calculateOffset(page, pageSize);
    
    const { data, total } = await fetchProducts(offset, limit);
    
    const response = createPaginatedResponse(data, {
      page,
      pageSize,
      total
    });
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 响应示例:
// GET /api/products?page=3&pageSize=20
/*
{
  "data": [...],
  "meta": {
    "currentPage": 3,
    "pageSize": 20,
    "total": 523,
    "totalPages": 27,
    "hasPrevious": true,
    "hasNext": true,
    "previousPage": 2,
    "nextPage": 4,
    "startIndex": 40,
    "endIndex": 59,
    "itemCount": 20
  }
}
*/
```

### RESTful API - 游标分页

```typescript
import express from 'express';
import { createCursorPaginatedResponse, parseCursorParams, decodeCursor } from './pagination-skill';

const app = express();

interface Activity {
  id: number;
  userId: number;
  action: string;
  createdAt: string;
}

// 模拟数据库查询
async function fetchActivities(cursor?: string, limit?: number): Promise<{ data: Activity[]; hasMore: boolean }> {
  let whereClause = '';
  if (cursor) {
    const cursorInfo = decodeCursor(cursor);
    // WHERE createdAt < ? OR (createdAt = ? AND id < ?)
    whereClause = `WHERE created_at < '${cursorInfo.sortValue}'`;
  }
  
  const data = [/* ... */];
  const hasMore = data.length === limit;
  return { data, hasMore };
}

app.get('/api/activities', async (req, res) => {
  try {
    const { cursor, limit } = parseCursorParams(req.query);
    const { data, hasMore } = await fetchActivities(cursor, limit);
    
    const response = createCursorPaginatedResponse(data, {
      cursor,
      limit,
      hasMore
    });
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 响应示例:
// GET /api/activities?limit=10&cursor=eyJpZCI6MTIzfQ==
/*
{
  "data": [...],
  "meta": {
    "limit": 10,
    "hasPrevious": true,
    "hasNext": true,
    "previousCursor": "eyJpZCI6MTIzfQ==",
    "nextCursor": "eyJpZCI6NDU2fQ==",
    "itemCount": 10
  }
}
*/
```

---

## 数据库查询集成

### Prisma + 页码分页

```typescript
import { PrismaClient } from '@prisma/client';
import { createPaginatedResponse, parsePaginationParams } from './pagination-skill';

const prisma = new PrismaClient();

async function getUsers(req: Request) {
  const { page, pageSize } = parsePaginationParams(req.query);
  const { offset, limit } = calculateOffset(page, pageSize);
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count()
  ]);
  
  return createPaginatedResponse(users, {
    page,
    pageSize,
    total
  });
}
```

### Prisma + 游标分页

```typescript
import { PrismaClient } from '@prisma/client';
import { createCursorPaginatedResponse, parseCursorParams, decodeCursor } from './pagination-skill';

const prisma = new PrismaClient();

async function getPosts(req: Request) {
  const { cursor, limit } = parseCursorParams(req.query);
  
  let cursorObj = {};
  if (cursor) {
    const cursorInfo = decodeCursor(cursor);
    cursorObj = {
      createdAt_id: {
        createdAt: cursorInfo.sortValue as string,
        id: cursorInfo.id as number
      }
    };
  }
  
  const posts = await prisma.post.findMany({
    take: limit + 1, // 多取一条判断是否有更多
    cursor: cursor ? cursorObj : undefined,
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });
  
  const hasMore = posts.length > limit;
  if (hasMore) {
    posts.pop(); // 移除多余的那条
  }
  
  return createCursorPaginatedResponse(posts, {
    cursor,
    limit,
    hasMore
  });
}
```

### TypeORM + 页码分页

```typescript
import { Repository } from 'typeorm';
import { User } from './entity/User';
import { createPaginatedResponse, parsePaginationParams } from './pagination-skill';

async function getUsers(userRepo: Repository<User>, req: Request) {
  const { page, pageSize } = parsePaginationParams(req.query);
  
  const [users, total] = await userRepo.findAndCount({
    skip: (page - 1) * pageSize,
    take: pageSize,
    order: { createdAt: 'DESC' }
  });
  
  return createPaginatedResponse(users, {
    page,
    pageSize,
    total
  });
}
```

### MongoDB + 游标分页

```typescript
import { Collection } from 'mongodb';
import { createCursorPaginatedResponse, parseCursorParams, decodeCursor } from './pagination-skill';

interface Comment {
  _id: ObjectId;
  postId: string;
  content: string;
  createdAt: Date;
}

async function getComments(comments: Collection<Comment>, req: Request) {
  const { cursor, limit } = parseCursorParams(req.query);
  
  let query = {};
  if (cursor) {
    const cursorInfo = decodeCursor(cursor);
    query = {
      $or: [
        { createdAt: { $lt: new Date(cursorInfo.sortValue as string) } },
        { 
          createdAt: new Date(cursorInfo.sortValue as string),
          _id: { $lt: cursorInfo.id as ObjectId }
        }
      ]
    };
  }
  
  const data = await comments.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();
  
  const hasMore = data.length > limit;
  if (hasMore) {
    data.pop();
  }
  
  return createCursorPaginatedResponse(data.map(item => ({
    id: item._id.toHexString(),
    postId: item.postId,
    content: item.content,
    createdAt: item.createdAt.toISOString()
  })), {
    cursor,
    limit,
    hasMore
  });
}
```

---

## 前端集成示例

### React Hook - 页码分页

```typescript
import { useState, useEffect } from 'react';
import { PaginatedResponse } from './pagination-skill';

interface User {
  id: number;
  name: string;
}

function usePaginatedUsers(pageSize: number = 20) {
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?page=${page}&pageSize=${pageSize}`);
        const data = await res.json();
        setResponse(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    
    fetch();
  }, [page, pageSize]);
  
  return {
    page,
    setPage,
    response,
    loading,
    error,
    totalPages: response?.meta.totalPages ?? 0
  };
}

// 使用
function UserList() {
  const { page, setPage, response, loading, totalPages } = usePaginatedUsers();
  
  if (loading) return <div>Loading...</div>;
  if (!response) return <div>No data</div>;
  
  return (
    <div>
      {response.data.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
      
      <div>
        <button 
          onClick={() => setPage(page - 1)} 
          disabled={!response.meta.hasPrevious}
        >
          上一页
        </button>
        <span>第 {page} 页 / 共 {totalPages} 页</span>
        <button 
          onClick={() => setPage(page + 1)} 
          disabled={!response.meta.hasNext}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
```

### React Hook - 游标分页 (无限滚动)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { CursorPaginatedResponse } from './pagination-skill';

interface Post {
  id: number;
  title: string;
}

function useInfinitePosts(limit: number = 20) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const url = cursor 
        ? `/api/posts?limit=${limit}&cursor=${cursor}`
        : `/api/posts?limit=${limit}`;
      
      const res = await fetch(url);
      const data: CursorPaginatedResponse<Post> = await res.json();
      
      setPosts(prev => [...prev, ...data.data]);
      setCursor(data.meta.nextCursor ?? undefined);
      setHasMore(data.meta.hasNext);
    } finally {
      setLoading(false);
    }
  }, [cursor, limit, loading, hasMore]);
  
  return {
    posts,
    loading,
    hasMore,
    loadMore
  };
}

// 使用 (配合 react-window 或类似库实现无限滚动)
function PostFeed() {
  const { posts, loading, hasMore, loadMore } = useInfinitePosts();
  
  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
      {loading && <div>Loading...</div>}
      {!hasMore && <div>No more posts</div>}
      <button onClick={loadMore} disabled={loading || !hasMore}>
        加载更多
      </button>
    </div>
  );
}
```

---

## 最佳实践

### 1. 选择合适的分页方式

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 用户明确需要跳转页码 | 页码分页 | 用户体验直观 |
| 大数据集、实时数据 | 游标分页 | 性能更好、数据一致 |
| 无限滚动/瀑布流 | 游标分页 | 天然适配 |
| SEO 需求 | 页码分页 | URL 友好 |

### 2. 性能优化

```typescript
// 限制最大页大小
const pageSize = Math.min(requestedPageSize, 100);

// 深分页优化 (避免 OFFSET 过大)
// 使用游标或 keyset 分页替代
WHERE id > last_seen_id ORDER BY id LIMIT 20

// 添加索引
CREATE INDEX idx_created_at ON posts(created_at, id);
```

### 3. 错误处理

```typescript
try {
  const cursorInfo = decodeCursor(cursor);
} catch (error) {
  // 游标无效，从头开始
  return fetchInitialPage();
}
```

### 4. 安全性

```typescript
// 验证游标格式
function isValidCursor(cursor: string): boolean {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
}

// 限制查询范围
const maxPageSize = 100;
const pageSize = Math.min(requestedPageSize, maxPageSize);
```

---

## API 响应头建议

```typescript
// 添加分页信息到响应头
res.set('X-Total-Count', total.toString());
res.set('X-Page', page.toString());
res.set('X-Page-Size', pageSize.toString());
res.set('X-Total-Pages', totalPages.toString());

// Link header (RFC 5988)
const baseUrl = '/api/users';
const links = [
  `<${baseUrl}?page=1>; rel="first"`,
  `<${baseUrl}?page=${totalPages}>; rel="last"`,
  previousPage && `<${baseUrl}?page=${previousPage}>; rel="prev"`,
  nextPage && `<${baseUrl}?page=${nextPage}>; rel="next"`
].filter(Boolean).join(', ');

res.set('Link', links);
```

---

_Axon 出品 · 极致优雅 · 绝对高效_
