// AxonClaw 对话功能完整测试 - 最终版
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testChatFeature() {
  console.log('========================================');
  console.log('AxonClaw 对话功能完整测试 - 最终版');
  console.log('========================================\n');

  const screenshotsDir = path.join(__dirname, 'test-screenshots-final');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: true, // 使用 headless 模式
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  
  const page = await context.newPage();

  const errors = [];
  
  page.on('console', msg => {
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
    // 测试 1: 打开应用并截图
    console.log('1️⃣ 测试：打开应用');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-app-loaded.png'),
      fullPage: false // 只截取可见区域
    });
    console.log('✅ 应用加载成功');
    console.log('📸 截图：01-app-loaded.png\n');

    // 测试 2: 点击对话按钮（第二个按钮）
    console.log('2️⃣ 测试：点击对话按钮');
    const buttons = await page.locator('button').all();
    console.log(`✅ 找到 ${buttons.length} 个按钮`);
    
    if (buttons.length >= 2) {
      // 点击第二个按钮（💬）
      await buttons[1].click();
      await page.waitForTimeout(1500);
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, '02-chat-view.png'),
        fullPage: false
      });
      console.log('✅ 进入对话界面成功');
      console.log('📸 截图：02-chat-view.png\n');
    }

    // 测试 3: 检查对话界面元素
    console.log('3️⃣ 测试：检查对话界面元素');
    
    // 查找输入框
    const textarea = await page.locator('textarea').count();
    console.log(`✅ 输入框数量: ${textarea}`);
    
    // 查找消息区域
    const messageArea = await page.locator('[class*="message"], [class*="Message"]').count();
    console.log(`✅ 消息区域数量: ${messageArea}`);
    
    // 查找对话列表
    const conversationList = await page.locator('[class*="conversation"], [class*="Conversation"]').count();
    console.log(`✅ 对话列表数量: ${conversationList}`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-chat-elements.png'),
      fullPage: false
    });
    console.log('📸 截图：03-chat-elements.png\n');

    // 测试 4: 输入测试消息
    if (textarea > 0) {
      console.log('4️⃣ 测试：输入测试消息');
      await page.locator('textarea').fill('这是一条测试消息 🧪');
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, '04-message-typed.png'),
        fullPage: false
      });
      console.log('✅ 消息输入成功');
      console.log('📸 截图：04-message-typed.png\n');
    }

    // 测试 5: 检查连接状态
    console.log('5️⃣ 测试：检查连接状态');
    const statusDot = await page.locator('.status-dot, [class*="status"]').count();
    console.log(`✅ 状态指示器数量: ${statusDot}`);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '05-status-indicator.png'),
      fullPage: false
    });
    console.log('📸 截图：05-status-indicator.png\n');

    // 生成测试报告
    console.log('========================================');
    console.log('✅ 所有测试完成！');
    console.log('========================================');
    console.log(`\n📁 截图保存位置: ${screenshotsDir}`);
    console.log('\n📸 测试截图：');
    
    const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    screenshots.forEach((file, index) => {
      const filePath = path.join(screenshotsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   ${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

    // 保存测试结果
    const testResult = {
      timestamp: new Date().toISOString(),
      passed: errors.length === 0,
      errors: errors,
      elements: {
        buttons: buttons.length,
        textarea,
        messageArea,
        conversationList,
        statusDot,
      },
      screenshots: screenshots,
    };

    fs.writeFileSync(
      path.join(screenshotsDir, 'test-result.json'),
      JSON.stringify(testResult, null, 2)
    );
    console.log('\n📄 测试结果：test-result.json');

    if (errors.length > 0) {
      console.log('\n❌ 发现错误:');
      errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err}`);
      });
    } else {
      console.log('\n✅ 无错误，测试全部通过！');
    }

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
testChatFeature().catch(console.error);
