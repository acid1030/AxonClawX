export function isDeepSeekV4ModelRef(model?: string | null, provider?: string | null): boolean {
  const rawModel = String(model || '').trim().toLowerCase();
  const rawProvider = String(provider || '').trim().toLowerCase();
  if (!rawModel) return false;

  if (rawModel === 'deepseek/deepseek-v4-pro' || rawModel === 'deepseek/deepseek-v4-flash') {
    return true;
  }

  if (rawProvider === 'deepseek' && (rawModel === 'deepseek-v4-pro' || rawModel === 'deepseek-v4-flash')) {
    return true;
  }

  return rawModel === 'deepseek-v4-pro' || rawModel === 'deepseek-v4-flash';
}

export function shouldForceDeepSeekV4ThinkingOff(model?: string | null, provider?: string | null): boolean {
  return isDeepSeekV4ModelRef(model, provider);
}
