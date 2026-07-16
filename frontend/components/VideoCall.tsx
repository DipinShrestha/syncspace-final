// frontend/components/VideoCall.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer, { MediaConnection } from 'peerjs';

interface VideoCallProps {
  roomId: string;
  userId: string;
}

export default function VideoCall({ roomId, userId }: VideoCallProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callActive, setCallActive] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // 1. Setup Socket.io connection to signaling server
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5500';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    return () => { newSocket.disconnect(); };
  }, []);

  // 2. Setup PeerJS client
  useEffect(() => {
    const newPeer = new Peer(userId);
    setPeer(newPeer);

    return () => { newPeer.destroy(); };
  }, [userId]);

  // 3. Get user's camera and microphone access
  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCallActive(true);
    } catch (error) {
      console.error('Error accessing camera/mic:', error);
    }
  };

  // 4. Join the meeting room and handle signaling events
  useEffect(() => {
    if (!socket || !peer || !callActive) return;

    // Join the room
    socket.emit('join-room', roomId, userId);

    // Handle incoming call (when another user joins and starts a call)
    peer.on('call', (call: MediaConnection) => {
      if (localStream) {
        call.answer(localStream);
        call.on('stream', (remoteStream: MediaStream) => {
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });
      }
    });

    // When another user joins the room, initiate a call to them
    socket.on('user-connected', (connectedUserId: string) => {
      if (localStream && connectedUserId !== userId) {
        const call = peer.call(connectedUserId, localStream);
        call.on('stream', (remoteStream: MediaStream) => {
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });
      }
    });

    return () => {
      socket.off('user-connected');
      peer.off('call');
    };
  }, [socket, peer, localStream, callActive, roomId, userId]);

  // 6. Cleanup streams when component unmounts
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  // 7. Simple UI controls
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {!callActive ? (
        <button onClick={startCall} className="bg-dusty-600 hover:bg-dusty-700 text-white font-bold py-2 px-4 rounded">
          Start Video Call
        </button>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="relative bg-gray-800 rounded-lg overflow-hidden w-full md:w-1/2">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-auto" />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">You</div>
          </div>
          <div className="relative bg-gray-800 rounded-lg overflow-hidden w-full md:w-1/2">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-auto" />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Remote</div>
          </div>
        </div>
      )}
    </div>
  );
}