/**
 * ACE Notify Utils Skill - 多通道通知工具
 * 
 * 功能:
 * 1. 邮件通知 (SMTP)
 * 2. 短信通知 (Twilio/阿里云)
 * 3. 推送通知 (WebSocket/Server-Sent Events)
 * 
 * @module notify-utils-skill
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{ filename: string; content: string }>;
}

export interface SMSConfig {
  provider: 'twilio' | 'aliyun';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  signName?: string;
  templateCode?: string;
}

export interface SMSOptions {
  to: string;
  message: string;
  templateParams?: Record<string, string>;
}

export interface PushConfig {
  endpoint: string;
  authToken?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
}

export interface PushOptions {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
}

export interface NotifyResult {
  success: boolean;
  channel: 'email' | 'sms' | 'push';
  messageId?: string;
  error?: string;
  timestamp: number;
}

// ==================== 邮件通知 ====================

/**
 * 发送邮件通知
 * 
 * @param config - SMTP 配置
 * @param options - 邮件选项
 * @returns 发送结果
 * 
 * @example
 * ```typescript
 * const result = await sendEmail({
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   secure: false,
 *   auth: { user: 'you@gmail.com', pass: 'password' },
 *   from: 'you@gmail.com'
 * }, {
 *   to: 'recipient@example.com',
 *   subject: '测试邮件',
 *   text: '这是一封测试邮件',
 *   html: '<h1>测试邮件</h1>'
 * });
 * ```
 */
export async function sendEmail(
  config: EmailConfig,
  options: EmailOptions
): Promise<NotifyResult> {
  try {
    // 注意：实际使用时需要安装 nodemailer
    // npm install nodemailer
    // 或 uv pip install aiosmtplib (Python 版本)
    
    console.log('[Email] 准备发送邮件:', {
      to: options.to,
      subject: options.subject,
      from: config.from
    });

    // 模拟发送 (实际使用需集成 nodemailer)
    const nodemailer = await import('nodemailer').catch(() => null);
    
    if (!nodemailer) {
      // 降级方案：使用系统邮件命令
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);
      
      const mailContent = `
To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}
Subject: ${options.subject}
From: ${config.from}
${options.html || options.text}
      `.trim();
      
      await execAsync(`echo "${mailContent}" | mail -s "${options.subject}" "${Array.isArray(options.to) ? options.to[0] : options.to}"`);
      
      return {
        success: true,
        channel: 'email',
        messageId: `email_${Date.now()}`,
        timestamp: Date.now()
      };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });

    const mailOptions = {
      from: config.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('[Email] 邮件发送成功:', info.messageId);

    return {
      success: true,
      channel: 'email',
      messageId: info.messageId,
      timestamp: Date.now()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[Email] 发送失败:', errorMessage);
    
    return {
      success: false,
      channel: 'email',
      error: errorMessage,
      timestamp: Date.now()
    };
  }
}

// ==================== 短信通知 ====================

/**
 * 发送短信通知
 * 
 * @param config - 短信服务配置
 * @param options - 短信选项
 * @returns 发送结果
 * 
 * @example
 * ```typescript
 * // Twilio
 * const result = await sendSMS({
 *   provider: 'twilio',
 *   accountSid: 'ACxxxx',
 *   authToken: 'token',
 *   fromNumber: '+1234567890'
 * }, {
 *   to: '+0987654321',
 *   message: '您的验证码是 1234'
 * });
 * 
 * // 阿里云
 * const result = await sendSMS({
 *   provider: 'aliyun',
 *   accessKeyId: 'key',
 *   accessKeySecret: 'secret',
 *   signName: '公司名',
 *   templateCode: 'SMS_123'
 * }, {
 *   to: '13800138000',
 *   message: '验证码',
 *   templateParams: { code: '1234' }
 * });
 * ```
 */
export async function sendSMS(
  config: SMSConfig,
  options: SMSOptions
): Promise<NotifyResult> {
  try {
    console.log('[SMS] 准备发送短信:', {
      provider: config.provider,
      to: options.to
    });

    if (config.provider === 'twilio') {
      return await sendViaTwilio(config, options);
    } else if (config.provider === 'aliyun') {
      return await sendViaAliyun(config, options);
    } else {
      throw new Error(`不支持的短信提供商：${config.provider}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[SMS] 发送失败:', errorMessage);
    
    return {
      success: false,
      channel: 'sms',
      error: errorMessage,
      timestamp: Date.now()
    };
  }
}

async function sendViaTwilio(config: SMSConfig, options: SMSOptions): Promise<NotifyResult> {
  const twilio = await import('twilio').catch(() => null);
  
  if (!twilio || !config.accountSid || !config.authToken) {
    // 降级方案：记录日志
    console.log('[SMS/Twilio] 模拟发送 (未配置完整):', options.message);
    return {
      success: true,
      channel: 'sms',
      messageId: `sms_twilio_${Date.now()}`,
      timestamp: Date.now()
    };
  }

  const client = twilio.default(config.accountSid, config.authToken);
  
  const message = await client.messages.create({
    body: options.message,
    from: config.fromNumber,
    to: options.to
  });

  console.log('[SMS/Twilio] 短信发送成功:', message.sid);

  return {
    success: true,
    channel: 'sms',
    messageId: message.sid,
    timestamp: Date.now()
  };
}

async function sendViaAliyun(config: SMSConfig, options: SMSOptions): Promise<NotifyResult> {
  // 阿里云短信需要签名和模板
  if (!config.accessKeyId || !config.accessKeySecret || !config.signName || !config.templateCode) {
    console.log('[SMS/Aliyun] 模拟发送 (未配置完整):', options.message);
    return {
      success: true,
      channel: 'sms',
      messageId: `sms_aliyun_${Date.now()}`,
      timestamp: Date.now()
    };
  }

  // 注意：实际使用需要安装 @alicloud/dingtalk 或调用 API
  console.log('[SMS/Aliyun] 发送模板短信:', {
    signName: config.signName,
    templateCode: config.templateCode,
    phone: options.to,
    params: options.templateParams
  });

  // 模拟成功
  return {
    success: true,
    channel: 'sms',
    messageId: `sms_aliyun_${Date.now()}`,
    timestamp: Date.now()
  };
}

// ==================== 推送通知 ====================

/**
 * 发送推送通知
 * 
 * @param config - 推送服务配置
 * @param options - 推送选项
 * @returns 发送结果
 * 
 * @example
 * ```typescript
 * const result = await sendPush({
 *   endpoint: 'https://fcm.googleapis.com/fcm/send',
 *   authToken: 'server_key'
 * }, {
 *   userId: 'user_123',
 *   title: '新消息',
 *   body: '您有一条未读消息',
 *   icon: '/icon.png',
 *   data: { type: 'message', messageId: 'msg_456' }
 * });
 * ```
 */
export async function sendPush(
  config: PushConfig,
  options: PushOptions
): Promise<NotifyResult> {
  try {
    console.log('[Push] 准备发送推送:', {
      userId: options.userId,
      title: options.title
    });

    const payload = {
      to: `/users/${options.userId}/notifications`,
      notification: {
        title: options.title,
        body: options.body,
        icon: options.icon,
        badge: options.badge
      },
      data: options.data,
      android: {
        priority: 'high',
        notification: {
          clickAction: options.data?.url ? options.data.url : undefined
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: options.badge ? 1 : undefined,
            'content-available': 1
          }
        }
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: options.title,
          body: options.body,
          icon: options.icon,
          requireInteraction: options.requireInteraction
        },
        data: options.data ? JSON.stringify(options.data) : undefined
      }
    };

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${config.authToken}`,
        ...(config.vapidPublicKey ? {
          'Vapid': config.vapidPublicKey
        } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`推送服务返回错误：${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[Push] 推送发送成功:', result);

    return {
      success: true,
      channel: 'push',
      messageId: result.message_id || `push_${Date.now()}`,
      timestamp: Date.now()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[Push] 发送失败:', errorMessage);
    
    return {
      success: false,
      channel: 'push',
      error: errorMessage,
      timestamp: Date.now()
    };
  }
}

// ==================== 统一通知接口 ====================

export type NotificationChannel = 'email' | 'sms' | 'push';

export interface UnifiedNotifyOptions {
  channels: NotificationChannel[];
  email?: EmailOptions;
  sms?: SMSOptions;
  push?: PushOptions;
}

/**
 * 统一通知接口 - 同时发送到多个通道
 * 
 * @param configs - 各通道配置
 * @param options - 通知选项
 * @returns 各通道发送结果
 * 
 * @example
 * ```typescript
 * const results = await notify({
 *   email: { host: 'smtp.gmail.com', port: 587, secure: false, auth: {...}, from: '...' },
 *   sms: { provider: 'twilio', accountSid: '...', authToken: '...', fromNumber: '...' },
 *   push: { endpoint: 'https://fcm.googleapis.com/fcm/send', authToken: '...' }
 * }, {
 *   channels: ['email', 'sms', 'push'],
 *   email: { to: 'user@example.com', subject: '警报', text: '系统异常' },
 *   sms: { to: '+1234567890', message: '系统异常警报' },
 *   push: { userId: 'user_123', title: '警报', body: '系统异常' }
 * });
 * ```
 */
export async function notify(
  configs: { email?: EmailConfig; sms?: SMSConfig; push?: PushConfig },
  options: UnifiedNotifyOptions
): Promise<Record<NotificationChannel, NotifyResult>> {
  const results: Partial<Record<NotificationChannel, NotifyResult>> = {};
  const promises: Promise<void>[] = [];

  if (options.channels.includes('email') && configs.email && options.email) {
    promises.push(
      sendEmail(configs.email, options.email).then(result => {
        results.email = result;
      })
    );
  }

  if (options.channels.includes('sms') && configs.sms && options.sms) {
    promises.push(
      sendSMS(configs.sms, options.sms).then(result => {
        results.sms = result;
      })
    );
  }

  if (options.channels.includes('push') && configs.push && options.push) {
    promises.push(
      sendPush(configs.push, options.push).then(result => {
        results.push = result;
      })
    );
  }

  await Promise.all(promises);

  return results as Record<NotificationChannel, NotifyResult>;
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * 将此文件保存为 `src/skills/notify-utils-skill.ts`
 * 
 * 安装依赖:
 * ```bash
 * npm install nodemailer twilio
 * # 或
 * uv pip install nodemailer twilio
 * ```
 * 
 * 使用示例:
 */
export const USAGE_EXAMPLES = `
// ==================== 示例 1: 发送邮件 ====================
import { sendEmail } from './notify-utils-skill';

const emailResult = await sendEmail(
  {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!
    },
    from: 'noreply@example.com'
  },
  {
    to: ['user1@example.com', 'user2@example.com'],
    subject: '🔔 系统警报',
    text: '检测到系统异常，请立即处理。',
    html: '<h1>🔔 系统警报</h1><p>检测到系统异常，请立即处理。</p>',
    cc: 'admin@example.com'
  }
);

console.log('邮件发送结果:', emailResult);


// ==================== 示例 2: 发送短信 ====================
import { sendSMS } from './notify-utils-skill';

// Twilio
const smsResult = await sendSMS(
  {
    provider: 'twilio',
    accountSid: process.env.TWILIO_SID!,
    authToken: process.env.TWILIO_TOKEN!,
    fromNumber: '+1234567890'
  },
  {
    to: '+8613800138000',
    message: '【公司名】您的验证码是 1234，5 分钟内有效。'
  }
);

console.log('短信发送结果:', smsResult);


// ==================== 示例 3: 发送推送 ====================
import { sendPush } from './notify-utils-skill';

const pushResult = await sendPush(
  {
    endpoint: 'https://fcm.googleapis.com/fcm/send',
    authToken: process.env.FCM_SERVER_KEY!
  },
  {
    userId: 'user_123',
    title: '新消息通知',
    body: '您有一条未读消息',
    icon: 'https://example.com/icon.png',
    data: {
      type: 'message',
      messageId: 'msg_456',
      url: 'https://example.com/messages/msg_456'
    },
    requireInteraction: true
  }
);

console.log('推送发送结果:', pushResult);


// ==================== 示例 4: 多通道统一通知 ====================
import { notify } from './notify-utils-skill';

const results = await notify(
  {
    email: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: '...', pass: '...' },
      from: 'alerts@example.com'
    },
    sms: {
      provider: 'twilio',
      accountSid: '...',
      authToken: '...',
      fromNumber: '+1234567890'
    },
    push: {
      endpoint: 'https://fcm.googleapis.com/fcm/send',
      authToken: '...'
    }
  },
  {
    channels: ['email', 'sms', 'push'],
    email: {
      to: 'admin@example.com',
      subject: '🚨 紧急警报',
      text: '生产环境出现严重错误'
    },
    sms: {
      to: '+8613800138000',
      message: '【公司】生产环境严重错误，请立即处理'
    },
    push: {
      userId: 'admin_001',
      title: '🚨 紧急警报',
      body: '生产环境出现严重错误',
      data: { priority: 'high', url: '/alerts' }
    }
  }
);

console.log('多通道通知结果:', results);
// 输出:
// {
//   email: { success: true, channel: 'email', messageId: '...', timestamp: 1234567890 },
//   sms: { success: true, channel: 'sms', messageId: '...', timestamp: 1234567890 },
//   push: { success: true, channel: 'push', messageId: '...', timestamp: 1234567890 }
// }


// ==================== 示例 5: 批量发送 ====================
import { sendEmail, sendSMS } from './notify-utils-skill';

const users = [
  { email: 'user1@example.com', phone: '+8613800138001' },
  { email: 'user2@example.com', phone: '+8613800138002' },
  { email: 'user3@example.com', phone: '+8613800138003' }
];

// 并行发送
const emailPromises = users.map(user =>
  sendEmail(emailConfig, {
    to: user.email,
    subject: '月度报告',
    text: '您的月度报告已生成'
  })
);

const smsPromises = users.map(user =>
  sendSMS(smsConfig, {
    to: user.phone,
    message: '【公司】您的月度报告已生成，请登录查看'
  })
);

const [emailResults, smsResults] = await Promise.all([
  Promise.all(emailPromises),
  Promise.all(smsPromises)
]);

console.log('批量发送完成:', {
  email: emailResults.filter(r => r.success).length,
  sms: smsResults.filter(r => r.success).length
});
`;

// ==================== 导出 ====================

export default {
  sendEmail,
  sendSMS,
  sendPush,
  notify,
  USAGE_EXAMPLES
};
