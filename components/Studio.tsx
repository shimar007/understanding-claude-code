'use client';

import { useState, useCallback } from 'react';
import type { Prompt, Collection, Item } from '@/db/schema';
import { PromptSidebar } from './PromptSidebar';
import { CollectionView } from './CollectionView';
import { PromptComposer } from './PromptComposer';

export interface PromptWithState {
  prompt: Prompt;
  activeCollection: Collection | null;
  pendingCollection: Collection | null;
  activeItems: Item[];
  totalVersions: number;
}

interface StudioProps {
  initialData: PromptWithState[];
}

export type ExecutionStatus = 'idle' | 'executing' | 'done' | 'error';

export function Studio({ initialData }: StudioProps) {
  const [prompts, setPrompts] = useState<PromptWithState[]>(initialData);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(
    initialData[0]?.prompt.id ?? null
  );
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const selectedEntry = prompts.find((p) => p.prompt.id === selectedPromptId) ?? null;

  // Create a new prompt (optionally execute immediately)
  const handleCreatePrompt = useCallback(async (text: string, execute: boolean) => {
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to create prompt');
    const newPrompt: Prompt = await res.json();

    const entry: PromptWithState = {
      prompt: newPrompt,
      activeCollection: null,
      pendingCollection: null,
      activeItems: [],
      totalVersions: 0,
    };

    setPrompts((prev) => [entry, ...prev]);
    setSelectedPromptId(newPrompt.id);
    setShowComposer(false);

    if (execute) {
      await handleExecute(newPrompt.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Execute (or re-execute) a prompt
  const handleExecute = useCallback(async (promptId: string) => {
    setExecutingId(promptId);

    // Optimistically mark as pending
    setPrompts((prev) =>
      prev.map((entry) =>
        entry.prompt.id === promptId
          ? {
              ...entry,
              pendingCollection: { id: 'pending', status: 'pending' } as Collection,
              activeCollection: entry.activeCollection
                ? { ...entry.activeCollection, status: 'archived' }
                : null,
            }
          : entry
      )
    );

    try {
      const res = await fetch(`/api/prompts/${promptId}/execute`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || 'Execution failed');
      }

      const { collection, items } = await res.json();

      setPrompts((prev) =>
        prev.map((entry) =>
          entry.prompt.id === promptId
            ? {
                ...entry,
                activeCollection: collection,
                pendingCollection: null,
                activeItems: items,
              }
            : entry
        )
      );
    } catch (err) {
      console.error('Execute error:', err);
      // Revert optimistic state
      setPrompts((prev) =>
        prev.map((entry) =>
          entry.prompt.id === promptId
            ? { ...entry, pendingCollection: null }
            : entry
        )
      );
      alert(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecutingId(null);
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
    const updated: Prompt = await res.json();

    setPrompts((prev) =>
      prev.map((entry) =>
        entry.prompt.id === promptId
          ? { ...entry, prompt: updated }
          : entry
      )
    );
  }, []);

  // Delete a prompt
  const handleDeletePrompt = useCallback(async (promptId: string) => {
    await fetch(`/api/prompts/${promptId}`, { method: 'DELETE' });
    setPrompts((prev) => prev.filter((e) => e.prompt.id !== promptId));
    if (selectedPromptId === promptId) {
      const remaining = prompts.filter((e) => e.prompt.id !== promptId);
      setSelectedPromptId(remaining[0]?.prompt.id ?? null);
    }
  }, [selectedPromptId, prompts]);

  // Update an item
  const handleUpdateItem = useCallback(async (
    promptId: string,
    itemId: string,
    updates: Partial<Pick<Item, 'title' | 'body' | 'type' | 'tags'>>
  ) => {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update item');
    const updated: Item = await res.json();

    setPrompts((prev) =>
      prev.map((entry) =>
        entry.prompt.id === promptId
          ? {
              ...entry,
              activeItems: entry.activeItems.map((item) =>
                item.id === itemId ? updated : item
              ),
            }
          : entry
      )
    );
  }, []);

  // Delete an item (soft delete)
  const handleDeleteItem = useCallback(async (promptId: string, itemId: string) => {
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    setPrompts((prev) =>
      prev.map((entry) =>
        entry.prompt.id === promptId
          ? {
              ...entry,
              activeItems: entry.activeItems.filter((item) => item.id !== itemId),
            }
          : entry
      )
    );
  }, []);

  const isExecuting = (id: string) => executingId === id;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--paper)]">
      {/* Sidebar */}
      <PromptSidebar
        prompts={prompts}
        selectedId={selectedPromptId}
        executingId={executingId}
        onSelect={setSelectedPromptId}
        onNewPrompt={() => setShowComposer(true)}
        onExecute={handleExecute}
        onDelete={handleDeletePrompt}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedEntry ? (
          <CollectionView
            entry={selectedEntry}
            isExecuting={isExecuting(selectedEntry.prompt.id)}
            onExecute={() => handleExecute(selectedEntry.prompt.id)}
            onUpdatePrompt={(text) => handleUpdatePrompt(selectedEntry.prompt.id, text)}
            onDeletePrompt={() => handleDeletePrompt(selectedEntry.prompt.id)}
            onUpdateItem={(itemId, updates) =>
              handleUpdateItem(selectedEntry.prompt.id, itemId, updates)
            }
            onDeleteItem={(itemId) => handleDeleteItem(selectedEntry.prompt.id, itemId)}
          />
        ) : (
          <EmptyState onNewPrompt={() => setShowComposer(true)} />
        )}
      </main>

      {/* New prompt modal */}
      {showComposer && (
        <PromptComposer
          onSubmit={handleCreatePrompt}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ onNewPrompt }: { onNewPrompt: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
      <div className="text-center max-w-md">
        <div className="font-display text-5xl font-bold text-[var(--ink)] mb-3 leading-tight">
          Law Connect - LLM-powered content generation and management
        </div>
        <p className="font-mono text-sm text-[var(--ink-muted)] leading-relaxed">
          Submit a prompt. Generate structured content. Refine and iterate.
        </p>
      </div>
      <button
        onClick={onNewPrompt}
        className="flex items-center gap-2 px-5 py-3 bg-[var(--ink)] text-[var(--paper)] font-mono text-sm
                   hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors duration-150"
      >
        <span className="text-[var(--amber)] group-hover:text-[var(--ink)]">+</span>
        New Prompt
      </button>
      <div className="font-mono text-xs text-[var(--ink-faint)] text-center leading-relaxed max-w-sm">
        Your prompts and generated content will appear here.<br />
        Each prompt maintains a full history of generations.
      </div>
    </div>
  );
}
