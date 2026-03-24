# Gateway 配置说明

## 🔑 配置 Gateway Token

AxonClaw 需要连接到 OpenClaw Gateway 才能使用完整的对话功能。

### 方法 1：浏览器控制台配置（推荐）

1. 打开 AxonClaw 应用
2. 打开浏览器开发者工具（F12）
3. 在控制台输入：

```javascript
localStorage.setItem('gateway_token', 'your-gateway-token-here');
location.reload();
```

### 方法 2：从 ClawX 获取 Token

如果您使用 ClawX，Token 位于：

```
~/.openclaw/data/gateway-token.json
```

复制其中的 `token` 字段。

### 方法 3：使用 OpenClaw CLI

```bash
# 启动 Gateway
openclaw gateway start

# 查看 Token
cat ~/.openclaw/data/gateway-token.json
```

---

## 🚀 启动顺序

1. **启动 Gateway**
   ```bash
   openclaw gateway start
   # 或使用 ClawX，Gateway 会自动启动
   ```

2. **验证 Gateway 运行**
   ```bash
   lsof -i :18791 -i :18792
   # 应该看到 ClawX 进程监听这两个端口
   ```

3. **配置 Token**（首次使用）
   - 打开浏览器控制台
   - 运行：`localStorage.setItem('gateway_token', 'YOUR_TOKEN')`
   - 刷新页面

4. **打开 AxonClaw**
   ```bash
   cd /Users/t/openclaw-dev/projects/AxonClaw
   npm run dev
   # 访问 http://localhost:5173
   ```

---

## ✅ 验证连接

打开对话界面（点击侧边栏 💬 按钮），如果右上角显示"已连接"绿点，说明连接成功。

如果显示"离线"，请检查：
- [ ] Gateway 是否正在运行
- [ ] Token 是否已配置
- [ ] 浏览器控制台是否有错误信息

---

## 🔧 离线模式

即使没有连接 Gateway，AxonClaw 仍然可以显示：
- 预设的 Agent 列表
- 预设的 Channel 列表
- 模拟的统计数据

但无法：
- 发送真实消息
- 加载历史会话
- 执行 Agent 任务

---

## 📝 示例 Token

**警告**：不要在生产环境使用示例 Token！

```
yXzfa2g7H6yE01w52VssgiobnzTmDA5Y8mZfcvHrEnU=
```

此 Token 仅用于测试，每个 OpenClaw 实例都有唯一的 Token。

---

## 🆘 常见问题

### 1. 端口被占用

```
Error: Port 5173 is already in use
```

**解决**：已有实例在运行，直接访问 http://localhost:5173 即可。

### 2. Gateway 未运行

```
[Store] Gateway not available, using offline mode
```

**解决**：启动 Gateway（见上方"启动顺序"）。

### 3. Token 无效

```
WebSocket connection failed
```

**解决**：检查 Token 是否正确，重新从 Gateway 获取。

---

## 📚 相关文档

- OpenClaw 官方文档：https://docs.openclaw.ai
- ClawHub 技能市场：https://clawhub.com
- GitHub 仓库：https://github.com/openclaw/openclaw
