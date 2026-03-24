// AxonClaw - Message Input Component
import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputText]);

  const handleSend = () => {
    if (!inputText.trim() || disabled) return;
    onSend(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-3 bg-slate-800/50 border border-slate-700 rounded-xl p-3 transition-colors focus-within:border-indigo-500">
      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Send message... (Shift+Enter for newline)"
        disabled={disabled}
        className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 resize-none outline-none min-h-[24px] max-h-[200px] py-1 disabled:opacity-50"
        rows={1}
      />
      <button
        onClick={handleSend}
        disabled={!inputText.trim() || disabled}
        className="shrink-0 w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  );
};

export default MessageInput;
