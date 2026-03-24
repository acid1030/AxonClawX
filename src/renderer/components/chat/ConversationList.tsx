/**
 * ConversationList - Chat列表组件
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;
  unread?: number;
  isPinned?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeId,
  searchQuery,
  onSearchChange,
  onSelect,
  onNewChat,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { t, i18n } = useTranslation('views');
  // 过滤Chat
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.title.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return t('chatList.minutesAgo', { count: minutes });
    if (hours < 24) return t('chatList.hoursAgo', { count: hours });
    if (days < 7) return t('chatList.daysAgo', { count: days });
    return new Date(timestamp).toLocaleDateString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US');
  };

  // 分组Chat
  const groupedConversations = useMemo(() => {
    const now = Date.now();
    const today: Conversation[] = [];
    const earlier: Conversation[] = [];

    filteredConversations.forEach(c => {
      const diff = now - c.timestamp;
      if (diff < 86400000) {
        today.push(c);
      } else {
        earlier.push(c);
      }
    });

    return { today, earlier };
  }, [filteredConversations]);

  return (
    <div className="w-60 flex flex-col bg-[var(--sidebar-bg,#161b22)] border-r border-white/10 flex-shrink-0">
      {/* 头部 */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">Chat</span>
        <button
          onClick={onNewChat}
          className="h-7 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          + {t('chatList.new')}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('chatList.searchPlaceholder')}
            className="w-full h-7 pl-8 pr-3 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Chat列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {/* 最近 */}
        {groupedConversations.today.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              {t('chatList.recent')}
            </div>
            {groupedConversations.today.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={onSelect}
                formatTime={formatTime}
              />
            ))}
          </>
        )}

        {/* 更早 */}
        {groupedConversations.earlier.length > 0 && (
          <>
            <div className="px-2 py-1.5 mt-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              {t('chatList.earlier')}
            </div>
            {groupedConversations.earlier.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={onSelect}
                formatTime={formatTime}
              />
            ))}
          </>
        )}

        {/* 空状态 */}
        {filteredConversations.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">
            {searchQuery ? 'No matching chats' : 'No chats'}
          </div>
        )}
      </div>

      {/* 底部用户信息 */}
      <div className="px-3 py-2 border-t border-white/10 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
          U
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-300 truncate">{t('chatList.user')}</div>
          <div className="text-[10px] text-gray-500">Free Plan</div>
        </div>
        <button
          className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
          title="Settings"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Chat项组件
const ConversationItem: React.FC<{
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  formatTime: (ts: number) => string;
}> = ({ conversation, isActive, onSelect, formatTime }) => {
  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
        isActive
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
      }`}
    >
      <span className="text-sm opacity-70">💬</span>
      <span className="flex-1 text-xs truncate">{conversation.title}</span>
      {conversation.unread && conversation.unread > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
          {conversation.unread}
        </span>
      )}
    </button>
  );
};

export default ConversationList;
