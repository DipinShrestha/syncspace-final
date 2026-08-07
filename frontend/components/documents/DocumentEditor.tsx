'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { updateDocument } from '@/lib/api';
import toast from 'react-hot-toast';

interface DocumentData {
  _id: string;
  title: string;
  content: string;
  updatedAt?: string;
}

interface DocumentEditorProps {
  document: DocumentData;
  onUpdate: (updated: DocumentData) => void;
}

function parseDocumentContent(content: string) {
  if (!content) return { type: 'doc', content: [{ type: 'paragraph' }] };
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function getTextStats(text: string) {
  const trimmed = text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: text.length,
  };
}

export default function DocumentEditor({ document, onUpdate }: DocumentEditorProps) {
  const [title, setTitle] = useState(document.title);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(
    document.updatedAt ? new Date(document.updatedAt) : null,
  );
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const [focusMode, setFocusMode] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentIdRef = useRef(document._id);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    documentIdRef.current = document._id;
  }, [document._id]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const saveContent = useCallback(async (content: unknown) => {
    setSaving(true);
    try {
      const res = await updateDocument(documentIdRef.current, {
        content: JSON.stringify(content),
      });
      setDirty(false);
      setLastSaved(new Date());
      onUpdateRef.current(res.data);
    } catch {
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: 'Start writing your document…',
      }),
    ],
    content: parseDocumentContent(document.content),
    editorProps: {
      attributes: {
        class: 'syncspace-prosemirror focus:outline-none',
        spellcheck: 'true',
      },
    },
  });

  // Real autosave: save only after the editor actually changes, rather than
  // saving repeatedly on a timer even when the document is untouched.
  useEffect(() => {
    if (!editor) return;

    const updateStats = () => setStats(getTextStats(editor.getText()));
    updateStats();

    const handleUpdate = () => {
      setDirty(true);
      updateStats();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void saveContent(editor.getJSON());
      }, 1200);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, saveContent]);

  useEffect(() => {
    setTitle(document.title);
  }, [document.title]);

  useEffect(() => {
    if (!focusMode) return;
    const previousOverflow = documentBodyOverflow();
    window.document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [focusMode]);

  const saveTitle = async () => {
    const nextTitle = title.trim() || 'Untitled document';
    setTitle(nextTitle);
    if (nextTitle === document.title) return;

    setSaving(true);
    try {
      const res = await updateDocument(document._id, { title: nextTitle });
      setLastSaved(new Date());
      onUpdateRef.current(res.data);
    } catch {
      toast.error('Failed to save title');
    } finally {
      setSaving(false);
    }
  };

  const addOrEditLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter link URL', previousUrl || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const clearFormatting = () => {
    editor?.chain().focus().clearNodes().unsetAllMarks().run();
  };

  const currentBlock = editor?.isActive('heading', { level: 1 })
    ? 'h1'
    : editor?.isActive('heading', { level: 2 })
      ? 'h2'
      : editor?.isActive('heading', { level: 3 })
        ? 'h3'
        : 'paragraph';

  const toolbarButton = (active = false) =>
    `doc-tool-button ${active ? 'is-active' : ''}`;

  return (
    <div
      className={`document-editor-shell ${focusMode ? 'document-focus-mode' : ''}`}
      aria-label="SyncSpace document editor"
    >
      <div className="document-topbar">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="document-title-input"
            placeholder="Document title"
          />
          <div className="document-save-state">
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Auto-save ready'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFocusMode((value) => !value)}
          className="doc-secondary-button"
          title={focusMode ? 'Exit focus mode' : 'Open distraction-free editor'}
        >
          {focusMode ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
              </svg>
              Exit focus
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
              </svg>
              Focus
            </>
          )}
        </button>
      </div>

      <div className="document-toolbar scrollbar-none">
        <select
          aria-label="Text style"
          value={currentBlock}
          onChange={(event) => {
            if (!editor) return;
            const value = event.target.value;
            if (value === 'paragraph') editor.chain().focus().setParagraph().run();
            if (value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          className="doc-style-select"
        >
          <option value="paragraph">Normal text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <span className="doc-tool-separator" />

        <button type="button" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className={toolbarButton()} title="Undo (Ctrl/Cmd+Z)">↶</button>
        <button type="button" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className={toolbarButton()} title="Redo">↷</button>

        <span className="doc-tool-separator" />

        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`${toolbarButton(Boolean(editor?.isActive('bold')))} font-bold`} title="Bold">B</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`${toolbarButton(Boolean(editor?.isActive('italic')))} italic`} title="Italic">I</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`${toolbarButton(Boolean(editor?.isActive('underline')))} underline`} title="Underline">U</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={`${toolbarButton(Boolean(editor?.isActive('strike')))} line-through`} title="Strikethrough">S</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleCode().run()} className={`${toolbarButton(Boolean(editor?.isActive('code')))} font-mono`} title="Inline code">{'</>'}</button>

        <span className="doc-tool-separator" />

        <button type="button" onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={toolbarButton(Boolean(editor?.isActive({ textAlign: 'left' })))} title="Align left">≡</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={toolbarButton(Boolean(editor?.isActive({ textAlign: 'center' })))} title="Align center">≣</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={toolbarButton(Boolean(editor?.isActive({ textAlign: 'right' })))} title="Align right">≡</button>
        <button type="button" onClick={() => editor?.chain().focus().setTextAlign('justify').run()} className={toolbarButton(Boolean(editor?.isActive({ textAlign: 'justify' })))} title="Justify">☰</button>

        <span className="doc-tool-separator" />

        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={toolbarButton(Boolean(editor?.isActive('bulletList')))} title="Bullet list">• List</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={toolbarButton(Boolean(editor?.isActive('orderedList')))} title="Numbered list">1. List</button>
        <button type="button" onClick={() => editor?.chain().focus().sinkListItem('listItem').run()} disabled={!editor?.can().sinkListItem('listItem')} className={toolbarButton()} title="Increase list indent">→</button>
        <button type="button" onClick={() => editor?.chain().focus().liftListItem('listItem').run()} disabled={!editor?.can().liftListItem('listItem')} className={toolbarButton()} title="Decrease list indent">←</button>

        <span className="doc-tool-separator" />

        <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={toolbarButton(Boolean(editor?.isActive('blockquote')))} title="Block quote">❝</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={toolbarButton(Boolean(editor?.isActive('codeBlock')))} title="Code block">{'{ }'}</button>
        <button type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()} className={toolbarButton()} title="Horizontal line">―</button>
        <button type="button" onClick={addOrEditLink} className={toolbarButton(Boolean(editor?.isActive('link')))} title="Add or edit link">🔗</button>
        {editor?.isActive('link') && (
          <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className={toolbarButton()} title="Remove link">Unlink</button>
        )}

        <span className="doc-tool-separator" />
        <button type="button" onClick={clearFormatting} className={toolbarButton()} title="Clear formatting">Clear</button>
      </div>

      <div className="document-workspace">
        <div className="document-page">
          <EditorContent editor={editor} className="syncspace-editor h-full" />
        </div>
      </div>

      <div className="document-statusbar">
        <span>{stats.words} words</span>
        <span>{stats.characters} characters</span>
        <span className="ml-auto hidden sm:inline">Tip: press Esc to leave focus mode</span>
      </div>
    </div>
  );
}

function documentBodyOverflow() {
  return window.document.body.style.overflow;
}
