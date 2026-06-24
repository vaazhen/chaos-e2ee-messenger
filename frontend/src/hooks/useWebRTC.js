import { useState, useRef, useCallback, useEffect } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function useWebRTC({ publish, onCallEnded }) {
  const [callState, setCallState] = useState('idle'); // idle | ringing | connecting | connected
  const [remoteUsername, setRemoteUsername] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callStartTimeRef = useRef(null);
  const currentChatIdRef = useRef(null);
  const currentTargetRef = useRef(null);
  const screenStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentOfferRef = useRef(null);

  const cleanupCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    pendingCandidatesRef.current = [];
    callStartTimeRef.current = null;
    currentChatIdRef.current = null;
    currentTargetRef.current = null;
    currentOfferRef.current = null;
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideo(false);
    setCallState('idle');
    setRemoteUsername('');
  }, []);

  const createPeerConnection = useCallback(async (stream, isCaller) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && publish && currentTargetRef.current) {
        publish('/app/call.ice-candidate', {
          targetUsername: currentTargetRef.current,
          chatId: currentChatIdRef.current,
          candidate: e.candidate.candidate,
          mid: e.candidate.sdpMid,
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteStreamRef.current) {
        e.streams[0].getTracks().forEach(t => remoteStreamRef.current.addTrack(t));
      } else {
        remoteStreamRef.current = e.streams[0];
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        onCallEnded?.();
        cleanupCall();
      }
    };

    peerRef.current = pc;
    return pc;
  }, [publish, cleanupCall, onCallEnded]);

  const startCall = useCallback(async (chatId, targetUsername, video = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      currentChatIdRef.current = chatId;
      currentTargetRef.current = targetUsername;
      setIsVideo(video);
      setCallState('connecting');

      const pc = await createPeerConnection(stream, true);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: video });
      await pc.setLocalDescription(offer);

      if (publish) {
        publish('/app/call.offer', {
          targetUsername,
          chatId,
          sdp: offer.sdp,
        });
      }
    } catch (e) {
      console.warn('[WebRTC] startCall error:', e.message);
      cleanupCall();
    }
  }, [publish, createPeerConnection, cleanupCall]);

  const answerCall = useCallback(async () => {
    const offerMsg = currentOfferRef.current;
    if (!offerMsg) return;
    const { sdp: offer, chatId, fromUsername } = offerMsg;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      currentChatIdRef.current = chatId;
      currentTargetRef.current = fromUsername;

      const pc = await createPeerConnection(stream, false);
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offer }));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      currentOfferRef.current = null;

      if (publish) {
        publish('/app/call.answer', {
          targetUsername: fromUsername,
          chatId,
          sdp: answer.sdp,
        });

        for (const candidate of pendingCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch { /* ignore optional failure */ }
        }
        pendingCandidatesRef.current = [];
      }

      setCallState('connected');
    } catch (e) {
      console.warn('[WebRTC] answerCall error:', e.message);
      cleanupCall();
    }
  }, [publish, createPeerConnection, cleanupCall, isVideo]);

  const handleSignalingMessage = useCallback(async (msg) => {
    const pc = peerRef.current;

    switch (msg.type) {
      case 'CALL_OFFER':
        currentOfferRef.current = msg;
        setRemoteUsername(msg.fromUsername || 'Unknown');
        setCallState('ringing');
        break;

      case 'CALL_ANSWER':
        if (pc && msg.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
          setCallState('connected');
          callStartTimeRef.current = Date.now();

          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch { /* ignore optional failure */ }
          }
          pendingCandidatesRef.current = [];
        }
        break;

      case 'ICE_CANDIDATE':
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate({ candidate: msg.candidate, sdpMid: msg.mid }));
          } catch { /* ignore optional failure */ }
        } else if (pc) {
          pendingCandidatesRef.current.push({ candidate: msg.candidate, sdpMid: msg.mid });
        }
        break;

      case 'CALL_END':
        cleanupCall();
        break;
    }
  }, [cleanupCall]);

  const endCall = useCallback(() => {
    if (publish && currentTargetRef.current) {
      publish('/app/call.end', {
        targetUsername: currentTargetRef.current,
        chatId: currentChatIdRef.current,
      });
    }
    cleanupCall();
  }, [publish, cleanupCall]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsMuted(v => !v);
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideo(v => !v);
      } else {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = newStream.getVideoTracks()[0];
          if (peerRef.current) {
            const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newTrack);
            } else {
              peerRef.current.addTrack(newTrack, localStreamRef.current);
            }
          }
          localStreamRef.current.addTrack(newTrack);
          if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          setIsVideo(true);
        } catch { /* ignore optional failure */ }
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
        }
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (peerRef.current) {
          const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) await sender.replaceTrack(videoTrack);
        }
        setIsScreenSharing(false);
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };

        if (peerRef.current) {
          const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          } else {
            peerRef.current.addTrack(screenTrack, localStreamRef.current || new MediaStream());
          }
        }
        setIsScreenSharing(true);
      }
    } catch (e) {
      console.warn('[WebRTC] screen share error:', e.message);
    }
  }, [isScreenSharing]);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    callState,
    remoteUsername,
    isVideo,
    isMuted,
    isScreenSharing,
    localVideoRef,
    remoteVideoRef,
    callDuration: callStartTimeRef.current ? Date.now() - callStartTimeRef.current : 0,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    handleSignalingMessage,
    cleanupCall,
  };
}
