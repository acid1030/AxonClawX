/**
 * Composite Pattern Pro - 使用示例
 * 
 * 展示组合模式在实际场景中的应用
 */

import { 
  CompositeManager, 
  CompositeComponent, 
  LeafComponent,
  demonstrateCompositePattern 
} from './composite-pattern-pro-skill';

// ============== 示例 1: UI 组件树 ==============

/**
 * 场景：构建一个 UI 组件树
 * 用于渲染复杂的界面结构
 */
function uiComponentTreeExample(): void {
  console.log('\n=== 示例 1: UI 组件树 ===\n');
  
  const manager = new CompositeManager();
  
  // 创建应用根节点
  const app = new CompositeComponent('app', 'MyApp');
  manager.setRoot(app);
  
  // 创建页面
  const homePage = new CompositeComponent('home-page', '首页');
  const settingsPage = new CompositeComponent('settings-page', '设置页');
  
  // 创建页面内的组件
  const header = new LeafComponent('header', '页头');
  const sidebar = new LeafComponent('sidebar', '侧边栏');
  const content = new LeafComponent('content', '内容区');
  const footer = new LeafComponent('footer', '页脚');
  
  const navMenu = new LeafComponent('nav-menu', '导航菜单');
  const themeSwitch = new LeafComponent('theme-switch', '主题切换');
  const languageSelect = new LeafComponent('language-select', '语言选择');
  
  // 构建结构
  app.add(homePage);
  app.add(settingsPage);
  
  homePage.add(header);
  homePage.add(sidebar);
  homePage.add(content);
  homePage.add(footer);
  
  settingsPage.add(navMenu);
  settingsPage.add(themeSwitch);
  settingsPage.add(languageSelect);
  
  // 执行渲染操作
  console.log('渲染整个应用:');
  const renderResult = app.operation({ action: 'render' });
  console.log(`渲染完成，包含 ${renderResult.childrenResults.length} 个页面`);
  
  // 获取所有可渲染的叶子组件
  const allComponents = app.getAllLeaves();
  console.log(`总共 ${allComponents.length} 个可渲染组件`);
}

// ============== 示例 2: 文件系统模拟 ==============

/**
 * 场景：模拟文件系统结构
 * 文件夹（复合）和文件（叶子）
 */
function fileSystemExample(): void {
  console.log('\n=== 示例 2: 文件系统模拟 ===\n');
  
  const manager = new CompositeManager();
  
  // 创建根目录
  const root = new CompositeComponent('root', '/');
  manager.setRoot(root);
  
  // 创建目录
  const documents = new CompositeComponent('docs', 'Documents');
  const pictures = new CompositeComponent('pics', 'Pictures');
  const work = new CompositeComponent('work', 'Work');
  
  // 创建文件
  const resume = new LeafComponent('resume.pdf', '简历.pdf');
  const coverLetter = new LeafComponent('cover.docx', '求职信.docx');
  const photo1 = new LeafComponent('vacation.jpg', '度假.jpg');
  const photo2 = new LeafComponent('family.png', '家庭.png');
  const report = new LeafComponent('report.xlsx', '项目报告.xlsx');
  
  // 设置元数据（文件大小）
  resume.setMetadata('size', '2.5MB');
  coverLetter.setMetadata('size', '150KB');
  photo1.setMetadata('size', '4.2MB');
  photo2.setMetadata('size', '3.8MB');
  report.setMetadata('size', '1.1MB');
  
  // 构建目录结构
  root.add(documents);
  root.add(pictures);
  documents.add(work);
  
  documents.add(resume);
  documents.add(coverLetter);
  pictures.add(photo1);
  pictures.add(photo2);
  work.add(report);
  
  // 查找文件
  const foundFile = root.findComponent('resume.pdf');
  console.log(`找到文件：${foundFile?.name}`);
  console.log(`文件大小：${foundFile?.getMetadata('size')}`);
  
  // 获取所有文件
  const allFiles = root.getAllLeaves();
  console.log(`\n所有文件 (${allFiles.length} 个):`);
  allFiles.forEach(file => {
    console.log(`  - ${file.name} (${file.getMetadata('size')})`);
  });
  
  // 统计信息
  const stats = manager.getStats();
  console.log(`\n目录结构统计:`);
  console.log(`  总节点数：${stats.total}`);
  console.log(`  目录数：${stats.composites}`);
  console.log(`  文件数：${stats.leaves}`);
  console.log(`  最大深度：${stats.maxDepth} 层`);
}

// ============== 示例 3: 组织架构 ==============

/**
 * 场景：模拟公司组织架构
 * 部门（复合）和员工（叶子）
 */
function organizationExample(): void {
  console.log('\n=== 示例 3: 组织架构 ===\n');
  
  const manager = new CompositeManager();
  
  // 创建公司根节点
  const company = new CompositeComponent('company', 'Axon 科技');
  manager.setRoot(company);
  
  // 创建部门
  const engineering = new CompositeComponent('eng', '工程部');
  const product = new CompositeComponent('prod', '产品部');
  const design = new CompositeComponent('design', '设计部');
  
  // 创建子部门
  const frontend = new CompositeComponent('frontend', '前端组');
  const backend = new CompositeComponent('backend', '后端组');
  const ai = new CompositeComponent('ai', 'AI 组');
  
  // 创建员工
  const ceo = new LeafComponent('ceo', 'CEO - 张三');
  const engLead = new LeafComponent('eng-lead', '工程总监 - 李四');
  const feDev1 = new LeafComponent('fe-dev-1', '前端开发 - 王五');
  const feDev2 = new LeafComponent('fe-dev-2', '前端开发 - 赵六');
  const beDev1 = new LeafComponent('be-dev-1', '后端开发 - 钱七');
  const aiEng1 = new LeafComponent('ai-eng-1', 'AI 工程师 - 孙八');
  const pm1 = new LeafComponent('pm-1', '产品经理 - 周九');
  const designer1 = new LeafComponent('des-1', 'UI 设计师 - 吴十');
  
  // 设置元数据
  ceo.setMetadata('level', 'C-Level');
  engLead.setMetadata('level', 'Director');
  feDev1.setMetadata('level', 'Senior');
  feDev2.setMetadata('level', 'Mid');
  beDev1.setMetadata('level', 'Senior');
  aiEng1.setMetadata('level', 'Expert');
  
  // 构建组织架构
  company.add(ceo);
  company.add(engineering);
  company.add(product);
  company.add(design);
  
  engineering.add(engLead);
  engineering.add(frontend);
  engineering.add(backend);
  engineering.add(ai);
  
  frontend.add(feDev1);
  frontend.add(feDev2);
  backend.add(beDev1);
  ai.add(aiEng1);
  
  product.add(pm1);
  design.add(designer1);
  
  // 执行全员通知
  console.log('发送全员通知:');
  const notifyResult = company.operation({ 
    type: 'notification', 
    message: '周五下午团建！' 
  });
  console.log(`通知已发送到 ${notifyResult.childrenResults.length} 个一级部门`);
  
  // 获取所有员工
  const allEmployees = company.getAllLeaves();
  console.log(`\n全体员工 (${allEmployees.length} 人):`);
  allEmployees.forEach(emp => {
    console.log(`  - ${emp.name} [${emp.getMetadata('level') || 'N/A'}]`);
  });
  
  // 查找特定员工
  const found = company.findComponent('fe-dev-1');
  console.log(`\n查找员工：${found?.name}`);
  
  // 导出组织架构图
  console.log('\n组织架构 JSON:');
  const orgJson = manager.getTreeJson();
  console.log(JSON.stringify(orgJson, null, 2));
}

// ============== 示例 4: 任务分解系统 ==============

/**
 * 场景：项目任务分解
 * 大任务（复合）分解为子任务（叶子）
 */
function taskBreakdownExample(): void {
  console.log('\n=== 示例 4: 任务分解系统 ===\n');
  
  const manager = new CompositeManager();
  
  // 创建项目根任务
  const project = new CompositeComponent('project', 'AxonClaw v2.0 开发');
  manager.setRoot(project);
  
  // 创建阶段
  const planning = new CompositeComponent('phase-1', '规划阶段');
  const development = new CompositeComponent('phase-2', '开发阶段');
  const testing = new CompositeComponent('phase-3', '测试阶段');
  const deployment = new CompositeComponent('phase-4', '部署阶段');
  
  // 创建具体任务
  const requirementAnalysis = new LeafComponent('task-1-1', '需求分析');
  const techDesign = new LeafComponent('task-1-2', '技术设计');
  const architecture = new LeafComponent('task-1-3', '架构设计');
  
  const coreModule = new LeafComponent('task-2-1', '核心模块开发');
  const uiComponents = new LeafComponent('task-2-2', 'UI 组件开发');
  const integration = new LeafComponent('task-2-3', '系统集成');
  
  const unitTest = new LeafComponent('task-3-1', '单元测试');
  const integrationTest = new LeafComponent('task-3-2', '集成测试');
  const userAcceptance = new LeafComponent('task-3-3', '用户验收测试');
  
  const deploy = new LeafComponent('task-4-1', '生产部署');
  const monitoring = new LeafComponent('task-4-2', '监控配置');
  
  // 设置任务元数据
  requirementAnalysis.setMetadata('estimate', '3 天');
  techDesign.setMetadata('estimate', '5 天');
  coreModule.setMetadata('estimate', '10 天');
  uiComponents.setMetadata('estimate', '7 天');
  unitTest.setMetadata('estimate', '5 天');
  
  // 构建任务树
  project.add(planning);
  project.add(development);
  project.add(testing);
  project.add(deployment);
  
  planning.add(requirementAnalysis);
  planning.add(techDesign);
  planning.add(architecture);
  
  development.add(coreModule);
  development.add(uiComponents);
  development.add(integration);
  
  testing.add(unitTest);
  testing.add(integrationTest);
  testing.add(userAcceptance);
  
  deployment.add(deploy);
  deployment.add(monitoring);
  
  // 执行项目启动
  console.log('启动项目:');
  const startResult = project.operation({ action: 'start' });
  console.log(`项目已启动，包含 ${startResult.childrenResults.length} 个阶段`);
  
  // 获取所有任务
  const allTasks = project.getAllLeaves();
  console.log(`\n所有任务 (${allTasks.length} 个):`);
  allTasks.forEach(task => {
    const estimate = task.getMetadata('estimate');
    console.log(`  - ${task.name}${estimate ? ` (${estimate})` : ''}`);
  });
  
  // 统计信息
  const stats = manager.getStats();
  console.log(`\n项目统计:`);
  console.log(`  总任务数：${stats.total}`);
  console.log(`  阶段数：${stats.composites}`);
  console.log(`  具体任务：${stats.leaves}`);
  console.log(`  项目深度：${stats.maxDepth} 层`);
}

// ============== 主函数 ==============

/**
 * 运行所有示例
 */
function runAllExamples(): void {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Composite Pattern Pro - 使用示例合集              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  uiComponentTreeExample();
  fileSystemExample();
  organizationExample();
  taskBreakdownExample();
  
  // 运行内置演示
  demonstrateCompositePattern();
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                所有示例执行完成！                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// 导出示例函数
export { 
  uiComponentTreeExample, 
  fileSystemExample, 
  organizationExample, 
  taskBreakdownExample,
  runAllExamples 
};

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}
