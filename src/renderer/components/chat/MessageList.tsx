/**
 * MessageList - 消息列表组件
 */

import React from 'react';
import { Message } from '@/services/gateway';
import { useTranslation } from 'react-i18next';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
  messagesEndRef,
}) => {
  const { t } = useTranslation('views');
  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 空状态
  if (messages.length === 0 && !isTyping) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">🦾</div>
          <div className="text-xl font-light text-gray-300 mb-2">OpenClaw</div>
          <div className="text-sm mb-6">{t('messageList.subtitle')}</div>
          
          {/* 建议卡片 */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <SuggestionCard icon="🔧" text="Help me debug this code" />
            <SuggestionCard icon="📝" text="Write technical documentation" />
            <SuggestionCard icon="🔍" text="Explain this concept" />
            <SuggestionCard icon="⚡" text="Optimize performance issues" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-4 px-4 scroll-smooth">
      {/* 系统消息 */}
      <div className="text-center text-gray-500 text-xs mb-4">
        {t('messageList.todayChat')}
      </div>

      {/* 消息列表 */}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          formatTime={formatTime}
        />
      ))}

      {/* 正在输入指示器 */}
      {isTyping && (
        <div className="flex items-end gap-2 mb-4 max-w-[75%]">
          <div className="w-[26px] h-[26px] rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs flex-shrink-0">
            🤖
          </div>
          <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/5 border border-white/10">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* 滚动锚点 */}
      <div ref={messagesEndRef} />
    </div>
  );
};

// 消息气泡组件
const MessageBubble: React.FC<{
  message: Message;
  formatTime: (ts: number) => string;
}> = ({ message, formatTime }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2 mb-4 max-w-[75%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white font-medium'
            : 'bg-white/10 border border-white/10'
        }`}
      >
        {isUser ? 'U' : '🤖'}
      </div>

      {/* 气泡 */}
      <div
        className={`px-4 py-2.5 rounded-2xl ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white/5 border border-white/10 text-gray-100 rounded-bl-sm'
        }`}
      >
        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* 时间 */}
      <span className="text-[10px] text-gray-500 pb-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
};

// 建议卡片组件
const SuggestionCard: React.FC<{
  icon: string;
  text: string;
}> = ({ icon, text }) => {
  return (
    <button className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors text-left">
      <div className="text-base mb-1">{icon}</div>
      <div className="text-xs text-gray-400">{text}</div>
    </button>
  );
};

export default MessageList;
