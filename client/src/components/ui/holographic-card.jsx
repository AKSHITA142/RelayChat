import { motion, useMotionValue, useTransform, useMotionTemplate } from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function HolographicCard({ children, className, intensity = 0.8 }) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-300, 300], [20, -20]);
  const rotateY = useTransform(mouseX, [-300, 300], [-20, 20]);
  const scale = useTransform(mouseX, [-300, 300], [1, 1.05]);
  
  const handleMouseMove = (event) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(event.clientX - centerX);
    mouseY.set(event.clientY - centerY);
  };
  
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const holographicStyle = useMotionTemplate`
    linear-gradient(
      ${rotateX}deg,
      hsla(${280 + rotateY.get()}, 100%, 70%, ${intensity}) 0%,
      hsla(${200 + rotateX.get()}, 100%, 60%, ${intensity * 0.8}) 25%,
      hsla(${180 + rotateY.get()}, 100%, 50%, ${intensity * 0.6}) 50%,
      hsla(${320 + rotateX.get()}, 100%, 70%, ${intensity * 0.8}) 75%,
      hsla(${260 + rotateY.get()}, 100%, 60%, ${intensity}) 100%
    )
  `;

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-3xl border backdrop-blur-2xl",
        className
      )}
      style={{
        background: holographicStyle,
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg) scale(${scale.get()})`,
        transition: "transform 0.15s ease-out",
        borderColor: `hsla(${280 + rotateY.get()}, 100%, 70%, 0.3)`,
        boxShadow: `
          0 25px 50px -12px hsla(${280 + rotateY.get()}, 100%, 50%, 0.3),
          inset 0 0 20px hsla(${200 + rotateX.get()}, 100%, 50%, 0.1),
          0 0 40px hsla(${180 + rotateY.get()}, 100%, 60%, 0.2)
        `,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      whileHover={{
        scale: 1.05,
        rotateX: 0,
        rotateY: 0,
      }}
    >
      {/* Holographic Scan Lines */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          animate={{
            y: ["0%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ opacity: intensity * 0.6 }}
        />
        <motion.div
          className="h-px w-full bg-gradient-to-r from-transparent via-purple-400 to-transparent"
          animate={{
            y: ["0%", "100%"],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "linear",
            delay: 0.5,
          }}
          style={{ opacity: intensity * 0.4 }}
        />
      </div>
      
      {/* Holographic Glitch Effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            opacity: [0, 0.1, 0],
            x: [0, -2, 2, -2, 0],
          }}
          transition={{
            duration: 0.3,
            repeat: 2,
            ease: "easeInOut",
          }}
          style={{
            background: `linear-gradient(90deg, transparent, hsla(${280 + rotateY.get()}, 100%, 70%, 0.3), transparent)`,
          }}
        />
      )}
      
      {/* Holographic Edge Glow */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `linear-gradient(45deg, 
            hsla(${280 + rotateY.get()}, 100%, 70%, ${intensity * 0.5}), 
            transparent 30%, 
            transparent 70%, 
            hsla(${200 + rotateX.get()}, 100%, 60%, ${intensity * 0.5})
          )`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 p-6 backdrop-blur-sm">
        {children}
      </div>
      
      {/* Floating Holographic Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + i * 10}%`,
              background: `hsla(${280 + i * 20}, 100%, 70%, ${intensity})`,
              boxShadow: `0 0 10px hsla(${280 + i * 20}, 100%, 70%, ${intensity})`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 1, 0.2],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function HolographicButton({ 
  children, 
  className, 
  variant = "primary",
  intensity = 0.8,
  ...props 
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-100, 100], [5, -5]);
  const rotateY = useTransform(mouseX, [-100, 100], [-5, 5]);
  
  const handleMouseMove = (event) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(event.clientX - centerX);
    mouseY.set(event.clientY - centerY);
  };
  
  const variantStyles = {
    primary: {
      bg: `linear-gradient(135deg, hsla(280, 100%, 60%, ${intensity}), hsla(200, 100%, 50%, ${intensity * 0.8}))`,
      border: `hsla(280, 100%, 70%, ${intensity * 0.6})`,
      text: "hsl(0, 0%, 100%)",
      glow: `hsla(280, 100%, 60%, ${intensity})`,
    },
    secondary: {
      bg: `linear-gradient(135deg, hsla(180, 100%, 60%, ${intensity}), hsla(320, 100%, 50%, ${intensity * 0.8}))`,
      border: `hsla(180, 100%, 70%, ${intensity * 0.6})`,
      text: "hsl(0, 0%, 100%)",
      glow: `hsla(180, 100%, 60%, ${intensity})`,
    },
    ghost: {
      bg: `linear-gradient(135deg, hsla(280, 100%, 60%, ${intensity * 0.2}), hsla(200, 100%, 50%, ${intensity * 0.3}))`,
      border: `hsla(280, 100%, 70%, ${intensity * 0.4})`,
      text: "hsl(280, 100%, 70%)",
      glow: `hsla(280, 100%, 60%, ${intensity * 0.5})`,
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.button
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl px-6 py-3 font-semibold transition-all duration-300 backdrop-blur-sm",
        className
      )}
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg)`,
        boxShadow: `
          0 10px 25px -5px ${styles.glow},
          inset 0 0 20px hsla(280, 100%, 50%, 0.1),
          0 0 30px ${styles.glow}
        `,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
      }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Holographic Scan Line */}
      <motion.div
        className="absolute inset-0 h-px w-full bg-gradient-to-r from-transparent via-white to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ opacity: intensity * 0.6 }}
      />
      
      {/* Holographic Glitch */}
      {isHovered && (
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: [0, 0.2, 0],
            x: [0, -1, 1, -1, 0],
          }}
          transition={{
            duration: 0.2,
            repeat: 2,
            ease: "easeInOut",
          }}
          style={{
            background: `linear-gradient(90deg, transparent, ${styles.glow}, transparent)`,
          }}
        />
      )}
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

export function HolographicInput({ 
  label, 
  icon: Icon, 
  className, 
  intensity = 0.8,
  ...props 
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState("");

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileFocus={{ scale: 1.02 }}
    >
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Icon 
              size={18} 
              className={cn(
                "transition-all duration-300",
                isFocused ? "text-cyan-400" : "text-gray-400"
              )}
              style={{
                filter: isFocused ? `drop-shadow(0 0 10px hsla(180, 100%, 50%, ${intensity}))` : "none",
              }}
            />
          </div>
        )}
        
        <input
          {...props}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "w-full rounded-2xl border bg-black/20 px-4 py-3 text-white backdrop-blur-sm transition-all duration-300",
            "placeholder:text-gray-500/50",
            "focus:outline-none",
            Icon && "pl-12",
            className
          )}
          placeholder={label}
          style={{
            borderColor: isFocused ? `hsla(180, 100%, 70%, ${intensity})` : `hsla(280, 100%, 70%, ${intensity * 0.3})`,
            boxShadow: isFocused ? `
              0 0 20px hsla(180, 100%, 50%, ${intensity * 0.5}),
              inset 0 0 20px hsla(180, 100%, 50%, 0.1)
            ` : "none",
          }}
        />
        
        {/* Holographic Input Effects */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            opacity: isFocused ? 1 : 0,
            borderColor: isFocused ? `hsla(180, 100%, 70%, ${intensity})` : "transparent",
          }}
          transition={{ duration: 0.3 }}
          style={{
            border: "1px solid",
            boxShadow: isFocused ? `inset 0 0 20px hsla(180, 100%, 50%, 0.2)` : "none",
          }}
        />
        
        {/* Scan Line Effect */}
        {isFocused && (
          <motion.div
            className="absolute h-px w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ opacity: intensity * 0.6 }}
          />
        )}
      </div>
    </motion.div>
  );
}
