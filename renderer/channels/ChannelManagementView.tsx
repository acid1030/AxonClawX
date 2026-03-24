import React, { useState, useEffect } from 'react';
import { ChannelManager } from '../channels/ChannelManager';
import { ChannelConfig, ChannelType, ChannelStatus } from '../channels/types';

interface ChannelManagementViewProps {
  channelManager?: ChannelManager;
}

interface ChannelCardData {
  id: string;
  type: ChannelType;
  name: string;
  subtitle: string;
  description: string;
  status: 'connected' | 'disconnected' | 'configuring';
  statusText: string;
  buttonText: string;
  buttonVariant: 'primary' | 'secondary' | 'disabled';
}

export const ChannelManagementView: React.FC<ChannelManagementViewProps> = ({
  channelManager,
}) => {
  const [channels, setChannels] = useState<ChannelCardData[]>([
    {
      id: 'telegram',
      type: 'telegram',
      name: 'Telegram',
      subtitle: 'Bot API',
      description: 'Bot Token 已配置 · DM 配对完成',
      status: 'connected',
      statusText: '已连接',
      buttonText: '配置',
      buttonVariant: 'secondary',
    },
    {
      id: 'discord',
      type: 'discord',
      name: 'Discord',
      subtitle: 'Bot + Guild',
      description: 'Bot Token、Guild ID',
      status: 'disconnected',
      statusText: '未配置',
      buttonText: '配置向导',
      buttonVariant: 'primary',
    },
    {
      id: 'feishu',
      type: 'feishu',
      name: '飞书',
      subtitle: 'Lark / 企业微信',
      description: 'PIPELINE-4.2 社交/办公集成',
      status: 'disconnected',
      statusText: '未配置',
      buttonText: '即将支持',
      buttonVariant: 'disabled',
    },
  ]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState<ChannelType>('telegram');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCardClass = (type: ChannelType) => {
    switch (type) {
      case 'telegram':
        return 'card-blue';
      case 'discord':
        return 'card-purple';
      case 'feishu':
        return 'card-green';
      default:
        return '';
    }
  };

  const getAccentBarClass = (type: ChannelType) => {
    switch (type) {
      case 'telegram':
        return 'blue';
      case 'discord':
        return 'blue';
      case 'feishu':
        return 'green';
      default:
        return 'blue';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      default:
        return '';
    }
  };

  const getButtonClass = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'btn btn-primary';
      case 'disabled':
        return 'btn cursor-not-allowed opacity-50';
      default:
        return 'btn';
    }
  };

  const handleAddChannel = async (config: ChannelConfig) => {
    setLoading(true);
    setError(null);
    try {
      const manager = channelManager || ChannelManager.getInstance();
      await manager.addChannel(config);
      setIsAddingChannel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelClick = (channelId: string) => {
    setSelectedChannel(channelId);
  };

  const handleConfigure = (channelId: string) => {
    console.log('Configure channel:', channelId);
  };

  const handleTest = (channelId: string) => {
    console.log('Test channel:', channelId);
  };

  return (
    <div className="p-6 min-h-full">
      {/* Header - ClawDeckX 风格 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Channel 管理</h1>
          <p className="text-sm text-gray-400">连接消息平台 · StepWizard 配置向导</p>
        </div>
        <button
          onClick={() => setIsAddingChannel(true)}
          className="px-4 py-2 bg-[#0a84ff] hover:bg-[#0070e0] text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加 Channel
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg text-red-400 border border-red-500/30" style={{ background: 'rgba(255,69,58,0.1)' }}>
          {error}
        </div>
      )}

      {/* Channel Grid - 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="rounded-xl p-5 transition-all duration-200 cursor-pointer hover:border-[#484f58]"
            style={{
              background: channel.type === 'telegram' ? 'rgba(22, 45, 72, 0.6)' :
                         channel.type === 'discord' ? 'rgba(35, 30, 55, 0.6)' :
                         channel.type === 'feishu' ? 'rgba(20, 45, 45, 0.6)' : 'var(--bg-card)',
              border: '1px solid',
              borderColor: channel.type === 'telegram' ? 'rgba(10, 132, 255, 0.25)' :
                          channel.type === 'discord' ? 'rgba(191, 90, 242, 0.25)' :
                          channel.type === 'feishu' ? 'rgba(48, 209, 88, 0.2)' : 'var(--border)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => handleChannelClick(channel.id)}
          >
            {/* Accent Bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: channel.type === 'telegram' ? 'linear-gradient(90deg, #0A84FF, #5E5CE6)' :
                           channel.type === 'discord' ? 'linear-gradient(90deg, #0A84FF, #5E5CE6)' :
                           channel.type === 'feishu' ? 'linear-gradient(90deg, #30D158, #32D74B)' : 'var(--accent)',
              }}
            />

            {/* Card Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  {channel.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{channel.subtitle}</p>
              </div>
              <span
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  background: channel.status === 'connected' ? 'rgba(48,209,88,0.15)' : 'var(--bg-elevated)',
                  color: channel.status === 'connected' ? 'var(--accent-green)' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: channel.status === 'connected' ? 'rgba(48,209,88,0.25)' : 'var(--border)',
                }}
              >
                {channel.statusText}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-400 mb-4">{channel.description}</p>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {channel.type === 'telegram' ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfigure(channel.id);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    配置
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTest(channel.id);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    测试
                  </button>
                </>
              ) : channel.type === 'discord' ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfigure(channel.id);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors text-white"
                  style={{
                    background: 'var(--accent)',
                    border: '1px solid var(--accent)',
                  }}
                >
                  配置向导
                </button>
              ) : (
                <button
                  onClick={(e) => e.stopPropagation()}
                  disabled
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors cursor-not-allowed opacity-50"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  即将支持
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Channel Modal */}
      {isAddingChannel && (
        <AddChannelModal
          channelType={newChannelType}
          onChannelTypeChange={setNewChannelType}
          onAdd={handleAddChannel}
          onCancel={() => setIsAddingChannel(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

interface AddChannelModalProps {
  channelType: ChannelType;
  onChannelTypeChange: (type: ChannelType) => void;
  onAdd: (config: ChannelConfig) => void;
  onCancel: () => void;
  loading: boolean;
}

const AddChannelModal: React.FC<AddChannelModalProps> = ({
  channelType,
  onChannelTypeChange,
  onAdd,
  onCancel,
  loading,
}) => {
  const [name, setName] = useState('');
  const [config, setConfig] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      type: channelType,
      enabled: true,
      status: 'disconnected',
      config,
    } as any);
  };

  const renderConfigFields = () => {
    switch (channelType) {
      case 'telegram':
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Bot Token *
              </label>
              <input
                type="password"
                value={config.botToken || ''}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Webhook URL (可选)
              </label>
              <input
                type="url"
                value={config.webhookUrl || ''}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="https://your-domain.com/webhook"
              />
            </div>
          </>
        );

      case 'discord':
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Bot Token *
              </label>
              <input
                type="password"
                value={config.botToken || ''}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GHIJKL.mnopqrstuvwxyz"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Application ID (可选)
              </label>
              <input
                type="text"
                value={config.applicationId || ''}
                onChange={(e) => setConfig({ ...config, applicationId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </>
        );

      case 'whatsapp':
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                API Token *
              </label>
              <input
                type="password"
                value={config.apiToken || ''}
                onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Phone Number ID *
              </label>
              <input
                type="text"
                value={config.phoneNumberId || ''}
                onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Business Account ID *
              </label>
              <input
                type="text"
                value={config.businessAccountId || ''}
                onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                required
              />
            </div>
          </>
        );

      case 'slack':
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Bot Token *
              </label>
              <input
                type="password"
                value={config.botToken || ''}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="xoxb-..."
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Signing Secret (可选)
              </label>
              <input
                type="password"
                value={config.signingSecret || ''}
                onChange={(e) => setConfig({ ...config, signingSecret: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <h2 className="text-lg font-semibold mb-4 text-white">添加新 Channel</h2>

        <form onSubmit={handleSubmit}>
          {/* Channel Type Selection */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              平台类型 *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['telegram', 'whatsapp', 'discord', 'slack'] as ChannelType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChannelTypeChange(type)}
                  className="p-3 rounded-lg border transition-all text-sm"
                  style={{
                    background: channelType === type ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    borderColor: channelType === type ? 'var(--accent)' : 'var(--border)',
                    color: channelType === type ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  <div className="text-xl mb-1">
                    {type === 'telegram' ? '✈️' : type === 'whatsapp' ? '📱' : type === 'discord' ? '🎮' : '💼'}
                  </div>
                  <div className="capitalize">{type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Channel Name */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Channel 名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              placeholder="例如：我的 Telegram Bot"
              required
            />
          </div>

          {/* Platform-specific Config */}
          {renderConfigFields()}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg text-sm text-white transition-colors"
              style={{
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}
              disabled={loading || !name}
            >
              {loading ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChannelManagementView;
