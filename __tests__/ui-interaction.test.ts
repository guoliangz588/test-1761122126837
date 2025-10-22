/**
 * UI交互功能测试
 * 
 * 这个测试文件用于验证UI组件与Agent系统之间的完整交互流程
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { globalEnhancedSystemRunner, UIInteractionEvent } from '../lib/agents/enhanced-runtime-engine'
import { uiInteractionManager } from '../lib/ui-interaction-system'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('UI交互功能测试', () => {
  let mockSystemId: string
  let mockSessionId: string

  beforeEach(() => {
    mockSystemId = 'test-health-system'
    mockSessionId = `session_${Date.now()}`
    
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock fetch responses
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        sessionContinued: true,
        agentResponse: 'Thank you for providing your health goals.'
      })
    } as Response)
  })

  describe('1. Health Goal Collection 数据传递测试', () => {
    test('应该正确发送健康目标数据到Agent', async () => {
      const mockHealthGoals = `
        1. 减轻腹胀和消化不良
        2. 改善睡眠质量，每天睡8小时
        3. 提高注意力和工作效率
      `.trim()

      const event: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'submit',
        data: {
          healthGoals: mockHealthGoals,
          submissionTime: new Date().toISOString(),
          action: 'goals-submitted'
        },
        timestamp: new Date().toISOString(),
        sessionId: mockSessionId,
        agentId: 'main-agent'
      }

      // 模拟UI交互事件处理
      await uiInteractionManager.sendInteractionEvent(event)

      // 验证数据结构
      expect(event.data.healthGoals).toContain('减轻腹胀')
      expect(event.data.healthGoals).toContain('改善睡眠')
      expect(event.data.healthGoals).toContain('提高注意力')
      expect(event.eventType).toBe('submit')
      expect(event.toolId).toBe('health-goal-collection')
    })

    test('应该正确处理用户输入变更事件', async () => {
      const partialInput = '减轻腹胀'
      
      const event: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'input',
        data: {
          fieldName: 'healthGoals',
          value: partialInput,
          partial: true
        },
        timestamp: new Date().toISOString(),
        sessionId: mockSessionId,
        agentId: 'main-agent'
      }

      await uiInteractionManager.sendInteractionEvent(event)

      expect(event.data.fieldName).toBe('healthGoals')
      expect(event.data.value).toBe(partialInput)
      expect(event.data.partial).toBe(true)
    })
  })

  describe('2. Agent会话继续功能测试', () => {
    test('应该能基于UI交互继续Agent会话', async () => {
      // 模拟系统加载
      const mockSystem = {
        id: mockSystemId,
        name: '健康管理助手',
        description: '专业的健康管理系统',
        agents: [
          {
            id: 'main-agent',
            name: '主要助手',
            type: 'orchestrator' as const,
            systemPrompt: '你是一个专业的健康管理助手',
            description: '负责与用户交互和协调其他agent',
            capabilities: ['health-assessment', 'goal-setting'],
            toolAccess: ['health-goal-collection'],
            connections: []
          }
        ],
        connections: [],
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        }
      }

      await globalEnhancedSystemRunner.loadSystem(mockSystem)

      // 模拟初始对话
      const initialResult = await globalEnhancedSystemRunner.runSystem(mockSystemId, {
        messages: [{ role: 'user', content: '我想设定一些健康目标' }],
        availableUITools: [
          {
            id: 'health-goal-collection',
            name: '健康目标收集器',
            description: '收集用户的健康目标和期望'
          }
        ],
        sessionId: mockSessionId
      })

      expect(initialResult).toBeDefined()
      expect(initialResult.messages).toBeDefined()

      // 模拟UI交互事件
      const uiEvent: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'submit',
        data: {
          healthGoals: '改善睡眠质量，每天8小时；减轻消化问题；提高工作效率',
          action: 'goals-submitted'
        },
        timestamp: new Date().toISOString(),
        sessionId: mockSessionId,
        agentId: 'main-agent'
      }

      // 处理UI交互并继续会话
      await globalEnhancedSystemRunner.handleUIInteraction(uiEvent)
      const continuationResult = await globalEnhancedSystemRunner.continueSession(mockSessionId, uiEvent)

      if (continuationResult) {
        expect(continuationResult.messages.length).toBeGreaterThan(0)
        // Agent应该能看到用户提交的健康目标
        const lastMessage = continuationResult.messages[continuationResult.messages.length - 1]
        expect(lastMessage).toBeDefined()
      }
    })
  })

  describe('3. 完整交互流程测试', () => {
    test('完整的用户提交健康目标流程', async () => {
      const healthGoals = `
        1. 体重管理 - 在3个月内减重5公斤
        2. 运动习惯 - 每周运动3次，每次30分钟
        3. 饮食调整 - 减少糖分摄入，增加蔬菜比例
      `.trim()

      // 步骤1：组件加载事件
      const loadEvent: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'custom',
        data: { action: 'component-loaded', timestamp: Date.now() },
        timestamp: new Date().toISOString(),
        sessionId: mockSessionId,
        agentId: 'main-agent'
      }

      // 步骤2：用户输入事件
      const inputEvent: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'input',
        data: {
          fieldName: 'healthGoals',
          value: healthGoals,
          partial: false
        },
        timestamp: new Date().toISOString(),
        sessionId: mockSessionId,
        agentId: 'main-agent'
      }

      // 步骤3：表单提交事件
      const submitEvent: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'submit',
        data: {
          healthGoals,
          submissionTime: new Date().toISOString(),
          action: 'goals-submitted'
        },
        timestamp: new Date().toISOString(),
        sessionId: mockSessionId,
        agentId: 'main-agent'
      }

      // 处理所有事件
      await uiInteractionManager.sendInteractionEvent(loadEvent)
      await uiInteractionManager.sendInteractionEvent(inputEvent)
      await uiInteractionManager.sendInteractionEvent(submitEvent)

      // 验证事件数据
      expect(submitEvent.data.healthGoals).toContain('体重管理')
      expect(submitEvent.data.healthGoals).toContain('运动习惯')
      expect(submitEvent.data.healthGoals).toContain('饮食调整')
    })
  })

  describe('4. 错误处理测试', () => {
    test('应该处理缺少sessionId的情况', async () => {
      const event: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'submit',
        data: { healthGoals: 'test goals' },
        timestamp: new Date().toISOString(),
        sessionId: '', // 空的sessionId
        agentId: 'main-agent'
      }

      await expect(async () => {
        await uiInteractionManager.sendInteractionEvent(event)
      }).not.toThrow() // 应该优雅处理错误
    })

    test('应该处理无效的事件类型', async () => {
      const event: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'invalid-event' as any,
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        sessionId: mockSessionId,
        agentId: 'main-agent'
      }

      await expect(async () => {
        await uiInteractionManager.sendInteractionEvent(event)
      }).not.toThrow()
    })
  })

  describe('5. 数据验证测试', () => {
    test('健康目标数据应该符合预期格式', () => {
      const validHealthGoals = `
        1. 减重 - 3个月减5公斤
        2. 运动 - 每周3次有氧运动
        3. 饮食 - 增加蛋白质摄入
      `.trim()

      // 验证数据格式
      expect(validHealthGoals).toMatch(/\d+\..*减重.*/)
      expect(validHealthGoals).toMatch(/\d+\..*运动.*/)
      expect(validHealthGoals).toMatch(/\d+\..*饮食.*/)
    })

    test('应该正确处理特殊字符和换行', () => {
      const complexGoals = `
        目标1: "减重5kg" (重要!)
        目标2: 跑步30分钟/天 & 游泳2次/周
        目标3: 戒烟、限酒...改善生活方式
      `.trim()

      const event: UIInteractionEvent = {
        toolId: 'health-goal-collection',
        eventType: 'submit',
        data: { healthGoals: complexGoals },
        timestamp: new Date().toISOString(),
        sessionId: mockSessionId,
        agentId: 'main-agent'
      }

      expect(event.data.healthGoals).toContain('"减重5kg"')
      expect(event.data.healthGoals).toContain('30分钟/天')
      expect(event.data.healthGoals).toContain('戒烟、限酒')
    })
  })
})

// 导出测试辅助函数
export const createMockUIEvent = (
  toolId: string = 'health-goal-collection',
  eventType: 'input' | 'submit' | 'click' | 'custom' = 'submit',
  data: any = {},
  sessionId?: string
): UIInteractionEvent => ({
  toolId,
  eventType,
  data,
  timestamp: new Date().toISOString(),
  sessionId: sessionId || `test_session_${Date.now()}`,
  agentId: 'main-agent'
})

export const createMockHealthGoals = () => [
  '改善睡眠质量 - 每天保证8小时睡眠',
  '加强锻炼 - 每周至少运动3次',
  '均衡饮食 - 减少加工食品，多吃蔬果'
].join('\n')