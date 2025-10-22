import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { AgentSystemSpec } from '@/lib/types/agent-system'
import { 
  generateUIToolPermissionReport, 
  validateUIToolConfiguration,
  getAgentsWithUIToolAccess 
} from '@/lib/ui-tool-access-control'

const SYSTEMS_DIR = path.join(process.cwd(), 'data', 'agent-systems')

// GET: 获取系统的UI工具权限报告
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: systemId } = await params
    const systemFile = path.join(SYSTEMS_DIR, `${systemId}.json`)
    
    try {
      const systemContent = await fs.readFile(systemFile, 'utf-8')
      const system: AgentSystemSpec = JSON.parse(systemContent)
      
      // 获取所有可用的UI工具
      const uiToolsResponse = await fetch('http://localhost:3000/api/ui-tools')
      if (!uiToolsResponse.ok) {
        throw new Error('Failed to fetch UI tools')
      }
      
      const uiToolsData = await uiToolsResponse.json()
      const allUITools: Array<{ id: string; name: string; description: string }>
        = uiToolsData.tools || []
      
      // 过滤出系统关联的UI工具
      const systemUITools = allUITools.filter((tool) => 
        system.uiTools?.includes(tool.id)
      )
      
      // 生成权限报告
      const permissionReport = generateUIToolPermissionReport(system, systemUITools)
      
      // 验证配置
      const configValidation = validateUIToolConfiguration(system, systemUITools)
      
      // 获取有权限的Agent
      const agentsWithAccess = getAgentsWithUIToolAccess(system)
      
      // 统计信息
      const stats = {
        totalAgents: system.agents.length,
        agentsWithUIAccess: agentsWithAccess.length,
        totalSystemUITools: system.uiTools?.length || 0,
        availableUITools: systemUITools.length,
        orphanedTools: (system.uiTools || []).filter(toolId => 
          !agentsWithAccess.some(agent => agent.toolAccess?.includes(toolId))
        )
      }
      
      return NextResponse.json({
        success: true,
        systemId: system.id,
        systemName: system.name,
        permissionReport,
        configValidation,
        stats,
        agentsWithUIAccess: agentsWithAccess.map(agent => ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          toolAccess: agent.toolAccess || []
        })),
        systemUITools: systemUITools.map(tool => ({
          id: tool.id,
          name: tool.name,
          description: tool.description
        }))
      })
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'System not found'
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Error fetching system permissions:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch system permissions'
    }, { status: 500 })
  }
}
