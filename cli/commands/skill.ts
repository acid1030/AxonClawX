interface SkillInvocation {
  name: string;
  args: string[];
  options: Record<string, any>;
}

export async function skill(name: string, args: string[]) {
  console.log(`🛠️  调用技能：${name}\n`);

  if (!name) {
    console.error('❌ 请指定技能名称');
    console.log('   用法：axon skill <name> [args...]');
    console.log('   示例：axon skill git-ops commit -m "feat: add feature"');
    process.exit(1);
  }

  // 解析参数和选项
  const options: Record<string, any> = {};
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      const key = arg.replace(/^--?/, '');
      const value = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : true;
      options[key] = value;
    } else {
      positionalArgs.push(arg);
    }
  }

  const invocation: SkillInvocation = {
    name,
    args: positionalArgs,
    options
  };

  console.log('技能参数:');
  console.log(`  名称：${invocation.name}`);
  console.log(`  参数：${invocation.args.join(' ') || '(无)'}`);
  
  if (Object.keys(invocation.options).length > 0) {
    console.log('  选项:');
    Object.entries(invocation.options).forEach(([key, value]) => {
      console.log(`    --${key}: ${value}`);
    });
  }

  console.log('\n━━━ 执行技能 ━━━');
  console.log(`  正在调用 ${name}...`);
  
  // 模拟技能执行
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.log('  ✓ 技能执行完成');
  
  // 显示结果
  console.log('\n结果:');
  switch (name) {
    case 'git-ops':
      console.log(`  已执行 git 操作：${positionalArgs[0] || 'unknown'}`);
      if (options.m) {
        console.log(`  提交信息：${options.m}`);
      }
      break;
    case 'test-gen':
      console.log(`  目标文件：${positionalArgs[0] || 'unknown'}`);
      console.log('  已生成测试用例');
      break;
    case 'doc-gen':
      console.log(`  目标文件：${positionalArgs[0] || 'unknown'}`);
      console.log('  已生成文档');
      break;
    default:
      console.log(`  技能 ${name} 执行完成`);
  }
}
