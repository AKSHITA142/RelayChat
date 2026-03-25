import { motion, useMotionTemplate, useMotionValue, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

const PARTICLE_COUNT = 30;
const CONNECTION_DISTANCE = 150;
const PARTICLE_SPEED = 0.5;

function Particle3D({ index, initialX, initialY, initialZ }) {
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);
  const z = useMotionValue(initialZ);

  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now() * 0.001 * PARTICLE_SPEED;
      x.set(Math.sin(time + index) * 200 + window.innerWidth / 2);
      y.set(Math.cos(time + index * 0.7) * 200 + window.innerHeight / 2);
      z.set(Math.sin(time * 0.5 + index * 0.3) * 500);
    }, 16);

    return () => clearInterval(interval);
  }, [index, x, y, z]);

  const scale = useTransform(z, [-500, 0, 500], [0.5, 1, 0.5]);
  const opacity = useTransform(z, [-500, 0, 500], [0.1, 1, 0.1]);

  return (
    <motion.div
      className="absolute w-1 h-1 bg-primary rounded-full"
      style={{
        x,
        y,
        scale,
        opacity,
        boxShadow: "0 0 10px hsl(var(--primary))",
      }}
    />
  );
}

function ConnectionLine({ p1, p2, distance }) {
  const opacity = useTransform(distance, [0, CONNECTION_DISTANCE], [0.8, 0]);
  
  return (
    <motion.svg
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    >
      <motion.line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke="hsl(var(--primary))"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
    </motion.svg>
  );
}

export default function Background3D({ className, variant = "particles" }) {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const { scrollYProgress } = useScroll({ container: containerRef });
  
  const backgroundX = useTransform(mouseX, [0, window.innerWidth], [-50, 50]);
  const backgroundY = useTransform(mouseY, [0, window.innerHeight], [-50, 50]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 20]);
  const rotateY = useTransform(mouseX, [0, window.innerWidth], [-5, 5]);

  // Generate initial particle positions
  const particles = useMemo(() => 
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      index: i,
      initialX: Math.random() * window.innerWidth,
      initialY: Math.random() * window.innerHeight,
      initialZ: Math.random() * 1000 - 500,
    }))
  , []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const backgroundStyle = useMotionTemplate`
    radial-gradient(
      circle at ${backgroundX}px ${backgroundY}px,
      hsl(var(--primary) / 0.15) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at ${backgroundX}px ${backgroundY}px,
      hsl(var(--secondary) / 0.1) 0%,
      transparent 50%
    ),
    linear-gradient(
      ${rotateX}deg,
      hsl(var(--background)) 0%,
      hsl(229 34% 6%) 48%,
      hsl(231 38% 5%) 100%
    )
  `;

  if (variant === "particles") {
    return (
      <div
        ref={containerRef}
        className={cn("absolute inset-0 overflow-hidden", className)}
        onMouseMove={handleMouseMove}
      >
        {/* 3D Particle Field */}
        <div className="absolute inset-0 perspective-1000">
          {particles.map((particle) => (
            <Particle3D
              key={particle.index}
              index={particle.index}
              initialX={particle.initialX}
              initialY={particle.initialY}
              initialZ={particle.initialZ}
            />
          ))}
        </div>

        {/* Dynamic Gradient Background */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{ background: backgroundStyle }}
        />

        {/* Animated Grid Pattern */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            transform: `perspective(1000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg)`,
          }}
        />

        {/* Floating Orbs */}
        <motion.div
          className="absolute left-[-20%] top-[-20%] h-[40rem] w-[40rem] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%)",
            filter: "blur(100px)",
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute right-[-20%] bottom-[-20%] h-[40rem] w-[40rem] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--secondary) / 0.2), transparent 70%)",
            filter: "blur(100px)",
          }}
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
        />
      </div>
    );
  }

  if (variant === "waves") {
    return (
      <div
        ref={containerRef}
        className={cn("absolute inset-0 overflow-hidden", className)}
        onMouseMove={handleMouseMove}
      >
        {/* 3D Wave Layers */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center, hsl(var(--primary) / ${0.05 - i * 0.01}), transparent 70%)`,
              transform: `perspective(1000px) rotateX(${rotateX.get() + i * 5}deg) translateZ(${-i * 100}px)`,
            }}
            animate={{
              y: [0, -50, 0],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}

        {/* Dynamic Background */}
        <motion.div
          className="absolute inset-0 opacity-40"
          style={{ background: backgroundStyle }}
        />
      </div>
    );
  }

  if (variant === "geometric") {
    return (
      <div
        ref={containerRef}
        className={cn("absolute inset-0 overflow-hidden", className)}
        onMouseMove={handleMouseMove}
      >
        {/* 3D Geometric Shapes */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-primary/20"
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              left: `${20 + i * 10}%`,
              top: `${10 + i * 8}%`,
              transform: `perspective(1000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get() + i * 45}deg) rotateZ(${i * 30}deg)`,
              background: `linear-gradient(45deg, hsl(var(--primary) / 0.05), hsl(var(--secondary) / 0.05))`,
            }}
            animate={{
              rotateZ: [i * 30, i * 30 + 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        {/* Dynamic Background */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{ background: backgroundStyle }}
        />
      </div>
    );
  }

  return null;
}
