import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Key, Globe, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'google' | 'azure' | 'local';
  apiKey?: string;
  endpoint?: string;
  isActive: boolean;
  status: 'connected' | 'disconnected' | 'configuring';
}

export function ModelSettings() {
  const { t } = useTranslation('views');
  const [models, setModels] = useState<ModelConfig[]>([
    {
      id: 'claude-1',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      isActive: true,
      status: 'connected',
    },
    {
      id: 'gemini-1',
      name: 'Gemini Pro',
      provider: 'google',
      isActive: false,
      status: 'disconnected',
    },
    {
      id: 'qwen-1',
      name: 'Qwen 2.5',
      provider: 'azure',
      isActive: false,
      status: 'disconnected',
    },
  ]);

  const [selectedModel, setSelectedModel] = useState<string>('claude-1');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: 调用 API 保存配置
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleTestConnection = async (modelId: string) => {
    // TODO: 测试连接
    console.log('Testing connection for:', modelId);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'anthropic':
        return <Cpu className="w-4 h-4" />;
      case 'google':
        return <Globe className="w-4 h-4" />;
      default:
        return <Key className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">{t('modelSettings.connected')}</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">{t('modelSettings.disconnected')}</Badge>;
      case 'configuring':
        return <Badge variant="outline">{t('modelSettings.configuring')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{t('modelSettings.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('modelSettings.subtitle')}</p>
      </div>

      {/* 模型列表 */}
      <div className="grid gap-4">
        {models.map((model) => (
          <Card
            key={model.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedModel === model.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedModel(model.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  {getProviderIcon(model.provider)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{model.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{model.provider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(model.status)}
                {model.isActive && (
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">{t('modelSettings.default')}</Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 配置表单 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('modelSettings.details')}</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative mt-1">
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Key className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <Label htmlFor="endpoint">{t('modelSettings.endpointOptional')}</Label>
            <Input
              id="endpoint"
              type="url"
              placeholder="https://api.example.com/v1"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('modelSettings.saving')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('modelSettings.save')}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTestConnection(selectedModel)}
            >
              {t('modelSettings.testConnection')}
            </Button>
          </div>
        </div>
      </Card>

      {/* 帮助信息 */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">{t('modelSettings.getApiKey')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('modelSettings.getApiKeyDesc')}
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Anthropic: https://console.anthropic.com</li>
              <li>• Google: https://makersuite.google.com</li>
              <li>• Azure: https://portal.azure.com</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
