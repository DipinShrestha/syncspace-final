// app/workspace/[id]/page.tsx
'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import { IconFileText } from '@/components/icons';

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
  return (
    <Suspense fallback={null}>
      <WorkspacePageInner />
    </Suspense>
  );
}

function WorkspacePageInner() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  // Notifications (chat/call) deep-link here via ?tab=chat — read it once
  // on mount so clicking one lands directly on the right tab.
  const validTabs: Tab[] = ['boards', 'documents', 'chat', 'analytics', 'code', 'members'];
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'boards',
  );

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

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="pt-16 min-h-screen bg-white">
          <div className="flex flex-col md:flex-row md:h-[calc(100vh-4rem)] animate-pulse">
            <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-4 space-y-2 flex-shrink-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-9 bg-gray-100 rounded-lg" />
              ))}
            </div>
            <div className="flex-1 p-4 sm:p-6">
              <div className="h-7 w-56 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-80 bg-gray-100 rounded mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
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
                    <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg p-4 h-full animate-pulse">
                      <div className="h-7 w-1/3 bg-gray-200 rounded mb-3" />
                      <div className="flex gap-1 border-b pb-2 mb-3">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="h-7 w-12 bg-gray-100 rounded" />
                        ))}
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-100 rounded w-full" />
                        <div className="h-4 bg-gray-100 rounded w-5/6" />
                        <div className="h-4 bg-gray-100 rounded w-2/3" />
                      </div>
                    </div>
                  ) : workspaceDoc ? (
                    <DocumentEditor
                      document={workspaceDoc}
                      onUpdate={(updated) => setWorkspaceDoc(updated)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                        <IconFileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-gray-500">Couldn't load the document. Try refreshing.</p>
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
                    <VideoCall
                      roomId={id as string}
                      userId={user?._id as string}
                      callerName={user?.name}
                    />
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
