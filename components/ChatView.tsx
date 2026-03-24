'use client';

import { useState, useRef, useEffect } from 'react';
import type { PromptWithState, ConversationWithPrompts } from '@/app/page';

interface ChatViewProps {
  conversation: ConversationWithPrompts;
  executingPromptId: string | null;
  onCreatePrompt: () => void;
  onExecute: (promptId: string) => void;
  onCancelExecute: (promptId: string) => void;
  onUpdatePrompt: (promptId: string, text: string) => void;
  onDeletePrompt: (promptId: string) => void;
  onUpdateItem: (promptId: string, itemId: string, updates: any) => void;
  onDeleteItem: (promptId: string, itemId: string) => void;
}

export function ChatView({
  conversation,
  executingPromptId,
  onCreatePrompt,
  onExecute,
  onCancelExecute,
  onUpdatePrompt,
  onDeletePrompt,
  onUpdateItem,
  onDeleteItem,
}: ChatViewProps) {
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.prompts]);

  const handleSaveEdit = async (promptId: string) => {
    if (editingText.trim()) {
      await onUpdatePrompt(promptId, editingText.trim());
      setEditingPromptId(null);
      setEditingText('');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--paper)]">
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">
          {conversation.prompts.length > 0
            ? conversation.prompts[0].prompt.text
            : conversation.conversation.title}
        </h1>
        <p className="font-mono text-xs text-[var(--ink-muted)] mt-1">
          {conversation.prompts.length} {conversation.prompts.length === 1 ? 'message' : 'messages'}
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {conversation.prompts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="font-mono text-sm text-[var(--ink-faint)] mb-4">
                No messages yet. Start the conversation!
              </p>
              <button
                onClick={onCreatePrompt}
                className="px-4 py-2 bg-[var(--ink)] text-[var(--paper)] font-mono text-xs
                           hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors"
              >
                Send First Message
              </button>
            </div>
          </div>
        ) : (
          <>
            {conversation.prompts.map((promptState) => {
              const isExecuting = executingPromptId === promptState.prompt.id;
              const hasResponse = promptState.activeCollection !== null;

              return (
                <div key={promptState.prompt.id} className="space-y-2">
                  {/* User message (prompt) */}
                  <div className="flex justify-end">
                    <div className="max-w-xl">
                      {editingPromptId === promptState.prompt.id ? (
                        <div className="bg-[var(--ink)] text-[var(--paper)] rounded-lg p-4 space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-[var(--paper)] text-[var(--ink)] font-mono text-sm
                                     p-2 rounded border border-[var(--border)] focus:outline-none
                                     focus:ring-2 focus:ring-[var(--amber)]"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setEditingPromptId(null);
                                setEditingText('');
                              }}
                              className="px-3 py-1 bg-[var(--paper)] text-[var(--ink)] font-mono text-xs
                                       rounded hover:bg-[var(--ink-faint)] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(promptState.prompt.id)}
                              className="px-3 py-1 bg-[var(--amber)] text-[var(--ink)] font-mono text-xs
                                       rounded hover:opacity-80 transition-opacity"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="bg-[var(--ink)] text-[var(--paper)] rounded-lg p-4 group cursor-pointer
                                   hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setEditingPromptId(promptState.prompt.id);
                            setEditingText(promptState.prompt.text);
                          }}
                        >
                          <p className="font-mono text-sm leading-relaxed">{promptState.prompt.text}</p>
                          <div className="flex gap-2 mt-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExecute(promptState.prompt.id);
                              }}
                              className="px-2 py-1 bg-[var(--amber)] text-[var(--ink)] rounded
                                       hover:bg-opacity-80 transition-opacity"
                            >
                              {isExecuting ? 'Executing...' : 'Execute'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePrompt(promptState.prompt.id);
                              }}
                              className="px-2 py-1 bg-red-500 text-white rounded
                                       hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI response */}
                  {isExecuting && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--cream)] text-[var(--ink)] rounded-lg p-4 max-w-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[var(--ink)] rounded-full animate-bounce" />
                          <span className="font-mono text-sm text-[var(--ink-muted)]">
                            Generating response...
                          </span>
                        </div>
                        <button
                          onClick={() => onCancelExecute(promptState.prompt.id)}
                          className="mt-3 px-3 py-1 bg-red-500 text-white font-mono text-xs rounded
                                   hover:bg-red-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {hasResponse && !isExecuting && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--cream)] text-[var(--ink)] rounded-lg p-4 max-w-xl">
                        <div className="space-y-2">
                          {promptState.activeItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-2 bg-[var(--paper)] rounded border border-[var(--border)]
                                       group hover:border-[var(--ink-muted)] transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-semibold text-[var(--ink-muted)]">
                                    {item.type}
                                  </span>
                                  {item.tags && (
                                    <span className="font-mono text-xs text-[var(--ink-faint)]">
                                      {item.tags}
                                    </span>
                                  )}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button
                                    onClick={() =>
                                      onDeleteItem(promptState.prompt.id, item.id)
                                    }
                                    className="text-red-500 hover:text-red-600 text-sm"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                              <h4 className="font-semibold text-sm text-[var(--ink)] mb-1">
                                {item.title}
                              </h4>
                              <p className="font-mono text-xs text-[var(--ink-muted)] leading-relaxed whitespace-pre-wrap">
                                {item.body}
                              </p>
                            </div>
                          ))}
                        </div>
                        {promptState.activeCollection && (
                          <div className="mt-3 pt-2 border-t border-[var(--border)]">
                            <p className="font-mono text-xs text-[var(--ink-faint)]">
                              {promptState.activeCollection.inputTokens} input •{' '}
                              {promptState.activeCollection.outputTokens} output •{' '}
                              {promptState.activeCollection.durationMs}ms
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--paper)]">
        <button
          onClick={onCreatePrompt}
          className="w-full px-4 py-3 bg-[var(--ink)] text-[var(--paper)] font-mono text-sm
                   rounded hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors"
        >
          + Send Message
        </button>
      </div>
    </div>
  );
}
