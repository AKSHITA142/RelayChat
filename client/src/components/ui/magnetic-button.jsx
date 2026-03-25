import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export default function MagneticButton({ children, className, ...props }) {
  const ref = useRef(null);
  const mouseX = useSpring(useMotionValue(0));
  const mouseY = useSpring(useMotionValue(0));

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
  };

  const background = useMotionTemplate`
    radial-gradient(
      200px circle at ${mouseX}px ${mouseY}px,
      hsl(var(--primary) / 0.15),
      transparent 80%
    )
  `;

  return (
    <motion.button
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/6 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:bg-white/10",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
