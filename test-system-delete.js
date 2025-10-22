#!/usr/bin/env node

/**
 * Agent系统删除功能测试脚本
 * 测试系统删除功能和索引文件更新
 */

// Using built-in fetch API (Node.js 18+)
const fs = require('fs').promises;
const path = require('path');

const API_BASE = 'http://localhost:4000';

async function testSystemDelete() {
  console.log('🗑️ === Agent系统删除功能测试开始 ===');
  
  try {
    console.log('\n📋 步骤1: 获取当前系统列表');
    const listResponse = await fetch(`${API_BASE}/api/agent-systems`);
    if (!listResponse.ok) {
      throw new Error(`获取系统列表失败: ${listResponse.status}`);
    }
    
    const listData = await listResponse.json();
    console.log(`✅ 当前系统数量: ${listData.systems.length}`);
    
    if (listData.systems.length === 0) {
      console.log('⚠️ 没有可删除的系统，创建一个测试系统...');
      
      // 创建测试系统
      const createResponse = await fetch(`${API_BASE}/api/agent-systems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Delete System',
          description: '用于测试删除功能的临时系统',
          userPrompt: '创建一个简单的问答系统用于测试删除功能'
        })
      });
      
      if (!createResponse.ok) {
        throw new Error(`创建测试系统失败: ${createResponse.status}`);
      }
      
      const createData = await createResponse.json();
      listData.systems = [createData.system];
      console.log(`✅ 创建测试系统成功: ${createData.system.name} (${createData.system.id})`);
    }
    
    // 显示所有系统
    listData.systems.forEach((system, idx) => {
      console.log(`  ${idx + 1}. ${system.name} (${system.id}) - ${system.status}`);
    });
    
    // 选择第一个系统进行删除测试
    const testSystem = listData.systems[0];
    
    console.log(`\n🎯 步骤2: 删除系统 "${testSystem.name}" (${testSystem.id})`);
    
    const deleteResponse = await fetch(`${API_BASE}/api/agent-systems/${testSystem.id}`, {
      method: 'DELETE'
    });
    
    console.log(`📡 DELETE响应状态: ${deleteResponse.status}`);
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(`删除失败: ${deleteResponse.status} - ${errorData.error || '未知错误'}`);
    }
    
    const deleteData = await deleteResponse.json();
    console.log('✅ 删除响应:', JSON.stringify(deleteData, null, 2));
    
    if (deleteData.success) {
      console.log(`🎉 系统删除成功!`);
      console.log(`📝 删除的系统信息:`);
      console.log(`  - ID: ${deleteData.deletedSystem.id}`);
      console.log(`  - 名称: ${deleteData.deletedSystem.name}`);
      console.log(`  - 删除时间: ${deleteData.deletedSystem.deletedAt}`);
    }
    
    console.log('\n📋 步骤3: 验证系统已删除');
    const verifyResponse = await fetch(`${API_BASE}/api/agent-systems`);
    const verifyData = await verifyResponse.json();
    
    const stillExists = verifyData.systems.find(system => system.id === testSystem.id);
    if (stillExists) {
      console.log(`❌ 验证失败: 系统仍然存在于列表中`);
    } else {
      console.log(`✅ 验证成功: 系统已从列表中移除`);
    }
    
    console.log(`📊 当前系统数量: ${verifyData.systems.length} (之前: ${listData.systems.length})`);
    
    console.log('\n📋 步骤4: 检查文件系统状态');
    
    // 检查系统文件是否被删除
    const systemsDir = path.join(process.cwd(), 'data', 'agent-systems');
    const systemFile = path.join(systemsDir, `${testSystem.id}.json`);
    
    try {
      await fs.access(systemFile);
      console.log(`❌ 系统文件仍然存在: ${systemFile}`);
    } catch (error) {
      console.log(`✅ 系统文件已删除: ${systemFile}`);
    }
    
    // 检查索引文件是否被更新
    const indexFile = path.join(systemsDir, 'index.json');
    try {
      const indexContent = await fs.readFile(indexFile, 'utf-8');
      const indexSystems = JSON.parse(indexContent);
      const systemInIndex = indexSystems.find(s => s.id === testSystem.id);
      
      if (systemInIndex) {
        console.log(`❌ 系统仍然存在于索引文件中`);
      } else {
        console.log(`✅ 系统已从索引文件中移除`);
      }
      
      console.log(`📊 索引文件中的系统数量: ${indexSystems.length}`);
    } catch (error) {
      console.log(`⚠️ 无法读取索引文件:`, error.message);
    }
    
    console.log('\n📋 步骤5: 测试删除不存在的系统');
    const notFoundResponse = await fetch(`${API_BASE}/api/agent-systems/non-existent-system`, {
      method: 'DELETE'
    });
    
    if (notFoundResponse.status === 404) {
      console.log('✅ 404错误处理正确: 删除不存在的系统返回404');
    } else {
      console.log(`⚠️ 意外的响应状态: ${notFoundResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
  
  console.log('\n🗑️ === Agent系统删除功能测试结束 ===');
}

// 运行测试
testSystemDelete();