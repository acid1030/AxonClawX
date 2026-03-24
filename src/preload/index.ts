// AxonClaw - Preload Script
// Exposes safe APIs to renderer process

import { contextBridge, ipcRenderer } from 'electron';

// Expose electron IPC in the format expected by api-client.ts
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      const subscription = (_event: any, ...args: any[]) => listener(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, listener);
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel);
    },
    send: (channel: string, ...args: any[]) => {
      ipcRenderer.send(channel, ...args);
    },
  },
  platform: process.platform,
});

// Also expose electronAPI for backward compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Gateway management
  startGateway: () => ipcRenderer.invoke('gateway:start'),
  stopGateway: () => ipcRenderer.invoke('gateway:stop'),
  getGatewayStatus: () => ipcRenderer.invoke('gateway:status'),
  
  // Config management
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),

  // Skills management
  openSkillsFolder: () => ipcRenderer.invoke('skills:openFolder'),

  // Generic IPC invoke
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
});

// Type definitions for renderer
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  startGateway: () => Promise<void>;
  stopGateway: () => Promise<void>;
  getGatewayStatus: () => Promise<'running' | 'stopped' | 'error'>;
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: any) => Promise<void>;
  openSkillsFolder: () => Promise<string>;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, listener: (...args: any[]) => void) => () => void;
        removeListener: (channel: string, listener: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
        send: (channel: string, ...args: any[]) => void;
      };
      platform: NodeJS.Platform;
    };
    electronAPI: ElectronAPI;
  }
}
