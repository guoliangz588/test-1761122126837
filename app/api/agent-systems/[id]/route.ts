import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { AgentSystemSpec } from '@/lib/types/agent-system'

const SYSTEMS_DIR = path.join(process.cwd(), 'data', 'agent-systems')

// GET: 获取特定Agent系统详情
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
      
      return NextResponse.json({
        success: true,
        system
      })
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Agent system not found'
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Error fetching agent system:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch agent system'
    }, { status: 500 })
  }
}

// PUT: 更新Agent系统状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: systemId } = await params
    const systemFile = path.join(SYSTEMS_DIR, `${systemId}.json`)
    const updates = await request.json()
    
    try {
      const systemContent = await fs.readFile(systemFile, 'utf-8')
      const system: AgentSystemSpec = JSON.parse(systemContent)
      
      // 更新系统状态
      const updatedSystem = {
        ...system,
        ...updates,
        metadata: {
          ...system.metadata,
          ...updates.metadata
        }
      }
      
      await fs.writeFile(systemFile, JSON.stringify(updatedSystem, null, 2), 'utf-8')
      
      // 更新索引文件
      const indexFile = path.join(SYSTEMS_DIR, 'index.json')
      try {
        const indexContent = await fs.readFile(indexFile, 'utf-8')
        const systems: AgentSystemSpec[] = JSON.parse(indexContent)
        const systemIndex = systems.findIndex(s => s.id === systemId)
        
        if (systemIndex >= 0) {
          systems[systemIndex] = updatedSystem
          await fs.writeFile(indexFile, JSON.stringify(systems, null, 2), 'utf-8')
        }
      } catch {
        // 索引更新失败不影响主要操作
      }
      
      return NextResponse.json({
        success: true,
        system: updatedSystem
      })
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Agent system not found'
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Error updating agent system:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update agent system'
    }, { status: 500 })
  }
}

// DELETE: 删除Agent系统
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: systemId } = await params
    
    console.log(`🗑️ === AGENT SYSTEM DELETE API ===`)
    console.log(`  - System ID: ${systemId}`)
    
    const systemFile = path.join(SYSTEMS_DIR, `${systemId}.json`)
    console.log(`  - System file path: ${systemFile}`)
    
    try {
      // 先读取系统信息用于日志
      const systemContent = await fs.readFile(systemFile, 'utf-8')
      const system: AgentSystemSpec = JSON.parse(systemContent)
      console.log(`  - System name: ${system.name}`)
      console.log(`  - System status: ${system.status}`)
      
      // 删除系统文件
      await fs.unlink(systemFile)
      console.log(`  ✅ System file deleted successfully`)
      
      // 从索引中移除
      const indexFile = path.join(SYSTEMS_DIR, 'index.json')
      console.log(`  - Index file path: ${indexFile}`)
      
      try {
        const indexContent = await fs.readFile(indexFile, 'utf-8')
        const systems: AgentSystemSpec[] = JSON.parse(indexContent)
        console.log(`  - Systems in index before deletion: ${systems.length}`)
        
        const filteredSystems = systems.filter(s => s.id !== systemId)
        console.log(`  - Systems in index after deletion: ${filteredSystems.length}`)
        
        await fs.writeFile(indexFile, JSON.stringify(filteredSystems, null, 2), 'utf-8')
        console.log(`  ✅ Index file updated successfully`)
      } catch (indexError) {
        console.error(`  ⚠️ Index update failed:`, indexError)
        // 索引更新失败不影响主要操作
      }
      
      console.log(`  🎉 System deletion completed successfully`)
      
      return NextResponse.json({
        success: true,
        message: 'Agent system deleted successfully',
        deletedSystem: {
          id: systemId,
          name: system.name,
          deletedAt: new Date().toISOString()
        }
      })
      
    } catch (error) {
      console.error(`  ❌ System file not found or read failed:`, error)
      return NextResponse.json({
        success: false,
        error: 'Agent system not found'
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('❌ Error deleting agent system:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete agent system'
    }, { status: 500 })
  }
}