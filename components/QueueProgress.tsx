'use client';

import { useMemo } from 'react';
import type { Item } from '@/db/schema';

interface QueueProgressProps {
  items: Item[];
  isProcessing: boolean;
}

export function QueueProgress({ items, isProcessing }: QueueProgressProps) {
  const inputGroups = useMemo(() => {
    const groups: Map<string, Item[]> = new Map();

    items.forEach((item) => {
      const tags = item.tags?.split(',') ?? [];
      const inputTag = tags.find((t) => t.startsWith('input-'));

      if (inputTag) {
        if (!groups.has(inputTag)) {
          groups.set(inputTag, []);
        }
        groups.get(inputTag)?.push(item);
      }
    });

    return Array.from(groups.entries()).sort((a, b) => {
      const aNum = parseInt(a[0].split('-')[1]) || 0;
      const bNum = parseInt(b[0].split('-')[1]) || 0;
      return aNum - bNum;
    });
  }, [items]);

  if (inputGroups.length === 0) return null;

  return (
    <div className="px-6 py-4 bg-[var(--cream)] border-t border-[var(--border)]">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-xs font-semibold text-[var(--ink-muted)] uppercase">
            Batch Progress
          </p>
          {isProcessing && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin text-[var(--amber)]" />
              <span className="font-mono text-xs text-[var(--ink-muted)]">Processing…</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2">
          {inputGroups.map(([inputTag, groupItems]) => {
            const inputNum = parseInt(inputTag.split('-')[1]) || 0;
            const hasErrors = groupItems.some((item) => item.type === 'warning' && item.tags?.includes('error'));

            return (
              <div
                key={inputTag}
                className={`flex items-center gap-3 px-3 py-2 border rounded
                  ${hasErrors ? 'border-[var(--red)] bg-[#fdf0ef]' : 'border-[var(--border)] bg-[var(--paper)]'}`}
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--border)] font-mono text-xs font-semibold text-[var(--ink-muted)]">
                  {inputNum}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--ink-muted)] truncate">
                      Input {inputNum}
                    </span>
                    <span className="font-mono text-xs text-[var(--ink-faint)]">
                      {groupItems.length} item{groupItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {hasErrors && (
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center border border-[var(--red)] text-[var(--red)] font-mono text-xs font-bold">
                    !
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
