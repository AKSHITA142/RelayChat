import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, User, Loader2,
} from "lucide-react";
import socket from "../services/socket";

/* ─── STUN servers ─── */
const PC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoCall({ to, fromName, isIncoming, initialOffer, onClose }) {
  /* ─── UI state ─── */
  const [status,   setStatus]   = useState(isIncoming ? "incoming" : "calling");
  const [isMuted,  setIsMuted]  = useState(false);
  const [vidOff,   setVidOff]   = useState(false);

  /* ─── refs ─── */
  const localRef  = useRef(null);   // local  <video muted>
  const remoteRef = useRef(null);   // remote <video> – NOT muted
  const pcRef     = useRef(null);
  const lsRef     = useRef(null);   // local MediaStream
  const remoteStreamRef = useRef(new MediaStream());
  const queueRef  = useRef([]);     // pending ICE candidates
  const ringerRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3"));

  useEffect(() => {
    ringerRef.current.loop = true;
    return () => {
      if (ringerRef.current) {
        ringerRef.current.pause();
        ringerRef.current.src = "";
      }
    };
  }, []);

  const stopRinger = () => {
    try {
      if (ringerRef.current) {
        log("🔇 Hard killing ringer src");
        ringerRef.current.pause();
        ringerRef.current.volume = 0;
        ringerRef.current.currentTime = 0;
        ringerRef.current.src = "";
        ringerRef.current.load();
        ringerRef.current = null;
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (status === "incoming" || status === "calling") {
      if (!ringerRef.current) {
        ringerRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3");
        ringerRef.current.loop = true;
      }
      ringerRef.current.play().catch(log);
    } else {
      stopRinger();
    }
    return () => {
      if (ringerRef.current) {
        stopRinger();
      }
    };
  }, [status]);

  /* ────────────────────────────────────────
     Helpers
  ──────────────────────────────────────── */
  const log = (...a) => console.log("[VC]", ...a);

  /** Drain the ICE queue once remoteDescription is set. */
  const drainQueue = async (pc) => {
    while (queueRef.current.length) {
      const c = queueRef.current.shift();
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(log);
    }
  };

  /** Ask for camera + mic. */
  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    lsRef.current = stream;

    // show local preview (muted so no echo)
    if (localRef.current) {
      localRef.current.srcObject = stream;
    }

    log("🎤 Local audio tracks:", stream.getAudioTracks().map(t => `${t.label} enabled=${t.enabled}`));
    return stream;
  };

  /** Build RTCPeerConnection, set up track handler. */
  const buildPC = () => {
    const pc = new RTCPeerConnection(PC_CONFIG);

    /* Send ICE candidates to the other side */
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("ice-candidate", { to, candidate });
    };

    /* Log state transitions */
    pc.oniceconnectionstatechange = () => {
      log("ICE →", pc.iceConnectionState);
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        log("⚠️ Connection lost, closing call");
        cleanup();
        onClose();
      }
    };
    pc.onconnectionstatechange = () => {
      log("Conn →", pc.connectionState);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        log("⚠️ Connection closed, exiting UI");
        cleanup();
        onClose();
      }
    };

    /*
     * KEY FIX: every incoming track is added to ONE MediaStream.
     * That stream is attached to the remote <video> element.
     * The <video> element is NOT muted, so it plays audio + video.
     */
    pc.ontrack = ({ track, streams }) => {
      log(`🎥 ontrack kind=${track.kind} readyState=${track.readyState}`);

      // Add track to our persistent stream
      if (!remoteStreamRef.current.getTracks().find(t => t.id === track.id)) {
        remoteStreamRef.current.addTrack(track);
      }

      // Attach the stream to the video element every time a track arrives
      if (remoteRef.current) {
        remoteRef.current.srcObject = remoteStreamRef.current;
        remoteRef.current.play().catch(e => log("play err:", e));
      }

      // Mark call as connected once we start getting media
      setStatus("connected");
    };

    pcRef.current = pc;
    return pc;
  };

  /* ────────────────────────────────────────
     Outgoing call
  ──────────────────────────────────────── */
  const startCall = async () => {
    const stream = await getMedia();
    const pc = buildPC();

    // Add ALL local tracks to the peer connection
    stream.getTracks().forEach(t => {
      log(`➕ addTrack ${t.kind}`);
      pc.addTrack(t, stream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    log("📤 Sending offer to", to);
    socket.emit("call-user", { to, offer, fromName });
  };

  /* ────────────────────────────────────────
     Accept incoming call
  ──────────────────────────────────────── */
  const acceptCall = async () => {
    stopRinger(); // EXPLICIT STOP
    setStatus("connecting");
    const stream = await getMedia();
    const pc = buildPC();

    stream.getTracks().forEach(t => {
      log(`➕ addTrack ${t.kind}`);
      pc.addTrack(t, stream);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
    await drainQueue(pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    log("📤 Sending answer to", to);
    socket.emit("answer-call", { to, answer });
    setStatus("connected");
  };

  /* ────────────────────────────────────────
     Socket events
  ──────────────────────────────────────── */
  useEffect(() => {
    if (!isIncoming) startCall();

    socket.on("call-accepted", async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await drainQueue(pc);
      setStatus("connected");
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(log);
      } else {
        queueRef.current.push(candidate);
      }
    });

    socket.on("call-ended", () => {
      stopRinger(); // EXPLICIT STOP
      cleanup();
      onClose();
    });

    return () => {
      socket.off("call-accepted");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, []);

  /* ────────────────────────────────────────
     Cleanup
  ──────────────────────────────────────── */
  const cleanup = () => {
    stopRinger();
    lsRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    lsRef.current = null;
    pcRef.current = null;
    remoteStreamRef.current = new MediaStream();
  };

  const endCall = () => {
    try {
      log("🔚 endCall triggered (cut button)");
      log("📤 Emitting end-call to:", to);
      socket.emit("end-call", { to });
      cleanup();
      onClose();
    } catch (err) {
      log("🚨 endCall error:", err);
      // fallback: close UI anyway
      cleanup();
      onClose();
    }
  };

  /* ────────────────────────────────────────
     Controls
  ──────────────────────────────────────── */
  const toggleMute = () => {
    const track = lsRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = isMuted;   // flip: if currently muted → enable
      setIsMuted(m => !m);
    }
  };

  const toggleVideo = () => {
    const track = lsRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = vidOff;
      setVidOff(v => !v);
    }
  };

  /* ────────────────────────────────────────
     Render
  ──────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-4xl aspect-video bg-whatsapp-sidebar-dark rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">

        {/* Remote video (NOT muted — plays both audio & video) */}
        <div className="flex-1 bg-black relative">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            /* intentionally NOT muted so audio plays */
            className="w-full h-full object-cover"
          />

          {/* Placeholder when no remote stream yet */}
          {status !== "connected" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-whatsapp-sidebar-dark">
              <div className="w-24 h-24 rounded-full bg-whatsapp-green/10 flex items-center justify-center border border-whatsapp-green/20">
                <User size={48} className="text-whatsapp-green" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{fromName || "User"}</h3>
                <p className="text-slate-400 text-sm mt-1 flex items-center gap-2 justify-center">
                  {status === "calling"    && "Calling…"}
                  {status === "incoming"   && "Incoming Video Call"}
                  {status === "connecting" && <><Loader2 className="animate-spin" size={14} /> Connecting…</>}
                </p>
              </div>
            </div>
          )}

          {/* Local PiP */}
          <motion.div
            drag dragConstraints={{ left: 20, top: 20, right: 300, bottom: 200 }}
            className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-whatsapp-bg-dark rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl z-20 cursor-grab"
          >
            <video ref={localRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {vidOff && (
              <div className="absolute inset-0 bg-whatsapp-bg-dark flex items-center justify-center">
                <VideoOff size={24} className="text-slate-500" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-whatsapp-sidebar-dark/80 backdrop-blur-2xl rounded-3xl border border-white/10 flex items-center gap-6 z-30 shadow-2xl">
          {status === "incoming" ? (
            <>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-whatsapp-green text-whatsapp-bg-dark flex items-center justify-center shadow-lg"
              >
                <Phone size={24} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg"
              >
                <PhoneOff size={24} />
              </motion.button>
            </>
          ) : (
            <>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className={`p-4 rounded-2xl transition-all ${isMuted ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </motion.button>

              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                className={`p-4 rounded-2xl transition-all ${vidOff ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {vidOff ? <VideoOff size={24} /> : <Video size={24} />}
              </motion.button>

              <div className="w-[1px] h-8 bg-white/10" />

              <motion.button whileHover={{ scale: 1.1, rotate: 135 }} whileTap={{ scale: 0.9 }}
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
