# AxonClaw 设计规范

> 版本：v1.0
> 更新时间：2026-03-12

---

## 🎨 设计原则

### 1. Mac 系统风格

**图标风格**: SF Symbols (Apple 官方图标库)

- 使用 `lucide-react` 时选择简洁线条风格
- 图标大小：16px, 20px, 24px
- 图标颜色：跟随系统主题
- 避免过于复杂/卡通化的图标

**推荐图标映射**:

| 功能 | SF Symbols | Lucide React |
|------|-----------|--------------|
| 仪表板 | `chart.bar.fill` | `BarChart3` |
| 对话 | `message.fill` | `MessageCircle` |
| Agent | `robot` | `Bot` |
| Channel | `antenna.radiowaves.left.and.right` | `Radio` |
| 记忆 | `brain` | `Brain` |
| 技能 | `bolt.fill` | `Zap` |
| 设置 | `gearshape.fill` | `Settings` |
| 诊断 | `wrench.and.screwdriver` | `Wrench` |
| 创建 | `plus.app.fill` | `PlusCircle` |
| 删除 | `trash.fill` | `Trash2` |
| 编辑 | `pencil` | `Edit` |
| 搜索 | `magnifyingglass` | `Search` |

---

## 🌙 深色主题

### 颜色规范

```css
/* 背景色 */
--bg-primary: #000000        /* 纯黑 */
--bg-secondary: #1c1c1e      /* 系统灰 */
--bg-card: #2c2c2e           /* 卡片灰 */
--bg-elevated: #3a3a3c       /* 浮层 */

/* 边框 */
--border: #3a3a3c            /* 边框灰 */
--border-light: #48484a      /* 亮边框 */

/* 文字 */
--text-primary: #ffffff      /* 主文字 */
--text-secondary: #8e8e93    /* 次要文字 */
--text-tertiary: #636366     /* 提示文字 */

/* 强调色 */
--accent: #0a84ff            /* 系统蓝 */
--accent-green: #30d158      /* 系统绿 */
--accent-red: #ff453a        /* 系统红 */
--accent-orange: #ff9f0a     /* 系统橙 */
--accent-purple: #bf5af2     /* 系统紫 */
```

---

## 📐 布局规范

### 间距系统

基于 4px 网格：
- `4px` - 最小间距
- `8px` - 小组件间距
- `12px` - 中等间距
- `16px` - 标准间距
- `24px` - 大间距
- `32px` - 分区间距

### 圆角规范

- 小按钮：`6px`
- 卡片：`10px`
- 大卡片：`12px`
- 模态框：`14px`
- 头像：`50%`

### 阴影规范

```css
/* 轻微阴影 */
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3)

/* 标准阴影 */
shadow: 0 4px 12px rgba(0, 0, 0, 0.4)

/* 浮层阴影 */
shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5)
```

---

## 🎭 组件规范

### 按钮

```tsx
// 主按钮
<Button className="bg-[#0a84ff] hover:bg-[#0070e0]">
  主要操作
</Button>

// 次要按钮
<Button variant="outline" className="border-[#3a3a3c]">
  次要操作
</Button>

// 危险按钮
<Button variant="destructive" className="bg-[#ff453a]">
  删除
</Button>
```

### 卡片

```tsx
<Card className="bg-[#2c2c2e] border-[#3a3a3c] rounded-[10px]">
  <CardHeader>
    <CardTitle className="text-white">标题</CardTitle>
  </CardHeader>
  <CardContent className="text-[#8e8e93]">
    内容
  </CardContent>
</Card>
```

### 输入框

```tsx
<Input 
  className="bg-[#1c1c1e] border-[#3a3a3c] 
             focus:border-[#0a84ff] focus:ring-1 focus:ring-[#0a84ff]"
  placeholder="请输入..."
/>
```

---

## ✨ 动效规范

### 过渡动画

```css
/* 标准过渡 */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* 弹性过渡 */
transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 加载状态

```tsx
// 骨架屏
<div className="animate-pulse bg-[#3a3a3c] rounded" />

// 旋转加载
<div className="animate-spin border-2 border-[#0a84ff] border-t-transparent" />
```

---

## 📱 响应式

### 断点

```css
/* 手机 */
@media (max-width: 640px) { }

/* 平板 */
@media (min-width: 641px) and (max-width: 1024px) { }

/* 桌面 */
@media (min-width: 1025px) { }
```

---

## 🧪 设计检查清单

发布前检查：

- [ ] 所有图标使用 SF Symbols 风格
- [ ] 颜色符合深色主题规范
- [ ] 间距使用 4px 网格
- [ ] 圆角符合规范
- [ ] 动效流畅自然
- [ ] 文字对比度足够 (WCAG AA)
- [ ] 响应式适配正确

---

*参考：Apple Human Interface Guidelines*
*参考：SF Symbols 官方文档*
