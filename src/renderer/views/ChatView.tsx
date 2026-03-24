// AxonClaw - Chat View (使用 ClawX 真实数据)
import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chat';
import { MarkdownContent } from '../components/chat/MarkdownContent';
import { TypewriterMarkdown } from '../components/chat/TypewriterMarkdown';
import { useGatewayStore } from '../stores/gateway';
import { extractText } from '../pages/Chat/message-utils';
import { useTranslation } from 'react-i18next';

const ChatView: React.FC = () => {
  const { t } = useTranslation('views');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const messages = useChatStore((s) => s.messages);
  const streamingText = useChatStore((s) => s.streamingText);
  const sending = useChatStore((s) => s.sending);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const switchSession = useChatStore((s) => s.switchSession);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const gatewayOnline = true;

  useEffect(() => {
    loadSessions().catch(console.error);
  }, [loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = () => {
    const text = inputRef.current?.value.trim();
    if (!text || sending) return;
    sendMessage(text);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const currentSession = sessions.find(s => s.key === currentSessionKey);

  // 会话消息直接显示；仅模型实时流式时用打字机
  const lastAssistantMsg = messages.length > 0
    ? [...messages].reverse().find(m => m.role === 'assistant')
    : null;
  const lastMsgText = lastAssistantMsg ? extractText(lastAssistantMsg) : '';
  const isStreamingInHistory = !!(
    streamingText?.trim() &&
    lastMsgText &&
    (streamingText.trim() === lastMsgText.trim() || lastMsgText.includes(streamingText.trim()))
  );
  const showStreamingBlock = sending && streamingText && !isStreamingInHistory;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Smart Chat {currentSession ? `- ${currentSession.label || currentSession.displayName || currentSession.key}` : ''}</div>
          <div className="page-tags">
            <span className="page-tag">{t('chatLegacy.assistantTag')}</span>
            <span className="page-tag">{t('chatLegacy.engineTag')}</span>
            <span className={`page-tag ${gatewayOnline ? '' : 'offline'}`}>
              {gatewayOnline ? '🟢 Gateway online' : '🔴 Gateway Offline'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <select
            className="sel"
            style={{ minWidth: '200px' }}
            value={currentSessionKey || ''}
            onChange={e => switchSession(e.target.value)}
          >
            {sessions.map(s => (
              <option key={s.key} value={s.key}>
                {s.label || s.displayName || s.key}
              </option>
            ))}
          </select>
          <button className="btn-outline" onClick={() => loadSessions()}>🔄 {t('chatLegacy.refresh')}</button>
        </div>
      </div>

      <div className="chat-area" id="chatArea">
        {messages.length === 0 && !streamingText ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
              <p>{t('chatLegacy.startNew')}</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                {gatewayOnline ? 'Gateway connected, you can start chatting' : 'Waiting for Gateway...'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`msg ${msg.role}`}>
                <div className={`msg-avatar ${msg.role}`}>
                  {msg.role === 'user' ? 'A' : 'C'}
                </div>
                <div className="msg-body">
                  <div className="msg-meta">
                    {msg.role === 'assistant' && <span className="msg-name">Claw</span>}
                    <span className="msg-time">{formatTime(msg.timestamp)}</span>
                    {msg.role === 'user' && <span className="msg-name">Alex Chen</span>}
                  </div>
                  <div className="msg-bubble">
                    {msg.role === 'assistant' ? (
                      <MarkdownContent content={extractText(msg) || (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))} />
                    ) : (
                      typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                    )}
                  </div>
                </div>
              </div>
            ))}
            {showStreamingBlock && (
              <div className="msg assistant">
                <div className="msg-avatar assistant">C</div>
                <div className="msg-body">
                  <div className="msg-meta">
                    <span className="msg-name">Claw</span>
                    <span className="msg-time">{t('chatLegacy.typing')}</span>
                  </div>
                  <div className="msg-bubble">
                    <TypewriterMarkdown content={streamingText} isStreaming animate />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chat-input-bar">
        <div className="chat-input-wrap">
          <textarea
            ref={inputRef}
            className="chat-input"
            id="chatInput"
            placeholder={gatewayOnline ? "Type a message..." : "Waiting for Gateway..."}
            rows={1}
            onKeyDown={handleKeyDown}
            disabled={!gatewayOnline || sending}
          />
          <div className="chat-tools">
            <button className="tool-btn" title="Attachment">📎</button>
            <button className="tool-btn" title="Drag to upload">📁</button>
            <div className="spacer" />
            <button className="tool-btn" title="Enhance">✦</button>
            <button
              className="send-btn"
              id="sendBtn"
              title="Send"
              onClick={handleSend}
              disabled={!gatewayOnline || sending}
            >
              {sending ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
export { ChatView };
