# SQL 查询构建器技能 - 使用示例

**文件:** `src/skills/query-builder-skill.ts`  
**作者:** Axon (KAEL)  
**版本:** 1.0.0

---

## 📦 导入

```typescript
import queryBuilder, {
  buildSelect,
  buildInsert,
  buildUpdate,
  buildDelete,
  select,
  insert,
  update,
  del,
  // WHERE 条件
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
  like,
  inList,
  notIn,
  between,
  isNull,
  isNotNull,
  exists,
  and,
  or,
  // JOIN
  innerJoin,
  leftJoin,
  rightJoin,
  fullJoin,
  // ORDER BY
  asc,
  desc,
  // 高级功能
  union,
  prepareQuery,
  validateQuery
} from './skills/query-builder-skill';
```

---

## 1️⃣ SELECT 查询

### 1.1 基础查询

```typescript
// 查询所有用户
const result = select('users');
console.log(result.sql);
// SELECT * FROM "users"

// 查询指定字段
const result = select('users', ['id', 'name', 'email']);
console.log(result.sql);
// SELECT "id", "name", "email" FROM "users"

// 带 WHERE 条件
const result = select('users', ['id', 'name'], { status: 'active', age: 18 });
console.log(result.sql);
// SELECT "id", "name" FROM "users" WHERE "status" = ? AND "age" = ?
console.log(result.params);
// ['active', 18]
```

### 1.2 高级 SELECT

```typescript
const result = buildSelect({
  table: 'users',
  alias: 'u',
  fields: [
    { name: 'id', table: 'u' },
    { name: 'name', table: 'u', alias: 'username' },
    { name: 'email', table: 'u' },
    { name: 'created_at', table: 'u', aggregate: 'MAX', alias: 'latest_created' }
  ],
  where: [
    eq('status', 'active'),
    and(gt('age', 18)),
    or(lt('score', 60))
  ],
  orderBy: [
    { field: 'created_at', direction: 'DESC' }
  ],
  limit: 10,
  offset: 0,
  distinct: true
});

console.log(result.sql);
// SELECT DISTINCT "u"."id", "u"."name" AS "username", "u"."email", MAX("u"."created_at") AS "latest_created"
// FROM "users" "u"
// WHERE "status" = ? AND "age" > ? OR "score" < ?
// ORDER BY "created_at" DESC
// LIMIT 10 OFFSET 0

console.log(result.params);
// ['active', 18, 60]
```

### 1.3 带 JOIN 的查询

```typescript
const result = buildSelect({
  table: 'users',
  alias: 'u',
  fields: [
    { name: 'id', table: 'u' },
    { name: 'name', table: 'u' },
    { name: 'title', table: 'o' },
    { name: 'amount', table: 'o' }
  ],
  joins: [
    leftJoin('orders', 'u.id = o.user_id', 'o'),
    innerJoin('products', 'o.product_id = p.id', 'p')
  ],
  where: [
    eq('u.status', 'active'),
    gt('o.amount', 100)
  ],
  orderBy: [
    { field: 'o.created_at', direction: 'DESC' }
  ]
});

console.log(result.sql);
// SELECT "u"."id", "u"."name", "o"."title", "o"."amount"
// FROM "users" "u"
// LEFT JOIN "orders" "o" ON u.id = o.user_id
// INNER JOIN "products" "p" ON o.product_id = p.id
// WHERE "u"."status" = ? AND "o"."amount" > ?
// ORDER BY "o"."created_at" DESC
```

### 1.4 GROUP BY 和 HAVING

```typescript
const result = buildSelect({
  table: 'orders',
  fields: [
    { name: 'user_id', aggregate: 'COUNT', alias: 'order_count' },
    { name: 'amount', aggregate: 'SUM', alias: 'total_amount' },
    { name: 'user_id' }
  ],
  groupBy: ['user_id'],
  having: [
    gt('amount', 1000) // 注意：这里应该使用聚合后的字段
  ],
  orderBy: [
    { field: 'total_amount', direction: 'DESC' }
  ]
});

console.log(result.sql);
// SELECT COUNT("user_id") AS "order_count", SUM("amount") AS "total_amount", "user_id"
// FROM "orders"
// GROUP BY "user_id"
// HAVING "amount" > ?
// ORDER BY "total_amount" DESC
```

---

## 2️⃣ INSERT 查询

### 2.1 单行插入

```typescript
// 便捷方式
const result = insert('users', {
  name: 'John',
  email: 'john@example.com',
  age: 25
});

console.log(result.sql);
// INSERT INTO "users" ("name", "email", "age")
// VALUES (?, ?, ?)

console.log(result.params);
// ['John', 'john@example.com', 25]
```

### 2.2 多行插入

```typescript
const result = buildInsert({
  table: 'users',
  data: [
    { name: 'Alice', email: 'alice@example.com', age: 20 },
    { name: 'Bob', email: 'bob@example.com', age: 30 },
    { name: 'Charlie', email: 'charlie@example.com', age: 25 }
  ]
});

console.log(result.sql);
// INSERT INTO "users" ("name", "email", "age")
// VALUES
// (?, ?, ?),
// (?, ?, ?),
// (?, ?, ?)

console.log(result.params);
// ['Alice', 'alice@example.com', 20, 'Bob', 'bob@example.com', 30, ...]
```

### 2.3 INSERT INTO ... SELECT

```typescript
const result = buildInsert({
  table: 'users_backup',
  selectQuery: 'SELECT * FROM "users" WHERE "status" = ?'
});

console.log(result.sql);
// INSERT INTO "users_backup"
// SELECT * FROM "users" WHERE "status" = ?
```

---

## 3️⃣ UPDATE 查询

### 3.1 基础更新

```typescript
// 便捷方式
const result = update('users', 
  { status: 'inactive', updated_at: new Date() },
  { id: 123 }
);

console.log(result.sql);
// UPDATE "users"
// SET "status" = ?, "updated_at" = ?
// WHERE "id" = ?

console.log(result.params);
// ['inactive', Date, 123]
```

### 3.2 复杂条件更新

```typescript
const result = buildUpdate({
  table: 'products',
  set: {
    price: 99.99,
    stock: 0,
    updated_at: new Date()
  },
  where: [
    lt('stock', 10),
    and(eq('status', 'active'))
  ]
});

console.log(result.sql);
// UPDATE "products"
// SET "price" = ?, "stock" = ?, "updated_at" = ?
// WHERE "stock" < ? AND "status" = ?
```

---

## 4️⃣ DELETE 查询

### 4.1 基础删除

```typescript
// 便捷方式
const result = del('users', { id: 123 });

console.log(result.sql);
// DELETE FROM "users"
// WHERE "id" = ?

console.log(result.params);
// [123]
```

### 4.2 复杂条件删除

```typescript
const result = buildDelete({
  table: 'logs',
  where: [
    lt('created_at', '2025-01-01'),
    or(eq('level', 'DEBUG'))
  ]
});

console.log(result.sql);
// DELETE FROM "logs"
// WHERE "created_at" < ? OR "level" = ?
```

---

## 5️⃣ WHERE 条件构建器

### 5.1 比较操作符

```typescript
eq('status', 'active');      // "status" = 'active'
neq('status', 'deleted');    // "status" != 'deleted'
gt('age', 18);               // "age" > 18
gte('score', 60);            // "score" >= 60
lt('price', 100);            // "price" < 100
lte('quantity', 10);         // "quantity" <= 10
```

### 5.2 特殊条件

```typescript
like('name', '%John%');           // "name" LIKE '%John%'
inList('status', ['active', 'pending']);  // "status" IN ('active', 'pending')
notIn('role', ['banned']);        // "role" NOT IN ('banned')
between('age', 18, 65);           // "age" BETWEEN 18 AND 65
isNull('deleted_at');             // "deleted_at" IS NULL
isNotNull('email');               // "email" IS NOT NULL
```

### 5.3 逻辑组合

```typescript
const where = [
  eq('status', 'active'),
  and(gt('age', 18)),
  or(lt('score', 60)),
  and(between('created_at', '2025-01-01', '2025-12-31'))
];
```

### 5.4 子查询

```typescript
exists('SELECT 1 FROM "orders" WHERE "orders".user_id = "users".id');
```

---

## 6️⃣ JOIN 构建器

```typescript
innerJoin('orders', 'users.id = orders.user_id');
leftJoin('profiles', 'users.id = profiles.user_id', 'p');
rightJoin('departments', 'employees.dept_id = departments.id');
fullJoin('logs', 'sessions.id = logs.session_id');
```

---

## 7️⃣ ORDER BY 构建器

```typescript
asc('created_at');     // "created_at" ASC
desc('updated_at');    // "updated_at" DESC

// 多字段排序
orderBy: [
  { field: 'status', direction: 'ASC' },
  { field: 'created_at', direction: 'DESC' }
]
```

---

## 8️⃣ 高级功能

### 8.1 UNION 查询

```typescript
const query1 = select('users', ['id', 'name'], { status: 'active' });
const query2 = select('admins', ['id', 'name'], { status: 'active' });

const result = union([query1, query2]);
console.log(result.sql);
// SELECT "id", "name" FROM "users" WHERE "status" = ?
// UNION
// SELECT "id", "name" FROM "admins" WHERE "status" = ?

// 使用 UNION ALL (保留重复)
const result = union([query1, query2], true);
```

### 8.2 子查询字段

```typescript
const result = buildSelect({
  table: 'users',
  fields: [
    { name: 'id' },
    { name: 'name' },
    subQueryField(
      'SELECT COUNT(*) FROM "orders" WHERE "orders".user_id = "users".id',
      'order_count'
    )
  ]
});

console.log(result.sql);
// SELECT "id", "name", (SELECT COUNT(*) FROM "orders" WHERE "orders".user_id = "users".id) AS "order_count"
// FROM "users"
```

### 8.3 CASE WHEN 表达式

```typescript
const caseExpr = caseWhen([
  { when: gt('score', 90), then: 'A' },
  { when: gt('score', 80), then: 'B' },
  { when: gt('score', 70), then: 'C' }
], 'D');

console.log(caseExpr);
// CASE WHEN "score" > ? THEN ? WHEN "score" > ? THEN ? WHEN "score" > ? THEN ? ELSE ? END
```

### 8.4 参数化查询调试

```typescript
const result = select('users', ['id', 'name'], { status: 'active', age: 25 });

const prepared = prepareQuery(result);
console.log(prepared.sql);
// SELECT "id", "name" FROM "users" WHERE "status" = ? AND "age" = ?

console.log(prepared.params);
// ['active', 25]

// 生成调试用 SQL (参数已替换)
console.log(prepared.toDebugSql());
// SELECT "id", "name" FROM "users" WHERE "status" = 'active' AND "age" = 25
```

### 8.5 SQL 注入检查

```typescript
const maliciousSql = "SELECT * FROM users; DROP TABLE users;--";

const validation = validateQuery(maliciousSql);
console.log(validation.valid);
// false

console.log(validation.warnings);
// ['包含 DROP 语句', '包含 SQL 注释']
```

---

## 9️⃣ 完整示例

### 9.1 用户订单查询

```typescript
const result = buildSelect({
  table: 'users',
  alias: 'u',
  fields: [
    { name: 'id', table: 'u' },
    { name: 'name', table: 'u' },
    { name: 'email', table: 'u' },
    { name: 'id', table: 'o', aggregate: 'COUNT', alias: 'order_count' },
    { name: 'amount', table: 'o', aggregate: 'SUM', alias: 'total_spent' }
  ],
  joins: [
    leftJoin('orders', 'u.id = o.user_id', 'o')
  ],
  where: [
    eq('u.status', 'active'),
    and(gte('u.created_at', '2025-01-01')),
    and(isNotNull('u.email'))
  ],
  groupBy: ['u.id', 'u.name', 'u.email'],
  having: [
    gt('amount', 100) // 总消费大于 100
  ],
  orderBy: [
    { field: 'total_spent', direction: 'DESC' }
  ],
  limit: 20,
  offset: 0,
  distinct: true
});

console.log('SQL:', result.sql);
console.log('参数:', result.params);

// 生成调试 SQL
const prepared = prepareQuery(result);
console.log('调试 SQL:', prepared.toDebugSql());
```

### 9.2 批量插入日志

```typescript
const logs = [
  { level: 'INFO', message: 'User logged in', user_id: 1 },
  { level: 'ERROR', message: 'Payment failed', user_id: 2 },
  { level: 'WARN', message: 'Low stock', user_id: null },
  { level: 'INFO', message: 'Order completed', user_id: 3 }
];

const result = buildInsert({
  table: 'logs',
  data: logs
});

console.log('SQL:', result.sql);
console.log('参数数量:', result.params.length);
// 参数数量：12 (4 条 × 3 字段)
```

### 9.3 软删除更新

```typescript
const result = buildUpdate({
  table: 'users',
  set: {
    status: 'deleted',
    deleted_at: new Date()
  },
  where: [
    inList('id', [1, 2, 3, 4, 5]),
    and(eq('status', 'active'))
  ]
});

console.log('SQL:', result.sql);
// UPDATE "users"
// SET "status" = ?, "deleted_at" = ?
// WHERE "id" IN (?, ?, ?, ?, ?) AND "status" = ?
```

---

## 🔟 最佳实践

### ✅ 推荐

1. **始终使用参数化查询** - 防止 SQL 注入
2. **使用便捷函数** - `select()`, `insert()`, `update()`, `del()`
3. **验证用户输入** - 使用 `validateQuery()` 检查危险模式
4. **调试时使用 toDebugSql()** - 查看实际执行的 SQL

### ❌ 避免

1. **不要拼接用户输入到 SQL** - 始终使用参数
2. **不要在生产环境使用 toDebugSql()** - 仅用于调试
3. **不要忘记转义标识符** - 使用内置的 `escapeIdentifier()`

---

## 📝 类型定义

```typescript
// WHERE 条件
interface WhereCondition {
  field: string;
  operator: WhereOperator;  // '=', '!=', '>', '<', 'LIKE', 'IN', etc.
  value?: any;
  value2?: any;             // 用于 BETWEEN
  logical?: 'AND' | 'OR';
  subQuery?: string;        // 用于 EXISTS
}

// JOIN 配置
interface JoinConfig {
  table: string;
  type?: JoinType;          // 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  on: string;
  alias?: string;
}

// 查询结果
interface QueryResult {
  sql: string;
  params: any[];
  type: QueryType;          // 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
}
```

---

**完成时间:** 5 分钟  
**技能文件:** `src/skills/query-builder-skill.ts`
