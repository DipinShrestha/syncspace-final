'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getWorkspaces, deleteWorkspace, removeWorkspaceMember, updateProfile, changePassword, deleteAccount } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

interface Workspace {
  _id: string;
  name: string;
  description: string;
  owner: string | { _id: string; name: string };
  members: { user: { _id: string; name: string; email: string }; role: string }[];
}

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  // Profile update
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const ownedWorkspaces = workspaces.filter(ws => getOwnerId(ws) === user?._id);

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

  // Password change
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
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
      setWorkspaces(prev => prev.filter(ws => ws._id !== workspaceId));
      toast.success('Workspace deleted');
    } catch {
      toast.error('Failed to delete workspace');
    }
  };

  const handleRemoveMember = async (workspaceId: string, memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this workspace?`)) return;
    try {
      await removeWorkspaceMember(workspaceId, memberId);
      setWorkspaces(prev =>
        prev.map(ws => {
          if (ws._id !== workspaceId) return ws;
          return {
            ...ws,
            members: ws.members.filter(m => m.user._id !== memberId),
          };
        })
      );
      toast.success(`Removed ${memberName}`);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  if (authLoading || loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <>
      <Navbar />
      <div className="pt-20 px-4 sm:px-6 pb-8 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 tracking-tight">Settings</h1>

        {/* Profile Information */}
        <div className="glass p-4 sm:p-6 rounded-xl mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-lg p-2 text-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Avatar URL</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full glass-input rounded-lg p-2 text-white transition-colors"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            <button onClick={handleUpdateProfile} className="glass-btn px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95">
              Update Profile
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="glass p-4 sm:p-6 rounded-xl mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full glass-input rounded-lg p-2 text-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full glass-input rounded-lg p-2 text-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full glass-input rounded-lg p-2 text-white transition-colors"
              />
            </div>
            <button onClick={handleChangePassword} className="glass-btn px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95">
              Change Password
            </button>
          </div>
        </div>

        {/* Workspaces Management – same as before */}
        <div className="glass p-4 sm:p-6 rounded-xl mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Your Workspaces</h2>
          {ownedWorkspaces.length === 0 ? (
            <p className="text-gray-400 text-sm">You don't own any workspaces.</p>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {ownedWorkspaces.map(ws => (
                <div key={ws._id} className="border border-gray-700 rounded-lg p-4 transition-colors hover:border-gray-600">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">{ws.name}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2">{ws.description || 'No description'}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteWorkspace(ws._id)}
                      className="self-start bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-all active:scale-95 whitespace-nowrap"
                    >
                      Delete Workspace
                    </button>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Members</h4>
                    <ul className="space-y-2">
                      {ws.members.map(member => {
                        const memberId = typeof member.user === 'string' ? member.user : member.user._id;
                        const memberName = typeof member.user === 'string' ? memberId : member.user.name;
                        const isOwner = getOwnerId(ws) === memberId;
                        return (
                          <li key={memberId} className="flex justify-between items-center bg-gray-800 p-2 rounded gap-2">
                            <span className="text-sm text-gray-200 truncate">{memberName} {isOwner && '(Owner)'}</span>
                            {!isOwner && (
                              <button
                                onClick={() => handleRemoveMember(ws._id, memberId, memberName)}
                                className="text-red-400 hover:text-red-300 text-sm transition-colors flex-shrink-0"
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
        {/* Delete Account */}
        <div className="glass p-4 sm:p-6 rounded-xl mb-8 border border-red-500/30">
          <h2 className="text-lg sm:text-xl font-semibold text-red-200 mb-4">Delete Account</h2>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in-up">
              <p className="text-red-300 text-sm">Are you sure? This action is irreversible.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
                >
                  Yes, Delete My Account
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="glass-outline px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
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