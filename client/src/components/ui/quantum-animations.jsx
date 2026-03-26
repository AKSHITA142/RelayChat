import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function QuantumParticles({ count = 50, className }) {
  const containerRef = useRef(null);
  
  return (
    <div ref={containerRef} className={cn("absolute inset-0 pointer-events-none", className)}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 200 - 100, 0],
            y: [0, Math.random() * 200 - 100, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

export function MorphingShapes({ className }) {
  const [morphIndex, setMorphIndex] = useState(0);
  
  const shapes = [
    "polygon(50% 0%, 0% 100%, 100% 100%)",
    "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    "circle(50% at 50% 50%)",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMorphIndex((prev) => (prev + 1) % shapes.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className={cn("absolute inset-0", className)}
      style={{
        clipPath: shapes[morphIndex],
      }}
    >
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
    </motion.div>
  );
}

export function TimeDistortion({ children, intensity = 0.5, className }) {
  const [time, setTime] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev + 0.01);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const distortionStyle = {
    filter: `
      hue-rotate(${Math.sin(time) * 30 * intensity}deg)
      saturate(${1 + Math.sin(time * 2) * 0.5 * intensity})
      contrast(${1 + Math.cos(time * 1.5) * 0.3 * intensity})
    `,
    transform: `
      perspective(1000px)
      rotateX(${Math.sin(time) * 2 * intensity}deg)
      rotateY(${Math.cos(time) * 2 * intensity}deg)
    `,
  };

  return (
    <div 
      className={cn("relative", className)}
      style={distortionStyle}
    >
      {children}
    </div>
  );
}

export function GlitchEffect({ children, trigger = false, className }) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 500);
    }
  }, [trigger]);

  return (
    <div className={cn("relative", className)}>
      {children}
      
      {isGlitching && (
        <>
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,0,0,0.1), transparent)",
              transform: "translateX(-2px)",
            }}
            animate={{
              x: [-2, 2, -2],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.1,
              repeat: 5,
            }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(0,255,255,0.1), transparent)",
              transform: "translateX(2px)",
            }}
            animate={{
              x: [2, -2, 2],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.1,
              repeat: 5,
            }}
          />
        </>
      )}
    </div>
  );
}

export function HologramText({ text, className }) {
  return (
    <motion.div
      className={cn("relative", className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
    >
      {/* Main text */}
      <div className="relative z-10 text-foreground font-bold">
        {text}
      </div>
      
      {/* Holographic layers */}
      <div 
        className="absolute inset-0 text-primary/30 font-bold"
        style={{ transform: "translateZ(1px)" }}
      >
        {text}
      </div>
      <div 
        className="absolute inset-0 text-secondary/20 font-bold"
        style={{ transform: "translateZ(2px)" }}
      >
        {text}
      </div>
      
      {/* Scan lines */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(0deg, transparent 49%, rgba(0,255,255,0.1) 50%, transparent 51%)",
          backgroundSize: "100% 4px",
        }}
        animate={{
          y: ["0%", "100%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
}

export function LiquidMetal({ children, className }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-3xl", className)}
      style={{
        background: `
          radial-gradient(
            circle at ${mousePosition.x}px ${mousePosition.y}px,
            hsla(var(--primary) / 0.8) 0%,
            hsla(var(--secondary) / 0.6) 25%,
            hsla(var(--accent) / 0.4) 50%,
            hsla(var(--background) / 0.9) 100%
          )
        `,
        boxShadow: `
          inset 0 0 50px hsla(var(--primary) / 0.3),
          inset 0 0 100px hsla(var(--secondary) / 0.2)
        `,
      }}
    >
      {/* Liquid surface effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse at ${mousePosition.x}px ${mousePosition.y}px,
              transparent 0%,
              rgba(255,255,255,0.1) 40%,
              transparent 70%
            )
          `,
          filter: "blur(20px)",
        }}
      />
      
      {children}
    </div>
  );
}

export function CyberGrid({ className }) {
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setGridOffset({
        x: (prev) => (prev + 1) % 50,
        y: (prev) => (prev + 0.5) % 50,
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px",
        backgroundPosition: `${gridOffset.x}px ${gridOffset.y}px`,
        perspective: "1000px",
        transform: "rotateX(60deg) translateZ(-100px)",
      }}
    />
  );
}

export function PlasmaField({ intensity = 0.8, className }) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev + 0.02);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const plasmaStyle = {
    background: `
      radial-gradient(
        circle at ${50 + Math.sin(time) * 20}% ${50 + Math.cos(time) * 20}%,
        hsla(${(time * 50) % 360}, 100%, 50%, ${intensity}) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at ${50 + Math.cos(time * 1.5) * 20}% ${50 + Math.sin(time * 1.5) * 20}%,
        hsla(${(time * 50 + 120) % 360}, 100%, 50%, ${intensity * 0.8}) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at ${50 + Math.sin(time * 2) * 20}% ${50 + Math.cos(time * 2) * 20}%,
        hsla(${(time * 50 + 240) % 360}, 100%, 50%, ${intensity * 0.6}) 0%,
        transparent 50%
      )
    `,
    filter: "blur(40px)",
    mixBlendMode: "screen",
  };

  return (
    <div 
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={plasmaStyle}
    />
  );
}

export function NeuralPathways({ className }) {
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    const generatePaths = () => {
      const newPaths = [];
      for (let i = 0; i < 5; i++) {
        newPaths.push({
          id: i,
          startX: Math.random() * 100,
          startY: Math.random() * 100,
          endX: Math.random() * 100,
          endY: Math.random() * 100,
          progress: 0,
        });
      }
      setPaths(newPaths);
    };

    generatePaths();
    const interval = setInterval(() => {
      setPaths((prev) =>
        prev.map((path) => ({
          ...path,
          progress: (path.progress + 2) % 100,
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <svg className={cn("absolute inset-0 pointer-events-none", className)}>
      {paths.map((path) => (
        <motion.line
          key={path.id}
          x1={`${path.startX}%`}
          y1={`${path.startY}%`}
          x2={`${path.endX}%`}
          y2={`${path.endY}%`}
          stroke="url(#neuralGradient)"
          strokeWidth="2"
          strokeOpacity="0.6"
          strokeDasharray="5,5"
          animate={{
            strokeDashoffset: -path.progress,
          }}
          transition={{
            duration: 0.05,
            ease: "linear",
          }}
        />
      ))}
      <defs>
        <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="50%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
      </defs>
    </svg>
  );
}
