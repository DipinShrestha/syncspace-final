'use client';

// MembersPanel — replaces the old InviteMember widget.
// Shows the full member list, lets admins remove members,
// and has the invite-by-email form at the bottom.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getWorkspaceById,
  inviteMember,
  removeWorkspaceMember,
  cancelWorkspaceInvite,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface Member {
  user: { _id: string; name: string; email: string };
  role: 'admin' | 'member';
}

interface PendingInvite {
  // `user` is null when the invite was sent to an email that doesn't have
  // a SyncSpace account yet — `email` is set instead in that case. It gets
  // linked automatically once they sign up (see authController.googleAuth).
  user: { _id: string; name: string; email: string } | null;
  email?: string;
  role: 'admin' | 'member';
  invitedAt: string;
}

interface Owner {
  _id: string;
  name: string;
  email: string;
}

interface MembersPanelProps {
  workspaceId: string;
}

export default function MembersPanel({ workspaceId }: MembersPanelProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await getWorkspaceById(workspaceId);
      setMembers(res.data.members);
      setPendingInvites(res.data.pendingInvites || []);
      setOwner(res.data.owner);
    } catch {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!email.trim()) return toast.error('Email required');
    setInviting(true);
    try {
      await inviteMember(workspaceId, email);
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      fetchMembers(); // refresh list
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  // `identifier` is the invited user's id if they already have an account,
  // or the raw invited email if they don't yet — the backend matches either.
  const handleCancelInvite = async (identifier: string, name: string) => {
    try {
      await cancelWorkspaceInvite(workspaceId, identifier);
      toast.success(`Invite to ${name} cancelled`);
      setPendingInvites((prev) =>
        prev.filter((p) => (p.user?._id || p.email) !== identifier),
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel invite');
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    const isSelf = userId === user?._id;
    const prompt = isSelf
      ? 'Leave this workspace? You\'ll need a new invite to rejoin.'
      : `Remove ${name} from this workspace?`;
    if (!confirm(prompt)) return;
    try {
      await removeWorkspaceMember(workspaceId, userId);
      if (isSelf) {
        toast.success('You left the workspace');
        router.push('/dashboard');
        return;
      }
      toast.success(`${name} removed`);
      setMembers((prev) => prev.filter((m) => m.user._id !== userId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // Current user is owner or admin → can manage members
  const canManage =
    user?._id === owner?._id || members.some((m) => m.user._id === user?._id && m.role === 'admin');

  if (loading) return <div className="p-4 text-gray-500">Loading members...</div>;

  return (
    <div className="max-w-lg animate-fade-in-up">
      <h2 className="text-lg sm:text-xl font-bold text-black mb-6">Members</h2>

      {/* Owner row */}
      {owner && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Owner</p>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200">
            <div className="w-9 h-9 rounded-full bg-dusty-600 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
              {owner.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black truncate">{owner.name}</p>
              <p className="text-xs text-gray-500 truncate">{owner.email}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-dusty-600 text-black">owner</span>
          </div>
        </div>
      )}

      {/* Member list */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Members ({members.length})
        </p>
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No members yet. Invite someone below.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isOwnerRow = m.user._id === owner?._id;
              const isSelf = m.user._id === user?._id;
              return (
                <div
                  key={m.user._id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 transition-colors hover:bg-gray-50"
                >
                  <div className="w-9 h-9 rounded-full bg-sage-600 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {m.user.name} {isSelf && <span className="text-xs text-gray-500">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-black flex-shrink-0">
                    {m.role}
                  </span>
                  {/* Admins/owner can remove anyone (but not the owner row);
                      a plain member can always remove themselves — i.e.
                      leave the workspace on their own, no admin needed. */}
                  {!isOwnerRow && (canManage || isSelf) && (
                    <button
                      onClick={() => handleRemove(m.user._id, m.user.name)}
                      className="ml-1 text-gray-400 hover:text-red-600 text-xs transition-colors flex-shrink-0 p-1"
                      title={isSelf ? 'Leave workspace' : `Remove ${m.user.name}`}
                    >
                      {isSelf ? 'Leave' : '✕'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {canManage && pendingInvites.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Pending Invites ({pendingInvites.length})
          </p>
          <div className="space-y-2">
            {pendingInvites.map((p) => {
              const identifier = p.user?._id || p.email || '';
              const displayName = p.user?.name || p.email || 'Unknown';
              const displaySub = p.user
                ? p.user.email
                : "Not signed up yet — they'll see this invite once they do";
              return (
                <div
                  key={identifier}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white border border-dashed border-gray-300"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-sm flex-shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{displaySub}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                    pending
                  </span>
                  <button
                    onClick={() => handleCancelInvite(identifier, displayName)}
                    className="ml-1 text-gray-400 hover:text-red-600 text-xs transition-colors flex-shrink-0 p-1"
                    title={`Cancel invite to ${displayName}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Invite by email</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="flex-1 glass-input rounded-lg px-3 py-2 text-sm transition-colors"
            />
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="bg-dusty-600 hover:bg-dusty-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-black px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            >
              {inviting ? 'Sending…' : 'Invite'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
