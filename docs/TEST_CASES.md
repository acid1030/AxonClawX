# AxonClaw 测试用例

> 版本: v1.0
> 更新时间: 2026-03-12

---

## 1. agentsStore 测试

### 1.1 状态初始化

```typescript
describe('agentsStore', () => {
  beforeEach(() => {
    // 重置 store
    useAgentsStore.setState({ agents: [], selectedAgentId: null });
  });

  it('should have empty initial state', () => {
    const state = useAgentsStore.getState();
    expect(state.agents).toEqual([]);
    expect(state.selectedAgentId).toBeNull();
  });
});
```

### 1.2 CRUD 操作

```typescript
describe('agentsStore CRUD', () => {
  it('should add an agent', () => {
    const { addAgent } = useAgentsStore.getState();
    const newAgent: Agent = {
      id: 'test-1',
      name: 'TEST',
      role: 'test',
      status: 'idle',
      specialty: 'Testing',
      soul: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addAgent(newAgent);

    const state = useAgentsStore.getState();
    expect(state.agents).toHaveLength(1);
    expect(state.agents[0].name).toBe('TEST');
  });

  it('should update an agent', () => {
    const { addAgent, updateAgent } = useAgentsStore.getState();
    addAgent({ ...mockAgent, id: 'test-1', name: 'OLD' });

    updateAgent('test-1', { name: 'NEW' });

    const state = useAgentsStore.getState();
    expect(state.agents[0].name).toBe('NEW');
  });

  it('should delete an agent', () => {
    const { addAgent, deleteAgent } = useAgentsStore.getState();
    addAgent({ ...mockAgent, id: 'test-1' });

    deleteAgent('test-1');

    const state = useAgentsStore.getState();
    expect(state.agents).toHaveLength(0);
  });

  it('should select an agent', () => {
    const { selectAgent } = useAgentsStore.getState();

    selectAgent('test-1');

    const state = useAgentsStore.getState();
    expect(state.selectedAgentId).toBe('test-1');
  });
});
```

---

## 2. AgentList 组件测试

### 2.1 渲染测试

```typescript
import { render, screen } from '@testing-library/react';
import { AgentList } from './AgentList';

describe('AgentList', () => {
  it('should render empty state when no agents', () => {
    render(<AgentList />);

    expect(screen.getByText('暂无 Agent')).toBeInTheDocument();
  });

  it('should render agent cards', () => {
    const mockAgents = [
      { id: '1', name: 'ZARA', role: 'fullstack', status: 'idle', specialty: '开发' },
    ];

    useAgentsStore.setState({ agents: mockAgents });

    render(<AgentList />);

    expect(screen.getByText('ZARA')).toBeInTheDocument();
    expect(screen.getByText('fullstack')).toBeInTheDocument();
  });

  it('should show correct status badge', () => {
    const mockAgents = [
      { id: '1', name: 'ZARA', role: 'fullstack', status: 'busy', specialty: '开发' },
    ];

    useAgentsStore.setState({ agents: mockAgents });

    render(<AgentList />);

    expect(screen.getByText('忙碌')).toBeInTheDocument();
  });
});
```

### 2.2 交互测试

```typescript
describe('AgentList interactions', () => {
  it('should call onCreateAgent when create button clicked', () => {
    const onCreateAgent = jest.fn();
    render(<AgentList onCreateAgent={onCreateAgent} />);

    fireEvent.click(screen.getByText('新建'));

    expect(onCreateAgent).toHaveBeenCalled();
  });

  it('should call onSelectAgent when agent card clicked', () => {
    const onSelectAgent = jest.fn();
    const mockAgents = [
      { id: '1', name: 'ZARA', role: 'fullstack', status: 'idle', specialty: '开发' },
    ];
    useAgentsStore.setState({ agents: mockAgents });

    render(<AgentList onSelectAgent={onSelectAgent} />);

    fireEvent.click(screen.getByText('ZARA'));

    expect(onSelectAgent).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  it('should show delete confirmation', () => {
    const mockAgents = [
      { id: '1', name: 'ZARA', role: 'fullstack', status: 'idle', specialty: '开发' },
    ];
    useAgentsStore.setState({ agents: mockAgents });

    render(<AgentList />);

    // 点击更多按钮
    fireEvent.click(screen.getByRole('button', { name: /more/i }));

    // 点击删除
    fireEvent.click(screen.getByText('删除'));

    // 应该有确认对话框
    expect(screen.getByText(/确定删除/i)).toBeInTheDocument();
  });
});
```

---

## 3. AgentForm 组件测试

### 3.1 表单验证

```typescript
describe('AgentForm validation', () => {
  it('should disable submit when name is empty', () => {
    render(<AgentForm open={true} onOpenChange={() => {}} />);

    const submitButton = screen.getByText('创建');
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit when name is filled', () => {
    render(<AgentForm open={true} onOpenChange={() => {}} />);

    const nameInput = screen.getByPlaceholderText('给 Agent 起个名字');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    const submitButton = screen.getByText('创建');
    expect(submitButton).not.toBeDisabled();
  });
});
```

### 3.2 提交测试

```typescript
describe('AgentForm submission', () => {
  it('should call addAgent when creating new agent', async () => {
    const onOpenChange = jest.fn();
    render(<AgentForm open={true} onOpenChange={onOpenChange} />);

    // 填写表单
    fireEvent.change(screen.getByPlaceholderText('给 Agent 起个名字'), {
      target: { value: 'BLAZE' },
    });
    fireEvent.change(screen.getByPlaceholderText('例如：前端开发'), {
      target: { value: '前端开发' },
    });

    // 提交
    fireEvent.click(screen.getByText('创建'));

    await waitFor(() => {
      const state = useAgentsStore.getState();
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].name).toBe('BLAZE');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should call updateAgent when editing agent', async () => {
    const existingAgent = {
      id: '1',
      name: 'OLD',
      role: 'test',
      status: 'idle' as const,
      specialty: 'Test',
      soul: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const onOpenChange = jest.fn();
    render(<AgentForm open={true} onOpenChange={onOpenChange} agent={existingAgent} />);

    // 修改名称
    fireEvent.change(screen.getByDisplayValue('OLD'), {
      target: { value: 'NEW' },
    });

    // 保存
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      const state = useAgentsStore.getState();
      expect(state.agents[0].name).toBe('NEW');
    });
  });
});
```

---

## 4. 边界情况测试

### 4.1 并发操作

```typescript
describe('concurrent operations', () => {
  it('should handle rapid add/delete operations', async () => {
    const { addAgent, deleteAgent } = useAgentsStore.getState();

    // 快速添加和删除
    for (let i = 0; i < 100; i++) {
      addAgent({ ...mockAgent, id: `agent-${i}` });
    }

    expect(useAgentsStore.getState().agents).toHaveLength(100);

    // 并发删除
    await Promise.all(
      useAgentsStore.getState().agents.map(a => deleteAgent(a.id))
    );

    expect(useAgentsStore.getState().agents).toHaveLength(0);
  });
});
```

### 4.2 数据持久化

```typescript
describe('persistence', () => {
  it('should persist agents to localStorage', () => {
    const { addAgent } = useAgentsStore.getState();
    addAgent({ ...mockAgent, id: 'persist-1', name: 'PERSIST' });

    // 检查 localStorage
    const stored = localStorage.getItem('agents-storage');
    expect(stored).toContain('PERSIST');
  });

  it('should restore agents from localStorage', () => {
    // 预设 localStorage
    localStorage.setItem('agents-storage', JSON.stringify({
      state: { agents: [{ id: '1', name: 'RESTORED' }] }
    }));

    // 重新初始化 store
    // (实际测试中需要重新加载模块)

    const state = useAgentsStore.getState();
    expect(state.agents).toHaveLength(1);
  });
});
```

---

## 5. 测试覆盖率目标

| 模块 | 目标覆盖率 |
|------|-----------|
| agentsStore | 90% |
| AgentList | 80% |
| AgentForm | 80% |
| 总体 | 80% |

---

*文档版本: v1.0 | 2026-03-12*
