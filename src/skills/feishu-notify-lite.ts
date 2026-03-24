/**
 * Feishu Notify Lite - 飞书通知精简版
 * 功能：文本消息、富文本消息、错误处理
 * @author Axon v1.0.0
 */

import * as https from 'https';
import * as http from 'http';

// ============== 类型定义 ==============

export interface FeishuConfig {
  webhookUrl: string;
  secret?: string;
}

export interface TextMessage {
  msg_type: 'text';
  content: { text: string };
}

export interface RichTextElement {
  tag: 'text' | 'a' | 'at' | 'hr' | 'img';
  text?: string;
  href?: string;
  user_id?: string;
  src?: string;
}

export interface RichTextMessage {
  msg_type: 'post';
  content: {
    post: {
      zh_cn: {
        title: string;
        content: RichTextElement[][];
      };
    };
  };
}

export type FeishuMessage = TextMessage | RichTextMessage;

export interface SendResult {
  success: boolean;
  statusCode?: number;
  code?: number;
  error?: string;
  response?: any;
  duration?: number;
}

// Error class
export class FeishuNotifyError extends Error {
  constructor(message: string, public code?: number, public statusCode?: number) {
    super(message);
    this.name = 'FeishuNotifyError';
  }
}

// Send Feishu message
export async function sendFeishuMessage(
  config: FeishuConfig,
  message: FeishuMessage
): Promise<SendResult> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const url = new URL(config.webhookUrl);
    const client = url.protocol === 'https:' ? https : http;
    const data = JSON.stringify(message);
    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const response = JSON.parse(responseData);
          if (response.code === 0 || response.StatusCode === 0) {
            resolve({ success: true, statusCode: res.statusCode, code: response.code || response.StatusCode, response, duration });
          } else {
            resolve({ success: false, statusCode: res.statusCode, code: response.code || response.StatusCode, error: response.status_msg || response.message || 'Unknown', response, duration });
          }
        } catch (e) {
          resolve({ success: false, statusCode: res.statusCode, error: `Parse error: ${e instanceof Error ? e.message : 'Unknown'}`, duration });
        }
      });
    });
    req.on('error', (e) => {
      resolve({ success: false, error: `Request error: ${e.message}`, duration: Date.now() - startTime });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout (10s)', duration: Date.now() - startTime });
    });
    req.write(data);
    req.end();
  });
}

// Send text message
export async function sendTextMessage(webhookUrl: string, text: string): Promise<SendResult> {
  return sendFeishuMessage({ webhookUrl }, { msg_type: 'text', content: { text } });
}

// Send rich text message
export async function sendRichTextMessage(
  webhookUrl: string,
  title: string,
  content: RichTextElement[][]
): Promise<SendResult> {
  return sendFeishuMessage({ webhookUrl }, {
    msg_type: 'post',
    content: { post: { zh_cn: { title, content } } },
  });
}

// Rich text helpers
export const RichText = {
  text: (t: string): RichTextElement => ({ tag: 'text', text: t }),
  link: (t: string, u: string): RichTextElement => ({ tag: 'a', text: t, href: u }),
  at: (uid: string): RichTextElement => ({ tag: 'at', user_id: uid }),
  hr: (): RichTextElement => ({ tag: 'hr' }),
  image: (src: string): RichTextElement => ({ tag: 'img', src }),
  row: (...els: RichTextElement[]): RichTextElement[] => els,
};

// Format error message
export function formatError(r: SendResult): string {
  if (r.success) return 'OK';
  return [r.error, r.code && `Code: ${r.code}`, r.statusCode && `HTTP: ${r.statusCode}`].filter(Boolean).join(' | ');
}

export default {
  sendFeishuMessage,
  sendTextMessage,
  sendRichTextMessage,
  RichText,
  formatError,
  FeishuNotifyError,
};
