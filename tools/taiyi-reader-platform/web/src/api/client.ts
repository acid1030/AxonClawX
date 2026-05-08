const base = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export type ChapterMeta = { index: number; slug: string; title: string };

export type ChapterPayload = {
  slug: string;
  title: string;
  htmlBody: string;
  prev: string | null;
  next: string | null;
  index: number;
  total: number;
};

export async function fetchMe(accessToken: string) {
  return apiFetch<{ id: number; username: string }>("/me", { accessToken });
}

async function parseJson(res: Response): Promise<unknown> {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t };
  }
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { accessToken?: string | null } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const { accessToken, ...init } = opts;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const data = (await parseJson(res)) as T & { error?: string };
  if (!res.ok) {
    const err = typeof data === "object" && data && "error" in data ? String(data.error) : "request_failed";
    return { ok: false, status: res.status, error: err };
  }
  return { ok: true, data: data as T };
}

export async function login(username: string, password: string) {
  return apiFetch<{
    user: { id: number; username: string };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export async function register(username: string, password: string, inviteCode?: string) {
  return apiFetch<{
    user: { id: number; username: string };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, inviteCode }),
  });
}

export async function refresh(refreshToken: string) {
  return apiFetch<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) });
}

export async function logoutApi(refreshToken: string | null) {
  return apiFetch<{ ok: boolean }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function fetchChapters(accessToken: string) {
  return apiFetch<{ chapters: ChapterMeta[] }>("/chapters", { accessToken });
}

export async function fetchChapter(accessToken: string, slug: string) {
  const enc = encodeURIComponent(slug);
  return apiFetch<ChapterPayload>(`/chapters/${enc}`, { accessToken });
}
