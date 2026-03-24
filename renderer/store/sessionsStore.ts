import { create } from 'zustand';
import { gateway, Session, Message } from '../services/gateway';

export interface Agent {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  status: 'idle' | 'busy' | 'offline';
  avatar?: string;
}

export interface SessionsState {
  // 会话数据
  sessions: Session[];
  currentSession: Session | null;
  messages: Message[];
  
  // Agent 数据
  agents: Agent[];
  
  // 连接状态
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions - 连接管理
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Actions - 会话管理
  loadSessions: () => Promise<void>;
  createSession: (label?: string) => Promise<Session>;
  selectSession: (session: Session | null) => void;
  loadMessages: (sessionKey: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  
  // Actions - Agent 管理
  loadAgents: () => Promise<void>;
  
  // 事件订阅
  subscribeToMessages: () => void;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  // 初始状态
  sessions: [],
  currentSession: null,
  messages: [],
  agents: [],
  isConnected: false,
  isLoading: false,
  error: null,

  // 连接 Gateway
  connect: async (token?: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // 如果有 token，重新初始化 gateway
      if (token) {
        const { gateway } = await import('../services/gateway');
        gateway.config.token = token;
        localStorage.setItem('gateway_token', token);
      }
      
      await gateway.connect();
      set({ isConnected: true, isLoading: false });
      console.log('[Store] Connected to Gateway');
    } catch (error) {
      set({ 
        isConnected: false, 
        isLoading: false, 
        error: `连接失败：${error instanceof Error ? error.message : '未知错误'}` 
      });
      console.error('[Store] Failed to connect:', error);
    }
  },

  // 断开连接
  disconnect: () => {
    gateway.disconnect();
    set({ isConnected: false });
  },

  // 加载会话列表
  loadSessions: async () => {
    try {
      const sessions = await gateway.listSessions();
      set({ sessions });
      
      // 从会话中提取 Agent 信息
      const agents: Agent[] = sessions.map(s => ({
        id: s.agentId || s.id,
        name: s.label || s.agentId || 'Unknown',
        role: 'agent',
        status: s.status === 'active' ? 'busy' : s.status === 'idle' ? 'idle' : 'offline',
      }));
      
      // 添加预设 Agent
      const presetAgents: Agent[] = [
        { id: 'NEXUS', name: 'NEXUS', role: '战略执行官', status: 'idle' },
        { id: 'ARIA', name: 'ARIA', role: '产品架构师', status: 'idle' },
        { id: 'KAEL', name: 'KAEL', role: '工程总管', status: 'idle' },
        { id: 'ZARA', name: 'ZARA', role: '全栈开发', status: 'idle' },
        { id: 'DANTE', name: 'DANTE', role: '后端架构师', status: 'idle' },
        { id: 'REX', name: 'REX', role: '质量守门员', status: 'idle' },
      ];
      
      set({ agents: [...presetAgents, ...agents] });
    } catch (error) {
      console.error('[Store] Failed to load sessions:', error);
    }
  },

  // 创建会话
  createSession: async (label?: string) => {
    try {
      const session = await gateway.createSession(label);
      set(state => ({
        sessions: [...state.sessions, session],
        currentSession: session,
      }));
      return session;
    } catch (error) {
      console.error('[Store] Failed to create session:', error);
      throw error;
    }
  },

  // 选择会话
  selectSession: (session) => {
    set({ currentSession: session });
    if (session) {
      get().loadMessages(session.key);
    }
  },

  // 加载消息历史
  loadMessages: async (sessionKey: string) => {
    try {
      const messages = await gateway.getSessionHistory(sessionKey);
      set({ messages });
    } catch (error) {
      console.error('[Store] Failed to load messages:', error);
      set({ messages: [] });
    }
  },

  // 发送消息
  sendMessage: async (content: string) => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('未选择会话');
    }

    try {
      // 添加用户消息到本地
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sessionId: currentSession.key,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      
      set(state => ({
        messages: [...state.messages, userMessage],
      }));

      // 发送到 Gateway
      await gateway.sendMessage(currentSession.key, content);
    } catch (error) {
      console.error('[Store] Failed to send message:', error);
      throw error;
    }
  },

  // 加载 Agent 列表
  loadAgents: async () => {
    // 已经在 loadSessions 中处理
    await get().loadSessions();
  },

  // 订阅实时消息
  subscribeToMessages: () => {
    gateway.onMessage((msg) => {
      console.log('[Store] Received message:', msg);
      
      // 如果是会话消息，添加到消息列表
      if (msg.type === 'session_message' || msg.role) {
        const message: Message = {
          id: msg.id || `msg-${Date.now()}`,
          sessionId: msg.sessionId || get().currentSession?.key || '',
          role: msg.role || 'assistant',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || Date.now(),
          metadata: msg.metadata,
        };
        
        set(state => ({
          messages: [...state.messages, message],
        }));
      }
      
      // 如果是会话状态更新，刷新会话列表
      if (msg.type === 'session_status' || msg.type === 'session_update') {
        get().loadSessions();
      }
    });
  },
}));

// 自动连接初始化
if (typeof window !== 'undefined') {
  // 从环境变量或配置文件读取 Token
  const GATEWAY_TOKEN = 'yXzfa2g7H6yE01w52VssgiobnzTmDA5Y8mZfcvHrEnU=';
  
  const store = useSessionsStore.getState();
  store.connect(GATEWAY_TOKEN).then(() => {
    store.loadSessions();
    store.subscribeToMessages();
  }).catch(err => {
    console.error('[Store] Failed to connect with token:', err);
  });
}

export default useSessionsStore;
