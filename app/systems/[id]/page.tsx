"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageSquare, Play, Trash2, Settings, Users, Workflow, Zap, Clock, ExternalLink, Shield } from 'lucide-react';
import { AgentSystemSpec } from '@/lib/types/agent-system';

export default function SystemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const systemId = params?.id as string;
  
  const [system, setSystem] = useState<AgentSystemSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    fetchSystem();
  }, [systemId]);

  const fetchSystem = async () => {
    try {
      const response = await fetch(`/api/agent-systems/${systemId}`);
      const data = await response.json();
      if (data.success) {
        setSystem(data.system);
      }
    } catch (error) {
      console.error('Error fetching system:', error);
    } finally {
      setLoading(false);
    }
  };

  const deploySystem = async () => {
    setDeploying(true);
    try {
      const response = await fetch(`/api/agent-systems/${systemId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoCreateUI: true }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchSystem();
      } else {
        alert(`部署失败: ${data.error}`);
      }
    } catch (error) {
      console.error('Deploy error:', error);
      alert('部署失败');
    } finally {
      setDeploying(false);
    }
  };

  const deleteSystem = async () => {
    if (!confirm('确定要删除这个系统吗？此操作无法撤销。')) return;

    try {
      const response = await fetch(`/api/agent-systems/${systemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/systems');
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">活跃</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">待部署</Badge>;
      case 'deploying':
        return <Badge className="bg-blue-100 text-blue-800">部署中</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">错误</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading system details...</p>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/systems">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{system.name}</h1>
              {getStatusBadge(system.status)}
            </div>
            <p className="text-muted-foreground">{system.description}</p>
          </div>
          <div className="flex gap-2">
            {system.status === 'active' ? (
              <Link href={`/systems/${system.id}/chat`}>
                <Button>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  开始聊天
                </Button>
              </Link>
            ) : (
              <Button onClick={deploySystem} disabled={deploying}>
                <Play className="mr-2 h-4 w-4" />
                {deploying ? '部署中...' : '部署系统'}
              </Button>
            )}
            <Link href={`/systems/${system.id}/permissions`}>
              <Button variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                权限管理
              </Button>
            </Link>
            <Button variant="outline" onClick={deleteSystem}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="agents">智能体</TabsTrigger>
            <TabsTrigger value="ui-tools">UI工具</TabsTrigger>
            <TabsTrigger value="metadata">系统信息</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    智能体总览
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">总数:</span> {system.agents.length}
                      </div>
                      <div>
                        <span className="font-medium">连接:</span> {system.connections.length}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {system.agents.map((agent) => (
                        <div key={agent.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Badge variant="outline">{agent.type}</Badge>
                          <span className="font-medium">{agent.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    UI工具状态
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">已创建:</span> {system.uiTools.length}
                      </div>
                      <div>
                        <span className="font-medium">待创建:</span> {system.pendingUIRequirements?.length || 0}
                      </div>
                    </div>
                    {system.uiTools.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">已注册的UI工具:</p>
                        {system.uiTools.map((tool) => (
                          <div key={tool} className="flex items-center gap-2 p-2 bg-muted rounded">
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                            <span className="text-sm">{tool}</span>
                            <ExternalLink className="h-3 w-3 ml-auto" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agents">
            <div className="grid gap-4">
              {system.agents.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {agent.name}
                          <Badge variant="outline">{agent.type}</Badge>
                        </CardTitle>
                        <CardDescription>{agent.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">能力</h4>
                        <div className="flex flex-wrap gap-2">
                          {agent.capabilities.map((capability, index) => (
                            <Badge key={index} variant="secondary">{capability}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      {agent.toolAccess && agent.toolAccess.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">可用工具</h4>
                          <div className="flex flex-wrap gap-2">
                            {agent.toolAccess.map((tool, index) => (
                              <Badge key={index} className="bg-blue-100 text-blue-800">{tool}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium mb-2">系统提示</h4>
                        <div className="bg-muted p-3 rounded text-sm">
                          {agent.systemPrompt}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ui-tools">
            <div className="space-y-6">
              {system.uiTools.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>已创建的UI工具</CardTitle>
                    <CardDescription>这些UI工具已经创建并可以使用</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {system.uiTools.map((tool) => (
                        <div key={tool} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                            <span className="font-medium">{tool}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            UI工具可通过聊天界面调用
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {system.pendingUIRequirements && system.pendingUIRequirements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>待创建的UI工具</CardTitle>
                    <CardDescription>部署系统时将自动创建这些UI工具</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {system.pendingUIRequirements.map((req, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                            <span className="font-medium">{req.requirement.toolName}</span>
                          </div>
                          <p className="text-sm mb-2">{req.requirement.description}</p>
                          <p className="text-xs text-muted-foreground">
                            用途: {req.requirement.purpose} | 优先级: {req.requirement.priority}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="metadata">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  系统信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="font-medium">系统ID:</span>
                      <p className="text-sm text-muted-foreground font-mono">{system.id}</p>
                    </div>
                    <div>
                      <span className="font-medium">创建时间:</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(system.metadata.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {system.metadata.deployedAt && (
                      <div>
                        <span className="font-medium">部署时间:</span>
                        <p className="text-sm text-muted-foreground">
                          {new Date(system.metadata.deployedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {system.metadata.lastActive && (
                      <div>
                        <span className="font-medium">最后活跃:</span>
                        <p className="text-sm text-muted-foreground">
                          {new Date(system.metadata.lastActive).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="font-medium">API端点:</span>
                      <p className="text-sm text-muted-foreground font-mono">
                        /api/agent-chat/{system.id}
                      </p>
                    </div>
                    {system.status === 'active' && (
                      <div>
                        <span className="font-medium">聊天界面:</span>
                        <Link href={`/systems/${system.id}/chat`}>
                          <Button variant="outline" size="sm" className="ml-2">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            打开聊天
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}