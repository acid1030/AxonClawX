// AxonClaw - Message Bubble Component
import React from 'react';
import { cn, formatTime } from '../lib/utils';
import type { Message } from '../stores/messagesStore';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isStreaming = message.streaming;

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="shrink-0 w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
          AI
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-slate-700 text-slate-100',
          isStreaming && 'animate-pulse'
        )}
      >
        {/* Text Content */}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
          {isStreaming && <span className="ml-1">▊</span>}
        </div>

        {/* Timestamp */}
        <div
          className={cn(
            'text-xs mt-2 opacity-70',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="shrink-0 w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-semibold">
          你
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
