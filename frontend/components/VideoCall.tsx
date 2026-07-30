// frontend/components/VideoCall.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer, { MediaConnection } from 'peerjs';
import { IconMic, IconMicOff, IconVideoCam, IconVideoOff, IconPhoneOff } from '@/components/icons';

interface VideoCallProps {
  roomId: string;
  userId: string;
  // Workspace room id is also the display name fallback used in the
  // "X started a video call" notification sent to the rest of the workspace.
  callerName?: string;
}

export default function VideoCall({ roomId, userId, callerName }: VideoCallProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const activeCallRef = useRef<MediaConnection | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // 1. Setup Socket.io connection to signaling server
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5500';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 2. Setup PeerJS client
  useEffect(() => {
    const newPeer = new Peer(userId);
    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [userId]);

  // 3. Get user's camera and microphone access
  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCallActive(true);
      // Let the rest of the workspace know a call started, so they get a
      // live/persisted notification even if they're not on the chat tab.
      socket?.emit('call-started', {
        workspaceId: roomId,
        callerId: userId,
        callerName: callerName || 'Someone',
      });
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
        activeCallRef.current = call;
        call.on('stream', (remoteStream: MediaStream) => {
          setRemoteStream(remoteStream);
          setRemoteConnected(true);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });
        call.on('close', () => setRemoteConnected(false));
      }
    });

    // When another user joins the room, initiate a call to them
    socket.on('user-connected', (connectedUserId: string) => {
      if (localStream && connectedUserId !== userId) {
        const call = peer.call(connectedUserId, localStream);
        activeCallRef.current = call;
        call.on('stream', (remoteStream: MediaStream) => {
          setRemoteStream(remoteStream);
          setRemoteConnected(true);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });
        call.on('close', () => setRemoteConnected(false));
      }
    });

    socket.on('user-disconnected', () => setRemoteConnected(false));

    return () => {
      socket.off('user-connected');
      socket.off('user-disconnected');
      peer.off('call');
    };
  }, [socket, peer, localStream, callActive, roomId, userId]);

  // Mute/unmute mic — toggles the existing audio track rather than
  // stopping it, so the peer connection doesn't need renegotiation.
  const toggleMic = () => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCam = () => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const endCall = () => {
    activeCallRef.current?.close();
    activeCallRef.current = null;
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteConnected(false);
    setCallActive(false);
    setMicOn(true);
    setCamOn(true);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  // 6. Cleanup streams when component unmounts
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream]);

  // 7. UI controls — mute, camera toggle, end call, and a "waiting for the
  // other participant" placeholder over the remote tile until someone joins.
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {!callActive ? (
        <button
          onClick={startCall}
          className="bg-dusty-600 hover:bg-dusty-700 text-black font-bold py-2 px-4 rounded"
        >
          Start Video Call
        </button>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="relative bg-gray-800 rounded-lg overflow-hidden w-full md:w-1/2 aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${camOn ? '' : 'hidden'}`}
              />
              {!camOn && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                  Camera off
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                You {!micOn && <IconMicOff className="w-3 h-3" />}
              </div>
            </div>
            <div className="relative bg-gray-800 rounded-lg overflow-hidden w-full md:w-1/2 aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${remoteConnected ? '' : 'hidden'}`}
              />
              {!remoteConnected && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm text-center px-4">
                  Waiting for the other participant to join…
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                Remote
              </div>
            </div>
          </div>

          {/* Call controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMic}
              title={micOn ? 'Mute microphone' : 'Unmute microphone'}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                micOn ? 'glass-outline' : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {micOn ? <IconMic className="w-5 h-5" /> : <IconMicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleCam}
              title={camOn ? 'Turn camera off' : 'Turn camera on'}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                camOn ? 'glass-outline' : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {camOn ? <IconVideoCam className="w-5 h-5" /> : <IconVideoOff className="w-5 h-5" />}
            </button>
            <button
              onClick={endCall}
              title="End call"
              className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95"
            >
              <IconPhoneOff className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
