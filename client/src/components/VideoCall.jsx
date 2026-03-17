import { useEffect, useRef, useState, useCallback } from "react";
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
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

const CALL_TIMEOUT_MS = 30_000; // 30 seconds — auto-cut if unanswered (same as WhatsApp)

/* ─── Ringer — stored on window so it survives HMR and is always killable ─── */
const RINGER_URL = "https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3";

function startRinger() {
  stopRinger(); // always kill old one first
  const a = new Audio(RINGER_URL);
  a.loop = true;
  a.play().catch(() => {});
  window.__ringer = a;
}

function stopRinger() {
  const a = window.__ringer;
  if (a) {
    try { a.pause(); a.currentTime = 0; a.src = ""; } catch(_) {}
    window.__ringer = null;
  }
}

// Expose so console can always kill it: window.__stopRinger()
window.__stopRinger = stopRinger;

// Kill any rogue audio from previous HMR cycle right now
stopRinger();

function broadcastStop() {} // no-op


/* ─────────────────────────────────────────────
   VideoCall Component
───────────────────────────────────────────── */
export default function VideoCall({ to, fromName, isIncoming, initialOffer, onClose }) {
  const log = (...a) => console.log("[VC]", ...a);

  const [status, setStatus] = useState(isIncoming ? "incoming" : "calling");
  const [isMuted, setIsMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);

  const localRef       = useRef(null);
  const remoteRef      = useRef(null);
  const remoteAudioRef = useRef(null);   // dedicated <audio> for remote audio
  const pcRef          = useRef(null);
  const lsRef          = useRef(null);
  const remoteStream   = useRef(new MediaStream());
  const iceQueue       = useRef([]);
  const ringTimer      = useRef(null);  // 30-second ringing timeout

  /* ── clear ringing timeout ── */
  const clearRingTimer = useCallback(() => {
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
  }, []);

  /* ── full cleanup ── */
  const cleanup = useCallback(() => {
    log("🧹 cleanup");
    stopRinger();
    broadcastStop();
    clearRingTimer();
    lsRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    // Tear down remote audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    lsRef.current = null;
    pcRef.current = null;
    remoteStream.current = new MediaStream();
  }, [clearRingTimer]);

  /* ── end call ── */
  const endCall = useCallback(async () => {
    log("🔚 endCall");
    stopRinger();            // stop ringer first (if receiver rejects)
    clearRingTimer();
    socket.emit("end-call", { to });
    cleanup();
    onClose();
  }, [to, cleanup, clearRingTimer, onClose]);

  /* ── get camera + mic ── */
  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    lsRef.current = stream;
    if (localRef.current) localRef.current.srcObject = stream;
    return stream;
  }, []);

  /* ── drain ICE queue ── */
  const drainIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (iceQueue.current.length) {
      const c = iceQueue.current.shift();
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(log);
    }
  }, []);

  /* ── build RTCPeerConnection ── */
  const buildPC = useCallback(() => {
    const pc = new RTCPeerConnection(PC_CONFIG);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("ice-candidate", { to, candidate });
    };

    pc.oniceconnectionstatechange = () => {
      log("ICE →", pc.iceConnectionState);
      // Only close on hard failure, not on 'disconnected' (transient)
      if (pc.iceConnectionState === "failed") {
        log("❌ ICE failed, ending call");
        cleanup();
        onClose();
      }
    };

    pc.ontrack = ({ track, streams }) => {
      log("🎥 ontrack:", track.kind);
      // Safety: stop ringer when media arrives (extra guard)
      stopRinger();

      // Add track to our combined remote stream
      if (!remoteStream.current.getTracks().find(t => t.id === track.id)) {
        remoteStream.current.addTrack(track);
      }

      if (track.kind === "video") {
        // Attach the full stream (video + audio) to the remote video element
        if (remoteRef.current) {
          remoteRef.current.srcObject = remoteStream.current;
          remoteRef.current.play().catch(e => log("remote video play error:", e));
        }
      }

      if (track.kind === "audio") {
        // Use a dedicated audio element so the browser always plays audio through speakers
        if (remoteAudioRef.current) {
          // Build an audio-only stream for the dedicated element
          const audioOnlyStream = new MediaStream();
          remoteStream.current.getAudioTracks().forEach(t => audioOnlyStream.addTrack(t));
          remoteAudioRef.current.srcObject = audioOnlyStream;
          remoteAudioRef.current.play().catch(e => log("remote audio play error:", e));
        }
      }

      setStatus("connected");
    };

    pcRef.current = pc;
    return pc;
  }, [to, cleanup, onClose]);

  /* ── outgoing call ── */
  const startCall = useCallback(async () => {
    log("📤 startCall");
    const stream = await getMedia();
    const pc = buildPC();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call-user", { to, offer, fromName });

    // Auto-cut after 30 s if receiver never answers
    ringTimer.current = setTimeout(() => {
      log("⏰ No answer — auto-cutting call");
      endCall();
    }, CALL_TIMEOUT_MS);
  }, [to, fromName, getMedia, buildPC, endCall]);

  /* ── accept incoming call ── */
  const acceptCall = useCallback(async () => {
    log("📞 acceptCall");
    stopRinger();      // ← STOP RINGER IMMEDIATELY on green button click
    clearRingTimer();
    setStatus("connecting");

    const stream = await getMedia();
    const pc = buildPC();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
    await drainIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer-call", { to, answer });
    setStatus("connected");
  }, [to, initialOffer, getMedia, buildPC, drainIce, clearRingTimer]);

  /* ── socket events ── */
  useEffect(() => {
    if (!isIncoming) {
      startCall(); // timer is started inside startCall
    } else {
      // Play ringer for the receiver
      startRinger();
      // Auto-dismiss incoming call after 30 s if receiver ignores it
      ringTimer.current = setTimeout(() => {
        log("⏰ Receiver didn't answer — auto-dismissing");
        stopRinger();
        socket.emit("end-call", { to });
        cleanup();
        onClose();
      }, CALL_TIMEOUT_MS);
    }

    // Caller receives answer
    socket.off("call-accepted");
    socket.on("call-accepted", async ({ answer }) => {
      log("✅ call-accepted");
      stopRinger();   // stop ring-back
      broadcastStop();
      clearRingTimer(); // cancel the 30 s timeout — call was answered
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
      log("🔴 call-ended by remote");
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

  /* ── mic / video controls ── */
  const toggleMute = () => {
    const track = lsRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(m => !m); }
  };

  const toggleVideo = () => {
    const track = lsRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVidOff(v => !v); }
  };

  /* ── render ── */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-4xl aspect-video bg-whatsapp-sidebar-dark rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">

        {/* Remote video */}
        <div className="flex-1 bg-black relative">
          {/* Hidden dedicated audio element — ensures remote audio plays through speakers */}
          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
          <video
            ref={remoteRef}
            data-call-video="remote"
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
          />

          {/* Pre-connect placeholder */}
          {status !== "connected" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-whatsapp-sidebar-dark">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-24 h-24 rounded-full bg-whatsapp-green/10 flex items-center justify-center border border-whatsapp-green/30"
              >
                <User size={48} className="text-whatsapp-green" />
              </motion.div>
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
            <video ref={localRef} data-call-video="local" autoPlay muted playsInline className="w-full h-full object-cover" />
            {vidOff && (
              <div className="absolute inset-0 bg-whatsapp-bg-dark flex items-center justify-center">
                <VideoOff size={24} className="text-slate-500" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Controls bar */}
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









