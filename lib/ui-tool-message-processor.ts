// UI工具消息处理器 - 从Agent响应中提取和处理UI工具调用
import React from 'react'

export interface UIToolCall {
  toolId: string
  toolName: string
  props: any
  requiresInteraction: boolean
}

export interface UIToolCallData {
  type: 'ui-tool-calls'
  calls: UIToolCall[]
  sessionId: string
  awaitingInteraction: boolean
}

export interface ProcessedMessage {
  content: string
  uiToolCalls?: UIToolCallData
  hasUITools: boolean
}

// 从消息内容中提取UI工具调用数据
export function extractUIToolCalls(messageContent: string): ProcessedMessage {
  try {
    // 查找UI工具调用标记
    const uiToolPattern = /<!-- UI_TOOL_CALLS: ([\s\S]*?) -->/
    const match = messageContent.match(uiToolPattern)
    
    if (!match) {
      return {
        content: messageContent,
        hasUITools: false
      }
    }
    
    // 解析UI工具调用数据
    const toolCallDataStr = match[1]
    let uiToolCalls: UIToolCallData
    
    try {
      uiToolCalls = JSON.parse(toolCallDataStr)
    } catch (parseError) {
      console.error('Failed to parse UI tool call data:', parseError)
      return {
        content: messageContent.replace(match[0], ''),
        hasUITools: false
      }
    }
    
    // 移除标记，返回清理后的内容
    const cleanContent = messageContent.replace(match[0], '').trim()
    
    return {
      content: cleanContent,
      uiToolCalls,
      hasUITools: true
    }
    
  } catch (error) {
    console.error('Error extracting UI tool calls:', error)
    return {
      content: messageContent,
      hasUITools: false
    }
  }
}

// React Hook for processing messages with UI tools
export function useUIToolMessageProcessor() {
  const processMessage = (content: string): ProcessedMessage => {
    return extractUIToolCalls(content)
  }
  
  const renderUITools = (uiToolCalls: UIToolCallData, onInteraction?: (toolId: string, event: any) => void) => {
    if (!uiToolCalls.calls || uiToolCalls.calls.length === 0) {
      return null
    }
    
    return uiToolCalls.calls.map((call, index) => {
      return {
        key: `${call.toolId}-${index}`,
        toolId: call.toolId,
        toolName: call.toolName,
        props: call.props,
        requiresInteraction: call.requiresInteraction,
        sessionId: uiToolCalls.sessionId,
        onInteraction
      }
    })
  }
  
  return {
    processMessage,
    renderUITools
  }
}

// UI工具渲染组件
export interface UIToolRendererProps {
  toolCall: UIToolCall
  sessionId: string
  onInteraction?: (toolId: string, event: any) => void
}

// 动态UI工具加载器
export class UIToolLoader {
  private static toolCache = new Map<string, React.ComponentType<any>>()
  
  static async loadUITool(toolId: string): Promise<React.ComponentType<any> | null> {
    // 检查缓存
    if (this.toolCache.has(toolId)) {
      return this.toolCache.get(toolId)!
    }
    
    try {
      // 尝试动态导入UI组件
      const component = await import(`../pages/${toolId}`)
      const UIComponent = component.default
      
      if (UIComponent) {
        this.toolCache.set(toolId, UIComponent)
        return UIComponent
      }
    } catch (error) {
      console.warn(`Failed to load UI tool: ${toolId}`, error)
    }
    
    return null
  }
  
  static clearCache() {
    this.toolCache.clear()
  }
}

// 工具调用处理器类
export class UIToolCallHandler {
  private sessionId: string
  private onInteraction?: (toolId: string, event: any) => void
  
  constructor(sessionId: string, onInteraction?: (toolId: string, event: any) => void) {
    this.sessionId = sessionId
    this.onInteraction = onInteraction
  }
  
  async handleToolCall(toolCall: UIToolCall): Promise<React.ReactElement | null> {
    const UIComponent = await UIToolLoader.loadUITool(toolCall.toolId)
    
    if (!UIComponent) {
      console.error(`UI tool not found: ${toolCall.toolId}`)
      return null
    }
    
    // 创建组件实例，传入props和交互处理器
    const componentProps = {
      ...toolCall.props,
      sessionId: this.sessionId,
      agentId: 'current-agent', // 可以从上下文获取
      onInteraction: this.onInteraction ? 
        (event: any) => this.onInteraction!(toolCall.toolId, event) : 
        undefined
    }
    
    return React.createElement(UIComponent, componentProps)
  }
  
  async handleMultipleToolCalls(toolCalls: UIToolCall[]): Promise<React.ReactElement[]> {
    const elements = await Promise.all(
      toolCalls.map(call => this.handleToolCall(call))
    )
    
    return elements.filter((el): el is React.ReactElement => el !== null)
  }
}

// 辅助函数：检查消息是否包含UI工具调用
export function hasUIToolCalls(messageContent: string): boolean {
  return /<!-- UI_TOOL_CALLS:/.test(messageContent)
}

// 辅助函数：获取UI工具调用数量
export function getUIToolCallCount(messageContent: string): number {
  const processed = extractUIToolCalls(messageContent)
  return processed.uiToolCalls?.calls?.length || 0
}
// (types already exported above)
