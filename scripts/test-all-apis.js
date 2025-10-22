#!/usr/bin/env node

/**
 * 全面测试所有Google API功能
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000';

async function testAPI(endpoint, description) {
  try {
    console.log(`🧪 测试 ${description}...`);
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      timeout: 30000
    });
    
    if (response.status === 200) {
      console.log(`✅ ${description} - 成功`);
      if (response.data.success !== undefined) {
        console.log(`   状态: ${response.data.success ? '成功' : '失败'}`);
        if (response.data.message) {
          console.log(`   消息: ${response.data.message}`);
        }
      }
      return true;
    } else {
      console.log(`❌ ${description} - HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description} - 错误: ${error.message}`);
    if (error.response?.data) {
      console.log(`   详情: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testPOSTAPI(endpoint, data, description) {
  try {
    console.log(`🧪 测试 ${description}...`);
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, data, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      console.log(`✅ ${description} - 成功`);
      if (response.data.success !== undefined) {
        console.log(`   状态: ${response.data.success ? '成功' : '失败'}`);
        if (response.data.system?.id) {
          console.log(`   系统ID: ${response.data.system.id}`);
        }
      }
      return response.data;
    } else {
      console.log(`❌ ${description} - HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${description} - 错误: ${error.message}`);
    if (error.response?.data) {
      console.log(`   详情: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 开始全面测试Google API代理功能...\n');

  const tests = [
    // 基础代理测试
    { endpoint: '/api/test-proxy', description: '代理配置测试' },
    { endpoint: '/api/test-gemini', description: 'Gemini API测试' },
    
    // UI工具API测试
    { endpoint: '/api/ui-register', description: 'UI工具注册API' },
    
    // Agent系统API测试
    { endpoint: '/api/agent-systems', description: 'Agent系统列表API' },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  // 运行GET测试
  for (const test of tests) {
    const success = await testAPI(test.endpoint, test.description);
    if (success) passedTests++;
    console.log(''); // 空行分隔
  }

  // 测试Agent系统创建
  console.log('🧪 测试Agent系统创建...');
  const createResult = await testPOSTAPI('/api/agent-systems', {
    name: '测试系统',
    description: '用于测试代理功能的Agent系统',
    userPrompt: '创建一个简单的问候系统，能够用中文和英文问候用户'
  }, 'Agent系统创建');

  if (createResult && createResult.success) {
    passedTests++;
    console.log('✅ Agent系统创建成功');
    
    // 如果创建成功，测试聊天功能
    if (createResult.system?.id) {
      console.log('\n🧪 测试Agent聊天功能...');
      const chatResult = await testPOSTAPI(`/api/agent-chat/${createResult.system.id}`, {
        messages: [
          { role: 'user', content: '你好，请用中文问候我' }
        ]
      }, 'Agent聊天功能');
      
      if (chatResult) {
        passedTests++;
        console.log('✅ Agent聊天功能测试成功');
      }
      totalTests++;
    }
  }
  totalTests++;

  // 测试普通聊天API
  console.log('\n🧪 测试普通聊天API...');
  const chatResult = await testPOSTAPI('/api/chat', {
    messages: [
      { role: 'user', content: '请用中文说你好' }
    ]
  }, '普通聊天API');

  if (chatResult) {
    passedTests++;
    console.log('✅ 普通聊天API测试成功');
  }
  totalTests++;

  // 输出测试结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log(`✅ 通过: ${passedTests}/${totalTests}`);
  console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📈 成功率: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！Google API代理配置完全正常！');
    console.log('✨ 你现在可以正常使用所有需要Google API的功能了。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关配置。');
  }

  console.log('\n📝 代理配置信息:');
  console.log('  代理地址: http://127.0.0.1:7890');
  console.log('  代理状态: 已启用');
  console.log('  支持的API: Google Generative AI (Gemini)');
  console.log('  测试时间:', new Date().toLocaleString('zh-CN'));
}

// 运行测试
runAllTests().catch(console.error);
