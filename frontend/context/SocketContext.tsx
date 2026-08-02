'use client';

// PERF FIX: NotificationBell, BoardView, Chat, and VideoCall each used to
// open their own independent `io(...)` connection. Since NotificationBell
// lives in the Navbar (mounted on almost every page) and the other three
// mount alongside it, a single workspace chat tab could have 2 concurrent
// sockets open, and an active call could have 3 — each paying its own
// connection handshake + JWT auth round trip, and each competing for the
// same limited resources on a free-tier backend. This provider opens ONE
// authenticated socket per logged-in session and every consumer below
// shares it via useSocket().
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return;
    }
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5500';
    // Backend verifies this token on connection (see chatSocket.js) and
    // derives the real user id from it server-side.
    const token = localStorage.getItem('token');
    const s = io(socketUrl, { transports: ['websocket'], auth: { token } });
    setSocket(s);

    return () => {
      s.disconnect();
    };
    // Reconnect only when *who* is logged in changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

// Same name/shape as the old per-component hook (`socket.connected` may
// already be true by the time a consumer mounts, since the connection is
// now shared and long-lived — callers that gate UI on "connected" should
// check `socket?.connected` directly rather than only listening for a
// 'connect' event that may never fire again during their lifetime).
export function useSocket(): Socket | null {
  return useContext(SocketContext);
}
