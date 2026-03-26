import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, X } from "lucide-react";
import { motion } from "framer-motion";


export default function VoiceRecorder({ onSend, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [visualizerData, setVisualizerData] = useState(new Array(20).fill(0));
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Setup Web Audio API for visualizer
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 64;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVisualizer = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        // Take a subset of frequencies for the UI bars
        const scaledData = Array.from(dataArray.slice(0, 20)).map(v => v / 255);
        setVisualizerData(scaledData);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        onSend(audioBlob);
        chunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied:", err);
      onCancel();
    }
  }, [onSend, onCancel]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      cleanup();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Don't trigger onSend
      mediaRecorderRef.current.stop();
    }
    cleanup();
    onCancel();
  };

  const cleanup = () => {
    setIsRecording(false);
    setRecordingTime(0);
    clearInterval(timerRef.current);
    cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  useEffect(() => {
    (async () => {
      await startRecording();
    })();
    return () => cleanup();
  }, [startRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="animate-slide-up surface-panel flex w-full items-center gap-4 px-4 py-3">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={cancelRecording}
        className="rounded-full p-2 text-destructive transition-colors hover:bg-destructive/10"
      >
        <X size={20} />
      </motion.button>

      <div className="flex flex-1 items-center gap-3">
        <div className="flex min-w-[45px] items-center gap-1">
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="h-2 w-2 rounded-full bg-destructive"
          />
          <span className="text-xs font-mono text-muted-foreground">{formatTime(recordingTime)}</span>
        </div>

        <div className="flex h-8 flex-1 items-center justify-center gap-[3px]">
          {visualizerData.map((val, i) => (
            <motion.div
              key={i}
              initial={{ height: 4 }}
              animate={{ height: Math.max(4, val * 32) }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-[3px] rounded-full bg-primary opacity-80"
            />
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={stopRecording}
        className="rounded-full border border-primary/30 bg-primary p-3 text-primary-foreground shadow-button transition-all"
      >
        <Send size={20} />
      </motion.button>
    </div>
  );
}
