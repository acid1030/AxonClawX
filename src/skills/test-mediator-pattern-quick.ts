/**
 * Mediator Pattern Quick Test
 * 
 * 快速验证中介者模式功能
 */

import {
  ConcreteMediator,
  ChatUser,
  createMediator,
  setupChatRoom,
} from './mediator-pattern-skill';

console.log('🧪 Mediator Pattern Quick Test\n');

// ==================== Test 1: 基础功能测试 ====================
console.log('=== Test 1: Basic Functionality ===\n');

const mediator = createMediator({
  maxMessageHistory: 10,
  enableLogging: true,
});

const user1 = new ChatUser('u1', 'Alice');
const user2 = new ChatUser('u2', 'Bob');
const user3 = new ChatUser('u3', 'Charlie');

// 设置消息处理器
user1.setMessageHandler((event: string, data?: any) => {
  console.log(`  👤 ${user1.name} received: ${event}`, data?.content ? `- "${data.content}"` : '');
});

user2.setMessageHandler((event: string, data?: any) => {
  console.log(`  👤 ${user2.name} received: ${event}`, data?.content ? `- "${data.content}"` : '');
});

user3.setMessageHandler((event: string, data?: any) => {
  console.log(`  👤 ${user3.name} received: ${event}`, data?.content ? `- "${data.content}"` : '');
});

// 注册
mediator.register(user1);
mediator.register(user2);
mediator.register(user3);

console.log(`\n📊 Mediator Status:`, mediator.getStatus());

// 发送消息
console.log('\n💬 Sending messages...\n');
user1.sendMessage('Hello everyone!');
user2.sendMessage('Hi Alice!');
user3.sendMessage('Hey team!');

console.log('\n📊 Final Status:', mediator.getStatus());

// ==================== Test 2: 快速设置聊天室 ====================
console.log('\n\n=== Test 2: Quick Chat Room Setup ===\n');

const { mediator: chatMediator, users } = setupChatRoom(['dev1', 'dev2', 'dev3'], {
  maxMessageHistory: 20,
  enableLogging: false,
});

console.log(`Created chat room with ${chatMediator.getColleagueCount()} users`);

users[0].setMessageHandler((event: string, data?: any) => {
  console.log(`  📨 ${users[0].name}: ${data?.content}`);
});

users[1].sendMessage('Quick test message');

// ==================== Test 3: 消息历史 ====================
console.log('\n\n=== Test 3: Message History ===\n');

const history = mediator.getMessageHistory(5);
console.log(`Last ${history.length} messages:`);
history.forEach((msg: any, idx: number) => {
  console.log(`  ${idx + 1}. [${msg.from}] ${msg.event} @ ${new Date(msg.timestamp).toLocaleTimeString()}`);
});

// ==================== Test 4: 移除同事 ====================
console.log('\n\n=== Test 4: Remove Colleague ===\n');

console.log(`Before removal: ${mediator.getColleagueCount()} colleagues`);
mediator.remove(user3);
console.log(`After removal: ${mediator.getColleagueCount()} colleagues`);

// ==================== Test 5: 点对点通信 ====================
console.log('\n\n=== Test 5: Point-to-Point Communication ===\n');

const p2pMediator = createMediator({
  broadcastByDefault: false,
  enableLogging: true,
});

const sender = new ChatUser('sender', 'Sender');
const receiver = new ChatUser('receiver', 'Receiver');
const bystander = new ChatUser('bystander', 'Bystander');

receiver.setMessageHandler((event: string, data?: any) => {
  console.log(`  ✅ ${receiver.name} received: "${data?.content}"`);
});

bystander.setMessageHandler((event: string, data?: any) => {
  console.log(`  ❌ ${bystander.name} received (should not happen): "${data?.content}"`);
});

p2pMediator.register(sender);
p2pMediator.register(receiver);
p2pMediator.register(bystander);

console.log('Sending private message...\n');
if (p2pMediator instanceof ConcreteMediator) {
  p2pMediator.sendTo('receiver', sender, 'private_message', { content: 'This is private!' });
}

// ==================== 总结 ====================
console.log('\n\n✅ All tests completed!\n');
