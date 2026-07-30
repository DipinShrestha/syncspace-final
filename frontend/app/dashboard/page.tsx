// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getWorkspaces, createWorkspace } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import { IconLayers, IconCrown, IconUsers, IconFolderOpen, IconInbox } from '@/components/icons';

interface Workspace {
  _id: string;
  name: string;
  description: string;
  updatedAt: string;
  members: { user: { _id: string } }[];
  owner: string | { _id: string; name: string; email: string }; // can be string or populated object
}

function StatCard({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tint: 'dusty' | 'sage';
}) {
  return (
    <div className="glass p-4 rounded-xl flex items-center gap-3">
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
          tint === 'dusty' ? 'bg-dusty-50 text-dusty-700' : 'bg-sage-50 text-sage-700'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-black leading-tight">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`glass rounded-2xl py-10 px-6 flex flex-col items-center text-center w-full ${
        onClick ? 'cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]' : ''
      }`}
    >
      <div className="w-14 h-14 rounded-full bg-dusty-50 text-dusty-700 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-black font-medium text-sm sm:text-base">{title}</p>
      <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
    </Tag>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <Navbar />
      <div className="pt-16 px-4 sm:px-6 pb-8 max-w-6xl mx-auto animate-pulse">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div className="h-8 w-40 bg-gray-200 rounded-lg" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass p-4 rounded-xl flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-6 w-10 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass p-4 rounded-xl">
              <div className="h-5 w-2/3 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-full bg-gray-200 rounded mb-2" />
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) fetchWorkspaces();
  }, [user, authLoading]);

  const fetchWorkspaces = async () => {
    try {
      const res = await getWorkspaces();
      setWorkspaces(res.data);
    } catch {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Name required');
    try {
      const res = await createWorkspace({ name: newName, description: newDesc });
      setWorkspaces([res.data, ...workspaces]);
      setShowModal(false);
      setNewName('');
      setNewDesc('');
      toast.success('Workspace created');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Creation failed');
    }
  };

  if (authLoading || loading) return <DashboardSkeleton />;

  // Helper to get owner ID regardless of whether owner is a string or object
  const getOwnerId = (workspace: Workspace): string => {
    if (typeof workspace.owner === 'string') return workspace.owner;
    return workspace.owner?._id || '';
  };

  const ownedWorkspaces = workspaces.filter((ws) => getOwnerId(ws) === user?._id);
  const memberWorkspaces = workspaces.filter((ws) => getOwnerId(ws) !== user?._id);

  return (
    <>
      <Navbar />
      <div className="pt-16 px-4 sm:px-6 pb-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 sm:mb-8 flex-wrap gap-4 pt-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Dashboard</h1>
          <button
            onClick={() => setShowModal(true)}
            className="glass-btn px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
          >
            + New Workspace
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard
            icon={<IconLayers className="w-5 h-5" />}
            value={workspaces.length}
            label="Total Workspaces"
            tint="dusty"
          />
          <StatCard
            icon={<IconCrown className="w-5 h-5" />}
            value={ownedWorkspaces.length}
            label="Owned by You"
            tint="sage"
          />
          <StatCard
            icon={<IconUsers className="w-5 h-5" />}
            value={memberWorkspaces.length}
            label="Shared with You"
            tint="dusty"
          />
        </div>

        {/* Your Workspaces (owned) */}
        <div className="mb-10">
          <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">Your Workspaces</h2>
          {ownedWorkspaces.length === 0 ? (
            <EmptyState
              icon={<IconFolderOpen className="w-6 h-6" />}
              title="You haven't created any workspaces yet"
              subtitle="Click here to start your first one."
              onClick={() => setShowModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedWorkspaces.map((ws, i) => (
                <div
                  key={ws._id}
                  onClick={() => router.push(`/workspace/${ws._id}`)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="animate-fade-in-up glass p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]"
                >
                  <h3 className="text-lg font-semibold text-black truncate">{ws.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {ws.description || 'No description'}
                  </p>
                  <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                    <span>{new Date(ws.updatedAt).toLocaleDateString()}</span>
                    <span>{ws.members?.length || 1} members</span>
                  </div>
                  <span className="text-xs text-black bg-dusty-600 px-2 py-0.5 rounded-full mt-2 inline-block font-medium">
                    Owner
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workspaces You're a Member Of */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">
            Workspaces You're a Member Of
          </h2>
          {memberWorkspaces.length === 0 ? (
            <EmptyState
              icon={<IconInbox className="w-6 h-6" />}
              title="You are not a member of any other workspaces"
              subtitle="Workspaces you're invited to will show up here."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberWorkspaces.map((ws, i) => (
                <div
                  key={ws._id}
                  onClick={() => router.push(`/workspace/${ws._id}`)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="animate-fade-in-up glass p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]"
                >
                  <h3 className="text-lg font-semibold text-black truncate">{ws.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {ws.description || 'No description'}
                  </p>
                  <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                    <span>{new Date(ws.updatedAt).toLocaleDateString()}</span>
                    <span>{ws.members?.length || 1} members</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="modal-panel glass rounded-3xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-black">Create Workspace</h2>
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full glass-input rounded-lg p-2 mb-3 transition-colors"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full glass-input rounded-lg p-2 mb-4 transition-colors"
                rows={2}
              />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 glass-outline rounded-full text-black transition-all active:scale-95 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 glass-btn rounded-full text-black transition-all active:scale-95 text-sm font-medium"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
