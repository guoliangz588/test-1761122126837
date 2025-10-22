#!/usr/bin/env node

/**
 * Google API 代理测试脚本
 * 用于测试代理配置是否正确，以及Google API是否可以正常访问
 */

const { config } = require('dotenv');
const path = require('path');

// 加载环境变量
config({ path: path.join(__dirname, '../.env.local') });

// 动态导入ES模块
async function testGoogleProxy() {
  try {
    console.log('🚀 开始测试Google API代理配置...\n');

    // 显示当前配置
    console.log('📋 当前配置:');
    console.log('  PROXY_ENABLED:', process.env.PROXY_ENABLED || 'false');
    console.log('  PROXY_HOST:', process.env.PROXY_HOST || '127.0.0.1');
    console.log('  PROXY_PORT:', process.env.PROXY_PORT || '7890');
    console.log('  PROXY_PROTOCOL:', process.env.PROXY_PROTOCOL || 'http');
    console.log('  GOOGLE_GENERATIVE_AI_API_KEY:', process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '已设置' : '未设置');
    console.log('');

    // 检查API密钥
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('❌ 错误: GOOGLE_GENERATIVE_AI_API_KEY 未设置');
      console.log('请在 .env.local 文件中设置你的Google API密钥');
      process.exit(1);
    }

    // 导入代理模块 (需要先编译TypeScript)
    console.log('📦 编译TypeScript模块...');

    // 使用ts-node来运行TypeScript模块
    const tsNode = require('ts-node');
    tsNode.register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true
      }
    });

    const { testGoogleAPIProxyConnection, googleAPIProxy } = require('../lib/config/google-proxy.ts');

    // 显示代理状态
    const status = googleAPIProxy.getProxyStatus();
    console.log('📊 代理状态:');
    console.log('  已初始化:', status.initialized);
    console.log('  已启用:', status.enabled);
    console.log('  配置:', JSON.stringify(status.config, null, 2));
    console.log('');

    // 测试连接
    console.log('🧪 测试Google API连接...');
    await testGoogleAPIProxyConnection();

    console.log('\n🎉 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('\n🔍 可能的解决方案:');
    console.error('1. 检查代理服务器是否正在运行');
    console.error('2. 检查代理配置是否正确');
    console.error('3. 检查Google API密钥是否有效');
    console.error('4. 检查网络连接');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('5. 代理服务器连接被拒绝，请检查代理地址和端口');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('5. 连接超时，请检查网络和防火墙设置');
    }
    
    process.exit(1);
  }
}

// 运行测试
testGoogleProxy();
