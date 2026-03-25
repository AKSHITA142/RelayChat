import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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

export function AdvancedLighting({ 
  children, 
  intensity = 0.8,
  className 
}) {
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
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Dynamic Lighting Effects */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              circle at ${mousePosition.x}px ${mousePosition.y}px,
              hsla(var(--primary) / ${intensity}) 0%,
              transparent 40%
            ),
            radial-gradient(
              circle at ${mousePosition.x}px ${mousePosition.y}px,
              hsla(var(--secondary) / ${intensity * 0.8}) 0%,
              transparent 30%
            ),
            radial-gradient(
              circle at ${mousePosition.x}px ${mousePosition.y}px,
              hsla(var(--accent) / ${intensity * 0.6}) 0%,
              transparent 20%
            )
          `
        }}
      />
      
      {/* Volumetric Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-full h-32"
          style={{
            background: "linear-gradient(to bottom, hsla(var(--primary) / 0.3), transparent)",
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-32 h-full"
          style={{
            background: "linear-gradient(to left, hsla(var(--secondary) / 0.2), transparent)",
          }}
          animate={{
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      {/* Lens Flare Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-2 h-2 rounded-full bg-white"
          style={{
            left: `${mousePosition.x - 4}px`,
            top: `${mousePosition.y - 4}px`,
            boxShadow: "0 0 20px 10px hsla(var(--primary) / 0.8)",
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

      {/* Ambient Occlusion */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at top left, transparent 30%, hsla(var(--background) / 0.8) 70%),
            radial-gradient(ellipse at bottom right, transparent 30%, hsla(var(--background) / 0.8) 70%),
            radial-gradient(ellipse at center, transparent 50%, hsla(var(--background) / 0.6) 100%)
          `
        }}
      />

      {children}
    </div>
  );
}

export function MaterialDesign3D({ 
  children, 
  depth = 20,
  className 
}) {
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
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(45deg, hsla(var(--background) / 0.9), hsla(var(--card) / 0.8))",
          transform: `translateZ(${depth/2}px)`,
          boxShadow: "inset 0 2px 10px hsla(var(--foreground) / 0.1)"
        }}
      />
      
      {/* Neumorphic Elements */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `
            linear-gradient(145deg, hsla(var(--primary) / 0.2), transparent),
            linear-gradient(215deg, hsla(var(--secondary) / 0.1), transparent)
          `,
          transform: "translateZ(0px)"
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
}

export function MicroInteractions({ 
  children, 
  className 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Loading Skeleton */}
      <motion.div
        className="h-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%"],
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
            width: ["0%", "100%"],
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
      
      {/* Error Animation */}
      <motion.div
        className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white"
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.2, 1, 0] }}
        transition={{
          duration: 0.5,
          times: [0, 0.5, 0.7, 1]
        }}
      >
        ✕
      </motion.div>
      
      {children}
    </div>
  );
}
