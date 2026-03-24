# ClawX 迁移执行指南

## 执行方式：Parallel Session

你已选择在新会话中执行迁移计划。这样可以：
- ✅ 批量执行所有任务
- ✅ 不影响当前会话
- ✅ 更快的执行速度

---

## 🚀 执行步骤

### 步骤 1：确认计划文件

计划已保存到：
```
/Users/t/openclaw-dev/projects/axonclaw/docs/plans/2026-03-15-clawx-migration-phase1.md
```

### 步骤 2：打开新会话

**方式 A：在 ClawX 中打开新会话**
1. 在当前窗口中，点击"新建会话"或使用快捷键
2. 在新会话中发送以下消息：

```
请执行实现计划：/Users/t/openclaw-dev/projects/axonclaw/docs/plans/2026-03-15-clawx-migration-phase1.md

使用 superpowers:executing-plans 技能逐个任务执行。
```

**方式 B：使用命令行**
```bash
cd /Users/t/openclaw-dev/projects/axonclaw
# 在新终端窗口中运行
```

### 步骤 3：监控执行进度

新会话会自动：
1. 读取计划文件
2. 逐个执行任务
3. 每个任务完成后提交代码
4. 遇到错误时暂停并报告

---

## 📋 任务清单

**共 11 个任务：**

- [ ] Task 1: 准备工作 - 分析 ClawX 代码结构
- [ ] Task 2: 复制 Store 文件
- [ ] Task 3: 复制 chat store 子模块
- [ ] Task 4: 复制 lib 工具函数
- [ ] Task 5: 更新导入路径
- [ ] Task 6: 更新 ChatView 组件
- [ ] Task 7: 复制 Electron Gateway 管理
- [ ] Task 8: 更新 Electron 主进程
- [ ] Task 9: 测试基本功能
- [ ] Task 10: 更新 MainLayout
- [ ] Task 11: 清理和优化

---

## ⚠️ 注意事项

1. **执行时间**：约 20-30 分钟
2. **网络要求**：无需网络（本地文件复制）
3. **Git 提交**：每个任务完成后自动提交
4. **错误处理**：遇到错误会暂停，需要手动介入

---

## 🎯 完成标准

**阶段 1 完成后，你的项目将具备：**
- ✅ 完整的聊天功能
- ✅ Gateway 连接管理
- ✅ 会话管理
- ✅ 模型配置
- ✅ 保持原有 UI 设计

---

## 📞 需要帮助？

如果执行过程中遇到问题：
1. 查看新会话的错误日志
2. 回到这个会话告诉我具体错误
3. 我会提供解决方案

---

**准备好了吗？** 现在可以打开新会话开始执行！
