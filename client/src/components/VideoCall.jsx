import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Phone, User, Loader2 } from "lucide-react";
import socket from "../services/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoCall({ 
  to, 
  fromName, 
  isIncoming, 
  initialOffer, 
  onClose 
}) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState(isIncoming ? "incoming" : "ringing");
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();
  const iceCandidatesQueue = useRef([]);

  // 1. Initialize PeerConnection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📡 Sending ICE candidate");
        socket.emit("ice-candidate", { to, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log("🎥 Received remote track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // 2. Start Local Stream
  const startLocalStream = async () => {
    try {
      const constraints = { 
        video: true, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      return null;
    }
  };

  // 3. Initiate Call (Outgoing)
  const initiateCall = async () => {
    const stream = await startLocalStream();
    if (!stream) return;

    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    socket.emit("call-user", { to, offer, fromName: "Me" });
  };

  // 4. Accept Call (Incoming)
  const acceptCall = async () => {
    setCallStatus("connecting");
    const stream = await startLocalStream();
    if (!stream) return;

    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
    
    // Process queued candidates
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("answer-call", { to, answer });
    setCallStatus("connected");
  };

  // 5. Handle Signaling Events
  useEffect(() => {
    if (!isIncoming) {
      initiateCall();
    }

    const handleCallAccepted = async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Process queued candidates
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        
        setCallStatus("connected");
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    };

    const handleCallEnded = () => {
      cleanup();
      onClose();
    };

    socket.on("call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);

    return () => {
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
    };
  }, []);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const endCall = () => {
    socket.emit("end-call", { to });
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      const tracks = localStream.getAudioTracks();
      tracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-4xl aspect-video bg-whatsapp-sidebar-dark rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        
        {/* Remote Video (Full Screen) */}
        <div className="flex-1 bg-black relative">
          {remoteStream ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-whatsapp-green/10 flex items-center justify-center border border-whatsapp-green/20">
                <User size={48} className="text-whatsapp-green" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white tracking-tight">{fromName || "User"}</h3>
                <p className="text-slate-400 text-sm mt-1 flex items-center justify-center gap-2">
                  {callStatus === "ringing" && "Calling..."}
                  {callStatus === "incoming" && "Incoming Video Call"}
                  {callStatus === "connecting" && <><Loader2 className="animate-spin" size={14} /> Securing connection...</>}
                </p>
              </div>
            </div>
          )}

          {/* Local Video (Picture in Picture) */}
          <motion.div 
            drag
            dragConstraints={{ left: 20, top: 20, right: 300, bottom: 200 }}
            className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-whatsapp-bg-dark rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl z-20 cursor-grab active:cursor-grabbing"
          >
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover brightness-110"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-whatsapp-bg-dark flex items-center justify-center">
                <VideoOff size={24} className="text-slate-500" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-whatsapp-sidebar-dark/80 backdrop-blur-2xl rounded-3xl border border-white/10 flex items-center gap-6 z-30 shadow-2xl">
          {callStatus === "incoming" ? (
            <>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-whatsapp-green text-whatsapp-bg-dark flex items-center justify-center shadow-lg shadow-whatsapp-green/20"
              >
                <Phone size={24} />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20"
              >
                <PhoneOff size={24} />
              </motion.button>
            </>
          ) : (
            <>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                className={`p-4 rounded-2xl transition-all ${isVideoOff ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'}`}
              >
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
              </motion.button>

              <div className="w-[1px] h-8 bg-white/10" />

              <motion.button 
                whileHover={{ scale: 1.1, rotate: 135 }}
                whileTap={{ scale: 0.9 }}
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40"
              >
                <PhoneOff size={24} />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
