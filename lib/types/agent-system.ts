// Agent系统相关类型定义
export interface UIRequirement {
  toolName: string
  description: string
  purpose: string
  priority: 'high' | 'medium' | 'low'
}

export interface AgentDefinition {
  id: string
  name: string
  type: 'orchestrator' | 'tool' | 'decision' | 'interface'
  description: string
  capabilities: string[]
  systemPrompt: string
  toolAccess: string[] // 可访问的 UI 工具 ID
  uiRequirements?: UIRequirement[]
  routingRules?: RoutingRule[]
}

export interface RoutingRule {
  condition: string // 条件表达式
  target: string   // 目标 agent ID
  priority: number
}

export interface AgentConnection {
  from: string
  to: string
  type: 'sequential' | 'conditional' | 'parallel' | 'tool_call'
  condition?: string
  description?: string
}

export interface PendingUIRequirement {
  agentId: string
  agentName: string
  requirement: UIRequirement
}

export interface AgentSystemSpec {
  id: string
  name: string
  description: string
  agents: AgentDefinition[]
  connections: AgentConnection[]
  uiTools: string[] // 已关联的 UI 组件 ID
  pendingUIRequirements?: PendingUIRequirement[]
  status: 'pending' | 'deploying' | 'active' | 'error'
  metadata: {
    createdAt: string
    createdBy: string
    version: string
    deployedAt?: string
    lastActive?: string
  }
  error?: string
}

export interface AgentSystemDeployment {
  systemId: string
  endpoint: string // 聊天API端点
  toolsCreated: number
  agentsConfigured: number
  deployedAt: string
  status: 'success' | 'partial' | 'failed'
  logs: string[]
}

// API请求/响应类型
export interface CreateAgentSystemRequest {
  name: string
  description: string
  userPrompt: string // 用户的原始需求描述
  existingUITools?: string[] // 现有可用的UI工具ID
}

export interface CreateAgentSystemResponse {
  success: boolean
  system?: AgentSystemSpec
  deployment?: AgentSystemDeployment
  error?: string
}

export interface ListAgentSystemsResponse {
  success: boolean
  systems: AgentSystemSpec[]
  count: number
}

export interface DeploySystemRequest {
  systemId: string
  autoCreateUI?: boolean // 是否自动创建UI需求
}

export interface DeploySystemResponse {
  success: boolean
  deployment?: AgentSystemDeployment
  error?: string
}

// Agent运行时状态
export interface AgentRuntimeState {
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
    agentType?: string
    metadata?: Record<string, any>
  }>
  currentAgent?: string
  availableUITools: Array<{id: string, name: string, description: string}>
  routingDecision?: string
  taskCompleted?: boolean
  sessionId: string
}

// Agent执行结果
export interface AgentExecutionResult {
  messages: AgentRuntimeState['messages']
  currentAgent?: string
  routingDecision?: string
  toolsUsed?: string[]
  completed: boolean
  metadata?: Record<string, any>
}
