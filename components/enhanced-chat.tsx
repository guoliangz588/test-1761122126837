'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import UIToolRenderer from './ui-tool-renderer'
import { uiInteractionManager } from '@/lib/ui-interaction-system'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface EnhancedChatProps {
  systemId: string
  initialMessages?: Message[]
  onMessage?: (message: Message) => void
  currentAgentId?: string // 当前active的agent ID
}

export default function EnhancedChat({ systemId, initialMessages = [], onMessage, currentAgentId }: EnhancedChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(`session_${systemId}_${Date.now()}`)
  const [autoStartTriggered, setAutoStartTriggered] = useState(false)
  
  // 自动触发对话 - 页面加载后立即开始健康问卷
  useEffect(() => {
    if (!autoStartTriggered && !isLoading && messages.length === 0) {
      setAutoStartTriggered(true)
      // 发送AUTO_START消息来触发Survey Assistant主动开始对话
      sendAutoStartMessage()
    }
  }, [autoStartTriggered, isLoading, messages.length])

  // 自动开始消息发送函数
  const sendAutoStartMessage = async () => {
    console.log('🚀 Auto-starting health survey conversation...')
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/agent-chat/${systemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'AUTO_START' }]
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            if (line.startsWith('0:"')) {
              try {
                const messageContent = JSON.parse(line.substring(2))
                content = messageContent
              } catch (e) {
                console.warn('Failed to parse message chunk:', line)
              }
            }
          }
        }
      }
      
      if (content) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content,
          timestamp: new Date().toISOString()
        }
        
        setMessages([assistantMessage])
        onMessage?.(assistantMessage)
      }
      
    } catch (error) {
      console.error('Failed to auto-start conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 处理UI交互事件
  const handleUIInteraction = async (toolId: string, event: any) => {
    console.log(`🎯 ================================================`)
    console.log(`🎯 === UI INTERACTION STARTED ===`)
    console.log(`🎯 ================================================`)
    console.log(`🔧 Tool ID: ${toolId}`)
    console.log(`📄 Event Type: ${event.eventType}`)
    console.log(`🆔 Session ID: ${sessionId}`)
    console.log(`🕐 Client Timestamp: ${new Date().toISOString()}`)
    console.log(`📊 Event Data Structure:`)
    Object.entries(event).forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.log(`  ${key}: ${JSON.stringify(value, null, 2)}`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    })
    
    // 🔥 重构: 如果是表单提交，立即添加用户消息到前端
    if (event.eventType === 'form_submit' && event.formData) {
      console.log(`📝 ================================================`)
      console.log(`📝 === FRONTEND MESSAGE SYNC (IMMEDIATE) ===`)
      console.log(`📝 ================================================`)
      console.log(`✅ 检测到表单提交，开始立即同步用户消息到前端`)
      
      // 提取用户的实际输入内容（不添加前缀）
      let userInput = ''
      console.log(`🔍 分析表单数据以提取用户输入:`)
      
      if (toolId.includes('health-goal-input') && event.formData.healthGoals) {
        userInput = event.formData.healthGoals
        console.log(`  📋 健康目标输入工具: "${userInput}"`)
      } else if (event.formData) {
        // 通用表单数据处理
        const formValues = Object.values(event.formData).filter(v => v && typeof v === 'string')
        userInput = formValues.join(', ')
        console.log(`  📋 通用表单数据: [${formValues.join(', ')}] -> "${userInput}"`)
      }
      
      if (userInput.trim()) {
        const messageTimestamp = new Date().toISOString()
        const userMessage: Message = {
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          role: 'user',
          content: userInput.trim(),
          timestamp: messageTimestamp
        }
        
        console.log(`📝 === 创建用户消息对象 ===`)
        console.log(`  📄 Message ID: ${userMessage.id}`)
        console.log(`  👤 Message Role: ${userMessage.role}`)
        console.log(`  📝 Message Content: "${userMessage.content}"`)
        console.log(`  🕐 Message Timestamp: ${userMessage.timestamp}`)
        console.log(`  📊 Content Length: ${userMessage.content.length} characters`)
        
        console.log(`📊 当前消息数量 (添加前): ${messages.length}`)
        setMessages(prev => {
          const newMessages = [...prev, userMessage]
          console.log(`📊 消息数量 (添加后): ${newMessages.length}`)
          return newMessages
        })
        
        if (onMessage) {
          console.log(`📡 通知父组件新消息`)
          onMessage(userMessage)
        }
        
        console.log(`✅ 用户消息已成功添加到前端状态`)
      } else {
        console.log(`⚠️ 用户输入为空，跳过消息同步`)
      }
    }
    
    try {
      console.log(`🌐 ================================================`)
      console.log(`🌐 === API REQUEST TO BACKEND ===`)
      console.log(`🌐 ================================================`)
      
      const requestPayload = {
        toolId,
        eventType: event.eventType || 'custom',
        data: event,
        timestamp: new Date().toISOString(),
        sessionId,
        agentId: currentAgentId || event.agentId || 'main-orchestrator'
      }
      
      console.log(`📡 发送请求到: /api/ui-interaction`)
      console.log(`🔧 请求方法: POST`)
      console.log(`📊 请求载荷:`)
      console.log(`  toolId: ${requestPayload.toolId}`)
      console.log(`  eventType: ${requestPayload.eventType}`)
      console.log(`  sessionId: ${requestPayload.sessionId}`)
      console.log(`  agentId: ${requestPayload.agentId}`)
      console.log(`  timestamp: ${requestPayload.timestamp}`)
      console.log(`  data: ${JSON.stringify(requestPayload.data, null, 2)}`)
      console.log(`📏 载荷大小: ${JSON.stringify(requestPayload).length} bytes`)
      
      const requestStartTime = Date.now()
      
      // 发送交互事件到服务器
      const response = await fetch('/api/ui-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      })
      
      const requestEndTime = Date.now()
      const requestDuration = requestEndTime - requestStartTime
      
      console.log(`📨 ================================================`)
      console.log(`📨 === API RESPONSE RECEIVED ===`)
      console.log(`📨 ================================================`)
      console.log(`⏱️ 请求耗时: ${requestDuration}ms`)
      console.log(`🔢 响应状态: ${response.status} ${response.statusText}`)
      console.log(`📏 响应头:`)
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`)
      })
      
      if (!response.ok) {
        console.log(`❌ HTTP 错误: ${response.status}`)
        throw new Error(`HTTP ${response.status}`)
      }
      
      const result = await response.json()
      console.log(`📋 === API响应内容分析 ===`)
      console.log(`  成功状态: ${result.success}`)
      console.log(`  消息: ${result.message}`)
      console.log(`  会话续接: ${result.sessionContinued}`)
      console.log(`  返回消息数: ${result.messages?.length || 0}`)
      console.log(`  总消息数: ${result.totalMessages || 0}`)
      
      if (result.error) {
        console.log(`  ❌ 错误信息: ${result.error}`)
      }
      
      // 🔥 关键修复：处理完整的消息历史，包括用户UI输入
      if (result.messages && result.messages.length > 0) {
        console.log(`📝 ================================================`)
        console.log(`📝 === BACKEND MESSAGES PROCESSING ===`)
        console.log(`📝 ================================================`)
        console.log(`📊 从后端接收到 ${result.messages.length} 条消息`)
        console.log(`📋 详细消息分析:`)
        
        result.messages.forEach((msg: any, idx: number) => {
          console.log(`  消息 ${idx + 1}:`)
          console.log(`    角色: ${msg.role}`)
          console.log(`    ID: ${msg.id}`)
          console.log(`    时间戳: ${msg.timestamp}`)
          console.log(`    内容长度: ${msg.content?.length || 0} 字符`)
          console.log(`    内容预览: "${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}"`)
          console.log(`    Agent类型: ${msg.agentType || 'N/A'}`)
        })
        
        const newMessages: Message[] = result.messages.map((msg: any, idx: number) => {
          const processedMessage = {
            id: msg.id || `backend_${Date.now()}_${idx}`,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString()
          }
          
          console.log(`  ✅ 处理消息 ${idx + 1}: ${processedMessage.id}`)
          return processedMessage
        })
        
        console.log(`📊 当前聊天消息数 (添加前): ${messages.length}`)
        setMessages(prev => {
          const updatedMessages = [...prev, ...newMessages]
          console.log(`📊 聊天消息数 (添加后): ${updatedMessages.length}`)
          return updatedMessages
        })
        
        // 通知每条新消息
        console.log(`📡 通知父组件新接收的消息`)
        newMessages.forEach((msg, idx) => {
          console.log(`  📤 通知消息 ${idx + 1}: ${msg.id}`)
          onMessage?.(msg)
        })
        
        console.log(`✅ === 后端消息处理完成 ===`)
        console.log(`  📊 成功添加 ${newMessages.length} 条消息到聊天历史`)
        console.log(`  📈 聊天总消息数: ${messages.length + newMessages.length}`)
      } else if (result.agentResponse) {
        // 回退逻辑：如果没有messages数组，使用旧的agentResponse方式
        const agentMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.agentResponse,
          timestamp: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, agentMessage])
        onMessage?.(agentMessage)
      }
      
    } catch (error) {
      console.error('Failed to send UI interaction:', error)
    }
  }
  
  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    onMessage?.(userMessage)
    
    try {
      const response = await fetch(`/api/agent-chat/${systemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            if (line.startsWith('0:"')) {
              // 提取消息内容
              try {
                const messageContent = JSON.parse(line.substring(2))
                content = messageContent
              } catch (e) {
                console.warn('Failed to parse message chunk:', line)
              }
            }
          }
        }
      }
      
      if (content) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content,
          timestamp: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, assistantMessage])
        onMessage?.(assistantMessage)
      }
      
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessage])
      onMessage?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          Enhanced Agent Chat
          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
            {systemId}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* 消息区域 */}
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <UIToolRenderer
                      messageContent={message.content}
                      sessionId={sessionId}
                      onInteraction={handleUIInteraction}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  
                  <div className="text-xs opacity-70 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    <span className="text-gray-600">Agent is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* 输入区域 */}
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </div>
        
        {/* 会话信息 */}
        <div className="text-xs text-gray-500 mt-2 flex justify-between">
          <span>Session: {sessionId.substring(0, 20)}...</span>
          <span>{messages.length} messages</span>
        </div>
      </CardContent>
    </Card>
  )
}

export type { Message, EnhancedChatProps }