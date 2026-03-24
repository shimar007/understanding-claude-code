'use client';

import { useState } from 'react';
import type { PromptWithState } from './Studio';

interface PromptSidebarProps {
  prompts: PromptWithState[];
  selectedId: string | null;
  executingId: string | null;
  onSelect: (id: string) => void;
  onNewPrompt: () => void;
  onNewBatchPrompt?: () => void;
  onExecute: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PromptSidebar({
  prompts,
  selectedId,
  executingId,
  onSelect,
  onNewPrompt,
  onNewBatchPrompt,
  onExecute,
  onDelete,
}: PromptSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <aside className="w-72 flex flex-col border-r border-[var(--border)] bg-[var(--cream)] overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[var(--amber)] rounded-full" />
          <span className="font-display font-bold text-base tracking-tight text-[var(--ink)]">
            Law Connect
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewBatchPrompt}
            title="New batch prompt (multiple inputs)"
            className="w-6 h-6 flex items-center justify-center text-[var(--ink-muted)] text-xs font-mono
                       hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors duration-100 leading-none"
          >
            ≡
          </button>
          <button
            onClick={onNewPrompt}
            title="New single prompt"
            className="w-6 h-6 flex items-center justify-center text-[var(--ink-muted)]
                       hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors duration-100
                       font-mono text-lg leading-none"
          >
            +
          </button>
        </div>
      </div>

      {/* Prompts list */}
      <div className="flex-1 overflow-y-auto">
        {prompts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-mono text-xs text-[var(--ink-faint)]">No prompts yet</p>
          </div>
        ) : (
          <ul className="py-1">
            {prompts.map((entry) => {
              const isSelected = entry.prompt.id === selectedId;
              const isExecuting = entry.prompt.id === executingId;
              const isPending = isExecuting || entry.pendingCollection?.status === 'pending';
              const status = isPending
                ? 'pending'
                : entry.activeCollection?.status ?? 'draft';

              return (
                <li
                  key={entry.prompt.id}
                  onMouseEnter={() => setHoveredId(entry.prompt.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    onClick={() => onSelect(entry.prompt.id)}
                    className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors duration-100 group
                      ${isSelected
                        ? 'bg-[var(--ink)] text-[var(--paper)]'
                        : 'hover:bg-[var(--border)] text-[var(--ink)]'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span
                        className={`font-mono text-xs font-semibold truncate flex-1 leading-tight
                          ${isSelected ? 'text-[var(--amber)]' : 'text-[var(--ink-muted)]'}`}
                      >
                        {entry.prompt.text.slice(0, 48)}
                        {entry.prompt.text.length > 48 ? '…' : ''}
                      </span>

                      {/* Action buttons on hover */}
                      {hoveredId === entry.prompt.id && !isSelected && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); onExecute(entry.prompt.id); }}
                            className="font-mono text-xs px-1.5 py-0.5 bg-[var(--ink)] text-[var(--paper)]
                                       hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors"
                            title="Run"
                          >
                            ▶
                          </span>
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this prompt and all its generated content?')) {
                                onDelete(entry.prompt.id);
                              }
                            }}
                            className="font-mono text-xs px-1.5 py-0.5 text-[var(--ink-muted)]
                                       hover:bg-[var(--red)] hover:text-white transition-colors"
                            title="Delete"
                          >
                            ×
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusDot status={status} isSelected={isSelected} />
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider
                          ${isSelected ? 'text-[var(--paper)] opacity-60' : 'text-[var(--ink-faint)]'}`}
                      >
                        {isPending ? 'running…' : status}
                      </span>
                      {entry.activeItems.length > 0 && (
                        <span
                          className={`ml-auto font-mono text-[10px]
                            ${isSelected ? 'text-[var(--paper)] opacity-60' : 'text-[var(--ink-faint)]'}`}
                        >
                          {entry.activeItems.length} items
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[var(--border)]">
        <p className="font-mono text-[10px] text-[var(--ink-faint)]">
          {prompts.length} prompt{prompts.length !== 1 ? 's' : ''}
        </p>
      </div>
    </aside>
  );
}

function StatusDot({
  status,
  isSelected,
}: {
  status: string;
  isSelected: boolean;
}) {
  const colors: Record<string, string> = {
    pending: 'bg-[var(--amber)] animate-pulse',
    completed: 'bg-[var(--green)]',
    failed: 'bg-[var(--red)]',
    archived: 'bg-[var(--ink-faint)]',
    draft: isSelected ? 'bg-[var(--paper)] opacity-40' : 'bg-[var(--ink-faint)]',
  };

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colors[status] ?? colors.draft}`}
    />
  );
}
