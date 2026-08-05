'use client';

import { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { updateDocument } from '@/lib/api';
import toast from 'react-hot-toast';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface DocumentEditorProps {
  document: { _id: string; title: string; content: string };
  onUpdate: (updated: { _id: string; title: string; content: string }) => void;
}

// ------------------------------------------------------------------
// Sub‑component: a single toolbar button
// ------------------------------------------------------------------

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

function ToolbarButton({ onClick, isActive = false, title, children, className = '' }: ToolbarButtonProps) {
  const base = 'p-2 rounded text-sm text-gray-700 transition-colors';
  const active = 'bg-gray-200 text-gray-900';
  const idle = 'hover:bg-gray-100 hover:text-gray-900';
  const combined = `${base} ${isActive ? active : idle} ${className}`;

  return (
    <button onClick={onClick} className={combined} title={title} type="button">
      {children}
    </button>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export default function DocumentEditor({ document, onUpdate }: DocumentEditorProps) {
  // ---------- state ----------
  const [currentTitle, setCurrentTitle] = useState(document.title);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // ---------- editor setup ----------
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: document.content ? JSON.parse(document.content) : '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4 text-gray-900',
      },
    },
  });

  // ---------- save content (auto‑save) ----------
  const saveContent = useCallback(
    async (content: unknown) => {
      setIsSaving(true);
      try {
        const response = await updateDocument(document._id, { content: JSON.stringify(content) });
        setLastSavedAt(new Date());
        onUpdate(response.data);
      } catch {
        toast.error('Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [document, onUpdate],
  );

  // ---------- auto‑save effect ----------
  useEffect(() => {
    if (!editor) return;
    const timeoutId = setTimeout(() => saveContent(editor.getJSON()), 3000);
    return () => clearTimeout(timeoutId);
  }, [editor, saveContent]);

  // ---------- save title ----------
  const updateTitle = useCallback(async () => {
    if (currentTitle === document.title) return;
    try {
      const response = await updateDocument(document._id, { title: currentTitle });
      setLastSavedAt(new Date());
      onUpdate(response.data);
      toast.success('Title saved');
    } catch {
      toast.error('Failed to save title');
    }
  }, [currentTitle, document, onUpdate]);

  // ---------- toolbar button definitions ----------
  const toolbarItems = [
    { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), isActive: editor?.isActive('bold'), title: 'Bold', className: 'font-bold' },
    { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), isActive: editor?.isActive('italic'), title: 'Italic', className: 'italic' },
    { label: 'U', action: () => editor?.chain().focus().toggleUnderline().run(), isActive: editor?.isActive('underline'), title: 'Underline', className: 'underline' },
    { separator: true },
    { label: 'H1', action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor?.isActive('heading', { level: 1 }), title: 'Heading 1' },
    { label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor?.isActive('heading', { level: 2 }), title: 'Heading 2' },
    { separator: true },
    { label: 'Left', action: () => editor?.chain().focus().setTextAlign('left').run(), isActive: false, title: 'Align left' },
    { label: 'Center', action: () => editor?.chain().focus().setTextAlign('center').run(), isActive: false, title: 'Align center' },
    { separator: true },
    { label: '• List', action: () => editor?.chain().focus().toggleBulletList().run(), isActive: editor?.isActive('bulletList'), title: 'Bullet list' },
    { label: '1. List', action: () => editor?.chain().focus().toggleOrderedList().run(), isActive: editor?.isActive('orderedList'), title: 'Numbered list' },
  ];

  // ---------- render ----------
  return (
    <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg p-3 sm:p-4">
      {/* Header */}
      <div className="border-b pb-3 mb-3">
        <input
          type="text"
          value={currentTitle}
          onChange={(e) => setCurrentTitle(e.target.value)}
          onBlur={updateTitle}
          className="text-xl sm:text-2xl font-bold w-full border-none focus:outline-none focus:ring-0 p-0 text-gray-900 bg-transparent"
          placeholder="Document title"
        />
        <div className="text-xs text-gray-400 mt-1">
          {isSaving
            ? 'Saving…'
            : lastSavedAt
              ? `Saved at ${lastSavedAt.toLocaleTimeString()}`
              : 'Auto-save enabled'}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b pb-2 mb-2">
        {toolbarItems.map((item, idx) => {
          if ('separator' in item) {
            return <span key={`sep-${idx}`} className="w-px h-5 bg-gray-200 mx-1" />;
          }
          return (
            <ToolbarButton
              key={`btn-${idx}`}
              onClick={item.action}
              isActive={item.isActive}
              title={item.title}
              className={item.className || ''}
            >
              {item.label}
            </ToolbarButton>
          );
        })}
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="flex-1 min-h-[400px]" />
    </div>
  );
}