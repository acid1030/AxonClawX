import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const KEY_RT = "taiyi_refresh_v1";

export async function getRefreshToken(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: KEY_RT });
    return value;
  }
  return localStorage.getItem(KEY_RT);
}

export async function setRefreshToken(token: string | null): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    if (token) await Preferences.set({ key: KEY_RT, value: token });
    else await Preferences.remove({ key: KEY_RT });
    return;
  }
  if (token) localStorage.setItem(KEY_RT, token);
  else localStorage.removeItem(KEY_RT);
}
