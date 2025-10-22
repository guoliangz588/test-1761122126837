#!/usr/bin/env node

/**
 * 测试main-orchestrator的全局状态感知能力
 * 验证UI交互后orchestrator是否能感知到用户已提供的信息
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000';
const SYSTEM_ID = 'system_1754554196961_zml5w7hbh';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testOrchestratorAwareness() {
  console.log('🧠 === 测试Main-Orchestrator全局状态感知 ===');
  
  try {
    console.log('\n📋 步骤1: 首次对话 - 触发健康目标收集');
    
    // 第一次对话：触发健康目标收集
    const initialResponse = await fetch(`${API_BASE}/api/agent-chat/${SYSTEM_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '你好，我想设定健康目标' }]
      })
    });
    
    if (!initialResponse.ok) {
      throw new Error(`初始对话失败: ${initialResponse.status}`);
    }
    
    const initialResult = await initialResponse.text();
    const sessionId = initialResponse.headers.get('x-session-id') || `test_${Date.now()}`;
    console.log(`✅ 初始对话成功，Session ID: ${sessionId}`);
    console.log(`📝 Agent响应: ${initialResult.substring(0, 300)}...`);
    
    // 等待一下
    console.log('\n⏳ 等待2秒...');
    await sleep(2000);
    
    console.log('\n🎯 步骤2: 模拟UI交互 - 提交健康目标');
    
    // 模拟用户在UI中提交健康目标
    const uiInteraction = {
      toolId: 'health-goal-collection',
      eventType: 'submit',
      data: {
        healthGoals: '减重10公斤，改善睡眠质量，降低血压',
        submissionTime: new Date().toISOString(),
        action: 'goals-submitted'
      },
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      agentId: 'health-goal-collector-agent'
    };
    
    console.log('📤 提交UI交互事件...');
    const uiResponse = await fetch(`${API_BASE}/api/ui-interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uiInteraction)
    });
    
    if (!uiResponse.ok) {
      throw new Error(`UI交互失败: ${uiResponse.status}`);
    }
    
    const uiResult = await uiResponse.json();
    console.log('✅ UI交互处理完成');
    console.log(`🔄 会话是否继续: ${uiResult.sessionContinued}`);
    if (uiResult.agentResponse) {
      console.log(`🤖 Agent响应: ${uiResult.agentResponse.substring(0, 300)}...`);
    }
    
    // 等待一下
    console.log('\n⏳ 等待2秒...');
    await sleep(2000);
    
    console.log('\n🧠 步骤3: 测试Orchestrator感知能力');
    
    // 现在发送一个新的用户消息，看orchestrator是否能感知到已收集的健康目标
    const testResponse = await fetch(`${API_BASE}/api/agent-chat/${SYSTEM_ID}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-session-id': sessionId  // 使用相同的session
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '现在你知道我的健康目标了吗？' }],
        sessionId: sessionId
      })
    });
    
    if (!testResponse.ok) {
      throw new Error(`测试对话失败: ${testResponse.status}`);
    }
    
    const testResult = await testResponse.text();
    console.log(`✅ 测试对话成功`);
    console.log(`📝 Orchestrator响应: ${testResult.substring(0, 500)}...`);
    
    // 分析响应内容
    console.log('\n📊 分析结果:');
    if (testResult.includes('health-goal-collection') || 
        testResult.includes('健康目标收集') ||
        testResult.includes('请告诉我') ||
        testResult.includes('请输入')) {
      console.log('❌ 失败: Orchestrator仍然在要求收集健康目标信息');
      console.log('🔍 问题: Main-orchestrator没有感知到用户已提供的信息');
    } else if (testResult.includes('减重') || 
               testResult.includes('睡眠') || 
               testResult.includes('血压') ||
               testResult.includes('已经') ||
               testResult.includes('确认')) {
      console.log('✅ 成功: Orchestrator感知到了用户已提供的健康目标信息');
      console.log('🎉 全局状态感知功能正常工作');
    } else {
      console.log('⚠️ 未知: 无法确定Orchestrator是否感知到状态变化');
      console.log('🔍 需要查看详细日志进行分析');
    }
    
    // 获取会话历史验证
    console.log('\n📚 步骤4: 验证会话历史');
    const historyResponse = await fetch(`${API_BASE}/api/ui-interaction?sessionId=${sessionId}`);
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log(`📋 会话交互历史:`);
      console.log(`  - 总交互数: ${historyData.totalInteractions}`);
      console.log(`  - 交互类型: ${historyData.interactions.map(i => `${i.toolId}:${i.eventType}`).join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
  
  console.log('\n🧠 === Main-Orchestrator状态感知测试结束 ===');
}

// 运行测试
testOrchestratorAwareness();