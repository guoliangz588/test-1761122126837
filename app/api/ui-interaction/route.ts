import { NextRequest, NextResponse } from 'next/server'
import { UIInteractionEvent, globalEnhancedSystemRunner } from '@/lib/agents/enhanced-runtime-engine'
import { uiInteractionManager } from '@/lib/ui-interaction-system'

// POST: 处理UI交互事件
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestStartTime = Date.now()
  console.log(`🌐 ================================================`)
  console.log(`🌐 === UI INTERACTION API REQUEST RECEIVED ===`)
  console.log(`🌐 ================================================`)
  console.log(`🕐 请求时间: ${new Date().toISOString()}`)
  console.log(`🔧 请求方法: ${request.method}`)
  console.log(`📡 请求URL: ${request.url}`)
  console.log(`📄 请求头:`)
  request.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`)
  })
  
  try {
    console.log(`📋 开始解析请求体...`)
    const event: UIInteractionEvent = await request.json()
    const requestParseTime = Date.now()
    console.log(`⏱️ 请求体解析耗时: ${requestParseTime - requestStartTime}ms`)
    
    console.log(`🎯 === UI INTERACTION EVENT ANALYSIS ===`)
    console.log(`📦 事件基本信息:`)
    console.log(`  🔧 Tool ID: ${event.toolId}`)
    console.log(`  📄 Event Type: ${event.eventType}`)
    console.log(`  🆔 Session ID: ${event.sessionId}`)
    console.log(`  🤖 Agent ID: ${event.agentId}`)
    console.log(`  🕐 Event Timestamp: ${event.timestamp}`)
    
    console.log(`📊 事件数据详情:`)
    if (event.data && typeof event.data === 'object') {
      Object.entries(event.data).forEach(([key, value]) => {
        if (typeof value === 'object') {
          console.log(`  ${key}: ${JSON.stringify(value, null, 2)}`)
        } else {
          console.log(`  ${key}: ${value} (${typeof value})`)
        }
      })
    } else {
      console.log(`  数据: ${JSON.stringify(event.data)}`)
    }
    console.log(`📏 数据大小: ${JSON.stringify(event.data).length} bytes`)
    
    // 验证必要字段
    console.log(`✅ === 字段验证 ===`)
    const requiredFields = ['toolId', 'eventType', 'sessionId']
    const missingFields = requiredFields.filter(field => !event[field as keyof UIInteractionEvent])
    
    if (missingFields.length > 0) {
      console.log(`❌ 缺少必要字段: [${missingFields.join(', ')}]`)
      const errorResponse = {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }
      console.log(`📤 返回错误响应:`, errorResponse)
      return NextResponse.json(errorResponse, { status: 400 })
    }
    
    console.log(`✅ 所有必要字段验证通过`)
    
    // 处理UI交互事件
    console.log(`🔄 ================================================`)
    console.log(`🔄 === PROCESSING UI INTERACTION ===`)
    console.log(`🔄 ================================================`)
    
    const processingStartTime = Date.now()
    console.log(`📡 调用 enhanced system runner 处理事件`)
    await globalEnhancedSystemRunner.handleUIInteraction(event)
    console.log(`✅ enhanced system runner 处理完成`)
    
    console.log(`📡 调用 ui interaction manager 处理事件`)
    await uiInteractionManager.sendInteractionEvent(event)
    console.log(`✅ ui interaction manager 处理完成`)
    
    const processingEndTime = Date.now()
    console.log(`⏱️ 事件处理总耗时: ${processingEndTime - processingStartTime}ms`)
    
    // 检查是否需要继续Agent会话
    console.log(`🔍 === SESSION STATE ANALYSIS ===`)
    const sessionState = globalEnhancedSystemRunner.getSessionState(event.sessionId)
    let continuationResult = null
    
    if (sessionState) {
      console.log(`✅ 找到会话状态`)
      console.log(`  📊 消息数量: ${sessionState.messages.length}`)
      console.log(`  🎯 UI交互数量: ${sessionState.uiInteractions.length}`)
      console.log(`  📋 交互历史数量: ${sessionState.interactionHistory.length}`)
      
      try {
        console.log(`🚀 === 尝试继续会话 ===`)
        const continuationStartTime = Date.now()
        // 尝试继续被中断的会话，传递触发事件
        continuationResult = await globalEnhancedSystemRunner.continueSession(event.sessionId, event)
        const continuationEndTime = Date.now()
        
        if (continuationResult) {
          console.log(`✅ 会话续接成功`)
          console.log(`  ⏱️ 续接耗时: ${continuationEndTime - continuationStartTime}ms`)
          console.log(`  📝 返回消息数: ${continuationResult.messages.length}`)
          console.log(`  🤖 当前Agent: ${continuationResult.currentAgent}`)
          console.log(`  🏁 是否完成: ${continuationResult.completed}`)
          
          if (continuationResult.messages.length > 0) {
            const latestMsg = continuationResult.messages[continuationResult.messages.length - 1]
            console.log(`  📄 最新回复预览: "${latestMsg.content.substring(0, 100)}${latestMsg.content.length > 100 ? '...' : ''}"`)
          }
        } else {
          console.log(`⚠️ 会话续接返回空结果`)
        }
      } catch (error) {
        console.log(`❌ === 会话续接失败 ===`)
        console.log(`  🚨 错误类型: ${error instanceof Error ? error.constructor.name : typeof error}`)
        console.log(`  📄 错误信息: ${error instanceof Error ? error.message : String(error)}`)
        console.log(`  📋 错误堆栈:`, error instanceof Error ? error.stack : 'No stack trace')
      }
    } else {
      console.log(`⚠️ 未找到会话状态: ${event.sessionId}`)
      const availableSessions = Array.from(globalEnhancedSystemRunner['sessionStates']?.keys() || [])
      console.log(`  🔍 可用会话列表: [${availableSessions.join(', ')}]`)
    }
    
    // 构建API响应
    console.log(`📤 ================================================`)
    console.log(`📤 === BUILDING API RESPONSE ===`)
    console.log(`📤 ================================================`)
    
    const responseData = {
      success: true,
      message: 'UI interaction processed successfully',
      sessionContinued: !!continuationResult,
      agentResponse: continuationResult?.messages[continuationResult.messages.length - 1]?.content,
      // 🔥 关键修复：返回完整的消息历史，包括用户UI输入
      messages: continuationResult?.messages || [],
      totalMessages: continuationResult?.messages?.length || 0
    }
    
    console.log(`📋 响应数据分析:`)
    console.log(`  ✅ 成功状态: ${responseData.success}`)
    console.log(`  📝 消息: ${responseData.message}`)
    console.log(`  🔄 会话续接: ${responseData.sessionContinued}`)
    console.log(`  📊 返回消息数量: ${responseData.totalMessages}`)
    console.log(`  📏 Agent响应长度: ${responseData.agentResponse?.length || 0} 字符`)
    
    if (responseData.messages.length > 0) {
      console.log(`  📝 返回消息列表:`)
      responseData.messages.forEach((msg: any, idx: number) => {
        console.log(`    ${idx + 1}. [${msg.role}] "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}" (${msg.id})`)
      })
    }
    
    const totalRequestTime = Date.now() - requestStartTime
    console.log(`⏱️ API请求总耗时: ${totalRequestTime}ms`)
    console.log(`📏 响应数据大小: ${JSON.stringify(responseData).length} bytes`)
    
    console.log(`🎯 ================================================`)
    console.log(`🎯 === UI INTERACTION API REQUEST COMPLETED ===`)
    console.log(`🎯 ================================================`)
    
    return NextResponse.json(responseData)
    
  } catch (error) {
    const totalRequestTime = Date.now() - requestStartTime
    console.log(`❌ ================================================`)
    console.log(`❌ === API REQUEST FAILED ===`)
    console.log(`❌ ================================================`)
    console.log(`⏱️ 请求耗时 (失败): ${totalRequestTime}ms`)
    console.log(`🚨 错误类型: ${error instanceof Error ? error.constructor.name : typeof error}`)
    console.log(`📄 错误信息: ${error instanceof Error ? error.message : String(error)}`)
    console.log(`📋 错误堆栈:`, error instanceof Error ? error.stack : 'No stack trace available')
    
    const errorResponse = {
      success: false,
      error: 'Failed to process UI interaction',
      details: error instanceof Error ? error.message : String(error),
      requestTime: totalRequestTime
    }
    
    console.log(`📤 返回错误响应:`, errorResponse)
    console.log(`❌ === API REQUEST ERROR END ===`)
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// GET: 获取会话的UI交互历史
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId parameter is required'
      }, { status: 400 })
    }
    
    const sessionState = globalEnhancedSystemRunner.getSessionState(sessionId)
    
    if (!sessionState) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      sessionId,
      interactions: sessionState.uiInteractions,
      interactionHistory: sessionState.interactionHistory,
      totalInteractions: sessionState.uiInteractions.length
    })
    
  } catch (error) {
    console.error('Error fetching UI interaction history:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch interaction history'
    }, { status: 500 })
  }
}