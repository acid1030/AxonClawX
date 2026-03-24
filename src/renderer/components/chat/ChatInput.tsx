/**
 * ChatInput - 聊天输入框组件
 */

import React, { useRef, useEffect } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Send a message...',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [value]);

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // 按钮状态
  const isActive = value.trim().length > 0;

  return (
    <div className="px-4 py-3 border-t border-white/10 bg-[var(--bg-secondary,#161b22)] flex-shrink-0">
      <div className="max-w-3xl mx-auto bg-[var(--bg-card,#21262d)] border border-white/10 rounded-xl overflow-hidden transition-all focus-within:border-blue-500/50 focus-within:ring-[3px] focus-within:ring-blue-500/15">
        {/* 输入区 */}
        <div className="flex items-end">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 text-[13.5px] text-gray-100 placeholder-gray-500 outline-none resize-none leading-relaxed min-h-[44px] max-h-[200px]"
            style={{ fontFamily: '-apple-system, "SF Pro Text", "Helvetica Neue", sans-serif' }}
          />
          
          {/* Send按钮 */}
          <button
            onClick={onSend}
            disabled={disabled || !isActive}
            className={`flex-shrink-0 w-8 h-8 m-1.5 rounded-lg flex items-center justify-center transition-all ${
              isActive
                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                : 'bg-gray-600 text-gray-400'
            }`}
            title="Send"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M2 7l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Tools栏 */}
        <div className="flex items-center gap-1 px-3 pb-2">
          <ToolButton icon="📎" label="Attachment" />
          <ToolButton icon="🔧" label="Tools" />
          <ToolButton icon="📷" label="Screenshot" />
          <div className="flex-1" />
          <span className="text-[11px] text-gray-500 px-1">
            ↩ Send · ⇧↩ 换行
          </span>
        </div>
      </div>
    </div>
  );
};

// Tools按钮
const ToolButton: React.FC<{
  icon: string;
  label: string;
  onClick?: () => void;
}> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="h-[26px] px-2 rounded-md text-[12px] text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors flex items-center gap-1"
    >
      <span className="text-xs">{icon}</span>
      <span>{label}</span>
    </button>
  );
};

export default ChatInput;
