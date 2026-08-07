// frontend/components/VideoCall.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { useSocket } from '@/hooks/useSocket';
import { IconMic, IconMicOff, IconVideoCam, IconVideoOff, IconPhoneOff, IconPhone, IconCheck } from '@/components/icons';

interface VideoCallProps {
  roomId: string;
  userId: string;
  // Workspace room id is also the display name fallback used in the
  // "X started a video/audio call" notification sent to the rest of the workspace.
  callerName?: string;
  // 'audio' skips requesting the camera and renders avatar tiles instead of
  // video feeds. Defaults to 'video' for backwards compatibility.
  mode?: 'audio' | 'video';
  // The call picker dropdown (in Chat.tsx) is itself the user gesture that
  // grants camera/mic permission, so the call starts immediately on mount
  // instead of showing a second "Start Call" button to click.
  autoStart?: boolean;
  // When false, this client is joining an existing incoming call and must
  // not create a second 'call-started' notification for the workspace.
  announceStart?: boolean;
  // Lets the parent (workspace page) know the call ended, so it can stop
  // rendering this component and let chat take the full-height space again.
  onEnd?: () => void;
}

export default function VideoCall({ roomId, userId, callerName, mode = 'video', autoStart, announceStart = true, onEnd }: VideoCallProps) {
  // Shared connection (see context/SocketContext.tsx) — no longer opens its
  // own socket, so an active call no longer means a 3rd concurrent
  // connection alongside NotificationBell's and Chat's.
  const socket = useSocket();
  const [peer, setPeer] = useState<Peer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === 'video');
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const activeCallRef = useRef<MediaConnection | null>(null);
  const autoStartedRef = useRef(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // 2. Setup PeerJS client
  useEffect(() => {
    const newPeer = new Peer(userId);
    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [userId]);

  // 3. Get user's camera and microphone access (skips the camera entirely
  // in audio mode — no camera permission prompt, no video track to manage).
  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mode === 'video',
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCallActive(true);
      setMediaError(false);
      // Only the person who STARTS the call should announce it. A user who
      // clicks 'Receive call' from a notification joins the same room but
      // must not create another incoming-call notification.
      if (announceStart) {
        socket?.emit('call-started', {
          workspaceId: roomId,
          callerName: callerName || 'Someone',
          callType: mode,
        });
      }
    } catch (error) {
      console.error('Error accessing camera/mic:', error);
      setMediaError(true);
    }
  };

  // When launched from the Chat header's call-type picker, the dropdown
  // click itself is the user gesture — start immediately rather than
  // showing a redundant second "Start Call" button. Waits for the socket to
  // actually be connected first (autoStart can otherwise fire before the
  // socket effect above has set it, silently dropping the call-started
  // notification), and only fires once per mount.
  useEffect(() => {
    if (autoStart && socket && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, socket]);

  // The local <video> element does not exist until callActive becomes true.
  // startCall() previously tried to assign srcObject before that element was
  // mounted, so the other participant could see us while our own preview
  // stayed blank. Re-attach the stream after React renders the video tile.
  useEffect(() => {
    if (mode !== 'video' || !callActive || !localStream || !localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream;
    localVideoRef.current.play().catch(() => {});
  }, [localStream, callActive, mode]);

  // Do the same for the remote element so reconnects / re-renders cannot
  // leave a valid remote MediaStream detached from the <video> tag.
  useEffect(() => {
    if (mode !== 'video' || !callActive || !remoteStream || !remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream;
    remoteVideoRef.current.play().catch(() => {});
  }, [remoteStream, callActive, mode]);

  // 4. Join the meeting room and handle signaling events. The socket is
  // shared app-wide now, so cleanup uses named handler references and
  // `.off(event, handler)` rather than a blanket `.off(event)` — the latter
  // would be safe on a private socket but could remove another concurrent
  // consumer's listener on a shared one.
  useEffect(() => {
    if (!socket || !peer || !callActive) return;

    // Join the room
    socket.emit('join-room', roomId);

    const handlePeerCall = (call: MediaConnection) => {
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
    };
    // Handle incoming call (when another user joins and starts a call)
    peer.on('call', handlePeerCall);

    // When another user joins the room, initiate a call to them
    const handleUserConnected = (connectedUserId: string) => {
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
    };
    const handleUserDisconnected = () => setRemoteConnected(false);

    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);

    return () => {
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      peer.off('call', handlePeerCall);
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
    socket?.emit('leave-room', roomId);
    activeCallRef.current?.close();
    activeCallRef.current = null;
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteConnected(false);
    setCallActive(false);
    setMicOn(true);
    setCamOn(mode === 'video');
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    // Tell the workspace page to stop rendering this component entirely —
    // per the design, the call panel only occupies space while a call is
    // actually active; ending it should hand that space straight back to
    // chat rather than leaving an idle "Start Call" box in its place.
    onEnd?.();
  };

  // 6. Cleanup streams when component unmounts
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [localStream]);

  const initial = (callerName || 'Y').charAt(0).toUpperCase();

  // 7. UI — iOS-glass call surface. Video mode shows two rounded frosted
  // tiles; audio mode skips video entirely and shows pulsing avatar orbs
  // instead. A translucent status row up top replaces the old "Remote" /
  // "Waiting..." labels stamped in harsh black boxes on the video itself.
  return (
    <div className="w-full">
      {!callActive ? (
        <div className="glass rounded-3xl p-6 flex flex-col items-center gap-3 text-center">
          {mediaError ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <IconPhoneOff className="w-6 h-6" />
              </div>
              <p className="text-sm text-black font-medium">
                Couldn't access your {mode === 'video' ? 'camera or microphone' : 'microphone'}
              </p>
              <p className="text-xs text-gray-500 max-w-xs">
                Check your browser's permission settings and try again.
              </p>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={startCall}
                  className="glass-btn rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95"
                >
                  Retry
                </button>
                <button
                  onClick={() => onEnd?.()}
                  className="glass-outline rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : autoStart ? (
            <>
              <div className="w-12 h-12 rounded-full bg-dusty-100 text-dusty-700 flex items-center justify-center animate-pulse">
                {mode === 'video' ? (
                  <IconVideoCam className="w-6 h-6" />
                ) : (
                  <IconPhone className="w-6 h-6" />
                )}
              </div>
              <p className="text-sm text-gray-600">
                Connecting your {mode === 'video' ? 'camera and mic' : 'microphone'}…
              </p>
            </>
          ) : (
            <button
              onClick={startCall}
              className="glass-btn rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-95"
            >
              Start {mode === 'video' ? 'Video' : 'Audio'} Call
            </button>
          )}
        </div>
      ) : (
        <div className="glass rounded-3xl p-4 sm:p-5 space-y-4">
          {/* Status row */}
          <div className="flex items-center gap-2 px-1 text-sm font-medium text-black">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                remoteConnected ? 'bg-sage-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            {remoteConnected
              ? mode === 'video'
                ? 'Video call in progress'
                : 'Audio call in progress'
              : 'Waiting for the other participant to join…'}
          </div>

          {mode === 'video' ? (
            <div className="flex flex-col md:flex-row gap-3">
              {/* Local tile */}
              <div className="relative glass-outline rounded-2xl overflow-hidden w-full md:w-1/2 aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${camOn ? '' : 'hidden'}`}
                />
                {!camOn && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-dusty-600 text-black font-bold text-xl flex items-center justify-center">
                      {initial}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/45 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  You {!micOn && <IconMicOff className="w-3 h-3" />}
                </div>
              </div>
              {/* Remote tile */}
              <div className="relative glass-outline rounded-2xl overflow-hidden w-full md:w-1/2 aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${remoteConnected ? '' : 'hidden'}`}
                />
                {!remoteConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                    <div className="w-14 h-14 rounded-full bg-white/70 text-gray-400 flex items-center justify-center">
                      <IconPhone className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-gray-500 text-center">Waiting to connect…</p>
                  </div>
                )}
                {remoteConnected && (
                  <div className="absolute bottom-2 left-2 bg-black/45 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                    Remote
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Audio-only mode: no camera ever requested — pulsing avatar
               orbs stand in for video tiles entirely. */
            <div className="flex items-center justify-center gap-10 sm:gap-16 py-6">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-20 h-20 rounded-full bg-dusty-600 text-black font-bold text-2xl flex items-center justify-center ${
                    micOn ? 'ring-4 ring-dusty-200' : ''
                  }`}
                >
                  {initial}
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  You {!micOn && <IconMicOff className="w-3 h-3" />}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    remoteConnected
                      ? 'bg-sage-600 text-black font-bold text-2xl ring-4 ring-sage-200'
                      : 'bg-white/70 text-gray-400'
                  }`}
                >
                  {remoteConnected ? <IconCheck className="w-7 h-7" /> : <IconPhone className="w-7 h-7" />}
                </div>
                <span className="text-xs text-gray-500">
                  {remoteConnected ? 'Connected' : 'Waiting…'}
                </span>
              </div>
            </div>
          )}

          {/* Call controls */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={toggleMic}
              title={micOn ? 'Mute microphone' : 'Unmute microphone'}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                micOn ? 'glass-outline' : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {micOn ? <IconMic className="w-5 h-5" /> : <IconMicOff className="w-5 h-5" />}
            </button>
            {mode === 'video' && (
              <button
                onClick={toggleCam}
                title={camOn ? 'Turn camera off' : 'Turn camera on'}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  camOn ? 'glass-outline' : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {camOn ? <IconVideoCam className="w-5 h-5" /> : <IconVideoOff className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={endCall}
              title="End call"
              className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95"
            >
              <IconPhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
