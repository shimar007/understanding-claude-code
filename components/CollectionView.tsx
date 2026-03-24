'use client';

import { useState, useEffect } from 'react';
import type { Item } from '@/db/schema';
import type { PromptWithState } from './Studio';
import { ItemCard } from './ItemCard';
import { PromptComposer } from './PromptComposer';
import { QueueProgress } from './QueueProgress';

interface CollectionViewProps {
  entry: PromptWithState;
  isExecuting: boolean;
  onExecute: () => void;
  onCancelExecute: () => void;
  onUpdatePrompt: (text: string) => Promise<void>;
  onDeletePrompt: () => void;
  onUpdateItem: (itemId: string, updates: Partial<Pick<Item, 'title' | 'body' | 'type' | 'tags'>>) => Promise<void>;
  onDeleteItem: (itemId: string) => void;
  onCreateFollowupPrompt: (text: string, execute: boolean) => Promise<void>;
}

export function CollectionView({
  entry,
  isExecuting,
  onExecute,
  onCancelExecute,
  onUpdatePrompt,
  onDeletePrompt,
  onUpdateItem,
  onDeleteItem,
  onCreateFollowupPrompt,
}: CollectionViewProps) {
  const [showEditComposer, setShowEditComposer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFollowupComposer, setShowFollowupComposer] = useState(false);
  const [formattedTime, setFormattedTime] = useState('');
  const { prompt, activeCollection, activeItems } = entry;
  const isPending = isExecuting || entry.pendingCollection?.status === 'pending';

  const handleEditSubmit = async (text: string, execute: boolean) => {
    await onUpdatePrompt(text);
    setShowEditComposer(false);
    if (execute) {
      onExecute();
    }
  };

  useEffect(() => {
    if (activeCollection?.completedAt) {
      setFormattedTime(new Date(activeCollection.completedAt).toLocaleTimeString());
    }
  }, [activeCollection?.completedAt]);

  const sortedItems = [...activeItems].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Prompt bar */}
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--cream)]">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] text-[var(--ink-faint)] uppercase tracking-wider mb-1.5">
                Prompt
              </div>
              <p className="font-mono text-sm text-[var(--ink)] leading-relaxed">
                {prompt.text}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-4">
              <button
                onClick={() => setShowEditComposer(true)}
                className="px-3 py-1.5 font-mono text-xs border border-[var(--border)] text-[var(--ink-muted)]
                           hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors"
              >
                Edit
              </button>
              {isPending ? (
                <>
                  <button
                    onClick={onExecute}
                    disabled={true}
                    className="px-3 py-1.5 font-mono text-xs bg-[var(--ink)] text-[var(--paper)]
                               hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                    Running
                  </button>
                  <button
                    onClick={onCancelExecute}
                    className="px-3 py-1.5 font-mono text-xs border border-[var(--border)] text-[var(--ink-muted)]
                               hover:border-[var(--red)] hover:text-[var(--red)] transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={onExecute}
                  disabled={false}
                  className="px-3 py-1.5 font-mono text-xs bg-[var(--ink)] text-[var(--paper)]
                             hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  ▶ Run
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 font-mono text-xs border border-[var(--border)] text-[var(--ink-faint)]
                           hover:border-[var(--red)] hover:text-[var(--red)] transition-colors"
                title="Delete prompt"
              >
                ×
              </button>
            </div>
          </div>

          {/* Collection metadata */}
          {activeCollection && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
              <MetaChip label="Status" value={activeCollection.status} />
              {activeCollection.durationMs && (
                <MetaChip label="Duration" value={`${(activeCollection.durationMs / 1000).toFixed(1)}s`} />
              )}
              {activeCollection.inputTokens && (
                <MetaChip
                  label="Tokens"
                  value={`${activeCollection.inputTokens}↑ ${activeCollection.outputTokens}↓`}
                />
              )}
              {activeCollection.completedAt && formattedTime && (
                <MetaChip
                  label="Generated"
                  value={formattedTime}
                />
              )}
              <div className="ml-auto">
                <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                  {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
          {/* User message */}
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-[var(--ink)] text-[var(--paper)] px-4 py-3 rounded-2xl rounded-br-md">
              <p className="font-mono text-sm leading-relaxed">{prompt.text}</p>
            </div>
          </div>

          {/* Status messages */}
          {isPending ? (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-[var(--cream)] border border-[var(--border)] rounded-2xl rounded-bl-md p-4">
                <PendingState />
              </div>
            </div>
          ) : activeCollection?.status === 'failed' ? (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-[var(--cream)] border border-[var(--border)] rounded-2xl rounded-bl-md p-4">
                <FailedState
                  message={activeCollection.errorMessage}
                  onRetry={onExecute}
                />
              </div>
            </div>
          ) : sortedItems.length > 0 ? (
            <>
              {sortedItems.map((item) => (
                <div key={item.id} className="flex justify-start">
                  <div className="max-w-[80%] bg-[var(--cream)] border border-[var(--border)] rounded-2xl rounded-bl-md overflow-hidden">
                    <ItemCard
                      item={item}
                      onUpdate={(updates) => onUpdateItem(item.id, updates)}
                      onDelete={() => onDeleteItem(item.id)}
                      chatMode={true}
                      onFollowup={(question) => onCreateFollowupPrompt(question, true)}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-[var(--cream)] border border-[var(--border)] rounded-2xl rounded-bl-md p-4">
                <NoContentState onExecute={onExecute} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Queue progress (for batch prompts) */}
      {activeItems.length > 0 && activeCollection?.promptSnapshot?.includes('[Input') && (
        <QueueProgress items={activeItems} isProcessing={isPending} />
      )}

      {/* Follow-up input */}
      {activeCollection && activeCollection.status === 'completed' && (
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--cream)] p-4">
          <div className="max-w-4xl mx-auto">
            {!showFollowupComposer ? (
              <button
                onClick={() => setShowFollowupComposer(true)}
                className="w-full py-3 px-4 font-mono text-sm text-[var(--ink-muted)] border-2 border-dashed border-[var(--border)]
                           hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors text-center"
              >
                Ask a follow-up question…
              </button>
            ) : (
              <div className="space-y-3">
                <PromptComposer
                  onSubmit={async (text, execute) => {
                    await onCreateFollowupPrompt(text, execute);
                    setShowFollowupComposer(false);
                  }}
                  onClose={() => setShowFollowupComposer(false)}
                  initialText=""
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit prompt modal */}
      {showEditComposer && (
        <PromptComposer
          initialText={prompt.text}
          onSubmit={handleEditSubmit}
          onClose={() => setShowEditComposer(false)}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)] bg-opacity-70"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-96 mx-4 bg-[var(--paper)] border border-[var(--border-strong)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-[var(--ink)] mb-2">
              Delete Prompt?
            </h3>
            <p className="font-mono text-xs text-[var(--ink-muted)] leading-relaxed mb-6">
              This will permanently delete the prompt and all its generated content,
              including all previous versions.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 font-mono text-xs border border-[var(--border)] text-[var(--ink-muted)]
                           hover:text-[var(--ink)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDeletePrompt(); setShowDeleteConfirm(false); }}
                className="px-4 py-2 font-mono text-xs bg-[var(--red)] text-white
                           hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] text-[var(--ink-faint)] uppercase tracking-wider">
        {label}
      </span>
      <span className="font-mono text-[10px] text-[var(--ink-muted)] font-medium">
        {value}
      </span>
    </div>
  );
}

function PendingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-6">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-[var(--border)] rounded-full" />
        <div className="absolute inset-0 border-2 border-[var(--amber)] border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-mono text-sm text-[var(--ink-muted)] mb-1">Generating…</p>
        <p className="font-mono text-xs text-[var(--ink-faint)]">
          The model is processing your prompt
        </p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1 h-1 bg-[var(--amber)] rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function FailedState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-10 h-10 flex items-center justify-center border-2 border-[var(--red)] text-[var(--red)] font-mono text-lg font-bold">
        !
      </div>
      <div className="text-center max-w-md">
        <p className="font-mono text-sm font-semibold text-[var(--red)] mb-2">Generation Failed</p>
        {message && (
          <p className="font-mono text-xs text-[var(--ink-muted)] leading-relaxed bg-[var(--cream)] px-4 py-2 border border-[var(--border)]">
            {message}
          </p>
        )}
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 font-mono text-xs bg-[var(--ink)] text-[var(--paper)]
                   hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors"
      >
        ▶ Retry
      </button>
    </div>
  );
}

function NoContentState({ onExecute }: { onExecute: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 border border-dashed border-[var(--border-strong)] flex items-center justify-center">
        <span className="font-mono text-2xl text-[var(--ink-faint)]">∅</span>
      </div>
      <div className="text-center">
        <p className="font-mono text-sm text-[var(--ink-muted)] mb-1">No content yet</p>
        <p className="font-mono text-xs text-[var(--ink-faint)]">
          Run this prompt to generate structured content
        </p>
      </div>
      <button
        onClick={onExecute}
        className="px-4 py-2 font-mono text-xs bg-[var(--ink)] text-[var(--paper)]
                   hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors"
      >
        ▶ Run Prompt
      </button>
    </div>
  );
}
