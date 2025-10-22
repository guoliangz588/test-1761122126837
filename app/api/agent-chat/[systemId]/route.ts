import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { streamText, convertToCoreMessages, Message } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { AgentSystemSpec } from '@/lib/types/agent-system'
import { globalEnhancedSystemRunner } from '@/lib/agents/enhanced-runtime-engine'
import { uiInteractionManager } from '@/lib/ui-interaction-system'
import { debugUIToolPermissions, validateUIToolConfiguration } from '@/lib/ui-tool-access-control'
import { initializeGlobalProxy } from '@/lib/global-proxy'
const SYSTEMS_DIR = path.join(process.cwd(), 'data', 'agent-systems')

// 获取系统的UI工具列表
async function getSystemUITools(systemId: string) {
  try {
    // 读取系统配置
    const systemFile = path.join(SYSTEMS_DIR, `${systemId}.json`)
    const systemContent = await fs.readFile(systemFile, 'utf-8')
    const system: AgentSystemSpec = JSON.parse(systemContent)
    
    // 获取所有UI工具信息
    const uiToolsResponse = await fetch('http://localhost:4000/api/ui-register')
    if (!uiToolsResponse.ok) return []
    
    const uiToolsData = await uiToolsResponse.json()
    const allUITools = uiToolsData.tools || []
    
    // 过滤出系统关联的UI工具
    const systemUITools = allUITools.filter((tool: any) => 
      system.uiTools && system.uiTools.includes(tool.id)
    )
    
    return systemUITools
  } catch (error) {
    console.error('Failed to get system UI tools:', error)
    return []
  }
}

// 生成UI工具定义（基于原chat route.ts的模式）
function generateToolDefinition(tool: any) {
  return {
    description: tool.description || `A UI tool called ${tool.name}`,
    parameters: z.object({
      props: z
        .record(z.any())
        .optional()
        .describe('Props to pass to the UI component'),
    }),
    execute: async ({ props }: { props?: Record<string, any> }) => {
      return {
        toolId: tool.id,
        toolName: tool.name,
        description: tool.description,
        url: tool.url,
        props,
        timestamp: new Date().toISOString(),
      }
    },
  }
}

// POST: Agent系统聊天
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ systemId: string }> }
): Promise<Response> {
  try {
    const { systemId } = await params
    
    // 读取系统配置
    const systemFile = path.join(SYSTEMS_DIR, `${systemId}.json`)
    let system: AgentSystemSpec
    
    try {
      const systemContent = await fs.readFile(systemFile, 'utf-8')
      system = JSON.parse(systemContent)
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Agent system not found'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 检查系统状态
    if (system.status !== 'active') {
      return new Response(JSON.stringify({
        error: 'Agent system is not active. Please deploy the system first.'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const { messages }: { messages: Message[] } = await request.json()
    
    // 获取系统的UI工具
    const systemUITools = await getSystemUITools(systemId)
    
    // 验证UI工具配置并输出诊断信息
    const configValidation = validateUIToolConfiguration(system, systemUITools)
    if (!configValidation.isValid) {
      console.warn('⚠️ UI工具配置存在问题:')
      configValidation.issues.forEach(issue => console.warn(`  - ${issue}`))
      configValidation.recommendations.forEach(rec => console.log(`  💡 ${rec}`))
    }
    
    // 在开发环境下输出权限诊断信息
    debugUIToolPermissions(system, systemUITools)
    
    // 动态生成工具定义
    const dynamicTools: Record<string, any> = {}
    if (systemUITools && Array.isArray(systemUITools)) {
      systemUITools.forEach((tool: any) => {
        const functionName = `render${tool.id.replace(/[^a-zA-Z0-9]/g, '_')}`
        dynamicTools[functionName] = generateToolDefinition(tool)
      })
    }
    
    // 加载系统到增强运行时引擎
    await globalEnhancedSystemRunner.loadSystem(system)
    
    // 🔥 健康调查系统：使用固定的mock session ID以支持会话恢复
    const sessionId = `${systemId}_mock_session`
    globalEnhancedSystemRunner.registerUIInteractionHandler(sessionId, (event) => {
      console.log(`ui交互接收: ${event.eventType}`)
    })
    
    // 构建系统特定的系统提示
    const systemPrompt = `你是 ${system.name} 的智能助手。

系统描述：${system.description}

这个系统包含以下智能体：
${system.agents.map(agent => `- ${agent.name} (${agent.type}): ${agent.description}`).join('\n')}

注意：UI工具的访问权限由各个Agent的toolAccess配置控制，只有被授权的Agent才能调用相应的UI工具。

你可以根据用户需求：
1. 使用appropriate 'render' 函数来显示相关的UI工具
2. 协调不同的智能体来处理复杂任务
3. 提供专业的建议和帮助

请保持对话友好和有用，确保充分利用系统的能力来满足用户需求。`

    const coreMessages = convertToCoreMessages(messages)
    
    // 如果用户的消息看起来需要多智能体处理，运行完整的agent系统
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      try {
        console.log(`运行agent系统: ${lastMessage.content.substring(0, 30)}...`)
        
        // 运行增强的多智能体系统
        const agentResult = await globalEnhancedSystemRunner.runSystem(systemId, {
          messages: [{ role: 'user', content: lastMessage.content }],
          availableUITools: systemUITools.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description || ''
          })),
          sessionId
        })
        
        // 如果agent系统产生了结果，直接返回agent的回复
        if (agentResult.messages.length > 0) {
          // 🔥 健康问询系统：优先查找survey-assistant的用户友好消息，而不是最后的技术消息
          let agentMessage = agentResult.messages[agentResult.messages.length - 1]
          
          // 在双代理系统中，查找第一个非技术代理的消息作为用户响应
          const userFacingMessage = agentResult.messages.find(msg => 
            msg.agentType !== 'supabase-agent' && msg.content && msg.content.trim()
          )
          if (userFacingMessage) {
            agentMessage = userFacingMessage
          }
          
          console.log(`agent系统响应: ${agentMessage.content.substring(0, 50)}...`)
          
          // 更新系统的最后活跃时间
          system.metadata.lastActive = new Date().toISOString()
          await fs.writeFile(systemFile, JSON.stringify(system, null, 2), 'utf-8')
          
          // 构建增强的响应内容，包含UI工具调用
          // 直接使用选择的消息内容，已经过滤了技术消息
          let responseContent = agentMessage.content
          
          // 如果有UI工具调用，添加到响应中
          if (agentResult.uiToolCalls && agentResult.uiToolCalls.length > 0) {
            const uiCallsInfo = agentResult.uiToolCalls.map(call => 
              `🎨 UI Tool: ${call.toolName} (${call.toolId})${call.requiresInteraction ? ' [Interactive]' : ''}`
            ).join('\n')
            responseContent += `\n\n${uiCallsInfo}`
            
            // 如果等待交互，添加提示
            if (agentResult.awaitingUIInteraction) {
              responseContent += `\n\n⏳ 等待您在UI组件中进行操作...`
            }
          }

          // 记录MCP工具调用到服务器控制台（不显示给用户）
          if (agentResult.mcpToolCalls && agentResult.mcpToolCalls.length > 0) {
            console.log(`mcp操作总结: ${agentResult.mcpToolCalls.length}个操作`)
            
            agentResult.mcpToolCalls.forEach((call, index) => {
              console.log(`  - 成功: ${call.result.success}`)
              if (call.result.success) {
                console.log(`  - 结果: ${JSON.stringify(call.result.data, null, 2)?.substring(0, 200)}...`)
              } else {
                console.log(`  - 错误: ${call.result.error}`)
              }
            })
            
            const successOps = agentResult.mcpToolCalls.filter(call => call.result.success)
            const failedOps = agentResult.mcpToolCalls.filter(call => !call.result.success)
            
            console.log(`mcp结果: 成功${successOps.length} 失败${failedOps.length}`)
            
            if (failedOps.length > 0) {
              console.error(`⚠️ Database operation errors:`, failedOps.map(call => ({
                type: call.operation.type,
                error: call.result.error
              })))
            }
          }

          // 如果有agent调用，添加到响应中
          if (agentResult.agentCalls && agentResult.agentCalls.length > 0) {
            console.log(`🤝 Agent calls in response:`, agentResult.agentCalls)
            const agentCallsInfo = agentResult.agentCalls.map(call => 
              `🤝 Agent: ${call.targetAgent} (${call.operation})`
            ).join('\n')
            responseContent += `\n\n${agentCallsInfo}`
          }
          
          console.log(`创建stream响应`)
          console.log(`📝 Response preview: ${responseContent.substring(0, 200)}...`)
          
          // 创建兼容ai/react的流响应
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            start(controller) {
              let finalContent = responseContent
              
              // 如果有UI工具调用，将数据嵌入到主要响应内容中
              if (agentResult.uiToolCalls) {
                // 解析props字符串为对象
                const processedCalls = agentResult.uiToolCalls.map(call => {
                  let parsedProps = {}
                  if (call.props) {
                    try {
                      parsedProps = JSON.parse(call.props)
                    } catch (e) {
                      console.warn(`Failed to parse props for ${call.toolId}:`, call.props)
                      parsedProps = { rawProps: call.props }
                    }
                  }
                  return {
                    ...call,
                    props: parsedProps
                  }
                })
                
                // 将UI工具调用数据作为特殊注释嵌入响应中
                const toolCallData = {
                  type: 'ui-tool-calls',
                  calls: processedCalls,
                  sessionId,
                  awaitingInteraction: agentResult.awaitingUIInteraction
                }
                
                // 添加UI工具数据到响应内容末尾，使用特殊标记
                finalContent += `\n\n<!-- UI_TOOL_CALLS: ${JSON.stringify(toolCallData)} -->`
              }
              
              // 发送完整的消息内容 - 使用ai库的格式
              const escapedContent = finalContent.replace(/\n/g, '\\n').replace(/"/g, '\\"')
              controller.enqueue(encoder.encode(`0:"${escapedContent}"\n`))
              
              // 发送结束标记
              controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":${responseContent.length}}}\n`))
              controller.close()
            }
          })
          
          console.log(`🎉 Returning enhanced stream response with UI tools`)
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'x-vercel-ai-data-stream': 'v1',
              'x-session-id': sessionId,
            }
          })
        }
      } catch (agentError) {
        console.error('Agent system execution error:', agentError)
        // 如果agent系统执行失败，回退到普通聊天模式
      }
    }
    
    // 普通聊天模式（或agent系统执行失败时的回退）
    // 初始化全局代理配置
    initializeGlobalProxy();
    
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: coreMessages,
      tools: dynamicTools,
    })

    return result.toDataStreamResponse()
    
  } catch (error) {
    console.error('Error in agent chat:', error)
    return new Response(JSON.stringify({
      error: 'Failed to process chat message'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}