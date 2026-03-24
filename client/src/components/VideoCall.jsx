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

    // Ensure we always have transceivers for both audio and video
    pc.addTransceiver("audio", { direction: "sendrecv" });
    pc.addTransceiver("video", { direction: "sendrecv" });

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
        remoteRef.current.play().catch(e => log("Remote play error", e));
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
        const sender = pc.getSenders().find(s => s.track?.kind === track.kind || (s.track === null && pc.getTransceivers().find(t => t.sender === s && t.receiver.track.kind === track.kind)));
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
        const sender = pc.getSenders().find(s => s.track?.kind === track.kind || (s.track === null && pc.getTransceivers().find(t => t.sender === s && t.receiver.track.kind === track.kind)));
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
        remoteRef.current.play().catch(e => log("Remote play error in useEffect", e));
      }
    }
  }, [status]);

  useEffect(() => {
    if (!isIncoming) {
      startCall();
    } else {
      startRinger();
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4 backdrop-blur-3xl"
    >
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 md:gap-5">
        <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-2xl">
          <div className="relative h-full w-full bg-background">
            <video
              ref={remoteRef}
              data-call-video="remote"
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {status !== "connected" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-card/95 backdrop-blur-xl">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10"
                >
                  <User size={48} className="text-primary" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground">{fromName || "User"}</h3>
                  <p className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
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
              className="absolute right-4 top-4 z-20 aspect-video w-28 cursor-grab overflow-hidden rounded-2xl border-2 border-border/70 bg-background shadow-xl md:right-6 md:top-6 md:w-48"
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
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                  <VideoOff size={24} className="text-muted-foreground" />
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="z-30 flex max-w-[calc(100vw-2rem)] items-center gap-4 rounded-3xl border border-border/70 bg-card/90 px-5 py-3 shadow-2xl backdrop-blur-2xl md:gap-6 md:px-8 md:py-4">
          {status === "incoming" ? (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={acceptCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
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
                className={`rounded-2xl p-4 transition-all ${isMuted ? "bg-destructive/20 text-destructive" : "bg-accent text-foreground hover:bg-accent/80"}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                className={`rounded-2xl p-4 transition-all ${vidOff ? "bg-destructive/20 text-destructive" : "bg-accent text-foreground hover:bg-accent/80"}`}
              >
                {vidOff ? <VideoOff size={24} /> : <Video size={24} />}
              </motion.button>
              <div className="h-8 w-px bg-border/60" />
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
