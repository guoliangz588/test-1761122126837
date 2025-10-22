#!/bin/bash

# Agent System Integration Test Runner
echo "🚀 Starting Agent System Integration Tests..."

# 检查环境变量
echo "🔑 Checking environment variables..."
if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    echo "⚠️  GOOGLE_GENERATIVE_AI_API_KEY not found in environment"
    echo "📄 Checking .env.local file..."
    if [ -f ".env.local" ]; then
        source .env.local
        echo "✅ Loaded environment from .env.local"
    else
        echo "❌ No .env.local file found"
        echo "Please create .env.local with GOOGLE_GENERATIVE_AI_API_KEY"
        exit 1
    fi
else
    echo "✅ GOOGLE_GENERATIVE_AI_API_KEY found"
fi

# 运行集成测试
echo "🧪 Running Agent System Integration Tests..."
echo "📝 These tests directly call the agent system code without HTTP requests"
echo "🤖 Testing with Gemini 2.5 Flash model..."

echo "🔧 Running Unit Integration Tests (direct code)..."
npm test -- __tests__/agent-system-integration.test.ts --verbose --testTimeout=60000

echo ""
echo "🌐 Running API Integration Tests (HTTP endpoints)..."
npm test -- __tests__/agent-system-api.test.ts --verbose --testTimeout=60000

echo "✅ All integration tests completed!"