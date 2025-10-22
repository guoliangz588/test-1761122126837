import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { CreateAgentSystemRequest, CreateAgentSystemResponse, AgentSystemSpec } from '../lib/types/agent-system'

// 测试服务器URL
const API_BASE_URL = 'http://localhost:4000'

// 设置环境变量
process.env.GOOGLE_GENERATIVE_AI_API_KEY = "AIzaSyBYVDsp71VAULlcF72fiNMix0pWDXlfU9M"

describe('Agent System API Integration Tests', () => {
  let createdSystemId: string | null = null

  afterAll(async () => {
    // 清理测试创建的系统
    if (createdSystemId) {
      try {
        await fetch(`${API_BASE_URL}/api/agent-systems/${createdSystemId}`, {
          method: 'DELETE',
        })
        console.log('Test cleanup: deleted system', createdSystemId)
      } catch (error) {
        console.log('Test cleanup error:', error)
      }
    }
  })

  test('应该能够通过API创建新的Agent系统', async () => {
    console.log('🧪 Testing Agent System Creation via API...')
    
    const request: CreateAgentSystemRequest = {
      name: '客户支持助手',
      description: '一个处理客户咨询的多智能体系统',
      userPrompt: '创建一个智能客服系统，能够回答FAQ问题，处理投诉和创建工单。系统应该有一个主协调器来分析用户需求，FAQ助手来回答常见问题，工单管理器来处理投诉。'
    }

    const response = await fetch(`${API_BASE_URL}/api/agent-systems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data: CreateAgentSystemResponse = await response.json()
    
    console.log('✅ API Response:', {
      success: data.success,
      systemId: data.system?.id,
      systemName: data.system?.name,
      agentsCount: data.system?.agents.length,
      error: data.error
    })

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.system).toBeDefined()
    expect(data.system!.name).toContain('客户支持')
    expect(data.system!.agents).toBeDefined()
    expect(data.system!.agents.length).toBeGreaterThan(0)
    
    // 验证有orchestrator类型的agent
    const hasOrchestrator = data.system!.agents.some(agent => agent.type === 'orchestrator')
    expect(hasOrchestrator).toBe(true)
    
    // 保存系统ID用于后续测试和清理
    createdSystemId = data.system!.id
  }, 30000)

  test('应该能够获取Agent系统列表', async () => {
    console.log('🧪 Testing Agent Systems List API...')
    
    const response = await fetch(`${API_BASE_URL}/api/agent-systems`)
    const data = await response.json()
    
    console.log('✅ Systems List:', {
      success: data.success,
      count: data.count,
      systems: data.systems?.map((s: AgentSystemSpec) => ({ id: s.id, name: s.name, status: s.status }))
    })

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.systems).toBeDefined()
    expect(Array.isArray(data.systems)).toBe(true)
    
    if (createdSystemId) {
      // 验证刚创建的系统在列表中
      const createdSystem = data.systems.find((s: AgentSystemSpec) => s.id === createdSystemId)
      expect(createdSystem).toBeDefined()
    }
  })

  test('应该能够获取特定Agent系统详情', async () => {
    if (!createdSystemId) {
      console.log('⏭️ Skipping test - no system created')
      return
    }

    console.log('🧪 Testing Get Agent System Details API...')
    
    const response = await fetch(`${API_BASE_URL}/api/agent-systems/${createdSystemId}`)
    const data = await response.json()
    
    console.log('✅ System Details:', {
      success: data.success,
      systemId: data.system?.id,
      status: data.system?.status,
      agentsCount: data.system?.agents?.length
    })

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.system).toBeDefined()
    expect(data.system.id).toBe(createdSystemId)
  })

  test('应该能够部署Agent系统', async () => {
    if (!createdSystemId) {
      console.log('⏭️ Skipping test - no system created')
      return
    }

    console.log('🧪 Testing Agent System Deployment API...')
    
    const response = await fetch(`${API_BASE_URL}/api/agent-systems/${createdSystemId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemId: createdSystemId,
        autoCreateUI: true
      }),
    })

    const data = await response.json()
    
    console.log('✅ Deployment Result:', {
      success: data.success,
      toolsCreated: data.deployment?.toolsCreated,
      agentsConfigured: data.deployment?.agentsConfigured,
      status: data.deployment?.status,
      error: data.error
    })

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.deployment).toBeDefined()
  }, 60000)

  test('应该能够与部署的Agent系统聊天', async () => {
    if (!createdSystemId) {
      console.log('⏭️ Skipping test - no system created')
      return
    }

    console.log('🧪 Testing Agent System Chat API...')
    
    // 测试FAQ相关问题
    const chatRequest = {
      messages: [
        { role: 'user', content: '你好，我想了解你们的服务时间' }
      ]
    }

    const response = await fetch(`${API_BASE_URL}/api/agent-chat/${createdSystemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatRequest),
    })

    const data = await response.json()
    
    console.log('✅ Chat Response:', {
      success: data.success,
      messagesCount: data.messages?.length,
      currentAgent: data.currentAgent,
      completed: data.completed,
      lastMessage: data.messages?.[data.messages.length - 1]?.content?.substring(0, 100)
    })

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.messages).toBeDefined()
    expect(data.messages.length).toBeGreaterThan(0)
    
    // 验证有AI响应
    const lastMessage = data.messages[data.messages.length - 1]
    expect(lastMessage.content).toBeDefined()
    expect(lastMessage.content.length).toBeGreaterThan(0)
  }, 30000)

  test('应该能够处理工单相关的聊天', async () => {
    if (!createdSystemId) {
      console.log('⏭️ Skipping test - no system created')
      return
    }

    console.log('🧪 Testing Ticket-related Chat...')
    
    const chatRequest = {
      messages: [
        { role: 'user', content: '我要投诉一个产品质量问题，产品有缺陷' }
      ]
    }

    const response = await fetch(`${API_BASE_URL}/api/agent-chat/${createdSystemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatRequest),
    })

    const data = await response.json()
    
    console.log('✅ Ticket Chat Response:', {
      success: data.success,
      messagesCount: data.messages?.length,
      currentAgent: data.currentAgent,
      lastMessage: data.messages?.[data.messages.length - 1]?.content?.substring(0, 100)
    })

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.messages).toBeDefined()
    expect(data.messages.length).toBeGreaterThan(0)
  }, 30000)

  test('应该能够处理错误的系统ID', async () => {
    console.log('🧪 Testing Invalid System ID Error Handling...')
    
    const invalidSystemId = 'non-existent-system-id'
    
    const response = await fetch(`${API_BASE_URL}/api/agent-chat/${invalidSystemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }]
      }),
    })

    const data = await response.json()
    
    console.log('✅ Error Handling:', {
      status: response.status,
      success: data.success,
      error: data.error
    })

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  test('应该能够验证API字段验证', async () => {
    console.log('🧪 Testing API Field Validation...')
    
    // 测试缺少必需字段
    const invalidRequest = {
      name: '测试系统'
      // 缺少 description 和 userPrompt
    }

    const response = await fetch(`${API_BASE_URL}/api/agent-systems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidRequest),
    })

    const data = await response.json()
    
    console.log('✅ Validation Response:', {
      status: response.status,
      success: data.success,
      error: data.error
    })

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Missing required fields')
  })
})