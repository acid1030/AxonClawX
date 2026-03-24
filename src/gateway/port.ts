/**
 * Gateway 端口解析与连接检测
 * 1. 扫描进程中 OpenClaw 实际监听端口
 * 2. 从 openclaw.json 读取配置端口
 * 3. 多端口探测（18789、18791、18792）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GATEWAY_TOKEN } from './constants';

const execAsync = promisify(exec);
const DEFAULT_PORT = 18789;
const FALLBACK_PORTS = [18789, 18791, 18792, 18080]; // OpenClaw 18789/18791/18792，ClawDeckX Web UI 18080
const CHECK_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || GATEWAY_TOKEN;

/** 从 ~/.openclaw/openclaw.json 读取 gateway.port */
export function readGatewayPortFromConfig(): number {
  try {
    const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    if (!fs.existsSync(configPath)) return DEFAULT_PORT;
    const raw = fs.readFileSync(configPath, 'utf8');
    const cleaned = raw
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1');
    const json = JSON.parse(cleaned) as Record<string, unknown>;
    const gw = json?.gateway as Record<string, unknown> | undefined;
    const port = gw?.port;
    if (typeof port === 'number' && port > 0 && port <= 65535) return port;
    if (typeof port === 'string') {
      const n = parseInt(port, 10);
      if (!isNaN(n) && n > 0 && n <= 65535) return n;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PORT;
}

/** 缓存已解析端口：checkConnection 成功后写入 */
let resolvedPortCache: number | null = null;

export function getResolvedGatewayPort(): number {
  return resolvedPortCache ?? readGatewayPortFromConfig();
}

export function setResolvedGatewayPort(port: number): void {
  resolvedPortCache = port;
}

export function clearResolvedGatewayPort(): void {
  resolvedPortCache = null;
}

/** 尝试连接指定端口的 WebSocket，完成 connect 握手 */
async function tryConnect(port: number, timeoutMs = 5000): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const WebSocket = require('ws');
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    let resolved = false;
    const once = (r: { success: boolean; error?: string }) => {
      if (resolved) return;
      resolved = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(r);
    };
    const timeout = setTimeout(() => once({ success: false, error: 'Timeout' }), timeoutMs);

    ws.on('error', () => once({ success: false, error: 'Connection refused' }));
    ws.on('close', () => {
      if (!resolved) once({ success: false, error: 'Connection closed' });
    });
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          ws.send(
            JSON.stringify({
              type: 'req',
              id: 'chk-' + Date.now(),
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'gateway-client',
                  displayName: 'AxonClaw',
                  version: '0.1.0',
                  platform: process.platform,
                  mode: 'ui',
                },
                auth: { token: CHECK_TOKEN },
                role: 'operator',
                scopes: ['operator.admin'],
              },
            })
          );
          return;
        }
        if (msg.type === 'res' && String(msg.id).startsWith('chk-')) {
          clearTimeout(timeout);
          once({ success: !!msg.ok, error: msg.ok ? undefined : (msg.error?.message ?? msg.error ?? 'Connect failed') });
        }
      } catch {
        /* ignore parse errors */
      }
    });
  });
}

/**
 * 从系统进程中检测 OpenClaw 监听的端口
 * macOS/Linux: lsof 查找 openclaw 进程的 TCP LISTEN 端口
 */
async function detectOpenClawPortFromProcess(): Promise<number[]> {
  const ports: number[] = [];
  try {
    const platform = os.platform();
    if (platform === 'darwin' || platform === 'linux') {
      // lsof -iTCP -sTCP:LISTEN -P -n 列出所有 TCP 监听，grep openclaw 或 clawdeck（ClawDeckX）
      const { stdout } = await execAsync(
        "lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | grep -iE 'openclaw|clawdeck' || true",
        { timeout: 3000, maxBuffer: 64 * 1024 }
      );
      // 输出格式: openclaw  12345 user  21u  IPv4 0x...  TCP 127.0.0.1:18789 (LISTEN)
      const re = /:(\d+)\s*\(LISTEN\)/g;
      let m;
      while ((m = re.exec(stdout)) !== null) {
        const p = parseInt(m[1], 10);
        if (p > 0 && p <= 65535 && !ports.includes(p)) ports.push(p);
      }
    } else if (platform === 'win32') {
      // netstat -ano | findstr LISTENING，再通过 tasklist 匹配 openclaw
      const { stdout: netOut } = await execAsync('netstat -ano 2>nul', { timeout: 3000 });
      const lines = netOut.split(/\r?\n/).filter((l) => l.includes('LISTENING') && l.includes('127.0.0.1'));
      for (const line of lines) {
        const m = line.match(/:(\d+)\s+127\.0\.0\.1/);
        if (m) {
          const p = parseInt(m[1], 10);
          if (p > 0 && p <= 65535 && !ports.includes(p)) ports.push(p);
        }
      }
      // 简单取常见端口，Windows 上难以精确匹配 openclaw 进程
      if (ports.length === 0) ports.push(...FALLBACK_PORTS);
    }
  } catch {
    /* ignore */
  }
  return ports;
}

/**
 * 探测 Gateway 可用端口：
 * 1. 从进程中检测 OpenClaw 实际监听端口
 * 2. 配置端口 + 常见端口 18789/18791/18792
 */
export async function resolveGatewayPort(): Promise<{ success: boolean; port?: number; error?: string }> {
  const processPorts = await detectOpenClawPortFromProcess();
  const configPort = readGatewayPortFromConfig();
  const portsToTry = Array.from(new Set([...processPorts, configPort, ...FALLBACK_PORTS]));

  for (const p of portsToTry) {
    const result = await tryConnect(p, 4000);
    if (result.success) {
      setResolvedGatewayPort(p);
      return { success: true, port: p };
    }
  }

  clearResolvedGatewayPort();
  return { success: false, error: `无法连接 Gateway，已尝试端口: ${portsToTry.join(', ')}` };
}
