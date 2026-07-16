// frontend/components/chat/Chat.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

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
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5500';
    const newSocket = io(socketUrl, { transports: ['websocket'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      newSocket.emit('join-workspace', workspaceId, user._id, (response: { error?: string }) => {
        if (response?.error) toast.error(response.error);
        else
          newSocket.emit('load-messages', workspaceId, (msgs: Message[]) =>
            setMessages(msgs || []),
          );
      });
    });

    newSocket.on('new-message', (msg: Message) => setMessages((prev) => [...prev, msg]));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('notification', (data: { message: string }) => toast.success(data.message));

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
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 text-sm">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex animate-fade-in-up ${msg.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-4 py-2 ${
                  msg.sender._id === user?._id
                    ? 'bg-dusty-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1 ${msg.sender._id === user?._id ? 'text-dusty-100' : 'text-gray-500'}`}
                >
                  {msg.sender.name}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-3 sm:p-4 bg-gray-50 rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white resize-none transition-shadow focus:outline-none focus:ring-2 focus:ring-dusty-500 disabled:bg-gray-100 disabled:text-gray-400"
            rows={1}
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !newMessage.trim()}
            className="bg-dusty-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-all hover:bg-dusty-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
