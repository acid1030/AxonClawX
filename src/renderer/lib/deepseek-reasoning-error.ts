/**
 * DeepSeek V4+ "thinking" mode: after tool calls, the API requires assistant
 * turns in history to include `reasoning_content` on subsequent requests.
 * @see https://api-docs.deepseek.com/guides/thinking_mode
 * @see https://docs.openclaw.ai/providers/deepseek
 */

export function isDeepSeekReasoningReplayError(message: string): boolean {
  const t = String(message || '');
  return (
    /reasoning_content/i.test(t)
    && (/must be passed back/i.test(t) || /thinking mode/i.test(t) || /\b400\b/.test(t))
  );
}

/** User-facing explanation + mitigations (Chinese). Returns `raw` if not a match. */
export function formatDeepSeekReasoningReplayError(raw: string): string {
  if (!isDeepSeekReasoningReplayError(raw)) return raw;
  return [
    '【DeepSeek thinking / 工具链】接口要求：在开启思考模式且出现过工具调用时，后续请求必须把对应助手轮次里的 reasoning_content 一并写回消息历史。',
    '若 OpenClaw 网关版本较旧，或本会话曾从其他模型切换而来导致早期轮次缺少该字段，可能触发此 400。',
    '',
    '建议依次尝试：',
    '1）升级并重启网关：npm i -g @openclaw/core，或 brew upgrade openclaw，然后重启 OpenClaw Gateway（新版会在 DeepSeek 插件里重放 reasoning_content）。',
    '2）新建会话后再发送同一问题（避免沿用过旧历史）。',
    '3）在会话或工具栏将「思考」设为关闭（None），走非 thinking 路径；网关会对 DeepSeek 发送 thinking: disabled。',
    '4）或临时改用 deepseek/deepseek-chat（非 V4 thinking 面）。',
    '',
    '文档： https://api-docs.deepseek.com/guides/thinking_mode',
    'OpenClaw： https://docs.openclaw.ai/providers/deepseek',
    '',
    `原始错误：${raw}`,
  ].join('\n');
}
