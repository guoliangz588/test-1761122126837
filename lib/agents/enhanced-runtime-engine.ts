import { AgentSystemSpec, AgentDefinition, AgentRuntimeState, AgentExecutionResult } from '../types/agent-system'
import { google } from '@ai-sdk/google'
import { generateObject, streamText } from 'ai'
import { z } from 'zod'
import { initializeGlobalProxy } from '../global-proxy'
import { mcpSupabaseProxy } from '../mcp/mcp-proxy'
import { MCPSupabaseOperation, MCPToolResult } from '../mcp/supabase-tool'

// UI交互事件类型
interface UIInteractionEvent {
  toolId: string
  eventType: 'click' | 'input' | 'select' | 'submit' | 'form_submit' | 'voice' | 'custom'
  data: any
  timestamp: string
  sessionId: string
  agentId?: string
}

// 增强的Agent执行结果
interface EnhancedAgentExecutionResult extends AgentExecutionResult {
  uiToolCalls?: Array<{
    toolId: string
    toolName: string
    props: any
    requiresInteraction: boolean
  }>
  mcpToolCalls?: Array<{
    operation: MCPSupabaseOperation
    result: MCPToolResult
  }>
  agentCalls?: Array<{
    targetAgent: string
    operation: string
    data: any
    result?: any
  }>
  awaitingUIInteraction?: boolean
  interactionContext?: {
    expectedEvents: string[]
    timeoutMs: number
  }
}

// 增强的运行时状态
interface EnhancedAgentRuntimeState extends AgentRuntimeState {
  uiInteractions: UIInteractionEvent[]
  pendingUIResponses: Map<string, any>
  interactionHistory: Array<{
    toolId: string
    agentId: string
    interaction: UIInteractionEvent
    timestamp: string
  }>
}

// 动态创建支持UI工具调用的agent schema
function createEnhancedAgentSchema(
  agentDef: AgentDefinition, 
  system: AgentSystemSpec,
  availableUITools: Array<{id: string, name: string, description: string}>
) {
  const baseSchema: any = {
    response: z.string().describe('给用户的回复内容'),
  }
  
  // 添加UI工具调用支持
  if (agentDef.toolAccess && agentDef.toolAccess.length > 0) {
    const accessibleTools = availableUITools.filter(tool => 
      agentDef.toolAccess.includes(tool.id)
    )
    
    if (accessibleTools.length > 0) {
      baseSchema.uiToolCalls = z.array(z.object({
        toolId: z.string().describe('要调用的UI工具ID'),
        toolName: z.string().describe('UI工具名称'),
        props: z.string().optional().describe('传递给UI组件的属性（JSON字符串格式）'),
        requiresInteraction: z.boolean().describe('是否需要用户交互')
      })).optional().describe('要调用的UI工具列表')
      
      baseSchema.awaitingUIInteraction = z.boolean().optional()
        .describe('是否等待UI交互响应')
    }
    
    // 添加MCP工具调用支持
    const hasMCPTools = agentDef.toolAccess.includes('mcp-supabase-operations')
    if (hasMCPTools) {
      baseSchema.mcpOperations = z.array(z.object({
        type: z.enum(['create_session', 'save_message', 'update_snapshot', 'get_session', 'create_tables', 'get_sessions', 'delete_session']).describe('MCP操作类型'),
        data: z.any().describe('操作数据')
      })).optional().describe('要执行的MCP数据库操作列表')
    }
    
    // 添加agent间通信支持
    const targetAgents = system.connections
      .filter(conn => conn.from === agentDef.id && conn.type === 'tool_call')
      .map(conn => conn.to)
    
    if (targetAgents.length > 0) {
      baseSchema.agentCalls = z.array(z.object({
        targetAgent: z.enum(targetAgents as [string, ...string[]]).describe('目标agent ID'),
        operation: z.string().describe('操作类型'),
        data: z.any().describe('传递给目标agent的数据')
      })).optional().describe('调用其他agent执行操作')
    }
  }
  
  // orchestrator类型的路由决策
  if (agentDef.type === 'orchestrator') {
    const routingTargets = system.connections
      .filter(conn => conn.from === agentDef.id)
      .map(conn => conn.to)
    
    if (routingTargets.length > 0) {
      const targetEnum = routingTargets.filter(t => t !== 'END' && t !== '__end__')
      if (targetEnum.length > 0) {
        baseSchema.routingDecision = z.enum(['END', ...targetEnum] as [string, ...string[]])
          .describe('路由决策：选择下一个处理agent，或选择END结束对话')
      }
    }
  }
  
  // tool类型的完成状态
  if (agentDef.type === 'tool') {
    baseSchema.isCompleted = z.boolean().describe('是否已完成任务处理')
    baseSchema.needsFollowup = z.boolean().describe('是否需要后续处理')
  }
  
  return z.object(baseSchema)
}

// 增强的Agent节点工厂
class EnhancedAgentNodeFactory {
  static async executeAgent(
    agentDef: AgentDefinition, 
    system: AgentSystemSpec,
    state: EnhancedAgentRuntimeState,
    availableUITools: Array<{id: string, name: string, description: string}> = []
  ): Promise<EnhancedAgentExecutionResult> {
    const messages = state.messages || []
    const lastMessage = messages[messages.length - 1]
    
    // 🔥 消息去重：为消息添加保存状态跟踪
    const messagesWithStatus = messages.map(msg => ({
      ...msg,
      savedToDb: (msg.metadata && msg.metadata['savedToDb']) || false
    }))
    
    // 识别真正的新消息（未保存的消息）
    const newMessages = messagesWithStatus.filter(msg => !msg.savedToDb)
    
    // 🔥 重要修复：不再生成通用欢迎消息，改为基于agent类型和系统配置
    if (messagesWithStatus.length === 0) {
      // 只有orchestrator类型在会话开始时才生成欢迎消息
      if (agentDef.type === 'orchestrator') {
        const welcomeMessage = {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content: `欢迎使用 ${system.name}！${system.description}`,
          timestamp: new Date().toISOString(),
          agentType: agentDef.id
        }
        
        return {
          messages: [welcomeMessage],
          currentAgent: agentDef.id,
          completed: false
        }
      } else {
        // 非orchestrator agent不应该在空消息历史时被调用
        console.log(`⚠️ Warning: Non-orchestrator agent ${agentDef.id} called with empty message history`)
        return {
          messages: [],
          currentAgent: agentDef.id,
          completed: false
        }
      }
    }
    
    // 检查是否有待处理的UI交互
    const recentUIInteractions = state.uiInteractions.filter(
      interaction => Date.now() - new Date(interaction.timestamp).getTime() < 30000 // 30秒内
    )
    
    // 构建agent上下文，包括UI工具信息
    const accessibleTools = availableUITools.filter(tool => 
      agentDef.toolAccess.includes(tool.id)
    )
    
    const toolsContext = accessibleTools.length > 0 
      ? `可用的UI工具：\n${accessibleTools.map(t => `- ${t.name} (${t.id}): ${t.description}`).join('\n')}`
      : ''
    
    const uiInteractionsContext = recentUIInteractions.length > 0
      ? `最近的UI交互：\n${recentUIInteractions.map(i => 
          `- ${i.toolId}: ${i.eventType} - ${JSON.stringify(i.data)}`
        ).join('\n')}`
      : ''
    
    try {
      initializeGlobalProxy()
      const model = google('gemini-2.5-flash')
      const schema = createEnhancedAgentSchema(agentDef, system, availableUITools)
      
      // 🔥 为orchestrator特别增强系统提示词，加强全局状态感知
      let enhancedSystemPrompt = `${agentDef.systemPrompt}

你的角色：${agentDef.name}
职责：${agentDef.description}
能力：${agentDef.capabilities.join(', ')}

${toolsContext}

${uiInteractionsContext}`

      // 如果是orchestrator，添加基于系统配置的协调指令
      if (agentDef.type === 'orchestrator') {
        // 获取系统的连接关系，动态生成路由规则
        const outgoingConnections = system.connections.filter(conn => conn.from === agentDef.id)
        const routingTargets = outgoingConnections.map(conn => conn.to).filter(target => target !== 'END')
        
        enhancedSystemPrompt += `

🧠 === ORCHESTRATOR协调模式 ===
你是 "${system.name}" 的主协调器。

系统目标：${system.description}

📋 可用的下游Agent：`
        
        routingTargets.forEach(targetId => {
          const targetAgent = system.agents.find(a => a.id === targetId)
          if (targetAgent) {
            enhancedSystemPrompt += `
- ${targetAgent.name} (${targetAgent.id}): ${targetAgent.description}`
          }
        })

        enhancedSystemPrompt += `

🔄 路由决策规则：`

        outgoingConnections.forEach(conn => {
          if (conn.to === 'END') {
            enhancedSystemPrompt += `
- 选择END：${conn.description || '任务完成时结束对话'}`
          } else {
            const targetAgent = system.agents.find(a => a.id === conn.to)
            if (targetAgent) {
              enhancedSystemPrompt += `
- 路由到${targetAgent.name}：${conn.description || '处理相关任务'}${conn.condition ? ` (条件: ${conn.condition})` : ''}`
            }
          }
        })

        enhancedSystemPrompt += `

⚠️ 重要原则：
1. 仔细分析完整的对话历史，了解当前进度
2. 避免重复已完成的步骤
3. 根据用户需求和系统流程选择合适的下一步
4. 如果任务已完成，选择END结束对话`
      }

      // 🔥 重要修复：移除通用UI工具说明，改为基于系统特定配置
      // 只有当agent有工具访问权限时才添加UI工具说明
      if (agentDef.toolAccess && agentDef.toolAccess.length > 0) {
        const accessibleTools = availableUITools.filter(tool => 
          agentDef.toolAccess.includes(tool.id)
        )
        
        if (accessibleTools.length > 0) {
          enhancedSystemPrompt += `

📋 === 可用UI工具 ===
您可以使用以下UI工具来协助完成任务：`

          accessibleTools.forEach(tool => {
            enhancedSystemPrompt += `
- ${tool.name} (${tool.id}): ${tool.description}`
          })

          enhancedSystemPrompt += `

🛠️ UI工具使用指南：
1. 在需要用户交互时，使用uiToolCalls数组指定要调用的工具
2. 设置requiresInteraction为true表示需要用户交互
3. 设置awaitingUIInteraction为true表示等待用户交互响应
4. props字段为JSON字符串格式，根据具体工具需求配置

例如调用${accessibleTools[0].name}：
[{
  "toolId": "${accessibleTools[0].id}",
  "toolName": "${accessibleTools[0].name}",
  "props": "{\\"title\\": \\"请输入信息\\"}",
  "requiresInteraction": true
}]`
        }
      }

      
      // 🔥 重要修复：传递完整消息历史而非仅最后一条消息
      // 构建包含完整对话历史和保存状态的prompt
      const conversationPrompt = messagesWithStatus.map((msg, idx) => {
        const savedStatus = msg.savedToDb ? '[已保存]' : '[未保存]'
        return `[消息 ${idx + 1}] ${savedStatus} ${msg.role === 'user' ? '用户' : 'Assistant'}：${msg.content}`
      }).join('\n\n')
      
      console.log(`步骤3-对话历史传递: ${messagesWithStatus.length}条消息`)
      
      const result = await generateObject({
        model,
        system: enhancedSystemPrompt,
        prompt: conversationPrompt, // 传递完整对话历史
        schema: schema,
      })
      
      console.log(`步骤4-agent响应完成: ${result.object.response?.substring(0, 50)}...`)
      
      const responseMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: result.object.response,
        timestamp: new Date().toISOString(),
        agentType: agentDef.id,
        metadata: { 'savedToDb': false }  // 新生成的响应标记为未保存
      }
      
      const executionResult: EnhancedAgentExecutionResult = {
        messages: [responseMessage],
        currentAgent: agentDef.id,
        completed: result.object.isCompleted ?? false,
        toolsUsed: agentDef.toolAccess,
        uiToolCalls: result.object.uiToolCalls,
        awaitingUIInteraction: result.object.awaitingUIInteraction
      }
      
      // 添加路由信息
      if (result.object.routingDecision) {
        executionResult.routingDecision = result.object.routingDecision
      }
      
      // 如果有UI工具调用，添加交互上下文
      if (result.object.uiToolCalls && result.object.uiToolCalls.length > 0) {
        const requiresInteraction = result.object.uiToolCalls.some((call: any) => call.requiresInteraction)
        if (requiresInteraction) {
          executionResult.interactionContext = {
            expectedEvents: result.object.uiToolCalls.map((call: any) => call.toolId),
            timeoutMs: 300000 // 5分钟超时
          }
        }
      }

      // 处理MCP工具调用
      if (result.object.mcpOperations && result.object.mcpOperations.length > 0) {
        executionResult.mcpToolCalls = []
        
        for (const mcpOp of result.object.mcpOperations) {
          try {
            // 特别为save_message操作添加详细信息和去重检查
            if (mcpOp.type === 'save_message') {
              // 去重检查：基于metadata验证
              const messageContent = mcpOp.data?.content
              const messageRole = mcpOp.data?.role
              
              // 验证必要字段
              if (!messageRole || !messageContent) {
                continue
              }
              
              // 检查是否存在相同内容的已保存消息
              const duplicateMessage = messages.find(msg => 
                msg.content === messageContent && 
                msg.role === messageRole && 
                msg.metadata && msg.metadata['savedToDb'] === true
              )
              
              if (duplicateMessage) {
                continue // 跳过重复消息的保存
              }
            }
            
            // 确保MCP操作包含必要的system_id和session_id
            const mcpData = { ...mcpOp.data }
            if (!mcpData.system_id && system.id) {
              mcpData.system_id = system.id
            }
            
            // 对于特定操作，确保包含session_id
            if ((mcpOp.type === 'update_snapshot' || mcpOp.type === 'save_message') && !mcpData.session_id && system.id) {
              mcpData.session_id = system.id  // 使用system_id作为session标识
            }
            
            // 处理Agent传递的模板字符串
            if (mcpData.user_id && mcpData.user_id === '{system_id}_mock_user' && system.id) {
              mcpData.user_id = `${system.id}_mock_user`
            }
            if (mcpData.session_id && mcpData.session_id === '{system_id}_mock_session' && system.id) {
              mcpData.session_id = system.id
            }
            
            const mcpResult = await mcpSupabaseProxy.executeOperation({
              type: mcpOp.type,
              data: mcpData
            })
            
            executionResult.mcpToolCalls.push({
              operation: { type: mcpOp.type, data: mcpOp.data },
              result: mcpResult
            })
            
            // 🔥 更新消息保存状态：MCP操作成功后标记消息为已保存
            if (mcpResult.success && mcpOp.type === 'save_message') {
              const savedContent = mcpOp.data?.content
              const savedRole = mcpOp.data?.role
              
              if (savedContent && savedRole) {
                // 找到对应的消息并更新metadata
                messages.forEach(msg => {
                  if (msg.content === savedContent && msg.role === savedRole && (!msg.metadata || !msg.metadata['savedToDb'])) {
                    msg.metadata = { ...msg.metadata, 'savedToDb': true }
                  }
                })
              }
            }
            
            // MCP结果通过mcpToolCalls数组传递，在API层面处理显示，避免JSON解析错误
            
          } catch (mcpError) {
            console.error(`❌ MCP operation failed:`, mcpError)
            executionResult.mcpToolCalls.push({
              operation: { type: mcpOp.type, data: mcpOp.data },
              result: {
                success: false,
                error: mcpError instanceof Error ? mcpError.message : 'Unknown MCP error',
                operationType: mcpOp.type
              }
            })
          }
        }
      }

      // 处理agent间调用
      if (result.object.agentCalls && result.object.agentCalls.length > 0) {
        executionResult.agentCalls = []
        
        for (const agentCall of result.object.agentCalls) {
          // For now, we'll store the call information and process it in the higher-level system
          executionResult.agentCalls.push({
            targetAgent: agentCall.targetAgent,
            operation: agentCall.operation,
            data: agentCall.data
          })
        }
      }
      
      return executionResult
      
    } catch (error) {
      console.error(`Error in enhanced agent ${agentDef.name}:`, error)
      
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

// 增强的系统运行器
export class EnhancedAgentSystemRunner {
  private loadedSystems: Map<string, AgentSystemSpec> = new Map()
  private sessionStates: Map<string, EnhancedAgentRuntimeState> = new Map()
  private uiInteractionCallbacks: Map<string, (event: UIInteractionEvent) => void> = new Map()
  
  // 加载系统
  async loadSystem(system: AgentSystemSpec): Promise<void> {
    this.loadedSystems.set(system.id, system)
  }
  
  // 注册UI交互事件处理器
  registerUIInteractionHandler(sessionId: string, callback: (event: UIInteractionEvent) => void): void {
    this.uiInteractionCallbacks.set(sessionId, callback)
  }
  
  // 处理UI交互事件
  async handleUIInteraction(event: UIInteractionEvent): Promise<void> {
    // 更新会话状态
    const sessionState = this.sessionStates.get(event.sessionId)
    if (sessionState) {
      sessionState.uiInteractions.push(event)
      
      // 记录交互历史
      sessionState.interactionHistory.push({
        toolId: event.toolId,
        agentId: event.agentId || 'unknown',
        interaction: event,
        timestamp: new Date().toISOString()
      })
      
      // 调用注册的回调
      const callback = this.uiInteractionCallbacks.get(event.sessionId)
      if (callback) {
        callback(event)
      }
    }
  }
  
  // 运行系统（支持UI交互）
  async runSystem(
    systemId: string, 
    input: {
      messages: Array<{role: string, content: string}>
      availableUITools?: Array<{id: string, name: string, description: string}>
      sessionId?: string
    }
  ): Promise<EnhancedAgentExecutionResult> {
    const system = this.loadedSystems.get(systemId)
    if (!system) {
      throw new Error(`System ${systemId} not loaded`)
    }
    
    const sessionId = input.sessionId || `session_${Date.now()}`
    
    // 初始化或获取会话状态
    let state = this.sessionStates.get(sessionId)
    if (!state) {
      state = {
        messages: input.messages.map((msg, index) => ({
          id: `msg_${index}`,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date().toISOString(),
          metadata: { 'savedToDb': false }  // 新消息标记为未保存
        })),
        availableUITools: input.availableUITools || [],
        sessionId,
        uiInteractions: [],
        pendingUIResponses: new Map(),
        interactionHistory: []
      }
      this.sessionStates.set(sessionId, state)
    } else {
      // 添加新消息到现有状态
      const newMessages = input.messages.map((msg, index) => ({
        id: `msg_${Date.now()}_${index}`,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date().toISOString(),
        metadata: { 'savedToDb': false }  // 新消息标记为未保存
      }))
      state.messages.push(...newMessages)
    }
    
    // 找到orchestrator
    const orchestrator = system.agents.find(agent => agent.type === 'orchestrator')
    if (!orchestrator) {
      throw new Error('System must have an orchestrator agent')
    }
    
    let currentAgent = orchestrator
    let maxIterations = 10
    let iteration = 0
    let allMessages: typeof state.messages = []
    
    while (iteration < maxIterations) {
      iteration++
      
      // 构建完整的消息历史
      const completeMessages = [...state.messages, ...allMessages]
      
      // 执行当前agent
      const result = await EnhancedAgentNodeFactory.executeAgent(
        currentAgent, 
        system, 
        {
          ...state,
          messages: completeMessages,
          currentAgent: currentAgent.id
        },
        input.availableUITools || []
      )
      
      // 收集消息
      allMessages = [...allMessages, ...result.messages]
      
      // 检查是否需要等待UI交互
      if (result.awaitingUIInteraction) {
        console.log(`⏳ Agent waiting for UI interaction`)
        // 返回当前结果，等待UI交互后继续
        return {
          ...result,
          messages: allMessages
        }
      }
      
      // 检查是否完成
      if (result.completed || result.routingDecision === 'END' || !result.routingDecision) {
        console.log(`✅ Enhanced system execution completed`)
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
  
  // 继续等待中的会话（在收到UI交互后）
  async continueSession(sessionId: string, triggeringEvent?: UIInteractionEvent): Promise<EnhancedAgentExecutionResult | null> {
    console.log(`🔄 ================================================`)
    console.log(`🔄 === CONTINUE SESSION DEBUG START ===`)
    console.log(`🔄 ================================================`)
    console.log(`📝 Session ID: ${sessionId}`)
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`)
    console.log(`🎯 Triggering Event:`, triggeringEvent ? {
      toolId: triggeringEvent.toolId,
      eventType: triggeringEvent.eventType,
      agentId: triggeringEvent.agentId,
      sessionId: triggeringEvent.sessionId,
      timestamp: triggeringEvent.timestamp,
      dataKeys: Object.keys(triggeringEvent.data || {}),
      dataSize: JSON.stringify(triggeringEvent.data || {}).length
    } : 'None')
    
    const state = this.sessionStates.get(sessionId)
    if (!state) {
      console.log(`❌ Session ${sessionId} not found in sessionStates`)
      console.log(`🔍 Available sessions: [${Array.from(this.sessionStates.keys()).join(', ')}]`)
      return null
    }
    
    console.log(`📊 === SESSION STATE ANALYSIS ===`)
    console.log(`📚 Current session messages (${state.messages.length} total):`)
    state.messages.forEach((msg, idx) => {
      console.log(`  ${idx + 1}. [${msg.role}] "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`)
      console.log(`       ID: ${msg.id || 'no-id'} | Timestamp: ${msg.timestamp || 'no-timestamp'}`)
    })
    
    console.log(`🎯 UI Interactions (${state.uiInteractions.length} total):`)
    state.uiInteractions.forEach((interaction, idx) => {
      console.log(`  ${idx + 1}. ${interaction.toolId} [${interaction.eventType}] @ ${interaction.timestamp}`)
    })
    
    console.log(`📋 Interaction History (${state.interactionHistory.length} total):`)
    state.interactionHistory.forEach((history, idx) => {
      console.log(`  ${idx + 1}. Agent: ${history.agentId} | Tool: ${history.toolId} @ ${history.timestamp}`)
    })
    
    // 检查是否有最近的UI交互需要处理
    const recentInteractions = state.uiInteractions.filter(
      interaction => Date.now() - new Date(interaction.timestamp).getTime() < 60000 // 1分钟内
    )
    
    if (recentInteractions.length === 0 && !triggeringEvent) {
      console.log(`⚠️ No recent interactions to process for session ${sessionId}`)
      return null
    }
    
    // 找到相关的系统
    let systemId: string | undefined
    let system: AgentSystemSpec | undefined
    
    for (const [sysId, sys] of this.loadedSystems.entries()) {
      if (sessionId.includes(sysId)) {
        systemId = sysId
        system = sys
        break
      }
    }
    
    if (!systemId || !system) {
      console.log(`⚠️ Cannot find system for session ${sessionId}`)
      return null
    }
    
    console.log(`🔄 Continuing session ${sessionId} after UI interaction`)
    
    try {
      // 构建包含UI交互数据的上下文消息
      let contextMessage = '用户刚刚通过UI组件进行了交互：\n\n'
      
      if (triggeringEvent) {
        contextMessage += `最新交互：\n`
        contextMessage += `- 工具: ${triggeringEvent.toolId}\n`
        contextMessage += `- 类型: ${triggeringEvent.eventType}\n`
        contextMessage += `- 数据: ${JSON.stringify(triggeringEvent.data, null, 2)}\n\n`
      }
      
      if (recentInteractions.length > 0) {
        contextMessage += `所有相关交互：\n`
        recentInteractions.forEach((interaction, index) => {
          contextMessage += `${index + 1}. ${interaction.toolId} (${interaction.eventType}): ${JSON.stringify(interaction.data)}\n`
        })
      }
      
      contextMessage += '\n请基于这些交互数据提供相应的响应。'
      
      // 🔥 重构: 不再在后端自动创建用户消息，改为依赖前端同步
      console.log(`🔄 === UI交互处理策略 (已重构) ===`)
      console.log(`  ✅ 后端不再自动生成用户消息`)  
      console.log(`  ✅ 前端负责在用户提交时立即同步用户消息`)
      console.log(`  ✅ 后端专注于处理Agent响应逻辑`)
      
      if (triggeringEvent && (triggeringEvent.eventType === 'submit' || triggeringEvent.eventType === 'form_submit')) {
        console.log(`📝 === 表单提交事件分析 ===`)
        console.log(`  🔧 Tool ID: ${triggeringEvent.toolId}`)
        console.log(`  📄 Event Type: ${triggeringEvent.eventType}`)
        console.log(`  🏷️ Agent ID: ${triggeringEvent.agentId}`)
        console.log(`  🕐 Event Timestamp: ${triggeringEvent.timestamp}`)
        console.log(`  📊 Event Data Structure:`)
        if (triggeringEvent.data) {
          Object.entries(triggeringEvent.data).forEach(([key, value]) => {
            console.log(`    ${key}: ${typeof value} (${JSON.stringify(value).substring(0, 200)}...)`)
          })
        }
        console.log(`  ✅ 前端应该已经添加了用户消息到聊天历史`)
        
        // 验证前端是否已经添加用户消息
        const userMessages = state.messages.filter(msg => msg.role === 'user')
        console.log(`  🔍 验证用户消息: 当前共有 ${userMessages.length} 条用户消息`)
        if (userMessages.length > 0) {
          const latestUserMsg = userMessages[userMessages.length - 1]
          console.log(`  📝 最新用户消息: "${latestUserMsg.content}" (ID: ${latestUserMsg.id})`)
        }
      }
      
      // 添加技术上下文消息（给Agent的指导）
      const contextMsg = {
        id: `context_${Date.now()}`,
        role: 'system' as const,
        content: contextMessage,
        timestamp: new Date().toISOString(),
        metadata: { 'savedToDb': false }  // 系统消息通常不需要保存到数据库
      }
      
      state.messages.push(contextMsg)
      
      // 🔥 关键修复：UI交互后总是返回到main-orchestrator让其重新评估全局状态
      console.log(`🎯 ================================================`)
      console.log(`🎯 === AGENT SELECTION STRATEGY ===`)
      console.log(`🎯 ================================================`)
      console.log(`  🤖 UI交互触发的Agent: ${triggeringEvent?.agentId || 'N/A'}`)
      console.log(`  🌐 当前系统: ${system.name} (${system.id})`)
      console.log(`  📋 可用Agents: ${system.agents.map(a => `${a.name}(${a.type})`).join(', ')}`)
      
      // 找到main-orchestrator
      const orchestrator = system.agents.find(agent => agent.type === 'orchestrator')
      if (!orchestrator) {
        console.log(`❌ 错误: 系统必须有一个 orchestrator 类型的 Agent`)
        throw new Error('System must have a main orchestrator')
      }
      
      console.log(`🧠 === 核心决策逻辑 ===`)
      console.log(`  📍 策略: UI交互后总是让 main-orchestrator 重新评估全局状态`)
      console.log(`  🎯 目标: 确保 orchestrator 感知到所有用户输入和状态变化`)
      console.log(`  ✅ 效果: 避免重复显示相同的UI工具，保证流程连续性`)
      
      const nextAgent = orchestrator
      console.log(`🚀 选中的下一个Agent: ${nextAgent.name} (${nextAgent.id})`)
      console.log(`  🔧 类型: ${nextAgent.type}`)
      console.log(`  📝 描述: ${nextAgent.description}`)
      console.log(`  🛠️ 工具访问权限: [${nextAgent.toolAccess.join(', ')}]`)
      console.log(`  💪 能力: [${nextAgent.capabilities.join(', ')}]`)
      
      if (!nextAgent) {
        throw new Error('Cannot determine next agent to execute')
      }
      
      // 获取可用的UI工具
      const availableUITools = state.availableUITools || []
      
      // 执行下一个Agent
      console.log(`🚀 ================================================`)
      console.log(`🚀 === AGENT EXECUTION PHASE ===`)
      console.log(`🚀 ================================================`)
      console.log(`  🤖 执行Agent: ${nextAgent.name} (${nextAgent.id})`)
      console.log(`  📊 会话状态消息数: ${state.messages.length}`)
      console.log(`  🛠️ 可用UI工具数: ${availableUITools.length}`)
      console.log(`  📋 UI工具列表: [${availableUITools.map(tool => tool.id).join(', ')}]`)
      console.log(`  🕐 执行开始时间: ${new Date().toISOString()}`)
      
      const executionStartTime = Date.now()
      const result = await EnhancedAgentNodeFactory.executeAgent(
        nextAgent,
        system,
        state,
        availableUITools
      )
      const executionEndTime = Date.now()
      const executionDuration = executionEndTime - executionStartTime
      
      console.log(`✅ ================================================`)
      console.log(`✅ === AGENT EXECUTION COMPLETED ===`)
      console.log(`✅ ================================================`)
      console.log(`  ⏱️ 执行耗时: ${executionDuration}ms`)
      console.log(`  📝 返回消息数: ${result.messages.length}`)
      console.log(`  🎯 当前Agent: ${result.currentAgent}`)
      console.log(`  🏁 是否完成: ${result.completed}`)
      
      if (result.messages.length > 0) {
        const latestMessage = result.messages[result.messages.length - 1]
        console.log(`  📄 最新响应预览: "${latestMessage.content.substring(0, 150)}${latestMessage.content.length > 150 ? '...' : ''}"`)
        console.log(`  📄 消息ID: ${latestMessage.id}`)
        console.log(`  📄 消息角色: ${latestMessage.role}`)
        console.log(`  📄 消息长度: ${latestMessage.content.length} 字符`)
      }
      
      // 🔥 关键修复：将Agent响应添加到会话状态中，确保后续的runSystem调用能看到完整历史
      console.log(`🔄 将Agent响应同步到会话状态`)
      result.messages.forEach(msg => {
        state.messages.push(msg)
      })
      console.log(`📊 会话状态更新后总消息数: ${state.messages.length}`)
      
      // 🔥 关键修复：确保返回完整的对话历史，包括用户的UI输入
      console.log(`📝 构建完整的响应，包含用户UI输入`)
      
      // 🔥 重构: 不再添加用户消息，只返回Agent响应
      const completeResult = {
        ...result,
        messages: result.messages // 只包含Agent的响应消息
      }
      
      console.log(`📊 完整响应包含消息数: ${completeResult.messages.length}`)
      console.log(`📝 完整响应消息详情:`)
      completeResult.messages.forEach((msg, idx) => {
        console.log(`  ${idx + 1}. [${msg.role}] "${msg.content.substring(0, 100)}..." (ID: ${msg.id})`)
      })
      console.log(`🔄 === CONTINUE SESSION DEBUG END ===`)
      return completeResult
      
    } catch (error) {
      console.error(`❌ Error continuing session ${sessionId}:`, error)
      
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: '抱歉，处理您的交互时遇到了问题。请重新尝试或开始新的对话。',
        timestamp: new Date().toISOString(),
        agentType: 'system'
      }
      
      return {
        messages: [errorMessage],
        currentAgent: 'system',
        completed: false
      }
    }
  }
  
  // 清理会话状态
  clearSession(sessionId: string): void {
    this.sessionStates.delete(sessionId)
    this.uiInteractionCallbacks.delete(sessionId)
  }
  
  // 获取会话状态
  getSessionState(sessionId: string): EnhancedAgentRuntimeState | undefined {
    return this.sessionStates.get(sessionId)
  }
}

// 全局增强系统运行器实例
export const globalEnhancedSystemRunner = new EnhancedAgentSystemRunner()

// 导出类型
export type { UIInteractionEvent, EnhancedAgentExecutionResult, EnhancedAgentRuntimeState }