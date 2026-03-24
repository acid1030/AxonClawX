/**
 * Content Factory Service - 内容生成引擎
 * 
 * 功能:
 * - 文章生成 (主题→大纲→正文)
 * - 视频脚本生成
 * - AI 绘画提示词生成
 * - 多平台内容适配 (小红书/公众号/知乎)
 */

import { ContentTemplate, ContentTemplatesService } from './content-templates';

export interface GenerationParams {
  templateId: string;
  topic: string;
  customFields?: Record<string, any>;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  language?: 'zh-CN' | 'en-US';
}

export type ContentPlatform = 
  | 'douyin'
  | 'xiaohongshu'
  | 'wechat'
  | 'zhihu'
  | 'weibo'
  | 'video'
  | 'bilibili'
  | 'ai-art'
  | 'ecommerce'
  | 'email'
  | 'news'
  | 'review'
  | 'linkedin'
  | 'twitter';

export interface GeneratedContent {
  id: string;
  templateId: string;
  templateName: string;
  topic: string;
  content: string;
  outline?: string;
  metadata: {
    wordCount: number;
    platform: string;
    generatedAt: string;
    params: GenerationParams;
  };
  variants?: GeneratedContent[];
}

export interface OutlineItem {
  title: string;
  description?: string;
  subItems?: OutlineItem[];
}

export class ContentFactoryService {
  /**
   * 生成内容大纲
   */
  public static async generateOutline(params: GenerationParams): Promise<OutlineItem[]> {
    const template = ContentTemplatesService.getTemplateById(params.templateId);
    if (!template) {
      throw new Error(`模板不存在：${params.templateId}`);
    }

    // 根据模板类型生成不同的大纲结构
    switch (template.platform) {
      case 'douyin':
        return this.generateDouyinOutline(params);
      case 'xiaohongshu':
        return this.generateXiaohongshuOutline(params);
      case 'wechat':
        return this.generateWechatOutline(params);
      case 'zhihu':
        return this.generateZhihuOutline(params);
      case 'video':
        return this.generateVideoOutline(params);
      case 'bilibili':
        return this.generateBilibiliOutline(params);
      case 'ai-art':
        return this.generateAiArtOutline(params);
      case 'linkedin':
        return this.generateLinkedinOutline(params);
      case 'twitter':
        return this.generateTwitterOutline(params);
      default:
        return this.generateDefaultOutline(params);
    }
  }

  /**
   * 生成完整内容
   */
  public static async generateContent(params: GenerationParams): Promise<GeneratedContent> {
    const template = ContentTemplatesService.getTemplateById(params.templateId);
    if (!template) {
      throw new Error(`模板不存在：${params.templateId}`);
    }

    // 先生成大纲
    const outline = await this.generateOutline(params);
    
    // 再生成正文
    const content = await this.generateContentFromBody(params, outline);

    return {
      id: this.generateId(),
      templateId: params.templateId,
      templateName: template.name,
      topic: params.topic,
      content,
      outline: this.formatOutline(outline),
      metadata: {
        wordCount: this.countWords(content),
        platform: template.platform,
        generatedAt: new Date().toISOString(),
        params,
      },
    };
  }

  /**
   * 生成多平台适配版本
   */
  public static async generateMultiPlatform(
    baseParams: GenerationParams,
    platforms: ContentTemplate['platform'][]
  ): Promise<Record<string, GeneratedContent>> {
    const results: Record<string, GeneratedContent> = {};

    for (const platform of platforms) {
      const templates = ContentTemplatesService.getTemplatesByPlatform(platform);
      if (templates.length > 0) {
        const params: GenerationParams = {
          ...baseParams,
          templateId: templates[0].id,
        };
        results[platform] = await this.generateContent(params);
      }
    }

    return results;
  }

  /**
   * 导出内容
   */
  public static async exportContent(
    content: GeneratedContent,
    format: 'markdown' | 'html' | 'plain' | 'json'
  ): Promise<string> {
    switch (format) {
      case 'markdown':
        return this.exportAsMarkdown(content);
      case 'html':
        return this.exportAsHtml(content);
      case 'plain':
        return this.exportAsPlain(content);
      case 'json':
        return JSON.stringify(content, null, 2);
      default:
        return content.content;
    }
  }

  // ==================== 私有方法 ====================

  private static generateId(): string {
    return `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static countWords(text: string): number {
    // 中文按字符数，英文按单词数
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }

  private static formatOutline(outline: OutlineItem[]): string {
    const formatItem = (item: OutlineItem, level: number = 1): string => {
      const indent = '  '.repeat(level - 1);
      const prefix = level === 1 ? '#' : level === 2 ? '##' : '###';
      let result = `${indent}${prefix} ${item.title}`;
      if (item.description) {
        result += `\n${indent}  ${item.description}`;
      }
      if (item.subItems) {
        result += '\n' + item.subItems.map((sub) => formatItem(sub, level + 1)).join('\n');
      }
      return result;
    };

    return outline.map((item) => formatItem(item)).join('\n\n');
  }

  // ==================== 各平台大纲生成 ====================

  private static async generateDouyinOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '黄金 3 秒钩子',
        description: '用悬念/冲突/结果瞬间抓住观众',
      },
      {
        title: '引入 (3-10s)',
        description: '快速说明视频主题和观众收益',
      },
      {
        title: '核心内容 (10-45s)',
        description: '1-2 个核心信息点，简洁有力',
        subItems: [
          { title: '信息点 1', description: '核心内容 + 画面说明' },
          { title: '信息点 2', description: '核心内容 + 画面说明' },
        ],
      },
      {
        title: '高潮/反转',
        description: '制造情绪高点或意外转折',
      },
      {
        title: '结尾 CTA',
        description: '引导点赞、关注、评论',
      },
    ];
  }

  private static async generateXiaohongshuOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '标题设计',
        description: '包含 emoji 的吸睛标题，20 字以内',
      },
      {
        title: '开头引入',
        description: '用痛点/场景/结果吸引读者继续看',
      },
      {
        title: '核心内容',
        description: '分点列出 3-5 个核心卖点或干货',
        subItems: [
          { title: '卖点 1', description: '具体描述 + 使用感受' },
          { title: '卖点 2', description: '具体描述 + 使用感受' },
          { title: '卖点 3', description: '具体描述 + 使用感受' },
        ],
      },
      {
        title: '使用体验',
        description: '真实感受和效果展示',
      },
      {
        title: '互动引导',
        description: '引导评论、点赞、收藏',
      },
      {
        title: '标签',
        description: '5-10 个相关话题标签',
      },
    ];
  }

  private static async generateWechatOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '标题',
        description: '主标题 + 副标题，制造悬念或痛点',
      },
      {
        title: '引言',
        description: '用故事/数据/痛点引入主题',
      },
      {
        title: '正文第一部分',
        description: '问题阐述或背景介绍',
      },
      {
        title: '正文第二部分',
        description: '核心观点和方法论',
      },
      {
        title: '正文第三部分',
        description: '案例分析和数据支撑',
      },
      {
        title: '总结',
        description: '观点升华和金句收尾',
      },
    ];
  }

  private static async generateZhihuOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '身份介绍',
        description: '简短说明专业背景，建立信任',
      },
      {
        title: '核心观点',
        description: '直接亮出核心论点',
      },
      {
        title: '论证一',
        description: '第一个分论点 + 论据',
      },
      {
        title: '论证二',
        description: '第二个分论点 + 论据',
      },
      {
        title: '论证三',
        description: '第三个分论点 + 论据',
      },
      {
        title: '总结建议',
        description: ' actionable 的建议或结论',
      },
    ];
  }

  private static async generateVideoOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '开场钩子 (0-3s)',
        description: '用悬念/冲突/结果吸引观众',
      },
      {
        title: '引入 (3-15s)',
        description: '说明视频主题和观众收益',
      },
      {
        title: '主体内容',
        description: '核心信息点，分 3-5 个部分',
        subItems: [
          { title: '信息点 1', description: '核心内容 + 画面说明' },
          { title: '信息点 2', description: '核心内容 + 画面说明' },
          { title: '信息点 3', description: '核心内容 + 画面说明' },
        ],
      },
      {
        title: '高潮/转折',
        description: '制造情绪高点或意外转折',
      },
      {
        title: '结尾 CTA',
        description: '引导点赞、关注、评论',
      },
    ];
  }

  private static async generateBilibiliOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '开场白 + 自我介绍',
        description: '大家好，我是 XXX，建立人设',
      },
      {
        title: '引入主题 (30s)',
        description: '说明本期视频主题和观众收益',
      },
      {
        title: '主体内容',
        description: '分 3-5 个部分深度讲解',
        subItems: [
          { title: '第一部分', description: '核心内容 + 弹幕互动点设计' },
          { title: '第二部分', description: '核心内容 + 弹幕互动点设计' },
          { title: '第三部分', description: '核心内容 + 弹幕互动点设计' },
        ],
      },
      {
        title: '弹幕互动设计',
        description: '设计"前方高能"等弹幕互动点',
      },
      {
        title: '总结 + 一键三连',
        description: '总结本期内容，引导点赞投币收藏',
      },
    ];
  }

  private static async generateLinkedinOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '吸睛开头',
        description: '用问题/数据/观点吸引注意',
      },
      {
        title: '核心观点',
        description: '直接亮出核心论点',
      },
      {
        title: '案例/数据支撑',
        description: '用实际案例或数据论证观点',
      },
      {
        title: '总结启发',
        description: '提炼可复用的经验或建议',
      },
      {
        title: '互动引导',
        description: '引导评论讨论',
      },
    ];
  }

  private static async generateTwitterOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '钩子推文 (1/?)',
        description: '吸引读者继续看的开头',
      },
      {
        title: '要点展开 (2-?/?)',
        description: '分条展开核心要点，每条 280 字符内',
        subItems: [
          { title: '要点 1', description: '核心内容' },
          { title: '要点 2', description: '核心内容' },
          { title: '要点 3', description: '核心内容' },
        ],
      },
      {
        title: '总结 + CTA (最后一条)',
        description: '总结全文，引导关注',
      },
    ];
  }

  private static async generateAiArtOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '主体描述',
        description: '清晰描述画面主体',
      },
      {
        title: '风格定义',
        description: '艺术风格和画风',
      },
      {
        title: '环境设定',
        description: '背景和场景',
      },
      {
        title: '光线和色彩',
        description: '光照效果和色调',
      },
      {
        title: '构图和视角',
        description: '镜头角度和构图方式',
      },
      {
        title: '质量参数',
        description: 'MJ/SD 参数设置',
      },
    ];
  }

  private static async generateDefaultOutline(params: GenerationParams): Promise<OutlineItem[]> {
    return [
      {
        title: '引言',
        description: '引入主题',
      },
      {
        title: '主体内容',
        description: '核心信息',
      },
      {
        title: '总结',
        description: '结论和建议',
      },
    ];
  }

  // ==================== 内容生成方法 ====================

  private static async generateContentFromBody(
    params: GenerationParams,
    outline: OutlineItem[]
  ): Promise<string> {
    const template = ContentTemplatesService.getTemplateById(params.templateId);
    if (!template) {
      throw new Error('模板不存在');
    }

    // 这里实际应该调用 AI 模型生成内容
    // 目前返回一个模板化的内容框架
    return this.generateTemplateContent(template, params, outline);
  }

  private static generateTemplateContent(
    template: ContentTemplate,
    params: GenerationParams,
    outline: OutlineItem[]
  ): string {
    const { topic, customFields } = params;

    switch (template.platform) {
      case 'douyin':
        return this.generateDouyinContent(topic, customFields, outline);
      case 'xiaohongshu':
        return this.generateXiaohongshuContent(topic, customFields, outline);
      case 'wechat':
        return this.generateWechatContent(topic, customFields, outline);
      case 'zhihu':
        return this.generateZhihuContent(topic, customFields, outline);
      case 'video':
        return this.generateVideoContent(topic, customFields, outline);
      case 'bilibili':
        return this.generateBilibiliContent(topic, customFields, outline);
      case 'ai-art':
        return this.generateAiArtContent(topic, customFields, outline);
      case 'weibo':
        return this.generateWeiboContent(topic, customFields, outline);
      case 'ecommerce':
        return this.generateEcommerceContent(topic, customFields, outline);
      case 'email':
        return this.generateEmailContent(topic, customFields, outline);
      case 'news':
        return this.generateNewsContent(topic, customFields, outline);
      case 'review':
        return this.generateReviewContent(topic, customFields, outline);
      case 'linkedin':
        return this.generateLinkedinContent(topic, customFields, outline);
      case 'twitter':
        return this.generateTwitterContent(topic, customFields, outline);
      default:
        return this.generateGenericContent(topic, customFields, outline);
    }
  }

  private static generateDouyinContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { videoType, duration, hook, keyContent, bgm, cta } = fields || {};

    return `
# 🎵 抖音短视频脚本：${topic}

**类型**: ${videoType} | **时长**: ${duration} | **BGM**: ${bgm || '节奏感强的热门 BGM'}

---

## 【0-3s】黄金钩子

${hook || '（设计一个瞬间抓住观众的开头）'}

**画面**: 
**台词**: 
**特效**: 

---

## 【3-10s】引入

**画面**: 
**台词**: 今天我们来...
**字幕**: 

---

## 【10-45s】核心内容

${keyContent?.split('\n').map((content: string, i: number) => `
### 信息点${i + 1}
**画面**: 
**台词**: ${content}
**字幕**: 
**时长**: 10-15s
`).join('\n') || '（填写核心内容）'}

---

## 【结尾 CTA】

${cta || '关注我，每天学一个技巧！'}

**画面**: 
**台词**: 
    `.trim();
  }

  private static generateXiaohongshuContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { topic: t, targetAudience, tone, keyPoints, callToAction } = fields || {};
    
    return `
# ✨ ${topic} | ${targetAudience || '必看'}

👋 ${tone === '亲切姐妹风' ? '姐妹们' : tone === '专业干货风' ? '大家好' : '宝子们'}！

今天必须跟你们分享${topic}！真的太好用了/太好看了/太值得了！

---

## 🌟 为什么推荐它？

${keyPoints?.split('\n').map((point: string, i: number) => `${i + 1}. ${point}`).join('\n') || '1. 亮点一\n2. 亮点二\n3. 亮点三'}

---

## 💭 我的真实感受

用了一段时间，真心觉得...（这里填写真实使用感受）

---

${callToAction || '你们有什么想问的评论区告诉我～'}

#${topic?.replace(/\s/g, '')} #好物分享 #种草 #推荐
    `.trim();
  }

  private static generateWechatContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { title, subtitle, outline: outlineText, keywords } = fields || {};

    return `
# ${title || topic}

${subtitle ? `> ${subtitle}` : ''}

---

## 引言

（这里写引言，用痛点/故事/数据引入主题）

---

## 一、（小标题 1）

正文内容...

---

## 二、（小标题 2）

正文内容...

---

## 三、（小标题 3）

正文内容...

---

## 总结

（总结升华，金句收尾）

---

*关键词：${keywords || topic}*
    `.trim();
  }

  private static generateZhihuContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { question, expertise, viewpoint, evidence, tone } = fields || {};

    return `
${expertise ? `**${expertise}**\n\n` : ''}

谢邀。

${viewpoint || `关于"${question || topic}"，我的核心观点是：...`}

---

## 一、（分论点 1）

${evidence?.split('\n')[0] || '论据和案例说明...'}

---

## 二、（分论点 2）

${evidence?.split('\n')[1] || '论据和案例说明...'}

---

## 三、（分论点 3）

${evidence?.split('\n')[2] || '论据和案例说明...'}

---

## 总结

${tone === '专业严谨' ? '综上所述' : tone === '幽默风趣' ? '最后说句题外话' : '总之'}，（总结建议）
    `.trim();
  }

  private static generateVideoContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { videoType, duration, hook, keyContent, cta } = fields || {};

    return `
# 🎬 视频脚本：${topic}

**类型**: ${videoType} | **时长**: ${duration}

---

## 【0-3s】开场钩子

${hook || '（设计一个吸引观众的开头）'}

**画面**: 
**台词**: 
**BGM**: 

---

## 【3-15s】引入

**画面**: 
**台词**: 今天我们来聊聊${topic}...
**BGM**: 

---

## 【主体内容】

${keyContent?.split('\n').map((content: string, i: number) => `
### 信息点${i + 1}
**画面**: 
**台词**: ${content}
**时长**: 15-30s
`).join('\n') || '（填写核心内容）'}

---

## 【结尾 CTA】

${cta || '记得点赞关注哦～'}

**画面**: 
**台词**: 
    `.trim();
  }

  private static generateBilibiliContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { videoType, duration, hook, keyContent, interactionPoints, cta } = fields || {};

    return `
# 📺 B 站中长视频脚本：${topic}

**类型**: ${videoType} | **时长**: ${duration}

---

## 【开场】自我介绍

大家好，我是 XXX，今天我们来深度解析${topic}...

**画面**: 
**台词**: 
**BGM**: 

---

## 【引入】(0-30s)

${hook || '（引入主题，说明观众收益）'}

**画面**: 
**台词**: 

---

## 【主体内容】

${keyContent?.split('\n').map((content: string, i: number) => `
### 第${i + 1}部分
**画面**: 
**台词**: ${content}
**弹幕互动点**: ${interactionPoints?.split('\n')[i] || '这里可以发...'}
**时长**: 1-2 分钟
`).join('\n') || '（填写核心内容）'}

---

## 【结尾】总结 + 一键三连

${cta || '如果觉得这期视频有帮助，请一键三连支持一下！'}

**画面**: 
**台词**: 
    `.trim();
  }

  private static generateLinkedinContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { tone, hook, mainContent, cta, hashtags } = fields || {};

    return `
${hook || `关于"${topic}"，我想分享一些思考...`}

---

${mainContent || '（分享你的专业见解、经验或案例）'}

---

${cta || '你怎么看？欢迎在评论区讨论。'}

${hashtags?.map((tag: string) => tag).join(' ') || '#职业发展 #行业洞察 #专业成长'}
    `.trim();
  }

  private static generateTwitterContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { tweetCount, hook, keyPoints, cta } = fields || {};

    const points = keyPoints?.split('\n') || ['核心要点 1', '核心要点 2', '核心要点 3'];
    
    let thread = `1/${Math.min(points.length + 1, 10)} ${hook || `关于"${topic}"，一个值得分享的思考：`}\n\n`;
    
    points.forEach((point: string, i: number) => {
      thread += `${i + 2}/${Math.min(points.length + 1, 10)} ${point}\n\n`;
    });
    
    thread += `${points.length + 1}/${Math.min(points.length + 1, 10)} ${cta || '关注我，获取更多干货！'}`;

    return `
# 🐦 Twitter/X 推文串：${topic}

${thread}
    `.trim();
  }

  private static generateAiArtContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { subject, style, environment, lighting, color, quality } = fields || {};

    const stylePrompts: Record<string, string> = {
      '写实': 'photorealistic, highly detailed',
      '动漫': 'anime style, cel shaded',
      '油画': 'oil painting, textured brushstrokes',
      '水彩': 'watercolor painting, soft edges',
      '赛博朋克': 'cyberpunk, neon lights, futuristic',
      '奇幻': 'fantasy art, magical atmosphere',
      '极简': 'minimalist, clean lines',
    };

    const lightingPrompts: Record<string, string> = {
      '自然光': 'natural lighting, soft shadows',
      '逆光': 'backlighting, rim light',
      '侧光': 'side lighting, dramatic shadows',
      '柔光': 'soft diffused lighting',
      '霓虹灯': 'neon lighting, colorful glow',
      '烛光': 'candlelight, warm ambiance',
    };

    return `
# 🎨 AI 绘画提示词

## 中文描述
${subject}, ${style}, ${environment}, ${lighting}, ${color}

---

## English Prompt

${subject || 'subject'}, ${stylePrompts[style as string] || 'detailed'}, ${environment || 'background'}, ${lightingPrompts[lighting as string] || 'lighting'}, ${color || 'color palette'}, ${quality?.join(', ') || '8k, ultra-detailed, masterpiece'}

---

## Midjourney 格式

\`\`\`
/imagine prompt: ${subject || 'subject'}, ${stylePrompts[style as string] || 'detailed'}, ${environment || 'background'}, ${lightingPrompts[lighting as string] || 'lighting'}, ${color || 'color palette'}, ${quality?.join(', ') || '8k, ultra-detailed, masterpiece'} --ar 16:9 --v 6
\`\`\`

---

## Stable Diffusion 格式

\`\`\`
Positive: ${subject || 'subject'}, ${stylePrompts[style as string] || 'detailed'}, ${environment || 'background'}, ${lightingPrompts[lighting as string] || 'lighting'}, ${color || 'color palette'}, ${quality?.join(', ') || '8k, ultra-detailed, masterpiece'}
Negative: low quality, worst quality, blurry, deformed, ugly
Steps: 30, CFG scale: 7, Sampler: DPM++ 2M Karras
\`\`\`
    `.trim();
  }

  private static generateWeiboContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { tone, keyMessage, hashtags, mention } = fields || {};

    return `
${keyMessage || `关于${topic}，想说几句...`}

${hashtags?.map((tag: string) => tag).join(' ') || '#今日分享#'}

${mention || ''}
    `.trim();
  }

  private static generateEcommerceContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { productName, targetCustomer, sellingPoints, specifications, useScenarios, faq } = fields || {};

    return `
# ${productName || topic}

## 产品亮点

${sellingPoints?.split('\n').map((point: string) => `✓ ${point}`).join('\n') || '• 亮点一\n• 亮点二\n• 亮点三'}

---

## 适合人群

${targetCustomer || '追求品质生活的您'}

---

## 规格参数

${specifications || '详见商品详情页'}

---

## 使用场景

${useScenarios || '日常使用、送礼、自用皆宜'}

---

## 常见问题

${faq || 'Q: 有保修吗？\nA: 提供一年质保服务'}
    `.trim();
  }

  private static generateEmailContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { emailType, subject, recipient, mainOffer, cta, urgency } = fields || {};

    return `
主题：${subject || topic}

---

尊敬的${recipient || '用户'}：

您好！

${mainOffer || '我们有一个特别的好消息要告诉您...'}

${urgency ? `⏰ ${urgency}` : ''}

---

[${cta || '立即查看'}]

---

祝好，
[您的团队]
    `.trim();
  }

  private static generateNewsContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { headline, dateline, leadParagraph, bodyContent, boilerplate, mediaContact } = fields || {};

    return `
# ${headline || topic}

${dateline || ''}

${leadParagraph || '（导语：5W1H 核心信息）'}

---

${bodyContent || '（正文详细内容）'}

---

## 关于${topic}

${boilerplate || '（公司/组织简介）'}

---

**媒体联系**: ${mediaContact || '请联系...'}
    `.trim();
  }

  private static generateReviewContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    const { productName, category, priceRange, testDuration, pros, cons, verdict, rating } = fields || {};

    return `
# ⭐ ${productName || topic} 评测

**类别**: ${category || '-'} | **价格**: ${priceRange || '-'} | **测试时长**: ${testDuration || '-'}

---

## ✅ 优点

${pros?.split('\n').map((pro: string) => `✓ ${pro}`).join('\n') || '• 优点一\n• 优点二\n• 优点三'}

---

## ❌ 不足

${cons?.split('\n').map((con: string) => `✗ ${con}`).join('\n') || '• 暂无明显不足'}

---

## 💡 总结建议

${verdict || '总体来说，这款产品...'}

---

## 评分

${rating || '★★★★☆'}
    `.trim();
  }

  private static generateGenericContent(
    topic: string,
    fields?: Record<string, any>,
    outline?: OutlineItem[]
  ): string {
    return `
# ${topic}

${outline?.map((item) => `
## ${item.title}

${item.description || ''}
`).join('\n') || '内容生成中...'}
    `.trim();
  }

  // ==================== 导出方法 ====================

  private static exportAsMarkdown(content: GeneratedContent): string {
    return `
# ${content.templateName}: ${content.topic}

${content.outline ? `## 大纲\n\n${content.outline}\n\n` : ''}

## 正文

${content.content}

---

*生成时间：${new Date(content.metadata.generatedAt).toLocaleString('zh-CN')}*
*字数：${content.metadata.wordCount}*
    `.trim();
  }

  private static exportAsHtml(content: GeneratedContent): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.templateName}: ${content.topic}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .meta { color: #888; font-size: 0.9em; margin-bottom: 20px; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${content.templateName}: ${content.topic}</h1>
  <div class="meta">
    <span>生成时间：${new Date(content.metadata.generatedAt).toLocaleString('zh-CN')}</span> | 
    <span>字数：${content.metadata.wordCount}</span>
  </div>
  ${content.outline ? `<h2>大纲</h2><div class="content">${content.outline}</div>` : ''}
  <h2>正文</h2>
  <div class="content">${content.content.replace(/\n/g, '<br>')}</div>
</body>
</html>
    `.trim();
  }

  private static exportAsPlain(content: GeneratedContent): string {
    return `${content.templateName}: ${content.topic}\n\n${content.content}`;
  }
}

export default ContentFactoryService;
