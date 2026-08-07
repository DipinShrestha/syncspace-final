// frontend/components/NotificationBell.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  acceptWorkspaceInvite,
  declineWorkspaceInvite,
  NotificationItem,
} from '@/lib/api';
import toast from 'react-hot-toast';
import { IconBell, IconInbox, IconCheck, IconX, IconPhone, IconVideoCam } from '@/components/icons';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    getNotifications()
      .then((res) => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Live delivery: join a personal room so the backend can push
  // notifications straight to this user regardless of which page/workspace
  // they currently have open.
  useEffect(() => {
    if (!socket || !user) return;
    socket.emit('join-user', user._id);
    const handleNew = (notif: NotificationItem) => {
      setItems((prev) => [notif, ...prev]);

      if (notif.type === 'incoming_call') {
        toast.custom((t) => (
          <div className="bg-white border border-gray-200 shadow-xl rounded-xl px-4 py-3 min-w-[290px]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0">
                {notif.callType === 'audio' ? <IconPhone className="w-4 h-4" /> : <IconVideoCam className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-black">Incoming {notif.callType === 'audio' ? 'audio' : 'video'} call</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      handleReceiveCall(notif);
                    }}
                    className="px-3 py-1.5 rounded-md bg-sage-600 hover:bg-sage-700 text-black text-xs font-semibold transition-all active:scale-95"
                  >
                    Receive call
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-black hover:bg-gray-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        ), { duration: 15000 });
      } else {
        toast.success(notif.message);
      }
    };
    socket.on('notification', handleNew);
    return () => {
      socket.off('notification', handleNew);
    };
  }, [socket, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotification = async (n: NotificationItem) => {
    if (!n.read) {
      setItems((prev) => prev.map((i) => (i._id === n._id ? { ...i, read: true } : i)));
      markNotificationRead(n._id).catch(() => {});
    }
    const workspaceId = typeof n.workspace === 'string' ? n.workspace : n.workspace?._id;
    if (workspaceId) {
      setOpen(false);
      // Deep-link straight to the relevant tab rather than always landing
      // on Boards — chat/call notifications go to Chat, everything else
      // (including comments, since there's no per-card deep link yet)
      // lands on Boards where the card lives.
      const tab = n.type === 'new_message' || n.type === 'incoming_call' ? 'chat' : 'boards';
      router.push(`/workspace/${workspaceId}?tab=${tab}`);
    }
  };

  const handleReceiveCall = async (n: NotificationItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const workspaceId = typeof n.workspace === 'string' ? n.workspace : n.workspace?._id;
    if (!workspaceId) return;

    if (!n.read) {
      setItems((prev) => prev.map((i) => (i._id === n._id ? { ...i, read: true } : i)));
      markNotificationRead(n._id).catch(() => {});
    }

    const callType = n.callType === 'audio' ? 'audio' : 'video';
    setOpen(false);
    router.push(`/workspace/${workspaceId}?tab=chat&call=${callType}&join=1`);
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    markAllNotificationsRead().catch(() => {});
  };

  const handleAcceptInvite = async (n: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const workspaceId = typeof n.workspace === 'string' ? n.workspace : n.workspace?._id;
    if (!workspaceId) return;
    setRespondingId(n._id);
    try {
      await acceptWorkspaceInvite(workspaceId);
      toast.success('Invite accepted — welcome aboard!');
      setItems((prev) => prev.filter((i) => i._id !== n._id));
      setOpen(false);
      router.push(`/workspace/${workspaceId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept invite');
    } finally {
      setRespondingId(null);
    }
  };

  const handleDeclineInvite = async (n: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const workspaceId = typeof n.workspace === 'string' ? n.workspace : n.workspace?._id;
    if (!workspaceId) return;
    setRespondingId(n._id);
    try {
      await declineWorkspaceInvite(workspaceId);
      toast.success('Invite declined');
      setItems((prev) => prev.filter((i) => i._id !== n._id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to decline invite');
    } finally {
      setRespondingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-gray-100 transition-colors focus:outline-none"
      >
        <IconBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in-up absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-black">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-dusty-700 hover:underline font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-gray-500 text-sm px-4 py-6 text-center">Loading…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center text-center px-4 py-8">
                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
                  <IconInbox className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              items.map((n) =>
                n.type === 'incoming_call' ? (
                  <div
                    key={n._id}
                    className={`px-4 py-3 border-b border-gray-50 last:border-b-0 flex gap-2 items-start ${
                      !n.read ? 'bg-sage-50' : ''
                    }`}
                  >
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-sage-600 mt-1.5 flex-shrink-0" />
                    )}
                    <div className={n.read ? 'ml-4 flex-1' : 'flex-1'}>
                      <div className="flex items-center gap-2">
                        {n.callType === 'audio' ? (
                          <IconPhone className="w-4 h-4 text-sage-700 flex-shrink-0" />
                        ) : (
                          <IconVideoCam className="w-4 h-4 text-sage-700 flex-shrink-0" />
                        )}
                        <span className="block text-sm font-medium text-black">Incoming {n.callType === 'audio' ? 'audio' : 'video'} call</span>
                      </div>
                      <span className="block text-xs text-gray-500 mt-1">{n.message}</span>
                      <span className="block text-xs text-gray-400 mt-0.5 mb-2">
                        {timeAgo(n.createdAt)}
                      </span>
                      <button
                        onClick={(e) => handleReceiveCall(n, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sage-600 hover:bg-sage-700 text-black text-xs font-semibold transition-all active:scale-95"
                      >
                        {n.callType === 'audio' ? <IconPhone className="w-3.5 h-3.5" /> : <IconVideoCam className="w-3.5 h-3.5" />}
                        Receive call
                      </button>
                    </div>
                  </div>
                ) : n.type === 'workspace_invite' ? (
                  <div
                    key={n._id}
                    className={`px-4 py-3 border-b border-gray-50 last:border-b-0 flex gap-2 items-start ${
                      !n.read ? 'bg-dusty-50' : ''
                    }`}
                  >
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-dusty-600 mt-1.5 flex-shrink-0" />
                    )}
                    <div className={n.read ? 'ml-4 flex-1' : 'flex-1'}>
                      <span className="block text-sm text-black">{n.message}</span>
                      <span className="block text-xs text-gray-400 mt-0.5 mb-2">
                        {timeAgo(n.createdAt)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleAcceptInvite(n, e)}
                          disabled={respondingId === n._id}
                          className="flex items-center gap-1 px-3 py-1 rounded-md bg-dusty-600 hover:bg-dusty-700 text-black text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                        >
                          <IconCheck className="w-3 h-3" /> Accept
                        </button>
                        <button
                          onClick={(e) => handleDeclineInvite(n, e)}
                          disabled={respondingId === n._id}
                          className="flex items-center gap-1 px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100 text-black text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                        >
                          <IconX className="w-3 h-3" /> Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    key={n._id}
                    onClick={() => handleOpenNotification(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 transition-colors hover:bg-gray-50 flex gap-2 items-start ${
                      !n.read ? 'bg-dusty-50' : ''
                    }`}
                  >
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-dusty-600 mt-1.5 flex-shrink-0" />
                    )}
                    <span className={n.read ? 'ml-4' : ''}>
                      <span className="block text-sm text-black">{n.message}</span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
