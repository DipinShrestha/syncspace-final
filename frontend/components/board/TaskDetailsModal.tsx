// frontend/components/board/TaskDetailsModal.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { updateCard } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface Member { _id: string; name: string; }

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

  // ── permission: only the assigned member can edit/write code/upload ──────
  const isAssigned = !!user && card.assignedTo === user._id;

  // ── editable fields (only used when isAssigned) ───────────────────────────
  const [title,       setTitle]       = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [dueDate,     setDueDate]     = useState(card.dueDate ?? '');
  const [labels,      setLabels]      = useState(card.labels?.join(', ') ?? '');
  const [assignedTo,  setAssignedTo]  = useState(card.assignedTo ?? '');
  const [code,        setCode]        = useState(card.code ?? '');
  const [uploading,   setUploading]   = useState(false);
  const [saving,      setSaving]      = useState(false);

  // ── comments (everyone can see + post) ───────────────────────────────────
  const [comments,     setComments]     = useState<Comment[]>([]);
  const [commentText,  setCommentText]  = useState('');
  const [postingComment, setPosting]   = useState(false);
  const [loadingComments, setLoadingC] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

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
        labels: labels.split(',').map((l) => l.trim()).filter(Boolean),
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

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="modal-panel bg-gray-900 rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 space-y-5">

          {/* Header */}
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white break-words">{card.title}</h2>
              {assignedMemberName && (
                <p className="text-sm text-gray-400 mt-0.5">
                  👤 Assigned to <span className="text-blue-400">{assignedMemberName}</span>
                </p>
              )}
            </div>
            {isAssigned ? (
              <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded-full">
                ✎ You can edit
              </span>
            ) : (
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded-full">
                👁 View only
              </span>
            )}
          </div>

          {/* ── EDIT FIELDS — assigned member only ─────────────────────── */}
          {isAssigned ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                placeholder="Title"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Description"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Labels (comma-separated)</label>
                  <input
                    type="text"
                    value={labels}
                    onChange={(e) => setLabels(e.target.value)}
                    placeholder="bug, feature, urgent"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Assign To</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            /* READ-ONLY view of description / labels / due date */
            <div className="space-y-2 text-sm text-gray-300">
              {card.description && <p>{card.description}</p>}
              {card.labels && card.labels.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {card.labels.map((l) => (
                    <span key={l} className="px-2 py-0.5 bg-gray-700 rounded-full text-xs">{l}</span>
                  ))}
                </div>
              )}
              {card.dueDate && (
                <p className="text-gray-400 text-xs">📅 Due {new Date(card.dueDate).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {/* ── CODE EDITOR — everyone sees, only assigned edits ─────────── */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Code {!isAssigned && <span className="text-gray-500">(read-only)</span>}
            </label>
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <Editor
                height="280px"
                defaultLanguage="javascript"
                value={code}
                onChange={isAssigned ? (val) => setCode(val ?? '') : undefined}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  readOnly: !isAssigned,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>

          {/* ── FILE UPLOAD — assigned member only; everyone sees the link ── */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Uploaded File</label>
            {card.codeFileUrl ? (
              <a
                href={card.codeFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm break-all"
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
                  className="block w-full text-sm text-gray-300 bg-gray-800 border border-gray-700
                             rounded-lg file:mr-3 file:py-1 file:px-3 file:rounded file:border-0
                             file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {uploading && (
                  <p className="text-xs text-gray-400 mt-1 animate-pulse">Uploading…</p>
                )}
              </div>
            )}
          </div>

          {/* ── COMMENTS — everyone can read and post ─────────────────────── */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Comments ({comments.length})
            </label>
            <div className="bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto space-y-3 mb-3">
              {loadingComments ? (
                <p className="text-gray-500 text-sm">Loading comments…</p>
              ) : comments.length === 0 ? (
                <p className="text-gray-500 text-sm">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                      {c.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-white">{c.author.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                        {user && c.author._id === user._id && (
                          <button
                            onClick={() => handleDeleteComment(c._id)}
                            className="text-gray-600 hover:text-red-400 text-xs ml-auto"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 mt-0.5">{c.text}</p>
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
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePostComment}
                disabled={postingComment || !commentText.trim()}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:active:scale-100 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                {postingComment ? '…' : 'Post'}
              </button>
            </div>
          </div>

          {/* ── ACTION BUTTONS ────────────────────────────────────────────── */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 active:scale-95 transition-all text-sm font-medium"
            >
              Close
            </button>
            {isAssigned && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded-lg text-white text-sm font-medium transition-all"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}