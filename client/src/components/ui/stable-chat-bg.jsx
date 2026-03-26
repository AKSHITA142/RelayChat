import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function StableChatBackground({ className }) {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
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
          )
        `,
      }}
    >
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(200, 100%, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(200, 100%, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { x: 20, y: 20 },
          { x: 80, y: 30 },
          { x: 50, y: 70 },
        ].map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-6 h-6 rounded-full"
            style={{
              background: `radial-gradient(circle, hsla(${200 + i * 30}, 70%, 50%, 0.2), transparent 70%)`,
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.2, 1],
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

      {/* Mouse Follow Effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              circle at ${mousePosition.x}% ${mousePosition.y}%, 
              hsla(200, 100%, 40%, 0.1) 0%, 
              transparent 40%
            )
          `,
        }}
      />

      {/* Connection Lines */}
      <svg className="absolute inset-0 pointer-events-none">
        {[
          { x1: 20, y1: 20, x2: 80, y2: 30 },
          { x1: 80, y1: 30, x2: 50, y2: 70 },
          { x1: 50, y1: 70, x2: 20, y2: 20 },
        ].map((line, i) => (
          <motion.line
            key={i}
            x1={`${line.x1}%`}
            y1={`${line.y1}%`}
            x2={`${line.x2}%`}
            y2={`${line.y2}%`}
            stroke="hsla(200, 100%, 30%, 0.3)"
            strokeWidth="1"
            strokeDasharray="5,5"
            animate={{
              strokeDashoffset: [0, 10],
              opacity: [0.1, 0.3, 0.1],
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

      {/* Pulse Points */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { x: 20, y: 20 },
          { x: 80, y: 30 },
          { x: 50, y: 70 },
        ].map((pos, i) => (
          <motion.div
            key={`pulse-${i}`}
            className="absolute w-3 h-3 rounded-full bg-primary/30"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
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
    </div>
  );
}
