import { AgentSystemSpec, AgentDefinition, AgentRuntimeState, AgentExecutionResult } from '../types/agent-system'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { initializeGlobalProxy } from '../global-proxy';

// 动态创建agent的Zod schema
function createAgentSchema(agentDef: AgentDefinition, system: AgentSystemSpec) {
  const baseSchema: any = {
    response: z.string().describe('给用户的回复内容'),
  }
  
  // 如果是orchestrator类型，需要路由决策
  if (agentDef.type === 'orchestrator') {
    // 找到这个agent可以路由到的所有目标
    const routingTargets = system.connections
      .filter(conn => conn.from === agentDef.id)
      .map(conn => conn.to)
    
    if (routingTargets.length > 0) {
      // 创建动态枚举
      const targetEnum = routingTargets.filter(t => t !== 'END' && t !== '__end__')
      
      if (targetEnum.length > 0) {
        baseSchema.routingDecision = z.enum(['END', ...targetEnum] as [string, ...string[]])
          .describe(`路由决策：选择下一个处理agent，或选择END结束对话。可选值：${['END', ...targetEnum].join(', ')}`)
      }
    }
  }
  
  // tool类型的agent可能需要表示完成状态
  if (agentDef.type === 'tool') {
    baseSchema.isCompleted = z.boolean().describe('是否已完成任务处理')
    baseSchema.needsFollowup = z.boolean().describe('是否需要后续处理')
  }
  
  return z.object(baseSchema)
}

// Agent 节点工厂
class AgentNodeFactory {
  static async executeAgent(
    agentDef: AgentDefinition, 
    system: AgentSystemSpec,
    state: AgentRuntimeState
  ): Promise<AgentExecutionResult> {
    console.log(`🤖 Executing agent: ${agentDef.name}`)
    
    // 获取对话历史
    const messages = state.messages || []
    const lastMessage = messages[messages.length - 1]
    
    if (!lastMessage) {
      const welcomeMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: `你好，我是 ${agentDef.name}。${agentDef.description}`,
        timestamp: new Date().toISOString(),
        agentType: agentDef.id
      }
      
      return {
        messages: [welcomeMessage],
        currentAgent: agentDef.id,
        completed: false
      }
    }
    
    // 构建 agent 上下文
    const availableTools = (state.availableUITools || [])
      .filter(tool => agentDef.toolAccess.includes(tool.id))
      .map(tool => `- ${tool.id}: UI工具`)
      .join('\n')
    
    // 生成响应
    try {
      initializeGlobalProxy();
      const model = google('gemini-2.5-flash')
      const schema = createAgentSchema(agentDef, system)
      
      const systemPrompt = `${agentDef.systemPrompt}

你的角色：${agentDef.name}
职责：${agentDef.description}
能力：${agentDef.capabilities.join(', ')}

${availableTools ? `可用的UI工具：\n${availableTools}` : ''}

请根据用户的需求提供帮助。请务必按照要求的JSON格式返回结构化响应。`
      
      const result = await generateObject({
        model,
        system: systemPrompt,
        prompt: lastMessage.content,
        schema: schema,
      })
      
      // 构建返回结果
      const responseMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: result.object.response,
        timestamp: new Date().toISOString(),
        agentType: agentDef.id
      }
      
      const executionResult: AgentExecutionResult = {
        messages: [responseMessage],
        currentAgent: agentDef.id,
        completed: result.object.isCompleted ?? false,
        toolsUsed: agentDef.toolAccess
      }
      
      // 添加路由信息
      if (result.object.routingDecision) {
        executionResult.routingDecision = result.object.routingDecision
      }
      
      return executionResult
      
    } catch (error) {
      console.error(`Error in agent ${agentDef.name}:`, error)
      
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: `抱歉，处理您的请求时遇到了问题。请稍后再试。`,
        timestamp: new Date().toISOString(),
        agentType: agentDef.id
      }
      
      return {
        messages: [errorMessage],
        currentAgent: agentDef.id,
        completed: false
      }
    }
  }
}

// 系统运行器
export class AgentSystemRunner {
  private loadedSystems: Map<string, AgentSystemSpec> = new Map()
  
  // 加载系统
  async loadSystem(system: AgentSystemSpec): Promise<void> {
    console.log(`📦 Loading agent system: ${system.name}`)
    this.loadedSystems.set(system.id, system)
    console.log(`✅ System ${system.name} loaded successfully`)
  }
  
  // 运行系统
  async runSystem(
    systemId: string, 
    input: {
      messages: Array<{role: string, content: string}>
      availableUITools?: Array<{id: string, name: string, description: string}>
    }
  ): Promise<AgentExecutionResult> {
    const system = this.loadedSystems.get(systemId)
    if (!system) {
      throw new Error(`System ${systemId} not loaded`)
    }
    
    console.log(`▶️ Running system: ${system.name}`)
    
    // 构建运行时状态
    const state: AgentRuntimeState = {
      messages: input.messages.map((msg, index) => ({
        id: `msg_${index}`,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date().toISOString()
      })),
      availableUITools: input.availableUITools || [],
      sessionId: `session_${Date.now()}`
    }
    
    // 找到orchestrator（主协调器）
    const orchestrator = system.agents.find(agent => agent.type === 'orchestrator')
    if (!orchestrator) {
      throw new Error('System must have an orchestrator agent')
    }
    
    let currentAgent = orchestrator
    let maxIterations = 10 // 防止无限循环
    let iteration = 0
    let allMessages: AgentRuntimeState['messages'] = []
    
    while (iteration < maxIterations) {
      iteration++
      console.log(`🔄 Iteration ${iteration}: Executing ${currentAgent.name}`)
      
      // 执行当前agent
      const result = await AgentNodeFactory.executeAgent(currentAgent, system, {
        ...state,
        messages: [...state.messages, ...allMessages],
        currentAgent: currentAgent.id
      })
      
      // 收集消息
      allMessages = [...allMessages, ...result.messages]
      
      // 检查是否完成
      if (result.completed || result.routingDecision === 'END' || !result.routingDecision) {
        console.log(`✅ System execution completed`)
        return {
          ...result,
          messages: allMessages
        }
      }
      
      // 路由到下一个agent
      const nextAgent = system.agents.find(agent => agent.id === result.routingDecision)
      if (!nextAgent) {
        console.log(`⚠️ Next agent ${result.routingDecision} not found, ending execution`)
        break
      }
      
      currentAgent = nextAgent
    }
    
    console.log(`⏰ Max iterations reached, ending execution`)
    return {
      messages: allMessages,
      currentAgent: currentAgent.id,
      completed: true
    }
  }
  
  // 获取已加载的系统
  getLoadedSystems(): AgentSystemSpec[] {
    return Array.from(this.loadedSystems.values())
  }
  
  // 卸载系统
  unloadSystem(systemId: string): boolean {
    return this.loadedSystems.delete(systemId)
  }
}

// 全局系统运行器实例
export const globalSystemRunner = new AgentSystemRunner()
