/**
 * useChatTheme — persists a per-chat colour theme in localStorage.
 * Key format:  chat-theme-<chatId>
 * Default:     "blue"
 */
export const THEMES = {
  neon: {
    primary:      "#12f1ff",
    background:   "#090b10",
    headerBg:     "rgba(9,11,16,0.85)",
    footerBg:     "rgba(9,11,16,0.85)",
    bubbleOwn:    "linear-gradient(135deg, rgba(18,241,255,0.15), rgba(0,166,255,0.05))",
    bubbleOther:  "rgba(255,255,255,0.03)",
    textOwn:      "#ffffff",
    textOther:    "#ffffff",
    inputBorder:  "rgba(18,241,255,0.3)",
    sendBtn:      "linear-gradient(135deg, #12f1ff 0%, #00a6ff 100%)",
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
    inputBorder:  "rgba(182,160,255,0.3)",
    sendBtn:      "linear-gradient(135deg, #c59aff 0%, #8b5cf6 100%)",
  },
  plasma: {
    primary:      "#ff2a6d",
    background:   "#0a0508",
    headerBg:     "rgba(10,5,8,0.85)",
    footerBg:     "rgba(10,5,8,0.85)",
    bubbleOwn:    "linear-gradient(135deg, rgba(255,42,109,0.15), rgba(255,101,47,0.05))",
    bubbleOther:  "rgba(255,255,255,0.03)",
    textOwn:      "#ffffff",
    textOther:    "#ffffff",
    inputBorder:  "rgba(255,42,109,0.3)",
    sendBtn:      "linear-gradient(135deg, #ff2a6d 0%, #ff652f 100%)",
  },
  matrix: {
    primary:      "#00ff41",
    background:   "#040805",
    headerBg:     "rgba(4,8,5,0.85)",
    footerBg:     "rgba(4,8,5,0.85)",
    bubbleOwn:    "linear-gradient(135deg, rgba(0,255,65,0.15), rgba(0,143,17,0.05))",
    bubbleOther:  "rgba(255,255,255,0.03)",
    textOwn:      "#ffffff",
    textOther:    "#ffffff",
    inputBorder:  "rgba(0,255,65,0.3)",
    sendBtn:      "linear-gradient(135deg, #00ff41 0%, #008f11 100%)",
  },
  minimal_dark: {
    primary:      "#ffffff",
    background:   "#000000",
    headerBg:     "rgba(0,0,0,0.85)",
    footerBg:     "rgba(0,0,0,0.85)",
    bubbleOwn:    "#d1d5db", // light grey
    bubbleOther:  "#1f2937", // dark grey
    textOwn:      "#000000",
    textOther:    "#ffffff",
    inputBorder:  "#333333",
    sendBtn:      "#ffffff",
    pattern:      "radial-gradient(rgba(255,255,255,0.06) 1.5px, transparent 1.5px)",
    patternSize:  "16px 16px",
  },
  minimal_light: {
    primary:      "#000000",
    background:   "linear-gradient(to right, #9ca3af 0%, #e2e8f0 100%)", // dark grey to light grey left-to-right
    headerBg:     "rgba(209,213,219,0.85)",
    footerBg:     "rgba(203,213,225,0.85)",
    bubbleOwn:    "#000000", // pitch black
    bubbleOther:  "#ffffff", // pure white
    textOwn:      "#ffffff",
    textOther:    "#000000",
    inputBorder:  "#cccccc",
    sendBtn:      "#000000",
    pattern:      "radial-gradient(rgba(255,255,255,0.6) 1.5px, transparent 1.5px)", // visible white dots
    patternSize:  "16px 16px",
  }
};

export const THEME_NAMES = {
  neon:           "Neon Cyan",
  void:           "Deep Void",
  plasma:         "Plasma",
  matrix:         "Oasis",
  minimal_dark:   "Minimal Dark",
  minimal_light:  "Minimal Light",
};

export function useChatTheme(chatId) {
  const key = chatId ? `chat-theme-${chatId}` : null;

  const getTheme = () => {
    if (!key) return "neon";
    return localStorage.getItem(key) || "neon";
  };

  const setTheme = (themeName) => {
    if (!key) return;
    localStorage.setItem(key, themeName);
  };

  return [getTheme(), setTheme];
}
