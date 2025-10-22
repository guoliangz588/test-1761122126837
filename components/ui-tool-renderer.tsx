'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { extractUIToolCalls, UIToolCall, UIToolCallData } from '@/lib/ui-tool-message-processor'

// UI工具渲染器属性
interface UIToolRendererProps {
  messageContent: string
  sessionId?: string
  agentId?: string
  onInteraction?: (toolId: string, event: any) => void
}

// 单个UI工具组件渲染器
interface SingleUIToolProps {
  toolCall: UIToolCall
  sessionId: string
  agentId: string
  onInteraction?: (toolId: string, event: any) => void
}

function SingleUITool({ toolCall, sessionId, agentId, onInteraction }: SingleUIToolProps) {
  const [UIComponent, setUIComponent] = useState<React.ComponentType<any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadComponent() {
      console.log(`🔧 ================================================`)
      console.log(`🔧 === UI COMPONENT LOADING STARTED ===`)
      console.log(`🔧 ================================================`)
      console.log(`🆔 Tool ID: ${toolCall.toolId}`)
      console.log(`🏷️ Tool Name: ${toolCall.toolName}`)
      console.log(`🆔 Session ID: ${sessionId}`)
      console.log(`🆔 Agent ID: ${agentId}`)
      console.log(`📊 Tool Props:`, JSON.stringify(toolCall.props, null, 2))
      console.log(`🔄 Requires Interaction: ${toolCall.requiresInteraction}`)
      console.log(`🕐 Load Start Time: ${new Date().toISOString()}`)
      
      const loadStartTime = Date.now()
      
      try {
        setLoading(true)
        setError(null)
        console.log(`⏳ 设置加载状态为 true`)
        
        // 动态导入UI组件
        const importPath = `../pages/${toolCall.toolId}`
        console.log(`📁 尝试导入组件: ${importPath}`)
        
        const componentModule = await import(`../pages/${toolCall.toolId}`)
        console.log(`✅ 模块导入成功`)
        console.log(`📋 模块导出内容:`, Object.keys(componentModule))
        
        const Component = componentModule.default
        
        if (Component) {
          console.log(`✅ 找到默认组件导出`)
          console.log(`🔧 组件类型: ${typeof Component}`)
          console.log(`🏷️ 组件名称: ${Component.name || 'Anonymous'}`)
          
          setUIComponent(() => Component)
          console.log(`📦 组件已设置到状态中`)
        } else {
          const error = `Component not found in module`
          console.log(`❌ ${error}`)
          throw new Error(error)
        }
      } catch (err) {
        console.log(`❌ ================================================`)
        console.log(`❌ === UI COMPONENT LOADING FAILED ===`)
        console.log(`❌ ================================================`)
        console.log(`🚨 错误类型: ${err instanceof Error ? err.constructor.name : typeof err}`)
        console.log(`📄 错误信息: ${err instanceof Error ? err.message : String(err)}`)
        console.log(`📋 错误堆栈:`, err instanceof Error ? err.stack : 'No stack trace available')
        
        const errorMessage = `Unable to load UI component: ${toolCall.toolName}`
        console.log(`📝 设置用户友好错误信息: ${errorMessage}`)
        setError(errorMessage)
      } finally {
        const loadEndTime = Date.now()
        const loadDuration = loadEndTime - loadStartTime
        
        setLoading(false)
        console.log(`⏹️ 设置加载状态为 false`)
        console.log(`⏱️ 组件加载耗时: ${loadDuration}ms`)
        console.log(`🏁 === UI COMPONENT LOADING COMPLETED ===`)
      }
    }
    
    loadComponent()
  }, [toolCall.toolId, toolCall.toolName])
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
        </AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open(`/${toolCall.toolId}`, '_blank')}
          className="mt-2"
        >
          Open in New Tab
        </Button>
      </Alert>
    )
  }
  
  if (!UIComponent) {
    return (
      <Alert>
        <AlertDescription>
          UI component not available: {toolCall.toolName}
        </AlertDescription>
      </Alert>
    )
  }
  
  // 准备组件属性
  const componentProps = {
    ...toolCall.props,
    sessionId,
    agentId,
    onInteraction: onInteraction ? 
      (event: any) => {
        console.log(`🎯 ================================================`)
        console.log(`🎯 === UI COMPONENT INTERACTION ===`)
        console.log(`🎯 ================================================`)
        console.log(`🔧 Tool ID: ${toolCall.toolId}`)
        console.log(`🏷️ Tool Name: ${toolCall.toolName}`)
        console.log(`🆔 Session ID: ${sessionId}`)
        console.log(`🆔 Agent ID: ${agentId}`)
        console.log(`📄 Event Type: ${event.eventType || 'unknown'}`)
        console.log(`🕐 Interaction Time: ${new Date().toISOString()}`)
        console.log(`📊 Event Data:`, JSON.stringify(event, null, 2))
        console.log(`📤 转发事件到父组件处理器`)
        
        const result = onInteraction(toolCall.toolId, event)
        console.log(`✅ 父组件处理器调用完成`)
        return result
      } : 
      undefined
  }
  
  console.log(`🎨 ================================================`)
  console.log(`🎨 === UI COMPONENT RENDER PROPS ===`)
  console.log(`🎨 ================================================`)
  console.log(`🔧 Tool ID: ${toolCall.toolId}`)
  console.log(`📊 合并后的组件Props:`)
  Object.entries(componentProps).forEach(([key, value]) => {
    if (key === 'onInteraction') {
      console.log(`  ${key}: ${value ? 'function provided' : 'undefined'}`)
    } else if (typeof value === 'object') {
      console.log(`  ${key}: ${JSON.stringify(value, null, 2)}`)
    } else {
      console.log(`  ${key}: ${value}`)
    }
  })
  
  return (
    <Card className="w-full border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          🎨 {toolCall.toolName}
          {toolCall.requiresInteraction && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Interactive
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Agent UI Tool: {toolCall.toolId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <div className="ui-tool-container">
            <UIComponent {...componentProps} />
          </div>
        </Suspense>
        
        {/* 调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-xs text-gray-500">
            <summary className="cursor-pointer">Debug Info</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify({ toolCall, sessionId }, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

// 主UI工具渲染器组件
export default function UIToolRenderer({ messageContent, sessionId = 'default', agentId = 'unknown-agent', onInteraction }: UIToolRendererProps) {
  const [processedMessage, setProcessedMessage] = useState<{
    content: string
    uiToolCalls?: UIToolCallData
    hasUITools: boolean
  } | null>(null)
  
  useEffect(() => {
    console.log(`📄 ================================================`)
    console.log(`📄 === UI TOOL MESSAGE PROCESSING ===`)
    console.log(`📄 ================================================`)
    console.log(`🆔 Session ID: ${sessionId}`)
    console.log(`📏 消息内容长度: ${messageContent.length} 字符`)
    console.log(`📄 消息内容预览: "${messageContent.substring(0, 200)}${messageContent.length > 200 ? '...' : ''}"`)
    console.log(`🔍 开始提取UI工具调用数据`)
    
    const processingStartTime = Date.now()
    const processed = extractUIToolCalls(messageContent)
    const processingEndTime = Date.now()
    const processingDuration = processingEndTime - processingStartTime
    
    console.log(`⏱️ 消息处理耗时: ${processingDuration}ms`)
    console.log(`🛠️ 包含UI工具: ${processed.hasUITools}`)
    console.log(`📝 清理后内容长度: ${processed.content.length} 字符`)
    
    if (processed.hasUITools && processed.uiToolCalls) {
      console.log(`✅ === UI工具调用数据分析 ===`)
      console.log(`  📊 工具调用数量: ${processed.uiToolCalls.calls.length}`)
      console.log(`  🆔 Session ID: ${processed.uiToolCalls.sessionId}`)
      console.log(`  ⏳ 等待交互: ${processed.uiToolCalls.awaitingInteraction}`)
      
      processed.uiToolCalls.calls.forEach((call, idx) => {
        console.log(`  工具 ${idx + 1}:`)
        console.log(`    🔧 ID: ${call.toolId}`)
        console.log(`    🏷️ 名称: ${call.toolName}`)
        console.log(`    🔄 需要交互: ${call.requiresInteraction}`)
        console.log(`    📊 Props: ${JSON.stringify(call.props, null, 2)}`)
      })
    } else {
      console.log(`ℹ️ 消息不包含UI工具调用`)
    }
    
    setProcessedMessage(processed)
    console.log(`📦 已更新处理后的消息状态`)
  }, [messageContent, sessionId])
  
  if (!processedMessage) {
    return <div>Processing message...</div>
  }
  
  // 如果没有UI工具调用，返回原始内容
  if (!processedMessage.hasUITools || !processedMessage.uiToolCalls) {
    return (
      <div className="prose max-w-none">
        <div dangerouslySetInnerHTML={{ 
          __html: processedMessage.content.replace(/\n/g, '<br/>') 
        }} />
      </div>
    )
  }
  
  const { uiToolCalls } = processedMessage
  
  return (
    <div className="space-y-4">
      {/* 显示Agent响应文本 */}
      {processedMessage.content && (
        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ 
            __html: processedMessage.content.replace(/\n/g, '<br/>') 
          }} />
        </div>
      )}
      
      {/* 显示UI工具组件 */}
      <div className="space-y-4">
        {uiToolCalls.calls.map((toolCall, index) => (
          <SingleUITool
            key={`${toolCall.toolId}-${index}`}
            toolCall={toolCall}
            sessionId={sessionId}
            agentId={agentId}
            onInteraction={onInteraction}
          />
        ))}
      </div>
      
      {/* 等待交互提示 */}
      {uiToolCalls.awaitingInteraction && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="flex items-center gap-2">
            ⏳ Agent is waiting for your interaction with the UI components above
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// 导出辅助组件
export { SingleUITool }
export type { UIToolRendererProps, SingleUIToolProps }