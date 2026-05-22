const SESSION_FAVORITES_STORAGE_KEY = 'axon.chat.sessionFavorites.v1';

export function loadSessionFavorites(): Record<string, boolean> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(SESSION_FAVORITES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => key && value === true),
    );
  } catch {
    return {};
  }
}

export function saveSessionFavorites(favorites: Record<string, boolean>): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      SESSION_FAVORITES_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(Object.entries(favorites).filter(([, value]) => value === true))),
    );
  } catch {
    // ignore storage failures
  }
}
