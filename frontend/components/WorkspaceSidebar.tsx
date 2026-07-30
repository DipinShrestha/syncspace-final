'use client';

// Sidebar now includes a Members tab and accepts workspaceId + workspaceName
// so the MembersPanel can be self-contained inside it.

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
}

export default function WorkspaceSidebar({
  activeTab,
  setActiveTab,
  workspaceId,
  workspaceName,
}: WorkspaceSidebarProps) {
  const navItems = [
    { id: 'boards' as const, label: 'Boards', Icon: IconGrid },
    { id: 'documents' as const, label: 'Documents', Icon: IconFileText },
    { id: 'chat' as const, label: 'Chat', Icon: IconChat },
    { id: 'analytics' as const, label: 'Analytics', Icon: IconChart },
    { id: 'code' as const, label: 'Code', Icon: IconCode },
    { id: 'members' as const, label: 'Members', Icon: IconUsers },
  ];

  return (
    <aside className="glass w-full md:w-64 rounded-none md:rounded-r-3xl border-b md:border-b-0 p-2 md:p-4 flex-shrink-0 flex flex-col">
      <div className="hidden md:block mb-8 px-1">
        <h2 className="text-lg font-semibold text-black truncate">{workspaceName}</h2>
      </div>
      {/* Horizontal scrollable tab strip on mobile, vertical stack from md up */}
      <nav className="flex md:flex-col gap-1.5 md:gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-2 px-2 md:mx-0 md:px-0 scrollbar-none">
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              activeTab === id
                ? 'glass-active shadow-sm'
                : 'text-black hover:bg-black/5 active:scale-95'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
