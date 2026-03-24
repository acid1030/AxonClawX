const { chromium } = require('playwright');

(async () => {
  console.log('启动浏览器测试...\n');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('✓ 访问 http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });
    
    // 等待 React 应用加载
    await page.waitForTimeout(3000);
    
    // 截图
    await page.screenshot({ path: 'test-screenshots/01-homepage.png', fullPage: true });
    console.log('✓ 截图: test-screenshots/01-homepage.png\n');
    
    // 测试 1: 页面标题
    const title = await page.title();
    console.log(`【测试 1】页面标题: ${title}`);
    console.log(title.includes('AxonClaw') ? '  ✅ 通过' : '  ❌ 失败\n');
    
    // 测试 2: 检查侧边栏
    const sidebar = await page.$('nav, aside, [class*="sidebar"], [class*="Sidebar"]');
    console.log(`【测试 2】侧边栏: ${sidebar ? '✅ 存在' : '❌ 未找到'}`);
    
    // 测试 3: 检查主要区域
    const mainContent = await page.$('main, [role="main"], [class*="content"], [class*="dashboard"]');
    console.log(`【测试 3】主要内容区域: ${mainContent ? '✅ 存在' : '❌ 未找到'}`);
    
    // 测试 4: 检查聊天输入
    const chatInput = await page.$('input[type="text"], textarea, [contenteditable="true"]');
    console.log(`【测试 4】聊天输入框: ${chatInput ? '✅ 存在' : '❌ 未找到'}`);
    
    // 测试 5: 检查发送按钮
    const sendBtn = await page.$('button[type="submit"], button:has-text("发送"), button:has-text("Send")');
    console.log(`【测试 5】发送按钮: ${sendBtn ? '✅ 存在' : '❌ 未找到'}`);
    
    // 测试 6: 检查 Gateway 状态指示
    const statusIndicator = await page.$('[class*="status"], [class*="indicator"], [class*="connection"]');
    console.log(`【测试 6】状态指示器: ${statusIndicator ? '✅ 存在' : '❌ 未找到'}`);
    
    // 测试 7: 测试聊天功能（如果输入框存在）
    if (chatInput) {
      console.log('\n【测试 7】聊天功能测试:');
      
      try {
        // 输入消息
        await chatInput.fill('测试消息 - Hello AxonClaw!');
        console.log('  ✓ 输入测试消息');
        await page.waitForTimeout(500);
        
        // 截图
        await page.screenshot({ path: 'test-screenshots/02-typed-message.png' });
        console.log('  ✓ 截图: test-screenshots/02-typed-message.png');
        
        // 查找并点击发送按钮
        const submitBtn = await page.$('button[type="submit"], button:has-text("发送"), button:has-text("Send")');
        if (submitBtn) {
          await submitBtn.click();
          console.log('  ✓ 点击发送按钮');
          await page.waitForTimeout(1000);
          
          // 截图
          await page.screenshot({ path: 'test-screenshots/03-after-send.png' });
          console.log('  ✓ 截图: test-screenshots/03-after-send.png');
          
          // 检查消息是否显示
          const messageVisible = await page.$('text=测试消息');
          console.log(`  ${messageVisible ? '✅ 消息已显示' : '❌ 消息未显示'}`);
        } else {
          console.log('  ⚠️  未找到发送按钮，尝试按 Enter 键');
          await chatInput.press('Enter');
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.log(`  ❌ 聊天测试失败: ${error.message}`);
      }
    }
    
    // 测试 8: 检查控制台错误
    console.log('\n【测试 8】控制台日志检查:');
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`ERROR: ${msg.text()}`);
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleLogs.length > 0) {
      console.log(`  ⚠️  发现 ${consoleLogs.length} 个错误:`);
      consoleLogs.slice(0, 3).forEach(log => console.log(`    ${log}`));
    } else {
      console.log('  ✅ 无控制台错误');
    }
    
    // 最终截图
    await page.screenshot({ path: 'test-screenshots/04-final.png', fullPage: true });
    console.log('\n✓ 最终截图: test-screenshots/04-final.png');
    
    // 保持浏览器打开几秒
    console.log('\n浏览器将在 5 秒后关闭...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    await page.screenshot({ path: 'test-screenshots/error.png' });
  } finally {
    await browser.close();
    console.log('\n✓ 测试完成');
  }
})();
