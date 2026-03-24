/**
 * Robots.txt 生成工具 - 使用示例
 * 
 * 运行方式：
 * uv run tsx robots-utils-skill.examples.ts
 */

import {
  generateRobotsTxt,
  createStandardWebRules,
  createSearchEngineFriendlyRules,
  createApiServiceRules,
  blockAiCrawlers,
  blockSeoTools,
  exactMatch,
  prefixMatch,
  containsMatch,
  extensionMatch,
  COMMON_USER_AGENTS,
  parseRobotsTxt,
  mergeRobotsConfigs,
  EXAMPLES,
} from './robots-utils-skill';

// ==================== 示例 1: 标准网站配置 ====================
console.log('='.repeat(60));
console.log('示例 1: 标准网站配置');
console.log('='.repeat(60));

const standardConfig = {
  rules: createStandardWebRules(),
  sitemap: ['https://example.com/sitemap.xml'],
  host: 'https://example.com',
};

console.log(generateRobotsTxt(standardConfig, { addComments: true }));

// ==================== 示例 2: 阻止 AI 爬虫 ====================
console.log('\n' + '='.repeat(60));
console.log('示例 2: 阻止 AI 爬虫');
console.log('='.repeat(60));

const aiSafeConfig = {
  rules: [
    ...createStandardWebRules(),
    blockAiCrawlers(),
  ],
  sitemap: ['https://example.com/sitemap.xml'],
};

console.log(generateRobotsTxt(aiSafeConfig));

// ==================== 示例 3: 搜索引擎友好配置 ====================
console.log('\n' + '='.repeat(60));
console.log('示例 3: 搜索引擎友好配置');
console.log('='.repeat(60));

const seoConfig = {
  rules: createSearchEngineFriendlyRules(),
  sitemap: [
    'https://example.com/sitemap.xml',
    'https://example.com/sitemap-news.xml',
  ],
  host: 'https://example.com',
};

console.log(generateRobotsTxt(seoConfig, { addComments: true }));

// ==================== 示例 4: API 服务保护 ====================
console.log('\n' + '='.repeat(60));
console.log('示例 4: API 服务保护');
console.log('='.repeat(60));

const apiConfig = {
  rules: createApiServiceRules('/api/v2'),
  sitemap: ['https://api.example.com/sitemap.xml'],
};

console.log(generateRobotsTxt(apiConfig));

// ==================== 示例 5: 通配符高级用法 ====================
console.log('\n' + '='.repeat(60));
console.log('示例 5: 通配符高级用法');
console.log('='.repeat(60));

const wildcardConfig = {
  rules: [
    {
      userAgent: '*',
      disallow: [
        exactMatch('/login'),           // 精确匹配 /login
        exactMatch('/register'),        // 精确匹配 /register
        prefixMatch('/api'),            // 匹配 /api/*
        prefixMatch('/admin'),          // 匹配 /admin/*
        containsMatch('temp'),          // 匹配包含 temp 的路径
        containsMatch('cache'),         // 匹配包含 cache 的路径
        extensionMatch('pdf'),          // 匹配 *.pdf
        extensionMatch('docx'),         // 匹配 *.docx
        extensionMatch('xlsx'),         // 匹配 *.xlsx
      ],
      allow: [
        '/api/public',                  // 允许公开 API
        '/api/health',                  // 允许健康检查
      ],
    },
  ],
  sitemap: ['https://example.com/sitemap.xml'],
};

console.log(generateRobotsTxt(wildcardConfig, { addComments: true }));

// ==================== 示例 6: 自定义爬虫规则 ====================
console.log('\n' + '='.repeat(60));
console.log('示例 6: 自定义爬虫规则');
console.log('='.repeat(60));

const customConfig = {
  rules: [
    {
      userAgent: COMMON_USER_AGENTS.GOOGLE,
      allow: ['/', '/public/*', '/blog/*'],
      disallow: ['/admin/', '/search?', '/?s='],
    },
    {
      userAgent: COMMON_USER_AGENTS.BING,
      allow: ['/'],
      disallow: ['/private/', '/temp/'],
    },
    {
      userAgent: COMMON_USER_AGENTS.OPENAI,
      disallow: ['/'],  // 阻止 GPTBot
    },
    {
      userAgent: '*',
      disallow: ['/admin/', '/private/'],
      crawlDelay: 2,  // 2 秒延迟
    },
  ],
  sitemap: ['https://example.com/sitemap.xml'],
  host: 'https://example.com',
};

console.log(generateRobotsTxt(customConfig, { addComments: true, validate: true }));

// ==================== 示例 7: 阻止 SEO 工具 ====================
console.log('\n' + '='.repeat(60));
console.log('示例 7: 阻止 SEO 工具');
console.log('='.repeat(60));

const seoBlockConfig = {
  rules: [
    ...createStandardWebRules(),
    blockSeoTools(),
  ],
  sitemap: ['https://example.com/sitemap.xml'],
};

console.log(generateRobotsTxt(seoBlockConfig));

// ==================== 示例 8: 解析并修改现有 robots.txt ====================
console.log('\n' + '='.repeat(60));
console.log('示例 8: 解析并修改现有 robots.txt');
console.log('='.repeat(60));

const existingRobotsTxt = `
# Existing robots.txt
User-agent: *
Disallow: /admin
Disallow: /private
Sitemap: https://old.example.com/sitemap.xml
`;

const parsed = parseRobotsTxt(existingRobotsTxt);
console.log('解析结果:', JSON.stringify(parsed, null, 2));

// 添加新规则
const modifiedConfig = {
  rules: [
    ...parsed.rules,
    {
      userAgent: 'GPTBot',
      disallow: ['/'],
    },
    blockAiCrawlers(),
  ],
  sitemap: [...(parsed.sitemap || []), 'https://new.example.com/sitemap.xml'],
  host: parsed.host,
};

console.log('\n修改后的 robots.txt:');
console.log(generateRobotsTxt(modifiedConfig, { addComments: true }));

// ==================== 示例 9: 合并多个配置 ====================
console.log('\n' + '='.repeat(60));
console.log('示例 9: 合并多个配置');
console.log('='.repeat(60));

const baseConfig = {
  rules: createStandardWebRules(),
  sitemap: ['https://example.com/sitemap.xml'],
  host: 'https://example.com',
};

const aiBlockConfig = {
  rules: [blockAiCrawlers()],
};

const seoBlockConfig2 = {
  rules: [blockSeoTools()],
};

const merged = mergeRobotsConfigs(baseConfig, aiBlockConfig, seoBlockConfig2);

console.log(generateRobotsTxt(merged, { addComments: true }));

// ==================== 示例 10: 快速配置模板 ====================
console.log('\n' + '='.repeat(60));
console.log('示例 10: 快速配置模板 (来自 EXAMPLES)');
console.log('='.repeat(60));

console.log('标准配置模板:');
console.log(EXAMPLES.standard);

console.log('\n阻止 AI 爬虫模板:');
console.log(EXAMPLES.blockAi);

console.log('\n自定义规则模板:');
console.log(EXAMPLES.custom);

console.log('\n通配符使用模板:');
console.log(EXAMPLES.wildcards);

// ==================== 完成 ====================
console.log('\n' + '='.repeat(60));
console.log('✅ 所有示例运行完成!');
console.log('='.repeat(60));
