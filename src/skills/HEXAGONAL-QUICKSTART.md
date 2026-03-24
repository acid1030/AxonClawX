# 六边形架构工具 - 快速入门

## 🚀 5 分钟上手

### 步骤 1: 安装依赖 (可选)

本工具使用纯 TypeScript 实现，无需额外依赖。

### 步骤 2: 创建项目结构

```bash
cd /Users/nike/Documents/project/axonclaw

# 创建目录结构
mkdir -p src/core src/ports/inbound src/ports/outbound src/adapters/primary src/adapters/secondary
```

### 步骤 3: 创建第一个端口

```typescript
import { HexagonalArchSkill } from './src/skills/hexagonal-arch-skill';

const skill = new HexagonalArchSkill();

// 创建用户管理端口
await skill.createPort(['user-manager', 'inbound']);
```

**生成文件**: `src/ports/user-manager-port.ts`

### 步骤 4: 创建适配器

```typescript
// 创建 REST API 适配器
await skill.createAdapter(['rest-api', 'user-manager', 'primary']);

// 创建 MongoDB 仓储适配器
await skill.createAdapter(['mongo-user', 'user-manager', 'secondary']);
```

### 步骤 5: 生成核心服务

```typescript
await skill.generateCore(['user']);
```

### 步骤 6: 验证架构

```typescript
await skill.validateArchitecture([]);
```

---

## 📦 完整示例

### 示例 A: 电商订单系统

```typescript
import {
  HexagonalArchSkill,
  OrderService,
  OrderStatus,
  SqliteUserRepositoryAdapter,
  PostgresOrderRepositoryAdapter,
  SmtpNotificationAdapter,
  WinstonLoggerAdapter,
} from './src/skills/hexagonal-arch-skill';

// 1. 创建技能实例
const skill = new HexagonalArchSkill({
  corePath: './src/core',
  portsPath: './src/ports',
  adaptersPath: './src/adapters',
});

// 2. 生成端口定义
await skill.createPort(['order', 'inbound']);
await skill.createPort(['order-repository', 'outbound']);
await skill.createPort(['notification', 'outbound']);

// 3. 生成适配器
await skill.createAdapter(['express-order-api', 'order', 'primary']);
await skill.createAdapter(['postgres-order', 'order-repository', 'secondary']);
await skill.createAdapter(['smtp-notify', 'notification', 'secondary']);

// 4. 生成核心服务
await skill.generateCore(['order']);

// 5. 使用核心服务
const orderRepository = new PostgresOrderRepositoryAdapter('postgresql://localhost/orders');
const notificationService = new SmtpNotificationAdapter({
  host: 'smtp.example.com',
  port: 587,
  auth: { user: 'user', pass: 'pass' },
});
const logger = new WinstonLoggerAdapter({ level: 'info', format: 'json' });

const orderService = new OrderService(
  orderRepository,
  null, // userService - 实际使用中需要注入
  notificationService,
  logger
);

// 创建订单
const order = await orderService.createOrder('user_123', [
  { productId: 'prod_1', quantity: 2, unitPrice: 99.99 },
  { productId: 'prod_2', quantity: 1, unitPrice: 199.99 },
]);

console.log('Order created:', order);
```

### 示例 B: 切换数据库 (无需修改核心逻辑)

```typescript
// 开发环境 - SQLite
const devOrderRepo = new SqliteOrderRepositoryAdapter('./dev/orders.db');
const devOrderService = new OrderService(devOrderRepo, /* ... */);

// 生产环境 - PostgreSQL
const prodOrderRepo = new PostgresOrderRepositoryAdapter('postgresql://prod/orders');
const prodOrderService = new OrderService(prodOrderRepo, /* ... */);

// ✅ 核心业务逻辑完全相同!
```

---

## 🎯 核心概念

### 端口 (Ports)

**入站端口 (Inbound Ports)**: 定义外部系统如何调用核心逻辑
- API 接口
- CLI 命令
- WebSocket 消息

**出站端口 (Outbound Ports)**: 定义核心层需要的外部服务
- 数据仓储
- 通知服务
- 日志服务
- 缓存服务

### 适配器 (Adapters)

**入站适配器 (Primary Adapters)**: 实现入站端口
- Express API Adapter
- CLI Adapter
- WebSocket Adapter

**出站适配器 (Secondary Adapters)**: 实现出站端口
- SQLite/PostgreSQL/MongoDB Adapter
- SMTP/SMS/Push Notification Adapter
- Winston/Bunyan Logger Adapter
- Redis/Memcached Cache Adapter

### 核心 (Core)

核心业务逻辑，包含:
- 业务实体 (User, Order, Product)
- 业务规则 (订单取消规则、支付验证规则)
- 领域服务 (UserService, OrderService)

**关键**: 核心层不依赖任何外层实现!

---

## ✅ 架构验证清单

运行 `validateArchitecture()` 检查:

- [ ] 核心层没有导入适配器
- [ ] 端口文件导出接口
- [ ] 适配器实现对应端口
- [ ] 依赖方向正确 (外层→内层)

---

## 📚 详细文档

- **完整示例**: `hexagonal-arch-examples.md`
- **源码**: `hexagonal-arch-skill.ts`

---

## 🆘 常见问题

### Q: 为什么要用六边形架构？

**A**: 
- 核心业务逻辑独立，易于测试
- 更换技术栈不影响核心逻辑
- 清晰的依赖关系，易于维护

### Q: 什么时候不需要？

**A**:
- 简单 CRUD 应用
- 快速原型验证
- 一次性脚本

### Q: 如何开始重构现有项目？

**A**:
1. 识别核心业务逻辑
2. 提取为端口接口
3. 将现有实现改为适配器
4. 逐步迁移，不要一次性重构

---

**创建时间**: 2026-03-13  
**作者**: KAEL  
**版本**: 1.0.0
