'use client';

import { useState, useRef, useEffect } from 'react';
import type { Item, ItemType } from '@/db/schema';

const TYPE_CONFIG: Record<
  ItemType,
  { label: string; color: string; bg: string; border: string }
> = {
  insight: {
    label: 'Insight',
    color: 'text-[#1a3a5c]',
    bg: 'bg-[#eef3f9]',
    border: 'border-[#b8cfe0]',
  },
  action: {
    label: 'Action',
    color: 'text-[#2d6a4f]',
    bg: 'bg-[#eef6f1]',
    border: 'border-[#b8d9c8]',
  },
  question: {
    label: 'Question',
    color: 'text-[#5c3a1a]',
    bg: 'bg-[#faf3ec]',
    border: 'border-[#e0c8a8]',
  },
  fact: {
    label: 'Fact',
    color: 'text-[#1a1a5c]',
    bg: 'bg-[#eeeef8]',
    border: 'border-[#c0c0e0]',
  },
  idea: {
    label: 'Idea',
    color: 'text-[#3a1a5c]',
    bg: 'bg-[#f3eef8]',
    border: 'border-[#c8b8e0]',
  },
  warning: {
    label: 'Warning',
    color: 'text-[#c0392b]',
    bg: 'bg-[#fdf0ef]',
    border: 'border-[#e8b8b4]',
  },
  summary: {
    label: 'Summary',
    color: 'text-[#1a3a3a]',
    bg: 'bg-[#eef6f6]',
    border: 'border-[#b8d8d8]',
  },
  response: {
    label: 'Response',
    color: 'text-[#1a5c3a]',
    bg: 'bg-[#eef9f3]',
    border: 'border-[#b8e0c8]',
  },
  followup: {
    label: 'Follow-up',
    color: 'text-[#5c1a3a]',
    bg: 'bg-[#f9eef3]',
    border: 'border-[#e0b8c8]',
  },
};

const ITEM_TYPES: ItemType[] = ['insight', 'action', 'question', 'fact', 'idea', 'warning', 'summary', 'response', 'followup'];

interface ItemCardProps {
  item: Item;
  onUpdate: (updates: Partial<Pick<Item, 'title' | 'body' | 'type' | 'tags'>>) => Promise<void>;
  onDelete: () => void;
  chatMode?: boolean;
  onFollowup?: (question: string) => void;
}

export function ItemCard({ item, onUpdate, onDelete, chatMode = false, onFollowup }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editTitle, setEditTitle] = useState(item.title);
  const [editBody, setEditBody] = useState(item.body);
  const [editType, setEditType] = useState<ItemType>(item.type as ItemType);
  const [editTags, setEditTags] = useState(item.tags ?? '');

  const titleRef = useRef<HTMLInputElement>(null);

  const config = TYPE_CONFIG[item.type as ItemType] ?? TYPE_CONFIG.insight;
  const editConfig = TYPE_CONFIG[editType] ?? TYPE_CONFIG.insight;

  const parsedTags = (item.tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const wasEdited = !!item.editedAt;

  useEffect(() => {
    if (isEditing) {
      titleRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onUpdate({
        title: editTitle,
        body: editBody,
        type: editType,
        tags: editTags.split(',').map((t) => t.trim()).filter(Boolean).join(','),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(item.title);
    setEditBody(item.body);
    setEditType(item.type as ItemType);
    setEditTags(item.tags ?? '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className={`item-reveal border ${chatMode ? 'bg-transparent border-transparent' : `${editConfig.border} bg-[var(--cream)]`} flex flex-col gap-0 overflow-hidden`}
      >
        {/* Type selector */}
        <div className={`px-4 pt-3 pb-2 ${chatMode ? 'bg-transparent' : editConfig.bg} border-b ${editConfig.border}`}>
          <div className="flex flex-wrap gap-1">
            {ITEM_TYPES.map((t) => {
              const tc = TYPE_CONFIG[t];
              return (
                <button
                  key={t}
                  onClick={() => setEditType(t)}
                  className={`px-2 py-0.5 font-mono text-[10px] border transition-all
                    ${editType === t
                      ? `${tc.bg} ${tc.color} ${tc.border} font-semibold`
                      : 'border-[var(--border)] text-[var(--ink-faint)] hover:border-[var(--border-strong)]'
                    }`}
                >
                  {tc.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* Title */}
          <input
            ref={titleRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="font-mono text-sm font-semibold text-[var(--ink)] bg-transparent border-b border-[var(--border)]
                       pb-1 focus:outline-none focus:border-[var(--amber)] w-full"
            placeholder="Title…"
          />

          {/* Body */}
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={5}
            className="font-mono text-xs text-[var(--ink)] bg-transparent resize-none focus:outline-none
                       leading-relaxed text-[var(--ink-muted)] border border-[var(--border)] p-2
                       focus:border-[var(--amber)]"
            placeholder="Body…"
          />

          {/* Tags */}
          <div>
            <label className="font-mono text-[10px] text-[var(--ink-faint)] uppercase tracking-wider block mb-1">
              Tags (comma-separated)
            </label>
            <input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              className="font-mono text-xs text-[var(--ink-muted)] bg-transparent border-b border-[var(--border)]
                         pb-1 focus:outline-none focus:border-[var(--amber)] w-full"
              placeholder="tag1, tag2…"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[var(--cream)] border-t border-[var(--border)]">
          <button
            onClick={handleCancel}
            className="font-mono text-xs px-3 py-1.5 border border-[var(--border)] text-[var(--ink-muted)]
                       hover:text-[var(--ink)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="font-mono text-xs px-3 py-1.5 bg-[var(--ink)] text-[var(--paper)]
                       hover:bg-[var(--amber)] hover:text-[var(--ink)] transition-colors
                       disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                Saving
              </>
            ) : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`item-reveal group ${chatMode ? 'bg-transparent border-transparent' : `border ${config.border} bg-[var(--cream)]`} flex flex-col
                  hover:shadow-md transition-shadow duration-200 overflow-hidden`}
    >
      {/* Type badge + actions */}
      <div className={`flex items-center justify-between px-4 pt-3 pb-2 ${chatMode ? 'bg-transparent' : config.bg}`}>
        <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${config.color}`}>
          {config.label}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {wasEdited && (
            <span className="font-mono text-[9px] text-[var(--ink-faint)] mr-1">edited</span>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="font-mono text-[10px] px-1.5 py-0.5 text-[var(--ink-muted)]
                       hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
            title="Edit"
          >
            ✎
          </button>
          {showDeleteConfirm ? (
            <span className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="font-mono text-[10px] px-1.5 py-0.5 bg-[var(--red)] text-white"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="font-mono text-[10px] px-1.5 py-0.5 text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                ×
              </button>
            </span>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="font-mono text-[10px] px-1.5 py-0.5 text-[var(--ink-muted)]
                         hover:bg-[var(--red)] hover:text-white transition-colors"
              title="Delete"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 flex-1">
        <h3 className="font-display text-sm font-semibold text-[var(--ink)] leading-tight mb-2">
          {item.title}
        </h3>
        <p className="font-mono text-xs text-[var(--ink-muted)] leading-relaxed">
          {item.body}
        </p>
        {item.type === 'followup' && onFollowup && (
          <button
            onClick={() => onFollowup(item.body)}
            className="mt-2 px-3 py-1 font-mono text-xs bg-[var(--amber)] text-[var(--ink)]
                       hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          >
            Ask this question
          </button>
        )}
      </div>

      {/* Tags */}
      {parsedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {parsedTags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5
                         bg-[var(--border)] text-[var(--ink-faint)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
