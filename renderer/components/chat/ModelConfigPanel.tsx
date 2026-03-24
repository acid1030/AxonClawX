/**
 * ModelConfigPanel - 模型配置面板
 */

import React from 'react';

interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  streamEnabled: boolean;
  tools: string[];
}

interface ModelConfigPanelProps {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
  onToggleTool: (tool: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({
  config,
  onChange,
  onToggleTool,
  collapsed = false,
  onToggleCollapse,
}) => {
  // 模型列表
  const models = [
    { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', badge: '推荐' },
    { id: 'claude-opus-4', name: 'Claude Opus 4', badge: '旗舰' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', badge: '快速' },
  ];

  // 工具列表
  const tools = [
    { id: 'web_search', name: '搜索', icon: '🔍' },
    { id: 'code_exec', name: '代码执行', icon: '💻' },
    { id: 'file_read', name: '文件读写', icon: '📁' },
    { id: 'http_request', name: '网络请求', icon: '🌐' },
  ];

  // 模拟用量数据
  const usage = {
    inputTokens: 1204,
    outputTokens: 386,
    cost: '$0.002',
    messageCount: 4,
  };

  return (
    <div className="w-64 flex flex-col bg-[var(--sidebar-bg,#161b22)] border-l border-white/10 flex-shrink-0 overflow-hidden">
      {/* 头部 */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
        <span className="text-sm font-medium text-gray-300">配置</span>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        {/* 模型选择 */}
        <div className="p-4 border-b border-white/10">
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
            模型
          </label>
          <select
            value={config.model}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
            className="w-full h-7 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-blue-500/50 cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23606060'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* 参数 */}
        <div className="p-4 border-b border-white/10">
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
            参数
          </label>

          {/* Temperature */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Temperature</span>
              <span className="text-xs font-medium text-gray-300">{config.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-sm"
            />
          </div>

          {/* Max Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Max Tokens</span>
              <span className="text-xs font-medium text-gray-300">{config.maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={config.maxTokens}
              onChange={(e) => onChange({ ...config, maxTokens: parseInt(e.target.value) })}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-sm"
            />
          </div>
        </div>

        {/* 工具 */}
        <div className="p-4 border-b border-white/10">
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
            工具
          </label>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToggleTool(tool.id)}
                className={`px-2.5 py-1.5 rounded-md text-[11.5px] border transition-colors flex items-center gap-1.5 ${
                  config.tools.includes(tool.id)
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-400'
                }`}
              >
                <span>{tool.icon}</span>
                <span>{tool.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 选项 */}
        <div className="p-4 border-b border-white/10">
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
            选项
          </label>

          {/* 流式输出 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">流式输出</span>
            <button
              onClick={() => onChange({ ...config, streamEnabled: !config.streamEnabled })}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                config.streamEnabled ? 'bg-blue-500' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  config.streamEnabled ? 'left-4' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 本次用量 */}
        <div className="p-4">
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
            本次用量
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-white/5 rounded-lg">
              <div className="text-base font-medium text-gray-200">{usage.inputTokens.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">输入 tokens</div>
            </div>
            <div className="p-2.5 bg-white/5 rounded-lg">
              <div className="text-base font-medium text-gray-200">{usage.outputTokens.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">输出 tokens</div>
            </div>
            <div className="p-2.5 bg-white/5 rounded-lg">
              <div className="text-base font-medium text-gray-200">{usage.cost}</div>
              <div className="text-[10px] text-gray-500">费用估算</div>
            </div>
            <div className="p-2.5 bg-white/5 rounded-lg">
              <div className="text-base font-medium text-gray-200">{usage.messageCount}</div>
              <div className="text-[10px] text-gray-500">消息数</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelConfigPanel;
