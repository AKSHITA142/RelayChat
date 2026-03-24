import { useEffect, useState } from "react";

const DEFAULT_THEME = "stealth_dark";

export const THEMES = {
  stealth_dark: { className: "theme-chat-stealth_dark" },
  void: { className: "theme-chat-void" },
  minimal_dark: { className: "theme-chat-minimal_dark" },
  minimal_light: { className: "theme-chat-minimal_light" },
};

export const THEME_NAMES = {
  stealth_dark: "Stealth Dark",
  void: "Deep Void",
  minimal_dark: "Minimal Dark",
  minimal_light: "Minimal Light",
};

export const getThemeClassName = (themeName) =>
  THEMES[themeName]?.className || THEMES[DEFAULT_THEME].className;

export function useChatTheme(chatId) {
  const [theme, setInternalTheme] = useState(() => {
    let saved = DEFAULT_THEME;
    if (chatId) {
      const specific = localStorage.getItem(`chat-theme-${chatId}`);
      if (specific && THEMES[specific]) saved = specific;
      else saved = localStorage.getItem("global-theme") || DEFAULT_THEME;
    } else {
      saved = localStorage.getItem("global-theme") || DEFAULT_THEME;
    }

    return THEMES[saved] ? saved : DEFAULT_THEME;
  });

  const key = chatId ? `chat-theme-${chatId}` : "global-theme";

  useEffect(() => {
    const handleStorageChange = () => {
      let current = DEFAULT_THEME;
      if (chatId) {
        const specific = localStorage.getItem(`chat-theme-${chatId}`);
        if (specific && THEMES[specific]) {
          setInternalTheme(specific);
          return;
        }
      }
      current = localStorage.getItem("global-theme") || DEFAULT_THEME;
      setInternalTheme(THEMES[current] ? current : DEFAULT_THEME);
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
    window.dispatchEvent(new Event("theme-change"));
  };

  return [theme, setTheme];
}
