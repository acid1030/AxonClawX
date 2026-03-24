# AxonClaw Database Layer

SQLite 数据库层，用于 AxonClaw 项目的本地数据存储。

## 文件结构

```
src/renderer/
├── db/
│   ├── database.ts          # 数据库初始化与表结构
│   └── test.ts              # 测试脚本
└── services/
    ├── index.ts             # 服务统一导出
    ├── agentsService.ts     # Agent CRUD
    ├── sessionsService.ts   # Session CRUD
    ├── messagesService.ts   # Message CRUD
    ├── channelsService.ts   # Channel CRUD
    ├── skillsService.ts     # Skill CRUD
    └── userPreferencesService.ts  # User Preferences CRUD
```

## 数据表

### agents
Agent 配置表
- `id`: 主键
- `name`: Agent 名称（唯一）
- `type`: Agent 类型
- `model`: 使用的模型
- `status`: 状态 (active/inactive)
- `config`: JSON 配置
- `created_at`, `updated_at`: 时间戳

### sessions
会话记录表
- `id`: 主键
- `agent_id`: 关联 Agent（外键）
- `title`: 会话标题
- `status`: 状态 (active/ended)
- `started_at`, `ended_at`: 时间戳
- `metadata`: JSON 元数据

### messages
消息历史表
- `id`: 主键
- `session_id`: 关联 Session（外键）
- `role`: 角色 (user/assistant/system)
- `content`: 消息内容
- `timestamp`: 时间戳
- `metadata`: JSON 元数据

### channels
Channel 配置表
- `id`: 主键
- `name`: Channel 名称（唯一）
- `type`: 类型 (discord/telegram/etc)
- `config`: JSON 配置
- `status`: 状态
- `created_at`, `updated_at`: 时间戳

### skills
技能安装表
- `id`: 主键
- `name`: 技能名称（唯一）
- `description`: 描述
- `location`: 文件路径
- `enabled`: 是否启用 (0/1)
- `installed_at`: 安装时间

### user_preferences
用户偏好表
- `id`: 主键
- `key`: 偏好键（唯一）
- `value`: 偏好值
- `category`: 分类
- `updated_at`: 更新时间

## 使用方法

### 初始化数据库

```typescript
import { db } from './db/database';
// 数据库自动初始化，单例模式
```

### 使用服务

```typescript
import { AgentsService, SessionsService, MessagesService } from './services';

// 创建 Agent
const agentId = AgentsService.create({
  name: 'my-agent',
  type: 'general',
  model: 'gpt-4'
});

// 创建 Session
const sessionId = SessionsService.create({
  agent_id: agentId,
  title: 'My Session'
});

// 添加消息
MessagesService.create({
  session_id: sessionId,
  role: 'user',
  content: 'Hello!'
});

// 查询消息
const messages = MessagesService.findBySessionId(sessionId);
```

## 运行测试

```bash
# 需要先安装依赖
npm install better-sqlite3
npm install -D @types/better-sqlite3

# 运行测试
npx ts-node src/renderer/db/test.ts
```

## 特性

- ✅ 单例模式数据库连接
- ✅ WAL 日志模式（性能优化）
- ✅ 外键约束支持
- ✅ 完整的 CRUD 操作
- ✅ TypeScript 类型安全
- ✅ 事务支持（批量操作）
