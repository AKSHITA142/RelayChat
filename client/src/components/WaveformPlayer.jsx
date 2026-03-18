import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { motion } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;

export default function WaveformPlayer({
  url,
  accentColor = "#25D366",   // played-bar + button colour
  trackColor  = "#000000",   // unplayed bar + timestamp colour
  playIconColor = "#ffffff", // icon inside the button
}) {
  const [isPlaying, setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);
  const [waveform, setWaveform]     = useState([]);

  const audioRef = useRef(null);

  // Stable pseudo-random waveform seeded from URL
  useEffect(() => {
    const seed = url
      ? url.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
      : 0;
    const bars = Array.from({ length: 40 }, (_, i) => {
      const x = Math.sin(seed + i * 2.3) * 0.5 + 0.5;
      return 0.2 + x * 0.78;
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWaveform(bars);
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate    = () => setCurrentTime(audioRef.current.currentTime);
  const handleLoadedMetadata = () => setDuration(audioRef.current.duration);
  const handleEnded         = () => { setIsPlaying(false); setCurrentTime(0); };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Derive readable colors from props
  const unplayedColor = `${trackColor}66`; // ~40% opacity
  const timeColor     = `${trackColor}b3`; // ~70% opacity
  const iconColor     = `${trackColor}a1`; // ~63% opacity

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl min-w-[240px]"
      style={{
        background: "rgba(0,0,0,0.07)",
        border: `1px solid ${trackColor}20`,
      }}
    >
      <audio
        ref={audioRef}
        src={url}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Play / Pause */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={togglePlay}
        className="w-10 h-10 flex items-center justify-center rounded-full shadow-md flex-shrink-0"
        style={{ background: accentColor, color: playIconColor }}
      >
        {isPlaying
          ? <Pause size={20} fill="currentColor" />
          : <Play  size={20} fill="currentColor" className="ml-0.5" />}
      </motion.button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Waveform bars */}
        <div className="flex items-end gap-[2px] h-8 px-1">
          {waveform.map((val, i) => {
            const isPlayed = progress > (i / waveform.length) * 100;
            return (
              <div
                key={i}
                style={{
                  height: `${val * 100}%`,
                  background: isPlayed ? accentColor : unplayedColor,
                  transition: "background 0.1s",
                }}
                className="w-[3px] rounded-full"
              />
            );
          })}
        </div>

        {/* Timestamps */}
        <div
          className="flex justify-between text-[10px] font-mono"
          style={{ color: timeColor }}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume icon */}
      <div style={{ color: iconColor }}>
        <Volume2 size={14} />
      </div>
    </div>
  );
}
