/**
 * useChatTheme — persists a per-chat colour theme in localStorage.
 * Key format:  chat-theme-<chatId>
 * Default:     "blue"
 */
export const THEMES = {
  blue: {
    primary:      "#4A90E2",
    background:   "#EAF3FF",
    headerBg:     "#c8def7",
    footerBg:     "#d8ebff",
    bubbleOwn:    "#4A90E2",
    bubbleOther:  "#d0e8ff",
    textOwn:      "#ffffff",
    textOther:    "#1a2a4a",
    inputBorder:  "#4A90E2",
    sendBtn:      "#4A90E2",
  },
  green: {
    primary:      "#2ECC71",
    background:   "#EAFBF1",
    headerBg:     "#b8efd3",
    footerBg:     "#d0f5e4",
    bubbleOwn:    "#2ECC71",
    bubbleOther:  "#c4f0d8",
    textOwn:      "#ffffff",
    textOther:    "#0d2b1a",
    inputBorder:  "#2ECC71",
    sendBtn:      "#2ECC71",
  },
  purple: {
    primary:      "#9B59B6",
    background:   "#F3E8FF",
    headerBg:     "#dbbef7",
    footerBg:     "#e8d4fc",
    bubbleOwn:    "#9B59B6",
    bubbleOther:  "#e2ccf5",
    textOwn:      "#ffffff",
    textOther:    "#2a0d40",
    inputBorder:  "#9B59B6",
    sendBtn:      "#9B59B6",
  },
  dark: {
    primary:      "#5B7FDE",
    background:   "#121212",
    headerBg:     "#1a1f2e",
    footerBg:     "#161b28",
    bubbleOwn:    "#2a3a5c",
    bubbleOther:  "#1e2a3a",
    textOwn:      "#e8eaf6",
    textOther:    "#b0bec5",
    inputBorder:  "#5B7FDE",
    sendBtn:      "#5B7FDE",
  },
};

export const THEME_NAMES = {
  blue:   "Blue",
  green:  "Green",
  purple: "Purple",
  dark:   "Dark",
};

export function useChatTheme(chatId) {
  const key = chatId ? `chat-theme-${chatId}` : null;

  const getTheme = () => {
    if (!key) return "blue";
    return localStorage.getItem(key) || "blue";
  };

  const setTheme = (themeName) => {
    if (!key) return;
    localStorage.setItem(key, themeName);
  };

  return [getTheme(), setTheme];
}
