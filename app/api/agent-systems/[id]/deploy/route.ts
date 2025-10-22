import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { AgentSystemSpec, DeploySystemResponse, AgentSystemDeployment } from '@/lib/types/agent-system'
import { globalSystemRunner } from '@/lib/agents/runtime-engine'

const SYSTEMS_DIR = path.join(process.cwd(), 'data', 'agent-systems')

// 创建UI组件的函数（基于ui-creator的逻辑）
async function createUIComponent(requirement: any): Promise<boolean> {
  try {
    const uiCreationPrompt = `创建一个${requirement.requirement.toolName}组件。

需求描述：${requirement.requirement.description}
用途：${requirement.requirement.purpose}
所属Agent：${requirement.agentName}

请生成一个功能完整、界面美观的React组件。`

    // 这里简化UI创建过程，在实际部署中会调用UI Creator的生成逻辑
    const mockUICode = `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ${requirement.requirement.toolName.split('-').map((word: string) => 
  word.charAt(0).toUpperCase() + word.slice(1)
).join('')}() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>${requirement.requirement.description}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          ${requirement.requirement.purpose}
        </p>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">
            This UI component was automatically generated for ${requirement.agentName}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}`

    // 调用UI注册API
    const response = await fetch('http://localhost:4000/api/ui-register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: requirement.requirement.toolName,
        description: requirement.requirement.description,
        code: mockUICode,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Failed to create UI component:', error)
    return false
  }
}

// POST: 部署Agent系统
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeploySystemResponse>> {
  try {
    const { id: systemId } = await params
    const systemFile = path.join(SYSTEMS_DIR, `${systemId}.json`)
    const { autoCreateUI = true } = await request.json()
    
    let system: AgentSystemSpec
    
    try {
      const systemContent = await fs.readFile(systemFile, 'utf-8')
      system = JSON.parse(systemContent)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Agent system not found'
      }, { status: 404 })
    }
    
    console.log(`🚀 Deploying agent system: ${system.name}`)
    
    const deploymentLogs: string[] = []
    let toolsCreated = 0
    
    deploymentLogs.push(`Starting deployment of ${system.name}`)
    deploymentLogs.push(`Found ${system.agents.length} agents`)
    deploymentLogs.push(`Found ${system.pendingUIRequirements?.length || 0} UI requirements`)
    
    // 更新系统状态为部署中
    system.status = 'deploying'
    await fs.writeFile(systemFile, JSON.stringify(system, null, 2), 'utf-8')
    
    try {
      // 自动创建UI组件
      if (autoCreateUI && system.pendingUIRequirements) {
        deploymentLogs.push('Creating UI components...')
        
        for (const requirement of system.pendingUIRequirements) {
          deploymentLogs.push(`Creating UI: ${requirement.requirement.toolName}`)
          
          const success = await createUIComponent(requirement)
          if (success) {
            toolsCreated++
            deploymentLogs.push(`✅ Created: ${requirement.requirement.toolName}`)
            
            // 更新对应agent的toolAccess
            const agentIndex = system.agents.findIndex(a => a.id === requirement.agentId)
            if (agentIndex >= 0) {
              if (!system.agents[agentIndex].toolAccess) {
                system.agents[agentIndex].toolAccess = []
              }
              system.agents[agentIndex].toolAccess.push(requirement.requirement.toolName)
            }
            
            // 添加到系统的uiTools列表
            if (!system.uiTools.includes(requirement.requirement.toolName)) {
              system.uiTools.push(requirement.requirement.toolName)
            }
          } else {
            deploymentLogs.push(`❌ Failed to create: ${requirement.requirement.toolName}`)
          }
        }
        
        // 清空pending requirements
        system.pendingUIRequirements = []
      }
      
      // 加载系统到运行时引擎
      deploymentLogs.push('Loading system to runtime engine...')
      await globalSystemRunner.loadSystem(system)
      deploymentLogs.push('✅ System loaded to runtime engine')
      
      // 更新系统状态为激活
      system.status = 'active'
      system.metadata.deployedAt = new Date().toISOString()
      system.metadata.lastActive = new Date().toISOString()
      
      await fs.writeFile(systemFile, JSON.stringify(system, null, 2), 'utf-8')
      
      deploymentLogs.push('✅ Deployment completed successfully')
      
      const deployment: AgentSystemDeployment = {
        systemId: system.id,
        endpoint: `/api/agent-chat/${system.id}`,
        toolsCreated,
        agentsConfigured: system.agents.length,
        deployedAt: new Date().toISOString(),
        status: 'success',
        logs: deploymentLogs
      }
      
      return NextResponse.json({
        success: true,
        deployment
      })
      
    } catch (deployError) {
      console.error('Deployment error:', deployError)
      const errorMessage = deployError instanceof Error ? deployError.message : String(deployError)
      deploymentLogs.push(`❌ Deployment failed: ${errorMessage}`)
      
      // 更新系统状态为错误
      system.status = 'error'
      system.error = errorMessage
      await fs.writeFile(systemFile, JSON.stringify(system, null, 2), 'utf-8')
      
      const deployment: AgentSystemDeployment = {
        systemId: system.id,
        endpoint: `/api/agent-chat/${system.id}`,
        toolsCreated,
        agentsConfigured: 0,
        deployedAt: new Date().toISOString(),
        status: 'failed',
        logs: deploymentLogs
      }
      
      return NextResponse.json({
        success: false,
        deployment,
        error: 'Deployment failed'
      })
    }
    
  } catch (error) {
    console.error('Error deploying agent system:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to deploy agent system'
    }, { status: 500 })
  }
}