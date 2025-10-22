#!/usr/bin/env node

/**
 * 完整流程测试脚本
 * 模拟用户从开始对话到UI交互的完整流程
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000';
const SYSTEM_ID = 'system_1754554196961_zml5w7hbh';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  console.log('🚀 === 完整流程测试开始 ===');
  
  try {
    // 步骤1: 验证系统状态
    console.log('\n📋 步骤1: 验证系统状态');
    const systemResponse = await fetch(`${API_BASE}/api/agent-systems/${SYSTEM_ID}`);
    if (!systemResponse.ok) {
      throw new Error(`无法获取系统信息: ${systemResponse.status}`);
    }
    const systemData = await systemResponse.json();
    console.log(`✅ 系统状态: ${systemData.system.status}`);
    console.log(`🤖 Agent数量: ${systemData.system.agents.length}`);
    
    // 步骤2: 开始对话
    console.log('\n💬 步骤2: 开始与系统对话');
    const chatResponse = await fetch(`${API_BASE}/api/agent-chat/${SYSTEM_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '你好，我想设定我的健康目标' }
        ]
      })
    });
    
    if (!chatResponse.ok) {
      throw new Error(`对话请求失败: ${chatResponse.status}`);
    }
    
    // 读取流响应
    const chatResult = await chatResponse.text();
    console.log('🤖 Agent响应:', chatResult.substring(0, 500) + '...');
    
    // 从响应头获取sessionId
    const sessionId = chatResponse.headers.get('x-session-id') || `test_session_${Date.now()}`;
    console.log(`📝 Session ID: ${sessionId}`);
    
    // 步骤3: 等待一下，然后模拟UI交互
    console.log('\n⏳ 步骤3: 等待2秒，然后模拟UI交互...');
    await sleep(2000);
    
    // 步骤4: 模拟用户在health-goal-collection中提交数据
    console.log('\n🎯 步骤4: 模拟UI交互 - 提交健康目标');
    const uiInteractionEvent = {
      toolId: 'health-goal-collection',
      eventType: 'submit',
      data: {
        healthGoals: '减重10公斤，改善睡眠质量，增强心血管健康',
        submissionTime: new Date().toISOString(),
        action: 'goals-submitted'
      },
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      agentId: 'health-goal-collector-agent'
    };
    
    console.log('📤 发送UI交互事件:');
    console.log(JSON.stringify(uiInteractionEvent, null, 2));
    
    const uiResponse = await fetch(`${API_BASE}/api/ui-interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(uiInteractionEvent)
    });
    
    if (!uiResponse.ok) {
      throw new Error(`UI交互请求失败: ${uiResponse.status}`);
    }
    
    const uiResult = await uiResponse.json();
    console.log('✅ UI交互响应:');
    console.log(JSON.stringify(uiResult, null, 2));
    
    // 步骤5: 验证Agent是否响应了UI交互
    if (uiResult.sessionContinued) {
      console.log('🎉 成功! Agent识别并响应了UI交互');
      console.log('🤖 Agent响应内容:', uiResult.agentResponse);
    } else {
      console.log('⚠️ 警告: 会话未继续，Agent可能没有正确处理UI交互');
    }
    
    // 步骤6: 获取会话历史验证
    console.log('\n📚 步骤6: 获取会话交互历史');
    const historyResponse = await fetch(`${API_BASE}/api/ui-interaction?sessionId=${sessionId}`);
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log('📋 交互历史:');
      console.log(`  - 总交互数: ${historyData.totalInteractions}`);
      console.log(`  - 交互事件:`, historyData.interactions.map(i => `${i.toolId}:${i.eventType}`));
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
  
  console.log('\n🚀 === 完整流程测试结束 ===');
}

// 运行测试
testCompleteFlow();