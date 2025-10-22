import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import {
  CreateAgentSystemRequest,
  CreateAgentSystemResponse,
  ListAgentSystemsResponse,
  AgentSystemSpec,
  PendingUIRequirement
} from '@/lib/types/agent-system'

import { initializeGlobalProxy } from '@/lib/global-proxy';

// Agent系统规格Schema - 基于ui-creator项目的SystemSpecificationSchema
const SystemSpecificationSchema = z.object({
  name: z.string().describe('多智能体系统的名称'),
  description: z.string().describe('系统的详细描述'),
  agents: z.array(z.object({
    id: z.string().describe('Agent 唯一标识符'),
    name: z.string().describe('Agent 显示名称'),
    type: z.enum(['orchestrator', 'tool', 'decision', 'interface']).describe('Agent 类型'),
    description: z.string().describe('Agent 功能描述'),
    capabilities: z.array(z.string()).describe('Agent 能力列表'),
    systemPrompt: z.string().describe('Agent 的系统提示词'),
    toolAccess: z.array(z.string()).describe('可访问的 UI 工具 ID 列表').optional(),
    uiRequirements: z.array(z.object({
      toolName: z.string().describe('UI工具名称（kebab-case格式）'),
      description: z.string().describe('UI组件的功能描述'),
      purpose: z.string().describe('在这个Agent中的用途'),
      priority: z.enum(['high', 'medium', 'low']).describe('创建优先级')
    })).optional().describe('此Agent需要的UI组件需求列表')
  })).describe('系统中的所有 Agent'),
  connections: z.array(z.object({
    from: z.string().describe('起始 Agent ID'),
    to: z.string().describe('目标 Agent ID'),
    type: z.enum(['sequential', 'conditional', 'parallel']).describe('连接类型'),
    condition: z.string().optional().describe('条件表达式'),
    description: z.string().optional().describe('连接说明')
  })).describe('Agent 之间的连接关系')
})

// 数据存储路径
const SYSTEMS_DIR = path.join(process.cwd(), 'data', 'agent-systems')
const SYSTEMS_INDEX_FILE = path.join(SYSTEMS_DIR, 'index.json')

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(SYSTEMS_DIR)
  } catch {
    await fs.mkdir(SYSTEMS_DIR, { recursive: true })
    // 初始化索引文件
    await fs.writeFile(SYSTEMS_INDEX_FILE, JSON.stringify([]), 'utf-8')
  }
}

// 生成唯一ID
function generateSystemId(): string {
  return `system_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// 获取现有UI工具列表
async function getExistingUITools(): Promise<Array<{id: string, name: string, description: string}>> {
  try {
    const response = await fetch('http://localhost:4000/api/ui-register')
    if (!response.ok) return []
    const data = await response.json()
    return data.tools || []
  } catch (error) {
    console.error('Failed to fetch existing UI tools:', error)
    return []
  }
}

// 保存系统到文件
async function saveSystemToFile(system: AgentSystemSpec): Promise<void> {
  const systemFile = path.join(SYSTEMS_DIR, `${system.id}.json`)
  await fs.writeFile(systemFile, JSON.stringify(system, null, 2), 'utf-8')
  
  // 更新索引
  let systems: AgentSystemSpec[] = []
  try {
    const indexContent = await fs.readFile(SYSTEMS_INDEX_FILE, 'utf-8')
    systems = JSON.parse(indexContent)
  } catch {
    // 如果读取失败，从空数组开始
  }
  
  // 更新或添加系统
  const existingIndex = systems.findIndex(s => s.id === system.id)
  if (existingIndex >= 0) {
    systems[existingIndex] = system
  } else {
    systems.push(system)
  }
  
  await fs.writeFile(SYSTEMS_INDEX_FILE, JSON.stringify(systems, null, 2), 'utf-8')
}

// 设计多智能体系统
async function designAgentSystem(
  userPrompt: string,
  existingUITools: Array<{id: string, name: string, description: string}>
): Promise<AgentSystemSpec> {
  // 确保代理已初始化
  initializeGlobalProxy();
  const systemPrompt = `你是一个多智能体系统架构师，专门设计基于 LangGraph 的智能体系统。

可用的 UI 工具组件：
${existingUITools.map(c => `- ${c.name} (${c.id}): ${c.description || '无描述'}`).join('\n')}

设计原则：
1. 系统应该有一个主 orchestrator 来协调其他 agents
2. 每个 agent 应该有明确的单一职责
3. 使用条件路由来实现智能分发
4. 工具类 agent 可以访问特定的 UI 组件
5. 保持系统简洁，避免过度设计
6. 为需要UI的agent定义具体的UI需求（uiRequirements）

Agent 类型说明：
- orchestrator: 主协调器，负责理解用户意图并路由到其他 agents
- tool: 工具型 agent，执行具体任务，可能使用 UI 组件
- decision: 决策型 agent，根据条件做出选择
- interface: 接口型 agent，处理与外部系统的交互

SystemPrompt 设计指南（重要）：
- 对于使用UI组件收集数据的agent，systemPrompt应该包含具体的用户友好提示语
- 例如：不要写"收集用户健康目标"，而应该写"请告诉我您最关心的三个健康目标："
- agent的回复应该是直接面向用户的友好提示文字，而不是技术性描述
- 当调用UI工具时，agent的消息内容应该是用户能看懂的提示，比如问题、说明或指导
- 避免在systemPrompt中使用技术术语，多使用用户导向的语言

UI需求定义指南：
- 仔细分析每个agent需要什么样的UI组件
- 如果现有UI组件不满足需求，在uiRequirements中定义新的UI需求
- 为每个UI需求设置合理的优先级（high/medium/low）
- toolName应使用kebab-case格式（如user-dashboard, data-visualizer）
- description应清晰说明UI组件的功能
- purpose应说明这个UI在agent中的具体用途`

  const contextualPrompt = `用户需求：${userPrompt}

请根据用户需求设计一个多智能体系统。系统应该：
1. 有清晰的架构和职责分工
2. 能够有效利用已有的 UI 组件
3. 具有良好的扩展性`
  initializeGlobalProxy();
  const result = await generateObject({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    prompt: contextualPrompt,
    schema: SystemSpecificationSchema,
  })

  // 转换为 AgentSystemSpec 格式
  const systemId = generateSystemId()
  
  // 收集所有UI需求
  const allUIRequirements: PendingUIRequirement[] = []
  
  const system: AgentSystemSpec = {
    id: systemId,
    name: result.object.name,
    description: result.object.description,
    agents: result.object.agents.map((agent, index) => {
      const agentId = agent.id || `${agent.type}_agent_${index + 1}`
      
      // 收集此agent的UI需求
      if (agent.uiRequirements) {
        agent.uiRequirements.forEach(req => {
          allUIRequirements.push({
            agentId,
            agentName: agent.name,
            requirement: req
          })
        })
      }
      
      return {
        ...agent,
        id: agentId,
        toolAccess: agent.toolAccess || [],
        uiRequirements: agent.uiRequirements
      }
    }),
    connections: result.object.connections,
    uiTools: existingUITools.map(c => c.id),
    pendingUIRequirements: allUIRequirements,
    status: 'pending',
    metadata: {
      createdAt: new Date().toISOString(),
      createdBy: 'system-designer',
      version: '1.0.0'
    }
  }

  return system
}

// POST: 创建新的Agent系统
export async function POST(request: NextRequest): Promise<NextResponse<CreateAgentSystemResponse>> {
  try {
    await ensureDataDir()
    
    const body: CreateAgentSystemRequest = await request.json()
    
    if (!body.userPrompt || !body.name || !body.description) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, description, userPrompt'
      }, { status: 400 })
    }

    // 获取现有UI工具
    const existingUITools = await getExistingUITools()
    
    // 设计系统
    const system = await designAgentSystem(body.userPrompt, existingUITools)
    
    // 保存到文件
    await saveSystemToFile(system)
    
    return NextResponse.json({
      success: true,
      system
    })
    
  } catch (error) {
    console.error('Error creating agent system:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create agent system'
    }, { status: 500 })
  }
}

// GET: 获取所有Agent系统
export async function GET(): Promise<NextResponse<ListAgentSystemsResponse>> {
  try {
    await ensureDataDir()
    
    let systems: AgentSystemSpec[] = []
    
    try {
      const indexContent = await fs.readFile(SYSTEMS_INDEX_FILE, 'utf-8')
      systems = JSON.parse(indexContent)
    } catch {
      // 如果读取失败，返回空列表
    }
    
    return NextResponse.json({
      success: true,
      systems,
      count: systems.length
    })
    
  } catch (error) {
    console.error('Error fetching agent systems:', error)
    return NextResponse.json({
      success: false,
      systems: [],
      count: 0
    }, { status: 500 })
  }
}