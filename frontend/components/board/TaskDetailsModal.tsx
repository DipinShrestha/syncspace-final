// frontend/components/board/TaskDetailsModal.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Editor from '@monaco-editor/react';
import { updateCard } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface Member {
  _id: string;
  name: string;
}

interface Comment {
  _id: string;
  text: string;
  author: { _id: string; name: string };
  createdAt: string;
}

interface Card {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
  assignedTo?: string;
  code?: string;
  codeFileUrl?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  members: Member[];
  onCardUpdated: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function TaskDetailsModal({ isOpen, onClose, card, members, onCardUpdated }: Props) {
  const { user } = useAuth();

  // Rendered via a portal straight into document.body (see the return
  // statement below) instead of in place inside the board column. Board
  // columns now use backdrop-blur for the glass look, and any ancestor
  // with backdrop-filter/transform/filter creates a new CSS containing
  // block — which silently turns this modal's `position: fixed` into
  // something scoped to that small column instead of the viewport. That's
  // exactly the "opens in a tiny fixed box" bug. Portaling out of the DOM
  // tree entirely sidesteps it. `mounted` just avoids touching
  // `document` during server rendering.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── permission: only the assigned member can edit/write code/upload ──────
  const isAssigned = !!user && card.assignedTo === user._id;

  // ── editable fields (only used when isAssigned) ───────────────────────────
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [dueDate, setDueDate] = useState(card.dueDate ?? '');
  const [labels, setLabels] = useState(card.labels?.join(', ') ?? '');
  const [assignedTo, setAssignedTo] = useState(card.assignedTo ?? '');
  const [code, setCode] = useState(card.code ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── comments (everyone can see + post) ───────────────────────────────────
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPosting] = useState(false);
  const [loadingComments, setLoadingC] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ── code & attachment panel is collapsed by default ───────────────────────
  // Simplification: most cards ("hello", "frontend", etc.) never touch code
  // or file attachments, so forcing a full Monaco editor open on every card
  // made the modal feel heavy and cluttered. Now it only auto-opens when the
  // card already has code/a file attached; otherwise it's a one-line toggle.
  const [showCode, setShowCode] = useState(!!(card.code || card.codeFileUrl));
  useEffect(() => {
    setShowCode(!!(card.code || card.codeFileUrl));
  }, [card._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // re-sync when a different card is opened
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description ?? '');
    setDueDate(card.dueDate ?? '');
    setLabels(card.labels?.join(', ') ?? '');
    setAssignedTo(card.assignedTo ?? '');
    setCode(card.code ?? '');
  }, [card]);

  // fetch comments on open
  useEffect(() => {
    if (!isOpen) return;
    setLoadingC(true);
    fetch(`${API}/cards/${card._id}/comments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load comments'))
      .finally(() => setLoadingC(false));
  }, [isOpen, card._id]);

  // scroll to bottom when new comment arrives
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ── file upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // save the url on the card immediately
      await updateCard(card._id, { codeFileUrl: data.url });
      setCode((prev) => prev + `\n\n// Uploaded file: ${data.url}\n`);
      toast.success('File uploaded');
      onCardUpdated();
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── save card ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCard(card._id, {
        title,
        description,
        dueDate: dueDate || undefined,
        labels: labels
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        assignedTo: assignedTo || undefined,
        code,
      });
      toast.success('Card updated');
      onCardUpdated();
      onClose();
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  // ── post comment ──────────────────────────────────────────────────────────
  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${API}/cards/${card._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ text: commentText }),
      });
      if (!res.ok) throw new Error();
      const newComment: Comment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  // ── delete own comment ────────────────────────────────────────────────────
  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`${API}/cards/${card._id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const assignedMemberName = members.find((m) => m._id === card.assignedTo)?.name;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="modal-panel bg-white border border-gray-200 rounded-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-black break-words">
                {card.title}
              </h2>
              {assignedMemberName && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Assigned to{' '}
                  <span className="text-xs text-black bg-dusty-600 px-2 py-0.5 rounded-full font-medium">
                    {assignedMemberName}
                  </span>
                </p>
              )}
            </div>
            {isAssigned ? (
              <span className="flex-shrink-0 text-xs bg-sage-600 text-black px-2 py-1 rounded-full font-medium">
                Editable
              </span>
            ) : (
              <span className="flex-shrink-0 text-xs bg-gray-100 text-black px-2 py-1 rounded-full font-medium">
                View only
              </span>
            )}
          </div>

          {/* ── DETAILS — plain fields, no boxed grid to reduce visual noise ── */}
          {isAssigned ? (
            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full glass-input rounded-lg p-2.5 transition-colors"
                placeholder="Title"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Add a description…"
                className="w-full glass-input rounded-lg p-2.5 text-sm transition-colors"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Due date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full glass-input rounded-lg p-2 text-sm transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Assign to</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full glass-input rounded-lg p-2 text-sm transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Labels</label>
                <input
                  type="text"
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  placeholder="bug, feature, urgent"
                  className="w-full glass-input rounded-lg p-2 text-sm transition-colors"
                />
              </div>
            </div>
          ) : (
            /* READ-ONLY view of description / labels / due date */
            (card.description || card.dueDate || (card.labels && card.labels.length > 0)) && (
              <div className="space-y-2 text-sm text-gray-700">
                {card.description && <p>{card.description}</p>}
                <div className="flex items-center gap-3 flex-wrap">
                  {card.dueDate && (
                    <span className="text-gray-500 text-xs">
                      Due {new Date(card.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {card.labels && card.labels.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {card.labels.map((l) => (
                        <span
                          key={l}
                          className="px-2 py-0.5 bg-gray-100 text-black rounded-full text-xs"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* ── CODE & ATTACHMENT — collapsed by default to keep simple cards
 simple; expands automatically if the card already has content. ── */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium">Code &amp; attachment</span>
              <span
                className={`text-gray-500 transition-transform ${showCode ? 'rotate-180' : ''}`}
              >
                ⌄
              </span>
            </button>

            {showCode && (
              <div className="p-3 pt-0 space-y-3 animate-fade-in-up border-t border-gray-200">
                {/* Monaco editor is intentionally kept dark (vs-dark theme) as an
                    accepted convention for code editors, independent of the
                    site's light theme — matching GitHub/VS Code docs. */}
                <div className="border border-gray-700 rounded-lg overflow-hidden mt-3">
                  <Editor
                    height="200px"
                    defaultLanguage="javascript"
                    value={code}
                    onChange={isAssigned ? (val) => setCode(val ?? '') : undefined}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      readOnly: !isAssigned,
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  {card.codeFileUrl ? (
                    <a
                      href={card.codeFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black font-medium hover:underline text-sm break-all"
                    >
                      📎 {card.codeFileUrl.split('/').pop()}
                    </a>
                  ) : (
                    <p className="text-gray-500 text-sm">No file uploaded yet.</p>
                  )}

                  {isAssigned && (
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".js,.ts,.py,.java,.cpp,.c,.cs,.go,.rb,.php,.html,.css,.json,.txt,.md,.zip,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="block w-full text-sm text-black bg-white border border-gray-300
 rounded-lg file:mr-3 file:py-1 file:px-3 file:rounded file:border-0
 file:text-sm file:bg-dusty-600 file:text-black hover:file:bg-dusty-700 transition-colors"
                      />
                      {uploading && (
                        <p className="text-xs text-gray-500 mt-1 animate-pulse">Uploading…</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── COMMENTS — everyone can read and post ─────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments{' '}
              {comments.length > 0 && <span className="text-gray-500">({comments.length})</span>}
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-3 mb-3">
              {loadingComments ? (
                <p className="text-gray-500 text-sm">Loading comments…</p>
              ) : comments.length === 0 ? (
                <p className="text-gray-500 text-sm">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-sage-600 flex-shrink-0 flex items-center justify-center text-black text-xs font-bold">
                      {c.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-black">{c.author.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                        {user && c.author._id === user._id && (
                          <button
                            onClick={() => handleDeleteComment(c._id)}
                            className="text-gray-400 hover:text-red-600 text-xs ml-auto"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Post comment input — available to all workspace members */}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                placeholder="Write a comment…"
                className="flex-1 glass-input rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handlePostComment}
                disabled={postingComment || !commentText.trim()}
                className="bg-dusty-600 hover:bg-dusty-700 active:scale-95 disabled:opacity-40 disabled:active:scale-100 text-black px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                {postingComment ? '…' : 'Post'}
              </button>
            </div>
          </div>

          {/* ── ACTION BUTTONS ────────────────────────────────────────────── */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-100 active:scale-95 transition-all text-sm font-medium"
            >
              Close
            </button>
            {isAssigned && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-dusty-600 hover:bg-dusty-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-lg text-black text-sm font-medium transition-all"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
