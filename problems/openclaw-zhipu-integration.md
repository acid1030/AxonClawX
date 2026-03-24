# OpenClaw/ClawX 集成智谱(Zhipu)模型配置问题记录

## 问题概述

在 ClawX 桌面端集成智谱 AI 作为 LLM 和 Embedding 提供商时，遇到多个配置兼容性问题导致 Gateway 无法启动。本文档记录完整排查过程和最终解决方案，供后续集成参考。

---

## 问题一：No API key found for provider "anthropic"

### 现象

```
Agent failed before reply: No API key found for provider "anthropic".
Auth store: ~/.openclaw/agents/main/agent/auth-profiles.json
```

### 根因

OpenClaw 默认模型为 `anthropic/claude-opus-4-6`，未配置 Anthropic API key。

### 解决方案

**步骤 1：切换默认模型**

```bash
openclaw models set zai/glm-5
```

**步骤 2：配置 models.json 添加 zai provider**

文件：`~/.openclaw/agents/main/agent/models.json`

```json
{
  "providers": {
    "zai": {
      "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4",
      "api": "openai",
      "models": [
        {
          "id": "glm-5",
          "name": "glm-5",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 200000,
          "maxTokens": 8192
        }
      ]
    }
  }
}
```

> 注意：智谱的 coding API 使用 OpenAI 兼容协议，`api` 字段设为 `"openai"`。

**步骤 3：配置 auth-profiles.json**

文件：`~/.openclaw/agents/main/agent/auth-profiles.json`

```json
{
  "version": 1,
  "profiles": {
    "zai:manual": {
      "type": "api_key",
      "provider": "zai",
      "key": "<智谱API Key>",
      "source": "manual"
    }
  }
}
```

---

## 问题二：memory-lancedb 插件 embedding 配置校验失败

### 现象

```
plugins.entries.memory-lancedb.config.embedding: invalid config: must NOT have additional properties
```

### 根因（关键）

**OpenClaw 存在三份 memory-lancedb 插件，schema 各不相同：**

| 来源 | 路径 | 支持 provider 字段 | 支持 baseUrl 字段 | model 枚举限制 |
|------|------|-------------------|-------------------|---------------|
| ClawX 内置 | `/Applications/ClawX.app/Contents/Resources/openclaw/extensions/memory-lancedb/` | 无 | 有 | 无限制 |
| Homebrew 安装 | `/opt/homebrew/lib/node_modules/openclaw/extensions/memory-lancedb/` | 无 | 无 | text-embedding-3-small/large |
| 用户本地扩展 | `~/.openclaw/extensions/memory-lancedb/` | 有(openai/zhipu) | 无 | text-embedding-3-small/large/embedding-3 |

**ClawX 桌面端使用的是自己内置的版本**（路径 `/Applications/ClawX.app/...`），不是 Homebrew 版本也不是用户本地扩展版本。

当配置中包含了 ClawX 内置版本不认识的字段（如 `provider`），JSON Schema 的 `additionalProperties: false` 会直接拒绝。

### 错误配置示例

```json
"embedding": {
  "provider": "zhipu",
  "apiKey": "xxx",
  "model": "embedding-3"
}
```

ClawX 内置版 schema 不含 `provider` 属性 → 校验失败。

### 正确配置（兼容 ClawX 内置版）

ClawX 内置版支持通过 `baseUrl` 指向兼容 OpenAI 的第三方 API：

```json
"embedding": {
  "apiKey": "<智谱API Key>",
  "model": "embedding-3",
  "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
  "dimensions": 2048
}
```

**字段说明：**

- `apiKey`：智谱 API Key（必填）
- `model`：`embedding-3`（智谱 embedding 模型名称）
- `baseUrl`：`https://open.bigmodel.cn/api/paas/v4`（智谱 embedding API 基础地址，注意不是 coding 地址）
- `dimensions`：`2048`（embedding-3 模型输出的向量维度，必须指定）

---

## 问题三：移除 embedding 后 "must have required property 'embedding'"

### 现象

尝试移除 `embedding` 配置块后：

```
plugins.entries.memory-lancedb.config: must have required property 'embedding'
```

### 根因

`embedding` 在 configSchema 中是 `required` 字段，不能省略。

### 结论

`embedding` 必须存在且至少包含 `apiKey` 字段。若暂不使用可设 `enabled: false`，但 schema 校验仍会执行。

---

## 最终完整配置

### ~/.openclaw/openclaw.json 中 plugins 部分

```json
"plugins": {
  "enabled": true,
  "slots": {
    "memory": "memory-lancedb"
  },
  "entries": {
    "memory-lancedb": {
      "enabled": true,
      "config": {
        "embedding": {
          "apiKey": "<智谱API Key>",
          "model": "embedding-3",
          "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
          "dimensions": 2048
        },
        "dbPath": "~/.openclaw/memory/lancedb",
        "autoCapture": true,
        "autoRecall": true,
        "captureMaxChars": 500
      }
    }
  }
}
```

---

## 后续集成注意事项

### 1. 版本差异警惕

- ClawX 桌面端、Homebrew CLI、用户本地扩展三个来源的插件 schema **可能不同步**
- 配置前务必确认实际加载的插件版本（看日志中 `entry=` 路径）
- ClawX 升级后内置插件会被覆盖，需重新检查兼容性

### 2. 智谱 API 端点区别

| 用途 | baseUrl |
|------|---------|
| LLM 聊天（coding） | `https://open.bigmodel.cn/api/coding/paas/v4` |
| Embedding | `https://open.bigmodel.cn/api/paas/v4` |

注意两者路径不同（coding vs 非 coding），不要混用。

### 3. Embedding 向量维度

| 模型 | 维度 |
|------|------|
| text-embedding-3-small (OpenAI) | 1536 |
| text-embedding-3-large (OpenAI) | 3072 |
| embedding-3 (智谱) | 2048 |

使用 ClawX 内置版时必须通过 `dimensions` 字段显式指定维度，否则可能使用错误默认值导致向量维度不匹配。

### 4. 插件重复加载问题

日志中会出现 `duplicate plugin id detected` 警告，因为 ClawX 内置和用户本地扩展目录都有同名插件。可通过 `plugins.allow` 限定信任的插件来源：

```json
"plugins": {
  "allow": ["memory-lancedb"]
}
```

### 5. auth-profiles.json 格式

不同版本的 OpenClaw 对 auth profile 的字段要求不同。推荐使用 `type: "api_key"` + `provider` + `key` 的组合，这是最通用的格式。

---

## 排查工具

```bash
# 查看当前模型和认证状态
openclaw models status

# 查看配置问题
openclaw doctor --fix

# 直接测试 Gateway 启动
openclaw gateway --port 19999 --token test --allow-unconfigured

# 查看运行日志
openclaw logs --follow
```
