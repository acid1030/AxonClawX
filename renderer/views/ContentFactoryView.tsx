/**
 * Content Factory View - 智能内容工厂界面
 * 
 * 功能:
 * - 内容类型选择
 * - 参数配置表单
 * - 生成预览
 * - 一键导出
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ContentTemplatesService, ContentTemplate, TemplateField } from '../services/content-templates';
import { ContentFactoryService, GenerationParams, GeneratedContent } from '../services/content-factory';

interface ContentFactoryViewProps {
  onContentGenerated?: (content: GeneratedContent) => void;
}

export const ContentFactoryView: React.FC<ContentFactoryViewProps> = ({
  onContentGenerated,
}) => {
  // 状态管理
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'html' | 'plain' | 'json'>('markdown');
  const [activeTab, setActiveTab] = useState<'create' | 'preview' | 'export'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // 获取所有模板
  const templates = ContentTemplatesService.getBuiltInTemplates();
  
  // 过滤模板
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || template.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  // 平台选项
  const platforms = [
    { value: 'all', label: '全部', icon: '🌐' },
    { value: 'douyin', label: '抖音', icon: '🎵' },
    { value: 'xiaohongshu', label: '小红书', icon: '📕' },
    { value: 'wechat', label: '公众号', icon: '💬' },
    { value: 'zhihu', label: '知乎', icon: '📚' },
    { value: 'bilibili', label: 'B 站', icon: '📺' },
    { value: 'video', label: '通用视频', icon: '🎬' },
    { value: 'ai-art', label: 'AI 绘画', icon: '🎨' },
    { value: 'weibo', label: '微博', icon: '🔵' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
    { value: 'ecommerce', label: '电商', icon: '🛒' },
    { value: 'email', label: '邮件', icon: '📧' },
    { value: 'news', label: '新闻', icon: '📰' },
    { value: 'review', label: '评测', icon: '⭐' },
  ];

  // 处理模板选择
  const handleTemplateSelect = useCallback((template: ContentTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
    setGeneratedContent(null);
    setError(null);
    setActiveTab('create');
  }, []);

  // 处理表单变化
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  // 处理生成
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) {
      setError('请先选择模板');
      return;
    }

    // 验证必填字段
    const validation = ContentTemplatesService.validateTemplateData(selectedTemplate, formData);
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const params: GenerationParams = {
        templateId: selectedTemplate.id,
        topic: formData.topic || formData.title || '未命名内容',
        customFields: formData,
        tone: formData.tone,
        length: 'medium',
        language: 'zh-CN',
      };

      const content = await ContentFactoryService.generateContent(params);
      setGeneratedContent(content);
      onContentGenerated?.(content);
      setActiveTab('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, formData, onContentGenerated]);

  // 处理导出
  const handleExport = useCallback(async () => {
    if (!generatedContent) return;

    try {
      const exported = await ContentFactoryService.exportContent(generatedContent, exportFormat);
      
      // 创建下载
      const blob = new Blob([exported], { 
        type: exportFormat === 'html' ? 'text/html' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content_${generatedContent.id}.${exportFormat === 'html' ? 'html' : exportFormat === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('导出失败，请重试');
    }
  }, [generatedContent, exportFormat]);

  // 处理重新生成
  const handleRegenerate = useCallback(() => {
    setGeneratedContent(null);
    setActiveTab('create');
  }, []);

  // 渲染字段输入
  const renderFieldInput = useCallback((field: TemplateField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="">请选择</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'tags':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="inline-flex items-center mr-2">
                <input
                  type="checkbox"
                  checked={(value as string[])?.includes(option)}
                  onChange={(e) => {
                    const current = (value as string[]) || [];
                    const updated = e.target.checked
                      ? [...current, option]
                      : current.filter((v) => v !== option);
                    handleFieldChange(field.name, updated);
                  }}
                  className="mr-1"
                />
                <span className="text-sm dark:text-white">{option}</span>
              </label>
            ))}
            <input
              type="text"
              value={Array.isArray(value) ? '' : value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        );
    }
  }, [formData, handleFieldChange]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>🏭</span>
          智能内容工厂
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          一键生成多平台内容，提升创作效率
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            创建内容
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            disabled={!generatedContent}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${!generatedContent ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            预览
            {generatedContent && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                {generatedContent.metadata.wordCount}字
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('export')}
            disabled={!generatedContent}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'export'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${!generatedContent ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            导出
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          {activeTab === 'create' && (
            <div className="space-y-6">
              {/* 平台筛选 */}
              <div className="flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.value}
                    onClick={() => setSelectedPlatform(platform.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedPlatform === platform.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {platform.icon} {platform.label}
                  </button>
                ))}
              </div>

              {/* 搜索框 */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索模板..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* 模板选择 */}
              {!selectedTemplate ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{template.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                              {template.platform}
                            </span>
                            <span className="text-xs text-gray-400">
                              {template.fields.length}个字段
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 模板信息 */}
                  <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <span className="text-4xl">{selectedTemplate.icon}</span>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedTemplate.name}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedTemplate.description}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      更换模板
                    </button>
                  </div>

                  {/* 表单 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      内容配置
                    </h3>
                    <div className="space-y-4">
                      {selectedTemplate.fields.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {field.description}
                            </p>
                          )}
                          {renderFieldInput(field)}
                        </div>
                      ))}
                    </div>

                    {/* 错误提示 */}
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">
                          {error}
                        </p>
                      </div>
                    )}

                    {/* 生成按钮 */}
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            生成中...
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            生成内容
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleRegenerate}
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        重置
                      </button>
                    </div>
                  </div>

                  {/* 结构预览 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      内容结构
                    </h3>
                    <div className="space-y-2">
                      {selectedTemplate.structure.sections.map((section, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <span className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium">
                            {index + 1}
                          </span>
                          <span>{section}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview' && generatedContent && (
            <div className="space-y-6">
              {/* 内容预览 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {generatedContent.templateName}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{generatedContent.metadata.wordCount}字</span>
                    <span>{new Date(generatedContent.metadata.generatedAt).toLocaleString('zh-CN')}</span>
                  </div>
                </div>

                {/* 大纲 */}
                {generatedContent.outline && (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      大纲
                    </h3>
                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                      {generatedContent.outline}
                    </pre>
                  </div>
                )}

                {/* 正文 */}
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {generatedContent.content}
                  </pre>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  🔄 重新生成
                </button>
                <button
                  onClick={() => setActiveTab('export')}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                >
                  📥 导出
                </button>
              </div>
            </div>
          )}

          {activeTab === 'export' && generatedContent && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  导出设置
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      导出格式
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: 'markdown', label: 'Markdown', icon: '📝' },
                        { value: 'html', label: 'HTML', icon: '🌐' },
                        { value: 'plain', label: '纯文本', icon: '📄' },
                        { value: 'json', label: 'JSON', icon: '🔧' },
                      ].map((format) => (
                        <button
                          key={format.value}
                          onClick={() => setExportFormat(format.value as any)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            exportFormat === format.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <span className="text-2xl mb-2 block">{format.icon}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {format.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      文件信息
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>文件名：content_{generatedContent.id}.{exportFormat === 'html' ? 'html' : exportFormat === 'json' ? 'json' : 'md'}</p>
                      <p>大小：约 {(generatedContent.content.length / 1024).toFixed(2)} KB</p>
                      <p>字数：{generatedContent.metadata.wordCount}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleExport}
                    className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    下载文件
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentFactoryView;
