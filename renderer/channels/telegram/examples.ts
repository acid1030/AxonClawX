/**
 * TelegramChannel 使用示例
 * 
 * 这个文件展示了如何在不同场景下使用 TelegramChannel
 */

import { TelegramChannel } from './channels/telegram/TelegramChannel';
import { ChannelManager } from './channels/ChannelManager';
import { TelegramConfig } from './channels/types';

// =============================================================================
// 示例 1: 基础 Echo Bot
// =============================================================================

async function example1_echoBot() {
  const channel = new TelegramChannel({
    name: 'Echo Bot',
    type: 'telegram',
    enabled: true,
    status: 'disconnected',
    config: {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      pollingInterval: 3000,
    },
  });

  // 监听消息并回复
  channel.onMessage(async (message) => {
    console.log(`📩 Received from ${message.senderName}: ${message.content}`);
    
    // 回复消息
    await channel.sendMessage(
      message.senderId,
      `🔊 Echo: ${message.content}`,
      { replyTo: message.platformMessageId }
    );
  });

  await channel.connect();
  console.log(`✅ Echo Bot started as @${channel.getBotUsername()}`);
}

// =============================================================================
// 示例 2: 命令处理 Bot
// =============================================================================

async function example2_commandBot() {
  const channel = new TelegramChannel({
    name: 'Command Bot',
    type: 'telegram',
    enabled: true,
    status: 'disconnected',
    config: {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
    },
  });

  channel.onMessage(async (message) => {
    const text = message.content.trim();
    
    switch (text) {
      case '/start':
        await channel.sendMessage(
          message.senderId,
          '👋 欢迎使用 AxonClaw Bot!\n\n' +
          '可用命令:\n' +
          '/help - 查看帮助\n' +
          '/status - 系统状态\n' +
          '/ping - 测试响应',
          { parseMode: 'plain' }
        );
        break;
        
      case '/help':
        await channel.sendMessage(
          message.senderId,
          `**可用命令:**
- /start - 开始使用
- /help - 显示帮助
- /status - 系统状态
- /ping - 测试响应

**功能特性:**
✅ 多平台支持
✅ 自动重连
✅ 消息加密`,
          { parseMode: 'markdown' }
        );
        break;
        
      case '/status':
        const status = channel.getStatus();
        await channel.sendMessage(
          message.senderId,
          `系统状态：\`${status}\`\n` +
          `运行时间：${process.uptime().toFixed(0)}s`,
          { parseMode: 'markdown' }
        );
        break;
        
      case '/ping':
        const start = Date.now();
        await channel.sendMessage(message.senderId, '🏓 Pong!');
        const delay = Date.now() - start;
        await channel.sendMessage(message.senderId, `⏱ 响应时间：${delay}ms`);
        break;
        
      default:
        // 未知命令
        if (text.startsWith('/')) {
          await channel.sendMessage(
            message.senderId,
            `❓ 未知命令：${text}\n\n发送 /help 查看可用命令`
          );
        }
    }
  });

  await channel.connect();
  console.log('✅ Command Bot started');
}

// =============================================================================
// 示例 3: 与 ChannelManager 集成
// =============================================================================

async function example3_withChannelManager() {
  // 获取 ChannelManager 单例
  const manager = ChannelManager.getInstance({
    autoReconnect: true,
    reconnectDelay: 5000,
    maxReconnectAttempts: 5,
  });

  // 注册 Telegram 工厂
  manager.registerChannelType('telegram', (config) => {
    return new TelegramChannel(config as TelegramConfig);
  });

  // 添加 Telegram Channel
  const telegramChannelId = await manager.addChannel({
    name: 'Support Bot',
    type: 'telegram',
    enabled: true,
    status: 'disconnected',
    config: {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      allowedChatIds: ['123456789'], // 只允许特定聊天
    },
  });

  // 监听全局消息
  manager.onMessage((message) => {
    console.log(`📨 [${message.channelId}] ${message.senderName}: ${message.content}`);
  });

  // 监听事件
  manager.onEvent((event) => {
    console.log(`📡 Event: ${event.type} on ${event.channelId}`);
  });

  // 通过 Manager 发送消息
  await manager.sendMessage(
    telegramChannelId,
    '123456789',
    'Hello from ChannelManager!'
  );

  // 广播到多个 Channel (如果有的话)
  const results = await manager.broadcast(
    [telegramChannelId],
    '@channel',
    '📢 广播消息'
  );

  results.forEach((result, channelId) => {
    console.log(`${channelId}: ${result.success ? '✅' : '❌'}`);
  });
}

// =============================================================================
// 示例 4: 带错误处理的生产环境 Bot
// =============================================================================

async function example4_productionBot() {
  const channel = new TelegramChannel({
    name: 'Production Bot',
    type: 'telegram',
    enabled: true,
    status: 'disconnected',
    config: {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
      allowedChatIds: process.env.TELEGRAM_ALLOWED_CHATS?.split(','),
      pollingInterval: 3000,
    },
  });

  // 事件监听
  channel.onEvent((event) => {
    switch (event.type) {
      case 'connected':
        console.log('✅ Bot connected');
        break;
      case 'disconnected':
        console.warn('⚠️ Bot disconnected');
        break;
      case 'error':
        console.error('❌ Bot error:', event.data.error);
        // 这里可以发送告警通知
        break;
      case 'message':
        console.log('💬 Message received');
        break;
    }
  });

  // 消息处理
  channel.onMessage(async (message) => {
    try {
      // 处理消息
      await handleMessage(message);
    } catch (error) {
      console.error('Message handling error:', error);
      await channel.sendMessage(
        message.senderId,
        '❌ 处理消息时发生错误，请稍后重试'
      );
    }
  });

  // 连接
  try {
    await channel.connect();
    console.log('✅ Production Bot started');
  } catch (error) {
    console.error('Failed to start bot:', error);
    // 优雅降级或退出
  }
}

async function handleMessage(message: any) {
  // 实际的消息处理逻辑
  console.log('Processing message:', message.content);
}

// =============================================================================
// 示例 5: 定时任务 Bot
// =============================================================================

async function example5_scheduledBot() {
  const channel = new TelegramChannel({
    name: 'Scheduled Bot',
    type: 'telegram',
    enabled: true,
    status: 'disconnected',
    config: {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
    },
  });

  // 订阅用户列表
  const subscribers = new Set<string>();

  channel.onMessage(async (message) => {
    const text = message.content.trim();

    if (text === '/subscribe') {
      subscribers.add(message.senderId);
      await channel.sendMessage(
        message.senderId,
        '✅ 已订阅每日新闻推送'
      );
    } else if (text === '/unsubscribe') {
      subscribers.delete(message.senderId);
      await channel.sendMessage(
        message.senderId,
        '✅ 已取消订阅'
      );
    }
  });

  await channel.connect();

  // 每日定时推送
  setInterval(async () => {
    const news = '📰 今日新闻摘要...';
    
    for (const subscriberId of subscribers) {
      try {
        await channel.sendMessage(subscriberId, news);
      } catch (error) {
        console.error(`Failed to send to ${subscriberId}:`, error);
        subscribers.delete(subscriberId); // 移除失败的用户
      }
    }
  }, 24 * 60 * 60 * 1000); // 每天

  console.log('✅ Scheduled Bot started');
}

// =============================================================================
// 示例 6: 多 Bot 实例
// =============================================================================

async function example6_multiBot() {
  const bots = [
    new TelegramChannel({
      name: 'Support Bot',
      type: 'telegram',
      enabled: true,
      status: 'disconnected',
      config: {
        botToken: process.env.TELEGRAM_SUPPORT_BOT_TOKEN!,
      },
    }),
    new TelegramChannel({
      name: 'Notification Bot',
      type: 'telegram',
      enabled: true,
      status: 'disconnected',
      config: {
        botToken: process.env.TELEGRAM_NOTIFICATION_BOT_TOKEN!,
      },
    }),
  ];

  // 连接所有 Bot
  await Promise.all(bots.map(bot => bot.connect()));

  console.log(`✅ Started ${bots.length} bots`);

  // 不同 Bot 处理不同功能
  bots[0].onMessage(async (message) => {
    // 客服 Bot 处理用户咨询
    console.log('Support Bot received:', message.content);
  });

  bots[1].onMessage(async (message) => {
    // 通知 Bot 只发送通知，不处理消息
    console.log('Notification Bot received:', message.content);
  });
}

// =============================================================================
// 运行示例
// =============================================================================

/**
 * 选择要运行的示例
 * 取消注释相应的函数调用
 */

// example1_echoBot();
// example2_commandBot();
// example3_withChannelManager();
// example4_productionBot();
// example5_scheduledBot();
// example6_multiBot();

// 或者导出供其他模块使用
export {
  example1_echoBot,
  example2_commandBot,
  example3_withChannelManager,
  example4_productionBot,
  example5_scheduledBot,
  example6_multiBot,
};
