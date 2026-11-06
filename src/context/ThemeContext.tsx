/**
 * NOTE: the dark/light switch (PRD P0.4).
 * Why it exists: the Header and Profile both offer the switch, and there must be one implementation of it.
 * Connects to: `index.html` applies the saved theme before the page first paints. Every colour in `index.css`
 * follows the `data-theme` attribute set here.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { StorageService } from "@/models/StorageService";
import { STORAGE_KEYS, THEME_BAR_COLORS } from "@/utils/constants";
import { parseTheme, type Theme } from "@/utils/guards";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const themeStorage = new StorageService<Theme>(STORAGE_KEYS.theme, parseTheme);

/** Owns the current theme. Header and Profile both read from here, so they can't show different themes. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  /** Starts dark, because the night street is the shop's natural look. A saved choice wins. */
  const [theme, setTheme] = useState<Theme>(() => themeStorage.get() ?? "dark");

  // Puts the theme on <html>, where the CSS looks for it, tells a phone's browser bar, and saves it for the next visit.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_BAR_COLORS[theme]);
    themeStorage.set(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((current) => (current === "dark" ? "light" : "dark")), []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** How components read and change the theme. Throws a clear message if the provider is missing. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }
  return context;
}
