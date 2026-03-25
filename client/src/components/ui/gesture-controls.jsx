import { motion, useAnimation } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  swipeThreshold = 50,
  className 
}) {
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleDragStart = (event, info) => {
    setDragStart({ x: info.point.x, y: info.point.y });
  };

  const handleDragEnd = (event, info) => {
    const deltaX = info.point.x - dragStart.x;
    const deltaY = info.point.y - dragStart.y;
    
    // Check swipe directions
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > swipeThreshold) {
        onSwipeRight?.();
      } else if (deltaX < -swipeThreshold) {
        onSwipeLeft?.();
      }
    } else {
      // Vertical swipe
      if (deltaY > swipeThreshold) {
        onSwipeDown?.();
      } else if (deltaY < -swipeThreshold) {
        onSwipeUp?.();
      }
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn("relative touch-none", className)}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 0.95, opacity: 0.8 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Swipe Indicators */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-0" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-0" />
      
      {children}
    </motion.div>
  );
}

export function PinchToZoom({ children, minScale = 0.5, maxScale = 3, className }) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialScale = 1;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        initialScale = scale;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const newScale = (currentDistance / initialDistance) * initialScale;
        
        setScale(Math.min(Math.max(newScale, minScale), maxScale));
      }
    };

    const getDistance = (touch1, touch2) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [scale, minScale, maxScale]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ touchAction: 'none' }}
    >
      <motion.div
        style={{ scale }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
      
      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setScale(Math.min(scale + 0.1, maxScale))}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center border border-white/20"
        >
          +
        </button>
        <button
          onClick={() => setScale(Math.max(scale - 0.1, minScale))}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center border border-white/20"
        >
          −
        </button>
        <button
          onClick={() => setScale(1)}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center border border-white/20 text-xs"
        >
          1:1
        </button>
      </div>
    </div>
  );
}

export function DragToReply({ 
  children, 
  onReply, 
  replyThreshold = 100,
  className 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const controls = useAnimation();

  const handleDrag = useCallback((event, info) => {
    setDragY(info.offset.y);
    if (info.offset.y < -replyThreshold) {
      setIsDragging(true);
    }
  }, [replyThreshold]);

  const handleDragEnd = useCallback((event, info) => {
    if (info.offset.y < -replyThreshold) {
      onReply?.();
      // Animate back to position
      controls.start({ y: 0, opacity: 1 });
    } else {
      // Animate back to original position
      controls.start({ y: 0, opacity: 1 });
    }
    setDragY(0);
    setIsDragging(false);
  }, [onReply, replyThreshold, controls]);

  return (
    <motion.div
      className={cn("relative", className)}
      drag="y"
      dragConstraints={{ top: -200, bottom: 0 }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{ y: dragY }}
    >
      {/* Reply Indicator */}
      <motion.div
        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: isDragging ? 1 : 0, 
          scale: isDragging ? 1 : 0.8 
        }}
        transition={{ duration: 0.2 }}
      >
        Release to reply
      </motion.div>
      
      {/* Drag Handle */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary/30 rounded-full" />
      
      {children}
    </motion.div>
  );
}

export function PressureSensitive({ 
  children, 
  onLightPress, 
  onMediumPress, 
  onHardPress,
  className 
}) {
  const [pressure, setPressure] = useState(0);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handlePointerDown = (e) => {
      if (e.pressure !== undefined) {
        setPressure(e.pressure);
        
        if (e.pressure >= 0.7) {
          onHardPress?.(e);
        } else if (e.pressure >= 0.4) {
          onMediumPress?.(e);
        } else {
          onLightPress?.(e);
        }
      }
    };

    const handlePointerUp = () => {
      setPressure(0);
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointerup', handlePointerUp);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onLightPress, onMediumPress, onHardPress]);

  return (
    <motion.div
      ref={elementRef}
      className={cn("relative cursor-pointer", className)}
      style={{ 
        transform: `scale(${1 + pressure * 0.1})`,
        transition: "transform 0.1s ease-out"
      }}
    >
      {/* Pressure Indicator */}
      <div 
        className="absolute inset-0 rounded-2xl border-2 border-primary pointer-events-none"
        style={{ 
          opacity: pressure,
          borderColor: pressure >= 0.7 ? "hsl(0, 100%, 50%)" : 
                     pressure >= 0.4 ? "hsl(45, 100%, 50%)" : 
                     "hsl(120, 100%, 50%)"
        }}
      />
      
      {children}
    </motion.div>
  );
}

export function GestureIndicator({ gesture, isActive, className }) {
  const gestureIcons = {
    swipeLeft: "←",
    swipeRight: "→", 
    swipeUp: "↑",
    swipeDown: "↓",
    pinch: "⤢",
    drag: "↕",
    tap: "👆",
    longPress: "⏱",
  };

  return (
    <motion.div
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/30 bg-primary/10 backdrop-blur-sm",
        className
      )}
      animate={{
        scale: isActive ? [1, 1.2, 1] : 1,
        opacity: isActive ? 1 : 0.5,
      }}
      transition={{
        duration: 0.3,
        repeat: isActive ? Infinity : 0,
        ease: "easeInOut",
      }}
    >
      <span className="text-primary font-bold text-lg">
        {gestureIcons[gesture] || "??"}
      </span>
    </motion.div>
  );
}

export function GestureTutorial({ gestures, onComplete, className }) {
  const [currentGesture, setCurrentGesture] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleGestureComplete = () => {
    if (currentGesture < gestures.length - 1) {
      setCurrentGesture(currentGesture + 1);
    } else {
      setIsCompleted(true);
      onComplete?.();
    }
  };

  if (isCompleted) {
    return (
      <motion.div
        className={cn("text-center p-6", className)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-4xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-gradient mb-2">Tutorial Complete!</h3>
        <p className="text-muted-foreground">You've mastered all the gestures.</p>
      </motion.div>
    );
  }

  const gesture = gestures[currentGesture];

  return (
    <motion.div
      className={cn("text-center p-6", className)}
      key={currentGesture}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <GestureIndicator gesture={gesture.type} isActive={true} className="mx-auto mb-4" />
      
      <h3 className="text-lg font-bold text-foreground mb-2">
        {gesture.title}
      </h3>
      
      <p className="text-muted-foreground mb-4">
        {gesture.description}
      </p>
      
      <div className="flex justify-center gap-2 mb-4">
        {gestures.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index <= currentGesture ? "bg-primary" : "bg-primary/20"
            )}
          />
        ))}
      </div>
      
      <div className="text-sm text-muted-foreground">
        Step {currentGesture + 1} of {gestures.length}
      </div>
    </motion.div>
  );
}
