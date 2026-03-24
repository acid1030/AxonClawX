# 组合模式使用示例

## 快速开始

```typescript
import { 
  createLeaf, 
  createComposite, 
  buildTree,
  serializeTree,
  deserializeTree 
} from './composite-pattern-skill';
```

---

## 示例 1: 基础树形结构

```typescript
// 创建根节点
const root = createComposite('Project');

// 创建子节点
const frontend = createComposite('Frontend');
const backend = createComposite('Backend');
const docs = createLeaf('README.md', { size: '2KB' });

// 组合结构
root.add(frontend);
root.add(backend);
root.add(docs);

// 添加叶子节点
frontend.add(createLeaf('App.tsx', { lines: 500 }));
frontend.add(createLeaf('styles.css', { lines: 200 }));
backend.add(createLeaf('server.js', { lines: 800 }));

// 统一操作 - 对所有节点执行相同接口
console.log(root.operation());
// 输出: [Composite] Project executed with 3 children: ...

// 获取路径和深度
console.log(docs.getPath());  // Project / README.md
console.log(docs.getDepth()); // 1
```

---

## 示例 2: 遍历与查找

```typescript
const tree = buildTree('Company', [
  {
    name: 'Engineering',
    type: 'composite',
    children: [
      { name: 'Alice', type: 'leaf' },
      { name: 'Bob', type: 'leaf' },
      {
        name: 'QA Team',
        type: 'composite',
        children: [
          { name: 'Charlie', type: 'leaf' },
          { name: 'Diana', type: 'leaf' }
        ]
      }
    ]
  },
  {
    name: 'Marketing',
    type: 'composite',
    children: [
      { name: 'Eve', type: 'leaf' }
    ]
  }
]);

// 遍历所有节点
tree.traverse(node => {
  console.log(`${node.getPath()} (${node.isLeaf() ? 'Leaf' : 'Composite'})`);
});

// 查找节点
const found = tree.findByName('Charlie');
console.log(found?.getPath()); // Company / Engineering / QA Team / Charlie

// 按类型筛选
const leaves = tree.findByType('leaf');
console.log(leaves.map(l => l.name).join(', ')); // Alice, Bob, Charlie, Diana, Eve

// 统计节点数
console.log(tree.count()); // 9
```

---

## 示例 3: 序列化与反序列化

```typescript
const original = buildTree('Root', [
  {
    name: 'Branch1',
    type: 'composite',
    children: [
      { name: 'Leaf1', type: 'leaf' },
      { name: 'Leaf2', type: 'leaf' }
    ]
  }
]);

// 序列化为 JSON
const json = serializeTree(original);
// {
//   "name": "Root",
//   "type": "composite",
//   "metadata": {},
//   "children": [...]
// }

// 从 JSON 恢复
const restored = deserializeTree(json);
console.log(restored.operation());
```

---

## 示例 4: 文件系统模拟

```typescript
const fileSystem = buildTree('/', [
  {
    name: 'home',
    type: 'composite',
    children: [
      {
        name: 'user',
        type: 'composite',
        children: [
          { 
            name: 'documents', 
            type: 'composite', 
            children: [
              { name: 'report.pdf', type: 'leaf' },
              { name: 'notes.txt', type: 'leaf' }
            ] 
          },
          { name: '.bashrc', type: 'leaf' }
        ]
      }
    ]
  },
  {
    name: 'etc',
    type: 'composite',
    children: [
      { name: 'hosts', type: 'leaf' },
      { name: 'passwd', type: 'leaf' }
    ]
  }
]);

// 查找文件
const report = fileSystem.findByName('report.pdf');
console.log(report?.getPath());  // / / home / user / documents / report.pdf
console.log(report?.getDepth()); // 4

// 列出所有文件
fileSystem.findByType('leaf').forEach(leaf => {
  console.log(leaf.getPath());
});

// 列出所有目录
fileSystem.findByType('composite').forEach(comp => {
  console.log(`${comp.getPath()} (${(comp as any).getChildren().length} items)`);
});
```

---

## 示例 5: UI 组件树

```typescript
// 模拟 React 组件树
const app = createComposite('App', { type: 'component' });

const layout = createComposite('Layout', { type: 'component' });
const header = createLeaf('Header', { type: 'component', props: '{title: "Home"}' });
const sidebar = createLeaf('Sidebar', { type: 'component', props: '{items: 5}' });
const content = createComposite('Content', { type: 'component' });

layout.add(header);
layout.add(sidebar);
layout.add(content);

content.add(createLeaf('Dashboard', { type: 'component' }));
content.add(createLeaf('Chart', { type: 'component' }));

app.add(layout);

// 渲染整个组件树
app.traverse(node => {
  if (node.isLeaf()) {
    console.log(`Render: ${node.name} - ${node.getMetadata('props')}`);
  } else {
    console.log(`Container: ${node.name}`);
  }
});
```

---

## API 参考

### 创建节点

| 函数 | 描述 | 参数 |
|------|------|------|
| `createLeaf(name, metadata?)` | 创建叶子节点 | name: 节点名, metadata: 可选元数据 |
| `createComposite(name, metadata?)` | 创建组合节点 | name: 节点名, metadata: 可选元数据 |
| `buildTree(rootName, structure)` | 从结构定义构建树 | rootName: 根节点名, structure: 数组结构 |

### 节点操作

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `operation()` | 执行节点操作 | string |
| `add(component)` | 添加子节点 | void |
| `remove(component)` | 移除子节点 | void |
| `getChild(index)` | 获取指定子节点 | IComponent \\| null |
| `getPath()` | 获取完整路径 | string |
| `getDepth()` | 获取深度 | number |
| `traverse(callback)` | 遍历子树 | void |
| `isLeaf()` | 是否为叶子节点 | boolean |
| `isComposite()` | 是否为组合节点 | boolean |
| `getMetadata(key?)` | 获取元数据 | any |

### 高级操作 (仅 Composite)

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `getChildren()` | 获取所有子节点 | IComponent[] |
| `findByName(name)` | 按名称查找节点 | IComponent \\| null |
| `findByType(type)` | 按类型筛选节点 | IComponent[] |
| `count()` | 统计节点总数 | number |

### 序列化

| 函数 | 描述 |
|------|------|
| `serializeTree(root)` | 将树序列化为 JSON |
| `deserializeTree(json)` | 从 JSON 恢复树 |

---

## 设计模式要点

### 组合模式核心思想

1. **统一接口** - Leaf 和 Composite 实现相同的 IComponent 接口
2. **递归组合** - Composite 可包含任意子节点 (Leaf 或 Composite)
3. **透明性** - 客户端无需区分 Leaf 和 Composite

### 适用场景

- ✅ 树形结构 (文件系统、组织架构、UI 组件)
- ✅ 需要统一操作部分和整体
- ✅ 递归遍历需求

### 注意事项

- ⚠️ Leaf 调用 add/remove 会抛出错误
- ⚠️ 循环引用会导致无限递归
- ⚠️ 大树的 traverse 操作可能性能较低

---

**创建时间:** 2026-03-13  
**作者:** KAEL  
**模式:** Composite Pattern (组合模式)
