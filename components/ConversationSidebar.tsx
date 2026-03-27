'use client';

import { useState } from 'react';
import type { ConversationWithPrompts } from '@/app/page';

interface ConversationSidebarProps {
  conversations: ConversationWithPrompts[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  onDelete,
}: ConversationSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <aside className="w-72 flex flex-col border-r border-[var(--border)] bg-[var(--cream)] overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[var(--amber)] rounded-full" />
          <span className="font-display font-bold text-base tracking-tight text-[var(--ink)]">
            LLM
          </span>
        </div>
        <button
          onClick={onNewConversation}
          title="New conversation"
          className="w-6 h-6 flex items-center justify-center text-[var(--ink-muted)]
                     hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors duration-100
                     font-mono text-lg leading-none"
        >
          +
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-mono text-xs text-[var(--ink-faint)]">No conversations yet</p>
          </div>
        ) : (
          <ul className="py-1">
            {conversations.map((entry) => {
              const isSelected = entry.conversation.id === selectedId;
              const promptCount = entry.prompts.length;

              return (
                <li
                  key={entry.conversation.id}
                  onMouseEnter={() => setHoveredId(entry.conversation.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[var(--ink-faint)] text-[var(--ink)]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                  onClick={() => onSelect(entry.conversation.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-semibold text-current truncate">
                      {entry.prompts.length > 0
                        ? entry.prompts[0].prompt.text
                        : entry.conversation.title || 'Untitled'}
                    </div>
                    <div className="font-mono text-xs text-current opacity-70">
                      {promptCount} {promptCount === 1 ? 'prompt' : 'prompts'}
                    </div>
                  </div>

                  {/* Delete button */}
                  {(isSelected || hoveredId === entry.conversation.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(entry.conversation.id);
                      }}
                      className="w-5 h-5 flex items-center justify-center text-[var(--ink-muted)]
                                 hover:text-red-500 text-lg leading-none transition-colors"
                      title="Delete conversation"
                    >
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
