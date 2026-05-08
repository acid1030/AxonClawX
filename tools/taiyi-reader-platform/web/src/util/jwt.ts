/** 仅解析 exp 供客户端提前刷新，不校验签名。 */
export function jwtExpMs(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = atob(b64);
    const p = JSON.parse(json) as { exp?: number };
    return typeof p.exp === "number" ? p.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function jwtNeedsRefresh(token: string | null, skewMs = 60_000): boolean {
  if (!token) return true;
  const exp = jwtExpMs(token);
  if (!exp) return true;
  return Date.now() > exp - skewMs;
}
