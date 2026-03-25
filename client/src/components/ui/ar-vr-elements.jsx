import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ARReactionOverlay({ 
  reactions, 
  position, 
  onAnimationComplete,
  className 
}) {
  const [visibleReactions, setVisibleReactions] = useState([]);

  useEffect(() => {
    if (reactions.length > 0) {
      const newReaction = reactions[reactions.length - 1];
      setVisibleReactions(prev => [...prev, { ...newReaction, id: Date.now() }]);
      
      // Remove reaction after animation
      setTimeout(() => {
        setVisibleReactions(prev => prev.filter(r => r.id !== newReaction.id));
        onAnimationComplete?.();
      }, 3000);
    }
  }, [reactions, onAnimationComplete]);

  return (
    <div 
      className={cn("fixed inset-0 pointer-events-none z-50", className)}
      style={{ perspective: "1000px" }}
    >
      {visibleReactions.map((reaction, index) => (
        <motion.div
          key={reaction.id}
          className="absolute text-4xl"
          style={{
            left: position.x,
            top: position.y,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ 
            scale: 0, 
            rotateZ: -180,
            opacity: 0,
            z: -100
          }}
          animate={{
            scale: [0, 1.5, 1],
            rotateZ: [-180, 0, 10],
            opacity: [0, 1, 1, 0],
            z: [-100, 0, 100],
            y: [0, -50, -100]
          }}
          transition={{
            duration: 3,
            ease: "easeOut"
          }}
        >
          <motion.div
            className="relative"
            animate={{
              rotateY: [0, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {reaction.emoji}
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20 blur-xl"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

export function VRChatRoom({ 
  participants, 
  isActive, 
  onParticipantClick,
  className 
}) {
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current || !isActive) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = ((e.clientX - centerX) / rect.width) * 30;
    const y = ((e.clientY - centerY) / rect.height) * -30;
    
    setCameraRotation({ x, y });
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full rounded-3xl overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      style={{ 
        background: "radial-gradient(ellipse at center, #1a1a2e, #0f0f1e)",
        perspective: "1000px"
      }}
    >
      {/* VR Environment */}
      <motion.div
        className="absolute inset-0"
        style={{
          transform: `rotateX(${cameraRotation.x}deg) rotateY(${cameraRotation.y}deg)`,
          transformStyle: "preserve-3d"
        }}
      >
        {/* Virtual Room */}
        <div className="absolute inset-0">
          {/* Floor */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: "linear-gradient(to top, #0a0a0f, transparent)",
              transform: "rotateX(90deg) translateZ(-64px)"
            }}
          />
          
          {/* Walls */}
          <div 
            className="absolute inset-0 border border-white/10"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.05))",
              boxShadow: "inset 0 0 100px rgba(99, 102, 241, 0.2)"
            }}
          />
        </div>

        {/* 3D Participant Avatars */}
        {participants.map((participant, index) => {
          const angle = (index / participants.length) * Math.PI * 2;
          const radius = 150;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;

          return (
            <motion.div
              key={participant.id}
              className="absolute top-1/2 left-1/2 cursor-pointer"
              style={{
                transform: `translate3d(${x}px, -50px, ${z}px)`,
                transformStyle: "preserve-3d"
              }}
              onClick={() => onParticipantClick?.(participant)}
              whileHover={{ scale: 1.1, y: -10 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="relative"
                animate={{
                  rotateY: [0, 360],
                }}
                transition={{
                  duration: 10 + index * 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                {/* Avatar */}
                <div 
                  className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${participant.color || '#6366f1'}, ${participant.color || '#8b5cf6'})`,
                    boxShadow: `0 10px 30px -10px ${participant.color || '#6366f1'}`
                  }}
                >
                  {participant.name?.[0]?.toUpperCase() || "U"}
                </div>
                
                {/* Name Tag */}
                <div 
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-xs text-white whitespace-nowrap"
                  style={{
                    background: "rgba(0, 0, 0, 0.8)",
                    backdropFilter: "blur(10px)"
                  }}
                >
                  {participant.name}
                </div>
                
                {/* Voice Indicator */}
                {participant.isSpeaking && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* VR Controls */}
      {isActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          <button className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm border border-white/20 hover:bg-white/20 transition-colors">
            🎤 Mute
          </button>
          <button className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm border border-white/20 hover:bg-white/20 transition-colors">
            📹 Camera
          </button>
          <button className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm border border-white/20 hover:bg-white/20 transition-colors">
            🚪 Exit
          </button>
        </div>
      )}
    </div>
  );
}

export function ThreeDObjectShare({ 
  object, 
  position, 
  rotation = { x: 0, y: 0, z: 0 },
  autoRotate = true,
  className 
}) {
  const [currentRotation, setCurrentRotation] = useState(rotation);

  useEffect(() => {
    if (autoRotate) {
      const interval = setInterval(() => {
        setCurrentRotation(prev => ({
          x: prev.x,
          y: prev.y + 1,
          z: prev.z
        }));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [autoRotate]);

  return (
    <motion.div
      className={cn("relative", className)}
      style={{
        transform: `perspective(1000px) translate3d(${position.x}px, ${position.y}px, ${position.z}px)`,
        transformStyle: "preserve-3d"
      }}
    >
      <motion.div
        className="relative w-32 h-32"
        style={{
          transform: `rotateX(${currentRotation.x}deg) rotateY(${currentRotation.y}deg) rotateZ(${currentRotation.z}deg)`,
          transformStyle: "preserve-3d"
        }}
      >
        {/* 3D Object Faces */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-lg" 
             style={{ transform: "translateZ(64px)" }}>
          <div className="flex items-center justify-center h-full text-primary font-bold">
            Front
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-accent/20 border border-secondary/30 rounded-lg" 
             style={{ transform: "rotateY(180deg) translateZ(64px)" }}>
          <div className="flex items-center justify-center h-full text-secondary font-bold">
            Back
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 rounded-lg" 
             style={{ transform: "rotateY(90deg) translateZ(64px)" }}>
          <div className="flex items-center justify-center h-full text-accent font-bold">
            Right
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-lg" 
             style={{ transform: "rotateY(-90deg) translateZ(64px)" }}>
          <div className="flex items-center justify-center h-full text-primary font-bold">
            Left
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 border border-secondary/30 rounded-lg" 
             style={{ transform: "rotateX(90deg) translateZ(64px)" }}>
          <div className="flex items-center justify-center h-full text-secondary font-bold">
            Top
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-secondary/20 border border-accent/30 rounded-lg" 
             style={{ transform: "rotateX(-90deg) translateZ(64px)" }}>
          <div className="flex items-center justify-center h-full text-accent font-bold">
            Bottom
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SpatialAudioIndicator({ 
  sources, 
  listenerPosition,
  className 
}) {
  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Audio Environment */}
      <div className="absolute inset-0 rounded-full border border-white/10">
        {/* Listener Position */}
        <div 
          className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"
          style={{
            left: `${listenerPosition.x}%`,
            top: `${listenerPosition.y}%`,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 20px hsl(var(--primary))"
          }}
        />
        
        {/* Audio Sources */}
        {sources.map((source, index) => {
          const distance = Math.sqrt(
            Math.pow(source.x - listenerPosition.x, 2) + 
            Math.pow(source.y - listenerPosition.y, 2)
          );
          const intensity = Math.max(0, 1 - distance / 50);
          
          return (
            <motion.div
              key={source.id}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${source.x}%`,
                top: `${source.y}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: source.color || "hsl(var(--accent))",
                opacity: intensity,
                boxShadow: `0 0 ${10 * intensity}px ${source.color || "hsl(var(--accent)")}`
              }}
              animate={{
                scale: source.isActive ? [1, 1.5, 1] : 1,
                opacity: source.isActive ? intensity : intensity * 0.5
              }}
              transition={{
                duration: 0.5,
                repeat: source.isActive ? Infinity : 0
              }}
            >
              {/* Sound Waves */}
              {source.isActive && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full border border-current"
                    animate={{
                      scale: [1, 3, 4],
                      opacity: [0.8, 0.3, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border border-current"
                    animate={{
                      scale: [1, 2, 3],
                      opacity: [0.6, 0.2, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.5
                    }}
                  />
                </>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Distance Legend */}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
        <div>🔊 Spatial Audio</div>
        <div className="text-xs">Closer = Louder</div>
      </div>
    </div>
  );
}
