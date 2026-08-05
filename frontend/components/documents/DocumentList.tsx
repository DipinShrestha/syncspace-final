'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getDocumentsByWorkspace, createDocument, deleteDocument } from '@/lib/api';
import { IconFileText, IconTrash } from '@/components/icons';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface Document {
  _id: string;
  title: string;
  content: string;
  updatedAt: string;
}

interface DocumentListProps {
  workspaceId: string;
  onSelectDocument: (doc: Document | null) => void;
  selectedDocId?: string;
}

// ------------------------------------------------------------------
// Sub‑component: a single document row
// ------------------------------------------------------------------

function DocumentRow({
  doc,
  isSelected,
  onSelect,
  onDelete,
}: {
  doc: Document;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`
        group p-2 rounded cursor-pointer hover:bg-gray-100 
        flex justify-between items-center transition-colors
        ${isSelected ? 'bg-dusty-50 border-l-4 border-dusty-500' : ''}
      `}
    >
      <div className="truncate flex-1">
        <div className="font-medium text-sm truncate text-black">{doc.title}</div>
        <div className="text-xs text-gray-400">
          {new Date(doc.updatedAt).toLocaleDateString()}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Delete document"
      >
        <IconTrash className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export default function DocumentList({
  workspaceId,
  onSelectDocument,
  selectedDocId,
}: DocumentListProps) {
  // ---------- state ----------
  const [docList, setDocList] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // ---------- data fetching ----------
  const loadDocuments = useCallback(async () => {
    try {
      const response = await getDocumentsByWorkspace(workspaceId);
      setDocList(response.data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ---------- create ----------
  const handleCreateDocument = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed) {
      toast.error('Title is required');
      return;
    }

    try {
      const payload = {
        title: trimmed,
        content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
        workspaceId,
      };
      const response = await createDocument(payload);
      const newDoc = response.data;

      setDocList((prev) => [newDoc, ...prev]);
      onSelectDocument(newDoc);
      setShowCreateForm(false);
      setTitleInput('');
      toast.success('Document created');
    } catch {
      toast.error('Creation failed');
    }
  };

  // ---------- delete ----------
  const handleDeleteDocument = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Delete this document?')) return;

    try {
      await deleteDocument(id);
      setDocList((prev) => prev.filter((doc) => doc._id !== id));
      if (selectedDocId === id) {
        onSelectDocument(null);
      }
      toast.success('Document deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  // ---------- loading skeleton ----------
  if (isLoading) {
    return (
      <div className="w-64 bg-white border-r p-2 overflow-y-auto h-full animate-pulse">
        <div className="h-9 bg-gray-200 rounded-md mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  // ---------- render ----------
  return (
    <div className="w-64 bg-white border-r p-2 overflow-y-auto h-full">
      {/* New Document button */}
      <button
        onClick={() => setShowCreateForm(true)}
        className="w-full mb-3 bg-dusty-600 text-black py-2 rounded-md text-sm font-medium transition-colors hover:bg-dusty-700"
      >
        + New Document
      </button>

      {/* Inline creation form */}
      {showCreateForm && (
        <div className="mb-3 p-2 border rounded bg-gray-50">
          <input
            type="text"
            placeholder="Document title"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="w-full border rounded p-1 text-sm mb-2"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateDocument()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateDocument}
              className="bg-dusty-600 text-black px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-dusty-700"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setTitleInput('');
              }}
              className="border rounded px-2 py-1 text-xs text-black transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {docList.length === 0 && !showCreateForm ? (
        <div className="flex flex-col items-center text-center px-3 py-10">
          <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
            <IconFileText className="w-5 h-5" />
          </div>
          <p className="text-sm text-gray-500">No documents yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {docList.map((doc) => (
            <DocumentRow
              key={doc._id}
              doc={doc}
              isSelected={selectedDocId === doc._id}
              onSelect={() => onSelectDocument(doc)}
              onDelete={(e) => handleDeleteDocument(doc._id, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}