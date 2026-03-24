# Memory Components - 记忆管理组件

Mac 风格的记忆管理 UI 组件，提供完整的记忆浏览、搜索、编辑和删除功能。

## 组件列表

### 1. MemoryView (`views/MemoryView.tsx`)

主视图组件，提供完整的记忆管理界面。

**功能：**
- 记忆列表展示
- 语义搜索框
- 记忆详情查看
- 记忆编辑/删除
- 记忆统计卡片

**使用示例：**
```tsx
import { MemoryView } from './views/MemoryView';

function App() {
  return <MemoryView />;
}
```

### 2. MemoryCard (`components/memory/MemoryCard.tsx`)

单个记忆卡片组件，展示记忆的摘要信息。

**Props：**
```typescript
interface MemoryCardProps {
  memory: {
    id: string;
    text: string;
    category?: MemoryCategory;
    importance: number;
    createdAt: string;
    updatedAt?: string;
  };
  onSelect?: (memory) => void;
  onEdit?: (memory) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
}
```

**使用示例：**
```tsx
import { MemoryCard } from './components/memory/MemoryCard';

function MemoryList({ memories }) {
  return (
    <div>
      {memories.map(memory => (
        <MemoryCard
          key={memory.id}
          memory={memory}
          onSelect={(m) => console.log('Selected:', m)}
          onEdit={(m) => console.log('Edit:', m)}
          onDelete={(id) => console.log('Delete:', id)}
        />
      ))}
    </div>
  );
}
```

### 3. MemorySearch (`components/memory/MemorySearch.tsx`)

搜索框组件，支持实时搜索和清空功能。

**Props：**
```typescript
interface MemorySearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}
```

**使用示例：**
```tsx
import { MemorySearch } from './components/memory/MemorySearch';

function SearchBar() {
  const handleSearch = (query: string) => {
    console.log('Searching:', query);
  };

  return <MemorySearch onSearch={handleSearch} placeholder="搜索记忆..." />;
}
```

## 集成到 MainLayout

MainLayout 已经包含了记忆管理的导航入口。

**导航结构：**
- 首页 (Home)
- **记忆 (Memory)** ← 新增
- 设置 (Settings)

**使用示例：**
```tsx
import { MainLayout } from './MainLayout';

function App() {
  const [currentView, setCurrentView] = useState('home');

  return (
    <MainLayout
      currentView={currentView}
      onNavigate={setCurrentView}
    />
  );
}
```

## 设计规范

遵循 Mac 风格设计指南：

- **圆角：** `rounded-lg` / `rounded-xl`
- **阴影：** 微妙的 `shadow-sm` 和 `shadow-md`
- **背景：** 半透明背景 + backdrop blur
- **边框：** 细边框 `border-gray-200` / `border-white/10`
- **过渡：** `transition-all duration-200`
- **暗色模式：** 完整的 dark mode 支持

## 响应式布局

- 左侧：记忆列表（自适应宽度）
- 右侧：详情面板（固定 384px / w-96）
- 统计卡片：4 列网格布局
- 移动端：自动堆叠（需要额外适配）

## 数据类型

使用项目统一的 `MemoryEntry` 类型：

```typescript
interface MemoryEntry {
  id: string;
  text: string;
  importance: number;
  category: MemoryCategory; // 'fact' | 'preference' | 'decision' | 'entity' | 'other'
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt?: number;
}
```

## Hooks 集成

组件已集成 `useMemory` hook，自动处理：
- 初始化连接
- 数据加载
- 搜索查询
- CRUD 操作
- 状态管理

## 验收标准

- ✅ UI 符合 Mac 设计规范
- ✅ 搜索功能正常（语义搜索）
- ✅ 数据展示正确（类别、重要性、时间）
- ✅ 响应式布局（弹性布局 + 固定详情面板）
- ✅ 完整的编辑/删除功能
- ✅ 统计卡片实时更新
