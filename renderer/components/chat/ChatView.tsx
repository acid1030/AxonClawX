/**
 * ChatView - 增强版对话视图
 * 根据设计稿实现，包含对话列表、消息区域、配置面板
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionsStore } from '@/store/sessionsStore';
import { ConversationList } from './ConversationList';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ModelConfigPanel } from './ModelConfigPanel';

// 模拟对话数据
interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;
  unread?: number;
  isPinned?: boolean;
}

export const ChatView: React.FC = () => {
  // 状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: '1', title: 'Anthropic API 配置问题', lastMessage: '配置完成', timestamp: Date.now() - 3600000 },
    { id: '2', title: 'Python 异步爬虫设计', lastMessage: '代码已生成', timestamp: Date.now() - 7200000, unread: 2 },
    { id: '3', title: 'Git rebase 冲突解决', lastMessage: '已解决', timestamp: Date.now() - 86400000 },
    { id: '4', title: 'React Hooks 最佳实践', lastMessage: '文档已整理', timestamp: Date.now() - 172800000 },
    { id: '5', title: '数据库索引优化', lastMessage: '优化完成', timestamp: Date.now() - 259200000 },
  ]);
  const [activeConversation, setActiveConversation] = useState<string>('1');
  
  // Sessions Store
  const {
    messages,
    currentSession,
    isConnected,
    isLoading,
    error,
    sendMessage,
    createSession,
    loadMessages,
    connect,
    sessions,
  } = useSessionsStore();

  // 输入状态
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 模型配置
  const [modelConfig, setModelConfig] = useState({
    model: 'claude-sonnet-4',
    temperature: 0.7,
    maxTokens: 4096,
    streamEnabled: true,
    tools: ['web_search', 'code_exec'],
  });

  // 初始化连接
  useEffect(() => {
    if (!isConnected) {
      connect().catch(console.error);
    }
  }, [isConnected, connect]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const message = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('发送失败:', error);
    } finally {
      setIsTyping(false);
    }
  }, [input, sendMessage]);

  // 新建对话
  const handleNewConversation = useCallback(async () => {
    try {
      const session = await createSession('新对话');
      setActiveConversation(session.id);
      const newConv: Conversation = {
        id: session.id,
        title: '新对话',
        timestamp: Date.now(),
      };
      setConversations(prev => [newConv, ...prev]);
    } catch (error) {
      console.error('创建对话失败:', error);
    }
  }, [createSession]);

  // 选择对话
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversation(id);
    // 清除未读
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, unread: 0 } : c
    ));
  }, []);

  // 工具切换
  const toggleTool = useCallback((tool: string) => {
    setModelConfig(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool],
    }));
  }, []);

  return (
    <div className="h-full flex bg-[var(--bg-primary,#0d1117)]">
      {/* 左侧对话列表 */}
      {!sidebarCollapsed && (
        <ConversationList
          conversations={conversations}
          activeId={activeConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelectConversation}
          onNewChat={handleNewConversation}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(true)}
        />
      )}
      
      {/* 收缩按钮 */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="展开对话列表"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* 中间消息区域 */}
      <div className="flex-1 flex flex-col min-w-0 border-x border-white/10">
        {/* 顶部栏 */}
        <div className="h-11 flex-shrink-0 flex items-center px-4 border-b border-white/10 bg-[var(--bg-secondary,#161b22)]">
          {/* 模型选择 */}
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-sm text-gray-300">{modelConfig.model}</span>
            <span className="text-xs text-gray-500">▾</span>
          </button>
          
          <div className="flex-1" />
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="搜索">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="导出">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={() => setPanelCollapsed(!panelCollapsed)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="设置"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <MessageList
          messages={messages}
          isTyping={isTyping}
          messagesEndRef={messagesEndRef}
        />

        {/* 输入框 */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={!isConnected}
          placeholder="发消息…"
        />

        {/* 连接状态错误提示 */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
      </div>

      {/* 右侧配置面板 */}
      {!panelCollapsed && (
        <ModelConfigPanel
          config={modelConfig}
          onChange={setModelConfig}
          onToggleTool={toggleTool}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(true)}
        />
      )}
    </div>
  );
};

export default ChatView;
