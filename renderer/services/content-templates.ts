/**
 * Content Templates Service - 内容模板系统
 * 
 * 功能:
 * - 模板定义 (JSON Schema)
 * - 模板加载/保存
 * - 模板预览
 * - 内置模板 (10+ 个)
 */

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'tags';
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select type
  description?: string;
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

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  platform: ContentPlatform;
  icon: string;
  fields: TemplateField[];
  outputFormat: 'markdown' | 'html' | 'plain' | 'script';
  structure: {
    sections: string[];
    example?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class ContentTemplatesService {
  private static templatesPath = './templates';
  
  /**
   * 获取所有内置模板
   */
  public static getBuiltInTemplates(): ContentTemplate[] {
    return [
      {
        id: 'douyin-short',
        name: '抖音短视频',
        description: '抖音 15-60 秒短视频脚本，强钩子 + 快节奏',
        platform: 'douyin',
        icon: '🎵',
        fields: [
          { name: 'videoType', label: '视频类型', type: 'select', options: ['剧情反转', '知识干货', '产品展示', '挑战模仿', 'Vlog 记录'], required: true },
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '例如：3 个技巧让你早起不困' },
          { name: 'duration', label: '时长', type: 'select', options: ['15 秒', '30 秒', '60 秒'], required: true },
          { name: 'hook', label: '黄金 3 秒钩子', type: 'textarea', required: true, placeholder: '前 3 秒必须抓住观众！用悬念/冲突/结果' },
          { name: 'keyContent', label: '核心内容', type: 'textarea', required: true, placeholder: '主要信息点，简洁有力' },
          { name: 'bgm', label: 'BGM 建议', type: 'text', placeholder: '例如：节奏感强的热门 BGM' },
          { name: 'cta', label: '结尾引导', type: 'text', placeholder: '例如：关注我，每天学一个技巧' },
        ],
        outputFormat: 'script',
        structure: {
          sections: ['黄金 3 秒钩子', '引入 (3-10s)', '核心内容 (10-45s)', '高潮/反转', '结尾 CTA'],
          example: '[0-3s] 画面：... 台词：...\n[3-10s] 画面：... 台词：...\n[10-45s] 核心内容...',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'xiaohongshu-note',
        name: '小红书笔记',
        description: '适合小红书的种草笔记模板，包含标题、正文、标签',
        platform: 'xiaohongshu',
        icon: '📕',
        fields: [
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '例如：冬季护肤必备', description: '内容的核心主题' },
          { name: 'targetAudience', label: '目标人群', type: 'text', required: true, placeholder: '例如：25-35 岁职场女性' },
          { name: 'tone', label: '语气风格', type: 'select', options: ['亲切姐妹风', '专业干货风', '搞笑吐槽风', '治愈温暖风'], required: true },
          { name: 'keyPoints', label: '核心卖点', type: 'textarea', required: true, placeholder: '列出 3-5 个核心卖点或亮点' },
          { name: 'callToAction', label: '互动引导', type: 'text', placeholder: '例如：评论区告诉我你的想法～', description: '引导用户评论/点赞/收藏' },
        ],
        outputFormat: 'markdown',
        structure: {
          sections: ['标题 (含 emoji)', '开头引入', '正文内容 (分点)', '使用感受', '互动引导', '标签'],
          example: '标题：✨冬季护肤必备！这 5 款好物让我告别干燥肌\n\n姐妹们！今天必须分享...',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'wechat-article',
        name: '公众号文章',
        description: '微信公众号长文模板，适合深度内容',
        platform: 'wechat',
        icon: '💬',
        fields: [
          { name: 'title', label: '标题', type: 'text', required: true, placeholder: '吸引人的文章标题' },
          { name: 'subtitle', label: '副标题', type: 'text', placeholder: '补充说明或悬念' },
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '文章核心主题' },
          { name: 'outline', label: '大纲', type: 'textarea', required: true, placeholder: '文章主要结构和要点' },
          { name: 'keywords', label: '关键词', type: 'tags', placeholder: 'SEO 关键词，用逗号分隔' },
          { name: 'wordCount', label: '目标字数', type: 'number', placeholder: '例如：2000' },
        ],
        outputFormat: 'markdown',
        structure: {
          sections: ['标题', '引言 (痛点/悬念)', '正文 (3-5 个小标题)', '案例/数据支撑', '总结升华', '金句收尾'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'wechat-mini',
        name: '公众号短文',
        description: '公众号轻量级短文，适合日常更新和热点追踪',
        platform: 'wechat',
        icon: '📝',
        fields: [
          { name: 'title', label: '标题', type: 'text', required: true, placeholder: '简洁有力的标题' },
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '内容主题' },
          { name: 'opening', label: '开头', type: 'textarea', required: true, placeholder: '用热点/故事/问题引入' },
          { name: 'mainContent', label: '正文', type: 'textarea', required: true, placeholder: '核心内容，800-1500 字' },
          { name: 'ending', label: '结尾', type: 'text', placeholder: '总结或引导互动' },
        ],
        outputFormat: 'markdown',
        structure: {
          sections: ['吸睛标题', '热点引入', '核心观点', '案例说明', '互动引导'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'zhihu-answer',
        name: '知乎回答',
        description: '知乎问题回答模板，专业且有说服力',
        platform: 'zhihu',
        icon: '📚',
        fields: [
          { name: 'question', label: '问题', type: 'text', required: true, placeholder: '要回答的问题' },
          { name: 'expertise', label: '专业背景', type: 'text', placeholder: '例如：5 年产品经理经验' },
          { name: 'viewpoint', label: '核心观点', type: 'textarea', required: true, placeholder: '你的核心论点' },
          { name: 'evidence', label: '论据/案例', type: 'textarea', placeholder: '支撑观点的案例、数据、经历' },
          { name: 'tone', label: '语气', type: 'select', options: ['专业严谨', '通俗易懂', '幽默风趣', '犀利吐槽'], required: true },
        ],
        outputFormat: 'markdown',
        structure: {
          sections: ['开头亮身份', '核心观点', '分点论证', '案例说明', '总结建议'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'video-script',
        name: '通用视频脚本',
        description: '短视频/中长视频脚本模板',
        platform: 'video',
        icon: '🎬',
        fields: [
          { name: 'videoType', label: '视频类型', type: 'select', options: ['口播', '剧情', '教程', '评测', 'Vlog'], required: true },
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '视频主题' },
          { name: 'duration', label: '目标时长', type: 'select', options: ['30 秒', '1 分钟', '3 分钟', '5 分钟', '10 分钟+'], required: true },
          { name: 'hook', label: '开头钩子', type: 'textarea', required: true, placeholder: '前 3 秒吸引观众的内容' },
          { name: 'keyContent', label: '核心内容', type: 'textarea', required: true, placeholder: '视频主要信息点' },
          { name: 'cta', label: '结尾行动号召', type: 'text', placeholder: '例如：点赞关注不迷路～' },
        ],
        outputFormat: 'script',
        structure: {
          sections: ['开场 (0-3s)', '引入 (3-15s)', '主体内容', '高潮/转折', '结尾 CTA'],
          example: '[0-3s] 画面：... 台词：...\n[3-15s] 画面：... 台词：...',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'bilibili-medium',
        name: 'B 站中长视频',
        description: 'B 站 3-10 分钟中长视频脚本，深度内容 + 弹幕互动设计',
        platform: 'bilibili',
        icon: '📺',
        fields: [
          { name: 'videoType', label: '视频类型', type: 'select', options: ['知识科普', '游戏解说', '生活记录', '技术教程', '影评书评'], required: true },
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '视频核心主题' },
          { name: 'duration', label: '目标时长', type: 'select', options: ['3 分钟', '5 分钟', '8 分钟', '10 分钟', '15 分钟+'], required: true },
          { name: 'hook', label: '开场白', type: 'textarea', required: true, placeholder: '大家好，我是 XXX，今天我们来聊...' },
          { name: 'keyContent', label: '核心内容大纲', type: 'textarea', required: true, placeholder: '分 3-5 个部分，每部分核心要点' },
          { name: 'interactionPoints', label: '弹幕互动点', type: 'textarea', placeholder: '设计让观众发弹幕的互动点，例如："前方高能"' },
          { name: 'cta', label: '结尾引导', type: 'text', placeholder: '例如：一键三连支持一下！' },
        ],
        outputFormat: 'script',
        structure: {
          sections: ['开场白 + 自我介绍', '引入主题 (30s)', '主体内容 (分 3-5 部分)', '弹幕互动设计', '总结 + 一键三连'],
          example: '[开场] 大家好我是 XXX\n[引入] 今天我们来深度解析...\n[主体] 第一部分...\n[互动] 这里弹幕可以发...',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ai-art-prompt',
        name: 'AI 绘画提示词',
        description: 'Midjourney/Stable Diffusion 提示词模板',
        platform: 'ai-art',
        icon: '🎨',
        fields: [
          { name: 'subject', label: '主体', type: 'text', required: true, placeholder: '例如：一位穿着汉服的女性' },
          { name: 'style', label: '艺术风格', type: 'select', options: ['写实', '动漫', '油画', '水彩', '赛博朋克', '奇幻', '极简'], required: true },
          { name: 'environment', label: '环境/背景', type: 'text', placeholder: '例如：古代庭院，樱花树下' },
          { name: 'lighting', label: '光线', type: 'select', options: ['自然光', '逆光', '侧光', '柔光', '霓虹灯', '烛光'], required: true },
          { name: 'color', label: '色调', type: 'text', placeholder: '例如：暖色调，粉色系' },
          { name: 'quality', label: '质量参数', type: 'tags', options: ['8k', 'ultra-detailed', 'masterpiece', 'best quality'], placeholder: '选择质量标签' },
        ],
        outputFormat: 'plain',
        structure: {
          sections: ['主体描述', '风格定义', '环境设定', '光线和色彩', '质量参数'],
          example: 'A woman in Hanfu, ancient courtyard, cherry blossoms, soft natural lighting, warm color palette, 8k, ultra-detailed, masterpiece --ar 16:9 --v 6',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'weibo-post',
        name: '微博文案',
        description: '微博短文案模板，简洁有力',
        platform: 'weibo',
        icon: '🔵',
        fields: [
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '内容主题' },
          { name: 'tone', label: '语气', type: 'select', options: ['轻松幽默', '严肃正式', '感性走心', '激情打 call'], required: true },
          { name: 'keyMessage', label: '核心信息', type: 'textarea', required: true, placeholder: '最想传达的 1-2 句话' },
          { name: 'hashtags', label: '话题标签', type: 'tags', placeholder: '例如：#今日分享# #生活记录#' },
          { name: 'mention', label: '@提及', type: 'text', placeholder: '需要@的账号' },
        ],
        outputFormat: 'plain',
        structure: {
          sections: ['开头吸引', '正文 (140 字内)', '话题标签', '@提及'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ecommerce-detail',
        name: '电商详情页',
        description: '商品详情页文案模板',
        platform: 'ecommerce',
        icon: '🛒',
        fields: [
          { name: 'productName', label: '商品名称', type: 'text', required: true, placeholder: '商品全称' },
          { name: 'targetCustomer', label: '目标客户', type: 'text', required: true, placeholder: '例如：追求品质生活的都市女性' },
          { name: 'sellingPoints', label: '卖点', type: 'textarea', required: true, placeholder: '3-5 个核心卖点' },
          { name: 'specifications', label: '规格参数', type: 'textarea', placeholder: '尺寸、材质、颜色等' },
          { name: 'useScenarios', label: '使用场景', type: 'textarea', placeholder: '适合什么场景使用' },
          { name: 'faq', label: '常见问题', type: 'textarea', placeholder: '客户可能关心的问题' },
        ],
        outputFormat: 'html',
        structure: {
          sections: ['商品主图区', '卖点提炼', '详细介绍', '规格参数', '使用场景', 'FAQ'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'email-marketing',
        name: '邮件营销',
        description: '营销邮件模板',
        platform: 'email',
        icon: '📧',
        fields: [
          { name: 'emailType', label: '邮件类型', type: 'select', options: ['新品发布', '促销活动', '会员关怀', '内容推送', '活动邀请'], required: true },
          { name: 'subject', label: '邮件主题', type: 'text', required: true, placeholder: '吸引打开的主题行' },
          { name: 'recipient', label: '收件人群', type: 'text', placeholder: '例如：新注册用户/VIP 会员' },
          { name: 'mainOffer', label: '核心优惠/内容', type: 'textarea', required: true, placeholder: '主要推广内容' },
          { name: 'cta', label: '行动号召', type: 'text', required: true, placeholder: '例如：立即查看/限时抢购' },
          { name: 'urgency', label: '紧迫感元素', type: 'text', placeholder: '例如：限时 48 小时/仅剩 100 件' },
        ],
        outputFormat: 'html',
        structure: {
          sections: ['主题行', '问候语', '核心价值', '优惠详情', '行动按钮', '落款'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'press-release',
        name: '新闻稿',
        description: '公关新闻稿模板',
        platform: 'news',
        icon: '📰',
        fields: [
          { name: 'headline', label: '标题', type: 'text', required: true, placeholder: '新闻标题' },
          { name: 'dateline', label: '电头', type: 'text', placeholder: '例如：北京，2024 年 3 月 12 日' },
          { name: 'leadParagraph', label: '导语', type: 'textarea', required: true, placeholder: '5W1H 核心信息' },
          { name: 'bodyContent', label: '正文', type: 'textarea', required: true, placeholder: '详细内容、引用、背景' },
          { name: 'boilerplate', label: '公司简介', type: 'textarea', placeholder: '公司/组织介绍' },
          { name: 'mediaContact', label: '媒体联系人', type: 'text', placeholder: '姓名、邮箱、电话' },
        ],
        outputFormat: 'markdown',
        structure: {
          sections: ['标题', '电头', '导语', '正文 (2-3 段)', '引用', '背景信息', '媒体联系'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'product-review',
        name: '产品评测',
        description: '产品评测/测评模板',
        platform: 'review',
        icon: '⭐',
        fields: [
          { name: 'productName', label: '产品名称', type: 'text', required: true, placeholder: '评测的产品' },
          { name: 'category', label: '产品类别', type: 'text', placeholder: '例如：智能手机/护肤品' },
          { name: 'priceRange', label: '价格区间', type: 'text', placeholder: '例如：¥2999-3999' },
          { name: 'testDuration', label: '使用时长', type: 'text', placeholder: '例如：深度使用 2 周' },
          { name: 'pros', label: '优点', type: 'textarea', required: true, placeholder: '产品优点列表' },
          { name: 'cons', label: '缺点', type: 'textarea', placeholder: '产品缺点/不足' },
          { name: 'verdict', label: '总结评价', type: 'textarea', required: true, placeholder: '最终购买建议' },
          { name: 'rating', label: '评分', type: 'select', options: ['★★★★★', '★★★★☆', '★★★☆☆', '★★☆☆☆', '★☆☆☆☆'], required: true },
        ],
        outputFormat: 'markdown',
        structure: {
          sections: ['产品概述', '外观/设计', '性能表现', '使用体验', '优缺点总结', '购买建议', '评分'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'linkedin-post',
        name: 'LinkedIn 动态',
        description: '职场社交平台动态，专业且有深度',
        platform: 'linkedin',
        icon: '💼',
        fields: [
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '例如：行业洞察/职业发展/项目分享' },
          { name: 'tone', label: '语气', type: 'select', options: ['专业严谨', '启发思考', '分享经验', '行业分析'], required: true },
          { name: 'hook', label: '开头钩子', type: 'textarea', required: true, placeholder: '用问题/数据/观点吸引注意' },
          { name: 'mainContent', label: '核心内容', type: 'textarea', required: true, placeholder: '分享经验、见解或案例' },
          { name: 'cta', label: '互动引导', type: 'text', placeholder: '例如：你怎么看？欢迎讨论' },
          { name: 'hashtags', label: '话题标签', type: 'tags', placeholder: '例如：#职业发展 #行业洞察' },
        ],
        outputFormat: 'plain',
        structure: {
          sections: ['吸睛开头', '核心观点', '案例/数据支撑', '总结启发', '互动引导'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'twitter-thread',
        name: 'Twitter/X 推文串',
        description: '推文串模板，适合深度内容拆分',
        platform: 'twitter',
        icon: '🐦',
        fields: [
          { name: 'topic', label: '主题', type: 'text', required: true, placeholder: '推文串主题' },
          { name: 'tweetCount', label: '推文数量', type: 'select', options: ['3 条', '5 条', '8 条', '10 条+'], required: true },
          { name: 'hook', label: '第一条钩子', type: 'textarea', required: true, placeholder: '吸引读者继续看的开头' },
          { name: 'keyPoints', label: '核心要点', type: 'textarea', required: true, placeholder: '每条推文的核心内容' },
          { name: 'cta', label: '最后一条 CTA', type: 'text', placeholder: '例如：关注我获取更多干货' },
        ],
        outputFormat: 'plain',
        structure: {
          sections: ['钩子推文 (1/?)', '要点展开 (2-?/?)', '总结 + CTA (最后一条)'],
          example: '1/ 你知道吗？90% 的人都做错了...\n2/ 首先...\n3/ 其次...\n最后/ 关注我...',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * 根据 ID 获取模板
   */
  public static getTemplateById(id: string): ContentTemplate | undefined {
    const templates = this.getBuiltInTemplates();
    return templates.find((t) => t.id === id);
  }

  /**
   * 根据平台获取模板
   */
  public static getTemplatesByPlatform(platform: ContentTemplate['platform']): ContentTemplate[] {
    return this.getBuiltInTemplates().filter((t) => t.platform === platform);
  }

  /**
   * 搜索模板
   */
  public static searchTemplates(query: string): ContentTemplate[] {
    const templates = this.getBuiltInTemplates();
    const lowerQuery = query.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.platform.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 获取模板预览
   */
  public static getTemplatePreview(template: ContentTemplate): string {
    return `
# ${template.icon} ${template.name}

**平台**: ${template.platform}
**输出格式**: ${template.outputFormat}

## 结构
${template.structure.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 输入字段
${template.fields.map((f) => `- ${f.label}${f.required ? ' *' : ''}: ${f.type}`).join('\n')}

${template.structure.example ? `## 示例\n${template.structure.example}` : ''}
    `.trim();
  }

  /**
   * 验证模板数据
   */
  public static validateTemplateData(
    template: ContentTemplate,
    data: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of template.fields) {
      if (field.required && !data[field.name]) {
        errors.push(`必填字段 "${field.label}" 不能为空`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ContentTemplatesService;
