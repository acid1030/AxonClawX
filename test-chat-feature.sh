#!/bin/bash

echo "========================================="
echo "AxonClaw 对话功能测试"
echo "========================================="
echo ""

# 1. 检查 Vite 服务
echo "1️⃣ 检查 Vite 开发服务器..."
if curl -s http://localhost:5173 | grep -q "AxonClaw"; then
    echo "✅ Vite 服务正常（端口 5173）"
else
    echo "❌ Vite 服务未运行"
    exit 1
fi

# 2. 检查 Gateway
echo ""
echo "2️⃣ 检查 OpenClaw Gateway..."
if lsof -i :18791 -i :18792 | grep -q LISTEN; then
    echo "✅ Gateway 正在运行"
    echo "   - HTTP: http://127.0.0.1:18791"
    echo "   - WebSocket: ws://127.0.0.1:18792"
else
    echo "⚠️  Gateway 未运行（对话功能需要 Gateway）"
fi

# 3. 检查关键文件
echo ""
echo "3️⃣ 检查关键组件..."
files=(
    "src/renderer/components/chat/ChatView.tsx"
    "src/renderer/components/chat/ConversationList.tsx"
    "src/renderer/components/chat/MessageList.tsx"
    "src/renderer/components/chat/ChatInput.tsx"
    "src/renderer/stores/sessionsStore.ts"
    "src/renderer/services/gateway.ts"
    "src/renderer/components/layout/MainLayout.tsx"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
        all_exist=false
    fi
done

if [ "$all_exist" = false ]; then
    echo "❌ 关键文件缺失"
    exit 1
fi

# 4. 检查组件导入
echo ""
echo "4️⃣ 检查组件集成..."
if grep -q "ChatView" src/renderer/components/layout/MainLayout.tsx; then
    echo "✅ ChatView 已集成到 MainLayout"
else
    echo "❌ ChatView 未集成"
    exit 1
fi

# 5. 检查 Gateway Token
echo ""
echo "5️⃣ 检查 Gateway Token 配置..."
token_file="$HOME/.openclaw/data/gateway-token.json"
if [ -f "$token_file" ]; then
    echo "✅ Gateway Token 文件存在"
    echo "   位置: $token_file"
else
    echo "⚠️  Gateway Token 文件不存在"
    echo "   需要手动配置：localStorage.setItem('gateway_token', 'YOUR_TOKEN')"
fi

# 6. 测试总结
echo ""
echo "========================================="
echo "测试总结"
echo "========================================="

if lsof -i :18791 -i :18792 | grep -q LISTEN; then
    echo "✅ 所有测试通过！"
    echo ""
    echo "🚀 使用方法："
    echo "1. 打开浏览器访问 http://localhost:5173"
    echo "2. 点击侧边栏 💬 按钮进入对话界面"
    echo "3. 如需完整功能，配置 Gateway Token："
    echo "   localStorage.setItem('gateway_token', 'YOUR_TOKEN');"
    echo ""
else
    echo "⚠️  基础功能正常，但需要启动 Gateway 以使用完整功能"
    echo ""
    echo "启动 Gateway："
    echo "  ClawX: 自动启动"
    echo "  CLI: openclaw gateway start"
    echo ""
fi

echo "详细文档："
echo "  - GATEWAY_CONFIG.md"
echo "  - CHAT_FEATURE_STATUS.md"
echo ""
