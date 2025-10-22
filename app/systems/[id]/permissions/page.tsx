'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Shield, 
  Users, 
  Wrench,
  AlertTriangle,
  Lightbulb
} from 'lucide-react'

interface PermissionData {
  systemId: string
  systemName: string
  permissionReport: Array<{
    agentId: string
    agentName: string
    agentType: string
    authorizedTools: string[]
    unauthorizedTools: string[]
  }>
  configValidation: {
    isValid: boolean
    issues: string[]
    recommendations: string[]
  }
  stats: {
    totalAgents: number
    agentsWithUIAccess: number
    totalSystemUITools: number
    availableUITools: number
    orphanedTools: string[]
  }
  agentsWithUIAccess: Array<{
    id: string
    name: string
    type: string
    toolAccess: string[]
  }>
  systemUITools: Array<{
    id: string
    name: string
    description: string
  }>
}

export default function SystemPermissionsPage() {
  const params = useParams()
  const systemId = params?.id as string
  
  const [permissionData, setPermissionData] = useState<PermissionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (systemId) {
      fetchPermissions()
    }
  }, [systemId])

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/agent-systems/${systemId}/permissions`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch permissions')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setPermissionData(data)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载权限信息中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">加载失败</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <Button onClick={fetchPermissions} className="mt-4">
                重新加载
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!permissionData) {
    return null
  }

  const { 
    systemName, 
    permissionReport, 
    configValidation, 
    stats, 
    agentsWithUIAccess,
    systemUITools 
  } = permissionData

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部导航 */}
        <div className="mb-8">
          <Link 
            href={`/systems/${systemId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回系统详情
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            <Shield className="inline w-8 h-8 mr-2" />
            UI工具权限管理
          </h1>
          <p className="mt-1 text-sm text-gray-600">{systemName}</p>
        </div>

        {/* 配置验证状态 */}
        {!configValidation.isValid && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <div className="font-medium mb-2">发现配置问题：</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {configValidation.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
              {configValidation.recommendations.length > 0 && (
                <div className="mt-3">
                  <div className="font-medium mb-1 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-1" />
                    建议：
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {configValidation.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.totalAgents}</div>
                <p className="text-sm text-gray-500">总Agent数</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.agentsWithUIAccess}</div>
                <p className="text-sm text-gray-500">有权限Agent</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Wrench className="mx-auto h-8 w-8 text-purple-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.availableUITools}</div>
                <p className="text-sm text-gray-500">可用UI工具</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.orphanedTools.length}</div>
                <p className="text-sm text-gray-500">孤立工具</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Agent权限详情 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent权限详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {permissionReport.map((agent, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{agent.agentName}</h4>
                        <Badge variant="outline">{agent.agentType}</Badge>
                      </div>
                      
                      {agent.authorizedTools.length > 0 ? (
                        <div className="mb-2">
                          <p className="text-sm text-gray-600 mb-1">授权工具:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.authorizedTools.map((toolId) => (
                              <Badge key={toolId} className="bg-green-100 text-green-800">
                                {toolId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            无UI工具权限
                          </Badge>
                        </div>
                      )}
                      
                      {agent.unauthorizedTools.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">系统中的其他工具:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.unauthorizedTools.map((toolId) => (
                              <Badge key={toolId} variant="outline" className="text-gray-500">
                                {toolId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 系统UI工具列表 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>系统UI工具</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemUITools.map((tool, index) => {
                    const authorizedAgents = agentsWithUIAccess.filter(agent =>
                      agent.toolAccess.includes(tool.id)
                    )
                    
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{tool.name}</h4>
                          <Badge 
                            className={authorizedAgents.length > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                            }
                          >
                            {authorizedAgents.length > 0 ? '已授权' : '孤立工具'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
                        
                        {authorizedAgents.length > 0 ? (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">授权给:</p>
                            <div className="flex flex-wrap gap-1">
                              {authorizedAgents.map((agent) => (
                                <Badge key={agent.id} variant="outline">
                                  {agent.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-amber-600">
                            ⚠️ 没有Agent有权限访问此工具
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 孤立工具警告 */}
            {stats.orphanedTools.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="font-medium mb-2">发现孤立的UI工具：</div>
                  <div className="flex flex-wrap gap-1">
                    {stats.orphanedTools.map((toolId) => (
                      <Badge key={toolId} className="bg-red-100 text-red-800">
                        {toolId}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm mt-2">
                    这些工具在系统中定义但没有Agent有权限访问，建议移除或分配权限。
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}