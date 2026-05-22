interface HistoryRequestControllerOptions {
  getCurrentSessionKey: () => string;
}

export function createHistoryRequestController(options: HistoryRequestControllerOptions) {
  let requestSeq = 0;
  const latestRequestBySession = new Map<string, number>();
  const inFlightBySession = new Map<string, Promise<void>>();

  return {
    begin(sessionKey: string): number {
      const requestId = ++requestSeq;
      latestRequestBySession.set(sessionKey, requestId);
      return requestId;
    },

    isCurrentVisible(sessionKey: string, requestId: number): boolean {
      const latest = latestRequestBySession.get(sessionKey);
      return latest === requestId && options.getCurrentSessionKey() === sessionKey;
    },

    isLatest(sessionKey: string, requestId: number): boolean {
      return latestRequestBySession.get(sessionKey) === requestId;
    },

    getInFlight(sessionKey: string): Promise<void> | undefined {
      return inFlightBySession.get(sessionKey);
    },

    setInFlight(sessionKey: string, promise: Promise<void>): void {
      inFlightBySession.set(sessionKey, promise);
    },

    clearInFlight(sessionKey: string, promise: Promise<void>): void {
      if (inFlightBySession.get(sessionKey) === promise) {
        inFlightBySession.delete(sessionKey);
      }
    },
  };
}
