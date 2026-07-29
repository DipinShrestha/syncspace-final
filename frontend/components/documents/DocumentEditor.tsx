'use client';
import { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { updateDocument } from '@/lib/api';
import toast from 'react-hot-toast';

interface DocumentEditorProps {
  document: { _id: string; title: string; content: string };
  onUpdate: (updated: { _id: string; title: string; content: string }) => void;
}

export default function DocumentEditor({ document, onUpdate }: DocumentEditorProps) {
  const [title, setTitle] = useState(document.title);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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

  const autoSave = useCallback(
    async (content: unknown) => {
      setSaving(true);
      try {
        const res = await updateDocument(document._id, { content: JSON.stringify(content) });
        setLastSaved(new Date());
        // res.data is the full updated document from the backend
        onUpdate(res.data); // ← pass the whole document (includes updatedAt)
      } catch {
        toast.error('Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [document, onUpdate],
  );

  useEffect(() => {
    if (!editor) return;
    const handler = setTimeout(() => autoSave(editor.getJSON()), 3000);
    return () => clearTimeout(handler);
  }, [editor, autoSave]);

  const saveTitle = async () => {
    if (title === document.title) return;
    try {
      const res = await updateDocument(document._id, { title });
      setLastSaved(new Date());
      onUpdate(res.data); // ← use the full response
      toast.success('Title saved');
    } catch {
      toast.error('Failed to save title');
    }
  };

  // Shared toolbar button styling — text color was previously unset, which
  // relied on inherited page color. Now explicit so it stays readable
  // regardless of the app's (fixed dark) global theme.
  const btnBase = 'p-2 rounded text-sm text-gray-700 transition-colors';
  const btnActive = 'bg-gray-200 text-gray-900';
  const btnIdle = 'hover:bg-gray-100 hover:text-gray-900';

  return (
    <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg p-3 sm:p-4">
      <div className="border-b pb-3 mb-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          className="text-xl sm:text-2xl font-bold w-full border-none focus:outline-none focus:ring-0 p-0 text-gray-900 bg-transparent"
          placeholder="Document title"
        />
        <div className="text-xs text-gray-400 mt-1">
          {saving
            ? 'Saving…'
            : lastSaved
              ? `Saved at ${lastSaved.toLocaleTimeString()}`
              : 'Auto-save enabled'}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b pb-2 mb-2">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`${btnBase} ${editor?.isActive('bold') ? btnActive : btnIdle} font-bold`}
          title="Bold"
        >
          B
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`${btnBase} ${editor?.isActive('italic') ? btnActive : btnIdle} italic`}
          title="Italic"
        >
          I
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`${btnBase} ${editor?.isActive('underline') ? btnActive : btnIdle} underline`}
          title="Underline"
        >
          U
        </button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${btnBase} ${editor?.isActive('heading', { level: 1 }) ? btnActive : btnIdle}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${btnBase} ${editor?.isActive('heading', { level: 2 }) ? btnActive : btnIdle}`}
          title="Heading 2"
        >
          H2
        </button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          className={`${btnBase} ${btnIdle}`}
          title="Align left"
        >
          Left
        </button>
        <button
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          className={`${btnBase} ${btnIdle}`}
          title="Align center"
        >
          Center
        </button>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`${btnBase} ${editor?.isActive('bulletList') ? btnActive : btnIdle}`}
          title="Bullet list"
        >
          • List
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`${btnBase} ${editor?.isActive('orderedList') ? btnActive : btnIdle}`}
          title="Numbered list"
        >
          1. List
        </button>
      </div>
      <EditorContent editor={editor} className="flex-1 min-h-[400px]" />
    </div>
  );
}
