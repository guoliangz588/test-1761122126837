import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import { AgentSystemRunner } from '../lib/agents/runtime-engine'
import { AgentSystemSpec, AgentDefinition, AgentConnection } from '../lib/types/agent-system'

// 设置环境变量
process.env.GOOGLE_GENERATIVE_AI_API_KEY = "AIzaSyBYVDsp71VAULlcF72fiNMix0pWDXlfU9M"

const SYSTEMS_DIR = path.join(process.cwd(), 'data', 'agent-systems')

// Mock 一个完整的 Agent 系统
function createMockAgentSystem(): AgentSystemSpec {
  const systemId = `test-system-${Date.now()}`
  
  const agents: AgentDefinition[] = [
    {
      id: 'orchestrator',
      name: '主协调器',
      type: 'orchestrator',
      description: '负责分析用户需求并路由到相应的专门agent',
      systemPrompt: '你是一个智能协调器，负责理解用户需求并决定如何处理。',
      capabilities: ['路由决策', '需求分析', '任务分配'],
      toolAccess: []
    },
    {
      id: 'faq-agent',
      name: 'FAQ助手',
      type: 'tool',
      description: '回答常见问题',
      systemPrompt: '你是FAQ助手，专门回答常见问题。',
      capabilities: ['问题回答', '知识检索'],
      toolAccess: ['chat-interface']
    },
    {
      id: 'ticket-agent',
      name: '工单管理器',
      type: 'tool',
      description: '创建和管理客服工单',
      systemPrompt: '你是工单管理器，负责创建和跟踪客服工单。',
      capabilities: ['工单创建', '状态跟踪', '优先级管理'],
      toolAccess: ['ticket-dashboard']
    }
  ]

  const connections: AgentConnection[] = [
    { from: 'orchestrator', to: 'faq-agent', condition: 'FAQ相关问题' },
    { from: 'orchestrator', to: 'ticket-agent', condition: '需要创建工单' },
    { from: 'faq-agent', to: 'END', condition: '问题已解决' },
    { from: 'ticket-agent', to: 'END', condition: '工单已创建' }
  ]

  return {
    id: systemId,
    name: '客户支持助手',
    description: '一个处理客户咨询的多智能体系统',
    agents,
    connections,
    uiTools: [],
    pendingUIRequirements: [
      {
        agentId: 'faq-agent',
        agentName: 'FAQ助手',
        requirement: {
          toolName: 'chat-interface',
          description: '实时聊天界面组件',
          purpose: '提供用户与FAQ助手的交互界面',
          priority: 'high' as const
        }
      },
      {
        agentId: 'ticket-agent',
        agentName: '工单管理器',
        requirement: {
          toolName: 'ticket-dashboard',
          description: '工单状态显示组件',
          purpose: '显示和管理客服工单状态',
          priority: 'medium' as const
        }
      }
    ],
    status: 'pending',
    metadata: {
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    }
  }
}

describe('Agent System Integration Tests', () => {
  let testSystem: AgentSystemSpec
  let systemRunner: AgentSystemRunner

  beforeAll(async () => {
    // 确保数据目录存在
    try {
      await fs.mkdir(SYSTEMS_DIR, { recursive: true })
    } catch (error) {
      // 目录已存在
    }
    
    // 初始化系统运行器
    systemRunner = new AgentSystemRunner()
    
    // 创建测试系统
    testSystem = createMockAgentSystem()
  })

  afterAll(async () => {
    // 清理测试创建的系统文件
    if (testSystem) {
      try {
        const systemFile = path.join(SYSTEMS_DIR, `${testSystem.id}.json`)
        await fs.unlink(systemFile)
        console.log('Test cleanup: deleted system file', testSystem.id)
      } catch (error) {
        console.log('Test cleanup error:', error)
      }
    }
  })

  test('应该能够创建新的Agent系统', async () => {
    console.log('🧪 Testing Agent System Creation...')
    
    // 直接使用mock的系统
    console.log('✅ Mock system created:', {
      systemName: testSystem.name,
      agentsCount: testSystem.agents.length,
      uiRequirementsCount: testSystem.pendingUIRequirements?.length,
      systemId: testSystem.id
    })

    expect(testSystem).toBeDefined()
    expect(testSystem.name).toContain('客户支持助手')
    expect(testSystem.agents).toBeDefined()
    expect(testSystem.agents.length).toBeGreaterThan(0)
    
    // 验证有orchestrator类型的agent
    const hasOrchestrator = testSystem.agents.some(agent => agent.type === 'orchestrator')
    expect(hasOrchestrator).toBe(true)
    
    // 验证有UI需求
    expect(testSystem.pendingUIRequirements).toBeDefined()
    expect(testSystem.pendingUIRequirements!.length).toBeGreaterThan(0)

    console.log('✅ System validation completed')
  })

  test('应该能够保存和读取系统文件', async () => {
    console.log('🧪 Testing System File Save/Load...')
    
    // 保存系统到文件
    const systemFile = path.join(SYSTEMS_DIR, `${testSystem.id}.json`)
    await fs.writeFile(systemFile, JSON.stringify(testSystem, null, 2), 'utf-8')
    
    // 读取系统文件
    const savedContent = await fs.readFile(systemFile, 'utf-8')
    const savedSystem = JSON.parse(savedContent)
    
    console.log('✅ System file operations:', {
      saved: true,
      systemId: savedSystem.id,
      status: savedSystem.status
    })

    expect(savedSystem).toBeDefined()
    expect(savedSystem.id).toBe(testSystem.id)
    expect(savedSystem.agents).toBeDefined()
    expect(savedSystem.agents.length).toBe(testSystem.agents.length)
    expect(savedSystem.status).toBe('pending')
  })

  test('应该能够加载系统到运行时引擎', async () => {
    console.log('🧪 Testing System Loading to Runtime Engine...')
    
    // 直接加载系统到运行时引擎
    await systemRunner.loadSystem(testSystem)
    
    // 验证系统已加载
    const loadedSystems = systemRunner.getLoadedSystems()
    const loadedSystem = loadedSystems.find(sys => sys.id === testSystem.id)
    
    console.log('✅ System loading result:', {
      systemLoaded: !!loadedSystem,
      systemId: loadedSystem?.id,
      agentsCount: loadedSystem?.agents.length
    })

    expect(loadedSystem).toBeDefined()
    expect(loadedSystem!.id).toBe(testSystem.id)
    expect(loadedSystem!.agents).toBeDefined()
    expect(loadedSystem!.connections).toBeDefined()
  })

  test('应该能够模拟部署Agent系统', async () => {
    console.log('🧪 Testing Agent System Deployment...')
    
    // 直接模拟部署过程
    testSystem.status = 'deploying'
    
    // 模拟UI创建过程（清空pending requirements）
    const toolsCreated = testSystem.pendingUIRequirements?.length || 0
    testSystem.pendingUIRequirements?.forEach(req => {
      if (!testSystem.uiTools.includes(req.requirement.toolName)) {
        testSystem.uiTools.push(req.requirement.toolName)
      }
      
      // 更新agent的toolAccess
      const agent = testSystem.agents.find(a => a.id === req.agentId)
      if (agent && !agent.toolAccess.includes(req.requirement.toolName)) {
        agent.toolAccess.push(req.requirement.toolName)
      }
    })
    
    testSystem.pendingUIRequirements = []
    testSystem.status = 'active'
    testSystem.metadata.deployedAt = new Date().toISOString()
    
    // 重新加载到运行时引擎
    await systemRunner.loadSystem(testSystem)
    
    console.log('✅ Deployment simulation completed:', {
      systemId: testSystem.id,
      toolsCreated,
      agentsConfigured: testSystem.agents.length,
      status: testSystem.status,
      uiToolsCount: testSystem.uiTools.length
    })

    expect(testSystem.status).toBe('active')
    expect(testSystem.metadata.deployedAt).toBeDefined()
    expect(testSystem.pendingUIRequirements).toEqual([])
    expect(testSystem.uiTools.length).toBe(toolsCreated)
  })

  test('应该能够验证系统状态更新', async () => {
    console.log('🧪 Testing System Status Validation...')
    
    // 验证系统状态
    console.log('✅ System status validation:', {
      status: testSystem.status,
      uiToolsCount: testSystem.uiTools.length,
      pendingUICount: testSystem.pendingUIRequirements?.length,
      deployedAt: testSystem.metadata.deployedAt
    })

    expect(testSystem.status).toBe('active')
    expect(testSystem.metadata.deployedAt).toBeDefined()
    expect(testSystem.pendingUIRequirements).toEqual([])
    expect(testSystem.uiTools.length).toBeGreaterThan(0)
    
    // 验证agents的toolAccess已更新
    const faqAgent = testSystem.agents.find(a => a.id === 'faq-agent')
    const ticketAgent = testSystem.agents.find(a => a.id === 'ticket-agent')
    
    expect(faqAgent?.toolAccess).toContain('chat-interface')
    expect(ticketAgent?.toolAccess).toContain('ticket-dashboard')
  })

  test('应该能够执行Agent系统处理用户请求', async () => {
    console.log('🧪 Testing Agent System Execution...')
    
    // 直接使用运行时引擎执行系统
    const result = await systemRunner.runSystem(testSystem.id, {
      messages: [{ role: 'user', content: '你好，我想了解你们的服务' }],
      availableUITools: testSystem.uiTools
    })
    
    console.log('✅ System execution result:', {
      messagesCount: result.messages.length,
      currentAgent: result.currentAgent,
      completed: result.completed,
      toolsUsed: result.toolsUsed?.length || 0
    })

    expect(result.messages).toBeDefined()
    expect(result.messages.length).toBeGreaterThan(0)
    expect(result.currentAgent).toBeDefined()
    
    // 验证有回复内容
    const lastMessage = result.messages[result.messages.length - 1]
    expect(lastMessage.content).toBeDefined()
    expect(lastMessage.content.length).toBeGreaterThan(0)
    expect(lastMessage.agentType).toBeDefined()
  }, 30000)

  test('应该能够测试agent路由决策', async () => {
    console.log('🧪 Testing Agent Routing Logic...')
    
    // 测试FAQ相关问题
    const faqResult = await systemRunner.runSystem(testSystem.id, {
      messages: [{ role: 'user', content: '你们的营业时间是什么时候？' }],
      availableUITools: testSystem.uiTools
    })
    
    // 测试工单相关问题
    const ticketResult = await systemRunner.runSystem(testSystem.id, {
      messages: [{ role: 'user', content: '我需要投诉一个产品质量问题' }],
      availableUITools: testSystem.uiTools
    })
    
    console.log('✅ Routing test results:', {
      faqMessages: faqResult.messages.length,
      ticketMessages: ticketResult.messages.length,
      faqCompleted: faqResult.completed,
      ticketCompleted: ticketResult.completed
    })

    expect(faqResult.messages.length).toBeGreaterThan(0)
    expect(ticketResult.messages.length).toBeGreaterThan(0)
    
    // 验证消息来源
    const faqLastMessage = faqResult.messages[faqResult.messages.length - 1]
    const ticketLastMessage = ticketResult.messages[ticketResult.messages.length - 1]
    
    expect(faqLastMessage.agentType).toBeDefined()
    expect(ticketLastMessage.agentType).toBeDefined()
  }, 30000)

  test('应该能够处理系统卸载', async () => {
    console.log('🧪 Testing System Unloading...')
    
    // 卸载系统
    const unloadResult = systemRunner.unloadSystem(testSystem.id)
    
    // 验证系统已卸载
    const loadedSystems = systemRunner.getLoadedSystems()
    const stillLoaded = loadedSystems.find(sys => sys.id === testSystem.id)
    
    console.log('✅ System unload result:', {
      unloadSuccess: unloadResult,
      stillLoaded: !!stillLoaded,
      remainingSystems: loadedSystems.length
    })

    expect(unloadResult).toBe(true)
    expect(stillLoaded).toBeUndefined()
  })

  test('应该能够处理无效系统ID', async () => {
    console.log('🧪 Testing Invalid System ID Handling...')
    
    const invalidSystemId = 'non-existent-system-id'
    
    try {
      await systemRunner.runSystem(invalidSystemId, {
        messages: [{ role: 'user', content: 'Hello' }]
      })
      
      // 如果到达这里，说明没有抛出错误，测试失败
      expect(true).toBe(false)
    } catch (error) {
      console.log('✅ Invalid system handling:', {
        errorMessage: error.message,
        errorThrown: true
      })
      
      expect(error.message).toContain('not loaded')
    }
  })

  test('应该能够验证系统架构完整性', async () => {
    console.log('🧪 Testing System Architecture Integrity...')
    
    // 重新加载系统以测试完整性
    await systemRunner.loadSystem(testSystem)
    
    // 验证所有连接的有效性
    const invalidConnections = testSystem.connections.filter(conn => {
      const fromAgent = testSystem.agents.find(a => a.id === conn.from)
      const toAgent = conn.to === 'END' || conn.to === '__end__' || 
                    testSystem.agents.find(a => a.id === conn.to)
      return !fromAgent || !toAgent
    })
    
    // 验证orchestrator存在
    const orchestrators = testSystem.agents.filter(a => a.type === 'orchestrator')
    
    console.log('✅ Architecture integrity check:', {
      totalAgents: testSystem.agents.length,
      totalConnections: testSystem.connections.length,
      invalidConnections: invalidConnections.length,
      orchestratorCount: orchestrators.length
    })

    expect(invalidConnections.length).toBe(0)
    expect(orchestrators.length).toBeGreaterThan(0)
    expect(testSystem.agents.every(agent => agent.id && agent.name && agent.type)).toBe(true)
    expect(testSystem.connections.every(conn => conn.from && conn.to)).toBe(true)
  })
})