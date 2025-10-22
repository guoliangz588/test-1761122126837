'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, TestTube } from 'lucide-react'

interface TestResult {
  testName: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  data?: any
}

export default function TestUIInteractionPage() {
  const [sessionId, setSessionId] = useState(`test_session_${Date.now()}`)
  const [agentId, setAgentId] = useState('test-health-agent')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [agentResponse, setAgentResponse] = useState<string>('')

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, data?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.testName === testName)
      if (existing) {
        existing.status = status
        existing.message = message
        existing.data = data
        return [...prev]
      } else {
        return [...prev, { testName, status, message, data }]
      }
    })
  }

  const handleUIInteraction = async (event: any) => {
    console.log('🎯 UI Interaction Event Received:', event)
    
    try {
      // 发送到服务器进行处理
      const response = await fetch('/api/ui-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })
      
      const result = await response.json()
      console.log('📡 Server Response:', result)
      
      if (result.success) {
        updateTestResult('UI事件传递', 'success', '事件已成功发送到服务器')
        
        if (result.sessionContinued) {
          updateTestResult('Agent会话继续', 'success', 'Agent已基于UI交互继续会话')
          if (result.agentResponse) {
            setAgentResponse(result.agentResponse)
          }
        } else {
          updateTestResult('Agent会话继续', 'error', '会话未能继续')
        }
      } else {
        updateTestResult('UI事件传递', 'error', result.error || '服务器处理失败')
      }
      
      return result
    } catch (error) {
      console.error('❌ UI Interaction Error:', error)
      updateTestResult('UI事件传递', 'error', `网络错误: ${error}`)
      return null
    }
  }

  const runAutomatedTests = async () => {
    setIsRunningTests(true)
    setTestResults([])
    
    // 测试1: 会话连接测试
    updateTestResult('会话连接', 'running')
    try {
      const response = await fetch(`/api/ui-interaction?sessionId=${sessionId}`)
      if (response.ok) {
        updateTestResult('会话连接', 'success', '会话连接正常')
      } else {
        updateTestResult('会话连接', 'error', '会话连接失败')
      }
    } catch (error) {
      updateTestResult('会话连接', 'error', `连接错误: ${error}`)
    }

    // 测试2: 模拟UI交互事件
    updateTestResult('UI交互模拟', 'running')
    const mockEvent = {
      toolId: 'health-goal-collection',
      eventType: 'submit',
      data: {
        healthGoals: '测试目标: 改善睡眠、增强体质、均衡饮食',
        action: 'goals-submitted',
        testMode: true
      },
      timestamp: new Date().toISOString(),
      sessionId,
      agentId
    }

    await handleUIInteraction(mockEvent)
    
    setIsRunningTests(false)
  }

  const generateNewSession = () => {
    const newSessionId = `test_session_${Date.now()}`
    setSessionId(newSessionId)
    setAgentResponse('')
    setTestResults([])
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default: return <div className="w-4 h-4 bg-gray-300 rounded-full" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <TestTube className="inline w-8 h-8 mr-2" />
            UI交互功能测试
          </h1>
          <p className="text-gray-600">
            测试health-goal-collection组件与Agent系统的双向交互功能
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 测试控制面板 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>测试配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Session ID</label>
                  <div className="flex gap-2">
                    <Input
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={generateNewSession} variant="outline">
                      生成新会话
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Agent ID</label>
                  <Input
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={runAutomatedTests}
                    disabled={isRunningTests}
                    className="flex-1"
                  >
                    {isRunningTests ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        运行测试中...
                      </>
                    ) : (
                      '运行自动化测试'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 测试结果 */}
            <Card>
              <CardHeader>
                <CardTitle>测试结果</CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">暂无测试结果</p>
                ) : (
                  <div className="space-y-3">
                    {testResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <span className="font-medium">{result.testName}</span>
                        </div>
                        {result.message && (
                          <span className="text-sm text-gray-600">{result.message}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent响应 */}
            {agentResponse && (
              <Card>
                <CardHeader>
                  <CardTitle>Agent响应</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="whitespace-pre-wrap">
                      {agentResponse}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>

          {/* UI组件测试区域 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>交互式测试</CardTitle>
              </CardHeader>
            </Card>

            {/* 实时日志 */}
            <Card>
              <CardHeader>
                <CardTitle>实时日志</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded text-xs font-mono h-64 overflow-y-auto">
                  <div>🚀 UI交互测试系统已启动</div>
                  <div>📡 Session ID: {sessionId}</div>
                  <div>🤖 Agent ID: {agentId}</div>
                  <div>⏰ 等待用户交互...</div>
                  {testResults.map((result, index) => (
                    <div key={index} className="mt-1">
                      [{new Date().toLocaleTimeString()}] {result.testName}: {result.status}
                      {result.message && ` - ${result.message}`}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>测试说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">🎯 测试目标</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 验证UI组件数据传递</li>
                  <li>• 测试Agent会话继续功能</li>
                  <li>• 检查双向交互完整性</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">✅ 成功标志</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 组件显示"Connected"状态</li>
                  <li>• 提交后收到Agent响应</li>
                  <li>• 测试结果全部显示绿色</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}