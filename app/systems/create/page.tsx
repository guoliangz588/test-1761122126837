"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateSystemPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    requirements: ''
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.requirements) {
      alert('请填写所有必填字段');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/agent-systems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: `名称：${formData.name}
描述：${formData.description}

具体需求：
${formData.requirements}`
        }),
      });

      const data = await response.json();
      if (data.success) {
        router.push(`/systems/${data.system.id}`);
      } else {
        alert(`创建失败: ${data.error}`);
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/systems">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">创建新的Agent系统</h1>
            <p className="text-muted-foreground mt-1">
              描述你的需求，AI将为你设计一个完整的多智能体系统
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>系统信息</CardTitle>
            <CardDescription>
              提供系统的基本信息和详细需求，AI将自动设计agent架构和UI组件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">系统名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：客户服务助手、内容管理系统"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">系统描述 *</Label>
                <Textarea
                  id="description"
                  placeholder="简要描述这个系统的用途和目标用户"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">具体需求 *</Label>
                <Textarea
                  id="requirements"
                  placeholder={`详细描述你的需求，例如：

• 需要处理客户咨询和投诉
• 自动分类问题的严重程度
• 提供实时聊天界面
• 生成客服报告
• 支持多语言
• 需要知识库搜索功能

越详细越好，AI会根据这些需求设计相应的智能体和UI组件。`}
                  value={formData.requirements}
                  onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                  rows={10}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI正在设计系统...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      创建系统
                    </>
                  )}
                </Button>
                <Link href="/systems">
                  <Button variant="outline" disabled={creating}>
                    取消
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold mb-3">AI系统设计流程</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">1. 需求分析</h3>
              <p className="text-muted-foreground">
                AI分析你的需求，识别所需的功能模块和用户交互方式
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">2. Agent设计</h3>
              <p className="text-muted-foreground">
                自动设计协调器、工具代理、决策代理等不同类型的智能体
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">3. UI规划</h3>
              <p className="text-muted-foreground">
                为每个功能模块规划相应的UI组件和交互界面
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">4. 系统整合</h3>
              <p className="text-muted-foreground">
                配置智能体间的通信路由和数据流，生成完整的系统架构
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}