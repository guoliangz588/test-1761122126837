import { NextRequest, NextResponse } from 'next/server';
import { MCPSupabaseProxy } from '../../../lib/mcp/mcp-proxy';
import { MCPSupabaseOperation } from '../../../lib/mcp/supabase-tool';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(`api-mcp请求: ${body.type}`);
    
    const proxy = new MCPSupabaseProxy();
    const operation: MCPSupabaseOperation = {
      type: body.type,
      data: body.data
    };
    
    const result = await proxy.executeOperation(operation);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('api-mcp错误:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        operationType: 'api_error'
      },
      { status: 500 }
    );
  }
}