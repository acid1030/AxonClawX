export interface ElectronAPI {
  db: {
    initialize: () => Promise<any>;
    query: (table: string, operation: string, data: any) => Promise<any>;
    close: () => Promise<any>;
  };
  system: {
    getInfo: () => Promise<any>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
