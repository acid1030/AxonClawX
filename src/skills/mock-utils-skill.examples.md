# Mock Utils Skill - 使用示例

**版本:** 1.0.0  
**作者:** Axon  
**功能:** Mock 数据生成工具

---

## 📦 快速开始

```typescript
import {
  generateChineseName,
  generateEmail,
  generatePhone,
  generateMockUsers,
  generateMockArticles,
  generateMockOrders,
  createSuccessResponse,
  generateTemplate
} from './src/skills/mock-utils-skill';
```

---

## 1️⃣ 随机数据生成

### 生成姓名

```typescript
// 中文姓名
generateChineseName();                    // "张伟"
generateChineseName('male');              // "李强"
generateChineseName('female');            // "王娜"

// 英文姓名
generateEnglishName();                    // "John Smith"
generateEnglishName('male');              // "Michael Johnson"
generateEnglishName('female');            // "Mary Williams"
```

### 生成联系方式

```typescript
// 邮箱地址
generateEmail();                          // "zhangwei123@gmail.com"
generateEmail("john.doe");                // "john.doe456@yahoo.com"

// 手机号码
generatePhone();                          // "13812345678"
```

### 生成地址信息

```typescript
const address = generateAddress();
// {
//   province: "广东",
//   city: "深圳",
//   area: "南山区",
//   street: "科技园南路 123 号",
//   zip: "518000"
// }
```

### 生成其他信息

```typescript
// 公司名称
generateCompany();                        // "华为科技有限公司"

// 职位
generateJobTitle();                       // "高级工程师"

// 身份证号
generateIDCard();                         // "110101199001011234"

// 银行卡号
generateBankCard();                       // "6222021234567890123"
generateBankCard('622848');               // "6228481234567890123" (农业银行)
```

---

## 2️⃣ Mock API 响应

### 生成用户数据

```typescript
// 生成单个用户
const [user] = generateMockUsers(1);
// {
//   id: "usr_abc123",
//   username: "user_xyz789",
//   email: "zhangwei@gmail.com",
//   phone: "13812345678",
//   name: "张伟",
//   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=abc123",
//   gender: "male",
//   birthday: "1990-05-15",
//   address: { ... },
//   createdAt: "2024-01-15T10:30:00.000Z"
// }

// 生成多个用户
const users = generateMockUsers(10);      // 生成 10 个用户数据
```

### 生成文章数据

```typescript
const articles = generateMockArticles(5);
// [
//   {
//     id: "art_abc123",
//     title: "探索人工智能的未来发展趋势",
//     content: "Lorem ipsum dolor sit amet...",
//     author: {
//       id: "usr_xyz789",
//       name: "李明",
//       avatar: "https://..."
//     },
//     tags: ["技术", "AI", "编程"],
//     views: 12345,
//     likes: 567,
//     comments: 89,
//     status: "published",
//     createdAt: "2024-01-10T08:00:00.000Z",
//     updatedAt: "2024-01-12T14:30:00.000Z"
//   }
// ]
```

### 生成订单数据

```typescript
const orders = generateMockOrders(3);
// [
//   {
//     id: "ord_abc123",
//     orderNo: "ORD20240001",
//     userId: "usr_xyz789",
//     products: [
//       {
//         id: "prd_001",
//         name: "iPhone 15 Pro",
//         price: 8999,
//         quantity: 1
//       }
//     ],
//     totalAmount: 8999,
//     status: "delivered",
//     paymentMethod: "alipay",
//     shippingAddress: { ... },
//     createdAt: "2024-01-01T10:00:00.000Z",
//     paidAt: "2024-01-01T10:01:00.000Z",
//     shippedAt: "2024-01-02T09:00:00.000Z",
//     deliveredAt: "2024-01-04T15:30:00.000Z"
//   }
// ]
```

### 创建 API 响应

```typescript
// 成功响应
const successResp = createSuccessResponse({
  users: generateMockUsers(5),
  total: 100,
  page: 1
});
// {
//   code: 200,
//   message: "success",
//   data: { users: [...], total: 100, page: 1 },
//   timestamp: 1710316800000,
//   requestId: "req_abc123xyz789"
// }

// 失败响应
const errorResp = createErrorResponse(400, "参数错误");
// {
//   code: 400,
//   message: "参数错误",
//   data: null,
//   timestamp: 1710316800000,
//   requestId: "req_def456uvw012"
// }

// 自定义错误
const notFoundResp = createErrorResponse(404, "资源不存在");
const unauthorizedResp = createErrorResponse(401, "未授权");
const serverErrorResp = createErrorResponse(500, "服务器内部错误");
```

---

## 3️⃣ 数据模板

### 使用预定义模板

```typescript
// 用户模板
const users = generateTemplate('user', { count: 5 });

// 文章模板
const articles = generateTemplate('article', { count: 10 });

// 订单模板
const orders = generateTemplate('order', { count: 3 });

// 商品模板
const products = generateTemplate('product', { count: 20 });

// 评论模板
const comments = generateTemplate('comment', { count: 50 });

// 通知模板
const notifications = generateTemplate('notification', { count: 10 });

// 日志模板
const logs = generateTemplate('log', { count: 100 });

// 指标模板
const metrics = generateTemplate('metric', { count: 7 });
```

### 自定义字段

```typescript
// 添加自定义字段
const users = generateTemplate('user', {
  count: 5,
  fields: {
    isActive: true,
    role: 'admin',
    department: '技术部'
  }
});
// 每个用户都会包含 isActive、role、department 字段

// 文章添加自定义字段
const articles = generateTemplate('article', {
  count: 3,
  fields: {
    category: '技术博客',
    isFeatured: true,
    author: {
      id: 'usr_fixed',
      name: '固定作者',
      avatar: 'https://...'
    }
  }
});
```

### 模板类型说明

| 模板类型 | 描述 | 主要字段 |
|---------|------|---------|
| `user` | 用户数据 | id, username, email, phone, name, avatar, address |
| `article` | 文章数据 | id, title, content, author, tags, views, likes |
| `order` | 订单数据 | id, orderNo, products, totalAmount, status |
| `product` | 商品数据 | id, name, price, stock, category, images, rating |
| `comment` | 评论数据 | id, userId, content, rating, likes |
| `notification` | 通知数据 | id, type, title, content, read |
| `log` | 日志数据 | id, level, module, message, context |
| `metric` | 指标数据 | name, value, unit, change, trend |

---

## 🎯 实际应用场景

### 场景 1: 前端开发 Mock 数据

```typescript
// 模拟用户列表接口
function mockGetUserList(page: number, size: number) {
  const users = generateMockUsers(size);
  return createSuccessResponse({
    users,
    total: 100,
    page,
    size
  });
}

// 模拟文章详情接口
function mockGetArticleDetail(id: string) {
  const [article] = generateMockArticles(1);
  article.id = id;
  return createSuccessResponse(article);
}
```

### 场景 2: 压力测试数据

```typescript
// 生成大量测试用户
const testUsers = generateMockUsers(10000);

// 生成大量测试订单
const testOrders = generateMockOrders(5000);

// 生成大量日志数据
const testLogs = generateTemplate('log', { count: 100000 });
```

### 场景 3: UI 组件展示

```typescript
// 为表格组件提供示例数据
const tableData = {
  columns: ['姓名', '邮箱', '手机', '地址'],
  rows: generateMockUsers(10).map(u => [
    u.name,
    u.email,
    u.phone,
    `${u.address.city}${u.address.area}`
  ])
};

// 为卡片组件提供示例数据
const cardData = generateMockArticles(6);

// 为图表组件提供示例数据
const chartData = generateTemplate('metric', { count: 12 });
```

### 场景 4: API 文档示例

```typescript
// OpenAPI/Swagger 示例响应
const apiExamples = {
  getUserResponse: createSuccessResponse(generateMockUsers(1)[0]),
  createOrderResponse: createSuccessResponse(generateMockOrders(1)[0]),
  errorResponse: createErrorResponse(400, "请求参数无效")
};
```

---

## ⚡ 高级用法

### 组合使用

```typescript
// 生成完整的电商场景数据
function generateEcommerceData() {
  const users = generateMockUsers(10);
  const products = generateTemplate('product', { count: 20 });
  const orders = generateMockOrders(5);
  const reviews = generateTemplate('comment', { count: 50 });
  
  return createSuccessResponse({
    users,
    products,
    orders,
    reviews,
    statistics: {
      totalUsers: users.length,
      totalProducts: products.length,
      totalOrders: orders.length,
      totalReviews: reviews.length
    }
  });
}
```

### 数据关联

```typescript
// 生成关联数据
function generateRelatedData() {
  // 先生成用户
  const users = generateMockUsers(5);
  const userIds = users.map(u => u.id);
  
  // 生成订单，使用真实用户 ID
  const orders = generateMockOrders(10).map(order => ({
    ...order,
    userId: randomChoice(userIds)
  }));
  
  // 生成评论，关联用户和订单
  const comments = generateTemplate('comment', { count: 20 }).map(comment => ({
    ...comment,
    userId: randomChoice(userIds),
    orderId: randomChoice(orders).id
  }));
  
  return { users, orders, comments };
}
```

### 本地化支持

```typescript
// 生成英文数据 (通过自定义字段)
const englishUsers = generateTemplate('user', {
  count: 5,
  fields: {
    name: generateEnglishName()
  }
});
```

---

## 📊 性能参考

| 操作 | 数量 | 耗时 (约) |
|------|------|----------|
| generateMockUsers | 100 | < 1ms |
| generateMockArticles | 100 | < 2ms |
| generateMockOrders | 100 | < 5ms |
| generateTemplate ('log') | 10000 | < 50ms |
| generateTemplate ('comment') | 1000 | < 10ms |

---

## 🔧 扩展建议

如需更多模板类型，可扩展 `generateTemplate` 函数：

```typescript
// 添加新的模板类型
case 'video':
  return Array.from({ length: count }, () => generateMockVideo(fields));

function generateMockVideo(fields: Record<string, any> = {}) {
  return {
    id: `vid_${randomString(8)}`,
    title: randomChoice(VIDEO_TITLES),
    duration: randomInt(60, 3600),
    views: randomInt(1000, 1000000),
    ...fields
  };
}
```

---

**文档生成时间:** 2026-03-13  
**技能位置:** `src/skills/mock-utils-skill.ts`
