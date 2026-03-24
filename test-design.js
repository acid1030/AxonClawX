// AxonClaw 完整测试 - 严格按照设计稿
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testAxonClawDesign() {
  console.log('========================================');
  console.log('AxonClaw 设计稿对比测试');
  console.log('========================================\n');

  const screenshotsDir = path.join(__dirname, 'test-design-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300,
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  try {
    // 测试 1: 打开应用
    console.log('1️⃣ 测试：打开应用');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-homepage.png'),
      fullPage: false
    });
    console.log('✅ 应用加载成功');
    console.log('📸 截图：01-homepage.png\n');

    // 测试 2: 检查 Grid 布局
    console.log('2️⃣ 测试：检查 Grid 布局');
    const appShell = await page.locator('.app-shell').first();
    const displayStyle = await appShell.evaluate(el => window.getComputedStyle(el).display);
    const gridColumns = await appShell.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
    
    console.log(`✅ 布局方式: ${displayStyle}`);
    console.log(`✅ Grid 列: ${gridColumns}`);
    
    if (displayStyle === 'grid') {
      console.log('✅ Grid 布局正确！\n');
    } else {
      console.log('❌ 布局方式错误，应该是 grid\n');
    }

    // 测试 3: 检查页面高度
    console.log('3️⃣ 测试：检查页面高度');
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportSize = page.viewportSize();
    const viewportHeight = viewportSize ? viewportSize.height : 900;
    
    console.log(`✅ 页面高度: ${bodyHeight}px`);
    console.log(`✅ 视口高度: ${viewportHeight}px`);
    
    if (bodyHeight <= viewportHeight * 1.2) {
      console.log('✅ 页面高度正常\n');
    } else {
      console.log(`⚠️ 页面高度异常 (${bodyHeight}px)\n`);
    }

    // 测试 4: 进入对话界面
    console.log('4️⃣ 测试：进入对话界面');
    const chatButton = await page.locator('button:has-text("💬")').first();
    await chatButton.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-chat-view.png'),
      fullPage: false
    });
    console.log('✅ 进入对话界面成功');
    console.log('📸 截图：02-chat-view.png\n');

    // 测试 5: 检查对话界面元素
    console.log('5️⃣ 测试：检查对话界面元素');
    
    // 检查顶部栏
    const topBar = await page.locator('text=Anthropic API 配置问题').count();
    console.log(`✅ 顶部栏（对话标题）: ${topBar > 0 ? '存在' : '缺失'}`);
    
    // 检查消息区域
    const messages = await page.locator('text=今天 · Anthropic API 配置问题').count();
    console.log(`✅ 消息区域（系统消息）: ${messages > 0 ? '存在' : '缺失'}`);
    
    // 检查用户消息
    const userMessage = await page.locator('text=openclaw 报错').count();
    console.log(`✅ 用户消息: ${userMessage > 0 ? '存在' : '缺失'}`);
    
    // 检查 AI 消息
    const aiMessage = await page.locator('text=这个错误说明').count();
    console.log(`✅ AI 消息: ${aiMessage > 0 ? '存在' : '缺失'}`);
    
    // 检查输入框
    const input = await page.locator('textarea[placeholder="发消息…"]').count();
    console.log(`✅ 输入框: ${input > 0 ? '存在' : '缺失'}`);
    
    // 检查工具栏
    const toolbar = await page.locator('text=📎 附件').count();
    console.log(`✅ 工具栏: ${toolbar > 0 ? '存在' : '缺失'}`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-chat-elements.png'),
      fullPage: false
    });
    console.log('📸 截图：03-chat-elements.png\n');

    // 测试 6: 测试下拉菜单
    console.log('6️⃣ 测试：测试下拉菜单');
    const dropdownButton = await page.locator('button:has-text("Anthropic API 配置问题")').first();
    await dropdownButton.click();
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '04-dropdown.png'),
      fullPage: false
    });
    console.log('✅ 下拉菜单打开成功');
    console.log('📸 截图：04-dropdown.png\n');

    // 测试 7: 关闭下拉菜单
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 测试 8: 返回 Dashboard
    console.log('7️⃣ 测试：返回 Dashboard');
    const dashboardButton = await page.locator('button:has-text("📊")').first();
    await dashboardButton.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '05-dashboard.png'),
      fullPage: false
    });
    console.log('✅ 返回 Dashboard 成功');
    console.log('📸 截图：05-dashboard.png\n');

    // 测试总结
    console.log('========================================');
    console.log('✅ 测试完成！');
    console.log('========================================');
    console.log(`\n📁 截图位置: ${screenshotsDir}`);
    
    const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    console.log('\n📸 测试截图：');
    screenshots.forEach((file, index) => {
      const filePath = path.join(screenshotsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   ${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

    // 保存测试结果
    const testResult = {
      timestamp: new Date().toISOString(),
      layout: {
        type: displayStyle,
        columns: gridColumns,
        correct: displayStyle === 'grid',
      },
      height: {
        page: bodyHeight,
        viewport: viewportHeight,
        normal: bodyHeight <= viewportHeight * 1.2,
      },
      elements: {
        topBar: topBar > 0,
        messages: messages > 0,
        userMessage: userMessage > 0,
        aiMessage: aiMessage > 0,
        input: input > 0,
        toolbar: toolbar > 0,
      },
      screenshots: screenshots,
    };

    fs.writeFileSync(
      path.join(screenshotsDir, 'test-result.json'),
      JSON.stringify(testResult, null, 2)
    );
    console.log('\n📄 测试结果：test-result.json');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error.png'),
      fullPage: false
    });
    console.log('📸 错误截图：error.png');
    
    throw error;
  } finally {
    await browser.close();
  }
}

// 运行测试
testAxonClawDesign().catch(console.error);
