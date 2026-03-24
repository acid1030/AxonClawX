import { useEffect } from 'react';

type GatewayEventHandler = (payload: any) => void;

type GatewayEventMap = Record<string, GatewayEventHandler>;

/**
 * Lightweight event bridge for ClawDeckX windows.
 * Listens on IPC channels with the same event names.
 */
export function useGatewayEvents(events: GatewayEventMap): void {
  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (!ipc?.on || !ipc?.off) return;

    const unsubs: Array<() => void> = [];

    Object.entries(events).forEach(([eventName, handler]) => {
      const wrapped = (payload: unknown) => {
        try {
          handler(payload);
        } catch (err) {
          console.warn(`[useGatewayEvents] handler failed for ${eventName}:`, err);
        }
      };
      ipc.on(eventName, wrapped);
      unsubs.push(() => ipc.off(eventName, wrapped));
    });

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [events]);
}

export default useGatewayEvents;
