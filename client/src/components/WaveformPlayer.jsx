import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { motion } from "framer-motion";

export default function WaveformPlayer({ url }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState([]);
  
  const audioRef = useRef(null);
  const canvasRef = useRef(null);

  // Generate a random-looking but consistent waveform for the URL
  useEffect(() => {
    // In a real app, you might want to pre-calculate this or fetch it
    // For now, let's generate a static representation
    const bars = [];
    for (let i = 0; i < 40; i++) {
      bars.push(0.3 + Math.random() * 0.7);
    }
    setWaveform(bars);
  }, [url]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl min-w-[240px]">
      <audio
        ref={audioRef}
        src={url}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={togglePlay}
        className="w-10 h-10 flex items-center justify-center bg-whatsapp-green text-whatsapp-bg-dark rounded-full shadow-lg transition-all"
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
      </motion.button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform Visualization */}
        <div className="flex items-end gap-[2px] h-8 px-1">
          {waveform.map((val, i) => {
            const barProgress = (i / waveform.length) * 100;
            const isPlayed = progress > barProgress;
            
            return (
              <div
                key={i}
                style={{ height: `${val * 100}%` }}
                className={`w-[3px] rounded-full transition-colors duration-300 ${isPlayed ? 'bg-whatsapp-green' : 'bg-white/20'}`}
              />
            );
          })}
        </div>
        
        <div className="flex justify-between items-center text-[10px] font-mono text-white/40">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="text-white/20">
        <Volume2 size={14} />
      </div>
    </div>
  );
}
