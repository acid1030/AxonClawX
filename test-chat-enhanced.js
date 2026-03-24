// AxonClaw 对话功能完整测试 - 增强版
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testChatFeature() {
  console.log('========================================');
  console.log('AxonClaw 对话功能完整测试');
  console.log('========================================\n');

  const screenshotsDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500,
    devtools: true, // 打开开发者工具
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  
  const page = await context.newPage();

  // 监听控制台错误
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
    });
    if (msg.type() === 'error') {
      console.error('❌ Console Error:', msg.text());
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
    errors.push(error.message);
  });

  try {
    // 测试 1: 打开应用
    console.log('1️⃣ 测试：打开应用');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // 检查页面标题
    const title = await page.title();
    console.log(`✅ 页面标题: ${title}`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-homepage.png'),
      fullPage: true 
    });
    console.log('📸 截图：01-homepage.png\n');

    // 测试 2: 检查页面内容
    console.log('2️⃣ 测试：检查页面内容');
    const bodyText = await page.locator('body').textContent();
    const hasReact = bodyText.includes('root') || await page.locator('#root').count() > 0;
    console.log(`✅ React 根元素存在: ${hasReact}`);
    
    const rootContent = await page.locator('#root').innerHTML();
    const hasContent = rootContent.length > 100;
    console.log(`✅ 根元素有内容: ${hasContent}`);
    console.log(`   内容长度: ${rootContent.length} 字符`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-page-content.png'),
      fullPage: true 
    });
    console.log('📸 截图：02-page-content.png\n');

    // 测试 3: 检查控制台错误
    console.log('3️⃣ 测试：检查控制台错误');
    if (errors.length > 0) {
      console.log('❌ 发现错误:');
      errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err}`);
      });
      
      // 保存错误日志
      fs.writeFileSync(
        path.join(screenshotsDir, 'console-errors.txt'),
        errors.join('\n\n')
      );
      console.log('📝 错误日志：console-errors.txt\n');
    } else {
      console.log('✅ 无控制台错误\n');
    }

    // 测试 4: 查找侧边栏（使用多种选择器）
    console.log('4️⃣ 测试：查找侧边栏');
    const selectors = [
      '.sidebar',
      '[class*="sidebar"]',
      '[class*="Sidebar"]',
      'aside',
      'nav',
    ];
    
    let sidebarFound = false;
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ 找到侧边栏: ${selector} (${count} 个)`);
        sidebarFound = true;
        break;
      }
    }
    
    if (!sidebarFound) {
      console.log('❌ 未找到侧边栏元素');
    }
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-sidebar-search.png'),
      fullPage: true 
    });
    console.log('📸 截图：03-sidebar-search.png\n');

    // 测试 5: 查找按钮
    console.log('5️⃣ 测试：查找按钮');
    const buttons = await page.locator('button').count();
    console.log(`✅ 页面按钮数量: ${buttons}`);
    
    if (buttons > 0) {
      // 列出所有按钮的文本
      const buttonTexts = await page.locator('button').allTextContents();
      console.log('   按钮文本:', buttonTexts.slice(0, 5).join(', '));
    }
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '04-buttons.png'),
      fullPage: true 
    });
    console.log('📸 截图：04-buttons.png\n');

    // 测试 6: 尝试点击第一个按钮
    if (buttons > 0) {
      console.log('6️⃣ 测试：点击第一个按钮');
      await page.locator('button').first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, '05-after-click.png'),
        fullPage: true 
      });
      console.log('✅ 点击成功');
      console.log('📸 截图：05-after-click.png\n');
    }

    // 生成测试报告
    console.log('========================================');
    console.log('测试完成！');
    console.log('========================================');
    console.log(`截图保存位置: ${screenshotsDir}`);
    console.log('\n📸 测试截图列表：');
    const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    screenshots.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });

    // 保存测试结果
    const testResult = {
      timestamp: new Date().toISOString(),
      totalTests: 6,
      errors: errors,
      consoleMessages: consoleMessages.slice(0, 20), // 保存前20条消息
      hasReact,
      hasContent,
      buttonsCount: buttons,
      sidebarFound,
    };

    fs.writeFileSync(
      path.join(screenshotsDir, 'test-result.json'),
      JSON.stringify(testResult, null, 2)
    );
    console.log('\n📄 测试结果：test-result.json');

    // 如果有错误，抛出异常
    if (errors.length > 0) {
      throw new Error(`发现 ${errors.length} 个错误，请查看 console-errors.txt`);
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error.png'),
      fullPage: true 
    });
    console.log('📸 错误截图：error.png');
    
    throw error;
  } finally {
    await browser.close();
  }
}

// 运行测试
testChatFeature().catch(console.error);
