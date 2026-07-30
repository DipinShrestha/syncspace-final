'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getWorkspaces,
  deleteWorkspace,
  removeWorkspaceMember,
  updateProfile,
  deleteAccount,
  uploadAvatar,
} from '@/lib/api';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import { IconUsers, IconLayers, IconCrown, IconTrash } from '@/components/icons';

interface Workspace {
  _id: string;
  name: string;
  description: string;
  owner: string | { _id: string; name: string };
  members: { user: { _id: string; name: string; email: string }; role: string }[];
}

function SectionHeader({ icon, title, tint }: { icon: React.ReactNode; title: string; tint: 'dusty' | 'sage' | 'red' }) {
  const tintClass =
    tint === 'dusty' ? 'bg-dusty-50 text-dusty-700' : tint === 'sage' ? 'bg-sage-50 text-sage-700' : 'bg-red-50 text-red-600';
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tintClass}`}>
        {icon}
      </div>
      <h2 className={`text-lg sm:text-xl font-semibold ${tint === 'red' ? 'text-red-700' : 'text-black'}`}>
        {title}
      </h2>
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  // Profile update
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const getOwnerId = (ws: Workspace): string => {
    if (typeof ws.owner === 'string') return ws.owner;
    return ws.owner?._id || '';
  };

  const ownedWorkspaces = workspaces.filter((ws) => getOwnerId(ws) === user?._id);
  const memberWorkspaces = workspaces.filter((ws) => getOwnerId(ws) !== user?._id);

  // Profile update
  const handleUpdateProfile = async () => {
    try {
      await updateProfile({ name, avatar });
      toast.success('Profile updated');
      // Refresh user context (optional: you can refetch user)
      window.location.reload();
    } catch {
      toast.error('Update failed');
    }
  };

  // Avatar photo upload — uploads to Cloudinary immediately, then just
  // stages the returned URL in state until "Update Profile" is clicked
  // (keeps a single save action instead of two separate network calls).
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploadingAvatar(true);
    try {
      const { url } = await uploadAvatar(file);
      setAvatar(url);
      toast.success('Photo uploaded — click Update Profile to save');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success('Account deleted');
      logout();
      router.push('/login');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  // Workspace deletion
  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!confirm('Delete this workspace? This action cannot be undone.')) return;
    try {
      await deleteWorkspace(workspaceId);
      setWorkspaces((prev) => prev.filter((ws) => ws._id !== workspaceId));
      toast.success('Workspace deleted');
    } catch {
      toast.error('Failed to delete workspace');
    }
  };

  const handleRemoveMember = async (workspaceId: string, memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this workspace?`)) return;
    try {
      await removeWorkspaceMember(workspaceId, memberId);
      setWorkspaces((prev) =>
        prev.map((ws) => {
          if (ws._id !== workspaceId) return ws;
          return {
            ...ws,
            members: ws.members.filter((m) => m.user._id !== memberId),
          };
        }),
      );
      toast.success(`Removed ${memberName}`);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  // Self-service "leave workspace" for the workspaces you're a member (not
  // owner) of — previously there was no way to do this at all; removing
  // yourself required admin/owner permissions you might not have.
  const handleLeaveWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!user) return;
    if (!confirm(`Leave "${workspaceName}"? You'll need a new invite to rejoin.`)) return;
    try {
      await removeWorkspaceMember(workspaceId, user._id);
      setWorkspaces((prev) => prev.filter((ws) => ws._id !== workspaceId));
      toast.success(`Left "${workspaceName}"`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave workspace');
    }
  };

  if (authLoading || loading) return <div className="p-8 text-black">Loading...</div>;

  return (
    <>
      <Navbar />
      <div className="pt-20 px-4 sm:px-6 pb-8 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6 tracking-tight">Settings</h1>

        {/* Profile / Account */}
        <div className="glass p-4 sm:p-6 rounded-3xl mb-6 sm:mb-8">
          <SectionHeader icon={<IconUsers className="w-4 h-4" />} title="Account" tint="dusty" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Photo</label>
              <div className="flex items-center gap-4">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border border-white/70 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-dusty-600 flex items-center justify-center text-black font-semibold text-xl flex-shrink-0">
                    {name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <label className="glass-outline px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 cursor-pointer">
                  {uploadingAvatar ? 'Uploading…' : 'Change Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-lg p-2 text-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-black px-3 py-2 rounded-lg bg-black/5 flex-1 min-w-0 truncate">
                  {user?.email}
                </span>
                <span className="text-xs px-2 py-1 rounded-md bg-sage-50 text-sage-800 font-medium whitespace-nowrap">
                  Signed in with Google
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Managed by your Google account — sign-in is Google-only, so there's no separate
                password to change here.
              </p>
            </div>
            <button
              onClick={handleUpdateProfile}
              className="glass-btn px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
            >
              Update Profile
            </button>
          </div>
        </div>

        {/* Workspaces you own */}
        <div className="glass p-4 sm:p-6 rounded-3xl mb-6 sm:mb-8">
          <SectionHeader icon={<IconCrown className="w-4 h-4" />} title="Your Workspaces" tint="sage" />
          {ownedWorkspaces.length === 0 ? (
            <p className="text-gray-500 text-sm">You don't own any workspaces.</p>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {ownedWorkspaces.map((ws) => (
                <div
                  key={ws._id}
                  className="bg-white/60 border border-white/70 rounded-lg p-4 transition-colors hover:bg-white/80"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-black truncate">{ws.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {ws.description || 'No description'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteWorkspace(ws._id)}
                      className="self-start flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-all active:scale-95 whitespace-nowrap"
                    >
                      <IconTrash className="w-3.5 h-3.5" /> Delete Workspace
                    </button>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Members</h4>
                    <ul className="space-y-2">
                      {ws.members.map((member) => {
                        const memberId =
                          typeof member.user === 'string' ? member.user : member.user._id;
                        const memberName =
                          typeof member.user === 'string' ? memberId : member.user.name;
                        const isOwner = getOwnerId(ws) === memberId;
                        return (
                          <li
                            key={memberId}
                            className="flex justify-between items-center bg-black/5 p-2 rounded-md gap-2"
                          >
                            <span className="text-sm text-black truncate">
                              {memberName} {isOwner && '(Owner)'}
                            </span>
                            {!isOwner && (
                              <button
                                onClick={() => handleRemoveMember(ws._id, memberId, memberName)}
                                className="text-red-600 hover:text-red-700 text-sm transition-colors flex-shrink-0"
                              >
                                Remove
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workspaces you belong to but don't own — self-service leave */}
        <div className="glass p-4 sm:p-6 rounded-3xl mb-6 sm:mb-8">
          <SectionHeader icon={<IconLayers className="w-4 h-4" />} title="Workspaces You're a Member Of" tint="dusty" />
          {memberWorkspaces.length === 0 ? (
            <p className="text-gray-500 text-sm">You're not a member of any other workspaces.</p>
          ) : (
            <div className="space-y-2">
              {memberWorkspaces.map((ws) => (
                <div
                  key={ws._id}
                  className="flex items-center justify-between gap-3 bg-white/60 border border-white/70 rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black truncate">{ws.name}</p>
                    <p className="text-xs text-gray-500 truncate">{ws.description || 'No description'}</p>
                  </div>
                  <button
                    onClick={() => handleLeaveWorkspace(ws._id, ws.name)}
                    className="glass-outline px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                  >
                    Leave
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="glass p-4 sm:p-6 rounded-3xl mb-8 border border-red-200">
          <SectionHeader icon={<IconTrash className="w-4 h-4" />} title="Delete Account" tint="red" />
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in-up">
              <p className="text-red-600 text-sm">Are you sure? This action is irreversible.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
                >
                  Yes, Delete My Account
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="glass-outline px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
