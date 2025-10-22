export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          system_id: string
          title: string | null
          status: 'active' | 'paused' | 'completed' | 'archived'
          snapshot: Json
          snapshot_updated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          system_id: string
          title?: string | null
          status?: 'active' | 'paused' | 'completed' | 'archived'
          snapshot?: Json
          snapshot_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          system_id?: string
          title?: string | null
          status?: 'active' | 'paused' | 'completed' | 'archived'
          snapshot?: Json
          snapshot_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          user_id: string
          agent_id: string | null
          role: 'system' | 'user' | 'assistant' | 'tool'
          content: string | null
          content_json: Json | null
          client_msg_id: string | null
          seq: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          agent_id?: string | null
          role: 'system' | 'user' | 'assistant' | 'tool'
          content?: string | null
          content_json?: Json | null
          client_msg_id?: string | null
          seq?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          agent_id?: string | null
          role?: 'system' | 'user' | 'assistant' | 'tool'
          content?: string | null
          content_json?: Json | null
          client_msg_id?: string | null
          seq?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update'];

export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];
export type ChatMessageUpdate = Database['public']['Tables']['chat_messages']['Update'];

// Extended types for the application
export interface ChatSessionWithMessages extends ChatSession {
  chat_messages?: ChatMessage[];
}

export interface HealthSurveySnapshot {
  meta?: {
    assistant_version: string;
    completed_at?: string;
    progress: {
      total_questions: number;
      answered: number;
    };
  };
  basic_profile?: {
    age?: number | null;
    weight_pounds?: number | null;
    height?: string | null;
    height_inches_total?: number | null;
    sex_assigned_at_birth?: string | null;
    ancestries?: Array<{
      label: string;
      other_note?: string | null;
    }>;
  };
  medical_history?: {
    conditions?: Array<{
      label: string;
      start_year?: number | null;
      other_note?: string | null;
    }>;
    surgeries_or_hospital_stays?: string[];
    allergies?: Array<{
      label: string;
      reaction?: string | null;
      other_note?: string | null;
    }>;
  };
  medications_and_supplements?: {
    medications?: Array<{
      name: string;
      dose_strength: string;
      frequency: string;
      purpose: string;
    }>;
    supplements?: Array<{
      name: string;
      dose_strength: string;
      frequency: string;
      purpose: string;
    }>;
  };
  miscellaneous?: {
    cam_fields?: string[];
    wearable_devices?: string[];
  };
}