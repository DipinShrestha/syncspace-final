'use client';
import { useEffect, useState, useCallback } from 'react';
import { getDocumentsByWorkspace, createDocument, deleteDocument } from '@/lib/api';
import toast from 'react-hot-toast';
import { IconFileText, IconTrash } from '@/components/icons';

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

export default function DocumentList({
  workspaceId,
  onSelectDocument,
  selectedDocId,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await getDocumentsByWorkspace(workspaceId);
      setDocuments(res.data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return toast.error('Title required');
    try {
      const res = await createDocument({
        title: newTitle,
        content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
        workspaceId,
      });
      setDocuments([res.data, ...documents]);
      onSelectDocument(res.data);
      setIsCreating(false);
      setNewTitle('');
      toast.success('Document created');
    } catch {
      toast.error('Creation failed');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this document?')) {
      try {
        await deleteDocument(id);
        setDocuments(documents.filter((d) => d._id !== id));
        if (selectedDocId === id) onSelectDocument(null);
        toast.success('Document deleted');
      } catch {
        toast.error('Delete failed');
      }
    }
  };

  if (loading) {
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

  return (
    <div className="w-64 bg-white border-r p-2 overflow-y-auto h-full">
      <button
        onClick={() => setIsCreating(true)}
        className="w-full mb-3 bg-dusty-600 text-black py-2 rounded-md text-sm font-medium transition-colors hover:bg-dusty-700"
      >
        + New Document
      </button>
      {isCreating && (
        <div className="mb-3 p-2 border rounded bg-gray-50">
          <input
            type="text"
            placeholder="Document title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border rounded p-1 text-sm mb-2"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="bg-dusty-600 text-black px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-dusty-700"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="border rounded px-2 py-1 text-xs text-black transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {documents.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center text-center px-3 py-10">
          <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
            <IconFileText className="w-5 h-5" />
          </div>
          <p className="text-sm text-gray-500">No documents yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {documents.map((doc) => (
            <div
              key={doc._id}
              onClick={() => onSelectDocument(doc)}
              className={`group p-2 rounded cursor-pointer hover:bg-gray-100 flex justify-between items-center transition-colors ${selectedDocId === doc._id ? 'bg-dusty-50 border-l-4 border-dusty-500' : ''}`}
            >
              <div className="truncate flex-1">
                <div className="font-medium text-sm truncate text-black">{doc.title}</div>
                <div className="text-xs text-gray-400">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(doc._id, e)}
                className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                title="Delete document"
              >
                <IconTrash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
