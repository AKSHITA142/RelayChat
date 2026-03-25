import { motion, useMotionTemplate, useMotionValue, useScroll, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const NEURON_COUNT = 25;
const SYNAPSE_THRESHOLD = 180;
const FIRING_SPEED = 0.8;
const MESSAGE_IMPACT_RADIUS = 150;

function NeuralNode({ index, initialX, initialY, initialZ, connections, isActive, onFire, targetPositions, energyTransforms }) {
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);
  const z = useMotionValue(initialZ);
  const energy = useMotionValue(0);
  const pulse = useMotionValue(1);
  const rotation = useMotionValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now() * 0.001 * FIRING_SPEED;
      const offsetX = Math.sin(time + index * 0.3) * 80;
      const offsetY = Math.cos(time + index * 0.7) * 80;
      const offsetZ = Math.sin(time * 0.5 + index * 0.2) * 200;
      
      animate(x, initialX + offsetX, { duration: 3, ease: "easeInOut" });
      animate(y, initialY + offsetY, { duration: 3, ease: "easeInOut" });
      animate(z, initialZ + offsetZ, { duration: 3, ease: "easeInOut" });
      animate(rotation, time * 30 + index * 15, { duration: 3, ease: "linear" });
    }, 3000);

    return () => clearInterval(interval);
  }, [index, initialX, initialY, initialZ, x, y, z, rotation]);

  const scale = useTransform(z, [-300, 0, 300], [0.6, 1.4, 0.6]);
  const opacity = useTransform(z, [-300, 0, 300], [0.3, 1, 0.3]);
  const glowIntensity = useTransform(energy, [0, 1], [0.5, 2]);
  const pulseScale = useTransform(pulse, [1, 1.5], [1, 1.5]);
  const nodeScale = useTransform(pulseScale, (val) => scale.get() * val);
  const ringX = useTransform(x, (val) => val - 16);
  const ringY = useTransform(y, (val) => val - 16);

  const handleFire = () => {
    animate(energy, 1, { duration: 0.2 });
    animate(pulse, 1.5, { duration: 0.3 });
    animate(energy, 0, { duration: 0.8, delay: 0.3 });
    animate(pulse, 1, { duration: 0.5, delay: 0.3 });
    onFire?.();
  };

  return (
    <>
      {/* Neural Node */}
      <motion.div
        className="absolute w-3 h-3 rounded-full"
        style={{
          x,
          y,
          scale: nodeScale,
          opacity,
          rotate: rotation,
          background: `radial-gradient(circle, hsl(var(--primary) / ${glowIntensity.get()}), hsl(var(--secondary) / ${glowIntensity.get() * 0.8}), transparent)`,
          boxShadow: `0 0 ${30 * glowIntensity.get()}px hsl(var(--primary)), 0 0 ${60 * glowIntensity.get()}px hsl(var(--secondary))`,
        }}
        onTap={handleFire}
        whileHover={{ scale: 1.2 }}
      />
      
      {/* Neural Connections (Synapses) */}
      {connections.map((targetIndex, i) => (
        <motion.svg
          key={`synapse-${targetIndex}`}
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: energyTransforms?.opacity || 0.5 }}
        >
          <motion.line
            x1={x}
            y1={y}
            x2={targetPositions[targetIndex]?.x || 0}
            y2={targetPositions[targetIndex]?.y || 0}
            stroke="url(#synapseGradient)"
            strokeWidth="2"
            strokeOpacity="0.6"
            strokeDasharray="5,5"
            animate={{
              strokeDashoffset: isActive ? [0, 15] : [0, 0],
            }}
            transition={{
              duration: 2,
              repeat: isActive ? Infinity : 0,
              ease: "linear",
              delay: i * 0.1,
            }}
          />
          <defs>
            <linearGradient id="synapseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="50%" stopColor="hsl(var(--accent))" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" />
            </linearGradient>
          </defs>
        </motion.svg>
      ))}
      
      {/* Energy Pulse Ring */}
      <motion.div
        className="absolute w-8 h-8 rounded-full border-2 border-primary"
        style={{
          x: ringX,
          y: ringY,
          opacity: energy,
        }}
        animate={{
          scale: [1, 3],
          opacity: [0.8, 0],
        }}
        transition={{
          duration: 1,
          ease: "easeOut",
        }}
      />
    </>
  );
}

function MessagePulse({ x, y, onComplete }) {
  return (
    <motion.div
      className="absolute w-12 h-12 rounded-full border-2 border-primary"
      style={{
        left: x - 24,
        top: y - 24,
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{
        scale: [0, 4],
        opacity: [1, 0],
      }}
      transition={{
        duration: 1.5,
        ease: "easeOut",
      }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20"
        animate={{
          scale: [0, 2],
          opacity: [0.8, 0],
        }}
        transition={{
          duration: 1,
          ease: "easeOut",
        }}
      />
    </motion.div>
  );
}

export default function NeuralNetworkBackground({ className, onMessage }) {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const [messagePulses, setMessagePulses] = useState([]);
  const [activeNodes, setActiveNodes] = useState(new Set());
  
  const backgroundX = useTransform(mouseX, [0, window.innerWidth], [-150, 150]);
  const backgroundY = useTransform(mouseY, [0, window.innerHeight], [-150, 150]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 10]);
  const rotateY = useTransform(mouseX, [0, window.innerWidth], [-5, 5]);

  // Generate neural network
  const neuralNetwork = useMemo(() => {
    const nodes = Array.from({ length: NEURON_COUNT }, (_, i) => ({
      index: i,
      initialX: Math.random() * window.innerWidth,
      initialY: Math.random() * window.innerHeight,
      initialZ: Math.random() * 600 - 300,
      connections: [],
    }));

    // Create neural connections
    nodes.forEach((node, i) => {
      nodes.forEach((otherNode, j) => {
        if (i !== j) {
          const distance = Math.sqrt(
            Math.pow(node.initialX - otherNode.initialX, 2) +
            Math.pow(node.initialY - otherNode.initialY, 2)
          );
          if (distance < SYNAPSE_THRESHOLD && node.connections.length < 4) {
            node.connections.push(j);
          }
        }
      });
    });

    return nodes;
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleNodeFire = useCallback((nodeIndex) => {
    // Trigger cascade effect
    const cascadeNodes = new Set([nodeIndex]);
    neuralNetwork[nodeIndex].connections.forEach(connIndex => {
      cascadeNodes.add(connIndex);
    });
    setActiveNodes(cascadeNodes);
    
    setTimeout(() => {
      setActiveNodes(new Set());
    }, 2000);
  }, [neuralNetwork]);

  const handleMessageCallback = useCallback((messageX, messageY) => {
    const newPulse = { 
      id: Date.now(), 
      x: messageX, 
      y: messageY 
    };
    setMessagePulses(prev => [...prev, newPulse]);
    
    // Remove pulse after animation
    setTimeout(() => {
      setMessagePulses(prev => prev.filter(p => p.id !== newPulse.id));
    }, 1500);

    // Activate nearby nodes
    const nearbyNodes = neuralNetwork.filter(node => {
      const distance = Math.sqrt(
        Math.pow(node.initialX - messageX, 2) +
        Math.pow(node.initialY - messageY, 2)
      );
      return distance < MESSAGE_IMPACT_RADIUS;
    });
    
    nearbyNodes.forEach(node => {
      handleNodeFire(node.index);
    });
  }, [neuralNetwork, handleNodeFire]);

  useEffect(() => {
    if (onMessage) {
      onMessage(handleMessageCallback);
    }
  }, [onMessage, handleMessageCallback]);

  const backgroundStyle = useMotionTemplate`
    radial-gradient(
      circle at ${backgroundX}px ${backgroundY}px,
      hsl(var(--primary) / 0.15) 0%,
      hsl(var(--secondary) / 0.12) 25%,
      transparent 50%
    ),
    radial-gradient(
      circle at ${backgroundX}px ${backgroundY}px,
      hsl(var(--accent) / 0.08) 0%,
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
      {/* Dynamic Neural Background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: backgroundStyle,
          transform: `perspective(2000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg)`,
        }}
      />

      {/* Neural Network */}
      <div className="absolute inset-0 perspective-2000">
        {neuralNetwork.map((node) => (
          <NeuralNode
            key={node.index}
            index={node.index}
            initialX={node.initialX}
            initialY={node.initialY}
            initialZ={node.initialZ}
            connections={node.connections}
            isActive={activeNodes.has(node.index)}
            onFire={() => handleNodeFire(node.index)}
            targetPositions={neuralNetwork.reduce((acc, n) => {
              acc[n.index] = { x: n.initialX, y: n.initialY };
              return acc;
            }, {})}
            energyTransforms={{ opacity: 0.5 }}
          />
        ))}
      </div>

      {/* Message Pulses */}
      {messagePulses.map((pulse) => (
        <MessagePulse
          key={pulse.id}
          x={pulse.x}
          y={pulse.y}
        />
      ))}

      {/* Floating Data Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-primary/60 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Neural Grid Pattern */}
      <motion.div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          transform: `perspective(2000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg)`,
        }}
        animate={{
          backgroundPosition: ["0px 0px", "80px 80px"],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
