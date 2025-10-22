/**
 * UI工具访问权限控制
 * 
 * 确保只有被授权的Agent才能访问对应的UI工具
 */

import { AgentSystemSpec, AgentDefinition } from './types/agent-system'

/**
 * 根据当前Agent权限过滤可用的UI工具
 */
export function filterUIToolsByAgentPermissions(
  allUITools: Array<{id: string, name: string, description: string}>,
  currentAgent: AgentDefinition
): Array<{id: string, name: string, description: string}> {
  if (!currentAgent.toolAccess || currentAgent.toolAccess.length === 0) {
    console.log(`权限检查: agent ${currentAgent.name} 无ui工具访问权限`)
    return []
  }
  
  const accessibleTools = allUITools.filter(tool => 
    currentAgent.toolAccess.includes(tool.id)
  )
  
  console.log(`权限检查: agent ${currentAgent.name} 可访问工具 [${accessibleTools.map(t => t.id).join(', ')}]`)
  
  return accessibleTools
}

/**
 * 检查Agent是否有权限访问特定UI工具
 */
export function hasUIToolAccess(
  agent: AgentDefinition,
  toolId: string
): boolean {
  return agent.toolAccess?.includes(toolId) ?? false
}

/**
 * 获取系统中所有有UI工具权限的Agent
 */
export function getAgentsWithUIToolAccess(
  system: AgentSystemSpec
): AgentDefinition[] {
  return system.agents.filter(agent => 
    agent.toolAccess && agent.toolAccess.length > 0
  )
}

/**
 * 根据当前会话状态确定活跃的Agent并过滤UI工具
 */
export function getAccessibleUIToolsForCurrentAgent(
  system: AgentSystemSpec,
  allUITools: Array<{id: string, name: string, description: string}>,
  currentAgentId?: string
): Array<{id: string, name: string, description: string}> {
  // 如果没有指定当前Agent，返回空数组（安全起见）
  if (!currentAgentId) {
    console.log('权限检查: 未指定当前agent, 拒绝所有ui工具访问')
    return []
  }
  
  // 查找当前Agent
  const currentAgent = system.agents.find(agent => agent.id === currentAgentId)
  
  if (!currentAgent) {
    console.log(`权限检查: agent ${currentAgentId} 在系统中未找到`)
    return []
  }
  
  return filterUIToolsByAgentPermissions(allUITools, currentAgent)
}

/**
 * 生成权限报告
 */
export function generateUIToolPermissionReport(
  system: AgentSystemSpec,
  allUITools: Array<{id: string, name: string, description: string}>
): {
  agentId: string
  agentName: string
  agentType: string
  authorizedTools: string[]
  unauthorizedTools: string[]
}[] {
  return system.agents.map(agent => {
    const authorizedTools = allUITools
      .filter(tool => agent.toolAccess?.includes(tool.id))
      .map(tool => tool.id)
    
    const unauthorizedTools = allUITools
      .filter(tool => !agent.toolAccess?.includes(tool.id))
      .map(tool => tool.id)
    
    return {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      authorizedTools,
      unauthorizedTools
    }
  })
}

/**
 * 验证系统的UI工具配置是否合理
 */
export function validateUIToolConfiguration(
  system: AgentSystemSpec,
  allUITools: Array<{id: string, name: string, description: string}>
): {
  isValid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // 检查是否有孤立的UI工具（系统中包含但没有Agent有权限访问）
  const systemUIToolIds = system.uiTools || []
  const agentsWithAccess = getAgentsWithUIToolAccess(system)
  
  const allAuthorizedTools = new Set(
    agentsWithAccess.flatMap(agent => agent.toolAccess || [])
  )
  
  const orphanedTools = systemUIToolIds.filter(toolId => 
    !allAuthorizedTools.has(toolId)
  )
  
  if (orphanedTools.length > 0) {
    issues.push(`系统包含了没有Agent有权限访问的UI工具: ${orphanedTools.join(', ')}`)
    recommendations.push('考虑移除这些未使用的UI工具或为合适的Agent分配访问权限')
  }
  
  // 检查是否有Agent声明了不存在的工具权限
  const availableToolIds = allUITools.map(tool => tool.id)
  
  for (const agent of system.agents) {
    if (agent.toolAccess) {
      const invalidTools = agent.toolAccess.filter(toolId => 
        !availableToolIds.includes(toolId)
      )
      
      if (invalidTools.length > 0) {
        issues.push(`Agent ${agent.name} 声明了不存在的工具权限: ${invalidTools.join(', ')}`)
        recommendations.push(`更新Agent ${agent.name} 的toolAccess配置或确保相关UI工具已创建`)
      }
    }
  }
  
  // 检查orchestrator类型的Agent是否有过多的直接UI工具权限
  const orchestrators = system.agents.filter(agent => agent.type === 'orchestrator')
  
  for (const orchestrator of orchestrators) {
    if (orchestrator.toolAccess && orchestrator.toolAccess.length > 3) {
      recommendations.push(`Orchestrator ${orchestrator.name} 可能拥有过多的直接UI工具权限，考虑通过tool类型的Agent来处理UI交互`)
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  }
}

/**
 * 在开发环境下打印权限诊断信息
 */
export function debugUIToolPermissions(
  system: AgentSystemSpec,
  allUITools: Array<{id: string, name: string, description: string}>,
  currentAgentId?: string
): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  
  console.log('权限诊断-开始')
  console.log(`系统信息: 名称${system.name}, agent数量${system.agents.length}`)
  console.log(`ui工具: 系统配置[${(system.uiTools || []).join(', ')}], 可用[${allUITools.map(t => t.id).join(', ')}]`)
  
  if (currentAgentId) {
    const accessibleTools = getAccessibleUIToolsForCurrentAgent(system, allUITools, currentAgentId)
    console.log(`当前agent ${currentAgentId} 可访问: [${accessibleTools.map(t => t.id).join(', ')}]`)
  }
  
  const report = generateUIToolPermissionReport(system, allUITools)
  console.log('权限详情:')
  report.forEach(r => {
    console.log(`agent ${r.agentName} (${r.agentType}): 授权[${r.authorizedTools.join(', ') || '无'}]${r.unauthorizedTools.length > 0 ? ` 未授权[${r.unauthorizedTools.join(', ')}]` : ''}`)
  })
  
  const validation = validateUIToolConfiguration(system, allUITools)
  if (!validation.isValid) {
    console.log('配置问题:')
    validation.issues.forEach(issue => console.log(`- ${issue}`))
  }
  
  if (validation.recommendations.length > 0) {
    console.log('建议:')
    validation.recommendations.forEach(rec => console.log(`- ${rec}`))
  }
  
  console.log('权限诊断-结束')
}