import { useState, useEffect, useCallback } from 'react';
import { Message } from 'ai';
import { generateUUID } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { ChatSessionWithMessages as SupabaseChatSession, ChatMessage, HealthSurveySnapshot } from '@/lib/supabase/types';

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  systemId: string;
  userId: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  snapshot: HealthSurveySnapshot;
  snapshotUpdatedAt?: string;
}

export function useChatHistory(
  initialSessions: ChatSession[] = [], 
  initialCurrentSessionId: string | null = null,
  systemId: string = 'system_1757299256379_mu0enk1lw',
  userId: string = 'default-user'
) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialCurrentSessionId);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load sessions from Supabase
  const loadSessions = useCallback(async () => {
    try {
      console.log(`🔄 Loading sessions from Supabase for user: ${userId}, system: ${systemId}`);
      
      const { data: supabaseSessions, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages (
            id, agent_id, role, content, content_json, client_msg_id, seq, created_at
          )
        `)
        .eq('user_id', userId)
        .eq('system_id', systemId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load sessions from Supabase:', error);
        // Fallback to localStorage for backward compatibility
        const savedSessions = localStorage.getItem('chat-sessions');
        if (savedSessions) {
          const parsedSessions = JSON.parse(savedSessions);
          setSessions(parsedSessions);
        }
        return;
      }

      console.log(`✅ Loaded ${supabaseSessions?.length || 0} sessions from Supabase`);

      // Convert Supabase sessions to local format
      const convertedSessions: ChatSession[] = (supabaseSessions || []).map((session: SupabaseChatSession) => ({
        id: session.id,
        title: session.title || `Chat ${new Date(session.created_at).toLocaleString()}`,
        messages: (session.chat_messages || [])
          .sort((a: any, b: any) => a.seq - b.seq)
          .map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content || '',
            createdAt: msg.created_at
          })),
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        systemId: session.system_id,
        userId: session.user_id,
        status: session.status,
        snapshot: session.snapshot as HealthSurveySnapshot || {},
        snapshotUpdatedAt: session.snapshot_updated_at
      }));

      setSessions(convertedSessions);

      // Set current session
      const lastSessionId = localStorage.getItem('chat-current-session-id');
      if (lastSessionId && convertedSessions.some(s => s.id === lastSessionId)) {
        setCurrentSessionId(lastSessionId);
      } else if (convertedSessions.length > 0) {
        setCurrentSessionId(convertedSessions[0].id);
      }

    } catch (e) {
      console.error("Failed to load chat history from Supabase", e);
      // Fallback to localStorage
      try {
        const savedSessions = localStorage.getItem('chat-sessions');
        if (savedSessions) {
          const parsedSessions = JSON.parse(savedSessions);
          setSessions(parsedSessions);
        }
      } catch (localError) {
        console.error("Failed to load from localStorage fallback", localError);
      }
    } finally {
      setIsLoaded(true);
    }
  }, [userId, systemId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const saveToStorage = (newSessions: ChatSession[], newCurrentId: string | null) => {
    try {
      localStorage.setItem('chat-sessions', JSON.stringify(newSessions));
      if (newCurrentId) {
        localStorage.setItem('chat-current-session-id', newCurrentId);
      } else {
        localStorage.removeItem('chat-current-session-id');
      }
    } catch (e) {
        console.error("Failed to save chat history to localStorage", e);
    }
  };

  const createSession = useCallback(async (title?: string): Promise<string> => {
    try {
      console.log(`🆕 Creating new session in Supabase`);
      
      const { data: newSupabaseSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          system_id: systemId,
          title: title || `Health Survey ${new Date().toLocaleString()}`,
          status: 'active',
          snapshot: {}
        })
        .select()
        .single();

      if (error || !newSupabaseSession) {
        console.error('Failed to create session in Supabase:', error);
        // Fallback to local creation
        const newSession: ChatSession = {
          id: generateUUID(),
          title: title || `Chat ${new Date().toLocaleString()}`,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          systemId,
          userId,
          status: 'active',
          snapshot: {}
        };

        setSessions(prevSessions => {
          const newSessions = [newSession, ...prevSessions];
          saveToStorage(newSessions, newSession.id);
          return newSessions;
        });
        setCurrentSessionId(newSession.id);
        return newSession.id;
      }

      console.log(`✅ Created session in Supabase:`, newSupabaseSession.id);

      const newSession: ChatSession = {
        id: newSupabaseSession.id,
        title: newSupabaseSession.title || `Chat ${new Date().toLocaleString()}`,
        messages: [],
        createdAt: newSupabaseSession.created_at,
        updatedAt: newSupabaseSession.updated_at,
        systemId: newSupabaseSession.system_id,
        userId: newSupabaseSession.user_id,
        status: newSupabaseSession.status,
        snapshot: newSupabaseSession.snapshot as HealthSurveySnapshot || {},
        snapshotUpdatedAt: newSupabaseSession.snapshot_updated_at
      };

      setSessions(prevSessions => {
        const newSessions = [newSession, ...prevSessions];
        saveToStorage(newSessions, newSession.id);
        return newSessions;
      });
      setCurrentSessionId(newSession.id);
      return newSession.id;
      
    } catch (error) {
      console.error('Error creating session:', error);
      // Fallback to local creation
      const newSession: ChatSession = {
        id: generateUUID(),
        title: title || `Chat ${new Date().toLocaleString()}`,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        systemId,
        userId,
        status: 'active',
        snapshot: {}
      };

      setSessions(prevSessions => {
        const newSessions = [newSession, ...prevSessions];
        saveToStorage(newSessions, newSession.id);
        return newSessions;
      });
      setCurrentSessionId(newSession.id);
      return newSession.id;
    }
  }, [userId, systemId]);

  const updateMessages = useCallback((sessionId: string, newMessages: Message[]) => {
    // Note: Message saving to Supabase is now handled by the MCP agents
    // This function just updates the local state for UI consistency
    setSessions(prevSessions => {
      const newSessions = prevSessions.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: newMessages,
            updatedAt: new Date().toISOString(),
          };
        }
        return session;
      });
      saveToStorage(newSessions, sessionId);
      return newSessions;
    });
  }, []);

  // New function to update session snapshots
  const updateSnapshot = useCallback(async (sessionId: string, snapshot: HealthSurveySnapshot): Promise<void> => {
    try {
      console.log(`📊 Updating snapshot for session: ${sessionId}`);
      
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          snapshot,
          snapshot_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Failed to update snapshot in Supabase:', error);
        return;
      }

      console.log(`✅ Updated snapshot for session: ${sessionId}`);

      // Update local state
      setSessions(prevSessions => {
        const newSessions = prevSessions.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              snapshot,
              snapshotUpdatedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return session;
        });
        saveToStorage(newSessions, sessionId);
        return newSessions;
      });

    } catch (error) {
      console.error('Error updating snapshot:', error);
    }
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prevSessions => {
      const newSessions = prevSessions.filter(s => s.id !== sessionId);
      let newCurrentId = currentSessionId;
      if (currentSessionId === sessionId) {
        newCurrentId = newSessions[0]?.id || null;
        setCurrentSessionId(newCurrentId);
      }
      saveToStorage(newSessions, newCurrentId);
      return newSessions;
    });
  }, [currentSessionId]);

  const switchSession = useCallback((sessionId: string | null) => {
    if(sessionId === null || sessions.some((s: ChatSession) => s.id === sessionId)){
        setCurrentSessionId(sessionId);
        if(sessionId) {
            localStorage.setItem('chat-current-session-id', sessionId);
        } else {
            localStorage.removeItem('chat-current-session-id');
        }
    }
  }, [sessions]);
  
  const currentSession = sessions.find((s: ChatSession) => s.id === currentSessionId);

  return {
    sessions,
    currentSessionId,
    currentSession,
    isLoaded,
    createSession,
    updateMessages,
    updateSnapshot,
    deleteSession,
    switchSession,
    loadSessions, // Allow manual refresh of sessions
  };
} 
