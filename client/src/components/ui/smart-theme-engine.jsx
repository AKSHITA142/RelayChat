import { motion } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const THEME_PRESETS = {
  // Time-based themes
  dawn: {
    primary: "hsl(45, 100%, 60%)",
    secondary: "hsl(30, 100%, 70%)",
    accent: "hsl(60, 100%, 50%)",
    background: "hsl(30, 20%, 95%)",
    foreground: "hsl(30, 20%, 15%)",
    name: "Dawn"
  },
  morning: {
    primary: "hsl(200, 100%, 50%)",
    secondary: "hsl(180, 100%, 60%)",
    accent: "hsl(160, 100%, 45%)",
    background: "hsl(200, 30%, 98%)",
    foreground: "hsl(200, 30%, 10%)",
    name: "Morning"
  },
  noon: {
    primary: "hsl(220, 100%, 50%)",
    secondary: "hsl(200, 100%, 60%)",
    accent: "hsl(180, 100%, 50%)",
    background: "hsl(220, 40%, 98%)",
    foreground: "hsl(220, 40%, 5%)",
    name: "Noon"
  },
  sunset: {
    primary: "hsl(20, 100%, 60%)",
    secondary: "hsl(340, 100%, 70%)",
    accent: "hsl(10, 100%, 50%)",
    background: "hsl(20, 25%, 95%)",
    foreground: "hsl(20, 25%, 10%)",
    name: "Sunset"
  },
  night: {
    primary: "hsl(260, 100%, 60%)",
    secondary: "hsl(280, 100%, 70%)",
    accent: "hsl(300, 100%, 50%)",
    background: "hsl(260, 30%, 8%)",
    foreground: "hsl(260, 30%, 95%)",
    name: "Night"
  },
  
  // Mood-based themes
  energetic: {
    primary: "hsl(0, 100%, 60%)",
    secondary: "hsl(30, 100%, 70%)",
    accent: "hsl(60, 100%, 50%)",
    background: "hsl(0, 20%, 95%)",
    foreground: "hsl(0, 20%, 10%)",
    name: "Energetic"
  },
  calm: {
    primary: "hsl(180, 100%, 50%)",
    secondary: "hsl(200, 100%, 60%)",
    accent: "hsl(220, 100%, 40%)",
    background: "hsl(180, 30%, 98%)",
    foreground: "hsl(180, 30%, 8%)",
    name: "Calm"
  },
  focused: {
    primary: "hsl(220, 100%, 50%)",
    secondary: "hsl(240, 100%, 60%)",
    accent: "hsl(200, 100%, 45%)",
    background: "hsl(220, 35%, 97%)",
    foreground: "hsl(220, 35%, 5%)",
    name: "Focused"
  },
  creative: {
    primary: "hsl(280, 100%, 60%)",
    secondary: "hsl(300, 100%, 70%)",
    accent: "hsl(320, 100%, 50%)",
    background: "hsl(280, 25%, 95%)",
    foreground: "hsl(280, 25%, 10%)",
    name: "Creative"
  },
  
  // Activity-based themes
  coding: {
    primary: "hsl(120, 100%, 40%)",
    secondary: "hsl(140, 100%, 50%)",
    accent: "hsl(160, 100%, 45%)",
    background: "hsl(120, 25%, 97%)",
    foreground: "hsl(120, 25%, 8%)",
    name: "Coding"
  },
  social: {
    primary: "hsl(340, 100%, 60%)",
    secondary: "hsl(320, 100%, 70%)",
    accent: "hsl(300, 100%, 50%)",
    background: "hsl(340, 30%, 96%)",
    foreground: "hsl(340, 30%, 8%)",
    name: "Social"
  },
  learning: {
    primary: "hsl(45, 100%, 50%)",
    secondary: "hsl(60, 100%, 60%)",
    accent: "hsl(30, 100%, 45%)",
    background: "hsl(45, 25%, 97%)",
    foreground: "hsl(45, 25%, 8%)",
    name: "Learning"
  }
};

export function SmartThemeEngine({ 
  children, 
  onThemeChange,
  autoAdapt = true,
  adaptationMode = "time", // "time", "mood", "activity"
  className 
}) {
  const [currentTheme, setCurrentTheme] = useState(THEME_PRESETS.noon);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userActivity, setUserActivity] = useState([]);
  const [messageMood, setMessageMood] = useState("neutral");
  const containerRef = useRef(null);

  // Analyze user activity patterns
  const analyzeActivity = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    
    // Time-based analysis
    let timeTheme = "noon";
    if (hour >= 5 && hour < 8) timeTheme = "dawn";
    else if (hour >= 8 && hour < 12) timeTheme = "morning";
    else if (hour >= 12 && hour < 17) timeTheme = "noon";
    else if (hour >= 17 && hour < 20) timeTheme = "sunset";
    else timeTheme = "night";

    // Activity-based analysis
    const recentActivity = userActivity.slice(-10);
    const activityTypes = recentActivity.map(a => a.type);
    const activityCounts = activityTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    let activityTheme = "focused";
    if (activityCounts.coding > 3) activityTheme = "coding";
    else if (activityCounts.social > 3) activityTheme = "social";
    else if (activityCounts.learning > 3) activityTheme = "learning";

    // Mood-based analysis
    let moodTheme = "calm";
    if (messageMood === "excited") moodTheme = "energetic";
    else if (messageMood === "focused") moodTheme = "focused";
    else if (messageMood === "creative") moodTheme = "creative";

    // Determine final theme based on adaptation mode
    let selectedTheme = THEME_PRESETS[timeTheme];
    if (adaptationMode === "mood") selectedTheme = THEME_PRESETS[moodTheme];
    else if (adaptationMode === "activity") selectedTheme = THEME_PRESETS[activityTheme];

    return selectedTheme;
  }, [userActivity, messageMood, adaptationMode]);

  // Auto-adapt theme
  useEffect(() => {
    if (!autoAdapt) return;

    const interval = setInterval(() => {
      const newTheme = analyzeActivity();
      if (newTheme.name !== currentTheme.name) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentTheme(newTheme);
          setIsTransitioning(false);
          onThemeChange?.(newTheme);
        }, 300);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [autoAdapt, analyzeActivity, currentTheme.name, onThemeChange]);

  // Track user activity
  const trackActivity = useCallback((type, data = {}) => {
    setUserActivity(prev => [...prev, { type, timestamp: Date.now(), ...data }]);
  }, []);

  // Analyze message mood
  const analyzeMessageMood = useCallback((message) => {
    const text = message.toLowerCase();
    
    // Simple sentiment analysis
    if (text.includes("excited") || text.includes("awesome") || text.includes("amazing")) {
      setMessageMood("excited");
    } else if (text.includes("focus") || text.includes("work") || text.includes("code")) {
      setMessageMood("focused");
    } else if (text.includes("creative") || text.includes("idea") || text.includes("design")) {
      setMessageMood("creative");
    } else {
      setMessageMood("neutral");
    }
  }, []);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", currentTheme.primary);
    root.style.setProperty("--secondary", currentTheme.secondary);
    root.style.setProperty("--accent", currentTheme.accent);
    root.style.setProperty("--background", currentTheme.background);
    root.style.setProperty("--foreground", currentTheme.foreground);
  }, [currentTheme]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative transition-all duration-500", className)}
      style={{
        background: currentTheme.background,
        color: currentTheme.foreground,
      }}
    >
      {/* Theme Transition Overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: isTransitioning ? 1 : 0,
        }}
        style={{
          background: `radial-gradient(circle, ${currentTheme.primary}20, transparent 70%)`,
        }}
      />
      
      {children}
    </div>
  );
}

export function ThemeSelector({ 
  currentTheme, 
  onThemeSelect, 
  className 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className={cn("relative", className)}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="surface-panel flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-300 hover:shadow-panel"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div 
          className="w-4 h-4 rounded-full border-2 border-white/50"
          style={{ backgroundColor: currentTheme.primary }}
        />
        <span>{currentTheme.name}</span>
        <motion.svg
          width="12"
          height="12"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path d="M6 3L6 9M3 6L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 surface-panel rounded-2xl border border-white/10 p-2 min-w-[200px] shadow-panel z-50"
          >
            <div className="space-y-1">
              {Object.values(THEME_PRESETS).map((theme) => (
                <motion.button
                  key={theme.name}
                  onClick={() => {
                    onThemeSelect(theme);
                    setIsExpanded(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-200",
                    "hover:bg-white/10"
                  )}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div 
                    className="w-3 h-3 rounded-full border border-white/30"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span className="text-sm font-medium">{theme.name}</span>
                  {theme.name === currentTheme.name && (
                    <motion.div
                      className="ml-auto w-2 h-2 rounded-full bg-primary"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ThemePreview({ theme, isSelected, onSelect, className }) {
  return (
    <motion.button
      onClick={() => onSelect(theme)}
      className={cn(
        "surface-panel relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300",
        "hover:shadow-panel hover:scale-[1.02]",
        isSelected && "ring-2 ring-primary shadow-panel",
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Theme Color Preview */}
      <div className="flex gap-2 mb-3">
        <div 
          className="w-8 h-8 rounded-lg border border-white/20"
          style={{ backgroundColor: theme.primary }}
        />
        <div 
          className="w-8 h-8 rounded-lg border border-white/20"
          style={{ backgroundColor: theme.secondary }}
        />
        <div 
          className="w-8 h-8 rounded-lg border border-white/20"
          style={{ backgroundColor: theme.accent }}
        />
      </div>
      
      <h4 className="font-semibold text-sm mb-1">{theme.name}</h4>
      
      <div className="text-xs text-muted-foreground">
        <div>Primary: {theme.primary}</div>
        <div>Background: {theme.background}</div>
      </div>
      
      {isSelected && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path 
              d="M10 3L4.5 8.5L2 6" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}

export function MoodAnalyzer({ messages, onMoodChange, className }) {
  const [currentMood, setCurrentMood] = useState("neutral");

  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const recentMessages = messages.slice(-10);
    const text = recentMessages.map(m => m.content || "").join(" ").toLowerCase();

    // Simple sentiment analysis
    let mood = "neutral";
    const positiveWords = ["happy", "great", "awesome", "love", "excited", "amazing"];
    const negativeWords = ["sad", "angry", "bad", "hate", "terrible", "awful"];
    const focusWords = ["work", "focus", "code", "study", "learn"];
    const creativeWords = ["idea", "create", "design", "art", "imagine"];

    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    const focusCount = focusWords.filter(word => text.includes(word)).length;
    const creativeCount = creativeWords.filter(word => text.includes(word)).length;

    if (positiveCount > negativeCount && positiveCount > 2) mood = "energetic";
    else if (focusCount > 2) mood = "focused";
    else if (creativeCount > 2) mood = "creative";
    else if (negativeCount > positiveCount && negativeCount > 2) mood = "calm";

    // Use setTimeout to avoid setState in effect
    setTimeout(() => {
      if (mood !== currentMood) {
        setCurrentMood(mood);
        onMoodChange?.(mood);
      }
    }, 0);
  }, [messages, currentMood, onMoodChange]);

  const moodEmojis = {
    neutral: "😐",
    energetic: "🎉",
    focused: "🎯",
    creative: "🎨",
    calm: "😌"
  };

  return (
    <motion.div
      className={cn("surface-panel flex items-center gap-3 rounded-2xl px-4 py-2", className)}
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <span className="text-2xl">{moodEmojis[currentMood]}</span>
      <div>
        <p className="text-sm font-medium">Current Mood</p>
        <p className="text-xs text-muted-foreground capitalize">{currentMood}</p>
      </div>
    </motion.div>
  );
}
