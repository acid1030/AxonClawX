/**
 * Channel System - Type Definitions
 * 
 * Abstract layer for multi-platform messaging channels:
 * Telegram, WhatsApp, Discord, Slack
 */

/**
 * Supported channel types
 */
export type ChannelType = 
  | 'telegram'
  | 'whatsapp'
  | 'discord'
  | 'slack';

/**
 * Channel connection status
 */
export type ChannelStatus = 
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error'
  | 'auth_required';

/**
 * Base configuration for all channels
 */
export interface BaseChannelConfig {
  /** Channel display name */
  name: string;
  /** Channel type */
  type: ChannelType;
  /** Whether channel is enabled */
  enabled: boolean;
  /** Connection status */
  status: ChannelStatus;
  /** Last connection timestamp */
  lastConnectedAt?: number;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

/**
 * Telegram-specific configuration
 */
export interface TelegramConfig extends BaseChannelConfig {
  type: 'telegram';
  config: {
    /** Telegram Bot Token */
    botToken: string;
    /** Bot username */
    botUsername?: string;
    /** Allowed chat IDs (empty = all) */
    allowedChatIds?: string[];
    /** Webhook URL (optional, for push mode) */
    webhookUrl?: string;
    /** Polling interval in ms (default: 3000) */
    pollingInterval?: number;
  };
}

/**
 * WhatsApp-specific configuration
 */
export interface WhatsAppConfig extends BaseChannelConfig {
  type: 'whatsapp';
  config: {
    /** WhatsApp Business API token */
    apiToken: string;
    /** Phone number ID */
    phoneNumberId: string;
    /** Business account ID */
    businessAccountId: string;
    /** Webhook verify token */
    webhookVerifyToken?: string;
    /** API version */
    apiVersion?: string;
  };
}

/**
 * Discord-specific configuration
 */
export interface DiscordConfig extends BaseChannelConfig {
  type: 'discord';
  config: {
    /** Discord Bot Token */
    botToken: string;
    /** Bot application ID */
    applicationId?: string;
    /** Allowed guild IDs (empty = all) */
    allowedGuildIds?: string[];
    /** Allowed channel IDs (empty = all) */
    allowedChannelIds?: string[];
    /** Intents bitmask */
    intents?: number;
  };
}

/**
 * Slack-specific configuration
 */
export interface SlackConfig extends BaseChannelConfig {
  type: 'slack';
  config: {
    /** Slack Bot Token (xoxb-...) */
    botToken: string;
    /** App signing secret */
    signingSecret?: string;
    /** Allowed channel IDs (empty = all) */
    allowedChannelIds?: string[];
    /** Socket mode enabled */
    socketMode?: boolean;
  };
}

/**
 * Union type for all channel configurations
 */
export type ChannelConfig = 
  | TelegramConfig
  | WhatsAppConfig
  | DiscordConfig
  | SlackConfig;

/**
 * Channel instance interface (runtime)
 */
export interface IChannel {
  /** Channel ID */
  id: string;
  /** Channel configuration */
  config: ChannelConfig;
  /** Initialize and connect the channel */
  connect(): Promise<void>;
  /** Disconnect the channel */
  disconnect(): Promise<void>;
  /** Send a message */
  sendMessage(targetId: string, content: string, options?: SendMessageOptions): Promise<SendMessageResult>;
  /** Get channel status */
  getStatus(): ChannelStatus;
  /** Get last error */
  getLastError(): Error | null;
}

/**
 * Options for sending messages
 */
export interface SendMessageOptions {
  /** Message type (text, image, file, etc.) */
  type?: 'text' | 'image' | 'file' | 'voice' | 'video';
  /** Reply to message ID */
  replyTo?: string;
  /** Parse mode (markdown, html, etc.) */
  parseMode?: 'markdown' | 'html' | 'plain';
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of sending a message
 */
export interface SendMessageResult {
  /** Success flag */
  success: boolean;
  /** Message ID on the platform */
  messageId?: string;
  /** Timestamp */
  timestamp?: number;
  /** Error if failed */
  error?: string;
}

/**
 * Incoming message from a channel
 */
export interface IncomingMessage {
  /** Unique message ID */
  id: string;
  /** Channel ID that received this message */
  channelId: string;
  /** Platform-specific message ID */
  platformMessageId: string;
  /** Sender ID */
  senderId: string;
  /** Sender name */
  senderName?: string;
  /** Message content */
  content: string;
  /** Message type */
  type: 'text' | 'image' | 'file' | 'voice' | 'video';
  /** Timestamp */
  timestamp: number;
  /** Raw platform data */
  rawData?: any;
}

/**
 * Channel event types
 */
export type ChannelEventType = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'message'
  | 'status_change';

/**
 * Channel event
 */
export interface ChannelEvent {
  type: ChannelEventType;
  channelId: string;
  timestamp: number;
  data?: any;
}

/**
 * Channel event listener callback
 */
export type ChannelEventListener = (event: ChannelEvent) => void;

/**
 * Channel manager options
 */
export interface ChannelManagerOptions {
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
}

/**
 * Channel statistics
 */
export interface ChannelStats {
  /** Total messages sent */
  messagesSent: number;
  /** Total messages received */
  messagesReceived: number;
  /** Total errors */
  errors: number;
  /** Uptime in seconds */
  uptime: number;
  /** Last activity timestamp */
  lastActivity?: number;
}

/**
 * Channel factory function type
 */
export type ChannelFactory = (config: ChannelConfig) => IChannel;

/**
 * Channel registry for platform-specific implementations
 */
export interface ChannelRegistry {
  /** Register a channel factory */
  register(type: ChannelType, factory: ChannelFactory): void;
  /** Get a channel factory */
  getFactory(type: ChannelType): ChannelFactory | undefined;
}
