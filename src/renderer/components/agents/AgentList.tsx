import { useState } from 'react';
import { useAgentsStore, Agent } from '@/stores/agentsStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Play,
  Square,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusColors = {
  idle: 'bg-green-500',
  busy: 'bg-yellow-500',
  error: 'bg-red-500',
  offline: 'bg-gray-500',
};

const statusLabels = {
  idle: 'Idle',
  busy: 'Busy',
  error: 'Error',
  offline: 'Offline',
};

interface AgentListProps {
  onSelectAgent?: (agent: Agent) => void;
  onCreateAgent?: () => void;
}

export function AgentList({ onSelectAgent, onCreateAgent }: AgentListProps) {
  const { agents, deleteAgent, selectAgent } = useAgentsStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (agent: Agent) => {
    selectAgent(agent.id);
    onSelectAgent?.(agent);
  };

  const handleDelete = (id: string) => {
    deleteAgent(id);
  };

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Bot className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">暂无 Agent</p>
        <p className="text-sm mb-4">点击下方按钮创建你的第一个 Agent</p>
        <Button onClick={onCreateAgent}>
          <Plus className="w-4 h-4 mr-2" />
          创建 Agent
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agent 军团</h2>
        <Button size="sm" onClick={onCreateAgent}>
          <Plus className="w-4 h-4 mr-2" />
          新建
        </Button>
      </div>

      <div className="space-y-2">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              hoveredId === agent.id ? 'border-primary' : ''
            }`}
            onMouseEnter={() => setHoveredId(agent.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleSelect(agent)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                        statusColors[agent.status]
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{agent.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {agent.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {agent.specialty}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(agent);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle status
                      }}
                    >
                      {agent.status === 'busy' ? (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          停止
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          启动
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(agent.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Badge
                  variant={
                    agent.status === 'idle' ? 'default' : 'secondary'
                  }
                  className="text-xs"
                >
                  {statusLabels[agent.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  创建于{' '}
                  {new Date(agent.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
