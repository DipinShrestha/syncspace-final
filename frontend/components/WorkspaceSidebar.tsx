'use client';

// Sidebar now includes a Members tab and accepts workspaceId + workspaceName
// so the MembersPanel can be self-contained inside it.

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
    { id: 'boards' as const, label: 'Boards', icon: '📋' },
    { id: 'documents' as const, label: 'Documents', icon: '📝' },
    { id: 'chat' as const, label: 'Chat', icon: '💬' },
    { id: 'analytics' as const, label: 'Analytics', icon: '📊' },
    { id: 'code' as const, label: 'Code', icon: '</>' },
    { id: 'members' as const, label: 'Members', icon: '👥' },
  ];

  return (
    <aside className="w-full md:w-64 bg-black border-b md:border-b-0 md:border-r border-gray-800 p-2 md:p-4 flex-shrink-0 flex flex-col">
      <div className="hidden md:block mb-8">
        <h2 className="text-lg font-semibold text-white truncate">{workspaceName}</h2>
      </div>
      {/* Horizontal scrollable tab strip on mobile, vertical stack from md up */}
      <nav className="flex md:flex-col gap-1.5 md:gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-2 px-2 md:mx-0 md:px-0 scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              activeTab === item.id
                ? 'bg-dusty-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white active:scale-95'
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
