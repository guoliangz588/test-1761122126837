#!/usr/bin/env node

/**
 * UI工具删除功能测试脚本
 * 测试UI工具的删除功能和系统配置自动更新
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000';

async function testUIToolDelete() {
  console.log('🗑️ === UI工具删除功能测试开始 ===');
  
  try {
    console.log('\n📋 步骤1: 获取当前UI工具列表');
    const listResponse = await fetch(`${API_BASE}/api/ui-register`);
    if (!listResponse.ok) {
      throw new Error(`获取工具列表失败: ${listResponse.status}`);
    }
    
    const listData = await listResponse.json();
    console.log(`✅ 当前UI工具数量: ${listData.tools.length}`);
    
    if (listData.tools.length === 0) {
      console.log('⚠️ 没有可删除的UI工具，测试结束');
      return;
    }
    
    // 显示所有工具
    listData.tools.forEach((tool, idx) => {
      console.log(`  ${idx + 1}. ${tool.name} (${tool.id}) - ${tool.description}`);
    });
    
    // 选择一个工具进行删除测试（选择第一个非核心工具）
    let testTool = null;
    for (const tool of listData.tools) {
      // 避免删除核心功能工具
      if (!['health-goal-collection', 'goal-summary-display'].includes(tool.id)) {
        testTool = tool;
        break;
      }
    }
    
    if (!testTool) {
      console.log('⚠️ 没有可安全删除的测试工具，创建一个测试工具...');
      
      // 创建测试工具
      const createResponse = await fetch(`${API_BASE}/api/ui-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Delete Tool',
          description: '用于测试删除功能的临时工具',
          code: 'export default function TestDeleteTool() { return <div className="p-4 text-center">这是一个测试工具，用于验证删除功能</div>; }'
        })
      });
      
      if (!createResponse.ok) {
        throw new Error(`创建测试工具失败: ${createResponse.status}`);
      }
      
      const createData = await createResponse.json();
      testTool = createData.tool;
      console.log(`✅ 创建测试工具成功: ${testTool.name} (${testTool.id})`);
    }
    
    console.log(`\n🎯 步骤2: 删除工具 "${testTool.name}" (${testTool.id})`);
    
    const deleteResponse = await fetch(`${API_BASE}/api/ui-register?id=${encodeURIComponent(testTool.id)}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(`删除失败: ${deleteResponse.status} - ${errorData.error || '未知错误'}`);
    }
    
    const deleteData = await deleteResponse.json();
    console.log('✅ 删除响应:', JSON.stringify(deleteData, null, 2));
    
    if (deleteData.success) {
      console.log(`🎉 工具删除成功!`);
      console.log(`📝 删除的工具信息:`);
      console.log(`  - ID: ${deleteData.deletedTool.id}`);
      console.log(`  - 名称: ${deleteData.deletedTool.name}`);
      console.log(`  - 描述: ${deleteData.deletedTool.description}`);
      console.log(`  - 文件名: ${deleteData.deletedTool.filename}`);
      console.log(`  - 删除时间: ${deleteData.deletedTool.deletedAt}`);
      
      if (deleteData.systemsUpdatedCount > 0) {
        console.log(`🔄 系统配置更新:`);
        console.log(`  - 更新的系统数量: ${deleteData.systemsUpdatedCount}`);
        console.log(`  - 更新的系统列表: ${deleteData.updatedSystems.join(', ')}`);
      } else {
        console.log(`📊 没有系统配置需要更新`);
      }
    }
    
    console.log('\n📋 步骤3: 验证工具已删除');
    const verifyResponse = await fetch(`${API_BASE}/api/ui-register`);
    const verifyData = await verifyResponse.json();
    
    const stillExists = verifyData.tools.find(tool => tool.id === testTool.id);
    if (stillExists) {
      console.log(`❌ 验证失败: 工具仍然存在于列表中`);
    } else {
      console.log(`✅ 验证成功: 工具已从列表中移除`);
    }
    
    console.log(`📊 当前UI工具数量: ${verifyData.tools.length} (之前: ${listData.tools.length})`);
    
    console.log('\n📋 步骤4: 测试删除不存在的工具');
    const notFoundResponse = await fetch(`${API_BASE}/api/ui-register?id=non-existent-tool`, {
      method: 'DELETE'
    });
    
    if (notFoundResponse.status === 404) {
      console.log('✅ 404错误处理正确: 删除不存在的工具返回404');
    } else {
      console.log(`⚠️ 意外的响应状态: ${notFoundResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
  
  console.log('\n🗑️ === UI工具删除功能测试结束 ===');
}

// 运行测试
testUIToolDelete();