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
  // Some browsers block unmuted autoplay without a user gesture.
  // Try muted-first, then unmute after playback starts.
  audio.muted = true;
  audio.volume = 1;
  audio.play()
    .then(() => {
      console.log("[Ringer] Playback started successfully");
      try {
        audio.muted = false;
      } catch {
        void 0;
      }
    })
    .catch((err) => {
      console.error("[Ringer] Playback failed:", err);
    });
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
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const remoteAudioRef = useRef(null);
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

  const getMedia = useCallback(async (withVideo = true) => {
    try {
      log(`Requesting ${withVideo ? "camera and microphone" : "microphone only"}...`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: withVideo ? {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 360, max: 720 },
          frameRate: { ideal: 20, max: 24 },
        } : false,
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
          googEchoCancellation: true, // Legacy flag for some Chromium browsers
          googAutoGainControl: true,
          googNoiseSuppression: true,
        },
      });
      
      // If we are replacing an old stream, stop old tracks first
      if (lsRef.current) {
        lsRef.current.getTracks().forEach(t => t.stop());
      }

      lsRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      setVidOff(!withVideo);
      return stream;
    } catch (e) {
      log("Media request failed", e);
      if (withVideo) {
        log("Falling back to audio-only...");
        return getMedia(false);
      }
      throw e;
    }
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
      log("ICE State ->", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        cleanup();
        onClose();
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState !== "stable") return;
        log("Re-negotiating...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call-re-offer", { to, offer });
      } catch (err) {
        log("Negotiation Error", err);
      }
    };

    pc.ontrack = ({ track }) => {
      log("Track arrived:", track.kind);
      stopRinger();
      if (!remoteStream.current.getTracks().find((t) => t.id === track.id)) {
        remoteStream.current.addTrack(track);
      }
      if (remoteRef.current) {
        remoteRef.current.srcObject = null;
        remoteRef.current.srcObject = remoteStream.current;
        remoteRef.current.muted = false;
        remoteRef.current.volume = 1;
        remoteRef.current.play().catch(e => log("Remote play error", e));
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream.current;
        // Muted-first attempt to satisfy autoplay policies.
        remoteAudioRef.current.muted = true;
        remoteAudioRef.current.volume = 1;
        remoteAudioRef.current
          .play()
          .then(() => {
            setRemoteAudioBlocked(false);
            remoteAudioRef.current && (remoteAudioRef.current.muted = false);
          })
          .catch((e) => {
            log("Remote audio play blocked:", e);
            setRemoteAudioBlocked(true);
          });
      }
      setStatus("connected");
    };

    pcRef.current = pc;
    return pc;
  }, [to, cleanup, onClose]);

  const startCall = useCallback(async () => {
    log("startCall initiated");
    try {
      const stream = await getMedia();
      const pc = buildPC();

      stream.getTracks().forEach((track) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call-user", { to, offer, fromName });
      log("Offer sent");
    } catch (err) {
      log("startCall Error", err);
      setStatus("Error: " + (err.message || "Call failed"));
    }
  }, [to, fromName, getMedia, buildPC]);

  const acceptCall = useCallback(async () => {
    log("acceptCall initiated");
    stopRinger();
    clearRingTimer();
    setStatus("connecting");

    try {
      const stream = await getMedia();
      const pc = buildPC();

      stream.getTracks().forEach((track) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      });

      log("Setting remote desc...");
      await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
      await drainIce();
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer-call", { to, answer });
      log("Answer sent");
    } catch (err) {
      log("acceptCall Error", err);
      setStatus("Error: " + (err.message || "Accept failed"));
    }
  }, [to, initialOffer, getMedia, buildPC, drainIce, clearRingTimer]);

  // Ensure remote stream is attached whenever it's available and status changes to connected
  useEffect(() => {
    if (status === "connected" && remoteRef.current && remoteStream.current) {
      if (remoteRef.current.srcObject !== remoteStream.current) {
        log("Force-syncing remote video element...");
        remoteRef.current.srcObject = remoteStream.current;
        remoteRef.current.muted = false;
        remoteRef.current.volume = 1;
        remoteRef.current.play().catch(e => log("Remote play error in useEffect", e));
      }
    }
    if (status === "connected" && remoteAudioRef.current && remoteStream.current) {
      if (remoteAudioRef.current.srcObject !== remoteStream.current) {
        remoteAudioRef.current.srcObject = remoteStream.current;
      }
      remoteAudioRef.current.muted = true;
      remoteAudioRef.current.volume = 1;
      remoteAudioRef.current
        .play()
        .then(() => {
          setRemoteAudioBlocked(false);
          remoteAudioRef.current && (remoteAudioRef.current.muted = false);
        })
        .catch((e) => {
          log("Remote audio play blocked in useEffect:", e);
          setRemoteAudioBlocked(true);
        });
    }
  }, [status]);

  const enableRemoteAudio = useCallback(() => {
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.muted = false;
    remoteAudioRef.current
      .play()
      .then(() => setRemoteAudioBlocked(false))
      .catch((e) => log("Enable remote audio failed:", e));
  }, []);

  useEffect(() => {
    startRinger();
    if (!isIncoming) {
      startCall();
    }

    socket.off("call-accepted");
    socket.on("call-accepted", async ({ answer }) => {
      log("Call accepted, received answer");
      stopRinger();
      broadcastStop();
      clearRingTimer();
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await drainIce();
      } catch (err) {
        log("Error setting answer", err);
      }
    });

    socket.off("call-re-offer");
    socket.on("call-re-offer", async ({ offer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        log("Received re-offer");
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call-re-answer", { to, answer });
      } catch (err) {
        log("Re-offer error", err);
      }
    });

    socket.off("call-re-answer");
    socket.on("call-re-answer", async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        log("Received re-answer");
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        log("Re-answer error", err);
      }
    });

    socket.off("ice-candidate");
    socket.on("ice-candidate", async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        log("Adding ICE candidate...");
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(log);
      } else {
        log("Queuing ICE candidate...");
        iceQueue.current.push(candidate);
      }
    });

    socket.off("call-ended");
    socket.on("call-ended", async () => {
      log("Call ended by remote");
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
      cleanup();
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

  const toggleVideo = async () => {
    const track = lsRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVidOff(!track.enabled);
    } else if (vidOff) {
      try {
        log("Attempting to re-acquire camera...");
        const stream = await getMedia(true);
        const pc = pcRef.current;
        if (pc) {
          const videoTrack = stream.getVideoTracks()[0];
          if (!videoTrack) return;
          
          // Find the transceiver reserved for video during buildPC
          const sender = pc.getSenders().find(s => 
            s.track?.kind === "video" || 
            pc.getTransceivers().find(t => t.sender === s && t.receiver.track.kind === "video")
          );

          if (sender) {
            log("Injecting new video track into existing channel");
            await sender.replaceTrack(videoTrack).catch(log);
          } else {
            pc.addTrack(videoTrack, stream);
          }
        }
      } catch (err) {
        log("Failed to upgrade to video", err);
      }
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
            <audio
              ref={remoteAudioRef}
              autoPlay
              playsInline
              className="absolute -left-[9999px] top-0 h-1 w-1 opacity-0"
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

            {remoteAudioBlocked && status === "connected" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/30 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={enableRemoteAudio}
                  className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur-xl hover:bg-white/15"
                >
                  Enable call sound
                </button>
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
