// app/workspace/[id]/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
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

interface WorkspaceDocument {
  _id: string;
  title: string;
  content: string;
  updatedAt?: string;
}

const validTabs: Tab[] = ['boards', 'documents', 'chat', 'analytics', 'code', 'members'];

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'boards',
  );

  const initialCallParam = searchParams.get('call');
  const [activeCallType, setActiveCallType] = useState<'audio' | 'video' | null>(
    initialCallParam === 'audio' || initialCallParam === 'video' ? initialCallParam : null,
  );
  const [joiningIncomingCall, setJoiningIncomingCall] = useState(searchParams.get('join') === '1');

  const [workspaceDoc, setWorkspaceDoc] = useState<WorkspaceDocument | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('syncspace-workspace-sidebar');
    if (saved === 'open') {
      setSidebarOpen(true);
    } else if (saved === 'closed') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(window.innerWidth >= 768);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('syncspace-workspace-sidebar', sidebarOpen ? 'open' : 'closed');
  }, [sidebarOpen]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab') as Tab | null;
    if (requestedTab && validTabs.includes(requestedTab)) setActiveTab(requestedTab);

    const requestedCall = searchParams.get('call');
    if (requestedCall === 'audio' || requestedCall === 'video') {
      setActiveTab('chat');
      setJoiningIncomingCall(searchParams.get('join') === '1');
      setActiveCallType(requestedCall);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && id) void fetchWorkspace();
  }, [user, authLoading, id]);

  useEffect(() => {
    if (activeTab === 'documents' && workspace && !workspaceDoc) void loadOrCreateDoc();
  }, [activeTab, workspace, workspaceDoc]);

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

  const loadOrCreateDoc = async () => {
    if (!workspace) return;
    setDocLoading(true);
    try {
      const res = await getDocumentsByWorkspace(id as string);
      const docs: WorkspaceDocument[] = res.data;

      if (docs.length > 0) {
        setWorkspaceDoc(docs[0]);
      } else {
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

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/workspace/${id}?tab=${tab}`, { scroll: false });
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="pt-16 min-h-screen app-page-bg">
          <div className="flex h-[calc(100dvh-4rem)] animate-pulse">
            <div className="hidden md:block w-64 border-r workspace-border p-4 space-y-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 app-skeleton rounded-lg" />
              ))}
            </div>
            <div className="flex-1 p-6">
              <div className="h-7 w-56 app-skeleton rounded mb-2" />
              <div className="h-4 w-80 app-skeleton rounded mb-6" />
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
      <div className="pt-16 h-[100dvh] app-page-bg overflow-hidden">
        <div className="flex h-[calc(100dvh-4rem)] min-w-0">
          <WorkspaceSidebar
            activeTab={activeTab}
            setActiveTab={selectTab}
            workspaceId={id as string}
            workspaceName={workspace.name}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
            {/* Compact workspace control bar. The old large workspace heading is
                intentionally hidden in Documents so the editor gets the screen. */}
            {activeTab !== 'documents' && (
              <div className="workspace-content-header flex items-center gap-3 px-4 sm:px-6 py-3 border-b workspace-border flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((open) => !open)}
                  className="workspace-menu-button"
                  aria-label={sidebarOpen ? 'Close workspace navigation' : 'Open workspace navigation'}
                  title="Workspace navigation"
                >
                  <span />
                  <span />
                  <span />
                </button>

                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold workspace-text truncate">{workspace.name}</h1>
                  <p className="text-xs sm:text-sm workspace-muted truncate">
                    {workspace.description || 'No description'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="document-workspace-header flex items-center gap-3 px-3 sm:px-4 py-2 border-b workspace-border flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((open) => !open)}
                  className="workspace-menu-button"
                  aria-label={sidebarOpen ? 'Close workspace navigation' : 'Open workspace navigation'}
                  title="Workspace navigation"
                >
                  <span />
                  <span />
                  <span />
                </button>
                <IconFileText className="w-4 h-4 workspace-muted" />
                <span className="text-xs sm:text-sm workspace-muted truncate">
                  {workspace.name} / Document
                </span>
              </div>
            )}

            <div className={`flex-1 min-h-0 min-w-0 ${activeTab === 'documents' ? 'overflow-hidden p-0' : 'overflow-auto p-4 sm:p-6'}`}>
              {activeTab === 'boards' && <BoardView workspaceId={id as string} />}

              {activeTab === 'documents' && (
                <div className="h-full min-h-0">
                  {docLoading ? (
                    <div className="h-full p-5 sm:p-8 animate-pulse document-loading-surface">
                      <div className="h-8 w-1/3 app-skeleton rounded mb-4" />
                      <div className="h-11 app-skeleton rounded mb-5" />
                      <div className="max-w-4xl mx-auto h-[70%] app-skeleton rounded" />
                    </div>
                  ) : workspaceDoc ? (
                    <DocumentEditor
                      document={workspaceDoc}
                      onUpdate={(updated) => setWorkspaceDoc(updated)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 rounded-full app-soft-surface workspace-muted flex items-center justify-center mb-3">
                        <IconFileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm workspace-muted">Couldn&apos;t load the document. Try refreshing.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="space-y-4">
                  {activeCallType && (
                    <VideoCall
                      roomId={id as string}
                      userId={user?._id as string}
                      callerName={user?.name}
                      mode={activeCallType}
                      autoStart
                      announceStart={!joiningIncomingCall}
                      onEnd={() => {
                        setActiveCallType(null);
                        setJoiningIncomingCall(false);
                        router.replace(`/workspace/${id}?tab=chat`);
                      }}
                    />
                  )}
                  <Chat
                    workspaceId={id as string}
                    activeCallType={activeCallType}
                    onStartCall={(type) => {
                      setJoiningIncomingCall(false);
                      setActiveCallType(type);
                    }}
                    onEndCall={() => {
                      setActiveCallType(null);
                      setJoiningIncomingCall(false);
                      router.replace(`/workspace/${id}?tab=chat`);
                    }}
                  />
                </div>
              )}

              {activeTab === 'analytics' && <Analytics workspaceId={id as string} />}
              {activeTab === 'code' && <LiveCodeEditor />}
              {activeTab === 'members' && <MembersPanel workspaceId={id as string} />}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
