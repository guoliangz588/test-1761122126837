export interface MCPSupabaseOperation {
  type: 'create_session' | 'save_message' | 'update_snapshot' | 'get_session' | 'create_tables' | 'get_sessions' | 'delete_session';
  data: any;
  sessionId?: string;
  userId?: string;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  operationType?: string;
  message?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  system_id: string;
  title?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  snapshot: Record<string, any>;
  snapshot_updated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  agent_id?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  content_json?: Record<string, any>;
  client_msg_id?: string;
  seq?: number;
  created_at: string;
}

export interface CreateSessionRequest {
  user_id: string;
  system_id: string;
  title?: string;
  initial_snapshot?: Record<string, any>;
}

export interface SaveMessageRequest {
  session_id: string;
  user_id: string;
  system_id?: string;  // Added for mock user support
  agent_id?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  content_json?: Record<string, any>;
  client_msg_id?: string;
}

export interface UpdateSnapshotRequest {
  session_id: string;
  snapshot?: Record<string, any>;
  snapshot_data?: string | Record<string, any>;  // AI可能发送snapshot_data字段
}

export interface GetSessionRequest {
  session_id?: string;
  system_id?: string;
  user_id?: string;
  include_messages?: boolean;
}

export interface GetSessionsRequest {
  user_id: string;
  system_id?: string;
  limit?: number;
  offset?: number;
}