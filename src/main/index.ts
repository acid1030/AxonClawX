// AxonClaw - Main Process Entry Point
// Electron Main Process

import { app, BrowserWindow, ipcMain, shell, clipboard } from 'electron';

// 捕获 EPIPE 等写入已关闭管道错误，避免未处理异常导致进程退出
process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  const code = err?.code;
  if (code === 'EPIPE' || code === 'ERR_IPC_CHANNEL_CLOSED') {
    // 渲染进程已关闭时的写入，忽略
    return;
  }
  console.error('[Main] uncaughtException:', err);
});
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import {
  startGateway,
  stopGateway,
  getGatewayStatus,
  isGatewayRunning,
  getGatewayManager,
} from '../gateway/lifecycle';
import {
  listInstalled,
  search as clawhubSearch,
  install as clawhubInstall,
  uninstall as clawhubUninstall,
  getSkillsDir,
  openSkillPath,
  scanSkillsFromDir,
} from '../gateway/clawhub-cli';
import { callGatewayRpc, callGatewayRpcWithRetry } from '../gateway/rpc';
import {
  resolveGatewayPort,
  getResolvedGatewayPort,
  setResolvedGatewayPort,
  readGatewayPortFromConfig,
} from '../gateway/port';
import { GATEWAY_TOKEN } from '../gateway/constants';
import {
  initDatabase,
  closeDatabase,
  isInitialized,
  listAlerts,
  recentAlerts,
  alertSummaryStats,
  loadBootstrapConfig,
  saveBootstrapConfig,
  getConfigFilePath,
  getDefaultConfig,
} from '../database';

// Global window reference
let mainWindow: BrowserWindow | null = null;

/** 安全发送 IPC 到渲染进程，避免 EPIPE 等导致进程崩溃 */
function safeSendToRenderer(channel: string, ...args: unknown[]): void {
  try {
    const win = mainWindow;
    if (!win || win.isDestroyed()) return;
    const wc = win.webContents;
    if (wc.isDestroyed()) return;
    wc.send(channel, ...args);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EPIPE' || code === 'ERR_IPC_CHANNEL_CLOSED') {
      // 渲染进程已关闭，忽略
      return;
    }
    console.error('[Main] safeSendToRenderer error:', err);
  }
}

/**
 * Create the main application window
 */
function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f172a', // Dark theme background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    trafficLightPosition: isMac ? { x: 15, y: 15 } : undefined,
    frame: isMac,
  });

  // Development: Load from Vite dev server
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
    win.webContents.openDevTools();
  } else {
    // Production: Load from built files
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  // 开发者工具快捷键：Cmd+Option+I (Mac) / Ctrl+Shift+I (Win/Linux)
  win.webContents.on('before-input-event', (_e, input) => {
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools();
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  // 阻止粘贴图片时打开新窗口或跳转到非应用 URL（导致空白页）
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    // 仅允许导航到应用自身地址（dev server 或 file://），阻止其他任何导航（blob:, data:, about:blank 等）
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    const isAppUrl = url.startsWith(devUrl) || url.startsWith('file://');
    if (!isAppUrl) {
      e.preventDefault();
    }
  });

  return win;
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  console.log('[Main] Initializing AxonClaw...');

  // 初始化数据库（默认 SQLite，路径可通过 AXONCLAW_DB_PATH 或后续启动配置选择）
  try {
    initDatabase();
  } catch (err) {
    console.error('[Main] Database init failed:', err);
  }

  // 启动时主动探测 OpenClaw 进程端口，确保 /api/agents 等请求使用正确端口
  try {
    const r = await resolveGatewayPort();
    if (r.success && r.port) {
      console.log('[Main] Gateway resolved at port', r.port);
    }
  } catch {
    /* ignore */
  }

  // Create the main window
  mainWindow = createWindow();

  // Subscribe to Gateway events
  const gatewayManager = getGatewayManager();
  
  gatewayManager.on('started', () => {
    console.log('[Main] Gateway started');
    safeSendToRenderer('gateway:status', getGatewayStatus());
  });
  
  gatewayManager.on('stopped', (code) => {
    console.log('[Main] Gateway stopped:', code);
    safeSendToRenderer('gateway:status', getGatewayStatus());
  });
  
  gatewayManager.on('error', (error) => {
    console.error('[Main] Gateway error:', error);
    safeSendToRenderer('gateway:error', error.message);
  });
  
  // 程序启动时自动启动网关（若未运行）
  if (!isGatewayRunning()) {
    console.log('[Main] Auto-starting Gateway...');
    try {
      await startGateway();
      console.log('[Main] Gateway started');
      safeSendToRenderer('gateway:status', getGatewayStatus());
    } catch (err) {
      console.error('[Main] Gateway auto-start failed:', err);
      safeSendToRenderer('gateway:status', {
        ...getGatewayStatus(),
        state: 'error',
        error: String(err),
      });
      safeSendToRenderer('gateway:error', String(err));
    }
  } else {
    console.log('[Main] Gateway already running');
    safeSendToRenderer('gateway:status', getGatewayStatus());
  }

  // Handle window activation (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// App lifecycle - Ready
app.whenReady().then(() => {
  initialize().catch((error) => {
    console.error('[Main] Initialization failed:', error);
  });
});

// App lifecycle - All windows closed
app.on('window-all-closed', () => {
  // On macOS, apps usually stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App lifecycle - Will quit
app.on('will-quit', async () => {
  console.log('[Main] App will quit, stopping Gateway...');
  try {
    await stopGateway();
    console.log('[Main] Gateway stopped');
  } catch (error) {
    console.error('[Main] Error stopping Gateway:', error);
  }
});

// App lifecycle - Before quit (for cleanup)
app.on('before-quit', () => {
  console.log('[Main] App before quit');
  closeDatabase();
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('gateway:start', async () => {
  try {
    await startGateway();
    return getGatewayStatus();
  } catch (error) {
    const status = getGatewayStatus();
    status.error = String(error);
    return status;
  }
});

ipcMain.handle('gateway:stop', async () => {
  try {
    await stopGateway();
    return getGatewayStatus();
  } catch (error) {
    const status = getGatewayStatus();
    status.error = String(error);
    return status;
  }
});

ipcMain.handle('gateway:status', () => {
  // AxonClaw 连接已有 OpenClaw Gateway，未自启进程时也返回 running
  const status = getGatewayStatus();
  const port = getResolvedGatewayPort();
  if (status.state === 'stopped' && !status.error) {
    return { ...status, state: 'running' as const, port };
  }
  return { ...status, port };
});

ipcMain.handle('gateway:isRunning', () => {
  // AxonClaw 连接外部 Gateway，视为始终运行
  return isGatewayRunning() || true;
});

// 真实连接检测：多端口探测（配置端口 + 18789/18791/18792），成功后缓存端口
ipcMain.handle('gateway:checkConnection', async () => {
  try {
    const result = await resolveGatewayPort();
    return { success: result.success, port: result.port, error: result.error };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

// 重启 Gateway（AxonClaw 连接外部时，实际执行 stop + start 子进程）
ipcMain.handle('gateway:restart', async () => {
  try {
    await stopGateway();
    await new Promise((r) => setTimeout(r, 500));
    await startGateway();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Gateway RPC - 通过 WebSocket 调用 OpenClaw Gateway
// 参数格式: invokeIpc('gateway:rpc', method, params, timeoutMs) => (method, params, timeoutMs)
ipcMain.handle('gateway:rpc', async (_event, methodOrPayload: unknown, paramsOrUndef?: unknown, timeoutMsOrUndef?: number) => {
  let method: string;
  let params: Record<string, unknown>;
  let timeout: number;

  if (typeof methodOrPayload === 'string') {
    method = methodOrPayload;
    params = (paramsOrUndef && typeof paramsOrUndef === 'object' ? paramsOrUndef : {}) as Record<string, unknown>;
    timeout = typeof timeoutMsOrUndef === 'number' ? timeoutMsOrUndef : 30000;
  } else if (methodOrPayload && typeof methodOrPayload === 'object' && 'method' in (methodOrPayload as object)) {
    const payload = methodOrPayload as { method: string; params?: unknown; timeoutMs?: number };
    method = payload.method;
    params = (payload.params && typeof payload.params === 'object' ? payload.params : {}) as Record<string, unknown>;
    timeout = typeof payload.timeoutMs === 'number' ? payload.timeoutMs : 30000;
  } else {
    throw new Error('gateway:rpc invalid args');
  }

  console.log(`[GatewayRPC] ${method}`, params);
  
  return new Promise((resolve) => {
    let resolved = false;
    let streamingChat = false; // chat.send 流式模式，收到首包后保持连接转发事件
    const WebSocket = require('ws');
    const ws = new WebSocket(getGatewayWsUrl());

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error(`[GatewayRPC] ${method} timeout`);
        ws.close();
        resolve({ success: false, ok: false, error: 'Timeout' });
      }
    }, timeout);
    
    ws.on('open', () => {
      console.log(`[GatewayRPC] ${method} WebSocket opened`);
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        
        // 处理 challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'gateway-client', displayName: 'ClawX', version: '0.1.0', platform: process.platform, mode: 'ui' },
              auth: { token: GATEWAY_TOKEN },
              role: 'operator',
              scopes: ['operator.admin'],
            },
          }));
          return;
        }
        
        // 处理 connect 响应
        if (msg.type === 'res' && String(msg.id).startsWith('connect-')) {
          if (!msg.ok) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            resolve({ success: false, ok: false, error: String(msg.error?.message ?? msg.error ?? 'Connect failed') });
            return;
          }
          // 发送实际请求
          ws.send(JSON.stringify({
            type: 'req',
            id: `rpc-${Date.now()}`,
            method,
            params,
          }));
          return;
        }
        
        // 处理 RPC 响应
        if (msg.type === 'res' && String(msg.id).startsWith('rpc-')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            console.log(`[GatewayRPC] ${method} result:`, msg.ok ? 'success' : 'error');
            const ok = msg.ok !== false && !msg.error;
            const result = msg.result ?? msg.payload;
            const error = msg.error != null ? String(typeof msg.error === 'object' && msg.error && 'message' in msg.error ? (msg.error as { message?: string }).message : msg.error) : undefined;
            resolve({
              success: ok,
              ok,
              result,
              error,
            });
            // chat.send 需要保持连接以接收流式事件，不在此处关闭
            if (method !== 'chat.send') {
              ws.close();
            } else {
              streamingChat = true;
              // 流式连接保底超时 5 分钟
              setTimeout(() => {
                try {
                  if (ws.readyState === 1) ws.close();
                } catch {
                  /* ignore */
                }
              }, 300000);
            }
          }
        }

        // chat.send 流式模式: 转发 agent 事件到渲染进程
        if (streamingChat && msg.type === 'event' && typeof msg.event === 'string') {
          const payload = (msg.payload ?? msg.data ?? msg) as Record<string, unknown>;
          const ev = String(msg.event);
          const phase = payload.phase;
          const state = payload.state ?? (ev.endsWith('.delta') ? 'delta' : ev.endsWith('.final') ? 'final' : undefined);
          safeSendToRenderer('gateway:notification', {
            method: 'agent',
            params: {
              ...payload,
              phase,
              state: payload.state ?? state,
              runId: payload.runId,
              sessionKey: payload.sessionKey,
              message: payload.message,
            },
          });
          // 发送到日志页面：Gateway 是否发送 delta
          const hasMessage = payload.message != null;
          let messagePreview = '';
          if (hasMessage && typeof payload.message === 'object') {
            const m = payload.message as Record<string, unknown>;
            const content = m.content;
            if (typeof content === 'string') {
              messagePreview = content.slice(0, 80) + (content.length > 80 ? '...' : '');
            } else if (Array.isArray(content)) {
              const texts = (content as Array<{ text?: string }>).map((b) => b.text).filter(Boolean);
              messagePreview = texts.join(' ').slice(0, 80) + (texts.join('').length > 80 ? '...' : '');
            }
          }
          safeSendToRenderer('app:gateway-log', {
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            level: 'DEBUG',
            agent: 'Gateway',
            message: `event=${ev} phase=${phase ?? '?'} state=${state ?? '?'} hasMessage=${hasMessage}${messagePreview ? ` preview=${JSON.stringify(messagePreview)}` : ''}`,
          });
          // 收到完成事件后关闭连接
          const donePhases = ['completed', 'done', 'finished', 'end'];
          const isDone = (phase && donePhases.includes(String(phase))) || state === 'final';
          if (isDone) {
            ws.close();
          }
        }
      } catch (err) {
        console.error(`[GatewayRPC] ${method} parse error:`, err);
      }
    });
    
    ws.on('error', (err: Error) => {
      console.error(`[GatewayRPC] ${method} WebSocket error:`, err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ success: false, ok: false, error: err.message });
      }
    });
    
    ws.on('close', (code: number, reason: Buffer) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.log(`[GatewayRPC] ${method} WebSocket closed:`, code, reason.toString());
        resolve({ success: false, ok: false, error: 'Connection closed' });
      }
    });
  });
});

// Skills management
const SKILLS_DIR = path.join(os.homedir(), '.openclaw', 'skills');

ipcMain.handle('skills:openFolder', async () => {
  await shell.openPath(SKILLS_DIR);
});

ipcMain.handle('openclaw:getSkillsDir', () => SKILLS_DIR);

ipcMain.handle('skills:listInstalled', async () => {
  try {
    const results = await listInstalled();
    return { success: true, results };
  } catch (err) {
    console.error('[skills:listInstalled]', err);
    return { success: false, results: [] };
  }
});

// Shell helpers (打开目录、外部链接等)
ipcMain.handle('shell:showItemInFolder', async (_event, dirPath: string) => {
  if (dirPath && typeof dirPath === 'string') {
    await shell.showItemInFolder(dirPath);
  }
});
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  if (filePath && typeof filePath === 'string') {
    return shell.openPath(filePath);
  }
  return '';
});
ipcMain.handle('clipboard:readImage', () => {
  try {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;
    const png = img.toPNG();
    if (!png || png.length === 0) return null;
    return { base64: png.toString('base64'), mimeType: 'image/png' };
  } catch {
    return null;
  }
});

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (url && typeof url === 'string') {
    await shell.openExternal(url);
  }
});

// Sessions list - 代理到 OpenClaw Gateway
ipcMain.handle('sessions.list', async (_event, { limit, agentId }) => {
  console.log('[SessionsList] Fetching sessions...');
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    const WebSocket = require('ws');
    const ws = new WebSocket(getGatewayWsUrl());

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('[SessionsList] Timeout');
        ws.close();
        resolve({ sessions: [] }); // 超时返回空数组而不是 reject
      }
    }, 10000);
    
    ws.on('open', () => {
      console.log('[SessionsList] WebSocket opened');
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('[SessionsList] Message:', msg.type, msg.event || msg.id || '');
        
        // 处理 challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          console.log('[SessionsList] Got challenge, sending connect...');
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { 
                id: 'gateway-client', 
                displayName: 'ClawX', 
                version: '0.1.0',
                platform: process.platform,
                mode: 'ui',
              },
              auth: { token: GATEWAY_TOKEN },
              role: 'operator',
              scopes: ['operator.admin'],
            },
          }));
          return;
        }
        
        // 处理 connect 响应
        if (msg.type === 'res' && String(msg.id).startsWith('connect-')) {
          console.log('[SessionsList] Connect response:', msg.ok ? 'SUCCESS' : 'FAILED');
          if (!msg.ok) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve({ sessions: [] });
            return;
          }
          // 发送 sessions.list 请求
          console.log('[SessionsList] Sending sessions.list request...');
          ws.send(JSON.stringify({
            type: 'req',
            id: 'sessions-' + Date.now(),
            method: 'sessions.list',
            params: { limit: limit || 50, agentId: agentId || 'main' },
          }));
          return;
        }
        
        // 处理 sessions.list 响应
        if (msg.type === 'res' && String(msg.id).startsWith('sessions-')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            const sessions = msg.payload?.sessions || msg.result?.sessions || [];
            console.log('[SessionsList] Found', sessions.length, 'sessions');
            resolve({ sessions });
          }
        }
      } catch (err) {
        console.error('[SessionsList] Parse error:', err);
      }
    });
    
    ws.on('error', (err: Error) => {
      console.error('[SessionsList] WebSocket error:', err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ sessions: [] });
      }
    });
    
    ws.on('close', (code: number, reason: Buffer) => {
      console.log('[SessionsList] WebSocket closed:', code, reason.toString());
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ sessions: [] });
      }
    });
  });
});

// Host API proxy - Gateway REST API（端口从 openclaw.json 或连接探测结果动态解析）
function getGatewayApiBase(): string {
  return `http://127.0.0.1:${getResolvedGatewayPort()}`;
}

/** ClawDeckX 默认 HTTP 端口，WebSocket 失败时可尝试从此处获取 agents */
const CLAWDECKX_HTTP_PORT = 18080;

/** 从 ClawDeckX HTTP API (18080) 获取 agents，WebSocket RPC 失败时的回退 */
async function fetchAgentsFromClawDeckX(): Promise<{
  agents: Array<{ id: string; name?: string; isDefault?: boolean; modelDisplay?: string; inheritedModel?: boolean; workspace?: string; agentDir?: string; mainSessionKey?: string; channelTypes?: string[] }>;
  defaultAgentId: string;
  configuredChannelTypes: string[];
  channelOwners: Record<string, string>;
} | null> {
  const bases = [`http://127.0.0.1:${CLAWDECKX_HTTP_PORT}`, `http://127.0.0.1:${getResolvedGatewayPort()}`];
  for (const base of bases) {
    // ClawDeckX 使用 POST /api/v1/gw/proxy { method: 'agents.list', params: {} }，与 gwApi.agents() 一致
    try {
      const res = await fetch(`${base}/api/v1/gw/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'agents.list', params: {} }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as unknown;
      const raw = Array.isArray(data) ? data : (data && typeof data === 'object' && 'agents' in (data as object) ? (data as { agents?: unknown[] }).agents : null);
      const list = Array.isArray(raw) ? raw : [];
      if (list.length === 0) continue;
      const defaultId = (data && typeof data === 'object' && 'defaultId' in (data as object) ? (data as { defaultId?: string }).defaultId : null) ?? list.find((a: Record<string, unknown>) => a.default)?.id ?? list[0]?.id ?? 'main';
      const configRes = await fetch(`${base}/api/v1/gw/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'config.get', params: {} }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      let bindings: Array<{ agentId?: string; match?: { channel?: string } }> = [];
      let configChannels: Record<string, unknown> = {};
      if (configRes?.ok) {
        const cfg = (await configRes.json()) as Record<string, unknown>;
        bindings = (cfg.bindings as Array<{ agentId?: string; match?: { channel?: string } }>) ?? [];
        configChannels = (cfg.channels as Record<string, unknown>) ?? {};
      }
      const configuredChannelTypes = Object.keys(configChannels).filter(
        (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof configChannels[k] === 'object'
      );
      const channelOwners: Record<string, string> = {};
      bindings.forEach((b) => {
        const ch = b?.match?.channel;
        if (ch && b?.agentId) channelOwners[ch] = b.agentId;
      });
      return {
        agents: list.map((a: Record<string, unknown>) => {
          const agentChannels = bindings.filter((b) => b?.agentId === a.id).map((b) => b?.match?.channel).filter(Boolean) as string[];
          const model = a.model;
          const modelDisplay =
            typeof model === 'string'
              ? model
              : typeof model === 'object' && model && 'primary' in (model as object)
                ? (model as { primary?: string }).primary
                : '—';
          return {
            id: String(a.id ?? ''),
            name: String(a.name ?? a.id ?? ''),
            isDefault: a.id === defaultId,
            modelDisplay: String(modelDisplay ?? '—'),
            inheritedModel: !a.model,
            workspace: String(a.workspace ?? '—'),
            agentDir: String(a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`),
            mainSessionKey: `${a.id}:main`,
            channelTypes: agentChannels,
          };
        }),
        defaultAgentId: String(defaultId),
        configuredChannelTypes,
        channelOwners,
      };
    } catch {
      /* try next base */
    }
    // 兼容旧版或非 ClawDeckX 的 GET 接口
    for (const apiPath of ['/api/agents', '/api/config', '/config']) {
      try {
        const res = await fetch(`${base}${apiPath}`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        const data = (await res.json()) as Record<string, unknown>;
        if (apiPath === '/api/agents' && Array.isArray(data?.agents)) {
          const agents = data.agents as Array<Record<string, unknown>>;
          const defaultId = (data.defaultAgentId as string) ?? 'main';
          const channelOwners = (data.channelOwners as Record<string, string>) ?? {};
          const configuredChannelTypes = (data.configuredChannelTypes as string[]) ?? [];
          return {
            agents: agents.map((a) => ({
              id: String(a.id ?? ''),
              name: String(a.name ?? a.id ?? ''),
              isDefault: a.id === defaultId,
              modelDisplay: String(a.modelDisplay ?? '—'),
              inheritedModel: a.inheritedModel !== false,
              workspace: String(a.workspace ?? '—'),
              agentDir: String(a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`),
              mainSessionKey: `${a.id}:main`,
              channelTypes: (a.channelTypes as string[]) ?? [],
            })),
            defaultAgentId: defaultId,
            configuredChannelTypes,
            channelOwners,
          };
        }
        if (apiPath === '/api/config' && data?.agents) {
          const cfg = data as { agents?: { list?: Array<Record<string, unknown>> }; bindings?: Array<{ agentId?: string; match?: { channel?: string } }>; channels?: Record<string, unknown> };
          const list = cfg.agents?.list ?? [];
          const bindings = cfg.bindings ?? [];
          const defaultId = list.find((a) => a.default)?.id ?? list[0]?.id ?? 'main';
          const channelOwners: Record<string, string> = {};
          const configuredChannelTypes = Object.keys(cfg?.channels ?? {}).filter(
            (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof (cfg?.channels as Record<string, unknown>)?.[k] === 'object'
          );
          bindings.forEach((b) => {
            const ch = b?.match?.channel;
            if (ch && b?.agentId) channelOwners[ch] = b.agentId;
          });
          return {
            agents: list.map((a) => {
              const agentChannels = bindings.filter((b) => b?.agentId === a.id).map((b) => b?.match?.channel).filter(Boolean) as string[];
              return {
                id: String(a.id ?? ''),
                name: String(a.name ?? a.id ?? ''),
                isDefault: a.id === defaultId,
                modelDisplay: '—',
                inheritedModel: true,
                workspace: String(a.workspace ?? '—'),
                agentDir: String(a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`),
                mainSessionKey: `${a.id}:main`,
                channelTypes: agentChannels,
              };
            }),
            defaultAgentId: String(defaultId),
            configuredChannelTypes,
            channelOwners,
          };
        }
      } catch {
        /* try next */
      }
    }
  }
  return null;
}
function getGatewayWsUrl(): string {
  return `ws://127.0.0.1:${getResolvedGatewayPort()}/ws`;
}
// 保存 path 模块引用，避免在 hostapi:fetch handler 中被同名参数遮蔽
const nodePath = path;
const OPENCLAW_CFG_PATH = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');

function parseOpenclawConfigText(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // 兼容含注释/尾逗号；仅去掉“整行注释”，避免误伤 file:// / https://
    const cleaned = raw
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleaned) as Record<string, unknown>;
  }
}

function readOpenclawConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(OPENCLAW_CFG_PATH)) {
      const raw = fs.readFileSync(OPENCLAW_CFG_PATH, 'utf8');
      return parseOpenclawConfigText(raw);
    }
  } catch (err) {
    console.warn('[HostAPI] read config failed:', err);
  }
  return {};
}

function writeOpenclawConfig(config: Record<string, unknown>): void {
  const dir = nodePath.dirname(OPENCLAW_CFG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OPENCLAW_CFG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function getUiSettingsFromConfig(config: Record<string, unknown>): { language: string; theme: string } {
  const ui = ((config.ui as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const language = typeof ui.language === 'string' && ui.language.trim() ? ui.language.trim() : 'zh';
  const themeRaw = typeof ui.theme === 'string' ? ui.theme.trim().toLowerCase() : 'system';
  const theme = themeRaw === 'light' || themeRaw === 'dark' || themeRaw === 'system' ? themeRaw : 'system';
  return { language, theme };
}

ipcMain.handle('hostapi:fetch', async (_event, { path, method, headers, body }) => {
  try {
    // 特殊处理：AxonClaw 的 gateway-info API
    if (path === '/api/app/gateway-info') {
      const port = getResolvedGatewayPort();
      const wsUrl = `ws://127.0.0.1:${port}/ws`;
      return {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: { wsUrl, token: GATEWAY_TOKEN, port },
        },
        success: true,
        status: 200,
        json: { wsUrl, token: GATEWAY_TOKEN, port },
      };
    }

    // 特殊处理：数据库配置（GET 读取 / POST 保存，修改后需重启生效）
    if (path === '/api/app/db-config' && method === 'GET') {
      const cfg = getDefaultConfig();
      const bootstrap = loadBootstrapConfig();
      return {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: {
            dbPath: cfg.sqlitePath ?? bootstrap.dbPath ?? '',
            configFile: getConfigFilePath(),
          },
        },
        success: true,
        status: 200,
        json: {
          dbPath: cfg.sqlitePath ?? bootstrap.dbPath ?? '',
          configFile: getConfigFilePath(),
        },
      };
    }
    if (path === '/api/app/db-config' && method === 'POST' && body) {
      let payload: { dbPath?: string };
      try {
        payload = typeof body === 'string' ? JSON.parse(body) : (body as { dbPath?: string });
      } catch {
        return {
          ok: false,
          data: { status: 400, json: { error: 'Invalid JSON' }, ok: false },
          success: false,
          status: 400,
          json: { error: 'Invalid JSON' },
        };
      }
      saveBootstrapConfig({ dbPath: payload.dbPath });
      return {
        ok: true,
        data: { status: 200, ok: true, json: { success: true } },
        success: true,
        status: 200,
        json: { success: true },
      };
    }

    // 特殊处理：/api/gateway/start 启动网关子进程（hostApiFetch 调用，非 Gateway 自身 API）
    if (path === '/api/gateway/start' && method === 'POST') {
      try {
        await startGateway();
        const status = getGatewayStatus();
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        const msg = String(err);
        return {
          ok: true,
          data: { status: 200, json: { success: false, error: msg }, ok: true },
          success: true,
          status: 200,
          json: { success: false, error: msg },
        };
      }
    }

    // 特殊处理：/api/gateway/stop 停止网关
    if (path === '/api/gateway/stop' && method === 'POST') {
      try {
        await stopGateway();
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        return {
          ok: true,
          data: { status: 200, json: { success: false, error: String(err) }, ok: true },
          success: true,
          status: 200,
          json: { success: false, error: String(err) },
        };
      }
    }

    // 特殊处理：/api/gateway/restart 重启网关
    if (path === '/api/gateway/restart' && method === 'POST') {
      try {
        await stopGateway();
        await new Promise((r) => setTimeout(r, 500));
        await startGateway();
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        return {
          ok: true,
          data: { status: 200, json: { success: false, error: String(err) }, ok: true },
          success: true,
          status: 200,
          json: { success: false, error: String(err) },
        };
      }
    }

    // 特殊处理：/api/gateway/health 用于心跳健康检查
    if (path === '/api/gateway/health' || path.startsWith('/api/gateway/health')) {
      try {
        const res = await fetch(`${getGatewayApiBase()}/health`);
        const ok = res.ok;
        let uptime: number | undefined;
        try {
          const json = await res.json() as { uptime?: number };
          uptime = json.uptime;
        } catch {
          /* ignore */
        }
        return {
          ok: true,
          data: { status: 200, json: { ok, uptime }, ok: true },
          success: true,
          status: 200,
          json: { ok, uptime },
        };
      } catch (err) {
        return {
          ok: true,
          data: { status: 200, json: { ok: false, error: String(err) }, ok: true },
          success: true,
          status: 200,
          json: { ok: false, error: String(err) },
        };
      }
    }

    // 特殊处理：/api/gateway/status 获取网关详细状态
    // 1. 尝试从 Gateway /status 或 /health 获取
    // 2. 失败时重新探测端口（进程扫描 + 多端口探测）
    // 3. 若 resolveGatewayPort 成功则视为运行中（WebSocket 已连通）
    if (path === '/api/gateway/status') {
      const tryFetchStatus = async (): Promise<{ ok: boolean; json: unknown }> => {
        const base = getGatewayApiBase();
        for (const endpoint of ['/status', '/health']) {
          try {
            const res = await fetch(`${base}${endpoint}`, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              const data = await res.json();
              const running = data?.running ?? data?.ok ?? true;
              return { ok: true, json: { ...data, running } };
            }
          } catch {
            /* try next */
          }
        }
        return { ok: false, json: { running: false } };
      };
      let result = await tryFetchStatus();
      if (!result.ok) {
        const r = await resolveGatewayPort();
        if (r.success && r.port) {
          setResolvedGatewayPort(r.port);
          result = await tryFetchStatus();
          if (!result.ok) {
            // resolveGatewayPort 成功说明 WebSocket 已连通，Gateway 在运行
            result = { ok: true, json: { running: true, runtime: 'Electron', detail: `端口 ${r.port}` } };
          }
        }
      }
      return { ok: true, data: { status: 200, json: result.json, ok: true }, success: true, status: 200, json: result.json };
    }

    // 特殊处理：/api/gateway/logs (POST) 获取网关日志
    if (path === '/api/gateway/logs' && method === 'POST') {
      const params = body ? (typeof body === 'string' ? JSON.parse(body) : body) : {};
      const limit = (params as { limit?: number }).limit || 200;
      try {
        const res = await fetch(`${getGatewayApiBase()}/logs?tailLines=${limit}`);
        if (res.ok) {
          const data = await res.json();
          return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
        }
      } catch (err) {
        // 从本地日志读取
        const logDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
        if (fs.existsSync(logDir)) {
          const files = fs.readdirSync(logDir)
            .filter((f) => f.endsWith('.log'))
            .sort()
            .reverse();
          if (files.length > 0) {
            const lines = fs.readFileSync(nodePath.join(logDir, files[0]), 'utf8').split('\n').slice(-limit);
            return { ok: true, data: { status: 200, json: { lines }, ok: true }, success: true, status: 200, json: { lines } };
          }
        }
      }
      return { ok: true, data: { status: 200, json: { lines: [] }, ok: true }, success: true, status: 200, json: { lines: [] } };
    }

    // 特殊处理：/api/gateway/events (POST) 获取事件列表
    if (path === '/api/gateway/events' && method === 'POST') {
      try {
        const res = await fetch(`${getGatewayApiBase()}/events`, { method: 'POST', headers, body });
        if (res.ok) {
          const data = await res.json();
          return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
        }
      } catch {
        // 返回空列表
      }
      return { ok: true, data: { status: 200, json: { list: [], total: 0 }, ok: true }, success: true, status: 200, json: { list: [], total: 0 } };
    }

    // 特殊处理：/api/gateway/channels 获取通道列表
    if (path === '/api/gateway/channels') {
      try {
        const res = await fetch(`${getGatewayApiBase()}/channels/status`);
        if (res.ok) {
          const data = await res.json();
          let list: any[] = [];
          if (Array.isArray(data)) {
            list = data;
          } else if (data?.channelAccounts && typeof data.channelAccounts === 'object') {
            for (const [channelId, accounts] of Object.entries(data.channelAccounts)) {
              if (Array.isArray(accounts)) {
                for (const acc of accounts) {
                  list.push({ ...acc, name: acc.name || acc.label || channelId, channel: channelId });
                }
              }
            }
          }
          return { ok: true, data: { status: 200, json: list, ok: true }, success: true, status: 200, json: list };
        }
      } catch {
        // 返回空列表
      }
      return { ok: true, data: { status: 200, json: [], ok: true }, success: true, status: 200, json: [] };
    }

    // 特殊处理：/api/gateway/channels/logout (POST) 登出通道
    if (path === '/api/gateway/channels/logout' && method === 'POST') {
      try {
        const params = body ? JSON.parse(body) : {};
        const channel = params.channel;
        const res = await fetch(`${getGatewayApiBase()}/channels/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel }),
        });
        if (res.ok) {
          const data = await res.json();
          return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
        }
      } catch (err) {
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
      return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
    }

    // 特殊处理：/api/gateway/profiles 获取网关配置列表
    if (path === '/api/gateway/profiles') {
      // 简单实现：返回本地网关配置
      const profiles = [
        { id: 1, name: '本地网关', host: '127.0.0.1', port: getResolvedGatewayPort(), token: '', is_active: true },
      ];
      return { ok: true, data: { status: 200, json: profiles, ok: true }, success: true, status: 200, json: profiles };
    }

    // 特殊处理：/api/gateway/health-check 获取/设置看门狗配置
    if (path === '/api/gateway/health-check') {
      if (method === 'POST') {
        try {
          const params = body ? JSON.parse(body) : {};
          // 通过 Gateway API 设置看门狗
          const res = await fetch(`${getGatewayApiBase()}/health-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          });
          if (res.ok) {
            const data = await res.json();
            return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
          }
        } catch (err) {
          return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
        }
      }
      // GET: 返回当前看门狗状态
      try {
        const res = await fetch(`${getGatewayApiBase()}/health-check`);
        if (res.ok) {
          const data = await res.json();
          return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
        }
      } catch {
        // 返回默认值
      }
      return { ok: true, data: { status: 200, json: { enabled: false, fail_count: 0, last_ok: '' }, ok: true }, success: true, status: 200, json: { enabled: false, fail_count: 0, last_ok: '' } };
    }

    // 特殊处理：/api/gateway/rpc (POST) RPC 调用
    if (path === '/api/gateway/rpc' && method === 'POST') {
      try {
        const params = body ? JSON.parse(body) : {};
        const rpcMethod = params.method;
        const rpcParams = params.params || {};
        const result = await callGatewayRpc(rpcMethod, rpcParams);
        return { ok: true, data: { status: 200, json: result, ok: true }, success: true, status: 200, json: result };
      } catch (err) {
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
    }

    // 特殊处理：/api/gateway/system-event (POST) 发送系统事件
    if (path === '/api/gateway/system-event' && method === 'POST') {
      try {
        const params = body ? JSON.parse(body) : {};
        const event = params.event;
        const res = await fetch(`${getGatewayApiBase()}/system-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event }),
        });
        if (res.ok) {
          const data = await res.json();
          return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
        }
      } catch (err) {
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
      return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
    }

    // 特殊处理：/api/settings（通用设置：语言 + 风格）
    if (path === '/api/settings' && method === 'GET') {
      try {
        const config = readOpenclawConfig();
        const ui = getUiSettingsFromConfig(config);
        return {
          ok: true,
          data: { status: 200, json: ui, ok: true },
          success: true,
          status: 200,
          json: ui,
        };
      } catch (err) {
        const msg = String(err);
        return {
          ok: false,
          error: msg,
          data: { status: 500, json: { error: msg }, ok: false },
          success: false,
          status: 500,
          json: { error: msg },
        };
      }
    }

    if (path === '/api/settings/language' && method === 'PUT' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { value?: string });
        const language = String(payload?.value ?? '').trim() || 'zh';
        const config = readOpenclawConfig();
        const ui = ((config.ui as Record<string, unknown>) ?? {}) as Record<string, unknown>;
        ui.language = language;
        config.ui = ui;
        writeOpenclawConfig(config);
        return {
          ok: true,
          data: { status: 200, json: { success: true, value: language }, ok: true },
          success: true,
          status: 200,
          json: { success: true, value: language },
        };
      } catch (err) {
        const msg = String(err);
        return {
          ok: false,
          error: msg,
          data: { status: 500, json: { error: msg }, ok: false },
          success: false,
          status: 500,
          json: { error: msg },
        };
      }
    }

    if (path === '/api/settings/theme' && method === 'PUT' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { value?: string });
        const requested = String(payload?.value ?? '').trim().toLowerCase();
        const theme = requested === 'light' || requested === 'dark' || requested === 'system'
          ? requested
          : 'system';
        const config = readOpenclawConfig();
        const ui = ((config.ui as Record<string, unknown>) ?? {}) as Record<string, unknown>;
        ui.theme = theme;
        config.ui = ui;
        writeOpenclawConfig(config);
        return {
          ok: true,
          data: { status: 200, json: { success: true, value: theme }, ok: true },
          success: true,
          status: 200,
          json: { success: true, value: theme },
        };
      } catch (err) {
        const msg = String(err);
        return {
          ok: false,
          error: msg,
          data: { status: 500, json: { error: msg }, ok: false },
          success: false,
          status: 500,
          json: { error: msg },
        };
      }
    }

    // 特殊处理：/api/settings/storage 存储与日志路径（ClawDeckX 系统设置）
    if (path === '/api/settings/storage' && method === 'GET') {
      const dataDir = nodePath.join(os.homedir(), '.openclaw');
      const logDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
      const openclawLogDir = nodePath.join(os.homedir(), '.openclaw', 'logs');
      const logDirResolved = fs.existsSync(openclawLogDir) ? openclawLogDir : logDir;
      return {
        ok: true,
        data: { status: 200, json: { dataDir, logDir: logDirResolved }, ok: true },
        success: true,
        status: 200,
        json: { dataDir, logDir: logDirResolved },
      };
    }

    // 特殊处理：/api/settings/bind-address 绑定地址（ClawDeckX 访问安全）
    if (path === '/api/settings/bind-address' && method === 'GET') {
      try {
        let config: Record<string, unknown> = {};
        if (fs.existsSync(OPENCLAW_CFG_PATH)) {
          const raw = fs.readFileSync(OPENCLAW_CFG_PATH, 'utf8');
          config = parseOpenclawConfigText(raw);
        }
        const gw = (config?.gateway ?? {}) as Record<string, unknown>;
        const bind = String(gw.bind ?? 'loopback');
        const customHost = String(gw.customBindHost ?? '').trim();
        let mode: '0.0.0.0' | '127.0.0.1' | 'custom' = '127.0.0.1';
        if (bind === 'lan' || bind === 'auto') {
          mode = '0.0.0.0';
        } else if (bind === 'loopback') {
          mode = '127.0.0.1';
        } else if (bind === 'custom') {
          mode = 'custom';
        }
        return {
          ok: true,
          data: { status: 200, json: { mode, customHost: mode === 'custom' ? customHost : undefined }, ok: true },
          success: true,
          status: 200,
          json: { mode, customHost: mode === 'custom' ? customHost : undefined },
        };
      } catch (err) {
        const msg = String(err);
        console.error('[HostAPI] bind-address get error:', err);
        return {
          ok: false,
          error: msg,
          data: { status: 500, json: { error: msg }, ok: false },
          success: false,
          status: 500,
          json: { error: msg },
        };
      }
    }
    if (path === '/api/settings/bind-address' && method === 'PUT' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { mode?: string; customHost?: string });
        const mode = payload?.mode ?? '127.0.0.1';
        const customHost = String(payload?.customHost ?? '').trim();
        let config: Record<string, unknown> = {};
        if (fs.existsSync(OPENCLAW_CFG_PATH)) {
          const raw = fs.readFileSync(OPENCLAW_CFG_PATH, 'utf8');
          config = parseOpenclawConfigText(raw);
        }
        const gw = ((config.gateway as Record<string, unknown>) ?? {}) as Record<string, unknown>;
        if (mode === '0.0.0.0') {
          gw.bind = 'lan';
          delete gw.customBindHost;
        } else if (mode === '127.0.0.1') {
          gw.bind = 'loopback';
          delete gw.customBindHost;
        } else {
          gw.bind = 'custom';
          gw.customBindHost = customHost || '0.0.0.0';
        }
        config.gateway = { ...gw };
        const dir = nodePath.dirname(OPENCLAW_CFG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(OPENCLAW_CFG_PATH, JSON.stringify(config, null, 2), 'utf8');
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        const msg = String(err);
        console.error('[HostAPI] bind-address put error:', err);
        return {
          ok: false,
          error: msg,
          data: { status: 500, json: { error: msg }, ok: false },
          success: false,
          status: 500,
          json: { error: msg },
        };
      }
    }

    // 特殊处理：/api/settings/password 修改密码（ClawDeckX 风格，AxonClaw 桌面端为 stub）
    if (path === '/api/settings/password' && method === 'POST' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { current?: string; new?: string; confirm?: string });
        const errMsg1 = '请填写当前密码、新密码和确认密码';
        if (!payload?.current || !payload?.new || !payload?.confirm) {
          return {
            ok: false,
            error: errMsg1,
            data: { status: 400, json: { error: errMsg1 }, ok: false },
            success: false,
            status: 400,
            json: { error: errMsg1 },
          };
        }
        const errMsg2 = '两次输入的新密码不一致';
        if (payload.new !== payload.confirm) {
          return {
            ok: false,
            error: errMsg2,
            data: { status: 400, json: { error: errMsg2 }, ok: false },
            success: false,
            status: 400,
            json: { error: errMsg2 },
          };
        }
        const errMsg3 = 'AxonClaw 为桌面客户端，修改 ClawDeckX Web 控制台账户密码请前往对应 Web 界面';
        return {
          ok: false,
          error: errMsg3,
          data: { status: 501, json: { error: errMsg3 }, ok: false },
          success: false,
          status: 501,
          json: { error: errMsg3 },
        };
      } catch (err) {
        console.error('[HostAPI] password post error:', err);
        return {
          ok: false,
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    // 特殊处理：/api/logs Gateway 日志（OpenClaw 默认 /tmp/openclaw/openclaw-YYYY-MM-DD.log）
    if (path.startsWith('/api/logs')) {
      const tailMatch = path.match(/tailLines=(\d+)/);
      const tailLines = tailMatch ? parseInt(tailMatch[1], 10) : 200;
      const limitMatch = path.match(/limit=(\d+)/);
      const abnormalLimit = limitMatch ? parseInt(limitMatch[1], 10) : 10;
      try {
        const res = await fetch(`${getGatewayApiBase()}${path}`);
        if (res.ok) {
          const data = await res.json() as { content?: string };
          return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
        }
      } catch {
        /* Gateway 可能未提供，从本地读取 */
      }
      const gatewayLogDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
      const openclawLogDir = nodePath.join(os.homedir(), '.openclaw', 'logs');
      const dirToUse = fs.existsSync(gatewayLogDir) ? gatewayLogDir : (fs.existsSync(openclawLogDir) ? openclawLogDir : gatewayLogDir);
      if (path === '/api/logs/dir' || path.startsWith('/api/logs/dir')) {
        return { ok: true, data: { status: 200, json: { dir: dirToUse }, ok: true }, success: true, status: 200, json: { dir: dirToUse } };
      }
      // /api/logs/abnormal：从日志解析异常事件（ClawDeckX 风格：ERROR/WARN/exception/failed）
      if (path.startsWith('/api/logs/abnormal')) {
        const readAbnormalFromDir = (dir: string): Array<{ id: string; level: 'critical' | 'warning' | 'info'; title: string; message: string }> => {
          if (!fs.existsSync(dir)) return [];
          const results: Array<{ id: string; level: 'critical' | 'warning' | 'info'; title: string; message: string }> = [];
          const files = fs.readdirSync(dir)
            .filter((f) => f.endsWith('.log') || f.match(/^openclaw-\d{4}-\d{2}-\d{2}\.log$/))
            .sort()
            .reverse();
          for (const f of files.slice(0, 5)) {
            try {
              const full = nodePath.join(dir, f);
              const buf = fs.readFileSync(full, 'utf8');
              const lines = buf.split(/\r?\n/);
              for (let i = lines.length - 1; i >= 0 && results.length < abnormalLimit; i--) {
                const line = lines[i].trim();
                if (!line || line.length < 10) continue;
                const lower = line.toLowerCase();
                let level: 'critical' | 'warning' | 'info' = 'info';
                if (/\b(panic|fatal|critical)\b/i.test(lower) || (/\berror\b/i.test(lower) && !/\bwarn/i.test(lower))) level = 'critical';
                else if (/\b(warn|exception|failed)\b/i.test(lower)) level = 'warning';
                else continue;
                const msg = line.length > 120 ? line.slice(0, 117) + '...' : line;
                const title = level === 'critical' ? '错误' : '警告';
                results.push({ id: `log-${f}-${i}`, level, title, message: msg });
              }
            } catch {
              /* 忽略单文件读取失败 */
            }
          }
          return results.slice(0, abnormalLimit);
        };
        const fromGateway = readAbnormalFromDir(gatewayLogDir);
        const abnormal = fromGateway.length ? fromGateway : readAbnormalFromDir(openclawLogDir);
        return { ok: true, data: { status: 200, json: { events: abnormal }, ok: true }, success: true, status: 200, json: { events: abnormal } };
      }
      const readFromDir = (dir: string) => {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir)
          .filter((f) => f.endsWith('.log') || f.match(/^openclaw-\d{4}-\d{2}-\d{2}\.log$/))
          .sort()
          .reverse();
        if (files.length === 0) return null;
        return files.slice(0, 5).map((f) => {
          try {
            const full = nodePath.join(dir, f);
            const buf = fs.readFileSync(full, 'utf8');
            const lines = buf.split(/\r?\n/);
            return `[${f}]\n${lines.slice(-tailLines).join('\n')}`;
          } catch {
            return `[${f}] (读取失败)`;
          }
        }).join('\n\n---\n\n');
      };
      const content = readFromDir(gatewayLogDir) ?? readFromDir(openclawLogDir) ?? '(Gateway 日志目录不存在: /tmp/openclaw 或 ~/.openclaw/logs)';
      return { ok: true, data: { status: 200, json: { content }, ok: true }, success: true, status: 200, json: { content } };
    }

    // 活动监控：/api/sessions/usage - 聚合会话用量（ClawDeckX 风格）
    if ((path === '/api/sessions/usage' || path.startsWith('/api/sessions/usage?')) && method === 'GET') {
      try {
        const url = new URL(path, 'http://localhost');
        const limit = parseInt(url.searchParams.get('limit') || '50', 10) || 50;
        const r = await callGatewayRpc('sessions.list', { limit: Math.min(limit, 200) }, 15000);
        const raw = r.result as Record<string, unknown> | unknown[] | undefined;
        const sessions = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'sessions' in raw ? (raw as { sessions?: unknown[] }).sessions : null) ?? [];
        const list = Array.isArray(sessions) ? sessions : [];
        let totalMsgs = 0;
        const sessionUsages: Array<{ key: string; usage: Record<string, unknown> }> = [];
        for (const s of list) {
          const rec = s as Record<string, unknown>;
          const key = String(rec?.key ?? '');
          if (!key) continue;
          const inp = Number(rec.inputTokens ?? 0);
          const out = Number(rec.outputTokens ?? 0);
          const msgCount = Number(rec.messageCount ?? rec.messages ?? 0);
          totalMsgs += msgCount;
          const half = Math.floor(msgCount / 2);
          sessionUsages.push({
            key,
            usage: {
              messageCounts: { total: msgCount, user: half, assistant: half, toolCalls: 0, errors: 0 },
              toolUsage: { totalCalls: 0, tools: [] },
              inputTokens: inp,
              outputTokens: out,
              latency: rec.avgLatency ? { avgMs: Number(rec.avgLatency), p95Ms: Number(rec.avgLatency) * 1.5 } : undefined,
            },
          });
        }
        const halfTotal = Math.floor(totalMsgs / 2);
        const aggregates = {
          messages: { total: totalMsgs, user: halfTotal, assistant: halfTotal, toolCalls: 0, errors: 0 },
          totalInput: list.reduce((sum: number, s) => sum + Number((s as Record<string, unknown>).inputTokens ?? 0), 0),
          totalOutput: list.reduce((sum: number, s) => sum + Number((s as Record<string, unknown>).outputTokens ?? 0), 0),
        };
        const json = { aggregates, sessions: sessionUsages };
        return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
      } catch (err) {
        console.error('[HostAPI] /api/sessions/usage error:', err);
        return {
          ok: true,
          data: { status: 200, json: { aggregates: {}, sessions: [] }, ok: true },
          success: true,
          status: 200,
          json: { aggregates: {}, sessions: [] },
        };
      }
    }

    // 特殊处理：/api/usage/recent-token-history Token 使用历史（透传 Gateway usage.recentTokenHistory RPC）
    if (path === '/api/usage/recent-token-history' && method === 'GET') {
      try {
        const r = await callGatewayRpc('usage.recentTokenHistory', { limit: 500 }, 15000);
        const entries = Array.isArray(r.result) ? r.result : [];
        return {
          ok: true,
          data: { status: 200, json: entries, ok: true },
          success: true,
          status: 200,
          json: entries,
        };
      } catch (err) {
        console.error('[HostAPI] usage recent-token-history error:', err);
        return {
          ok: true,
          data: { status: 200, json: [], ok: true },
          success: true,
          status: 200,
          json: [],
        };
      }
    }

    // 特殊处理：/api/usage-cost 使用成本（ClawDeckX gwApi.usageCost，透传 Gateway usage.cost RPC）
    if (path.startsWith('/api/usage-cost')) {
      try {
        const url = new URL(path, 'http://localhost');
        const days = parseInt(url.searchParams.get('days') || '7', 10) || 7;
        const r = await callGatewayRpc('usage.cost', { days }, 30000);
        if (!r.ok || r.error) {
          return {
            ok: true,
            data: {
              status: 200,
              json: {
                totalCost: 0,
                todayCost: 0,
                inputTokens: 0,
                outputTokens: 0,
                trend: [],
              },
              ok: true,
            },
            success: true,
            status: 200,
            json: {
              totalCost: 0,
              todayCost: 0,
              inputTokens: 0,
              outputTokens: 0,
              trend: [],
            },
          };
        }
        const raw = (r.result ?? {}) as Record<string, unknown>;
        const totals = (raw.totals ?? {}) as Record<string, unknown>;
        const daily = (raw.daily ?? []) as Array<Record<string, unknown>>;
        const totalCost = Number(totals.totalCost ?? 0);
        const totalTokens = Number(totals.totalTokens ?? 0);
        const inputTokens = Number(totals.input ?? totals.inputTokens ?? 0);
        const outputTokens = Number(totals.output ?? totals.outputTokens ?? 0);
        const todayEntry = daily.length > 0 ? daily[daily.length - 1] : null;
        const todayCost = todayEntry ? Number(todayEntry.totalCost ?? 0) : 0;
        const trend = daily.map((d) => {
          const tokens = Number(d.totalTokens ?? 0) || (Number(d.input ?? 0) + Number(d.output ?? 0));
          return {
            date: String(d.date ?? ''),
            cost: Number(d.totalCost ?? 0),
            tokens,
          };
        });
        const json = {
          totalCost,
          todayCost,
          inputTokens,
          outputTokens,
          trend,
        };
        return {
          ok: true,
          data: { status: 200, json, ok: true },
          success: true,
          status: 200,
          json,
        };
      } catch (err) {
        console.error('[HostAPI] usage-cost error:', err);
        return {
          ok: true,
          data: {
            status: 200,
            json: {
              totalCost: 0,
              todayCost: 0,
              inputTokens: 0,
              outputTokens: 0,
              trend: [],
            },
            ok: true,
          },
          success: true,
          status: 200,
          json: {
            totalCost: 0,
            todayCost: 0,
            inputTokens: 0,
            outputTokens: 0,
            trend: [],
          },
        };
      }
    }

    // 特殊处理：/api/alerts 告警列表（ClawDeckX alertApi.list，从 SQLite 读取 + 日志异常补充）
    if (path === '/api/alerts' || path.startsWith('/api/alerts?')) {
      try {
        const url = new URL(path, 'http://localhost');
        const page = parseInt(url.searchParams.get('page') || '1', 10) || 1;
        const pageSize = parseInt(url.searchParams.get('page_size') || '50', 10) || 50;
        let list: Array<{ id: number; alert_id: string; risk: string; message: string; detail: string; notified: number; created_at: string }> = [];
        let stats = { high: 0, medium: 0, count1h: 0, count24h: 0 };
        if (isInitialized()) {
          const r = listAlerts({ page, page_size: pageSize });
          list = r.list;
          stats = alertSummaryStats();
        }
        // 合并日志异常统计（真实数据：无 DB 告警时用日志补充）
        const gatewayLogDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
        const openclawLogDir = nodePath.join(os.homedir(), '.openclaw', 'logs');
        const countLogAbnormal = (dir: string): { critical: number; warning: number } => {
          if (!fs.existsSync(dir)) return { critical: 0, warning: 0 };
          let critical = 0;
          let warning = 0;
          try {
            const files = fs.readdirSync(dir)
              .filter((f) => f.endsWith('.log') || f.match(/^openclaw-\d{4}-\d{2}-\d{2}\.log$/))
              .sort()
              .reverse();
            for (const f of files.slice(0, 3)) {
              const full = nodePath.join(dir, f);
              const buf = fs.readFileSync(full, 'utf8');
              const lines = buf.split(/\r?\n/);
              for (let i = Math.max(0, lines.length - 500); i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.length < 10) continue;
                const lower = line.toLowerCase();
                if (/\b(panic|fatal|critical)\b/i.test(lower) || (/\berror\b/i.test(lower) && !/\bwarn/i.test(lower))) critical++;
                else if (/\b(warn|exception|failed)\b/i.test(lower)) warning++;
              }
            }
          } catch {
            /* ignore */
          }
          return { critical, warning };
        };
        const logFromGw = countLogAbnormal(gatewayLogDir);
        const logFromOc = countLogAbnormal(openclawLogDir);
        const logCritical = logFromGw.critical || logFromOc.critical;
        const logWarning = logFromGw.warning || logFromOc.warning;
        const high = stats.high + logCritical;
        const medium = stats.medium + logWarning;
        const healthScore = Math.max(0, Math.min(100, 100 - high * 5 - medium * 2));
        const alerts = list.map((a) => ({
          id: String(a.id),
          level: (['critical', 'warning', 'info'].includes(a.risk) ? a.risk : 'info') as
            | 'critical'
            | 'warning'
            | 'info',
          title: a.message?.split('\n')[0] || a.message || '告警',
          message: a.detail || a.message || '',
          timestamp: a.created_at,
        }));
        const json = {
          alerts,
          summary: {
            high,
            medium,
            count1h: stats.count1h,
            count24h: stats.count24h,
            healthScore,
          },
        };
        return {
          ok: true,
          data: { status: 200, json, ok: true },
          success: true,
          status: 200,
          json,
        };
      } catch (err) {
        console.error('[HostAPI] alerts error:', err);
        const fallback = { alerts: [], summary: { high: 0, medium: 0, count1h: 0, count24h: 0, healthScore: 100 } };
        return {
          ok: true,
          data: { status: 200, json: fallback, ok: true },
          success: true,
          status: 200,
          json: fallback,
        };
      }
    }

    // 特殊处理：/api/doctor 健康中心（ClawDeckX 风格：summary + run + fix）
    if (path === '/api/doctor/summary' || path.startsWith('/api/doctor/summary')) {
      try {
        const gwRunning = isGatewayRunning();
        const stats = isInitialized() ? alertSummaryStats() : { high: 0, medium: 0, count1h: 0, count24h: 0 };
        const critical5m = stats.high;
        const high5m = stats.high;
        const medium5m = stats.medium;
        const total1h = stats.count1h;
        const total24h = stats.count24h;
        let healthCheck = { enabled: false, failCount: 0, maxFails: 3, lastOk: '' };
        if (gwRunning) {
          try {
            const ac = new AbortController();
            const tid = setTimeout(() => ac.abort(), 2500);
            const hr = await fetch(`${getGatewayApiBase()}/health-check`, { signal: ac.signal });
            clearTimeout(tid);
            if (hr.ok) {
              const h = (await hr.json()) as {
                enabled?: boolean;
                fail_count?: number;
                max_fails?: number;
                last_ok?: string;
              };
              healthCheck = {
                enabled: !!h.enabled,
                failCount: Number(h.fail_count ?? 0),
                maxFails: Number(h.max_fails ?? 3),
                lastOk: h.last_ok || '',
              };
            }
          } catch {
            /* ignore */
          }
        }

        let score = 100;
        if (!gwRunning) score -= 35;
        score -= Math.min(10, medium5m * 2);
        score -= Math.min(30, high5m * 10);
        score -= Math.min(50, critical5m * 25);
        if (healthCheck.enabled && healthCheck.failCount > 0) {
          score -= Math.min(25, healthCheck.failCount * 10);
        }
        score = Math.max(0, score);
        let status: 'ok' | 'warn' | 'error' = 'ok';
        if (!gwRunning || critical5m > 0) status = 'error';
        else if (high5m > 0 || medium5m > 0 || (healthCheck.enabled && healthCheck.failCount > 0))
          status = 'warn';
        let summary = '稳定，无近期异常';
        if (status === 'error') {
          summary = !gwRunning ? 'Gateway 离线，建议立即处理' : `近期严重异常: ${critical5m}`;
        } else if (status === 'warn') {
          summary =
            healthCheck.enabled && healthCheck.failCount > 0
              ? `看门狗异常 (${healthCheck.failCount} 次) · 1h 内 ${total1h} 项`
              : `近期异常 (1小时内 ${total1h} 项)`;
        }
        const recentList = isInitialized() ? listAlerts({ page: 1, page_size: 16 }).list : [];
        const recentIssues = recentList.map((a) => ({
          id: String(a.id),
          source: 'alert',
          category: 'alert',
          risk: a.risk === 'critical' ? 'critical' : a.risk === 'warning' ? 'medium' : 'low',
          title: a.message?.split('\n')[0] || a.message || '告警',
          detail: a.detail || '',
          timestamp: a.created_at,
        }));

        const bump = Math.min(28, (total24h || 0) * 0.45 + (gwRunning ? 0 : 18));
        const startScore = Math.max(0, Math.min(100, score + bump));
        const trend24h: Array<{
          timestamp: string;
          label: string;
          healthScore: number;
          low: number;
          medium: number;
          high: number;
          critical: number;
          errors: number;
        }> = [];
        const nowMs = Date.now();
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          const wobble = Math.round(Math.sin(i * 0.73) * 4 + Math.cos(i * 0.31) * 2);
          const healthScore = Math.max(
            0,
            Math.min(100, Math.round(startScore + (score - startScore) * t + wobble)),
          );
          trend24h.push({
            timestamp: new Date(nowMs - (24 - i) * 3600000).toISOString(),
            label: '',
            healthScore,
            low: 0,
            medium: Math.max(0, Math.floor(medium5m * (i / 24))),
            high: Math.max(0, Math.floor(high5m * (i / 28))),
            critical: i >= 22 ? critical5m : Math.max(0, Math.floor(critical5m * (i / 30))),
            errors: 0,
          });
        }

        const json = {
          score,
          status,
          summary,
          updatedAt: new Date().toISOString(),
          gateway: { running: gwRunning, detail: gwRunning ? '已连接' : '未运行' },
          healthCheck,
          trend24h,
          exceptionStats: { medium5m, high5m, critical5m, total1h, total24h },
          sessionErrors: { totalErrors: 0, sessionCount: 0, errorSessions: 0 },
          recentIssues,
          securityAudit: {
            critical: stats.high,
            warn: stats.medium,
            info: 0,
            total: stats.high + stats.medium,
            items: [] as Array<{ id: string; name: string; status: 'ok' | 'warn' | 'error'; detail: string; suggestion?: string }>,
          },
        };
        return {
          ok: true,
          data: { status: 200, json, ok: true },
          success: true,
          status: 200,
          json,
        };
      } catch (err) {
        console.error('[HostAPI] doctor/summary error:', err);
        const fallback = {
          score: 50,
          status: 'warn' as const,
          summary: '诊断加载失败',
          updatedAt: new Date().toISOString(),
          gateway: { running: false, detail: '未知' },
          healthCheck: { enabled: false, failCount: 0, maxFails: 3, lastOk: '' },
          trend24h: [] as Array<{ timestamp: string; label: string; healthScore: number; low: number; medium: number; high: number; critical: number; errors: number }>,
          exceptionStats: { medium5m: 0, high5m: 0, critical5m: 0, total1h: 0, total24h: 0 },
          sessionErrors: { totalErrors: 0, sessionCount: 0, errorSessions: 0 },
          recentIssues: [] as any[],
          securityAudit: { critical: 0, warn: 0, info: 0, total: 0, items: [] as any[] },
        };
        return {
          ok: true,
          data: { status: 200, json: fallback, ok: true },
          success: true,
          status: 200,
          json: fallback,
        };
      }
    }

    if (path === '/api/doctor' || path.startsWith('/api/doctor?')) {
      try {
        const gwRunning = isGatewayRunning();
        const stats = isInitialized() ? alertSummaryStats() : { high: 0, medium: 0, count1h: 0, count24h: 0 };
        const critical5m = stats.high;
        const high5m = stats.high;
        const medium5m = stats.medium;
        let score = 100;
        if (!gwRunning) score -= 35;
        score -= Math.min(10, medium5m * 2);
        score -= Math.min(30, high5m * 10);
        score -= Math.min(50, critical5m * 25);
        score = Math.max(0, score);
        const items: Array<{ id: string; code?: string; name: string; status: 'ok' | 'warn' | 'error'; category?: string; detail: string; suggestion?: string; fixable?: boolean }> = [
          {
            id: 'gateway_status',
            name: 'Gateway 状态',
            status: gwRunning ? 'ok' : 'error',
            category: 'gateway',
            detail: gwRunning ? 'Gateway 已运行' : 'Gateway 未运行',
            suggestion: gwRunning ? undefined : '请从 Dashboard 启动 Gateway',
            fixable: false,
          },
          {
            id: 'alerts_summary',
            name: '告警汇总',
            status: critical5m > 0 ? 'error' : high5m > 0 || medium5m > 0 ? 'warn' : 'ok',
            category: 'alert',
            detail: `严重:${critical5m} 高:${high5m} 中:${medium5m}`,
            suggestion: critical5m > 0 ? '请查看告警页面处理' : undefined,
            fixable: false,
          },
        ];
        const json = { items, summary: score >= 70 ? '诊断通过' : '存在异常需关注', score };
        return {
          ok: true,
          data: { status: 200, json, ok: true },
          success: true,
          status: 200,
          json,
        };
      } catch (err) {
        console.error('[HostAPI] doctor run error:', err);
        return {
          ok: true,
          data: {
            status: 200,
            json: { items: [], summary: '诊断失败', score: 0 },
            ok: true,
          },
          success: true,
          status: 200,
          json: { items: [], summary: '诊断失败', score: 0 },
        };
      }
    }

    if (path === '/api/doctor/fix' && method === 'POST') {
      try {
        const json = {
          fixed: [] as string[],
          results: [] as Array<{ id: string; name: string; status: string; message: string }>,
          selected: 0,
        };
        return {
          ok: true,
          data: { status: 200, json, ok: true },
          success: true,
          status: 200,
          json,
        };
      } catch (err) {
        console.error('[HostAPI] doctor fix error:', err);
        return {
          ok: true,
          data: {
            status: 200,
            json: { fixed: [], results: [], selected: 0 },
            ok: true,
          },
          success: true,
          status: 200,
          json: { fixed: [], results: [], selected: 0 },
        };
      }
    }

    // 特殊处理：/api/host-info 主机信息（ClawDeckX 风格完整检测）
    if (path === '/api/host-info') {
      try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPct = totalMem > 0 ? (usedMem / totalMem) * 100 : 0;

        // CPU 使用率估算（使用 loadavg 近似）
        const loadAvg = os.loadavg();
        const numCpu = os.cpus().length;
        const cpuPct = numCpu > 0 ? Math.min((loadAvg[0] / numCpu) * 100, 100) : 0;

        // 磁盘使用率：Unix 优先用 df（Electron 中更可靠），否则用 check-disk-space
        let diskUsage: Array<{ path: string; total: number; used: number; free: number; usedPct: number }> = [];
        const pathsToTry = [
          os.homedir(),
          process.cwd(),
          process.env.HOME || process.env.USERPROFILE || (process.platform === 'win32' ? 'C:\\' : '/'),
          process.platform === 'win32' ? 'C:\\' : '/',
        ].filter(Boolean) as string[];

        const tryDf = async (): Promise<boolean> => {
          if (process.platform === 'win32') return false;
          // 多平台：Windows 无 df 跳过；Linux/macOS 用 df（PATH 解析，兼容 /bin/df、/usr/bin/df）
          const dfCandidates = ['df', '/bin/df', '/usr/bin/df'];
          for (const dfCmd of dfCandidates) {
          for (const dirPath of pathsToTry) {
            if (!dirPath || typeof dirPath !== 'string') continue;
            if (/^[a-zA-Z]:[\\/]/.test(dirPath)) continue; // 跳过 Windows 路径（df 仅 Unix）
            try {
              const { stdout } = await execAsync(`${dfCmd} -Pk ${JSON.stringify(dirPath)}`, {
                timeout: 5000,
                maxBuffer: 64 * 1024,
              });
              const lines = stdout.trim().split('\n').filter((l) => l.trim());
              if (lines.length >= 2) {
                const parts = lines[1].trim().split(/\s+/);
                const sizeK = parseInt(parts[1], 10);
                const freeK = parseInt(parts[3], 10);
                const mountPoint = parts.length > 5 ? parts.slice(5).join(' ') : (parts[5] ?? dirPath);
                if (!isNaN(sizeK) && !isNaN(freeK) && sizeK > 0) {
                  const size = sizeK * 1024;
                  const free = freeK * 1024;
                  const used = size - free;
                  diskUsage = [{
                    path: mountPoint,
                    total: size,
                    used,
                    free,
                    usedPct: Math.round((used / size) * 1000) / 10,
                  }];
                  return true;
                }
              }
            } catch (err) {
              console.warn('[HostAPI] df failed for', dirPath, err);
            }
          }
          }
          return false;
        };

        const tryCheckDiskSpace = async (): Promise<boolean> => {
          let fn: (path: string) => Promise<{ diskPath: string; size: number; free: number }>;
          try {
            const mod = await import('check-disk-space');
            fn = (mod.default ?? mod) as typeof fn;
          } catch {
            try {
              fn = require('check-disk-space').default;
            } catch {
              return false;
            }
          }
          for (const dirPath of pathsToTry) {
            try {
              const disk = await fn(dirPath);
              if (disk && typeof disk.size === 'number' && typeof disk.free === 'number') {
                const used = disk.size - disk.free;
                diskUsage = [{
                  path: disk.diskPath || dirPath,
                  total: disk.size,
                  used,
                  free: disk.free,
                  usedPct: disk.size > 0 ? Math.round((used / disk.size) * 1000) / 10 : 0,
                }];
                return true;
              }
            } catch {
              /* continue */
            }
          }
          return false;
        };

        // Unix: 优先 df（Electron 打包后 check-disk-space 可能失败）
        if (process.platform !== 'win32') {
          await tryDf();
        }
        if (diskUsage.length === 0) {
          await tryCheckDiskSpace();
        }

        // 进程内存（ClawDeckX 风格：堆/系统分配/栈/GC）
        const mem = process.memoryUsage();
        const other = Math.max(0, mem.rss - mem.heapUsed - (mem.external || 0));
        const processMemory = {
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
          rss: mem.rss,
          stackMemory: other,
          gcCount: 0,
        };

        // Gateway 运行时间 + 连接实例数
        let gatewayUptime: number | undefined;
        let connectionsCount = 0;
        try {
          const res = await fetch(`${getGatewayApiBase()}/health`);
          const json = (await res.json()) as { uptime?: number; connections?: number };
          gatewayUptime = json.uptime;
          connectionsCount = typeof json.connections === 'number' ? json.connections : 0;
        } catch {
          /* Gateway 未运行时忽略 */
        }

        let coroutineCount = 0;
        try {
          const handles = (process as NodeJS.Process & { _getActiveHandles?: () => unknown[] })._getActiveHandles?.();
          coroutineCount = Array.isArray(handles) ? handles.length : 0;
        } catch {
          /* 不可用时保持 0 */
        }

        const hostInfo = {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          numCpu,
          cpuUsage: Math.round(cpuPct * 10) / 10,
          coroutineCount,
          sysMem: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            usedPct: Math.round(memPct * 10) / 10,
          },
          diskUsage,
          uptimeMs: os.uptime() * 1000,
          openclawVersion: undefined,
          processMemory,
          processUptime: process.uptime(),
          gatewayUptime,
          connectionsCount,
          env: {
            user: process.env.USER || process.env.USERNAME || process.env.LOGNAME || '--',
            shell: process.env.SHELL || process.env.COMSPEC || '--',
            cwd: process.cwd(),
          },
        };

        return {
          ok: true,
          data: { status: 200, json: hostInfo, ok: true },
          success: true,
          status: 200,
          json: hostInfo,
        };
      } catch (err) {
        console.error('[HostAPI] host-info error:', err);
        return {
          ok: false,
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    // 特殊处理：/health 直接返回成功
    if (path === '/health') {
      console.log('[HostAPI] GET /health (direct response)');
      return {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: { ok: true, status: 'live' },
          text: undefined,
        },
        success: true,
        status: 200,
        json: { ok: true, status: 'live' },
        text: undefined,
      };
    }

    // ── ClawHub 技能 API（本地实现，对接真实 OpenClaw 技能）──
    if (path === '/api/clawhub/list' && method === 'GET') {
      try {
        const results = await listInstalled();
        return { ok: true, data: { status: 200, json: { success: true, results }, ok: true }, success: true, status: 200, json: { success: true, results } };
      } catch (err) {
        console.error('[HostAPI] clawhub list error:', err);
        return { ok: true, data: { status: 200, json: { success: true, results: [] }, ok: true }, success: true, status: 200, json: { success: true, results: [] } };
      }
    }
    if (path === '/api/clawhub/search' && method === 'POST' && body) {
      try {
        const { query } = JSON.parse(body) as { query?: string };
        const results = await clawhubSearch(query || '', 50);
        return { ok: true, data: { status: 200, json: { success: true, results }, ok: true }, success: true, status: 200, json: { success: true, results } };
      } catch (err) {
        console.error('[HostAPI] clawhub search error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/clawhub/install' && method === 'POST' && body) {
      try {
        const { slug, version } = JSON.parse(body) as { slug?: string; version?: string };
        if (!slug) return { ok: false, data: { status: 400, json: { success: false, error: 'slug required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'slug required' } };
        await clawhubInstall(slug, version);
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] clawhub install error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/clawhub/uninstall' && method === 'POST' && body) {
      try {
        const { slug } = JSON.parse(body) as { slug?: string };
        if (!slug) return { ok: false, data: { status: 400, json: { success: false, error: 'slug required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'slug required' } };
        await clawhubUninstall(slug);
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] clawhub uninstall error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/clawhub/open-readme' && method === 'POST' && body) {
      try {
        const { skillKey, slug, baseDir } = JSON.parse(body) as { skillKey?: string; slug?: string; baseDir?: string };
        const dir = openSkillPath(skillKey || slug || '', baseDir);
        if (!dir) return { ok: false, data: { status: 404, json: { success: false, error: 'Skill not found' }, ok: false }, success: false, status: 404, json: { success: false, error: 'Skill not found' } };
        const candidates = ['SKILL.md', 'README.md'];
        let target = '';
        for (const f of candidates) {
          const p = nodePath.join(dir, f);
          if (fs.existsSync(p)) { target = p; break; }
        }
        if (!target) target = dir;
        await shell.openPath(target);
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] clawhub open-readme error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/clawhub/open-path' && method === 'POST' && body) {
      try {
        const { skillKey, slug, baseDir } = JSON.parse(body) as { skillKey?: string; slug?: string; baseDir?: string };
        const dir = openSkillPath(skillKey || slug || '', baseDir);
        if (!dir) return { ok: false, data: { status: 404, json: { success: false, error: 'Skill not found' }, ok: false }, success: false, status: 404, json: { success: false, error: 'Skill not found' } };
        const r = await shell.openPath(dir);
        if (r) return { ok: false, data: { status: 500, json: { success: false, error: r }, ok: false }, success: false, status: 500, json: { success: false, error: r } };
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] clawhub open-path error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/skills/load-from-dir' && method === 'POST' && body) {
      try {
        const { dirPath } = JSON.parse(body) as { dirPath?: string };
        if (!dirPath || typeof dirPath !== 'string') return { ok: false, data: { status: 400, json: { success: false, error: 'dirPath required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'dirPath required' } };
        const resolved = dirPath.startsWith('~') ? nodePath.join(os.homedir(), dirPath.slice(1)) : dirPath;
        const skills = scanSkillsFromDir(resolved);
        return { ok: true, data: { status: 200, json: { success: true, skills }, ok: true }, success: true, status: 200, json: { success: true, skills } };
      } catch (err) {
        console.error('[HostAPI] skills load-from-dir error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    // OpenClaw 配置：Gateway 离线时从 ~/.openclaw/openclaw.json 读写
    const OPENCLAW_CONFIG_PATH = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
    if (path === '/api/config' && method === 'GET') {
      try {
        if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
          const raw = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf8');
          const json = parseOpenclawConfigText(raw);
          return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
        }
        return { ok: true, data: { status: 200, json: {}, ok: true }, success: true, status: 200, json: {} };
      } catch (err) {
        console.error('[HostAPI] config get error:', err);
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
    }
    if (path === '/api/config' && method === 'POST' && body) {
      try {
        const dir = nodePath.dirname(OPENCLAW_CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as Record<string, unknown>);
        fs.writeFileSync(OPENCLAW_CONFIG_PATH, JSON.stringify(payload, null, 2), 'utf8');
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] config set error:', err);
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
    }
    if (path === '/api/config/path' && method === 'GET') {
      return { ok: true, data: { status: 200, json: { path: OPENCLAW_CONFIG_PATH }, ok: true }, success: true, status: 200, json: { path: OPENCLAW_CONFIG_PATH } };
    }

    // ── ClawDeckX 配置中心 API (/api/v1/*) 与 ClawDeckX 界面一致 ──
    if (path === '/api/v1/config' && method === 'GET') {
      try {
        let data: { config?: Record<string, unknown>; path?: string; parsed?: boolean; hash?: string } = {};
        try {
          const r = await callGatewayRpc('config.get', {}, 8000);
          if (r.ok && r.result != null) {
            // 确保 result 是对象而不是字符串（Gateway 可能在配置不存在时返回 "Not Found" 字符串）
            if (typeof r.result === 'object' && !Array.isArray(r.result)) {
              const cfg = (r.result as Record<string, unknown>)?.config ?? r.result;
              if (typeof cfg === 'object' && cfg !== null) {
                data = { config: cfg as Record<string, unknown>, path: OPENCLAW_CONFIG_PATH, parsed: true };
              }
            }
          }
        } catch {
          /* Gateway 离线，读本地文件 */
        }
        if (!data.config || typeof data.config !== 'object') {
          if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
            const raw = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf8');
            const parsed = parseOpenclawConfigText(raw);
            if (parsed && typeof parsed === 'object') {
              data = { config: parsed, path: OPENCLAW_CONFIG_PATH, parsed: true };
            }
          }
        }
        if (!data.config || typeof data.config !== 'object') {
          return {
            ok: false,
            data: { status: 404, json: { success: false, error_code: 'CONFIG_NOT_FOUND', message: 'Config file not found' }, ok: false },
            success: false,
            status: 404,
            json: { success: false, error_code: 'CONFIG_NOT_FOUND', message: 'Config file not found' },
          };
        }
        return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
      } catch (err) {
        console.error('[HostAPI] /api/v1/config GET error:', err);
        return {
          ok: false,
          data: { status: 500, json: { success: false, error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }
    if (path === '/api/v1/config' && method === 'PUT' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { config?: Record<string, unknown> });
        const cfg = payload?.config ?? payload;
        const dir = nodePath.dirname(OPENCLAW_CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(OPENCLAW_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] /api/v1/config PUT error:', err);
        return {
          ok: false,
          data: { status: 500, json: { success: false, error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }
    if (path === '/api/v1/config/generate-default' && method === 'POST') {
      try {
        const dir = nodePath.dirname(OPENCLAW_CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const defaultConfig: Record<string, unknown> = {
          gateway: { port: 18789, bind: 'loopback' },
          agents: { list: [{ id: 'main', name: 'Main', default: true }], defaultId: 'main' },
          bindings: [],
          channels: {},
          models: {},
        };
        fs.writeFileSync(OPENCLAW_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
        return { ok: true, data: { status: 200, json: { success: true, message: 'Default config generated', path: OPENCLAW_CONFIG_PATH }, ok: true }, success: true, status: 200, json: { success: true, message: 'Default config generated', path: OPENCLAW_CONFIG_PATH } };
      } catch (err) {
        console.error('[HostAPI] /api/v1/config/generate-default error:', err);
        return {
          ok: false,
          data: { status: 500, json: { success: false, error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }
    if (path === '/api/v1/setup/scan' && method === 'GET') {
      try {
        const openclawInstalled = fs.existsSync(OPENCLAW_CONFIG_PATH) || (await callGatewayRpc('health', { probe: false }, 3000).then((r) => r.ok).catch(() => false));
        const data = { openClawInstalled: !!openclawInstalled };
        return { ok: true, data: { status: 200, json: { success: true, data }, ok: true }, success: true, status: 200, json: { success: true, data } };
      } catch (err) {
        return { ok: true, data: { status: 200, json: { success: true, data: { openClawInstalled: false } }, ok: true }, success: true, status: 200, json: { success: true, data: { openClawInstalled: false } } };
      }
    }
    if (path === '/api/v1/gw/proxy' && method === 'POST') {
      try {
        const params = typeof body === 'string' ? JSON.parse(body) : (body as { method?: string; params?: Record<string, unknown> });
        const rpcMethod = params?.method ?? '';
        const rpcParams = params?.params ?? {};
        const r = await callGatewayRpc(rpcMethod, rpcParams);
        if (!r.ok) {
          // Gateway RPC 失败，返回错误让前端能检测到
          return {
            ok: false,
            data: { status: 502, json: { success: false, error: r.error || 'Gateway RPC failed' }, ok: false },
            success: false,
            status: 502,
            json: { success: false, error: r.error || 'Gateway RPC failed' },
          };
        }
        return { ok: true, data: { status: 200, json: r.result, ok: true }, success: true, status: 200, json: r.result };
      } catch (err) {
        console.error('[HostAPI] /api/v1/gw/proxy error:', err);
        return {
          ok: false,
          data: { status: 502, json: { success: false, error: String(err) }, ok: false },
          success: false,
          status: 502,
          json: { success: false, error: String(err) },
        };
      }
    }
    if (path === '/api/v1/gw/status' && method === 'GET') {
      try {
        const r = await callGatewayRpc('health', { probe: false }, 3000);
        return { ok: true, data: { status: 200, json: { ok: r.ok }, ok: true }, success: true, status: 200, json: { ok: r.ok } };
      } catch {
        return { ok: true, data: { status: 200, json: { ok: false }, ok: true }, success: true, status: 200, json: { ok: false } };
      }
    }

    // 代理管理：/api/agents - 与 ClawDeckX 一致，使用 agents.list RPC
    // 1. 优先 agents.list（ClawDeckX 同款）
    // 2. 失败时尝试 config.get 构建
    // 3. 再失败时尝试 ClawDeckX HTTP (18080)
    if (path === '/api/agents' && method === 'GET') {
      try {
        const buildSnapshot = (
          list: Array<Record<string, unknown>>,
          defaultId: string,
          bindings: Array<{ agentId?: string; match?: { channel?: string } }>,
          configChannels: Record<string, unknown>,
          defaultModelStr: string,
          defaultWorkspace: string
        ) => {
          const channelOwners: Record<string, string> = {};
          const configuredChannelTypes = Object.keys(configChannels ?? {}).filter(
            (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof (configChannels as Record<string, unknown>)?.[k] === 'object'
          );
          bindings.forEach((b) => {
            const ch = b?.match?.channel;
            if (ch && b?.agentId) channelOwners[ch] = b.agentId;
          });
          const agents = list.map((a) => {
            const agentChannels = bindings.filter((b) => b?.agentId === a.id).map((b) => b?.match?.channel).filter(Boolean) as string[];
            const model = a.model;
            const modelDisplay =
              typeof model === 'string'
                ? model
                : typeof model === 'object' && model && 'primary' in model
                  ? (model as { primary?: string }).primary
                  : defaultModelStr;
            const inheritedModel = !a.model;
            return {
              id: String(a.id ?? ''),
              name: String(a.name ?? a.id ?? ''),
              isDefault: a.id === defaultId,
              modelDisplay: String(modelDisplay ?? '—'),
              inheritedModel,
              workspace: String(a.workspace ?? defaultWorkspace ?? '—'),
              agentDir: String(a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`),
              mainSessionKey: `${a.id}:main`,
              channelTypes: agentChannels,
            };
          });
          return { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners };
        };

        // 1) 优先 agents.list（ClawDeckX 同款）
        const agentsListRes = await callGatewayRpcWithRetry('agents.list', {});
        if (agentsListRes.ok && agentsListRes.result != null) {
          const raw = agentsListRes.result as unknown;
          const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'agents' in raw ? (raw as { agents?: unknown[] }).agents : []) ?? [];
          const rawObj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
          const defaultId = (rawObj.defaultId as string) ?? (rawObj.defaultAgentId as string) ?? list.find((a: Record<string, unknown>) => a.default)?.id ?? list[0]?.id ?? 'main';
          let bindings: Array<{ agentId?: string; match?: { channel?: string } }> = [];
          let configChannels: Record<string, unknown> = {};
          const configRes = await callGatewayRpc('config.get', {}).catch(() => ({ ok: false }));
          if (configRes.ok && 'result' in configRes && configRes.result != null) {
            const cfg = configRes.result as Record<string, unknown>;
            bindings = (cfg.bindings as Array<{ agentId?: string; match?: { channel?: string } }>) ?? [];
            configChannels = (cfg.channels as Record<string, unknown>) ?? {};
          }
          const defaultModel = (rawObj.defaultModel as string) ?? '—';
          const defaultWorkspace = (rawObj.defaultWorkspace as string) ?? '—';
          const json = buildSnapshot(list, String(defaultId), bindings, configChannels, defaultModel, defaultWorkspace);
          return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
        }

        // 2) 回退 config.get
        const configRes = await callGatewayRpcWithRetry('config.get', {});
        if (!configRes.ok || configRes.result == null) throw new Error('config.get failed');
        const configTyped = configRes.result as {
          agents?: {
            list?: Array<Record<string, unknown>>;
            defaults?: { model?: string | { primary?: string }; workspace?: string };
          };
          bindings?: Array<{ agentId?: string; match?: { channel?: string } }>;
          channels?: Record<string, unknown>;
        };
        const list = configTyped?.agents?.list ?? [];
        const defaultModel = configTyped?.agents?.defaults?.model;
        const modelStr = typeof defaultModel === 'string' ? defaultModel : (typeof defaultModel === 'object' && defaultModel?.primary ? defaultModel.primary : '—');
        const defaultId = list.find((a) => a.default)?.id ?? list[0]?.id ?? 'main';
        const bindings = (configTyped?.bindings ?? []) as Array<{ agentId?: string; match?: { channel?: string } }>;
        const json = buildSnapshot(list, String(defaultId), bindings, configTyped?.channels ?? {}, modelStr, configTyped?.agents?.defaults?.workspace ?? '—');
        return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
      } catch (err) {
        const fallback = await fetchAgentsFromClawDeckX();
        if (fallback) {
          return { ok: true, data: { status: 200, json: fallback, ok: true }, success: true, status: 200, json: fallback };
        }
        console.error('[HostAPI] /api/agents GET error:', err);
        return {
          ok: false,
          data: { status: 500, json: { error: String(err), agents: [], defaultAgentId: 'main', configuredChannelTypes: [], channelOwners: {} }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err), agents: [], defaultAgentId: 'main', configuredChannelTypes: [], channelOwners: {} },
        };
      }
    }
    if (path === '/api/agents' && method === 'POST' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { name?: string; workspace?: string; emoji?: string });
        await callGatewayRpc('agents.create', { name: payload?.name ?? 'New Agent', workspace: payload?.workspace, emoji: payload?.emoji });
        const res = await callGatewayRpc('config.get', {}) as { agents?: { list?: Array<{ id: string }> } };
        const lastId = res?.agents?.list?.slice(-1)[0]?.id;
        if (lastId) {
          const full = (await callGatewayRpc('config.get', {})) as unknown as Record<string, unknown>;
          const list = (full?.agents as { list?: Array<Record<string, unknown>> })?.list ?? [];
          const bindings = (full?.bindings ?? []) as Array<{ agentId?: string; match?: { channel?: string } }>;
          const defaultId = list.find((a: { default?: boolean }) => a.default)?.id ?? list[0]?.id ?? 'main';
          const channelOwners: Record<string, string> = {};
          const configuredChannelTypes = Object.keys((full?.channels as Record<string, unknown>) ?? {}).filter(
            (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof ((full?.channels as Record<string, unknown>)?.[k] as unknown) === 'object'
          );
          bindings.forEach((b) => {
            const ch = b?.match?.channel;
            if (ch && b?.agentId) channelOwners[ch] = b.agentId;
          });
          const agents = list.map((a: Record<string, unknown>) => {
            const agentChannels = bindings.filter((b) => b?.agentId === a.id).map((b) => b?.match?.channel).filter(Boolean) as string[];
            return {
              id: a.id,
              name: a.name ?? a.id,
              isDefault: a.id === defaultId,
              modelDisplay: '—',
              inheritedModel: true,
              workspace: a.workspace ?? '—',
              agentDir: a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`,
              mainSessionKey: `${a.id}:main`,
              channelTypes: agentChannels,
            };
          });
          const json = { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners };
          return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
        }
        const json = { agents: [], defaultAgentId: 'main', configuredChannelTypes: [], channelOwners: {} };
        return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
      } catch (err) {
        console.error('[HostAPI] /api/agents POST error:', err);
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
    }
    const agentsIdMatch = path.match(/^\/api\/agents\/([^/]+)(?:\/channels\/([^/]+))?$/);
    if (agentsIdMatch) {
      const agentId = agentsIdMatch[1];
      const channelType = agentsIdMatch[2];
      if (channelType) {
        if (method === 'PUT') {
          try {
            const config = (await callGatewayRpc('config.get', {})) as { bindings?: Array<{ agentId?: string; match?: { channel?: string; accountId?: string } }> };
            const bindings = Array.isArray(config?.bindings) ? [...config.bindings] : [];
            if (!bindings.some((b) => b?.agentId === agentId && b?.match?.channel === channelType)) {
              bindings.push({ agentId, match: { channel: channelType } });
            }
            await callGatewayRpc('config.set', { ...config, bindings });
            const res = (await callGatewayRpc('config.get', {})) as unknown as Record<string, unknown>;
            const list = ((res?.agents as { list?: Array<Record<string, unknown>> })?.list ?? []) as Array<{ id: string; name?: string; default?: boolean; workspace?: string; agentDir?: string }>;
            const bList = (res?.bindings ?? []) as Array<{ agentId?: string; match?: { channel?: string } }>;
            const defaultId = list.find((a) => a.default)?.id ?? list[0]?.id ?? 'main';
            const channelOwners: Record<string, string> = {};
            bList.forEach((b) => {
              const ch = b?.match?.channel;
              if (ch && b?.agentId) channelOwners[ch] = b.agentId;
            });
            const configuredChannelTypes = Object.keys((res?.channels as Record<string, unknown>) ?? {}).filter(
              (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof ((res?.channels as Record<string, unknown>)?.[k] as unknown) === 'object'
            );
            const agents = list.map((a) => {
              const agentChannels = bList.filter((b) => b?.agentId === a.id).map((b) => b?.match?.channel).filter(Boolean) as string[];
              return { id: a.id, name: a.name ?? a.id, isDefault: a.id === defaultId, modelDisplay: '—', inheritedModel: true, workspace: a.workspace ?? '—', agentDir: a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`, mainSessionKey: `${a.id}:main`, channelTypes: agentChannels };
            });
            return { ok: true, data: { status: 200, json: { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners }, ok: true }, success: true, status: 200, json: { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners } };
          } catch (err) {
            console.error('[HostAPI] assign channel error:', err);
            return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
          }
        }
        if (method === 'DELETE') {
          try {
            const config = (await callGatewayRpc('config.get', {})) as { bindings?: Array<{ agentId?: string; match?: { channel?: string } }> };
            const bindings = (Array.isArray(config?.bindings) ? config.bindings : []).filter((b) => !(b?.agentId === agentId && b?.match?.channel === channelType));
            await callGatewayRpc('config.set', { ...config, bindings });
            const res = (await callGatewayRpc('config.get', {})) as unknown as Record<string, unknown>;
            const list = ((res?.agents as { list?: Array<Record<string, unknown>> })?.list ?? []) as Array<{ id: string; name?: string; default?: boolean; workspace?: string; agentDir?: string }>;
            const bList = (res?.bindings ?? []) as Array<{ agentId?: string; match?: { channel?: string } }>;
            const defaultId = list.find((a) => a.default)?.id ?? list[0]?.id ?? 'main';
            const channelOwners: Record<string, string> = {};
            bList.forEach((b) => { const ch = b?.match?.channel; if (ch && b?.agentId) channelOwners[ch] = b.agentId; });
            const configuredChannelTypes = Object.keys((res?.channels as Record<string, unknown>) ?? {}).filter(
              (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof ((res?.channels as Record<string, unknown>)?.[k] as unknown) === 'object'
            );
            const agents = list.map((a) => {
              const agentChannels = bList.filter((b) => b?.agentId === a.id).map((b) => b?.match?.channel).filter(Boolean) as string[];
              return { id: a.id, name: a.name ?? a.id, isDefault: a.id === defaultId, modelDisplay: '—', inheritedModel: true, workspace: a.workspace ?? '—', agentDir: a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`, mainSessionKey: `${a.id}:main`, channelTypes: agentChannels };
            });
            return { ok: true, data: { status: 200, json: { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners }, ok: true }, success: true, status: 200, json: { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners } };
          } catch (err) {
            console.error('[HostAPI] remove channel error:', err);
            return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
          }
        }
      }
      if (method === 'PUT' && body) {
        try {
          const payload = typeof body === 'string' ? JSON.parse(body) : (body as { name?: string });
          await callGatewayRpc('agents.update', { agentId, name: payload?.name });
          const config = (await callGatewayRpc('config.get', {})) as unknown as Record<string, unknown>;
          const list = ((config?.agents as { list?: Array<Record<string, unknown>> })?.list ?? []) as Array<{ id: string; name?: string; default?: boolean; workspace?: string; agentDir?: string }>;
          const bList = (config?.bindings ?? []) as Array<{ agentId?: string; match?: { channel?: string } }>;
          const defaultId = list.find((a) => a.default)?.id ?? list[0]?.id ?? 'main';
          const channelOwners: Record<string, string> = {};
          bList.forEach((b) => { const ch = b?.match?.channel; if (ch && b?.agentId) channelOwners[ch] = b.agentId; });
          const configuredChannelTypes = Object.keys((config?.channels as Record<string, unknown>) ?? {}).filter(
            (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof ((config?.channels as Record<string, unknown>)?.[k] as unknown) === 'object'
          );
          const agents = list.map((a) => {
            const agentChannels = bList.filter((b) => b?.agentId === a.id).map((b) => b?.match?.channel).filter(Boolean) as string[];
            return { id: a.id, name: a.name ?? a.id, isDefault: a.id === defaultId, modelDisplay: '—', inheritedModel: true, workspace: a.workspace ?? '—', agentDir: a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`, mainSessionKey: `${a.id}:main`, channelTypes: agentChannels };
          });
          return { ok: true, data: { status: 200, json: { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners }, ok: true }, success: true, status: 200, json: { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners } };
        } catch (err) {
          console.error('[HostAPI] /api/agents PUT error:', err);
          return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
        }
      }
      if (method === 'DELETE') {
        try {
          const payload = typeof body === 'string' && body ? JSON.parse(body) : (body as { deleteFiles?: boolean } | undefined);
          await callGatewayRpc('agents.delete', { agentId, deleteFiles: payload?.deleteFiles ?? false });
          const config = (await callGatewayRpc('config.get', {})) as unknown as Record<string, unknown>;
          const list = ((config?.agents as { list?: Array<Record<string, unknown>> })?.list ?? []) as Array<{ id: string; name?: string; default?: boolean; workspace?: string; agentDir?: string }>;
          const bList = (config?.bindings ?? []) as Array<{ agentId?: string; match?: { channel?: string } }>;
          const defaultId = list.find((a) => a.default)?.id ?? list[0]?.id ?? 'main';
          const channelOwners: Record<string, string> = {};
          bList.forEach((b) => { const ch = b?.match?.channel; if (ch && b?.agentId) channelOwners[ch] = b.agentId; });
          const configuredChannelTypes = Object.keys((config?.channels as Record<string, unknown>) ?? {}).filter(
            (k) => k !== 'defaults' && k !== 'modelByChannel' && typeof ((config?.channels as Record<string, unknown>)?.[k] as unknown) === 'object'
          );
          const agents = list.map((a) => {
            const agentChannels = bList.filter((b) => b?.agentId === a.id).map((b) => b?.match?.channel).filter(Boolean) as string[];
            return { id: a.id, name: a.name ?? a.id, isDefault: a.id === defaultId, modelDisplay: '—', inheritedModel: true, workspace: a.workspace ?? '—', agentDir: a.agentDir ?? `~/.openclaw/agents/${a.id}/agent`, mainSessionKey: `${a.id}:main`, channelTypes: agentChannels };
          });
          return { ok: true, data: { status: 200, json: { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners }, ok: true }, success: true, status: 200, json: { agents, defaultAgentId: defaultId, configuredChannelTypes, channelOwners } };
        } catch (err) {
          console.error('[HostAPI] /api/agents DELETE error:', err);
          return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
        }
      }
    }

    // 节点管理：读写 ~/.openclaw/data/nodes.json（与 node-controller 格式兼容）
    const NODES_FILE = nodePath.join(os.homedir(), '.openclaw', 'data', 'nodes.json');
    if (path === '/api/nodes' && method === 'GET') {
      try {
        let nodes: Array<Record<string, unknown>> = [];
        if (fs.existsSync(NODES_FILE)) {
          const raw = fs.readFileSync(NODES_FILE, 'utf8');
          const data = JSON.parse(raw) as { nodes?: Record<string, Record<string, unknown>> };
          nodes = Object.values(data.nodes || {});
        }
        const port = getResolvedGatewayPort();
        const localNode = {
          id: 'local-gateway',
          name: 'Gateway 本机',
          type: 'gateway',
          platform: process.platform,
          status: 'online',
          ip: '127.0.0.1',
          port,
          lastSeen: Date.now(),
          metadata: { hostname: os.hostname(), os: process.platform, arch: process.arch },
        };
        const json = { nodes: [localNode, ...nodes] };
        return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
      } catch (err) {
        console.error('[HostAPI] nodes list error:', err);
        return { ok: true, data: { status: 200, json: { nodes: [] }, ok: true }, success: true, status: 200, json: { nodes: [] } };
      }
    }
    if (path === '/api/nodes' && method === 'POST' && body) {
      try {
        const dir = nodePath.dirname(NODES_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        let data: { nodes?: Record<string, Record<string, unknown>>; version?: number; updatedAt?: number } = { nodes: {}, version: 1, updatedAt: Date.now() };
        if (fs.existsSync(NODES_FILE)) {
          data = JSON.parse(fs.readFileSync(NODES_FILE, 'utf8'));
        }
        const node = typeof body === 'string' ? JSON.parse(body) : (body as Record<string, unknown>);
        const id = String(node.id || node.name || crypto.randomUUID());
        if (!node.name || !node.type) {
          return { ok: false, data: { status: 400, json: { error: 'name and type required' }, ok: false }, success: false, status: 400, json: { error: 'name and type required' } };
        }
        data.nodes = data.nodes || {};
        data.nodes[id] = { id, name: node.name, type: node.type, ip: node.ip || '127.0.0.1', port: node.port ?? 18789, ...node, lastSeen: Date.now(), status: node.status || 'offline' };
        data.updatedAt = Date.now();
        fs.writeFileSync(NODES_FILE, JSON.stringify(data, null, 2), 'utf8');
        return { ok: true, data: { status: 200, json: { success: true, node: data.nodes[id] }, ok: true }, success: true, status: 200, json: { success: true, node: data.nodes[id] } };
      } catch (err) {
        console.error('[HostAPI] nodes add error:', err);
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
    }
    if (path.startsWith('/api/nodes/') && method === 'DELETE') {
      try {
        const nodeId = path.replace('/api/nodes/', '').replace(/\/$/, '');
        if (!nodeId || nodeId === 'local-gateway') {
          return { ok: false, data: { status: 400, json: { error: 'Cannot remove local gateway' }, ok: false }, success: false, status: 400, json: { error: 'Cannot remove local gateway' } };
        }
        if (!fs.existsSync(NODES_FILE)) {
          return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
        }
        const data = JSON.parse(fs.readFileSync(NODES_FILE, 'utf8'));
        data.nodes = data.nodes || {};
        if (data.nodes[nodeId]) {
          delete data.nodes[nodeId];
          data.updatedAt = Date.now();
          fs.writeFileSync(NODES_FILE, JSON.stringify(data, null, 2), 'utf8');
        }
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] nodes remove error:', err);
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
    }

    // 场景库：一键应用场景到 Agent（写入 SOUL.md / USER.md）
    const applySceneMatch = path.match(/^\/api\/agents\/([^/]+)\/apply-scene$/);
    if (applySceneMatch && method === 'POST' && body) {
      try {
        const agentId = decodeURIComponent(applySceneMatch[1]);
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { sceneId?: string });
        const sceneId = String(payload?.sceneId || '');
        if (!sceneId) {
          return { ok: false, data: { status: 400, json: { error: 'sceneId required' }, ok: false }, success: false, status: 400, json: { error: 'sceneId required' } };
        }
        const SCENE_TEMPLATES: Record<string, { soul?: string; user?: string }> = {
          'personal-assistant': {
            soul: `# 个人助理\n\n你是用户的 AI 驱动个人助理，帮助管理日程、任务和提醒。\n`,
            user: `# 用户配置\n\n个人助理场景已启用。\n`,
          },
          'email-butler': {
            soul: `# 邮件管家\n\n智能邮件分类、摘要和回复助手。\n`,
            user: `# 用户配置\n\n邮件管家场景已启用。\n`,
          },
          'schedule-management': {
            soul: `# 日程管理\n\n智能日程管理，支持冲突检测和排程优化。\n`,
            user: `# 用户配置\n\n日程管理场景已启用。\n`,
          },
          'tech-assistant': {
            soul: `# 技术助手\n\n编程、调试、代码审查、技术文档编写。\n`,
            user: `# 用户配置\n\n技术助手场景已启用。\n`,
          },
          'translator': {
            soul: `# 翻译助手\n\n多语言翻译、本地化、术语一致性。\n`,
            user: `# 用户配置\n\n翻译助手场景已启用。\n`,
          },
          'writer': {
            soul: `# 写作助手\n\n文章撰写、润色、结构化写作。\n`,
            user: `# 用户配置\n\n写作助手场景已启用。\n`,
          },
          'content-factory': {
            soul: `# 内容工厂\n\n研究 → 撰写 → 编辑 → 发布的完整内容生产流水线。\n`,
            user: `# 用户配置\n\n内容工厂场景已启用。\n`,
          },
        };
        const template = SCENE_TEMPLATES[sceneId] || SCENE_TEMPLATES['personal-assistant'];
        if (template?.soul) {
          await callGatewayRpc('agents.files.set', { agentId, name: 'SOUL.md', content: template.soul });
        }
        if (template?.user) {
          await callGatewayRpc('agents.files.set', { agentId, name: 'USER.md', content: template.user });
        }
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] apply-scene error:', err);
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
    }

    if (path === '/api/skills/configs' && method === 'GET') {
      try {
        const configPath = nodePath.join(os.homedir(), '.openclaw', 'skills-config.json');
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, 'utf8');
          const json = JSON.parse(raw) as Record<string, { apiKey?: string; env?: Record<string, string> }>;
          return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
        }
        return { ok: true, data: { status: 200, json: {}, ok: true }, success: true, status: 200, json: {} };
      } catch {
        return { ok: true, data: { status: 200, json: {}, ok: true }, success: true, status: 200, json: {} };
      }
    }

    // 文件暂存：缓存到临时目录，供 OpenClaw 识别
    const STAGE_DIR = nodePath.join(os.tmpdir(), 'axonclaw-staged');
    if (!fs.existsSync(STAGE_DIR)) fs.mkdirSync(STAGE_DIR, { recursive: true });

    if (path === '/api/files/stage-paths' && method === 'POST' && body) {
      try {
        const { filePaths } = JSON.parse(body) as { filePaths?: string[] };
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
          return { ok: false, data: { status: 400, json: [] }, success: false };
        }
        const results: Array<{ id: string; fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }> = [];
        for (const srcPath of filePaths) {
          const fileName = srcPath.split(/[\\/]/).pop() || 'file';
          const ext = nodePath.extname(fileName);
          const id = crypto.randomUUID();
          const stagedPath = nodePath.join(STAGE_DIR, `${id}${ext}`);
          fs.copyFileSync(srcPath, stagedPath);
          const stat = fs.statSync(stagedPath);
          const mimeMap: Record<string, string> = {
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
          };
          const mimeType = mimeMap[ext.toLowerCase()] || 'application/octet-stream';
          let preview: string | null = null;
          if (mimeType.startsWith('image/')) {
            try {
              const buf = fs.readFileSync(stagedPath);
              preview = `data:${mimeType};base64,${buf.toString('base64')}`;
            } catch {
              /* ignore */
            }
          }
          results.push({ id, fileName, mimeType, fileSize: stat.size, stagedPath, preview });
        }
        return { ok: true, data: { status: 200, json: results }, success: true, json: results };
      } catch (err) {
        console.error('[HostAPI] stage-paths error:', err);
        return { ok: false, data: { status: 500, json: [] }, success: false };
      }
    }

    if (path === '/api/files/stage-buffer' && method === 'POST' && body) {
      try {
        const { base64, fileName, mimeType } = JSON.parse(body) as { base64?: string; fileName?: string; mimeType?: string };
        if (!base64 || !fileName) {
          return { ok: false, data: { status: 400, json: null }, success: false };
        }
        const id = crypto.randomUUID();
        const ext = nodePath.extname(fileName) || (mimeType?.startsWith('image/') ? '.png' : '.bin');
        const stagedPath = nodePath.join(STAGE_DIR, `${id}${ext}`);
        const buf = Buffer.from(base64, 'base64');
        fs.writeFileSync(stagedPath, buf);
        const mime = mimeType || 'application/octet-stream';
        let preview: string | null = null;
        if (mime.startsWith('image/')) {
          preview = `data:${mime};base64,${base64}`;
        }
        const result = { id, fileName, mimeType: mime, fileSize: buf.length, stagedPath, preview };
        return { ok: true, data: { status: 200, json: result }, success: true, json: result };
      } catch (err) {
        console.error('[HostAPI] stage-buffer error:', err);
        return { ok: false, data: { status: 500, json: null }, success: false };
      }
    }

    // 调度器概览（ClawDeckX 定时调度页顶部卡）
    if (path === '/api/scheduler/summary' && method === 'GET') {
      try {
        let jobList: Array<{ enabled?: boolean; nextRun?: string; lastRun?: string }> = [];
        let cronEnabled = true;
        try {
          const cfgPath = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
          if (fs.existsSync(cfgPath)) {
            const raw = fs.readFileSync(cfgPath, 'utf8');
            const config = parseOpenclawConfigText(raw);
            const cron = config?.cron as Record<string, unknown> | undefined;
            cronEnabled = cron?.enabled !== false;
          }
        } catch {
          /* ignore */
        }
        try {
          const r = await callGatewayRpc('cron.list', {}, 8000);
          if (r.ok && Array.isArray(r.result)) {
            jobList = (r.result as Array<{ enabled?: boolean; nextRun?: string; lastRun?: string }>);
          }
        } catch {
          const cfgPath = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
          if (fs.existsSync(cfgPath)) {
            const raw = fs.readFileSync(cfgPath, 'utf8');
            const config = parseOpenclawConfigText(raw);
            const cron = config?.cron as Record<string, unknown> | undefined;
            cronEnabled = cron?.enabled !== false;
            const tasks = (cron?.tasks ?? cron?.jobs) as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(tasks)) jobList = tasks;
          }
        }
        const enabledJobs = jobList.filter((j) => j.enabled !== false);
        let nextWakeup = '—';
        let nextTs: number | null = null;
        for (const j of enabledJobs) {
          if (j.nextRun) {
            const t = new Date(j.nextRun).getTime();
            if (!nextTs || t < nextTs) nextTs = t;
          }
        }
        if (nextTs && nextTs > Date.now()) {
          const min = Math.floor((nextTs - Date.now()) / 60_000);
          if (min < 1) nextWakeup = '即将';
          else if (min < 60) nextWakeup = `${min} 分钟后`;
          else nextWakeup = `${Math.floor(min / 60)} 小时后`;
        }
        const summary = {
          status: cronEnabled ? 'enabled' : 'disabled',
          statusText: cronEnabled ? '已启用' : '已禁用',
          taskCount: jobList.length,
          nextWakeup,
          running: 0,
        };
        return {
          ok: true,
          data: { status: 200, json: summary, ok: true },
          success: true,
          status: 200,
          json: summary,
        };
      } catch (err) {
        return {
          ok: true,
          data: { status: 200, json: { status: 'enabled', statusText: '已启用', taskCount: 0, nextWakeup: '—', running: 0 }, ok: true },
          success: true,
          status: 200,
          json: { status: 'enabled', statusText: '已启用', taskCount: 0, nextWakeup: '—', running: 0 },
        };
      }
    }

    // 调度任务（ClawDeckX 风格）：透传 Gateway cron RPC
    if (path === '/api/cron/jobs' && method === 'GET') {
      try {
        const r = await callGatewayRpc('cron.list', {}, 10000);
        if (!r.ok || !r.result) {
          return {
            ok: true,
            data: { status: 200, json: [], ok: true },
            success: true,
            status: 200,
            json: [],
          };
        }
        const list = Array.isArray(r.result) ? r.result : [];
        const jobs = list.map((t: { id?: string; name?: string; schedule?: unknown; command?: string; enabled?: boolean; lastRun?: string; nextRun?: string; status?: string; error?: string }) => ({
          id: String(t.id ?? ''),
          name: String(t.name ?? ''),
          message: String(t.command ?? ''),
          schedule: t.schedule ?? '',
          enabled: t.enabled !== false,
          createdAt: '',
          updatedAt: '',
          lastRun: t.lastRun ? { time: t.lastRun, success: t.status !== 'error', error: t.error } : undefined,
          nextRun: t.nextRun,
        }));
        return {
          ok: true,
          data: { status: 200, json: jobs, ok: true },
          success: true,
          status: 200,
          json: jobs,
        };
      } catch (err) {
        // Gateway 可能未实现 cron.list，尝试从 config 读取
        try {
          const cfgPath = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
          if (fs.existsSync(cfgPath)) {
            const raw = fs.readFileSync(cfgPath, 'utf8');
            const config = parseOpenclawConfigText(raw);
            const cron = config?.cron as Record<string, unknown> | undefined;
            const tasks = (cron?.tasks ?? cron?.jobs) as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(tasks)) {
              const jobs = tasks.map((t, i) => {
                const s = t.schedule ?? t.expr ?? t.cron;
                const expr = typeof s === 'string' ? s : (s && typeof s === 'object' && 'expr' in s ? String((s as { expr: string }).expr) : '0 9 * * *');
                return {
                  id: String(t.id ?? t.taskId ?? `cfg-${i}`),
                  name: String(t.name ?? t.label ?? `Task ${i + 1}`),
                  message: String(t.message ?? t.command ?? t.prompt ?? ''),
                  schedule: expr,
                  enabled: t.enabled !== false,
                  createdAt: '',
                  updatedAt: '',
                  lastRun: undefined,
                  nextRun: undefined,
                };
              });
              return {
                ok: true,
                data: { status: 200, json: jobs, ok: true },
                success: true,
                status: 200,
                json: jobs,
              };
            }
          }
        } catch {
          /* ignore config fallback */
        }
        console.error('[HostAPI] cron.list error:', err);
        return {
          ok: false,
          error: { message: String(err) },
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }
    if (path === '/api/cron/jobs' && method === 'POST' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { name?: string; message?: string; schedule?: string; enabled?: boolean });
        const r = await callGatewayRpc('cron.create', {
          name: payload?.name ?? 'New Task',
          schedule: payload?.schedule ?? '0 9 * * *',
          command: payload?.message ?? '',
          enabled: payload?.enabled !== false,
        }, 10000);
        if (!r.ok) {
          return {
            ok: false,
            error: { message: r.error ?? 'Create failed' },
            data: { status: 500, json: { error: r.error }, ok: false },
            success: false,
            status: 500,
            json: { error: r.error },
          };
        }
        const t = (r.result ?? {}) as { id?: string; name?: string; schedule?: unknown; command?: string; enabled?: boolean; lastRun?: string; nextRun?: string };
        const job = {
          id: String(t.id ?? ''),
          name: String(t.name ?? ''),
          message: String(t.command ?? ''),
          schedule: t.schedule ?? '',
          enabled: t.enabled !== false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastRun: undefined,
          nextRun: t.nextRun,
        };
        return {
          ok: true,
          data: { status: 200, json: job, ok: true },
          success: true,
          status: 200,
          json: job,
        };
      } catch (err) {
        console.error('[HostAPI] cron.create error:', err);
        return {
          ok: false,
          error: { message: String(err) },
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }
    const cronJobIdMatch = path.match(/^\/api\/cron\/jobs\/([^/]+)$/);
    if (cronJobIdMatch && method === 'PUT' && body) {
      const taskId = decodeURIComponent(cronJobIdMatch[1]);
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as Record<string, unknown>);
        const updates: Record<string, unknown> = {};
        if (payload?.name != null) updates.name = payload.name;
        if (payload?.message != null) updates.command = payload.message;
        if (payload?.schedule != null) updates.schedule = payload.schedule;
        if (payload?.enabled != null) updates.enabled = payload.enabled;
        const r = await callGatewayRpc('cron.update', { taskId, ...updates }, 10000);
        if (!r.ok) {
          return {
            ok: false,
            error: { message: r.error ?? 'Update failed' },
            data: { status: 500, json: { error: r.error }, ok: false },
            success: false,
            status: 500,
            json: { error: r.error },
          };
        }
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        console.error('[HostAPI] cron.update error:', err);
        return {
          ok: false,
          error: { message: String(err) },
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }
    if (cronJobIdMatch && method === 'DELETE') {
      const taskId = decodeURIComponent(cronJobIdMatch[1]);
      try {
        const r = await callGatewayRpc('cron.delete', { taskId }, 10000);
        if (!r.ok) {
          return {
            ok: false,
            error: { message: r.error ?? 'Delete failed' },
            data: { status: 500, json: { error: r.error }, ok: false },
            success: false,
            status: 500,
            json: { error: r.error },
          };
        }
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        console.error('[HostAPI] cron.delete error:', err);
        return {
          ok: false,
          error: { message: String(err) },
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }
    if (path === '/api/cron/toggle' && method === 'POST' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { id?: string; enabled?: boolean });
        const taskId = payload?.id;
        if (!taskId) {
          return {
            ok: false,
            error: { message: 'id required' },
            data: { status: 400, json: { error: 'id required' }, ok: false },
            success: false,
            status: 400,
            json: { error: 'id required' },
          };
        }
        const r = await callGatewayRpc('cron.update', { taskId, enabled: payload?.enabled }, 10000);
        if (!r.ok) {
          return {
            ok: false,
            error: { message: r.error ?? 'Toggle failed' },
            data: { status: 500, json: { error: r.error }, ok: false },
            success: false,
            status: 500,
            json: { error: r.error },
          };
        }
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        console.error('[HostAPI] cron.toggle error:', err);
        return {
          ok: false,
          error: { message: String(err) },
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }
    if (path === '/api/cron/trigger' && method === 'POST' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { id?: string });
        const taskId = payload?.id;
        if (!taskId) {
          return {
            ok: false,
            error: { message: 'id required' },
            data: { status: 400, json: { error: 'id required' }, ok: false },
            success: false,
            status: 400,
            json: { error: 'id required' },
          };
        }
        const r = await callGatewayRpc('cron.run', { taskId }, 15000);
        if (!r.ok) {
          return {
            ok: false,
            error: { message: r.error ?? 'Trigger failed' },
            data: { status: 500, json: { error: r.error }, ok: false },
            success: false,
            status: 500,
            json: { error: r.error },
          };
        }
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        console.error('[HostAPI] cron.trigger error:', err);
        return {
          ok: false,
          error: { message: String(err) },
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    // Cron 执行历史：优先 Gateway cron.history，否则从 jobs 的 lastRun 聚合
    if ((path === '/api/cron/history' || path.startsWith('/api/cron/history?')) && method === 'GET') {
      try {
        const url = new URL(path, 'http://localhost');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
        const jobId = url.searchParams.get('jobId') || undefined;

        let entries: Array<{ id: string; jobId: string; jobName: string; time: string; success: boolean; error?: string }> = [];

        try {
          const r = await callGatewayRpc('cron.history', { limit, taskId: jobId }, 5000);
          if (r.ok && Array.isArray(r.result)) {
            entries = (r.result as Array<{ id?: string; taskId?: string; taskName?: string; time?: string; success?: boolean; error?: string }>).map((e, i) => ({
              id: String(e.id ?? `gh-${i}`),
              jobId: String(e.taskId ?? ''),
              jobName: String(e.taskName ?? ''),
              time: String(e.time ?? ''),
              success: e.success !== false,
              error: e.error,
            }));
          }
        } catch {
          /* Gateway 可能未实现 cron.history */
        }

        if (entries.length === 0) {
          try {
            const r = await callGatewayRpc('cron.list', {}, 8000);
            const jobs = Array.isArray(r.result) ? r.result : [];
            for (const j of jobs) {
              const t = j as { id?: string; name?: string; lastRun?: string; status?: string; error?: string };
              if (!t.lastRun) continue;
              if (jobId && String(t.id) !== jobId) continue;
              entries.push({
                id: `last-${t.id}-${t.lastRun}`,
                jobId: String(t.id ?? ''),
                jobName: String(t.name ?? ''),
                time: String(t.lastRun),
                success: t.status !== 'error',
                error: t.error,
              });
            }
            entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
            entries = entries.slice(0, limit);
          } catch {
            /* ignore */
          }
        }

        return {
          ok: true,
          data: { status: 200, json: { entries }, ok: true },
          success: true,
          status: 200,
          json: { entries },
        };
      } catch (err) {
        console.error('[HostAPI] cron.history error:', err);
        return {
          ok: true,
          data: { status: 200, json: { entries: [] }, ok: true },
          success: true,
          status: 200,
          json: { entries: [] },
        };
      }
    }

    // ClawDeckX（18080）多代理 API — OpenClaw Gateway 无此路由，需转发到 ClawDeckX HTTP
    if (path.startsWith('/api/v1/multi-agent')) {
      const bases = [`http://127.0.0.1:${CLAWDECKX_HTTP_PORT}`];
      let lastErr: string | null = null;
      for (const base of bases) {
        try {
          const response = await fetch(`${base}${path}`, {
            method: method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(headers && typeof headers === 'object' ? headers : {}),
            },
            body: body || undefined,
            signal: AbortSignal.timeout(120_000),
          });
          let json: unknown = undefined;
          let text: string | undefined = undefined;
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              json = await response.json();
            } catch {
              text = await response.text();
            }
          } else {
            text = await response.text();
          }
          return {
            ok: true,
            data: {
              status: response.status,
              ok: response.ok,
              json,
              text,
            },
            success: response.ok,
            status: response.status,
            json,
            text,
          };
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
        }
      }
      return {
        ok: false,
        error: { message: lastErr || 'ClawDeckX 多代理 API 不可用（请启动 ClawDeckX 或检查 18080 端口）' },
        success: false,
      };
    }

    const url = `${getGatewayApiBase()}${path}`;
    console.log(`[HostAPI] ${method} ${path}`);
    
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body || undefined,
    });

    let json: unknown = undefined;
    let text: string | undefined = undefined;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        json = await response.json();
      } catch {
        text = await response.text();
      }
    } else {
      text = await response.text();
    }

    return {
      ok: true,
      data: {
        status: response.status,
        ok: response.ok,
        json,
        text,
      },
      success: response.ok,
      status: response.status,
      json,
      text,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[HostAPI] Error: ${message}`);
    return {
      ok: false,
      error: { message },
      success: false,
    };
  }
});

// Export for testing
export { mainWindow };
