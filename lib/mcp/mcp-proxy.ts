import { createClient } from '@supabase/supabase-js';
import { 
  MCPSupabaseOperation, 
  MCPToolResult, 
  ChatSession, 
  ChatMessage,
  CreateSessionRequest,
  SaveMessageRequest,
  UpdateSnapshotRequest,
  GetSessionRequest,
  GetSessionsRequest
} from './supabase-tool';

export class MCPSupabaseProxy {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Missing Supabase configuration. Disabling MCPSupabaseProxy for this environment.');
      // Leave supabase undefined; executeOperation will guard against usage
      this.supabase = undefined as any;
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  // Generate a deterministic UUID from a string - same string always produces same UUID
  private generateDeterministicUUID(input: string): string {
    // Simple hash-based UUID v4 generation for consistent mock data
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert hash to hex and pad to create UUID format
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const uuid = `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(2, 5)}-${hex}${hex.slice(0, 4)}`;
    return uuid;
  }

  async executeOperation(operation: MCPSupabaseOperation): Promise<MCPToolResult> {
    try {
      if (!this.supabase) {
        return {
          success: false,
          error: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
          operationType: operation.type
        };
      }

      switch (operation.type) {
        case 'create_tables':
          return await this.createTables();

        case 'create_session':
          return await this.createSession(operation.data as CreateSessionRequest);

        case 'save_message':
          return await this.saveMessage(operation.data as SaveMessageRequest);

        case 'update_snapshot':
          return await this.updateSnapshot(operation.data as UpdateSnapshotRequest);

        case 'get_session':
          return await this.getSession(operation.data as GetSessionRequest);

        case 'get_sessions':
          return await this.getSessions(operation.data as GetSessionsRequest);

        case 'delete_session':
          return await this.deleteSession(operation.data.session_id);

        default:
          return {
            success: false,
            error: `Unknown operation type: ${operation.type}`,
            operationType: operation.type
          };
      }
    } catch (error) {
      console.error(`mcp-${operation.type}: 失败`, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        operationType: operation.type
      };
    }
  }
  
  // 验证快照数据完整性
  private validateSnapshot(snapshot: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!snapshot) {
      errors.push('snapshot is null or undefined');
      return { isValid: false, errors };
    }
    
    // 验证progress字段
    if (!snapshot.progress) {
      errors.push('missing progress field');
    } else {
      if (typeof snapshot.progress.answered !== 'number' || snapshot.progress.answered < 0) {
        errors.push('invalid progress.answered value');
      }
      if (typeof snapshot.progress.total_questions !== 'number' || snapshot.progress.total_questions !== 12) {
        errors.push('invalid progress.total_questions value');
      }
      if (snapshot.progress.answered > snapshot.progress.total_questions) {
        errors.push('answered questions exceed total questions');
      }
    }
    
    // 验证partial_answers字段
    if (snapshot.partial_answers && typeof snapshot.partial_answers !== 'object') {
      errors.push('invalid partial_answers field - must be object');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  // 智能合并快照数据，优先保留更高的进度
  private mergeSnapshots(existingSnapshot: any, newSnapshot: any): any {
    // 验证输入数据
    const existingValidation = this.validateSnapshot(existingSnapshot);
    const newValidation = this.validateSnapshot(newSnapshot);
    
    if (!existingValidation.isValid) {
      console.log(`mcp-update_snapshot: 现有快照数据无效: ${existingValidation.errors.join(', ')}`);
    }
    
    if (!newValidation.isValid) {
      console.log(`mcp-update_snapshot: 新快照数据无效: ${newValidation.errors.join(', ')}`);
    }
    
    const merged = { ...existingSnapshot };
    
    // 合并progress字段，保留更高的进度
    if (newSnapshot.progress && existingSnapshot.progress) {
      const existingAnswered = existingSnapshot.progress.answered || 0;
      const newAnswered = newSnapshot.progress.answered || 0;
      
      // 选择更高的进度，并进行安全性检查
      if (newAnswered >= existingAnswered && newAnswered <= 12) {
        merged.progress = {
          ...existingSnapshot.progress,
          ...newSnapshot.progress
        };
        console.log(`mcp-update_snapshot: 进度从 ${existingAnswered} 更新到 ${newAnswered}`);
      } else if (newAnswered < existingAnswered) {
        console.log(`mcp-update_snapshot: 拒绝进度回退 (${newAnswered} < ${existingAnswered})，保持现有进度`);
      } else if (newAnswered > 12) {
        console.log(`mcp-update_snapshot: 拒绝无效进度 (${newAnswered} > 12)，保持现有进度`);
      }
    } else if (newSnapshot.progress && newValidation.isValid) {
      merged.progress = newSnapshot.progress;
    }
    
    // 合并partial_answers，新答案会覆盖旧答案，但不删除已有答案
    if (newSnapshot.partial_answers && typeof newSnapshot.partial_answers === 'object') {
      merged.partial_answers = {
        ...existingSnapshot.partial_answers,
        ...newSnapshot.partial_answers
      };
      
      const addedKeys = Object.keys(newSnapshot.partial_answers).filter(
        key => !(key in (existingSnapshot.partial_answers || {}))
      );
      if (addedKeys.length > 0) {
        console.log(`mcp-update_snapshot: 新增答案字段: ${addedKeys.join(', ')}`);
      }
    }
    
    // 合并其他字段
    Object.keys(newSnapshot).forEach(key => {
      if (key !== 'progress' && key !== 'partial_answers') {
        merged[key] = newSnapshot[key];
      }
    });
    
    // 验证合并后的数据
    const mergedValidation = this.validateSnapshot(merged);
    if (!mergedValidation.isValid) {
      console.log(`mcp-update_snapshot: 警告 - 合并后数据存在问题: ${mergedValidation.errors.join(', ')}`);
    }
    
    return merged;
  }

  private async createTables(): Promise<MCPToolResult> {
    try {
      // Check if tables already exist by querying them
      const { error: sessionsCheckError } = await this.supabase
        .from('chat_sessions')
        .select('id')
        .limit(1);

      if (!sessionsCheckError) {
        // Tables already exist
        return {
          success: true,
          data: { message: 'Database tables already exist and are accessible' },
          operationType: 'create_tables'
        };
      }

      // If we get here, tables don't exist or we can't access them
      // For now, return a message that manual setup is required
      return {
        success: false,
        error: 'Database tables need to be created manually in Supabase dashboard. Please run the SQL commands from the implementation plan.',
        operationType: 'create_tables'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check/create tables',
        operationType: 'create_tables'
      };
    }
  }

  private async createSession(request: CreateSessionRequest): Promise<MCPToolResult> {
    // 硬编码使用固定的mock用户数据
    const HARDCODED_SYSTEM_ID = 'system_1757299256379_mu0enk1lw';
    const mockUserId = this.generateDeterministicUUID(`${HARDCODED_SYSTEM_ID}_mock_user`);
    const mockSessionId = this.generateDeterministicUUID(`${HARDCODED_SYSTEM_ID}_mock_session`);
    
    console.log(`mcp-create_session: 检查session是否已存在`);
    
    // 先检查session是否已存在，避免覆盖现有数据
    const { data: existingSession, error: checkError } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', mockSessionId)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 是"未找到记录"错误
      return {
        success: false,
        error: checkError.message,
        operationType: 'create_session'
      };
    }
    
    // 如果session已存在，返回现有session而不是覆盖
    if (existingSession) {
      console.log(`mcp-create_session: 返回现有session，避免覆盖数据`);
      return {
        success: true,
        data: existingSession as ChatSession,
        operationType: 'create_session',
        message: 'existing session returned (no data overwritten)'
      };
    }
    
    // 如果session不存在，创建新的session
    console.log(`mcp-create_session: 创建新session`);
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .insert({
        id: mockSessionId,
        user_id: mockUserId,
        system_id: HARDCODED_SYSTEM_ID,
        title: request.title || `Health Survey Mock Session`,
        status: 'active',
        snapshot: request.initial_snapshot || { 
          progress: { total_questions: 12, answered: 0, current_question: 1 }, 
          partial_answers: {} 
        },
        snapshot_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        operationType: 'create_session'
      };
    }

    console.log(`mcp-create_session: 新session创建成功`);
    return {
      success: true,
      data: data as ChatSession,
      operationType: 'create_session',
      message: 'new session created successfully'
    };
  }

  private async saveMessage(request: SaveMessageRequest): Promise<MCPToolResult> {
    
    // 硬编码使用固定的mock用户数据
    const HARDCODED_SYSTEM_ID = 'system_1757299256379_mu0enk1lw';
    
    // Validate required fields
    if (!request.role) {
      return {
        success: false,
        error: 'role field is required and cannot be null.',
        operationType: 'save_message'
      };
    }
    
    const mockUserId = this.generateDeterministicUUID(`${HARDCODED_SYSTEM_ID}_mock_user`);
    const mockSessionId = this.generateDeterministicUUID(`${HARDCODED_SYSTEM_ID}_mock_session`);
    
    
    const insertData = {
      session_id: mockSessionId,
      user_id: mockUserId,
      agent_id: request.agent_id || null,
      role: request.role,
      content: request.content || null,
      content_json: request.content_json || null,
      client_msg_id: request.client_msg_id || null
    };
    
    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert(insertData)
      .select()
      .limit(1);

    if (error) {
      return {
        success: false,
        error: error.message,
        operationType: 'save_message'
      };
    }

    // 如果没有找到记录或插入失败
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Message saving failed',
        operationType: 'save_message'
      };
    }
    console.log(`mcp-save_message: 成功`);
    return {
      success: true,
      data: data[0] as ChatMessage,
      operationType: 'save_message'
    };
  }

  private async updateSnapshot(request: UpdateSnapshotRequest): Promise<MCPToolResult> {
    
    // 硬编码使用固定的mock session ID
    const HARDCODED_SYSTEM_ID = 'system_1757299256379_mu0enk1lw';
    const mockSessionId = this.generateDeterministicUUID(`${HARDCODED_SYSTEM_ID}_mock_session`);
    
    console.log(`mcp-update_snapshot: 开始处理快照更新`);
    
    // 首先获取现有session的快照数据
    const { data: existingSession, error: fetchError } = await this.supabase
      .from('chat_sessions')
      .select('snapshot')
      .eq('id', mockSessionId)
      .single();
      
    let existingSnapshot = null;
    if (!fetchError && existingSession) {
      existingSnapshot = existingSession.snapshot;
      console.log(`mcp-update_snapshot: 找到现有快照`);
    } else {
      console.log(`mcp-update_snapshot: 未找到现有快照，将创建新的`);
    }
    
    // 处理新的snapshot数据：支持snapshot或snapshot_data字段
    let newSnapshotData;
    const requestAny = request as any;
    if (requestAny.snapshot_data) {
      // 如果AI传递的是snapshot_data字符串，需要解析
      try {
        newSnapshotData = typeof requestAny.snapshot_data === 'string' 
          ? JSON.parse(requestAny.snapshot_data) 
          : requestAny.snapshot_data;
      } catch (e: any) {
        console.log(`mcp-update_snapshot: 解析snapshot_data失败，保持现有数据不变`);
        newSnapshotData = null;
      }
    } else if (request.snapshot) {
      newSnapshotData = request.snapshot;
    } else {
      console.log(`mcp-update_snapshot: 未提供新快照数据，保持现有数据不变`);
      newSnapshotData = null;
    }
    
    // 智能合并快照数据
    let finalSnapshot;
    if (newSnapshotData && Object.keys(newSnapshotData).length > 0) {
      if (existingSnapshot && Object.keys(existingSnapshot).length > 0) {
        // 合并现有快照和新数据，优先保留更高的进度
        finalSnapshot = this.mergeSnapshots(existingSnapshot, newSnapshotData);
        console.log(`mcp-update_snapshot: 合并快照数据`);
      } else {
        // 使用新快照数据
        finalSnapshot = newSnapshotData;
        console.log(`mcp-update_snapshot: 使用新快照数据`);
      }
    } else {
      if (existingSnapshot && Object.keys(existingSnapshot).length > 0) {
        // 保持现有快照不变
        finalSnapshot = existingSnapshot;
        console.log(`mcp-update_snapshot: 保持现有快照不变`);
      } else {
        // 创建默认快照（仅在完全没有数据时）
        finalSnapshot = { 
          progress: { total_questions: 12, answered: 0, current_question: 1 },
          partial_answers: {}
        };
        console.log(`mcp-update_snapshot: 创建默认快照`);
      }
    }
    
    const updateData = {
      snapshot: finalSnapshot,
      snapshot_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', mockSessionId)
      .select()
      .limit(1);

    if (error) {
      console.log(`mcp-update_snapshot: 更新失败，尝试恢复策略`);
      
      // 错误恢复策略：如果更新失败，尝试重新获取并合并数据
      try {
        const { data: retrySession, error: retryError } = await this.supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', mockSessionId)
          .single();
          
        if (!retryError && retrySession) {
          // 基于最新数据重新尝试合并
          const freshSnapshot = retrySession.snapshot;
          const remergedSnapshot = this.mergeSnapshots(freshSnapshot, finalSnapshot);
          
          console.log(`mcp-update_snapshot: 执行恢复更新`);
          const { data: recoveryData, error: recoveryError } = await this.supabase
            .from('chat_sessions')
            .update({
              snapshot: remergedSnapshot,
              snapshot_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', mockSessionId)
            .select()
            .limit(1);
            
          if (!recoveryError && recoveryData && recoveryData.length > 0) {
            console.log(`mcp-update_snapshot: 恢复成功`);
            return {
              success: true,
              data: recoveryData[0],
              operationType: 'update_snapshot',
              message: 'recovered from initial failure'
            };
          }
        }
      } catch (recoveryError) {
        console.log(`mcp-update_snapshot: 恢复也失败，返回原始错误`);
      }
      
      return {
        success: false,
        error: error.message,
        operationType: 'update_snapshot'
      };
    }

    // 如果没有找到记录或更新失败
    if (!data || data.length === 0) {
      console.log(`mcp-update_snapshot: 会话不存在，检查是否需要创建`);
      
      // 错误恢复：如果session不存在，检查是否应该创建它
      try {
        const createResult = await this.createSession({
          user_id: 'mock_user',
          system_id: HARDCODED_SYSTEM_ID,
          title: 'Health Survey Session (Auto-recovered)',
          initial_snapshot: finalSnapshot
        });
        
        if (createResult.success) {
          console.log(`mcp-update_snapshot: 自动创建session并设置快照`);
          return {
            success: true,
            data: createResult.data,
            operationType: 'update_snapshot',
            message: 'session auto-created with snapshot'
          };
        }
      } catch (autoCreateError) {
        console.log(`mcp-update_snapshot: 自动创建session失败`);
      }
      
      return {
        success: false,
        error: 'Session not found or update failed',
        operationType: 'update_snapshot'
      };
    }

    // 验证更新后的数据完整性
    if (data[0] && data[0].snapshot) {
      const validation = this.validateSnapshot(data[0].snapshot);
      if (!validation.isValid) {
        console.log(`mcp-update_snapshot: 警告 - 保存的数据存在完整性问题: ${validation.errors.join(', ')}`);
      } else {
        console.log(`mcp-update_snapshot: 数据完整性验证通过`);
      }
    }

    console.log(`mcp-update_snapshot: 成功`);
    return {
      success: true,
      data: data[0],
      operationType: 'update_snapshot'
    };
  }

  private async getSession(request: GetSessionRequest): Promise<MCPToolResult> {
    // 硬编码使用固定的mock session ID
    const HARDCODED_SYSTEM_ID = 'system_1757299256379_mu0enk1lw';
    const mockSessionId = this.generateDeterministicUUID(`${HARDCODED_SYSTEM_ID}_mock_session`);
    
    console.log(`📥 原始请求:`, JSON.stringify(request, null, 2));
    
    const selectClause = request.include_messages 
      ? `
        *,
        chat_messages (
          id, agent_id, role, content, content_json, client_msg_id, seq, created_at
        )
      `
      : '*';

    const { data, error } = await this.supabase
      .from('chat_sessions')
      .select(selectClause)
      .eq('id', mockSessionId)
      .limit(1);

    if (error) {
      return {
        success: false,
        error: error.message,
        operationType: 'get_session'
      };
    }

    // 如果没有找到记录
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Session not found',
        operationType: 'get_session'
      };
    }

    // 返回第一条记录
    return {
      success: true,
      data: data[0],
      operationType: 'get_session'
    };
  }

  private async getSessions(request: GetSessionsRequest): Promise<MCPToolResult> {
    let query = this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', request.user_id)
      .order('created_at', { ascending: false });

    if (request.system_id) {
      query = query.eq('system_id', request.system_id);
    }

    if (request.limit) {
      query = query.limit(request.limit);
    }

    if (request.offset) {
      query = query.range(request.offset, request.offset + (request.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: error.message,
        operationType: 'get_sessions'
      };
    }

    return {
      success: true,
      data: data as ChatSession[],
      operationType: 'get_sessions'
    };
  }

  private async deleteSession(sessionId: string): Promise<MCPToolResult> {
    const { error } = await this.supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      return {
        success: false,
        error: error.message,
        operationType: 'delete_session'
      };
    }

    return {
      success: true,
      data: { message: 'Session deleted successfully' },
      operationType: 'delete_session'
    };
  }
}

export const mcpSupabaseProxy = new MCPSupabaseProxy();
