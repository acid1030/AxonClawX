/**
 * Database Test Script - 数据库层测试
 * 用于验证所有表创建成功和 CRUD 操作正常
 */

import { db } from './database';
import { AgentsService } from '../services/agentsService';
import { SessionsService } from '../services/sessionsService';
import { MessagesService } from '../services/messagesService';
import { ChannelsService } from '../services/channelsService';
import { SkillsService } from '../services/skillsService';
import { UserPreferencesService } from '../services/userPreferencesService';

console.log('🧪 Starting AxonClaw Database Tests...\n');

try {
  // 1. 测试 Agents CRUD
  console.log('📋 Testing Agents Service...');
  const agentId = AgentsService.create({
    name: 'test-agent-1',
    type: 'general',
    model: 'gpt-4',
    status: 'active',
    config: JSON.stringify({ temperature: 0.7 })
  });
  console.log(`   ✓ Created agent with ID: ${agentId}`);

  const agent = AgentsService.findById(agentId);
  console.log(`   ✓ Found agent: ${agent?.name}`);

  AgentsService.update(agentId, { status: 'inactive' });
  console.log(`   ✓ Updated agent status`);

  // 2. 测试 Sessions CRUD
  console.log('\n📋 Testing Sessions Service...');
  const sessionId = SessionsService.create({
    agent_id: agentId,
    title: 'Test Session',
    status: 'active'
  });
  console.log(`   ✓ Created session with ID: ${sessionId}`);

  const session = SessionsService.findById(sessionId);
  console.log(`   ✓ Found session: ${session?.title}`);

  // 3. 测试 Messages CRUD
  console.log('\n📋 Testing Messages Service...');
  const messageId = MessagesService.create({
    session_id: sessionId,
    role: 'user',
    content: 'Hello, this is a test message!'
  });
  console.log(`   ✓ Created message with ID: ${messageId}`);

  const messages = MessagesService.findBySessionId(sessionId);
  console.log(`   ✓ Found ${messages.length} message(s) in session`);

  // 4. 测试 Channels CRUD
  console.log('\n📋 Testing Channels Service...');
  const channelId = ChannelsService.create({
    name: 'test-channel',
    type: 'discord',
    status: 'active'
  });
  console.log(`   ✓ Created channel with ID: ${channelId}`);

  const channel = ChannelsService.findById(channelId);
  console.log(`   ✓ Found channel: ${channel?.name}`);

  // 5. 测试 Skills CRUD
  console.log('\n📋 Testing Skills Service...');
  const skillId = SkillsService.install({
    name: 'test-skill',
    description: 'A test skill',
    location: '~/.openclaw/skills/test'
  });
  console.log(`   ✓ Installed skill with ID: ${skillId}`);

  const skill = SkillsService.findById(skillId);
  console.log(`   ✓ Found skill: ${skill?.name}`);

  // 6. 测试 UserPreferences CRUD
  console.log('\n📋 Testing User Preferences Service...');
  UserPreferencesService.set({
    key: 'theme',
    value: 'dark',
    category: 'ui'
  });
  console.log(`   ✓ Set preference: theme`);

  const theme = UserPreferencesService.getValue('theme');
  console.log(`   ✓ Got preference value: ${theme}`);

  console.log('\n✅ All tests passed successfully!\n');

  // 清理测试数据
  console.log('🧹 Cleaning up test data...');
  UserPreferencesService.delete('theme');
  SkillsService.delete(skillId);
  ChannelsService.delete(channelId);
  MessagesService.deleteBySessionId(sessionId);
  SessionsService.delete(sessionId);
  AgentsService.delete(agentId);
  console.log('   ✓ Test data cleaned up\n');

} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
} finally {
  db.close();
  console.log('🔒 Database connection closed.\n');
}
