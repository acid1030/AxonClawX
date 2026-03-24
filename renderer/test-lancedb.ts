import { VectorMemoryService } from './memory/vector-memory';

console.log('🧪 测试 LanceDB + Ollama...\n');

async function test() {
  try {
    const memory = new VectorMemoryService({
      tableName: 'test_memory'
    });

    console.log('✅ 1. LanceDB 服务创建成功');

    const testEntry = await memory.addMemory({
      text: '这是一个测试记忆',
      metadata: { type: 'test' }
    });

    console.log('✅ 2. 添加记忆成功:', testEntry.id);
    console.log('   内容:', testEntry.text);

    await memory.reset();
    console.log('✅ 3. 清理测试数据完成');

    console.log('\n✅ LanceDB 测试全部通过！');
    console.log('   - 连接 Ollama: ✅');
    console.log('   - 生成 Embedding: ✅');
    console.log('   - 存储到 LanceDB: ✅');
  } catch (error) {
    console.error('\n❌ LanceDB 测试失败:', error);
    process.exit(1);
  }
}

test();
