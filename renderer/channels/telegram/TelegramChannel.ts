/**
 * TelegramChannel - Telegram Platform Implementation
 * 
 * Implements the IChannel interface for Telegram Bot API.
 * Supports both polling and webhook modes.
 * 
 * @package AxonClaw Channels
 * @version 1.0.0
 */

import {
  IChannel,
  TelegramConfig,
  ChannelStatus,
  SendMessageOptions,
  SendMessageResult,
  IncomingMessage,
  ChannelEvent,
  ChannelEventType,
} from '../types';

/**
 * Telegram Bot API response types (minimal definitions for internal use)
 */
interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
  };
  date: number;
  text?: string;
  photo?: Array<{ file_id: string; file_size?: number; width: number; height: number }>;
  document?: { file_id: string; file_name: string; file_size?: number };
  voice?: { file_id: string; duration: number };
  video?: { file_id: string; duration: number; width: number; height: number };
  reply_to_message?: TelegramMessage;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
  error_code?: number;
}

/**
 * TelegramChannel - Telegram Bot API implementation
 */
export class TelegramChannel implements IChannel {
  public readonly id: string;
  public config: TelegramConfig;
  
  private botUsername?: string;
  private lastError: Error | null = null;
  private pollingInterval?: NodeJS.Timeout;
  private lastUpdateId: number = 0;
  private eventListeners: Set<(event: ChannelEvent) => void> = new Set();
  private messageListeners: Set<(message: IncomingMessage) => void> = new Set();
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;

  constructor(config: TelegramConfig) {
    this.id = `telegram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
  }

  /**
   * Initialize and connect the Telegram bot
   */
  async connect(): Promise<void> {
    try {
      this.emitEvent({
        type: 'status_change',
        channelId: this.id,
        timestamp: Date.now(),
        data: { status: 'connecting' },
      });

      // Verify bot token by getting bot info
      const botInfo = await this.getMe();
      this.botUsername = botInfo.username;
      
      this.config.status = 'connected';
      this.config.lastConnectedAt = Date.now();
      this.config.config.botUsername = botInfo.username;
      this.lastError = null;
      this.reconnectAttempts = 0;

      this.emitEvent({
        type: 'connected',
        channelId: this.id,
        timestamp: Date.now(),
        data: { botUsername: botInfo.username },
      });

      // Start polling if not using webhook
      if (!this.config.config.webhookUrl) {
        await this.startPolling();
      } else {
        // Webhook mode - just set the webhook
        await this.setWebhook(this.config.config.webhookUrl);
      }

    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error('Unknown connection error');
      this.config.status = 'error';
      this.config.errorMessage = this.lastError.message;

      this.emitEvent({
        type: 'error',
        channelId: this.id,
        timestamp: Date.now(),
        data: { error: this.lastError.message },
      });

      throw this.lastError;
    }
  }

  /**
   * Disconnect the Telegram bot
   */
  async disconnect(): Promise<void> {
    this.isRunning = false;

    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    // Delete webhook if set
    if (this.config.config.webhookUrl) {
      try {
        await this.deleteWebhook();
      } catch (error) {
        console.error('[TelegramChannel] Failed to delete webhook:', error);
      }
    }

    this.config.status = 'disconnected';

    this.emitEvent({
      type: 'disconnected',
      channelId: this.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Send a message through Telegram
   */
  async sendMessage(
    targetId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<SendMessageResult> {
    try {
      // Check if chat is allowed
      if (!this.isChatAllowed(targetId)) {
        return {
          success: false,
          error: `Chat ${targetId} is not in the allowed list`,
        };
      }

      const parseMode = this.getParseMode(options?.parseMode);
      const replyToMessageId = options?.replyTo ? parseInt(options.replyTo, 10) : undefined;

      const message = await this.sendTelegramMessage(targetId, content, {
        parse_mode: parseMode,
        reply_to_message_id: replyToMessageId,
      });

      return {
        success: true,
        messageId: message.message_id.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      this.lastError = new Error(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current channel status
   */
  getStatus(): ChannelStatus {
    return this.config.status;
  }

  /**
   * Get the last error that occurred
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Subscribe to channel events
   */
  onEvent(listener: (event: ChannelEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Subscribe to incoming messages
   */
  onMessage(listener: (message: IncomingMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * Get bot username (available after connect)
   */
  getBotUsername(): string | undefined {
    return this.botUsername;
  }

  // ===========================================================================
  // Private Methods - Telegram API Interactions
  // ===========================================================================

  /**
   * Make a request to Telegram Bot API
   */
  private async apiRequest<T>(
    method: string,
    params?: Record<string, any>
  ): Promise<T> {
    const url = `https://api.telegram.org/bot${this.config.config.botToken}/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: params ? JSON.stringify(params) : undefined,
    });

    const data: TelegramApiResponse<T> = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API Error: ${data.description || 'Unknown error'} (code: ${data.error_code})`);
    }

    return data.result;
  }

  /**
   * Get bot information
   */
  private async getMe(): Promise<TelegramUser> {
    return this.apiRequest<TelegramUser>('getMe');
  }

  /**
   * Send a text message
   */
  private async sendTelegramMessage(
    chatId: string,
    text: string,
    options?: {
      parse_mode?: string;
      reply_to_message_id?: number;
    }
  ): Promise<TelegramMessage> {
    const params: Record<string, any> = {
      chat_id: chatId,
      text,
    };

    if (options?.parse_mode) {
      params.parse_mode = options.parse_mode;
    }

    if (options?.reply_to_message_id) {
      params.reply_to_message_id = options.reply_to_message_id;
    }

    return this.apiRequest<TelegramMessage>('sendMessage', params);
  }

  /**
   * Set webhook for push notifications
   */
  private async setWebhook(url: string): Promise<void> {
    await this.apiRequest('setWebhook', {
      url,
      allowed_updates: ['message', 'edited_message', 'channel_post'],
    });
  }

  /**
   * Delete webhook (switch to polling)
   */
  private async deleteWebhook(): Promise<void> {
    await this.apiRequest('deleteWebhook');
  }

  /**
   * Get updates from Telegram
   */
  private async getUpdates(offset?: number): Promise<TelegramUpdate[]> {
    const params: Record<string, any> = {
      timeout: 30,
      allowed_updates: ['message', 'edited_message', 'channel_post'],
    };

    if (offset !== undefined) {
      params.offset = offset;
    }

    return this.apiRequest<TelegramUpdate[]>('getUpdates', params);
  }

  /**
   * Start polling for messages
   */
  private async startPolling(): Promise<void> {
    this.isRunning = true;
    const interval = this.config.config.pollingInterval || 3000;

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        const updates = await this.getUpdates(this.lastUpdateId + 1);

        for (const update of updates) {
          this.lastUpdateId = update.update_id;

          // Process message
          if (update.message) {
            await this.processMessage(update.message);
          } else if (update.edited_message) {
            await this.processMessage(update.edited_message);
          } else if (update.channel_post) {
            await this.processMessage(update.channel_post);
          }
        }
      } catch (error) {
        console.error('[TelegramChannel] Polling error:', error);
        this.lastError = error instanceof Error ? error : new Error('Polling failed');

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[TelegramChannel] Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          
          setTimeout(() => {
            if (this.isRunning) {
              poll();
            }
          }, this.reconnectDelay);
        } else {
          this.config.status = 'error';
          this.emitEvent({
            type: 'error',
            channelId: this.id,
            timestamp: Date.now(),
            data: { error: 'Max reconnection attempts reached' },
          });
        }
      }
    };

    // Initial poll
    await poll();

    // Continue polling
    this.pollingInterval = setInterval(poll, interval);
  }

  /**
   * Process incoming Telegram message
   */
  private async processMessage(telegramMessage: TelegramMessage): Promise<void> {
    // Check if chat is allowed
    if (!this.isChatAllowed(telegramMessage.chat.id.toString())) {
      return;
    }

    const messageType = this.getMessageType(telegramMessage);
    const content = telegramMessage.text || '';

    const incomingMessage: IncomingMessage = {
      id: `msg_${telegramMessage.message_id}_${Date.now()}`,
      channelId: this.id,
      platformMessageId: telegramMessage.message_id.toString(),
      senderId: telegramMessage.from?.id.toString() || 'unknown',
      senderName: telegramMessage.from?.username || telegramMessage.from?.first_name || 'Unknown',
      content,
      type: messageType,
      timestamp: telegramMessage.date * 1000,
      rawData: telegramMessage,
    };

    // Emit message event
    this.emitEvent({
      type: 'message',
      channelId: this.id,
      timestamp: Date.now(),
      data: incomingMessage,
    });

    // Notify message listeners
    this.messageListeners.forEach(listener => {
      try {
        listener(incomingMessage);
      } catch (error) {
        console.error('[TelegramChannel] Message listener error:', error);
      }
    });
  }

  /**
   * Determine message type from Telegram message
   */
  private getMessageType(msg: TelegramMessage): IncomingMessage['type'] {
    if (msg.text) return 'text';
    if (msg.photo && msg.photo.length > 0) return 'image';
    if (msg.document) return 'file';
    if (msg.voice) return 'voice';
    if (msg.video) return 'video';
    return 'text';
  }

  /**
   * Check if a chat ID is allowed
   */
  private isChatAllowed(chatId: string): boolean {
    const allowedChatIds = this.config.config.allowedChatIds;
    
    // If no allowed list, all chats are allowed
    if (!allowedChatIds || allowedChatIds.length === 0) {
      return true;
    }

    return allowedChatIds.includes(chatId);
  }

  /**
   * Convert parse mode to Telegram format
   */
  private getParseMode(parseMode?: SendMessageOptions['parseMode']): string | undefined {
    if (!parseMode) return undefined;

    switch (parseMode) {
      case 'markdown':
        return 'MarkdownV2';
      case 'html':
        return 'HTML';
      case 'plain':
      default:
        return undefined;
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ChannelEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[TelegramChannel] Event listener error:', error);
      }
    });
  }
}

export default TelegramChannel;
