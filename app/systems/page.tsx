"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Settings, Trash2, Play, Clock } from 'lucide-react';
import { AgentSystemSpec } from '@/lib/types/agent-system';

export default function AgentSystemsPage() {
  const [systems, setSystems] = useState<AgentSystemSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    try {
      const response = await fetch('/api/agent-systems');
      const data = await response.json();
      if (data.success) {
        setSystems(data.systems);
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
    } finally {
      setLoading(false);
    }
  };

  const deploySystem = async (systemId: string) => {
    setDeploying(systemId);
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
        await fetchSystems(); // 刷新列表
      } else {
        alert(`部署失败: ${data.error}`);
      }
    } catch (error) {
      console.error('Deploy error:', error);
      alert('部署失败');
    } finally {
      setDeploying(null);
    }
  };

  const deleteSystem = async (systemId: string, systemName: string) => {
    if (!confirm(`确定要删除系统 "${systemName}" 吗？\n\n这个操作无法撤销，将删除系统文件和配置。`)) return;

    console.log(`🗑️ === SYSTEM DELETE REQUEST ===`);
    console.log(`  - System ID: ${systemId}`);
    console.log(`  - System Name: ${systemName}`);

    try {
      console.log(`🌐 Sending DELETE request to: /api/agent-systems/${systemId}`);
      
      const response = await fetch(`/api/agent-systems/${systemId}`, {
        method: 'DELETE',
      });

      console.log(`📡 DELETE response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ DELETE response:`, result);
        
        alert(`系统 "${systemName}" 删除成功！`);
        await fetchSystems(); // 刷新列表
        console.log(`🔄 Systems list refreshed`);
      } else {
        const errorData = await response.json();
        console.error(`❌ DELETE failed:`, errorData);
        alert(`删除失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert(`删除失败: ${error instanceof Error ? error.message : '网络错误'}`);
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
          <p className="text-muted-foreground">Loading agent systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Agent Systems</h1>
            <p className="text-muted-foreground">
              Manage your multi-agent systems
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {systems.length} system{systems.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <Link href="/systems/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create System
            </Button>
          </Link>
        </div>

        {systems.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-2">No agent systems yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first multi-agent system to get started.
              </p>
              <Link href="/systems/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First System
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systems.map((system) => (
              <Card key={system.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{system.name}</CardTitle>
                      <CardDescription className="mt-1">{system.description}</CardDescription>
                    </div>
                    {getStatusBadge(system.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Agents:</span> {system.agents.length}
                      </div>
                      <div>
                        <span className="font-medium">Connections:</span> {system.connections.length}
                      </div>
                      <div>
                        <span className="font-medium">UI Tools:</span> {system.uiTools.length}
                      </div>
                      <div>
                        <span className="font-medium">Pending UI:</span> {system.pendingUIRequirements?.length || 0}
                      </div>
                    </div>

                    {system.metadata.deployedAt && (
                      <div className="text-xs text-muted-foreground">
                        <Clock className="inline w-3 h-3 mr-1" />
                        Deployed: {new Date(system.metadata.deployedAt).toLocaleDateString()}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {system.status === 'active' ? (
                        <Link href={`/systems/${system.id}/chat`}>
                          <Button size="sm" className="flex-1">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            Chat
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => deploySystem(system.id)}
                          disabled={deploying === system.id}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          {deploying === system.id ? 'Deploying...' : 'Deploy'}
                        </Button>
                      )}

                      <Link href={`/systems/${system.id}`}>
                        <Button variant="outline" size="sm">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </Link>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteSystem(system.id, system.name)}
                        className="text-red-600 hover:text-red-700"
                        title={`删除系统: ${system.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-3">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">1. Create System</h3>
              <p className="text-muted-foreground">
                Describe your needs and let AI design a multi-agent system with the required UI components.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">2. Deploy & Test</h3>
              <p className="text-muted-foreground">
                Deploy the system to automatically create UI tools and configure agent routing.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">3. Chat & Use</h3>
              <p className="text-muted-foreground">
                Interact with your deployed system through a dedicated chat interface with integrated UI tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}