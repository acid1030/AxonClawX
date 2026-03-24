# AxonClaw 数据库与记忆系统规划

> 版本：v1.0
> 创建时间：2026-03-12
> 参考：ClawDeckX + OpenClaw Memory System

---

## 📊 当前状态

### 数据库存储

**现状**: ❌ 无数据库
- 数据存储在 `MEMORY.md` 和 `memory/YYYY-MM-DD.md`
- 无结构化数据存储
- 无查询优化

### 记忆系统

**现状**: ⚠️ 基础文件存储
- 使用 Markdown 文件存储
- 无向量检索
- 无语义搜索

---

## 🎯 架构设计

### 三层记忆架构

```
┌─────────────────────────────────────────────────────┐
│              应用层 (Application Layer)              │
│  - 对话记忆  - 用户偏好  - 项目上下文  - 知识库       │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  短期记忆     │  │  工作记忆     │  │  长期记忆     │
│  (会话内)     │  │  (当日)      │  │  (持久化)    │
│  Redis       │  │  Markdown    │  │  SQLite +    │
│  Cache       │  │  Files       │  │  ChromaDB    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🗄️ 数据库方案

### 方案对比

| 方案 | 优点 | 缺点 | 我们的选择 |
|------|------|------|-----------|
| **SQLite** | 零配置、单文件、嵌入式 | 不适合大规模并发 | ✅ 采用 (主存储) |
| **PostgreSQL** | 功能强大、支持复杂查询 | 需要独立服务 | ⚪ 可选 (企业版) |
| **ChromaDB** | 向量检索、语义搜索 | 需要额外服务 | ✅ 采用 (记忆检索) |
| **Redis** | 高速缓存、实时数据 | 数据易失 | ⚪ 可选 (性能优化) |

### AxonClaw 数据库架构

```
axonclaw.db (SQLite)
├── agents (Agent 配置)
├── sessions (会话记录)
├── messages (消息历史)
├── channels (Channel 配置)
├── skills (技能安装记录)
├── cron_jobs (定时任务)
├── user_preferences (用户偏好)
└── system_settings (系统设置)

~/.openclaw/chromadb/ (向量数据库)
└── longterm_memory (长期记忆索引)

workspace/memory/ (Markdown 文件)
├── MEMORY.md (核心记忆)
├── memory/YYYY-MM-DD.md (每日日志)
└── learnings/*.md (知识库)
```

---

## 📦 数据模型设计

### 1. Agent 表

```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    specialty TEXT,
    soul TEXT,              -- SOUL.md 内容
    status TEXT DEFAULT 'idle',  -- idle|busy|error|offline
    config_json TEXT,       -- 扩展配置
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Sessions 表

```sql
CREATE TABLE sessions (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    model TEXT,
    agent_id TEXT REFERENCES agents(id),
    channel TEXT,           -- 来源渠道
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    message_count INTEGER DEFAULT 0
);
```

### 3. Messages 表

```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_key TEXT REFERENCES sessions(key),
    role TEXT NOT NULL,     -- user|assistant|system
    content TEXT NOT NULL,
    tokens INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_messages_session ON messages(session_key);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### 4. Channels 表

```sql
CREATE TABLE channels (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,     -- telegram|discord|whatsapp|etc
    name TEXT,
    config_json TEXT NOT NULL,
    status TEXT DEFAULT 'inactive',  -- active|inactive|error
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Skills 表

```sql
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT,
    author TEXT,
    installed BOOLEAN DEFAULT FALSE,
    config_json TEXT,
    installed_at DATETIME,
    updated_at DATETIME
);
```

### 6. Cron Jobs 表

```sql
CREATE TABLE cron_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    action TEXT NOT NULL,   -- 执行的动作
    params_json TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    last_run_at DATETIME,
    next_run_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 7. User Preferences 表

```sql
CREATE TABLE user_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    category TEXT,          -- ui|behavior|privacy|etc
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 示例数据
INSERT INTO user_preferences VALUES
    ('language', 'zh-CN', 'ui'),
    ('theme', 'dark', 'ui'),
    ('timezone', 'Asia/Shanghai', 'ui'),
    ('telemetry_enabled', 'false', 'privacy');
```

---

## 🧠 记忆系统规划

### OpenClaw 记忆系统分析

**核心理念**:
> "Memory is plain Markdown in the agent workspace. Files are the source of truth."

**架构**:
```
Markdown 文件 (源数据)
    │
    ▼
向量数据库 (索引层)
    │
    ▼
语义检索 (应用层)
```

### AxonClaw 记忆系统

#### 1. 记忆分层

```
┌─────────────────────────────────────────┐
│          短期记忆 (Short-term)           │
│  - 当前对话上下文                         │
│  - 最近 10 条消息                         │
│  - 存储：Redis/内存缓存                   │
│  - 过期：会话结束                         │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│          工作记忆 (Working)              │
│  - 当日日志                              │
│  - 临时笔记                              │
│  - 存储：memory/YYYY-MM-DD.md           │
│  - 过期：30 天后压缩                      │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│          长期记忆 (Long-term)            │
│  - MEMORY.md (核心记忆)                  │
│  - learnings/*.md (知识库)              │
│  - 存储：SQLite + ChromaDB              │
│  - 永久保存                              │
└─────────────────────────────────────────┘
```

#### 2. 记忆类型

| 类型 | 内容 | 存储位置 | 检索方式 |
|------|------|---------|---------|
| **情景记忆** | 对话历史、任务执行 | messages 表 + Markdown | SQL 查询 |
| **语义记忆** | 知识、概念、事实 | ChromaDB | 向量检索 |
| **程序记忆** | 技能、工作流、模板 | skills 表 + 文件 | 文件读取 |
| **自传记忆** | 用户偏好、习惯 | user_preferences | SQL 查询 |

#### 3. 记忆流程

```
用户输入
    │
    ▼
┌─────────────────┐
│  短期记忆检索    │ ← 最近对话上下文
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  语义记忆检索    │ ← ChromaDB 向量搜索
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  程序记忆检索    │ ← 相关技能/模板
└────────┬────────┘
         │
         ▼
    AI 生成回复
         │
         ▼
┌─────────────────┐
│  记忆写入        │ → Markdown + ChromaDB
└─────────────────┘
```

---

## 🔧 技术实现

### 阶段 1: SQLite 基础 (本周)

**目标**: 结构化数据存储

```typescript
// src/renderer/db/database.ts
import Database from 'better-sqlite3';

export class AxonDatabase {
  private db: Database.Database;

  constructor(path: string = 'axonclaw.db') {
    this.db = new Database(path);
    this.init();
  }

  private init() {
    // 创建表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (...);
      CREATE TABLE IF NOT EXISTS sessions (...);
      CREATE TABLE IF NOT EXISTS messages (...);
      -- ...
    `);
  }

  // Agent CRUD
  async createAgent(agent: Agent) { ... }
  async getAgent(id: string) { ... }
  async updateAgent(id: string, updates: Partial<Agent>) { ... }
  async deleteAgent(id: string) { ... }
  async listAgents() { ... }

  // Session CRUD
  async createSession(session: Session) { ... }
  async getSession(key: string) { ... }
  async listSessions() { ... }

  // Message CRUD
  async addMessage(message: Message) { ... }
  async getMessages(sessionKey: string, limit: number) { ... }
}

export const db = new AxonDatabase();
```

### 阶段 2: ChromaDB 集成 (下周)

**目标**: 语义记忆检索

```typescript
// src/renderer/memory/chroma-memory.ts
import Chroma from 'chromadb';

export class ChromaMemory {
  private client: ChromaClient;
  private collection: Collection;

  constructor() {
    this.client = new ChromaClient({ path: 'http://localhost:8100' });
    this.collection = this.client.getCollection('longterm_memory');
  }

  async add(content: string, metadata: MemoryMetadata) {
    // 自动 embedding
    await this.collection.add({
      documents: [content],
      metadatas: [metadata],
      ids: [generateId()],
    });
  }

  async search(query: string, limit: number = 5) {
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: limit,
    });
    return results.documents[0];
  }

  async getTimeline(entity: string) {
    // 获取实体的时间线
  }

  async findConnections(entity1: string, entity2: string) {
    // 查找实体间连接
  }
}
```

### 阶段 3: 记忆管理 UI (下周)

**目标**: 可视化记忆管理

```tsx
// src/renderer/views/MemoryView.tsx
export function MemoryView() {
  const [memories, setMemories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 语义搜索
  const searchMemories = async (query: string) => {
    const results = await chromaMemory.search(query);
    setMemories(results);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">记忆系统</h1>
      
      {/* 搜索框 */}
      <input
        type="text"
        placeholder="搜索记忆..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          searchMemories(e.target.value);
        }}
        className="w-full px-4 py-2 bg-[#1c1c1e] border border-[#3a3a3c] rounded-lg"
      />

      {/* 记忆列表 */}
      <div className="mt-4 space-y-3">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>

      {/* 记忆统计 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="总会话" value={stats.totalSessions} />
        <StatCard label="总消息" value={stats.totalMessages} />
        <StatCard label="记忆条目" value={stats.totalMemories} />
      </div>
    </div>
  );
}
```

---

## 📅 实施计划

### P0 (本周 3/12-3/15)

| 任务 | 负责人 | 状态 |
|------|--------|------|
| SQLite 数据库初始化 | DANTE | ⚪ 待开始 |
| 数据模型创建 | DANTE | ⚪ 待开始 |
| 基础 CRUD 服务 | DANTE | ⚪ 待开始 |
| 记忆系统规划文档 | TECH | ✅ 完成 |

### P1 (下周 3/16-3/22)

| 任务 | 负责人 | 状态 |
|------|--------|------|
| ChromaDB 集成 | DANTE | ⚪ 计划中 |
| 语义检索实现 | ACE | ⚪ 计划中 |
| 记忆管理 UI | BLAZE | ⚪ 计划中 |
| 记忆压缩/归档 | DATA | ⚪ 计划中 |

### P2 (后续 3/23-3/30)

| 任务 | 负责人 | 状态 |
|------|--------|------|
| Redis 缓存层 | ATLAS | ⚪ 计划中 |
| 记忆可视化 | LUNA | ⚪ 计划中 |
| 实体关系图谱 | PIXEL | ⚪ 计划中 |
| 记忆导出/导入 | SYNC | ⚪ 计划中 |

---

## 📊 对比分析

| 功能 | OpenClaw | ClawDeckX | AxonClaw (规划) |
|------|----------|-----------|----------------|
| **数据库** | SQLite | SQLite + PG | SQLite ✅ |
| **向量检索** | ChromaDB | 无 | ChromaDB ✅ |
| **记忆存储** | Markdown | 数据库 | Markdown + DB ✅ |
| **语义搜索** | ✅ | ❌ | ✅ 计划中 |
| **记忆可视化** | ❌ | ⚠️ 基础 | ✅ 计划中 |
| **实体关系** | ✅ (Hybrid) | ❌ | ⚪ 可选 |

---

## 🎯 总结

### 当前状态

- ❌ 无数据库存储
- ⚠️ 仅有 Markdown 文件记忆
- ❌ 无向量检索能力

### 规划目标

- ✅ SQLite 结构化存储
- ✅ ChromaDB 语义检索
- ✅ 三层记忆架构
- ✅ 可视化记忆管理

### 差异化优势

1. **混合存储**: Markdown (人类可读) + SQLite (结构化) + ChromaDB (向量)
2. **语义检索**: 超越关键词搜索，理解语义
3. **可视化管理**: 比 OpenClaw 更友好的界面
4. **实体关系**: 可选的知识图谱功能

---

*报告版本：v1.0*
*创建时间：2026-03-12 23:10*
*作者：TECH + AXON*
