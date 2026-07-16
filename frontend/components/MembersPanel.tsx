'use client';

// MembersPanel — replaces the old InviteMember widget.
// Shows the full member list, lets admins remove members,
// and has the invite-by-email form at the bottom.

import { useEffect, useState, useCallback } from 'react';
import { getWorkspaceById, inviteMember, removeWorkspaceMember } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface Member {
  user: { _id: string; name: string; email: string };
  role: 'admin' | 'member';
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
  const [members, setMembers] = useState<Member[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await getWorkspaceById(workspaceId);
      setMembers(res.data.members);
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
      toast.success(`Invited ${email}`);
      setEmail('');
      fetchMembers(); // refresh list
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this workspace?`)) return;
    try {
      await removeWorkspaceMember(workspaceId, userId);
      toast.success(`${name} removed`);
      setMembers((prev) => prev.filter((m) => m.user._id !== userId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // Current user is owner or admin → can manage members
  const canManage =
    user?._id === owner?._id || members.some((m) => m.user._id === user?._id && m.role === 'admin');

  if (loading) return <div className="p-4 text-gray-400">Loading members...</div>;

  return (
    <div className="max-w-lg animate-fade-in-up">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-6">Members</h2>

      {/* Owner row */}
      {owner && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Owner</p>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800">
            <div className="w-9 h-9 rounded-full bg-dusty-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {owner.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{owner.name}</p>
              <p className="text-xs text-gray-400 truncate">{owner.email}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-dusty-900 text-dusty-100">
              owner
            </span>
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
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800 transition-colors hover:bg-white/[0.08]"
                >
                  <div className="w-9 h-9 rounded-full bg-sage-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {m.user.name} {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 flex-shrink-0">
                    {m.role}
                  </span>
                  {/* Show remove button to admins/owner, but not for the owner row itself */}
                  {canManage && !isOwnerRow && (
                    <button
                      onClick={() => handleRemove(m.user._id, m.user.name)}
                      className="ml-1 text-gray-500 hover:text-red-400 text-xs transition-colors flex-shrink-0 p-1"
                      title={`Remove ${m.user.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-dusty-500"
            />
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="bg-dusty-600 hover:bg-dusty-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            >
              {inviting ? 'Sending…' : 'Invite'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
