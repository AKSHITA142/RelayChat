import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export function UltimateChatExperience({ 
  children, 
  messages, 
  currentUser,
  onSendMessage,
  className 
}) {
  const [isTyping, setIsTyping] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("quantum");
  const [isImmersive, setIsImmersive] = useState(false);
  const [reactions, setReactions] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef(null);

  const themes = {
    quantum: {
      bg: "bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20",
      border: "border-cyan-500/30",
      text: "text-cyan-300",
      glow: "shadow-cyan-500/50"
    },
    neon: {
      bg: "bg-gradient-to-br from-pink-900/20 via-purple-900/20 to-blue-900/20",
      border: "border-pink-500/30",
      text: "text-pink-300",
      glow: "shadow-pink-500/50"
    },
    matrix: {
      bg: "bg-gradient-to-br from-green-900/20 via-emerald-900/20 to-lime-900/20",
      border: "border-green-500/30",
      text: "text-green-300",
      glow: "shadow-green-500/50"
    },
    sunset: {
      bg: "bg-gradient-to-br from-orange-900/20 via-red-900/20 to-pink-900/20",
      border: "border-orange-500/30",
      text: "text-orange-300",
      glow: "shadow-orange-500/50"
    }
  };

  const currentTheme = themes[selectedTheme];

  const handleSendMessage = useCallback(() => {
    if (message.trim()) {
      onSendMessage?.({
        text: message,
        timestamp: Date.now(),
        reactions: {},
        status: "sending"
      });
      setMessage("");
      setIsTyping(false);
    }
  }, [message, onSendMessage]);

  const handleReaction = useCallback((messageId, emoji) => {
    setReactions(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [emoji]: (prev[messageId]?.[emoji] || 0) + 1
      }
    }));
  }, []);

  const handleVoiceToggle = useCallback(() => {
    setIsRecording(prev => !prev);
  }, []);

  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* Dynamic Background */}
      <div className={cn("absolute inset-0 transition-all duration-1000", currentTheme.bg)}>
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full"
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
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Neural Network Lines */}
        <svg className="absolute inset-0 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <motion.line
              key={i}
              x1={`${Math.random() * 100}%`}
              y1={`${Math.random() * 100}%`}
              x2={`${Math.random() * 100}%`}
              y2={`${Math.random() * 100}%`}
              stroke="currentColor"
              strokeWidth="1"
              strokeOpacity="0.2"
              className={currentTheme.text}
              animate={{
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </svg>
      </div>

      {/* Main Chat Container */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Theme Selector */}
        <div className="flex justify-center p-4">
          <div className="surface-panel rounded-2xl p-2 flex gap-2">
            {Object.keys(themes).map((theme) => (
              <motion.button
                key={theme}
                onClick={() => setSelectedTheme(theme)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  selectedTheme === theme ? currentTheme.bg + " " + currentTheme.text : "bg-white/10"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Immersive Mode Toggle */}
        <div className="absolute top-4 right-4">
          <motion.button
            onClick={() => setIsImmersive(!isImmersive)}
            className="surface-panel rounded-2xl p-3"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="text-2xl">{isImmersive ? "🎯" : "💫"}</span>
          </motion.button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.8 }}
                className={cn(
                  "surface-panel rounded-2xl p-4 max-w-md",
                  msg.sender === currentUser ? "ml-auto" : "mr-auto",
                  currentTheme.border
                )}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: msg.color || "#6366f1" }}
                  >
                    {msg.sender?.[0] || "U"}
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-medium", currentTheme.text)}>
                      {msg.sender}
                    </p>
                    <p className="text-foreground mt-1">
                      {msg.text}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                      
                      {/* Message Status */}
                      <div className="flex items-center gap-1">
                        {msg.status === "sending" && <span>⏳</span>}
                        {msg.status === "sent" && <span>✓</span>}
                        {msg.status === "delivered" && <span>✓✓</span>}
                        {msg.status === "read" && <span className="text-blue-500">✓✓</span>}
                      </div>

                      {/* Reactions */}
                      <div className="flex gap-1">
                        {Object.entries(reactions[msg.id] || {}).map(([emoji, count]) => (
                          <motion.button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="surface-panel rounded-full px-2 py-1 text-xs hover:scale-110 transition-transform"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                          >
                            {emoji} {count}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-4">
          <div className={cn("surface-panel rounded-2xl p-4", currentTheme.border)}>
            <div className="flex items-center gap-3">
              {/* Voice Recording Button */}
              <motion.button
                onClick={handleVoiceToggle}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isRecording ? "bg-red-500 text-white" : "bg-white/10"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isRecording ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    🎙️
                  </motion.div>
                ) : (
                  "🎤"
                )}
              </motion.button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              />

              {/* Emoji Button */}
              <motion.button
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
              >
                😊
              </motion.button>

              {/* Send Button */}
              <motion.button
                onClick={handleSendMessage}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  message.trim() ? "bg-primary text-primary-foreground" : "bg-white/10"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ➤
              </motion.button>
            </div>

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-2"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((dot) => (
                    <motion.div
                      key={dot}
                      className="w-1 h-1 bg-foreground rounded-full"
                      animate={{
                        y: [0, -4, 0],
                        opacity: [0.4, 1, 0.4]
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: dot * 0.1
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {currentUser} is typing...
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Immersive Mode Overlay */}
      <AnimatePresence>
        {isImmersive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="surface-panel rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <h2 className="text-2xl font-bold mb-4">Immersive Mode</h2>
              <div className="text-muted-foreground">
                Experience your chat in a distraction-free environment with enhanced visual effects.
              </div>
              
              {/* Immersive Features */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="surface-panel rounded-2xl p-4">
                  <h3 className="font-semibold mb-2">🎨 Dynamic Themes</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-powered themes that adapt to your mood and time
                  </p>
                </div>
                <div className="surface-panel rounded-2xl p-4">
                  <h3 className="font-semibold mb-2">✨ Quantum Effects</h3>
                  <p className="text-sm text-muted-foreground">
                    Next-gen particle animations and neural networks
                  </p>
                </div>
                <div className="surface-panel rounded-2xl p-4">
                  <h3 className="font-semibold mb-2">🎯 Focus Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Minimal interface for deep conversations
                  </p>
                </div>
                <div className="surface-panel rounded-2xl p-4">
                  <h3 className="font-semibold mb-2">🌟 Holographic UI</h3>
                  <p className="text-sm text-muted-foreground">
                    3D elements with advanced lighting
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsImmersive(false)}
                className="mt-6 w-full surface-panel rounded-2xl py-3 font-medium hover:scale-105 transition-transform"
              >
                Exit Immersive Mode
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
