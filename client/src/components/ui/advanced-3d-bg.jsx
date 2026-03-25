import { motion, useMotionTemplate, useMotionValue, useScroll, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

const NODE_COUNT = 15;
const CONNECTION_THRESHOLD = 200;
const ANIMATION_SPEED = 0.3;

function NetworkNode({ index, initialX, initialY, initialZ, connections, targetPositions }) {
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);
  const z = useMotionValue(initialZ);
  const rotation = useMotionValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now() * 0.001 * ANIMATION_SPEED;
      const offsetX = Math.sin(time + index * 0.5) * 150;
      const offsetY = Math.cos(time + index * 0.3) * 150;
      const offsetZ = Math.sin(time * 0.7 + index * 0.2) * 300;
      
      animate(x, initialX + offsetX, { duration: 2, ease: "easeInOut" });
      animate(y, initialY + offsetY, { duration: 2, ease: "easeInOut" });
      animate(z, initialZ + offsetZ, { duration: 2, ease: "easeInOut" });
      animate(rotation, time * 50 + index * 30, { duration: 2, ease: "linear" });
    }, 2000);

    return () => clearInterval(interval);
  }, [index, initialX, initialY, initialZ, x, y, z, rotation]);

  const scale = useTransform(z, [-500, 0, 500], [0.3, 1.2, 0.3]);
  const opacity = useTransform(z, [-500, 0, 500], [0.2, 1, 0.2]);
  const glowIntensity = useTransform(z, [-500, 0, 500], [0.5, 1.5, 0.5]);

  return (
    <>
      <motion.div
        className="absolute w-2 h-2 rounded-full"
        style={{
          x,
          y,
          scale,
          opacity,
          rotate: rotation,
          background: `radial-gradient(circle, hsl(var(--primary) / ${glowIntensity.get()}), transparent)`,
          boxShadow: `0 0 ${20 * glowIntensity.get()}px hsl(var(--primary)), 0 0 ${40 * glowIntensity.get()}px hsl(var(--secondary))`,
        }}
      />
      
      {/* Connection Lines */}
      {connections.map((targetIndex, i) => (
        <motion.svg
          key={targetIndex}
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0.3 }}
        >
          <motion.line
            x1={x}
            y1={y}
            x2={targetPositions[targetIndex]?.x || 0}
            y2={targetPositions[targetIndex]?.y || 0}
            stroke="url(#gradient)"
            strokeWidth="1"
            strokeOpacity="0.6"
            strokeDasharray="5,5"
            animate={{
              strokeDashoffset: [0, 10],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.1,
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" />
            </linearGradient>
          </defs>
        </motion.svg>
      ))}
    </>
  );
}

function FloatingOrb({ color, size, duration, delay, path }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}, transparent)`,
        filter: "blur(60px)",
      }}
      animate={{
        x: path.map(p => p.x),
        y: path.map(p => p.y),
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

export default function Advanced3DBackground({ className }) {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const { scrollYProgress } = useScroll({ container: containerRef });
  
  const backgroundX = useTransform(mouseX, [0, window.innerWidth], [-100, 100]);
  const backgroundY = useTransform(mouseY, [0, window.innerHeight], [-100, 100]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 15]);
  const rotateY = useTransform(mouseX, [0, window.innerWidth], [-10, 10]);

  // Generate network nodes with connections
  const networkNodes = useMemo(() => {
    const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      index: i,
      initialX: Math.random() * window.innerWidth,
      initialY: Math.random() * window.innerHeight,
      initialZ: Math.random() * 800 - 400,
      connections: [],
    }));

    // Create connections between nearby nodes
    nodes.forEach((node, i) => {
      nodes.forEach((otherNode, j) => {
        if (i !== j) {
          const distance = Math.sqrt(
            Math.pow(node.initialX - otherNode.initialX, 2) +
            Math.pow(node.initialY - otherNode.initialY, 2)
          );
          if (distance < CONNECTION_THRESHOLD && node.connections.length < 3) {
            node.connections.push(j);
          }
        }
      });
    });

    return nodes;
  }, []);

  // Create target positions for connections
  const targetPositions = useMemo(() => {
    const positions = {};
    networkNodes.forEach(node => {
      positions[node.index] = { x: node.initialX, y: node.initialY };
    });
    return positions;
  }, [networkNodes]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const backgroundStyle = useMotionTemplate`
    radial-gradient(
      circle at ${backgroundX}px ${backgroundY}px,
      hsl(var(--primary) / 0.2) 0%,
      hsl(var(--secondary) / 0.15) 25%,
      transparent 50%
    ),
    radial-gradient(
      circle at ${backgroundX}px ${backgroundY}px,
      hsl(var(--accent) / 0.1) 0%,
      transparent 40%
    ),
    conic-gradient(
      from ${rotateX}deg at 50% 50%,
      hsl(var(--background)) 0deg,
      hsl(229 34% 6%) 120deg,
      hsl(231 38% 5%) 240deg,
      hsl(var(--background)) 360deg
    )
  `;

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      onMouseMove={handleMouseMove}
    >
      {/* Dynamic 3D Background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: backgroundStyle,
          transform: `perspective(2000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg)`,
        }}
      />

      {/* Network Nodes */}
      <div className="absolute inset-0 perspective-2000">
        {networkNodes.map((node) => (
          <NetworkNode
            key={node.index}
            index={node.index}
            initialX={node.initialX}
            initialY={node.initialY}
            initialZ={node.initialZ}
            connections={node.connections}
            targetPositions={targetPositions}
          />
        ))}
      </div>

      {/* Floating Orbs */}
      <FloatingOrb
        color="hsl(var(--primary) / 0.3)"
        size={300}
        duration={20}
        delay={0}
        path={[
          { x: -100, y: -100 },
          { x: window.innerWidth + 100, y: window.innerHeight + 100 },
          { x: -100, y: window.innerHeight + 100 },
          { x: -100, y: -100 },
        ]}
      />
      
      <FloatingOrb
        color="hsl(var(--secondary) / 0.25)"
        size={250}
        duration={25}
        delay={5}
        path={[
          { x: window.innerWidth + 100, y: -100 },
          { x: -100, y: window.innerHeight + 100 },
          { x: window.innerWidth + 100, y: window.innerHeight + 100 },
          { x: window.innerWidth + 100, y: -100 },
        ]}
      />

      <FloatingOrb
        color="hsl(var(--accent) / 0.2)"
        size={200}
        duration={15}
        delay={10}
        path={[
          { x: window.innerWidth / 2, y: -100 },
          { x: window.innerWidth + 100, y: window.innerHeight / 2 },
          { x: window.innerWidth / 2, y: window.innerHeight + 100 },
          { x: -100, y: window.innerHeight / 2 },
          { x: window.innerWidth / 2, y: -100 },
        ]}
      />

      {/* Animated Grid */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          transform: `perspective(2000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg)`,
        }}
        animate={{
          backgroundPosition: ["0px 0px", "60px 60px"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
