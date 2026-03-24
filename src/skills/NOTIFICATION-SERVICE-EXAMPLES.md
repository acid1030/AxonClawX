# 📬 多通道通知服务 - 使用示例

**模块:** KAEL  
**版本:** 1.0.0  
**作者:** Axon

---

## 📋 目录

1. [快速开始](#快速开始)
2. [邮件通知](#邮件通知)
3. [短信通知](#短信通知)
4. [Push 通知](#push-通知)
5. [高级用法](#高级用法)
6. [实际场景](#实际场景)

---

## 🚀 快速开始

### 安装依赖

```bash
# 安装必要依赖
npm install nodemailer axios jsonwebtoken
npm install -D @types/nodemailer @types/jsonwebtoken
```

### 基础导入

```typescript
import {
  sendEmail,
  sendSms,
  sendPush,
  notify,
  batchNotify,
  sendAlertEmail,
  sendVerificationSms
} from './src/skills/notification-service-skill';

// 或者使用默认导出
import NotificationService from './src/skills/notification-service-skill';
```

---

## 📧 邮件通知

### 1. Gmail 发送

```typescript
import { sendEmail } from './src/skills/notification-service-skill';

async function sendGmail() {
  const result = await sendEmail({
    // SMTP 配置
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    username: 'your-email@gmail.com',
    password: 'your-app-password', // 应用专用密码
    from: 'your-email@gmail.com',
    fromName: '我的应用',
    
    // 收件人
    to: 'recipient@example.com',
    
    // 邮件内容
    subject: '测试邮件',
    text: '这是一封测试邮件',
    html: '<h1>测试邮件</h1><p>这是一封测试邮件</p>'
  });

  console.log(result);
  // { success: true, channel: 'email', messageId: '<xxx@gmail.com>', ... }
}
```

### 2. 企业邮箱 (带附件)

```typescript
import * as fs from 'fs';
import { sendEmail } from './src/skills/notification-service-skill';

async function sendReportEmail() {
  const result = await sendEmail({
    host: 'smtp.company.com',
    port: 465,
    secure: true,
    username: 'noreply@company.com',
    password: 'secret',
    from: 'noreply@company.com',
    fromName: '系统通知',
    
    // 多收件人
    to: ['user1@company.com', 'user2@company.com'],
    cc: 'manager@company.com',
    bcc: 'archive@company.com',
    
    subject: '📊 月度报告 - 2026 年 3 月',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>月度报告已生成</h2>
        <p>请查看附件中的详细报告。</p>
        <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
      </div>
    `,
    
    // 附件
    attachments: [
      {
        filename: 'monthly-report.pdf',
        path: '/path/to/report.pdf'
      },
      {
        filename: 'data.xlsx',
        content: fs.readFileSync('/path/to/data.xlsx')
      }
    ],
    
    priority: 'high'
  });

  if (result.success) {
    console.log('邮件发送成功:', result.messageId);
  } else {
    console.error('发送失败:', result.error);
  }
}
```

### 3. 使用快捷函数发送告警

```typescript
import { sendAlertEmail } from './src/skills/notification-service-skill';

async function sendSystemAlert() {
  const result = await sendAlertEmail(
    '服务器 CPU 使用率过高',
    `
      <p>告警详情:</p>
      <ul>
        <li>服务器：prod-server-01</li>
        <li>CPU 使用率：95%</li>
        <li>时间：${new Date().toLocaleString('zh-CN')}</li>
      </ul>
      <p>请立即处理！</p>
    `,
    ['admin@company.com', 'oncall@company.com'],
    {
      host: 'smtp.company.com',
      username: 'alerts@company.com',
      password: 'secret',
      from: 'alerts@company.com'
    }
  );

  console.log(result);
}
```

---

## 📱 短信通知

### 1. Twilio 短信

```typescript
import { sendSms } from './src/skills/notification-service-skill';

async function sendTwilioSms() {
  const results = await sendSms({
    provider: 'twilio',
    twilio: {
      accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxx',
      authToken: 'your-auth-token',
      fromNumber: '+1234567890'
    },
    to: '+8613800138000',
    message: '您的验证码是：123456，5 分钟内有效'
  });

  console.log(results[0]);
  // { success: true, channel: 'sms', messageId: 'SMxxxx', ... }
}

// 批量发送
async function sendBulkSms() {
  const results = await sendSms({
    provider: 'twilio',
    twilio: {
      accountSid: 'ACxxxx',
      authToken: 'token',
      fromNumber: '+1234567890'
    },
    to: ['+8613800138000', '+8613900139000', '+8613700137000'],
    message: '系统通知：今晚 22:00-24:00 进行服务器维护'
  });

  results.forEach((result, index) => {
    console.log(`收件人${index + 1}:`, result.success ? '成功' : result.error);
  });
}
```

### 2. 阿里云短信

```typescript
import { sendSms } from './src/skills/notification-service-skill';

async function sendAliyunSms() {
  const results = await sendSms({
    provider: 'aliyun',
    aliyun: {
      accessKeyId: 'LTAIxxxxxxxxxxxx',
      accessKeySecret: 'your-secret-key',
      signName: '我的公司',
      templateCode: 'SMS_123456789'
    },
    to: '+8613800138000',
    templateParams: {
      code: '123456',
      product: 'XX 平台',
      expiry: '5'
    }
  });

  console.log(results[0]);
}
```

### 3. 发送验证码 (快捷函数)

```typescript
import { sendVerificationSms } from './src/skills/notification-service-skill';

async function sendCode() {
  // 生成 6 位验证码
  const code = Math.random().toString().slice(-6);
  
  const results = await sendVerificationSms(
    '+8613800138000',
    code,
    {
      provider: 'aliyun',
      aliyun: {
        accessKeyId: 'LTAIxxxx',
        accessKeySecret: 'secret',
        signName: '公司名',
        templateCode: 'SMS_123456'
      }
    }
  );

  if (results[0].success) {
    // 存储验证码到 Redis/数据库，设置 5 分钟过期
    console.log('验证码已发送:', code);
  }
}
```

---

## 🔔 Push 通知

### 1. Firebase Cloud Messaging (FCM)

```typescript
import { sendPush } from './src/skills/notification-service-skill';
import * as fs from 'fs';

async function sendFcmNotification() {
  // 读取服务账号密钥
  const serviceAccountKey = fs.readFileSync(
    '/path/to/service-account.json',
    'utf8'
  );

  const result = await sendPush({
    provider: 'fcm',
    fcm: {
      projectId: 'my-project-12345',
      serviceAccountKey
    },
    tokens: 'device-token-here', // 或数组 ['token1', 'token2']
    title: '新消息',
    body: '您有一条未读消息',
    data: {
      type: 'message',
      messageId: '123456',
      senderId: 'user789'
    },
    clickAction: 'OPEN_MESSAGE',
    imageUrl: 'https://example.com/image.jpg'
  });

  console.log(result);
}
```

### 2. Apple Push Notification Service (APNs)

```typescript
import { sendPush } from './src/skills/notification-service-skill';

async function sendApnsNotification() {
  const results = await sendPush({
    provider: 'apns',
    apns: {
      teamId: 'TEAM123456',
      keyId: 'KEY123456',
      keyPath: '/path/to/AuthKey_KEY123456.p8',
      bundleId: 'com.example.myapp',
      sandbox: true // 开发环境
    },
    tokens: ['device-token-1', 'device-token-2'],
    title: '系统通知',
    body: '服务器维护即将开始',
    data: {
      type: 'maintenance',
      scheduledTime: '2026-03-14T22:00:00Z'
    }
  });

  // results 是数组，每个设备一个结果
  results.forEach((result, index) => {
    console.log(`设备${index + 1}:`, result.success ? '成功' : result.error);
  });
}
```

### 3. 发送提醒 (快捷函数)

```typescript
import { sendReminderPush } from './src/skills/notification-service-skill';

async function sendMeetingReminder() {
  const result = await sendReminderPush(
    ['device-token-1', 'device-token-2'],
    '会议提醒',
    '10 分钟后开始产品评审会议，请准时参加',
    {
      provider: 'fcm',
      fcm: {
        projectId: 'my-project',
        serviceAccountKey: 'key'
      }
    }
  );

  console.log(result);
}
```

---

## 🎯 高级用法

### 1. 统一通知接口 (带重试)

```typescript
import { notify } from './src/skills/notification-service-skill';

async function sendWithRetry() {
  // 邮件通知，失败重试 3 次
  const result = await notify(
    'email',
    {
      host: 'smtp.company.com',
      username: 'noreply@company.com',
      password: 'secret',
      from: 'noreply@company.com',
      to: 'user@example.com',
      subject: '重要通知',
      text: '这是一条重要通知'
    },
    {
      priority: 'high',
      retries: 3,
      retryDelay: 1000 // 1 秒
    }
  );

  console.log(result);
}
```

### 2. 批量发送多通道通知

```typescript
import { batchNotify } from './src/skills/notification-service-skill';

async function sendMultiChannelAlert() {
  const results = await batchNotify([
    {
      channel: 'email',
      config: {
        host: 'smtp.company.com',
        username: 'alerts@company.com',
        password: 'secret',
        from: 'alerts@company.com',
        to: 'admin@company.com',
        subject: '🚨 系统告警',
        html: '<h1>服务器异常</h1><p>请立即处理</p>'
      },
      options: { priority: 'urgent' }
    },
    {
      channel: 'sms',
      config: {
        provider: 'twilio',
        twilio: {
          accountSid: 'ACxxxx',
          authToken: 'token',
          fromNumber: '+1234567890'
        },
        to: '+8613800138000',
        message: '【告警】服务器异常，请立即处理'
      }
    },
    {
      channel: 'push',
      config: {
        provider: 'fcm',
        fcm: {
          projectId: 'my-project',
          serviceAccountKey: 'key'
        },
        tokens: 'admin-device-token',
        title: '🚨 系统告警',
        body: '服务器异常，请立即处理'
      }
    }
  ]);

  // 检查结果
  results.forEach((result, index) => {
    const channels = ['email', 'sms', 'push'];
    const success = Array.isArray(result)
      ? result.some(r => r.success)
      : result.success;
    
    console.log(`${channels[index]}:`, success ? '✓' : '✗');
  });
}
```

### 3. 环境变量配置

```typescript
// config/notifications.ts
export const notificationConfig = {
  email: {
    host: process.env.SMTP_HOST || 'smtp.company.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    username: process.env.SMTP_USERNAME || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@company.com',
    fromName: process.env.SMTP_FROM_NAME || '系统通知'
  },
  
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || ''
    },
    aliyun: {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
      signName: process.env.ALIYUN_SIGN_NAME || '',
      templateCode: process.env.ALIYUN_TEMPLATE_CODE || ''
    }
  },
  
  push: {
    fcm: {
      projectId: process.env.FCM_PROJECT_ID || '',
      serviceAccountKey: process.env.FCM_SERVICE_ACCOUNT_KEY || ''
    },
    apns: {
      teamId: process.env.APNS_TEAM_ID || '',
      keyId: process.env.APNS_KEY_ID || '',
      keyPath: process.env.APNS_KEY_PATH || '',
      bundleId: process.env.APNS_BUNDLE_ID || '',
      sandbox: process.env.APNS_SANDBOX === 'true'
    }
  }
};

// 使用
import { sendEmail } from './src/skills/notification-service-skill';
import { notificationConfig } from './config/notifications';

async function sendNotification() {
  await sendEmail({
    ...notificationConfig.email,
    to: 'user@example.com',
    subject: '测试',
    text: '测试内容'
  });
}
```

---

## 🌟 实际场景

### 场景 1: 用户注册验证码

```typescript
import { sendVerificationSms, sendEmail } from './src/skills/notification-service-skill';

async function handleUserRegistration(email: string, phone: string) {
  const code = Math.random().toString().slice(-6);
  
  // 并行发送短信和邮件
  const [smsResult, emailResult] = await Promise.all([
    sendVerificationSms(phone, code, {
      provider: 'aliyun',
      aliyun: {
        accessKeyId: process.env.ALIYUN_KEY_ID,
        accessKeySecret: process.env.ALIYUN_KEY_SECRET,
        signName: 'MyApp',
        templateCode: 'SMS_123456'
      }
    }),
    sendEmail({
      host: process.env.SMTP_HOST,
      username: process.env.SMTP_USERNAME,
      password: process.env.SMTP_PASSWORD,
      from: 'noreply@myapp.com',
      to: email,
      subject: '【MyApp】验证码',
      html: `
        <div style="padding: 20px; font-family: Arial;">
          <h2>欢迎注册 MyApp</h2>
          <p>您的验证码是：<strong style="font-size: 24px; color: #6366f1;">${code}</strong></p>
          <p>5 分钟内有效，请勿泄露给他人。</p>
        </div>
      `
    })
  ]);

  if (smsResult[0].success && emailResult.success) {
    // 存储验证码到 Redis
    await redis.setex(`verify:${phone}`, 300, code);
    return { success: true };
  } else {
    return {
      success: false,
      error: '发送失败',
      details: { sms: smsResult[0], email: emailResult }
    };
  }
}
```

### 场景 2: 订单状态通知

```typescript
import { notify } from './src/skills/notification-service-skill';

async function notifyOrderStatus(
  userId: string,
  orderNo: string,
  status: string,
  userEmail: string,
  userPhone: string,
  userDeviceToken: string
) {
  const statusText: Record<string, string> = {
    paid: '已支付',
    shipped: '已发货',
    delivered: '已送达',
    cancelled: '已取消'
  };

  // 根据订单状态选择通知通道
  const notifications = [];

  // 所有状态都发送邮件
  notifications.push({
    channel: 'email' as const,
    config: {
      host: process.env.SMTP_HOST,
      username: process.env.SMTP_USERNAME,
      password: process.env.SMTP_PASSWORD,
      from: 'orders@myapp.com',
      fromName: 'MyApp 订单中心',
      to: userEmail,
      subject: `订单 ${orderNo} ${statusText[status]}`,
      html: `
        <div style="padding: 20px;">
          <h2>订单状态更新</h2>
          <p>订单号：${orderNo}</p>
          <p>当前状态：<strong>${statusText[status]}</strong></p>
          <p>更新时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `
    }
  });

  // 重要状态发送短信
  if (['shipped', 'delivered'].includes(status)) {
    notifications.push({
      channel: 'sms' as const,
      config: {
        provider: 'aliyun' as const,
        aliyun: {
          accessKeyId: process.env.ALIYUN_KEY_ID,
          accessKeySecret: process.env.ALIYUN_KEY_SECRET,
          signName: 'MyApp',
          templateCode: 'SMS_ORDER_STATUS'
        },
        to: userPhone,
        templateParams: {
          orderNo,
          status: statusText[status]
        }
      }
    });
  }

  // 已发货时发送 Push
  if (status === 'shipped') {
    notifications.push({
      channel: 'push' as const,
      config: {
        provider: 'fcm' as const,
        fcm: {
          projectId: process.env.FCM_PROJECT_ID,
          serviceAccountKey: process.env.FCM_SERVICE_ACCOUNT_KEY
        },
        tokens: userDeviceToken,
        title: '订单已发货',
        body: `您的订单 ${orderNo} 已发货，请注意查收`,
        data: { type: 'order', orderNo, action: 'view_order' }
      }
    });
  }

  // 批量发送
  const results = await batchNotify(notifications);
  
  return results;
}
```

### 场景 3: 系统监控告警

```typescript
import { sendAlertEmail, sendSms } from './src/skills/notification-service-skill';

async function handleSystemAlert(
  alertType: string,
  severity: 'critical' | 'warning',
  details: any
) {
  const timestamp = new Date().toLocaleString('zh-CN');
  
  // 构建告警消息
  const message = `
    告警类型：${alertType}
    严重程度：${severity}
    时间：${timestamp}
    详情：${JSON.stringify(details, null, 2)}
  `;

  // 紧急告警：邮件 + 短信
  if (severity === 'critical') {
    await Promise.all([
      sendAlertEmail(
        alertType,
        message,
        ['oncall@company.com', 'devops@company.com'],
        {
          host: process.env.SMTP_HOST,
          username: process.env.SMTP_USERNAME,
          password: process.env.SMTP_PASSWORD,
          from: 'alerts@company.com'
        }
      ),
      sendSms({
        provider: 'twilio',
        twilio: {
          accountSid: process.env.TWILIO_SID,
          authToken: process.env.TWILIO_TOKEN,
          fromNumber: process.env.TWILIO_NUMBER
        },
        to: ['+8613800138000', '+8613900139000'],
        message: `【紧急告警】${alertType}，请立即处理`
      })
    ]);
  } else {
    // 普通告警：仅邮件
    await sendAlertEmail(
      alertType,
      message,
      ['devops@company.com'],
      {
        host: process.env.SMTP_HOST,
        username: process.env.SMTP_USERNAME,
        password: process.env.SMTP_PASSWORD,
        from: 'alerts@company.com'
      }
    );
  }
}
```

---

## 📝 错误处理

```typescript
import { sendEmail } from './src/skills/notification-service-skill';

async function sendWithHandling() {
  try {
    const result = await sendEmail({
      host: 'smtp.company.com',
      username: 'user',
      password: 'pass',
      from: 'user@company.com',
      to: 'recipient@example.com',
      subject: '测试',
      text: '测试'
    });

    if (result.success) {
      console.log('发送成功:', result.messageId);
    } else {
      console.error('发送失败:', result.error);
      
      // 根据错误类型处理
      if (result.error.includes('authentication')) {
        // 认证失败
      } else if (result.error.includes('timeout')) {
        // 超时，可以重试
      }
    }
  } catch (err) {
    console.error('异常:', err);
  }
}
```

---

## 🔧 类型定义

```typescript
// 完整类型参考 src/skills/notification-service-skill.ts

// 通知结果
interface NotificationResult {
  success: boolean;
  channel: 'email' | 'sms' | 'push';
  messageId?: string;
  error?: string;
  details?: any;
}

// 邮件配置
interface EmailConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  secure?: boolean;
  from: string;
  fromName?: string;
}

// 短信配置
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface AliyunSmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
}

// Push 配置
interface FcmConfig {
  projectId: string;
  serviceAccountKey: string;
}

interface ApnsConfig {
  teamId: string;
  keyId: string;
  keyPath: string;
  bundleId: string;
  sandbox?: boolean;
}
```

---

## 📊 性能建议

1. **批量发送**: 使用 `batchNotify` 并行发送多个通知
2. **连接池**: 邮件 SMTP 使用连接池提高性能
3. **重试机制**: 重要通知设置 `retries` 参数
4. **异步处理**: 非关键通知使用消息队列异步发送
5. **限流**: 短信服务注意 API 限流

---

**完成时间:** 2026-03-13  
**模块:** KAEL - 多通道通知服务
