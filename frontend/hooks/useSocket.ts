import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5500';
    const s = io(socketUrl);
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);
  return socket;
};
