"use client";

import { useChat, type Message } from 'ai/react';
import { useChatHistory } from '@/hooks/use-chat-history';
import { DynamicMessage } from './dynamic-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Plus, Trash2, MessageSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Type predicate to narrow down the message role
const isUserOrAssistantMessage = (message: Message): message is Message & { role: 'user' | 'assistant' } => {
    return message.role === 'user' || message.role === 'assistant';
}

export function EnhancedChat() {
  const {
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    isLoaded,
    updateMessages,
    deleteSession,
    switchSession: switchHistorySession, // Rename to avoid conflict
  } = useChatHistory();
  
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, setMessages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: '/api/chat',
      // When the component loads, `useChat` will be initialized with messages 
      // from the current session loaded by `useChatHistory`.
      initialMessages: currentSession?.messages || [],
      // This key ensures that when the session ID changes, the entire useChat hook
      // is re-initialized, effectively clearing state and adopting the new initialMessages.
      id: currentSessionId ?? undefined,
      onFinish: (message) => {
        // When AI finishes responding, persist the entire conversation
        if (currentSessionId) {
          const finalMessages = [...messages, message];
          updateMessages(currentSessionId, finalMessages);
        }
      },
    });

  // EFFECT 1: Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const handleNewChat = async () => {
    const newSessionId = await createSession();
    // Directly call the history hook to switch. The `id` key on `useChat` will handle re-initialization.
    switchHistorySession(newSessionId);
  };

  const handleSwitchSession = (sessionId: string) => {
    // Directly call the history hook to switch. The `id` key on `useChat` will handle re-initialization.
    switchHistorySession(sessionId);
  }

  // Use a custom submit handler to immediately persist the user's message
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !currentSessionId) return;

    const userMessage = { id: Date.now().toString(), role: 'user' as const, content: input };
    
    // Immediately persist user message to localStorage to prevent loss on reload.
    // We construct the new message array here and save it.
    updateMessages(currentSessionId, [...messages, userMessage]);

    // Let the `useChat` hook handle the UI state update and API submission.
    // It will append the same user message to its internal state.
    handleSubmit(e);
  };


  if (!isLoaded) {
    return <div>Loading chat history...</div>;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-black">
      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r bg-gray-50 dark:bg-gray-950">
        <div className="p-4 border-b">
          <Button onClick={handleNewChat} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => handleSwitchSession(session.id)}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer ${
                  currentSessionId === session.id
                    ? 'bg-gray-200 dark:bg-gray-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="text-sm truncate">{session.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this chat?')) {
                      deleteSession(session.id);
                    }
                  }}
                  className="p-1 rounded-md text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages
            .filter(isUserOrAssistantMessage)
            .map(m => (
              <DynamicMessage
                key={m.id}
                role={m.role as 'user' | 'assistant'}
                content={m.content}
                toolInvocations={m.toolInvocations}
              />
            ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-950">
          {currentSessionId ? (
            <form onSubmit={handleFormSubmit} className="flex gap-4">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask anything..."
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          ) : (
             <div className="text-center text-gray-500">
                Please select a chat or create a new one to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
