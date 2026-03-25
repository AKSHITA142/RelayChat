import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function TechnicalChatBackground({ className }) {
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
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={{
        background: `
          linear-gradient(135deg, 
            hsl(220, 40%, 3%) 0%, 
            hsl(220, 45%, 5%) 25%, 
            hsl(225, 50%, 7%) 50%, 
            hsl(230, 45%, 5%) 75%, 
            hsl(235, 40%, 3%) 100%
          ),
          radial-gradient(
            circle at ${mousePosition.x}px ${mousePosition.y}px,
            hsla(200, 100%, 50%, 0.1) 0%,
            transparent 50%
          )
        `,
      }}
    >
      {/* Chat Grid Pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full">
          <defs>
            <pattern
              id="chatGrid"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <rect
                x="0"
                y="0"
                width="40"
                height="40"
                fill="none"
                stroke="hsla(200, 100%, 20%, 0.1)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#chatGrid)" />
        </svg>
      </div>

      {/* Floating Message Bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 rounded-full border border-white/10"
            style={{
              background: `hsla(${200 + i * 20}, 70%, 50%, 0.05)`,
              left: `${10 + (i % 4) * 25}%`,
              top: `${10 + Math.floor(i / 4) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Connection Lines */}
      <svg className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.line
            key={i}
            x1={`${20 + i * 15}%`}
            y1="50%"
            x2={`${30 + i * 15}%`}
            y2={`${50 + (i % 2 ? 20 : -20)}%`}
            stroke="hsla(200, 100%, 30%, 0.2)"
            strokeWidth="1"
            strokeDasharray="5,5"
            animate={{
              strokeDashoffset: [0, 10],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.3,
            }}
          />
        ))}
      </svg>

      {/* Tech Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              circle at ${mousePosition.x}px ${mousePosition.y}px,
              hsla(200, 100%, 60%, 0.05) 0%,
              transparent 30%
            ),
            conic-gradient(
              from 0deg at 50% 50%,
              hsla(200, 100%, 20%, 0.1) 0deg,
              transparent 60deg,
              hsla(220, 100%, 20%, 0.1) 120deg,
              transparent 180deg,
              hsla(240, 100%, 20%, 0.1) 240deg,
              transparent 300deg,
              hsla(200, 100%, 20%, 0.1) 360deg
            )
          `,
        }}
      />

      {/* Pulse Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { x: "20%", y: "30%" },
          { x: "70%", y: "60%" },
          { x: "45%", y: "80%" },
        ].map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full"
            style={{
              background: `radial-gradient(circle, hsla(200, 100%, 50%, 0.3), transparent 70%)`,
              left: pos.x,
              top: pos.y,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.7,
            }}
          />
        ))}
      </div>

      {/* Binary Code Rain Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-green-500 font-mono text-xs"
            style={{
              left: `${Math.random() * 100}%`,
              top: -20,
            }}
            animate={{
              y: [0, window.innerHeight + 20],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5,
            }}
          >
            {Math.random() > 0.5 ? "1" : "0"}
          </motion.div>
        ))}
      </div>

      {/* Scanning Line */}
      <motion.div
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        style={{ top: `${mousePosition.y}px` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}
