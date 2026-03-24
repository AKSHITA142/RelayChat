import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { motion } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;

export default function WaveformPlayer({
  url,
  accentColor = "hsl(var(--primary))",
  trackColor = "hsl(var(--foreground))",
  playIconColor = "hsl(var(--primary-foreground))",
}) {
  const [isPlaying, setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);
  const [waveform, setWaveform]     = useState([]);

  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const barRefs = useRef([]);

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

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.style.setProperty("--wave-accent", accentColor);
    containerRef.current.style.setProperty("--wave-track", trackColor);
    containerRef.current.style.setProperty("--wave-icon", playIconColor);
  }, [accentColor, trackColor, playIconColor]);

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

  useEffect(() => {
    barRefs.current.forEach((bar, index) => {
      if (!bar) return;
      const value = waveform[index] ?? 0.35;
      const isPlayed = progress > (index / Math.max(waveform.length, 1)) * 100;
      bar.style.setProperty("--bar-height", `${value * 100}%`);
      bar.style.setProperty(
        "--bar-color",
        isPlayed ? "var(--wave-accent)" : "color-mix(in srgb, var(--wave-track) 40%, transparent)"
      );
    });
  }, [progress, waveform]);

  return (
    <div ref={containerRef} className="waveform-player flex min-w-[240px] items-center gap-3 rounded-2xl border p-3">
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
        className="waveform-player__toggle h-10 w-10 shrink-0 rounded-full shadow-md"
      >
        {isPlaying
          ? <Pause size={20} fill="currentColor" />
          : <Play  size={20} fill="currentColor" className="ml-0.5" />}
      </motion.button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Waveform bars */}
        <div className="flex items-end gap-[2px] h-8 px-1">
          {waveform.map((val, i) => {
            return (
              <div
                key={i}
                ref={(element) => {
                  barRefs.current[i] = element;
                }}
                className="waveform-player__bar w-[3px] rounded-full"
              />
            );
          })}
        </div>

        {/* Timestamps */}
        <div className="waveform-player__time flex justify-between text-[10px] font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume icon */}
      <div className="waveform-player__volume">
        <Volume2 size={14} />
      </div>
    </div>
  );
}
