#!/usr/bin/env node

/**
 * 系统配置验证脚本
 * 验证Agent系统配置的完整性和正确性
 */

const fs = require('fs');
const path = require('path');

function validateSystemConfig() {
  console.log('🔍 === 系统配置验证开始 ===');
  
  try {
    // 读取系统配置文件
    const systemConfigPath = path.join(__dirname, 'data/agent-systems/system_1754554196961_zml5w7hbh.json');
    
    if (!fs.existsSync(systemConfigPath)) {
      console.error('❌ 系统配置文件不存在:', systemConfigPath);
      return;
    }
    
    const systemConfig = JSON.parse(fs.readFileSync(systemConfigPath, 'utf8'));
    console.log(`📋 系统名称: ${systemConfig.name}`);
    console.log(`📝 系统描述: ${systemConfig.description}`);
    console.log(`🤖 Agent数量: ${systemConfig.agents.length}`);
    console.log(`🔗 连接数量: ${systemConfig.connections.length}`);
    console.log(`🛠️ UI工具数量: ${systemConfig.uiTools?.length || 0}`);
    
    // 验证Agents
    console.log('\n🤖 === Agent配置验证 ===');
    const agentIds = [];
    systemConfig.agents.forEach(agent => {
      console.log(`  Agent: ${agent.name} (${agent.id})`);
      console.log(`    类型: ${agent.type}`);
      console.log(`    能力: ${agent.capabilities?.join(', ') || 'none'}`);
      console.log(`    工具权限: ${agent.toolAccess?.join(', ') || 'none'}`);
      agentIds.push(agent.id);
    });
    
    // 验证连接
    console.log('\n🔗 === 连接配置验证 ===');
    const connectionValidation = [];
    systemConfig.connections.forEach((conn, idx) => {
      console.log(`  连接 ${idx + 1}: ${conn.from} → ${conn.to}`);
      console.log(`    类型: ${conn.type}`);
      console.log(`    条件: ${conn.condition || 'none'}`);
      console.log(`    描述: ${conn.description || 'none'}`);
      
      // 验证Agent存在
      const fromExists = agentIds.includes(conn.from);
      const toExists = agentIds.includes(conn.to) || conn.to === 'END' || conn.to === '__end__';
      
      if (!fromExists) {
        console.log(`    ❌ 源Agent不存在: ${conn.from}`);
        connectionValidation.push(`源Agent不存在: ${conn.from}`);
      }
      if (!toExists) {
        console.log(`    ❌ 目标Agent不存在: ${conn.to}`);
        connectionValidation.push(`目标Agent不存在: ${conn.to}`);
      }
      if (fromExists && toExists) {
        console.log(`    ✅ 连接有效`);
      }
    });
    
    // 验证UI工具权限
    console.log('\n🛠️ === UI工具权限验证 ===');
    const uiTools = systemConfig.uiTools || [];
    const toolPermissions = {};
    
    systemConfig.agents.forEach(agent => {
      if (agent.toolAccess) {
        agent.toolAccess.forEach(toolId => {
          if (!toolPermissions[toolId]) {
            toolPermissions[toolId] = [];
          }
          toolPermissions[toolId].push(agent.name);
        });
      }
    });
    
    uiTools.forEach(toolId => {
      console.log(`  工具: ${toolId}`);
      if (toolPermissions[toolId]) {
        console.log(`    ✅ 授权给: ${toolPermissions[toolId].join(', ')}`);
      } else {
        console.log(`    ⚠️ 无Agent有权限访问此工具`);
      }
    });
    
    // 验证关键流程
    console.log('\n🎯 === 关键流程验证 ===');
    
    // 检查health-goal-collector-agent的流程
    const healthGoalAgent = systemConfig.agents.find(a => a.id === 'health-goal-collector-agent');
    if (healthGoalAgent) {
      console.log(`✅ health-goal-collector-agent存在`);
      
      // 检查是否有health-goal-collection工具权限
      if (healthGoalAgent.toolAccess?.includes('health-goal-collection')) {
        console.log(`✅ health-goal-collector-agent有health-goal-collection工具权限`);
      } else {
        console.log(`❌ health-goal-collector-agent缺少health-goal-collection工具权限`);
      }
      
      // 检查下一步连接
      const nextConnection = systemConfig.connections.find(c => c.from === 'health-goal-collector-agent');
      if (nextConnection) {
        console.log(`✅ health-goal-collector-agent有下一步连接: ${nextConnection.to}`);
      } else {
        console.log(`❌ health-goal-collector-agent没有下一步连接`);
      }
    } else {
      console.log(`❌ health-goal-collector-agent不存在`);
    }
    
    // 总结
    console.log('\n📊 === 验证总结 ===');
    if (connectionValidation.length === 0) {
      console.log('✅ 所有连接配置有效');
    } else {
      console.log('❌ 连接配置问题:');
      connectionValidation.forEach(issue => console.log(`  - ${issue}`));
    }
    
    console.log(`🤖 总计 ${systemConfig.agents.length} 个Agent`);
    console.log(`🔗 总计 ${systemConfig.connections.length} 个连接`);
    console.log(`🛠️ 总计 ${uiTools.length} 个UI工具`);
    console.log(`📊 系统状态: ${systemConfig.status}`);
    
  } catch (error) {
    console.error('❌ 验证过程中出错:', error);
  }
  
  console.log('🔍 === 系统配置验证结束 ===');
}

// 运行验证
validateSystemConfig();