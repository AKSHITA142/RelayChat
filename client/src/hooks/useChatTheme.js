import { useState, useEffect } from "react";

/**
 * useChatTheme — persists a per-chat colour theme in localStorage.
 * Key format:  chat-theme-<chatId>
 * Default:     "stealth_dark"
 */
export const THEMES = {
  stealth_dark: {
    primary:      "#839493",
    background:   "#08080a",
    headerBg:     "rgba(8,8,10,0.85)",
    footerBg:     "rgba(8,8,10,0.85)",
    bubbleOwn:    "rgba(131,148,147,0.1)",
    bubbleOther:  "rgba(255,255,255,0.02)",
    textOwn:      "#ffffff",
    textOther:    "#ffffff",
    inputBorder:  "rgba(131,148,147,0.2)",
    sendBtn:      "#839493",
    pattern:      "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
    patternSize:  "24px 24px",
  },
  void: {
    primary:      "#b6a0ff",
    background:   "#060608",
    headerBg:     "rgba(6,6,8,0.85)",
    footerBg:     "rgba(6,6,8,0.85)",
    bubbleOwn:    "linear-gradient(135deg, rgba(197,154,255,0.15), rgba(139,92,246,0.05))",
    bubbleOther:  "rgba(255,255,255,0.03)",
    textOwn:      "#ffffff",
    textOther:    "#ffffff",
    inputBorder:  "rgba(182,160,255,0.2)",
    sendBtn:      "linear-gradient(135deg, #b6a0ff 0%, #060608 100%)",
    pattern:      "radial-gradient(rgba(182,160,255,0.05) 1px, transparent 1px)",
    patternSize:  "32px 32px",
  },
  minimal_dark: {
    primary:      "#ffffff",
    background:   "#000000",
    headerBg:     "rgba(0,0,0,0.85)",
    footerBg:     "rgba(0,0,0,0.85)",
    bubbleOwn:    "#d1d5db", 
    bubbleOther:  "#1f2937", 
    textOwn:      "#000000",
    textOther:    "#ffffff",
    inputBorder:  "#333333",
    sendBtn:      "#ffffff",
    pattern:      "radial-gradient(rgba(255,255,255,0.06) 1.5px, transparent 1.5px)",
    patternSize:  "16px 16px",
  },
  minimal_light: {
    primary:      "#000000",
    background:   "linear-gradient(to bottom, #d1d5db, #f8fafc)",
    headerBg:     "rgba(209,213,219,0.85)",
    footerBg:     "rgba(241,245,249,0.85)",
    bubbleOwn:    "#000000", 
    bubbleOther:  "#ffffff", 
    textOwn:      "#ffffff",
    textOther:    "#000000",
    inputBorder:  "#cccccc",
    sendBtn:      "#000000",
    pattern:      "radial-gradient(rgba(0,0,0,0.1) 1.5px, transparent 1.5px)",
    patternSize:  "16px 16px",
  }
};

export const THEME_NAMES = {
  stealth_dark:   "Stealth Dark",
  void:           "Deep Void",
  minimal_dark:   "Minimal Dark",
  minimal_light:  "Minimal Light",
};

export function useChatTheme(chatId) {
  const [theme, setInternalTheme] = useState(() => {
    let saved = "stealth_dark";
    if (chatId) {
      const specific = localStorage.getItem(`chat-theme-${chatId}`);
      if (specific && THEMES[specific]) saved = specific;
      else saved = localStorage.getItem("global-theme") || "stealth_dark";
    } else {
      saved = localStorage.getItem("global-theme") || "stealth_dark";
    }
    
    // Safety Force: If the saved theme doesn't exist, reset to stealth_dark
    return THEMES[saved] ? saved : "stealth_dark";
  });

  const key = chatId ? `chat-theme-${chatId}` : "global-theme";

  useEffect(() => {
    const handleStorageChange = () => {
      let current = "stealth_dark";
      if (chatId) {
        const specific = localStorage.getItem(`chat-theme-${chatId}`);
        if (specific && THEMES[specific]) {
           setInternalTheme(specific);
           return;
        }
      }
      current = localStorage.getItem("global-theme") || "stealth_dark";
      setInternalTheme(THEMES[current] ? current : "stealth_dark");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("theme-change", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("theme-change", handleStorageChange);
    };
  }, [chatId]);

  const setTheme = (themeName) => {
    localStorage.setItem(key, themeName);
    setInternalTheme(themeName);
    // Broadcast for the current window's other hooks
    window.dispatchEvent(new Event("theme-change"));
  };

  return [theme, setTheme];
}
