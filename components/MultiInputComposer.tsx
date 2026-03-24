'use client';

import { useState, useRef, useEffect } from 'react';

interface MultiInputComposerProps {
  onSubmit: (texts: string[]) => Promise<void>;
  onClose: () => void;
}

export function MultiInputComposer({ onSubmit, onClose }: MultiInputComposerProps) {
  const [inputs, setInputs] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[currentFocusIndex]?.focus();
  }, [currentFocusIndex]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAddInput = () => {
    setInputs([...inputs, '']);
    setCurrentFocusIndex(inputs.length);
  };

  const handleRemoveInput = (index: number) => {
    if (inputs.length > 1) {
      const newInputs = inputs.filter((_, i) => i !== index);
      setInputs(newInputs);
      if (currentFocusIndex >= newInputs.length) {
        setCurrentFocusIndex(newInputs.length - 1);
      }
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
  };

  const handleSubmit = async () => {
    const validInputs = inputs.filter((text) => text.trim());
    if (validInputs.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(validInputs);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalChars = inputs.reduce((sum, text) => sum + text.length, 0);
  const totalWords = inputs.reduce((sum, text) => sum + (text.trim() ? text.trim().split(/\s+/).length : 0), 0);
  const validInputCount = inputs.filter((text) => text.trim()).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)] bg-opacity-70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl mx-4 bg-[var(--paper)] border border-[var(--border-strong)] shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--paper)]">
          <span className="font-mono text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
            Batch Prompt Generator
          </span>
          <button
            onClick={onClose}
            className="font-mono text-lg text-[var(--ink-muted)] hover:text-[var(--ink)] leading-none"
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <div className="px-5 py-3 bg-[var(--cream)] border-b border-[var(--border)]">
          <p className="font-mono text-xs text-[var(--ink-muted)]">
            Add multiple prompts below. They'll be processed sequentially and consolidated into one collection.
          </p>
        </div>

        {/* Input areas */}
        <div className="px-5 py-4 space-y-4">
          {inputs.map((text, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-semibold text-[var(--ink-muted)] uppercase">
                  Input {index + 1}
                </label>
                {inputs.length > 1 && (
                  <button
                    onClick={() => handleRemoveInput(index)}
                    className="font-mono text-xs px-2 py-1 border border-[var(--border)] text-[var(--ink-faint)]
                               hover:border-[var(--red)] hover:text-[var(--red)] transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <textarea
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                value={text}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
                placeholder={`Enter your prompt here…`}
                rows={5}
                disabled={isSubmitting}
                className="w-full font-mono text-sm text-[var(--ink)] bg-transparent placeholder-[var(--ink-faint)]
                           resize-none focus:outline-none leading-relaxed border border-[var(--border)]
                           p-3 focus:border-[var(--amber)]"
              />
            </div>
          ))}
        </div>

        {/* Add input button */}
        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--cream)]">
          <button
            onClick={handleAddInput}
            disabled={isSubmitting}
            className="w-full py-2 font-mono text-xs border-2 border-dashed border-[var(--border)]
                       text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add another input
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--cream)]">
          <span className="font-mono text-[10px] text-[var(--ink-faint)]">
            {validInputCount > 0 ? `${totalWords}w · ${totalChars}c · ${validInputCount} input${validInputCount !== 1 ? 's' : ''}` : 'No inputs yet'}
            <span className="ml-3 opacity-60">⌘↵ to submit all</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 font-mono text-xs border border-[var(--border-strong)] text-[var(--ink-muted)]
                         hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors disabled:opacity-40
                         disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={validInputCount === 0 || isSubmitting}
              className="px-4 py-2 font-mono text-xs bg-[var(--ink)] text-[var(--paper)]
                         hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>Submit All ({validInputCount})</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
