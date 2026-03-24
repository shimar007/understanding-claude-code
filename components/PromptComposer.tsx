'use client';

import { useState, useEffect, useRef } from 'react';

interface PromptComposerProps {
  onSubmit: (text: string, execute: boolean) => Promise<void>;
  onClose: () => void;
  onAddToQueue?: (text: string) => Promise<void>;
  initialText?: string;
  showQueueOption?: boolean;
}

export function PromptComposer({ onSubmit, onClose, onAddToQueue, initialText = '', showQueueOption = false }: PromptComposerProps) {
  const [text, setText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (execute: boolean) => {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(text.trim(), execute);
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)] bg-opacity-70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl mx-4 bg-[var(--paper)] border border-[var(--border-strong)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <span className="font-mono text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
            New Prompt
          </span>
          <button
            onClick={onClose}
            className="font-mono text-lg text-[var(--ink-muted)] hover:text-[var(--ink)] leading-none"
          >
            ×
          </button>
        </div>

        {/* Textarea */}
        <div className="px-5 py-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(true);
              }
            }}
            placeholder="Describe what you want to generate…&#10;&#10;Examples:&#10;— Key insights from recent AI research on reasoning models&#10;— Actionable steps to improve team communication&#10;— Questions to ask when evaluating a startup"
            rows={9}
            disabled={isSubmitting}
            className="w-full font-mono text-sm text-[var(--ink)] bg-transparent placeholder-[var(--ink-faint)]
                       resize-none focus:outline-none leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--cream)]">
          <span className="font-mono text-[10px] text-[var(--ink-faint)]">
            {wordCount > 0 ? `${wordCount}w · ${charCount}c` : 'Start typing…'}
            <span className="ml-3 opacity-60">⌘↵ to save & run</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={!text.trim() || isSubmitting}
              className="px-4 py-2 font-mono text-xs border border-[var(--border-strong)] text-[var(--ink-muted)]
                         hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors disabled:opacity-40
                         disabled:cursor-not-allowed"
            >
              Save Only
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={!text.trim() || isSubmitting}
              className="px-4 py-2 font-mono text-xs bg-[var(--ink)] text-[var(--paper)]
                         hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                  Running…
                </>
              ) : (
                <>Save & Run ▶</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
