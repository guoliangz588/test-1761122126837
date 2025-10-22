// UI交互系统 - 处理UI组件与Agent的双向通信

import React from 'react'
import { UIInteractionEvent } from './agents/enhanced-runtime-engine'

// UI交互管理器
export class UIInteractionManager {
  private static instance: UIInteractionManager
  private eventHandlers: Map<string, (event: UIInteractionEvent) => void> = new Map()
  private sessionEventQueues: Map<string, UIInteractionEvent[]> = new Map()
  
  static getInstance(): UIInteractionManager {
    if (!UIInteractionManager.instance) {
      UIInteractionManager.instance = new UIInteractionManager()
    }
    return UIInteractionManager.instance
  }
  
  // 注册事件处理器
  registerEventHandler(sessionId: string, handler: (event: UIInteractionEvent) => void): void {
    this.eventHandlers.set(sessionId, handler)
    
    // 处理队列中的事件
    const queuedEvents = this.sessionEventQueues.get(sessionId) || []
    queuedEvents.forEach(event => handler(event))
    this.sessionEventQueues.delete(sessionId)
  }
  
  // 发送UI交互事件
  async sendInteractionEvent(event: UIInteractionEvent): Promise<void> {
    console.log(`ui交互-发送事件: 类型${event.eventType}, 会话${event.sessionId}`)
    
    const handler = this.eventHandlers.get(event.sessionId)
    if (handler) {
      handler(event)
    } else {
      // 如果没有处理器，将事件加入队列
      const queue = this.sessionEventQueues.get(event.sessionId) || []
      queue.push(event)
      this.sessionEventQueues.set(event.sessionId, queue)
      console.log(`ui交互-事件排队: 会话${event.sessionId}, 队列长度${queue.length}`)
    }
  }
  
  // 清理会话
  clearSession(sessionId: string): void {
    this.eventHandlers.delete(sessionId)
    this.sessionEventQueues.delete(sessionId)
  }
}

// 客户端UI交互辅助类
export class ClientUIInteractionHelper {
  private sessionId: string
  private agentId?: string
  
  constructor(sessionId: string, agentId?: string) {
    this.sessionId = sessionId
    this.agentId = agentId
  }
  
  // 发送点击事件
  async sendClick(toolId: string, buttonId: string, data?: any): Promise<void> {
    const event: UIInteractionEvent = {
      toolId,
      eventType: 'click',
      data: { buttonId, ...data },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      agentId: this.agentId
    }
    
    await this.sendToServer(event)
  }
  
  // 发送输入事件
  async sendInput(toolId: string, fieldName: string, value: any): Promise<void> {
    const event: UIInteractionEvent = {
      toolId,
      eventType: 'input',
      data: { fieldName, value },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      agentId: this.agentId
    }
    
    await this.sendToServer(event)
  }
  
  // 发送选择事件
  async sendSelect(toolId: string, selectedValue: any, selectedOption?: string): Promise<void> {
    const event: UIInteractionEvent = {
      toolId,
      eventType: 'select',
      data: { selectedValue, selectedOption },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      agentId: this.agentId
    }
    
    await this.sendToServer(event)
  }
  
  // 发送表单提交事件
  async sendSubmit(toolId: string, formData: Record<string, any>): Promise<void> {
    const event: UIInteractionEvent = {
      toolId,
      eventType: 'submit',
      data: formData,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      agentId: this.agentId
    }
    
    await this.sendToServer(event)
  }
  
  // 发送语音事件
  async sendVoice(toolId: string, audioData: string, transcript?: string): Promise<void> {
    const event: UIInteractionEvent = {
      toolId,
      eventType: 'voice',
      data: { audioData, transcript },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      agentId: this.agentId
    }
    
    await this.sendToServer(event)
  }
  
  // 发送自定义事件
  async sendCustom(toolId: string, customData: any): Promise<void> {
    const event: UIInteractionEvent = {
      toolId,
      eventType: 'custom',
      data: customData,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      agentId: this.agentId
    }
    
    await this.sendToServer(event)
  }
  
  // 向服务器发送事件
  private async sendToServer(event: UIInteractionEvent): Promise<void> {
    try {
      const response = await fetch('/api/ui-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to send interaction event: ${response.statusText}`)
      }
      
      console.log(`ui交互-客户端发送: 成功`)
    } catch (error) {
      console.error('ui交互-客户端发送: 失败', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

// React Hook for UI interactions
export function useUIInteraction(sessionId: string, agentId?: string) {
  const helper = new ClientUIInteractionHelper(sessionId, agentId)
  
  return {
    sendClick: helper.sendClick.bind(helper),
    sendInput: helper.sendInput.bind(helper),
    sendSelect: helper.sendSelect.bind(helper),
    sendSubmit: helper.sendSubmit.bind(helper),
    sendVoice: helper.sendVoice.bind(helper),
    sendCustom: helper.sendCustom.bind(helper)
  }
}

// UI组件增强装饰器 - 为现有UI组件添加交互能力
export function withUIInteraction<T extends React.ComponentProps<any>>(
  WrappedComponent: React.ComponentType<T>,
  toolId: string
) {
  return function InteractiveComponent(props: T & { 
    sessionId: string
    agentId?: string
    onInteraction?: (event: UIInteractionEvent) => void
  }) {
    const { sessionId, agentId, onInteraction, ...otherProps } = props
    const uiHelper = new ClientUIInteractionHelper(sessionId, agentId)
    
    // 创建增强的事件处理器
    const enhancedProps = {
      ...otherProps,
      onClick: async (e: any) => {
        // 调用原始onClick
        if ((otherProps as any).onClick) {
          (otherProps as any).onClick(e)
        }
        
        // 发送交互事件
        await uiHelper.sendClick(toolId, 'main-click', {
          target: e.currentTarget?.tagName || 'unknown',
          timestamp: Date.now()
        })
        
        // 调用自定义回调
        if (onInteraction) {
          const event: UIInteractionEvent = {
            toolId,
            eventType: 'click',
            data: { target: e.currentTarget?.tagName || 'unknown' },
            timestamp: new Date().toISOString(),
            sessionId,
            agentId
          }
          onInteraction(event)
        }
      },
      
      onChange: async (e: any) => {
        // 调用原始onChange
        if ((otherProps as any).onChange) {
          (otherProps as any).onChange(e)
        }
        
        // 发送输入事件
        await uiHelper.sendInput(toolId, e.target?.name || 'input', e.target?.value)
        
        // 调用自定义回调
        if (onInteraction) {
          const event: UIInteractionEvent = {
            toolId,
            eventType: 'input',
            data: { field: e.target?.name, value: e.target?.value },
            timestamp: new Date().toISOString(),
            sessionId,
            agentId
          }
          onInteraction(event)
        }
      }
    } as T
    
    // 返回React元素工厂函数，而不是JSX
    return React.createElement(WrappedComponent as any, enhancedProps as any)
  }
}

// 类型定义
export interface InteractiveUIProps {
  sessionId: string
  agentId?: string
  onInteraction?: (event: UIInteractionEvent) => void
}

// 导出管理器单例
export const uiInteractionManager = UIInteractionManager.getInstance()