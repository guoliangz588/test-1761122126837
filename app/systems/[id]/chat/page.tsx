"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Bot, User, Loader2, Settings } from 'lucide-react';
import { AgentSystemSpec } from '@/lib/types/agent-system';
import UIToolRenderer from '@/components/ui-tool-renderer';
import { getAgentsWithUIToolAccess } from '@/lib/ui-tool-access-control';

export default function SystemChatPage() {
  const params = useParams();
  const systemId = params?.id as string;
  
  const [system, setSystem] = useState<AgentSystemSpec | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 健康调查系统：使用固定的mock session ID以支持会话恢复
  const [sessionId] = useState(`${systemId}_mock_session`);
  
  // 🔥 会话恢复：历史消息状态管理
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // 🔥 会话恢复：加载历史消息函数
  const loadChatHistory = async () => {
    try {
      console.log('🔍 Loading chat history for session:', sessionId);
      
      const response = await fetch('/api/mcp-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'get_session',
          data: {
            session_id: systemId, // 使用systemId作为session标识
            include_messages: true
          }
        })
      });
      
      const result = await response.json();
      console.log('📋 MCP get_session result:', result);
      
      if (result.success && result.data && result.data.chat_messages) {
        const messages = result.data.chat_messages
          .sort((a: any, b: any) => a.seq - b.seq) // 按序列号排序
          .map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content || '',
            createdAt: new Date(msg.created_at)
          }))
          .filter((msg: any) => msg.content && msg.content !== 'AUTO_START'); // 过滤掉AUTO_START消息
        
        console.log('💬 Converted messages for useChat:', messages);
        setInitialMessages(messages);
        return messages;
      }
      
      console.log('📭 No existing chat history found');
      return [];
    } catch (error) {
      console.error('❌ Failed to load chat history:', error);
      return [];
    } finally {
      setHistoryLoaded(true);
    }
  };
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: `/api/agent-chat/${systemId}`,
    initialMessages,
    onResponse: (response) => {
      console.log('🔄 Chat response received:', response.status, response.headers.get('content-type'));
      // 从响应头获取sessionId
      const responseSessionId = response.headers.get('x-session-id');
      if (responseSessionId) {
        console.log('📝 Session ID from response:', responseSessionId);
      }
    },
    onFinish: (message) => {
      console.log('✅ Chat message finished:', message);
    },
    onError: (error) => {
      console.error('❌ Chat error:', error);
    }
  });
  
  // UI交互事件处理器
  const handleUIInteraction = async (toolId: string, event: any) => {
    console.log('🎯 === CHAT PAGE UI INTERACTION DEBUG START ===');
    console.log('📦 UI Interaction details:', { 
      toolId, 
      event, 
      sessionId,
      eventType: event.eventType,
      agentId: event.agentId 
    });
    console.log('📄 Event data:', JSON.stringify(event, null, 2));
    
    try {
      // 🔥 关键修复：在表单提交时自动创建用户消息
      if (event.eventType === 'submit' && event.data) {
        console.log('📝 UI表单提交事件 - 自动创建用户消息');
        
        // 根据不同的工具生成适当的用户消息
        let userMessage = '';
        if (toolId === 'age-input-form' && event.data.age) {
          userMessage = `${event.data.age}`;
        } else if (toolId === 'weight-input-form' && event.data.weight_input) {
          userMessage = `${event.data.weight_input} ${event.data.weight_unit === 'kg' ? '公斤' : '磅'}`;
        } else if (toolId === 'height-input-form' && event.data.height) {
          userMessage = `${event.data.height}`;
        } else {
          // 通用格式
          userMessage = JSON.stringify(event.data);
        }
        
        console.log('📝 生成的用户消息:', userMessage);
        
        // 使用useChat的append方法添加用户消息
        if (userMessage.trim()) {
          await append({
            role: 'user',
            content: userMessage
          });
          console.log('✅ 用户消息已添加到聊天历史');
        }
      }
      
      console.log('🌐 Sending UI interaction to API...');
      const response = await fetch('/api/ui-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          eventType: event.eventType || 'custom',
          data: event,
          timestamp: new Date().toISOString(),
          sessionId,
          agentId: event.agentId || 'unknown-agent'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ UI Interaction result:', result);
      
      // 如果Agent有响应，可以在这里处理
      if (result.agentResponse) {
        console.log('🤖 Agent responded to UI interaction:', result.agentResponse);
      }
      
      if (result.sessionContinued) {
        console.log('🔄 Session was successfully continued by agent');
      } else {
        console.log('⚠️ Session was not continued - no agent response');
      }
      
      console.log('🎯 === CHAT PAGE UI INTERACTION DEBUG END ===');
      
    } catch (error) {
      console.error('❌ Failed to send UI interaction:', error);
      console.log('🎯 === CHAT PAGE UI INTERACTION DEBUG END (ERROR) ===');
    }
  };

  // 添加messages变化的监听
  useEffect(() => {
    console.log('💬 Messages updated:', messages.length, messages);
  }, [messages]);

  // 🔥 健康调查系统：自动开始对话功能
  const [autoStartTriggered, setAutoStartTriggered] = useState(false);
  
  useEffect(() => {
    // 只有在系统加载完成、历史记录已加载、且真正没有消息时，才自动开始对话
    if (system && historyLoaded && !autoStartTriggered && !isLoading && messages.length === 0) {
      setAutoStartTriggered(true);
      console.log('🚀 No existing chat history found. Auto-starting health survey conversation...');
      
      // 发送AUTO_START消息来触发Survey Assistant主动开始对话
      append({
        role: 'user',
        content: 'AUTO_START'
      });
    } else if (historyLoaded && messages.length > 0 && !autoStartTriggered) {
      console.log('📋 Found existing chat history with', messages.length, 'messages. Triggering session resume...');
      setAutoStartTriggered(true);
      
      // 发送RESUME_SESSION消息让AI根据当前进度继续对话
      append({
        role: 'user',
        content: 'RESUME_SESSION'
      });
    }
  }, [system, historyLoaded, autoStartTriggered, isLoading, messages.length, append]);

  useEffect(() => {
    initializeChatPage();
  }, [systemId]);

  const initializeChatPage = async () => {
    try {
      // 1. 加载系统配置
      console.log('🚀 Initializing chat page...');
      const response = await fetch(`/api/agent-systems/${systemId}`);
      const data = await response.json();
      if (data.success) {
        setSystem(data.system);
        console.log('✅ System loaded:', data.system.name);
      }

      // 2. 加载历史消息
      await loadChatHistory();
      console.log('✅ Chat initialization completed');
    } catch (error) {
      console.error('Error initializing chat page:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat interface...</p>
        </div>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">系统未找到</h2>
          <p className="text-muted-foreground mb-4">请检查系统ID是否正确</p>
          <Link href="/systems">
            <Button>返回系统列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (system.status !== 'active') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">系统未激活</h2>
          <p className="text-muted-foreground mb-4">请先部署系统后再使用聊天功能</p>
          <Link href={`/systems/${systemId}`}>
            <Button>返回系统详情</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto p-4">
          <div className="flex items-center gap-4">
            <Link href={`/systems/${systemId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">{system.name}</h1>
                <Badge className="bg-green-100 text-green-800">活跃</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{system.description}</p>
            </div>
            <Link href={`/systems/${systemId}`}>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto p-4 max-w-6xl">
        <div className="flex gap-6 h-full max-h-[calc(100vh-120px)]">
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">聊天界面</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">开始对话</h3>
                      <p className="text-muted-foreground text-sm">
                        向 {system.name} 提问或描述你需要的帮助
                      </p>
                    </div>
                  )}
                  
                  {messages
                    .filter((message) => 
                      // 过滤掉系统控制消息
                      message.content !== 'AUTO_START' && 
                      message.content !== 'RESUME_SESSION'
                    )
                    .map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <UIToolRenderer
                              messageContent={message.content}
                              sessionId={sessionId}
                              agentId={(message as any).agentType || 'unknown-agent'}
                              onInteraction={handleUIInteraction}
                            />
                          ) : (
                            <div className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </div>
                          )}
                          {message.toolInvocations && message.toolInvocations.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.toolInvocations.map((tool, index) => (
                                <div key={index} className="p-2 bg-background/50 rounded border">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    使用了UI工具: {tool.toolName}
                                  </div>
                                  <div className="text-xs">
                                    {'result' in tool && tool.result && typeof tool.result === 'object' && (
                                      <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(tool.result, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">正在思考...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border-t p-4">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      placeholder="输入你的消息..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-80 space-y-4">
            <Card className="flex-shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">系统信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium">智能体数量:</span> {system.agents.length}
                </div>
                <div className="text-sm">
                  {(() => {
                    const agentsWithAccess = getAgentsWithUIToolAccess(system)
                    const authorizedTools = Array.from(new Set(
                      agentsWithAccess.flatMap(agent => agent.toolAccess || [])
                    )).filter(toolId => system.uiTools?.includes(toolId))
                    const totalTools = system.uiTools?.length || 0
                    
                    return (
                      <>
                        <span className="font-medium">UI工具:</span> {authorizedTools.length}
                        {totalTools > authorizedTools.length && (
                          <span className="text-red-500 text-xs ml-1">
                            (共{totalTools}个，{totalTools - authorizedTools.length}个无权限)
                          </span>
                        )}
                      </>
                    )
                  })()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">连接数:</span> {system.connections.length}
                </div>
              </CardContent>
            </Card>

            <Card className="h-64 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-base">可用智能体</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-2 pr-2">
                  {system.agents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                      <Badge variant="outline" className="text-xs flex-shrink-0">{agent.type}</Badge>
                      <span className="flex-1 truncate">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {(() => {
              // 获取有UI工具权限的Agent
              const agentsWithAccess = getAgentsWithUIToolAccess(system)
              
              // 获取所有被授权的UI工具（去重）
              const authorizedTools = Array.from(new Set(
                agentsWithAccess.flatMap(agent => agent.toolAccess || [])
              )).filter(toolId => system.uiTools?.includes(toolId))
              
              // 获取孤立工具（在系统中定义但没有Agent有权限）
              const orphanedTools = (system.uiTools || []).filter(toolId => 
                !authorizedTools.includes(toolId)
              )
              
              return authorizedTools.length > 0 || orphanedTools.length > 0 ? (
                <Card className="h-64 flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle className="text-base">UI工具</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto">
                    <div className="space-y-2 pr-2">
                      {/* 显示有权限的工具 */}
                      {authorizedTools.map((tool) => {
                        const authorizedAgents = agentsWithAccess.filter(agent =>
                          agent.toolAccess?.includes(tool)
                        )
                        
                        return (
                          <div key={tool} className="p-2 bg-muted rounded text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-green-100 text-green-800 text-xs flex-shrink-0">可用</Badge>
                              <span className="flex-1 truncate font-medium">{tool}</span>
                            </div>
                            <div className="text-xs text-gray-500 ml-6">
                              授权给: {authorizedAgents.map(a => a.name).join(', ')}
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* 显示孤立工具（警告） */}
                      {orphanedTools.map((tool) => (
                        <div key={tool} className="p-2 bg-red-50 rounded text-sm border border-red-200">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-100 text-red-800 text-xs flex-shrink-0">无权限</Badge>
                            <span className="flex-1 truncate">{tool}</span>
                          </div>
                          <div className="text-xs text-red-600 ml-6">
                            没有Agent有权限访问
                          </div>
                        </div>
                      ))}
                      
                      {authorizedTools.length === 0 && orphanedTools.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">
                          系统中没有定义UI工具
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}