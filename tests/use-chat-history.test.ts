import { renderHook, act } from '@testing-library/react';
import { useChatHistory, ChatSession } from '@/hooks/use-chat-history';
import { generateUUID } from '@/lib/utils';
import { Message } from 'ai';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });


describe('useChatHistory Hook', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('should initialize with no sessions if localStorage is empty', () => {
        const { result } = renderHook(() => useChatHistory());
        expect(result.current.sessions).toEqual([]);
        expect(result.current.currentSessionId).toBeNull();
    });

    it('should create a new session', () => {
        const { result } = renderHook(() => useChatHistory());
        
        act(() => {
            result.current.createSession('Test Session');
        });

        expect(result.current.sessions.length).toBe(1);
        expect(result.current.sessions[0].title).toBe('Test Session');
        expect(result.current.currentSessionId).toBe(result.current.sessions[0].id);
    });

    it('should load sessions from localStorage on mount', () => {
        const mockSession: ChatSession = {
            id: generateUUID(),
            title: 'Saved Session',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        localStorageMock.setItem('chat-sessions', JSON.stringify([mockSession]));
        localStorageMock.setItem('chat-current-session-id', mockSession.id);

        const { result } = renderHook(() => useChatHistory());

        expect(result.current.sessions.length).toBe(1);
        expect(result.current.sessions[0].title).toBe('Saved Session');
        expect(result.current.currentSessionId).toBe(mockSession.id);
    });

    it('should update messages for the current session', () => {
        const { result } = renderHook(() => useChatHistory());

        let sessionId: string;
        act(() => {
            sessionId = result.current.createSession();
        });

        const newMessage: Message = { id: generateUUID(), role: 'user', content: 'Hello!' };
        act(() => {
            result.current.updateMessages(sessionId, [newMessage]);
        });
        
        expect(result.current.currentSession?.messages.length).toBe(1);
        expect(result.current.currentSession?.messages[0].content).toBe('Hello!');
    });

    it('should switch between sessions', () => {
        const { result } = renderHook(() => useChatHistory());

        let sessionId1: string, sessionId2: string;
        act(() => {
            sessionId1 = result.current.createSession('Session 1');
            sessionId2 = result.current.createSession('Session 2');
        });
        
        expect(result.current.currentSessionId).toBe(sessionId2);

        act(() => {
            result.current.switchSession(sessionId1);
        });

        expect(result.current.currentSessionId).toBe(sessionId1);
    });

    it('should delete a session and update current session if needed', () => {
        const { result } = renderHook(() => useChatHistory());

        let sessionId1: string, sessionId2: string;
        act(() => {
            sessionId1 = result.current.createSession('Session 1');
            sessionId2 = result.current.createSession('Session 2');
        });

        act(() => {
            result.current.deleteSession(sessionId2);
        });

        expect(result.current.sessions.length).toBe(1);
        // After deleting the current session, it should switch to the next available one.
        expect(result.current.currentSessionId).toBe(sessionId1);
    });
}); 