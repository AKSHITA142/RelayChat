import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, User, Loader2,
} from "lucide-react";
import socket from "../services/socket";

void motion;

const PC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

const RINGER_URL = "https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3";

function startRinger() {
  stopRinger();
  const audio = new Audio(RINGER_URL);
  audio.loop = true;
  audio.play().catch(() => {});
  window.__ringer = audio;
}

function stopRinger() {
  const audio = window.__ringer;
  if (audio) {
    try { audio.pause(); audio.currentTime = 0; audio.src = ""; } catch { void 0; }
    window.__ringer = null;
  }
}

function broadcastStop() {}

window.__stopRinger = stopRinger;
stopRinger();

export default function VideoCall({ to, fromName, isIncoming, initialOffer, onClose }) {
  const log = (...args) => console.log("[VC]", ...args);

  const [status, setStatus] = useState(isIncoming ? "incoming" : "calling");
  const [isMuted, setIsMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pcRef = useRef(null);
  const lsRef = useRef(null);
  const remoteStream = useRef(new MediaStream());
  const iceQueue = useRef([]);
  const ringTimer = useRef(null);

  const clearRingTimer = useCallback(() => {
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    log("cleanup");
    stopRinger();
    broadcastStop();
    clearRingTimer();
    lsRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    lsRef.current = null;
    pcRef.current = null;
    remoteStream.current = new MediaStream();
  }, [clearRingTimer]);

  const endCall = useCallback(async () => {
    log("endCall");
    stopRinger();
    clearRingTimer();
    socket.emit("end-call", { to });
    cleanup();
    onClose();
  }, [to, cleanup, clearRingTimer, onClose]);

  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 360, max: 720 },
        frameRate: { ideal: 20, max: 24 },
      },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    lsRef.current = stream;
    if (localRef.current) localRef.current.srcObject = stream;
    return stream;
  }, []);

  const drainIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (iceQueue.current.length) {
      const candidate = iceQueue.current.shift();
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(log);
    }
  }, []);

  const buildPC = useCallback(() => {
    const pc = new RTCPeerConnection(PC_CONFIG);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("ice-candidate", { to, candidate });
    };

    pc.oniceconnectionstatechange = () => {
      log("ICE ->", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        cleanup();
        onClose();
      }
    };

    pc.ontrack = ({ track }) => {
      stopRinger();

      if (!remoteStream.current.getTracks().find((existing) => existing.id === track.id)) {
        remoteStream.current.addTrack(track);
      }
      if (remoteRef.current && remoteRef.current.srcObject !== remoteStream.current) {
        remoteRef.current.srcObject = remoteStream.current;
        remoteRef.current.play().catch(() => {});
      }
      setStatus("connected");
    };

    pcRef.current = pc;
    return pc;
  }, [to, cleanup, onClose]);

  const startCall = useCallback(async () => {
    log("startCall");
    const stream = await getMedia();
    const pc = buildPC();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call-user", { to, offer, fromName });
  }, [to, fromName, getMedia, buildPC]);

  const acceptCall = useCallback(async () => {
    log("acceptCall");
    stopRinger();
    clearRingTimer();
    setStatus("connecting");

    const stream = await getMedia();
    const pc = buildPC();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
    await drainIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer-call", { to, answer });
    setStatus("connected");
  }, [to, initialOffer, getMedia, buildPC, drainIce, clearRingTimer]);

  useEffect(() => {
    if (!isIncoming) {
      startCall();
    } else {
      startRinger();
    }

    socket.off("call-accepted");
    socket.on("call-accepted", async ({ answer }) => {
      stopRinger();
      broadcastStop();
      clearRingTimer();
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await drainIce();
      setStatus("connected");
    });

    socket.off("ice-candidate");
    socket.on("ice-candidate", async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(log);
      } else {
        iceQueue.current.push(candidate);
      }
    });

    socket.off("call-ended");
    socket.on("call-ended", async () => {
      stopRinger();
      broadcastStop();
      clearRingTimer();
      cleanup();
      onClose();
    });

    return () => {
      socket.off("call-accepted");
      socket.off("ice-candidate");
      socket.off("call-ended");
      stopRinger();
      clearRingTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const track = lsRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted((current) => !current);
    }
  };

  const toggleVideo = () => {
    const track = lsRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVidOff((current) => !current);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4"
    >
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 md:gap-5">
        <div className="relative w-full max-w-4xl aspect-video bg-whatsapp-sidebar-dark rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          <div className="w-full h-full bg-black relative">
            <video
              ref={remoteRef}
              data-call-video="remote"
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {status !== "connected" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-whatsapp-sidebar-dark">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-24 h-24 rounded-full bg-[#12f1ff]/10 flex items-center justify-center border border-[#12f1ff]/30"
                >
                  <User size={48} className="text-[#12f1ff]" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white">{fromName || "User"}</h3>
                  <p className="text-slate-400 text-sm mt-1 flex items-center gap-2 justify-center">
                    {status === "calling" && "Calling..."}
                    {status === "incoming" && "Incoming Video Call"}
                    {status === "connecting" && <><Loader2 className="animate-spin" size={14} /> Connecting...</>}
                  </p>
                </div>
              </div>
            )}

            <motion.div
              drag
              dragConstraints={{ left: 20, top: 20, right: 300, bottom: 200 }}
              className="absolute top-4 right-4 md:top-6 md:right-6 w-28 md:w-48 aspect-video bg-[#0b0e14] rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl z-20 cursor-grab"
            >
              <video
                ref={localRef}
                data-call-video="local"
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {vidOff && (
                <div className="absolute inset-0 bg-[#0b0e14] flex items-center justify-center">
                  <VideoOff size={24} className="text-slate-500" />
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="px-5 md:px-8 py-3 md:py-4 bg-whatsapp-sidebar-dark/85 backdrop-blur-2xl rounded-3xl border border-white/10 flex items-center gap-4 md:gap-6 z-30 shadow-2xl max-w-[calc(100vw-2rem)]">
          {status === "incoming" ? (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-[#12f1ff] text-[#0b0e14] flex items-center justify-center shadow-lg"
              >
                <Phone size={24} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg"
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
                className={`p-4 rounded-2xl transition-all ${isMuted ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                className={`p-4 rounded-2xl transition-all ${vidOff ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {vidOff ? <VideoOff size={24} /> : <Video size={24} />}
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
