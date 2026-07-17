// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getWorkspaces, createWorkspace } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';

interface Workspace {
  _id: string;
  name: string;
  description: string;
  updatedAt: string;
  members: { user: { _id: string } }[];
  owner: string | { _id: string; name: string; email: string }; // can be string or populated object
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

  if (authLoading || loading) return <div className="p-8">Loading...</div>;

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

        {/* Your Workspaces (owned) */}
        <div className="mb-10">
          <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">Your Workspaces</h2>
          {ownedWorkspaces.length === 0 ? (
            <p className="text-gray-500 text-sm sm:text-base">
              You haven't created any workspaces yet.
            </p>
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
            <p className="text-gray-500 text-sm sm:text-base">
              You are not a member of any other workspaces.
            </p>
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
          <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="modal-panel bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-black">Create Workspace</h2>
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-300 bg-white rounded-lg p-2 mb-3 text-black placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-dusty-500"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full border border-gray-300 bg-white rounded-lg p-2 mb-4 text-black placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-dusty-500"
                rows={2}
              />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-100 transition-all active:scale-95 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-dusty-600 hover:bg-dusty-700 rounded-lg text-black transition-all active:scale-95 text-sm font-medium"
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
