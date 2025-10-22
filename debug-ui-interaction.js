#!/usr/bin/env node

/**
 * UI交互调试脚本
 * 用于测试UI工具提交后的消息传递流程
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000';

async function testUIInteraction() {
  console.log('🔍 === UI交互调试测试开始 ===');
  
  try {
    // 模拟UI交互事件
    const testEvent = {
      toolId: 'health-goal-collection',
      eventType: 'submit',
      data: {
        healthGoals: '测试健康目标：减肥，运动，改善睡眠',
        submissionTime: new Date().toISOString(),
        action: 'goals-submitted'
      },
      timestamp: new Date().toISOString(),
      sessionId: 'test_session_' + Date.now(),
      agentId: 'health-goal-collector-agent'
    };
    
    console.log('📤 发送测试UI交互事件:');
    console.log(JSON.stringify(testEvent, null, 2));
    
    const response = await fetch(`${API_BASE}/api/ui-interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testEvent)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ API响应:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.sessionContinued) {
      console.log('🎉 会话成功继续，Agent已响应');
    } else {
      console.log('⚠️ 会话未继续，可能需要检查配置');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
  
  console.log('🔍 === UI交互调试测试结束 ===');
}

// 运行测试
testUIInteraction();