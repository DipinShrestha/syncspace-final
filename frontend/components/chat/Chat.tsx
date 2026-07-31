// frontend/components/chat/Chat.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { IconChat, IconSend } from '@/components/icons';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface Message {
  _id: string;
  text: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar: string;
  };
  createdAt: string;
}

interface ChatProps {
  workspaceId: string;
}

export default function Chat({ workspaceId }: ChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5500';
    // Backend verifies this token on connection and derives the real user
    // id from it — join-workspace no longer trusts a client-supplied userId.
    const token = localStorage.getItem('token');
    const newSocket = io(socketUrl, { transports: ['websocket'], auth: { token } });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      newSocket.emit('join-workspace', workspaceId, user._id, (response: { error?: string }) => {
        if (response?.error) toast.error(response.error);
        else
          newSocket.emit('load-messages', workspaceId, (msgs: Message[]) => {
            setMessages(msgs || []);
            setMessagesLoaded(true);
          });
      });
    });

    newSocket.on('new-message', (msg: Message) => setMessages((prev) => [...prev, msg]));
    newSocket.on('disconnect', () => setIsConnected(false));
    // Task-assignment / invite notifications are now handled globally by
    // the NotificationBell in the Navbar (persisted + targeted at the right
    // user), not locally here.

    return () => {
      newSocket.disconnect();
    };
  }, [workspaceId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected) return;
    socket.emit(
      'send-message',
      { workspaceId, text: newMessage },
      (response: { error?: string }) => {
        if (response?.error) toast.error(response.error);
        else setNewMessage('');
      },
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[60vh] sm:h-[70vh] bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="border-b p-3 sm:p-4 bg-gray-50 rounded-t-lg">
        <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Workspace Chat</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isConnected ? 'bg-sage-500' : 'bg-red-500'}`}
          />
          {isConnected ? 'Connected' : 'Disconnected'}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {!messagesLoaded ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex ${i === 1 ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-end gap-2 max-w-[70%]">
                  {i !== 1 && <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />}
                  <div className={`h-10 rounded-lg bg-gray-200 ${i === 1 ? 'w-40' : 'w-56'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-full pt-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
              <IconChat className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender._id === user?._id;
            const prev = messages[i - 1];
            const showAvatar = !isMine && (!prev || prev.sender._id !== msg.sender._id);
            return (
              <div key={msg._id} className={`flex animate-fade-in-up ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] ${isMine ? 'flex-row-reverse' : ''}`}>
                  {!isMine && (
                    <div className={`w-7 h-7 rounded-full bg-sage-600 flex items-center justify-center text-black text-xs font-bold flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                      {msg.sender.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`rounded-lg px-4 py-2 ${isMine ? 'bg-dusty-600 text-black' : 'bg-gray-100 text-gray-900'}`}>
                    {!isMine && (
                      <div className="text-xs font-medium mb-1 text-gray-500">{msg.sender.name}</div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    <div className={`text-[10px] mt-1 ${isMine ? 'text-black/60' : 'text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-3 sm:p-4 bg-gray-50 rounded-b-lg">
        <div className="flex gap-2 items-end">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white resize-none transition-shadow focus:outline-none focus:ring-2 focus:ring-dusty-500 disabled:bg-gray-100 disabled:text-gray-400 max-h-32"
            rows={1}
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !newMessage.trim()}
            aria-label="Send message"
            className="bg-dusty-600 text-black w-10 h-10 flex-shrink-0 rounded-md flex items-center justify-center transition-all hover:bg-dusty-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <IconSend className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
