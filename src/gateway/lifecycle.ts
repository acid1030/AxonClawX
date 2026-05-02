/**
 * Gateway Lifecycle Management
 * Provides functions to start and stop the OpenClaw Gateway process
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GATEWAY_TOKEN } from './constants';

export interface GatewayStatus {
  state: 'running' | 'stopped' | 'starting' | 'error';
  port: number;
  pid?: number;
  error?: string;
}

export interface GatewayEvents {
  started: () => void;
  stopped: (code: number | null) => void;
  error: (error: Error) => void;
  log: (level: 'info' | 'error' | 'warn', message: string) => void;
}

/**
 * Gateway Lifecycle Manager
 * Manages the OpenClaw Gateway process lifecycle
 */
class GatewayLifecycleManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private port: number = 18789;
  private status: GatewayStatus = { state: 'stopped', port: this.port };
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private startupFailureReason: string | null = null;
  private autoRepairTried: boolean = false;
  private versionSkewRepairAttempted: boolean = false;
  private configHomeOverride: string | null = null;
  private readonly requiredOperatorScopes = [
    'operator.admin',
    'operator.read',
    'operator.write',
    'operator.approvals',
    'operator.pairing',
  ];

  private resolveOpenClawCommand(): { command: string; envPathPrefix: string[] } {
    const candidates = [
      process.env.OPENCLAW_BIN,
      '/opt/homebrew/bin/openclaw',
      '/usr/local/bin/openclaw',
      path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw'),
      'openclaw',
    ].filter((v): v is string => !!v && String(v).trim().length > 0);

    for (const candidate of candidates) {
      if (candidate === 'openclaw') continue;
      try {
        if (fs.existsSync(candidate)) {
          return {
            command: candidate,
            envPathPrefix: Array.from(
              new Set([
                path.dirname(candidate),
                '/opt/homebrew/bin',
                '/usr/local/bin',
              ]),
            ),
          };
        }
      } catch {
        // continue fallback
      }
    }

    return {
      command: 'openclaw',
      envPathPrefix: ['/opt/homebrew/bin', '/usr/local/bin'],
    };
  }

  /**
   * Start the OpenClaw Gateway
   */
  async start(): Promise<void> {
    // Prevent concurrent start
    if (this.startPromise) return this.startPromise;
    
    // Already running
    if (this.status.state === 'running') return;

    // New start attempt: allow one fresh auto-repair retry.
    this.autoRepairTried = false;

    this.startPromise = this.doStart();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  private async doStart(): Promise<void> {
    this.status = { state: 'starting', port: this.port };
    this.startupFailureReason = null;
    this.versionSkewRepairAttempted = false;
    
    console.log('[Gateway] Starting OpenClaw Gateway...');
    this.emit('log', 'info', 'Starting OpenClaw Gateway...');
    
    try {
      const runtimeHome = this.configHomeOverride || os.homedir();
      try {
        const changed = this.ensureOperatorScopesInHome(runtimeHome);
        if (changed) {
          this.emit('log', 'warn', `Repaired operator scopes in ${path.join(runtimeHome, '.openclaw', 'devices', 'paired.json')}`);
        }
      } catch (err) {
        this.emit('log', 'warn', `Scope auto-repair skipped: ${String(err)}`);
      }

      // Start OpenClaw Gateway as subprocess
      const resolved = this.resolveOpenClawCommand();
      const nextPath = Array.from(
        new Set([
          ...resolved.envPathPrefix,
          ...(String(process.env.PATH || '').split(path.delimiter).filter(Boolean)),
        ]),
      ).join(path.delimiter);
      this.emit('log', 'info', `Gateway command: ${resolved.command}`);
      this.emit('log', 'info', `Gateway PATH: ${nextPath}`);

      this.process = spawn(resolved.command, ['gateway', 'run', '--compact'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH: nextPath,
          // Ensure Gateway uses the correct port
          OPENCLAW_GATEWAY_PORT: String(this.port),
          // Allow memory-lancedb plugin to use Zhipu AI (BigModel) embedding API
          // when OPENAI_BASE_URL is not already set externally
          ...(process.env.OPENAI_BASE_URL ? {} : {
            OPENAI_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4',
          }),
          ...(this.configHomeOverride ? { HOME: this.configHomeOverride } : {}),
        },
      });
      const child = this.process;

      // Handle stdout
      child.stdout?.on('data', (data) => {
        if (this.process !== child) return;
        const msg = data.toString().trim();
        if (msg) {
          console.log('[Gateway]', msg);
          this.emit('log', 'info', msg);
        }
      });

      // Handle stderr
      child.stderr?.on('data', (data) => {
        if (this.process !== child) return;
        const msg = data.toString().trim();
        if (msg) {
          console.error('[Gateway Error]', msg);
          this.emit('log', 'error', msg);
          // Version skew is noisy but often non-fatal in runtime, do not kill gateway process here.
          // Auto-repair logic will still handle truly fatal startup failures.
          if (msg.includes('Config was last written by a newer OpenClaw') || msg.includes('current version is')) {
            this.emit('log', 'warn', 'Detected OpenClaw config version skew; keeping gateway process alive and continuing startup checks.');
            if (!this.versionSkewRepairAttempted) {
              this.versionSkewRepairAttempted = true;
              const repaired = this.attemptConfigAutoRepair(msg);
              if (repaired) {
                this.emit('log', 'warn', 'Applied one-time config meta repair for version skew (effective on next restart).');
              }
            }
          }
          if (msg.includes('Unknown config keys') || msg.includes('setupComplete')) {
            this.startupFailureReason = msg;
          }
          const isPluginDuplicateWarning =
            /duplicate plugin id/i.test(msg) ||
            /bundled plugin will be overridden/i.test(msg);
          if (
            !isPluginDuplicateWarning &&
            (
              /invalid config/i.test(msg) ||
              /must have required property/i.test(msg) ||
              /plugins?.*memory-lancedb/i.test(msg)
            )
          ) {
            this.startupFailureReason = msg;
          }
        }
      });

      // Handle process exit
      child.on('exit', (code, signal) => {
        if (this.process !== child) return;
        const wasRunning = this.status.state === 'running';
        this.status = { 
          state: 'stopped', 
          port: this.port,
          error: code !== 0 ? `Process exited with code ${code}` : undefined
        };
        this.process = null;
        
        if (wasRunning) {
          console.log('[Gateway] Stopped with code:', code, 'signal:', signal);
          this.emit('stopped', code);
          this.emit('log', 'warn', `Gateway stopped (code: ${code})`);
        }
      });

      // Handle process error
      child.on('error', (error) => {
        if (this.process !== child) return;
        console.error('[Gateway] Process error:', error);
        this.startupFailureReason = error.message || String(error);
        this.status = { state: 'error', port: this.port, error: error.message };
        this.emit('error', error);
        this.emit('log', 'error', `Process error: ${error.message}`);
      });

      // Wait for Gateway ready
      await this.waitForReady();
      
      this.status = { 
        state: 'running', 
        port: this.port,
        pid: this.process?.pid 
      };
      
      this.emit('started');
      this.emit('log', 'info', `Gateway ready on port ${this.port}`);
      console.log('[Gateway] Ready on port', this.port);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Auto-repair once for common local config incompatibilities.
      // This prevents "Start Gateway" from getting stuck due to stale keys/version stamps.
      if (!this.autoRepairTried) {
        const reason = String(this.startupFailureReason || err.message || '');
        const repaired = this.attemptConfigAutoRepair(reason);
        if (repaired) {
          this.autoRepairTried = true;
          this.emit('log', 'warn', 'Detected incompatible config; auto-repaired and retrying gateway start once.');
          if (this.process) {
            try {
              this.process.kill('SIGTERM');
            } catch {
              // ignore
            }
            this.process = null;
          }
          return this.doStart();
        }
      }

      this.status = { state: 'error', port: this.port, error: err.message };
      this.emit('error', err);
      this.emit('log', 'error', `Failed to start: ${err.message}`);
      
      // Clean up process if started
      if (this.process) {
        this.process.kill();
        this.process = null;
      }
      
      throw err;
    } finally {
      if (this.status.state === 'running') {
        this.autoRepairTried = false;
      }
    }
  }

  private attemptConfigAutoRepair(reason: string): boolean {
    try {
      const runtimeHome = this.configHomeOverride || os.homedir();
      const cfgPath = path.join(runtimeHome, '.openclaw', 'openclaw.json');
      if (!fs.existsSync(cfgPath)) return false;

      const raw = fs.readFileSync(cfgPath, 'utf8');
      const cfg = JSON.parse(raw) as Record<string, unknown>;
      let changed = false;

      // 1) Remove schema-invalid setup flags if any.
      if ('setupComplete' in cfg) {
        delete (cfg as Record<string, unknown>).setupComplete;
        changed = true;
      }
      const ui = cfg.ui && typeof cfg.ui === 'object' && !Array.isArray(cfg.ui)
        ? (cfg.ui as Record<string, unknown>)
        : {};
      if ('setupComplete' in ui) {
        delete ui.setupComplete;
        changed = true;
      }
      cfg.ui = ui;

      // 1.1) Remove schema-invalid models.default (OpenClaw 2026.2.x rejects this key).
      const models = cfg.models && typeof cfg.models === 'object' && !Array.isArray(cfg.models)
        ? (cfg.models as Record<string, unknown>)
        : {};
      if ('default' in models) {
        delete models.default;
        changed = true;
      }
      cfg.models = models;

      // 1.2) Remove invalid plugin entries reported by validator (e.g. memory-lancedb schema mismatch).
      const plugins = (cfg.plugins && typeof cfg.plugins === 'object' && !Array.isArray(cfg.plugins))
        ? (cfg.plugins as Record<string, unknown>)
        : {};
      const entries = (plugins.entries && typeof plugins.entries === 'object' && !Array.isArray(plugins.entries))
        ? (plugins.entries as Record<string, unknown>)
        : {};
      const pluginMatch = reason.match(/plugins\.entries\.([a-zA-Z0-9._-]+)/);
      if (pluginMatch?.[1]) {
        const pluginId = pluginMatch[1];
        if (pluginId in entries) {
          delete entries[pluginId];
          changed = true;
        }
      }
      if (reason.includes('memory-lancedb') && 'memory-lancedb' in entries) {
        delete entries['memory-lancedb'];
        changed = true;
      }
      plugins.entries = entries;
      cfg.plugins = plugins;

      // 2) Downgrade meta stamp when local OpenClaw reports config is from a newer version.
      const versionMatch = reason.match(/current version is\s*([0-9]+\.[0-9]+\.[0-9]+)/i);
      if (versionMatch?.[1]) {
        const currentVersion = versionMatch[1];
        const meta = cfg.meta && typeof cfg.meta === 'object' && !Array.isArray(cfg.meta)
          ? (cfg.meta as Record<string, unknown>)
          : {};
        if (meta.lastTouchedVersion !== currentVersion) {
          meta.lastTouchedVersion = currentVersion;
          meta.lastTouchedAt = new Date().toISOString();
          cfg.meta = meta;
          changed = true;
        }
      }

      if (!changed) return false;

      const stamp = new Date().toISOString().replace(/[:]/g, '-');
      const nextJson = JSON.stringify(cfg, null, 2);
      let wrotePrimaryConfig = false;

      try {
        fs.copyFileSync(cfgPath, `${cfgPath}.bak.auto-repair.${stamp}`);
      } catch {
        // Best-effort backup only; do not block repair on backup permission issues.
      }

      try {
        fs.writeFileSync(cfgPath, nextJson, 'utf8');
        wrotePrimaryConfig = true;
      } catch {
        wrotePrimaryConfig = false;
      }

      if (!wrotePrimaryConfig) {
        // Fallback for sandboxed/readonly home: run Gateway with an override HOME
        // pointing to a writable temp config copy.
        const tmpHome = path.join(os.tmpdir(), 'axonclaw-openclaw-home');
        const tmpCfgDir = path.join(tmpHome, '.openclaw');
        const tmpCfgPath = path.join(tmpCfgDir, 'openclaw.json');
        fs.mkdirSync(tmpCfgDir, { recursive: true });
        this.syncStateToOverrideHome(tmpHome);
        fs.writeFileSync(tmpCfgPath, nextJson, 'utf8');
        this.configHomeOverride = tmpHome;
      } else if (!this.configHomeOverride) {
        // Only clear override when we were writing to primary home.
        this.configHomeOverride = null;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stop the OpenClaw Gateway
   */
  async stop(): Promise<void> {
    // Prevent concurrent stop
    if (this.stopPromise) return this.stopPromise;
    
    // Not running
    if (!this.process && this.status.state !== 'running') return;
    
    this.stopPromise = this.doStop();
    try {
      await this.stopPromise;
    } finally {
      this.stopPromise = null;
    }
  }

  private async doStop(): Promise<void> {
    if (!this.process) return;
    
    console.log('[Gateway] Stopping...');
    this.emit('log', 'info', 'Stopping Gateway...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[Gateway] Force killing after timeout');
        this.process?.kill('SIGKILL');
      }, 5000);

      this.process!.once('exit', () => {
        clearTimeout(timeout);
        this.process = null;
        this.status = { state: 'stopped', port: this.port };
        console.log('[Gateway] Stopped');
        this.emit('log', 'info', 'Gateway stopped');
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.process!.kill('SIGTERM');
    });
  }

  /**
   * Get current Gateway status
   */
  getStatus(): GatewayStatus {
    return { ...this.status };
  }

  /**
   * Check if Gateway is running
   */
  isRunning(): boolean {
    return this.status.state === 'running';
  }

  /**
   * Wait for Gateway to be ready by polling health endpoint
   * (LanceDB / memory-lancedb and other plugins can push first /health >30s on cold start.)
   */
  private async waitForReady(): Promise<void> {
    const intervalMs = 500;
    const maxWaitMs = 120_000;
    const maxAttempts = Math.ceil(maxWaitMs / intervalMs);
    
    for (let i = 0; i < maxAttempts; i++) {
      if (this.startupFailureReason) {
        throw new Error(this.startupFailureReason);
      }
      // Check if process is still alive
      if (!this.process || this.process.killed) {
        throw new Error('Gateway process died during startup');
      }
      
      try {
        const response = await fetch(`http://127.0.0.1:${this.port}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Expected during startup - continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error(`Gateway startup timeout after ${(maxAttempts * intervalMs) / 1000}s`);
  }

  private mergeScopes(existing: unknown): string[] {
    const current = Array.isArray(existing)
      ? existing.map((v) => String(v || '').trim()).filter(Boolean)
      : [];
    for (const scope of this.requiredOperatorScopes) {
      if (!current.includes(scope)) current.push(scope);
    }
    return current;
  }

  private ensureOperatorScopesInHome(homeDir: string): boolean {
    const pairedPath = path.join(homeDir, '.openclaw', 'devices', 'paired.json');
    if (!fs.existsSync(pairedPath)) return false;

    const raw = fs.readFileSync(pairedPath, 'utf8');
    const json = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    if (!json || typeof json !== 'object') return false;

    let changed = false;
    for (const [deviceId, recRaw] of Object.entries(json)) {
      const rec = (recRaw || {}) as Record<string, unknown>;
      const role = String(rec.role || '').trim();
      const clientId = String(rec.clientId || '').trim();
      if (role !== 'operator' && clientId !== 'gateway-client') continue;

      const nextScopes = this.mergeScopes(rec.scopes);
      if (JSON.stringify(nextScopes) !== JSON.stringify(rec.scopes ?? [])) {
        rec.scopes = nextScopes;
        changed = true;
      }

      const nextApproved = this.mergeScopes(rec.approvedScopes);
      if (JSON.stringify(nextApproved) !== JSON.stringify(rec.approvedScopes ?? [])) {
        rec.approvedScopes = nextApproved;
        changed = true;
      }

      const tokens = (rec.tokens && typeof rec.tokens === 'object' && !Array.isArray(rec.tokens))
        ? (rec.tokens as Record<string, unknown>)
        : {};
      const opTokenRaw = (tokens.operator && typeof tokens.operator === 'object' && !Array.isArray(tokens.operator))
        ? (tokens.operator as Record<string, unknown>)
        : null;
      if (opTokenRaw) {
        const nextTokenScopes = this.mergeScopes(opTokenRaw.scopes);
        if (JSON.stringify(nextTokenScopes) !== JSON.stringify(opTokenRaw.scopes ?? [])) {
          opTokenRaw.scopes = nextTokenScopes;
          tokens.operator = opTokenRaw;
          rec.tokens = tokens;
          changed = true;
        }
      }

      json[deviceId] = rec;
    }

    if (!changed) return false;
    fs.writeFileSync(pairedPath, JSON.stringify(json, null, 2), 'utf8');
    return true;
  }

  private syncStateToOverrideHome(tmpHome: string): void {
    const srcRoot = path.join(os.homedir(), '.openclaw');
    const dstRoot = path.join(tmpHome, '.openclaw');
    if (!fs.existsSync(srcRoot)) return;
    fs.mkdirSync(dstRoot, { recursive: true });

    const copyIfMissing = (from: string, to: string) => {
      if (!fs.existsSync(from) || fs.existsSync(to)) return;
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.cpSync(from, to, { recursive: true });
    };

    copyIfMissing(path.join(srcRoot, 'agents'), path.join(dstRoot, 'agents'));
    copyIfMissing(path.join(srcRoot, 'devices'), path.join(dstRoot, 'devices'));
    copyIfMissing(path.join(srcRoot, 'identity'), path.join(dstRoot, 'identity'));
    copyIfMissing(path.join(srcRoot, 'workspace'), path.join(dstRoot, 'workspace'));
    copyIfMissing(path.join(srcRoot, 'memory'), path.join(dstRoot, 'memory'));
  }

  repairOperatorScopesNow(): { changed: boolean; runtimeHome: string } {
    const runtimeHome = this.configHomeOverride || os.homedir();
    const changed = this.ensureOperatorScopesInHome(runtimeHome);
    return { changed, runtimeHome };
  }

  relaxGatewayAuthForLocalNow(): { changed: boolean; runtimeHome: string } {
    const runtimeHome = this.configHomeOverride || os.homedir();
    const cfgPath = path.join(runtimeHome, '.openclaw', 'openclaw.json');
    if (!fs.existsSync(cfgPath)) return { changed: false, runtimeHome };
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const cfg = JSON.parse(raw) as Record<string, unknown>;
    const gateway = (cfg.gateway && typeof cfg.gateway === 'object' && !Array.isArray(cfg.gateway))
      ? (cfg.gateway as Record<string, unknown>)
      : {};
    const auth = (gateway.auth && typeof gateway.auth === 'object' && !Array.isArray(gateway.auth))
      ? (gateway.auth as Record<string, unknown>)
      : {};
    let changed = false;
    if (String(auth.mode || '').trim().toLowerCase() !== 'token') {
      auth.mode = 'token';
      changed = true;
    }
    if (String(auth.token || '').trim().length === 0) {
      auth.token = GATEWAY_TOKEN;
      changed = true;
    }
    gateway.auth = auth;
    cfg.gateway = gateway;
    if (changed) {
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
    }
    return { changed, runtimeHome };
  }
}

// Global singleton instance
const gatewayLifecycle = new GatewayLifecycleManager();

/**
 * Start the OpenClaw Gateway
 * Safe to call multiple times - will only start once
 */
export async function startGateway(): Promise<void> {
  return gatewayLifecycle.start();
}

/**
 * Stop the OpenClaw Gateway
 * Safe to call multiple times - will only stop once
 */
export async function stopGateway(): Promise<void> {
  return gatewayLifecycle.stop();
}

/**
 * Get current Gateway status
 */
export function getGatewayStatus(): GatewayStatus {
  return gatewayLifecycle.getStatus();
}

/**
 * Check if Gateway is running
 */
export function isGatewayRunning(): boolean {
  return gatewayLifecycle.isRunning();
}

/**
 * Get the Gateway lifecycle manager instance
 * Use this to subscribe to events
 */
export function getGatewayManager(): GatewayLifecycleManager {
  return gatewayLifecycle;
}

export function repairGatewayOperatorScopes(): { changed: boolean; runtimeHome: string } {
  return gatewayLifecycle.repairOperatorScopesNow();
}

export function relaxGatewayLocalAuth(): { changed: boolean; runtimeHome: string } {
  return gatewayLifecycle.relaxGatewayAuthForLocalNow();
}

// Re-export types
export type { GatewayLifecycleManager };
