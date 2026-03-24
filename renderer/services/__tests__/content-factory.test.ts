/**
 * Content Factory Test Script
 * 测试内容工厂各平台模板生成功能
 */

import { ContentTemplatesService } from './content-templates';
import { ContentFactoryService, GenerationParams } from './content-factory';

async function testContentGeneration() {
  console.log('🏭 智能内容工厂 - 测试开始\n');
  
  const templates = ContentTemplatesService.getBuiltInTemplates();
  console.log(`✅ 加载模板数量：${templates.length} 个\n`);
  
  // 测试用例
  const testCases: Array<{
    templateId: string;
    params: Partial<GenerationParams>;
  }> = [
    {
      templateId: 'douyin-short',
      params: {
        topic: '3 个技巧让你早起不困',
        customFields: {
          videoType: '知识干货',
          duration: '60 秒',
          hook: '你知道吗？90% 的人都睡错了！',
          keyContent: '技巧 1：睡前 90 分钟不玩手机\n技巧 2：起床后立即见光\n技巧 3：喝一杯温水',
          bgm: '节奏感强的热门 BGM',
          cta: '关注我，每天学一个技巧',
        },
      },
    },
    {
      templateId: 'xiaohongshu-note',
      params: {
        topic: '冬季护肤必备',
        customFields: {
          targetAudience: '25-35 岁职场女性',
          tone: '亲切姐妹风',
          keyPoints: '保湿效果好\n质地清爽不油腻\n性价比高',
          callToAction: '你们有什么想问的评论区告诉我～',
        },
      },
    },
    {
      templateId: 'bilibili-medium',
      params: {
        topic: '深度解析 AI 如何改变内容创作',
        customFields: {
          videoType: '知识科普',
          duration: '8 分钟',
          hook: '大家好，我是 XXX，今天我们来深度解析 AI 如何改变内容创作',
          keyContent: '第一部分：AI 内容生成的现状\n第二部分：AI 创作的优缺点\n第三部分：未来发展趋势',
          interactionPoints: '前方高能\n名场面\n学到了',
          cta: '如果觉得这期视频有帮助，请一键三连支持一下！',
        },
      },
    },
    {
      templateId: 'wechat-mini',
      params: {
        topic: '职场沟通技巧',
        customFields: {
          title: '高情商的人，都懂这 3 个沟通法则',
          opening: '在职场中，你会发现：能力强的人不一定走得远，但会沟通的人一定混得好。',
          mainContent: '法则一：先倾听，再表达\n法则二：用事实说话，避免情绪化\n法则三：给出解决方案，而非抱怨问题',
          ending: '学会这 3 个法则，让你的职场沟通更高效。',
        },
      },
    },
    {
      templateId: 'linkedin-post',
      params: {
        topic: '远程办公的未来',
        customFields: {
          tone: '行业分析',
          hook: '远程办公 3 年，我发现了一个有趣的现象...',
          mainContent: '根据我们的调研数据，78% 的知识工作者认为混合办公模式是未来趋势。这意味着...\n\n从企业管理角度看，远程办公带来的挑战主要是：\n1. 协作效率\n2. 文化建设\n3. 绩效评估',
          cta: '你的公司采用什么办公模式？欢迎在评论区分享。',
          hashtags: ['#远程办公', '#未来工作', '#职场趋势'],
        },
      },
    },
    {
      templateId: 'twitter-thread',
      params: {
        topic: '如何高效学习',
        customFields: {
          tweetCount: '5 条',
          hook: '如何用 20% 的时间掌握 80% 的技能？分享 5 个高效学习法：',
          keyPoints: '1️⃣ 费曼学习法：用教别人的方式学习\n2️⃣ 番茄工作法：25 分钟专注 +5 分钟休息\n3️⃣ 刻意练习：针对弱点反复训练\n4️⃣ 间隔重复：用 Anki 等工具复习\n5️⃣ 输出倒逼输入：写文章/做视频',
          cta: '关注我，获取更多成长干货！',
        },
      },
    },
  ];

  for (const testCase of testCases) {
    const template = ContentTemplatesService.getTemplateById(testCase.templateId);
    if (!template) {
      console.log(`❌ 模板不存在：${testCase.templateId}`);
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 测试模板：${template.icon} ${template.name}`);
    console.log(`🎯 平台：${template.platform}`);
    console.log('='.repeat(60));

    try {
      const params: GenerationParams = {
        templateId: testCase.templateId,
        topic: testCase.params.topic || '测试主题',
        customFields: testCase.params.customFields,
        tone: testCase.params.tone,
        length: 'medium',
        language: 'zh-CN',
      };

      // 生成大纲
      console.log('\n📋 生成大纲...');
      const outline = await ContentFactoryService.generateOutline(params);
      console.log(`✅ 大纲生成成功，共 ${outline.length} 个部分`);
      
      outline.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title}`);
      });

      // 生成完整内容
      console.log('\n✍️  生成内容...');
      const content = await ContentFactoryService.generateContent(params);
      console.log(`✅ 内容生成成功`);
      console.log(`📊 字数：${content.metadata.wordCount}`);
      console.log(`🕐 生成时间：${new Date(content.metadata.generatedAt).toLocaleString('zh-CN')}`);
      
      console.log('\n📄 内容预览（前 500 字）:');
      console.log('-'.repeat(60));
      console.log(content.content.substring(0, 500) + '...');
      console.log('-'.repeat(60));

    } catch (error) {
      console.log(`❌ 生成失败：${error instanceof Error ? error.message : '未知错误'}`);
    }

    console.log('\n');
  }

  // 总结
  console.log('='.repeat(60));
  console.log('✅ 测试完成！');
  console.log(`📊 总模板数：${templates.length} 个`);
  console.log(`🧪 测试用例：${testCases.length} 个`);
  console.log('='.repeat(60));
}

// 运行测试
testContentGeneration().catch(console.error);
