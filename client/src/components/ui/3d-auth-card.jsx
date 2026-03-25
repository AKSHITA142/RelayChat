import { motion, useMotionValue, useTransform, useMotionTemplate } from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function AuthCard3D({ children, className }) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);
  
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

  const backgroundStyle = useMotionTemplate`
    radial-gradient(
      circle at ${mouseX}px ${mouseY}px,
      hsl(var(--primary) / 0.1) 0%,
      transparent 50%
    ),
    linear-gradient(
      135deg,
      hsl(var(--card) / 0.9),
      hsl(var(--card) / 0.7)
    )
  `;

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 backdrop-blur-2xl",
        className
      )}
      style={{
        background: backgroundStyle,
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg)`,
        transition: "transform 0.2s ease-out",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 25px 50px -12px hsl(var(--primary) / 0.25)",
      }}
    >
      {/* 3D Edge Effects */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent opacity-50" />
      <div className="absolute inset-0 rounded-3xl border-l border-t border-white/20" />
      
      {/* Animated Glow */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded-3xl opacity-30"
          style={{
            background: "radial-gradient(circle at var(--x) var(--y), hsl(var(--primary) / 0.3), transparent 50%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10 p-8">
        {children}
      </div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 12}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function AuthInput3D({ label, icon: Icon, className, ...props }) {
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState("");

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Icon 
              size={18} 
              className={cn(
                "transition-colors duration-300",
                isFocused ? "text-primary" : "text-muted-foreground"
              )}
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
            "w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-foreground backdrop-blur-sm transition-all duration-300",
            "placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 focus:bg-white/10",
            Icon && "pl-12",
            className
          )}
          placeholder={label}
        />
        
        {/* 3D Input Effects */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-primary/20 opacity-0 pointer-events-none"
          animate={{
            opacity: isFocused ? 1 : 0,
            scale: isFocused ? 1.02 : 1,
          }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </motion.div>
  );
}

export function AuthButton3D({ children, className, loading = false, ...props }) {
  return (
    <motion.button
      {...props}
      className={cn(
        "relative w-full rounded-2xl border border-primary/30 bg-primary px-6 py-3 text-primary-foreground font-semibold transition-all duration-300",
        "hover:border-primary/50 hover:bg-primary/90 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.4)]",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      disabled={loading}
    >
      {/* 3D Button Effects */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-white/20 to-transparent opacity-50" />
      
      {/* Loading Spinner */}
      {loading && (
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
        </motion.div>
      )}
      
      <span className={cn("relative z-10", loading && "ml-8")}>
        {children}
      </span>
    </motion.button>
  );
}
