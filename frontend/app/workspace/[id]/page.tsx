// app/workspace/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getWorkspaceById, getDocumentsByWorkspace, createDocument } from '@/lib/api';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import BoardView from '@/components/board/BoardView';
import Chat from '@/components/chat/Chat';
import DocumentEditor from '@/components/documents/DocumentEditor';
import VideoCall from '@/components/VideoCall';
import Analytics from '@/components/Analytics';
import LiveCodeEditor from '@/components/LiveCodeEditor';
import MembersPanel from '@/components/MembersPanel';

type Tab = 'boards' | 'documents' | 'chat' | 'analytics' | 'code' | 'members';

interface Workspace {
  _id: string;
  name: string;
  description: string;
}

interface Document {
  _id: string;
  title: string;
  content: string;
  updatedAt?: string;
}

export default function WorkspacePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('boards');

  // Single workspace document — named after the workspace
  const [workspaceDoc, setWorkspaceDoc] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && id) fetchWorkspace();
  }, [user, authLoading, id]);

  const fetchWorkspace = async () => {
    try {
      const res = await getWorkspaceById(id as string);
      setWorkspace(res.data);
    } catch {
      toast.error('Failed to load workspace');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // When the user switches to the Documents tab, load or create the single doc.
  useEffect(() => {
    if (activeTab === 'documents' && workspace && !workspaceDoc) {
      loadOrCreateDoc();
    }
  }, [activeTab, workspace]);

  const loadOrCreateDoc = async () => {
    if (!workspace) return;
    setDocLoading(true);
    try {
      const res = await getDocumentsByWorkspace(id as string);
      const docs: Document[] = res.data;

      if (docs.length > 0) {
        // Use the first (and should be only) document
        setWorkspaceDoc(docs[0]);
      } else {
        // Auto-create one document named after the workspace
        const created = await createDocument({
          title: workspace.name,
          content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
          workspaceId: id as string,
        });
        setWorkspaceDoc(created.data);
      }
    } catch {
      toast.error('Failed to load document');
    } finally {
      setDocLoading(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-black">Loading workspace…</div>;
  if (!workspace) return null;

  return (
    <>
      <Navbar />
      <div className="pt-16 min-h-screen bg-white">
        <div className="flex flex-col md:flex-row md:h-[calc(100vh-4rem)]">
          {/* Sidebar now carries workspaceId + workspaceName for the Members tab.
 Stacks above the content as a horizontal tab strip on mobile,
 sits as a fixed left column from md up. */}
          <WorkspaceSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            workspaceId={id as string}
            workspaceName={workspace.name}
          />

          <div className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              {/* Header — InviteMember removed; it now lives inside the Members tab */}
              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-black">{workspace.name}</h1>
                <p className="text-sm sm:text-base text-gray-500">
                  {workspace.description || 'No description'}
                </p>
              </div>

              {/* Boards */}
              {activeTab === 'boards' && <BoardView workspaceId={id as string} />}

              {/* Documents — single doc, no list, no create/delete UI */}
              {activeTab === 'documents' && (
                <div className="h-[75vh]">
                  {docLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Loading document…
                    </div>
                  ) : workspaceDoc ? (
                    <DocumentEditor
                      document={workspaceDoc}
                      onUpdate={(updated) => setWorkspaceDoc(updated)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Failed to load document.
                    </div>
                  )}
                </div>
              )}

              {/* Chat + Video */}
              {activeTab === 'chat' && (
                <div className="space-y-6">
                  <Chat workspaceId={id as string} />
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-black mb-3">Video Call</h3>
                    <VideoCall roomId={id as string} userId={user?._id as string} />
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && <Analytics workspaceId={id as string} />}
              {activeTab === 'code' && <LiveCodeEditor />}

              {/* Members — replaces the old InviteMember banner */}
              {activeTab === 'members' && <MembersPanel workspaceId={id as string} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
