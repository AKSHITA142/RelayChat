import { motion, useTransform, useScroll } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export default function ParallaxCard({ children, className, speed = 0.5, ...props }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, speed * 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);

  return (
    <motion.div
      ref={ref}
      className={cn("relative", className)}
      style={{ y, opacity }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
