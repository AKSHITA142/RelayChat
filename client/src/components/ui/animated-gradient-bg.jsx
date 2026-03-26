import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const gradientVariants = {
  initial: {
    background: [
      "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.3) 0%, transparent 50%)",
      "radial-gradient(circle at 80% 50%, hsl(var(--secondary) / 0.3) 0%, transparent 50%)",
      "radial-gradient(circle at 50% 20%, hsl(var(--accent) / 0.3) 0%, transparent 50%)",
    ],
  },
  animate: {
    background: [
      "radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.3) 0%, transparent 50%)",
      "radial-gradient(circle at 20% 50%, hsl(var(--secondary) / 0.3) 0%, transparent 50%)",
      "radial-gradient(circle at 50% 80%, hsl(var(--accent) / 0.3) 0%, transparent 50%)",
    ],
  },
};

export default function AnimatedGradientBg({ className, children }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div
        className="absolute inset-0 opacity-30"
        variants={gradientVariants}
        initial="initial"
        animate="animate"
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
