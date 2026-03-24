/**
 * ChannelManager - Central Channel Orchestration
 * 
 * Manages lifecycle, routing, and events for all channel types.
 */

import {
  ChannelConfig,
  ChannelType,
  ChannelStatus,
  IChannel,
  ChannelEvent,
  ChannelEventListener,
  ChannelManagerOptions,
  ChannelStats,
  IncomingMessage,
  ChannelFactory,
  ChannelRegistry,
  SendMessageOptions,
  SendMessageResult,
} from './types';

/**
 * Default channel manager options
 */
const DEFAULT_OPTIONS: ChannelManagerOptions = {
  autoReconnect: true,
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
};

/**
 * Channel Registry - Singleton for platform factories
 */
class ChannelRegistryImpl implements ChannelRegistry {
  private static instance: ChannelRegistryImpl;
  private factories: Map<ChannelType, ChannelFactory> = new Map();

  private constructor() {}

  public static getInstance(): ChannelRegistryImpl {
    if (!ChannelRegistryImpl.instance) {
      ChannelRegistryImpl.instance = new ChannelRegistryImpl();
    }
    return ChannelRegistryImpl.instance;
  }

  register(type: ChannelType, factory: ChannelFactory): void {
    this.factories.set(type, factory);
  }

  getFactory(type: ChannelType): ChannelFactory | undefined {
    return this.factories.get(type);
  }

  unregister(type: ChannelType): boolean {
    return this.factories.delete(type);
  }

  getRegisteredTypes(): ChannelType[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Channel Wrapper - Adds reconnection logic and event emission
 */
class ChannelWrapper implements IChannel {
  private channel: IChannel;
  private options: ChannelManagerOptions;
  private reconnectAttempts = 0;
  private reconnectTimeout?: NodeJS.Timeout;
  private eventListeners: Set<ChannelEventListener> = new Set();

  constructor(channel: IChannel, options: ChannelManagerOptions) {
    this.channel = channel;
    this.options = options;
  }

  get id(): string {
    return this.channel.id;
  }

  get config(): ChannelConfig {
    return this.channel.config;
  }

  async connect(): Promise<void> {
    try {
      await this.channel.connect();
      this.reconnectAttempts = 0;
      this.emitEvent({
        type: 'connected',
        channelId: this.id,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.emitEvent({
        type: 'error',
        channelId: this.id,
        timestamp: Date.now(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      if (this.options.autoReconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts || 5)) {
        this.scheduleReconnect();
      } else {
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    await this.channel.disconnect();
    this.emitEvent({
      type: 'disconnected',
      channelId: this.id,
      timestamp: Date.now(),
    });
  }

  async sendMessage(
    targetId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<SendMessageResult> {
    return this.channel.sendMessage(targetId, content, options);
  }

  getStatus(): ChannelStatus {
    return this.channel.getStatus();
  }

  getLastError(): Error | null {
    return this.channel.getLastError();
  }

  onEvent(listener: ChannelEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emitEvent(event: ChannelEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay || 5000;

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Reconnect failed, will try again if attempts remain
      }
    }, delay);
  }
}

/**
 * ChannelManager - Central orchestration hub
 */
export class ChannelManager {
  private static instance: ChannelManager;
  private channels: Map<string, ChannelWrapper> = new Map();
  private options: ChannelManagerOptions;
  private eventListeners: Set<ChannelEventListener> = new Set();
  private stats: Map<string, ChannelStats> = new Map();
  private messageHandlers: Set<(message: IncomingMessage) => void> = new Set();

  private constructor(options: ChannelManagerOptions = DEFAULT_OPTIONS) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: ChannelManagerOptions): ChannelManager {
    if (!ChannelManager.instance) {
      ChannelManager.instance = new ChannelManager(options);
    }
    return ChannelManager.instance;
  }

  /**
   * Register a channel factory for a platform type
   */
  public registerChannelType(type: ChannelType, factory: ChannelFactory): void {
    ChannelRegistryImpl.getInstance().register(type, factory);
  }

  /**
   * Add a new channel
   */
  public async addChannel(config: ChannelConfig): Promise<string> {
    const factory = ChannelRegistryImpl.getInstance().getFactory(config.type);
    
    if (!factory) {
      throw new Error(`No factory registered for channel type: ${config.type}`);
    }

    const channel = factory(config);
    const wrapper = new ChannelWrapper(channel, this.options);
    
    // Subscribe to channel events
    wrapper.onEvent(event => {
      this.emitEvent(event);
      
      // Track stats
      if (event.type === 'message') {
        this.updateStats(channel.id, { messagesReceived: 1 });
      } else if (event.type === 'error') {
        this.updateStats(channel.id, { errors: 1 });
      }
    });

    this.channels.set(channel.id, wrapper);
    this.initializeStats(channel.id);

    // Auto-connect if enabled
    if (config.enabled) {
      await wrapper.connect();
    }

    return channel.id;
  }

  /**
   * Remove a channel
   */
  public async removeChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    await channel.disconnect();
    this.channels.delete(channelId);
    this.stats.delete(channelId);

    return true;
  }

  /**
   * Get a channel by ID
   */
  public getChannel(channelId: string): IChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all channels
   */
  public getAllChannels(): IChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get channels by type
   */
  public getChannelsByType(type: ChannelType): IChannel[] {
    return Array.from(this.channels.values()).filter(
      channel => channel.config.type === type
    );
  }

  /**
   * Get channels by status
   */
  public getChannelsByStatus(status: ChannelStatus): IChannel[] {
    return Array.from(this.channels.values()).filter(
      channel => channel.getStatus() === status
    );
  }

  /**
   * Connect a channel
   */
  public async connectChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }
    await channel.connect();
  }

  /**
   * Disconnect a channel
   */
  public async disconnectChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }
    await channel.disconnect();
  }

  /**
   * Send a message through a channel
   */
  public async sendMessage(
    channelId: string,
    targetId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<SendMessageResult> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return {
        success: false,
        error: `Channel not found: ${channelId}`,
      };
    }

    const result = await channel.sendMessage(targetId, content, options);
    
    if (result.success) {
      this.updateStats(channelId, { messagesSent: 1 });
    }

    return result;
  }

  /**
   * Broadcast a message to multiple channels
   */
  public async broadcast(
    channelIds: string[],
    targetId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<Map<string, SendMessageResult>> {
    const results = new Map<string, SendMessageResult>();

    await Promise.all(
      channelIds.map(async channelId => {
        const result = await this.sendMessage(channelId, targetId, content, options);
        results.set(channelId, result);
      })
    );

    return results;
  }

  /**
   * Subscribe to channel events
   */
  public onEvent(listener: ChannelEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Subscribe to incoming messages
   */
  public onMessage(handler: (message: IncomingMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Get channel statistics
   */
  public getStats(channelId: string): ChannelStats | undefined {
    return this.stats.get(channelId);
  }

  /**
   * Get all channel statistics
   */
  public getAllStats(): Map<string, ChannelStats> {
    return new Map(this.stats);
  }

  /**
   * Reset statistics for a channel
   */
  public resetStats(channelId: string): void {
    this.initializeStats(channelId);
  }

  /**
   * Get registry
   */
  public getRegistry(): ChannelRegistry {
    return ChannelRegistryImpl.getInstance();
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ChannelEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Channel event listener error:', error);
      }
    });
  }

  /**
   * Initialize stats for a channel
   */
  private initializeStats(channelId: string): void {
    this.stats.set(channelId, {
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      uptime: 0,
      lastActivity: undefined,
    });

    // Start uptime tracking
    const startTime = Date.now();
    const updateUptime = () => {
      const stats = this.stats.get(channelId);
      if (stats) {
        stats.uptime = Math.floor((Date.now() - startTime) / 1000);
      }
    };

    setInterval(updateUptime, 1000);
  }

  /**
   * Update channel statistics
   */
  private updateStats(channelId: string, updates: Partial<ChannelStats>): void {
    const stats = this.stats.get(channelId);
    if (stats) {
      if (updates.messagesSent !== undefined) {
        stats.messagesSent += updates.messagesSent;
      }
      if (updates.messagesReceived !== undefined) {
        stats.messagesReceived += updates.messagesReceived;
      }
      if (updates.errors !== undefined) {
        stats.errors += updates.errors;
      }
      stats.lastActivity = Date.now();
    }
  }

  /**
   * Process incoming message from a channel
   */
  public processIncomingMessage(message: IncomingMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }
}

export default ChannelManager;
