/**
 * 多通道通知服务技能 - Notification Service Skill (KAEL)
 * 
 * 功能:
 * 1. 邮件通知 (SMTP)
 * 2. 短信通知 (Twilio/阿里云)
 * 3. Push 通知 (FCM/APNs)
 * 
 * @author Axon
 * @version 1.0.0
 * @module KAEL
 */

import * as nodemailer from 'nodemailer';
import axios from 'axios';

// ============== 类型定义 ==============

/**
 * 通知通道
 */
export type NotificationChannel = 'email' | 'sms' | 'push';

/**
 * 通知优先级
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 通知结果
 */
export interface NotificationResult {
  /** 是否成功 */
  success: boolean;
  /** 通道类型 */
  channel: NotificationChannel;
  /** 消息 ID */
  messageId?: string;
  /** 错误信息 */
  error?: string;
  /** 详细信息 */
  details?: any;
}

/**
 * 邮件配置
 */
export interface EmailConfig {
  /** SMTP 主机 */
  host: string;
  /** SMTP 端口 (默认 587) */
  port?: number;
  /** 用户名 */
  username: string;
  /** 密码/授权码 */
  password: string;
  /** 使用 TLS (默认 true) */
  secure?: boolean;
  /** 发件人地址 */
  from: string;
  /** 发件人名称 (可选) */
  fromName?: string;
}

/**
 * 邮件通知配置
 */
export interface EmailNotification extends EmailConfig {
  /** 收件人列表 */
  to: string | string[];
  /** 抄送列表 (可选) */
  cc?: string | string[];
  /** 密送列表 (可选) */
  bcc?: string | string[];
  /** 邮件主题 */
  subject: string;
  /** 邮件正文 (HTML) */
  html?: string;
  /** 邮件正文 (纯文本) */
  text?: string;
  /** 附件列表 (可选) */
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
  /** 优先级 (可选) */
  priority?: NotificationPriority;
}

/**
 * Twilio 短信配置
 */
export interface TwilioConfig {
  /** Account SID */
  accountSid: string;
  /** Auth Token */
  authToken: string;
  /** 发送者号码 */
  fromNumber: string;
}

/**
 * 阿里云短信配置
 */
export interface AliyunSmsConfig {
  /** Access Key ID */
  accessKeyId: string;
  /** Access Key Secret */
  accessKeySecret: string;
  /** 短信签名 */
  signName: string;
  /** 短信模板 ID */
  templateCode: string;
}

/**
 * 短信通知配置
 */
export interface SmsNotification {
  /** 服务商 */
  provider: 'twilio' | 'aliyun';
  /** Twilio 配置 (当 provider='twilio' 时必填) */
  twilio?: TwilioConfig;
  /** 阿里云配置 (当 provider='aliyun' 时必填) */
  aliyun?: AliyunSmsConfig;
  /** 接收者手机号 */
  to: string | string[];
  /** 短信内容 (Twilio) */
  message?: string;
  /** 模板参数 (阿里云) */
  templateParams?: Record<string, string>;
}

/**
 * FCM Push 配置
 */
export interface FcmConfig {
  /** Firebase 项目 ID */
  projectId: string;
  /** 服务账号密钥 (JSON 字符串或路径) */
  serviceAccountKey: string;
}

/**
 * APNs Push 配置
 */
export interface ApnsConfig {
  /** Team ID */
  teamId: string;
  /** Key ID */
  keyId: string;
  /** 证书路径 */
  keyPath: string;
  /** Bundle ID */
  bundleId: string;
  /** 沙盒环境 (默认 false) */
  sandbox?: boolean;
}

/**
 * Push 通知配置
 */
export interface PushNotification {
  /** 服务商 */
  provider: 'fcm' | 'apns';
  /** FCM 配置 (当 provider='fcm' 时必填) */
  fcm?: FcmConfig;
  /** APNs 配置 (当 provider='apns' 时必填) */
  apns?: ApnsConfig;
  /** 设备令牌列表 */
  tokens: string | string[];
  /** 通知标题 */
  title: string;
  /** 通知正文 */
  body: string;
  /** 自定义数据 (可选) */
  data?: Record<string, any>;
  /** 点击动作 (可选) */
  clickAction?: string;
  /** 图片 URL (可选) */
  imageUrl?: string;
}

/**
 * 通用通知配置
 */
export interface UniversalNotification {
  /** 通道类型 */
  channel: NotificationChannel;
  /** 优先级 (默认 'normal') */
  priority?: NotificationPriority;
  /** 重试次数 (默认 0) */
  retries?: number;
  /** 重试间隔 (毫秒，默认 1000) */
  retryDelay?: number;
}

// ============== 工具函数 ==============

/**
 * 验证邮箱格式
 */
function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * 验证手机号格式 (国际格式)
 */
function validatePhone(phone: string): boolean {
  const re = /^\+?[1-9]\d{1,14}$/;
  return re.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * 标准化手机号
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============== 邮件通知 ==============

/**
 * 创建 SMTP 传输器
 */
function createTransporter(config: EmailConfig): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port || (config.secure !== false ? 465 : 587),
    secure: config.secure !== false,
    auth: {
      user: config.username,
      pass: config.password
    }
  });
}

/**
 * 发送邮件通知
 * 
 * @param config - 邮件通知配置
 * @returns 通知结果
 * 
 * @example
 * ```typescript
 * // 发送简单邮件
 * await sendEmail({
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   username: 'user@gmail.com',
 *   password: 'app-password',
 *   from: 'user@gmail.com',
 *   to: 'recipient@example.com',
 *   subject: '测试邮件',
 *   text: '这是一封测试邮件',
 *   html: '<h1>测试邮件</h1><p>这是一封测试邮件</p>'
 * });
 * 
 * // 发送带附件的邮件
 * await sendEmail({
 *   host: 'smtp.company.com',
 *   username: 'noreply@company.com',
 *   password: 'secret',
 *   from: 'noreply@company.com',
 *   fromName: '系统通知',
 *   to: ['user1@example.com', 'user2@example.com'],
 *   cc: 'manager@company.com',
 *   subject: '月度报告',
 *   html: '<h1>月度报告已生成</h1>',
 *   attachments: [{
 *     filename: 'report.pdf',
 *     path: '/path/to/report.pdf'
 *   }]
 * });
 * ```
 */
export async function sendEmail(config: EmailNotification): Promise<NotificationResult> {
  try {
    // 验证收件人
    const recipients = Array.isArray(config.to) ? config.to : [config.to];
    for (const email of recipients) {
      if (!validateEmail(email)) {
        return {
          success: false,
          channel: 'email',
          error: `无效的邮箱地址：${email}`
        };
      }
    }

    // 创建传输器
    const transporter = createTransporter(config);

    // 构建邮件选项
    const mailOptions: nodemailer.SendMailOptions = {
      from: config.fromName ? `"${config.fromName}" <${config.from}>` : config.from,
      to: Array.isArray(config.to) ? config.to.join(', ') : config.to,
      subject: config.subject,
      text: config.text || '',
      html: config.html || config.text || '',
      attachments: config.attachments
    };

    // 添加抄送
    if (config.cc) {
      mailOptions.cc = Array.isArray(config.cc) ? config.cc.join(', ') : config.cc;
    }

    // 添加密送
    if (config.bcc) {
      mailOptions.bcc = Array.isArray(config.bcc) ? config.bcc.join(', ') : config.bcc;
    }

    // 设置优先级
    if (config.priority) {
      const priorityMap: Record<NotificationPriority, number> = {
        low: 5,
        normal: 3,
        high: 1,
        urgent: 1
      };
      mailOptions.priority = priorityMap[config.priority];
    }

    // 发送邮件
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      channel: 'email',
      messageId: info.messageId,
      details: {
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response
      }
    };
  } catch (err) {
    return {
      success: false,
      channel: 'email',
      error: err instanceof Error ? err.message : '未知错误',
      details: err
    };
  }
}

// ============== 短信通知 ==============

/**
 * 发送 Twilio 短信
 */
async function sendTwilioSms(
  config: TwilioConfig,
  to: string,
  message: string
): Promise<NotificationResult> {
  const accountSid = config.accountSid;
  const authToken = config.authToken;
  const fromNumber = config.fromNumber;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const response = await axios.post(
      url,
      new URLSearchParams({
        From: fromNumber,
        To: normalizePhone(to),
        Body: message
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      success: true,
      channel: 'sms',
      messageId: response.data.sid,
      details: {
        status: response.data.status,
        to: response.data.to,
        from: response.data.from
      }
    };
  } catch (err: any) {
    return {
      success: false,
      channel: 'sms',
      error: err.response?.data?.message || err.message,
      details: err.response?.data
    };
  }
}

/**
 * 发送阿里云短信
 */
async function sendAliyunSms(
  config: AliyunSmsConfig,
  to: string,
  templateParams?: Record<string, string>
): Promise<NotificationResult> {
  // 阿里云短信 API 端点
  const endpoint = 'https://dysmsapi.aliyuncs.com/';
  
  // 构建请求参数
  const params: Record<string, any> = {
    Action: 'SendSms',
    Version: '2017-05-25',
    RegionId: 'cn-hangzhou',
    AccessKeyId: config.accessKeyId,
    SignName: config.signName,
    TemplateCode: config.templateCode,
    PhoneNumbers: normalizePhone(to),
    Timestamp: new Date().toISOString(),
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: Math.random().toString(36).substring(2)
  };

  // 添加模板参数
  if (templateParams) {
    params.TemplateParam = JSON.stringify(templateParams);
  }

  // 生成签名 (简化版，生产环境需要完整签名算法)
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const stringToSign = 'GET&%2F&' + encodeURIComponent(queryString);
  const hmac = require('crypto')
    .createHmac('sha1', config.accessKeySecret + '&')
    .update(stringToSign)
    .digest('base64');
  
  params.Signature = hmac;

  try {
    const response = await axios.get(endpoint, { params });

    if (response.data.Code === 'OK') {
      return {
        success: true,
        channel: 'sms',
        messageId: response.data.BizId,
        details: {
          code: response.data.Code,
          message: response.data.Message
        }
      };
    } else {
      return {
        success: false,
        channel: 'sms',
        error: response.data.Message,
        details: response.data
      };
    }
  } catch (err: any) {
    return {
      success: false,
      channel: 'sms',
      error: err.response?.data?.Message || err.message,
      details: err.response?.data
    };
  }
}

/**
 * 发送短信通知
 * 
 * 支持 Twilio 和阿里云短信服务
 * 
 * @param config - 短信通知配置
 * @returns 通知结果
 * 
 * @example
 * ```typescript
 * // Twilio 短信
 * await sendSms({
 *   provider: 'twilio',
 *   twilio: {
 *     accountSid: 'ACxxxx',
 *     authToken: 'your-auth-token',
 *     fromNumber: '+1234567890'
 *   },
 *   to: '+8613800138000',
 *   message: '您的验证码是：123456'
 * });
 * 
 * // 阿里云短信
 * await sendSms({
 *   provider: 'aliyun',
 *   aliyun: {
 *     accessKeyId: 'LTAIxxxx',
 *     accessKeySecret: 'your-secret',
 *     signName: '公司名称',
 *     templateCode: 'SMS_123456789'
 *   },
 *   to: '+8613800138000',
 *   templateParams: {
 *     code: '123456',
 *     product: 'XXX 平台'
 *   }
 * });
 * 
 * // 批量发送
 * await sendSms({
 *   provider: 'twilio',
 *   twilio: { /* config *\/ },
 *   to: ['+8613800138000', '+8613900139000'],
 *   message: '系统通知：服务器维护即将开始'
 * });
 * ```
 */
export async function sendSms(config: SmsNotification): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  const recipients = Array.isArray(config.to) ? config.to : [config.to];

  for (const phone of recipients) {
    if (!validatePhone(phone)) {
      results.push({
        success: false,
        channel: 'sms',
        error: `无效的手机号：${phone}`
      });
      continue;
    }

    let result: NotificationResult;

    if (config.provider === 'twilio') {
      if (!config.twilio || !config.message) {
        result = {
          success: false,
          channel: 'sms',
          error: 'Twilio 配置或消息内容缺失'
        };
      } else {
        result = await sendTwilioSms(config.twilio, phone, config.message);
      }
    } else if (config.provider === 'aliyun') {
      if (!config.aliyun) {
        result = {
          success: false,
          channel: 'sms',
          error: '阿里云配置缺失'
        };
      } else {
        result = await sendAliyunSms(config.aliyun, phone, config.templateParams);
      }
    } else {
      result = {
        success: false,
        channel: 'sms',
        error: `不支持的服务商：${config.provider}`
      };
    }

    results.push(result);
  }

  return results;
}

// ============== Push 通知 ==============

/**
 * 发送 FCM Push 通知
 */
async function sendFcmPush(
  config: FcmConfig,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
  imageUrl?: string
): Promise<NotificationResult> {
  // FCM HTTP v1 API
  const url = `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`;
  
  // 获取访问令牌 (简化版，生产环境需要使用 Google Auth 库)
  const accessToken = await getFcmAccessToken(config.serviceAccountKey);

  const payload = {
    message: {
      tokens: tokens.length === 1 ? tokens[0] : undefined,
      token: tokens.length === 1 ? tokens[0] : undefined,
      notification: {
        title,
        body,
        image: imageUrl
      },
      data: data ? data : undefined,
      android: tokens.length > 1 ? {
        priority: 'high'
      } : undefined,
      apns: tokens.length > 1 ? {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      } : undefined
    }
  };

  // 多设备时需要使用 multicast
  if (tokens.length > 1) {
    (payload.message as any).tokens = tokens;
    delete (payload.message as any).token;
  }

  try {
    const response = await axios.post(
      url,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      channel: 'push',
      messageId: response.data.name,
      details: response.data
    };
  } catch (err: any) {
    return {
      success: false,
      channel: 'push',
      error: err.response?.data?.error?.message || err.message,
      details: err.response?.data
    };
  }
}

/**
 * 获取 FCM 访问令牌 (简化实现)
 */
async function getFcmAccessToken(serviceAccountKey: string): Promise<string> {
  // 简化实现：实际生产环境需要解析 JWT
  // 这里假设 serviceAccountKey 是 JSON 字符串，包含 client_email 和 private_key
  try {
    const keyObj = typeof serviceAccountKey === 'string' 
      ? JSON.parse(serviceAccountKey) 
      : serviceAccountKey;
    
    // 使用 JWT 库生成令牌 (需要安装 jsonwebtoken)
    const jwt = require('jsonwebtoken');
    
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: keyObj.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const jwtToken = jwt.sign(claimSet, keyObj.private_key, { algorithm: 'RS256' });

    // 交换访问令牌
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    return response.data.access_token;
  } catch (err) {
    console.error('[KAEL] 获取 FCM 令牌失败:', err);
    return '';
  }
}

/**
 * 发送 APNs Push 通知
 */
async function sendApnsPush(
  config: ApnsConfig,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
  imageUrl?: string
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  
  // APNs JWT 令牌生成 (简化版)
  const apnsToken = await getApnsToken(config);

  for (const token of tokens) {
    const url = config.sandbox
      ? 'https://api.sandbox.push.apple.com/3/device/' + token
      : 'https://api.push.apple.com/3/device/' + token;

    const payload: any = {
      aps: {
        alert: {
          title,
          body
        },
        sound: 'default',
        badge: 1
      }
    };

    if (imageUrl) {
      payload.aps['mutable-content'] = 1;
      // 需要在通知扩展中处理图片
    }

    if (data) {
      Object.assign(payload, data);
    }

    try {
      const response = await axios.post(
        url,
        JSON.stringify(payload),
        {
          headers: {
            'Authorization': `bearer ${apnsToken}`,
            'apns-topic': config.bundleId,
            'Content-Type': 'application/json'
          }
        }
      );

      results.push({
        success: true,
        channel: 'push',
        messageId: response.headers['apns-id'],
        details: {
          status: response.status
        }
      });
    } catch (err: any) {
      results.push({
        success: false,
        channel: 'push',
        error: err.response?.data?.reason || err.message,
        details: err.response?.data
      });
    }
  }

  return results;
}

/**
 * 获取 APNs JWT 令牌 (简化实现)
 */
async function getApnsToken(config: ApnsConfig): Promise<string> {
  try {
    const fs = require('fs');
    const jwt = require('jsonwebtoken');
    
    const key = fs.readFileSync(config.keyPath, 'utf8');
    const now = Math.floor(Date.now() / 1000);
    
    const claimSet = {
      iss: config.teamId,
      iat: now
    };

    const token = jwt.sign(claimSet, key, {
      algorithm: 'ES256',
      keyid: config.keyId,
      expiresIn: '1h'
    });

    return token;
  } catch (err) {
    console.error('[KAEL] 获取 APNs 令牌失败:', err);
    return '';
  }
}

/**
 * 发送 Push 通知
 * 
 * 支持 FCM (Firebase) 和 APNs (Apple)
 * 
 * @param config - Push 通知配置
 * @returns 通知结果 (单个或数组)
 * 
 * @example
 * ```typescript
 * // FCM 推送
 * await sendPush({
 *   provider: 'fcm',
 *   fcm: {
 *     projectId: 'my-project',
 *     serviceAccountKey: '/path/to/service-account.json'
 *   },
 *   tokens: 'device-token-here',
 *   title: '新消息',
 *   body: '您有一条未读消息',
 *   data: { type: 'message', id: '123' },
 *   clickAction: 'OPEN_MESSAGE'
 * });
 * 
 * // APNs 推送
 * await sendPush({
 *   provider: 'apns',
 *   apns: {
 *     teamId: 'TEAM123',
 *     keyId: 'KEY123',
 *     keyPath: '/path/to/auth.p8',
 *     bundleId: 'com.example.app'
 *   },
 *   tokens: ['device-token-1', 'device-token-2'],
 *   title: '系统通知',
 *   body: '服务器维护即将开始'
 * });
 * ```
 */
export async function sendPush(config: PushNotification): Promise<NotificationResult | NotificationResult[]> {
  const tokens = Array.isArray(config.tokens) ? config.tokens : [config.tokens];

  if (config.provider === 'fcm') {
    if (!config.fcm) {
      return {
        success: false,
        channel: 'push',
        error: 'FCM 配置缺失'
      };
    }
    return await sendFcmPush(
      config.fcm,
      tokens,
      config.title,
      config.body,
      config.data,
      config.imageUrl
    );
  } else if (config.provider === 'apns') {
    if (!config.apns) {
      return {
        success: false,
        channel: 'push',
        error: 'APNs 配置缺失'
      };
    }
    return await sendApnsPush(
      config.apns,
      tokens,
      config.title,
      config.body,
      config.data,
      config.imageUrl
    );
  } else {
    return {
      success: false,
      channel: 'push',
      error: `不支持的服务商：${config.provider}`
    };
  }
}

// ============== 通用通知接口 ==============

/**
 * 发送通用通知 (统一入口)
 * 
 * @param channel - 通道类型
 * @param config - 通道特定配置
 * @param options - 通用选项
 * @returns 通知结果
 * 
 * @example
 * ```typescript
 * // 邮件通知
 * await notify('email', { /* EmailNotification *\/ });
 * 
 * // 短信通知
 * await notify('sms', { /* SmsNotification *\/ });
 * 
 * // Push 通知
 * await notify('push', { /* PushNotification *\/ });
 * 
 * // 带重试
 * await notify('email', config, { retries: 3, retryDelay: 1000 });
 * ```
 */
export async function notify(
  channel: NotificationChannel,
  config: EmailNotification | SmsNotification | PushNotification,
  options: UniversalNotification = {}
): Promise<NotificationResult | NotificationResult[]> {
  const { retries = 0, retryDelay = 1000 } = options;
  
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let result: NotificationResult | NotificationResult[];

      switch (channel) {
        case 'email':
          result = await sendEmail(config as EmailNotification);
          break;
        case 'sms':
          result = await sendSms(config as SmsNotification);
          break;
        case 'push':
          result = await sendPush(config as PushNotification);
          break;
        default:
          return {
            success: false,
            channel,
            error: `不支持的通道类型：${channel}`
          };
      }

      // 检查是否成功
      const success = Array.isArray(result)
        ? result.some(r => r.success)
        : result.success;

      if (success || attempt === retries) {
        return result;
      }

      // 等待重试
      if (attempt < retries) {
        await delay(retryDelay);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt === retries) {
        return {
          success: false,
          channel,
          error: lastError.message
        };
      }

      await delay(retryDelay);
    }
  }

  return {
    success: false,
    channel,
    error: '未知错误'
  };
}

/**
 * 批量发送通知
 * 
 * @param notifications - 通知列表
 * @returns 结果列表
 * 
 * @example
 * ```typescript
 * // 批量发送不同类型的通知
 * await batchNotify([
 *   { channel: 'email', config: {/* email config *\/ } },
 *   { channel: 'sms', config: {/* sms config *\/ } },
 *   { channel: 'push', config: {/* push config *\/ } }
 * ]);
 * ```
 */
export async function batchNotify(
  notifications: Array<{
    channel: NotificationChannel;
    config: EmailNotification | SmsNotification | PushNotification;
    options?: UniversalNotification;
  }>
): Promise<Array<NotificationResult | NotificationResult[]>> {
  const results = await Promise.all(
    notifications.map(n => notify(n.channel, n.config, n.options))
  );
  return results;
}

// ============== 快捷函数 ==============

/**
 * 快速发送系统告警邮件
 */
export async function sendAlertEmail(
  subject: string,
  message: string,
  recipients: string[],
  smtpConfig: EmailConfig
): Promise<NotificationResult> {
  return sendEmail({
    ...smtpConfig,
    to: recipients,
    subject: `🚨 [系统告警] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #ef4444;">🚨 系统告警</h2>
        <div style="background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0;">
          <strong>主题:</strong> ${subject}<br>
          <strong>时间:</strong> ${new Date().toLocaleString('zh-CN')}
        </div>
        <div style="margin-top: 20px;">
          ${message}
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
      </div>
    `,
    priority: 'urgent'
  });
}

/**
 * 快速发送验证码短信
 */
export async function sendVerificationSms(
  phone: string,
  code: string,
  smsConfig: SmsNotification
): Promise<NotificationResult[]> {
  const message = `您的验证码是：${code}，5 分钟内有效。请勿泄露给他人。`;
  
  if (smsConfig.provider === 'twilio' && smsConfig.twilio) {
    return sendSms({
      ...smsConfig,
      to: phone,
      message
    });
  } else if (smsConfig.provider === 'aliyun' && smsConfig.aliyun) {
    return sendSms({
      ...smsConfig,
      to: phone,
      templateParams: { code, expiry: '5' }
    });
  }
  
  return [{
    success: false,
    channel: 'sms',
    error: '配置不完整'
  }];
}

/**
 * 快速发送 Push 提醒
 */
export async function sendReminderPush(
  tokens: string[],
  title: string,
  body: string,
  pushConfig: PushNotification
): Promise<NotificationResult | NotificationResult[]> {
  return sendPush({
    ...pushConfig,
    tokens,
    title: `📌 ${title}`,
    body,
    data: { type: 'reminder' }
  });
}

// ============== 导出 ==============

export default {
  // 核心功能
  sendEmail,
  sendSms,
  sendPush,
  notify,
  batchNotify,
  
  // 快捷函数
  sendAlertEmail,
  sendVerificationSms,
  sendReminderPush,
  
  // 工具函数
  validateEmail,
  validatePhone
};
