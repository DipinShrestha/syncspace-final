// frontend/components/chat/Chat.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';
import { IconChat, IconSend, IconPhone, IconVideoCam, IconChevronDown, IconPhoneOff } from '@/components/icons';

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
  // Call state is owned by the parent (workspace page) so the call panel
  // can render above the chat and push it down while active — the picker
  // dropdown lives here in the header, but starting/ending the actual call
  // is handled one level up.
  onStartCall?: (type: 'audio' | 'video') => void;
  onEndCall?: () => void;
  activeCallType?: 'audio' | 'video' | null;
}

export default function Chat({ workspaceId, onStartCall, onEndCall, activeCallType }: ChatProps) {
  // Shared connection (see context/SocketContext.tsx) — this component no
  // longer opens its own socket.
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callMenuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Close the call-type dropdown on outside click.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (callMenuRef.current && !callMenuRef.current.contains(e.target as Node)) {
        setShowCallMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Join this workspace's chat room and load history. The socket connection
  // itself is shared app-wide (SocketContext) and usually already connected
  // by the time this mounts — so this joins immediately rather than waiting
  // for a 'connect' event that may never fire again during this component's
  // lifetime, and also re-joins if the connection drops and reconnects.
  useEffect(() => {
    if (!socket || !user) return;

    const joinAndLoad = () => {
      setIsConnected(true);
      socket.emit('join-workspace', workspaceId, user._id, (response: { error?: string }) => {
        if (response?.error) toast.error(response.error);
        else
          socket.emit('load-messages', workspaceId, (msgs: Message[]) => {
            setMessages(msgs || []);
            setMessagesLoaded(true);
          });
      });
    };

    if (socket.connected) joinAndLoad();
    socket.on('connect', joinAndLoad);

    const handleNewMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);
    const handleDisconnect = () => setIsConnected(false);
    socket.on('new-message', handleNewMessage);
    socket.on('disconnect', handleDisconnect);
    // Task-assignment / invite notifications are now handled globally by
    // the NotificationBell in the Navbar (persisted + targeted at the right
    // user), not locally here.

    return () => {
      socket.off('connect', joinAndLoad);
      socket.off('new-message', handleNewMessage);
      socket.off('disconnect', handleDisconnect);
    };
  }, [workspaceId, user, socket]);

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
    <div className="flex flex-col h-[60vh] sm:h-[70vh] glass rounded-2xl overflow-hidden">
      <div className="border-b border-white/60 p-3 sm:p-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Workspace Chat</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isConnected ? 'bg-sage-500' : 'bg-red-500'}`}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>

        {/* Call icon — same line as the title, right-aligned. Click opens a
            dropdown to choose Audio call or Video call. If a call is
            already active, this becomes a red "leave call" button instead. */}
        <div className="relative flex-shrink-0" ref={callMenuRef}>
          {activeCallType ? (
            <button
              onClick={() => onEndCall?.()}
              title="Leave call"
              className="flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 transition-all active:scale-95"
            >
              <IconPhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">Leave call</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowCallMenu((v) => !v)}
                title="Start a call"
                className="flex items-center gap-1 w-10 h-10 sm:w-auto sm:px-3 justify-center glass-outline rounded-full transition-all active:scale-95 text-black"
              >
                <IconPhone className="w-4 h-4" />
                <IconChevronDown className="w-3 h-3 hidden sm:block" />
              </button>
              {showCallMenu && (
                <div className="modal-panel absolute right-0 mt-2 w-44 glass rounded-2xl p-1.5 z-10 shadow-lg">
                  <button
                    onClick={() => {
                      setShowCallMenu(false);
                      onStartCall?.('audio');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-black hover:bg-white/70 transition-colors"
                  >
                    <IconPhone className="w-4 h-4 text-dusty-700" />
                    Audio call
                  </button>
                  <button
                    onClick={() => {
                      setShowCallMenu(false);
                      onStartCall?.('video');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-black hover:bg-white/70 transition-colors"
                  >
                    <IconVideoCam className="w-4 h-4 text-dusty-700" />
                    Video call
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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
      <div className="border-t border-white/60 p-3 sm:p-4">
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
