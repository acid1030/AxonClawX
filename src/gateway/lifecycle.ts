/**
 * Gateway Lifecycle Management
 * Provides functions to start and stop the OpenClaw Gateway process
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

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

  /**
   * Start the OpenClaw Gateway
   */
  async start(): Promise<void> {
    // Prevent concurrent start
    if (this.startPromise) return this.startPromise;
    
    // Already running
    if (this.status.state === 'running') return;
    
    this.startPromise = this.doStart();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  private async doStart(): Promise<void> {
    this.status = { state: 'starting', port: this.port };
    
    console.log('[Gateway] Starting OpenClaw Gateway...');
    this.emit('log', 'info', 'Starting OpenClaw Gateway...');
    
    try {
      // Start OpenClaw Gateway as subprocess
      this.process = spawn('openclaw', ['gateway', 'run', '--compact'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Ensure Gateway uses the correct port
          OPENCLAW_GATEWAY_PORT: String(this.port),
        },
      });

      // Handle stdout
      this.process.stdout?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) {
          console.log('[Gateway]', msg);
          this.emit('log', 'info', msg);
        }
      });

      // Handle stderr
      this.process.stderr?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) {
          console.error('[Gateway Error]', msg);
          this.emit('log', 'error', msg);
        }
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
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
      this.process.on('error', (error) => {
        console.error('[Gateway] Process error:', error);
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
      this.status = { state: 'error', port: this.port, error: err.message };
      this.emit('error', err);
      this.emit('log', 'error', `Failed to start: ${err.message}`);
      
      // Clean up process if started
      if (this.process) {
        this.process.kill();
        this.process = null;
      }
      
      throw err;
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
   */
  private async waitForReady(): Promise<void> {
    const maxAttempts = 60;
    const intervalMs = 500;
    
    for (let i = 0; i < maxAttempts; i++) {
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

// Re-export types
export type { GatewayLifecycleManager };
