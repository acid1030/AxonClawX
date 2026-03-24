/**
 * AxonClaw - 解析事件标题
 */

export function parseEventTitle(title: string | undefined): string {
  if (!title) return '';
  // 移除可能的 JSON 前缀
  if (title.startsWith('{')) {
    try {
      const obj = JSON.parse(title);
      return obj.title || obj.summary || obj.message || title;
    } catch {
      // ignore
    }
  }
  return title;
}
