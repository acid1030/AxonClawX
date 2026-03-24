# 智能内容工厂 (Content Factory)

智能内容工厂是 AxonClaw 的核心差异化功能，提供一站式内容生成解决方案。

## 📁 文件结构

```
src/renderer/
├── services/
│   ├── content-factory.ts      # 内容生成引擎
│   └── content-templates.ts    # 模板管理系统
├── views/
│   └── ContentFactoryView.tsx  # 内容工厂 UI 界面
└── templates/                   # 内置模板 (10 个)
    ├── xiaohongshu-note.json
    ├── wechat-article.json
    ├── zhihu-answer.json
    ├── video-script.json
    ├── ai-art-prompt.json
    ├── weibo-post.json
    ├── ecommerce-detail.json
    ├── email-marketing.json
    ├── press-release.json
    └── product-review.json
```

## 🚀 核心功能

### 1. 内容生成引擎 (content-factory.ts)

**功能特性:**
- ✅ 文章生成 (主题→大纲→正文)
- ✅ 视频脚本生成
- ✅ AI 绘画提示词生成
- ✅ 多平台内容适配

**使用示例:**

```typescript
import { ContentFactoryService } from './content-factory';

// 生成内容
const content = await ContentFactoryService.generateContent({
  templateId: 'xiaohongshu-note',
  topic: '冬季护肤必备',
  customFields: {
    targetAudience: '25-35 岁职场女性',
    tone: '亲切姐妹风',
    keyPoints: '保湿\n抗老\n美白',
    callToAction: '评论区告诉我你的护肤心得～',
  },
});

// 生成大纲
const outline = await ContentFactoryService.generateOutline({
  templateId: 'video-script',
  topic: 'AI 工具测评',
});

// 多平台适配
const multiPlatform = await ContentFactoryService.generateMultiPlatform(
  { topic: '新品发布' },
  ['xiaohongshu', 'wechat', 'weibo']
);

// 导出内容
const markdown = await ContentFactoryService.exportContent(content, 'markdown');
const html = await ContentFactoryService.exportContent(content, 'html');
```

### 2. 内容模板系统 (content-templates.ts)

**功能特性:**
- ✅ 模板定义 (JSON Schema)
- ✅ 模板加载/保存
- ✅ 模板预览
- ✅ 内置模板 (10+ 个)

**使用示例:**

```typescript
import { ContentTemplatesService } from './content-templates';

// 获取所有模板
const templates = ContentTemplatesService.getBuiltInTemplates();

// 根据 ID 获取模板
const template = ContentTemplatesService.getTemplateById('xiaohongshu-note');

// 根据平台获取模板
const xiaohongshuTemplates = ContentTemplatesService.getTemplatesByPlatform('xiaohongshu');

// 搜索模板
const results = ContentTemplatesService.searchTemplates('视频');

// 获取模板预览
const preview = ContentTemplatesService.getTemplatePreview(template);

// 验证数据
const validation = ContentTemplatesService.validateTemplateData(template, formData);
```

### 3. UI 界面 (ContentFactoryView.tsx)

**功能特性:**
- ✅ 内容类型选择 (10 个平台模板)
- ✅ 参数配置表单 (动态渲染)
- ✅ 生成预览 (大纲 + 正文)
- ✅ 一键导出 (Markdown/HTML/纯文本/JSON)

**使用示例:**

```tsx
import { ContentFactoryView } from './views/ContentFactoryView';

function App() {
  const handleContentGenerated = (content) => {
    console.log('生成的内容:', content);
  };

  return (
    <ContentFactoryView onContentGenerated={handleContentGenerated} />
  );
}
```

## 📋 内置模板清单

| 序号 | 模板名称 | 平台 | 图标 | 输出格式 |
|------|----------|------|------|----------|
| 1 | 小红书笔记 | xiaohongshu | 📕 | Markdown |
| 2 | 公众号文章 | wechat | 💬 | Markdown |
| 3 | 知乎回答 | zhihu | 📚 | Markdown |
| 4 | 视频脚本 | video | 🎬 | Script |
| 5 | AI 绘画提示词 | ai-art | 🎨 | Plain |
| 6 | 微博文案 | weibo | 🔵 | Plain |
| 7 | 电商详情页 | ecommerce | 🛒 | HTML |
| 8 | 邮件营销 | email | 📧 | HTML |
| 9 | 新闻稿 | news | 📰 | Markdown |
| 10 | 产品评测 | review | ⭐ | Markdown |

## 🎯 使用流程

1. **选择模板** - 从 10 个内置模板中选择适合的平台和内容类型
2. **填写参数** - 根据模板字段填写主题、语气、核心内容等
3. **生成大纲** - 系统自动生成内容结构大纲
4. **生成正文** - AI 根据大纲和参数生成完整内容
5. **预览编辑** - 在预览界面查看和编辑生成的内容
6. **导出使用** - 一键导出为 Markdown/HTML/纯文本/JSON 格式

## 🔧 扩展开发

### 添加新模板

1. 在 `templates/` 目录创建新的 JSON 文件
2. 在 `content-templates.ts` 的 `getBuiltInTemplates()` 中添加模板定义
3. 在 `content-factory.ts` 中添加对应的内容生成方法

### 自定义内容生成

```typescript
// 扩展 ContentFactoryService
class CustomContentFactory extends ContentFactoryService {
  protected static async generateContentFromBody(
    params: GenerationParams,
    outline: OutlineItem[]
  ): Promise<string> {
    // 调用自定义 AI 模型
    const aiResponse = await callCustomAI(params, outline);
    return aiResponse.content;
  }
}
```

## 📊 验收标准

- ✅ 内容生成正常 - 各平台模板都能生成符合格式的内容
- ✅ 模板可加载/应用 - 10 个模板都能正常加载和使用
- ✅ UI 符合设计规范 - 界面美观、易用、响应式
- ✅ 导出功能正常 - 支持 4 种格式导出，文件可正常打开

## 📝 注意事项

1. **AI 集成** - 当前版本使用模板化内容生成，实际使用时需集成 AI 模型 API
2. **模板扩展** - 可根据业务需求添加更多平台模板
3. **内容审核** - 生成的内容建议经过人工审核后再发布
4. **性能优化** - 大批量生成时建议添加队列和缓存机制

## 🔗 相关文档

- [技能文档](../../../docs/skills/content-factory/SKILL.md)
- [API 设计](../../../docs/api/content-factory.md)

---

**版本**: 1.0.0  
**最后更新**: 2024-03-12  
**维护者**: AxonClaw Team
