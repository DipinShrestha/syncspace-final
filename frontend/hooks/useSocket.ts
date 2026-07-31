import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5500';
    // The backend verifies this token on connection (see chatSocket.js) and
    // derives the real user id from it server-side — it no longer trusts a
    // userId passed in individual event payloads.
    const token = localStorage.getItem('token');
    const s = io(socketUrl, { auth: { token } });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);
  return socket;
};
