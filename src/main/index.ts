// AxonClawX - Main Process Entry Point
// Electron Main Process

import { app, BrowserWindow, ipcMain, shell, clipboard, nativeImage, session, dialog } from 'electron';
import { createHash, randomBytes } from 'crypto';
import * as http from 'http';
import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'http';

/** 用户可见的应用名（菜单栏、about、默认窗口标题）。须在 app ready 之前调用 setName。 */
const APP_DISPLAY_NAME = 'AxonClawX';
app.setName(APP_DISPLAY_NAME);

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
  repairGatewayOperatorScopes,
  relaxGatewayLocalAuth,
  type GatewayStatus,
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
import { buildSignedGatewayDevice } from '../gateway/device-auth';
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
  getSetting,
  setSetting,
  listTaskRuns,
  upsertTaskRun,
  deleteTaskRun,
  deleteFinishedTaskRuns,
  loadBootstrapConfig,
  saveBootstrapConfig,
  getConfigFilePath,
  getDefaultConfig,
} from '../database';

// Global window reference
let mainWindow: BrowserWindow | null = null;
let codexAuthWindow: BrowserWindow | null = null;
const CODEX_AUTH_PARTITION_PERSIST = 'persist:codex-auth';
let currentCodexAuthPartition = CODEX_AUTH_PARTITION_PERSIST;
type PendingProviderOAuthState = {
  provider: string;
  accountId: string;
  label?: string;
  mode?: 'legacy-session' | 'openai-codex-oauth';
  oauthState?: string;
  pkceVerifier?: string;
  authorizationUrl?: string;
  startedAt?: number;
};

let pendingProviderOAuth: PendingProviderOAuthState | null = null;
let pendingProviderOAuthWatcher: NodeJS.Timeout | null = null;
let pendingProviderOAuthChecking = false;
let pendingProviderOAuthCallbackServer: HttpServer | null = null;
let appLocked = false;

const LOCK_AUTH_USERNAME_KEY = 'auth.lock.username';
const LOCK_AUTH_PASSWORD_HASH_KEY = 'auth.lock.password_sha256';
const LOCK_DEFAULT_USERNAME = 'admin';
const LOCK_DEFAULT_PASSWORD = '123456';
const GW_MODE_KEY = 'gateway.connection.mode';
const GW_REMOTE_PROTOCOL_KEY = 'gateway.remote.protocol';
const GW_REMOTE_HOST_KEY = 'gateway.remote.host';
const GW_REMOTE_PORT_KEY = 'gateway.remote.port';
const GW_REMOTE_TOKEN_KEY = 'gateway.remote.token';

function pushGatewayRuntimeLog(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
  safeSendToRenderer('app:gateway-log', {
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    level: level.toUpperCase(),
    agent: 'Gateway',
    message,
  });
}

function readRecentGatewayLogLines(limit = 120): string[] {
  const dirs = [
    process.platform === 'win32' ? path.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw',
    path.join(os.homedir(), '.openclaw', 'logs'),
  ];
  const collected: Array<{ mtime: number; lines: string[] }> = [];

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir)
        .filter((f) => f.endsWith('.log'))
        .map((f) => path.join(dir, f));
      for (const full of files) {
        try {
          const st = fs.statSync(full);
          if (!st.isFile()) continue;
          const lines = fs.readFileSync(full, 'utf8')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(-limit);
          collected.push({ mtime: st.mtimeMs, lines });
        } catch {
          // ignore individual file failures
        }
      }
    } catch {
      // ignore directory failures
    }
  }

  if (collected.length === 0) return [];
  collected.sort((a, b) => b.mtime - a.mtime);
  return collected[0].lines.slice(-limit);
}

async function startGatewayWithSelfHeal(): Promise<GatewayStatus & {
  startSuccess: boolean;
  selfHealTried?: boolean;
  selfHealSucceeded?: boolean;
  diagnostics?: string[];
  logTail?: string[];
}> {
  try {
    await startGateway();
    let probe = await callGatewayRpcWithRetry('sessions.list', {}, 12000);
    if (probe.ok) {
      return { ...getGatewayStatus(), startSuccess: true };
    }
    const probeError = String(probe.error || '');
    if (!/missing scope|device-required|unauthorized|auth/i.test(probeError)) {
      return { ...getGatewayStatus(), startSuccess: true };
    }
    const diagnostics: string[] = [`startup probe failed: ${probeError}`];
    pushGatewayRuntimeLog('warn', `Gateway probe failed after startup: ${probeError}`);
    const repairedScopes = repairGatewayOperatorScopes();
    diagnostics.push(`scope repair after probe: changed=${repairedScopes.changed} home=${repairedScopes.runtimeHome}`);
    const relaxedAuth = relaxGatewayLocalAuth();
    diagnostics.push(`local auth relax after probe: changed=${relaxedAuth.changed} home=${relaxedAuth.runtimeHome}`);
    try {
      await stopGateway();
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
    await startGateway();
    probe = await callGatewayRpcWithRetry('sessions.list', {}, 12000);
    if (!probe.ok) {
      const finalErr = String(probe.error || 'gateway probe failed after self-heal');
      const logTail = readRecentGatewayLogLines(120);
      diagnostics.push(`probe after self-heal failed: ${finalErr}`);
      return {
        ...getGatewayStatus(),
        state: 'error',
        error: finalErr,
        startSuccess: false,
        selfHealTried: true,
        selfHealSucceeded: false,
        diagnostics,
        logTail,
      };
    }
    diagnostics.push('probe after self-heal succeeded');
    return {
      ...getGatewayStatus(),
      startSuccess: true,
      selfHealTried: true,
      selfHealSucceeded: true,
      diagnostics,
    };
  } catch (error) {
    const firstError = String(error);
    const diagnostics: string[] = [`initial start failed: ${firstError}`];
    pushGatewayRuntimeLog('error', `Start failed: ${firstError}`);

    let selfHealSucceeded = false;
    try {
      sanitizeSetupCompleteKeysInConfig();
      diagnostics.push('applied config sanitizer (setupComplete cleanup)');

      const repaired = repairGatewayOperatorScopes();
      diagnostics.push(`operator scope repair: changed=${repaired.changed} home=${repaired.runtimeHome}`);

      try {
        await stopGateway();
        diagnostics.push('stopped existing gateway process before retry');
      } catch (stopErr) {
        diagnostics.push(`stop before retry skipped: ${String(stopErr)}`);
      }

      await new Promise((r) => setTimeout(r, 500));
      await startGateway();
      selfHealSucceeded = true;
      diagnostics.push('self-heal restart succeeded');
      pushGatewayRuntimeLog('info', 'Gateway self-heal succeeded after startup failure');
      return {
        ...getGatewayStatus(),
        startSuccess: true,
        selfHealTried: true,
        selfHealSucceeded: true,
        diagnostics,
      };
    } catch (healErr) {
      const finalError = String(healErr);
      diagnostics.push(`self-heal retry failed: ${finalError}`);
      const logTail = readRecentGatewayLogLines(120);
      if (logTail.length > 0) {
        pushGatewayRuntimeLog('warn', `Startup failed. Recent log tail lines: ${logTail.length}`);
        for (const line of logTail.slice(-40)) {
          pushGatewayRuntimeLog('debug', line);
        }
      }
      return {
        ...getGatewayStatus(),
        state: 'error',
        error: finalError,
        startSuccess: false,
        selfHealTried: true,
        selfHealSucceeded,
        diagnostics,
        logTail,
      };
    }
  }
}

function isWriteRpcMethod(method: string): boolean {
  const m = String(method || '').trim();
  if (!m) return false;
  if (m === 'chat.send' || m === 'chat.abort') return true;
  if (m.startsWith('agents.')) return true;
  if (m.startsWith('sessions.') && m !== 'sessions.list' && m !== 'sessions.history') return true;
  if (m.startsWith('cron.') && m !== 'cron.list' && m !== 'cron.history') return true;
  if (m.startsWith('channels.') || m.startsWith('providers.') || m.startsWith('skills.')) return true;
  return false;
}

function normalizeModelAlias(rawValue: string): string {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';

  const normalizeLeaf = (leaf: string): string => {
    let next = String(leaf || '').trim().replace(/cdoex/gi, 'codex');
    if (/^\d+(?:\.\d+)?-codex$/i.test(next)) {
      next = `gpt-${next}`;
    }
    if (/^gpt-5\.4$/i.test(next)) {
      next = 'gpt-5.4-mini';
    }
    return next;
  };

  if (raw.includes('/')) {
    const [provider, ...rest] = raw.split('/');
    if (!provider || rest.length === 0) return normalizeLeaf(raw);
    const leaf = normalizeLeaf(rest.join('/'));
    const normalizedProvider = normalizeProviderAlias(provider);
    const providerForModel = normalizedProvider.toLowerCase() === 'openai' && /^gpt-5\.(?:3-codex|4-mini|5)$/i.test(leaf)
      ? 'openai-codex'
      : normalizedProvider;
    return `${providerForModel || provider}/${leaf}`;
  }
  return normalizeLeaf(raw);
}

function normalizeModelCommandMessage(rawMessage: string): string {
  const text = String(rawMessage || '').trim();
  if (!text.toLowerCase().startsWith('/model ')) return rawMessage;
  const modelRaw = text.slice('/model '.length).trim();
  const normalizedModel = normalizeModelAlias(modelRaw);
  if (!normalizedModel || normalizedModel === modelRaw) return rawMessage;
  return `/model ${normalizedModel}`;
}

function isDeepSeekV4ModelRef(model?: unknown, provider?: unknown): boolean {
  const modelValue = String(model || '').trim().toLowerCase();
  const providerValue = String(provider || '').trim().toLowerCase();
  if (!modelValue) return false;
  if (modelValue === 'deepseek/deepseek-v4-pro' || modelValue === 'deepseek/deepseek-v4-flash') return true;
  if (providerValue === 'deepseek' && (modelValue === 'deepseek-v4-pro' || modelValue === 'deepseek-v4-flash')) return true;
  return modelValue === 'deepseek-v4-pro' || modelValue === 'deepseek-v4-flash';
}

function readGatewaySessionModelInfo(value: unknown): { model: string; provider: string; thinkingLevel: string } {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    model: String(record.model || record.modelOverride || '').trim(),
    provider: String(record.modelProvider || record.providerOverride || '').trim(),
    thinkingLevel: String(record.thinkingLevel || '').trim(),
  };
}

function getGatewayRpcTimeoutMs(method: string): number {
  const rpcMethod = String(method || '').trim();
  if (rpcMethod === 'chat.send') return 120_000;
  if (rpcMethod === 'sessions.patch' || rpcMethod === 'sessions.compact') return 120_000;
  if (rpcMethod === 'chat.history' || rpcMethod === 'sessions.history' || rpcMethod === 'sessions.preview') return 60_000;
  if (rpcMethod === 'sessions.list') return 30_000;
  return 30_000;
}

async function ensureDeepSeekV4ThinkingOffForChatSend(params: unknown): Promise<void> {
  const payload = params && typeof params === 'object' ? params as Record<string, unknown> : {};
  const sessionKey = String(payload.sessionKey || '').trim();
  const message = String(payload.message || '').trim();
  if (!sessionKey || message.startsWith('/')) return;

  try {
    // Do not call sessions.list here: under session-file lock contention it can
    // take minutes and block every chat.send. Renderer paths already know the
    // active session model and patch DeepSeek V4 before sending.
    const current = readGatewaySessionModelInfo(payload);
    const model = current.model;
    const provider = current.provider;
    const thinkingLevel = current.thinkingLevel;
    if (!model && !provider) return;
    if (!isDeepSeekV4ModelRef(model, provider) || thinkingLevel === 'off') return;

    console.log(`[GatewayRPC] DeepSeek V4 detected for ${sessionKey}; forcing thinkingLevel=off before chat.send`);
    await callGatewayRpcWithRetry('sessions.patch', { key: sessionKey, thinkingLevel: 'off' }, 15_000);
  } catch (err) {
    console.warn('[GatewayRPC] DeepSeek V4 thinking preflight failed; continuing chat.send:', err);
  }
}

async function normalizeChatSendParams(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const normalized = { ...params };
  const messageRaw = typeof normalized.message === 'string' ? normalized.message : '';
  const normalizedMessage = normalizeModelCommandMessage(messageRaw);
  if (normalizedMessage !== messageRaw) {
    normalized.message = normalizedMessage;
  }

  await ensureDeepSeekV4ThinkingOffForChatSend(normalized);

  // `model`, `modelProvider`, and `thinkingLevel` are AxonClawX-side hints used
  // for the DeepSeek V4 preflight above. OpenClaw chat.send rejects unknown root
  // keys, so never forward those metadata fields to Gateway.
  delete normalized.model;
  delete normalized.modelProvider;
  delete normalized.providerOverride;
  delete normalized.modelOverride;
  delete normalized.thinkingLevel;
  return normalized;
}

function allocEphemeralCodexAuthPartition(): string {
  return `codex-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentCodexAuthSession() {
  return session.fromPartition(currentCodexAuthPartition);
}

async function clearCodexAuthSession(partitionName?: string): Promise<void> {
  const authSession = session.fromPartition(partitionName || currentCodexAuthPartition);
  try {
    await authSession.clearStorageData();
  } catch (err) {
    console.warn('[OAuth] clearStorageData failed:', err);
  }
  try {
    await authSession.clearCache();
  } catch {
    // ignore cache clear errors
  }
  try {
    const cookies = await authSession.cookies.get({});
    for (const cookie of cookies) {
      const domain = String(cookie.domain || '').replace(/^\./, '').trim();
      if (!domain) continue;
      const scheme = cookie.secure ? 'https' : 'http';
      const cookiePath = String(cookie.path || '/').startsWith('/') ? String(cookie.path || '/') : '/';
      const url = `${scheme}://${domain}${cookiePath}`;
      try {
        await authSession.cookies.remove(url, cookie.name);
      } catch {
        // ignore per-cookie delete errors
      }
    }
  } catch (err) {
    console.warn('[OAuth] clear cookies failed:', err);
  }
}

const OPENAI_CODEX_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const OPENAI_CODEX_AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize';
const OPENAI_CODEX_TOKEN_URL = 'https://auth.openai.com/oauth/token';
const OPENAI_CODEX_REDIRECT_URI = 'http://localhost:1455/auth/callback';
const OPENAI_CODEX_SCOPE = 'openid profile email offline_access';
const OPENAI_CODEX_JWT_CLAIM_PATH = 'https://api.openai.com/auth';

function toBase64Url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64UrlToUtf8(input: string): string | null {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function buildOpenAiCodexPkce(): { verifier: string; challenge: string } {
  const verifier = toBase64Url(randomBytes(32));
  const challenge = toBase64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function buildOpenAiCodexAuthorizeUrl(params: { state: string; challenge: string; originator?: string }): string {
  const url = new URL(OPENAI_CODEX_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', OPENAI_CODEX_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', OPENAI_CODEX_REDIRECT_URI);
  url.searchParams.set('scope', OPENAI_CODEX_SCOPE);
  url.searchParams.set('code_challenge', params.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', params.state);
  url.searchParams.set('id_token_add_organizations', 'true');
  url.searchParams.set('codex_cli_simplified_flow', 'true');
  url.searchParams.set('originator', params.originator || 'pi');
  return url.toString();
}

function parseOpenAiOAuthCodeInput(input: string): { code?: string; state?: string } {
  const value = String(input || '').trim();
  if (!value) return {};

  try {
    const parsed = new URL(value);
    return {
      code: parsed.searchParams.get('code') || undefined,
      state: parsed.searchParams.get('state') || undefined,
    };
  } catch {
    // ignore
  }

  if (value.includes('#')) {
    const [code, state] = value.split('#', 2);
    return { code: code?.trim(), state: state?.trim() };
  }

  if (value.includes('code=')) {
    const search = value.startsWith('?') ? value.slice(1) : value;
    const params = new URLSearchParams(search);
    return {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
    };
  }

  return { code: value };
}

function extractOpenAiCodexAccountIdFromToken(token: string): string | null {
  try {
    const value = String(token || '').trim();
    const parts = value.split('.');
    if (parts.length !== 3) return null;
    const payloadRaw = decodeBase64UrlToUtf8(parts[1] || '');
    if (!payloadRaw) return null;
    const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    const authClaimRaw = payload[OPENAI_CODEX_JWT_CLAIM_PATH];
    const authClaim = (authClaimRaw && typeof authClaimRaw === 'object' && !Array.isArray(authClaimRaw))
      ? (authClaimRaw as Record<string, unknown>)
      : null;
    const accountId = String(
      authClaim?.chatgpt_account_id
      || authClaim?.account_id
      || payload.chatgpt_account_id
      || payload.account_id
      || payload.user_id
      || payload.sub
      || '',
    ).trim();
    return accountId || null;
  } catch {
    return null;
  }
}

function extractOpenAiCodexEmailFromToken(token: string): string | null {
  try {
    const value = String(token || '').trim();
    const parts = value.split('.');
    if (parts.length !== 3) return null;
    const payloadRaw = decodeBase64UrlToUtf8(parts[1] || '');
    if (!payloadRaw) return null;
    const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    const email = String(payload.email || '').trim();
    return email || null;
  } catch {
    return null;
  }
}

function stopPendingProviderOAuthCallbackServer(): void {
  if (!pendingProviderOAuthCallbackServer) return;
  try {
    pendingProviderOAuthCallbackServer.close();
  } catch {
    // ignore close errors
  }
  pendingProviderOAuthCallbackServer = null;
}

function ensureOpenAiCodexOAuthProfile(params: {
  accessToken: string;
  refreshToken?: string | null;
  expiresInSec?: number | null;
  email?: string | null;
  accountId?: string | null;
}): { profileId: string; expiresAt: number } {
  const profileId = 'openai-codex:default';
  const token = String(params.accessToken || '').trim();
  if (!token) throw new Error('Missing OpenAI Codex access token');

  const authPath = getMainAgentAuthProfilesPath();
  const dir = nodePath.dirname(authPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let doc: Record<string, unknown> = {};
  try {
    if (fs.existsSync(authPath)) {
      doc = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
    }
  } catch {
    doc = {};
  }

  const profiles = ensureRecord(doc.profiles);
  const order = ensureRecord(doc.order);
  const lastGood = ensureRecord(doc.lastGood);
  const usageStats = ensureRecord(doc.usageStats);
  const expiresIn = Number.isFinite(Number(params.expiresInSec)) ? Number(params.expiresInSec) : 3600;
  const expiresAt = Date.now() + Math.max(60, Math.floor(expiresIn)) * 1000;

  const oauthProfile: Record<string, unknown> = {
    type: 'oauth',
    provider: 'openai-codex',
    access: token,
    expires: expiresAt,
  };
  const refresh = String(params.refreshToken || '').trim();
  if (refresh) oauthProfile.refresh = refresh;
  const accountId = String(params.accountId || '').trim();
  if (accountId) oauthProfile.accountId = accountId;
  const email = String(params.email || '').trim();
  if (email) oauthProfile.email = email;

  profiles[profileId] = oauthProfile;
  const currentOrder = Array.isArray(order['openai-codex'])
    ? (order['openai-codex'] as unknown[]).map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  order['openai-codex'] = [profileId, ...currentOrder.filter((id) => id !== profileId)];
  lastGood['openai-codex'] = profileId;
  usageStats[profileId] = {
    errorCount: 0,
    lastUsed: Date.now(),
  };

  const next = {
    ...doc,
    version: 1,
    profiles,
    order,
    lastGood,
    usageStats,
  };
  fs.writeFileSync(authPath, JSON.stringify(next, null, 2), 'utf8');
  return { profileId, expiresAt };
}

function readOpenAiCodexOAuthProfileState(): {
  success: boolean;
  accessToken: string | null;
  status: number;
  loginInfo: { loggedIn: boolean; email?: string; userId?: string };
  error?: string;
} {
  try {
    const authPath = getMainAgentAuthProfilesPath();
    if (!fs.existsSync(authPath)) {
      return {
        success: false,
        accessToken: null,
        status: 404,
        loginInfo: { loggedIn: false },
        error: 'No OpenAI OAuth profile found',
      };
    }

    const doc = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
    const profiles = ensureRecord(doc.profiles);
    const order = ensureRecord(doc.order);
    const orderedIds = Array.isArray(order['openai-codex'])
      ? (order['openai-codex'] as unknown[]).map((v) => String(v || '').trim()).filter(Boolean)
      : [];

    const candidateIds = Array.from(new Set([
      ...orderedIds,
      ...Object.keys(profiles),
    ]));

    for (const profileId of candidateIds) {
      const profile = ensureRecord(profiles[profileId]);
      const provider = String(profile.provider || '').trim().toLowerCase();
      if (provider !== 'openai-codex' && provider !== 'openai') continue;
      if (String(profile.type || '').trim() !== 'oauth') continue;
      const accessToken = String(profile.access || '').trim();
      if (!accessToken) continue;
      const accountIdFromToken = extractOpenAiCodexAccountIdFromToken(accessToken);

      const expires = Number(profile.expires);
      if (Number.isFinite(expires) && expires > 0 && Date.now() >= expires) {
        return {
          success: false,
          accessToken: null,
          status: 401,
          loginInfo: { loggedIn: false },
          error: 'OpenAI OAuth token expired. Please login again.',
        };
      }

      const email = String(profile.email || '').trim();
      const accountId = String(profile.accountId || '').trim();
      const userId = accountId || accountIdFromToken || undefined;
      return {
        success: true,
        accessToken,
        status: 200,
        loginInfo: {
          loggedIn: true,
          ...(email ? { email } : {}),
          ...(userId ? { userId } : {}),
        },
      };
    }

    return {
      success: false,
      accessToken: null,
      status: 404,
      loginInfo: { loggedIn: false },
      error: 'No OpenAI OAuth profile found',
    };
  } catch (err) {
    return {
      success: false,
      accessToken: null,
      status: 500,
      loginInfo: { loggedIn: false },
      error: String(err),
    };
  }
}

function ensureOpenAiCodexProviderConfig(params?: {
  accountId?: string | null;
  label?: string | null;
  makeDefault?: boolean;
}): { providerId: string; primaryModel: string; fallbackModels: string[] } {
  const cfg = readOpenclawConfig();
  const models = ensureRecord(cfg.models);
  const providers = ensureRecord(models.providers);

  const requested = String(params?.accountId || '').trim();
  const providerId = requested && requested.toLowerCase().includes('codex')
    ? requested
    : 'openai-codex';
  const nowIso = new Date().toISOString();
  const existing = ensureRecord(providers[providerId]);

  const modelEntries = mergeOpenAiCodexModels(existing.models);

  const nextProvider: Record<string, unknown> = {
    ...existing,
    accountId: providerId,
    vendorId: 'openai',
    label: String(params?.label || existing.label || 'OpenAI Codex').trim() || 'OpenAI Codex',
    authMode: 'oauth_browser',
    baseUrl: 'https://chatgpt.com/backend-api',
    api: 'openai-codex-responses',
    apiProtocol: 'openai-codex-responses',
    model: 'gpt-5.4-mini',
    models: modelEntries,
    enabled: existing.enabled !== false,
    createdAt: existing.createdAt || nowIso,
    updatedAt: nowIso,
  };
  if ('apiKey' in nextProvider) delete nextProvider.apiKey;
  providers[providerId] = nextProvider;
  models.providers = providers;
  if (!models.mode) models.mode = 'merge';
  cfg.models = models;

  const agents = ensureRecord(cfg.agents);
  const defaults = ensureRecord(agents.defaults);
  const defaultModels = ensureRecord(defaults.models);
  for (const model of OPENAI_CODEX_MODEL_CATALOG) {
    const modelRef = `${providerId}/${model.id}`;
    defaultModels[modelRef] = {
      ...ensureRecord(defaultModels[modelRef]),
      alias: model.name,
    };
  }
  defaults.models = defaultModels;
  const modelCfg = ensureRecord(defaults.model);
  const primaryModel = `${providerId}/gpt-5.4-mini`;
  const fallbackFromProvider = `${providerId}/gpt-5.3-codex`;
  const fallbackList = Array.isArray(modelCfg.fallbacks)
    ? (modelCfg.fallbacks as unknown[]).map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  modelCfg.primary = primaryModel;
  modelCfg.fallbacks = Array.from(new Set([fallbackFromProvider, ...fallbackList.filter((x) => x !== primaryModel)]));
  defaults.model = modelCfg;
  agents.defaults = defaults;
  cfg.agents = agents;

  cfg.meta = {
    ...ensureRecord(cfg.meta),
    lastTouchedAt: nowIso,
  };
  writeOpenclawConfig(cfg);

  if (params?.makeDefault !== false) {
    writeDefaultProviderAccountId(providerId);
  }

  return {
    providerId,
    primaryModel,
    fallbackModels: Array.isArray(modelCfg.fallbacks) ? (modelCfg.fallbacks as string[]) : [fallbackFromProvider],
  };
}

async function exchangeOpenAiCodexAuthorizationCode(params: {
  code: string;
  verifier: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const formatOAuthErrorMessage = (
    payload: Record<string, unknown> | null,
    rawText: string,
    status: number,
  ): string => {
    const directDescription = String(payload?.error_description || '').trim();
    if (directDescription) return directDescription;

    const directError = payload?.error;
    if (typeof directError === 'string' && directError.trim()) {
      return directError.trim();
    }
    if (directError && typeof directError === 'object' && !Array.isArray(directError)) {
      const errorObj = directError as Record<string, unknown>;
      const message = String(errorObj.message || errorObj.error_description || '').trim();
      const code = String(errorObj.code || errorObj.type || errorObj.error || '').trim();
      const requestId = String(
        errorObj.request_id
          || errorObj.requestId
          || errorObj['request-id']
          || '',
      ).trim();
      const parts = [message || code || 'OAuth token exchange failed'];
      if (code && message && code !== message) parts.push(`code=${code}`);
      if (requestId) parts.push(`requestId=${requestId}`);
      return parts.join(' | ');
    }

    const fromTopLevelRequestId = String(
      payload?.request_id
      || payload?.requestId
      || payload?.['request-id']
      || '',
    ).trim();
    if (fromTopLevelRequestId) {
      return `requestId=${fromTopLevelRequestId}`;
    }

    const compactRaw = String(rawText || '').trim();
    if (compactRaw) {
      if (compactRaw.length > 1000) return `${compactRaw.slice(0, 1000)}…`;
      return compactRaw;
    }
    return `HTTP ${status}`;
  };

  const requestBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: OPENAI_CODEX_OAUTH_CLIENT_ID,
    code: params.code,
    code_verifier: params.verifier,
    redirect_uri: OPENAI_CODEX_REDIRECT_URI,
  });

  let response: Response;
  let networkMode: 'electron-session' | 'node-fetch' = 'node-fetch';
  try {
    const electronFetch = session.defaultSession?.fetch;
    if (typeof electronFetch === 'function') {
      networkMode = 'electron-session';
      response = await electronFetch(OPENAI_CODEX_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: requestBody,
      });
    } else {
      response = await fetch(OPENAI_CODEX_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: requestBody,
      });
    }
  } catch (err) {
    networkMode = 'node-fetch';
    response = await fetch(OPENAI_CODEX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: requestBody,
    });
    console.warn('[OAuth] electron session fetch failed, fallback to node fetch:', err);
  }

  const rawText = await response.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = formatOAuthErrorMessage(payload, rawText, response.status);
    let proxyInfo = '';
    try {
      const resolvedProxy = await session.defaultSession?.resolveProxy?.(OPENAI_CODEX_TOKEN_URL);
      proxyInfo = resolvedProxy ? ` proxy=${resolvedProxy}` : '';
    } catch {
      proxyInfo = '';
    }
    console.warn('[OAuth] token exchange failed:', {
      status: response.status,
      networkMode,
      message,
      payload,
      proxyInfo,
    });
    throw new Error(`OpenAI OAuth token exchange failed: ${message}${proxyInfo ? ` |${proxyInfo.trim()}` : ''}`);
  }

  const accessToken = String(payload?.access_token || '').trim();
  const refreshToken = String(payload?.refresh_token || '').trim();
  const expiresInRaw = Number(payload?.expires_in);
  const expiresIn = Number.isFinite(expiresInRaw) ? expiresInRaw : 3600;
  if (!accessToken || !refreshToken) {
    throw new Error('OpenAI OAuth token response missing access_token or refresh_token');
  }

  return { accessToken, refreshToken, expiresIn };
}

async function finalizePendingOpenAiOAuthByCode(
  codeInput: string,
  source: 'manual' | 'callback',
): Promise<{
  provider: string;
  accountId: string;
  loginInfo: { loggedIn: true; email?: string; userId?: string };
  accessToken: string;
}> {
  const pending = pendingProviderOAuth;
  if (!pending || pending.provider !== 'openai' || pending.mode !== 'openai-codex-oauth') {
    throw new Error('No pending OpenAI OAuth flow');
  }
  const verifier = String(pending.pkceVerifier || '').trim();
  const expectedState = String(pending.oauthState || '').trim();
  if (!verifier || !expectedState) {
    throw new Error('OpenAI OAuth state is invalid. Please restart login.');
  }

  const parsed = parseOpenAiOAuthCodeInput(codeInput);
  const code = String(parsed.code || '').trim();
  const incomingState = String(parsed.state || '').trim();
  if (!code) {
    throw new Error('Missing OAuth authorization code');
  }
  if (incomingState && incomingState !== expectedState) {
    throw new Error('OAuth state mismatch. Please restart login.');
  }

  const exchanged = await exchangeOpenAiCodexAuthorizationCode({
    code,
    verifier,
  });
  const accountIdFromToken = extractOpenAiCodexAccountIdFromToken(exchanged.accessToken);
  const email = extractOpenAiCodexEmailFromToken(exchanged.accessToken);
  const userId = accountIdFromToken || undefined;

  ensureOpenAiCodexOAuthProfile({
    accessToken: exchanged.accessToken,
    refreshToken: exchanged.refreshToken,
    expiresInSec: exchanged.expiresIn,
    email,
    accountId: accountIdFromToken,
  });
  const providerCfg = ensureOpenAiCodexProviderConfig({
    accountId: pending.accountId,
    label: pending.label,
    makeDefault: true,
  });

  const successPayload = {
    provider: 'openai',
    accountId: providerCfg.providerId,
    loginInfo: {
      loggedIn: true as const,
      ...(email ? { email } : {}),
      ...(userId ? { userId } : {}),
    },
    accessToken: exchanged.accessToken,
  };

  pendingProviderOAuth = null;
  stopPendingProviderOAuthWatcher();
  if (source === 'manual') {
    stopPendingProviderOAuthCallbackServer();
  }
  safeSendToRenderer('oauth:success', successPayload);
  return successPayload;
}

function startPendingProviderOAuthCallbackServer(): void {
  stopPendingProviderOAuthCallbackServer();
  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url || '', 'http://localhost:1455');
      if (url.pathname !== '/auth/callback') {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const pending = pendingProviderOAuth;
      if (!pending || pending.provider !== 'openai' || pending.mode !== 'openai-codex-oauth') {
        res.statusCode = 410;
        res.end('OAuth session expired');
        return;
      }

      const expectedState = String(pending.oauthState || '').trim();
      const state = String(url.searchParams.get('state') || '').trim();
      const code = String(url.searchParams.get('code') || '').trim();
      if (!code) {
        res.statusCode = 400;
        res.end('Missing authorization code');
        return;
      }
      if (!expectedState || !state || state !== expectedState) {
        res.statusCode = 400;
        res.end('State mismatch');
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><html><body><p>Authentication successful. Return to AxonClawX.</p></body></html>');

      void finalizePendingOpenAiOAuthByCode(code, 'callback').catch((err) => {
        safeSendToRenderer('oauth:error', { message: String(err) });
      }).finally(() => {
        stopPendingProviderOAuthCallbackServer();
      });
    } catch (err) {
      res.statusCode = 500;
      res.end('OAuth callback error');
      safeSendToRenderer('oauth:error', { message: String(err) });
    }
  });

  server.on('error', (err) => {
    console.warn('[OAuth] callback server failed:', err);
    safeSendToRenderer('oauth:error', { message: `OAuth callback server error: ${String(err)}` });
  });

  // Do not force IPv4-only host here; allow localhost to resolve via IPv4/IPv6.
  server.listen(1455);
  pendingProviderOAuthCallbackServer = server;
}

async function openCodexAuthWindow(options?: { forceReauth?: boolean; url?: string; title?: string }): Promise<void> {
  const forceReauth = Boolean(options?.forceReauth);

  if (forceReauth) {
    if (codexAuthWindow && !codexAuthWindow.isDestroyed()) {
      codexAuthWindow.destroy();
      codexAuthWindow = null;
    }
    const previousPartition = currentCodexAuthPartition;
    currentCodexAuthPartition = allocEphemeralCodexAuthPartition();
    await clearCodexAuthSession(previousPartition).catch(() => {});
    await clearCodexAuthSession(CODEX_AUTH_PARTITION_PERSIST).catch(() => {});
    await clearCodexAuthSession(currentCodexAuthPartition).catch(() => {});
  }

  const targetUrl = String(options?.url || '').trim()
    || (forceReauth ? 'https://chatgpt.com/auth/login' : 'https://chatgpt.com');

  if (codexAuthWindow && !codexAuthWindow.isDestroyed()) {
    codexAuthWindow.focus();
    void codexAuthWindow.loadURL(targetUrl).catch((err) => {
      console.warn('[OAuth] failed to navigate auth window:', err);
    });
    return;
  }

  codexAuthWindow = new BrowserWindow({
    width: 1180,
    height: 840,
    title: options?.title || 'OpenAI 登录',
    autoHideMenuBar: true,
    webPreferences: {
      partition: currentCodexAuthPartition,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  codexAuthWindow.on('closed', () => {
    codexAuthWindow = null;
  });

  void codexAuthWindow.loadURL(targetUrl).catch((err) => {
    console.warn('[OAuth] failed to load login page:', err);
  });
}

async function openOpenAiAuthorizationUrl(authorizationUrl: string, forceReauth = false): Promise<'external' | 'embedded'> {
  const url = String(authorizationUrl || '').trim();
  if (!url) throw new Error('Missing authorization URL');
  try {
    await shell.openExternal(url);
    return 'external';
  } catch (err) {
    console.warn('[OAuth] failed to open external browser, fallback to embedded window:', err);
    await openCodexAuthWindow({ forceReauth, url, title: 'OpenAI 登录' });
    return 'embedded';
  }
}

function stopPendingProviderOAuthWatcher(): void {
  if (pendingProviderOAuthWatcher) {
    clearInterval(pendingProviderOAuthWatcher);
    pendingProviderOAuthWatcher = null;
  }
  pendingProviderOAuthChecking = false;
}

function startPendingProviderOAuthWatcher(): void {
  stopPendingProviderOAuthWatcher();
  const runOnce = async () => {
    if (pendingProviderOAuthChecking) return;
    if (!pendingProviderOAuth || pendingProviderOAuth.provider !== 'openai' || pendingProviderOAuth.mode !== 'legacy-session') {
      stopPendingProviderOAuthWatcher();
      return;
    }
    pendingProviderOAuthChecking = true;
    try {
      const tokenState = await readCodexSessionToken();
      if (!tokenState.success) return;
      const quick = applyCodexQuickConnect({
        providerId: 'openai',
        providerBaseUrl: 'https://api.openai.com/v1',
        providerApi: 'openai-completions',
        accessToken: tokenState.accessToken || undefined,
        sessionPayload: tokenState.sessionPayload || undefined,
      });
      const successPayload = {
        accountId: pendingProviderOAuth.accountId,
        provider: 'openai',
        loginInfo: tokenState.loginInfo,
        ...quick,
      };
      safeSendToRenderer('oauth:success', successPayload);
      pendingProviderOAuth = null;
      stopPendingProviderOAuthWatcher();
    } catch {
      // ignore transient read failures
    } finally {
      pendingProviderOAuthChecking = false;
    }
  };

  pendingProviderOAuthWatcher = setInterval(() => {
    void runOnce();
  }, 1500);
  void runOnce();
}

function hashLockPassword(password: string): string {
  return createHash('sha256').update(`AxonClawX:${password}`).digest('hex');
}

function ensureLockAuthSeed(): void {
  if (!isInitialized()) return;
  const username = getSetting(LOCK_AUTH_USERNAME_KEY);
  const passwordHash = getSetting(LOCK_AUTH_PASSWORD_HASH_KEY);
  if (!username) setSetting(LOCK_AUTH_USERNAME_KEY, LOCK_DEFAULT_USERNAME);
  if (!passwordHash) setSetting(LOCK_AUTH_PASSWORD_HASH_KEY, hashLockPassword(LOCK_DEFAULT_PASSWORD));
}

function verifyLockCredentials(username: string, password: string): boolean {
  if (!isInitialized()) return false;
  ensureLockAuthSeed();
  const storedUsername = getSetting(LOCK_AUTH_USERNAME_KEY) || LOCK_DEFAULT_USERNAME;
  const storedHash = getSetting(LOCK_AUTH_PASSWORD_HASH_KEY) || hashLockPassword(LOCK_DEFAULT_PASSWORD);
  const inputHash = hashLockPassword(password);
  return username === storedUsername && inputHash === storedHash;
}

function ensureDatabaseReady(): void {
  if (isInitialized()) return;
  initDatabase();
  ensureLockAuthSeed();
}

type GatewayConnectionSettings = {
  mode: 'local' | 'remote';
  protocol: 'ws' | 'wss';
  host: string;
  port: number;
  token: string;
};

function readGatewayConnectionFromAxonConfig(axonCfg: Record<string, unknown>): Partial<GatewayConnectionSettings> {
  const axon = ensureRecord(axonCfg);
  const conn = ensureRecord(axon.gatewayConnection);
  const mode = String(conn.mode || '').toLowerCase() === 'remote' ? 'remote' : 'local';
  const protocol = String(conn.protocol || '').toLowerCase() === 'wss' ? 'wss' : 'ws';
  const host = String(conn.host || '').trim();
  const portRaw = Number(conn.port);
  const token = String(conn.token || '').trim();
  const port = Number.isFinite(portRaw) && portRaw > 0 && portRaw <= 65535 ? portRaw : undefined;
  return { mode, protocol, host, port, token };
}

function persistGatewayConnectionToConfig(settings: Partial<GatewayConnectionSettings>): void {
  const cfg = readAxonclawxConfig();
  const axon = ensureRecord(cfg.axonclawx);
  const prev = ensureRecord(axon.gatewayConnection);
  const next: Record<string, unknown> = { ...prev };
  if (typeof settings.mode === 'string') next.mode = settings.mode;
  if (typeof settings.protocol === 'string') next.protocol = settings.protocol;
  if (typeof settings.host === 'string') next.host = settings.host;
  if (typeof settings.port === 'number' && Number.isFinite(settings.port)) next.port = settings.port;
  if (typeof settings.token === 'string') next.token = settings.token;
  axon.gatewayConnection = next;
  axon.lastSetupAt = new Date().toISOString();
  cfg.axonclawx = axon;
  writeAxonclawxConfig(cfg);
}

function persistSetupCompleteToConfig(value: boolean): void {
  const cfg = readAxonclawxConfig();
  const axon = ensureRecord(cfg.axonclawx);
  axon.setupComplete = value;
  if (value) axon.lastSetupAt = new Date().toISOString();
  cfg.axonclawx = axon;
  writeAxonclawxConfig(cfg);
}

function persistLanguageToAxonConfig(language: string): void {
  const cfg = readAxonclawxConfig();
  const axon = ensureRecord(cfg.axonclawx);
  axon.language = language;
  cfg.axonclawx = axon;
  writeAxonclawxConfig(cfg);
}

function sanitizeSetupCompleteKeysInConfig(): void {
  try {
    const cfg = readOpenclawConfig();
    let changed = false;
    const legacyAxon = ensureRecord(cfg.axonclawx);
    if (Object.keys(legacyAxon).length > 0) {
      const axonCfg = readAxonclawxConfig();
      const currentAxon = ensureRecord(axonCfg.axonclawx);
      axonCfg.axonclawx = {
        ...legacyAxon,
        ...currentAxon,
      };
      writeAxonclawxConfig(axonCfg);
      delete (cfg as Record<string, unknown>).axonclawx;
      changed = true;
    }
    if ('setupComplete' in cfg) {
      delete (cfg as Record<string, unknown>).setupComplete;
      changed = true;
    }
    const ui = ensureRecord(cfg.ui);
    if ('setupComplete' in ui) {
      delete ui.setupComplete;
      cfg.ui = ui;
      changed = true;
    }
    if ('language' in ui) {
      const uiLanguage = String(ui.language || '').trim();
      if (uiLanguage) {
        persistLanguageToAxonConfig(uiLanguage);
      }
      delete ui.language;
      cfg.ui = ui;
      changed = true;
    }
    const models = ensureRecord(cfg.models);
    if ('default' in models) {
      delete models.default;
      cfg.models = models;
      changed = true;
    }
    const providers = ensureRecord(models.providers);
    const providerUiOnlyKeys = [
      'accountId',
      'vendorId',
      'label',
      'authMode',
      'apiProtocol',
      'model',
      'enabled',
      'createdAt',
      'updatedAt',
      'fallbackModels',
      'fallbackAccountIds',
      'fallbackProviderIds',
      'email',
      'metadata',
    ];
    for (const [providerId, providerRaw] of Object.entries(providers)) {
      const provider = ensureRecord(providerRaw);
      for (const key of providerUiOnlyKeys) {
        if (key in provider) {
          delete provider[key];
          changed = true;
        }
      }
      if (providerId === 'openai' && !String(provider.apiKey || '').trim()) {
        delete providers[providerId];
        changed = true;
        continue;
      }
      if (providerId === 'openai-codex') {
        const nextModels = mergeOpenAiCodexModels(provider.models);
        const currentModels = JSON.stringify(asModelArray(provider.models));
        const desiredModels = JSON.stringify(nextModels);
        if (
          provider.baseUrl !== 'https://chatgpt.com/backend-api'
          || provider.api !== 'openai-codex-responses'
          || currentModels !== desiredModels
        ) {
          provider.baseUrl = 'https://chatgpt.com/backend-api';
          provider.api = 'openai-codex-responses';
          provider.models = nextModels;
          changed = true;
        }
      }
      providers[providerId] = provider;
    }
    if (Object.keys(providers).length > 0 || Object.prototype.hasOwnProperty.call(models, 'providers')) {
      models.providers = providers;
      cfg.models = models;
    }
    const agents = ensureRecord(cfg.agents);
    const defaults = ensureRecord(agents.defaults);
    const defaultModels = ensureRecord(defaults.models);
    for (const model of OPENAI_CODEX_MODEL_CATALOG) {
      const modelRef = `openai-codex/${model.id}`;
      const existingAlias = ensureRecord(defaultModels[modelRef]);
      if (existingAlias.alias !== model.name) {
        defaultModels[modelRef] = { ...existingAlias, alias: model.name };
        changed = true;
      }
    }
    defaults.models = defaultModels;
    const modelCfg = ensureRecord(defaults.model);
    const primary = String(modelCfg.primary || '').trim();
    if (primary === 'openai-codex/gpt-5.2-codex') {
      modelCfg.primary = 'openai-codex/gpt-5.4-mini';
      changed = true;
    }
    const fallbacks = Array.isArray(modelCfg.fallbacks)
      ? (modelCfg.fallbacks as unknown[]).map((x) => String(x || '').trim()).filter(Boolean)
      : [];
    const nextFallbacks = fallbacks
      .filter((item) => !/^openai-codex\/gpt-5\.2-codex$/i.test(item));
    if (primary.startsWith('openai-codex/') && !nextFallbacks.includes('openai-codex/gpt-5.3-codex')) {
      nextFallbacks.unshift('openai-codex/gpt-5.3-codex');
    }
    if (JSON.stringify(nextFallbacks) !== JSON.stringify(fallbacks)) {
      modelCfg.fallbacks = nextFallbacks;
      defaults.model = modelCfg;
      agents.defaults = defaults;
      cfg.agents = agents;
      changed = true;
    }
    const plugins = ensureRecord(cfg.plugins);
    const slots = ensureRecord(plugins.slots);
    const entries = ensureRecord(plugins.entries);
    const memorySlot = String(slots.memory || '').trim();
    if (memorySlot && !entries[memorySlot]) {
      delete slots.memory;
      plugins.slots = slots;
      cfg.plugins = plugins;
      changed = true;
    }
    for (const [entryId, entryRaw] of Object.entries(entries)) {
      if (!/^memory-lancedb/i.test(entryId)) continue;
      const entry = ensureRecord(entryRaw);
      const entryConfig = ensureRecord(entry.config);
      if ('embedding' in entryConfig) {
        const embedding = entryConfig.embedding;
        if (!embedding || (typeof embedding === 'object' && Object.keys(ensureRecord(embedding)).length === 0)) {
          delete entryConfig.embedding;
          entry.config = entryConfig;
          entries[entryId] = entry;
          plugins.entries = entries;
          cfg.plugins = plugins;
          changed = true;
        }
      }
    }
    if (changed) {
      console.log('[Main] Sanitizing invalid keys in openclaw config');
      writeOpenclawConfig(cfg);
    }
  } catch (err) {
    console.warn('[Main] Failed to sanitize openclaw config:', err);
  }
}

function getGatewayConnectionSettings(): GatewayConnectionSettings {
  const localDefaults: GatewayConnectionSettings = {
    mode: 'local',
    protocol: 'ws',
    host: '127.0.0.1',
    port: getResolvedGatewayPort(),
    token: GATEWAY_TOKEN,
  };

  try {
    const cfg = readAxonclawxConfig();
    const fromConfig = readGatewayConnectionFromAxonConfig(cfg.axonclawx as Record<string, unknown>);
    if (fromConfig.mode === 'remote' && fromConfig.host) {
      return {
        mode: 'remote',
        protocol: fromConfig.protocol === 'wss' ? 'wss' : 'ws',
        host: fromConfig.host,
        port: typeof fromConfig.port === 'number' ? fromConfig.port : 18789,
        token: fromConfig.token || GATEWAY_TOKEN,
      };
    }
  } catch {
    // fall through to db compatibility
  }

  try {
    if (!isInitialized()) return localDefaults;
    const mode = (getSetting(GW_MODE_KEY) || 'local').toLowerCase() === 'remote' ? 'remote' : 'local';
    if (mode === 'local') return localDefaults;
    const protocolRaw = (getSetting(GW_REMOTE_PROTOCOL_KEY) || 'ws').toLowerCase();
    const protocol: 'ws' | 'wss' = protocolRaw === 'wss' ? 'wss' : 'ws';
    const host = (getSetting(GW_REMOTE_HOST_KEY) || '').trim();
    const portRaw = parseInt(getSetting(GW_REMOTE_PORT_KEY) || '', 10);
    const token = (getSetting(GW_REMOTE_TOKEN_KEY) || '').trim() || GATEWAY_TOKEN;
    const port = Number.isFinite(portRaw) && portRaw > 0 && portRaw <= 65535 ? portRaw : 18789;
    if (!host) return localDefaults;
    return { mode, protocol, host, port, token };
  } catch {
    return localDefaults;
  }
}

function readTokenFromOpenclawConfig(homeDir: string): string {
  try {
    const cfgPath = path.join(homeDir, '.openclaw', 'openclaw.json');
    if (!fs.existsSync(cfgPath)) return '';
    const json = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as Record<string, unknown>;
    const gateway = (json.gateway && typeof json.gateway === 'object' && !Array.isArray(json.gateway))
      ? (json.gateway as Record<string, unknown>)
      : {};
    const auth = (gateway.auth && typeof gateway.auth === 'object' && !Array.isArray(gateway.auth))
      ? (gateway.auth as Record<string, unknown>)
      : {};
    return String(auth.token || '').trim();
  } catch {
    return '';
  }
}

function readDeviceTokenFromIdentity(homeDir: string): string {
  try {
    const authPath = path.join(homeDir, '.openclaw', 'identity', 'device-auth.json');
    if (!fs.existsSync(authPath)) return '';
    const json = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
    const tokens = (json.tokens && typeof json.tokens === 'object' && !Array.isArray(json.tokens))
      ? (json.tokens as Record<string, unknown>)
      : {};
    const operator = (tokens.operator && typeof tokens.operator === 'object' && !Array.isArray(tokens.operator))
      ? (tokens.operator as Record<string, unknown>)
      : {};
    return String(operator.token || '').trim();
  } catch {
    return '';
  }
}

function buildGatewayConnectAuth(preferToken?: string): { token?: string; deviceToken?: string } {
  const cfg = getGatewayConnectionSettings();
  const localHome = os.homedir();
  const localToken = cfg.mode === 'local' ? readTokenFromOpenclawConfig(localHome) : '';
  const token = String(preferToken || '').trim() || String(cfg.token || '').trim() || localToken || GATEWAY_TOKEN;
  const deviceToken = cfg.mode === 'local' ? readDeviceTokenFromIdentity(localHome) : '';
  const auth: { token?: string; deviceToken?: string } = {};
  if (token) auth.token = token;
  if (deviceToken) auth.deviceToken = deviceToken;
  return auth;
}

function applyCustomAppIcon(): void {
  if (process.platform !== 'darwin') return;
  const appDir = path.dirname(app.getAppPath());
  const preferredIcon = path.join(process.cwd(), 'designUI', 'image', 'icon.icns');
  const candidates = [
    preferredIcon,
    path.join(app.getAppPath(), 'designUI', 'image', 'icon.icns'),
    path.join(process.resourcesPath, 'designUI', 'image', 'icon.icns'),
    path.join(process.resourcesPath, 'icon.icns'),
    path.join(process.resourcesPath, 'build', 'icon.icns'),
    path.join(appDir, 'icon.icns'),
    path.join(appDir, 'build', 'icon.icns'),
    path.join(process.cwd(), 'build', 'icon.icns'),
    // PNG fallbacks (icon.png extracted from icns, square app icon)
    path.join(process.cwd(), 'public', 'icon-512.png'),
    path.join(process.cwd(), 'public', 'icon.png'),
    path.join(app.getAppPath(), 'public', 'icon-512.png'),
    path.join(app.getAppPath(), 'public', 'icon.png'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(process.resourcesPath, 'clawLogo1.png'),
    path.join(process.resourcesPath, 'designUI', 'image', 'clawLogo1.png'),
    path.join(app.getAppPath(), 'build', 'icon.icns'),
    path.join(app.getAppPath(), 'designUI', 'image', 'clawLogo1.png'),
    path.join(process.cwd(), 'designUI', 'image', 'clawLogo1.png'),
  ];
  for (const iconPath of candidates) {
    if (!fs.existsSync(iconPath)) continue;
    try {
      const icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) continue;
      app.dock.setIcon(icon);
      console.log('[Main] App icon:', iconPath);
      return;
    } catch {
      // try next candidate
    }
  }
  console.warn('[Main] No valid dock icon found in candidates');
}

function resolveWindowIconPath(): string | undefined {
  const appDir = path.dirname(app.getAppPath());
  const preferredIcon = path.join(process.cwd(), 'designUI', 'image', 'icon.icns');
  const candidates = [
    preferredIcon,
    path.join(app.getAppPath(), 'designUI', 'image', 'icon.icns'),
    path.join(process.resourcesPath, 'designUI', 'image', 'icon.icns'),
    path.join(process.resourcesPath, 'icon.icns'),
    path.join(process.resourcesPath, 'build', 'icon.icns'),
    path.join(appDir, 'icon.icns'),
    path.join(appDir, 'build', 'icon.icns'),
    path.join(app.getAppPath(), 'build', 'icon.icns'),
    path.join(process.cwd(), 'build', 'icon.icns'),
    // PNG fallbacks (for dev mode where public/ is served directly)
    path.join(process.cwd(), 'public', 'icon.png'),
    path.join(app.getAppPath(), 'public', 'icon.png'),
    path.join(process.resourcesPath, 'icon.png'),
    // ICO fallbacks (Windows)
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'build', 'icon.ico'),
    path.join(appDir, 'icon.ico'),
    path.join(appDir, 'build', 'icon.ico'),
    path.join(process.cwd(), 'build', 'icon.ico'),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

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
  const windowIcon = resolveWindowIconPath();

  const win = new BrowserWindow({
    title: APP_DISPLAY_NAME,
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
    icon: windowIcon,
  });

  if (isMac) {
    // 再次设置一次 dock 图标，避免 dev 模式偶发不生效
    applyCustomAppIcon();
  }

  const rendererEntry = path.join(__dirname, '../../dist/renderer/index.html');
  const devServerUrl = (process.env.VITE_DEV_SERVER_URL || '').trim();
  const hasDevServerUrl = /^https?:\/\//.test(devServerUrl);
  const isDevLike = process.env.NODE_ENV === 'development' || hasDevServerUrl;
  const shouldAutoOpenDevTools = process.env.AXONCLAW_OPEN_DEVTOOLS === '1';
  const devUrl = hasDevServerUrl ? devServerUrl : '';
  let fallbackTried = false;

  const fallbackToBuiltRenderer = (): void => {
    if (fallbackTried) return;
    fallbackTried = true;
    if (fs.existsSync(rendererEntry)) {
      void win.loadFile(rendererEntry).catch((err) => {
        console.error('[Main] Failed to load built renderer fallback:', err);
      });
      return;
    }
    const msg = encodeURIComponent(
      `Renderer failed to load.\nTried dev server: ${devUrl || '(none)'}\nMissing built file: ${rendererEntry}\n\nPlease start Vite (npm run dev) or build renderer (npm run build).`,
    );
    void win.loadURL(`data:text/plain;charset=utf-8,${msg}`).catch(() => {});
  };

  if (isDevLike) {
    // Development: must use the explicit Vite URL injected by electron:dev.
    if (!hasDevServerUrl) {
      const msg = encodeURIComponent(
        'Development server URL is missing.\nPlease run this app with `npm run electron:dev`.',
      );
      void win.loadURL(`data:text/plain;charset=utf-8,${msg}`).catch(() => {});
      return win;
    }

    // Development: load only the resolved Vite URL to avoid attaching to unrelated local services.
    win.webContents.once('did-fail-load', (_event, _errorCode, errorDescription, validatedURL) => {
      if (validatedURL?.startsWith(devUrl)) {
        console.warn('[Main] Dev server load failed:', errorDescription, validatedURL);
        const msg = encodeURIComponent(
          `Dev renderer failed to load.\nURL: ${devUrl}\nError: ${errorDescription}`,
        );
        void win.loadURL(`data:text/plain;charset=utf-8,${msg}`).catch(() => {});
      }
    });
    void win.loadURL(devUrl).catch((err) => {
      console.warn('[Main] loadURL failed:', err);
      const msg = encodeURIComponent(
        `Dev renderer failed to load.\nURL: ${devUrl}\nError: ${String(err)}`,
      );
      void win.loadURL(`data:text/plain;charset=utf-8,${msg}`).catch(() => {});
    });
    if (shouldAutoOpenDevTools) {
      win.webContents.openDevTools();
    }
  } else {
    // Production: Load from built files
    void win.loadFile(rendererEntry).catch((err) => {
      console.error('[Main] Failed to load renderer:', err);
    });
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
    const allowDevUrl = hasDevServerUrl ? devServerUrl : '';
    const isAppUrl = (allowDevUrl ? url.startsWith(allowDevUrl) : false) || url.startsWith('file://');
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
  console.log('[Main] Initializing AxonClawX...');

  // 初始化数据库（默认 SQLite，路径可通过 AXONCLAW_DB_PATH 或后续启动配置选择）
  try {
    initDatabase();
    ensureLockAuthSeed();
  } catch (err) {
    console.error('[Main] Database init failed:', err);
  }

  // Cleanup legacy fields that break OpenClaw schema validation.
  sanitizeSetupCompleteKeysInConfig();

  // Remove previously persisted invalid OpenAI browser session tokens from runtime auth/config.
  try {
    const sanitized = sanitizeInvalidOpenAiCredentialArtifacts();
    if (sanitized.configChanged || sanitized.profileChanged) {
      console.warn(
        `[Main] Sanitized invalid OpenAI auth artifacts: configKeys=${sanitized.removedConfigKeys}, profiles=${sanitized.removedProfiles}`,
      );
    }
  } catch (err) {
    console.warn('[Main] sanitize invalid openai credentials skipped:', err);
  }

  // Repair: ensure provider apiKey in openclaw.json is mirrored into
  // main agent auth-profiles.json (runtime auth source for recent OpenClaw builds).
  try {
    const synced = syncMainAgentAuthProfilesFromConfig();
    if (synced.changed > 0) {
      console.log('[Main] Synced auth profiles from config for providers:', synced.providers.join(', '));
    }
  } catch (err) {
    console.warn('[Main] auth profile sync skipped:', err);
  }

  // Create the main window
  applyCustomAppIcon();
  mainWindow = createWindow();

  // Port probing can touch multiple local ports. Keep it off the critical path
  // so the renderer appears immediately after database/config initialization.
  void (async () => {
    try {
      const r = await resolveGatewayPort();
      if (r.success && r.port) {
        console.log('[Main] Gateway resolved at port', r.port);
      }
    } catch {
      /* ignore */
    }
  })();

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
    pushGatewayRuntimeLog('error', error.message);
  });

  gatewayManager.on('log', (level, message) => {
    pushGatewayRuntimeLog(level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error', message);
  });
  
  // 程序启动时自动启动网关（若未运行）。不要阻塞首屏渲染。
  void (async () => {
    if (!isGatewayRunning()) {
      console.log('[Main] Auto-starting Gateway...');
      safeSendToRenderer('gateway:status', {
        ...getGatewayStatus(),
        state: 'starting',
      });
      pushGatewayRuntimeLog('info', 'Gateway starting...');
      try {
        const status = await startGatewayWithSelfHeal();
        if (!status.startSuccess) {
          console.error('[Main] Gateway auto-start failed with diagnostics:', status.error);
          safeSendToRenderer('gateway:status', status);
          safeSendToRenderer('gateway:error', status.error || 'Gateway auto-start failed');
          if (status.logTail?.length) {
            for (const line of status.logTail.slice(-40)) {
              pushGatewayRuntimeLog('debug', line);
            }
          }
        } else {
          console.log('[Main] Gateway started');
          safeSendToRenderer('gateway:status', getGatewayStatus());
        }
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
  })();

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
    return await startGatewayWithSelfHeal();
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

ipcMain.handle('gateway:status', async () => {
  const status = getGatewayStatus();
  const cfg = getGatewayConnectionSettings();
  if (cfg.mode === 'remote') {
    return { ...status, port: cfg.port || status.port || getResolvedGatewayPort() };
  }
  try {
    const probe = await resolveGatewayPort();
    if (probe.success && probe.port) {
      setResolvedGatewayPort(probe.port);
      persistGatewayConnectionToConfig({
        mode: 'local',
        protocol: 'ws',
        host: '127.0.0.1',
        port: probe.port,
      });
      return {
        ...status,
        state: 'running',
        port: probe.port,
      };
    }
  } catch {
    // fall back to lifecycle status
  }
  return { ...status, port: status.port || getResolvedGatewayPort() };
});

ipcMain.handle('gateway:getControlUiUrl', async () => {
  return getGatewayControlUiInfo();
});

ipcMain.handle('settings:get', async (_event, payload?: { key?: string }) => {
  const key = String(payload?.key || '').trim();
  if (key === 'gatewayToken') {
    return getGatewayControlUiInfo().token;
  }
  return null;
});

ipcMain.handle('gateway:isRunning', () => {
  return isGatewayRunning();
});

// 真实连接检测：多端口探测（配置端口 + 18789/18791/18792），成功后缓存端口
ipcMain.handle('gateway:checkConnection', async () => {
  try {
    const cfg = getGatewayConnectionSettings();
    if (cfg.mode === 'remote') {
      const result = await testGatewayWsConnection(cfg.protocol, cfg.host, cfg.port, cfg.token, 5000);
      return { success: result.success, port: cfg.port, error: result.error };
    }
    const result = await resolveGatewayPort();
    if (result.success && result.port) {
      setResolvedGatewayPort(result.port);
      persistGatewayConnectionToConfig({
        mode: 'local',
        protocol: 'ws',
        host: '127.0.0.1',
        port: result.port,
      });
      return { success: true, port: result.port };
    }

    // Some OpenClaw builds expose a working JSON-RPC socket while /health or
    // lightweight port probes are unreliable. Treat a successful read-only RPC
    // as authoritative so the renderer does not stay in a false "stopped" state.
    const rpcProbe = await callGatewayRpcWithRetry('sessions.list', { limit: 1 }, 8000);
    if (rpcProbe.ok) {
      const port = getResolvedGatewayPort();
      persistGatewayConnectionToConfig({
        mode: 'local',
        protocol: 'ws',
        host: '127.0.0.1',
        port,
      });
      return { success: true, port };
    }

    return { success: false, port: result.port, error: rpcProbe.error || result.error };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

// 重启 Gateway（AxonClawX 连接外部时，实际执行 stop + start 子进程）
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

  // Backward-compatible params normalization:
  // older renderer code may still send sessions.patch.modelId, but gateway only accepts model.
  if (method === 'sessions.patch' && params && typeof params === 'object') {
    const normalized = { ...params } as Record<string, unknown> & { modelId?: unknown };
    const modelIdRaw = typeof normalized.modelId === 'string' ? normalized.modelId.trim() : '';
    const modelRaw = typeof normalized.model === 'string' ? normalized.model.trim() : '';
    const normalizedModelRaw = normalizeModelAlias(modelRaw);
    const normalizedModelIdRaw = normalizeModelAlias(modelIdRaw);
    if (!normalizedModelRaw && normalizedModelIdRaw) {
      normalized.model = normalizedModelIdRaw;
    } else if (normalizedModelRaw) {
      normalized.model = normalizedModelRaw;
    }
    if ('modelId' in normalized) {
      delete normalized.modelId;
    }
    params = normalized;

    if (typeof normalized.model === 'string' && normalized.model.trim()) {
      try {
        const ensured = isOpenAiCodexCatalogModelRef(normalized.model)
          ? ensureOpenAiCodexModelCatalogInConfig()
          : ensureConfiguredModelAliasesInConfig();
        if (ensured.changed) {
          console.log(`[GatewayRPC] ensured configured model aliases before sessions.patch: ${ensured.models.join(', ')}`);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      } catch (err) {
        console.warn('[GatewayRPC] failed to ensure configured model aliases:', err);
      }
    }
  }

  if (method === 'chat.send' && params && typeof params === 'object') {
    params = await normalizeChatSendParams(params);
  }

  console.log(`[GatewayRPC] ${method}`, params);
  const writeMethod = isWriteRpcMethod(method);

  // 非 chat.send 走统一 RPC 内核（含重试/端口重探测），避免多套 WS 链路分叉导致不一致。
  if (method !== 'chat.send') {
    let result = await callGatewayRpcWithRetry(method, params, timeout);

    if (
      method === 'sessions.patch'
      && params
      && typeof params === 'object'
      && !result.ok
      && /model not allowed/i.test(String(result.error || ''))
    ) {
      try {
        const modelRef = (params as Record<string, unknown>).model;
        const ensured = isOpenAiCodexCatalogModelRef(modelRef)
          ? ensureOpenAiCodexModelCatalogInConfig()
          : ensureConfiguredModelAliasesInConfig();
        console.warn(`[GatewayRPC] Gateway rejected model; restarting gateway after alias ensure changed=${ensured.changed}`);
        await stopGateway().catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 700));
        await startGateway();
        result = await callGatewayRpcWithRetry(method, params, timeout);
      } catch (err) {
        console.warn('[GatewayRPC] model alias self-heal retry failed:', err);
      }
    }

    if (method === 'sessions.list') {
      const req = (params && typeof params === 'object') ? (params as Record<string, unknown>) : {};
      const safeLimit = Math.min(Math.max(Number(req.limit) || 500, 1), 2000);
      const payload = (result.result && typeof result.result === 'object')
        ? (result.result as Record<string, unknown>)
        : {};
      const sessions = Array.isArray(payload.sessions)
        ? (payload.sessions as Array<Record<string, unknown>>)
        : [];
      const merged = mergeSessionsWithLocalFallback(sessions, safeLimit);
      return {
        ...result,
        success: true,
        ok: true,
        result: {
          ...payload,
          sessions: merged,
        },
      };
    }

    if (method === 'chat.history') {
      const payload = (result.result && typeof result.result === 'object')
        ? (result.result as Record<string, unknown>)
        : {};
      const remoteMessages = Array.isArray(payload.messages) ? payload.messages : [];
      const req = (params && typeof params === 'object') ? (params as Record<string, unknown>) : {};
      const fallbackMessages = readLocalSessionHistory(req.sessionKey, Number(req.limit) || 200);
      if (fallbackMessages.length > 0) {
        const mergedMessages = mergeLocalAndRemoteHistory(
          remoteMessages as Array<Record<string, unknown>>,
          fallbackMessages,
        );
        const shouldUseMerged = remoteMessages.length === 0 || mergedMessages.length > remoteMessages.length;
        if (shouldUseMerged) {
          return {
            success: true,
            ok: true,
            result: {
              ...payload,
              messages: mergedMessages,
              total: mergedMessages.length,
              localFallback: remoteMessages.length === 0,
              localMerged: remoteMessages.length > 0,
            },
          };
        }
      }
    }

    return result;
  }

  // chat.send 保留流式事件透传到渲染进程
  let wsUrl = getGatewayWsUrl();
  const gwCfg = getGatewayConnectionSettings();
  if (gwCfg.mode === 'local') {
    const probe = await resolveGatewayPort();
    if (probe.success && probe.port) {
      setResolvedGatewayPort(probe.port);
      persistGatewayConnectionToConfig({
        mode: 'local',
        protocol: 'ws',
        host: '127.0.0.1',
        port: probe.port,
      });
      wsUrl = `ws://127.0.0.1:${probe.port}/ws`;
    }
  }

  return new Promise((resolve) => {
    let resolved = false;
    let streamingChat = false; // chat.send 流式模式，收到首包后保持连接转发事件
    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);

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
          const auth = buildGatewayConnectAuth();
          const scopes = ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals', 'operator.pairing'];
          const nonce = String(msg?.payload?.nonce || '');
          const device = buildSignedGatewayDevice(
            nonce,
            auth.token ?? auth.deviceToken ?? null,
            'gateway-client',
            'ui',
            'operator',
            scopes,
          );
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'gateway-client', displayName: 'AxonClawX', version: '0.1.0', platform: process.platform, mode: 'ui' },
              auth,
              ...(device ? { device } : {}),
              role: 'operator',
              scopes,
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
            resolve({
              success: false,
              ok: false,
              error: String(
                msg.error?.message
                  ?? msg.error?.details?.code
                  ?? msg.error?.code
                  ?? msg.error
                  ?? 'Connect failed'
              ),
            });
            return;
          }
          // Log granted scopes for debugging scope errors
          const grantedScopes = msg.result?.scopes ?? msg.payload?.scopes;
          console.log(`[GatewayRPC] ${method} connect ok, grantedScopes=${JSON.stringify(grantedScopes ?? 'not-provided')}`);
          // Check if operator.write was actually granted (when scopes are provided)
          if (Array.isArray(grantedScopes) && !grantedScopes.includes('operator.write')) {
            console.warn(`[GatewayRPC] ${method} operator.write NOT in granted scopes:`, grantedScopes);
            if (writeMethod) {
              resolved = true;
              clearTimeout(timeoutId);
              ws.close();
              resolve({
                success: false,
                ok: false,
                error: `missing scope: operator.write (granted: ${grantedScopes.join(', ')})`,
              });
              return;
            }
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
          const state = payload.state
            ?? (ev.endsWith('.delta')
              ? 'delta'
              : ev.endsWith('.final')
                ? 'final'
                : ev.endsWith('.error')
                  ? 'error'
                  : ev.endsWith('.aborted') || ev.endsWith('.abort')
                    ? 'aborted'
                    : undefined);
          const errorMessage = (() => {
            if (typeof payload.errorMessage === 'string' && payload.errorMessage.trim()) return payload.errorMessage.trim();
            if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim();
            if (payload.error && typeof payload.error === 'object') {
              const errorObj = payload.error as Record<string, unknown>;
              if (typeof errorObj.message === 'string' && errorObj.message.trim()) return errorObj.message.trim();
            }
            if (payload.message && typeof payload.message === 'object') {
              const msgObj = payload.message as Record<string, unknown>;
              if (typeof msgObj.errorMessage === 'string' && msgObj.errorMessage.trim()) return msgObj.errorMessage.trim();
              if (typeof msgObj.error === 'string' && msgObj.error.trim()) return msgObj.error.trim();
              if (msgObj.error && typeof msgObj.error === 'object') {
                const msgErrObj = msgObj.error as Record<string, unknown>;
                if (typeof msgErrObj.message === 'string' && msgErrObj.message.trim()) return msgErrObj.message.trim();
              }
            }
            return undefined;
          })();
          safeSendToRenderer('gateway:notification', {
            method: 'agent',
            params: {
              ...payload,
              phase,
              state: payload.state ?? state,
              runId: payload.runId,
              sessionKey: payload.sessionKey,
              message: payload.message,
              errorMessage,
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
          // OpenClaw may emit phase=completed for intermediate agent/tool steps.
          // Closing on that event drops later deltas and makes DeepSeek replies look
          // like they disappeared. Only close on terminal stream events/states.
          const isDone = ev.endsWith('.final')
            || ev.endsWith('.error')
            || ev.endsWith('.aborted')
            || ev.endsWith('.abort')
            || state === 'final'
            || state === 'error'
            || state === 'aborted';
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

// chat:sendWithMedia — read local files and pass them inline to gateway chat.send
ipcMain.handle('chat:sendWithMedia', async (_event, payload: {
  sessionKey: string;
  message: string;
  deliver?: boolean;
  idempotencyKey?: string;
  timeoutMs?: number;
  media?: Array<{ filePath: string; mimeType: string; fileName: string }>;
}) => {
  try {
    const fs = require('fs');
    const mediaContent: Array<{ fileName: string; mimeType: string; data: string }> = [];
    if (payload.media && payload.media.length > 0) {
      for (const m of payload.media) {
        try {
          const buf = fs.readFileSync(m.filePath);
          mediaContent.push({
            fileName: m.fileName,
            mimeType: m.mimeType,
            data: buf.toString('base64'),
          });
        } catch (err) {
          console.error(`[chat:sendWithMedia] Failed to read file ${m.filePath}:`, err);
        }
      }
    }

    // Build message with embedded media for the gateway
    const rpcParams: Record<string, unknown> = {
      sessionKey: payload.sessionKey,
      message: payload.message,
      deliver: payload.deliver ?? false,
      idempotencyKey: payload.idempotencyKey,
    };
    if (mediaContent.length > 0) {
      rpcParams.media = mediaContent;
    }

    const normalizedRpcParams = await normalizeChatSendParams(rpcParams);

    // Reuse the gateway RPC core after stripping AxonClawX-only metadata.
    const { callGatewayRpcWithRetry } = require('../gateway/rpc');
    const timeoutMs = Math.max(30_000, Number(payload.timeoutMs) || 120_000);
    const result = await callGatewayRpcWithRetry('chat.send', normalizedRpcParams, timeoutMs);
    return result;
  } catch (err) {
    console.error('[chat:sendWithMedia] Error:', err);
    return { success: false, ok: false, error: String(err) };
  }
});

// Skills management
const SKILLS_DIR = path.join(os.homedir(), '.openclaw', 'skills');

ipcMain.handle('skills:openFolder', async () => {
  await shell.openPath(SKILLS_DIR);
});

ipcMain.handle('openclaw:getSkillsDir', () => SKILLS_DIR);

ipcMain.handle('dialog:open', async (_event, options?: Electron.OpenDialogOptions) => {
  const targetWindow = BrowserWindow.getFocusedWindow() || mainWindow || undefined;
  if (targetWindow) {
    return dialog.showOpenDialog(targetWindow, options ?? {});
  }
  return dialog.showOpenDialog(options ?? {});
});

ipcMain.handle('setup:scan-environment', async () => {
  const checkCommand = async (cmd: string): Promise<{ installed: boolean; version?: string; path?: string }> => {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 5000 });
      return { installed: true, version: stdout.trim() || undefined };
    } catch {
      return { installed: false };
    }
  };

  const checkCommandPath = async (name: string): Promise<string | undefined> => {
    try {
      const { stdout } = await execAsync(`command -v ${name}`, { timeout: 3000 });
      const pathValue = stdout.trim();
      return pathValue || undefined;
    } catch {
      return undefined;
    }
  };

  const nodeInfo = { installed: true, version: process.version, path: process.execPath };
  const npmInfo = await checkCommand('npm --version');
  npmInfo.path = await checkCommandPath('npm');
  const gitInfo = await checkCommand('git --version');
  gitInfo.path = await checkCommandPath('git');
  const openclawVersion = await checkCommand('openclaw --version');
  openclawVersion.path = await checkCommandPath('openclaw');
  const clawhubVersion = await checkCommand('clawhub --version');
  clawhubVersion.path = await checkCommandPath('clawhub');

  const localProbe = await resolveGatewayPort();
  const gatewayRunning = !!localProbe.success;
  const gatewayPort = localProbe.port ?? getResolvedGatewayPort();
  const remoteCfg = getGatewayConnectionSettings();

  const cloudOptions = [
    {
      id: 'docker',
      name: 'Docker / Docker Compose',
      description: 'Use a container to run OpenClaw service.',
      docsUrl: 'https://docs.docker.com/get-started/',
      command: 'docker run -d --name openclaw -p 18789:18789 ghcr.io/openclaw/openclaw:latest',
    },
    {
      id: 'railway',
      name: 'Railway',
      description: 'One-click deploy OpenClaw on Railway.',
      docsUrl: 'https://docs.railway.com/',
      command: 'railway up',
    },
    {
      id: 'render',
      name: 'Render',
      description: 'Deploy as a Render Web Service.',
      docsUrl: 'https://render.com/docs',
      command: 'Create a Web Service and expose port 18789',
    },
    {
      id: 'flyio',
      name: 'Fly.io',
      description: 'Deploy globally with Fly Machines.',
      docsUrl: 'https://fly.io/docs/',
      command: 'fly launch && fly deploy',
    },
  ];

  return {
    success: true,
    data: {
      os: process.platform,
      arch: process.arch,
      local: {
        node: nodeInfo,
        npm: npmInfo,
        git: gitInfo,
        openclaw: openclawVersion,
        clawhub: clawhubVersion,
        openClawInstalled: openclawVersion.installed,
        openClawVersion: openclawVersion.version,
        gatewayRunning,
        gatewayPort,
      },
      remote: {
        mode: remoteCfg.mode,
        protocol: remoteCfg.protocol,
        host: remoteCfg.host,
        port: remoteCfg.port,
        hasToken: !!remoteCfg.token,
      },
      cloudOptions,
    },
  };
});

ipcMain.handle('setup:test-remote-gateway', async (_event, payload: {
  protocol?: 'ws' | 'wss';
  host?: string;
  port?: number;
  token?: string;
}) => {
  const protocol: 'ws' | 'wss' = payload?.protocol === 'wss' ? 'wss' : 'ws';
  const host = String(payload?.host || '').trim();
  const port = Number(payload?.port || 0);
  const token = String(payload?.token || '').trim() || GATEWAY_TOKEN;
  if (!host || !port || !Number.isFinite(port)) {
    return { success: false, error: 'Invalid remote endpoint' };
  }

  const result = await testGatewayWsConnection(protocol, host, port, token);
  return { success: result.success, error: result.error };
});

ipcMain.handle('setup:save-remote-gateway', async (_event, payload: {
  protocol?: 'ws' | 'wss';
  host?: string;
  port?: number;
  token?: string;
}) => {
  const protocol: 'ws' | 'wss' = payload?.protocol === 'wss' ? 'wss' : 'ws';
  const host = String(payload?.host || '').trim();
  const port = Number(payload?.port || 0);
  const token = String(payload?.token || '').trim() || GATEWAY_TOKEN;
  if (!host || !port || !Number.isFinite(port)) {
    return { success: false, error: 'Invalid remote endpoint' };
  }

  // Setup flow must not hard-fail on optional local DB writes (native module may be unavailable).
  try {
    if (isInitialized()) {
      setSetting(GW_MODE_KEY, 'remote');
      setSetting(GW_REMOTE_PROTOCOL_KEY, protocol);
      setSetting(GW_REMOTE_HOST_KEY, host);
      setSetting(GW_REMOTE_PORT_KEY, String(port));
      setSetting(GW_REMOTE_TOKEN_KEY, token);
    }
  } catch (err) {
    console.warn('[setup] save remote gateway to database failed:', err);
  }
  persistGatewayConnectionToConfig({ mode: 'remote', protocol, host, port, token });
  return { success: true };
});

ipcMain.handle('setup:connect-local-gateway', async () => {
  const installResult = await installOpenClawIfMissing();
  if (!installResult.ok) {
    return {
      success: false,
      error: installResult.error || 'OpenClaw not installed and auto-install failed.',
      logs: installResult.logs,
    };
  }
  // Do not block connection on DB native-module loading issues.
  try {
    if (isInitialized()) {
      setSetting(GW_MODE_KEY, 'local');
    }
  } catch (err) {
    console.warn('[setup] set local gateway mode in database failed:', err);
  }
  persistGatewayConnectionToConfig({
    mode: 'local',
    protocol: 'ws',
    host: '127.0.0.1',
    port: getResolvedGatewayPort(),
  });

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let probe = await resolveGatewayPort();
  if (!probe.success) {
    let startError = '';
    try {
      const status = getGatewayStatus();
      if (status.state !== 'running') {
        console.log('[setup] local gateway not reachable, trying to start Gateway...');
        await startGateway();
      }
    } catch (err) {
      startError = String(err);
      console.warn('[setup] start gateway failed during connect-local-gateway:', err);
    }

    // Gateway startup can take a few seconds; retry probing before reporting failure.
    for (let i = 0; i < 10; i += 1) {
      await wait(1200);
      probe = await resolveGatewayPort();
      if (probe.success) break;
    }

    if (!probe.success && startError) {
      probe = {
        success: false,
        error: `${probe.error || 'Gateway 连接失败'}；自动启动失败：${startError}`,
      };
    }
  }

  if (probe.success && probe.port) {
    persistGatewayConnectionToConfig({
      mode: 'local',
      protocol: 'ws',
      host: '127.0.0.1',
      port: probe.port,
    });
  }

  // Verify local gateway scopes. If running but missing operator.read/write,
  // repair paired scopes and restart once.
  if (probe.success) {
    try {
      const scopeCheck = await callGatewayRpcWithRetry('sessions.list', {}, 12000);
      const scopeErr = String(scopeCheck.error || '');
      if (
        !scopeCheck.ok
        && (
          scopeErr.includes('missing scope: operator.')
          || /device-required|not_paired|device identity required|unauthorized|auth/i.test(scopeErr)
        )
      ) {
        const repaired = repairGatewayOperatorScopes();
        const relaxed = relaxGatewayLocalAuth();
        console.warn('[setup] local gateway auth/scope issue; repaired=', repaired, 'relaxed=', relaxed);
        try {
          await stopGateway();
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 400));
        await startGateway();
        const reprobe = await resolveGatewayPort();
        if (reprobe.success && reprobe.port) {
          probe = reprobe;
          persistGatewayConnectionToConfig({
            mode: 'local',
            protocol: 'ws',
            host: '127.0.0.1',
            port: reprobe.port,
          });
        }
      }
    } catch (err) {
      console.warn('[setup] scope verification skipped:', err);
    }
  }

  return {
    success: !!probe.success,
    port: probe.port,
    error: probe.error,
    logs: installResult.logs,
    installedNow: installResult.installedNow,
  };
});

ipcMain.handle('setup:repair-local-gateway-scopes', async () => {
  try {
    const repaired = repairGatewayOperatorScopes();
    try {
      await stopGateway();
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 400));
    await startGateway();
    const probe = await resolveGatewayPort();
    return {
      success: !!probe.success,
      port: probe.port,
      changed: repaired.changed,
      runtimeHome: repaired.runtimeHome,
      error: probe.error,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

async function installOpenClawIfMissing(): Promise<{
  ok: boolean;
  installedNow: boolean;
  logs: string[];
  error?: string;
}> {
  const logs: string[] = [];
  const run = async (cmd: string, timeout = 120000): Promise<{ ok: boolean; output: string }> => {
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout, maxBuffer: 1024 * 1024 * 8 });
      const output = [stdout, stderr].filter(Boolean).join('\n').trim();
      if (output) logs.push(`$ ${cmd}\n${output}`);
      return { ok: true, output };
    } catch (err) {
      const output = String((err as Error)?.message || err);
      logs.push(`$ ${cmd}\n${output}`);
      return { ok: false, output };
    }
  };

  const exists = await run('openclaw --version', 10000);
  if (exists.ok) return { ok: true, installedNow: false, logs };

  logs.push('[installer] OpenClaw not found, trying smart install strategy...');
  const hasBrew = await run('command -v brew', 5000);
  if (hasBrew.ok) {
    const brewInstall = await run('brew install openclaw', 25 * 60 * 1000);
    if (brewInstall.ok) {
      const verify = await run('openclaw --version', 10000);
      if (verify.ok) return { ok: true, installedNow: true, logs };
    }
  }

  const npmInstall = await run('npm install -g @openclaw/core', 25 * 60 * 1000);
  if (!npmInstall.ok) {
    return {
      ok: false,
      installedNow: false,
      logs,
      error: 'Failed to install OpenClaw (brew/npm both unavailable or failed).',
    };
  }
  const verify = await run('openclaw --version', 10000);
  if (!verify.ok) {
    return {
      ok: false,
      installedNow: false,
      logs,
      error: 'OpenClaw install finished but CLI is still unavailable in PATH.',
    };
  }
  return { ok: true, installedNow: true, logs };
}

ipcMain.handle('setup:install-local-openclaw', async () => {
  const installResult = await installOpenClawIfMissing();
  const logs = [...installResult.logs];
  if (!installResult.ok) {
    return { success: false, error: installResult.error || 'Failed to install OpenClaw.', logs };
  }
  try {
    await startGateway();
  } catch (err) {
    logs.push(`[gateway:start] ${String(err)}`);
  }
  const probe = await resolveGatewayPort();
  if (!probe.success) {
    return { success: false, error: probe.error || 'Gateway failed to start', logs };
  }

  try {
    if (isInitialized()) {
      setSetting(GW_MODE_KEY, 'local');
    }
  } catch (err) {
    console.warn('[setup] set local mode after install failed:', err);
  }
  persistGatewayConnectionToConfig({
    mode: 'local',
    protocol: 'ws',
    host: '127.0.0.1',
    port: probe.port ?? getResolvedGatewayPort(),
  });
  return { success: true, port: probe.port, logs, installedNow: installResult.installedNow };
});

// Legacy setup channels compatibility
ipcMain.handle('openclaw:status', async () => {
  try {
    const { stdout: pathStdout } = await execAsync('command -v openclaw', { timeout: 3000 });
    const cliPath = pathStdout.trim();
    let version = '';
    try {
      const { stdout } = await execAsync('openclaw --version', { timeout: 5000 });
      version = stdout.trim();
    } catch {
      // ignore version failure
    }
    return {
      packageExists: !!cliPath,
      isBuilt: !!cliPath,
      dir: cliPath,
      version,
    };
  } catch {
    return {
      packageExists: false,
      isBuilt: false,
      dir: '',
      version: '',
    };
  }
});

ipcMain.handle('uv:install-all', async () => {
  try {
    await execAsync('uv --version', { timeout: 5000 });
    return { success: true };
  } catch {
    // 兼容旧向导：此处优先保证 OpenClaw 运行所需环境可用
    try {
      await execAsync('npm install -g @openclaw/core', { timeout: 20 * 60 * 1000, maxBuffer: 1024 * 1024 * 8 });
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
});

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

ipcMain.handle('codex:open-login', async (_event, payload?: { forceReauth?: boolean; url?: string; title?: string }) => {
  try {
    const data = (payload || {}) as { forceReauth?: boolean; url?: string; title?: string };
    const maybeUrl = typeof data.url === 'string' ? data.url : '';
    if (/auth\.openai\.com\/oauth\/authorize/i.test(maybeUrl)) {
      const mode = await openOpenAiAuthorizationUrl(maybeUrl, Boolean(data.forceReauth));
      return { success: true, mode };
    }
    await openCodexAuthWindow({
      forceReauth: Boolean(data.forceReauth),
      url: maybeUrl || undefined,
      title: typeof data.title === 'string' ? data.title : undefined,
    });
    return { success: true, mode: 'embedded' as const };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Sessions list - 代理到 OpenClaw Gateway
ipcMain.handle('sessions.list', async (_event, payload: {
  limit?: number;
  agentId?: string;
  activeMinutes?: number;
  includeDerivedTitles?: boolean;
  includeLastMessage?: boolean;
  includeGlobal?: boolean;
  includeUnknown?: boolean;
  search?: string;
  label?: string;
  spawnedBy?: string;
}) => {
  try {
    const {
      limit,
      agentId,
      activeMinutes,
      includeDerivedTitles,
      includeLastMessage,
      includeGlobal,
      includeUnknown,
      search,
      label,
      spawnedBy,
    } = payload || {};

    const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1000);
    const safeActiveMinutes = Number.isFinite(Number(activeMinutes))
      ? Math.min(Math.max(Number(activeMinutes), 1), 52560000)
      : 5256000; // 10 years
    const listParams: Record<string, unknown> = {
      limit: safeLimit,
      activeMinutes: safeActiveMinutes,
      includeDerivedTitles: includeDerivedTitles !== false,
      includeLastMessage: includeLastMessage !== false,
    };
    if (agentId) listParams.agentId = agentId;
    if (typeof includeGlobal === 'boolean') listParams.includeGlobal = includeGlobal;
    if (typeof includeUnknown === 'boolean') listParams.includeUnknown = includeUnknown;
    if (typeof search === 'string' && search.trim()) listParams.search = search.trim();
    if (typeof label === 'string' && label.trim()) listParams.label = label.trim();
    if (typeof spawnedBy === 'string' && spawnedBy.trim()) listParams.spawnedBy = spawnedBy.trim();

    const result = await callGatewayRpcWithRetry('sessions.list', listParams, 15000);
    if (!result.ok) {
      console.warn('[SessionsList] RPC failed:', result.error);
      const localOnly = mergeSessionsWithLocalFallback([], safeLimit);
      return { sessions: localOnly, error: result.error };
    }
    const data = (result.result ?? {}) as Record<string, unknown>;
    const sessions = Array.isArray(data.sessions)
      ? (data.sessions as Array<Record<string, unknown>>)
      : [];
    const merged = mergeSessionsWithLocalFallback(sessions, safeLimit);
    return { sessions: merged };
  } catch (err) {
    console.warn('[SessionsList] Unexpected error:', err);
    const localOnly = mergeSessionsWithLocalFallback([], 500);
    return { sessions: localOnly, error: String(err) };
  }
});

// Host API proxy - Gateway REST API（端口从 openclaw.json 或连接探测结果动态解析）
function getGatewayApiBase(): string {
  const cfg = getGatewayConnectionSettings();
  const httpProtocol = cfg.protocol === 'wss' ? 'https' : 'http';
  return `${httpProtocol}://${cfg.host}:${cfg.port}`;
}

/** AxonClawX 默认 HTTP 端口，WebSocket 失败时可尝试从此处获取 agents */
const AXONCLAWX_HTTP_PORT = 18080;

/** 从 AxonClawX HTTP API (18080) 获取 agents，WebSocket RPC 失败时的回退 */
async function fetchAgentsFromAxonClawX(): Promise<{
  agents: Array<{ id: string; name?: string; isDefault?: boolean; modelDisplay?: string; inheritedModel?: boolean; workspace?: string; agentDir?: string; mainSessionKey?: string; channelTypes?: string[] }>;
  defaultAgentId: string;
  configuredChannelTypes: string[];
  channelOwners: Record<string, string>;
} | null> {
  const bases = [`http://127.0.0.1:${AXONCLAWX_HTTP_PORT}`, `http://127.0.0.1:${getResolvedGatewayPort()}`];
  for (const base of bases) {
    // AxonClawX 使用 POST /api/v1/gw/proxy { method: 'agents.list', params: {} }，与 gwApi.agents() 一致
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
    // 兼容旧版或非 AxonClawX 的 GET 接口
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
  const cfg = getGatewayConnectionSettings();
  if (cfg.mode === 'local') {
    const port = getResolvedGatewayPort();
    return `ws://127.0.0.1:${port}/ws`;
  }
  return `${cfg.protocol}://${cfg.host}:${cfg.port}/ws`;
}

function parseSessionIdFromKey(sessionKeyRaw: unknown): string | null {
  const sessionKey = String(sessionKeyRaw || '').trim();
  if (!sessionKey) return null;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRe.test(sessionKey)) return sessionKey;
  const parts = sessionKey.split(':').filter(Boolean);
  const tail = parts[parts.length - 1] || '';
  if (uuidRe.test(tail)) return tail;
  // OpenClaw sessions are not always UUIDs (for example AxonClawX creates
  // run/session-* keys). Allow a conservative file-stem fallback so local
  // history recovery and soft-delete still map to the correct JSONL file.
  if (/^[A-Za-z0-9._-]{1,180}$/.test(tail) && !tail.endsWith('.deleted')) return tail;
  return null;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    const texts = (content as Array<Record<string, unknown>>)
      .map((b) => (typeof b?.text === 'string' ? b.text : ''))
      .filter(Boolean);
    return texts.join(' ').trim();
  }
  return '';
}

type LocalSessionSummary = {
  key: string;
  sessionId?: string;
  displayName?: string;
  label?: string;
  updatedAt: number;
  model?: string;
};

type LocalSessionIndexEntry = {
  key: string;
  agentId: string;
  sessionId?: string;
  sessionFile?: string;
  updatedAt?: number;
  model?: string;
};

function readLocalSessionIndex(agentId: string): Record<string, unknown> {
  const indexFile = path.join(os.homedir(), '.openclaw', 'agents', agentId, 'sessions', 'sessions.json');
  if (!fs.existsSync(indexFile)) return {};
  try {
    const rawIndex = JSON.parse(fs.readFileSync(indexFile, 'utf8')) as Record<string, unknown>;
    const nested = rawIndex.sessions;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    return rawIndex;
  } catch {
    return {};
  }
}

function normalizeLocalSessionIndexEntry(
  key: string,
  agentId: string,
  entryRaw: unknown,
): LocalSessionIndexEntry | null {
  if (!entryRaw || typeof entryRaw !== 'object') return null;
  if (isSubagentSessionKey(key)) return null;
  const entry = entryRaw as Record<string, unknown>;
  const sessionId = String(entry.sessionId || '').trim();
  const sessionFile = String(entry.sessionFile || entry.file || entry.path || '').trim();
  const provider = String(entry.providerOverride || entry.provider || '').trim();
  const modelId = String(entry.modelOverride || entry.modelId || entry.model || '').trim();
  const updatedAt = Number(entry.updatedAt || entry.lastInteractionAt || 0);
  return {
    key,
    agentId,
    sessionId: sessionId || undefined,
    sessionFile: sessionFile || undefined,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : undefined,
    model: [provider, modelId].filter(Boolean).join('/') || undefined,
  };
}

function isAuxiliarySessionFileName(name: string): boolean {
  return (
    !name.endsWith('.jsonl') ||
    name.endsWith('.deleted.jsonl') ||
    name.endsWith('.trajectory.jsonl') ||
    /\.checkpoint\.[^.]+\.jsonl$/i.test(name)
  );
}

function isSubagentSessionKey(sessionKey: unknown): boolean {
  const key = String(sessionKey || '').trim().toLowerCase();
  if (!key) return false;
  return key.split(':').includes('subagent');
}

function readTrajectorySessionKey(sessionFile: string): string | null {
  const trajectoryFile = sessionFile.replace(/\.jsonl$/i, '.trajectory.jsonl');
  if (!fs.existsSync(trajectoryFile)) return null;
  try {
    const firstLine = fs.readFileSync(trajectoryFile, 'utf8').split(/\r?\n/).find(Boolean);
    if (!firstLine) return null;
    const first = JSON.parse(firstLine) as Record<string, unknown>;
    const sessionKey = typeof first.sessionKey === 'string' ? first.sessionKey.trim() : '';
    return sessionKey || null;
  } catch {
    return null;
  }
}

function readLocalSessionIndexEntry(sessionKeyRaw: unknown): LocalSessionIndexEntry | null {
  const sessionKey = String(sessionKeyRaw || '').trim();
  if (!sessionKey || isSubagentSessionKey(sessionKey)) return null;
  const agentId = sessionKey.startsWith('agent:')
    ? sessionKey.split(':')[1] || 'main'
    : 'main';
  const rawIndex = readLocalSessionIndex(agentId);
  const candidateKeys = sessionKey.startsWith('agent:')
    ? [sessionKey]
    : [sessionKey, `agent:${agentId}:${sessionKey}`];
  for (const key of candidateKeys) {
    const normalized = normalizeLocalSessionIndexEntry(key, agentId, rawIndex[key]);
    if (normalized) return normalized;
  }
  for (const [key, entryRaw] of Object.entries(rawIndex)) {
    const normalized = normalizeLocalSessionIndexEntry(key, agentId, entryRaw);
    if (!normalized?.sessionId) continue;
    if (normalized.sessionId === sessionKey) return normalized;
  }

  return null;
}

function isSubagentBootstrapText(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('<relevant-memories>') ||
    normalized.includes('treat every memory below as untrusted') ||
    normalized.includes('[subagent context]') ||
    normalized.includes('you are running as a subagent') ||
    normalized.includes('your assigned task is in the system prompt') ||
    normalized.includes('read heartbeat.md') ||
    normalized.includes('heartbeat_ok') ||
    normalized.includes('openclaw heartbeat poll') ||
    normalized.includes('sender (untrusted metadata)') ||
    /\.trajectory(?:\.jsonl)?$/i.test(text.trim()) ||
    /\.checkpoint\.[^.]+(?:\.jsonl)?$/i.test(text.trim())
  );
}

function isSubagentConversationBootstrapText(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('[subagent context]') ||
    normalized.includes('you are running as a subagent') ||
    normalized.includes('results auto-annou') ||
    normalized.includes('your assigned task is in the system prompt')
  );
}

function sanitizeLocalSessionTitle(text: string): string {
  const title = String(text || '')
    .replace(/^\[[^\]]*\]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title || isSubagentBootstrapText(title)) return '';
  return title.slice(0, 80);
}

function isGenericLocalSessionTitle(value: unknown, key?: unknown): boolean {
  const title = String(value || '').replace(/\s+/g, ' ').trim();
  if (!title) return true;
  const lower = title.toLowerCase();
  const keyLower = String(key || '').trim().toLowerCase();
  return (
    lower === keyLower ||
    lower === 'main' ||
    lower === 'assistant' ||
    lower === 'axonclawx' ||
    lower === 'axonclaw' ||
    lower === 'clawx' ||
    lower === 'claw' ||
    lower === 'new chat' ||
    lower === 'untitled' ||
    lower.startsWith('agent:') ||
    /^session[-:]/i.test(title) ||
    /^run[-:]/i.test(title)
  );
}

function isPrimarySessionRecord(s: Record<string, unknown>): boolean {
  const key = String(s?.key || s?.sessionKey || '').trim();
  if (!key) return false;
  if (isSubagentSessionKey(key)) return false;
  const spawnedBy = String(s?.spawnedBy || s?.parentSessionKey || s?.parentRunId || s?.parentId || '').trim();
  if (spawnedBy) return false;
  const kind = String(s?.kind || s?.type || '').trim().toLowerCase();
  if (kind === 'subagent' || kind === 'child' || kind === 'spawned') return false;
  return true;
}

function readLocalSessionSummaries(limit = 1000): LocalSessionSummary[] {
  const roots = [
    path.join(os.homedir(), '.openclaw', 'agents'),
  ];
  const sessions: LocalSessionSummary[] = [];
  const seenKeys = new Set<string>();

  for (const agentsRoot of roots) {
    if (!fs.existsSync(agentsRoot)) continue;
    let agentIds: string[] = [];
    try {
      agentIds = fs.readdirSync(agentsRoot).filter((name) => {
        const full = path.join(agentsRoot, name);
        try {
          return fs.statSync(full).isDirectory();
        } catch {
          return false;
        }
      });
    } catch {
      continue;
    }

    for (const agentId of agentIds) {
      const dir = path.join(agentsRoot, agentId, 'sessions');
      if (!fs.existsSync(dir)) continue;
      const indexBySessionId = new Map<string, LocalSessionIndexEntry>();
      const rawIndex = readLocalSessionIndex(agentId);
      for (const [key, entryRaw] of Object.entries(rawIndex)) {
        const entry = normalizeLocalSessionIndexEntry(key, agentId, entryRaw);
        if (!entry?.sessionId) continue;
        indexBySessionId.set(entry.sessionId, entry);
      }
      let files: string[] = [];
      try {
        files = fs.readdirSync(dir)
          .filter((name) => !isAuxiliarySessionFileName(name));
      } catch {
        continue;
      }

      for (const name of files) {
        const id = name.replace(/\.jsonl$/i, '');
        const full = path.join(dir, name);
        try {
          const trajectorySessionKey = readTrajectorySessionKey(full);
          if (isSubagentSessionKey(trajectorySessionKey)) continue;
          const indexedEntry = indexBySessionId.get(id);
          if (indexedEntry && isSubagentSessionKey(indexedEntry.key)) continue;
          // Do not let a run trajectory's sessionKey override the real
          // sessions.json mapping. Some trajectory files point at a parent
          // session key while their JSONL filename is a different run/session
          // id; using that value as the list identity makes the sidebar point
          // at the wrong transcript and causes apparent cross-session history.
          const sessionKey = indexedEntry?.key || `agent:${agentId}:${id}`;
          const raw = fs.readFileSync(full, 'utf8');
          const lines = raw.split(/\r?\n/).filter(Boolean);
          if (lines.length === 0) continue;

          let updatedAt = indexedEntry?.updatedAt || 0;
          let firstUserText = '';
          let modelText = indexedEntry?.model || '';
          let likelySubagentConversation = false;
          for (const line of lines) {
            let obj: Record<string, unknown> | null = null;
            try {
              obj = JSON.parse(line) as Record<string, unknown>;
            } catch {
              continue;
            }
            const ts = Date.parse(String(obj.timestamp || ''));
            if (Number.isFinite(ts) && ts > updatedAt) updatedAt = ts;

            if (!modelText && obj.type === 'model_change') {
              const provider = String(obj.provider || '').trim();
              const modelId = String(obj.modelId || '').trim();
              if (provider || modelId) modelText = [provider, modelId].filter(Boolean).join('/');
            }

            if (!firstUserText && obj.type === 'message') {
              const msg = (obj.message && typeof obj.message === 'object')
                ? (obj.message as Record<string, unknown>)
                : null;
              if (msg && msg.role === 'user') {
                const rawUserText = extractTextFromContent(msg.content);
                if (isSubagentConversationBootstrapText(rawUserText)) {
                  likelySubagentConversation = true;
                  break;
                }
                const candidate = sanitizeLocalSessionTitle(rawUserText);
                if (candidate) firstUserText = candidate;
              }
            }
          }

          if (likelySubagentConversation) continue;
          if (!firstUserText) continue;

          if (!updatedAt) {
            const st = fs.statSync(full);
            updatedAt = st.mtimeMs;
          }

          if (seenKeys.has(sessionKey)) continue;
          seenKeys.add(sessionKey);
          sessions.push({
            key: sessionKey,
            sessionId: id,
            displayName: firstUserText,
            label: firstUserText,
            updatedAt,
            model: modelText || undefined,
          });
        } catch {
          // skip bad session files
        }
      }
    }
  }

  sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return sessions.slice(0, Math.max(1, limit));
}

function getMessageComparisonKey(message: Record<string, unknown>): string {
  const msgId = String(message.id || '').trim();
  if (msgId) return `id:${msgId}`;
  const role = String(message.role || '').trim();
  const timestampMs = getMessageTimestampMs(message);
  const timestamp = timestampMs != null ? String(Math.round(timestampMs)) : '';
  const text = extractTextFromContent(message.content).replace(/\s+/g, ' ').trim().slice(0, 240);
  return [role, timestamp, text].join('|');
}

function getMessageTimestampMs(message: Record<string, unknown>): number | null {
  const raw = message.timestamp;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function mergeLocalAndRemoteHistory(
  remoteMessages: Array<Record<string, unknown>>,
  localMessages: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  if (localMessages.length === 0) return remoteMessages;
  if (remoteMessages.length === 0) return localMessages;

  const merged: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const msg of [...localMessages, ...remoteMessages]) {
    const key = getMessageComparisonKey(msg);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    merged.push(msg);
  }

  const withIndex = merged.map((message, index) => ({ message, index }));
  withIndex.sort((a, b) => {
    const at = getMessageTimestampMs(a.message);
    const bt = getMessageTimestampMs(b.message);
    if (at != null && bt != null && at !== bt) return at - bt;
    if (at != null && bt == null) return -1;
    if (at == null && bt != null) return 1;
    return a.index - b.index;
  });
  return withIndex.map((item) => item.message);
}

function readLocalSessionHistory(sessionKeyRaw: unknown, limit = 200): Array<Record<string, unknown>> {
  const indexEntry = readLocalSessionIndexEntry(sessionKeyRaw);
  const sessionId = indexEntry?.sessionId || parseSessionIdFromKey(sessionKeyRaw);
  if (!sessionId && !indexEntry?.sessionFile) return [];

  const matchAgent = String(sessionKeyRaw || '').startsWith('agent:')
    ? String(sessionKeyRaw).split(':')[1] || 'main'
    : 'main';

  const candidateFiles = [
    indexEntry?.sessionFile || '',
    indexEntry?.sessionId
      ? path.join(os.homedir(), '.openclaw', 'agents', indexEntry.agentId, 'sessions', `${indexEntry.sessionId}.jsonl`)
      : '',
    sessionId ? path.join(os.homedir(), '.openclaw', 'agents', matchAgent, 'sessions', `${sessionId}.jsonl`) : '',
    sessionId ? path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions', `${sessionId}.jsonl`) : '',
    sessionId ? path.join(os.homedir(), '.openclaw', 'agents', matchAgent, 'sessions', `${sessionId}.deleted.jsonl`) : '',
    sessionId ? path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions', `${sessionId}.deleted.jsonl`) : '',
  ].filter(Boolean);
  const existing = candidateFiles.find((f) => fs.existsSync(f));
  if (!existing) return [];

  try {
    const lines = fs.readFileSync(existing, 'utf8').split(/\r?\n/).filter(Boolean);
    const messages: Array<Record<string, unknown>> = [];
    for (const line of lines) {
      let obj: Record<string, unknown> | null = null;
      try {
        obj = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (obj.type !== 'message') continue;
      const msg = (obj.message && typeof obj.message === 'object')
        ? (obj.message as Record<string, unknown>)
        : null;
      if (!msg) continue;
      if (typeof msg.timestamp !== 'number') {
        const ts = Date.parse(String(obj.timestamp || ''));
        if (Number.isFinite(ts)) msg.timestamp = Math.floor(ts / 1000);
      }
      messages.push(msg);
    }
    if (messages.length <= limit) return messages;
    return messages.slice(messages.length - limit);
  } catch {
    return [];
  }
}

function mergeSessionsWithLocalFallback(
  gatewaySessions: Array<Record<string, unknown>>,
  limit: number,
): Array<Record<string, unknown>> {
  const merged = new Map<string, Record<string, unknown>>();
  for (const s of gatewaySessions) {
    const key = String(s?.key || '').trim();
    if (!key) continue;
    if (!isPrimarySessionRecord(s)) continue;
    merged.set(key, s);
  }

  const locals = readLocalSessionSummaries(limit);
  for (const s of locals) {
    if (merged.has(s.key)) {
      const existing = merged.get(s.key) || {};
      const currentDisplayName = String(existing.displayName || existing.label || '').trim();
      const shouldUseLocalTitle = isGenericLocalSessionTitle(currentDisplayName, s.key);
      merged.set(s.key, {
        ...existing,
        sessionId: String(existing.sessionId || '').trim() || s.sessionId || undefined,
        displayName: shouldUseLocalTitle ? (s.displayName || s.key) : currentDisplayName,
        label: shouldUseLocalTitle ? (s.label || s.displayName || undefined) : (String(existing.label || '').trim() || currentDisplayName),
        updatedAt: Number(existing.updatedAt || 0) > 0 ? existing.updatedAt : s.updatedAt,
        model: String(existing.model || '').trim() || s.model || undefined,
      });
      continue;
    }
    merged.set(s.key, {
      key: s.key,
      sessionId: s.sessionId || undefined,
      kind: 'direct',
      displayName: s.displayName || s.key,
      label: s.label || undefined,
      updatedAt: s.updatedAt,
      model: s.model || undefined,
      localFallback: true,
    });
  }

  const out = Array.from(merged.values()).filter((session) => {
    const title = String(session.displayName || session.label || '').trim();
    if (!isGenericLocalSessionTitle(title, session.key)) return true;
    if (session.localFallback) return true;
    if (session.hasActiveRun || session.status === 'running') return true;
    return false;
  });
  out.sort((a, b) => {
    const ta = Number(a?.updatedAt || 0);
    const tb = Number(b?.updatedAt || 0);
    return tb - ta;
  });
  return out.slice(0, Math.max(1, limit));
}

async function testGatewayWsConnection(
  protocol: 'ws' | 'wss',
  host: string,
  port: number,
  token: string,
  timeoutMs = 8000
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const WebSocket = require('ws');
    const ws = new WebSocket(`${protocol}://${host}:${port}/ws`);
    let finished = false;

    const done = (result: { success: boolean; error?: string }) => {
      if (finished) return;
      finished = true;
      try {
        ws.close();
      } catch {
        // ignore
      }
      resolve(result);
    };

    const timeout = setTimeout(() => done({ success: false, error: 'Connection timeout' }), timeoutMs);

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          const auth = buildGatewayConnectAuth(token);
          const scopes = ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals', 'operator.pairing'];
          const nonce = String(msg?.payload?.nonce || '');
          const device = buildSignedGatewayDevice(
            nonce,
            auth.token ?? auth.deviceToken ?? null,
            'gateway-client',
            'ui',
            'operator',
            scopes,
          );
          ws.send(JSON.stringify({
            type: 'req',
            id: 'setup-connect-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: 'gateway-client',
                displayName: 'AxonClawX Setup',
                version: '1.0.0',
                platform: process.platform,
                mode: 'ui',
              },
              auth,
              ...(device ? { device } : {}),
              role: 'operator',
              scopes,
            },
          }));
          return;
        }
        if (msg.type === 'res' && String(msg.id).startsWith('setup-connect-')) {
          clearTimeout(timeout);
          if (msg.ok) {
            done({ success: true });
          } else {
            const errCode = String(msg?.error?.code || '').toUpperCase();
            const errDetail = String(msg?.error?.details?.code || '').toUpperCase();
            const errText = String(msg?.error?.message ?? msg?.error ?? '').toLowerCase();
            const deviceRequired = (
              errCode === 'NOT_PAIRED'
              || errDetail === 'DEVICE_IDENTITY_REQUIRED'
              || errDetail === 'PAIRING_REQUIRED'
              || errText.includes('device identity required')
              || errText.includes('pairing required')
            );
            const isLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
            if (deviceRequired && isLoopback) {
              done({ success: true });
              return;
            }
            done({ success: false, error: String(msg.error?.message ?? msg.error ?? 'Authentication failed') });
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timeout);
      done({ success: false, error: err.message || 'WebSocket error' });
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (!finished) done({ success: false, error: 'Connection closed' });
    });
  });
}
// 保存 path 模块引用，避免在 hostapi:fetch handler 中被同名参数遮蔽
const nodePath = path;
const OPENCLAW_CFG_PATH = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
const AXONCLAWX_CFG_PATH = nodePath.join(os.homedir(), '.openclaw', 'axonclawx.json');
const OPENAI_CODEX_MODEL_CATALOG: Array<{ id: string; name: string }> = [
  { id: 'gpt-5.5', name: 'GPT-5.5' },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4-Mini' },
  { id: 'gpt-5.3-codex', name: 'GPT-5.3-Codex' },
];

function isUnsupportedOpenAiCodexModelId(id: string): boolean {
  return /^gpt-5\.2-codex$/i.test(String(id || '').trim());
}

function mergeOpenAiCodexModels(value: unknown): Array<{ id: string; name?: string }> {
  const dedup = new Map<string, { id: string; name?: string }>();
  for (const model of asFlexibleModelArray(value)) {
    if (isUnsupportedOpenAiCodexModelId(model.id)) continue;
    dedup.set(model.id, model);
  }
  for (const model of OPENAI_CODEX_MODEL_CATALOG) {
    if (!dedup.has(model.id)) dedup.set(model.id, model);
  }
  return Array.from(dedup.values());
}

function isOpenAiCodexCatalogModelRef(value: unknown): boolean {
  const raw = normalizeModelAlias(typeof value === 'string' ? value : '');
  const [provider, ...modelParts] = raw.split('/');
  if (provider !== 'openai-codex') return false;
  const modelId = modelParts.join('/');
  return OPENAI_CODEX_MODEL_CATALOG.some((model) => model.id === modelId);
}

function ensureOpenAiCodexModelCatalogInConfig(): { changed: boolean; models: string[] } {
  const cfg = readOpenclawConfig();
  const models = ensureRecord(cfg.models);
  const providers = ensureRecord(models.providers);
  const provider = ensureRecord(providers['openai-codex']);
  const agents = ensureRecord(cfg.agents);
  const defaults = ensureRecord(agents.defaults);
  const defaultModels = ensureRecord(defaults.models);
  const before = JSON.stringify({
    baseUrl: provider.baseUrl,
    api: provider.api,
    models: asFlexibleModelArray(provider.models),
    defaultModels,
  });

  provider.baseUrl = 'https://chatgpt.com/backend-api';
  provider.api = 'openai-codex-responses';
  provider.models = mergeOpenAiCodexModels(provider.models);
  providers['openai-codex'] = provider;
  models.providers = providers;
  if (!models.mode) models.mode = 'merge';
  cfg.models = models;

  for (const model of OPENAI_CODEX_MODEL_CATALOG) {
    const modelRef = `openai-codex/${model.id}`;
    defaultModels[modelRef] = {
      ...ensureRecord(defaultModels[modelRef]),
      alias: model.name,
    };
  }
  defaults.models = defaultModels;
  agents.defaults = defaults;
  cfg.agents = agents;

  const after = JSON.stringify({
    baseUrl: provider.baseUrl,
    api: provider.api,
    models: asFlexibleModelArray(provider.models),
    defaultModels,
  });
  const changed = before !== after;
  if (changed) {
    writeOpenclawConfig(cfg);
  }

  return {
    changed,
    models: asFlexibleModelArray(provider.models).map((model) => `openai-codex/${model.id}`),
  };
}

function ensureConfiguredModelAliasesInConfig(): { changed: boolean; models: string[] } {
  const cfg = readOpenclawConfig();
  const modelsNode = ensureRecord(cfg.models);
  const providers = ensureRecord(modelsNode.providers);
  const agents = ensureRecord(cfg.agents);
  const defaults = ensureRecord(agents.defaults);
  const defaultModels = ensureRecord(defaults.models);
  const before = JSON.stringify(defaultModels);
  const refs: string[] = [];

  for (const [providerId, providerRaw] of Object.entries(providers)) {
    const provider = ensureRecord(providerRaw);
    const providerModels = providerId === 'openai-codex'
      ? mergeOpenAiCodexModels(provider.models)
      : asFlexibleModelArray(provider.models);
    for (const model of providerModels) {
      const modelId = String(model.id || '').trim();
      if (!providerId || !modelId) continue;
      const modelRef = normalizeModelAlias(`${providerId}/${modelId}`);
      refs.push(modelRef);
      defaultModels[modelRef] = {
        ...ensureRecord(defaultModels[modelRef]),
        alias: String(model.name || modelId).trim() || modelId,
      };
    }
  }

  defaults.models = defaultModels;
  agents.defaults = defaults;
  cfg.agents = agents;

  const changed = before !== JSON.stringify(defaultModels);
  if (changed) {
    writeOpenclawConfig(cfg);
  }

  return { changed, models: refs };
}

function parseOpenclawConfigText(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // 兼容含注释/尾逗号；仅去掉“整行注释”，避免误伤 file:// / https://
    const cleaned = raw
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1');
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch (jsonErr) {
      // OpenClaw allows JSON5-like config files with unquoted object keys.
      // The file is user-local config, not remote input; parsing it as an object
      // literal keeps AxonClawX repair/write flows aligned with OpenClaw.
      try {
        return Function(`"use strict"; return (${raw});`)() as Record<string, unknown>;
      } catch {
        throw jsonErr;
      }
    }
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

function readAxonclawxConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(AXONCLAWX_CFG_PATH)) {
      const raw = fs.readFileSync(AXONCLAWX_CFG_PATH, 'utf8');
      return parseOpenclawConfigText(raw);
    }
  } catch (err) {
    console.warn('[HostAPI] read axonclawx config failed:', err);
  }
  return {};
}

function writeAxonclawxConfig(config: Record<string, unknown>): void {
  const dir = nodePath.dirname(AXONCLAWX_CFG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AXONCLAWX_CFG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function isRedactedSecretValue(value: unknown): boolean {
  const text = String(value || '').trim();
  if (!text) return false;
  return text === '__OPENCLAW_REDACTED__'
    || text === '[REDACTED]'
    || text.toLowerCase() === '<redacted>'
    || /^\*+ED__$/.test(text);
}

function preserveExistingSecretIfRedacted(
  nextOwner: Record<string, unknown>,
  existingOwner: Record<string, unknown>,
  key: string,
): void {
  if (!isRedactedSecretValue(nextOwner[key])) return;
  const existingSecret = String(existingOwner[key] || '').trim();
  if (existingSecret && !isRedactedSecretValue(existingSecret)) {
    nextOwner[key] = existingSecret;
    return;
  }
  delete nextOwner[key];
}

function writeOpenclawConfig(config: Record<string, unknown>): void {
  const existingConfig = readOpenclawConfig();
  // Global guard: OpenClaw schema rejects setupComplete at root/ui and rejects axonclawx.
  if ('setupComplete' in config) {
    delete (config as Record<string, unknown>).setupComplete;
  }
  if ('axonclawx' in config) {
    delete (config as Record<string, unknown>).axonclawx;
  }
  const ui = ensureRecord(config.ui);
  if ('setupComplete' in ui) {
    delete ui.setupComplete;
  }
  if ('language' in ui) {
    delete ui.language;
  }
  config.ui = ui;
  const gateway = ensureRecord(config.gateway);
  const existingGateway = ensureRecord(existingConfig.gateway);
  const gatewayAuth = ensureRecord(gateway.auth);
  const existingGatewayAuth = ensureRecord(existingGateway.auth);
  preserveExistingSecretIfRedacted(gatewayAuth, existingGatewayAuth, 'token');
  gateway.auth = gatewayAuth;
  config.gateway = gateway;
  const models = ensureRecord(config.models);
  if ('default' in models) {
    delete models.default;
  }
  const providers = ensureRecord(models.providers);
  const existingModels = ensureRecord(existingConfig.models);
  const existingProviders = ensureRecord(existingModels.providers);
  const providerUiOnlyKeys = [
    'accountId',
    'vendorId',
    'label',
    'authMode',
    'apiProtocol',
    'model',
    'enabled',
    'createdAt',
    'updatedAt',
    'fallbackModels',
    'fallbackAccountIds',
    'fallbackProviderIds',
    'email',
    'metadata',
  ];
  for (const [providerId, providerRaw] of Object.entries(providers)) {
    const provider = ensureRecord(providerRaw);
    const existingProvider = ensureRecord(existingProviders[providerId]);
    let changed = false;
    preserveExistingSecretIfRedacted(provider, existingProvider, 'apiKey');
    for (const key of providerUiOnlyKeys) {
      if (key in provider) {
        delete provider[key];
        changed = true;
      }
    }
    if (providerId === 'openai' && !String(provider.apiKey || '').trim()) {
      delete providers[providerId];
      continue;
    }
    if (providerId === 'openai-codex') {
      provider.baseUrl = 'https://chatgpt.com/backend-api';
      provider.api = 'openai-codex-responses';
      provider.models = mergeOpenAiCodexModels(provider.models);
      changed = true;
    }
    if (changed) {
      providers[providerId] = provider;
    }
  }
  models.providers = providers;
  config.models = models;
  const dir = nodePath.dirname(OPENCLAW_CFG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    if (fs.existsSync(OPENCLAW_CFG_PATH)) {
      const stamp = new Date().toISOString().replace(/[:]/g, '-');
      const bakPath = `${OPENCLAW_CFG_PATH}.bak.${stamp}`;
      fs.copyFileSync(OPENCLAW_CFG_PATH, bakPath);
    }
  } catch (err) {
    console.warn('[HostAPI] backup config before write failed:', err);
  }
  fs.writeFileSync(OPENCLAW_CFG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asModelArray(value: unknown): Array<{ id: string; name?: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const id = typeof rec.id === 'string' ? rec.id.trim() : '';
      if (!id) return null;
      const name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : id;
      return { id, name };
    })
    .filter(Boolean) as Array<{ id: string; name?: string }>;
}

function asFlexibleModelArray(value: unknown): Array<{ id: string; name?: string }> {
  if (!Array.isArray(value)) return [];
  const models: Array<{ id: string; name?: string }> = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const id = item.trim();
      if (!id) continue;
      models.push({ id, name: id });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === 'string' ? rec.id.trim() : '';
    if (!id) continue;
    const name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : id;
    models.push({ id, name });
  }
  const dedup = new Map<string, { id: string; name?: string }>();
  for (const model of models) dedup.set(model.id, model);
  return Array.from(dedup.values());
}

type LocalProviderAuthMode = 'api_key' | 'oauth_device' | 'oauth_browser' | 'local';
type LocalProviderCategory = 'official' | 'compatible' | 'local' | 'custom';

type LocalProviderVendorInfo = {
  id: string;
  name: string;
  icon: string;
  placeholder: string;
  model?: string;
  requiresApiKey: boolean;
  category: LocalProviderCategory;
  envVar?: string;
  supportedAuthModes: LocalProviderAuthMode[];
  defaultAuthMode: LocalProviderAuthMode;
  supportsMultipleAccounts: boolean;
  defaultBaseUrl?: string;
  showBaseUrl?: boolean;
  showModelId?: boolean;
  isOAuth?: boolean;
  supportsApiKey?: boolean;
};

type LocalProviderAccount = {
  id: string;
  vendorId: string;
  label: string;
  authMode: LocalProviderAuthMode;
  baseUrl?: string;
  apiProtocol?: 'openai-completions' | 'openai-responses' | 'anthropic-messages';
  model?: string;
  fallbackModels?: string[];
  fallbackAccountIds?: string[];
  enabled: boolean;
  isDefault: boolean;
  metadata?: {
    region?: string;
    email?: string;
    resourceUrl?: string;
    customModels?: string[];
  };
  createdAt: string;
  updatedAt: string;
};

type LocalProviderStatus = {
  id: string;
  name: string;
  type: string;
  baseUrl?: string;
  apiProtocol?: 'openai-completions' | 'openai-responses' | 'anthropic-messages';
  model?: string;
  fallbackModels?: string[];
  fallbackProviderIds?: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  hasKey: boolean;
  keyMasked: string | null;
};

const LOCAL_PROVIDER_VENDORS: LocalProviderVendorInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🤖',
    placeholder: 'sk-ant-api03-...',
    model: 'Claude',
    requiresApiKey: true,
    category: 'official',
    envVar: 'ANTHROPIC_API_KEY',
    supportedAuthModes: ['api_key'],
    defaultAuthMode: 'api_key',
    supportsMultipleAccounts: false,
    supportsApiKey: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '💚',
    placeholder: 'sk-proj-...',
    model: 'GPT',
    requiresApiKey: true,
    category: 'official',
    envVar: 'OPENAI_API_KEY',
    supportedAuthModes: ['oauth_browser', 'api_key'],
    defaultAuthMode: 'oauth_browser',
    supportsMultipleAccounts: false,
    isOAuth: true,
    supportsApiKey: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'google',
    name: 'Google',
    icon: '🔷',
    placeholder: 'AIza...',
    model: 'Gemini',
    requiresApiKey: true,
    category: 'official',
    envVar: 'GOOGLE_API_KEY',
    supportedAuthModes: ['oauth_browser', 'api_key'],
    defaultAuthMode: 'api_key',
    supportsMultipleAccounts: false,
    isOAuth: true,
    supportsApiKey: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🌐',
    placeholder: 'sk-or-v1-...',
    model: 'Multi-Model',
    requiresApiKey: true,
    category: 'compatible',
    envVar: 'OPENROUTER_API_KEY',
    supportedAuthModes: ['api_key'],
    defaultAuthMode: 'api_key',
    supportsMultipleAccounts: false,
    supportsApiKey: true,
  },
  {
    id: 'ark',
    name: 'ByteDance Ark',
    icon: 'A',
    placeholder: 'ark-api-key',
    model: 'Doubao',
    requiresApiKey: true,
    category: 'compatible',
    supportedAuthModes: ['api_key'],
    defaultAuthMode: 'api_key',
    supportsMultipleAccounts: false,
    supportsApiKey: true,
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    icon: '🌙',
    placeholder: 'sk-...',
    model: 'Kimi',
    requiresApiKey: true,
    category: 'compatible',
    envVar: 'MOONSHOT_API_KEY',
    supportedAuthModes: ['api_key'],
    defaultAuthMode: 'api_key',
    supportsMultipleAccounts: false,
    supportsApiKey: true,
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    icon: '🌊',
    placeholder: 'sk-...',
    model: 'Multi-Model',
    requiresApiKey: true,
    category: 'compatible',
    envVar: 'SILICONFLOW_API_KEY',
    supportedAuthModes: ['api_key'],
    defaultAuthMode: 'api_key',
    supportsMultipleAccounts: false,
    supportsApiKey: true,
  },
  {
    id: 'minimax-portal',
    name: 'MiniMax',
    icon: '☁️',
    placeholder: 'sk-...',
    model: 'MiniMax',
    requiresApiKey: false,
    category: 'compatible',
    supportedAuthModes: ['oauth_browser', 'api_key'],
    defaultAuthMode: 'oauth_browser',
    supportsMultipleAccounts: false,
    isOAuth: true,
    supportsApiKey: true,
  },
  {
    id: 'minimax-portal-cn',
    name: 'MiniMax (CN)',
    icon: '☁️',
    placeholder: 'sk-...',
    model: 'MiniMax',
    requiresApiKey: false,
    category: 'compatible',
    supportedAuthModes: ['oauth_browser', 'api_key'],
    defaultAuthMode: 'oauth_browser',
    supportsMultipleAccounts: false,
    isOAuth: true,
    supportsApiKey: true,
  },
  {
    id: 'qwen-portal',
    name: 'Qwen',
    icon: '☁️',
    placeholder: 'sk-...',
    model: 'Qwen',
    requiresApiKey: false,
    category: 'compatible',
    supportedAuthModes: ['oauth_browser', 'api_key'],
    defaultAuthMode: 'oauth_browser',
    supportsMultipleAccounts: false,
    isOAuth: true,
    supportsApiKey: true,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: '🦙',
    placeholder: 'Not required',
    model: 'Local',
    requiresApiKey: false,
    category: 'local',
    supportedAuthModes: ['local'],
    defaultAuthMode: 'local',
    supportsMultipleAccounts: false,
    supportsApiKey: false,
    defaultBaseUrl: 'http://localhost:11434/v1',
    showBaseUrl: true,
    showModelId: true,
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    icon: '🔮',
    placeholder: 'Not required',
    model: 'Claude (Local)',
    requiresApiKey: false,
    category: 'local',
    supportedAuthModes: ['local', 'api_key'],
    defaultAuthMode: 'local',
    supportsMultipleAccounts: false,
    supportsApiKey: true,
    defaultBaseUrl: 'http://localhost:3210/v1',
    showBaseUrl: true,
    showModelId: true,
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '⚙️',
    placeholder: 'API key...',
    requiresApiKey: true,
    category: 'custom',
    supportedAuthModes: ['api_key'],
    defaultAuthMode: 'api_key',
    supportsMultipleAccounts: true,
    supportsApiKey: true,
    showBaseUrl: true,
    showModelId: true,
  },
];

const LOCAL_PROVIDER_VENDOR_MAP = new Map(
  LOCAL_PROVIDER_VENDORS.map((vendor) => [vendor.id, vendor]),
);

function getProviderVendorInfo(providerId: string): LocalProviderVendorInfo {
  const normalized = normalizeProviderAlias(providerId);
  const direct = LOCAL_PROVIDER_VENDOR_MAP.get(normalized);
  if (direct) return direct;
  return {
    id: normalized || providerId || 'custom',
    name: normalized || providerId || 'Custom',
    icon: '⚙️',
    placeholder: 'API key...',
    requiresApiKey: true,
    category: 'custom',
    supportedAuthModes: ['api_key'],
    defaultAuthMode: 'api_key',
    supportsMultipleAccounts: true,
    supportsApiKey: true,
    showBaseUrl: true,
    showModelId: true,
  };
}

function maskProviderKey(apiKey: string): string | null {
  const value = String(apiKey || '').trim();
  if (!value) return null;
  if (value.length <= 8) return `${value.slice(0, 2)}***${value.slice(-1)}`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function inferLocalProviderAuthMode(providerId: string, providerObj: Record<string, unknown>): LocalProviderAuthMode {
  const authRaw = String(providerObj.authMode || '').trim();
  if (authRaw === 'api_key' || authRaw === 'oauth_device' || authRaw === 'oauth_browser' || authRaw === 'local') {
    return authRaw;
  }
  const normalized = normalizeProviderAlias(providerId);
  if (normalized === 'ollama' || normalized === 'claude-code') {
    return 'local';
  }
  const hasApiKey = String(providerObj.apiKey || '').trim().length > 0;
  if ((normalized === 'openai' || normalized === 'openai-codex') && !hasApiKey) {
    return 'oauth_browser';
  }
  return 'api_key';
}

function hasUsableOAuthCredentialForProvider(providerId: string): boolean {
  const normalizedProvider = normalizeProviderAlias(providerId);
  if (!normalizedProvider) return false;
  const authPath = getMainAgentAuthProfilesPath();
  if (!fs.existsSync(authPath)) return false;

  try {
    const raw = fs.readFileSync(authPath, 'utf8');
    const doc = JSON.parse(raw) as Record<string, unknown>;
    const profiles = ensureRecord(doc.profiles);
    const aliases = providerAliasSet(normalizedProvider);

    for (const profileRaw of Object.values(profiles)) {
      const profile = ensureRecord(profileRaw);
      const profileProvider = normalizeProviderAlias(String(profile.provider || '').trim());
      if (!profileProvider || !aliases.has(profileProvider)) continue;
      const profileType = String(profile.type || '').trim();
      if (profileType === 'api_key') {
        const key = String(profile.key || '').trim();
        if (key) return true;
        continue;
      }
      if (profileType === 'oauth') {
        const access = String(profile.access || '').trim();
        if (!access) continue;
        const expires = Number(profile.expires);
        if (Number.isFinite(expires) && expires > 0 && Date.now() >= expires) continue;
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function getMaskedApiKeyFromAuthProfiles(providerId: string): string | null {
  const normalizedProvider = normalizeProviderAlias(providerId);
  if (!normalizedProvider) return null;
  const authPath = getMainAgentAuthProfilesPath();
  if (!fs.existsSync(authPath)) return null;

  try {
    const raw = fs.readFileSync(authPath, 'utf8');
    const doc = JSON.parse(raw) as Record<string, unknown>;
    const profiles = ensureRecord(doc.profiles);
    const aliases = providerAliasSet(normalizedProvider);

    for (const profileRaw of Object.values(profiles)) {
      const profile = ensureRecord(profileRaw);
      const profileProvider = normalizeProviderAlias(String(profile.provider || '').trim());
      if (!profileProvider || !aliases.has(profileProvider)) continue;
      if (String(profile.type || '').trim() !== 'api_key') continue;
      const key = String(profile.key || '').trim();
      if (!key) continue;
      return maskProviderKey(key);
    }
  } catch {
    return null;
  }

  return null;
}

function findProviderConfigKeyByAccountId(
  providersNode: Record<string, unknown>,
  accountId: string,
): string | null {
  const id = String(accountId || '').trim();
  if (!id) return null;
  if (id in providersNode) return id;
  for (const [providerKey, providerRaw] of Object.entries(providersNode)) {
    const provider = ensureRecord(providerRaw);
    const storedAccountId = String(provider.accountId || '').trim();
    if (storedAccountId && storedAccountId === id) return providerKey;
  }
  const normalized = normalizeProviderAlias(id);
  for (const providerKey of Object.keys(providersNode)) {
    if (normalizeProviderAlias(providerKey) === normalized) return providerKey;
  }
  return null;
}

function readDefaultProviderAccountId(): string | null {
  const axonCfg = readAxonclawxConfig();
  const axon = ensureRecord(axonCfg);
  const auth = ensureRecord(axon.auth);
  const axonDefault = String(auth.defaultProviderAccountId || '').trim();
  if (axonDefault) return axonDefault;

  const cfg = readOpenclawConfig();
  const models = ensureRecord(cfg.models);
  const legacyDefault = String(
    models.defaultProviderAccountId
      || models.defaultAccountId
      || models.defaultProviderId
      || '',
  ).trim();
  return legacyDefault || null;
}

function writeDefaultProviderAccountId(accountId: string | null): void {
  const axonCfg = readAxonclawxConfig();
  const axon = ensureRecord(axonCfg);
  const auth = ensureRecord(axon.auth);
  const nextId = String(accountId || '').trim();
  if (nextId) {
    auth.defaultProviderAccountId = nextId;
  } else if ('defaultProviderAccountId' in auth) {
    delete auth.defaultProviderAccountId;
  }
  axon.auth = auth;
  writeAxonclawxConfig(axon);
}

function scoreLocalProviderAccountCandidate(
  account: LocalProviderAccount,
  status: LocalProviderStatus | undefined,
  defaultAccountId: string | null,
): number {
  let score = 0;
  if (account.id === defaultAccountId) score += 100;
  if (account.isDefault) score += 20;
  if (account.authMode === 'local') score += 10;
  if (status?.hasKey) score += 10;
  if (account.enabled) score += 2;
  return score;
}

function compareLocalProviderCandidates(
  left: { account: LocalProviderAccount; status?: LocalProviderStatus },
  right: { account: LocalProviderAccount; status?: LocalProviderStatus },
  defaultAccountId: string | null,
): number {
  const leftScore = scoreLocalProviderAccountCandidate(left.account, left.status, defaultAccountId);
  const rightScore = scoreLocalProviderAccountCandidate(right.account, right.status, defaultAccountId);
  if (leftScore !== rightScore) return leftScore - rightScore;
  const leftUpdatedAt = String(left.account.updatedAt || '');
  const rightUpdatedAt = String(right.account.updatedAt || '');
  if (leftUpdatedAt !== rightUpdatedAt) return leftUpdatedAt.localeCompare(rightUpdatedAt);
  return String(left.account.id || '').localeCompare(String(right.account.id || ''));
}

function dedupeLocalProviderSnapshotRecords(
  accounts: LocalProviderAccount[],
  statuses: LocalProviderStatus[],
  defaultAccountId: string | null,
): { accounts: LocalProviderAccount[]; statuses: LocalProviderStatus[] } {
  const statusMap = new Map(statuses.map((item) => [item.id, item]));
  const pickedByKey = new Map<string, { account: LocalProviderAccount; status?: LocalProviderStatus }>();

  for (const account of accounts) {
    const vendorId = normalizeProviderAlias(String(account.vendorId || '').trim());
    if (!vendorId) continue;
    const vendorInfo = getProviderVendorInfo(vendorId);
    const allowMultiple = Boolean(vendorInfo.supportsMultipleAccounts);
    const key = allowMultiple ? `account:${account.id}` : `vendor:${vendorId}`;
    const candidate = { account, status: statusMap.get(account.id) };
    const existing = pickedByKey.get(key);
    if (!existing) {
      pickedByKey.set(key, candidate);
      continue;
    }
    if (compareLocalProviderCandidates(candidate, existing, defaultAccountId) > 0) {
      pickedByKey.set(key, candidate);
    }
  }

  const dedupedAccounts = Array.from(pickedByKey.values()).map((entry) => ({
    ...entry.account,
    isDefault: entry.account.id === defaultAccountId,
  }));
  const dedupedStatuses = dedupedAccounts
    .map((account) => statusMap.get(account.id))
    .filter(Boolean) as LocalProviderStatus[];

  return {
    accounts: dedupedAccounts,
    statuses: dedupedStatuses,
  };
}

function readLocalProviderSnapshot(): {
  accounts: LocalProviderAccount[];
  statuses: LocalProviderStatus[];
  vendors: LocalProviderVendorInfo[];
  defaultAccountId: string | null;
} {
  const cfg = readOpenclawConfig();
  const models = ensureRecord(cfg.models);
  const providersNode = ensureRecord(models.providers);
  const nowIso = new Date().toISOString();
  const defaultAccountId = readDefaultProviderAccountId();
  const accounts: LocalProviderAccount[] = [];
  const statuses: LocalProviderStatus[] = [];

  for (const [providerKey, providerRaw] of Object.entries(providersNode)) {
    const provider = ensureRecord(providerRaw);
    const vendorId = normalizeProviderAlias(String(provider.vendorId || providerKey).trim() || providerKey);
    if (!vendorId) continue;
    const vendorInfo = getProviderVendorInfo(vendorId);
    const accountId = String(provider.accountId || providerKey).trim() || providerKey;
    const label = String(provider.label || vendorInfo.name || vendorId).trim() || vendorId;
    const authMode = inferLocalProviderAuthMode(vendorId, provider);
    const modelList = asFlexibleModelArray(provider.models);
    const model = String(provider.model || '').trim() || modelList[0]?.id || '';
    const fallbackModels = Array.isArray(provider.fallbackModels)
      ? (provider.fallbackModels as unknown[]).map((v) => String(v || '').trim()).filter(Boolean)
      : [];
    const fallbackAccountIds = Array.isArray(provider.fallbackAccountIds)
      ? (provider.fallbackAccountIds as unknown[]).map((v) => String(v || '').trim()).filter(Boolean)
      : [];
    const fallbackProviderIds = Array.isArray(provider.fallbackProviderIds)
      ? (provider.fallbackProviderIds as unknown[]).map((v) => normalizeProviderAlias(String(v || '').trim())).filter(Boolean)
      : [];
    const enabled = provider.enabled !== false;
    const createdAt = typeof provider.createdAt === 'string' && provider.createdAt.trim()
      ? provider.createdAt
      : nowIso;
    const updatedAt = typeof provider.updatedAt === 'string' && provider.updatedAt.trim()
      ? provider.updatedAt
      : nowIso;
    const baseUrl = typeof provider.baseUrl === 'string' && provider.baseUrl.trim()
      ? provider.baseUrl.trim()
      : undefined;
    const apiProtocol = (() => {
      const raw = typeof provider.apiProtocol === 'string'
        ? provider.apiProtocol
        : (typeof provider.api === 'string' ? provider.api : '');
      const normalized = raw.trim();
      if (normalized === 'openai-completions' || normalized === 'openai-responses' || normalized === 'anthropic-messages') {
        return normalized;
      }
      return undefined;
    })();
    const apiKey = String(provider.apiKey || '').trim();
    const hasProfileCredential = hasUsableOAuthCredentialForProvider(vendorId);
    const hasKey = Boolean(apiKey) || authMode === 'local' || hasProfileCredential;
    const keyMasked = apiKey
      ? maskProviderKey(apiKey)
      : getMaskedApiKeyFromAuthProfiles(vendorId);

    const account: LocalProviderAccount = {
      id: accountId,
      vendorId,
      label,
      authMode,
      baseUrl,
      apiProtocol,
      model: model || undefined,
      fallbackModels: fallbackModels.length ? fallbackModels : undefined,
      fallbackAccountIds: (fallbackAccountIds.length ? fallbackAccountIds : fallbackProviderIds.length ? fallbackProviderIds : undefined),
      enabled,
      isDefault: defaultAccountId === accountId,
      metadata: {
        email: typeof provider.email === 'string' ? provider.email : undefined,
      },
      createdAt,
      updatedAt,
    };

    const status: LocalProviderStatus = {
      id: accountId,
      name: label,
      type: vendorId,
      baseUrl,
      apiProtocol,
      model: model || undefined,
      fallbackModels: fallbackModels.length ? fallbackModels : undefined,
      fallbackProviderIds: fallbackProviderIds.length
        ? fallbackProviderIds
        : (fallbackAccountIds.length ? fallbackAccountIds : undefined),
      enabled,
      createdAt,
      updatedAt,
      hasKey,
      keyMasked,
    };

    accounts.push(account);
    statuses.push(status);
  }

  const deduped = dedupeLocalProviderSnapshotRecords(accounts, statuses, defaultAccountId);
  accounts.length = 0;
  statuses.length = 0;
  accounts.push(...deduped.accounts);
  statuses.push(...deduped.statuses);

  const existingVendorIds = new Set(accounts.map((item) => normalizeProviderAlias(item.vendorId)));
  const authOnlyProviders = readMainAgentAuthProfileProviders();
  for (const authEntry of authOnlyProviders) {
    const providerId = normalizeProviderAlias(authEntry.providerId);
    if (!providerId || existingVendorIds.has(providerId)) continue;
    const hasOAuthCredential = hasUsableOAuthCredentialForProvider(providerId);
    const hasAnyCredential = Boolean(authEntry.keyMasked) || hasOAuthCredential;
    if (!hasAnyCredential) continue;
    const vendorInfo = getProviderVendorInfo(providerId);
    const createdAt = nowIso;
    const updatedAt = nowIso;
    const account: LocalProviderAccount = {
      id: providerId,
      vendorId: providerId,
      label: vendorInfo.name || providerId,
      authMode: providerId === 'ollama' || providerId === 'claude-code' ? 'local' : 'api_key',
      enabled: true,
      isDefault: defaultAccountId === providerId,
      createdAt,
      updatedAt,
    };
    const status: LocalProviderStatus = {
      id: providerId,
      name: account.label,
      type: providerId,
      enabled: true,
      createdAt,
      updatedAt,
      hasKey: hasAnyCredential,
      keyMasked: authEntry.keyMasked,
    };
    accounts.push(account);
    statuses.push(status);
    existingVendorIds.add(providerId);
  }

  accounts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  statuses.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    accounts,
    statuses,
    vendors: LOCAL_PROVIDER_VENDORS,
    defaultAccountId,
  };
}

function findCodexLikeProviderId(providers: Record<string, unknown>): string | null {
  for (const [providerId, providerValue] of Object.entries(providers)) {
    const provider = ensureRecord(providerValue);
    const idLower = providerId.toLowerCase();
    if (idLower.includes('codex')) return providerId;

    const models = asModelArray(provider.models);
    if (models.some((m) => m.id.toLowerCase().includes('codex'))) {
      return providerId;
    }
  }
  return null;
}

function normalizeProviderAlias(providerId: string): string {
  const value = String(providerId || '').trim();
  if (!value) return '';
  return value;
}

function providerAliasSet(providerId: string): Set<string> {
  const normalized = normalizeProviderAlias(providerId);
  const aliases = new Set<string>([normalized]);
  if (normalized === 'openai-codex') aliases.add('openai');
  return aliases;
}

function isLikelyOpenAiApiKey(rawValue: string): boolean {
  const value = String(rawValue || '').trim();
  if (!value) return false;
  return /^sk-[A-Za-z0-9._-]{10,}$/.test(value);
}

function isLikelyEncryptedSessionToken(rawValue: string): boolean {
  const value = String(rawValue || '').trim();
  if (!value || !value.startsWith('eyJ')) return false;
  // JWE-like token often has double dot between protected header and IV.
  if (value.includes('..')) return true;
  // non-API-key JWT/JWE style token.
  return value.split('.').length >= 3;
}

function isAcceptedProviderApiKey(providerId: string, rawValue: string): boolean {
  const normalizedProvider = normalizeProviderAlias(providerId);
  const value = String(rawValue || '').trim();
  if (!normalizedProvider || !value) return false;
  if (normalizedProvider === 'openai' || normalizedProvider === 'openai-codex') {
    return isLikelyOpenAiApiKey(value);
  }
  return true;
}

function providerApiKeyValidationMessage(providerId: string): string {
  const normalizedProvider = normalizeProviderAlias(providerId);
  if (normalizedProvider === 'openai' || normalizedProvider === 'openai-codex') {
    return 'OpenAI authentication requires an API key (sk-...). Browser session tokens are not supported in API key mode.';
  }
  return 'Invalid API key.';
}

function sanitizeInvalidOpenAiCredentialArtifacts(): {
  configChanged: boolean;
  profileChanged: boolean;
  removedConfigKeys: number;
  removedProfiles: number;
} {
  let configChanged = false;
  let removedConfigKeys = 0;
  try {
    const cfg = readOpenclawConfig();
    const models = ensureRecord(cfg.models);
    const providers = ensureRecord(models.providers);
    for (const [providerId, providerRaw] of Object.entries(providers)) {
      const normalizedProvider = normalizeProviderAlias(providerId);
      if (normalizedProvider !== 'openai' && normalizedProvider !== 'openai-codex') continue;
      const provider = ensureRecord(providerRaw);
      const apiKey = String(provider.apiKey || '').trim();
      if (!apiKey) continue;
      if (!isLikelyOpenAiApiKey(apiKey)) {
        delete provider.apiKey;
        providers[providerId] = provider;
        configChanged = true;
        removedConfigKeys += 1;
      }
    }
    if (configChanged) {
      models.providers = providers;
      cfg.models = models;
      cfg.meta = {
        ...ensureRecord(cfg.meta),
        lastTouchedAt: new Date().toISOString(),
      };
      writeOpenclawConfig(cfg);
    }
  } catch (err) {
    console.warn('[Main] sanitize openai config credentials failed:', err);
  }

  let profileChanged = false;
  let removedProfiles = 0;
  try {
    const authPath = getMainAgentAuthProfilesPath();
    if (!fs.existsSync(authPath)) {
      return { configChanged, profileChanged, removedConfigKeys, removedProfiles };
    }
    const doc = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
    const profiles = ensureRecord(doc.profiles);
    const order = ensureRecord(doc.order);
    const lastGood = ensureRecord(doc.lastGood);
    const usageStats = ensureRecord(doc.usageStats);

    for (const profileId of Object.keys(profiles)) {
      const profile = ensureRecord(profiles[profileId]);
      const providerId = normalizeProviderAlias(String(profile.provider || '').trim());
      if (providerId !== 'openai' && providerId !== 'openai-codex') continue;
      if (String(profile.type || '') !== 'api_key') continue;
      const key = String(profile.key || '').trim();
      if (!key) continue;
      if (!isLikelyOpenAiApiKey(key)) {
        delete profiles[profileId];
        delete usageStats[profileId];
        removedProfiles += 1;
        profileChanged = true;
      }
    }

    for (const alias of ['openai', 'openai-codex']) {
      const currentOrder = Array.isArray(order[alias])
        ? (order[alias] as unknown[]).map((item) => String(item || '').trim()).filter(Boolean)
        : [];
      const nextOrder = currentOrder.filter((profileId) => !!profiles[profileId]);
      if (nextOrder.length !== currentOrder.length) {
        order[alias] = nextOrder;
        profileChanged = true;
      }
      if (lastGood[alias] && !profiles[String(lastGood[alias])]) {
        delete lastGood[alias];
        profileChanged = true;
      }
    }

    if (profileChanged) {
      const next = {
        ...doc,
        version: 1,
        profiles,
        order,
        lastGood,
        usageStats,
      };
      fs.writeFileSync(authPath, JSON.stringify(next, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('[Main] sanitize openai auth profiles failed:', err);
  }

  return { configChanged, profileChanged, removedConfigKeys, removedProfiles };
}

function getMainAgentAuthProfilesPath(): string {
  return nodePath.join(os.homedir(), '.openclaw', 'agents', 'main', 'agent', 'auth-profiles.json');
}

function readMainAgentAuthProfileProviders(): Array<{ providerId: string; keyMasked: string | null }> {
  const authPath = getMainAgentAuthProfilesPath();
  if (!fs.existsSync(authPath)) return [];

  try {
    const raw = fs.readFileSync(authPath, 'utf8');
    const doc = JSON.parse(raw) as Record<string, unknown>;
    const profiles = ensureRecord(doc.profiles);
    const providerMap = new Map<string, { providerId: string; keyMasked: string | null }>();

    for (const profileRaw of Object.values(profiles)) {
      const profile = ensureRecord(profileRaw);
      const providerId = normalizeProviderAlias(String(profile.provider || '').trim());
      if (!providerId) continue;
      const key = String(profile.key || '').trim();
      const keyMasked = key && !isRedactedSecretValue(key) ? maskProviderKey(key) : null;
      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, { providerId, keyMasked });
        continue;
      }
      const prev = providerMap.get(providerId);
      if (prev && !prev.keyMasked && keyMasked) {
        providerMap.set(providerId, { providerId, keyMasked });
      }
    }

    return Array.from(providerMap.values());
  } catch {
    return [];
  }
}

function ensureMainAgentAuthProfile(providerId: string, apiKey: string, source = 'config-sync'): boolean {
  const normalizedProvider = normalizeProviderAlias(providerId);
  const key = String(apiKey || '').trim();
  if (!normalizedProvider || !key) return false;
  if (isRedactedSecretValue(key)) return false;
  if ((normalizedProvider === 'openai' || normalizedProvider === 'openai-codex') && !isLikelyOpenAiApiKey(key)) {
    return false;
  }

  const authPath = getMainAgentAuthProfilesPath();
  const dir = nodePath.dirname(authPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let doc: Record<string, unknown> = {};
  try {
    if (fs.existsSync(authPath)) {
      doc = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
    }
  } catch {
    doc = {};
  }

  const profiles = ensureRecord(doc.profiles);
  const order = ensureRecord(doc.order);
  const lastGood = ensureRecord(doc.lastGood);
  const usageStats = ensureRecord(doc.usageStats);

  const aliases = providerAliasSet(normalizedProvider);
  for (const pid of aliases) {
    const profileId = `${pid}:default`;
    profiles[profileId] = {
      type: 'api_key',
      provider: pid,
      key,
      source,
    };

    const currentOrder = Array.isArray(order[pid]) ? (order[pid] as unknown[]).map((x) => String(x || '').trim()).filter(Boolean) : [];
    const nextOrder = [profileId, ...currentOrder.filter((id) => id !== profileId)];
    order[pid] = nextOrder;
    lastGood[pid] = profileId;

    const prevStats = ensureRecord(usageStats[profileId]);
    usageStats[profileId] = {
      errorCount: typeof prevStats.errorCount === 'number' ? prevStats.errorCount : 0,
      lastUsed: typeof prevStats.lastUsed === 'number' ? prevStats.lastUsed : Date.now(),
    };
  }

  const next = {
    ...doc,
    version: 1,
    profiles,
    order,
    lastGood,
    usageStats,
  };
  fs.writeFileSync(authPath, JSON.stringify(next, null, 2), 'utf8');
  return true;
}

function syncMainAgentAuthProfilesFromConfig(): { changed: number; providers: string[] } {
  const cfg = readOpenclawConfig();
  const models = ensureRecord(cfg.models);
  const providers = ensureRecord(models.providers);
  let changed = 0;
  const changedProviders: string[] = [];

  for (const [providerIdRaw, providerRaw] of Object.entries(providers)) {
    const providerId = normalizeProviderAlias(providerIdRaw);
    const provider = ensureRecord(providerRaw);
    const apiKey = String(provider.apiKey || '').trim();
    if (!providerId || !apiKey) continue;
    if (ensureMainAgentAuthProfile(providerId, apiKey, 'config-sync')) {
      changed += 1;
      changedProviders.push(providerId);
    }
  }

  return { changed, providers: Array.from(new Set(changedProviders)) };
}

function hasValidOpenAiApiKeyInConfig(): boolean {
  try {
    const cfg = readOpenclawConfig();
    const models = ensureRecord(cfg.models);
    const providers = ensureRecord(models.providers);
    for (const [providerId, providerRaw] of Object.entries(providers)) {
      const normalizedProvider = normalizeProviderAlias(providerId);
      if (normalizedProvider !== 'openai' && normalizedProvider !== 'openai-codex') continue;
      const provider = ensureRecord(providerRaw);
      const apiKey = String(provider.apiKey || '').trim();
      if (isLikelyOpenAiApiKey(apiKey)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function hasValidOpenAiApiKeyInAuthProfiles(): boolean {
  try {
    const authPath = getMainAgentAuthProfilesPath();
    if (!fs.existsSync(authPath)) return false;
    const doc = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
    const profiles = ensureRecord(doc.profiles);
    for (const profileRaw of Object.values(profiles)) {
      const profile = ensureRecord(profileRaw);
      if (String(profile.type || '') !== 'api_key') continue;
      const providerId = normalizeProviderAlias(String(profile.provider || '').trim());
      if (providerId !== 'openai' && providerId !== 'openai-codex') continue;
      const key = String(profile.key || '').trim();
      if (isLikelyOpenAiApiKey(key)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function getOpenAiCredentialStatus(): {
  hasValidApiKey: boolean;
  configHasValidApiKey: boolean;
  profileHasValidApiKey: boolean;
} {
  const configHasValidApiKey = hasValidOpenAiApiKeyInConfig();
  const profileHasValidApiKey = hasValidOpenAiApiKeyInAuthProfiles();
  return {
    hasValidApiKey: configHasValidApiKey || profileHasValidApiKey,
    configHasValidApiKey,
    profileHasValidApiKey,
  };
}

function clearMainAgentAuthProfilesByProvider(providerId: string): boolean {
  const normalized = normalizeProviderAlias(providerId);
  if (!normalized) return false;
  const authPath = getMainAgentAuthProfilesPath();
  if (!fs.existsSync(authPath)) return false;

  let doc: Record<string, unknown> = {};
  try {
    doc = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return false;
  }

  const aliases = providerAliasSet(normalized);
  const profiles = ensureRecord(doc.profiles);
  const order = ensureRecord(doc.order);
  const lastGood = ensureRecord(doc.lastGood);
  const usageStats = ensureRecord(doc.usageStats);

  let changed = false;
  for (const profileId of Object.keys(profiles)) {
    const profile = ensureRecord(profiles[profileId]);
    const profileProvider = normalizeProviderAlias(String(profile.provider || '').trim());
    if (!profileProvider || !aliases.has(profileProvider)) continue;
    delete profiles[profileId];
    delete usageStats[profileId];
    changed = true;
  }

  for (const alias of aliases) {
    const currentOrder = Array.isArray(order[alias]) ? (order[alias] as unknown[]).map((x) => String(x || '').trim()).filter(Boolean) : [];
    const nextOrder = currentOrder.filter((pid) => !!profiles[pid]);
    if (nextOrder.length !== currentOrder.length) {
      order[alias] = nextOrder;
      changed = true;
    }
    if (lastGood[alias] && !profiles[String(lastGood[alias])]) {
      delete lastGood[alias];
      changed = true;
    }
  }

  if (!changed) return false;
  const next = {
    ...doc,
    version: 1,
    profiles,
    order,
    lastGood,
    usageStats,
  };
  fs.writeFileSync(authPath, JSON.stringify(next, null, 2), 'utf8');
  return true;
}

function clearProviderApiKeyFromConfig(providerId: string): boolean {
  const normalized = normalizeProviderAlias(providerId);
  if (!normalized) return false;
  const aliases = providerAliasSet(normalized);
  const cfg = readOpenclawConfig();
  const models = ensureRecord(cfg.models);
  const providers = ensureRecord(models.providers);
  let changed = false;

  for (const [rawProviderId, providerRaw] of Object.entries(providers)) {
    const providerAlias = normalizeProviderAlias(rawProviderId);
    if (!aliases.has(providerAlias)) continue;
    const provider = ensureRecord(providerRaw);
    if ('apiKey' in provider) {
      delete provider.apiKey;
      providers[rawProviderId] = provider;
      changed = true;
    }
  }

  if (!changed) return false;
  models.providers = providers;
  cfg.models = models;
  cfg.meta = {
    ...ensureRecord(cfg.meta),
    lastTouchedAt: new Date().toISOString(),
  };
  writeOpenclawConfig(cfg);
  return true;
}

async function logoutCodexAuth(options?: { clearProviderAuth?: boolean }): Promise<{
  clearedSession: boolean;
  clearedConfigAuth: boolean;
  clearedRuntimeAuth: boolean;
}> {
  pendingProviderOAuth = null;
  stopPendingProviderOAuthWatcher();
  stopPendingProviderOAuthCallbackServer();
  if (codexAuthWindow && !codexAuthWindow.isDestroyed()) {
    codexAuthWindow.destroy();
    codexAuthWindow = null;
  }
  const oldPartition = currentCodexAuthPartition;
  await clearCodexAuthSession(oldPartition).catch(() => {});
  await clearCodexAuthSession(CODEX_AUTH_PARTITION_PERSIST).catch(() => {});
  // 退出后切到新的临时分区，确保后续登录不会继承旧状态。
  currentCodexAuthPartition = allocEphemeralCodexAuthPartition();
  await clearCodexAuthSession(currentCodexAuthPartition).catch(() => {});

  const clearProviderAuth = options?.clearProviderAuth !== false;
  let clearedConfigAuth = false;
  let clearedRuntimeAuth = false;
  if (clearProviderAuth) {
    clearedConfigAuth = clearProviderApiKeyFromConfig('openai');
    try {
      clearedRuntimeAuth = clearMainAgentAuthProfilesByProvider('openai');
    } catch {
      clearedRuntimeAuth = false;
    }
  }

  return { clearedSession: true, clearedConfigAuth, clearedRuntimeAuth };
}

async function getCodexAuthDebugState(): Promise<{
  currentPartition: string;
  currentCookies: number;
  persistentCookies: number;
  windowAlive: boolean;
}> {
  const current = session.fromPartition(currentCodexAuthPartition);
  const persistent = session.fromPartition(CODEX_AUTH_PARTITION_PERSIST);
  const [currentCookies, persistentCookies] = await Promise.all([
    current.cookies.get({}),
    persistent.cookies.get({}),
  ]);
  return {
    currentPartition: currentCodexAuthPartition,
    currentCookies: currentCookies.length,
    persistentCookies: persistentCookies.length,
    windowAlive: Boolean(codexAuthWindow && !codexAuthWindow.isDestroyed()),
  };
}

async function detectCodexCli(): Promise<{ installed: boolean; path?: string; version?: string }> {
  try {
    const { stdout: pathRaw } = await execAsync('command -v codex || true', { timeout: 3000 });
    const codexPath = pathRaw.trim();
    if (!codexPath) return { installed: false };

    let version = '';
    try {
      const { stdout: verRaw } = await execAsync('codex --version', { timeout: 5000 });
      version = verRaw.trim();
    } catch {
      // ignore version probe failures
    }
    return { installed: true, path: codexPath, version };
  } catch {
    return { installed: false };
  }
}

async function detectClaudeCodeCli(): Promise<{ installed: boolean; path?: string; version?: string }> {
  try {
    const { stdout: pathRaw } = await execAsync('command -v claude || true', { timeout: 3000 });
    const claudePath = pathRaw.trim();
    if (!claudePath) return { installed: false };

    let version = '';
    try {
      const { stdout: verRaw } = await execAsync('claude --version', { timeout: 5000 });
      version = verRaw.trim();
    } catch {
      // ignore version probe failures
    }
    return { installed: true, path: claudePath, version };
  } catch {
    return { installed: false };
  }
}

type OpenClawDoctorMode = 'diagnose' | 'fix';

type OpenClawDoctorResult = {
  mode: OpenClawDoctorMode;
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
  cwd: string;
  durationMs: number;
  timedOut?: boolean;
  error?: string;
};

type SelfTestStatus = 'pass' | 'warn' | 'fail';

type SelfTestCheck = {
  id: string;
  name: string;
  status: SelfTestStatus;
  detail: string;
  durationMs: number;
  autoFixed?: boolean;
};

type SelfTestReport = {
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: {
    passed: number;
    warned: number;
    failed: number;
  };
  checks: SelfTestCheck[];
};

function getGatewayControlUiInfo(): {
  success: true;
  mode: 'local' | 'remote';
  protocol: 'ws' | 'wss';
  host: string;
  port: number;
  token: string;
  url: string;
  wsUrl: string;
} {
  const cfg = getGatewayConnectionSettings();
  const protocol: 'ws' | 'wss' = cfg.mode === 'remote' ? cfg.protocol : 'ws';
  const host = cfg.mode === 'remote' ? cfg.host : '127.0.0.1';
  const port = cfg.mode === 'remote' ? cfg.port : getResolvedGatewayPort();
  const auth = buildGatewayConnectAuth(cfg.token);
  const token = String(auth.token || cfg.token || GATEWAY_TOKEN).trim() || GATEWAY_TOKEN;
  const httpProtocol = protocol === 'wss' ? 'https' : 'http';
  return {
    success: true,
    mode: cfg.mode,
    protocol,
    host,
    port,
    token,
    url: `${httpProtocol}://${host}:${port}`,
    wsUrl: `${protocol}://${host}:${port}/ws`,
  };
}

async function runOpenClawDoctor(mode: OpenClawDoctorMode): Promise<OpenClawDoctorResult> {
  const command = mode === 'fix'
    ? 'openclaw doctor --fix --non-interactive --yes'
    : 'openclaw doctor --non-interactive';
  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: mode === 'fix' ? 180000 : 120000,
      maxBuffer: 1024 * 1024 * 8,
    });
    return {
      mode,
      success: true,
      exitCode: 0,
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
      command,
      cwd: process.cwd(),
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    const e = err as Error & {
      code?: number;
      killed?: boolean;
      signal?: string;
      stdout?: string;
      stderr?: string;
    };
    const stderrText = String(e?.stderr || '');
    const stdoutText = String(e?.stdout || '');
    const timedOut = !!(e?.killed && String(e?.signal || '').toUpperCase() === 'SIGTERM');
    return {
      mode,
      success: false,
      exitCode: typeof e?.code === 'number' ? e.code : null,
      stdout: stdoutText,
      stderr: stderrText,
      command,
      cwd: process.cwd(),
      durationMs: Date.now() - startedAt,
      timedOut,
      error: e?.message || String(err),
    };
  }
}

async function runGatewaySkillsSelfTest(options?: { autoStartGateway?: boolean }): Promise<SelfTestReport> {
  const startedAt = Date.now();
  const startedIso = new Date(startedAt).toISOString();
  const autoStartGateway = options?.autoStartGateway !== false;
  const gatewayConn = getGatewayConnectionSettings();
  const checks: SelfTestCheck[] = [];

  const runCheck = async (
    id: string,
    name: string,
    executor: () => Promise<{ status: SelfTestStatus; detail: string; autoFixed?: boolean }>,
  ): Promise<void> => {
    const checkStart = Date.now();
    try {
      const result = await executor();
      checks.push({
        id,
        name,
        status: result.status,
        detail: result.detail,
        durationMs: Date.now() - checkStart,
        autoFixed: result.autoFixed,
      });
    } catch (err) {
      checks.push({
        id,
        name,
        status: 'fail',
        detail: String(err),
        durationMs: Date.now() - checkStart,
      });
    }
  };

  await runCheck('control-ui', 'Control UI endpoint config', async () => {
    const info = getGatewayControlUiInfo();
    if (!info.token) {
      return { status: 'fail', detail: 'Gateway token is empty' };
    }
    return { status: 'pass', detail: `${info.mode} ${info.host}:${info.port}` };
  });

  await runCheck('openclaw-cli', 'OpenClaw CLI', async () => {
    try {
      const { stdout } = await execAsync('openclaw --version', { timeout: 10000 });
      const version = String(stdout || '').trim();
      if (!version) return { status: 'warn', detail: 'openclaw command exists but version output is empty' };
      return { status: 'pass', detail: version };
    } catch (err) {
      return { status: 'fail', detail: `openclaw unavailable: ${String(err)}` };
    }
  });

  await runCheck('gateway-port-resolve', 'Gateway port resolve', async () => {
    if (gatewayConn.mode === 'remote') {
      return { status: 'pass', detail: `remote endpoint ${gatewayConn.protocol}://${gatewayConn.host}:${gatewayConn.port}` };
    }
    const probe = await resolveGatewayPort();
    if (probe.success && probe.port) {
      return { status: 'pass', detail: `resolved port ${probe.port}` };
    }
    return { status: 'warn', detail: probe.error || 'Gateway port resolve failed (will try auto-start)' };
  });

  await runCheck('gateway-start', 'Gateway start / reconnect chain', async () => {
    if (gatewayConn.mode === 'remote') {
      const tested = await testGatewayWsConnection(
        gatewayConn.protocol,
        gatewayConn.host,
        gatewayConn.port,
        gatewayConn.token,
        8000,
      );
      return tested.success
        ? { status: 'pass', detail: 'remote gateway reachable' }
        : { status: 'fail', detail: tested.error || 'remote gateway unreachable' };
    }

    const probe = await resolveGatewayPort();
    if (probe.success && probe.port) {
      return { status: 'pass', detail: `already reachable at ${probe.port}` };
    }
    if (!autoStartGateway) {
      return { status: 'warn', detail: 'gateway not reachable and autoStartGateway=false' };
    }
    const status = await startGatewayWithSelfHeal();
    if (status.startSuccess) {
      const fixed = !!status.selfHealTried && !!status.selfHealSucceeded;
      return {
        status: fixed ? 'warn' : 'pass',
        detail: fixed ? 'started after self-heal' : 'started successfully',
        autoFixed: fixed,
      };
    }
    return { status: 'fail', detail: status.error || 'Gateway start failed' };
  });

  await runCheck('gateway-health', 'Gateway /health check', async () => {
    if (gatewayConn.mode === 'remote') {
      return { status: 'warn', detail: 'skipped HTTP /health in remote mode' };
    }
    try {
      const res = await fetch(`${getGatewayApiBase()}/health`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        return { status: 'fail', detail: `health status=${res.status}` };
      }
      const json = await res.json().catch(() => ({}));
      const uptime = typeof json?.uptime === 'number' ? ` uptime=${json.uptime}` : '';
      return { status: 'pass', detail: `ok${uptime}` };
    } catch (err) {
      return { status: 'fail', detail: String(err) };
    }
  });

  await runCheck('gateway-rpc-sessions', 'Gateway RPC sessions.list', async () => {
    const first = await callGatewayRpcWithRetry('sessions.list', { limit: 1 }, 12000);
    if (first.ok) {
      return { status: 'pass', detail: 'sessions.list succeeded' };
    }

    const firstErr = String(first.error || '');
    const needsFix = /missing scope: operator\.|device-required|not_paired|unauthorized|auth/i.test(firstErr);
    if (!needsFix) {
      return { status: 'fail', detail: firstErr || 'sessions.list failed' };
    }

    const repaired = repairGatewayOperatorScopes();
    const relaxed = relaxGatewayLocalAuth();
    try {
      await stopGateway();
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 400));
    await startGateway();
    const second = await callGatewayRpcWithRetry('sessions.list', { limit: 1 }, 12000);
    if (second.ok) {
      return {
        status: 'warn',
        detail: `recovered after scope/auth repair (scopeChanged=${repaired.changed}, authChanged=${relaxed.changed})`,
        autoFixed: true,
      };
    }
    return { status: 'fail', detail: second.error || firstErr || 'sessions.list failed after repair' };
  });

  await runCheck('skills-list-installed', 'Skills list installed', async () => {
    const skills = await listInstalled();
    return { status: 'pass', detail: `installed skills=${skills.length}` };
  });

  await runCheck('skills-managed-scan', 'Skills managed dir scan', async () => {
    const skillsDir = getSkillsDir();
    if (!fs.existsSync(skillsDir)) {
      return { status: 'warn', detail: `skills dir not found: ${skillsDir}` };
    }
    const scanned = scanSkillsFromDir(skillsDir);
    return { status: 'pass', detail: `scanned ${scanned.length} skill(s) from ${skillsDir}` };
  });

  await runCheck('skills-load-from-dir-probe', 'Skills load-from-dir probe', async () => {
    const tmpRoot = nodePath.join(os.tmpdir(), 'axonclawx-selftest-skill');
    const tmpSkillDir = nodePath.join(tmpRoot, 'sample-selftest-skill');
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
      fs.mkdirSync(tmpSkillDir, { recursive: true });
      fs.writeFileSync(
        nodePath.join(tmpSkillDir, 'SKILL.md'),
        [
          '---',
          'name: "selftest-skill"',
          'description: "Synthetic skill for smoke test"',
          '---',
          '',
          '# Self Test Skill',
          '',
          'This is a synthetic skill used by AxonClawX smoke tests.',
          '',
        ].join('\n'),
        'utf8',
      );
      const scanned = scanSkillsFromDir(tmpRoot);
      if (scanned.length === 0) {
        return { status: 'fail', detail: 'scanSkillsFromDir returned 0 for synthetic skill dir' };
      }
      return { status: 'pass', detail: `detected ${scanned.length} synthetic skill(s)` };
    } finally {
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  });

  const passed = checks.filter((c) => c.status === 'pass').length;
  const warned = checks.filter((c) => c.status === 'warn').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const finishedAtMs = Date.now();
  return {
    success: failed === 0,
    startedAt: startedIso,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAt,
    summary: {
      passed,
      warned,
      failed,
    },
    checks,
  };
}

function extractChatgptAccessToken(raw?: string): string {
  const text = (raw || '').trim();
  if (!text) return '';
  if (!text.startsWith('{') && !text.startsWith('[')) return text;

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const token = typeof parsed.accessToken === 'string' ? parsed.accessToken.trim() : '';
    if (token) return token;
  } catch {
    // ignore
  }

  const m = text.match(/"accessToken"\s*:\s*"([^"]+)"/);
  return m?.[1]?.trim() || '';
}

function hasLoggedInUserInSessionPayload(raw?: string): boolean {
  const text = (raw || '').trim();
  if (!text || !text.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const user = parsed.user;
    return !!(user && typeof user === 'object');
  } catch {
    return false;
  }
}

type CodexLoginInfo = {
  loggedIn: boolean;
  userId?: string;
  email?: string;
  name?: string;
  image?: string;
  expires?: string;
  sessionCookiePresent?: boolean;
  source?: 'session-api' | 'cookie' | 'unknown';
};

function parseCodexLoginInfo(raw?: string, cookieToken?: string): CodexLoginInfo {
  const info: CodexLoginInfo = {
    loggedIn: false,
    source: 'unknown',
  };

  if (cookieToken) {
    info.sessionCookiePresent = true;
  }

  const text = (raw || '').trim();
  if (text && text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const user = (parsed.user && typeof parsed.user === 'object' && !Array.isArray(parsed.user))
        ? (parsed.user as Record<string, unknown>)
        : null;
      const accessToken = typeof parsed.accessToken === 'string' ? parsed.accessToken.trim() : '';

      if (user) {
        const id = String(user.id || '').trim();
        const email = String(user.email || '').trim();
        const name = String(user.name || '').trim();
        const image = String(user.image || '').trim();
        if (id) info.userId = id;
        if (email) info.email = email;
        if (name) info.name = name;
        if (image) info.image = image;
      }

      const expires = typeof parsed.expires === 'string' ? parsed.expires.trim() : '';
      if (expires) info.expires = expires;

      if (user || accessToken) {
        info.loggedIn = true;
        info.source = 'session-api';
      }
    } catch {
      // ignore malformed payload
    }
  }

  if (!info.loggedIn && cookieToken) {
    info.loggedIn = true;
    info.source = 'cookie';
  }
  return info;
}

function extractChatgptSessionCookieToken(
  cookies: Array<{ name: string; value: string }>,
): string {
  const preferredNames = [
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
    '__Secure-authjs.session-token',
    'authjs.session-token',
  ];
  for (const name of preferredNames) {
    const token = cookies.find((c) => c.name === name)?.value?.trim();
    if (token) return token;
  }
  const fuzzy = cookies.find((c) => c.name.toLowerCase().includes('session-token'))?.value?.trim();
  return fuzzy || '';
}

async function readCodexSessionToken(): Promise<{
  success: boolean;
  accessToken: string | null;
  sessionPayload: string | null;
  status: number;
  loginInfo: CodexLoginInfo;
  error?: string;
}> {
  const parsePayloadResult = (
    status: number,
    text: string,
    cookieToken?: string,
  ) => {
    const loginInfo = parseCodexLoginInfo(text, cookieToken);
    const token = extractChatgptAccessToken(text);
    return {
      success: !!token,
      accessToken: token || null,
      sessionPayload: text || null,
      status,
      loginInfo,
      error: token
        ? undefined
        : (loginInfo.loggedIn
          ? `Login detected but no usable access token returned by session API (status=${status}).`
          : `No usable token found in session response (status=${status}).`),
    };
  };

  try {
    const authSession = getCurrentCodexAuthSession();
    const allCookies = await authSession.cookies.get({});
    const cookies = allCookies.filter((c) => (c.domain || '').includes('chatgpt.com'));
    const cookieToken = extractChatgptSessionCookieToken(cookies);
    console.log(`[OAuth] cookie scan: total=${allCookies.length}, chatgpt=${cookies.length}, hasSessionToken=${cookieToken ? 'yes' : 'no'}`);
    const sessionFetch = (authSession as unknown as { fetch?: typeof fetch }).fetch;

    // 1) Preferred: use Chromium network stack in the target partition.
    if (typeof sessionFetch === 'function') {
      try {
        const res = await sessionFetch('https://chatgpt.com/api/auth/session', {
          method: 'GET',
          headers: { accept: 'application/json' },
        });
        const text = await res.text();
        const parsed = parsePayloadResult(res.status, text, cookieToken);
        if (parsed.success) return parsed;
      } catch {
        // continue to next fallback
      }
    }

    // 2) Fallback: execute in the login window context (same partition cookies).
    if (codexAuthWindow && !codexAuthWindow.isDestroyed()) {
      try {
        const result = await codexAuthWindow.webContents.executeJavaScript(
          `(async () => {
            try {
              const r = await fetch('https://chatgpt.com/api/auth/session', { credentials: 'include' });
              const text = await r.text();
              return { ok: r.ok, status: r.status, text };
            } catch (e) {
              return { ok: false, status: 0, text: String(e) };
            }
          })()`,
          true,
        ) as { status?: number; text?: string };
        const parsed = parsePayloadResult(Number(result?.status || 0), String(result?.text || ''), cookieToken);
        if (parsed.success) return parsed;
      } catch {
        // continue to next fallback
      }
    }

    // 3) Last fallback: node fetch with manually assembled cookie header.
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ').trim();
    if (!cookieHeader) {
      return {
        success: false,
        accessToken: null,
        sessionPayload: null,
        status: 401,
        loginInfo: parseCodexLoginInfo(undefined),
        error: 'No chatgpt.com cookies in Electron auth session. Please login in the in-app ChatGPT window.',
      };
    }
    const res = await fetch('https://chatgpt.com/api/auth/session', {
      method: 'GET',
      headers: { accept: 'application/json', cookie: cookieHeader },
    });
    const text = await res.text();
    const parsed = parsePayloadResult(res.status, text, cookieToken);
    if (parsed.success) return parsed;
    return parsed;
  } catch (err) {
    return {
      success: false,
      accessToken: null,
      sessionPayload: null,
      status: 500,
      loginInfo: parseCodexLoginInfo(undefined),
      error: String(err),
    };
  }
}

function applyCodexQuickConnect(options?: {
  providerId?: string;
  providerBaseUrl?: string;
  providerApi?: string;
  apiKey?: string;
  accessToken?: string;
  sessionPayload?: string;
  preferredModel?: string;
  fallbackModel?: string;
}): {
  providerId: string;
  primaryModel: string;
  fallbackModels: string[];
  createdProvider: boolean;
  addedModels: string[];
  credentialAccepted: boolean;
} {
  const preferredModel = normalizeModelAlias(options?.preferredModel || 'gpt-5.4-mini')
    .replace(/^openai-codex\//, '')
    .trim();
  const fallbackModel = (options?.fallbackModel || 'gpt-5.3-codex').trim();

  const cfg = readOpenclawConfig();
  const models = ensureRecord(cfg.models);
  const providers = ensureRecord(models.providers);

  let providerId = normalizeProviderAlias(options?.providerId?.trim() || 'openai');
  let createdProvider = false;

  let provider = ensureRecord(providers[providerId]);
  if (!Object.keys(provider).length) {
    createdProvider = true;
    provider = {
      baseUrl: options?.providerBaseUrl?.trim() || 'https://api.openai.com/v1',
      api: options?.providerApi?.trim() || 'openai-completions',
      models: [],
    };
  }

  if (options?.providerBaseUrl?.trim()) {
    provider.baseUrl = options.providerBaseUrl.trim();
  }
  if (options?.providerApi?.trim()) {
    provider.api = options.providerApi.trim();
  }
  const derivedAccessToken = extractChatgptAccessToken(options?.accessToken)
    || extractChatgptAccessToken(options?.sessionPayload);
  const explicitApiKey = String(options?.apiKey || '').trim();
  const candidateApiKey = (explicitApiKey || derivedAccessToken || '').trim();
  const acceptsOpenAiLikeKey = providerId !== 'openai' && providerId !== 'openai-codex'
    ? true
    : isLikelyOpenAiApiKey(candidateApiKey);
  const finalApiKey = acceptsOpenAiLikeKey ? candidateApiKey : '';
  if (finalApiKey) {
    provider.apiKey = finalApiKey;
  } else if ((providerId === 'openai' || providerId === 'openai-codex')) {
    const existingKey = String(provider.apiKey || '').trim();
    if (existingKey && !isLikelyOpenAiApiKey(existingKey) && isLikelyEncryptedSessionToken(existingKey)) {
      delete provider.apiKey;
    }
  }

  const existingModels = asModelArray(provider.models);
  const modelSet = new Set(existingModels.map((m) => m.id));
  const addedModels: string[] = [];
  for (const mid of [preferredModel, fallbackModel]) {
    if (!mid) continue;
    if (!modelSet.has(mid)) {
      existingModels.push({ id: mid, name: mid });
      modelSet.add(mid);
      addedModels.push(mid);
    }
  }
  provider.models = existingModels;
  providers[providerId] = provider;

  models.providers = providers;
  if (!models.mode) models.mode = 'merge';
  cfg.models = models;

  const agents = ensureRecord(cfg.agents);
  const defaults = ensureRecord(agents.defaults);
  const modelCfg = ensureRecord(defaults.model);

  const nextPrimary = `${providerId}/${preferredModel}`;
  const nextFallbackFromProvider = `${providerId}/${fallbackModel}`;

  const fallbackList = Array.isArray(modelCfg.fallbacks)
    ? modelCfg.fallbacks.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];

  const acceptedProviderPrefixes = Array.from(providerAliasSet(providerId)).map((pid) => `${pid}/`);
  const nextFallbacks = Array.from(new Set([
    nextFallbackFromProvider,
    ...fallbackList.filter((x) => acceptedProviderPrefixes.some((prefix) => x.startsWith(prefix))),
  ].filter((x) => !!x && x !== nextPrimary)));

  if (finalApiKey) {
    modelCfg.primary = nextPrimary;
    modelCfg.fallbacks = nextFallbacks;
  }
  defaults.model = modelCfg;
  agents.defaults = defaults;
  cfg.agents = agents;

  cfg.meta = {
    ...ensureRecord(cfg.meta),
    lastTouchedAt: new Date().toISOString(),
  };

  writeOpenclawConfig(cfg);

  if (finalApiKey) {
    try {
      ensureMainAgentAuthProfile(providerId, finalApiKey, 'codex-quick-connect');
    } catch (err) {
      console.warn('[HostAPI] failed to sync auth-profiles for quick-connect:', err);
    }
  }

  return {
    providerId,
    primaryModel: String(modelCfg.primary || nextPrimary),
    fallbackModels: Array.isArray(modelCfg.fallbacks) ? (modelCfg.fallbacks as string[]) : nextFallbacks,
    createdProvider,
    addedModels,
    credentialAccepted: !!finalApiKey,
  };
}

function pickLatestOpenclawBackupPath(configPath: string): string | null {
  try {
    const dir = nodePath.dirname(configPath);
    const base = nodePath.basename(configPath);
    if (!fs.existsSync(dir)) return null;
    const candidates = fs
      .readdirSync(dir)
      .filter((name) => name.startsWith(`${base}.bak.`))
      .map((name) => nodePath.join(dir, name))
      .filter((abs) => {
        try {
          return fs.statSync(abs).isFile();
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
        } catch {
          return 0;
        }
      });
    return candidates[0] || null;
  } catch {
    return null;
  }
}

function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length > 0;
}

function enrichConfigFromLatestBackup(config: Record<string, unknown>, configPath: string): Record<string, unknown> {
  try {
    const models = (config.models as Record<string, unknown>) || {};
    const providers = (models.providers as Record<string, unknown>) || {};
    const hasProviders = isNonEmptyObject(providers);
    if (hasProviders) return config;

    const bakPath = pickLatestOpenclawBackupPath(configPath);
    if (!bakPath) return config;
    const bakRaw = fs.readFileSync(bakPath, 'utf8');
    const bakCfg = parseOpenclawConfigText(bakRaw);
    const bakModels = (bakCfg.models as Record<string, unknown>) || {};
    const bakProviders = (bakModels.providers as Record<string, unknown>) || {};
    if (!isNonEmptyObject(bakProviders)) return config;

    const next: Record<string, unknown> = { ...config };
    next.models = {
      ...(models || {}),
      providers: bakProviders,
    };

    const agents = (next.agents as Record<string, unknown>) || {};
    const defaults = (agents.defaults as Record<string, unknown>) || {};
    const bakAgents = (bakCfg.agents as Record<string, unknown>) || {};
    const bakDefaults = (bakAgents.defaults as Record<string, unknown>) || {};

    if (!isNonEmptyObject(defaults.model) && isNonEmptyObject(bakDefaults.model)) {
      defaults.model = bakDefaults.model;
    }
    if (!isNonEmptyObject(defaults.models) && isNonEmptyObject(bakDefaults.models)) {
      defaults.models = bakDefaults.models;
    }
    if (isNonEmptyObject(defaults)) {
      next.agents = {
        ...(agents || {}),
        defaults,
      };
    }
    return next;
  } catch {
    return config;
  }
}

function getUiSettingsFromConfig(config: Record<string, unknown>): { language: string; theme: string; setupComplete: boolean } {
  const ui = ((config.ui as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const axonCfg = readAxonclawxConfig();
  const axon = ensureRecord(axonCfg.axonclawx);
  const language = typeof axon.language === 'string' && axon.language.trim()
    ? axon.language.trim()
    : (typeof ui.language === 'string' && ui.language.trim() ? ui.language.trim() : 'zh');
  const themeRaw = typeof ui.theme === 'string' ? ui.theme.trim().toLowerCase() : 'system';
  const theme = themeRaw === 'light' || themeRaw === 'dark' || themeRaw === 'system' ? themeRaw : 'system';
  const setupComplete = Boolean(ui.setupComplete);
  return { language, theme, setupComplete };
}

function getSetupCompleteFromConfig(config: Record<string, unknown>): boolean {
  const topLevel = config.setupComplete;
  if (typeof topLevel === 'boolean') return topLevel;
  const ui = ((config.ui as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  if (typeof ui.setupComplete === 'boolean') return ui.setupComplete;
  const axonCfg = readAxonclawxConfig();
  const axon = ((axonCfg.axonclawx as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  if (typeof axon.setupComplete === 'boolean') return axon.setupComplete;
  return false;
}

type MultiAgentDeployTemplateAgent = {
  id: string;
  name: string;
  role: string;
  agentId?: string;
  description?: string;
  icon?: string;
  color?: string;
  soul?: string;
  user?: string;
  skills?: Array<{
    name: string;
    permissions?: string[];
    config?: Record<string, unknown>;
  }>;
  model?: string;
  workspace?: string;
};

type MultiAgentDeployTemplate = {
  id?: string;
  name?: string;
  description?: string;
  agents?: MultiAgentDeployTemplateAgent[];
  requirements?: {
    skills?: string[];
    channels?: string[];
  };
  skills?: Array<{
    name: string;
    permissions?: string[];
    config?: Record<string, unknown>;
  }>;
  cronJobs?: Array<{
    name: string;
    schedule: string;
    task: string;
    enabled?: boolean;
    timezone?: string;
  }>;
  integrations?: Array<{
    service: string;
    permissions?: string[];
  }>;
  workflow?: {
    type?: string;
    description?: string;
    steps?: Array<{
      agent?: string;
      agents?: string[];
      action?: string;
      parallel?: boolean;
      condition?: string;
      trigger?: string;
    }>;
  };
};

type MultiAgentDeployRequest = {
  template?: MultiAgentDeployTemplate;
  prefix?: string;
  skipExisting?: boolean;
  dryRun?: boolean;
};

type MultiAgentDeployResult = {
  success: boolean;
  deployedCount: number;
  errors: string[];
  localFallback: boolean;
  mode: 'deploy' | 'preview';
  prefix?: string;
  templateId?: string;
  message?: string;
};

function buildMultiAgentBlock({
  prefix,
  template,
  member,
  runtimeAgentId,
  agentIdMap,
}: {
  prefix: string;
  template: MultiAgentDeployTemplate;
  member: MultiAgentDeployTemplateAgent;
  runtimeAgentId: string;
  agentIdMap: Record<string, string>;
}): { soul: string; heartbeat: string; user: string; blockStart: string } {
  const blockStart = `<!-- multi-agent:${prefix}:${member.id} -->`;
  const blockEnd = `<!-- /multi-agent:${prefix}:${member.id} -->`;
  const templateSkills = template.skills ?? [];
  const memberSkills = member.skills ?? [];
  const mergedSkills = [...templateSkills, ...memberSkills].filter((s) => s?.name);
  const integrations = template.integrations ?? [];
  const cronJobs = template.cronJobs ?? [];
  const reqSkills = template.requirements?.skills ?? [];
  const reqChannels = template.requirements?.channels ?? [];
  const workflowSteps = (template.workflow?.steps ?? []).map((step, index) => {
    const displayAgents = step.agents?.length
      ? step.agents.map((id) => `${id}(${agentIdMap[id] || id})`).join(', ')
      : step.agent
        ? `${step.agent}(${agentIdMap[step.agent] || step.agent})`
        : `${member.id}(${runtimeAgentId})`;
    const agentLabel = displayAgents;
    const flags = step.parallel ? ' [parallel]' : '';
    const condition = step.condition ? ` | if ${step.condition}` : '';
    const trigger = step.trigger ? ` | trigger ${step.trigger}` : '';
    return `${index + 1}. ${agentLabel}: ${step.action || 'Execute task'}${flags}${condition}${trigger}`;
  });
  const memberSummary = [
    `- ID: ${member.id}`,
    `- Name: ${member.name}`,
    `- Role: ${member.role}`,
    member.description ? `- Description: ${member.description}` : '',
    member.soul ? `- Soul Snippet: ${member.soul}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const agentList = (template.agents ?? [])
    .map((agent) => `- **${agent.id}** -> \`${agentIdMap[agent.id] || agent.id}\`: ${agent.name}${agent.role ? ` - ${agent.role}` : ''}`)
    .join('\n');
  const workflowSummary = workflowSteps.length > 0 ? workflowSteps.join('\n') : '- No workflow steps defined';

  const soul = `\n${blockStart}\n## ${template.name || 'Multi-Agent Workflow'}\n\n${template.description || template.workflow?.description || ''}\n\n### Team Member\n${memberSummary}\n\n### Available Members\n${agentList || `- ${member.id}`}\n\n### Workflow\n${workflowSummary}\n\n### How To Use\nUse the \`sessions_spawn\` tool to delegate tasks to the right member.\n${blockEnd}\n`;
  const heartbeat = `\n${blockStart}\n## ${template.name || 'Multi-Agent Workflow'}\n\n${workflowSteps.length > 0 ? workflowSteps.map((line) => `- [ ] ${line}`).join('\n') : '- [ ] Review and define workflow steps'}\n${blockEnd}\n`;
  const user = `\n${blockStart}
## Runtime Preset

- Runtime Agent ID: \`${runtimeAgentId}\`
- Recommended Model: ${member.model || 'inherit default'}
- Workspace: ${member.workspace || 'inherit default'}
- Required Skills: ${reqSkills.length ? reqSkills.join(', ') : 'none'}
- Required Channels: ${reqChannels.length ? reqChannels.join(', ') : 'none'}

### Skills
${mergedSkills.length > 0
  ? mergedSkills.map((s) => `- ${s.name} | perms: ${(s.permissions || []).join(', ') || 'default'} | config: ${JSON.stringify(s.config || {})}`).join('\n')
  : '- none'}

### Integrations
${integrations.length > 0
  ? integrations.map((it) => `- ${it.service}: ${(it.permissions || []).join(', ') || 'default'}`).join('\n')
  : '- none'}

### Cron Jobs
${cronJobs.length > 0
  ? cronJobs.map((job) => `- ${job.name}: ${job.schedule} | ${job.task}`).join('\n')
  : '- none'}

${member.user ? `### Member Notes\n${member.user}\n` : ''}
${blockEnd}\n`;
  return { soul, heartbeat, user, blockStart };
}

async function applyLocalMultiAgentDeployment(request: MultiAgentDeployRequest): Promise<MultiAgentDeployResult> {
  const template = request.template;
  const prefix = String(request.prefix || template?.id || 'multi-agent').trim() || 'multi-agent';
  const members = template?.agents ?? [];
  const dryRun = Boolean(request.dryRun);
  const skipExisting = request.skipExisting !== false;

  if (!template || members.length === 0) {
    return {
      success: false,
      deployedCount: 0,
      errors: ['Multi-agent deploy payload is missing template.agents'],
      localFallback: true,
      mode: dryRun ? 'preview' : 'deploy',
      prefix,
      templateId: template?.id,
    };
  }

  const listResult = await callGatewayRpcWithRetry('agents.list', {}, 8000);
  const existingAgentsRaw = listResult.ok && Array.isArray(listResult.result) ? listResult.result as Array<Record<string, unknown>> : [];
  let knownAgentIds = new Set(existingAgentsRaw.map((a) => String(a.id || '').trim()).filter(Boolean));

  const ensureAgent = async (member: MultiAgentDeployTemplateAgent): Promise<string> => {
    const explicitId = String(member.agentId || '').trim();
    if (explicitId) return explicitId;
    const preferred = String(member.id || '').trim();
    if (preferred && knownAgentIds.has(preferred)) return preferred;

    const before = new Set(knownAgentIds);
    const createResult = await callGatewayRpcWithRetry('agents.create', {
      name: member.name || `${prefix}-${member.id}`,
      workspace: member.workspace || `${prefix}/${member.id}`,
      emoji: '🤖',
    }, 10000);
    if (!createResult.ok) {
      throw new Error(createResult.error || `Failed to create agent for ${member.id}`);
    }
    const refresh = await callGatewayRpcWithRetry('agents.list', {}, 8000);
    if (refresh.ok && Array.isArray(refresh.result)) {
      const all = refresh.result as Array<Record<string, unknown>>;
      const ids = all.map((a) => String(a.id || '').trim()).filter(Boolean);
      knownAgentIds = new Set(ids);
      const added = ids.find((id) => !before.has(id));
      if (added) return added;
      const byName = all.find((a) => String(a.name || '').trim() === String(member.name || '').trim());
      if (byName?.id) return String(byName.id);
    }
    if (preferred) return preferred;
    throw new Error(`Unable to resolve runtime agent id for ${member.id}`);
  };

  const runtimeMap: Record<string, string> = {};
  for (const member of members) {
    runtimeMap[member.id] = await ensureAgent(member);
  }

  const prepared = members.map((member) => {
    const runtimeAgentId = runtimeMap[member.id] || member.id;
    return {
      member,
      runtimeAgentId,
      blocks: buildMultiAgentBlock({ prefix, template, member, runtimeAgentId, agentIdMap: runtimeMap }),
    };
  });

  if (dryRun) {
    return {
      success: true,
      deployedCount: prepared.length,
      errors: [],
      localFallback: true,
      mode: 'preview',
      prefix,
      templateId: template.id,
      message: 'AxonClawX multi-agent service is unavailable; previewed local fallback only.',
    };
  }

  const errors: string[] = [];
  let deployedCount = 0;

  for (const item of prepared) {
    try {
      let wroteAny = false;
      for (const fileName of ['SOUL.md', 'HEARTBEAT.md', 'USER.md'] as const) {
        const block = fileName === 'SOUL.md'
          ? item.blocks.soul
          : fileName === 'HEARTBEAT.md'
            ? item.blocks.heartbeat
            : item.blocks.user;
        const readResult = await callGatewayRpcWithRetry('agents.files.get', {
          agentId: item.runtimeAgentId,
          name: fileName,
        }, 8000);

        const currentContent = String(
          readResult.ok && readResult.result && typeof readResult.result === 'object'
            ? ((readResult.result as { file?: { content?: string } }).file?.content ?? '')
            : '',
        );

        if (skipExisting && currentContent.includes(item.blocks.blockStart)) {
          continue;
        }

        const nextContent = currentContent.trimEnd() + block;
        const writeResult = await callGatewayRpcWithRetry('agents.files.set', {
          agentId: item.runtimeAgentId,
          name: fileName,
          content: nextContent,
        }, 8000);

        if (!writeResult.ok) {
          throw new Error(writeResult.error || `Failed to write ${fileName}`);
        }
        wroteAny = true;
      }
      if (wroteAny) {
        deployedCount += 1;
      }
    } catch (err) {
      errors.push(`${item.member.id}(${item.runtimeAgentId || 'unknown'}): ${String(err)}`);
    }
  }

  return {
    success: errors.length === 0,
    deployedCount,
    errors,
    localFallback: true,
    mode: 'deploy',
    prefix,
    templateId: template.id,
    message: errors.length === 0 ? 'Applied local multi-agent deployment.' : 'Applied local multi-agent deployment with partial failures.',
  };
}

ipcMain.handle('hostapi:fetch', async (_event, { path, method, headers, body }) => {
  try {
    const rawPath = String(path || '');
    const queryIndex = rawPath.indexOf('?');
    const requestPath = queryIndex >= 0 ? rawPath.slice(0, queryIndex) : rawPath;
    const requestQuery = new URLSearchParams(queryIndex >= 0 ? rawPath.slice(queryIndex + 1) : '');

    // 特殊处理：AxonClawX 的 gateway-info API
    if (path === '/api/app/gateway-info') {
      const cfg = getGatewayConnectionSettings();
      let protocol: 'ws' | 'wss' = cfg.protocol;
      let host = cfg.host;
      let port = cfg.port;

      if (cfg.mode === 'local') {
        protocol = 'ws';
        host = '127.0.0.1';
        const localProbe = await resolveGatewayPort();
        if (localProbe.success && localProbe.port) {
          port = localProbe.port;
          setResolvedGatewayPort(localProbe.port);
          persistGatewayConnectionToConfig({
            mode: 'local',
            protocol: 'ws',
            host: '127.0.0.1',
            port: localProbe.port,
          });
        } else {
          port = getResolvedGatewayPort();
        }
      }

      const wsUrl = `${protocol}://${host}:${port}/ws`;
      return {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: { wsUrl, token: cfg.token, port, mode: cfg.mode, host },
        },
        success: true,
        status: 200,
        json: { wsUrl, token: cfg.token, port, mode: cfg.mode, host },
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

    if (path === '/api/app/openclaw-doctor' && method === 'POST') {
      let payload: { mode?: OpenClawDoctorMode } = {};
      try {
        payload = body
          ? (typeof body === 'string'
            ? (JSON.parse(body) as { mode?: OpenClawDoctorMode })
            : (body as { mode?: OpenClawDoctorMode }))
          : {};
      } catch {
        payload = {};
      }
      const mode: OpenClawDoctorMode = payload.mode === 'fix' ? 'fix' : 'diagnose';
      const result = await runOpenClawDoctor(mode);
      return {
        ok: true,
        data: { status: 200, ok: true, json: result },
        success: true,
        status: 200,
        json: result,
      };
    }

    if (path === '/api/app/self-test' && (method === 'POST' || method === 'GET')) {
      let payload: { autoStartGateway?: boolean } = {};
      if (method === 'POST') {
        try {
          payload = body
            ? (typeof body === 'string'
              ? (JSON.parse(body) as { autoStartGateway?: boolean })
              : (body as { autoStartGateway?: boolean }))
            : {};
        } catch {
          payload = {};
        }
      }
      const report = await runGatewaySkillsSelfTest({
        autoStartGateway: payload.autoStartGateway,
      });
      return {
        ok: true,
        data: { status: 200, ok: true, json: report },
        success: true,
        status: 200,
        json: report,
      };
    }

    if (path === '/api/app/codex/open-login' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string'
            ? (JSON.parse(body) as { forceReauth?: boolean; url?: string; title?: string })
            : (body as { forceReauth?: boolean; url?: string; title?: string }))
          : {};
        const maybeUrl = typeof payload?.url === 'string' ? payload.url : '';
        let mode: 'external' | 'embedded' = 'embedded';
        if (/auth\.openai\.com\/oauth\/authorize/i.test(maybeUrl)) {
          mode = await openOpenAiAuthorizationUrl(maybeUrl, Boolean(payload?.forceReauth));
        } else {
          await openCodexAuthWindow({
            forceReauth: Boolean(payload?.forceReauth),
            url: maybeUrl || undefined,
            title: typeof payload?.title === 'string' ? payload.title : undefined,
          });
        }
        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true, mode } },
          success: true,
          status: 200,
          json: { success: true, mode },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }

    if (path === '/api/app/codex/session-token' && method === 'GET') {
      try {
        const oauthState = readOpenAiCodexOAuthProfileState();
        if (oauthState.success) {
          return {
            ok: true,
            data: {
              status: 200,
              ok: true,
              json: {
                success: true,
                accessToken: oauthState.accessToken,
                sessionPayload: null,
                status: oauthState.status,
                loginInfo: oauthState.loginInfo,
                error: undefined,
                source: 'auth-profiles',
              },
            },
            success: true,
            status: 200,
            json: {
              success: true,
              accessToken: oauthState.accessToken,
              sessionPayload: null,
              status: oauthState.status,
              loginInfo: oauthState.loginInfo,
              error: undefined,
              source: 'auth-profiles',
            },
          };
        }

        const tokenState = await readCodexSessionToken();
        let source = 'electron-session';

        // Auto-persist session-derived token into auth-profiles so auth survives
        // across subsequent sends (avoid "first message works, second fails").
        if (
          !oauthState.success
          && tokenState.success
          && String(tokenState.accessToken || '').trim()
        ) {
          try {
            const accessToken = String(tokenState.accessToken || '').trim();
            const accountId = extractOpenAiCodexAccountIdFromToken(accessToken) || undefined;
            const emailFromLoginInfo = String(tokenState.loginInfo?.email || '').trim();
            const email = emailFromLoginInfo || extractOpenAiCodexEmailFromToken(accessToken) || undefined;
            ensureOpenAiCodexOAuthProfile({
              accessToken,
              expiresInSec: 3600,
              email,
              accountId,
            });
            ensureOpenAiCodexProviderConfig({ makeDefault: true });
            const persistedState = readOpenAiCodexOAuthProfileState();
            if (persistedState.success) {
              return {
                ok: true,
                data: {
                  status: 200,
                  ok: true,
                  json: {
                    success: true,
                    accessToken: persistedState.accessToken,
                    sessionPayload: null,
                    status: persistedState.status,
                    loginInfo: persistedState.loginInfo,
                    error: undefined,
                    source: 'auth-profiles(auto-persisted)',
                  },
                },
                success: true,
                status: 200,
                json: {
                  success: true,
                  accessToken: persistedState.accessToken,
                  sessionPayload: null,
                  status: persistedState.status,
                  loginInfo: persistedState.loginInfo,
                  error: undefined,
                  source: 'auth-profiles(auto-persisted)',
                },
              };
            }
            source = 'electron-session(auto-persist-failed)';
          } catch (persistErr) {
            console.warn('[OAuth] auto-persist from session token failed:', persistErr);
            source = 'electron-session(auto-persist-error)';
          }
        }

        return {
          ok: true,
          data: {
            status: 200,
            ok: true,
            json: {
              success: tokenState.success,
              accessToken: tokenState.accessToken,
              sessionPayload: tokenState.sessionPayload,
              status: tokenState.status,
              loginInfo: tokenState.loginInfo,
              error: tokenState.error || oauthState.error,
              source,
            },
          },
          success: true,
          status: 200,
          json: {
            success: tokenState.success,
            accessToken: tokenState.accessToken,
            sessionPayload: tokenState.sessionPayload,
            status: tokenState.status,
            loginInfo: tokenState.loginInfo,
            error: tokenState.error || oauthState.error,
            source,
          },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }

    if (path === '/api/app/codex/logout' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string'
            ? (JSON.parse(body) as { clearProviderAuth?: boolean })
            : (body as { clearProviderAuth?: boolean }))
          : {};
        const result = await logoutCodexAuth({ clearProviderAuth: payload?.clearProviderAuth !== false });
        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true, ...result } },
          success: true,
          status: 200,
          json: { success: true, ...result },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }

    if (path === '/api/app/codex/auth-debug' && method === 'GET') {
      try {
        const state = await getCodexAuthDebugState();
        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true, ...state } },
          success: true,
          status: 200,
          json: { success: true, ...state },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }

    if (path === '/api/app/openai/repair-auth' && (method === 'POST' || method === 'GET')) {
      try {
        const sanitized = sanitizeInvalidOpenAiCredentialArtifacts();
        const synced = syncMainAgentAuthProfilesFromConfig();
        const status = getOpenAiCredentialStatus();
        return {
          ok: true,
          data: {
            status: 200,
            ok: true,
            json: {
              success: true,
              ...status,
              sanitized,
              synced,
            },
          },
          success: true,
          status: 200,
          json: {
            success: true,
            ...status,
            sanitized,
            synced,
          },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }

    // OAuth fallback in desktop mode:
    // some local Gateway builds don't expose /api/providers/oauth/* routes.
    if (path === '/api/providers/oauth/start' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string'
            ? JSON.parse(body)
            : (body as { provider?: string; accountId?: string; label?: string; forceReauth?: boolean }))
          : {};
        const provider = String(payload?.provider || '').trim();
        const accountId = String(payload?.accountId || provider || '').trim() || provider;
        const label = String(payload?.label || provider || '').trim() || provider;
        const forceReauth = Boolean((payload as { forceReauth?: boolean })?.forceReauth);
        if (!provider) {
          return {
            ok: false,
            data: { status: 400, ok: false, json: { success: false, error: 'Missing provider' } },
            success: false,
            status: 400,
            json: { success: false, error: 'Missing provider' },
          };
        }
        if (provider !== 'openai') {
          return {
            ok: false,
            data: { status: 501, ok: false, json: { success: false, error: `OAuth fallback not supported for provider: ${provider}` } },
            success: false,
            status: 501,
            json: { success: false, error: `OAuth fallback not supported for provider: ${provider}` },
          };
        }
        const oauthState = randomBytes(16).toString('hex');
        const pkce = buildOpenAiCodexPkce();
        const authorizationUrl = buildOpenAiCodexAuthorizeUrl({
          state: oauthState,
          challenge: pkce.challenge,
          originator: 'pi',
        });
        pendingProviderOAuth = {
          provider,
          accountId,
          label,
          mode: 'openai-codex-oauth',
          oauthState,
          pkceVerifier: pkce.verifier,
          authorizationUrl,
        };
        stopPendingProviderOAuthWatcher();
        startPendingProviderOAuthCallbackServer();
        const launchMode = await openOpenAiAuthorizationUrl(authorizationUrl, forceReauth);
        const manualPayload = {
          mode: 'manual',
          authorizationUrl,
          message: launchMode === 'external'
            ? '已在系统浏览器打开 OpenAI 登录。登录完成后会自动回传，也可手动粘贴 code。'
            : '已打开 OpenAI 登录窗口。登录完成后会自动回传，也可手动粘贴 code。',
        };
        safeSendToRenderer('oauth:code', manualPayload);
        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true, ...manualPayload } },
          success: true,
          status: 200,
          json: { success: true, ...manualPayload },
        };
      } catch (err) {
        const msg = String(err);
        pendingProviderOAuth = null;
        stopPendingProviderOAuthWatcher();
        stopPendingProviderOAuthCallbackServer();
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: msg } },
          success: false,
          status: 500,
          json: { success: false, error: msg },
        };
      }
    }

    if (path === '/api/providers/oauth/submit' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string'
            ? (JSON.parse(body) as { code?: string })
            : (body as { code?: string }))
          : {};
        const code = String(payload?.code || '').trim();
        if (!code) {
          return {
            ok: false,
            data: { status: 400, ok: false, json: { success: false, error: 'Missing OAuth code' } },
            success: false,
            status: 400,
            json: { success: false, error: 'Missing OAuth code' },
          };
        }
        const successPayload = await finalizePendingOpenAiOAuthByCode(code, 'manual');
        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true, ...successPayload } },
          success: true,
          status: 200,
          json: { success: true, ...successPayload },
        };
      } catch (err) {
        const msg = String(err);
        safeSendToRenderer('oauth:error', { message: msg });
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: msg } },
          success: false,
          status: 500,
          json: { success: false, error: msg },
        };
      }
    }

    if (path === '/api/providers/oauth/cancel' && method === 'POST') {
      pendingProviderOAuth = null;
      stopPendingProviderOAuthWatcher();
      stopPendingProviderOAuthCallbackServer();
      return {
        ok: true,
        data: { status: 200, ok: true, json: { success: true } },
        success: true,
        status: 200,
        json: { success: true },
      };
    }

    // Provider registry local fallback:
    // Keep auth/config page available even when gateway provider endpoints are missing.
    if (requestPath === '/api/provider-vendors' && method === 'GET') {
      const snapshot = readLocalProviderSnapshot();
      return {
        ok: true,
        data: { status: 200, ok: true, json: snapshot.vendors },
        success: true,
        status: 200,
        json: snapshot.vendors,
      };
    }

    if (requestPath === '/api/provider-accounts' && method === 'GET') {
      const snapshot = readLocalProviderSnapshot();
      return {
        ok: true,
        data: { status: 200, ok: true, json: snapshot.accounts },
        success: true,
        status: 200,
        json: snapshot.accounts,
      };
    }

    if (requestPath === '/api/providers' && method === 'GET') {
      const snapshot = readLocalProviderSnapshot();
      return {
        ok: true,
        data: { status: 200, ok: true, json: snapshot.statuses },
        success: true,
        status: 200,
        json: snapshot.statuses,
      };
    }

    if (requestPath === '/api/providers' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string'
            ? JSON.parse(body)
            : (body as {
              config?: Record<string, unknown>;
              apiKey?: string;
            }))
          : {};
        const configPayload = ensureRecord(payload.config);
        const providerId = String(configPayload.id || configPayload.type || '').trim();
        const vendorId = normalizeProviderAlias(String(configPayload.type || providerId).trim());
        if (!providerId || !vendorId) {
          return {
            ok: false,
            data: { status: 400, ok: false, json: { success: false, error: 'Invalid provider payload' } },
            success: false,
            status: 400,
            json: { success: false, error: 'Invalid provider payload' },
          };
        }
        const cfg = readOpenclawConfig();
        const models = ensureRecord(cfg.models);
        const providers = ensureRecord(models.providers);
        const existing = ensureRecord(providers[providerId]);
        const nowIso = new Date().toISOString();
        const nextProvider: Record<string, unknown> = {
          ...existing,
          accountId: String(existing.accountId || providerId),
          vendorId,
          label: String(configPayload.name || existing.label || getProviderVendorInfo(vendorId).name || vendorId),
          authMode: String(existing.authMode || inferLocalProviderAuthMode(vendorId, existing)),
          baseUrl: configPayload.baseUrl ?? existing.baseUrl,
          apiProtocol: configPayload.apiProtocol ?? existing.apiProtocol ?? existing.api,
          api: configPayload.apiProtocol ?? existing.api ?? existing.apiProtocol,
          model: configPayload.model ?? existing.model,
          fallbackModels: configPayload.fallbackModels ?? existing.fallbackModels,
          fallbackProviderIds: configPayload.fallbackProviderIds ?? existing.fallbackProviderIds,
          enabled: configPayload.enabled ?? existing.enabled ?? true,
          createdAt: existing.createdAt || configPayload.createdAt || nowIso,
          updatedAt: nowIso,
        };
        const apiKey = String(payload.apiKey || '').trim();
        if (apiKey) {
          if (!isAcceptedProviderApiKey(vendorId, apiKey)) {
            return {
              ok: false,
              data: { status: 422, ok: false, json: { success: false, error: providerApiKeyValidationMessage(vendorId) } },
              success: false,
              status: 422,
              json: { success: false, error: providerApiKeyValidationMessage(vendorId) },
            };
          }
          nextProvider.apiKey = apiKey;
          ensureMainAgentAuthProfile(vendorId, apiKey, 'provider-create');
        }
        providers[providerId] = nextProvider;
        models.providers = providers;
        cfg.models = models;
        cfg.meta = {
          ...ensureRecord(cfg.meta),
          lastTouchedAt: nowIso,
        };
        writeOpenclawConfig(cfg);
        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true } },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }

    if (requestPath === '/api/provider-accounts/default' && method === 'GET') {
      const defaultAccountId = readDefaultProviderAccountId();
      return {
        ok: true,
        data: { status: 200, ok: true, json: { accountId: defaultAccountId } },
        success: true,
        status: 200,
        json: { accountId: defaultAccountId },
      };
    }

    if (requestPath === '/api/provider-accounts/default' && method === 'PUT') {
      try {
        const payload = body
          ? (typeof body === 'string' ? JSON.parse(body) : (body as { accountId?: string | null }))
          : {};
        const accountId = payload?.accountId ? String(payload.accountId).trim() : '';
        writeDefaultProviderAccountId(accountId || null);
        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true, accountId: accountId || null } },
          success: true,
          status: 200,
          json: { success: true, accountId: accountId || null },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 400, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 400,
          json: { success: false, error: String(err) },
        };
      }
    }

    if (requestPath === '/api/providers/default' && method === 'PUT') {
      try {
        const payload = body
          ? (typeof body === 'string' ? JSON.parse(body) : (body as { providerId?: string | null; accountId?: string | null }))
          : {};
        const candidate = String(payload?.accountId || payload?.providerId || '').trim();
        if (!candidate) {
          return {
            ok: false,
            data: { status: 400, ok: false, json: { success: false, error: 'providerId/accountId required' } },
            success: false,
            status: 400,
            json: { success: false, error: 'providerId/accountId required' },
          };
        }
        writeDefaultProviderAccountId(candidate);
        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true, accountId: candidate } },
          success: true,
          status: 200,
          json: { success: true, accountId: candidate },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 400, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 400,
          json: { success: false, error: String(err) },
        };
      }
    }

    if (requestPath === '/api/providers/validate' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string' ? JSON.parse(body) : (body as { providerId?: string; apiKey?: string }))
          : {};
        const providerId = normalizeProviderAlias(String(payload?.providerId || '').trim());
        const key = String(payload?.apiKey || '').trim();
        const isLocal = providerId === 'ollama' || providerId === 'claude-code';
        const valid = isLocal || key.length > 0;
        return {
          ok: true,
          data: {
            status: 200,
            ok: true,
            json: valid ? { valid: true } : { valid: false, error: 'API key is required' },
          },
          success: true,
          status: 200,
          json: valid ? { valid: true } : { valid: false, error: 'API key is required' },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 400, ok: false, json: { valid: false, error: String(err) } },
          success: false,
          status: 400,
          json: { valid: false, error: String(err) },
        };
      }
    }

    if (requestPath === '/api/provider-accounts' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string'
            ? JSON.parse(body)
            : (body as {
              account?: Record<string, unknown>;
              apiKey?: string;
            }))
          : {};
        const account = ensureRecord(payload.account);
        const vendorId = normalizeProviderAlias(String(account.vendorId || '').trim());
        const accountId = String(account.id || '').trim() || vendorId;
        if (!vendorId || !accountId) {
          return {
            ok: false,
            data: { status: 400, ok: false, json: { success: false, error: 'Invalid provider account payload' } },
            success: false,
            status: 400,
            json: { success: false, error: 'Invalid provider account payload' },
          };
        }
        const cfg = readOpenclawConfig();
        const models = ensureRecord(cfg.models);
        const providers = ensureRecord(models.providers);
        const providerKey = accountId;
        const vendorInfo = getProviderVendorInfo(vendorId);
        const existing = ensureRecord(providers[providerKey]);
        const nowIso = new Date().toISOString();
        const nextProvider: Record<string, unknown> = {
          ...existing,
          accountId,
          vendorId,
          label: String(account.label || existing.label || vendorInfo.name || vendorId),
          authMode: String(account.authMode || existing.authMode || inferLocalProviderAuthMode(vendorId, existing)),
          baseUrl: account.baseUrl ?? existing.baseUrl,
          apiProtocol: account.apiProtocol ?? existing.apiProtocol ?? existing.api,
          model: account.model ?? existing.model,
          enabled: account.enabled ?? existing.enabled ?? true,
          createdAt: existing.createdAt || account.createdAt || nowIso,
          updatedAt: nowIso,
        };
        const fallbackModels = Array.isArray(account.fallbackModels)
          ? (account.fallbackModels as unknown[]).map((v) => String(v || '').trim()).filter(Boolean)
          : [];
        if (fallbackModels.length) nextProvider.fallbackModels = fallbackModels;
        const fallbackAccountIds = Array.isArray(account.fallbackAccountIds)
          ? (account.fallbackAccountIds as unknown[]).map((v) => String(v || '').trim()).filter(Boolean)
          : [];
        if (fallbackAccountIds.length) nextProvider.fallbackAccountIds = fallbackAccountIds;
        const modelsList = asFlexibleModelArray(account.models).length
          ? asFlexibleModelArray(account.models)
          : asFlexibleModelArray(existing.models);
        if (modelsList.length > 0) nextProvider.models = modelsList;
        const apiKey = String(payload.apiKey || '').trim();
        if (apiKey) {
          if (!isAcceptedProviderApiKey(vendorId, apiKey)) {
            return {
              ok: false,
              data: { status: 422, ok: false, json: { success: false, error: providerApiKeyValidationMessage(vendorId) } },
              success: false,
              status: 422,
              json: { success: false, error: providerApiKeyValidationMessage(vendorId) },
            };
          }
          nextProvider.apiKey = apiKey;
          ensureMainAgentAuthProfile(vendorId, apiKey, 'provider-account-upsert');
        }
        providers[providerKey] = nextProvider;
        models.providers = providers;
        cfg.models = models;
        cfg.meta = {
          ...ensureRecord(cfg.meta),
          lastTouchedAt: nowIso,
        };
        writeOpenclawConfig(cfg);

        return {
          ok: true,
          data: { status: 200, ok: true, json: { success: true } },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }

    const providerAccountMatch = requestPath.match(/^\/api\/provider-accounts\/([^/]+)$/);
    if (providerAccountMatch) {
      const accountId = decodeURIComponent(providerAccountMatch[1] || '').trim();
      if (!accountId) {
        return {
          ok: false,
          data: { status: 400, ok: false, json: { success: false, error: 'accountId required' } },
          success: false,
          status: 400,
          json: { success: false, error: 'accountId required' },
        };
      }

      if (method === 'PUT') {
        try {
          const payload = body
            ? (typeof body === 'string'
              ? JSON.parse(body)
              : (body as { updates?: Record<string, unknown>; apiKey?: string }))
            : {};
          const updates = ensureRecord(payload.updates);
          const cfg = readOpenclawConfig();
          const models = ensureRecord(cfg.models);
          const providers = ensureRecord(models.providers);
          const providerKey = findProviderConfigKeyByAccountId(providers, accountId) || accountId;
          const existing = ensureRecord(providers[providerKey]);
          const nowIso = new Date().toISOString();
          const nextProvider: Record<string, unknown> = {
            ...existing,
            accountId: String(existing.accountId || accountId),
            vendorId: String(updates.vendorId || existing.vendorId || providerKey),
            label: updates.label ?? existing.label,
            authMode: updates.authMode ?? existing.authMode,
            baseUrl: updates.baseUrl ?? existing.baseUrl,
            apiProtocol: updates.apiProtocol ?? existing.apiProtocol ?? existing.api,
            model: updates.model ?? existing.model,
            enabled: updates.enabled ?? existing.enabled ?? true,
            createdAt: existing.createdAt || nowIso,
            updatedAt: nowIso,
          };
          const apiKey = String(payload.apiKey || '').trim();
          if (apiKey) {
            const nextVendorId = String(nextProvider.vendorId || providerKey);
            if (!isAcceptedProviderApiKey(nextVendorId, apiKey)) {
              return {
                ok: false,
                data: { status: 422, ok: false, json: { success: false, error: providerApiKeyValidationMessage(nextVendorId) } },
                success: false,
                status: 422,
                json: { success: false, error: providerApiKeyValidationMessage(nextVendorId) },
              };
            }
            nextProvider.apiKey = apiKey;
            ensureMainAgentAuthProfile(nextVendorId, apiKey, 'provider-account-update');
          }
          providers[providerKey] = nextProvider;
          models.providers = providers;
          cfg.models = models;
          cfg.meta = {
            ...ensureRecord(cfg.meta),
            lastTouchedAt: nowIso,
          };
          writeOpenclawConfig(cfg);
          return {
            ok: true,
            data: { status: 200, ok: true, json: { success: true } },
            success: true,
            status: 200,
            json: { success: true },
          };
        } catch (err) {
          return {
            ok: false,
            data: { status: 500, ok: false, json: { success: false, error: String(err) } },
            success: false,
            status: 500,
            json: { success: false, error: String(err) },
          };
        }
      }

      if (method === 'DELETE') {
        try {
          const cfg = readOpenclawConfig();
          const models = ensureRecord(cfg.models);
          const providers = ensureRecord(models.providers);
          const providerKey = findProviderConfigKeyByAccountId(providers, accountId);
          if (providerKey) {
            const removed = ensureRecord(providers[providerKey]);
            const removedVendorId = String(removed.vendorId || providerKey);
            delete providers[providerKey];
            models.providers = providers;
            cfg.models = models;
            cfg.meta = {
              ...ensureRecord(cfg.meta),
              lastTouchedAt: new Date().toISOString(),
            };
            writeOpenclawConfig(cfg);
            clearMainAgentAuthProfilesByProvider(removedVendorId);
            if (readDefaultProviderAccountId() === accountId) {
              writeDefaultProviderAccountId(null);
            }
          }
          return {
            ok: true,
            data: { status: 200, ok: true, json: { success: true } },
            success: true,
            status: 200,
            json: { success: true },
          };
        } catch (err) {
          return {
            ok: false,
            data: { status: 500, ok: false, json: { success: false, error: String(err) } },
            success: false,
            status: 500,
            json: { success: false, error: String(err) },
          };
        }
      }
    }

    const providerApiKeyMatch = requestPath.match(/^\/api\/providers\/([^/]+)\/api-key$/);
    if (providerApiKeyMatch && method === 'GET') {
      const accountOrProviderId = decodeURIComponent(providerApiKeyMatch[1] || '').trim();
      const cfg = readOpenclawConfig();
      const models = ensureRecord(cfg.models);
      const providers = ensureRecord(models.providers);
      const providerKey = findProviderConfigKeyByAccountId(providers, accountOrProviderId)
        || accountOrProviderId;
      const provider = ensureRecord(providers[providerKey]);
      const apiKey = String(provider.apiKey || '').trim();
      return {
        ok: true,
        data: { status: 200, ok: true, json: { apiKey: apiKey || null } },
        success: true,
        status: 200,
        json: { apiKey: apiKey || null },
      };
    }

    const providerMatch = requestPath.match(/^\/api\/providers\/([^/]+)$/);
    if (providerMatch) {
      const accountOrProviderId = decodeURIComponent(providerMatch[1] || '').trim();
      if (!accountOrProviderId) {
        return {
          ok: false,
          data: { status: 400, ok: false, json: { success: false, error: 'provider id required' } },
          success: false,
          status: 400,
          json: { success: false, error: 'provider id required' },
        };
      }

      if (method === 'GET') {
        const snapshot = readLocalProviderSnapshot();
        const account = snapshot.accounts.find((item) =>
          item.id === accountOrProviderId || normalizeProviderAlias(item.vendorId) === normalizeProviderAlias(accountOrProviderId));
        const status = snapshot.statuses.find((item) => item.id === account?.id || item.id === accountOrProviderId);
        if (!account && !status) {
          return {
            ok: true,
            data: { status: 200, ok: true, json: null },
            success: true,
            status: 200,
            json: null,
          };
        }
        const payload = {
          id: account?.id || status?.id || accountOrProviderId,
          name: account?.label || status?.name || accountOrProviderId,
          type: account?.vendorId || status?.type || accountOrProviderId,
          baseUrl: account?.baseUrl || status?.baseUrl,
          apiProtocol: account?.apiProtocol || status?.apiProtocol,
          model: account?.model || status?.model,
          fallbackModels: account?.fallbackModels || status?.fallbackModels,
          fallbackProviderIds: status?.fallbackProviderIds,
          enabled: account?.enabled ?? status?.enabled ?? true,
          createdAt: account?.createdAt || status?.createdAt || new Date().toISOString(),
          updatedAt: account?.updatedAt || status?.updatedAt || new Date().toISOString(),
          hasKey: status?.hasKey ?? false,
          keyMasked: status?.keyMasked ?? null,
        };
        return {
          ok: true,
          data: { status: 200, ok: true, json: payload },
          success: true,
          status: 200,
          json: payload,
        };
      }

      if (method === 'PUT') {
        try {
          const payload = body
            ? (typeof body === 'string'
              ? JSON.parse(body)
              : (body as { updates?: Record<string, unknown>; apiKey?: string }))
            : {};
          const updates = ensureRecord(payload.updates);
          const cfg = readOpenclawConfig();
          const models = ensureRecord(cfg.models);
          const providers = ensureRecord(models.providers);
          const providerKey = findProviderConfigKeyByAccountId(providers, accountOrProviderId)
            || accountOrProviderId;
          const existing = ensureRecord(providers[providerKey]);
          const nowIso = new Date().toISOString();
          const nextProvider: Record<string, unknown> = {
            ...existing,
            accountId: String(existing.accountId || providerKey),
            vendorId: String(updates.type || updates.vendorId || existing.vendorId || providerKey),
            label: updates.name ?? updates.label ?? existing.label,
            authMode: updates.authMode ?? existing.authMode,
            baseUrl: updates.baseUrl ?? existing.baseUrl,
            apiProtocol: updates.apiProtocol ?? existing.apiProtocol ?? existing.api,
            api: updates.apiProtocol ?? existing.api ?? existing.apiProtocol,
            model: updates.model ?? existing.model,
            fallbackModels: updates.fallbackModels ?? existing.fallbackModels,
            fallbackProviderIds: updates.fallbackProviderIds ?? existing.fallbackProviderIds,
            enabled: updates.enabled ?? existing.enabled ?? true,
            createdAt: existing.createdAt || nowIso,
            updatedAt: nowIso,
          };
          const apiKey = String(payload.apiKey || '').trim();
          if (apiKey) {
            const nextVendorId = String(nextProvider.vendorId || providerKey);
            if (!isAcceptedProviderApiKey(nextVendorId, apiKey)) {
              return {
                ok: false,
                data: { status: 422, ok: false, json: { success: false, error: providerApiKeyValidationMessage(nextVendorId) } },
                success: false,
                status: 422,
                json: { success: false, error: providerApiKeyValidationMessage(nextVendorId) },
              };
            }
            nextProvider.apiKey = apiKey;
            ensureMainAgentAuthProfile(nextVendorId, apiKey, 'provider-update');
          }
          providers[providerKey] = nextProvider;
          models.providers = providers;
          cfg.models = models;
          cfg.meta = {
            ...ensureRecord(cfg.meta),
            lastTouchedAt: nowIso,
          };
          writeOpenclawConfig(cfg);
          return {
            ok: true,
            data: { status: 200, ok: true, json: { success: true } },
            success: true,
            status: 200,
            json: { success: true },
          };
        } catch (err) {
          return {
            ok: false,
            data: { status: 500, ok: false, json: { success: false, error: String(err) } },
            success: false,
            status: 500,
            json: { success: false, error: String(err) },
          };
        }
      }

      if (method === 'DELETE') {
        try {
          const apiKeyOnly = requestQuery.get('apiKeyOnly') === '1';
          const cfg = readOpenclawConfig();
          const models = ensureRecord(cfg.models);
          const providers = ensureRecord(models.providers);
          const providerKey = findProviderConfigKeyByAccountId(providers, accountOrProviderId)
            || accountOrProviderId;
          const existing = ensureRecord(providers[providerKey]);
          if (apiKeyOnly) {
            if ('apiKey' in existing) delete existing.apiKey;
            providers[providerKey] = existing;
            clearMainAgentAuthProfilesByProvider(String(existing.vendorId || providerKey));
          } else if (providerKey in providers) {
            delete providers[providerKey];
          }
          models.providers = providers;
          cfg.models = models;
          cfg.meta = {
            ...ensureRecord(cfg.meta),
            lastTouchedAt: new Date().toISOString(),
          };
          writeOpenclawConfig(cfg);
          return {
            ok: true,
            data: { status: 200, ok: true, json: { success: true } },
            success: true,
            status: 200,
            json: { success: true },
          };
        } catch (err) {
          return {
            ok: false,
            data: { status: 500, ok: false, json: { success: false, error: String(err) } },
            success: false,
            status: 500,
            json: { success: false, error: String(err) },
          };
        }
      }
    }

    // Codex 无感接入：检测本机 codex CLI 与一键写入 OpenClaw 配置
    if (path === '/api/app/codex/status' && method === 'GET') {
      try {
        const codex = await detectCodexCli();
        const cfg = readOpenclawConfig();
        const models = ensureRecord(cfg.models);
        const providers = ensureRecord(models.providers);
        const codexProviderId = findCodexLikeProviderId(providers);
        const provider = codexProviderId ? ensureRecord(providers[codexProviderId]) : {};
        const providerModels = asModelArray(provider.models).map((m) => m.id);

        const defaultPrimary = (() => {
          const agents = ensureRecord(cfg.agents);
          const defaults = ensureRecord(agents.defaults);
          const modelCfg = ensureRecord(defaults.model);
          return typeof modelCfg.primary === 'string' ? modelCfg.primary : '';
        })();

        return {
          ok: true,
          data: {
            status: 200,
            ok: true,
            json: {
              installed: codex.installed,
              path: codex.path,
              version: codex.version,
              configured: !!codexProviderId,
              providerId: codexProviderId || null,
              providerModels,
              defaultPrimary,
            },
          },
          success: true,
          status: 200,
          json: {
            installed: codex.installed,
            path: codex.path,
            version: codex.version,
            configured: !!codexProviderId,
            providerId: codexProviderId || null,
            providerModels,
            defaultPrimary,
          },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { error: String(err) } },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    // Claude Code CLI 检测
    if (path === '/api/app/claude-code/status' && method === 'GET') {
      try {
        const claudeCode = await detectClaudeCodeCli();
        const cfg = readOpenclawConfig();
        const models = ensureRecord(cfg.models);
        const providers = ensureRecord(models.providers);
        const ccProvider = ensureRecord(providers['claude-code']);
        const providerModels = asModelArray(ccProvider.models).map((m: { id: string }) => m.id);

        return {
          ok: true,
          data: {
            status: 200,
            ok: true,
            json: {
              installed: claudeCode.installed,
              path: claudeCode.path,
              version: claudeCode.version,
              configured: providerModels.length > 0,
              providerId: 'claude-code',
              providerModels,
            },
          },
          success: true,
          status: 200,
          json: {
            installed: claudeCode.installed,
            path: claudeCode.path,
            version: claudeCode.version,
            configured: providerModels.length > 0,
            providerId: 'claude-code',
            providerModels,
          },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { error: String(err) } },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    if (path === '/api/app/codex/quick-connect' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string' ? JSON.parse(body) : (body as {
            providerId?: string;
            providerBaseUrl?: string;
            providerApi?: string;
            apiKey?: string;
            accessToken?: string;
            sessionPayload?: string;
            preferredModel?: string;
            fallbackModel?: string;
          }))
          : {};

        const result = applyCodexQuickConnect({
          providerId: payload.providerId,
          providerBaseUrl: payload.providerBaseUrl,
          providerApi: payload.providerApi,
          apiKey: payload.apiKey,
          accessToken: payload.accessToken,
          sessionPayload: payload.sessionPayload,
          preferredModel: payload.preferredModel,
          fallbackModel: payload.fallbackModel,
        });
        const normalizedProvider = normalizeProviderAlias(String(payload.providerId || 'openai'));
        if (!result.credentialAccepted && (normalizedProvider === 'openai' || normalizedProvider === 'openai-codex')) {
          const message = providerApiKeyValidationMessage(normalizedProvider);
          return {
            ok: false,
            data: { status: 422, ok: false, json: { success: false, error: message, ...result } },
            success: false,
            status: 422,
            json: { success: false, error: message, ...result },
          };
        }
        const codex = await detectCodexCli();

        return {
          ok: true,
          data: {
            status: 200,
            ok: true,
            json: {
              success: true,
              codexInstalled: codex.installed,
              codexPath: codex.path,
              codexVersion: codex.version,
              ...result,
            },
          },
          success: true,
          status: 200,
          json: {
            success: true,
            codexInstalled: codex.installed,
            codexPath: codex.path,
            codexVersion: codex.version,
            ...result,
          },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, ok: false, json: { success: false, error: String(err) } },
          success: false,
          status: 500,
          json: { success: false, error: String(err) },
        };
      }
    }

    // 特殊处理：/api/gateway/control-ui 控制网页连接参数
    if (path === '/api/gateway/control-ui' && method === 'GET') {
      const info = getGatewayControlUiInfo();
      return {
        ok: true,
        data: { status: 200, json: info, ok: true },
        success: true,
        status: 200,
        json: info,
      };
    }

    // 特殊处理：/api/gateway/start 启动网关子进程（hostApiFetch 调用，非 Gateway 自身 API）
    if (path === '/api/gateway/start' && method === 'POST') {
      try {
        const status = await startGatewayWithSelfHeal();
        return {
          ok: true,
          data: {
            status: 200,
            json: {
              success: !!status.startSuccess,
              status,
              error: status.error,
              diagnostics: status.diagnostics ?? [],
              logTail: status.logTail ?? [],
              selfHealTried: !!status.selfHealTried,
              selfHealSucceeded: !!status.selfHealSucceeded,
            },
            ok: true,
          },
          success: true,
          status: 200,
          json: {
            success: !!status.startSuccess,
            status,
            error: status.error,
            diagnostics: status.diagnostics ?? [],
            logTail: status.logTail ?? [],
            selfHealTried: !!status.selfHealTried,
            selfHealSucceeded: !!status.selfHealSucceeded,
          },
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
      if (!result.ok) {
        const rpcProbe = await callGatewayRpcWithRetry('sessions.list', { limit: 1 }, 8000);
        if (rpcProbe.ok) {
          result = {
            ok: true,
            json: {
              running: true,
              runtime: 'Electron',
              detail: `RPC 可用，端口 ${getResolvedGatewayPort()}`,
            },
          };
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
      // 返回真实连接配置：本地 +（如启用）远程
      const cfg = getGatewayConnectionSettings();
      const localPort = getResolvedGatewayPort();
      const profiles: Array<{ id: number; name: string; host: string; port: number; token: string; is_active: boolean }> = [
        {
          id: 1,
          name: 'Local Gateway',
          host: '127.0.0.1',
          port: localPort,
          token: '',
          is_active: cfg.mode === 'local',
        },
      ];
      if (cfg.mode === 'remote' && cfg.host) {
        profiles.push({
          id: 2,
          name: `Remote Gateway (${cfg.host}:${cfg.port})`,
          host: cfg.host,
          port: cfg.port,
          token: cfg.token || '',
          is_active: true,
        });
      }
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

    // 特殊处理：锁屏认证
    if (path === '/api/auth/lock/status' && method === 'GET') {
      return {
        ok: true,
        data: { status: 200, json: { locked: appLocked }, ok: true },
        success: true,
        status: 200,
        json: { locked: appLocked },
      };
    }

    if (path === '/api/auth/lock' && method === 'POST') {
      appLocked = true;
      return {
        ok: true,
        data: { status: 200, json: { success: true, locked: true }, ok: true },
        success: true,
        status: 200,
        json: { success: true, locked: true },
      };
    }

    if (path === '/api/auth/unlock' && method === 'POST' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { username?: string; password?: string });
        const username = String(payload?.username ?? '').trim();
        const password = String(payload?.password ?? '');
        if (!username || !password) {
          return {
            ok: false,
            error: 'Missing username or password',
            data: { status: 400, json: { error: 'Missing username or password' }, ok: false },
            success: false,
            status: 400,
            json: { error: 'Missing username or password' },
          };
        }
        if (!verifyLockCredentials(username, password)) {
          return {
            ok: false,
            error: 'Invalid username or password',
            data: { status: 401, json: { error: 'Invalid username or password' }, ok: false },
            success: false,
            status: 401,
            json: { error: 'Invalid username or password' },
          };
        }
        appLocked = false;
        return {
          ok: true,
          data: { status: 200, json: { success: true, locked: false }, ok: true },
          success: true,
          status: 200,
          json: { success: true, locked: false },
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

    // 特殊处理：/api/settings（通用设置：语言 + 风格）
    if (path === '/api/settings' && method === 'GET') {
      try {
        const config = readOpenclawConfig();
        const ui = getUiSettingsFromConfig(config);
        const setupComplete = getSetupCompleteFromConfig(config);
        return {
          ok: true,
          data: { status: 200, json: { ...ui, setupComplete }, ok: true },
          success: true,
          status: 200,
          json: { ...ui, setupComplete },
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

    if ((path === '/api/settings/setupComplete' || path === '/api/settings/setup-complete') && method === 'PUT' && body) {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as { value?: boolean });
        const setupComplete = Boolean(payload?.value);
        persistSetupCompleteToConfig(setupComplete);
        return {
          ok: true,
          data: { status: 200, json: { success: true, value: setupComplete }, ok: true },
          success: true,
          status: 200,
          json: { success: true, value: setupComplete },
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
        persistLanguageToAxonConfig(language);
        const config = readOpenclawConfig();
        const ui = ((config.ui as Record<string, unknown>) ?? {}) as Record<string, unknown>;
        if ('language' in ui) {
          delete ui.language;
        }
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

    // 特殊处理：/api/settings/storage 存储与日志路径（AxonClawX 系统设置）
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

    // 特殊处理：/api/settings/bind-address 绑定地址（AxonClawX 访问安全）
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
        writeOpenclawConfig(config);
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

    // 特殊处理：/api/settings/password 修改密码（AxonClawX 风格，AxonClawX 桌面端为 stub）
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
        const errMsg3 = 'AxonClawX 为桌面客户端，修改 AxonClawX Web 控制台账户密码请前往对应 Web 界面';
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
      const url = new URL(path, 'http://localhost');
      const pathname = url.pathname;
      const tailLines = Math.max(50, Math.min(2000, parseInt(url.searchParams.get('tailLines') || '200', 10) || 200));
      const abnormalLimit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit') || '10', 10) || 10));
      const days = Math.max(0, Math.min(30, parseInt(url.searchParams.get('days') || '0', 10) || 0));
      const offsetDays = Math.max(0, Math.min(365, parseInt(url.searchParams.get('offsetDays') || '0', 10) || 0));
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
      if (pathname === '/api/logs/dir' || pathname.startsWith('/api/logs/dir')) {
        return { ok: true, data: { status: 200, json: { dir: dirToUse }, ok: true }, success: true, status: 200, json: { dir: dirToUse } };
      }
      // /api/logs/abnormal：从日志解析异常事件（AxonClawX 风格：ERROR/WARN/exception/failed）
      if (pathname.startsWith('/api/logs/abnormal')) {
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
      const listLogFiles = (dir: string): string[] => {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir)
          .filter((f) => f.endsWith('.log') || f.match(/^openclaw-\d{4}-\d{2}-\d{2}\.log$/))
          .sort()
          .reverse();
      };
      const readFromDir = (dir: string) => {
        const files = listLogFiles(dir);
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
      const readByDayWindow = (dir: string) => {
        const files = listLogFiles(dir);
        if (!files || files.length === 0) return null;
        const dated = files
          .map((f) => {
            const m = f.match(/^openclaw-(\d{4}-\d{2}-\d{2})\.log$/);
            return m ? { file: f, day: m[1] } : null;
          })
          .filter((x): x is { file: string; day: string } => !!x);
        if (dated.length === 0) return null;
        const picked = dated.slice(offsetDays, offsetDays + days);
        if (picked.length === 0) return { content: '', files: [], hasMore: false, nextOffsetDays: null };
        const chunks = picked.map(({ file }) => {
          try {
            const full = nodePath.join(dir, file);
            const buf = fs.readFileSync(full, 'utf8');
            const lines = buf.split(/\r?\n/);
            return `[${file}]\n${lines.slice(-tailLines).join('\n')}`;
          } catch {
            return `[${file}] (读取失败)`;
          }
        });
        return {
          content: chunks.join('\n\n---\n\n'),
          files: picked.map((p) => p.file),
          hasMore: dated.length > offsetDays + days,
          nextOffsetDays: dated.length > offsetDays + days ? offsetDays + days : null,
        };
      };

      if (days > 0) {
        const fromGateway = readByDayWindow(gatewayLogDir);
        const fromOpenclaw = readByDayWindow(openclawLogDir);
        const chosen = fromGateway && fromGateway.content.trim().length > 0 ? fromGateway : fromOpenclaw;
        if (chosen) {
          return {
            ok: true,
            data: {
              status: 200,
              json: {
                content: chosen.content,
                files: chosen.files,
                days,
                offsetDays,
                hasMore: chosen.hasMore,
                nextOffsetDays: chosen.nextOffsetDays,
              },
              ok: true,
            },
            success: true,
            status: 200,
            json: {
              content: chosen.content,
              files: chosen.files,
              days,
              offsetDays,
              hasMore: chosen.hasMore,
              nextOffsetDays: chosen.nextOffsetDays,
            },
          };
        }
      }

      const content = readFromDir(gatewayLogDir) ?? readFromDir(openclawLogDir) ?? '(Gateway 日志目录不存在: /tmp/openclaw 或 ~/.openclaw/logs)';
      return { ok: true, data: { status: 200, json: { content, hasMore: false }, ok: true }, success: true, status: 200, json: { content, hasMore: false } };
    }

    // 会话删除：软删除本地 JSONL，避免刷新后被本地 fallback 再次恢复。
    if (path === '/api/sessions/delete' && method === 'POST') {
      try {
        const payload = body
          ? (typeof body === 'string' ? JSON.parse(body) : body)
          : {};
        const sessionKey = String((payload as { sessionKey?: unknown }).sessionKey || '').trim();
        const indexEntry = readLocalSessionIndexEntry(sessionKey);
        const sessionId = indexEntry?.sessionId || parseSessionIdFromKey(sessionKey);
        if (!sessionId) {
          return {
            ok: true,
            data: { status: 200, json: { success: false, error: 'Invalid session key' }, ok: true },
            success: true,
            status: 200,
            json: { success: false, error: 'Invalid session key' },
          };
        }

        const agentId = indexEntry?.agentId || (sessionKey.startsWith('agent:')
          ? sessionKey.split(':')[1] || 'main'
          : 'main');
        const sessionDirs = Array.from(new Set([
          nodePath.join(os.homedir(), '.openclaw', 'agents', agentId, 'sessions'),
          nodePath.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions'),
        ]));

        let deletedPath = '';
        const candidateFiles = [
          indexEntry?.sessionFile || '',
          ...sessionDirs.map((dir) => nodePath.join(dir, `${sessionId}.jsonl`)),
        ].filter(Boolean);
        for (const dir of sessionDirs) {
          const source = candidateFiles.find((file) => file.startsWith(dir) && fs.existsSync(file))
            || nodePath.join(dir, `${sessionId}.jsonl`);
          const deleted = nodePath.join(dir, `${sessionId}.deleted.jsonl`);
          if (fs.existsSync(source)) {
            fs.renameSync(source, deleted);
            deletedPath = deleted;
            break;
          }
          if (fs.existsSync(deleted)) {
            deletedPath = deleted;
            break;
          }
        }
        const indexFile = nodePath.join(os.homedir(), '.openclaw', 'agents', agentId, 'sessions', 'sessions.json');
        if (sessionKey && fs.existsSync(indexFile)) {
          try {
            const index = JSON.parse(fs.readFileSync(indexFile, 'utf8')) as Record<string, unknown>;
            const records = index.sessions && typeof index.sessions === 'object' && !Array.isArray(index.sessions)
              ? index.sessions as Record<string, unknown>
              : index;
            const keyToDelete = indexEntry?.key || sessionKey;
            if (Object.prototype.hasOwnProperty.call(records, keyToDelete)) {
              delete records[keyToDelete];
              fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
            }
          } catch (err) {
            console.warn('[HostAPI] failed to remove session index entry:', err);
          }
        }

        return {
          ok: true,
          data: { status: 200, json: { success: true, deletedPath }, ok: true },
          success: true,
          status: 200,
          json: { success: true, deletedPath },
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

    // 活动监控：/api/sessions/usage - 聚合会话用量（AxonClawX 风格）
    if ((path === '/api/sessions/usage' || path.startsWith('/api/sessions/usage?')) && method === 'GET') {
      try {
        const url = new URL(path, 'http://localhost');
        const limit = parseInt(url.searchParams.get('limit') || '50', 10) || 50;
        const r = await callGatewayRpc('sessions.list', { limit: Math.min(limit, 200) }, 15000);
        const raw = r.result as Record<string, unknown> | unknown[] | undefined;
        const sessions = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'sessions' in raw ? (raw as { sessions?: unknown[] }).sessions : null) ?? [];
        const list = Array.isArray(sessions) ? sessions : [];
        let totalMsgs = 0;
        let totalUserMsgs = 0;
        let totalAssistantMsgs = 0;
        let totalToolCalls = 0;
        let totalErrors = 0;
        const sessionUsages: Array<{ key: string; usage: Record<string, unknown> }> = [];
        for (const s of list) {
          const rec = s as Record<string, unknown>;
          const key = String(rec?.key ?? '');
          if (!key) continue;
          const inp = Number(rec.inputTokens ?? 0);
          const out = Number(rec.outputTokens ?? 0);
          const userMsgs = Number(rec.userMessages ?? rec.userMessageCount ?? 0);
          const assistantMsgs = Number(rec.assistantMessages ?? rec.assistantMessageCount ?? 0);
          const toolCalls = Number(rec.toolCalls ?? rec.toolCallCount ?? 0);
          const errors = Number(rec.errorCount ?? rec.errors ?? 0);
          const knownMsgSum = userMsgs + assistantMsgs + toolCalls + errors;
          const msgCountRaw = Number(rec.messageCount ?? rec.messages ?? knownMsgSum);
          const msgCount = Number.isFinite(msgCountRaw) && msgCountRaw > 0 ? msgCountRaw : Math.max(0, knownMsgSum);
          totalMsgs += msgCount;
          totalUserMsgs += Math.max(0, userMsgs);
          totalAssistantMsgs += Math.max(0, assistantMsgs);
          totalToolCalls += Math.max(0, toolCalls);
          totalErrors += Math.max(0, errors);
          sessionUsages.push({
            key,
            usage: {
              messageCounts: {
                total: msgCount,
                user: Math.max(0, userMsgs),
                assistant: Math.max(0, assistantMsgs),
                toolCalls: Math.max(0, toolCalls),
                errors: Math.max(0, errors),
              },
              toolUsage: { totalCalls: 0, tools: [] },
              inputTokens: inp,
              outputTokens: out,
              latency: rec.avgLatency
                ? {
                    avgMs: Number(rec.avgLatency),
                    p95Ms: Number(rec.p95Latency ?? rec.avgLatency),
                  }
                : undefined,
            },
          });
        }
        const aggregates = {
          messages: {
            total: totalMsgs,
            user: totalUserMsgs,
            assistant: totalAssistantMsgs,
            toolCalls: totalToolCalls,
            errors: totalErrors,
          },
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

    // 特殊处理：/api/usage-cost 使用成本（AxonClawX gwApi.usageCost，透传 Gateway usage.cost RPC）
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

    // 任务记录：SQLite 持久化（用于任务中心展示历史 + 删除）
    if (path === '/api/task-runs' && method === 'GET') {
      try {
        ensureDatabaseReady();
        const url = new URL(path, 'http://localhost');
        const limit = parseInt(url.searchParams.get('limit') || '200', 10) || 200;
        const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
        const safeLimit = Math.max(1, Math.min(1000, limit));
        const fetched = listTaskRuns(Math.min(1000, safeLimit + 1), offset);
        const hasMore = fetched.length > safeLimit;
        const list = hasMore ? fetched.slice(0, safeLimit) : fetched;
        return {
          ok: true,
          data: { status: 200, json: { runs: list, offset, limit: safeLimit, hasMore, nextOffset: offset + list.length }, ok: true },
          success: true,
          status: 200,
          json: { runs: list, offset, limit: safeLimit, hasMore, nextOffset: offset + list.length },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    if (path === '/api/task-runs/upsert' && method === 'POST' && body) {
      try {
        ensureDatabaseReady();
        const payload = typeof body === 'string' ? JSON.parse(body) : body;
        const record = payload as {
          localId: string;
          source: 'multi-agent' | 'chat' | 'external';
          sessionKey: string;
          runId?: string | null;
          task?: string;
          status: 'pending' | 'running' | 'completed' | 'failed';
          createdAt: number;
          updatedAt: number;
          events: unknown[];
          lastSignature?: string;
          agentId?: string;
          result?: string;
          childRunIds?: string[];
        };
        if (!record?.localId || !record?.status) {
          return {
            ok: false,
            data: { status: 400, json: { error: 'Invalid task run payload' }, ok: false },
            success: false,
            status: 400,
            json: { error: 'Invalid task run payload' },
          };
        }
        upsertTaskRun({
          localId: String(record.localId),
          source: (record.source || 'external') as 'multi-agent' | 'chat' | 'external',
          sessionKey: String(record.sessionKey || ''),
          runId: record.runId != null && String(record.runId).trim() ? String(record.runId) : null,
          task: String(record.task || ''),
          status: record.status,
          createdAt: Number(record.createdAt || Date.now()),
          updatedAt: Number(record.updatedAt || Date.now()),
          events: Array.isArray(record.events) ? record.events : [],
          lastSignature: typeof record.lastSignature === 'string' ? record.lastSignature : undefined,
          agentId: typeof record.agentId === 'string' ? record.agentId : undefined,
          result: typeof record.result === 'string' ? record.result : undefined,
          childRunIds: Array.isArray(record.childRunIds) ? record.childRunIds.map((v) => String(v)).filter(Boolean) : undefined,
        });
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    if (path.startsWith('/api/task-runs/') && method === 'DELETE') {
      try {
        ensureDatabaseReady();
        const localId = decodeURIComponent(path.slice('/api/task-runs/'.length));
        if (!localId) {
          return {
            ok: false,
            data: { status: 400, json: { error: 'Invalid localId' }, ok: false },
            success: false,
            status: 400,
            json: { error: 'Invalid localId' },
          };
        }
        deleteTaskRun(localId);
        return {
          ok: true,
          data: { status: 200, json: { success: true }, ok: true },
          success: true,
          status: 200,
          json: { success: true },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    if (path === '/api/task-runs/clear-finished' && method === 'POST') {
      try {
        ensureDatabaseReady();
        const deleted = deleteFinishedTaskRuns();
        return {
          ok: true,
          data: { status: 200, json: { success: true, deleted }, ok: true },
          success: true,
          status: 200,
          json: { success: true, deleted },
        };
      } catch (err) {
        return {
          ok: false,
          data: { status: 500, json: { error: String(err) }, ok: false },
          success: false,
          status: 500,
          json: { error: String(err) },
        };
      }
    }

    // 特殊处理：/api/alerts 告警列表（AxonClawX alertApi.list，从 SQLite 读取 + 日志异常补充）
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

    // 特殊处理：/api/doctor 健康中心（AxonClawX 风格：summary + run + fix）
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
        const recentList = isInitialized() ? listAlerts({ page: 1, page_size: 500 }).list : [];
        const recentIssues = recentList.map((a) => ({
          id: String(a.id),
          source: 'alert',
          category: 'alert',
          risk: a.risk === 'critical' ? 'critical' : a.risk === 'warning' ? 'medium' : 'low',
          title: a.message?.split('\n')[0] || a.message || '告警',
          detail: a.detail || '',
          timestamp: a.created_at,
        }));

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
        const windowStart = nowMs - 24 * 3600000;
        const issuesInWindow = recentIssues
          .map((issue) => {
            const ts = Date.parse(String(issue.timestamp || ''));
            return { issue, ts };
          })
          .filter((x) => Number.isFinite(x.ts) && x.ts >= windowStart && x.ts <= nowMs);
        const scoreFromCounts = (mediumCount: number, highCount: number, criticalCount: number): number => {
          let s = 100;
          if (!gwRunning) s -= 35;
          s -= Math.min(10, mediumCount * 2);
          s -= Math.min(30, highCount * 10);
          s -= Math.min(50, criticalCount * 25);
          if (healthCheck.enabled && healthCheck.failCount > 0) {
            s -= Math.min(25, healthCheck.failCount * 10);
          }
          return Math.max(0, Math.min(100, Math.round(s)));
        };
        for (let i = 0; i <= 24; i++) {
          const pointTs = nowMs - (24 - i) * 3600000;
          let low = 0;
          let medium = 0;
          let high = 0;
          let critical = 0;
          for (const item of issuesInWindow) {
            if (item.ts > pointTs) continue;
            const risk = String(item.issue.risk || '').toLowerCase();
            if (risk === 'critical') critical++;
            else if (risk === 'high') high++;
            else if (risk === 'medium' || risk === 'warning') medium++;
            else low++;
          }
          const healthScore = scoreFromCounts(medium, high, critical);
          trend24h.push({
            timestamp: new Date(pointTs).toISOString(),
            label: new Date(pointTs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            healthScore,
            low,
            medium,
            high,
            critical,
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

    // 特殊处理：/api/host-info 主机信息（AxonClawX 风格完整检测）
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

        // 进程内存（AxonClawX 风格：堆/系统分配/栈/GC）
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

    // 特殊处理：/api/v1/host-info/check-update
    // 概览页更新提示依赖此接口：返回 { updateAvailable, currentVersion, latestVersion }
    if (path === '/api/v1/host-info/check-update') {
      const parseVersionParts = (v: string): number[] =>
        String(v || '')
          .trim()
          .replace(/^v/i, '')
          .split('.')
          .map((x) => Number.parseInt(x, 10))
          .filter((n) => Number.isFinite(n));
      const compareVersions = (aRaw: string, bRaw: string): number => {
        const a = parseVersionParts(aRaw);
        const b = parseVersionParts(bRaw);
        const maxLen = Math.max(a.length, b.length, 1);
        for (let i = 0; i < maxLen; i += 1) {
          const av = a[i] ?? 0;
          const bv = b[i] ?? 0;
          if (av > bv) return 1;
          if (av < bv) return -1;
        }
        return 0;
      };
      try {
        let currentVersion = '';
        try {
          const { stdout } = await execAsync('openclaw --version', { timeout: 5000 });
          currentVersion = String(stdout || '').trim().replace(/^v/i, '');
        } catch {
          // fallback: global npm package metadata
          try {
            const pkgPath = '/opt/homebrew/lib/node_modules/openclaw/package.json';
            if (fs.existsSync(pkgPath)) {
              const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
              currentVersion = String(pkg.version || '').trim().replace(/^v/i, '');
            }
          } catch {
            // ignore
          }
        }

        let latestVersion = '';
        // 优先查询 npm registry（openclaw）
        try {
          const resp = await fetch('https://registry.npmjs.org/openclaw/latest');
          if (resp.ok) {
            const json = (await resp.json()) as { version?: string };
            latestVersion = String(json.version || '').trim().replace(/^v/i, '');
          }
        } catch {
          // ignore and fallback
        }
        // 兜底查询 @openclaw/core（兼容不同发布名）
        if (!latestVersion) {
          try {
            const resp = await fetch('https://registry.npmjs.org/@openclaw/core/latest');
            if (resp.ok) {
              const json = (await resp.json()) as { version?: string };
              latestVersion = String(json.version || '').trim().replace(/^v/i, '');
            }
          } catch {
            // ignore
          }
        }

        const updateAvailable =
          !!currentVersion
          && !!latestVersion
          && compareVersions(latestVersion, currentVersion) > 0;

        const payload = {
          updateAvailable,
          currentVersion: currentVersion || undefined,
          latestVersion: latestVersion || undefined,
        };
        return {
          ok: true,
          data: { status: 200, json: payload, ok: true },
          success: true,
          status: 200,
          json: payload,
        };
      } catch (err) {
        const payload = {
          updateAvailable: false,
          currentVersion: undefined,
          latestVersion: undefined,
          error: String(err),
        };
        return {
          ok: true,
          data: { status: 200, json: payload, ok: true },
          success: true,
          status: 200,
          json: payload,
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
        const { dirPath, addToExtraDirs } = JSON.parse(body) as { dirPath?: string; addToExtraDirs?: boolean };
        if (!dirPath || typeof dirPath !== 'string') return { ok: false, data: { status: 400, json: { success: false, error: 'dirPath required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'dirPath required' } };
        const expanded = dirPath.startsWith('~') ? nodePath.join(os.homedir(), dirPath.slice(1)) : dirPath;
        const resolved = nodePath.resolve(expanded);
        const skills = scanSkillsFromDir(resolved);
        const shouldAddToExtraDirs = addToExtraDirs !== false;

        let addedToExtraDirs = false;
        if (shouldAddToExtraDirs) {
          const cfg = readOpenclawConfig();
          const skillsNode = ensureRecord(cfg.skills);
          const loadNode = ensureRecord(skillsNode.load);
          const currentExtraDirs = Array.isArray(loadNode.extraDirs)
            ? loadNode.extraDirs.filter((it): it is string => typeof it === 'string' && it.trim().length > 0)
            : [];

          const normalizeForCompare = (p: string): string => {
            const rp = p.startsWith('~') ? nodePath.join(os.homedir(), p.slice(1)) : p;
            const abs = nodePath.resolve(rp);
            try {
              return fs.realpathSync(abs);
            } catch {
              return abs;
            }
          };

          const resolvedKey = normalizeForCompare(resolved);
          const existingSet = new Set(currentExtraDirs.map((p) => normalizeForCompare(p)));
          if (!existingSet.has(resolvedKey)) {
            loadNode.extraDirs = [...currentExtraDirs, resolved];
            skillsNode.load = loadNode;
            cfg.skills = skillsNode;
            writeOpenclawConfig(cfg);
            addedToExtraDirs = true;
          }
        }

        return {
          ok: true,
          data: { status: 200, json: { success: true, skills, addedToExtraDirs }, ok: true },
          success: true,
          status: 200,
          json: { success: true, skills, addedToExtraDirs },
        };
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
        const payload = typeof body === 'string' ? JSON.parse(body) : (body as Record<string, unknown>);
        writeOpenclawConfig(payload);
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] config set error:', err);
        return { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } };
      }
    }
    if (path === '/api/config/path' && method === 'GET') {
      return { ok: true, data: { status: 200, json: { path: OPENCLAW_CONFIG_PATH }, ok: true }, success: true, status: 200, json: { path: OPENCLAW_CONFIG_PATH } };
    }

    // ── AxonClawX 配置中心 API (/api/v1/*) 与 AxonClawX 界面一致 ──
    if (path === '/api/v1/config' && method === 'GET') {
      try {
        let data: { config?: Record<string, unknown>; path?: string; parsed?: boolean; hash?: string } = {};
        // 1) 本地配置优先：避免被网关返回的裁剪结果覆盖真实配置
        if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
          const raw = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf8');
          const parsed = parseOpenclawConfigText(raw);
          if (parsed && typeof parsed === 'object') {
            data = {
              config: enrichConfigFromLatestBackup(parsed as Record<string, unknown>, OPENCLAW_CONFIG_PATH),
              path: OPENCLAW_CONFIG_PATH,
              parsed: true,
            };
          }
        }
        // 2) 本地不存在时回退网关
        if (!data.config || typeof data.config !== 'object') {
          try {
            const r = await callGatewayRpc('config.get', {}, 8000);
            if (r.ok && r.result != null) {
              if (typeof r.result === 'object' && !Array.isArray(r.result)) {
                const cfg = (r.result as Record<string, unknown>)?.config ?? r.result;
                if (typeof cfg === 'object' && cfg !== null) {
                  data = { config: cfg as Record<string, unknown>, path: OPENCLAW_CONFIG_PATH, parsed: true };
                }
              }
            }
          } catch {
            /* ignore */
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
        writeOpenclawConfig(cfg as Record<string, unknown>);
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
        writeOpenclawConfig(defaultConfig);
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
        const scan = await (async () => {
          const { stdout: openclawPathRaw } = await execAsync('command -v openclaw || true', { timeout: 3000 });
          const openclawPath = openclawPathRaw.trim();
          let openclawVersion = '';
          if (openclawPath) {
            try {
              const { stdout } = await execAsync('openclaw --version', { timeout: 5000 });
              openclawVersion = stdout.trim();
            } catch {
              // ignore
            }
          }
          const probe = await resolveGatewayPort();
          return {
            openclawPath,
            openclawVersion,
            gatewayRunning: probe.success,
            gatewayPort: probe.port ?? getResolvedGatewayPort(),
          };
        })();
        const data = {
          os: process.platform,
          arch: process.arch,
          packageManager: 'npm',
          hasSudo: true,
          tools: {
            node: { installed: true, version: process.version, path: process.execPath },
            npm: { installed: true },
            git: { installed: true },
            openclaw: { installed: !!scan.openclawPath, version: scan.openclawVersion, path: scan.openclawPath },
            clawhub: { installed: false },
          },
          internetAccess: true,
          openClawInstalled: !!scan.openclawPath,
          openClawConfigured: fs.existsSync(OPENCLAW_CONFIG_PATH),
          openClawVersion: scan.openclawVersion,
          openClawCnInstalled: false,
          gatewayRunning: !!scan.gatewayRunning,
          gatewayPort: scan.gatewayPort,
          recommendedMethod: 'auto',
          recommendedSteps: [],
          warnings: [],
        };
        return { ok: true, data: { status: 200, json: { success: true, data }, ok: true }, success: true, status: 200, json: { success: true, data } };
      } catch (err) {
        return { ok: true, data: { status: 200, json: { success: true, data: { openClawInstalled: false } }, ok: true }, success: true, status: 200, json: { success: true, data: { openClawInstalled: false } } };
      }
    }
    if (path === '/api/v1/gw/proxy' && method === 'POST') {
      try {
        const params = typeof body === 'string' ? JSON.parse(body) : (body as { method?: string; params?: Record<string, unknown> });
        const rpcMethod = params?.method ?? '';
        let rpcParams = params?.params ?? {};
        if (rpcMethod === 'chat.send' && rpcParams && typeof rpcParams === 'object') {
          rpcParams = await normalizeChatSendParams(rpcParams as Record<string, unknown>);
        }
        const r = await callGatewayRpcWithRetry(rpcMethod, rpcParams, getGatewayRpcTimeoutMs(rpcMethod));
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

    // 代理管理：/api/agents - 与 AxonClawX 一致，使用 agents.list RPC
    // 1. 优先 agents.list（AxonClawX 同款）
    // 2. 失败时尝试 config.get 构建
    // 3. 再失败时尝试 AxonClawX HTTP (18080)
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

        // 1) 优先 agents.list（AxonClawX 同款）
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
        const fallback = await fetchAgentsFromAxonClawX();
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
          const payload = typeof body === 'string' ? JSON.parse(body) : (body as Record<string, unknown>);
          const updatePayload: Record<string, unknown> = { agentId };
          for (const key of ['name', 'workspace', 'model', 'avatar', 'emoji', 'description', 'role', 'prompt', 'systemPrompt', 'instructions', 'tags', 'tools'] as const) {
            if (payload[key] !== undefined) {
              updatePayload[key] = payload[key];
            }
          }
          const defaultFlag =
            typeof payload.default === 'boolean'
              ? payload.default
              : typeof payload.isDefault === 'boolean'
                ? payload.isDefault
                : typeof payload.makeDefault === 'boolean'
                  ? payload.makeDefault
                  : undefined;
          if (defaultFlag !== undefined) {
            updatePayload.default = defaultFlag;
          }
          if (payload.defaultAgentId !== undefined) {
            updatePayload.defaultAgentId = payload.defaultAgentId;
          }

          const safeUpdatePayload: Record<string, unknown> = { agentId };
          for (const key of ['name', 'workspace', 'model', 'avatar'] as const) {
            if (payload[key] !== undefined) {
              safeUpdatePayload[key] = payload[key];
            }
          }
          if (defaultFlag !== undefined) {
            safeUpdatePayload.default = defaultFlag;
          }
          if (payload.defaultAgentId !== undefined) {
            safeUpdatePayload.defaultAgentId = payload.defaultAgentId;
          }

          let updateResult = await callGatewayRpc('agents.update', updatePayload);
          if (!updateResult.ok) {
            updateResult = await callGatewayRpc('agents.update', safeUpdatePayload);
          }
          if (!updateResult.ok) {
            throw new Error(updateResult.error || 'agents.update failed');
          }
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

    if (path === '/api/files/thumbnails' && method === 'POST' && body) {
      try {
        const { paths } = JSON.parse(body) as { paths?: Array<{ filePath: string; mimeType: string }> };
        if (!Array.isArray(paths) || paths.length === 0) {
          return { ok: false, data: { status: 400, json: {} }, success: false };
        }
        const mimeMap: Record<string, string> = {
          '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
          '.svg': 'image/svg+xml',
        };
        const result: Record<string, { preview: string | null; fileSize: number }> = {};
        for (const { filePath, mimeType } of paths) {
          if (!filePath) continue;
          try {
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            let preview: string | null = null;
            const ext = nodePath.extname(filePath).toLowerCase();
            const resolvedMime = mimeType || mimeMap[ext] || 'application/octet-stream';
            if (resolvedMime.startsWith('image/')) {
              const buf = fs.readFileSync(filePath);
              preview = `data:${resolvedMime};base64,${buf.toString('base64')}`;
            }
            result[filePath] = { preview, fileSize };
          } catch {
            result[filePath] = { preview: null, fileSize: 0 };
          }
        }
        return { ok: true, data: { status: 200, json: result }, success: true, json: result };
      } catch (err) {
        console.error('[HostAPI] thumbnails error:', err);
        return { ok: false, data: { status: 500, json: {} }, success: false };
      }
    }

    // 调度器概览（AxonClawX 定时调度页顶部卡）
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

    // 调度任务（AxonClawX 风格）：透传 Gateway cron RPC
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

    // AxonClawX（18080）多代理 API — OpenClaw Gateway 无此路由，需转发到 AxonClawX HTTP
    if (path.startsWith('/api/v1/multi-agent')) {
      const remoteBase = `http://127.0.0.1:${AXONCLAWX_HTTP_PORT}`;
      let remoteResult: {
        status: number;
        ok: boolean;
        json: unknown;
        text?: string;
      } | null = null;
      let remoteErr: string | null = null;

      try {
        const response = await fetch(`${remoteBase}${path}`, {
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
        remoteResult = {
          status: response.status,
          ok: response.ok,
          json,
          text,
        };
      } catch (e) {
        remoteErr = e instanceof Error ? e.message : String(e);
      }

      const supportedFallbackPaths = ['/api/v1/multi-agent/deploy', '/api/v1/multi-agent/preview', '/api/v1/multi-agent/status', '/api/v1/multi-agent/delete'];
      const shouldFallbackLocally =
        remoteResult == null ||
        (!remoteResult.ok && supportedFallbackPaths.includes(path));

      if (!shouldFallbackLocally && remoteResult) {
        return {
          ok: true,
          data: {
            status: remoteResult.status,
            ok: remoteResult.ok,
            json: remoteResult.json,
            text: remoteResult.text,
          },
          success: remoteResult.ok,
          status: remoteResult.status,
          json: remoteResult.json,
          text: remoteResult.text,
        };
      }

      if (path === '/api/v1/multi-agent/deploy' || path === '/api/v1/multi-agent/preview') {
        try {
          const parsedBody =
            typeof body === 'string' && body
              ? (JSON.parse(body) as MultiAgentDeployRequest)
              : (body as MultiAgentDeployRequest | undefined) ?? {};
          const result = await applyLocalMultiAgentDeployment({
            ...parsedBody,
            dryRun: path === '/api/v1/multi-agent/preview' || parsedBody?.dryRun,
          });
          return {
            ok: true,
            data: {
              status: result.success ? 200 : 500,
              ok: result.success,
              json: result,
              text: result.message,
            },
            success: result.success,
            status: result.success ? 200 : 500,
            json: result,
            text: result.message,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            ok: false,
            error: { message: remoteErr || message || 'AxonClawX 多代理 API 不可用（请启动 AxonClawX 或检查 18080 端口）' },
            success: false,
          };
        }
      }

      const message = remoteErr || 'AxonClawX 多代理 API 不可用（请启动 AxonClawX 或检查 18080 端口）';
      return {
        ok: true,
        data: {
          status: 503,
          ok: false,
          json: {
            success: false,
            errors: [message],
            localFallback: false,
          },
          text: message,
        },
        success: false,
        status: 503,
        json: {
          success: false,
          errors: [message],
          localFallback: false,
        },
        text: message,
      };
    }

    const url = `${getGatewayApiBase()}${path}`;
    console.log(`[HostAPI] ${method} ${path}`);

    const gatewayProxyTimeoutMs = 20_000;
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body || undefined,
      signal: AbortSignal.timeout(gatewayProxyTimeoutMs),
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
