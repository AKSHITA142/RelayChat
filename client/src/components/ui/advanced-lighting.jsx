import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function AdvancedLighting({ children, intensity = 0.8, className }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  const lightingStyle = {
    background: `
      radial-gradient(
        circle at ${mousePosition.x}px ${mousePosition.y}px,
        hsla(var(--primary) / ${intensity}) 0%,
        transparent 40%
      )
    `
  };

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Dynamic Lighting */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={lightingStyle}
      />
      
      {/* Volumetric Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-full h-32"
          style={{
            background: "linear-gradient(to bottom, hsla(var(--primary) / 0.3), transparent)"
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Lens Flare */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-2 h-2 rounded-full bg-white"
          style={{
            left: mousePosition.x - 4,
            top: mousePosition.y - 4,
            boxShadow: "0 0 20px 10px hsla(var(--primary) / 0.8)"
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {children}
    </div>
  );
}

export function MaterialDesign3D({ children, depth = 20, className }) {
  return (
    <div 
      className={cn("relative", className)}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px"
      }}
    >
      {/* Material Layers */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, hsla(var(--primary) / 0.1), hsla(var(--secondary) / 0.05))",
          transform: `translateZ(${depth}px)`,
          boxShadow: "0 10px 40px -10px hsla(var(--primary) / 0.3)"
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
}

export function MicroInteractions({ children, className }) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Loading Skeleton */}
      <motion.div
        className="h-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%"]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundSize: "200% 100%"
        }}
      />
      
      {/* Progress Indicator */}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          animate={{
            width: ["0%", "100%"]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Success Animation */}
      <motion.div
        className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 300
        }}
      >
        ✓
      </motion.div>
      
      {children}
    </div>
  );
}

export function GamificationElements({ 
  achievements, 
  streak, 
  level, 
  className 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Achievement Badges */}
      <div className="flex gap-2">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300,
              delay: index * 0.1
            }}
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            <span className="text-lg">{achievement.icon}</span>
          </motion.div>
        ))}
      </div>
      
      {/* Streak Counter */}
      <div className="surface-panel flex items-center gap-3 rounded-2xl px-4 py-2">
        <motion.div
          className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white"
          animate={{
            rotate: [0, 360]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          🔥
        </motion.div>
        <div>
          <p className="text-sm font-semibold">{streak} Day Streak</p>
          <p className="text-xs text-muted-foreground">Keep it going!</p>
        </div>
      </div>
      
      {/* Level Progress */}
      <div className="surface-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Level {level}</span>
          <span className="text-xs text-muted-foreground">Next: {level + 1}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            animate={{
              width: "75%"
            }}
            transition={{
              duration: 1,
              ease: "easeOut"
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function SocialFeatures({ 
  sharedThemes, 
  collaborativeStatus, 
  className 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Shared Themes */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Shared Themes</h3>
        <div className="grid grid-cols-2 gap-2">
          {sharedThemes.map((theme, index) => (
            <motion.div
              key={theme.id}
              className="surface-panel rounded-xl p-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div 
                className="w-full h-8 rounded-lg mb-2"
                style={{ backgroundColor: theme.primary }}
              />
              <p className="text-xs font-medium">{theme.name}</p>
              <p className="text-xs text-muted-foreground">by {theme.author}</p>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Collaborative Status */}
      <div className="surface-panel rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold">Collaboration Active</span>
        </div>
        <div className="space-y-2">
          {collaborativeStatus.participants.map((participant, index) => (
            <div key={participant.id} className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name[0]}
              </div>
              <span className="text-xs">{participant.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ImmersiveExperiences({ 
  mode, 
  onModeChange, 
  className 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Mode Selector */}
      <div className="flex gap-2">
        {["normal", "focus", "theater", "presentation"].map((modeName) => (
          <motion.button
            key={modeName}
            onClick={() => onModeChange(modeName)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              mode === modeName 
                ? "bg-primary text-primary-foreground" 
                : "bg-white/10 text-muted-foreground hover:bg-white/20"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {modeName.charAt(0).toUpperCase() + modeName.slice(1)}
          </motion.button>
        ))}
      </div>
      
      {/* Mode Indicator */}
      <motion.div
        className="surface-panel rounded-2xl p-4 text-center"
        animate={{
          scale: [1, 1.02, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <p className="text-sm font-semibold capitalize">{mode} Mode</p>
        <p className="text-xs text-muted-foreground">
          {mode === "focus" && "Minimal distractions for deep work"}
          {mode === "theater" && "Cinematic viewing experience"}
          {mode === "presentation" && "Professional display mode"}
          {mode === "normal" && "Standard chat interface"}
        </p>
      </motion.div>
    </div>
  );
}
