'use client';

import {
  IconGrid,
  IconFileText,
  IconChat,
  IconChart,
  IconCode,
  IconUsers,
} from '@/components/icons';

type Tab = 'boards' | 'documents' | 'chat' | 'analytics' | 'code' | 'members';

interface WorkspaceSidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  workspaceId: string;
  workspaceName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkspaceSidebar({
  activeTab,
  setActiveTab,
  workspaceName,
  isOpen,
  onClose,
}: WorkspaceSidebarProps) {
  const navItems = [
    { id: 'boards' as const, label: 'Boards', Icon: IconGrid },
    { id: 'documents' as const, label: 'Documents', Icon: IconFileText },
    { id: 'chat' as const, label: 'Chat', Icon: IconChat },
    { id: 'analytics' as const, label: 'Analytics', Icon: IconChart },
    { id: 'code' as const, label: 'Code', Icon: IconCode },
    { id: 'members' as const, label: 'Members', Icon: IconUsers },
  ];

  const chooseTab = (tab: Tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) onClose();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close workspace navigation"
        onClick={onClose}
        className={`fixed inset-0 top-16 z-30 bg-black/35 backdrop-blur-[1px] transition-opacity md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`workspace-sidebar fixed md:relative left-0 top-16 md:top-0 z-40 md:z-auto h-[calc(100dvh-4rem)] md:h-full flex-shrink-0 border-r transition-all duration-300 ease-out overflow-hidden ${
          isOpen
            ? 'w-[270px] translate-x-0 opacity-100'
            : 'w-[270px] -translate-x-full opacity-0 md:w-0 md:translate-x-0 md:opacity-0 md:border-r-0'
        }`}
      >
        <div className="w-[270px] h-full p-4 flex flex-col">
          <div className="flex items-start justify-between gap-3 px-1 pb-5 mb-3 border-b workspace-border">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] workspace-muted mb-1">
                Workspace
              </p>
              <h2 className="text-lg font-semibold workspace-text truncate">{workspaceName}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="workspace-icon-button"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => chooseTab(id)}
                className={`workspace-nav-item ${activeTab === id ? 'is-active' : ''}`}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t workspace-border">
            <p className="text-xs workspace-muted leading-relaxed">
              Use the menu button at any time to hide or reopen this navigation.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
