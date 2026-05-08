import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "../api/client";
import { jwtNeedsRefresh } from "../util/jwt";
import { getRefreshToken, setRefreshToken } from "./storage";

type User = { id: number; username: string };

type AuthState = {
  user: User | null;
  accessToken: string | null;
  ready: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  login: (u: string, p: string) => Promise<boolean>;
  register: (u: string, p: string, invite?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setError(null);
    const rt = await getRefreshToken();
    if (!rt) {
      setReady(true);
      return;
    }
    const r = await api.refresh(rt);
    if (!r.ok) {
      await setRefreshToken(null);
      setAccessToken(null);
      setUser(null);
      setReady(true);
      return;
    }
    await setRefreshToken(r.data.refreshToken);
    setAccessToken(r.data.accessToken);
    const me = await api.fetchMe(r.data.accessToken);
    if (me.ok) setUser({ id: me.data.id, username: me.data.username });
    else {
      await setRefreshToken(null);
      setAccessToken(null);
      setUser(null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    const r = await api.login(username, password);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    await setRefreshToken(r.data.refreshToken);
    setAccessToken(r.data.accessToken);
    setUser(r.data.user);
    return true;
  }, []);

  const register = useCallback(async (username: string, password: string, invite?: string) => {
    setError(null);
    const r = await api.register(username, password, invite);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    await setRefreshToken(r.data.refreshToken);
    setAccessToken(r.data.accessToken);
    setUser(r.data.user);
    return true;
  }, []);

  const logout = useCallback(async () => {
    const rt = await getRefreshToken();
    if (rt) await api.logoutApi(rt);
    await setRefreshToken(null);
    setAccessToken(null);
    setUser(null);
  }, []);

  const getAccessToken = useCallback(async () => {
    if (accessToken && !jwtNeedsRefresh(accessToken)) return accessToken;
    const rt = await getRefreshToken();
    if (!rt) {
      setAccessToken(null);
      return null;
    }
    const r = await api.refresh(rt);
    if (!r.ok) {
      await setRefreshToken(null);
      setAccessToken(null);
      return null;
    }
    await setRefreshToken(r.data.refreshToken);
    setAccessToken(r.data.accessToken);
    return r.data.accessToken;
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      ready,
      error,
      login,
      register,
      logout,
      getAccessToken,
    }),
    [user, accessToken, ready, error, login, register, logout, getAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
