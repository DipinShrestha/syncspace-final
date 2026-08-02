// PERF FIX: this used to open a brand new socket.io connection on every
// call — now it just reads the single shared connection from SocketContext
// (see context/SocketContext.tsx for why). Re-exported under the same name
// and import path so existing consumers (NotificationBell, BoardView)
// didn't need to change their imports.
export { useSocket } from '@/context/SocketContext';
