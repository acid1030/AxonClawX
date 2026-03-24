import React, { useState, useCallback, useEffect } from 'react';
import WorkflowVisualizer from '../components/multiagent/WorkflowVisualizer';
import {
  WorkflowDefinition,
  WorkflowExecution,
  orchestrator,
} from '../services/agent-orchestrator';
import {
  getAllWorkflowTemplates,
  getWorkflowTemplateById,
} from '../services/workflow-templates';

interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  status?: string;
  lastExecuted?: number;
  executionCount?: number;
}

export const MultiAgentView: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'visualize' | 'history'>('list');
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);
  const [workflowInput, setWorkflowInput] = useState<Record<string, any>>({});
  const [showInputModal, setShowInputModal] = useState(false);

  // 加载工作流列表
  useEffect(() => {
    loadWorkflows();
  }, []);

  // 监听工作流执行事件
  useEffect(() => {
    const handleWorkflowStarted = ({ execution }: any) => {
      setCurrentExecution(execution);
      setIsExecuting(true);
    };

    const handleWorkflowCompleted = ({ execution }: any) => {
      setCurrentExecution(execution);
      setIsExecuting(false);
      setExecutionHistory(prev => [...prev, execution]);
    };

    const handleWorkflowFailed = ({ execution }: any) => {
      setCurrentExecution(execution);
      setIsExecuting(false);
    };

    orchestrator.on('workflow:started', handleWorkflowStarted);
    orchestrator.on('workflow:completed', handleWorkflowCompleted);
    orchestrator.on('workflow:failed', handleWorkflowFailed);

    return () => {
      orchestrator.off('workflow:started', handleWorkflowStarted);
      orchestrator.off('workflow:completed', handleWorkflowCompleted);
      orchestrator.off('workflow:failed', handleWorkflowFailed);
    };
  }, []);

  const loadWorkflows = useCallback(() => {
    // 加载预设模板
    const templates = getAllWorkflowTemplates();
    const workflowList: WorkflowListItem[] = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      status: 'ready',
      executionCount: 0,
    }));

    // 加载已注册的工作流
    const registered = orchestrator.getAllWorkflows();
    registered.forEach(w => {
      const existing = workflowList.find(wl => wl.id === w.id);
      if (!existing) {
        workflowList.push({
          id: w.id,
          name: w.name,
          description: w.description,
          status: 'ready',
          executionCount: 0,
        });
      }
    });

    setWorkflows(workflowList);
  }, []);

  // 选择工作流
  const handleSelectWorkflow = useCallback((workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    const workflow = getWorkflowTemplateById(workflowId) || orchestrator.getWorkflow(workflowId);
    setSelectedWorkflow(workflow || null);
    setActiveTab('visualize');
  }, []);

  // 执行工作流
  const handleExecuteWorkflow = useCallback(async () => {
    if (!selectedWorkflow) return;

    setShowInputModal(true);
  }, [selectedWorkflow]);

  const confirmExecuteWorkflow = useCallback(async () => {
    if (!selectedWorkflow) return;

    try {
      setIsExecuting(true);
      const execution = await orchestrator.executeWorkflow(
        selectedWorkflow.id,
        workflowInput
      );
      setCurrentExecution(execution);
    } catch (error) {
      console.error('Workflow execution failed:', error);
      alert(`执行失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
      setShowInputModal(false);
      setWorkflowInput({});
    }
  }, [selectedWorkflow, workflowInput]);

  // 创建工作流
  const handleCreateWorkflow = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  // 删除工作流
  const handleDeleteWorkflow = useCallback((workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个工作流吗？')) {
      orchestrator.removeWorkflow(workflowId);
      loadWorkflows();
      if (selectedWorkflowId === workflowId) {
        setSelectedWorkflowId(null);
        setSelectedWorkflow(null);
      }
    }
  }, [selectedWorkflowId, loadWorkflows]);

  // 渲染工作流列表项
  const renderWorkflowItem = useCallback((workflow: WorkflowListItem) => (
    <div
      key={workflow.id}
      onClick={() => handleSelectWorkflow(workflow.id)}
      className={`
        p-4 rounded-xl border cursor-pointer transition-all duration-200
        ${selectedWorkflowId === workflow.id
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-md'
          : 'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {workflow.name}
            </h3>
            <span className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              ${workflow.status === 'ready'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
              }
            `}>
              {workflow.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {workflow.description}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
            <span>执行次数：{workflow.executionCount || 0}</span>
            {workflow.lastExecuted && (
              <span>
                最后执行：{new Date(workflow.lastExecuted).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => handleDeleteWorkflow(workflow.id, e)}
          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  ), [selectedWorkflowId, handleSelectWorkflow, handleDeleteWorkflow]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              多 Agent 协作
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              编排和管理多 Agent 协作工作流
            </p>
          </div>
          <button
            onClick={handleCreateWorkflow}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建工作流
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20'
            }`}
          >
            工作流列表
          </button>
          <button
            onClick={() => setActiveTab('visualize')}
            disabled={!selectedWorkflow}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'visualize'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20'
            } ${!selectedWorkflow ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            可视化
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20'
            }`}
          >
            执行历史
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Workflow List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 space-y-3">
            {workflows.map(workflow => (
              <div key={workflow.id} className="group">
                {renderWorkflowItem(workflow)}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'list' && (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">从左侧选择一个工作流</p>
                <p className="text-sm mt-2">或点击右上角按钮创建新的工作流</p>
              </div>
            </div>
          )}

          {activeTab === 'visualize' && selectedWorkflow && (
            <WorkflowVisualizer
              workflow={selectedWorkflow}
              execution={currentExecution}
              showControls={true}
              onNodeClick={(nodeId) => console.log('Node clicked:', nodeId)}
              onExecute={handleExecuteWorkflow}
              isExecuting={isExecuting}
            />
          )}

          {activeTab === 'history' && (
            <div className="h-full overflow-y-auto p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                执行历史
              </h2>
              {executionHistory.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>暂无执行记录</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {executionHistory.slice().reverse().map((execution, index) => (
                    <div
                      key={execution.id}
                      className="p-4 rounded-xl border bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-medium
                            ${execution.status === 'completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : execution.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }
                          `}>
                            {execution.status}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {execution.workflowId}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {execution.startTime ? new Date(execution.startTime).toLocaleString('zh-CN') : '-'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">执行 ID:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-mono text-xs">
                            {execution.id}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">耗时:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {execution.endTime && execution.startTime
                              ? ((execution.endTime - execution.startTime) / 1000).toFixed(2) + 's'
                              : '-'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">进度:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {execution.context?.currentStep || 0}/{execution.context?.totalSteps || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 创建工作流 Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                创建工作流
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                从模板创建或自定义工作流
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="grid grid-cols-2 gap-4">
                {getAllWorkflowTemplates().map(template => (
                  <div
                    key={template.id}
                    onClick={() => {
                      orchestrator.registerWorkflow(template);
                      loadWorkflows();
                      setShowCreateModal(false);
                      handleSelectWorkflow(template.id);
                    }}
                    className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-all hover:shadow-md"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded">
                        {template.agents.length} 个 Agent
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded">
                        {template.nodes.length} 个节点
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 执行输入 Modal */}
      {showInputModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                执行工作流：{selectedWorkflow.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                请输入工作流所需的初始参数
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    用户需求 / 输入
                  </label>
                  <textarea
                    value={workflowInput.userRequirement || ''}
                    onChange={(e) => setWorkflowInput({ ...workflowInput, userRequirement: e.target.value })}
                    className="w-full h-32 px-3 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    placeholder="请输入工作流的初始输入..."
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInputModal(false);
                  setWorkflowInput({});
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmExecuteWorkflow}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                开始执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAgentView;
