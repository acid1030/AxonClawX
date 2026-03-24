import React, { useState, useCallback, useEffect, useRef } from 'react';
import { WorkflowDefinition, WorkflowExecution, NodeStatus } from '../../services/agent-orchestrator';

interface WorkflowVisualizerProps {
  workflow?: WorkflowDefinition;
  execution?: WorkflowExecution | null;
  showControls?: boolean;
  onNodeClick?: (nodeId: string) => void;
  onExecute?: () => void;
  isExecuting?: boolean;
}

interface NodePosition {
  x: number;
  y: number;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  workflow,
  execution,
  showControls = true,
  onNodeClick,
  onExecute,
  isExecuting = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算节点位置
  const calculateNodePositions = useCallback((nodes: any[]): Map<string, NodePosition> => {
    const positions = new Map<string, NodePosition>();
    const nodeWidth = 200;
    const nodeHeight = 120;
    const horizontalGap = 50;
    const verticalGap = 30;

    // 简单的层级布局算法
    const levels = new Map<string, number>();
    const levelNodes = new Map<number, string[]>();

    // 计算每个节点的层级
    const calculateLevel = (nodeId: string, currentLevel: number): void => {
      if (levels.has(nodeId)) return;
      levels.set(nodeId, currentLevel);

      const node = nodes.find(n => n.id === nodeId);
      if (node?.dependencies) {
        const maxDepLevel = Math.max(...node.dependencies.map(depId => {
          calculateLevel(depId, currentLevel + 1);
          return levels.get(depId) || 0;
        }));
        levels.set(nodeId, maxDepLevel + 1);
      }

      const level = levels.get(nodeId) || 0;
      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level)!.push(nodeId);
    };

    // 从入口节点开始计算
    const entryNode = workflow?.entryNode || nodes[0]?.id;
    if (entryNode) {
      calculateLevel(entryNode, 0);
    }

    // 计算位置
    let maxLevel = 0;
    levelNodes.forEach((_, level) => {
      maxLevel = Math.max(maxLevel, level);
    });

    levelNodes.forEach((nodeIds, level) => {
      const levelWidth = nodeIds.length * (nodeWidth + horizontalGap);
      const startX = -(levelWidth / 2);

      nodeIds.forEach((nodeId, index) => {
        positions.set(nodeId, {
          x: startX + index * (nodeWidth + horizontalGap),
          y: level * (nodeHeight + verticalGap),
        });
      });
    });

    return positions;
  }, [workflow]);

  // 获取节点状态
  const getNodeStatus = useCallback((nodeId: string): NodeStatus => {
    if (!execution?.context?.nodeResults) return 'pending';
    const result = execution.context.nodeResults[nodeId];
    return result?.status || 'pending';
  }, [execution]);

  // 获取节点状态颜色
  const getNodeStatusColor = useCallback((status: NodeStatus): string => {
    const colors: Record<NodeStatus, string> = {
      pending: 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600',
      running: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 animate-pulse',
      completed: 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-400',
      failed: 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-400',
      skipped: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700',
      timeout: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 dark:border-yellow-400',
    };
    return colors[status];
  }, []);

  // 获取节点状态图标
  const getNodeStatusIcon = useCallback((status: NodeStatus): JSX.Element => {
    switch (status) {
      case 'running':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  }, []);

  // 处理鼠标拖拽
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 处理滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 2));
  }, []);

  // 渲染节点
  const renderNode = useCallback((node: any, position: NodePosition) => {
    const status = getNodeStatus(node.id);
    const statusColor = getNodeStatusColor(status);
    const isSelected = selectedNode === node.id;

    return (
      <g
        key={node.id}
        transform={`translate(${position.x}, ${position.y})`}
        className="cursor-pointer"
        onClick={() => {
          setSelectedNode(node.id);
          onNodeClick?.(node.id);
        }}
      >
        {/* 节点背景 */}
        <rect
          x="0"
          y="0"
          width="200"
          height="120"
          rx="12"
          className={`${statusColor} transition-all duration-200 ${
            isSelected ? 'stroke-2 stroke-blue-500' : ''
          }`}
        />

        {/* 节点内容 */}
        <foreignObject x="0" y="0" width="200" height="120">
          <div className="h-full p-4 flex flex-col">
            {/* 节点头部 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`text-gray-600 dark:text-gray-400 ${status === 'running' ? 'text-blue-500' : ''}`}>
                  {getNodeStatusIcon(status)}
                </div>
                <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {node.name}
                </span>
              </div>
            </div>

            {/* Agent 信息 */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {node.agentId?.charAt(0) || 'A'}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {node.agentId}
              </span>
            </div>

            {/* 节点描述 */}
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
              {node.description || 'No description'}
            </p>

            {/* 执行时间 */}
            {execution?.context?.nodeResults?.[node.id]?.duration && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {(execution.context.nodeResults[node.id].duration / 1000).toFixed(2)}s
              </div>
            )}
          </div>
        </foreignObject>

        {/* 输入端口 */}
        {node.dependencies && node.dependencies.length > 0 && (
          <circle cx="0" cy="60" r="6" className="fill-blue-500" />
        )}

        {/* 输出端口 */}
        <circle cx="200" cy="60" r="6" className="fill-green-500" />
      </g>
    );
  }, [getNodeStatus, getNodeStatusColor, getNodeStatusIcon, selectedNode, onNodeClick, execution]);

  // 渲染连接线
  const renderConnections = useCallback((nodes: any[], positions: Map<string, NodePosition>) => {
    const lines: JSX.Element[] = [];

    nodes.forEach(node => {
      if (node.dependencies) {
        node.dependencies.forEach(depId => {
          const fromPos = positions.get(depId);
          const toPos = positions.get(node.id);

          if (fromPos && toPos) {
            const fromX = fromPos.x + 200;
            const fromY = fromPos.y + 60;
            const toX = toPos.x;
            const toY = toPos.y + 60;

            // 贝塞尔曲线
            const controlPoint1X = fromX + (toX - fromX) / 2;
            const controlPoint2X = fromX + (toX - fromX) / 2;

            lines.push(
              <path
                key={`${depId}-${node.id}`}
                d={`M ${fromX} ${fromY} C ${controlPoint1X} ${fromY}, ${controlPoint2X} ${toY}, ${toX} ${toY}`}
                className="stroke-gray-300 dark:stroke-gray-600"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            );
          }
        });
      }
    });

    return lines;
  }, []);

  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">选择或创建一个工作流</p>
        </div>
      </div>
    );
  }

  const positions = calculateNodePositions(workflow.nodes);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 工具栏 */}
      {showControls && (
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {workflow.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {workflow.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* 缩放控制 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-center">
                  {(zoom * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  重置
                </button>
              </div>

              {/* 执行按钮 */}
              {onExecute && (
                <button
                  onClick={onExecute}
                  disabled={isExecuting}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isExecuting
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isExecuting ? '执行中...' : '执行工作流'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 画布区域 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* 定义箭头 */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                className="fill-gray-400 dark:fill-gray-600"
              />
            </marker>
          </defs>

          {/* 网格背景 */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-gray-200 dark:stroke-gray-800" strokeWidth="1" />
          </pattern>
          <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid)" />

          {/* 连接线 */}
          {renderConnections(workflow.nodes, positions)}

          {/* 节点 */}
          {workflow.nodes.map(node => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            return renderNode(node, pos);
          })}
        </svg>

        {/* 图例 */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">状态图例</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="text-xs text-gray-600 dark:text-gray-400">等待中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-gray-600 dark:text-gray-400">执行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">已完成</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">失败</span>
            </div>
          </div>
        </div>

        {/* 执行统计 */}
        {execution && (
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">执行统计</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600 dark:text-gray-400">状态:</span>
                <span className={`font-medium ${
                  execution.status === 'completed' ? 'text-green-500' :
                  execution.status === 'failed' ? 'text-red-500' :
                  execution.status === 'running' ? 'text-blue-500' :
                  'text-gray-500'
                }`}>
                  {execution.status}
                </span>
              </div>
              {execution.startTime && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600 dark:text-gray-400">开始时间:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(execution.startTime).toLocaleTimeString('zh-CN')}
                  </span>
                </div>
              )}
              {execution.endTime && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600 dark:text-gray-400">耗时:</span>
                  <span className="text-gray-900 dark:text-white">
                    {((execution.endTime - execution.startTime) / 1000).toFixed(2)}s
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-gray-600 dark:text-gray-400">进度:</span>
                <span className="text-gray-900 dark:text-white">
                  {execution.context.currentStep}/{execution.context.totalSteps}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 执行历史 */}
      {executionHistory.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              执行历史
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {executionHistory.slice(-5).reverse().map((exec, index) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between text-xs p-2 rounded bg-gray-100 dark:bg-white/5"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(exec.startTime || 0).toLocaleString('zh-CN')}
                  </span>
                  <span className={`font-medium ${
                    exec.status === 'completed' ? 'text-green-500' :
                    exec.status === 'failed' ? 'text-red-500' :
                    'text-blue-500'
                  }`}>
                    {exec.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowVisualizer;
