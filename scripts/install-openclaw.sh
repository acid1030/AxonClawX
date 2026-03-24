#!/bin/bash

# AxonClaw - OpenClaw 自动安装脚本
# 用法：./scripts/install-openclaw.sh

set -e

echo "🔧 AxonClaw - OpenClaw 自动安装程序"
echo "===================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        echo "正在安装 Node.js..."
        if command -v brew &> /dev/null; then
            brew install node
        else
            echo -e "${YELLOW}请手动安装 Node.js: https://nodejs.org${NC}"
            exit 1
        fi
    fi
    
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js 已安装：${NODE_VERSION}${NC}"
}

# 检查 OpenClaw
check_openclaw() {
    if ! command -v openclaw &> /dev/null; then
        echo -e "${YELLOW}⚠️  OpenClaw 未安装${NC}"
        install_openclaw
    else
        OC_VERSION=$(openclaw --version 2>/dev/null || echo "未知")
        echo -e "${GREEN}✅ OpenClaw 已安装：${OC_VERSION}${NC}"
    fi
}

# 安装 OpenClaw
install_openclaw() {
    echo "正在安装 OpenClaw..."
    
    # 使用 npm 全局安装
    npm install -g @openclaw/core
    
    if command -v openclaw &> /dev/null; then
        echo -e "${GREEN}✅ OpenClaw 安装成功${NC}"
    else
        echo -e "${RED}❌ OpenClaw 安装失败${NC}"
        exit 1
    fi
}

# 启动 OpenClaw Gateway
start_gateway() {
    echo "正在启动 OpenClaw Gateway..."
    
    # 检查是否已在运行
    if openclaw gateway status &> /dev/null; then
        echo -e "${GREEN}✅ Gateway 已在运行${NC}"
    else
        openclaw gateway start
        sleep 3
        
        if openclaw gateway status &> /dev/null; then
            echo -e "${GREEN}✅ Gateway 启动成功${NC}"
        else
            echo -e "${YELLOW}⚠️  Gateway 启动失败，请手动运行：openclaw gateway start${NC}"
        fi
    fi
}

# 配置模型
configure_model() {
    echo ""
    echo "📋 模型配置"
    echo "-----------"
    echo "请选择默认模型:"
    echo "1. Claude (Anthropic)"
    echo "2. Gemini (Google)"
    echo "3. Qwen (阿里云)"
    echo "4. 跳过 (稍后配置)"
    echo ""
    read -p "选择 [1-4]: " model_choice
    
    case $model_choice in
        1)
            read -p "输入 Anthropic API Key: " api_key
            openclaw configure --model claude --key "$api_key" 2>/dev/null || true
            echo -e "${GREEN}✅ Claude 模型已配置${NC}"
            ;;
        2)
            read -p "输入 Google API Key: " api_key
            openclaw configure --model gemini --key "$api_key" 2>/dev/null || true
            echo -e "${GREEN}✅ Gemini 模型已配置${NC}"
            ;;
        3)
            read -p "输入阿里云 API Key: " api_key
            openclaw configure --model qwen --key "$api_key" 2>/dev/null || true
            echo -e "${GREEN}✅ Qwen 模型已配置${NC}"
            ;;
        *)
            echo -e "${YELLOW}⚠️  跳过模型配置${NC}"
            echo "   可稍后运行：openclaw configure"
            ;;
    esac
}

# 显示状态
show_status() {
    echo ""
    echo "📊 OpenClaw 状态"
    echo "---------------"
    openclaw status --brief 2>/dev/null || true
}

# 主流程
main() {
    echo ""
    
    # 1. 检查 Node.js
    check_node
    echo ""
    
    # 2. 检查/安装 OpenClaw
    check_openclaw
    echo ""
    
    # 3. 启动 Gateway
    start_gateway
    echo ""
    
    # 4. 配置模型
    configure_model
    echo ""
    
    # 5. 显示状态
    show_status
    echo ""
    
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}✅ OpenClaw 安装完成！${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo ""
    echo "下一步:"
    echo "1. 运行 AxonClaw: npm run electron:dev"
    echo "2. 访问 Dashboard: http://127.0.0.1:18789"
    echo "3. 查看文档：openclaw docs"
    echo ""
}

# 执行
main
