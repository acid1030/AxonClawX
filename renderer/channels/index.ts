/**
 * Channel System - Public API
 * 
 * Central export point for all channel-related modules.
 */

// Types
export * from './types';

// Channel Manager
export { ChannelManager } from './ChannelManager';
export { default as ChannelManagerDefault } from './ChannelManager';

// UI Components
export { ChannelManagementView } from './ChannelManagementView';
export { default as ChannelManagementViewDefault } from './ChannelManagementView';

// Platform Channels
export { TelegramChannel } from './telegram/TelegramChannel';
export { default as TelegramChannelDefault } from './telegram/TelegramChannel';
