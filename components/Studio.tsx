'use client';

import { useState, useCallback, useRef } from 'react';
import type { Conversation } from '@/db/schema';
import { type PromptWithState, type ConversationWithPrompts } from '@/app/page';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatView } from './ChatView';
import { PromptComposer } from './PromptComposer';
import { MultiInputComposer } from './MultiInputComposer';

interface StudioProps {
  initialData: ConversationWithPrompts[];
}

export type ExecutionStatus = 'idle' | 'executing' | 'done' | 'error';

export function Studio({ initialData }: StudioProps) {
  const [conversations, setConversations] = useState<ConversationWithPrompts[]>(initialData);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialData[0]?.conversation.id ?? null
  );
  const [executingPromptId, setExecutingPromptId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showBatchComposer, setShowBatchComposer] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const selectedConversation = conversations.find((c) => c.conversation.id === selectedConversationId) ?? null;

  // Create a new conversation
  const handleCreateConversation = useCallback(async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Conversation' }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    const newConversation: Conversation = await res.json();

    const newEntry: ConversationWithPrompts = {
      conversation: newConversation,
      prompts: [],
    };

    setConversations((prev) => [newEntry, ...prev]);
    setSelectedConversationId(newConversation.id);
  }, []);

  // Create a new prompt in the selected conversation
  const handleCreatePrompt = useCallback(async (text: string, execute: boolean) => {
    if (!selectedConversationId) {
      await handleCreateConversation();
      return;
    }

    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, conversationId: selectedConversationId }),
    });
    if (!res.ok) throw new Error('Failed to create prompt');
    const newPrompt = await res.json();

    const promptWithState: PromptWithState = {
      prompt: newPrompt,
      activeCollection: null,
      pendingCollection: null,
      activeItems: [],
      totalVersions: 0,
    };

    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv.conversation.id === selectedConversationId) {
          // If this is the first prompt and title is "New Conversation", update it
          if (
            conv.prompts.length === 0 &&
            conv.conversation.title === 'New Conversation'
          ) {
            // Use first 50 chars of prompt text as title
            const newTitle = text.length > 50 ? text.substring(0, 50) + '...' : text;
            return {
              ...conv,
              prompts: [...conv.prompts, promptWithState],
              conversation: { ...conv.conversation, title: newTitle },
            };
          }
          return { ...conv, prompts: [...conv.prompts, promptWithState] };
        }
        return conv;
      });

      // Update the conversation title on the server if it was changed
      const selectedConv = updated.find((c) => c.conversation.id === selectedConversationId);
      if (
        selectedConv &&
        selectedConv.conversation.title !== 'New Conversation'
      ) {
        fetch('/api/conversations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedConversationId,
            title: selectedConv.conversation.title,
          }),
        }).catch((err) => console.error('Failed to update conversation title:', err));
      }

      return updated;
    });

    setShowComposer(false);

    if (execute) {
      await handleExecute(newPrompt.id);
    }
  }, [selectedConversationId, handleCreateConversation]);

  // Cancel a running execution
  const handleCancelExecute = useCallback((promptId: string) => {
    const controller = abortControllersRef.current.get(promptId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(promptId);
    }
    setExecutingPromptId(null);
    // Revert optimistic state
    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        prompts: conv.prompts.map((p) =>
          p.prompt.id === promptId ? { ...p, pendingCollection: null } : p
        ),
      }))
    );
  }, []);

  // Execute (or re-execute) a prompt
  const handleExecute = useCallback(async (promptId: string) => {
    setExecutingPromptId(promptId);

    // Create abort controller for this execution
    const controller = new AbortController();
    abortControllersRef.current.set(promptId, controller);

    // Optimistically mark as pending
    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        prompts: conv.prompts.map((p) =>
          p.prompt.id === promptId
            ? {
                ...p,
                pendingCollection: { id: 'pending', status: 'pending' } as any,
              }
            : p
        ),
      }))
    );

    try {
      const res = await fetch(`/api/prompts/${promptId}/execute`, {
        method: 'POST',
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || 'Execution failed');
      }

      const { collection, items } = await res.json();

      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          prompts: conv.prompts.map((p) =>
            p.prompt.id === promptId
              ? {
                  ...p,
                  activeCollection: collection,
                  pendingCollection: null,
                  activeItems: items,
                }
              : p
          ),
        }))
      );
    } catch (err) {
      console.error('Execute error:', err);
      if (err instanceof Error && err.name !== 'AbortError') {
        setConversations((prev) =>
          prev.map((conv) => ({
            ...conv,
            prompts: conv.prompts.map((p) =>
              p.prompt.id === promptId
                ? { ...p, pendingCollection: null }
                : p
            ),
          }))
        );
      }
    } finally {
      abortControllersRef.current.delete(promptId);
      setExecutingPromptId(null);
    }
  }, []);

  // Update prompt text
  const handleUpdatePrompt = useCallback(async (promptId: string, text: string) => {
    const res = await fetch(`/api/prompts/${promptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to update prompt');
    const updated = await res.json();

    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        prompts: conv.prompts.map((p) =>
          p.prompt.id === promptId ? { ...p, prompt: updated } : p
        ),
      }))
    );
  }, []);

  // Delete a prompt
  const handleDeletePrompt = useCallback(async (promptId: string) => {
    await fetch(`/api/prompts/${promptId}`, { method: 'DELETE' });
    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        prompts: conv.prompts.filter((p) => p.prompt.id !== promptId),
      }))
    );
  }, []);

  // Delete a conversation
  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
    setConversations((prev) => prev.filter((c) => c.conversation.id !== conversationId));
    if (selectedConversationId === conversationId) {
      const remaining = conversations.filter((c) => c.conversation.id !== conversationId);
      setSelectedConversationId(remaining[0]?.conversation.id ?? null);
    }
  }, [selectedConversationId, conversations]);

  // Update an item
  const handleUpdateItem = useCallback(async (promptId: string, itemId: string, updates: any) => {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update item');
    const updated = await res.json();

    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        prompts: conv.prompts.map((p) =>
          p.prompt.id === promptId
            ? {
                ...p,
                activeItems: p.activeItems.map((item) =>
                  item.id === itemId ? updated : item
                ),
              }
            : p
        ),
      }))
    );
  }, []);

  // Delete an item
  const handleDeleteItem = useCallback(async (promptId: string, itemId: string) => {
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    setConversations((prev) =>
      prev.map((conv) => ({
        ...conv,
        prompts: conv.prompts.map((p) =>
          p.prompt.id === promptId
            ? {
                ...p,
                activeItems: p.activeItems.filter((item) => item.id !== itemId),
              }
            : p
        ),
      }))
    );
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--paper)]">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        selectedId={selectedConversationId}
        onSelect={setSelectedConversationId}
        onNewConversation={handleCreateConversation}
        onDelete={handleDeleteConversation}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <ChatView
            conversation={selectedConversation}
            executingPromptId={executingPromptId}
            onCreatePrompt={() => setShowComposer(true)}
            onExecute={handleExecute}
            onCancelExecute={handleCancelExecute}
            onUpdatePrompt={handleUpdatePrompt}
            onDeletePrompt={handleDeletePrompt}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />
        ) : (
          <EmptyState onNewConversation={handleCreateConversation} />
        )}
      </main>

      {/* New prompt modal */}
      {showComposer && (
        <PromptComposer
          onSubmit={handleCreatePrompt}
          onClose={() => setShowComposer(false)}
        />
      )}

      {/* Batch prompt modal */}
      {showBatchComposer && (
        <MultiInputComposer
          onSubmit={async (texts) => {
            // TODO: Implement batch submission for conversations
            setShowBatchComposer(false);
          }}
          onClose={() => setShowBatchComposer(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ onNewConversation }: { onNewConversation: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
      <div className="text-center max-w-md">
        <div className="font-display text-5xl font-bold text-[var(--ink)] mb-3 leading-tight">
          Law Connect
        </div>
        <p className="font-mono text-sm text-[var(--ink-muted)] leading-relaxed">
          Start a new conversation to begin generating legal content with AI.
        </p>
      </div>
      <button
        onClick={onNewConversation}
        className="flex items-center gap-2 px-5 py-3 bg-[var(--ink)] text-[var(--paper)] font-mono text-sm
                   hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors duration-150"
      >
        <span className="text-[var(--amber)] group-hover:text-[var(--ink)]">+</span>
        New Conversation
      </button>
    </div>
  );
}
export { PromptWithState };

